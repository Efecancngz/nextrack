# Advanced Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Phase 2.4 MVP — autocomplete suggestions, genre/year/status filters, and rating/year/popularity sort on the `/explore` page.

**Architecture:** Data-layer fixes first (TMDB genre + popularity mapping, AniList popularity, MangaDex genre mapping) so all three sources carry usable `genres`/`popularity` fields. A new lightweight `GET /api/search/suggest` endpoint powers a keyboard-navigable autocomplete dropdown. Filters and sort are both applied **client-side** via memoized derivations over the already-fetched `results` array in `explore/page.tsx` — no changes to `/api/search`'s contract, pagination, or response shape.

**Tech Stack:** Next.js 16 App Router (Server Components + client components), TypeScript, TMDB REST API, AniList GraphQL API, MangaDex REST API. No test framework configured in this repo — verification is `npm run type-check` + `npm run lint` + manual browser check.

## Global Constraints

- **Filters and sort are client-side only.** They operate on the `results` array already fetched via `/api/search`'s existing pagination — no new query params are added to that route.
- **TMDB results are excluded from the status filter's effect.** TMDB's `/search/tv` response has no per-item status field; TV results stay visible regardless of which status chips are active. Anime (AniList) and Manga (MangaDex) results filter normally.
- **TMDB genre mapping uses a hardcoded static ID→name table**, not a live `/genre/tv/list` call — TMDB's TV genre list is stable and rarely changes.
- **MangaDex genres come from `attributes.tags` filtered to `group === "genre"`** — MangaDex's tag taxonomy also includes `theme`/`format`/`content` groups, which are deliberately excluded.
- **"Random discovery" is out of scope entirely** (not deferred) — dropped during brainstorming as inconsistent with this product's platform-availability-tracker model.
- **The autocomplete dropdown only lives on `/explore`** — no navbar/global search entry point this round.
- `npm run type-check` and `npm run lint` must be clean before every commit.
- No `git push` without explicit user instruction. Conventional Commits format for every commit message.
- This project's dev server has a known Turbopack bug on this path (non-ASCII `ü` in the directory name) — use `npx next dev --webpack -p 3000` for manual verification (port 3000 required — `NEXTAUTH_URL` is pinned to it).

---

## File Structure

New files:
- `src/app/api/search/suggest/route.ts` — `GET`, trimmed multi-source suggestion lookup (Task 4)
- `src/components/SearchSuggestions.tsx` — autocomplete dropdown, presentational (Task 5)
- `src/components/ExploreFilters.tsx` — genre/status/year filter bar, presentational (Task 6)

Modified files:
- `src/types/series.ts` — add `popularity?: number` to `SearchResult` (Task 1)
- `src/lib/api/tmdb.ts` — TMDB TV genre map, `popularity` field (Task 1)
- `src/lib/api/anilist.ts` — `popularity` in GraphQL query + mapping (Task 2)
- `src/lib/api/mangadex.ts` — tag→genre mapping (Task 3)
- `src/app/explore/page.tsx` — wire suggestions (Task 5), filters (Task 6), sort (Task 7)
- `src/app/globals.css` — suggestion dropdown, filter bar, sort select styles (Tasks 5, 6, 7)
- `docs/phases.md` — check off shipped items, strike out dropped item (Task 8)

---

### Task 1: TMDB genre mapping + `popularity` field

**Files:**
- Modify: `src/types/series.ts`
- Modify: `src/lib/api/tmdb.ts`

**Interfaces:**
- Produces: `SearchResult.popularity?: number` — consumed by Task 2, Task 3 (their own mappings), and Task 7 (sort).

- [ ] **Step 1: Add `popularity` to `SearchResult`**

In `src/types/series.ts`, find the `SearchResult` interface and add `popularity` right after `ratingExternal`:

```ts
/** Search result from external API (before DB caching) */
export interface SearchResult {
  externalId: string;
  source: string;
  contentType: ContentType;
  title: string;
  titleOriginal?: string;
  coverImage?: string;
  year?: number;
  genres: string[];
  status: ContentStatus;
  ratingExternal?: number;
  popularity?: number;
}
```

- [ ] **Step 2: Add `popularity` to the TMDB raw type**

In `src/lib/api/tmdb.ts`, find the `TmdbTvResult` interface and add `popularity`:

```ts
interface TmdbTvResult {
  id: number;
  name: string;
  original_name: string;
  overview: string;
  poster_path: string | null;
  first_air_date: string;
  genre_ids: number[];
  popularity: number;
  vote_average: number;
  status?: string;
}
```

- [ ] **Step 3: Add the TMDB TV genre map constant**

In `src/lib/api/tmdb.ts`, add this constant right before `// ─── Public API Functions ─────────────────────────`:

```ts
/** TMDB's official TV genre list — stable, rarely changes, not worth a live API call */
const TMDB_TV_GENRE_MAP: Record<number, string> = {
  10759: "Action & Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  10762: "Kids",
  9648: "Mystery",
  10763: "News",
  10764: "Reality",
  10765: "Sci-Fi & Fantasy",
  10766: "Soap",
  10767: "Talk",
  10768: "War & Politics",
  37: "Western",
};
```

- [ ] **Step 4: Map genres and popularity in `searchTvSeries`**

In `src/lib/api/tmdb.ts`, find the `results` mapping inside `searchTvSeries` and replace it:

```ts
  const results: SearchResult[] = data.results.map((item) => ({
    externalId: String(item.id),
    source: "tmdb",
    contentType: "TV_SERIES" as ContentType,
    title: item.name,
    titleOriginal: item.original_name !== item.name ? item.original_name : undefined,
    coverImage: tmdbImage(item.poster_path),
    year: item.first_air_date ? new Date(item.first_air_date).getFullYear() : undefined,
    genres: item.genre_ids
      .map((id) => TMDB_TV_GENRE_MAP[id])
      .filter((name): name is string => Boolean(name)),
    status: "ONGOING",
    ratingExternal: item.vote_average > 0 ? item.vote_average : undefined,
    popularity: item.popularity,
  }));
```

- [ ] **Step 5: Verify**

Run: `npm run type-check && npm run lint`
Expected: both exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/types/series.ts src/lib/api/tmdb.ts
git commit -m "feat: map TMDB genres and popularity onto search results"
```

---

### Task 2: AniList popularity

**Files:**
- Modify: `src/lib/api/anilist.ts`

**Interfaces:**
- Consumes: `SearchResult.popularity` from Task 1.
- Produces: `popularity` populated on AniList-sourced `SearchResult`s — consumed by Task 7 (sort).

- [ ] **Step 1: Add `popularity` to `SEARCH_QUERY`**

In `src/lib/api/anilist.ts`, find `SEARCH_QUERY` and add `popularity` to the `media` field selection:

```ts
const SEARCH_QUERY = `
  query SearchMedia($search: String, $page: Int, $perPage: Int, $type: MediaType) {
    Page(page: $page, perPage: $perPage) {
      pageInfo { total currentPage lastPage }
      media(search: $search, type: $type, isAdult: false) {
        id
        title { romaji english native }
        format
        status
        coverImage { large }
        startDate { year }
        genres
        averageScore
        popularity
        episodes
        chapters
        countryOfOrigin
      }
    }
  }
`;
```

- [ ] **Step 2: Add `popularity` to the `AniListMedia` type**

In `src/lib/api/anilist.ts`, find the `AniListMedia` interface and add `popularity`:

```ts
interface AniListMedia {
  id: number;
  title: { romaji: string; english?: string; native?: string };
  format: string;
  status: string;
  coverImage: { large: string };
  startDate: { year?: number };
  genres: string[];
  averageScore?: number;
  popularity?: number;
  episodes?: number;
  chapters?: number;
  countryOfOrigin?: string;
}
```

- [ ] **Step 3: Map `popularity` in `searchAniList`**

In `src/lib/api/anilist.ts`, find the `results` mapping inside `searchAniList` and add `popularity`:

```ts
  const results: SearchResult[] = data.Page.media.map((item) => ({
    externalId: String(item.id),
    source: "anilist",
    contentType: mapFormat(item.format, item.countryOfOrigin),
    title: item.title.english ?? item.title.romaji,
    titleOriginal: item.title.native,
    coverImage: item.coverImage.large,
    year: item.startDate.year,
    genres: item.genres,
    status: mapStatus(item.status),
    ratingExternal: item.averageScore ? item.averageScore / 10 : undefined,
    popularity: item.popularity,
  }));
```

(Leave `getTrendingMedia`'s mapping untouched — `TRENDING_MEDIA_QUERY` doesn't request `popularity`, and trending results don't need it.)

- [ ] **Step 4: Verify**

Run: `npm run type-check && npm run lint`
Expected: both exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/lib/api/anilist.ts
git commit -m "feat: map AniList popularity onto search results"
```

---

### Task 3: MangaDex genre mapping

**Files:**
- Modify: `src/lib/api/mangadex.ts`

**Interfaces:**
- Produces: `genres` populated on MangaDex-sourced `SearchResult`s — consumed by Task 6 (filters).

- [ ] **Step 1: Add a `MangaDexTag` type and `tags` field**

In `src/lib/api/mangadex.ts`, find the `MangaDexManga` interface and add a `tags` field to its `attributes`, plus a new `MangaDexTag` interface right above it:

```ts
interface MangaDexTag {
  id: string;
  attributes: {
    name: Record<string, string>;
    group: string;
  };
}

interface MangaDexManga {
  id: string;
  type: "manga";
  attributes: {
    title: Record<string, string>;
    altTitles: Record<string, string>[];
    description: Record<string, string>;
    status: string;
    year?: number;
    tags: MangaDexTag[];
  };
  relationships: MangaDexRelationship[];
}
```

- [ ] **Step 2: Map tags to genres in `searchManga`**

In `src/lib/api/mangadex.ts`, find the `return` object inside `searchManga`'s `results` mapping and replace the `genres` line:

```ts
    return {
      externalId: item.id,
      source: "mangadex",
      contentType: "MANGA" as ContentType, // Can also be Manhwa, but default is MANGA
      title,
      titleOriginal,
      coverImage,
      year: item.attributes.year,
      genres: item.attributes.tags
        .filter((tag) => tag.attributes.group === "genre")
        .map((tag) => tag.attributes.name.en)
        .filter((name): name is string => Boolean(name)),
      status: mapMangaDexStatus(item.attributes.status),
    };
```

- [ ] **Step 3: Verify**

Run: `npm run type-check && npm run lint`
Expected: both exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/lib/api/mangadex.ts
git commit -m "feat: map MangaDex tags to genres on search results"
```

---

### Task 4: `GET /api/search/suggest` endpoint

**Files:**
- Create: `src/app/api/search/suggest/route.ts`

**Interfaces:**
- Consumes: `searchTvSeries` from `@/lib/api/tmdb`, `searchAniList` from `@/lib/api/anilist`, `searchManga` from `@/lib/api/mangadex` (all pre-existing).
- Produces: `GET /api/search/suggest?q=&type=` → `{ success: true, data: { suggestions: SearchSuggestion[] } }` where `SearchSuggestion = { id: string; title: string; contentType: ContentType; year?: number; coverImage?: string }`. Consumed by Task 5.

- [ ] **Step 1: Write the route**

```ts
/**
 * GET /api/search/suggest — Lightweight autocomplete suggestions
 *
 * Query params:
 *   q     - search query (required, min 2 chars)
 *   type  - content type filter: "all" | "tv" | "anime" | "manga" (default: "all")
 *
 * Mirrors /api/search's source-bucketing logic but returns a trimmed shape
 * capped at 8 results, for a fast dropdown rather than the full results grid.
 */

import { type NextRequest } from "next/server";
import { searchTvSeries } from "@/lib/api/tmdb";
import { searchAniList } from "@/lib/api/anilist";
import { searchManga } from "@/lib/api/mangadex";
import { successResponse, Responses } from "@/lib/utils/api-response";
import { withErrorHandler, withRateLimit, compose } from "@/lib/utils/middleware";
import type { SearchResult } from "@/types/series";

const SUGGESTION_LIMIT = 8;

interface SearchSuggestion {
  id: string;
  title: string;
  contentType: SearchResult["contentType"];
  year?: number;
  coverImage?: string;
}

function toSuggestion(item: SearchResult): SearchSuggestion {
  return {
    id: `${item.source}-${item.externalId}`,
    title: item.title,
    contentType: item.contentType,
    year: item.year,
    coverImage: item.coverImage,
  };
}

const EMPTY: { results: SearchResult[]; total: number; totalPages: number } = {
  results: [],
  total: 0,
  totalPages: 0,
};

async function handler(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const query = searchParams.get("q")?.trim();
  const type = searchParams.get("type") || "all";

  if (!query || query.length < 2) {
    return Responses.badRequest("Search query must be at least 2 characters");
  }

  const fetches: Promise<{ results: SearchResult[]; total: number; totalPages: number }>[] = [];

  if (type === "all" || type === "tv") {
    fetches.push(
      searchTvSeries(query, 1).catch((err) => {
        console.error("[Search Suggest] TMDB error:", err);
        return EMPTY;
      })
    );
  }

  if (type === "all" || type === "anime") {
    fetches.push(
      searchAniList(query, "ANIME", 1).catch((err) => {
        console.error("[Search Suggest] AniList anime error:", err);
        return EMPTY;
      })
    );
  }

  if (type === "all" || type === "manga") {
    fetches.push(
      searchManga(query, 1).catch((err) => {
        console.error("[Search Suggest] MangaDex error:", err);
        return EMPTY;
      }),
      searchAniList(query, "MANGA", 1).catch((err) => {
        console.error("[Search Suggest] AniList manga error:", err);
        return EMPTY;
      })
    );
  }

  const sources = await Promise.all(fetches);
  const results: SearchResult[] = [];
  for (const source of sources) {
    results.push(...source.results);
  }

  results.sort((a, b) => (b.ratingExternal ?? 0) - (a.ratingExternal ?? 0));

  const suggestions = results.slice(0, SUGGESTION_LIMIT).map(toSuggestion);

  return successResponse({ suggestions });
}

export const GET = compose(withErrorHandler, withRateLimit)(handler);
```

- [ ] **Step 2: Verify**

Run: `npm run type-check && npm run lint`
Expected: both exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/search/suggest
git commit -m "feat: add search suggestion endpoint"
```

---

### Task 5: Autocomplete dropdown

**Files:**
- Create: `src/components/SearchSuggestions.tsx`
- Modify: `src/app/explore/page.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: `GET /api/search/suggest` from Task 4.
- Produces: the rendered autocomplete dropdown — this task's deliverable is independently browser-testable end to end.

- [ ] **Step 1: Write `src/components/SearchSuggestions.tsx`**

```tsx
"use client";

import React from "react";
import Image from "next/image";
import type { ContentType } from "@/types/common";

export interface SearchSuggestion {
  id: string;
  title: string;
  contentType: ContentType;
  year?: number;
  coverImage?: string;
}

interface SearchSuggestionsProps {
  suggestions: SearchSuggestion[];
  activeIndex: number;
  onSelect: (id: string) => void;
  onHover: (index: number) => void;
}

export default function SearchSuggestions({
  suggestions,
  activeIndex,
  onSelect,
  onHover,
}: SearchSuggestionsProps) {
  if (suggestions.length === 0) return null;

  return (
    <div className="search-suggestions" role="listbox">
      {suggestions.map((s, i) => (
        <button
          key={s.id}
          type="button"
          role="option"
          aria-selected={i === activeIndex}
          className={`search-suggestion-item ${i === activeIndex ? "search-suggestion-item-active" : ""}`}
          // onMouseDown (not onClick) fires before the input's onBlur closes the dropdown
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect(s.id);
          }}
          onMouseEnter={() => onHover(i)}
        >
          <div className="series-list-thumb">
            {s.coverImage ? (
              <Image src={s.coverImage} alt={s.title} fill sizes="32px" className="series-list-thumb-img" />
            ) : (
              <div className="series-list-thumb-placeholder">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="m21 15-5-5L5 21" />
                </svg>
              </div>
            )}
          </div>
          <span className="search-suggestion-title">{s.title}</span>
          {s.year && <span className="search-suggestion-year">{s.year}</span>}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Add imports to `src/app/explore/page.tsx`**

Replace the top of the file:

```tsx
"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import SeriesCard from "@/components/SeriesCard";
import SeriesListRow from "@/components/SeriesListRow";
import SearchSuggestions, { type SearchSuggestion } from "@/components/SearchSuggestions";
import type { SearchResult } from "@/types/series";
```

- [ ] **Step 3: Add suggestion state**

In `src/app/explore/page.tsx`, find this block:

```tsx
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);
```

Replace it with:

```tsx
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);
  const router = useRouter();
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const suggestDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestRequestIdRef = useRef(0);
```

- [ ] **Step 4: Add the suggestion-fetch effect**

In `src/app/explore/page.tsx`, find the existing debounced-search effect:

```tsx
  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      search(query, type);
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, type, search]);
```

Add this new effect right after it:

```tsx
  // Debounced autocomplete suggestions (shorter delay, lighter payload than the main search)
  useEffect(() => {
    if (suggestDebounceRef.current) clearTimeout(suggestDebounceRef.current);

    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    suggestDebounceRef.current = setTimeout(async () => {
      const requestId = ++suggestRequestIdRef.current;
      try {
        const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(query)}&type=${type}`);
        const data = await res.json();
        if (suggestRequestIdRef.current !== requestId) return;
        setSuggestions(data.success ? data.data.suggestions : []);
        setActiveSuggestionIndex(-1);
      } catch {
        if (suggestRequestIdRef.current === requestId) setSuggestions([]);
      }
    }, 200);

    return () => {
      if (suggestDebounceRef.current) clearTimeout(suggestDebounceRef.current);
    };
  }, [query, type]);
```

- [ ] **Step 5: Add suggestion handlers**

In `src/app/explore/page.tsx`, find `async function handleLoadMore() {` and add these two functions right before it:

```tsx
  function handleSuggestionSelect(id: string) {
    setShowSuggestions(false);
    router.push(`/series/${id}`);
  }

  function handleSearchInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showSuggestions || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveSuggestionIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveSuggestionIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === "Enter" && activeSuggestionIndex >= 0) {
      e.preventDefault();
      handleSuggestionSelect(suggestions[activeSuggestionIndex].id);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  }

```

- [ ] **Step 6: Wire the input and render the dropdown**

In `src/app/explore/page.tsx`, find the search bar block:

```tsx
        <input
          id="search-input"
          type="text"
          className="explore-search-input"
          placeholder="Search for a series, anime, manga..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        {query && (
          <button
            className="explore-search-clear"
            onClick={() => {
              requestIdRef.current++;
              setQuery("");
              setResults([]);
              setSearched(false);
              setPage(1);
              setTotal(0);
              setLoadMoreError(null);
            }}
            aria-label="Clear search"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        )}
      </div>
```

Replace it with:

```tsx
        <input
          id="search-input"
          type="text"
          className="explore-search-input"
          placeholder="Search for a series, anime, manga..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setShowSuggestions(false)}
          onKeyDown={handleSearchInputKeyDown}
          autoFocus
        />
        {query && (
          <button
            className="explore-search-clear"
            onClick={() => {
              requestIdRef.current++;
              suggestRequestIdRef.current++;
              setQuery("");
              setResults([]);
              setSearched(false);
              setPage(1);
              setTotal(0);
              setLoadMoreError(null);
              setSuggestions([]);
              setShowSuggestions(false);
            }}
            aria-label="Clear search"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        )}
        {showSuggestions && (
          <SearchSuggestions
            suggestions={suggestions}
            activeIndex={activeSuggestionIndex}
            onSelect={handleSuggestionSelect}
            onHover={setActiveSuggestionIndex}
          />
        )}
      </div>
```

- [ ] **Step 7: Append CSS to `src/app/globals.css`**

Insert this immediately before the `/* ─── Series Detail Page ─── */` comment (right after the `.explore-load-more-error` rule):

```css
/* ─── Explore autocomplete suggestions ─── */
.search-suggestions {
  position: absolute;
  top: calc(100% + var(--space-2));
  left: 0;
  right: 0;
  max-height: 360px;
  overflow-y: auto;
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-elevated);
  z-index: 10;
  display: flex;
  flex-direction: column;
  padding: var(--space-2);
}

.search-suggestion-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2);
  background: none;
  border: none;
  border-radius: var(--radius-md);
  text-align: left;
  cursor: pointer;
  font-family: var(--font-sans);
}
.search-suggestion-item:hover,
.search-suggestion-item-active {
  background: var(--color-bg-elevated);
}

.search-suggestion-title {
  flex: 1;
  font-size: 0.875rem;
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.search-suggestion-year {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  flex-shrink: 0;
}

```

- [ ] **Step 8: Verify with type-check and lint**

Run: `npm run type-check && npm run lint`
Expected: both exit 0.

- [ ] **Step 9: Manual browser verification**

Run: `npx next dev --webpack -p 3000`
- Go to `/explore`, type a 2+ character query, confirm a dropdown appears below the input with up to 8 suggestions, each showing a thumbnail, title, and year.
- Press ↓/↑ to move the highlighted row, confirm it visually updates; press Enter, confirm it navigates to that series' detail page.
- Type a query, click a suggestion with the mouse, confirm it navigates correctly (not just blurs/closes without navigating).
- Press Escape while the dropdown is open, confirm it closes without navigating.
- Clear the search input, confirm the dropdown disappears.
- Switch the content-type tab (e.g. to "Anime") while a query is active, confirm the suggestion list updates to match.

- [ ] **Step 10: Commit**

```bash
git add src/components/SearchSuggestions.tsx src/app/explore/page.tsx src/app/globals.css
git commit -m "feat: add autocomplete suggestions dropdown to Explore search"
```

---

### Task 6: Genre/year/status filters

**Files:**
- Create: `src/components/ExploreFilters.tsx`
- Modify: `src/app/explore/page.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: `ContentStatus` from `@/types/common`.
- Produces: the rendered filter bar and `filteredResults` — this task's deliverable is independently browser-testable; Task 7 consumes `filteredResults` as the input to its sort layer.

- [ ] **Step 1: Write `src/components/ExploreFilters.tsx`**

```tsx
"use client";

import React from "react";
import type { ContentStatus } from "@/types/common";

const STATUS_OPTIONS: { value: ContentStatus; label: string }[] = [
  { value: "ONGOING", label: "Ongoing" },
  { value: "COMPLETED", label: "Completed" },
  { value: "HIATUS", label: "Hiatus" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "UPCOMING", label: "Upcoming" },
];

interface ExploreFiltersProps {
  availableGenres: string[];
  selectedGenres: string[];
  onToggleGenre: (genre: string) => void;
  selectedStatuses: ContentStatus[];
  onToggleStatus: (status: ContentStatus) => void;
  yearMin: string;
  yearMax: string;
  onYearMinChange: (value: string) => void;
  onYearMaxChange: (value: string) => void;
  active: boolean;
  onClear: () => void;
}

export default function ExploreFilters({
  availableGenres,
  selectedGenres,
  onToggleGenre,
  selectedStatuses,
  onToggleStatus,
  yearMin,
  yearMax,
  onYearMinChange,
  onYearMaxChange,
  active,
  onClear,
}: ExploreFiltersProps) {
  return (
    <div className="explore-filters">
      {availableGenres.length > 0 && (
        <div className="explore-filter-group">
          <span className="explore-filter-label">Genre</span>
          <div className="explore-filter-chips">
            {availableGenres.map((genre) => (
              <button
                key={genre}
                type="button"
                className={`explore-filter-chip ${selectedGenres.includes(genre) ? "explore-filter-chip-active" : ""}`}
                onClick={() => onToggleGenre(genre)}
              >
                {genre}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="explore-filter-group">
        <span className="explore-filter-label">Status</span>
        <div className="explore-filter-chips">
          {STATUS_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              className={`explore-filter-chip ${selectedStatuses.includes(value) ? "explore-filter-chip-active" : ""}`}
              onClick={() => onToggleStatus(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="explore-filter-group">
        <span className="explore-filter-label">Year</span>
        <div className="explore-filter-year-inputs">
          <input
            type="number"
            inputMode="numeric"
            placeholder="From"
            className="explore-filter-year-input"
            value={yearMin}
            onChange={(e) => onYearMinChange(e.target.value)}
          />
          <span>–</span>
          <input
            type="number"
            inputMode="numeric"
            placeholder="To"
            className="explore-filter-year-input"
            value={yearMax}
            onChange={(e) => onYearMaxChange(e.target.value)}
          />
        </div>
      </div>

      {active && (
        <button type="button" className="explore-filter-clear" onClick={onClear}>
          Clear filters
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add imports to `src/app/explore/page.tsx`**

Find:

```tsx
import SearchSuggestions, { type SearchSuggestion } from "@/components/SearchSuggestions";
import type { SearchResult } from "@/types/series";
```

Replace with:

```tsx
import SearchSuggestions, { type SearchSuggestion } from "@/components/SearchSuggestions";
import ExploreFilters from "@/components/ExploreFilters";
import type { SearchResult } from "@/types/series";
import type { ContentStatus } from "@/types/common";
```

Also change the React import line to add `useMemo`:

```tsx
import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
```

- [ ] **Step 3: Add filter state and derived values**

Find the `suggestRequestIdRef` line added in Task 5 Step 3:

```tsx
  const suggestRequestIdRef = useRef(0);
```

Add this right after it:

```tsx
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<ContentStatus[]>([]);
  const [yearMin, setYearMin] = useState("");
  const [yearMax, setYearMax] = useState("");

  const availableGenres = useMemo(() => {
    const set = new Set<string>();
    results.forEach((r) => r.genres.forEach((g) => set.add(g)));
    return Array.from(set).sort();
  }, [results]);

  const filtersActive =
    selectedGenres.length > 0 || selectedStatuses.length > 0 || yearMin !== "" || yearMax !== "";

  const filteredResults = useMemo(() => {
    return results.filter((item) => {
      if (selectedGenres.length > 0 && !selectedGenres.some((g) => item.genres.includes(g))) {
        return false;
      }
      if (selectedStatuses.length > 0 && item.source !== "tmdb" && !selectedStatuses.includes(item.status)) {
        return false;
      }
      if (yearMin && item.year !== undefined && item.year < Number(yearMin)) return false;
      if (yearMax && item.year !== undefined && item.year > Number(yearMax)) return false;
      return true;
    });
  }, [results, selectedGenres, selectedStatuses, yearMin, yearMax]);

  function toggleGenre(genre: string) {
    setSelectedGenres((prev) => (prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]));
  }

  function toggleStatus(status: ContentStatus) {
    setSelectedStatuses((prev) => (prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]));
  }

  function clearFilters() {
    setSelectedGenres([]);
    setSelectedStatuses([]);
    setYearMin("");
    setYearMax("");
  }
```

- [ ] **Step 4: Render the filter bar and switch the grid/list to filtered results**

Find:

```tsx
      {/* Results */}
      <div className="explore-results">
        {loading ? (
          <div className="series-grid">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="poster-card skeleton" />
            ))}
          </div>
        ) : results.length > 0 ? (
          <>
            {viewMode === "grid" ? (
              <div className="series-grid">
                {results.map((item) => (
                  <SeriesCard key={`${item.source}-${item.externalId}`} series={item} />
                ))}
              </div>
            ) : (
              <div className="series-list">
                {results.map((item) => (
                  <SeriesListRow key={`${item.source}-${item.externalId}`} series={item} />
                ))}
              </div>
            )}

            {results.length < total && (
              <div className="explore-load-more">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? "Loading..." : "Load More"}
                </button>
                {loadMoreError && (
                  <p className="explore-load-more-error">{loadMoreError}</p>
                )}
              </div>
            )}
          </>
        ) : searched ? (
```

Replace it with:

```tsx
      {/* Filters */}
      {results.length > 0 && (
        <ExploreFilters
          availableGenres={availableGenres}
          selectedGenres={selectedGenres}
          onToggleGenre={toggleGenre}
          selectedStatuses={selectedStatuses}
          onToggleStatus={toggleStatus}
          yearMin={yearMin}
          yearMax={yearMax}
          onYearMinChange={setYearMin}
          onYearMaxChange={setYearMax}
          active={filtersActive}
          onClear={clearFilters}
        />
      )}

      {/* Results */}
      <div className="explore-results">
        {loading ? (
          <div className="series-grid">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="poster-card skeleton" />
            ))}
          </div>
        ) : results.length > 0 ? (
          filteredResults.length > 0 ? (
            <>
              {filtersActive && (
                <p className="explore-filter-summary">
                  Showing {filteredResults.length} of {results.length} loaded results
                </p>
              )}
              {viewMode === "grid" ? (
                <div className="series-grid">
                  {filteredResults.map((item) => (
                    <SeriesCard key={`${item.source}-${item.externalId}`} series={item} />
                  ))}
                </div>
              ) : (
                <div className="series-list">
                  {filteredResults.map((item) => (
                    <SeriesListRow key={`${item.source}-${item.externalId}`} series={item} />
                  ))}
                </div>
              )}

              {results.length < total && (
                <div className="explore-load-more">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                  >
                    {loadingMore ? "Loading..." : "Load More"}
                  </button>
                  {loadMoreError && (
                    <p className="explore-load-more-error">{loadMoreError}</p>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="explore-empty">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
              <p>No results match your filters</p>
              <span>Try removing a filter or widening the year range</span>
            </div>
          )
        ) : searched ? (
```

- [ ] **Step 5: Append CSS to `src/app/globals.css`**

Insert this right after the `.search-suggestion-year { ... }` rule added in Task 5 Step 7:

```css
/* ─── Explore filters ─── */
.explore-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: var(--space-5);
  margin-bottom: var(--space-5);
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.explore-filter-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.explore-filter-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.explore-filter-chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  max-width: 420px;
}

.explore-filter-chip {
  background: none;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  color: var(--color-text-secondary);
  font-family: var(--font-sans);
  font-size: 0.75rem;
  font-weight: 500;
  padding: 5px 12px;
  cursor: pointer;
  white-space: nowrap;
  transition: all var(--transition-fast);
}
.explore-filter-chip:hover {
  border-color: var(--color-border-strong);
  color: var(--color-text-primary);
}
.explore-filter-chip-active {
  background: var(--color-brand);
  border-color: var(--color-brand);
  color: #fff;
}

.explore-filter-year-inputs {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--color-text-muted);
}

.explore-filter-year-input {
  width: 72px;
  background: var(--color-bg-input);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-sm);
  color: var(--color-text-primary);
  font-family: var(--font-sans);
  font-size: 0.8125rem;
  padding: 5px 8px;
  outline: none;
}
.explore-filter-year-input:focus {
  border-color: var(--color-brand);
}

.explore-filter-clear {
  align-self: flex-end;
  background: none;
  border: none;
  color: var(--color-text-muted);
  font-size: 0.8125rem;
  text-decoration: underline;
  cursor: pointer;
}
.explore-filter-clear:hover {
  color: var(--color-text-primary);
}

.explore-filter-summary {
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  margin-bottom: var(--space-3);
}

```

- [ ] **Step 6: Verify with type-check and lint**

Run: `npm run type-check && npm run lint`
Expected: both exit 0.

- [ ] **Step 7: Manual browser verification**

Run: `npx next dev --webpack -p 3000`
- Search a query with mixed-source results (e.g. a common word matching TV + anime + manga). Confirm genre chips appear and reflect genres actually present (spot-check a TMDB-sourced and a MangaDex-sourced result both show real genres, not empty).
- Click a genre chip, confirm the grid narrows to matching results and the "Showing X of Y" summary appears.
- Click a status chip (e.g. "Completed"), confirm Anime/Manga results filter correctly while TV results stay visible regardless.
- Enter a year range, confirm out-of-range results are excluded.
- Combine multiple filters, confirm they AND together (not OR).
- Click "Clear filters," confirm all filters reset and the full result set reappears.
- Confirm "Load More" still works with filters active (fetches more raw results, filter re-applies to the larger set).

- [ ] **Step 8: Commit**

```bash
git add src/components/ExploreFilters.tsx src/app/explore/page.tsx src/app/globals.css
git commit -m "feat: add genre/year/status filters to Explore page"
```

---

### Task 7: Sort

**Files:**
- Modify: `src/app/explore/page.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: `filteredResults` from Task 6.
- Produces: `sortedResults` — the final array rendered by the grid/list.

- [ ] **Step 1: Add sort state and the sorted-results memo**

In `src/app/explore/page.tsx`, find the `clearFilters` function added in Task 6 Step 3 and add this right after it:

```tsx

  type SortOption = "relevance" | "rating" | "year" | "popularity";
  const [sortBy, setSortBy] = useState<SortOption>("relevance");

  const sortedResults = useMemo(() => {
    if (sortBy === "relevance") return filteredResults;
    const sorted = [...filteredResults];
    sorted.sort((a, b) => {
      if (sortBy === "rating") return (b.ratingExternal ?? -1) - (a.ratingExternal ?? -1);
      if (sortBy === "year") return (b.year ?? -1) - (a.year ?? -1);
      return (b.popularity ?? -1) - (a.popularity ?? -1);
    });
    return sorted;
  }, [filteredResults, sortBy]);
```

- [ ] **Step 2: Render the sort select and switch rendering to `sortedResults`**

Find the toolbar block:

```tsx
        <div className="explore-view-toggle" role="group" aria-label="View mode">
```

Replace it with:

```tsx
        <select
          className="explore-sort-select"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
          aria-label="Sort results"
        >
          <option value="relevance">Relevance</option>
          <option value="rating">Rating</option>
          <option value="year">Year (newest)</option>
          <option value="popularity">Popularity</option>
        </select>

        <div className="explore-view-toggle" role="group" aria-label="View mode">
```

Then find the two `filteredResults.map` calls added in Task 6 Step 4 and replace both with `sortedResults.map`:

```tsx
              {viewMode === "grid" ? (
                <div className="series-grid">
                  {sortedResults.map((item) => (
                    <SeriesCard key={`${item.source}-${item.externalId}`} series={item} />
                  ))}
                </div>
              ) : (
                <div className="series-list">
                  {sortedResults.map((item) => (
                    <SeriesListRow key={`${item.source}-${item.externalId}`} series={item} />
                  ))}
                </div>
              )}
```

Also update the `"Showing X of Y loaded results"` line to use `sortedResults.length` instead of `filteredResults.length` (same value, just keeping the variable name consistent with what's actually rendered):

```tsx
              {filtersActive && (
                <p className="explore-filter-summary">
                  Showing {sortedResults.length} of {results.length} loaded results
                </p>
              )}
```

And the `filteredResults.length > 0 ? (...) : (...)` branch condition from Task 6 Step 4 stays checking `filteredResults.length` (sorting never changes how many items there are, only their order) — no change needed there.

- [ ] **Step 3: Append CSS to `src/app/globals.css`**

Insert this right after the `.explore-filter-summary { ... }` rule added in Task 6 Step 5:

```css
/* ─── Explore sort ─── */
.explore-sort-select {
  background: var(--color-bg-input);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-md);
  color: var(--color-text-primary);
  font-family: var(--font-sans);
  font-size: 0.8125rem;
  padding: 6px 10px;
  cursor: pointer;
  outline: none;
  flex-shrink: 0;
}
.explore-sort-select:focus {
  border-color: var(--color-brand);
}

```

- [ ] **Step 4: Verify with type-check and lint**

Run: `npm run type-check && npm run lint`
Expected: both exit 0.

- [ ] **Step 5: Manual browser verification**

Run: `npx next dev --webpack -p 3000`
- Search a query, select "Rating," confirm results reorder highest-rated first.
- Select "Year (newest)," confirm results reorder newest first.
- Select "Popularity," confirm results reorder and a MangaDex result (no `popularity`) sorts to the end rather than crashing or appearing first.
- Select "Relevance," confirm it returns to the original order.
- Combine an active filter with a non-default sort, confirm both apply together correctly.

- [ ] **Step 6: Commit**

```bash
git add src/app/explore/page.tsx src/app/globals.css
git commit -m "feat: add rating/year/popularity sort to Explore page"
```

---

### Task 8: Docs

**Files:**
- Modify: `docs/phases.md`

**Interfaces:**
- Consumes: nothing further from earlier tasks — this is a documentation-only final task.
- Produces: nothing consumed elsewhere.

- [ ] **Step 1: Update `docs/phases.md`**

Under Phase 2.4, replace the section:

```markdown
### 2.4 Advanced Search
- [ ] Search suggestions / autocomplete
- [ ] Advanced filter combinations
- [ ] Sort by user rating / popularity
- [ ] "Random" discovery feature
```

with:

```markdown
### 2.4 Advanced Search
- [x] Search suggestions / autocomplete
- [x] Advanced filter combinations — genre, year range, status (status applies to Anime/Manga; TMDB's search response has no per-item status field)
- [x] Sort by user rating / popularity
- ~~"Random" discovery feature~~ — dropped during brainstorming, not deferred. Doesn't fit this product's platform-availability-tracker model (not a recommendation engine).
```

(Match the exact surrounding formatting already in the file — only this section's checkbox states and the struck-through line change.)

- [ ] **Step 2: Commit**

```bash
git add docs/phases.md
git commit -m "docs: check off Phase 2.4 advanced search, drop random discovery"
```
