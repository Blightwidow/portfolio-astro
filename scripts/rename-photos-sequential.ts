#!/usr/bin/env bun

import { access, readdir, readFile, rename, writeFile } from "node:fs/promises";
import { basename, dirname, extname, join, resolve } from "node:path";

/** Convert a glob pattern (`*`, `?`) to an anchored regular expression. */
export function globToRegExp(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*")
    .replace(/\?/g, ".");

  return new RegExp(`^${escaped}$`);
}

/** Format a date as YYYYMMDD. */
export function formatCompactDate(date: Date): string {
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

/** Latest date among YYYYMMDD-named files, or an error when none exist. */
export function findLatestDate(filenames: string[]): Date {
  const timestamps = filenames
    .map((filename) => basename(filename, extname(filename)).match(/^(\d{4})(\d{2})(\d{2})$/))
    .filter((match) => match !== null)
    .map(([, year, month, day]) => Date.UTC(Number(year), Number(month) - 1, Number(day)));

  if (timestamps.length === 0) {
    throw new Error("No YYYYMMDD-named files found to continue from.");
  }

  return new Date(Math.max(...timestamps));
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Accepts literal paths (already expanded by the shell) or quoted glob patterns expanded here.
 */
async function expandArgument(argument: string): Promise<string[]> {
  const absolutePath = resolve(argument);

  if (await fileExists(absolutePath)) {
    return [absolutePath];
  }

  const patternRegExp = globToRegExp(basename(absolutePath));

  try {
    const entries = await readdir(dirname(absolutePath));

    return entries
      .filter((entry) => patternRegExp.test(entry))
      .toSorted()
      .map((entry) => join(dirname(absolutePath), entry));
  } catch {
    return [];
  }
}

/** Rename a photo, and its paired .yaml if any, to the given base name. */
async function renamePhoto(photoPath: string, newBaseName: string, dryRun: boolean): Promise<void> {
  const directory = dirname(photoPath);
  const extension = extname(photoPath);
  const oldBaseName = basename(photoPath, extension);

  const newPhotoName = `${newBaseName}${extension}`;
  const newPhotoPath = join(directory, newPhotoName);

  if (await fileExists(newPhotoPath)) {
    throw new Error(`Refusing to overwrite existing file: ${newPhotoName}`);
  }

  console.log(`${basename(photoPath)} -> ${newPhotoName}`);
  if (!dryRun) {
    await rename(photoPath, newPhotoPath);
  }

  const yamlPath = join(directory, `${oldBaseName}.yaml`);
  if (!(await fileExists(yamlPath))) {
    return;
  }

  const newYamlName = `${newBaseName}.yaml`;
  console.log(`${basename(yamlPath)} -> ${newYamlName}`);
  if (dryRun) {
    return;
  }

  const yamlContent = await readFile(yamlPath, "utf8");
  await writeFile(
    yamlPath,
    yamlContent.replace(/^image:\s*\.\/.*$/m, `image: ./${newPhotoName}`),
    "utf8",
  );
  await rename(yamlPath, join(directory, newYamlName));
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const patterns = args.filter((argument) => argument !== "--dry-run");

  if (patterns.length === 0) {
    console.error("Usage: bun scripts/rename-photos-sequential.ts [--dry-run] <pattern...>");
    console.error(
      'Example: bun scripts/rename-photos-sequential.ts "src/content/photography/raw*.jpg"',
    );
    process.exit(1);
  }

  const expandedLists = await Promise.all(patterns.map(expandArgument));
  const photoPaths = [...new Set(expandedLists.flat())].filter(
    (filePath) => extname(filePath).toLowerCase() !== ".yaml",
  );

  if (photoPaths.length === 0) {
    console.error("No files matched the given pattern(s).");
    process.exit(1);
  }

  const directories = [...new Set(photoPaths.map((photoPath) => dirname(photoPath)))];
  const [directory] = directories;
  if (directories.length > 1 || directory === undefined) {
    console.error("All files must live in the same directory to continue its numbering.");
    process.exit(1);
  }

  const currentDate = findLatestDate(await readdir(directory));

  console.log(
    `Found ${photoPaths.length} file(s), continuing after ${formatCompactDate(currentDate)}${dryRun ? " (dry run)" : ""}`,
  );

  for (const photoPath of photoPaths) {
    currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    await renamePhoto(photoPath, formatCompactDate(currentDate), dryRun);
  }

  console.log(`Done. Renamed ${photoPaths.length} file(s)${dryRun ? " (dry run)" : ""}.`);
}

if (import.meta.main) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
