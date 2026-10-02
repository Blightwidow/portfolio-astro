import forecastData from "../data/election-2027/forecast.json";

/** Shape of `src/data/election-2027/forecast.json`, written by `bun run election:update`. */
export interface ElectionForecast {
  /** Day the model was run for; poll recency is measured from it. */
  asOf: string;
  waveCount: number;
  scenarioCount: number;
  droppedShare: number;
  candidates: CandidateForecast[];
  duels: DuelForecast[];
  sensitivity: SensitivityCell[];
  history: HistoryPoint[];
}

export interface CandidateForecast {
  candidate: string;
  party: string;
  /** First-round share in points, over the runs where the candidate is on the ballot, with its 90% range. */
  firstRoundMean: number;
  firstRoundLow: number;
  firstRoundHigh: number;
  shareOfScenariosRunning: number;
  qualifyProbability: number;
  winProbability: number;
  winProbabilityLowError: number;
  winProbabilityHighError: number;
}

export interface DuelForecast {
  /** Alphabetical order. */
  candidates: string[];
  probability: number;
  firstCandidateWinProbability: number;
}

export interface SensitivityCell {
  runoffErrorStandardDeviation: number;
  lePenPollOverstatement: number;
  lePenWinProbability: number;
}

export interface HistoryPoint {
  date: string;
  /** Central win probability, and its lowest and highest value across the sensitivity grid. */
  candidates: Record<string, { winProbability: number; low: number; high: number }>;
}

export const forecast = forecastData as ElectionForecast;

/** "94%", or "<1%" so a 0.4% chance never reads as zero. */
export function formatProbability(probability: number): string {
  if (probability > 0 && probability < 0.01) return "<1%";
  return `${Math.round(probability * 100)}%`;
}

export function getFavourite(): CandidateForecast {
  const favourite = forecast.candidates[0];
  if (!favourite) throw new Error("Election forecast has no candidates");
  return favourite;
}

/** Lowest and highest favourite win probability across the sensitivity grid. */
export function getSensitivityRange(): { low: number; high: number } {
  const probabilities = forecast.sensitivity.map((cell) => cell.lePenWinProbability);
  return { low: Math.min(...probabilities), high: Math.max(...probabilities) };
}

export interface HistorySeries {
  label: string;
  /** `low` and `high` bound the uncertainty band; "Others" has none, since summed bounds would overstate it. */
  points: { date: string; value: number; low?: number; high?: number }[];
}

/**
 * The `namedCount` candidates with the highest peak win probability, plus every other candidate summed
 * into "Others". Three named lines is the most the chart palette keeps apart for colour-blind readers.
 */
export function getHistorySeries(namedCount = 3): HistorySeries[] {
  const peaks = new Map<string, number>();
  for (const point of forecast.history) {
    for (const [candidate, entry] of Object.entries(point.candidates)) {
      peaks.set(candidate, Math.max(peaks.get(candidate) ?? 0, entry.winProbability));
    }
  }
  const named = [...peaks.entries()]
    .sort(([, left], [, right]) => right - left)
    .slice(0, namedCount)
    .map(([candidate]) => candidate);

  const series = named.map((candidate) => ({
    label: candidate,
    points: forecast.history.map((point) => {
      const entry = point.candidates[candidate];
      return {
        date: point.date,
        value: entry?.winProbability ?? 0,
        low: entry?.low ?? 0,
        high: entry?.high ?? 0,
      };
    }),
  }));
  const others = forecast.history.map((point) => ({
    date: point.date,
    value: Object.entries(point.candidates)
      .filter(([candidate]) => !named.includes(candidate))
      .reduce((sum, [, entry]) => sum + entry.winProbability, 0),
  }));
  return others.some((point) => point.value > 0)
    ? [...series, { label: "Others", points: others }]
    : series;
}
