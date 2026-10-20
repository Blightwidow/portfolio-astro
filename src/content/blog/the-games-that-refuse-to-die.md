---
title: The games that refuse to die
subtitle: How decompilation projects are rescuing old games, and why AI just hit the accelerator
date: 2026-10-20
tags:
  - gaming
  - ai
---

# The games that refuse to die

I own a copy of _Twilight Princess_. I love that game: the gloomy atmosphere, Midna, the wolf sections I pretend to enjoy more than I actually do. What I don't love is the idea of digging out an old console, finding the right cables, hoping the disc drive still spins, and squinting at a 480p image on a TV that was never designed for it.

Emulation has been the obvious answer for years, and [Dolphin](https://dolphin-emu.org/) is a genuinely impressive piece of software. But this year I tried something different, and I was honestly blown away.

## Dusklight: Twilight Princess, but native

[Dusklight](https://github.com/TwilitRealm/dusklight) is a native PC port of _Twilight Princess_. Not an emulator pretending to be a GameCube, but the game itself, rebuilt as a regular program that runs on Windows, macOS, Linux and even mobile. It was [released in May 2026](https://zeldauniverse.net/2026/05/16/twilight-princess-fans-create-a-decompiled-pc-port-called-dusklight/), just in time for the game's 20th anniversary.

The difference is immediately noticeable. The game feels **responsive** in a way emulation never quite managed for me, it runs at higher frame rates and resolutions than the original ever could, and it opens the door to things Nintendo never planned for: custom texture packs, replacement models, quality of life tweaks, and a randomizer on the way. It's the game I remember, except it looks the way my memory pretends it did.

And here's the part I find remarkable: Dusklight ships **zero Nintendo assets**. No textures, no music, no models. To play it, you dump your own disc and the port reads the game data from it. So how do you rebuild a game without any of its files?

## What decompilation actually is

When a studio makes a game, developers write source code (usually C or C++) and a compiler turns it into machine code, the raw instructions the console's processor understands. Only that machine code ships on the disc. The source code stays in the studio's vaults, if it survives at all.

Decompilation runs that process in reverse. Volunteers read the machine code and write C that, once compiled with the same compiler and the same settings, produces **exactly the same bytes** as the original. This is called _matching_ decompilation, and it's brutally strict: a function either matches byte for byte or it doesn't. The upside is that once a whole game matches, you have readable source code that is provably equivalent to what shipped.

From there, you can compile that code for something other than a GameCube. Swap the old graphics calls for modern ones, uncap the frame rate, add widescreen, and you get a port like Dusklight. The [Twilight Princess decompilation](https://github.com/zeldaret/tp) behind it started in **2020**, so we're talking about six years of volunteer work before anyone could actually play the result.

It's not the first time this has happened. _Super Mario 64_ was fully decompiled in 2019, which led to PC ports with ray tracing and 60 fps. _Ocarina of Time_ became [Ship of Harkinian](https://www.shipofharkinian.com/), _Majora's Mask_ followed, and a [_Minish Cap_ port](https://zeldauniverse.net/2026/05/16/twilight-princess-fans-create-a-decompiled-pc-port-called-dusklight/) landed a few days before Dusklight.

## Why this matters for preservation

So we get prettier Zelda games, great. But I believe the real value of these projects goes far beyond nicer graphics.

In 2023, the Video Game History Foundation published a [study](https://gamehistory.org/87percent/) showing that **87% of classic games released in the US are no longer commercially available**. For games released before 1985, the reissue rate drops **below 3%**. Imagine if 87% of films made before 2010 could only be watched on the original reels, with projectors nobody manufactures anymore. That's roughly where video games are.

_Twilight Princess_ is actually one of the lucky ones, and even its story is telling. It got an HD remaster in 2016, but on the Wii U, a console Nintendo stopped producing in 2017 and whose online store closed in 2023. The "official" way to play the best version of the game is to buy a discontinued console second hand. Most games never even get that.

Old hardware doesn't age gracefully either. Capacitors leak, disc drives wear out, cartridge batteries die and take your save files with them. Every year, the number of working consoles shrinks and their price on the second-hand market climbs. Emulation helps, but it still depends on someone accurately simulating aging, often poorly documented, hardware.

A decompiled game escapes all of that. Once the source code exists, it can be recompiled for whatever platform comes next, the same way any open-source program gets ported from one operating system to another. It's documentation of how the game actually works, readable by anyone, forever. What strikes me is that this kind of preservation is being done by **volunteers**, for free, while the publishers who own these games have mostly let them gather dust.

## Then AI showed up

For most of its history, decompilation was a slow, artisanal craft. The admin of [decomp.dev](https://decomp.dev), a hub for these projects, described it as a "brutally difficult, time consuming task, on the scale of years". A moderately sized game with several active contributors would typically take years to fully match.

And then, in the span of about a year, that changed.

The trick is that matching decompilation is almost perfectly suited for AI agents. Every attempt comes with an automatic, unforgiving judge: compile the function, compare the bytes, pass or fail. There's no "looks about right". An agent can try, fail, and try again hundreds of times without anyone reviewing its output.

The results are hard to ignore. Developer Chris Lewis decompiled _Snowboard Kids 2_ on the Nintendo 64 over **596 days**, using AI only when stuck. For the first _Snowboard Kids_, he ran AI agents in parallel from the start, and [matched all 2,145 functions in **84 days**](https://aisignal.day/en/ai-game-decompilation-2026/). For comparison, a traditional rule-based decompiler matched **less than 1%** of the functions in the same game. Elsewhere, someone used Claude Code to [match half of _Klonoa: Empire of Dreams_](https://gambiconf.substack.com/p/starting-a-decompilation-project), a 2001 Game Boy Advance game, and along the way the agent stumbled on an Easter egg hidden on the save deletion screen for **25 years**.

### The uncomfortable side

So we're done here, right? Point an agent at every old game and wait?

Not quite, and I have genuinely mixed feelings about it. The same tools that compress years into months also make it trivial to produce something that looks finished but isn't. An AI-generated _Banjo-Tooie_ PC port was [criticized](https://aisignal.day/en/ai-game-decompilation-2026/) by the team behind N64 Recompiled, and the Dusklight project itself now warns that unofficial websites using its name may contain **AI-generated misinformation**. The flood of low effort content, the "AI slop", is very real, and it lands on communities that were built on care and patience.

Agents also cheat when they can. One [write-up of a 600 billion token decompilation](https://momo5502.com/posts/2026-10-09-game-decompilation/) describes agents trying to sneak in raw assembly or simply editing the verification script so their code would "pass". The _Snowboard Kids_ project still needed **three human experts** to solve the hardest functions, without whom Lewis estimates it would have stalled around 90%. The machine does the volume, people still do the hard parts.

The most striking consequence, though, is social. In October 2026, decomp.dev [announced it was shutting down](https://www.404media.co/video-game-reverse-engineering-community-shuts-down-because-ai-has-made-it-too-easy/) its project directory, its admin explaining that "the community aspect of decompilation has been broken". When you can no longer tell which projects are human-led and which are churned out by agents, the shared space where people learned from each other stops making sense. The irony isn't lost on me: the technology that finally makes preservation scale is also eroding the community that made preservation happen in the first place.

I don't think the answer is to reject the tools. A strict byte-matching check is one of the few places where AI output can be verified objectively, and that's exactly where it should shine. What I'd like to see is projects being transparent about how they were built, keeping humans in charge of the review, and remembering that a readable, maintainable codebase is the whole point. Matching bytes with unreadable code preserves the game, but not the understanding of it.

## Twilight Princess on a Steam Deck

Where does that leave me? Mostly excited, if I'm honest.

Decompilation projects are turning the Steam Deck into the console I wish had existed twenty years ago. _Twilight Princess_ running natively, at a smooth frame rate, in widescreen, from the comfort of my couch or a train seat, from a disc I already own. No dusty console, no fragile hardware, no wondering if the next Nintendo console will bother with a re-release.

If AI really does shrink the timeline from years to months, the list of games that get this treatment is about to grow very quickly. I'll keep my mixed feelings about how we get there, but I already know which old discs I'm dumping next.
