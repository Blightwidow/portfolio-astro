---
title: Teaching a computer what a chessboard is
subtitle: Bitboards, magic numbers, and the first 10,000 bugs
date: 2026-03-11
---

# Teaching a computer what a chessboard is

I started building a chess engine because I wanted a project that was hard in a way I hadn't experienced before. Not "hard to ship" or "hard to scale", hard to think about. Chess engines sit at this intersection of computer science, mathematics, and game theory that I found irresistible. After multiple bot and AI for CodinGame, I felt I was ready. I picked Rust because I wanted something fast without manual memory management, and because the type system would catch entire categories of bugs before they reached the board.

The engine is called [Oxide](https://github.com/Blightwidow/oxide-chess-engine). This is the story of how it went from zero to generating legal moves, which turned out to be much harder than I expected.

## How do you even represent a chessboard?

The first decision is deceptively simple: how does the computer "see" the board?

There are two classical approaches. A **mailbox** is just an array of 64 slots, one per square, each holding whatever piece is there (or nothing). It's intuitive: you look up square e4 and get "white pawn." In Oxide, it's literally `board: [Piece; 64]`.

But a mailbox is slow for the questions an engine asks most often: "where are all the white knights?" or "what squares does this bishop attack?" You'd have to loop through all 64 squares every time.

**Bitboards** solve this. A bitboard is a single 64-bit integer where each bit represents a square. Bit 0 is a1, bit 63 is h8, a layout called LERF (Little-Endian Rank-File). Want all the white pawns? That's one `u64`. Want to know if a square is occupied? One bitwise AND. Want all squares attacked by a rook? Another `u64`.

Oxide uses both. The mailbox gives O(1) "what's on this square?" lookups. The bitboards give fast set operations for attack generation and evaluation. The core types are deliberately simple, everything is a `usize` alias:

```rust
pub type Bitboard = u64;
pub type Piece = usize;
pub type Side = usize;
pub type Square = usize;
```

Pieces are encoded as `side * 8 + piece_type`. White knight is `0 * 8 + 2 = 2`. Black queen is `1 * 8 + 5 = 13`. It's compact, and you can extract the color or type with a single division or modulo.

## Magic bitboards (the part that hurts)

Generating attacks for knights and kings is easy: they always move to the same relative squares, so you precompute a lookup table indexed by the origin square. Sixty-four entries, done.

Sliding pieces (bishops, rooks, queens) are different. A rook on e4 can slide in four directions, but it stops when it hits another piece. The set of attacked squares depends on what's *blocking* the path. That's a huge number of possible configurations.

The solution the chess programming community converged on is called **magic bitboards**. The idea is: take the set of occupied squares that could block a sliding piece, multiply it by a carefully chosen "magic number," and use the result as an index into a precomputed attack table. The magic number is chosen so that different blocking configurations map to different indices, a perfect hash, essentially.

I won't pretend I derived the magic numbers myself. I used the well-known set that the community has published. But even implementing the lookup correctly took days of debugging. Off-by-one errors in bit shifts. Wrong mask boundaries. Forgetting that the edges of the board don't count as blockers for the mask (but do count for the attack set). Quite some pains but lots of learnings.

## Legal moves: where the real pain lives

Generating *pseudo-legal* moves, moves that look legal but might leave your king in check, is relatively straightforward once you have attack tables. Generating *actually legal* moves is where everything falls apart.

The engine has to handle:

* **Pins**: a bishop might be pinned to the king by an enemy rook, meaning it can only move along the pin ray. You can't just check "does this piece have moves", you have to verify each move doesn't expose the king.
* **En passant**: the most cursed rule in chess. Not only do you need to track the target square from the previous move, but en passant can *reveal a discovered check* in bizarre ways. Two pawns disappear from the same rank, and suddenly a rook sees the king.
* **Castling through check**: the king can't castle through or into check, and the rook's path must be clear. That's multiple conditions that all have to be verified simultaneously.

I spent more time debugging move generation than any other part of the engine. Probably more time than all other parts combined.

## The KiwiPete moment

How do you even test a move generator? The answer is **perft**, a brute-force count of all legal positions reachable from a given position at a given depth. The community maintains reference positions with known perft counts, so you can compare your numbers.

The most famous test position is called KiwiPete:

```
r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1
```

It's designed to torture move generators. It has castling rights on both sides, pins, en passant opportunities, and pieces crammed into awkward positions. When my perft count for KiwiPete finally matched the reference at depth 6, I genuinely cheered. It meant every edge case, every pin, every en passant discovered check, every castling condition, was correct.

## Move encoding

Moves in Oxide are packed into a single `u16`:

```
Bits:  [15:14]  [13:12]  [11:6]  [5:0]
       type     promo    from    to
```

Four move types: Normal (0), Promotion (1), En Passant (2), Castling (3). Promotion pieces are encoded in bits 13-12. It's tight, it's fast, and it fits in a move list backed by `arrayvec`, the engine's single external dependency.

## What I learned

The board representation and move generation took me longer than I expected, weeks of evenings and weekends. The bugs were subtle: an engine that generates 99.99% of moves correctly will still lose games in bizarre ways, because the 0.01% always involves a king.

But getting perft right was deeply satisfying. It's one of those rare moments in programming where the answer is either exactly correct or wrong. No ambiguity, no "it depends." Your move generator either produces 3,195,901,860 nodes from the starting position at depth 7, or it doesn't.

With legal move generation working, Oxide could now understand what a chessboard is and what moves are possible. It just had no idea which moves were *good*. That's what the next post is about: teaching it to play, badly.

---

*This is part 1 of a series on building a chess engine in Rust. Next: [My first shitty playable bot](/blog/my-first-shitty-playable-bot).*
