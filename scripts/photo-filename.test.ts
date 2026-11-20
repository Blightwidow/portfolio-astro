import { describe, expect, test } from "bun:test";
import { formatPhotoBasename, parseRollAndFrame } from "./photo-filename";

describe("parseRollAndFrame", () => {
  test("reads roll and frame from a jpg filename", () => {
    expect(parseRollAndFrame("r014-f07.jpg")).toEqual({ roll: "r014", frame: 7 });
  });

  test("ignores directories and extension case", () => {
    expect(parseRollAndFrame("src/content/photography/r001-f12.JPG")).toEqual({
      roll: "r001",
      frame: 12,
    });
  });

  test("rejects the legacy date scheme", () => {
    expect(parseRollAndFrame("20250822.jpg")).toBeUndefined();
  });

  test("rejects an unpadded frame", () => {
    expect(parseRollAndFrame("r014-f7.jpg")).toBeUndefined();
  });
});

describe("formatPhotoBasename", () => {
  test("pads the frame to two digits", () => {
    expect(formatPhotoBasename("r014", 7)).toBe("r014-f07");
  });

  test("round trips with parseRollAndFrame", () => {
    expect(parseRollAndFrame(`${formatPhotoBasename("r003", 36)}.jpg`)).toEqual({
      roll: "r003",
      frame: 36,
    });
  });
});
