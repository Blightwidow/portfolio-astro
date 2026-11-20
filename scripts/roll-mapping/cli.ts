#!/usr/bin/env bun
/**
 * `bun scripts/roll-mapping/cli.ts hash`
 *   Rewrites `photo-hashes.json` from the published photos. Run after adding a photo.
 *
 * `bun scripts/roll-mapping/cli.ts verify [Lightroom directory]`
 *   Hashes every `rawNNNN-flickr.jpg` under `Lightroom/YYYYMMDD/` and checks it against the
 *   committed hashes: same frame, one roll per folder. Exits 1 on any conflict.
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { differenceHash } from "./dhash";
import { matchExports, type LightroomExport } from "./match";

const REPOSITORY_ROOT = join(import.meta.dirname, "..", "..");
const PHOTOGRAPHY_DIRECTORY = join(REPOSITORY_ROOT, "src", "content", "photography");
const HASHES_PATH = join(import.meta.dirname, "photo-hashes.json");

async function hashPublishedPhotos(): Promise<void> {
  const filenames = (await readdir(PHOTOGRAPHY_DIRECTORY)).filter((name) => name.endsWith(".jpg"));
  const hashes: Record<string, string> = {};

  for (const filename of filenames.toSorted()) {
    hashes[filename.replace(/\.jpg$/, "")] = await differenceHash(
      join(PHOTOGRAPHY_DIRECTORY, filename),
    );
  }

  await writeFile(HASHES_PATH, `${JSON.stringify(hashes, undefined, 2)}\n`);
  console.log(`Hashed ${filenames.length} published photos into ${HASHES_PATH}`);
}

async function verifyLightroom(lightroomDirectory: string): Promise<void> {
  const publishedHashes: Record<string, string> = JSON.parse(await readFile(HASHES_PATH, "utf8"));
  const exports: LightroomExport[] = [];
  const folders = (await readdir(lightroomDirectory)).filter((name) => /^\d{8}$/.test(name));

  for (const folder of folders.toSorted()) {
    for (const filename of (await readdir(join(lightroomDirectory, folder))).toSorted()) {
      const index = filename.match(/^raw(\d+)-flickr\.jpg$/)?.[1];

      if (index !== undefined) {
        exports.push({
          folder,
          index: Number(index),
          hash: await differenceHash(join(lightroomDirectory, folder, filename)),
        });
      }
    }
  }

  const report = matchExports(exports, publishedHashes);

  console.log(`${report.matched.length} matched, ${report.unmatched.length} unpublished`);
  console.log(`Folder to roll:`, report.rollByFolder);

  for (const conflict of report.conflicts) {
    console.error(
      `conflict ${conflict.folder} raw${conflict.index} ~ ${conflict.photoId}: ${conflict.reason}`,
    );
  }

  if (report.conflicts.length > 0) {
    process.exit(1);
  }
}

const [command, argument] = process.argv.slice(2);

if (command === "hash") {
  await hashPublishedPhotos();
} else if (command === "verify") {
  await verifyLightroom(argument ?? join(REPOSITORY_ROOT, "Lightroom"));
} else {
  console.error("Usage: cli.ts hash | verify [Lightroom directory]");
  process.exit(1);
}
