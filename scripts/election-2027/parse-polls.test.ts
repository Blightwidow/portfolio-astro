import { describe, expect, test } from "bun:test";
import { parse } from "node-html-parser";

import { cleanText, expandGrid, parseDate, parsePolls, parseValue, surname } from "./parse-polls";

describe("parseDate", () => {
  test("uses the last day of a fieldwork range", () => {
    expect(parseDate("25-29 septembre", 2026)).toBe("2026-09-29");
  });

  test("prefers a year written in the cell over the default", () => {
    expect(parseDate("26 - 28 août 2025", 2026)).toBe("2025-08-28");
  });

  test("takes the month written last when a range spans two months", () => {
    expect(parseDate("30 juin - 2 juillet", 2026)).toBe("2026-07-02");
  });

  test("falls back to mid-month when no day is given", () => {
    expect(parseDate("octobre", 2026)).toBe("2026-10-15");
  });

  test("rejects text without a month", () => {
    expect(parseDate("Ifop", 2026)).toBeUndefined();
  });

  test("rejects impossible days", () => {
    expect(parseDate("31 septembre", 2026)).toBeUndefined();
  });
});

describe("parseValue", () => {
  test("reads a French decimal comma", () => {
    expect(parseValue("33,5 %")).toBe(33.5);
  });

  test("turns an upper bound into half of it", () => {
    expect(parseValue("< 1")).toBe(0.5);
  });

  test("returns undefined for an empty cell", () => {
    expect(parseValue("—")).toBeUndefined();
  });
});

describe("surname", () => {
  test("drops the party label", () => {
    expect(surname("Le Pen (RN)")).toBe("Le Pen");
  });

  test("keeps the first of two alternative names", () => {
    expect(surname("Attal / Darmanin (RE)")).toBe("Attal");
  });
});

describe("cleanText", () => {
  test("drops footnote markers", () => {
    expect(cleanText(parse("<td>Ifop<sup>[3]</sup></td>"))).toBe("Ifop");
  });
});

describe("expandGrid", () => {
  const table = parse(`<table>
    <tr><td rowspan="2">A</td><td colspan="2">B</td></tr>
    <tr><td>C</td><td>D</td></tr>
  </table>`);
  const texts = expandGrid(table).map((row) => row.map(cleanText));

  test("repeats a colspan cell across its columns", () => {
    expect(texts[0]).toEqual(["A", "B", "B"]);
  });

  test("carries a rowspan cell into the next row", () => {
    expect(texts[1]).toEqual(["A", "C", "D"]);
  });
});

describe("parsePolls", () => {
  const html = `
    <h2>Sondages premier tour</h2><h3>2026</h3>
    <table>
      <tr><th>Sondeur</th><th>Date</th><th>Échantillon</th><th>Le Pen (RN)</th><th>Mélenchon (LFI)</th><th>Attal (RE)</th></tr>
      <tr><td>Harris Interactive</td><td>25-29 septembre</td><td>1 597</td><td>34</td><td>16</td><td>11 Darmanin</td></tr>
    </table>
    <h2>Sondages second tour</h2><h3>Hypothèse Attal – Le Pen</h3>
    <table>
      <tr><th>Sondeur</th><th>Date</th><th>Échantillon</th><th>Attal (RE)</th><th>Le Pen (RN)</th></tr>
      <tr><td>Ifop</td><td>21 septembre</td><td>1 000</td><td>43</td><td>57</td></tr>
    </table>`;
  const { firstRound, secondRound } = parsePolls(html);

  test("reads one row per candidate in a first-round scenario", () => {
    expect(firstRound.map((row) => row.candidate)).toEqual(["Le Pen", "Mélenchon", "Darmanin"]);
  });

  test("normalises pollster aliases", () => {
    expect(firstRound[0]?.pollster).toBe("Harris");
  });

  test("reads runoff pairings from the section heading table", () => {
    expect(secondRound[0]).toMatchObject({
      candidateA: "Attal",
      valueA: 43,
      candidateB: "Le Pen",
      valueB: 57,
    });
  });
});
