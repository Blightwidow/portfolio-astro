import type { FirstRoundRow, SecondRoundRow } from "./parse-polls";
import { createRandom } from "./random";

/** Le Pen's candidacy was confirmed on this day, after her ineligibility was reduced on appeal. */
export const ELIGIBILITY_DATE = "2026-07-08";
export const LE_PEN = "Le Pen";
export const HALF_LIFE_DAYS = 30;
export const DEGREES_OF_FREEDOM = 5;
export const CENTRAL_ERROR_SCALE = 0.1;
/** Points, runoff share about six months out. */
export const RUNOFF_ERROR_STANDARD_DEVIATION = 4.5;
export const RUNOFF_CORRELATION_WITH_LE_PEN = 0.5;
/** Pairings with fewer runoff polls are dropped from the simulations. */
export const MINIMUM_RUNOFF_POLLS = 3;
export const SIMULATIONS = 200_000;
export const SEED = 2027;
/** Le Pen polled around 34% when the model was built; scales her first-round surprise into runoff points. */
const LE_PEN_REFERENCE_SHARE = 0.34;
const DAY_IN_MILLISECONDS = 86_400_000;

export interface SimulationSettings {
  asOf: string;
  errorScale?: number;
  runoffErrorStandardDeviation?: number;
  /** Points by which the runoff polls are assumed to overstate Le Pen. */
  lePenRunoffBias?: number;
  simulations?: number;
}

export interface CandidateResult {
  candidate: string;
  /** Mean first-round share, in points, over the runs where the candidate is on the ballot. */
  firstRoundMean: number;
  firstRoundLow: number;
  firstRoundHigh: number;
  shareOfScenariosRunning: number;
  qualifyProbability: number;
  winProbability: number;
}

export interface DuelResult {
  candidates: [string, string];
  probability: number;
  /** Probability that `candidates[0]` wins when this duel happens. */
  firstCandidateWinProbability: number;
}

export interface SimulationResult {
  candidates: CandidateResult[];
  duels: DuelResult[];
  runoffAverages: Map<string, number>;
  droppedShare: number;
  waveCount: number;
  scenarioCount: number;
}

export function recencyWeight(date: string, asOf: string): number {
  const ageDays = (Date.parse(asOf) - Date.parse(date)) / DAY_IN_MILLISECONDS;
  return 0.5 ** (ageDays / HALF_LIFE_DAYS);
}

const isInWindow = (date: string, asOf: string) => date >= ELIGIBILITY_DATE && date <= asOf;
const pairingKey = (candidateA: string, candidateB: string) => `${candidateA}|${candidateB}`;

/**
 * One row per first-round scenario, shares normalised to 1. A poll wave (one pollster, one date) is
 * weighted by recency and split evenly between its scenarios, so a firm testing six lists does not
 * count six times.
 */
export function loadScenarios(firstRound: FirstRoundRow[], asOf: string) {
  const scenarioRows = new Map<
    string,
    { wave: string; date: string; shares: Map<string, number> }
  >();
  for (const row of firstRound) {
    if (!isInWindow(row.date, asOf)) continue;
    const scenario = scenarioRows.get(row.poll) ?? {
      wave: `${row.pollster} ${row.date}`,
      date: row.date,
      shares: new Map<string, number>(),
    };
    scenario.shares.set(row.candidate, (scenario.shares.get(row.candidate) ?? 0) + row.value);
    scenarioRows.set(row.poll, scenario);
  }

  const scenarios = [...scenarioRows.values()];
  const candidates = [
    ...new Set(scenarios.flatMap((scenario) => [...scenario.shares.keys()])),
  ].sort();
  const scenariosPerWave = new Map<string, number>();
  for (const scenario of scenarios)
    scenariosPerWave.set(scenario.wave, (scenariosPerWave.get(scenario.wave) ?? 0) + 1);

  const shares = scenarios.map((scenario) => {
    const total = [...scenario.shares.values()].reduce((sum, value) => sum + value, 0);
    return Float64Array.from(
      candidates,
      (candidate) => (scenario.shares.get(candidate) ?? 0) / total,
    );
  });
  const weights = scenarios.map(
    (scenario) => recencyWeight(scenario.date, asOf) / (scenariosPerWave.get(scenario.wave) ?? 1),
  );
  return { candidates, shares, weights, waveCount: scenariosPerWave.size };
}

/** Recency-weighted share of the first-named candidate, keyed both ways round, for pairings with enough polls. */
export function runoffAverages(secondRound: SecondRoundRow[], asOf: string): Map<string, number> {
  const groups = new Map<string, SecondRoundRow[]>();
  for (const row of secondRound) {
    if (!isInWindow(row.date, asOf)) continue;
    const key = pairingKey(row.candidateA, row.candidateB);
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }

  const averages = new Map<string, number>();
  for (const rows of groups.values()) {
    const first = rows[0];
    if (!first || rows.length < MINIMUM_RUNOFF_POLLS) continue;
    let weightedShare = 0;
    let totalWeight = 0;
    for (const row of rows) {
      const weight = recencyWeight(row.date, asOf);
      weightedShare += (row.valueA / (row.valueA + row.valueB)) * weight;
      totalWeight += weight;
    }
    const share = (weightedShare / totalWeight) * 100;
    averages.set(pairingKey(first.candidateA, first.candidateB), share);
    averages.set(pairingKey(first.candidateB, first.candidateA), 100 - share);
  }
  return averages;
}

/** Linear interpolation between closest ranks, as numpy does by default. */
function percentile(sortedValues: Float64Array, quantile: number): number {
  if (sortedValues.length === 0) return 0;
  const position = (quantile / 100) * (sortedValues.length - 1);
  const lower = Math.floor(position);
  const upper = Math.min(lower + 1, sortedValues.length - 1);
  const lowerValue = sortedValues[lower] ?? 0;
  return lowerValue + ((sortedValues[upper] ?? 0) - lowerValue) * (position - lower);
}

export function simulate(
  firstRound: FirstRoundRow[],
  secondRound: SecondRoundRow[],
  settings: SimulationSettings,
): SimulationResult {
  const {
    asOf,
    errorScale = CENTRAL_ERROR_SCALE,
    runoffErrorStandardDeviation = RUNOFF_ERROR_STANDARD_DEVIATION,
    lePenRunoffBias = 0,
    simulations = SIMULATIONS,
  } = settings;
  // A fresh generator per run: every setting sees the same draws, so differences come from the setting alone.
  const random = createRandom(SEED, DEGREES_OF_FREEDOM);
  const { candidates, shares, weights, waveCount } = loadScenarios(firstRound, asOf);
  const lePenIndex = candidates.indexOf(LE_PEN);
  if (lePenIndex === -1) throw new Error(`No first-round scenario includes ${LE_PEN} by ${asOf}`);
  const averages = runoffAverages(secondRound, asOf);

  const candidateCount = candidates.length;
  const cumulativeWeights = new Float64Array(weights.length);
  weights.reduce((sum, weight, index) => (cumulativeWeights[index] = sum + weight), 0);

  const independentStandardDeviation =
    runoffErrorStandardDeviation * Math.sqrt(1 - RUNOFF_CORRELATION_WITH_LE_PEN ** 2);
  const lePenFirstRoundStandardDeviation =
    errorScale * Math.sqrt(LE_PEN_REFERENCE_SHARE * (1 - LE_PEN_REFERENCE_SHARE)) * 100;

  const runningShares = candidates.map(() => [] as number[]);
  const presentCounts = new Float64Array(candidateCount);
  const qualifyCounts = new Float64Array(candidateCount);
  const winCounts = new Float64Array(candidateCount);
  const duelCounts = new Map<
    string,
    { candidates: [string, string]; count: number; firstWins: number }
  >();
  const noisy = new Float64Array(candidateCount);
  let dropped = 0;

  for (let simulation = 0; simulation < simulations; simulation += 1) {
    const base = shares[random.pick(cumulativeWeights)];
    if (!base) continue;

    let total = 0;
    for (let index = 0; index < candidateCount; index += 1) {
      const share = base[index] ?? 0;
      const draw = random.studentT();
      noisy[index] =
        share > 0 ? Math.max(share + draw * errorScale * Math.sqrt(share * (1 - share)), 0) : 0;
      total += noisy[index] ?? 0;
    }
    let firstIndex = -1;
    let secondIndex = -1;
    for (let index = 0; index < candidateCount; index += 1) {
      noisy[index] = (noisy[index] ?? 0) / total;
      const value = noisy[index] ?? 0;
      if (firstIndex === -1 || value > (noisy[firstIndex] ?? 0)) {
        secondIndex = firstIndex;
        firstIndex = index;
      } else if (secondIndex === -1 || value > (noisy[secondIndex] ?? 0)) {
        secondIndex = index;
      }
    }
    const runoffNoise = random.studentT() * independentStandardDeviation;

    const candidateA = candidates[firstIndex] ?? "";
    const candidateB = candidates[secondIndex] ?? "";
    const meanA = averages.get(pairingKey(candidateA, candidateB));
    if (meanA === undefined) {
      dropped += 1; // untested or low-confidence pairing
      continue;
    }

    let shift = runoffNoise;
    if (candidateA === LE_PEN || candidateB === LE_PEN) {
      const lePenSurprisePoints = ((noisy[lePenIndex] ?? 0) - (base[lePenIndex] ?? 0)) * 100;
      const correlated =
        (RUNOFF_CORRELATION_WITH_LE_PEN * runoffErrorStandardDeviation * lePenSurprisePoints) /
        lePenFirstRoundStandardDeviation;
      const towardsA =
        candidateB === LE_PEN ? -correlated + lePenRunoffBias : correlated - lePenRunoffBias;
      shift += towardsA;
    } else {
      shift += random.studentT() * runoffErrorStandardDeviation * RUNOFF_CORRELATION_WITH_LE_PEN;
    }
    const aWins = meanA + shift > 50;

    for (let index = 0; index < candidateCount; index += 1) {
      if ((base[index] ?? 0) <= 0) continue;
      presentCounts[index] = (presentCounts[index] ?? 0) + 1;
      runningShares[index]?.push((noisy[index] ?? 0) * 100);
    }
    qualifyCounts[firstIndex] = (qualifyCounts[firstIndex] ?? 0) + 1;
    qualifyCounts[secondIndex] = (qualifyCounts[secondIndex] ?? 0) + 1;
    const winnerIndex = aWins ? firstIndex : secondIndex;
    winCounts[winnerIndex] = (winCounts[winnerIndex] ?? 0) + 1;

    const pair = [candidateA, candidateB].sort() as [string, string];
    const duelKey = pairingKey(...pair);
    const duel = duelCounts.get(duelKey) ?? { candidates: pair, count: 0, firstWins: 0 };
    duel.count += 1;
    if ((aWins ? candidateA : candidateB) === pair[0]) duel.firstWins += 1;
    duelCounts.set(duelKey, duel);
  }

  const kept = simulations - dropped;
  const candidateResults = candidates.map((candidate, index): CandidateResult => {
    const values = Float64Array.from(runningShares[index] ?? []).sort();
    const mean = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
    return {
      candidate,
      firstRoundMean: mean,
      firstRoundLow: percentile(values, 5),
      firstRoundHigh: percentile(values, 95),
      shareOfScenariosRunning: (presentCounts[index] ?? 0) / kept,
      qualifyProbability: (qualifyCounts[index] ?? 0) / kept,
      winProbability: (winCounts[index] ?? 0) / kept,
    };
  });
  const duels = [...duelCounts.values()]
    .map((duel) => ({
      candidates: duel.candidates,
      probability: duel.count / kept,
      firstCandidateWinProbability: duel.firstWins / duel.count,
    }))
    .sort((left, right) => right.probability - left.probability);

  return {
    candidates: candidateResults,
    duels,
    runoffAverages: averages,
    droppedShare: dropped / simulations,
    waveCount,
    scenarioCount: shares.length,
  };
}
