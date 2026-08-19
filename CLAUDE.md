# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- **Dev server**: `bun start` (or `bun dev`)
- **Build**: `bun run build` (runs `astro check`, lint, `astro build`, then `pagefind --site dist`)
- **Lint**: `bun run lint` (oxlint with type-aware checking)
- **Format check**: `bun run format` (oxfmt)
- **Preview built site**: `bun run preview` (serves `dist/`)
- **Generate photo metadata**: `bun run generate-photo-metadata` (expects `rNNN-fFF.jpg` filenames; seeds `date` from the roll's `shotFrom`)
- **Rename photos sequentially**: `bun run rename-photos-sequential`

Always run `bun run lint` and `bun run build` to verify changes.

## Architecture

This is an Astro 6 (beta) static site for [dammaretz.fr](https://dammaretz.fr), deployed on Netlify. Package manager is **bun**.

### Photo rolls and the Lightroom export

`Lightroom/` (git-ignored, ~2.5GB) holds one folder per developed roll, named `YYYYMMDD`, each containing the full strip as `rawNNNN-flickr.jpg`. That folder layout is the source of truth for **which roll a photo belongs to** and **which frame it is**: the `rNNN` roll number follows folder date order, and `fFF` is the `rawNNNN` index, i.e. the real position on the strip. Only the month of the folder name is used; the day is ignored.

Roll membership was established by difference-hashing every export against every published photo rather than by guessing from tags. If photos are ever re-imported and that mapping needs rebuilding, that is the approach to repeat.

### Content Collections

Defined in `src/content.config.ts` using Astro's glob loader:

- **blog**: Markdown files in `src/content/blog/`. Schema: `title`, `subtitle`, `date`, `series?` (`{ name, order }`, nested so a post cannot declare one without the other), `tags?` (**topics**, e.g. `chess`, `environment`, `trains`). Blog tags and photo tags are **separate namespaces**: blog tags name what a post is about, photo tags name a subject or a place, and no page mixes the two.
- **photography**: YAML files in `src/content/photography/` (each paired with a `.jpg`). Files are named `rNNN-fFF` (roll number, frame position), which is also the photo's URL: `/photography/photo/r014-f07`. Schema: `title` (short display title, used for the page title and search results), `alt` (descriptive alt text for screen readers), `description?`, `date` (**month precision only**: the day is pinned to `01` and never displayed, since film scans carry no capture date; photo pages render it via `formatMonth`), `image`, `roll` (reference to a `rolls` entry), `frame` (1-based position on the strip, scan order), `tags?` (**subject and location only**), `hideFromGallery?` (defaults to `false`; hides the photo from the main gallery but keeps it on tag pages, its own page, and in search).
- **travel**: Markdown files in `src/content/travel/`, one per destination guide. Schema: `title`, `subtitle`, `country`, `coordinates` (`{ latitude, longitude }`), `date`, `updated?`, `photoTags?` (photography tags whose frames get pulled onto the guide; `hideFromGallery` frames are excluded, since a guide is a curated showcase rather than an exhaustive tag listing). Each guide is the **public rewrite of a private Obsidian note**, curated by hand. Nothing is synced from the vault: it holds health, tax, salary, house and named-people notes, so no automation should ever walk it.
- **rolls**: YAML files in `src/content/rolls/` named `rNNN`. Schema: `camera`, `film`, `format` (defaults to `35mm`), `process` (e.g. `color`, `black and white`, `pushed`), `shotMonth?` (`YYYY-MM`, for rolls where only the month is remembered), `shotFrom?`, `shotTo?`, `developed?`. A roll with no date at all is deliberate: it means the real dates are unknown, and `getRollPeriod` renders "date unknown" rather than guessing. Camera, stock, format and process are roll facts and must **not** be duplicated as photo tags. Display names for cameras and stocks live in `CAMERA_LABELS` / `FILM_LABELS` in `src/utils/photography.ts`.

### Pages (file-based routing)

- `src/pages/index.astro` - Homepage
- `src/pages/404.astro` - Not-found page
- `src/pages/search.astro` - Pagefind search page (index only exists on built site)
- `src/pages/blog/[page].astro` - Paginated blog listing
- `src/pages/blog/[slug].astro` - Individual blog post
- `src/pages/blog/series/[series].astro` - All parts of one series, in reading order
- `src/pages/blog/tag/[tag].astro` - Posts filtered by topic tag
- `src/pages/travel/index.astro` - Guide index, grouped by continent
- `src/pages/travel/[slug].astro` - One guide, with a "Print or save as PDF" button and matching film photos
- `src/pages/photography/index.astro` - Photo gallery (masonry, single page, tag index)
- `src/pages/photography/[tag].astro` - Photos filtered by tag
- `src/pages/photography/photo/[id].astro` - Individual photo page
- `src/pages/photography/stats.astro` - Frames-per-month line chart plus camera and film stock counts, all derived from the `rolls` collection. The chart buckets a roll by `shotMonth` (or the month of `shotFrom`) and states how many frames sit on undated rolls instead of hiding them.
- `src/pages/photography/roll/[roll].astro` - Every published frame of one roll, in frame order
- `src/pages/rss.xml.js` - RSS feed

Redirects: `/blog` -> `/blog/1` (in `astro.config.mjs`). `public/_redirects` maps the 102 pre-roll photo URLs (`/photography/photo/20250822`) onto their `rNNN-fFF` equivalents.

### Search & Social Previews

- **Search**: Pagefind indexes blog posts and photo pages at build time (`data-pagefind-body` marks indexable regions, `data-pagefind-ignore` excludes noise). UI on `/search` via the Pagefind Default UI, loaded from `/pagefind/` (built site only).
- **OG images**: photo pages emit the photo itself (resized via `getImage`) through the `ogImage` prop on `Layout`/`PhotoLayout` into `BaseHead`. Blog posts have no OG image (text-only `summary` card).

### Print

`@media print` at the end of `src/styles/global.css` is what makes a travel guide printable: it
hides the header, footer and skip link, forces the light palette regardless of
`prefers-color-scheme`, and reveals link targets with `a[href]::after`. Google Maps and OSM links
are collapsed to `(map link)` instead, because the real URLs run to 300 characters and would wreck
the layout. Guide pages add a print-only header block naming the guide and its URL, so a shared
PDF identifies itself.

### Layouts

- `Layout.astro` - Main layout (header, footer, constrained content area)
- `PhotoLayout.astro` - Photography-specific layout (wraps `Layout`, no footer, unconstrained)

### Styling

Plain CSS with CSS custom properties (no Tailwind). Global styles in `src/styles/global.css`. Font: Metropolis via `@fontsource`.

## Blog Writing Style

When writing or editing blog articles, match this voice:

- **First person, opinionated but grounded.** Use "I believe", "I find", "what concerns me" — own the point of view.
- **Conversational with substance.** Accessible without being dumbed down. Light humor is fine, but never forced.
- **Data-driven storytelling.** Cite specific figures but always translate them into something relatable (e.g. "the annual car emissions of 500 French people", "less than a Hollywood blockbuster's budget").
- **Rhetorical questions as transitions.** Use them to set up counterarguments or twists ("So we're done here, right?").
- **Bold for key stats and takeaways.** Inline links to sources when available.
- **Frustration targets systems, not technology.** Critical of policy failures and institutional inertia, optimistic about innovation.
- **Structure with narrative arc.** H2 for major thematic acts, H3 for subsections. Build toward an insight or conclusion — don't just list facts.
- **Lexical habits**: "I find it remarkable", "what strikes me", "the irony isn't lost on me". Prefer commas or parentheses for asides — avoid em dashes. Series articles close on a forward-looking line in the body; part numbering and previous/next links are rendered from the `series` frontmatter by `SeriesNav.astro`, never hand-written.

## Conventions

- Conventional commits: `<type>[scope]: <description>` (max 60 chars)
- Strict TypeScript (`strict: true`, `noUncheckedIndexedAccess: true`)
- Accessibility (a11y) is a priority
