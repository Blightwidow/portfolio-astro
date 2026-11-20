import { basename, extname } from "node:path";

export interface RollAndFrame {
  roll: string;
  frame: number;
}

const PHOTO_BASENAME_PATTERN = /^(r\d{3})-f(\d{2})$/;

/** Roll id and frame position from a filename shaped `rNNN-fFF.jpg`, or undefined. */
export function parseRollAndFrame(filename: string): RollAndFrame | undefined {
  const match = basename(filename, extname(filename)).match(PHOTO_BASENAME_PATTERN);
  const roll = match?.[1];
  const frame = match?.[2];

  if (roll === undefined || frame === undefined) {
    return undefined;
  }

  return { roll, frame: Number(frame) };
}

/** Inverse of `parseRollAndFrame`, without extension: `r014-f07`. */
export function formatPhotoBasename(roll: string, frame: number): string {
  return `${roll}-f${String(frame).padStart(2, "0")}`;
}
