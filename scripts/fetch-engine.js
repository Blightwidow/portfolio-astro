#!/usr/bin/env node

/**
 * Downloads the browser build of the Oxid chess engine into `public/chess/`.
 *
 * Netlify has no Rust toolchain, so the WebAssembly artifact cannot be built at
 * deploy time. The engine repository publishes it as a release asset instead,
 * and this script pulls a pinned version in before `astro build` runs. Nothing
 * it writes is committed: `public/chess/` is git-ignored and rebuilt from the
 * release on every clean checkout.
 */

import { createHash } from "crypto";
import { execFileSync } from "child_process";
import { mkdir, readdir, readFile, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ENGINE_REPOSITORY = "Blightwidow/oxide-chess-engine";
const ENGINE_VERSION = "v2.0.0";
const ASSET_NAME = "oxide-wasm.tar.gz";

/**
 * SHA-256 of the pinned asset, so a mutated release cannot slip into a build
 * unnoticed. Set to `undefined` only while bootstrapping a new version: the
 * script then prints the hash it saw and asks for it to be pinned here.
 * @type {string | undefined}
 */
const ASSET_SHA256 = "8aa0f7e9a2f77a2a912273001a49a00cd7224efed3f5e4807c38c842060bd9f0";

const OUTPUT_DIRECTORY = join(__dirname, "..", "public", "chess");
const RELEASE_MARKER_PATH = join(OUTPUT_DIRECTORY, ".engine-release");
const MANIFEST_PATH = join(OUTPUT_DIRECTORY, "manifest.json");

/** Files the page needs; a release missing any of them is not usable. */
const REQUIRED_FILES = ["oxid.js", "oxid_bg.wasm"];

const DOWNLOAD_URL = `https://github.com/${ENGINE_REPOSITORY}/releases/download/${ENGINE_VERSION}/${ASSET_NAME}`;

/**
 * Identifies the artifact currently on disk. Includes the hash so that
 * re-pinning a version that was re-uploaded still triggers a fresh download.
 * @returns {string}
 */
function releaseMarker() {
  return `${ENGINE_VERSION} ${ASSET_SHA256 ?? "unpinned"}\n`;
}

/**
 * True when `public/chess/` already holds exactly the release we want.
 * @returns {Promise<boolean>}
 */
async function alreadyDownloaded() {
  let marker;

  try {
    marker = await readFile(RELEASE_MARKER_PATH, "utf8");
  } catch {
    return false;
  }

  if (marker !== releaseMarker()) {
    return false;
  }

  const presentFiles = await readdir(OUTPUT_DIRECTORY);

  return REQUIRED_FILES.every((requiredFile) => presentFiles.includes(requiredFile));
}

/**
 * @returns {Promise<Buffer>} the release asset
 */
async function downloadAsset() {
  let response;

  try {
    response = await fetch(DOWNLOAD_URL);
  } catch (error) {
    throw new Error(`could not reach ${DOWNLOAD_URL}: ${error.message}`);
  }

  if (!response.ok) {
    throw new Error(
      `${DOWNLOAD_URL} returned HTTP ${response.status}.\n` +
        `Tag ${ENGINE_VERSION} of ${ENGINE_REPOSITORY} must exist and its release must ` +
        `carry ${ASSET_NAME}, which the "wasm" job in that repository's release workflow builds.`,
    );
  }

  return Buffer.from(await response.arrayBuffer());
}

/**
 * @param {Buffer} asset
 * @returns {string} lowercase hex digest
 */
function hashAsset(asset) {
  return createHash("sha256").update(asset).digest("hex");
}

/**
 * @param {string} digest
 */
function verifyAsset(digest) {
  if (ASSET_SHA256 === undefined) {
    console.warn(
      `warning: ${ASSET_NAME} is not pinned. Set ASSET_SHA256 in scripts/fetch-engine.js to:\n` +
        `  ${digest}`,
    );
    return;
  }

  if (digest !== ASSET_SHA256) {
    throw new Error(
      `${ASSET_NAME} does not match its pinned hash.\n` +
        `  expected ${ASSET_SHA256}\n` +
        `  received ${digest}\n` +
        `Either the release was re-uploaded, or the download was tampered with. ` +
        `Confirm the release is what you expect before updating the pin.`,
    );
  }
}

/**
 * Unpacks the asset into `public/chess/`, replacing whatever was there. The
 * tarball is packed from the engine's `pkg/` directory, so its entries land at
 * the root: `oxid.js`, `oxid_bg.wasm` and `nets/<promoted-net>.nnue`.
 * @param {Buffer} asset
 */
async function extractAsset(asset) {
  const archivePath = join(tmpdir(), `${ENGINE_VERSION}-${ASSET_NAME}`);

  await writeFile(archivePath, asset);
  await rm(OUTPUT_DIRECTORY, { recursive: true, force: true });
  await mkdir(OUTPUT_DIRECTORY, { recursive: true });

  try {
    execFileSync("tar", ["xzf", archivePath, "-C", OUTPUT_DIRECTORY]);
  } finally {
    await rm(archivePath, { force: true });
  }
}

/**
 * The page loads three things: the JavaScript glue, the WebAssembly module and
 * the NNUE net, which is fetched separately rather than embedded. A release
 * missing any of them would only fail once someone opened the board.
 * @returns {Promise<string>} the name of the NNUE net that shipped
 */
async function verifyExtractedFiles() {
  const presentFiles = await readdir(OUTPUT_DIRECTORY);
  const missingFiles = REQUIRED_FILES.filter(
    (requiredFile) => !presentFiles.includes(requiredFile),
  );

  if (missingFiles.length > 0) {
    throw new Error(`${ASSET_NAME} is missing ${missingFiles.join(", ")}`);
  }

  const nets = presentFiles.includes("nets")
    ? (await readdir(join(OUTPUT_DIRECTORY, "nets"))).filter((file) => file.endsWith(".nnue"))
    : [];

  if (nets.length === 0) {
    throw new Error(`${ASSET_NAME} carries no NNUE net under nets/`);
  }

  if (nets.length > 1) {
    throw new Error(
      `${ASSET_NAME} carries ${nets.length} NNUE nets (${nets.join(", ")}), expected exactly one`,
    );
  }

  return nets[0];
}

/**
 * The net is named after a hash of its weights, so its filename changes every
 * time the engine promotes a new one. The page reads this manifest instead of
 * hardcoding a name that a version bump would silently invalidate.
 * @param {string} net
 */
async function writeManifest(net) {
  const manifest = { version: ENGINE_VERSION, net: `nets/${net}` };

  await writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, undefined, 2)}\n`);
}

async function fetchEngine() {
  if (await alreadyDownloaded()) {
    console.log(`Engine ${ENGINE_VERSION} already in public/chess/`);
    return;
  }

  console.log(`Downloading ${DOWNLOAD_URL}`);

  const asset = await downloadAsset();
  const digest = hashAsset(asset);

  verifyAsset(digest);
  await extractAsset(asset);

  const net = await verifyExtractedFiles();

  await writeManifest(net);
  await writeFile(RELEASE_MARKER_PATH, releaseMarker());

  console.log(`Engine ${ENGINE_VERSION} extracted to public/chess/`);
}

fetchEngine().catch((error) => {
  console.error(`fetch-engine: ${error.message}`);
  process.exit(1);
});
