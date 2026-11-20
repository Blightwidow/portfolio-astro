import { describe, expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { parseRollAndFrame } from "./photo-filename";

const PHOTOGRAPHY_DIRECTORY = join(import.meta.dirname, "..", "src", "content", "photography");
const ROLLS_DIRECTORY = join(import.meta.dirname, "..", "src", "content", "rolls");

interface PhotoEntry {
  roll?: unknown;
  frame?: unknown;
  image?: unknown;
  date?: unknown;
}

const photoBasenames = readdirSync(PHOTOGRAPHY_DIRECTORY)
  .filter((filename) => filename.endsWith(".yaml"))
  .map((filename) => basename(filename, ".yaml"))
  .toSorted();

function readPhoto(photoBasename: string): PhotoEntry {
  return Bun.YAML.parse(
    readFileSync(join(PHOTOGRAPHY_DIRECTORY, `${photoBasename}.yaml`), "utf8"),
  ) as PhotoEntry;
}

// The filename is the photo's URL and the single source of truth for roll and frame; the YAML
// fields must repeat it exactly, or the URL, the roll page and the frame order disagree.
describe.each(photoBasenames)("photography/%s", (photoBasename) => {
  const expected = parseRollAndFrame(photoBasename);

  test("is named rNNN-fFF", () => {
    expect(expected).toBeDefined();
  });

  test("roll field matches the filename", () => {
    expect(readPhoto(photoBasename).roll).toBe(expected?.roll);
  });

  test("frame field matches the filename", () => {
    expect(readPhoto(photoBasename).frame).toBe(expected?.frame);
  });

  test("image points at its paired jpg", () => {
    expect(readPhoto(photoBasename).image).toBe(`./${photoBasename}.jpg`);
  });

  test("paired jpg exists", () => {
    expect(existsSync(join(PHOTOGRAPHY_DIRECTORY, `${photoBasename}.jpg`))).toBe(true);
  });

  test("date has month precision", () => {
    expect(String(readPhoto(photoBasename).date)).toMatch(/^\d{4}-\d{2}$/);
  });

  test("roll exists", () => {
    expect(existsSync(join(ROLLS_DIRECTORY, `${expected?.roll}.yaml`))).toBe(true);
  });
});
