/// <reference lib="webworker" />

/**
 * Runs the Oxid WebAssembly engine off the main thread.
 *
 * See `chess-engine.ts` for the client half; this file only unwraps requests,
 * calls the engine and posts the answer back.
 */

import type { EngineRequest, EngineResponse } from "./chess-engine";

/** Where `scripts/fetch-engine.js` unpacks the release. */
const ENGINE_DIRECTORY = "/chess";

/** Written by `scripts/fetch-engine.js` from the release it downloaded. */
interface EngineManifest {
  version: string;
  /** Path to the NNUE net, relative to {@link ENGINE_DIRECTORY}. */
  net: string;
  /** Size of the net on disk, which is what the browser decompresses to. */
  netBytes: number;
}

/** The subset of `src/wasm.rs` this page uses, as wasm-bindgen exposes it. */
interface OxidEngine {
  legal_moves(fen: string): string[];
  best_move(fen: string, movetimeMs: number): string;
}

interface OxidModule {
  default(options: { module_or_path: string }): Promise<unknown>;
  init(netBytes: Uint8Array): OxidEngine;
}

const workerScope = self as unknown as DedicatedWorkerGlobalScope;

function post(response: EngineResponse) {
  workerScope.postMessage(response);
}

/**
 * Streams the net so the page can show progress. It is ~4.7MB, several times
 * everything else the site loads put together, and a silent wait that long
 * reads as a broken page.
 */
async function fetchNet(manifest: EngineManifest): Promise<Uint8Array> {
  const response = await fetch(`${ENGINE_DIRECTORY}/${manifest.net}`);

  if (!response.ok || response.body === null) {
    throw new Error(`could not load the engine's neural network (HTTP ${response.status})`);
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let loadedBytes = 0;

  for (;;) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    chunks.push(value);
    loadedBytes += value.length;
    post({ type: "progress", loadedBytes, totalBytes: manifest.netBytes });
  }

  const netBytes = new Uint8Array(loadedBytes);
  let offset = 0;

  for (const chunk of chunks) {
    netBytes.set(chunk, offset);
    offset += chunk.length;
  }

  return netBytes;
}

async function loadEngine(): Promise<OxidEngine> {
  const manifestResponse = await fetch(`${ENGINE_DIRECTORY}/manifest.json`);

  if (!manifestResponse.ok) {
    throw new Error(
      `the chess engine is missing from this build (HTTP ${manifestResponse.status} for ` +
        `${ENGINE_DIRECTORY}/manifest.json). Run "bun run fetch-engine".`,
    );
  }

  const manifest = (await manifestResponse.json()) as EngineManifest;

  // The glue is a build artifact rather than a source file, so it is imported
  // by URL at runtime. @vite-ignore keeps the bundler from trying to resolve a
  // path that only exists after scripts/fetch-engine.js has run.
  const glueUrl = `${ENGINE_DIRECTORY}/oxid.js`;
  const oxid = (await import(/* @vite-ignore */ glueUrl)) as OxidModule;

  await oxid.default({ module_or_path: `${ENGINE_DIRECTORY}/oxid_bg.wasm` });

  // An incompatible net falls back to zero weights engine-side: the engine
  // still plays legal moves, just badly. Nothing to handle here.
  return oxid.init(await fetchNet(manifest));
}

/**
 * One engine per worker, created on the first `load`. It owns the magic
 * bitboards, the transposition table and the net, so rebuilding it per move
 * would cost more than the search itself.
 */
let engine: Promise<OxidEngine> | undefined;

workerScope.addEventListener("message", (event: MessageEvent<EngineRequest>) => {
  const request = event.data;

  engine ??= loadEngine();

  // Requests are answered in order: the engine searches synchronously, so a
  // `bestMove` already running blocks this worker until it returns anyway.
  engine
    .then((loaded) => {
      switch (request.type) {
        case "load":
          post({ type: "loaded", id: request.id });
          break;
        case "legalMoves":
          post({ type: "legalMoves", id: request.id, moves: loaded.legal_moves(request.fen) });
          break;
        case "bestMove":
          post({
            type: "bestMove",
            id: request.id,
            move: loaded.best_move(request.fen, request.movetimeMs),
          });
          break;
      }
    })
    .catch((error: unknown) => {
      // A failed load must not be cached: the next request should retry rather
      // than replay the same rejected promise forever.
      engine = undefined;
      post({
        type: "failed",
        id: request.id,
        message: error instanceof Error ? error.message : String(error),
      });
    });
});
