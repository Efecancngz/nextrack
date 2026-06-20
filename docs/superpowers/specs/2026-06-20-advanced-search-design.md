# Advanced Search — Design Spec

**Status:** Approved
**Scope:** Phase 2.4 (`docs/phases.md` § "Advanced Search") — fourth Phase 2 sub-project, started after Notifications (2.3) merged.

## Goal

Make `/explore` faster to navigate (autocomplete suggestions) and more precise to narrow down (filters by genre/year/status, sort by rating/year/popularity), without changing its existing multi-source search architecture (TMDB + AniList + MangaDex, each queried independently per request).

## Out of Scope (deferred)

- **"Random" discovery feature** — listed in the original Phase 2.4 checklist but dropped during brainstorming: this product tracks legitimate platform availability for series the user already knows about (the JustWatch model per `CLAUDE.md`), not a recommendation/discovery engine. Removed from scope entirely, not deferred to a later round.
- **Global/navbar search** — the autocomplete dropdown is scoped to the existing `/explore` search input only. The navbar has no search entry point today and adding one is a separate, larger UI decision.
- **Platform filter** (Netflix, Crunchyroll, etc.) — `PlatformAvailability` is only fetched on the series detail page today, not in search results. Adding it to search would require a much larger backend change (per-result provider lookups) and is left for a future round if needed.
- **TMDB status filtering** — TMDB's `/search/tv` endpoint does not return a series' production status (only `/tv/{id}` detail does). Rather than firing N detail requests per search, TV results are simply excluded from the status filter's effect (they're never filtered out by status, regardless of which status chips are active). Anime (AniList) and Manga (MangaDex) results filter by status normally.
- **Server-side filter/sort query params** — filters and sort apply client-side over already-fetched results (see Architecture). `/api/search`'s contract (query params, pagination, response shape) is unchanged.

## Current State

- `/explore` (`src/app/explore/page.tsx`) does client-side debounced (350ms) search against `GET /api/search`, with content-type tabs (all/tv/anime/manga), grid/list view toggle, and "Load More" pagination. No filter or sort UI exists; results are sorted once, server-side, by a fixed rule (cover image presence, then `ratingExternal`).
- `GET /api/search` (`src/app/api/search/route.ts`) calls `searchTvSeries` (TMDB), `searchAniList` (AniList, anime+manga), and `searchManga` (MangaDex) in parallel per content-type bucket, concatenates results, and returns `{ results, total, page, query, type }`.
- `SearchResult` (`src/types/series.ts`) has `genres: string[]` and `status: ContentStatus` fields already, but they're inconsistently populated across sources:
  - **AniList** (`src/lib/api/anilist.ts:157-158,192-193`): `genres` and `status` (via `mapStatus`) are both correctly mapped from the GraphQL response.
  - **TMDB** (`src/lib/api/tmdb.ts:151-152`): `genres: []` always (TMDB's search response only returns `genre_ids`, with a code comment noting "genre_ids need a separate genres list mapping" — never implemented). `status: "ONGOING"` is hardcoded, not derived from any real field.
  - **MangaDex** (`src/lib/api/mangadex.ts:159-160`): `genres: []` always (a code comment notes "Mapping tags to genres can be added later if needed" — never implemented). `status` is correctly mapped via `mapMangaDexStatus`.
- No source currently fetches or maps a `popularity` value onto `SearchResult` — TMDB's `/search/tv` response includes a `popularity` field per item that's simply not read; AniList's `Media` GraphQL type has a `popularity` field not yet requested in `SEARCH_QUERY`; MangaDex's API has no equivalent search-time popularity metric.
- `ContentStatus` (`src/types/common.ts`) is a single shared 5-value enum (`ONGOING | COMPLETED | HIATUS | CANCELLED | UPCOMING`) already used identically across all content types — no new enum needed for the status filter.

## Design

### 1. Data layer fixes (prerequisite for filters/sort to work across all three sources)

**TMDB genre mapping** (`src/lib/api/tmdb.ts`): add a hardcoded constant mapping TMDB's official TV genre IDs to names (TMDB publishes this as a stable, rarely-changing list — no need for a live `/genre/tv/list` call):

```ts
const TMDB_TV_GENRE_MAP: Record<number, string> = {
  10759: "Action & Adventure", 16: "Animation", 35: "Comedy", 80: "Crime",
  99: "Documentary", 18: "Drama", 10751: "Family", 10762: "Kids",
  9648: "Mystery", 10763: "News", 10764: "Reality", 10765: "Sci-Fi & Fantasy",
  10766: "Soap", 10767: "Talk", 10768: "War & Politics", 37: "Western",
};
```

In `searchTvSeries`, map `item.genre_ids.map(id => TMDB_TV_GENRE_MAP[id]).filter(Boolean)` into `genres`, and add `popularity: item.popularity` to the mapped result.

**AniList popularity** (`src/lib/api/anilist.ts`): add `popularity` to `SEARCH_QUERY`'s `media` field selection and map `item.popularity` onto `SearchResult.popularity`.

**MangaDex genre mapping** (`src/lib/api/mangadex.ts`): map `attributes.tags` where `tag.attributes.group === "genre"` to their English names (`tag.attributes.name.en`), populating `genres`. No `popularity` available from MangaDex's search response — left `undefined`.

**`SearchResult` type** (`src/types/series.ts`): add `popularity?: number`.

### 2. Autocomplete

**New endpoint**, `GET /api/search/suggest?q=`: calls the same three source functions as `/api/search` but requests a small page size from each, merges, sorts by `ratingExternal` (same tie-break as today), and caps the response at 8 items. Returns a trimmed shape — `{ id: "{source}-{externalId}", title, contentType, year, coverImage }` — lighter than the full `SearchResult` payload since the dropdown only needs to render a compact row. Wrapped in `compose(withErrorHandler, withRateLimit)` like every existing route; same `query.length < 2` guard as the main search.

**New component**, `src/components/SearchSuggestions.tsx`: a dropdown panel anchored under the existing search input in `explore/page.tsx`. Debounced ~200ms (shorter than the main 350ms search, since the payload is smaller and this is meant to feel instant). Keyboard-navigable (↑/↓ to move selection, Enter to navigate, Esc to close), closes on blur or outside-click. Clicking or pressing Enter on a row navigates to `/series/{id}` via `next/navigation`'s `useRouter().push()`. Hidden whenever the input is empty or below the 2-character threshold — same rule as the main search results.

### 3. Filters

New filter row in `explore/page.tsx`, below the existing content-type tabs:

- **Genre** — multi-select chips. The available chip list is derived from the genres actually present in the currently-loaded `results` (not a static master list), so it never offers a genre with zero matching results.
- **Year range** — two number inputs (min/max), defaulting to empty (no bound).
- **Status** — multi-select chips (Ongoing/Completed/Hiatus/Cancelled/Upcoming). Applies only to results whose `source !== "tmdb"` (see Out of Scope); TMDB results pass through this filter unaffected regardless of which status chips are active.
- **Clear filters** button resets all three controls.

Implementation: a `useMemo`-derived `filteredResults` array computed from `results` + the active filter state, recomputed whenever either changes. No new request params — filtering happens entirely over data already in memory.

When any filter is active and narrows the visible set below what's loaded, the page shows "Showing X of Y loaded results" near the grid, making it clear that "Load More" (which still fetches by the raw, unfiltered API total) may surface more matches.

### 4. Sort

New sort `<select>` next to the filter row: **Relevance** (default — today's existing fixed order, unchanged), **Rating**, **Year (newest)**, **Popularity**. Applied as a second `useMemo` layer on top of `filteredResults`, sorting by the chosen field descending; entries with a missing value for the chosen field (e.g. `popularity` on MangaDex results) sort to the end rather than to the top or causing a comparator error.

### 5. Persistence

View mode (`grid`/`list`) already persists via its own `localStorage` key. Filters and sort are **not** persisted across visits — they reset to defaults (no filters, Relevance sort) on page load/reload, consistent with treating them as in-session query refinement rather than a saved preference. (If this turns out to be wanted later, it's a small follow-up — not blocking this round.)

## Error Handling

- `/api/search/suggest` follows the same per-source `try/catch` pattern as `/api/search` — one source failing never blocks the others or fails the whole suggestion list.
- Client-side filter/sort logic operates on data already successfully fetched; no new error states are introduced (an empty `filteredResults` after filtering is just the existing "no results" empty state, reused).
- `SearchSuggestions`' fetch failure fails silently (dropdown simply shows nothing), matching `NotificationTrigger`'s established silent-failure precedent — a failed suggestion fetch is not surfaced as a user-visible error.

## Testing / Verification

No automated test framework in this repo. Verification is `npm run type-check` + `npm run lint` + manual browser check:

- Type a query, confirm the autocomplete dropdown appears with up to 8 relevant results; navigate via mouse click and via keyboard (↑/↓/Enter); confirm Esc and outside-click close it.
- Confirm genre chips populate correctly for TMDB, AniList, and MangaDex results (spot-check a TV series, an anime, and a manga) and that selecting a genre narrows the grid correctly.
- Confirm year range filtering excludes out-of-range results.
- Confirm status filter affects Anime/Manga results but leaves all TMDB/TV results visible regardless of which status chips are selected.
- Confirm each sort option produces the expected order, and that a MangaDex result (no `popularity`) doesn't crash or appear out of place when sorting by Popularity.
- Confirm "Load More" still works correctly with filters/sort active (new raw results get fetched, then filtered/sorted into the existing view).
- `docs/phases.md`'s "Search suggestions / autocomplete," "Advanced filter combinations," and "Sort by user rating / popularity" items get checked off. "Random discovery feature" gets struck through with a note explaining it was dropped as out-of-scope (not deferred), per the design decision above.
