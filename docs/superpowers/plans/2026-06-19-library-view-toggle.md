# Library Page View Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a grid/list view toggle to `/library`, matching the pattern already shipped on `/explore` — closes the last unbuilt Phase 1 MVP item (`docs/phases.md` § 1.5, Library Page: "Card/list view toggle"). No backend changes.

**Architecture:** A new `LibraryItemRow` component (horizontal row variant of the existing `LibraryItemCard`, same props shape, fully interchangeable) plus `viewMode` client state on `LibraryBoard` that swaps which of the two renders for the same `visible` array — identical pattern to how `SeriesCard`/`SeriesListRow` are swapped on the Explore page.

**Tech Stack:** Next.js 16 App Router (client components), TypeScript, no test framework (none configured in this repo — verification is `npm run type-check` + `npm run lint` + manual browser check).

## Global Constraints

- This branch (`feat/library-view-toggle`) is based on `feat/library-page-polish`, not `main` — `LibraryBoard.tsx`/`LibraryItemCard.tsx` are already in their post-library-page-polish state (status dropdown, content-type tabs) before this plan's changes begin.
- The status badge in `LibraryItemRow` must NOT live inside the navigation `<Link>` — it sits as a sibling between the `Link` (thumbnail+title) and the actions cluster. `LibraryItemCard` already hit and solved this exact nested-interactive-element problem; follow the same precedent, don't reintroduce it.
- `viewMode` persists to `localStorage["library-view-mode"]` — a **separate key** from Explore's `"explore-view-mode"`, so the two pages' preferences are independent.
- `localStorage` access wrapped in `try/catch` with an SSR guard (`typeof window === "undefined"`), exactly matching the existing pattern in `src/app/explore/page.tsx`.
- Toggling `viewMode` never triggers a fetch — both render branches map over the same `entries`/`visible` state already loaded by `LibraryBoard`.
- Reuse existing CSS wherever a class already exists and fits: `.explore-toolbar`, `.explore-view-toggle`, `.explore-view-toggle-btn`, `.explore-view-toggle-btn-active`, `.series-list-thumb`, `.series-list-thumb-img`, `.series-list-thumb-placeholder`, `.series-list-info`, `.series-list-title`, `.library-status-badge`, `.library-status-menu`, `.library-status-menu-item`, `.library-card-confirm`, `.library-card-remove`, `.btn`/`.btn-secondary`/`.btn-sm`/`.btn-danger` — none of these need new rules or modification.
- `npm run type-check` and `npm run lint` must be clean before every commit.
- No `git push` without explicit user instruction. Conventional Commits format for every commit message.
- This project's dev server has a known Turbopack bug on this path (non-ASCII `ü`) — use `npx next dev --webpack` for manual verification, not `npm run dev`.

---

## File Structure

New files:
- `src/components/LibraryItemRow.tsx` — horizontal row variant of `LibraryItemCard`, sibling component.

Modified files:
- `src/components/LibraryBoard.tsx` — add `viewMode` state + toggle UI (Task 2), conditional grid/list render (Task 2).
- `src/app/globals.css` — new selectors for the row layout (Task 1).
- `docs/phases.md` — check off "Card/list view toggle" (Task 2).

---

### Task 1: `LibraryItemRow` component

**Files:**
- Create: `src/components/LibraryItemRow.tsx`
- Modify: `src/app/globals.css` (append after the existing `.series-list-rating { ... }` rule, before `/* ─── Explore toolbar + view toggle ─── */`)

**Interfaces:**
- Consumes: `LIBRARY_STATUS_BADGE_CLASS`, `LIBRARY_STATUS_LABELS`, `type LibraryStatus` from `@/types/common`; `type LibraryEntry` from `@/types/library`.
- Produces: `LibraryItemRow` component, props `{ entry: LibraryEntry; onRemoved: (id: string) => void; onUpdated: (entry: LibraryEntry) => void }` — identical shape to `LibraryItemCard`, so `LibraryBoard` (Task 2) can swap between them with no other code changes.

This task only adds the component and its CSS — it isn't imported/rendered anywhere yet (Task 2's job), so there's no visual change until Task 2 wires it in. That's expected.

- [ ] **Step 1: Write `src/components/LibraryItemRow.tsx`**

```tsx
"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { LIBRARY_STATUS_BADGE_CLASS, LIBRARY_STATUS_LABELS, type LibraryStatus } from "@/types/common";
import type { LibraryEntry } from "@/types/library";

const STATUS_OPTIONS: LibraryStatus[] = [
  "WATCHING",
  "PLAN_TO_WATCH",
  "COMPLETED",
  "ON_HOLD",
  "DROPPED",
];

interface LibraryItemRowProps {
  entry: LibraryEntry;
  onRemoved: (id: string) => void;
  onUpdated: (entry: LibraryEntry) => void;
}

function getProgressField(
  entry: LibraryEntry
): { key: "currentEpisode" | "currentChapter"; value: number; label: string } | null {
  if (entry.series.totalEpisodes != null || entry.currentEpisode != null) {
    return { key: "currentEpisode", value: entry.currentEpisode ?? 0, label: "episode" };
  }
  if (entry.series.totalChapters != null || entry.currentChapter != null) {
    return { key: "currentChapter", value: entry.currentChapter ?? 0, label: "chapter" };
  }
  return null;
}

export default function LibraryItemRow({ entry, onRemoved, onUpdated }: LibraryItemRowProps) {
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [busy, setBusy] = useState(false);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const href = `/series/${entry.series.source}-${entry.series.externalId}`;
  const progress = getProgressField(entry);

  async function handleIncrement() {
    if (!progress) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/library/${entry.id}/progress`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [progress.key]: progress.value + 1 }),
      });
      const data = await res.json();
      if (data.success) {
        onUpdated({ ...entry, [progress.key]: progress.value + 1 });
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove() {
    setBusy(true);
    try {
      const res = await fetch(`/api/library/${entry.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        onRemoved(entry.id);
      }
    } finally {
      setBusy(false);
      setConfirmingRemove(false);
    }
  }

  async function handleStatusChange(newStatus: LibraryStatus) {
    setBusy(true);
    try {
      const res = await fetch(`/api/library/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        onUpdated({ ...entry, status: newStatus });
      }
    } finally {
      setBusy(false);
      setStatusMenuOpen(false);
    }
  }

  return (
    <article className="library-list-row">
      <Link href={href} className="library-list-row-link">
        <div className="series-list-thumb">
          {entry.series.coverImage ? (
            <Image
              src={entry.series.coverImage}
              alt={entry.series.title}
              fill
              sizes="48px"
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
          <h3 className="series-list-title">{entry.series.title}</h3>
        </div>
      </Link>

      <div className="library-row-status-wrapper">
        <button
          type="button"
          className={`badge ${LIBRARY_STATUS_BADGE_CLASS[entry.status]} library-status-badge`}
          onClick={() => setStatusMenuOpen((o) => !o)}
          disabled={busy}
        >
          {LIBRARY_STATUS_LABELS[entry.status]}
        </button>
        {statusMenuOpen && (
          <div className="library-status-menu" role="menu">
            {STATUS_OPTIONS.filter((s) => s !== entry.status).map((status) => (
              <button
                key={status}
                type="button"
                role="menuitem"
                className="library-status-menu-item"
                onClick={() => handleStatusChange(status)}
                disabled={busy}
              >
                {LIBRARY_STATUS_LABELS[status]}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="library-row-actions">
        {progress && (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleIncrement}
            disabled={busy}
          >
            +1 {progress.label} ({progress.value})
          </button>
        )}
        {confirmingRemove ? (
          <div className="library-card-confirm">
            <span>Remove?</span>
            <button type="button" className="btn btn-sm btn-danger" onClick={handleRemove} disabled={busy}>
              Yes
            </button>
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={() => setConfirmingRemove(false)}
              disabled={busy}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="library-card-remove"
            onClick={() => setConfirmingRemove(true)}
            disabled={busy}
            aria-label="Remove from library"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6" />
            </svg>
          </button>
        )}
      </div>
    </article>
  );
}
```

- [ ] **Step 2: Append CSS to `src/app/globals.css`**

Insert this block immediately after the existing `.series-list-rating { ... }` rule (before `/* ─── Explore toolbar + view toggle ─── */`):

```css
/* ─── Library list view ─── */
.library-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.library-list-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-bg-elevated);
  transition: border-color var(--transition-fast);
}
.library-list-row:hover {
  border-color: var(--color-border-strong);
}

.library-list-row-link {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex: 1;
  min-width: 0;
  text-decoration: none;
  color: inherit;
}

.library-row-status-wrapper {
  position: relative;
  display: inline-block;
  flex-shrink: 0;
}

.library-row-actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-shrink: 0;
}
```

- [ ] **Step 3: Verify it compiles**

Run: `npm run type-check` and `npm run lint`
Expected: both exit 0. (`LibraryItemRow` isn't imported anywhere yet, so no visual check is possible until Task 2 wires it in — that's expected.)

- [ ] **Step 4: Commit**

```bash
git add src/components/LibraryItemRow.tsx src/app/globals.css
git commit -m "feat: add LibraryItemRow component for library list view"
```

---

### Task 2: View toggle on the library page

**Files:**
- Modify: `src/components/LibraryBoard.tsx`
- Modify: `docs/phases.md`

**Interfaces:**
- Consumes: `LibraryItemRow` from Task 1.
- Produces: `viewMode` client state (`"grid" | "list"`) on `LibraryBoard`, persisted to `localStorage` key `"library-view-mode"`.

- [ ] **Step 1: Modify `src/components/LibraryBoard.tsx`**

Add the import for `LibraryItemRow` after the existing `LibraryItemCard` import:

```tsx
import LibraryItemCard from "./LibraryItemCard";
import LibraryItemRow from "./LibraryItemRow";
```

Add `viewMode` state and its handler, right after the existing `contentTypeTab` state declaration:

```tsx
  const [contentTypeTab, setContentTypeTab] = useState<"ALL" | ContentType>("ALL");
  const [viewMode, setViewMode] = useState<"grid" | "list">(() => {
    if (typeof window === "undefined") return "grid";
    try {
      const stored = window.localStorage.getItem("library-view-mode");
      if (stored === "grid" || stored === "list") return stored;
    } catch {
      // localStorage unavailable (private browsing, disabled storage) — keep default "grid"
    }
    return "grid";
  });

  function handleViewModeChange(mode: "grid" | "list") {
    setViewMode(mode);
    try {
      window.localStorage.setItem("library-view-mode", mode);
    } catch {
      // localStorage unavailable — preference just won't persist this session
    }
  }
```

Replace the existing status-tabs block:

```tsx
      <div className="explore-tabs" role="tablist">
        {TABS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            className={`explore-tab ${tab === value ? "explore-tab-active" : ""}`}
            onClick={() => setTab(value)}
          >
            {label}
          </button>
        ))}
      </div>
```

with a toolbar that wraps the status tabs and adds the view toggle:

```tsx
      <div className="explore-toolbar">
        <div className="explore-tabs" role="tablist">
          {TABS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={tab === value}
              className={`explore-tab ${tab === value ? "explore-tab-active" : ""}`}
              onClick={() => setTab(value)}
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

(The content-type tabs row — `<div className="explore-tabs library-content-tabs" role="tablist">...</div>` — stays exactly where it is, as its own full-width row below the toolbar, untouched.)

Replace the results-rendering block:

```tsx
      {visible.length === 0 ? (
        <div className="explore-empty">
          <p>No series in this status yet.</p>
        </div>
      ) : (
        <div className="series-grid">
          {visible.map((entry) => (
            <LibraryItemCard key={entry.id} entry={entry} onRemoved={handleRemoved} onUpdated={handleUpdated} />
          ))}
        </div>
      )}
```

with a version that branches on `viewMode`:

```tsx
      {visible.length === 0 ? (
        <div className="explore-empty">
          <p>No series in this status yet.</p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="series-grid">
          {visible.map((entry) => (
            <LibraryItemCard key={entry.id} entry={entry} onRemoved={handleRemoved} onUpdated={handleUpdated} />
          ))}
        </div>
      ) : (
        <div className="library-list">
          {visible.map((entry) => (
            <LibraryItemRow key={entry.id} entry={entry} onRemoved={handleRemoved} onUpdated={handleUpdated} />
          ))}
        </div>
      )}
```

- [ ] **Step 2: Check off the phases.md item**

In `docs/phases.md`, find the line:
```
  - [ ] Card/list view toggle
```
under `- [x] **Library Page** (authenticated)`, and change it to:
```
  - [x] Card/list view toggle
```

- [ ] **Step 3: Verify it compiles**

Run: `npm run type-check` and `npm run lint`
Expected: both exit 0.

- [ ] **Step 4: Manual verification**

With `npx next dev --webpack` running and signed in with at least 2-3 items in the library (mix of statuses/content types):
- Two toggle buttons (grid icon, list icon) appear next to the status tabs row; grid is active by default. The content-type tabs row still renders below, unaffected.
- Clicking the list icon switches results to horizontal rows: thumbnail, title, status badge, progress button, remove button — all in one row, no overlap or clipping.
- Click a row's status badge — dropdown opens listing the other 4 statuses, picking one updates it (same behavior as the grid card).
- Click a row's `+1` button — increments correctly.
- Click a row's remove button — confirm flow works, removes the entry.
- Clicking the thumbnail or title navigates to the series detail page (confirms the status badge/actions are NOT nested inside the navigation link — clicking them must NOT navigate).
- Switch back to grid — original `LibraryItemCard` grid renders unchanged.
- Reload the page after selecting list view — list view persists.
- Switch view mode on `/explore` and `/library` independently — confirm each remembers its own preference (different `localStorage` keys, no cross-contamination).
- Confirm no network request fires on a pure view-mode toggle (Network tab: no new requests beyond the toggle's own click).

- [ ] **Step 5: Commit**

```bash
git add src/components/LibraryBoard.tsx docs/phases.md
git commit -m "feat: add grid/list view toggle to library page"
```

---

## Final Verification

After both tasks are committed:

1. `npm run type-check` — exits 0.
2. `npm run lint` — exits 0.
3. Full click-through with `npx next dev --webpack` running, per Task 2 Step 4's checklist.
4. Recommend a final whole-plan code review (`superpowers:requesting-code-review`) before merging, same as the prior sub-projects' process.
