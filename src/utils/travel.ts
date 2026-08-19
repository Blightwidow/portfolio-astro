import { getCollection, type DataEntryMap } from "astro:content";
import type { Photo } from "./photography";

export type Guide = ValueOf<DataEntryMap["travel"]>;

/** Everything published, most recently updated first. */
export async function getAllGuides(): Promise<Guide[]> {
  const guides = await getCollection("travel");

  return guides.sort((a, b) => {
    const updatedA = a.data.updated ?? a.data.date;
    const updatedB = b.data.updated ?? b.data.date;

    return updatedB.getTime() - updatedA.getTime() || a.data.title.localeCompare(b.data.title);
  });
}

export interface GuideGroup {
  heading: string;
  guides: Guide[];
}

/**
 * The index grouping: guides by continent. Continents are looked up from an explicit map rather
 * than derived from the coordinates, because ten guides is not enough to justify a geo lookup
 * and a wrong guess would be worse than no grouping at all.
 */
const CONTINENTS: Record<string, string> = {
  Cyprus: "Europe",
  France: "Europe",
  Germany: "Europe",
  Greece: "Europe",
  Iceland: "Europe",
  Japan: "Asia",
  "South Korea": "Asia",
  Spain: "Europe",
};

export async function getGuideGroups(): Promise<GuideGroup[]> {
  const guides = await getAllGuides();
  const byContinent = new Map<string, Guide[]>();

  guides.forEach((guide) => {
    const continent = CONTINENTS[guide.data.country] ?? "Elsewhere";
    byContinent.set(continent, [...(byContinent.get(continent) ?? []), guide]);
  });

  // Alphabetical within a group, not by date: this is a reference index people scan for a place
  // name, and a near-alphabetical list with one recently-updated straggler reads as a bug.
  return Array.from(byContinent, ([heading, groupGuides]) => ({
    heading,
    guides: [...groupGuides].sort((a, b) => a.data.title.localeCompare(b.data.title)),
  })).sort((a, b) => a.heading.localeCompare(b.heading));
}

/**
 * Film frames tagged with any of a guide's `photoTags`. The guide and the gallery describe the
 * same trip from two directions, so each one should be able to find the other.
 *
 * `hideFromGallery` frames are left out: a guide is a curated showcase like the gallery, not an
 * exhaustive tag listing, and the hidden ones are hidden because they did not work.
 */
export async function getGuidePhotos(guide: Guide): Promise<Photo[]> {
  const wanted = guide.data.photoTags ?? [];
  if (wanted.length === 0) {
    return [];
  }

  const photos = await getCollection("photography");

  return photos
    .filter(
      (photo) =>
        !photo.data.hideFromGallery &&
        (photo.data.tags?.some((tag) => wanted.includes(tag)) ?? false),
    )
    .sort((a, b) => a.data.roll.id.localeCompare(b.data.roll.id) || a.data.frame - b.data.frame);
}
