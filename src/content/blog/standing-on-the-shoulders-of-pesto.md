---
title: Standing on the shoulders of PeSTO
subtitle: Better piece-square tables and the limits of handcrafted evaluation
date: 2026-03-21
---

# Standing on the shoulders of PeSTO

At some point, I ran out of search improvements that were easy to implement. The pruning stack was in place. Move ordering was solid. The engine was searching 16-20 plies deep in middlegame positions. And yet, it was still making decisions that felt wrong, not tactically, but positionally. It would put pieces on okay squares instead of great ones. It would trade into endgames it shouldn't. The search was deep enough to see the consequences; the evaluation just wasn't giving it the right signals.

The problem was my piece-square tables. I had tuned them by hand, using a mix of chess intuition, trial games, and guesswork. They were fine. They were not good.

## What PeSTO is

PeSTO is a set of piece-square tables that were tuned by the chess programming community through automated optimization. The name stands for "Piece-Square Tables Only": it's an evaluation that uses nothing but material values and PSTs, with no pawn structure terms, no king safety, no mobility. Just 12 tables of 64 values (6 piece types times 2 phases), tuned to minimize evaluation error against a large dataset of positions with known outcomes.

The idea is simple: if you're going to hand-tune values, why not let a computer do it better? The community ran optimization algorithms (Texel tuning, typically) against millions of positions from engine self-play or human games. The resulting tables encode surprisingly subtle positional knowledge.

A PeSTO knight table doesn't just say "center good, rim bad." It knows that d5 and e5 are slightly better than c5 and f5. It knows that knights on the sixth rank are worth more than knights on the fourth. It encodes patterns that emerge from millions of games, not from a human's rough intuition.

## Swapping in better values

Replacing my hand-tuned PSTs with PeSTO-style values was straightforward mechanically: copy the tables, match the indexing convention, verify the orientation. The results were immediate and clear.

The engine started making noticeably better positional decisions. Knight placements were more purposeful. The king found safer squares during the middlegame. Endgame play improved because the endgame PSTs better reflected piece activity.

I didn't measure the exact Elo gain (I hadn't set up proper testing yet, that comes later), but in practice games the difference was visible. Positions that the engine used to evaluate as roughly equal were now correctly assessed as slightly favoring one side, and that propagated through the search tree to produce better moves.

I also improved the material values themselves. My original values were the classical "pawn=100, knight=300" rounded numbers. PeSTO-style values are more nuanced:

```
Pawn:   82 / 94  (MG / EG)
Knight: 337 / 281
Bishop: 365 / 297
Rook:   477 / 512
Queen:  1025 / 936
```

The bishop being worth more than the knight (365 vs 337 in the middlegame) reflects the well-known slight advantage bishops have in open positions. Rooks being worth more in the endgame (512 vs 477) reflects their power when files open up. These aren't arbitrary numbers: they're the values that, combined with the PSTs, minimize evaluation error across millions of positions.

## What the tables look like

Here's a simplified view of a knight's middlegame piece-square table. Higher values are better squares:

```
-50  -40  -30  -30  -30  -30  -40  -50
-40  -20    0    0    0    0  -20  -40
-30    0   10   15   15   10    0  -30
-30    5   15   20   20   15    5  -30
-30    0   15   20   20   15    0  -30
-30    5   10   15   15   10    5  -30
-40  -20    0    5    5    0  -20  -40
-50  -40  -30  -30  -30  -30  -40  -50
```

The center is king. The edges are death. And within the center, there's a gradient: d4/d5/e4/e5 are slightly preferred over c4/f4. This is all chess intuition, but refined by optimization to specific numbers that actually work.

The king's tables are the most dramatic contrast between phases. Middlegame:

```
 20   30   10    0    0   10   30   20
 20   20    0    0    0    0   20   20
-10  -20  -20  -20  -20  -20  -20  -10
-20  -30  -30  -40  -40  -30  -30  -20
...
```

The king desperately wants to be castled in the middlegame. In the endgame, the same table puts the highest values in the center. The tapered evaluation smoothly transitions between the two as pieces come off the board.

## The ceiling

Here's the thing about handcrafted evaluation, even with well-tuned tables: it has a ceiling. PeSTO-style values are good, but they're still a linear combination of piece placements. They can't express concepts like "this bishop is trapped behind its own pawns" or "this rook has no useful squares" or "this pawn chain is about to collapse." Those require deeper structural analysis that piece-square tables simply can't encode.

I added pawn structure terms (doubled, isolated, passed pawns), bishop pair bonuses, and rook-on-open-file bonuses. Each one helped. But each one also required hand-tuning, and the marginal improvement kept shrinking. I was spending more time tweaking centipawn values and less time seeing Elo gains.

The chess programming community had already solved this problem. The answer was neural networks, specifically, NNUE. But I wasn't ready for that yet. First, I needed to learn how to measure whether changes actually made the engine stronger. That discipline turned out to be just as important as the changes themselves.

And before I could justify the complexity of a neural network, I needed to feel the ceiling of handcrafted evaluation personally. Not read about it, *feel* it. Playing test games where the engine made the same positional mistakes despite my best manual tuning attempts was what finally pushed me toward NNUE.

But I don't regret the handcrafted phase. Writing a tapered evaluation from scratch taught me what chess engines actually care about, and that understanding made the neural network transition much less mysterious when it finally came.
