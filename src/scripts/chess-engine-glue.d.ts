/**
 * Types for the wasm-bindgen glue that `scripts/fetch-engine.js` writes into
 * `src/generated/chess/`. The engine builds it with --no-typescript, and the
 * file is not committed, so the shape is declared here instead.
 */
declare module "*/generated/chess/oxid.js" {
  /** Instantiates the WebAssembly module. */
  export default function initWasm(options: { module_or_path: string }): Promise<unknown>;

  /** Builds an engine from raw NNUE bytes. See `src/wasm.rs` in the engine. */
  export function init(netBytes: Uint8Array): {
    legal_moves(fen: string): string[];
    best_move(fen: string, movetimeMs: number): string;
  };
}
