/**
 * Wires the board on `/oxid` to the engine.
 *
 * Three pieces meet here: `ChessBoard.astro` supplies the squares,
 * `chess-position.ts` keeps the game legal between moves, and `chess-engine.ts`
 * answers "what is legal here" and "what would you play". This file is the only
 * one that touches all three, and the only one that touches the DOM.
 */

import { createChessEngine, type ChessEngine } from "./chess-engine";
import { pieceName, pieceSvg } from "./chess-pieces";
import {
  applyMove,
  colorOf,
  findKing,
  hasInsufficientMaterial,
  isInCheck,
  parseFen,
  repetitionKey,
  squareIndex,
  squareName,
  STARTING_FEN,
  toFen,
  type PieceColor,
  type Position,
} from "./chess-position";

interface Snapshot {
  position: Position;
  /** The move that produced this position, absent for the starting one. */
  move: string | undefined;
}

export function startChessGame(root: HTMLElement) {
  /**
   * Games start from the initial position unless the container names another
   * one. Only tests set this: it is the one way to reach a promotion or a
   * castle without playing thirty moves to get there.
   */
  const startingFen = root.dataset.startingFen ?? STARTING_FEN;

  const board = root.querySelector<HTMLElement>("[data-board]");
  const statusElement = root.querySelector<HTMLElement>("[data-status]");
  const movesElement = root.querySelector<HTMLOListElement>("[data-moves]");
  const progressElement = root.querySelector<HTMLElement>("[data-progress]");
  const progressBar = root.querySelector<HTMLElement>("[data-progress-bar]");
  const progressText = root.querySelector<HTMLElement>("[data-progress-text]");
  const strengthSelect = root.querySelector<HTMLSelectElement>("[data-strength]");
  const takebackButton = root.querySelector<HTMLButtonElement>("[data-takeback]");
  const promotionElement = root.querySelector<HTMLElement>("[data-promotion]");

  if (board === null || statusElement === null) {
    return;
  }

  const squares = new Map<string, HTMLButtonElement>();

  for (const square of Array.from(board.querySelectorAll<HTMLButtonElement>("[data-square]"))) {
    squares.set(square.dataset.square ?? "", square);
  }

  let engine: ChessEngine | undefined;
  let playerColor: PieceColor = "white";
  let history: Snapshot[] = [{ position: parseFen(startingFen), move: undefined }];
  let legalMoves: string[] = [];
  let selected: string | undefined;
  let pendingPromotion: { from: string; to: string } | undefined;
  let focusedSquare = "a8";
  let thinking = false;
  let started = false;
  let outcome: string | undefined;

  function current(): Snapshot {
    return history[history.length - 1] as Snapshot;
  }

  function position(): Position {
    return current().position;
  }

  function setStatus(message: string) {
    statusElement!.textContent = message;
  }

  /** Moves the player may start right now, keyed by their origin square. */
  function playableMoves(): string[] {
    if (!started || thinking || outcome !== undefined || position().sideToMove !== playerColor) {
      return [];
    }

    return legalMoves;
  }

  function render() {
    const currentPosition = position();
    const lastMove = current().move;
    const lastMoveSquares =
      lastMove === undefined ? [] : [lastMove.slice(0, 2), lastMove.slice(2, 4)];
    const origin = selected;
    const targets = new Set(
      origin === undefined
        ? []
        : playableMoves()
            .filter((move) => move.startsWith(origin))
            .map((move) => move.slice(2, 4)),
    );
    const origins = new Set(playableMoves().map((move) => move.slice(0, 2)));
    const checkedKing = isInCheck(currentPosition, currentPosition.sideToMove)
      ? findKing(currentPosition, currentPosition.sideToMove)
      : undefined;

    for (const [name, element] of squares) {
      const index = squareIndex(name);

      if (index === undefined) {
        continue;
      }

      const piece = currentPosition.board[index];
      const glyph = element.querySelector<HTMLElement>(".piece");

      if (glyph !== null) {
        // Static markup from chess-pieces.ts, never anything user-supplied.
        glyph.innerHTML = piece === undefined ? "" : pieceSvg(piece);

        if (piece === undefined) {
          delete glyph.dataset.color;
        } else {
          glyph.dataset.color = colorOf(piece);
        }
      }

      toggle(element, "selected", selected === name);
      toggle(element, "target", targets.has(name));
      toggle(element, "occupied", piece !== undefined);
      toggle(element, "lastMove", lastMoveSquares.includes(name));
      toggle(element, "inCheck", checkedKing !== undefined && squareName(checkedKing) === name);
      toggle(element, "playable", origins.has(name) || targets.has(name));

      const description = piece === undefined ? "empty" : `${colorOf(piece)} ${pieceName(piece)}`;
      const action = targets.has(name) ? ", move here" : "";

      element.setAttribute("aria-label", `${name}, ${description}${action}`);
      element.tabIndex = name === focusedSquare ? 0 : -1;
    }

    if (takebackButton !== null) {
      // Undoing means undoing a whole move, the player's and the engine's reply.
      takebackButton.disabled = thinking || history.length < 3;
    }
  }

  function toggle(element: HTMLElement, name: string, on: boolean) {
    if (on) {
      element.dataset[name] = "";
    } else {
      delete element.dataset[name];
    }
  }

  function renderMoves() {
    if (movesElement === null) {
      return;
    }

    movesElement.replaceChildren();

    for (let index = 1; index < history.length; index += 2) {
      const item = document.createElement("li");
      const white = history[index]?.move ?? "";
      const black = history[index + 1]?.move ?? "";

      item.textContent = black === "" ? white : `${white} ${black}`;
      movesElement.append(item);
    }

    movesElement.scrollTop = movesElement.scrollHeight;
  }

  /**
   * `prefix` carries the move the engine just played, which has to come before
   * the result rather than after it: "Oxid played c4d5. Checkmate."
   */
  function describeTurn(prefix?: string) {
    const lead = prefix === undefined ? "" : `${prefix} `;

    if (outcome !== undefined) {
      setStatus(`${lead}${outcome}`);
      return;
    }

    if (thinking) {
      setStatus(`${lead}Oxid is thinking…`);
      return;
    }

    const check = isInCheck(position(), position().sideToMove) ? " You are in check." : "";

    setStatus(
      position().sideToMove === playerColor ? `${lead}Your move.${check}` : `${lead}Oxid to move.`,
    );
  }

  /**
   * Reads the result off the position. Called after every move, using the move
   * list the engine has already been asked for.
   */
  function detectOutcome(): string | undefined {
    const currentPosition = position();

    if (legalMoves.length === 0) {
      if (isInCheck(currentPosition, currentPosition.sideToMove)) {
        return currentPosition.sideToMove === playerColor
          ? "Checkmate. Oxid wins."
          : "Checkmate. You win.";
      }

      return "Stalemate. Draw.";
    }

    if (currentPosition.halfmoveClock >= 100) {
      return "Draw by the fifty-move rule.";
    }

    if (hasInsufficientMaterial(currentPosition)) {
      return "Draw: neither side has enough material to mate.";
    }

    const key = repetitionKey(currentPosition);
    const repetitions = history.filter(
      (snapshot) => repetitionKey(snapshot.position) === key,
    ).length;

    if (repetitions >= 3) {
      return "Draw by threefold repetition.";
    }

    return undefined;
  }

  async function advance(move: string, announcement?: string) {
    history.push({ position: applyMove(position(), move), move });
    selected = undefined;
    renderMoves();
    render();

    legalMoves = await engine!.legalMoves(toFen(position()));
    outcome = detectOutcome();

    render();
    describeTurn(announcement);
  }

  async function playEngineMove() {
    thinking = true;
    render();
    describeTurn();

    try {
      const movetimeMs = Number(strengthSelect?.value ?? 1000);
      const move = await engine!.bestMove(toFen(position()), movetimeMs);

      thinking = false;

      if (move === "") {
        // The engine only returns nothing in a finished position, which the
        // outcome check has already caught.
        describeTurn();
        return;
      }

      await advance(move, `Oxid played ${move}.`);
    } catch (error) {
      thinking = false;
      outcome = `The engine stopped: ${error instanceof Error ? error.message : String(error)}`;
      render();
      describeTurn();
    }
  }

  async function playPlayerMove(move: string) {
    await advance(move);

    if (outcome === undefined) {
      void playEngineMove();
    }
  }

  function selectSquare(name: string) {
    const moves = playableMoves();
    const origin = selected;
    const targets = origin === undefined ? [] : moves.filter((move) => move.startsWith(origin));
    const chosen = targets.filter((move) => move.slice(2, 4) === name);

    if (chosen.length > 1) {
      // Four moves share a from and a to only when a pawn is promoting.
      pendingPromotion = { from: origin as string, to: name };
      showPromotion();
      return;
    }

    if (chosen.length === 1) {
      void playPlayerMove(chosen[0] as string);
      return;
    }

    selected = moves.some((move) => move.startsWith(name)) ? name : undefined;
    render();
  }

  function showPromotion() {
    if (promotionElement === null || pendingPromotion === undefined) {
      // Without the picker in the DOM, promoting to a queen is the sane default
      // rather than refusing the move.
      void playPlayerMove(`${selected}${pendingPromotion?.to}q`);
      return;
    }

    promotionElement.hidden = false;

    for (const button of Array.from(
      promotionElement.querySelectorAll<HTMLButtonElement>("[data-promote]"),
    )) {
      const piece = button.dataset.promote ?? "q";

      button.innerHTML = pieceSvg(piece);
      button.dataset.color = playerColor;
      button.setAttribute("aria-label", `Promote to ${pieceName(piece)}`);
    }

    promotionElement.querySelector<HTMLButtonElement>("[data-promote]")?.focus();
  }

  function hidePromotion() {
    if (promotionElement !== null) {
      promotionElement.hidden = true;
    }

    pendingPromotion = undefined;
  }

  function takeBack() {
    if (thinking || history.length < 3) {
      return;
    }

    history = history.slice(0, -2);
    selected = undefined;
    outcome = undefined;
    renderMoves();
    render();

    void engine?.legalMoves(toFen(position())).then((moves) => {
      legalMoves = moves;
      render();
      describeTurn();
    });
  }

  async function startGame(color: PieceColor) {
    playerColor = color;
    history = [{ position: parseFen(startingFen), move: undefined }];
    selected = undefined;
    outcome = undefined;
    started = true;
    board!.dataset.orientation = color;
    focusedSquare = color === "white" ? "e2" : "e7";
    hidePromotion();
    renderMoves();
    render();

    engine ??= createChessEngine();

    try {
      setStatus("Loading the engine…");
      showProgress(0, 1);

      await engine.load((loadedBytes, totalBytes) => {
        showProgress(loadedBytes, totalBytes);
      });

      hideProgress();

      legalMoves = await engine.legalMoves(toFen(position()));
      outcome = detectOutcome();

      render();
      describeTurn();

      if (position().sideToMove !== playerColor) {
        void playEngineMove();
      }
    } catch (error) {
      hideProgress();
      started = false;
      setStatus(
        `The engine could not be loaded: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  function showProgress(loadedBytes: number, totalBytes: number) {
    if (progressElement === null) {
      return;
    }

    const percent =
      totalBytes === 0 ? 0 : Math.min(100, Math.round((loadedBytes / totalBytes) * 100));

    progressElement.hidden = false;
    progressElement.setAttribute("aria-valuenow", String(percent));

    if (progressBar !== null) {
      progressBar.style.width = `${percent}%`;
    }

    if (progressText !== null) {
      progressText.textContent = `${percent}%`;
    }
  }

  function hideProgress() {
    if (progressElement !== null) {
      progressElement.hidden = true;
    }
  }

  /**
   * Arrow keys walk the board, which beats tabbing through 64 buttons. The
   * board is rotated for black, so the steps are too: "up" is up on screen.
   */
  function moveFocus(fileStep: number, rankStep: number) {
    const index = squareIndex(focusedSquare);

    if (index === undefined) {
      return;
    }

    const direction = playerColor === "white" ? 1 : -1;
    const file = (index % 8) + fileStep * direction;
    const rank = Math.floor(index / 8) - rankStep * direction;

    if (file < 0 || file > 7 || rank < 0 || rank > 7) {
      return;
    }

    focusedSquare = squareName(rank * 8 + file);
    squares.get(focusedSquare)?.focus();
    render();
  }

  board.addEventListener("click", (event) => {
    const square = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-square]");

    if (square?.dataset.square === undefined) {
      return;
    }

    focusedSquare = square.dataset.square;

    if (!started) {
      setStatus("Choose a colour below to start a game.");
      return;
    }

    selectSquare(square.dataset.square);
  });

  // Tabbing or clicking into the grid moves the roving tabindex with it,
  // otherwise the first arrow key jumps back to wherever the last click was.
  board.addEventListener("focusin", (event) => {
    const square = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-square]");

    if (square?.dataset.square !== undefined) {
      focusedSquare = square.dataset.square;
    }
  });

  board.addEventListener("keydown", (event) => {
    const steps: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, 1],
      ArrowDown: [0, -1],
    };
    const step = steps[event.key];

    if (step === undefined) {
      return;
    }

    event.preventDefault();
    moveFocus(step[0], step[1]);
  });

  for (const button of Array.from(root.querySelectorAll<HTMLButtonElement>("[data-start]"))) {
    button.addEventListener("click", () => {
      void startGame(button.dataset.start === "black" ? "black" : "white");
    });
  }

  takebackButton?.addEventListener("click", takeBack);

  promotionElement?.addEventListener("click", (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-promote]");

    if (button === null || pendingPromotion === undefined) {
      return;
    }

    const move = `${pendingPromotion.from}${pendingPromotion.to}${button.dataset.promote ?? "q"}`;

    hidePromotion();
    void playPlayerMove(move);
  });

  render();
  setStatus("Choose a colour to start. The engine is about 2.4MB and loads when you do.");
}
