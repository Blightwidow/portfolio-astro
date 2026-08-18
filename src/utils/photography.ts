import { getCollection, getEntry, type DataEntryMap } from "astro:content";
import { formatDate } from "./date";
import sharp from "sharp";
import path from "node:path";

export type Photo = ValueOf<DataEntryMap["photography"]>;
export type Roll = ValueOf<DataEntryMap["rolls"]>;

const CONTENT_DIR = path.join(process.cwd(), "src/content/photography");

export async function generatePlaceholder(photoId: string): Promise<string> {
  const filePath = path.join(CONTENT_DIR, `${photoId}.jpg`);
  const buffer = await sharp(filePath).resize(20).blur(5).toFormat("webp").toBuffer();
  return `data:image/webp;base64,${buffer.toString("base64")}`;
}

export async function generatePlaceholders(photos: Photo[]): Promise<Map<string, string>> {
  const entries = await Promise.all(
    photos.map(async (photo) => {
      const placeholder = await generatePlaceholder(photo.id);
      return [photo.id, placeholder] as const;
    }),
  );
  return new Map(entries);
}

export async function getAllPostsByDate(order: "asc" | "desc") {
  const posts = await getCollection("photography");

  return posts
    .sort((a, b) => {
      const byDate =
        order === "asc"
          ? a.data.date.getTime() - b.data.date.getTime()
          : b.data.date.getTime() - a.data.date.getTime();

      return byDate || a.data.roll.id.localeCompare(b.data.roll.id) || a.data.frame - b.data.frame;
    })
    .map((post) => ({
      ...post,
      src: post.data.image.src,
    }));
}

export async function getAllTagsWithCounts(): Promise<{ tag: string; count: number }[]> {
  const posts = await getCollection("photography");
  const counts = new Map<string, number>();
  posts.forEach((post) => {
    post.data.tags?.forEach((tag: string) => {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    });
  });

  return Array.from(counts, ([tag, count]) => ({ tag, count })).sort(
    (a, b) => b.count - a.count || a.tag.localeCompare(b.tag),
  );
}

const CAMERA_LABELS: Record<string, string> = {
  "ricoh 35zf": "Ricoh 35ZF",
  "spotmatic sp1000": "Spotmatic SP1000",
  "zenith 11": "Zenith 11",
};

const FILM_LABELS: Record<string, string> = {
  "250D": "Kodak Vision3 250D",
  "500T": "Kodak Vision3 500T",
  "kodak gold": "Kodak Gold",
  "kentmere 400": "Kentmere 400",
  "kentmere 200": "Kentmere 200",
  "fomapan 400": "Fomapan 400",
};

const PROCESS_LABELS: Record<string, string> = {
  color: "Color",
  "black and white": "Black and white",
  pushed: "Pushed",
};

export function getCameraLabel(camera: string): string {
  return CAMERA_LABELS[camera] ?? camera;
}

export function getFilmLabel(film: string): string {
  return FILM_LABELS[film] ?? film;
}

export function getProcessLabel(process: string): string {
  return PROCESS_LABELS[process] ?? process;
}

/** The roll a photo was shot on, or undefined if the reference cannot be resolved. */
export async function getPhotoRoll(photo: Photo): Promise<Roll | undefined> {
  return getEntry(photo.data.roll);
}

export interface RollSummary {
  id: string;
  camera: string;
  cameraLabel: string;
  film: string;
  filmLabel: string;
  format: string;
  process: string[];
  shotMonth: string | undefined;
  shotFrom: Date | undefined;
  shotTo: Date | undefined;
  frameCount: number;
}

/**
 * When a roll was shot, at the best precision known: an exact window, a month, or nothing at
 * all. Rolls with no date are the ones whose old dates came from the photo-a-day challenge
 * rather than from reality, and saying nothing is the honest answer for them.
 */
export function getRollPeriod(
  roll: Pick<RollSummary, "shotMonth" | "shotFrom" | "shotTo">,
): string | undefined {
  if (roll.shotFrom !== undefined && roll.shotTo !== undefined) {
    return `${formatDate(roll.shotFrom)} to ${formatDate(roll.shotTo)}`;
  }

  if (roll.shotFrom !== undefined) {
    return formatDate(roll.shotFrom);
  }

  if (roll.shotMonth !== undefined) {
    const [year, month] = roll.shotMonth.split("-").map(Number);
    if (year !== undefined && month !== undefined) {
      return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      });
    }
  }

  return undefined;
}

/** Sort key for rolls: earliest known date first, undated rolls last. */
function getRollSortKey(roll: Pick<RollSummary, "shotMonth" | "shotFrom">): string {
  if (roll.shotFrom !== undefined) {
    return roll.shotFrom.toISOString().slice(0, 10);
  }

  return roll.shotMonth === undefined ? "9999-99" : `${roll.shotMonth}-00`;
}

/** Every roll, in shooting order, with how many of its frames are published here. */
export async function getAllRolls(): Promise<RollSummary[]> {
  const rolls = await getCollection("rolls");
  const photos = await getCollection("photography");
  const frameCounts = new Map<string, number>();

  photos.forEach((photo) => {
    const rollId = photo.data.roll.id;
    frameCounts.set(rollId, (frameCounts.get(rollId) ?? 0) + 1);
  });

  return rolls
    .map((roll) => ({
      id: roll.id,
      camera: roll.data.camera,
      cameraLabel: getCameraLabel(roll.data.camera),
      film: roll.data.film,
      filmLabel: getFilmLabel(roll.data.film),
      format: roll.data.format,
      process: roll.data.process,
      shotMonth: roll.data.shotMonth,
      shotFrom: roll.data.shotFrom,
      shotTo: roll.data.shotTo,
      frameCount: frameCounts.get(roll.id) ?? 0,
    }))
    .sort((a, b) => getRollSortKey(a).localeCompare(getRollSortKey(b)) || a.id.localeCompare(b.id));
}

export interface GearCount {
  value: string;
  label: string;
  count: number;
}

/**
 * Cameras and film stocks in use, counted in photos rather than rolls, derived from the roll
 * each photo points at.
 */
export async function getGearInventory(): Promise<{
  cameras: GearCount[];
  films: GearCount[];
  rollCount: number;
}> {
  const rolls = await getAllRolls();
  const cameras = new Map<string, number>();
  const films = new Map<string, number>();

  rolls.forEach((roll) => {
    cameras.set(roll.camera, (cameras.get(roll.camera) ?? 0) + roll.frameCount);
    films.set(roll.film, (films.get(roll.film) ?? 0) + roll.frameCount);
  });

  const toSortedCounts = (
    counts: Map<string, number>,
    label: (value: string) => string,
  ): GearCount[] =>
    Array.from(counts, ([value, count]) => ({ value, label: label(value), count })).sort(
      (a, b) => b.count - a.count || a.label.localeCompare(b.label),
    );

  return {
    cameras: toSortedCounts(cameras, getCameraLabel),
    films: toSortedCounts(films, getFilmLabel),
    rollCount: rolls.length,
  };
}

export interface MonthlyCount {
  month: string;
  label: string;
  count: number;
}

/**
 * Frames per month, taken from roll metadata rather than from each photo's `date`. A roll is
 * counted in the month it was shot (`shotMonth`, or the month `shotFrom` falls in), which is
 * the finest precision that is actually true.
 *
 * Rolls with no date at all are excluded and reported as `unknownFrames`, so the chart never
 * pretends to cover frames it cannot place.
 */
export async function getRollFramesPerMonth(): Promise<{
  months: MonthlyCount[];
  unknownFrames: number;
}> {
  const rolls = await getAllRolls();
  const counts = new Map<string, number>();
  let unknownFrames = 0;

  rolls.forEach((roll) => {
    const month =
      roll.shotFrom === undefined ? roll.shotMonth : roll.shotFrom.toISOString().slice(0, 7);

    if (month === undefined) {
      unknownFrames += roll.frameCount;
      return;
    }

    counts.set(month, (counts.get(month) ?? 0) + roll.frameCount);
  });

  const known = Array.from(counts.keys()).sort();
  const earliest = known.at(0);
  const latest = known.at(-1);

  if (earliest === undefined || latest === undefined) {
    return { months: [], unknownFrames };
  }

  const months: MonthlyCount[] = [];
  const cursor = new Date(`${earliest}-01T00:00:00Z`);
  const end = new Date(`${latest}-01T00:00:00Z`);

  while (cursor <= end) {
    const month = cursor.toISOString().slice(0, 7);
    months.push({
      month,
      label: cursor.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }),
      count: counts.get(month) ?? 0,
    });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  return { months, unknownFrames };
}

/**
 * Fisher-Yates shuffle. Runs at build time, so the order is stable for every visitor of a
 * given deploy and only changes when the site is rebuilt.
 */
export function shuffle<T>(items: T[]): T[] {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const current = shuffled[index];
    const target = shuffled[swapIndex];

    if (current !== undefined && target !== undefined) {
      shuffled[index] = target;
      shuffled[swapIndex] = current;
    }
  }

  return shuffled;
}
