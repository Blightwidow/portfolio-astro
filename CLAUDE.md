# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- **Dev server**: `bun start` (or `bun dev`)
- **Build**: `bun run build` (runs `astro check`, lint, `astro build`, then `pagefind --site dist`)
- **Lint**: `bun run lint` (oxlint with type-aware checking)
- **Format check**: `bun run format` (oxfmt)
- **Preview built site**: `bun run preview` (serves `dist/`)
- **Generate photo metadata**: `bun run generate-photo-metadata`
- **Rename photos sequentially**: `bun run rename-photos-sequential`

Always run `bun run lint` and `bun run build` to verify changes.

## Architecture

This is an Astro 6 (beta) static site for [dammaretz.fr](https://dammaretz.fr), deployed on Netlify. Package manager is **bun**.

### Content Collections

Defined in `src/content.config.ts` using Astro's glob loader:

- **blog**: Markdown files in `src/content/blog/`. Schema: `title`, `subtitle`, `date`.
- **photography**: YAML files in `src/content/photography/` (each paired with a `.jpg`). Schema: `title` (short display title, used for the page title and search results), `alt` (descriptive alt text for screen readers), `description?`, `date`, `image`, `tags?`, `hideFromGallery?` (defaults to `false`; hides the photo from the main gallery but keeps it on tag pages, its own page, and in search).

### Pages (file-based routing)

- `src/pages/index.astro` - Homepage
- `src/pages/404.astro` - Not-found page
- `src/pages/search.astro` - Pagefind search page (index only exists on built site)
- `src/pages/blog/[page].astro` - Paginated blog listing
- `src/pages/blog/[slug].astro` - Individual blog post
- `src/pages/photography/index.astro` - Photo gallery (masonry, single page, tag index)
- `src/pages/photography/[tag].astro` - Photos filtered by tag
- `src/pages/photography/photo/[id].astro` - Individual photo page
- `src/pages/rss.xml.js` - RSS feed

Redirects: `/blog` -> `/blog/1`.

### Search & Social Previews

- **Search**: Pagefind indexes blog posts and photo pages at build time (`data-pagefind-body` marks indexable regions, `data-pagefind-ignore` excludes noise). UI on `/search` via the Pagefind Default UI, loaded from `/pagefind/` (built site only).
- **OG images**: photo pages emit the photo itself (resized via `getImage`) through the `ogImage` prop on `Layout`/`PhotoLayout` into `BaseHead`. Blog posts have no OG image (text-only `summary` card).

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
- **Lexical habits**: "I find it remarkable", "what strikes me", "the irony isn't lost on me". Prefer commas or parentheses for asides — avoid em dashes. Series articles end with a forward-looking italic sign-off.

## Conventions

- Conventional commits: `<type>[scope]: <description>` (max 60 chars)
- Strict TypeScript (`strict: true`, `noUncheckedIndexedAccess: true`)
- Accessibility (a11y) is a priority
