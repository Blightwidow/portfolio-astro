#!/usr/bin/env node

import { readdir, readFile, writeFile, access } from "fs/promises";
import { join, basename, extname } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PHOTOGRAPHY_DIR = join(__dirname, "..", "src", "content", "photography");
const ROLLS_DIR = join(__dirname, "..", "src", "content", "rolls");

/**
 * Extract the roll id and frame number from a filename shaped `rNNN-fFF.jpg`.
 * @param {string} filename
 * @returns {{ roll: string, frame: number } | undefined}
 */
function extractRollAndFrame(filename) {
  const baseName = basename(filename, extname(filename));
  const match = baseName.match(/^(r\d{3})-f(\d{2})$/);

  if (!match) {
    return undefined;
  }

  return { roll: match[1], frame: Number(match[2]) };
}

/**
 * Read the shooting window of a roll, so a new frame can inherit a plausible date instead of
 * inventing one. Returns undefined when the roll file has no `shotFrom`.
 * @param {string} roll
 * @returns {Promise<string | undefined>}
 */
async function readRollShotFrom(roll) {
  try {
    const contents = await readFile(join(ROLLS_DIR, `${roll}.yaml`), "utf8");
    return contents.match(/^shotFrom:\s*(\S+)$/m)?.[1];
  } catch {
    return undefined;
  }
}

/**
 * Generate YAML content for a photo. Camera, film, format and process are NOT written here:
 * they belong to the roll (`src/content/rolls/<roll>.yaml`). Tags carry subject and location
 * only.
 * @param {string} jpgFilename
 * @returns {Promise<string>} YAML content
 */
async function generateYamlContent(jpgFilename) {
  const parsed = extractRollAndFrame(jpgFilename);

  if (!parsed) {
    throw new Error(
      `${jpgFilename} does not match the rNNN-fFF naming scheme (for example r014-f07.jpg).`,
    );
  }

  const date = (await readRollShotFrom(parsed.roll)) ?? new Date().toISOString().split("T")[0];

  return `title: Add your title here.
alt: Describe the photo for screen readers here.
description: >
  Add your photo description here.
date: ${date}
image: ./${jpgFilename}
roll: ${parsed.roll}
frame: ${parsed.frame}
tags:
  - Add subject and location tags here.
`;
}

/**
 * Check if a file exists
 * @param {string} filePath
 * @returns {Promise<boolean>}
 */
async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Main function to generate YAML files for JPG images
 */
async function generatePhotoMetadata() {
  try {
    console.log("📸 Generating photo metadata files...");

    // Read all files in the photography directory
    const files = await readdir(PHOTOGRAPHY_DIR);

    // Filter for JPG files
    const jpgFiles = files.filter((file) => extname(file).toLowerCase() === ".jpg");

    console.log(`Found ${jpgFiles.length} JPG files`);

    let createdCount = 0;
    let skippedCount = 0;

    for (const jpgFile of jpgFiles) {
      const yamlFileName = basename(jpgFile, ".jpg") + ".yaml";
      const yamlFilePath = join(PHOTOGRAPHY_DIR, yamlFileName);

      // Check if YAML file already exists
      if (await fileExists(yamlFilePath)) {
        skippedCount++;
        continue;
      }

      // Generate YAML content
      const yamlContent = await generateYamlContent(jpgFile);

      // Write YAML file
      await writeFile(yamlFilePath, yamlContent, "utf8");
      console.log(`✅ Created ${yamlFileName}`);
      createdCount++;
    }

    console.log(
      `\n🎉 Done! Created ${createdCount} new metadata files, skipped ${skippedCount} existing files.`,
    );

    if (createdCount > 0) {
      console.log(
        "\n📝 Don't forget to update the generated YAML files with proper descriptions and tags!",
      );
    }
  } catch (error) {
    console.error("❌ Error generating photo metadata:", error.message);
    process.exit(1);
  }
}

// Run the script
generatePhotoMetadata();
