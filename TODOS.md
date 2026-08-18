# TODOS

Backlog of planned work. Newest ideas at the bottom.

## Blog series as data

**Status**: Complete (2026-08-18)

Shipped. `series` is a nested `{ name, order }` object rather than two loose fields, so a post cannot declare a series without its position in it. Three series backfilled: Building a chess engine in Rust (8 parts), The new Space Race (3), Train prices in Europe (2). The eight hand-written italic sign-offs are gone; each post already closed on a forward-looking line in the body, so only the mechanical part/prev/next text was removed. `SeriesNav.astro` renders "Part 5 of 8" under the meta line (excluded from the Pagefind index) and a previous/next block after the article, with the last part linking to the series page instead of a dead Next.

`/blog/series/<slug>` lists parts in reading order. Collapsing each series into a single listing entry was tried and rejected: the paginated feed stays a flat chronological list of every post, with a small "Building a chess engine in Rust, part 5 of 8" line under each title linking to its series page.

Resolved: series pages live under `/blog/series/`, and RSS is untouched (individual posts, no series prefix in titles). `CLAUDE.md` updated: the sign-off convention is now rendered, never hand-written.

<details>
<summary>Original plan</summary>

Roughly 12 of 19 posts belong to a series (chess engine in Rust: 7 parts, The New Space Race: 3 parts, trains/pricing: 2), but the series only exists as hand-written prose. Each part ends with an italic sign-off that manually links the previous and next article (see the end of `src/content/blog/standing-on-the-shoulders-of-pesto.md`). That breaks whenever a part is inserted or renamed, gives readers who land mid-series from search no entry point, and is invisible to RSS and Pagefind.

Make the series a first-class field so navigation is derived instead of typed.

- Add to the blog schema in `src/content.config.ts`: `series: z.string().optional()`, `seriesOrder: z.number().optional()`.
- Backfill the frontmatter of the existing series posts, then delete the manual prev/next sign-offs.
- Add `getSeries(name)` and `getSeriesNav(post)` to `src/utils/blog.ts`.
- New `src/components/SeriesNav.astro`: "Part 3 of 7", previous and next links. Render it in `src/pages/blog/[slug].astro`.
- New `src/pages/blog/series/[series].astro`: ordered landing page listing every part of one series.
- ~~Group series entries in the `/blog` listing so the 7 chess posts do not fill an entire page.~~ Tried and reverted: the flat feed reads better.

Open questions:

- Should a series landing page live at `/blog/series/<slug>` or at `/series/<slug>`?
- Does the RSS feed announce the series name in the item title, or stay untouched?

</details>

## Blog topics/tags

**Status**: Complete (2026-08-18)

Shipped. `tags` is an optional string array on the blog schema, backfilled across all 22 posts with a 12-term vocabulary: `engineering` (10), `chess` (8), `rust` (8), `environment` (5), `travel` (4), `space` (3), `trains` (3), `ai` (2), `hiking` (2), `housing` (1), `photography` (1), `work` (1).

`/blog/tag/<tag>` lists posts for one topic, and `TagList.astro` now takes `baseUrl`/`allUrl`/`allLabel`/`ariaLabel` instead of hardcoding the photography routes, so both sections share the component. The listing markup (title, series line, subtitle, date) moved out of `src/pages/blog/[page].astro` into `PostList.astro`, used by both the paginated feed and the tag pages.

Post pages close with `#tag` links, then `SeriesNav`, then a "Read next" block. Related posts rank by shared tag count with recency as the tiebreak, top up with recent posts when fewer than three share a tag, and **exclude other parts of the same series**, since `SeriesNav` already links those and they would otherwise fill every slot on a chess post. All three blocks sit outside `<article data-pagefind-body>`, so none of it enters the search index.

Resolved: two separate namespaces. Photo tags stay subject-and-location only per the existing rule, so a shared vocabulary would have meant either polluting them with topics or leaving half the tag space empty on each side. Tags render in the footer, keeping the header meta line (date, reading time, series part) to one line.

<details>
<summary>Original plan</summary>

Photography has tags and `/photography/[tag]`; the blog has no taxonomy at all. The content already splits cleanly into engineering, space, trains and climate, housing, photography, and AI. Reuse the existing photography patterns rather than inventing new ones.

- Add `tags: z.array(z.string()).optional()` to the blog schema, and backfill all 19 posts.
- New `src/pages/blog/tag/[tag].astro`, modelled on `src/pages/photography/[tag].astro`.
- Reuse `src/components/TagList.astro` on the blog listing and `src/components/Tag*` markup on the post page.
- Add a "related posts" block on `src/pages/blog/[slug].astro`, ranked by shared tag count and falling back to recency.

Open questions:

- One flat tag vocabulary shared between blog and photography, or two separate namespaces?
- Show tags on the post page header or footer?

</details>

## Film gear & stats page

**Status**: Complete (2026-08-18)

Shipped as `/photography/stats`: a photos-per-month histogram (dates come from the `YYYYMMDD` filenames, so they are capture dates), then cameras and film stocks, each with a photo count, a bar on wide screens, and a link to the existing tag gallery, in a two-column compact layout. Lenses, formats, and process are classified but deliberately not shown. Photo pages now open with a "Shot on Spotmatic SP1000 · Kodak Vision3 250D · 35mm · Color" credit line, with locations and themes still listed as `#tags` below it. Classification lives in `GEAR_TAG_LABELS` in `src/utils/photography.ts`.

Resolved: allow-lists in code, no schema change and no 102-file backfill. Gear pages stay out of the Pagefind index, matching the gallery index. New unclassified tags fall through to the `#tag` list rather than being guessed at as gear, so adding a camera means adding one line to `GEAR_TAG_LABELS`.

Follow-ups worth noting: film-stock display names assert brands the tags do not (`250D` renders as "Kodak Vision3 250D"), and location tagging is inconsistent (`france`, `united kingdom`, and `spain` coexist with city tags like `paris` and `lyon`).

A photos-per-month histogram was built here and then removed: `date` was the publication slot of the photo-a-day challenge, not when the shot was taken. The Barcelona and Cyprus batches have since been corrected to their real trip windows from the Obsidian notes, so 23 of 102 photos now carry true dates and the rest do not. The histogram becomes worth rebuilding once most photos have real dates. Any shooting timeline needs capture data the site does not hold. The realistic unit for film is the roll, so that would mean a new optional `roll` field (name, plus roughly when it was shot and developed) backfilled by hand, which also unlocks per-roll galleries and a "19 rolls" style count.

<details>
<summary>Original plan</summary>

Photo tags already encode camera, film stock, format, and location (`src/content/photography/20250822.yaml` carries `35mm`, `250D`, `spotmatic sp1000`, `cyprus`, `color`, `dreamscape`), but nothing outside `/photography/[tag]` reads that structure. A gear page turns curated metadata that already exists into a page film shooters actually search for. No new dependencies.

- Add tag-classification helpers to `src/utils/photography.ts`: split the flat tag list into cameras, film stocks, formats, and everything else. Classification needs an explicit allow-list per category, since the tags are a single flat namespace.
- New `src/pages/photography/gear.astro`: cameras and stocks with photo counts, each linking to the existing tag gallery.
- Add a "shot on" credit line to `src/pages/photography/photo/[id].astro`, built from the same classification instead of the raw `#tag` list.
- Link the page from the `/photography` intro block.

Open questions:

- Explicit allow-lists in code, or a new optional `camera`/`film` field in the photography schema, backfilled across 102 files?
- Does the gear page belong in the Pagefind index?

</details>

## Play Oxide in the browser

**Status**: Not Started (investigated 2026-08-18)

Compile the Rust chess engine to WASM and add a page where visitors play it. Biggest differentiator on the site, and by far the biggest effort. Investigation of `Blightwidow/oxide-chess-engine` (v1.3.0) says it is viable:

- Search is single-threaded (`src/search/defs.rs:40`), so no wasm-threads or SharedArrayBuffer headers needed.
- NNUE already has a scalar fallback for non-x86/ARM targets (`src/nnue/simd.rs:111`), so wasm32 compiles. It will be much weaker than native until `simd128` is wired up.

Blockers, all on the engine side:

- `pyrrhic_rs` (`src/tablebase.rs`) is a C-binding Syzygy probe and will not build for wasm. Needs a Cargo feature gate.
- The crate is bin-only and driven by stdin through `Uci::main_loop` (`src/main.rs:52`). Needs a `[lib]` target plus a `wasm-bindgen` shim exposing something like `best_move(fen, movetime_ms)` and `legal_moves(fen)`. Exposing legal moves from the engine's own movegen avoids a `chess.js` dependency in the browser.
- The embedded net is 3.0 MB (`nets/nn-8808c22a8203.nnue`), so the payload is roughly 3-4 MB. Must be lazy-loaded on user intent, never on page load.
- Netlify has no Rust toolchain, so the artifact cannot be built at deploy time. Either commit a prebuilt `.wasm` under `public/`, or have engine-repo CI publish it as a release asset the site build downloads.
- Local toolchain is incomplete: Homebrew rust, no rustup, no `wasm32-unknown-unknown` target, no `wasm-bindgen-cli`.

Browser side, once the shim exists: run the engine in a Web Worker so search never blocks the main thread, render the board as a CSS grid with Unicode pieces (no piece-asset licensing or extra bytes), and keep the UI engine-agnostic behind a small interface.

Open questions:

- Where do the engine changes live: a branch on the engine repo, or vendored into this repo?
- Ship the net inside the `.wasm`, or as a separately cacheable fetched file?
- Is a weak scalar-fallback engine worth shipping, or is `simd128` a prerequisite?

## Roll-based photo identity

**Status**: Complete (2026-08-18)

Photo filenames used to be `YYYYMMDD`, one photo per day, taken from the photo-a-day challenge slot rather than from when the shot was taken. That made every date-based feature a lie and capped the collection at one photo per day. Replaced by roll and frame, the units film actually has.

- Files are now `rNNN-fFF.{jpg,yaml}`, which is also the URL (`/photography/photo/r014-f07`). No date in the identifier, so nothing can claim a day it does not know.
- New `rolls` collection in `src/content/rolls/`: camera, film, format, process, and an optional shot window. The 102 photos were grouped into **16 rolls** by camera plus stock plus process, split on gaps over 30 days. Frame numbers are scan order within the roll. Roll boundaries are inferred, not recorded, so they are a best guess: the blog post claims 19 rolls for the challenge year.
- Camera, film, format and process are gone from photo tags: they were duplicated across 102 files and are roll facts. Tags now carry subject and location only, which is also what makes the tag rule self-enforcing rather than a convention to remember.
- New `/photography/roll/<id>` gallery per roll, linked from each photo's credit line and from the roll index on `/photography/stats`.
- `public/_redirects` maps all 102 old photo URLs to their new ones.
- `scripts/generate-photo-metadata.js` now parses `rNNN-fFF`, refuses anything else, and seeds `date` from the roll's `shotFrom` instead of from the filename.

Roll membership was later rebuilt from the `Lightroom/` export (one `YYYYMMDD` folder per developed roll) instead of being inferred from tags: every published photo was difference-hashed against all 798 exported frames, giving **22 rolls** rather than the 16 guessed from tags, with real strip positions as frame numbers. The inference had over-merged two rolls badly (one guessed roll was really four). Two exported rolls (`20250421`, `20251122`) have no published frames and therefore no roll entry, since camera and stock cannot be known without one.

Follow-ups:

- `50mm lens` is still a photo tag rather than roll data, deliberately: a lens can change mid-roll. Promote it to an optional `lens` field on the photo if it ever needs counting.
- Every roll now carries a `shotMonth` taken from its Lightroom folder, so no roll is undated and the frames-per-month chart covers all 102 photos. Roll ids run in folder-date order, so they are also shooting order.
- The two Cyprus rolls (r019, r020) sit in May 2026 per their folders, while `Cyprus.md` puts the trip at April 21 - May 10, 2026. Folder months may be development dates rather than shooting dates; worth confirming before treating them as capture months.
- Once most rolls carry true windows, drive the photos-per-month chart off roll windows rather than per-photo `date`.

## Travel & hiking guides, with print/PDF sharing

**Status**: Not Started

Combines the travel-map and hiking-log ideas into one section, because the vault already treats them as one thing: both live under `area/personal/travel` in `~/workspace/second-brain`, and the hikes are travel reports that happen to have a GPX track.

Driving use case: friends ask for travel tips, and the current answer is exporting an Obsidian note to PDF by hand and sending the file. The site should replace that entirely. A guide gets a shareable URL, and anyone who still wants a file can print it to a clean PDF from the page itself.

Source material already written (needs curation, not authoring): destination guides like `Japan.md` (restaurants, cheap eats, museums, hotels, airlines, day trips), `Crete.md`, `Paris.md`, `Cyprus.md`, `Barcelona Trip.md`, `Iceland.md`, `Korea.md`, plus hike reports like `DDay Beaches - GR223.md` (plan, material list, learnings) and the `Glam-Hike` concept that frames them.

### Content model

One `travel` collection, with a discriminating field rather than two collections, since destinations and hikes share the map, the layout, and the print styles.

- `title`, `subtitle`, `kind: "destination" | "hike"`, `date`, `updated`, `country`, `coordinates` (lat/lon for the map marker), `status: "visited" | "planned"`.
- Hike-only: `trail` (e.g. GR223), `distanceKm`, `days`, `gpx`, `startStation`, `endStation`.
- Optional `photoTags`, to pull matching film photos from the photography collection.

### Pages

- `/travel` — map of visited and planned places, each marker linking to its guide. Grid or list fallback below the map so the page works without JS.
- `/travel/[slug]` — the guide itself. Sections come straight from the note structure (Restaurants, Hotels, Tips, Excursions).
- Hikes filtered view, either `/travel/hikes` or a `kind` filter on the index. Hike pages additionally render the GPX track, elevation profile, and the station-to-station plan.
- Cross-link the photography collection: a guide pulls photos whose tags match `photoTags` (`cyprus` and `barcelona` tags already exist), so the guide and the gallery reinforce each other. `DDay Beaches - GR223.md` explicitly set out to test hiking plus film photography together, so the pairing is already the point.

### Print / PDF

No dependency and no serverless function: a proper `@media print` stylesheet plus a "Print or save as PDF" button calling `window.print()`.

- Hide header, footer, nav, and the print button itself. Constrain to a readable measure, force a light palette regardless of `prefers-color-scheme`.
- Print the destination name, date, and site URL in a header block so a shared PDF identifies itself.
- Reveal link targets in print (`a[href]::after { content: " (" attr(href) ")" }`), but not blindly: `Japan.md` is full of 300-character Google Maps URLs that would wreck the layout. Shorten map links to a `maps.app.goo.gl` short form during curation, or suppress the printed URL for links tagged as map links.
- Page-break rules so a restaurant list does not split across pages mid-entry, and images do not orphan.

### Map stack

TrainRando (`Blightwidow/open-rando`) already solved this: Astro 6, Leaflet, IGN Plan and OpenTopoMap tiles, Protomaps vector base with hillshade and contours on Cloudflare R2. Reuse that setup rather than reinventing it.

Caveat: this site is plain CSS with almost no client JS, and Leaflet is a real dependency. For the destination map, a static SVG world or Europe map with positioned markers may be enough and ships zero JS. Hike tracks genuinely need a map and a GPX parser, so scope the JS to hike pages only.

### Vault-to-site pipeline

Curate by hand, do not sync. The vault holds health, tax, salary, house-purchase, and named-people notes, so nothing automated should ever walk it. Copy a note, strip wikilinks and private asides, then commit it as site content. Guides are the public rewrite of a private note, not a mirror of it.

Open questions:

- Is `/travel` the right root, or should hikes be a sibling section that only shares components?
- Static SVG map or Leaflet on the index page?
- Do planned destinations (`Next Travels.md`, `Asian Odyssey 2026.md`) get published at all, or is the map visited-only?
- Should a guide expose a stable "download" URL for the PDF, or is print-to-PDF from the page enough?
