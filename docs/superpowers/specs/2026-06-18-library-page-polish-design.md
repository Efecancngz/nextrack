# Library Page Polish — Design Spec

**Status:** Approved
**Scope:** Phase 1 close-out, sub-project 2 of 4 (explore page done; favicon and deploy/infra follow separately — see `docs/phases.md`).

## Goal

Add quick status-change UI to library cards and a content-type filter to `/library`, closing the remaining Phase 1 gaps in the Personal Library checklist. No backend changes required — `PATCH /api/library/[id]` already accepts `{ status }`, and `LibraryEntry.series.contentType` is already present in the data `LibraryBoard` loads.

## Out of Scope

- Episode/chapter progress tracking changes — the existing `+1 episode/chapter` button and its `/api/library/[id]/progress` endpoint are untouched.
- Any new API routes or schema changes.
- Sorting controls — not part of this round.

## Current State

- `src/components/LibraryBoard.tsx` is a `"use client"` component holding `entries` state (seeded from server-rendered `initialEntries`) and a single status `tab` filter (`"ALL" | LibraryStatus`), rendered as a row of buttons reusing `.explore-tabs`/`.explore-tab`/`.explore-tab-active`. It renders `LibraryItemCard` for each visible entry in a `.series-grid`.
- `src/components/LibraryItemCard.tsx` renders the poster, a static status `<span className="badge ...">` overlaid on the image inside the card's `Link`, a progress `+1` button, and a remove-with-confirm control. `onUpdated(entry)` and `onRemoved(id)` callbacks are passed down from `LibraryBoard` and already wired for optimistic local state updates.
- `PATCH /api/library/[id]` (existing, from prior Library CRUD work) accepts `{ status: LibraryStatus }` and returns the updated entry — no changes needed.
- `src/types/common.ts` has `LIBRARY_STATUS_LABELS`/`LIBRARY_STATUS_BADGE_CLASS` (used by the badge) and `CONTENT_TYPE_LABELS` (not yet used on this page).

## Design

### 1. Quick status change — status badge becomes a dropdown

**Problem:** the status badge currently sits inside `LibraryItemCard`'s `<Link href={href}>` wrapper, so it can't be made independently clickable without intercepting the link's navigation.

**Structural change to `LibraryItemCard.tsx`:**
- Move the status badge out of the `Link` and render it as a sibling overlay positioned the same way visually (absolute-positioned over the poster, matching current placement), so clicking it does not trigger navigation.
- New local state: `statusMenuOpen: boolean`.
- The badge becomes a `<button type="button">` (reusing the existing `badge`/`LIBRARY_STATUS_BADGE_CLASS` classes for color, plus a new `.library-status-badge` class for cursor/interaction affordance) that toggles `statusMenuOpen` on click, with `e.preventDefault()`/`stopPropagation()` not needed since it's no longer nested in the `Link`.
- When `statusMenuOpen` is true, render a dropdown menu (`.library-status-menu`) listing all `LibraryStatus` values except the current one, each as a `.library-status-menu-item` button.
- Clicking a menu item calls a new `handleStatusChange(newStatus)`:
  - Sets `busy` (reuses existing flag), `PATCH`es `/api/library/${entry.id}` with `{ status: newStatus }`.
  - On success, calls `onUpdated({ ...entry, status: newStatus })` and closes the menu.
  - On failure, just closes the menu and clears `busy` (no error toast — consistent with how `handleIncrement`/`handleRemove` already silently no-op on failure in this codebase).
- Clicking outside the open menu, or pressing Escape, closes it — implemented with a simple document-level click listener while `statusMenuOpen` is true (mirroring how `AddToLibraryButton` already does this on the series detail page; verify and reuse its exact pattern, do not reinvent).

### 2. Content-type filter — second row of tabs

**State addition to `LibraryBoard.tsx`:**
- `contentTypeTab: "ALL" | ContentType`, alongside the existing `tab` (status) state.
- A second `.explore-tabs` row rendered below the existing status tabs, built from `CONTENT_TYPE_LABELS` (`@/types/common`) plus a leading `"All"` option — same tab markup/CSS as the status row, so no new CSS classes are needed for the tabs themselves (a wrapper class `.library-content-tabs` may be added purely for spacing between the two rows, following the `.explore-toolbar .explore-tabs` override precedent already in `globals.css`).
- `visible` filter logic becomes: entry passes if `(tab === "ALL" || entry.status === tab)` AND `(contentTypeTab === "ALL" || entry.series.contentType === contentTypeTab)`.
- Empty state message stays generic ("No series in this status yet.") — good enough for combined filters, not a blocking concern for this round.

### 3. CSS additions

Append to `src/app/globals.css`:
- `.library-status-badge` — badge-as-button affordance (cursor, hover state), layered on top of existing `.badge`/`LIBRARY_STATUS_BADGE_CLASS` color classes.
- `.library-status-menu`, `.library-status-menu-item`, `.library-status-menu-item:hover` — modeled directly on the existing `.detail-add-menu`/`.detail-add-menu-item` pattern (lines ~1810-1839), not reusing those classes directly since they're scoped to the series detail page's `AddToLibraryButton`.
- `.library-content-tabs` — spacing wrapper for the second tab row, modeled on `.explore-toolbar .explore-tabs`.

## Error Handling

- Status-change PATCH failures: menu closes, `busy` clears, no visible error — same silent-fail convention as the existing progress/remove actions in this component.
- Click-outside/Escape dismissal prevents the menu from getting stuck open if a request is slow or fails.

## Testing / Verification

No automated test framework in this repo (per `CLAUDE.md`). Verification is `npm run type-check` + `npm run lint` + manual browser check (or curl/code-tracing fallback if the browser extension is unavailable, as in the prior sub-project):
- Click a card's status badge — menu opens listing the other 4 statuses.
- Pick a new status — card's badge updates, card moves in/out of the active status tab's filtered view if applicable, no page reload.
- Click outside an open menu — it closes without changing status.
- Use the new content-type tab row — list filters correctly, combines with the status tab (e.g. "Watching" + "Anime" shows only entries matching both).
- Reload the page — both filters reset to "All" (no persistence required, matches current status-tab behavior which also doesn't persist).
