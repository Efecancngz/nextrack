# Explore Page Polish — Design Spec

**Status:** Approved
**Scope:** Phase 1 close-out, sub-project 1 of 4 (explore page; library page, favicon, and deploy/infra follow separately — see `docs/phases.md`).

## Goal

Add a "Load More" pagination control and a grid/list view toggle to `/explore`, closing the two remaining gaps in Phase 1's Explore/Search Page checklist (`docs/phases.md` § 1.5). No backend changes required — `GET /api/search` already accepts `page` and returns `total`.

## Out of Scope

- Advanced filters (genre/platform/rating) — not part of this round, separate Phase 1/2 item.
- Changing `/api/search`'s response shape or query contract.
- Server-side rendering of search results (page stays a client component, matching current behavior).

## Current State

- `src/app/explore/page.tsx` is a `"use client"` component. It debounces a search query (350ms), filters by content type tab (`all`/`tv`/`anime`/`manga`), and renders `results` in a `.series-grid` of `SeriesCard` components.
- `GET /api/search` (`src/app/api/search/route.ts`) already accepts `?page=` (default 1) and returns `{ results, total, page, query, type }` in its response. The explore page currently never passes `page` and never reads `total` — every search always fetches page 1 and discards `total`.
- `SeriesCard` (`src/components/SeriesCard.tsx`) renders a poster-first grid card: cover image, content-type badge, rating badge, title, year.

## Design

### 1. Pagination — "Load More" button

**State additions to `ExplorePage`:**
- `page: number` (starts at 1)
- `total: number` (from the API response)
- `loadingMore: boolean` (separate from the existing `loading` flag, which represents the full-page skeleton state for a fresh search)

**Behavior:**
- A fresh search (query or type change, via the existing debounced `search()` callback) resets `page` to 1 and **replaces** `results` with the response (current behavior, unchanged).
- Clicking "Load More" fetches `page + 1` with the same `query`/`type`, sets `loadingMore` true during the fetch, and **appends** the new page's `results` to the existing array on success. `page` increments after a successful append.
- "Load More" is rendered only when `results.length < total` and `results.length > 0`. It's omitted entirely when all results are already loaded or when there are zero results.
- If the appended fetch fails (network error or `data.success === false`), do nothing to `results`/`page` (no partial state corruption) and surface a small inline error string below the button so the user can retry by clicking again.
- The button label shows `Loading...` while `loadingMore` is true and is disabled during that time to prevent double-fetches.

### 2. Grid / List view toggle

**New component: `SeriesListRow`** (`src/components/SeriesListRow.tsx`)
- Sibling to `SeriesCard`, same `{ series: SearchResult; showType?: boolean }` props shape, same `Link` target (`/series/{source}-{externalId}`).
- Horizontal layout: small poster thumbnail (fixed width, e.g. 60×90) on the left; title, year, content-type badge, first 2 genres, and rating on the right in a single row.
- Reuses existing badge classes (`CONTENT_TYPE_BADGE_CLASS`) and rating star icon markup from `SeriesCard` for visual consistency.

**View toggle control:**
- Two icon buttons (grid icon / list icon) placed next to the existing content-type tabs row in `ExplorePage`.
- `viewMode: "grid" | "list"` state, initialized by reading `localStorage.getItem("explore-view-mode")` in a `useEffect` on mount (client-only — SSR/first paint always renders grid, then switches if a stored preference says otherwise; this one-frame flash is accepted, consistent with how other client-only preferences in this codebase behave).
- Every time `viewMode` changes via the toggle buttons, write it back to `localStorage.setItem("explore-view-mode", viewMode)`.
- Rendering: the existing `.series-grid` of `SeriesCard` renders when `viewMode === "grid"`; a new `.series-list` of `SeriesListRow` renders when `viewMode === "list"`. Same `results` array feeds both — switching modes is a pure render swap, no re-fetch.
- The skeleton loading state (shown during the initial debounced search) only needs a grid variant — list-mode skeletons are out of scope; while `loading` is true, the grid skeleton always renders regardless of `viewMode` (acceptable: the skeleton state is brief and disappears once `results` arrives, at which point the user's chosen `viewMode` takes over).

### 3. CSS additions

Append to `src/app/globals.css`, following the existing `.poster-card`/`.explore-tabs` naming conventions:
- `.explore-toolbar` — flex row wrapping the existing `.explore-tabs` and the new view-toggle buttons.
- `.explore-view-toggle`, `.explore-view-toggle-btn`, `.explore-view-toggle-btn-active` — the two icon buttons.
- `.series-list`, `.series-list-row`, `.series-list-thumb`, `.series-list-info` — the list view layout.
- `.explore-load-more`, `.explore-load-more-error` — the pagination button and its inline error message.

## Error Handling

- Load-more fetch failures: inline retry-by-reclicking, no destructive state change (detailed above).
- `localStorage` access wrapped in a `try/catch` (some environments — private browsing, disabled storage — throw on access); falls back to in-memory `viewMode` state only (defaults to `"grid"` for that session).

## Testing / Verification

No automated test framework in this repo (per `CLAUDE.md`). Verification is `npm run type-check` + `npm run lint` + manual browser check:
- Search a query that returns more than one page of results (verify against a real query against TMDB/AniList/MangaDex — confirm `total` exceeds one page's worth of `results`).
- Click "Load More" — new results append below existing ones, no duplicates, no layout jump.
- Toggle to list view — rows render correctly, links work, switch back to grid — same results, no re-fetch (confirm via network tab: no new request fires on a pure view toggle).
- Reload the page — `viewMode` preference persists from `localStorage`.
- Change the search query — `results`/`page` reset correctly, "Load More" reappears/disappears based on the new `total`.
