# Explore Page Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Load More" pagination control and a grid/list view toggle to `/explore`, closing the two remaining gaps in Phase 1's Explore/Search Page checklist — no backend changes, `GET /api/search` already supports `page` and returns `total`.

**Architecture:** Two additive pieces of client-state on the existing `"use client"` `ExplorePage` component (`src/app/explore/page.tsx`): pagination state (`page`/`total`/`loadingMore`) that appends to `results` instead of replacing them, and view-mode state (`"grid" | "list"`) persisted to `localStorage` that swaps which of two presentational components (`SeriesCard` existing, `SeriesListRow` new) renders the same `results` array. No new API routes, no schema changes.

**Tech Stack:** Next.js 16 App Router (client component), TypeScript, no test framework (none configured in this repo — verification is `npm run type-check` + `npm run lint` + manual browser check, same convention as the Library CRUD plan).

## Global Constraints

- No changes to `GET /api/search`'s contract — it already accepts `?page=` and returns `{ results, total, page, query, type }`.
- A fresh search (query or content-type tab change) resets `page` to 1 and **replaces** `results`. "Load More" **appends**.
- `localStorage` access must be wrapped in `try/catch` — some environments throw on access (private browsing, disabled storage). Falls back to in-memory `"grid"` default for that session.
- The full-page skeleton loading state (shown during the initial debounced search) only has a grid variant — it renders the grid skeleton regardless of `viewMode`. List-mode skeletons are out of scope.
- New CSS classes follow this codebase's existing naming convention (`.explore-*`, `.series-list-*`) and reuse existing design tokens (`var(--space-N)`, `var(--radius-*)`, `var(--color-*)`, `var(--transition-fast)`) — no new tokens introduced.
- `npm run type-check` and `npm run lint` must be clean before every commit.
- No `git push` without explicit user instruction. Conventional Commits format for every commit message.
- This project's dev server has a known Turbopack bug on this path (non-ASCII `ü`) — use `npx next dev --webpack` for manual verification, not `npm run dev`.

---

## File Structure

New files:
- `src/components/SeriesListRow.tsx` — horizontal list-row presentational component, sibling to `SeriesCard`.

Modified files:
- `src/app/explore/page.tsx` — add view-mode toggle + `localStorage` persistence (Task 2), add Load More pagination (Task 3).
- `src/app/globals.css` — new selectors for list rows (Task 1), view toggle buttons (Task 2), load-more button (Task 3).

---

### Task 1: SeriesListRow component

**Files:**
- Create: `src/components/SeriesListRow.tsx`
- Modify: `src/app/globals.css` (append after the existing `.explore-empty span { ... }` rule, before `/* ─── Series Detail Page ─── */`)

**Interfaces:**
- Consumes: `SearchResult` from `@/types/series`; `CONTENT_TYPE_BADGE_CLASS` from `@/types/common`.
- Produces: `SeriesListRow` component, props `{ series: SearchResult; showType?: boolean }` — same shape as the existing `SeriesCard` component (`src/components/SeriesCard.tsx`), so callers can swap between the two without prop changes.

- [ ] **Step 1: Write `src/components/SeriesListRow.tsx`**

```tsx
import React from "react";
import Image from "next/image";
import Link from "next/link";
import type { SearchResult } from "@/types/series";
import { CONTENT_TYPE_BADGE_CLASS } from "@/types/common";

interface SeriesListRowProps {
  series: SearchResult;
  /** Show content type badge (default: true) */
  showType?: boolean;
}

export default function SeriesListRow({ series, showType = true }: SeriesListRowProps) {
  const href = `/series/${series.source}-${series.externalId}`;

  return (
    <Link
      href={href}
      className="series-list-row"
      id={`series-list-${series.source}-${series.externalId}`}
    >
      <div className="series-list-thumb">
        {series.coverImage ? (
          <Image
            src={series.coverImage}
            alt={series.title}
            fill
            sizes="60px"
            className="series-list-thumb-img"
          />
        ) : (
          <div className="series-list-thumb-placeholder">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <path d="m21 15-5-5L5 21"/>
            </svg>
          </div>
        )}
      </div>

      <div className="series-list-info">
        <h3 className="series-list-title">{series.title}</h3>
        <div className="series-list-meta">
          {showType && (
            <span className={`badge ${CONTENT_TYPE_BADGE_CLASS[series.contentType]}`}>
              {series.contentType.replace("_", " ")}
            </span>
          )}
          {series.year && <span className="series-list-year">{series.year}</span>}
          {series.genres.slice(0, 2).map((g) => (
            <span key={g} className="series-list-genre">{g}</span>
          ))}
        </div>
      </div>

      {series.ratingExternal && series.ratingExternal > 0 && (
        <div className="series-list-rating">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--color-star)">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
          <span>{series.ratingExternal.toFixed(1)}</span>
        </div>
      )}
    </Link>
  );
}
```

- [ ] **Step 2: Append CSS to `src/app/globals.css`**

Insert this block immediately after the existing `.explore-empty span { ... }` rule (before the `/* ─── Series Detail Page ─── */` comment):

```css
/* ─── Series list view (Explore page) ─── */
.series-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.series-list-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-bg-elevated);
  text-decoration: none;
  color: inherit;
  transition: border-color var(--transition-fast);
}
.series-list-row:hover {
  border-color: var(--color-border-strong);
}

.series-list-thumb {
  position: relative;
  flex-shrink: 0;
  width: 48px;
  height: 72px;
  border-radius: var(--radius-sm);
  overflow: hidden;
  background: var(--color-bg-surface);
}

.series-list-thumb-img {
  object-fit: cover;
}

.series-list-thumb-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-muted);
}

.series-list-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.series-list-title {
  font-family: var(--font-sans);
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.series-list-meta {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.series-list-year {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.series-list-genre {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.series-list-rating {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-star);
  flex-shrink: 0;
}
```

- [ ] **Step 3: Verify it compiles**

Run: `npm run type-check` and `npm run lint`
Expected: both exit 0. (`SeriesListRow` isn't imported anywhere yet, so no visual check is possible until Task 2 wires it in — that's expected.)

- [ ] **Step 4: Commit**

```bash
git add src/components/SeriesListRow.tsx src/app/globals.css
git commit -m "feat: add SeriesListRow component for explore list view"
```

---

### Task 2: Grid/list view toggle on the explore page

**Files:**
- Modify: `src/app/explore/page.tsx`
- Modify: `src/app/globals.css` (append after Task 1's `.series-list-rating` block)

**Interfaces:**
- Consumes: `SeriesListRow` from Task 1.
- Produces: `viewMode` client state (`"grid" | "list"`) on `ExplorePage`, persisted to `localStorage` key `"explore-view-mode"`.

This task only adds the toggle and list rendering — pagination (Task 3) comes after, so `results` still only ever holds one page's worth of data after this task.

- [ ] **Step 1: Modify `src/app/explore/page.tsx`**

Add the import for `SeriesListRow` after the existing `SeriesCard` import:

```typescript
import SeriesCard from "@/components/SeriesCard";
import SeriesListRow from "@/components/SeriesListRow";
```

Add `viewMode` state and its `localStorage` read/write effects, right after the existing `debounceRef` declaration:

```typescript
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Read persisted view mode preference on mount
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("explore-view-mode");
      if (stored === "grid" || stored === "list") {
        setViewMode(stored);
      }
    } catch {
      // localStorage unavailable (private browsing, disabled storage) — keep default "grid"
    }
  }, []);

  function handleViewModeChange(mode: "grid" | "list") {
    setViewMode(mode);
    try {
      window.localStorage.setItem("explore-view-mode", mode);
    } catch {
      // localStorage unavailable — preference just won't persist this session
    }
  }
```

Replace the existing content-type tabs block:

```tsx
      {/* Content type tabs */}
      <div className="explore-tabs" role="tablist">
        {CONTENT_TABS.map(({ value, label }) => (
          <button
            key={value}
            role="tab"
            aria-selected={type === value}
            className={`explore-tab ${type === value ? "explore-tab-active" : ""}`}
            onClick={() => setType(value)}
          >
            {label}
          </button>
        ))}
      </div>
```

with a toolbar that wraps the tabs and adds the view toggle:

```tsx
      {/* Content type tabs + view toggle */}
      <div className="explore-toolbar">
        <div className="explore-tabs" role="tablist">
          {CONTENT_TABS.map(({ value, label }) => (
            <button
              key={value}
              role="tab"
              aria-selected={type === value}
              className={`explore-tab ${type === value ? "explore-tab-active" : ""}`}
              onClick={() => setType(value)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="explore-view-toggle" role="group" aria-label="View mode">
          <button
            type="button"
            className={`explore-view-toggle-btn ${viewMode === "grid" ? "explore-view-toggle-btn-active" : ""}`}
            onClick={() => handleViewModeChange("grid")}
            aria-label="Grid view"
            aria-pressed={viewMode === "grid"}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7"/>
              <rect x="14" y="3" width="7" height="7"/>
              <rect x="3" y="14" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/>
            </svg>
          </button>
          <button
            type="button"
            className={`explore-view-toggle-btn ${viewMode === "list" ? "explore-view-toggle-btn-active" : ""}`}
            onClick={() => handleViewModeChange("list")}
            aria-label="List view"
            aria-pressed={viewMode === "list"}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
        </div>
      </div>
```

Replace the results-rendering block:

```tsx
        ) : results.length > 0 ? (
          <div className="series-grid">
            {results.map((item) => (
              <SeriesCard key={`${item.source}-${item.externalId}`} series={item} />
            ))}
          </div>
        ) : searched ? (
```

with a version that branches on `viewMode`:

```tsx
        ) : results.length > 0 ? (
          viewMode === "grid" ? (
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
          )
        ) : searched ? (
```

(The loading-skeleton branch above this — `loading ? (<div className="series-grid">...skeleton...</div>)` — is left untouched per the spec: skeletons always render as a grid regardless of `viewMode`.)

- [ ] **Step 2: Append CSS to `src/app/globals.css`**

Insert after Task 1's `.series-list-rating { ... }` block:

```css
/* ─── Explore toolbar + view toggle ─── */
.explore-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-6);
}
.explore-toolbar .explore-tabs {
  margin-bottom: 0;
  flex: 1;
}

.explore-view-toggle {
  display: flex;
  flex-shrink: 0;
  gap: 2px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 2px;
}

.explore-view-toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: none;
  border: none;
  border-radius: var(--radius-sm);
  color: var(--color-text-muted);
  cursor: pointer;
  transition: all var(--transition-fast);
}
.explore-view-toggle-btn:hover {
  color: var(--color-text-primary);
}
.explore-view-toggle-btn-active {
  background: var(--color-brand);
  color: #fff;
}
```

- [ ] **Step 3: Verify it compiles**

Run: `npm run type-check` and `npm run lint`
Expected: both exit 0.

- [ ] **Step 4: Manual verification**

With `npx next dev --webpack` running, visit `/explore`, type a query with at least one result (e.g. "naruto"):
- Two toggle buttons (grid icon, list icon) appear next to the content-type tabs; grid is active by default.
- Clicking the list icon switches results to horizontal rows (poster thumbnail, title, badge, year, genres, rating) without re-fetching (confirm via Network tab: no new `/api/search` request fires on a pure toggle click).
- Clicking back to grid restores the original card grid.
- Reload the page after selecting list view — list view is still active (confirms `localStorage` persistence).

- [ ] **Step 5: Commit**

```bash
git add "src/app/explore/page.tsx" src/app/globals.css
git commit -m "feat: add grid/list view toggle to explore page"
```

---

### Task 3: Load More pagination on the explore page

**Files:**
- Modify: `src/app/explore/page.tsx`
- Modify: `src/app/globals.css` (append after Task 2's `.explore-view-toggle-btn-active` block)

**Interfaces:**
- Consumes: `GET /api/search`'s existing `?page=` param and `total` field in its response (no changes to `src/app/api/search/route.ts`).
- Produces: `page`, `total`, `loadingMore`, `loadMoreError` client state on `ExplorePage`.

- [ ] **Step 1: Modify `src/app/explore/page.tsx`**

Add `page`, `total`, `loadingMore`, `loadMoreError` state, right after the `results`/`loading`/`searched` state declarations:

```typescript
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
```

Replace the existing `search` callback:

```typescript
  const search = useCallback(async (q: string, t: string) => {
    if (q.length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }

    setLoading(true);
    setSearched(true);

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&type=${t}`);
      const data = await res.json();
      if (data.success) {
        setResults(data.data.results || []);
      } else {
        setResults([]);
      }
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);
```

with a version that resets pagination state on every fresh search:

```typescript
  const search = useCallback(async (q: string, t: string) => {
    if (q.length < 2) {
      setResults([]);
      setSearched(false);
      setPage(1);
      setTotal(0);
      return;
    }

    setLoading(true);
    setSearched(true);
    setLoadMoreError(null);

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&type=${t}&page=1`);
      const data = await res.json();
      if (data.success) {
        setResults(data.data.results || []);
        setTotal(data.data.total || 0);
        setPage(1);
      } else {
        setResults([]);
        setTotal(0);
      }
    } catch {
      setResults([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  async function handleLoadMore() {
    setLoadingMore(true);
    setLoadMoreError(null);
    const nextPage = page + 1;

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&type=${type}&page=${nextPage}`);
      const data = await res.json();
      if (data.success) {
        setResults((prev) => [...prev, ...(data.data.results || [])]);
        setPage(nextPage);
      } else {
        setLoadMoreError(data.error || "Failed to load more results");
      }
    } catch {
      setLoadMoreError("Failed to load more results");
    } finally {
      setLoadingMore(false);
    }
  }
```

Replace the results-rendering block added in Task 2:

```tsx
        ) : results.length > 0 ? (
          viewMode === "grid" ? (
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
          )
        ) : searched ? (
```

with a version that wraps the grid/list in a fragment alongside the Load More control:

```tsx
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

- [ ] **Step 2: Append CSS to `src/app/globals.css`**

Insert after Task 2's `.explore-view-toggle-btn-active { ... }` block:

```css
/* ─── Explore load more ─── */
.explore-load-more {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  margin-top: var(--space-6);
}

.explore-load-more-error {
  color: var(--color-danger, #ef4444);
  font-size: 0.8125rem;
}
```

- [ ] **Step 3: Verify it compiles**

Run: `npm run type-check` and `npm run lint`
Expected: both exit 0.

- [ ] **Step 4: Manual verification**

With `npx next dev --webpack` running, visit `/explore`, search for a query known to return more than one page of results across sources (e.g. "a" or "love" — broad enough to exceed a single TMDB/AniList page):
- A "Load More" button appears below the results.
- Clicking it appends the next page's results below the existing ones (no duplicates, no layout jump, no full-page re-render/skeleton flash).
- Once `results.length >= total`, the button disappears.
- Switch the content-type tab or change the query — results and the Load More button both reset correctly to a fresh page 1.
- Switch grid/list view while results from multiple pages are loaded — both pages' worth of results render correctly in the new view mode, no re-fetch.

- [ ] **Step 5: Commit**

```bash
git add "src/app/explore/page.tsx" src/app/globals.css
git commit -m "feat: add load more pagination to explore page"
```

---

## Final Verification

After all 3 tasks are committed:

1. `npm run type-check` — exits 0.
2. `npm run lint` — exits 0.
3. Full click-through with `npx next dev --webpack` running: search a broad query → confirm grid view renders → switch to list view → confirm rows render with correct data → click Load More → confirm results append → reload the page → confirm list view persisted → search a different query → confirm pagination/view state behaves correctly on the fresh search.
4. Recommend a final whole-plan code review (`superpowers:requesting-code-review`) before merging, same as the Library CRUD plan's process.
