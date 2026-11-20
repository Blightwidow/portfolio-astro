import { describe, expect, test } from "bun:test";
import { extractShotMonth, renderPhotoYaml } from "./generate-photo-metadata";

describe("extractShotMonth", () => {
  test("takes the month of shotFrom", () => {
    expect(extractShotMonth("camera: x\nshotFrom: 2025-06-14\n")).toBe("2025-06");
  });

  test("falls back to shotMonth", () => {
    expect(extractShotMonth("camera: x\nshotMonth: 2025-05\n")).toBe("2025-05");
  });

  test("is undefined for an undated roll", () => {
    expect(extractShotMonth("camera: x\nfilm: y\n")).toBeUndefined();
  });
});

describe("renderPhotoYaml", () => {
  test("writes roll, frame and month precision date", () => {
    const yaml = renderPhotoYaml("r014-f07.jpg", "2025-06");

    expect(yaml).toContain('date: "2025-06"\n');
    expect(yaml).toContain("roll: r014\n");
    expect(yaml).toContain("frame: 7\n");
  });

  test("never writes camera or film, which belong to the roll", () => {
    expect(renderPhotoYaml("r014-f07.jpg", "2025-06")).not.toMatch(/camera|film/);
  });

  test("rejects a filename outside the scheme", () => {
    expect(() => renderPhotoYaml("20250822.jpg", "2025-06")).toThrow("rNNN-fFF");
  });
});
