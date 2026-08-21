/**
 * Browser-side handle on the Oxid chess engine.
 *
 * The engine is a WebAssembly build that searches synchronously for as long as
 * it is given, so it runs in a Web Worker: a one-second search on the main
 * thread would freeze the page for a second. Everything here is the message
 * plumbing around that worker, and it is deliberately the only part of the
 * board that knows an engine is involved at all.
 *
 * `scripts/fetch-engine.js` puts the worker's payload under `/chess/` at build
 * time. It is ~4.7MB once decompressed, so nothing loads until {@link ChessEngine.load}
 * is called, which should be on a deliberate action rather than on page load.
 */

/** Sent to the worker. Every request carries an id so replies can be matched. */
export type EngineRequest =
  | { type: "load"; id: number }
  | { type: "legalMoves"; id: number; fen: string }
  | { type: "bestMove"; id: number; fen: string; movetimeMs: number };

/** Sent back by the worker. `progress` is unsolicited and carries no id. */
export type EngineResponse =
  | { type: "progress"; loadedBytes: number; totalBytes: number }
  | { type: "loaded"; id: number }
  | { type: "legalMoves"; id: number; moves: string[] }
  | { type: "bestMove"; id: number; move: string }
  | { type: "failed"; id: number; message: string };

/** Called as the net downloads, so the caller can show real progress. */
export type ProgressListener = (loadedBytes: number, totalBytes: number) => void;

export interface ChessEngine {
  /**
   * Downloads and starts the engine. Safe to call more than once: later calls
   * await the first load rather than starting a second one.
   */
  load(onProgress?: ProgressListener): Promise<void>;
  /** Legal moves in `fen`, as UCI strings such as `"e2e4"`. */
  legalMoves(fen: string): Promise<string[]>;
  /**
   * Best move found within `movetimeMs`, as a UCI string. Empty when the
   * position is checkmate or stalemate.
   */
  bestMove(fen: string, movetimeMs: number): Promise<string>;
  /** Stops the worker and rejects anything still in flight. */
  dispose(): void;
}

/**
 * A request minus the id the client assigns. Distributes over the union: a
 * plain `Omit` would collapse the three shapes into their shared keys and lose
 * `fen` along the way.
 */
type UnsentRequest<Request> = Request extends { id: number } ? Omit<Request, "id"> : never;

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
}

/**
 * The engine holds one position at a time and searches synchronously, so the
 * worker answers one request at a time. That is not a constraint worth working
 * around: a queued request simply waits for the current search to end.
 */
export function createChessEngine(): ChessEngine {
  const worker = new Worker(new URL("./chess-engine.worker.ts", import.meta.url), {
    type: "module",
  });

  const pending = new Map<number, PendingRequest>();
  let nextRequestId = 0;
  let progressListener: ProgressListener | undefined;
  let loading: Promise<void> | undefined;
  let disposed = false;

  worker.addEventListener("message", (event: MessageEvent<EngineResponse>) => {
    const response = event.data;

    if (response.type === "progress") {
      progressListener?.(response.loadedBytes, response.totalBytes);
      return;
    }

    const request = pending.get(response.id);

    if (request === undefined) {
      return;
    }

    pending.delete(response.id);

    switch (response.type) {
      case "failed":
        request.reject(new Error(response.message));
        break;
      case "legalMoves":
        request.resolve(response.moves);
        break;
      case "bestMove":
        request.resolve(response.move);
        break;
      case "loaded":
        request.resolve(undefined);
        break;
    }
  });

  // A worker that dies outright (a failed module import, an out-of-memory wasm
  // instantiation) never answers, so fail everything waiting on it instead of
  // leaving the caller with promises that hang forever.
  worker.addEventListener("error", (event) => {
    rejectAll(new Error(event.message || "the chess engine worker stopped unexpectedly"));
  });

  function rejectAll(error: Error) {
    for (const request of pending.values()) {
      request.reject(error);
    }

    pending.clear();
  }

  function send(request: UnsentRequest<EngineRequest>): Promise<unknown> {
    if (disposed) {
      return Promise.reject(new Error("the chess engine has been disposed"));
    }

    const id = nextRequestId++;

    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      worker.postMessage({ ...request, id } as EngineRequest);
    });
  }

  return {
    load(onProgress) {
      progressListener = onProgress;

      loading ??= send({ type: "load" }).then(() => undefined);

      return loading;
    },
    async legalMoves(fen) {
      await this.load();

      return (await send({ type: "legalMoves", fen })) as string[];
    },
    async bestMove(fen, movetimeMs) {
      await this.load();

      return (await send({ type: "bestMove", fen, movetimeMs })) as string;
    },
    dispose() {
      disposed = true;
      worker.terminate();
      rejectAll(new Error("the chess engine has been disposed"));
    },
  };
}
