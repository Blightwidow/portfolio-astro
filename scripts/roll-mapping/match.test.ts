import { describe, expect, test } from "bun:test";
import { matchExports } from "./match";

const PUBLISHED = {
  "r001-f02": "0000000000000000",
  "r001-f06": "ffffffffffffffff",
  "r002-f02": "f0f0f0f0f0f0f0f0",
};

describe("matchExports", () => {
  test("records the roll a folder maps to", () => {
    const report = matchExports(
      [{ folder: "20250510", index: 2, hash: "0000000000000000" }],
      PUBLISHED,
    );

    expect(report.rollByFolder).toEqual({ "20250510": "r001" });
  });

  test("flags an export at a different frame than published", () => {
    const report = matchExports(
      [{ folder: "20250510", index: 3, hash: "0000000000000000" }],
      PUBLISHED,
    );

    expect(report.conflicts[0]?.reason).toContain("published as frame 2");
  });

  test("flags a folder whose frames land on two rolls", () => {
    const report = matchExports(
      [
        { folder: "20250510", index: 2, hash: "0000000000000000" },
        { folder: "20250510", index: 2, hash: "f0f0f0f0f0f0f0f0" },
      ],
      PUBLISHED,
    );

    expect(report.conflicts[0]?.reason).toContain("already maps to r001");
  });

  test("treats a far hash as unpublished", () => {
    const report = matchExports(
      [{ folder: "20250510", index: 9, hash: "5555555555555555" }],
      PUBLISHED,
    );

    expect(report.unmatched).toEqual([{ folder: "20250510", index: 9 }]);
  });
});
