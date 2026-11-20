# TODOS

Open items only. Everything shipped (blog series, blog tags, stats page, roll-based photo identity, travel guides, Oxid in the browser) is described in `CLAUDE.md` and git history.

- **Cyprus roll dates**: r019 and r020 sit in `2026-05` per their Lightroom folders, but `Cyprus.md` puts the trip at April 21 to May 10, 2026. Folder months may be development dates. Confirm before trusting them as capture months.
- **Film labels**: `FILM_LABELS` renders `250D` as "Kodak Vision3 250D", a brand the data does not state. Store the full stock name on the roll instead.
- **Location tags**: inconsistent granularity (`france`, `united kingdom`, `spain` next to `paris`, `lyon`). Pick one level.
- **Travel map**: cut because the R2 tile bucket sends no CORS header and MapLibre's worker was not bundled. Worth retrying if the bucket gets a CORS policy.
- **Lens**: `50mm lens` is a photo tag (14 photos) on purpose, since a lens can change mid-roll. Promote to an optional `lens` field if it ever needs counting.
