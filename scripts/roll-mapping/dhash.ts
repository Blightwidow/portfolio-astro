import sharp from "sharp";

const HASH_WIDTH = 9;
const HASH_HEIGHT = 8;

/**
 * 64-bit difference hash as 16 hex digits: the image is squashed to 9x8 greyscale and each bit
 * records whether a pixel is darker than its right-hand neighbour. Survives resizing and
 * recompression, which is what lets a published photo be matched back to its Lightroom export.
 */
export async function differenceHash(input: string | Buffer): Promise<string> {
  const pixels = await sharp(input)
    .greyscale()
    .resize(HASH_WIDTH, HASH_HEIGHT, { fit: "fill" })
    .raw()
    .toBuffer();

  let bits = 0n;

  for (let row = 0; row < HASH_HEIGHT; row++) {
    for (let column = 0; column < HASH_WIDTH - 1; column++) {
      const left = pixels[row * HASH_WIDTH + column] ?? 0;
      const right = pixels[row * HASH_WIDTH + column + 1] ?? 0;

      bits = (bits << 1n) | (left < right ? 1n : 0n);
    }
  }

  return bits.toString(16).padStart(16, "0");
}

/** Number of differing bits between two hashes from `differenceHash`. */
export function hammingDistance(first: string, second: string): number {
  let difference = BigInt(`0x${first}`) ^ BigInt(`0x${second}`);
  let count = 0;

  while (difference > 0n) {
    count += Number(difference & 1n);
    difference >>= 1n;
  }

  return count;
}
