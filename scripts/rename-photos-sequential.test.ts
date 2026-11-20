import { describe, expect, test } from "bun:test";
import { findLatestDate, formatCompactDate, globToRegExp } from "./rename-photos-sequential";

describe("globToRegExp", () => {
  test("matches a star pattern", () => {
    expect(globToRegExp("raw*.jpg").test("raw0042.jpg")).toBe(true);
  });

  test("does not treat the dot as a wildcard", () => {
    expect(globToRegExp("raw*.jpg").test("raw0042xjpg")).toBe(false);
  });

  test("anchors the whole name", () => {
    expect(globToRegExp("raw*.jpg").test("my-raw0042.jpg")).toBe(false);
  });
});

describe("findLatestDate", () => {
  test("picks the newest YYYYMMDD name", () => {
    const latest = findLatestDate(["20250822.jpg", "20251101.yaml", "notes.txt"]);

    expect(formatCompactDate(latest)).toBe("20251101");
  });

  test("throws when nothing is date named", () => {
    expect(() => findLatestDate(["r001-f01.jpg"])).toThrow("YYYYMMDD");
  });
});
