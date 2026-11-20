#!/usr/bin/env bun

import { access, readdir, readFile, writeFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { parseRollAndFrame } from "./photo-filename";

const PHOTOGRAPHY_DIRECTORY = join(import.meta.dirname, "..", "src", "content", "photography");
const ROLLS_DIRECTORY = join(import.meta.dirname, "..", "src", "content", "rolls");

/**
 * Month (`YYYY-MM`) a roll was shot, from `shotFrom` or `shotMonth`, so a new frame inherits a
 * plausible date instead of an invented one. Undefined when the roll carries neither.
 */
export function extractShotMonth(rollYaml: string): string | undefined {
  const shotFrom = rollYaml.match(/^shotFrom:\s*(\d{4}-\d{2})-\d{2}\s*$/m)?.[1];
  const shotMonth = rollYaml.match(/^shotMonth:\s*(\d{4}-\d{2})\s*$/m)?.[1];

  return shotFrom ?? shotMonth;
}

/**
 * YAML for a new photo. Camera, film, format and process are NOT written here: they belong to
 * the roll (`src/content/rolls/<roll>.yaml`). Tags carry subject and location only.
 */
export function renderPhotoYaml(jpgFilename: string, month: string): string {
  const parsed = parseRollAndFrame(jpgFilename);

  if (!parsed) {
    throw new Error(
      `${jpgFilename} does not match the rNNN-fFF naming scheme (for example r014-f07.jpg).`,
    );
  }

  return `title: Add your title here.
alt: Describe the photo for screen readers here.
description: >
  Add your photo description here.
date: "${month}"
image: ./${jpgFilename}
roll: ${parsed.roll}
frame: ${parsed.frame}
tags:
  - Add subject and location tags here.
`;
}

async function readRollShotMonth(roll: string): Promise<string | undefined> {
  try {
    return extractShotMonth(await readFile(join(ROLLS_DIRECTORY, `${roll}.yaml`), "utf8"));
  } catch {
    return undefined;
  }
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function generatePhotoMetadata(): Promise<void> {
  console.log("Generating photo metadata files...");

  const files = await readdir(PHOTOGRAPHY_DIRECTORY);
  const jpgFiles = files.filter((file) => extname(file).toLowerCase() === ".jpg");

  console.log(`Found ${jpgFiles.length} JPG files`);

  let createdCount = 0;
  let skippedCount = 0;

  for (const jpgFile of jpgFiles) {
    const yamlFileName = `${basename(jpgFile, ".jpg")}.yaml`;
    const yamlFilePath = join(PHOTOGRAPHY_DIRECTORY, yamlFileName);

    if (await fileExists(yamlFilePath)) {
      skippedCount++;
      continue;
    }

    const roll = parseRollAndFrame(jpgFile)?.roll;
    const month =
      (roll === undefined ? undefined : await readRollShotMonth(roll)) ??
      new Date().toISOString().slice(0, 7);

    await writeFile(yamlFilePath, renderPhotoYaml(jpgFile, month), "utf8");
    console.log(`Created ${yamlFileName}`);
    createdCount++;
  }

  console.log(`Done. Created ${createdCount} new metadata files, skipped ${skippedCount}.`);

  if (createdCount > 0) {
    console.log("Update the generated YAML files with titles, alt text and tags.");
  }
}

if (import.meta.main) {
  generatePhotoMetadata().catch((error: unknown) => {
    console.error("Error generating photo metadata:", error);
    process.exit(1);
  });
}
