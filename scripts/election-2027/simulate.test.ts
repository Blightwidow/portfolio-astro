import { describe, expect, test } from "bun:test";

import type { FirstRoundRow, SecondRoundRow } from "./parse-polls";
import { loadScenarios, recencyWeight, runoffAverages, simulate } from "./simulate";

const firstRoundRow = (
  poll: string,
  date: string,
  candidate: string,
  value: number,
): FirstRoundRow => ({
  table: 0,
  poll,
  pollster: "Ifop",
  date,
  sample: 1000,
  candidate,
  value,
});
const runoffRow = (date: string, valueA: number): SecondRoundRow => ({
  matchup: "Hypothèse Mélenchon – Le Pen",
  pollster: "Ifop",
  date,
  sample: 1000,
  candidateA: "Mélenchon",
  valueA,
  candidateB: "Le Pen",
  valueB: 100 - valueA,
});

const firstRound = [
  firstRoundRow("0-1", "2026-09-01", "Le Pen", 40),
  firstRoundRow("0-1", "2026-09-01", "Mélenchon", 30),
  firstRoundRow("0-1", "2026-09-01", "Attal", 10),
  firstRoundRow("0-2", "2026-09-01", "Le Pen", 40),
  firstRoundRow("0-2", "2026-09-01", "Mélenchon", 30),
  firstRoundRow("0-3", "2026-06-01", "Le Pen", 20),
];
const secondRound = [
  runoffRow("2026-09-01", 30),
  runoffRow("2026-09-02", 30),
  runoffRow("2026-09-03", 30),
];

describe("recencyWeight", () => {
  test("halves every 30 days", () => {
    expect(recencyWeight("2026-09-01", "2026-10-01")).toBeCloseTo(0.5, 5);
  });
});

describe("loadScenarios", () => {
  const { shares, weights } = loadScenarios(firstRound, "2026-10-01");

  test("ignores polls from before the candidacy was confirmed", () => {
    expect(shares).toHaveLength(2);
  });

  test("splits a wave's weight between its scenarios", () => {
    expect(weights[0]).toBeCloseTo(weights[1] ?? 0, 10);
  });
});

describe("runoffAverages", () => {
  test("stores each pairing both ways round", () => {
    expect(runoffAverages(secondRound, "2026-10-01").get("Le Pen|Mélenchon")).toBeCloseTo(70, 5);
  });

  test("leaves out pairings with fewer than three polls", () => {
    expect(runoffAverages(secondRound.slice(0, 2), "2026-10-01").size).toBe(0);
  });
});

describe("simulate", () => {
  const result = simulate(firstRound, secondRound, { asOf: "2026-10-01", simulations: 20_000 });
  const lePen = result.candidates.find((candidate) => candidate.candidate === "Le Pen");

  test("gives the clear runoff favourite most wins", () => {
    expect(lePen?.winProbability).toBeGreaterThan(0.9);
  });

  test("is reproducible for the same inputs", () => {
    const again = simulate(firstRound, secondRound, { asOf: "2026-10-01", simulations: 20_000 });
    expect(again.candidates).toEqual(result.candidates);
  });
});
