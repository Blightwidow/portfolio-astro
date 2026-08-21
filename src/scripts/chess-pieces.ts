/**
 * Flat piece silhouettes, drawn rather than typed.
 *
 * The Unicode chess glyphs come from whatever fallback font the browser picks,
 * so their weight and proportions change between platforms and their outline
 * set is far too thin to read at board size. These are single-colour shapes on
 * a 45x45 grid, filled cream or near-black whatever the theme is: a white piece
 * that turns dark in dark mode reads as the wrong side. Each carries an outline
 * in the opposite tone so it stays visible on either square colour.
 *
 * Both `ChessBoard.astro` (server-rendered) and `chess-game.ts` (redrawn after
 * every move) build their markup from here, so the two can never disagree.
 */

/** Piece letter, lowercase, as FEN spells it. */
export type PieceKind = "k" | "q" | "r" | "b" | "n" | "p";

const SHAPES: Record<PieceKind, string> = {
  p:
    '<circle cx="22.5" cy="15.5" r="5.8"/>' +
    '<path d="M17 21.5h11c0 4.2-2.8 5.8-3.4 9.6h-4.2C19.8 27.3 17 25.7 17 21.5z"/>' +
    '<rect x="12.5" y="30.5" width="20" height="5" rx="1.8"/>',
  r:
    '<path d="M11 8h5.2v3.6h4.1V8h4.4v3.6h4.1V8H34v9l-3.2 2.6v9.2L34 31.4V34H11v-2.6l3.2-2.6v-9.2L11 17z"/>' +
    '<rect x="9" y="34" width="27" height="5" rx="1.8"/>',
  // Taller and narrower than the pawn, with the mitre's slit cut out of it:
  // at board size a rounder bishop is indistinguishable from a pawn.
  b:
    '<circle cx="22.5" cy="6.6" r="2.6"/>' +
    '<path d="M22.5 9.6c4.4 3.6 7.4 8.4 7.4 13 0 3.4-2 6-4.7 7.4h-5.4c-2.7-1.4-4.7-4-4.7-7.4 0-4.6 3-9.4 7.4-13zM23.8 14.6l1.9 1.1-4.5 7.8-1.9-1.1z" fill-rule="evenodd"/>' +
    '<rect x="13.5" y="29.6" width="18" height="4.4" rx="1.8"/>' +
    '<rect x="9" y="34" width="27" height="5" rx="1.8"/>',
  n:
    '<path d="M14.5 34c0-6.2 3.1-9.6 7.3-12.2 2.3-1.4 3-2.4 3-3.7 0-.5-.1-.9-.4-1.3l-3.2 3.3-3.9-2.6 3.4-5.9c1.8-3 4.7-5 8.2-5.5L28.3 6l2.6 1.9c3.9 2.9 5.4 7.4 5.4 12.6 0 5.6-1.7 9.9-3.1 13.5z"/>' +
    '<rect x="9" y="34" width="27" height="5" rx="1.8"/>',
  q:
    '<circle cx="8.6" cy="13.4" r="2.6"/><circle cx="15.5" cy="10.4" r="2.6"/>' +
    '<circle cx="22.5" cy="9.4" r="2.8"/><circle cx="29.5" cy="10.4" r="2.6"/>' +
    '<circle cx="36.4" cy="13.4" r="2.6"/>' +
    '<path d="M9.4 15.6l4.1 6.6 2.4-8.6 4.5 8 2.1-8.4 2.1 8.4 4.5-8 2.4 8.6 4.1-6.6L33 30H12z"/>' +
    '<rect x="11" y="30" width="23" height="4.2" rx="1.6"/>' +
    '<rect x="9" y="34.2" width="27" height="4.8" rx="1.8"/>',
  k:
    '<path d="M20.6 4.4h3.8v3.4h3.4v3.8h-3.4v3.4h-3.8v-3.4h-3.4V7.8h3.4z"/>' +
    '<path d="M22.5 15.4c5.8 0 10.5 3.6 10.5 8 0 3.1-1.9 5.3-4.3 6.6H16.3c-2.4-1.3-4.3-3.5-4.3-6.6 0-4.4 4.7-8 10.5-8z"/>' +
    '<rect x="11" y="30" width="23" height="4.2" rx="1.6"/>' +
    '<rect x="9" y="34.2" width="27" height="4.8" rx="1.8"/>',
};

const PIECE_NAMES: Record<PieceKind, string> = {
  k: "king",
  q: "queen",
  r: "rook",
  b: "bishop",
  n: "knight",
  p: "pawn",
};

export function isPieceKind(letter: string): letter is PieceKind {
  return letter in SHAPES;
}

export function pieceName(letter: string): string {
  const kind = letter.toLowerCase();

  return isPieceKind(kind) ? PIECE_NAMES[kind] : "piece";
}

/**
 * Markup for one piece, given its FEN letter. Colour comes from the `data-color`
 * attribute the caller puts on the wrapper, not from here.
 */
export function pieceSvg(letter: string): string {
  const kind = letter.toLowerCase();

  if (!isPieceKind(kind)) {
    return "";
  }

  return `<svg viewBox="0 0 45 45" aria-hidden="true" focusable="false">${SHAPES[kind]}</svg>`;
}
