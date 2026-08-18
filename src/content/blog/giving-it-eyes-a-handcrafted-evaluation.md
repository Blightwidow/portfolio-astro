---
title: "Giving it eyes: a handcrafted evaluation"
subtitle: Material, piece-square tables, and the art of scoring a position
date: 2026-03-15
series:
  name: "Building a chess engine in Rust"
  order: 3
---

# Giving it eyes: a handcrafted evaluation

Once the engine could search, the next question was: search *towards what*? The evaluation function is how the engine scores a position, and the quality of that function determines the quality of play. A perfect search with a bad evaluation is still a bad engine.

My first evaluation was just material counting. Pawns are worth 1, knights and bishops 3, rooks 5, queens 9, the values every chess player learns as a kid. It worked in the most basic sense: the engine tried to win material. But it played like a toddler with a material chart. It had no concept of piece placement, pawn structure, or king safety. A knight on the rim was the same as a knight in the center. A king in the open was the same as a king behind a wall of pawns.

![A marble chess set mid-game in dramatic light (photo by Kevin Hessey on Unsplash)](../../images/chess-eval-light.webp)

## Tapered evaluation

The first real improvement was understanding that chess has phases. A centralized knight is great in the middlegame but less relevant in an endgame. A king in the center is suicidal during the middlegame but strong in the endgame. Pawns become more valuable as pieces come off the board.

**Tapered evaluation** handles this by computing two scores for every position: a middlegame score and an endgame score. Then it blends them based on game phase:

```
phase = sum of phase weights for all pieces on board
score = (mg_score * phase + eg_score * (24 - phase)) / 24
```

Phase weights: knights and bishops are 1, rooks are 2, queens are 4. A full set of pieces totals 24 (pure middlegame). As pieces get traded, the endgame score gains more influence. It's a simple idea, but it lets every evaluation term have different middlegame and endgame values.

Oxide's material values reflect this:

| Piece | Middlegame | Endgame |
|-------|-----------|---------|
| Pawn | 82 | 94 |
| Knight | 337 | 281 |
| Bishop | 365 | 297 |
| Rook | 477 | 512 |
| Queen | 1025 | 936 |

Notice how pawns are worth *more* in the endgame (they can promote), knights are worth *less* (they're slow without tactical targets), and rooks are worth *more* (open files, passed pawn support). These values are in centipawns, so a pawn is roughly 82-94 cp, not the clean 100 you might expect.

## Piece-square tables

Material alone doesn't capture position quality. A knight on e5 is objectively better than a knight on a1. A king on g1 (behind a castled pawn structure) is safer than a king on e1.

**Piece-square tables** (PSTs) assign a bonus or penalty to every piece on every square. Each piece type gets two 64-entry tables: one for middlegame, one for endgame. The knight's middlegame PST has high values in the center and low values on the edges. The king's middlegame PST heavily rewards being in the corner behind pawns. The king's *endgame* PST rewards centralization instead.

These tables are defined in `src/evaluate/tables.rs`. For efficiency, they're indexed from white's perspective using a vertical flip (`square ^ 56`) to reuse the same data for both sides.

The combined effect of material values plus piece-square tables is already a massive improvement. The engine now understands that developing knights to the center is good, keeping the king safe matters, and rooks belong on open files. It goes from "toddler with a material chart" to something that plays recognizable chess.

## Pawn structure

Pawns are unique because they can't move backwards. A bad pawn structure is permanent damage, and good engines know this.

Oxide evaluates three pawn features, all computed with bitboard operations:

**Doubled pawns**: two pawns of the same color on the same file. They block each other and can't protect each other. Penalty: -11 cp (middlegame), -51 cp (endgame). The endgame penalty is much higher because pawns matter more when pieces are off the board.

**Isolated pawns**: a pawn with no friendly pawns on adjacent files. It can never be defended by another pawn and becomes a permanent weakness. Penalty: -5 cp (middlegame), -15 cp (endgame).

**Passed pawns**: a pawn with no enemy pawns ahead of it on its file or adjacent files. It has a clear path to promotion and forces the opponent to dedicate pieces to stopping it. Bonus by rank: the further it advances, the more dangerous it is.

| Relative Rank | 2 | 3 | 4 | 5 | 6 | 7 |
|---------------|---|---|---|---|---|---|
| MG | 5 | 10 | 20 | 40 | 60 | 100 |
| EG | 7 | 16 | 34 | 72 | 128 | 192 |

A passed pawn on the 7th rank in an endgame is worth +192 cp, nearly two full pawns of bonus. That's enough to completely shift the engine's strategy toward pushing and promoting.

## The small bonuses that add up

Two more evaluation terms that made a noticeable difference:

**Bishop pair**: having both bishops gives a bonus of +30/+50 cp (MG/EG). Two bishops complement each other (one covers light squares, one covers dark squares), and their combined power increases as the board opens up in the endgame.

**Rook on open file**: a rook on a file with no pawns gets +25/+10 cp. A rook on a *semi-open* file (no friendly pawns but enemy pawns present) gets +10/+7 cp. Rooks need open lines to be effective, and this guides the engine toward placing them there.

## Putting it all together

The evaluation loop iterates over every piece, accumulating middlegame and endgame scores from material values and piece-square tables. Then it adds pawn structure bonuses/penalties for each side, the bishop pair bonus, and rook file bonuses. Finally, it tapers the two scores by game phase and returns the result from the perspective of the side to move.

None of these terms are individually revolutionary. They're all well-known chess concepts expressed as numbers. But together, they transform the engine from "can search" to "can evaluate." Combined with search, the engine went from around 1200 Elo to something that could beat casual players consistently.

The frustrating part? I had to tune every single one of these values by hand. Is a passed pawn on the 6th rank worth 60 or 70 centipawns in the middlegame? Is the bishop pair bonus really 30, or should it be 25? I didn't know. I guessed, played test games, adjusted, and guessed again.

Eventually, I'd stop guessing and stand on the shoulders of people who had done this properly. But that's a story for later.

