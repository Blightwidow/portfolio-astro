#!/usr/bin/env node

import { readdir, writeFile, access } from "fs/promises";
import { join, basename, extname } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PHOTOGRAPHY_DIR = join(__dirname, "..", "src", "content", "photography");

/**
 * Extract date from filename (assuming format YYYYMMDD.jpg)
 * @param {string} filename
 * @returns {string} Date in YYYY-MM-DD format
 */
function extractDateFromFilename(filename) {
  const baseName = basename(filename, extname(filename));

  // Check if filename matches YYYYMMDD pattern
  const dateMatch = baseName.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (dateMatch) {
    const [, year, month, day] = dateMatch;
    return `${year}-${month}-${day}`;
  }

  // Fallback to current date if pattern doesn't match
  return new Date().toISOString().split("T")[0];
}

/**
 * Generate default tags based on common patterns in existing files
 * @returns {string[]} Array of default tags
 */
function generateDefaultTags() {
  return ["35mm"];
}

/**
 * Generate YAML content for a photo
 * @param {string} jpgFilename
 * @returns {string} YAML content
 */
function generateYamlContent(jpgFilename) {
  const date = extractDateFromFilename(jpgFilename);
  const defaultTags = generateDefaultTags();

  return `alt: Add your title here.
description: >
  Add your photo description here.
date: ${date}
image: ./${jpgFilename}
tags:
${defaultTags.map((tag) => `  - ${tag}`).join("\n")}
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
    const jpgFiles = files.filter(
      (file) => extname(file).toLowerCase() === ".jpg"
    );

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
      const yamlContent = generateYamlContent(jpgFile);

      // Write YAML file
      await writeFile(yamlFilePath, yamlContent, "utf8");
      console.log(`✅ Created ${yamlFileName}`);
      createdCount++;
    }

    console.log(
      `\n🎉 Done! Created ${createdCount} new metadata files, skipped ${skippedCount} existing files.`
    );

    if (createdCount > 0) {
      console.log(
        "\n📝 Don't forget to update the generated YAML files with proper descriptions and tags!"
      );
    }
  } catch (error) {
    console.error("❌ Error generating photo metadata:", error.message);
    process.exit(1);
  }
}

// Run the script
generatePhotoMetadata();
