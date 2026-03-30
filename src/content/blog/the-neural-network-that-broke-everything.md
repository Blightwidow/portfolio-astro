---
title: The neural network that broke everything
subtitle: Switching to NNUE, training with Bullet, and the regressions nobody warns you about
date: 2026-03-23
---

# The neural network that broke everything

I knew I wanted to add NNUE to Oxide for months before I actually did it. The evidence was overwhelming: Stockfish's switch to NNUE in 2020 was one of the biggest Elo jumps in engine history. Every competitive engine uses some form of neural network evaluation now. The handcrafted evaluation had hit its ceiling, and I could feel it in every game where the engine made a positionally dubious move that no amount of PST tuning would fix.

What nobody warned me about was how many things would break along the way.

## What NNUE actually is

NNUE stands for "Efficiently Updatable Neural Network." The key insight is in the "efficiently updatable" part. In a normal neural network, you'd recompute the entire evaluation from scratch for every position. In a chess search, consecutive positions differ by only one move, one piece changes square. NNUE exploits this by maintaining an **accumulator** that can be incrementally updated: when a piece moves, you subtract its old features and add its new ones, rather than recomputing everything.

Oxide's NNUE architecture:

```
768 inputs -> [256] accumulator (x2, one per perspective) -> CReLU
[512] concatenated -> [32] hidden -> CReLU -> [1] output
```

The 768 input features are simply: 2 colors times 6 piece types times 64 squares. Each feature is either 0 or 1, "is there a white knight on e4?" The accumulator is computed from both perspectives (white's view and black's view), concatenated, and passed through a hidden layer to produce a single output score.

The key constants from `src/nnue/defs.rs`:

```rust
pub const FEATURE_SIZE: usize = 768;
pub const HIDDEN_SIZE: usize = 256;
pub const L1_SIZE: usize = 32;
pub const QA: i32 = 255;   // accumulator quantization
pub const QB: i32 = 64;    // output quantization
pub const SCALE: i32 = 400; // output to centipawns
```

Everything runs in integer arithmetic: `i16` for the accumulator, `i32` for intermediate computations. No floating point anywhere in the evaluation. This is critical for speed, the forward pass needs to run millions of times per second during search.

## Training with Bullet

I used the [Bullet](https://github.com/jw1912/bullet) trainer, which is purpose-built for chess NNUE training. The pipeline:

1. Generate training data: millions of positions from engine self-play, each labeled with the game outcome (1.0, 0.5, or 0.0) and the search score.
2. Feed them to Bullet, which trains the network using a loss function that blends the search score with the game result.
3. Export checkpoints at regular intervals.
4. Convert each checkpoint to Oxide's binary format (`.nnue` file with an `OXNN` header).
5. Test each candidate net against the current best.

The conversion step was its own mini-project. Bullet outputs PyTorch-style checkpoints; Oxide needs a custom binary format with quantized `i16` weights. I wrote a converter that reads the checkpoint, quantizes the weights, and writes them with the `OXNN` magic header, version number, and architecture metadata.

Net files are named by their SHA256 hash: `nn-d3ef9a94bfa0.nnue`. This ensures reproducibility, you always know exactly which net you're testing.

## The self-contained binary

One decision I'm particularly happy with: the trained network is embedded directly into the binary.

```rust
pub const EMBEDDED_NET: &[u8] = include_bytes!(concat!("../nets/", "nn-d3ef9a94bfa0.nnue"));
```

No external files to distribute, no path configuration, no "where's the network file?" errors. You download one binary and it works. For development and SPRT testing, you can still load a different net at runtime via the `EvalFile` UCI option, but the default just works.

## The regressions nobody warns you about

Here's where the story gets painful.

**The first trained net was weaker than handcrafted.** After hours of training and conversion, I loaded the first net and ran some test games. It was worse. Noticeably worse. It made bizarre positional judgments, occasionally hallucinated tactical ideas, and lost games the handcrafted eval would have drawn. And on top of that, it was horribly slow.

This is apparently normal. Early training data is often poor (the engine generating it is weak), and the network needs several rounds of self-play improvement to surpass a decent handcrafted evaluation. But "apparently normal" doesn't help when you're staring at your engine blundering a piece and wondering if you broke something fundamental.

**Performance bugs after compilation.** Even after the net was functionally correct and playing decent chess, the engine was slower than expected. The node rate dropped significantly compared to the handcrafted eval, which makes sense, a neural network forward pass is more expensive than adding up a few table lookups. But it was *too* slow, and that meant the search depth advantage that's supposed to compensate for the per-node cost wasn't materializing.

The fix was a combination of things: pre-computing SCReLU activations, transposing the L1 weight matrix for cache-friendly access during the forward pass, and making sure the compiler was actually vectorizing the hot loops (the `target-cpu=native` flag in `.cargo/config.toml` turned out to be critical).

**The emotional rollercoaster.** There were days where a new training run produced a net that was clearly stronger, the engine would find moves I hadn't considered, evaluate positions with accuracy, and beat the old version in testing. And there were days where I'd discover a bug in the accumulator update code, realize the last three days of testing were invalid, and start over.

## When it clicked

The turning point was incremental accumulator updates. Instead of refreshing the entire accumulator on every position (which is correct but slow), the engine now updates it incrementally during `do_move` and `undo_move`. Move a piece from e2 to e4? Subtract the e2 features, add the e4 features. That's a few hundred additions instead of thousands.

Combined with the forward pass optimizations, the engine went from being barely competitive with the handcrafted eval to clearly surpassing it. The NNUE version searched a couple of plies shallower but evaluated positions so much more accurately that it played significantly stronger chess.

The v1.0.0 release of Oxide is the NNUE version. It removed the entire handcrafted evaluation: all the piece-square tables I had tuned by hand, the pawn structure analysis, the bishop pair bonus, the rook-on-open-file detection. All of it replaced by a 768-to-256-to-32-to-1 network that learned those patterns (and many more) from data.

I won't pretend it wasn't bittersweet. I spent weeks hand-tuning those evaluation terms, and they're all gone now. But the engine is objectively stronger for it, and that's what matters.

---

*This is part 7 of a series on building a chess engine in Rust. Previous: [Standing on the shoulders of PeSTO](/blog/standing-on-the-shoulders-of-pesto). Next: [Is it actually getting better?](/blog/is-it-actually-getting-better).*
