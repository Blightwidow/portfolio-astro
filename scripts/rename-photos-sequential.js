#!/usr/bin/env node

import { access, readdir, readFile, rename, writeFile } from "fs/promises";
import { basename, dirname, extname, join, resolve } from "path";

/**
 * Convert a glob pattern (*, ?) to a regular expression.
 * @param {string} pattern
 * @returns {RegExp}
 */
function globToRegExp(pattern) {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*")
    .replace(/\?/g, ".");
  return new RegExp(`^${escaped}$`);
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
 * Expand an argument into matching file paths.
 * Works like `ls`: accepts literal paths (already expanded by the shell)
 * or quoted glob patterns that are expanded here.
 * @param {string} argument
 * @returns {Promise<string[]>}
 */
async function expandArgument(argument) {
  const absolutePath = resolve(argument);

  if (await fileExists(absolutePath)) {
    return [absolutePath];
  }

  const directory = dirname(absolutePath);
  const patternRegExp = globToRegExp(basename(absolutePath));

  try {
    const entries = await readdir(directory);
    return entries
      .filter((entry) => patternRegExp.test(entry))
      .sort()
      .map((entry) => join(directory, entry));
  } catch {
    return [];
  }
}

/**
 * Find the latest YYYYMMDD-named photo in a directory.
 * @param {string} directory
 * @returns {Promise<Date>}
 */
async function findLatestDate(directory) {
  const entries = await readdir(directory);
  const dates = entries
    .map((entry) => basename(entry, extname(entry)).match(/^(\d{4})(\d{2})(\d{2})$/))
    .filter((match) => match !== null)
    .map(
      ([, year, month, day]) =>
        new Date(Date.UTC(Number(year), Number(month) - 1, Number(day))),
    );

  if (dates.length === 0) {
    throw new Error(`No YYYYMMDD-named files found in ${directory} to continue from.`);
  }

  return new Date(Math.max(...dates.map((date) => date.getTime())));
}

/**
 * Format a date as YYYYMMDD.
 * @param {Date} date
 * @returns {string}
 */
function formatDate(date) {
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

/**
 * Rename a photo (and its paired .yaml, if any) to the given base name.
 * @param {string} photoPath
 * @param {string} newBaseName
 * @param {boolean} dryRun
 */
async function renamePhoto(photoPath, newBaseName, dryRun) {
  const directory = dirname(photoPath);
  const extension = extname(photoPath);
  const oldBaseName = basename(photoPath, extension);

  const newPhotoName = `${newBaseName}${extension}`;
  const newPhotoPath = join(directory, newPhotoName);

  if (await fileExists(newPhotoPath)) {
    throw new Error(`Refusing to overwrite existing file: ${newPhotoName}`);
  }

  console.log(`📸 ${basename(photoPath)} -> ${newPhotoName}`);
  if (!dryRun) {
    await rename(photoPath, newPhotoPath);
  }

  const yamlPath = join(directory, `${oldBaseName}.yaml`);
  if (!(await fileExists(yamlPath))) {
    return;
  }

  const newYamlName = `${newBaseName}.yaml`;
  const newYamlPath = join(directory, newYamlName);

  console.log(`📝 ${basename(yamlPath)} -> ${newYamlName}`);
  if (dryRun) {
    return;
  }

  const yamlContent = await readFile(yamlPath, "utf8");
  const updatedYamlContent = yamlContent.replace(
    /^image:\s*\.\/.*$/m,
    `image: ./${newPhotoName}`,
  );
  await writeFile(yamlPath, updatedYamlContent, "utf8");
  await rename(yamlPath, newYamlPath);
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const patterns = args.filter((argument) => argument !== "--dry-run");

  if (patterns.length === 0) {
    console.error("Usage: node scripts/rename-photos-sequential.js [--dry-run] <pattern...>");
    console.error(
      'Example: node scripts/rename-photos-sequential.js "src/content/photography/raw*.jpg"',
    );
    process.exit(1);
  }

  const expandedLists = await Promise.all(patterns.map(expandArgument));
  const photoPaths = [...new Set(expandedLists.flat())].filter(
    (filePath) => extname(filePath).toLowerCase() !== ".yaml",
  );

  if (photoPaths.length === 0) {
    console.error("❌ No files matched the given pattern(s).");
    process.exit(1);
  }

  const directories = new Set(photoPaths.map((photoPath) => dirname(photoPath)));
  if (directories.size > 1) {
    console.error("❌ All files must live in the same directory to continue its numbering.");
    process.exit(1);
  }

  const [directory] = [...directories];
  const currentDate = await findLatestDate(directory);

  console.log(
    `Found ${photoPaths.length} file(s), continuing after ${formatDate(currentDate)}${dryRun ? " (dry run)" : ""}`,
  );

  for (const photoPath of photoPaths) {
    currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    await renamePhoto(photoPath, formatDate(currentDate), dryRun);
  }

  console.log(`\n🎉 Done! Renamed ${photoPaths.length} file(s)${dryRun ? " (dry run)" : ""}.`);
}

main();
