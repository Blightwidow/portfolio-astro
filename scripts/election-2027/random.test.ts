import { describe, expect, test } from "bun:test";

import { createRandom } from "./random";

const DRAWS = 100_000;

describe("createRandom", () => {
  test("repeats the same sequence for the same seed", () => {
    const first = createRandom(2027);
    const second = createRandom(2027);
    expect(Array.from({ length: 5 }, first.uniform)).toEqual(
      Array.from({ length: 5 }, second.uniform),
    );
  });

  test("scales Student-t draws to a standard deviation of 1", () => {
    const random = createRandom(1);
    const draws = Array.from({ length: DRAWS }, random.studentT);
    const variance = draws.reduce((sum, draw) => sum + draw ** 2, 0) / DRAWS;
    expect(Math.sqrt(variance)).toBeCloseTo(1, 1);
  });

  test("picks indices in proportion to their weight", () => {
    const random = createRandom(1);
    const cumulativeWeights = Float64Array.from([1, 4]);
    const lastIndexShare =
      Array.from({ length: DRAWS }, () => random.pick(cumulativeWeights)).filter(Boolean).length /
      DRAWS;
    expect(lastIndexShare).toBeCloseTo(0.75, 1);
  });
});
