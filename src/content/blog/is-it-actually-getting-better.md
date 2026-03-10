---
title: Is it actually getting better?
subtitle: SPRT testing, benchmarks, and the discipline of not fooling yourself
date: 2026-03-25
---

# Is it actually getting better?

Here's a scenario that happened to me more than once: I'd implement a new technique, play a few games against the previous version, see it win, and call it an improvement. Two weeks later, I'd discover the "improvement" was actually neutral or even slightly negative, I had just been lucky in a small sample.

Chess engines are stochastic enough that small samples lie to you constantly. Time management jitter, hash table effects, opening variation: all of these inject noise. If your improvement is worth 20 Elo, you need hundreds or thousands of games to detect it reliably. "Feels stronger" is not data.

This post is about the tools and discipline that keep you honest.

## SPRT testing

SPRT, Sequential Probability Ratio Test, is the standard method for testing chess engine changes. Instead of running a fixed number of games and comparing win rates, SPRT runs games until it has enough statistical evidence to accept or reject a hypothesis.

You define two bounds:

- **elo0**: the null hypothesis. "This change is worth at most this many Elo." Usually 0.
- **elo1**: the alternative hypothesis. "This change is worth at least this many Elo." Usually 5 or 10.
- **alpha**: the probability of a false positive (accepting a bad change). Usually 0.05.
- **beta**: the probability of a false negative (rejecting a good change). Usually 0.05.

The test runs games and updates a log-likelihood ratio. When the ratio crosses the upper threshold, H1 is accepted (the change is likely an improvement). When it crosses the lower threshold, H0 is accepted (the change is likely not an improvement). If it's ambiguous, it keeps playing.

In practice, a clear improvement (20+ Elo) resolves in a few hundred games. A marginal improvement (5 Elo) might take thousands. A neutral change might take 10,000+ games before H0 is accepted. This is by design: the test adapts its sample size to the effect size.

## The practical setup

Oxide uses [fastchess](https://github.com/Disservin/fastchess) for SPRT testing. The workflow:

1. Build the baseline (current best version).
2. Make changes and build the new version.
3. Run them head-to-head:

```bash
./bin/fastchess \
    -engine cmd=./target/release/oxide name=oxide \
    -engine cmd=./base/release/oxide name=engine_BASE \
    -each tc=8+0.08 \
    -rounds 15000 -repeat \
    -concurrency 6 -recover \
    -sprt elo0=0 elo1=5 alpha=0.05 beta=0.05
```

Time control is 8 seconds per game plus 80ms increment, fast enough to run thousands of games in a few hours, slow enough that the engine actually searches meaningfully.

The `-repeat` flag means each opening is played twice with colors swapped, removing first-move advantage as a variable. `-concurrency 6` runs 6 games in parallel. `-recover` restarts engines if they crash (they sometimes do during development).

Each SPRT run produces a verdict: H1 accepted (keep the change), H0 accepted (revert it), or still running. There's no middle ground. No "probably good enough." The math decides.

## The benchmark suite

SPRT testing tells you if a change makes the engine play better. The **benchmark** tells you if a change makes the engine *think* differently, even before you run a single game.

Oxide has a 46-position benchmark suite, a curated set of positions that the engine searches at a fixed depth. The benchmark reports the total node count. If you make a change that affects search behavior (new pruning technique, different move ordering, evaluation change), the node count changes. If you make a change that *shouldn't* affect search (refactoring, code cleanup), and the node count changes, you have a bug.

```
$ cargo run -r -- bench
Position: 1/46 (rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1)
...
===========================
Total time (ms) : 8429
Nodes searched  : 18437291
Nodes/second    : 2187489
```

I run `bench` after every change, before even thinking about SPRT. It catches bugs that would otherwise waste hours of game testing. A regression in node count usually means a pruning condition is wrong or a move ordering change has unintended side effects.

## Elo estimation

Oxide doesn't have an official CCRL rating. To estimate its strength, I run SPRT matches against versions of [Stash](https://github.com/mhouppin/stash-bot), a well-established engine with known CCRL ratings.

The method is simple bracketing: find the Stash version that Oxide barely beats and the one it barely loses to. The v0.2.0 release (handcrafted evaluation) barely beat Stash v12, which is rated 1886 Elo on CCRL. So Oxide v0.2.0 is roughly 1900 Elo.

For context, that means v0.2.0 could beat most club players but would lose to any titled player and to pretty much any engine from the last decade. A lot of headroom remains.

| Stash Version | CCRL Elo |
|---------------|----------|
| v9 | 1275 |
| v11 | 1690 |
| v12 | 1886 |
| v13 | 1972 |
| v14 | 2060 |
| v17 | 2298 |
| v20 | 2509 |
| v25 | 2937 |

The gap between Stash v12 (1886) and Stash v25 (2937) is over 1000 Elo. That's the space I still have to climb through with each improvement.

## The discipline

The hardest part of all this isn't the tooling, it's the discipline. Confirmation bias is strong. When you've spent three days implementing a feature, you *want* it to work. You'll unconsciously cherry-pick the games where it played well and dismiss the losses as flukes. SPRT removes that entirely. The test doesn't care how much time you spent. It cares about the statistics.

Some specific habits I've adopted:

- **Test every change independently.** Don't bundle three changes and test them together. If the bundle passes, you don't know which change helped. If it fails, you don't know which one hurt.
- **Run the benchmark before SPRT.** If the node count is unchanged when it shouldn't be, or changed when it shouldn't, investigate before burning hours on games.
- **Accept the verdict.** If H0 is accepted, revert the change. Don't rationalize. Don't re-run with different parameters hoping for a different answer. The test is designed to prevent exactly this kind of self-deception.
- **Keep a changelog.** Write down what you tried, what the SPRT result was, and what you learned. Future you will thank past you.

## Start building

If you've read this far, you might be wondering whether building a chess engine is worth it. My answer: absolutely, if you enjoy the kind of problem-solving it involves.

You don't need to target 3000 Elo. You don't need NNUE. You need a board representation, a search, an evaluation, and UCI support. That's enough to have a playing engine, one that makes moves, plays games, and can be measured. Everything after that is incremental improvement, and each increment teaches you something.

The [Chess Programming Wiki](https://www.chessprogramming.org) is the canonical reference. [Rustic](https://rustic-chess.org/) is a great resource if you want to build in Rust specifically. The community on Stockfish Discord and engine development forums is generous with help and feedback.

And above all: measure. Every change, every idea, every "I think this will be better." Measure it. The numbers don't lie, even when your intuition does.
