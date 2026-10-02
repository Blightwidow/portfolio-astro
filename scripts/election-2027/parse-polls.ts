import { HTMLElement, NodeType, parse, type Node } from "node-html-parser";

/** One candidate in one first-round scenario. Polling firms test several lists per survey; `poll` identifies the list. */
export interface FirstRoundRow {
  table: number;
  poll: string;
  pollster: string;
  /** ISO date of the last day of fieldwork. */
  date: string;
  sample: number;
  candidate: string;
  value: number;
}

export interface SecondRoundRow {
  matchup: string;
  pollster: string;
  date: string;
  sample: number;
  candidateA: string;
  valueA: number;
  candidateB: string;
  valueB: number;
}

const MONTHS: Record<string, number> = {
  janvier: 1,
  février: 2,
  fevrier: 2,
  mars: 3,
  avril: 4,
  mai: 5,
  juin: 6,
  juillet: 7,
  août: 8,
  aout: 8,
  septembre: 9,
  octobre: 10,
  novembre: 11,
  décembre: 12,
};
const POLLSTER_ALIASES: Record<string, string> = {
  "harris interactive": "Harris",
  "harris-interactive": "Harris",
  "cluster 17": "Cluster17",
};
const NUMBER_PATTERN = /(<\s*)?(\d+(?:[.,]\d+)?)/;
const EMPTY_CELLS = new Set(["—", "-", "", "–"]);
const DEFAULT_SAMPLE = 1000;
/** Rows with fewer distinct cells are headers or full-width annotations. */
const MINIMUM_FIRST_ROUND_CELLS = 6;
const MINIMUM_SECOND_ROUND_CELLS = 5;

/** Text content with footnotes dropped, each text node trimmed and joined by a space. */
export function cleanText(element: HTMLElement): string {
  const pieces: string[] = [];
  const walk = (node: Node) => {
    if (node.nodeType === NodeType.TEXT_NODE) {
      const piece = node.text.trim();
      if (piece) pieces.push(piece);
      return;
    }
    if (node instanceof HTMLElement && node.tagName === "SUP") return;
    node.childNodes.forEach(walk);
  };
  walk(element);
  return pieces.join(" ").replaceAll(" ", " ");
}

/** Rows of cells with rowspan and colspan expanded, so column N is the same column on every row. */
export function expandGrid(table: HTMLElement): HTMLElement[][] {
  const grid: HTMLElement[][] = [];
  const pending = new Map<number, { cell: HTMLElement; remaining: number }>();

  for (const rowElement of table.querySelectorAll("tr")) {
    const row: HTMLElement[] = [];
    const cells = rowElement.children.filter(
      (child) => child.tagName === "TD" || child.tagName === "TH",
    );
    let columnIndex = 0;
    let cellIndex = 0;

    while (true) {
      const spanning = pending.get(columnIndex);
      if (spanning) {
        row.push(spanning.cell);
        if (spanning.remaining > 1)
          pending.set(columnIndex, { ...spanning, remaining: spanning.remaining - 1 });
        else pending.delete(columnIndex);
        columnIndex += 1;
        continue;
      }
      const cell = cells[cellIndex];
      cellIndex += 1;
      if (!cell) break;
      const rowspan = Number.parseInt(cell.getAttribute("rowspan") ?? "1", 10) || 1;
      const colspan = Number.parseInt(cell.getAttribute("colspan") ?? "1", 10) || 1;
      for (let spanIndex = 0; spanIndex < colspan; spanIndex += 1) {
        row.push(cell);
        if (rowspan > 1) pending.set(columnIndex, { cell, remaining: rowspan - 1 });
        columnIndex += 1;
      }
    }
    grid.push(row);
  }
  return grid;
}

/** End date of a fieldwork period such as "25-29 septembre" or "26 - 28 août 2026", as an ISO date. */
export function parseDate(text: string, defaultYear: number): string | undefined {
  const lower = text.toLowerCase();
  const year = Number(lower.match(/(20\d\d)/)?.[1] ?? defaultYear);
  let latestMonth: { position: number; month: number } | undefined;
  for (const [name, month] of Object.entries(MONTHS)) {
    for (const match of lower.matchAll(new RegExp(name, "g"))) {
      const position = match.index;
      if (!latestMonth || position > latestMonth.position) latestMonth = { position, month };
    }
  }
  if (!latestMonth) return undefined;
  const days = [...lower.matchAll(/\b(\d{1,2})\b/g)].map((match) => Number(match[1]));
  const day = days.at(-1) ?? 15;
  const date = new Date(Date.UTC(year, latestMonth.month - 1, day));
  if (date.getUTCMonth() !== latestMonth.month - 1 || date.getUTCDate() !== day) return undefined;
  return date.toISOString().slice(0, 10);
}

export function normalizePollster(name: string): string {
  const trimmed = name.trim();
  return POLLSTER_ALIASES[trimmed.toLowerCase()] ?? trimmed;
}

/** First number in a cell; "<1" becomes 0.5, half the stated bound. */
export function parseValue(text: string): number | undefined {
  const match = text.match(NUMBER_PATTERN);
  if (!match?.[2]) return undefined;
  const value = Number(match[2].replace(",", "."));
  return match[1] ? value / 2 : value;
}

/** "Marine Le Pen (RN)" -> "Marine Le Pen"; "Attal / Darmanin" -> "Attal". */
export function surname(label: string): string {
  const withoutParty = label.replaceAll(/\(.*?\)/g, "").trim();
  return (withoutParty.split(" /")[0] ?? "").trim();
}

/** Candidate column names come from the header row that carries "(PARTY)" labels. */
function headerNames(grid: HTMLElement[][]): string[] | undefined {
  for (const row of grid.slice(0, 4)) {
    const texts = row.map(cleanText);
    if (texts.filter((text) => text.includes("(")).length >= 2) return texts;
  }
  return undefined;
}

function parseSample(text: string): number {
  const digits = text.replaceAll(/\D/g, "");
  return digits ? Number(digits) : DEFAULT_SAMPLE;
}

function isDataRow(row: HTMLElement[], minimumCells: number): boolean {
  return new Set(row).size >= minimumCells && row[0]?.tagName !== "TH";
}

const OTHER_CANDIDATES_PATTERN =
  /(<?\s*\d+(?:[.,]\d+)?)\s*([A-ZÉÈ][\p{L}\p{N}_\-é'èëï]+(?:[\s-][A-ZÉ][\p{L}\p{N}_\-é]+)?)/gu;
const SUBSTITUTE_PATTERN = /\d\s*([A-ZÉ][^\d(/]+?)\s*(\(|\/|$)/;

export function parseFirstRound(
  table: HTMLElement,
  tableIndex: number,
  defaultYear: number,
): FirstRoundRow[] {
  const grid = expandGrid(table);
  const names = headerNames(grid);
  const records: FirstRoundRow[] = [];
  let pollCounter = 0;

  for (const row of grid) {
    if (!isDataRow(row, MINIMUM_FIRST_ROUND_CELLS)) continue;
    const texts = row.map(cleanText);
    const date = parseDate(texts[1] ?? "", defaultYear);
    if (!date) continue;
    pollCounter += 1;
    const base = {
      table: tableIndex,
      poll: `${tableIndex}-${pollCounter}`,
      pollster: normalizePollster(texts[0] ?? ""),
      date,
      sample: parseSample(texts[2] ?? ""),
    };
    const seenCells = new Set<HTMLElement>();

    for (let columnIndex = 3; columnIndex < row.length; columnIndex += 1) {
      const cell = row[columnIndex];
      const text = texts[columnIndex] ?? "";
      if (!cell || seenCells.has(cell)) continue;
      seenCells.add(cell);
      if (EMPTY_CELLS.has(text)) continue;
      const columnLabel = names?.[columnIndex] ?? `col${columnIndex}`;

      if (columnLabel.toLowerCase().startsWith("autre")) {
        for (const [, valueText = "", candidate = ""] of text.matchAll(OTHER_CANDIDATES_PATTERN)) {
          const value = parseValue(valueText);
          if (value !== undefined) records.push({ ...base, candidate: candidate.trim(), value });
        }
        continue;
      }

      const value = parseValue(text);
      if (value === undefined) continue;
      // A cell can name a stand-in for the column's candidate, either in <small> or after the number.
      const small = cell.querySelector("small");
      const substitute = text.match(SUBSTITUTE_PATTERN)?.[1];
      const candidate = small ? surname(cleanText(small)) : surname(substitute ?? columnLabel);
      records.push({ ...base, candidate, value });
    }
  }
  return records;
}

export function parseSecondRound(table: HTMLElement, matchup: string): SecondRoundRow[] {
  const grid = expandGrid(table);
  const names = headerNames(grid);
  if (!names) return [];
  const records: SecondRoundRow[] = [];

  for (const row of grid) {
    if (!isDataRow(row, MINIMUM_SECOND_ROUND_CELLS)) continue;
    const texts = row.map(cleanText);
    const date = parseDate(texts[1] ?? "", 2026);
    const valueA = parseValue(texts[3] ?? "");
    const valueB = parseValue(texts[4] ?? "");
    if (!date || valueA === undefined || valueB === undefined) continue;
    records.push({
      matchup,
      pollster: normalizePollster(texts[0] ?? ""),
      date,
      sample: parseSample(texts[2] ?? ""),
      candidateA: surname(names[3] ?? ""),
      valueA,
      candidateB: surname(names[4] ?? ""),
      valueB,
    });
  }
  return records;
}

/** Walk the page in document order, remembering the latest headings so each table knows its section. */
export function parsePolls(html: string): {
  firstRound: FirstRoundRow[];
  secondRound: SecondRoundRow[];
} {
  const firstRound: FirstRoundRow[] = [];
  const secondRound: SecondRoundRow[] = [];
  const headings = { section: "", subsection: "", yearHeading: "" };
  let tableIndex = 0;

  const visit = (element: HTMLElement) => {
    const tag = element.tagName;
    if (tag === "H2") headings.section = cleanText(element);
    if (tag === "H3") headings.yearHeading = cleanText(element);
    if (tag === "H3" || tag === "H4") headings.subsection = cleanText(element);
    if (tag === "TABLE") {
      if (headings.section.includes("premier tour")) {
        const defaultYear = Number(headings.yearHeading.match(/(20\d\d)/)?.[1] ?? 2026);
        firstRound.push(...parseFirstRound(element, tableIndex, defaultYear));
      } else if (
        headings.section.includes("second tour") &&
        headings.subsection.includes("Hypothèse")
      ) {
        secondRound.push(...parseSecondRound(element, headings.subsection));
      }
      tableIndex += 1;
    }
    element.children.forEach(visit);
  };
  visit(parse(html));
  return { firstRound, secondRound };
}
