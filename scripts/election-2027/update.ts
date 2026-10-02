/**
 * Refresh the 2027 election forecast: fetch the polls listed on French Wikipedia, store them, rerun the
 * Monte Carlo model for today and for every past poll date, and write the page data.
 *
 *   bun run election:update                       fetch polls, then model
 *   bun run election:update --offline             model the stored polls only
 *   bun run election:update --as-of 2026-10-02   model as if run that day
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parseArgs } from "node:util";

import type { CandidateForecast, ElectionForecast, HistoryPoint } from "../../src/utils/election";
import { parsePolls, type FirstRoundRow, type SecondRoundRow } from "./parse-polls";
import { ELIGIBILITY_DATE, LE_PEN, RUNOFF_ERROR_STANDARD_DEVIATION, simulate } from "./simulate";

const SOURCE_URL =
  "https://fr.wikipedia.org/w/index.php?title=Liste_de_sondages_sur_l%27%C3%A9lection_pr%C3%A9sidentielle_fran%C3%A7aise_de_2027&action=render";
const DATA_DIRECTORY = join(import.meta.dir, "..", "..", "src", "data", "election-2027");
const FIRST_ROUND_PATH = join(DATA_DIRECTORY, "polls-first-round.json");
const SECOND_ROUND_PATH = join(DATA_DIRECTORY, "polls-second-round.json");
const FORECAST_PATH = join(DATA_DIRECTORY, "forecast.json");

const LOW_ERROR_SCALE = 0.05;
const HIGH_ERROR_SCALE = 0.15;
const SENSITIVITY_RUNOFF_ERRORS = [3, RUNOFF_ERROR_STANDARD_DEVIATION, 6, 8];
const SENSITIVITY_OVERSTATEMENTS = [0, 2, 4];
/** Candidates tested in fewer scenarios are left out of the table. */
const MINIMUM_SHARE_RUNNING = 0.05;
/** Past days where most runs hit an untested pairing are not a forecast yet, so they stay off the chart. */
const MAXIMUM_DROPPED_SHARE = 0.25;

const PARTIES: Record<string, string> = {
  "Le Pen": "RN",
  Mélenchon: "LFI",
  Philippe: "HOR",
  Attal: "RE",
  Glucksmann: "PP",
  Retailleau: "LR",
  Hollande: "PS",
  Zemmour: "REC",
  Tondelier: "LE",
  Roussel: "PCF",
  "Dupont-Aignan": "DLF",
  Arthaud: "LO",
  Villepin: "LFH",
  Faure: "PS",
  Ruffin: "D!",
  Lisnard: "NF",
  "Le Maire": "RE",
};

const round = (value: number, decimals: number) => Number(value.toFixed(decimals));
const roundProbability = (value: number) => round(value, 4);

/** One row per line keeps diffs readable when a new poll lands. */
async function writeRows(path: string, rows: object[]) {
  await writeFile(path, `[\n${rows.map((row) => JSON.stringify(row)).join(",\n")}\n]\n`);
}

async function fetchPolls() {
  const response = await fetch(SOURCE_URL, {
    headers: { "User-Agent": "dammaretz.fr election forecast" },
  });
  if (!response.ok) throw new Error(`Wikipedia answered ${response.status}`);
  const { firstRound, secondRound } = parsePolls(await response.text());
  if (firstRound.length === 0 || secondRound.length === 0)
    throw new Error("No polls parsed; did the page layout change?");
  await writeRows(FIRST_ROUND_PATH, firstRound);
  await writeRows(SECOND_ROUND_PATH, secondRound);
  console.log(
    `stored ${firstRound.length} first-round and ${secondRound.length} second-round rows`,
  );
}

const SENSITIVITY_GRID = SENSITIVITY_RUNOFF_ERRORS.flatMap((runoffErrorStandardDeviation) =>
  SENSITIVITY_OVERSTATEMENTS.map((lePenRunoffBias) => ({
    runoffErrorStandardDeviation,
    lePenRunoffBias,
  })),
);
/** The band only needs to be about right, so its eleven extra runs per day use fewer simulations. */
const BAND_SIMULATIONS = 50_000;

/**
 * Win probability per candidate on every poll date, with a low-high band spanning the same
 * sensitivity grid as the headline range, so the chart and the text agree on what "uncertain" means.
 */
function buildHistory(
  firstRound: FirstRoundRow[],
  secondRound: SecondRoundRow[],
  asOf: string,
): HistoryPoint[] {
  const pollDates = firstRound
    .map((row) => row.date)
    .filter((date) => date >= ELIGIBILITY_DATE && date <= asOf);
  const dates = [...new Set([...pollDates, asOf])].sort();
  const history: HistoryPoint[] = [];
  for (const date of dates) {
    const central = simulate(firstRound, secondRound, { asOf: date });
    if (central.droppedShare > MAXIMUM_DROPPED_SHARE) continue;
    const alternatives = SENSITIVITY_GRID.map((settings) =>
      simulate(firstRound, secondRound, { asOf: date, ...settings, simulations: BAND_SIMULATIONS }),
    );
    const candidates: HistoryPoint["candidates"] = {};
    for (const candidate of central.candidates) {
      const probabilities = [
        candidate,
        ...alternatives.map((result) =>
          result.candidates.find((entry) => entry.candidate === candidate.candidate),
        ),
      ].map((entry) => entry?.winProbability ?? 0);
      if (Math.max(...probabilities) === 0) continue;
      candidates[candidate.candidate] = {
        winProbability: roundProbability(candidate.winProbability),
        low: roundProbability(Math.min(...probabilities)),
        high: roundProbability(Math.max(...probabilities)),
      };
    }
    history.push({ date, candidates });
  }
  return history;
}

async function main() {
  const { values } = parseArgs({
    options: { offline: { type: "boolean", default: false }, "as-of": { type: "string" } },
  });
  const asOf = values["as-of"] ?? new Date().toISOString().slice(0, 10);
  await mkdir(DATA_DIRECTORY, { recursive: true });
  if (!values.offline) await fetchPolls();

  const firstRound = JSON.parse(await readFile(FIRST_ROUND_PATH, "utf8")) as FirstRoundRow[];
  const secondRound = JSON.parse(await readFile(SECOND_ROUND_PATH, "utf8")) as SecondRoundRow[];

  const central = simulate(firstRound, secondRound, { asOf });
  const lowError = simulate(firstRound, secondRound, { asOf, errorScale: LOW_ERROR_SCALE });
  const highError = simulate(firstRound, secondRound, { asOf, errorScale: HIGH_ERROR_SCALE });
  const winProbabilityOf = (result: typeof central, candidate: string) =>
    roundProbability(
      result.candidates.find((entry) => entry.candidate === candidate)?.winProbability ?? 0,
    );

  const candidates: CandidateForecast[] = central.candidates
    .filter((candidate) => candidate.shareOfScenariosRunning >= MINIMUM_SHARE_RUNNING)
    .map((candidate) => ({
      candidate: candidate.candidate,
      party: PARTIES[candidate.candidate] ?? "",
      firstRoundMean: round(candidate.firstRoundMean, 1),
      firstRoundLow: round(candidate.firstRoundLow, 1),
      firstRoundHigh: round(candidate.firstRoundHigh, 1),
      shareOfScenariosRunning: round(candidate.shareOfScenariosRunning, 3),
      qualifyProbability: roundProbability(candidate.qualifyProbability),
      winProbability: roundProbability(candidate.winProbability),
      winProbabilityLowError: winProbabilityOf(lowError, candidate.candidate),
      winProbabilityHighError: winProbabilityOf(highError, candidate.candidate),
    }))
    .sort(
      (left, right) =>
        right.winProbability - left.winProbability || right.firstRoundMean - left.firstRoundMean,
    );

  const sensitivity = SENSITIVITY_RUNOFF_ERRORS.flatMap((runoffErrorStandardDeviation) =>
    SENSITIVITY_OVERSTATEMENTS.map((lePenPollOverstatement) => ({
      runoffErrorStandardDeviation,
      lePenPollOverstatement,
      lePenWinProbability: winProbabilityOf(
        simulate(firstRound, secondRound, {
          asOf,
          runoffErrorStandardDeviation,
          lePenRunoffBias: lePenPollOverstatement,
        }),
        LE_PEN,
      ),
    })),
  );

  const forecast: ElectionForecast = {
    asOf,
    waveCount: central.waveCount,
    scenarioCount: central.scenarioCount,
    droppedShare: roundProbability(central.droppedShare),
    candidates,
    duels: central.duels.map((duel) => ({
      candidates: duel.candidates,
      probability: roundProbability(duel.probability),
      firstCandidateWinProbability: roundProbability(duel.firstCandidateWinProbability),
    })),
    sensitivity,
    history: buildHistory(firstRound, secondRound, asOf),
  };
  await writeFile(FORECAST_PATH, `${JSON.stringify(forecast, null, 2)}\n`);
  console.log(`${LE_PEN} wins in ${(winProbabilityOf(central, LE_PEN) * 100).toFixed(1)}% of runs`);
  console.log(`wrote ${FORECAST_PATH} (${forecast.history.length} history points)`);
}

await main();
