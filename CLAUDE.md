# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- **Dev server**: `bun start` (or `bun dev`)
- **Build**: `bun run build` (runs `astro check`, lint, then `astro build`)
- **Lint**: `bun run lint` (oxlint with type-aware checking)
- **Format check**: `bun run format` (oxfmt)
- **Preview built site**: `bun run preview` (serves `dist/`)
- **Generate photo metadata**: `bun run generate-photo-metadata`

Always run `bun run lint` and `bun run build` to verify changes.

## Architecture

This is an Astro 6 (beta) static site for [dammaretz.fr](https://dammaretz.fr), deployed on Netlify. Package manager is **bun**.

### Content Collections

Defined in `src/content.config.ts` using Astro's glob loader:

- **blog**: Markdown files in `src/content/blog/`. Schema: `title`, `subtitle`, `date`.
- **photography**: YAML files in `src/content/photography/` (each paired with a `.jpg`). Schema: `alt`, `description?`, `date`, `image`, `tags?`.

### Pages (file-based routing)

- `src/pages/index.astro` - Homepage
- `src/pages/blog/[page].astro` - Paginated blog listing
- `src/pages/blog/[slug].astro` - Individual blog post
- `src/pages/photography/[page].astro` - Paginated photo gallery
- `src/pages/photography/[tag].astro` - Photos filtered by tag
- `src/pages/photography/photo/[id].astro` - Individual photo page
- `src/pages/rss.xml.js` - RSS feed

Redirects: `/blog` -> `/blog/1`, `/photography` -> `/photography/1`.

### Layouts

- `Layout.astro` - Main layout (header, footer, constrained content area)
- `PhotoLayout.astro` - Photography-specific layout

### Interactive Components

React is used for client-side interactivity via `@astrojs/react`:
- `ClapButton.tsx` - Photo clap button using React Query

### Netlify Functions (serverless API)

In `netlify/functions/`, using `@netlify/blobs` for storage:
- `getPhotoClaps.mts` - `GET /api/post-clap/:postId`
- `increasePhotoClaps.mts` - Increments clap count

### Styling

Plain CSS with CSS custom properties (no Tailwind). Global styles in `src/styles/global.css`. Font: Metropolis via `@fontsource`.

## Conventions

- Conventional commits: `<type>[scope]: <description>` (max 60 chars)
- Strict TypeScript (`strict: true`, `noUncheckedIndexedAccess: true`)
- Accessibility (a11y) is a priority
