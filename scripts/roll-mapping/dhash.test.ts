import { describe, expect, test } from "bun:test";
import sharp from "sharp";
import { differenceHash, hammingDistance } from "./dhash";

async function gradientImage(width: number, height: number, flip = false): Promise<Buffer> {
  const pixels = Buffer.alloc(width * height);

  for (let row = 0; row < height; row++) {
    for (let column = 0; column < width; column++) {
      const position = flip ? width - 1 - column : column;
      pixels[row * width + column] = Math.floor((position / width) * 255);
    }
  }

  return sharp(pixels, { raw: { width, height, channels: 1 } })
    .jpeg()
    .toBuffer();
}

describe("differenceHash", () => {
  test("is 16 hex digits", async () => {
    expect(await differenceHash(await gradientImage(90, 80))).toMatch(/^[0-9a-f]{16}$/);
  });

  test("survives a resize", async () => {
    const full = await differenceHash(await gradientImage(900, 800));
    const small = await differenceHash(await gradientImage(180, 160));

    expect(hammingDistance(full, small)).toBeLessThanOrEqual(2);
  });

  test("tells a mirrored image apart", async () => {
    const original = await differenceHash(await gradientImage(90, 80));
    const mirrored = await differenceHash(await gradientImage(90, 80, true));

    expect(hammingDistance(original, mirrored)).toBeGreaterThan(30);
  });
});

describe("hammingDistance", () => {
  test("counts differing bits", () => {
    expect(hammingDistance("0000000000000000", "000000000000000f")).toBe(4);
  });
});
