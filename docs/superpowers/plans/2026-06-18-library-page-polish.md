# Library Page Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a quick status-change dropdown to each library card and a content-type filter row to `/library`, closing the remaining Phase 1 Personal Library checklist gaps. No backend changes — `PATCH /api/library/[id]` already accepts `{ status }`, and `entry.series.contentType` is already loaded.

**Architecture:** Two additive, independent UI changes. `LibraryItemCard.tsx` gets its static status `<span>` restructured into a standalone dropdown button (sibling to the poster `Link`, not nested inside it) that PATCHes the existing endpoint and calls the existing `onUpdated` callback. `LibraryBoard.tsx` gets a second tab row (content type) whose value combines with the existing status tab via AND when filtering `entries`. No new API routes, no schema changes.

**Tech Stack:** Next.js 16 App Router (client components), TypeScript, no test framework (none configured in this repo — verification is `npm run type-check` + `npm run lint` + manual browser check).

## Global Constraints

- No changes to `PATCH /api/library/[id]` or `/api/library/[id]/progress` — both already exist and are untouched.
- Status-change and content-type filtering are pure frontend changes; `entry.series.contentType` is already present on every `LibraryEntry` fetched server-side.
- Status-change failures fail silently (menu closes, `busy` clears, no toast) — matches this component's existing convention for `handleIncrement`/`handleRemove`.
- The status dropdown menu has no click-outside/Escape dismissal — `AddToLibraryButton` (the pattern being mirrored) doesn't have one either; toggling the same button again closes it, consistent with the existing codebase pattern.
- New CSS classes follow this codebase's existing naming convention (`.library-*`) and reuse existing design tokens (`var(--space-N)`, `var(--radius-*)`, `var(--color-*)`, `var(--shadow-elevated)`, `var(--transition-fast)`) — no new tokens introduced.
- `npm run type-check` and `npm run lint` must be clean before every commit.
- No `git push` without explicit user instruction. Conventional Commits format for every commit message.
- This project's dev server has a known Turbopack bug on this path (non-ASCII `ü`) — use `npx next dev --webpack` for manual verification, not `npm run dev`.

---

## File Structure

Modified files:
- `src/components/LibraryItemCard.tsx` — restructure status badge into a clickable dropdown (Task 1).
- `src/components/LibraryBoard.tsx` — add content-type tab row + combined filter logic (Task 2).
- `src/app/globals.css` — new selectors for the status dropdown (Task 1) and content-type tab spacing (Task 2).

---

### Task 1: Status-change dropdown on `LibraryItemCard`

**Files:**
- Modify: `src/components/LibraryItemCard.tsx`
- Modify: `src/app/globals.css` (append after the existing `.btn-danger { ... }` rule at line 1921, before `/* ─── Auth Pages ─── */`)

**Interfaces:**
- Consumes: `LIBRARY_STATUS_LABELS`, `LIBRARY_STATUS_BADGE_CLASS`, `type LibraryStatus` from `@/types/common` (already imported); existing `onUpdated: (entry: LibraryEntry) => void` prop.
- Produces: no new exported interface — `LibraryItemCardProps` is unchanged.

The status `<span>` currently sits inside the card's `<Link href={href}>` wrapper (`src/components/LibraryItemCard.tsx:67-86`), so it must move out to a sibling position to become independently clickable without triggering navigation. `.poster-card` (the article's other class) is already `position: relative`, so an absolutely-positioned sibling badge works without new wrapper markup.

- [ ] **Step 1: Modify `src/components/LibraryItemCard.tsx`**

Add a `STATUS_OPTIONS` constant and `statusMenuOpen` state. Replace the top of the file (imports through the `getProgressField` function stay unchanged) — insert this right after the imports:

```tsx
const STATUS_OPTIONS: LibraryStatus[] = [
  "WATCHING",
  "PLAN_TO_WATCH",
  "COMPLETED",
  "ON_HOLD",
  "DROPPED",
];
```

Add `import type { LibraryStatus } from "@/types/common";` to the existing import line (it currently only imports `LIBRARY_STATUS_BADGE_CLASS, LIBRARY_STATUS_LABELS`):

```tsx
import { LIBRARY_STATUS_BADGE_CLASS, LIBRARY_STATUS_LABELS, type LibraryStatus } from "@/types/common";
```

Add `statusMenuOpen` state next to the existing `confirmingRemove`/`busy` state:

```tsx
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [busy, setBusy] = useState(false);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
```

Add a `handleStatusChange` function next to the existing `handleIncrement`/`handleRemove` functions:

```tsx
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
```

Replace the `<Link>` block (the badge moves out of it) — current code:

```tsx
        <article className="poster-card library-card">
          <Link href={href} className="series-card-link">
            {entry.series.coverImage ? (
              <Image
                src={entry.series.coverImage}
                alt={entry.series.title}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 200px"
                className="poster-card-img"
              />
            ) : (
              <div className="poster-card-placeholder">No Image</div>
            )}
            <div className="poster-overlay" />
            <div className="poster-card-info">
              <span className={`badge ${LIBRARY_STATUS_BADGE_CLASS[entry.status]}`}>
                {LIBRARY_STATUS_LABELS[entry.status]}
              </span>
              <h3 className="poster-card-title">{entry.series.title}</h3>
            </div>
          </Link>
```

becomes:

```tsx
        <article className="poster-card library-card">
          <div className="library-status-wrapper">
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

          <Link href={href} className="series-card-link">
            {entry.series.coverImage ? (
              <Image
                src={entry.series.coverImage}
                alt={entry.series.title}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 200px"
                className="poster-card-img"
              />
            ) : (
              <div className="poster-card-placeholder">No Image</div>
            )}
            <div className="poster-overlay" />
            <div className="poster-card-info">
              <h3 className="poster-card-title">{entry.series.title}</h3>
            </div>
          </Link>
```

- [ ] **Step 2: Append CSS to `src/app/globals.css`**

Insert this block immediately after the existing `.btn-danger { ... }` rule (line ~1921, before `/* ─── Auth Pages ─── */`):

```css
/* ─── Library card status dropdown ─── */
.library-status-wrapper {
  position: absolute;
  top: var(--space-2);
  left: var(--space-2);
  z-index: 3;
}

.library-status-badge {
  cursor: pointer;
  border: none;
}
.library-status-badge:hover {
  filter: brightness(1.1);
}
.library-status-badge:disabled {
  cursor: default;
  opacity: 0.7;
}

.library-status-menu {
  position: absolute;
  top: calc(100% + var(--space-2));
  left: 0;
  min-width: 140px;
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-elevated);
  z-index: 10;
  overflow: hidden;
}

.library-status-menu-item {
  display: block;
  width: 100%;
  text-align: left;
  padding: var(--space-2) var(--space-3);
  background: none;
  border: none;
  font-size: 0.8125rem;
  cursor: pointer;
}
.library-status-menu-item:hover {
  background: var(--color-bg-hover, rgba(255, 255, 255, 0.06));
}
```

- [ ] **Step 3: Verify it compiles**

Run: `npm run type-check` and `npm run lint`
Expected: both exit 0.

- [ ] **Step 4: Manual verification**

With `npx next dev --webpack` running and at least one item in the library (sign in and add one via a series detail page if needed), visit `/library`:
- The status badge renders top-left over the poster, same color as before.
- Clicking it opens a dropdown listing the other 4 statuses (not the current one).
- Picking a status updates the badge immediately, closes the menu, and the card moves between status tabs correctly if a tab filter is active.
- Clicking the badge again while the menu is open closes it without changing anything.

- [ ] **Step 5: Commit**

```bash
git add src/components/LibraryItemCard.tsx src/app/globals.css
git commit -m "feat: add quick status-change dropdown to library cards"
```

---

### Task 2: Content-type filter on `/library`

**Files:**
- Modify: `src/components/LibraryBoard.tsx`
- Modify: `src/app/globals.css` (append after Task 1's `.library-status-menu-item:hover` block)

**Interfaces:**
- Consumes: `CONTENT_TYPE_LABELS`, `type ContentType` from `@/types/common`; `entry.series.contentType` (already present on every `LibraryEntry`).
- Produces: no new exported interface — `LibraryBoardProps` is unchanged.

- [ ] **Step 1: Modify `src/components/LibraryBoard.tsx`**

Replace the import line:

```tsx
import { LIBRARY_STATUS_LABELS, type LibraryStatus } from "@/types/common";
```

with:

```tsx
import { LIBRARY_STATUS_LABELS, type LibraryStatus, CONTENT_TYPE_LABELS, type ContentType } from "@/types/common";
```

Add a `CONTENT_TYPE_TABS` constant next to the existing `TABS` constant:

```tsx
const CONTENT_TYPE_TABS: { value: "ALL" | ContentType; label: string }[] = [
  { value: "ALL", label: "All Types" },
  { value: "TV_SERIES", label: CONTENT_TYPE_LABELS.TV_SERIES },
  { value: "ANIME", label: CONTENT_TYPE_LABELS.ANIME },
  { value: "MANGA", label: CONTENT_TYPE_LABELS.MANGA },
  { value: "MANHWA", label: CONTENT_TYPE_LABELS.MANHWA },
  { value: "LIGHT_NOVEL", label: CONTENT_TYPE_LABELS.LIGHT_NOVEL },
  { value: "WEBTOON", label: CONTENT_TYPE_LABELS.WEBTOON },
];
```

Add `contentTypeTab` state next to the existing `tab` state, and update the `visible` filter:

```tsx
  const [entries, setEntries] = useState(initialEntries);
  const [tab, setTab] = useState<"ALL" | LibraryStatus>("ALL");
  const [contentTypeTab, setContentTypeTab] = useState<"ALL" | ContentType>("ALL");

  const visible = entries.filter(
    (e) =>
      (tab === "ALL" || e.status === tab) &&
      (contentTypeTab === "ALL" || e.series.contentType === contentTypeTab)
  );
```

Add the second tab row right after the existing status tabs `<div className="explore-tabs" role="tablist">...</div>` block:

```tsx
      <div className="explore-tabs library-content-tabs" role="tablist">
        {CONTENT_TYPE_TABS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={contentTypeTab === value}
            className={`explore-tab ${contentTypeTab === value ? "explore-tab-active" : ""}`}
            onClick={() => setContentTypeTab(value)}
          >
            {label}
          </button>
        ))}
      </div>
```

- [ ] **Step 2: Append CSS to `src/app/globals.css`**

Insert after Task 1's `.library-status-menu-item:hover { ... }` block:

```css
/* ─── Library content-type tab row ─── */
.library-content-tabs {
  margin-top: calc(-1 * var(--space-3));
}
```

- [ ] **Step 3: Verify it compiles**

Run: `npm run type-check` and `npm run lint`
Expected: both exit 0.

- [ ] **Step 4: Manual verification**

With `npx next dev --webpack` running and library items of at least two different content types (add a TV series and an anime via series detail pages if needed), visit `/library`:
- A second tab row appears below the status tabs, listing "All Types" plus each content type.
- Selecting a content type filters the grid to only that type, combined with whatever status tab is active (e.g. "Watching" + "Anime" shows only watching anime).
- Selecting "All Types" again shows all content types for the active status tab.
- Reloading the page resets both tab rows to "All" (no persistence expected, matches existing status-tab behavior).

- [ ] **Step 5: Commit**

```bash
git add src/components/LibraryBoard.tsx src/app/globals.css
git commit -m "feat: add content-type filter to library page"
```

---

## Final Verification

After both tasks are committed:

1. `npm run type-check` — exits 0.
2. `npm run lint` — exits 0.
3. Full click-through with `npx next dev --webpack` running: visit `/library` with a mix of statuses and content types → click a card's status badge → change its status → confirm it moves between status-tab views correctly → use the new content-type tab row → confirm combined filtering works → reload → confirm both filters reset to "All".
4. Recommend a final whole-plan code review (`superpowers:requesting-code-review`) before merging, same as the Explore Page Polish plan's process.
