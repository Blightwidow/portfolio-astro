import { hammingDistance } from "./dhash";

export interface LightroomExport {
  /** Folder name, `YYYYMMDD`. */
  folder: string;
  /** The `NNNN` of `rawNNNN-flickr.jpg`, i.e. the real position on the strip. */
  index: number;
  hash: string;
}

export interface MatchReport {
  /** Exports whose nearest published photo agrees on frame, with a roll consistent per folder. */
  matched: { folder: string; index: number; photoId: string; distance: number }[];
  /** Exports matching a published photo whose frame or folder-roll disagrees with the export. */
  conflicts: { folder: string; index: number; photoId: string; reason: string }[];
  /** Exports with no published photo within `maximumDistance`: unpublished frames. */
  unmatched: { folder: string; index: number }[];
  /** Folder to the one roll its matches agree on. */
  rollByFolder: Record<string, string>;
}

function parsePhotoId(photoId: string): { roll: string; frame: number } | undefined {
  const match = photoId.match(/^(r\d{3})-f(\d{2})$/);
  const roll = match?.[1];
  const frame = match?.[2];

  return roll === undefined || frame === undefined ? undefined : { roll, frame: Number(frame) };
}

/**
 * Checks the claim the roll numbering rests on: every Lightroom export that resembles a
 * published photo sits at that photo's frame position, and all of a folder's matches name the
 * same roll. Does not assume which roll a folder should be, only that it is consistent.
 */
export function matchExports(
  exports: LightroomExport[],
  publishedHashes: Record<string, string>,
  maximumDistance = 6,
): MatchReport {
  const report: MatchReport = { matched: [], conflicts: [], unmatched: [], rollByFolder: {} };
  const publishedEntries = Object.entries(publishedHashes);

  for (const lightroomExport of exports) {
    let nearest: { photoId: string; distance: number } | undefined;

    for (const [photoId, publishedHash] of publishedEntries) {
      const distance = hammingDistance(lightroomExport.hash, publishedHash);

      if (nearest === undefined || distance < nearest.distance) {
        nearest = { photoId, distance };
      }
    }

    const { folder, index } = lightroomExport;

    if (nearest === undefined || nearest.distance > maximumDistance) {
      report.unmatched.push({ folder, index });
      continue;
    }

    const parsed = parsePhotoId(nearest.photoId);

    if (parsed === undefined) {
      report.conflicts.push({ folder, index, photoId: nearest.photoId, reason: "unparsable id" });
      continue;
    }

    if (parsed.frame !== index) {
      report.conflicts.push({
        folder,
        index,
        photoId: nearest.photoId,
        reason: `export is frame ${index}, published as frame ${parsed.frame}`,
      });
      continue;
    }

    const knownRoll = report.rollByFolder[folder];

    if (knownRoll !== undefined && knownRoll !== parsed.roll) {
      report.conflicts.push({
        folder,
        index,
        photoId: nearest.photoId,
        reason: `folder already maps to ${knownRoll}, this frame is on ${parsed.roll}`,
      });
      continue;
    }

    report.rollByFolder[folder] = parsed.roll;
    report.matched.push({ folder, index, photoId: nearest.photoId, distance: nearest.distance });
  }

  return report;
}
