---
title: "Speaking UCI: making your engine talk to the world"
subtitle: The protocol that lets chess engines exist
date: 2026-03-17
---

# Speaking UCI: making your engine talk to the world

You can have the best chess engine in the world, and if it doesn't speak UCI, nobody will ever use it. UCI, Universal Chess Interface, is the protocol that lets chess GUIs, tournament managers, and analysis tools talk to engines. It's how Stockfish communicates with Lichess. It's how my engine communicates with Cute Chess. Without it, your engine is just a program that thinks about chess silently.

## The protocol in 60 seconds

UCI is text-based. The GUI sends commands to the engine's stdin. The engine responds on stdout. That's it. No sockets, no HTTP, no serialization libraries. Just lines of text, back and forth.

Here's a typical conversation:

```
GUI  → uci
Engine → id name Oxide
Engine → id author Theo Dammaretz
Engine → option name Hash type spin default 16 min 1 max 512
Engine → uciok

GUI  → isready
Engine → readyok

GUI  → position startpos moves e2e4 e7e5
GUI  → go wtime 300000 btime 300000 winc 0 binc 0

Engine → info depth 1 score cp 35 nodes 42 nps 840000 pv d2d4
Engine → info depth 2 score cp 10 nodes 187 nps 935000 pv d2d4 d7d5
...
Engine → info depth 12 score cp 28 nodes 482910 nps 2100000 pv g1f3 b8c6
Engine → bestmove g1f3
```

The GUI tells the engine "here's the position, go think." The engine reports its thinking progress (depth, score, principal variation) and eventually announces its chosen move. The GUI tells the engine what happened next, and the cycle repeats.

## The main loop

Oxide's UCI handler is in `src/uci.rs`. The main loop reads from stdin, tokenizes the input, and dispatches:

```rust
if token == "uci" {
    println!("id name Oxide");
    println!("id author Theo Dammaretz");
    println!("option name Hash type spin default 16 min 1 max 512");
    println!("uciok");
} else if token == "isready" {
    println!("readyok");
} else if token == "position" {
    Uci::position(search, &mut args);
} else if token == "go" {
    Uci::go(search, &mut args);
} else if token == "setoption" {
    Uci::option(search, &mut args);
}
```

It's intentionally simple. The `position` command parses a FEN string (or `startpos`) and then replays any listed moves. The `go` command parses time controls and search limits, then calls `search.run(limits)`. The `setoption` command handles configuration like hash table size.

The whole thing is a `loop` that reads one line at a time and breaks on `quit`. There's no async, no threads, no event system. Just stdin and stdout, the way UCI intended.

## The `go` command and its many parameters

The `go` command is where the complexity lives. The GUI can specify:

- `wtime` / `btime`: remaining time for each side in milliseconds
- `winc` / `binc`: increment per move
- `movestogo`: moves until next time control
- `depth`: search to exactly this depth
- `movetime`: search for exactly this many milliseconds
- `infinite`: search until told to stop
- `nodes`: search this many nodes
- `perft`: run a perft count instead of searching

Oxide parses all of these into a `SearchLimits` struct and passes it to the search. Most real games use the `wtime`/`btime`/`winc`/`binc` combination, which is where time management kicks in.

## Time management

Time management sounds simple, "don't run out of time", but it's surprisingly nuanced. You want to think longer on critical moves and faster on forced or obvious ones. You never want to flag (lose on time), but you also don't want to play instantly and waste thinking time.

Oxide uses a two-limit system:

- **Soft limit**: the ideal time to spend. When this expires, the engine finishes its current iteration and stops.
- **Hard limit**: the absolute maximum. If this expires, the engine stops immediately, even mid-search.

The soft limit is calculated from the remaining time, increment, and an estimate of moves remaining. If no `movestogo` is specified, the engine assumes roughly 40 moves remain (adjusted by game ply). The hard limit is always longer than the soft limit, giving the engine room to finish a promising search iteration.

```rust
let time_slice = (increment + time * MAX_USAGE / moves_to_go).round() as u64;
let base_soft_ms = (time_slice as f64 * SOFT_FACTOR).round() as u64;
```

The engine can also **scale** its soft limit dynamically. If the best move is unstable (changing between iterations), it searches longer. If the best move is clear and stable, it stops early. This prevents the engine from agonizing over forced moves while investing more time in genuinely complicated positions.

## The first time in Cute Chess

Loading Oxide into Cute Chess for the first time was one of the most satisfying moments of the project. You configure the engine path, the GUI sends `uci`, and your engine responds with its name. You hit "New Game," and suddenly your code is playing chess, on a real board, with a clock, against another engine or against you.

The first games were humbling. I played against it and won easily, because its evaluation was still basic and its search wasn't deep enough. Then I set it up against Stockfish as a sanity check, and it lost every game in under 30 moves, usually by walking into tactical sequences it couldn't see coming.

But it played. It responded to moves in time. It didn't crash. It didn't send illegal moves. It spoke the language, and that was the ticket to everything that followed: automated testing, tournament play, Elo measurement.

## What I'd tell someone implementing UCI

If you're building a chess engine, implement UCI early. Don't wait until your search is perfect or your evaluation is tuned. Get the protocol working as soon as you have legal move generation and a basic search. Being able to load your engine in a GUI and play against it, or watch it play against other engines, is the fastest feedback loop you'll get.

The protocol itself is straightforward. The spec is one document, and most engines only need to handle about 10 commands. The tricky parts are:

1. **Don't block stdin**: your engine needs to be ready to receive `stop` or `quit` even while searching. Oxide handles this by checking the time limit periodically during search.
2. **Get time management right early**: engines that flag lose games they would have won. A simple "use 1/30th of remaining time" is fine to start.
3. **Print `info` strings during search**: they're not required by the protocol, but they're invaluable for debugging and for understanding what your engine is actually thinking.
4. **Check compliance with some executable**: A lot of test suite exists. `fastchess` for example has a `--compliance` flag to test your engine.

UCI is the boring part of a chess engine. It's also the part that makes everything else possible.

---

*This is part 4 of a series on building a chess engine in Rust. Previous: [Giving it eyes: a handcrafted evaluation](/blog/giving-it-eyes-a-handcrafted-evaluation). Next: [The search for better search](/blog/the-search-for-better-search).*
