/**
 * Just enough chess rules to keep a game going between engine calls.
 *
 * The engine answers two questions, "what is legal here" and "what would you
 * play", and both take a FEN. It has no notion of a game in progress, so the
 * page has to hold the position itself and hand back a correct FEN after every
 * move: castling rights, en passant squares and move clocks included. Getting
 * those wrong does not throw, it just quietly feeds the engine a different game
 * than the one on screen.
 *
 * Move generation stays in the engine, which is why there is none here. What is
 * here is move *application*, attack detection (for check and mate) and the
 * draw rules, none of which the engine exposes.
 */

/** Board squares in FEN order: index 0 is a8, index 63 is h1. */
export const BOARD_SIZE = 64;

export type PieceColor = "white" | "black";

/** A piece as FEN spells it: uppercase for white, lowercase for black. */
export type Piece = "P" | "N" | "B" | "R" | "Q" | "K" | "p" | "n" | "b" | "r" | "q" | "k";

export interface Position {
  /** 64 squares, a8 first, `undefined` where empty. */
  board: (Piece | undefined)[];
  sideToMove: PieceColor;
  /** Castling rights as FEN spells them, e.g. `"KQkq"`, or `""` for none. */
  castling: string;
  /** Square index a pawn may capture onto, or `undefined`. */
  enPassant: number | undefined;
  /** Plies since the last capture or pawn move, for the fifty-move rule. */
  halfmoveClock: number;
  fullmoveNumber: number;
}

export const STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

const PIECES = "PNBRQKpnbrqk";

export function isPiece(character: string): character is Piece {
  return PIECES.includes(character);
}

export function colorOf(piece: Piece): PieceColor {
  return piece === piece.toUpperCase() ? "white" : "black";
}

export function opposite(color: PieceColor): PieceColor {
  return color === "white" ? "black" : "white";
}

export function fileOf(square: number): number {
  return square % 8;
}

export function rankOf(square: number): number {
  return Math.floor(square / 8);
}

/** `"e4"` for the square white's king pawn lands on. */
export function squareName(square: number): string {
  return `${"abcdefgh"[fileOf(square)]}${8 - rankOf(square)}`;
}

/** Inverse of {@link squareName}; returns `undefined` for anything unparseable. */
export function squareIndex(name: string): number | undefined {
  const file = "abcdefgh".indexOf(name[0] ?? "");
  const rank = Number(name[1]);

  if (file < 0 || !Number.isInteger(rank) || rank < 1 || rank > 8) {
    return undefined;
  }

  return (8 - rank) * 8 + file;
}

export function parseFen(fen: string): Position {
  const [placement, side, castling, enPassant, halfmove, fullmove] = fen.trim().split(/\s+/);

  if (placement === undefined || side === undefined) {
    throw new Error(`unparseable FEN: ${fen}`);
  }

  const board: (Piece | undefined)[] = Array.from({ length: BOARD_SIZE }, () => undefined);
  let square = 0;

  for (const character of placement) {
    if (character === "/") {
      continue;
    }

    const emptyCount = Number(character);

    if (Number.isInteger(emptyCount)) {
      square += emptyCount;
    } else if (isPiece(character)) {
      board[square] = character;
      square++;
    } else {
      throw new Error(`unparseable FEN placement: ${placement}`);
    }
  }

  return {
    board,
    sideToMove: side === "b" ? "black" : "white",
    castling: castling === undefined || castling === "-" ? "" : castling,
    enPassant: enPassant === undefined || enPassant === "-" ? undefined : squareIndex(enPassant),
    halfmoveClock: Number(halfmove ?? 0),
    fullmoveNumber: Number(fullmove ?? 1),
  };
}

export function toFen(position: Position): string {
  const rows: string[] = [];

  for (let rank = 0; rank < 8; rank++) {
    let row = "";
    let empty = 0;

    for (let file = 0; file < 8; file++) {
      const piece = position.board[rank * 8 + file];

      if (piece === undefined) {
        empty++;
        continue;
      }

      row += empty > 0 ? `${empty}${piece}` : piece;
      empty = 0;
    }

    rows.push(empty > 0 ? `${row}${empty}` : row);
  }

  const enPassant = position.enPassant === undefined ? "-" : squareName(position.enPassant);

  return [
    rows.join("/"),
    position.sideToMove === "white" ? "w" : "b",
    position.castling === "" ? "-" : position.castling,
    enPassant,
    position.halfmoveClock,
    position.fullmoveNumber,
  ].join(" ");
}

/** The squares whose occupant, once it moves or is captured, ends a castling right. */
const CASTLING_RIGHT_BY_SQUARE = new Map<number, string>([
  [squareIndex("a1") ?? 0, "Q"],
  [squareIndex("h1") ?? 0, "K"],
  [squareIndex("a8") ?? 0, "q"],
  [squareIndex("h8") ?? 0, "k"],
]);

export interface ParsedMove {
  from: number;
  to: number;
  /** Lowercase piece letter for a promotion, `undefined` otherwise. */
  promotion: string | undefined;
}

/** Splits a UCI move such as `"e7e8q"`. Returns `undefined` if malformed. */
export function parseMove(move: string): ParsedMove | undefined {
  const from = squareIndex(move.slice(0, 2));
  const to = squareIndex(move.slice(2, 4));

  if (from === undefined || to === undefined) {
    return undefined;
  }

  return { from, to, promotion: move.length > 4 ? move.slice(4, 5).toLowerCase() : undefined };
}

/**
 * Applies a legal UCI move and returns the position after it. The move is
 * assumed legal: legality is the engine's job, and every move offered on the
 * board came from its own list.
 */
export function applyMove(position: Position, move: string): Position {
  const parsed = parseMove(move);

  if (parsed === undefined) {
    throw new Error(`unparseable move: ${move}`);
  }

  const { from, to, promotion } = parsed;
  const board = [...position.board];
  const piece = board[from];

  if (piece === undefined) {
    throw new Error(`no piece on ${squareName(from)} to play ${move}`);
  }

  const mover = colorOf(piece);
  const isPawn = piece.toLowerCase() === "p";
  const isCapture = board[to] !== undefined;
  // The captured pawn of an en passant sits beside the arrival square, not on it.
  const isEnPassantCapture = isPawn && to === position.enPassant && !isCapture;

  board[to] = piece;
  board[from] = undefined;

  if (isEnPassantCapture) {
    board[mover === "white" ? to + 8 : to - 8] = undefined;
  }

  if (promotion !== undefined) {
    const promoted = mover === "white" ? promotion.toUpperCase() : promotion;

    if (isPiece(promoted)) {
      board[to] = promoted;
    }
  }

  // The engine writes castling as the king's two-square move, so the rook has
  // to be brought across separately.
  if (piece.toLowerCase() === "k" && Math.abs(fileOf(to) - fileOf(from)) === 2) {
    const isKingside = fileOf(to) > fileOf(from);
    const rookFrom = isKingside ? to + 1 : to - 2;
    const rookTo = isKingside ? to - 1 : to + 1;

    board[rookTo] = board[rookFrom];
    board[rookFrom] = undefined;
  }

  let castling = position.castling;

  if (piece.toLowerCase() === "k") {
    castling = castling.replace(mover === "white" ? /[KQ]/g : /[kq]/g, "");
  }

  // A rook leaving its corner and a rook captured on it both end the same right.
  for (const square of [from, to]) {
    const right = CASTLING_RIGHT_BY_SQUARE.get(square);

    if (right !== undefined) {
      castling = castling.replace(right, "");
    }
  }

  const isDoublePush = isPawn && Math.abs(rankOf(to) - rankOf(from)) === 2;

  return {
    board,
    sideToMove: opposite(mover),
    castling,
    enPassant: isDoublePush ? (from + to) / 2 : undefined,
    halfmoveClock: isPawn || isCapture || isEnPassantCapture ? 0 : position.halfmoveClock + 1,
    fullmoveNumber: mover === "black" ? position.fullmoveNumber + 1 : position.fullmoveNumber,
  };
}

const KNIGHT_STEPS = [
  [1, 2],
  [2, 1],
  [2, -1],
  [1, -2],
  [-1, -2],
  [-2, -1],
  [-2, 1],
  [-1, 2],
] as const;

const KING_STEPS = [
  [0, 1],
  [1, 1],
  [1, 0],
  [1, -1],
  [0, -1],
  [-1, -1],
  [-1, 0],
  [-1, 1],
] as const;

const ROOK_STEPS = [
  [0, 1],
  [1, 0],
  [0, -1],
  [-1, 0],
] as const;

const BISHOP_STEPS = [
  [1, 1],
  [1, -1],
  [-1, -1],
  [-1, 1],
] as const;

/**
 * Works in file/rank space rather than on raw indices: stepping by ±1 on a flat
 * array walks off the edge of one rank and onto the next.
 */
function squareAt(file: number, rank: number): number | undefined {
  if (file < 0 || file > 7 || rank < 0 || rank > 7) {
    return undefined;
  }

  return rank * 8 + file;
}

function attacksFromSteps(
  position: Position,
  square: number,
  steps: readonly (readonly [number, number])[],
  attackers: string,
  byColor: PieceColor,
): boolean {
  for (const [fileStep, rankStep] of steps) {
    const target = squareAt(fileOf(square) + fileStep, rankOf(square) + rankStep);

    if (target === undefined) {
      continue;
    }

    const piece = position.board[target];

    if (
      piece !== undefined &&
      colorOf(piece) === byColor &&
      attackers.includes(piece.toLowerCase())
    ) {
      return true;
    }
  }

  return false;
}

function attacksAlongRays(
  position: Position,
  square: number,
  steps: readonly (readonly [number, number])[],
  attackers: string,
  byColor: PieceColor,
): boolean {
  for (const [fileStep, rankStep] of steps) {
    let file = fileOf(square) + fileStep;
    let rank = rankOf(square) + rankStep;

    for (;;) {
      const target = squareAt(file, rank);

      if (target === undefined) {
        break;
      }

      const piece = position.board[target];

      if (piece !== undefined) {
        if (colorOf(piece) === byColor && attackers.includes(piece.toLowerCase())) {
          return true;
        }

        break;
      }

      file += fileStep;
      rank += rankStep;
    }
  }

  return false;
}

/** True when `byColor` attacks `square`, whatever stands on it. */
export function isSquareAttacked(position: Position, square: number, byColor: PieceColor): boolean {
  // Pawns capture forwards, so look backwards from the square under threat.
  const pawnRankStep = byColor === "white" ? 1 : -1;
  const pawnSteps = [
    [1, pawnRankStep],
    [-1, pawnRankStep],
  ] as const;

  return (
    attacksFromSteps(position, square, pawnSteps, "p", byColor) ||
    attacksFromSteps(position, square, KNIGHT_STEPS, "n", byColor) ||
    attacksFromSteps(position, square, KING_STEPS, "k", byColor) ||
    attacksAlongRays(position, square, ROOK_STEPS, "rq", byColor) ||
    attacksAlongRays(position, square, BISHOP_STEPS, "bq", byColor)
  );
}

export function findKing(position: Position, color: PieceColor): number | undefined {
  const king = color === "white" ? "K" : "k";
  const square = position.board.indexOf(king);

  return square === -1 ? undefined : square;
}

export function isInCheck(position: Position, color: PieceColor): boolean {
  const king = findKing(position, color);

  return king !== undefined && isSquareAttacked(position, king, opposite(color));
}

/**
 * Identifies a position for repetition purposes: same pieces, same side to
 * move, same rights. Deliberately excludes the move clocks, which differ
 * between two otherwise identical positions.
 */
export function repetitionKey(position: Position): string {
  const placement = toFen(position).split(" ").slice(0, 4).join(" ");

  return placement;
}

/**
 * Neither side can force mate with what is left. Covers the endings that
 * actually turn up: bare kings, a lone minor piece, and bishops of one colour.
 */
export function hasInsufficientMaterial(position: Position): boolean {
  const bishops: number[] = [];
  let knights = 0;

  for (const [square, piece] of position.board.entries()) {
    if (piece === undefined) {
      continue;
    }

    switch (piece.toLowerCase()) {
      case "k":
        break;
      case "b":
        bishops.push(square);
        break;
      case "n":
        knights++;
        break;
      default:
        return false;
    }
  }

  if (knights === 0 && bishops.length === 0) {
    return true;
  }

  if (knights + bishops.length === 1) {
    return true;
  }

  // Any number of bishops, so long as they all stand on one colour of square.
  return (
    knights === 0 &&
    bishops.every(
      (square) =>
        (fileOf(square) + rankOf(square)) % 2 ===
        (fileOf(bishops[0] ?? 0) + rankOf(bishops[0] ?? 0)) % 2,
    )
  );
}
