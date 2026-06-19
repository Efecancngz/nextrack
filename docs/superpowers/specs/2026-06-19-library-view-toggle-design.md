# Library Page View Toggle — Design Spec

**Status:** Approved
**Scope:** Phase 1 close-out gap-fill — closes the last unbuilt Phase 1 MVP item (`docs/phases.md` § 1.5, Library Page: "Card/list view toggle"), discovered while auditing Phase 1 completeness before starting Phase 2.

## Goal

Add a grid/list view toggle to `/library`, matching the pattern already shipped on `/explore` (`feat/explore-page-polish`, merged). No backend changes — this is a pure client-side render-mode swap over data that's already loaded.

## Out of Scope

- Any change to `LibraryItemCard`'s grid layout, the status-dropdown logic, or the content-type/status filter tabs — all already shipped in `feat/library-page-polish` and untouched here.
- Sharing view-mode state between `/explore` and `/library` — they get independent `localStorage` keys (see Design).
- Any API/data changes — `entries` is already fully loaded client-side by `LibraryBoard`; toggling view mode never triggers a fetch.

## Current State

This branch (`feat/library-view-toggle`) is based on `feat/library-page-polish` (not yet merged to `main`), since it builds directly on that branch's `LibraryBoard.tsx`/`LibraryItemCard.tsx`. As of that branch:

- `src/components/LibraryBoard.tsx` renders two stacked tab rows (status via `.explore-tabs`, content-type via `.explore-tabs library-content-tabs`) and a `.series-grid` of `LibraryItemCard` for the filtered `visible` array. No view-mode concept exists yet.
- `src/components/LibraryItemCard.tsx` is a poster-style card: status badge (click-to-open dropdown, absolutely positioned over the poster via `.library-status-wrapper`), `+1 episode/chapter` button, remove-with-confirm control.
- `src/app/explore/page.tsx` already has the reference pattern to mirror: `viewMode` state via lazy `useState` initializer reading `localStorage.getItem("explore-view-mode")` (SSR-safe `typeof window === "undefined"` guard, wrapped in try/catch), `handleViewModeChange` writing back to `localStorage`, an `.explore-toolbar` wrapper holding both the tabs and the toggle buttons, and `.explore-view-toggle`/`.explore-view-toggle-btn`/`.explore-view-toggle-btn-active` CSS (all already exist in `globals.css`, fully reusable as-is — no new toggle-button styles needed).
- `src/components/SeriesListRow.tsx` is the Explore page's existing list-row component, but it's read-only (no status dropdown, no progress/remove actions) and takes a `SearchResult` prop, not a `LibraryEntry` — it cannot be reused directly for the Library page, which needs all of `LibraryItemCard`'s interactive controls in a horizontal layout.

## Design

### 1. New component: `LibraryItemRow`

`src/components/LibraryItemRow.tsx` — horizontal row variant of `LibraryItemCard`, same props shape (`{ entry: LibraryEntry; onRemoved: (id: string) => void; onUpdated: (entry: LibraryEntry) => void }`) so it's a drop-in swap, exactly like `SeriesCard`/`SeriesListRow` are interchangeable on the Explore page.

- **Left side:** a small thumbnail (same sizing/styling as `SeriesListRow`'s `.series-list-thumb`, 48×72), then an info column with the series title on its own line and the status badge directly below it (same vertical position `SeriesListRow` uses for its content-type badge/year/genre meta row — the status badge replaces that row's role here, since content type isn't relevant on the Library page where every entry already belongs to the user's list). The status badge keeps the exact same click-to-open dropdown behavior and PATCH call as `LibraryItemCard` (`handleStatusChange`), but is **not** absolutely positioned over the thumbnail this time — it sits in normal inline flow, wrapped in a new `.library-row-status-wrapper` (`position: relative`, `display: inline-block`) so the existing `.library-status-menu` (which is `position: absolute; top: calc(100% + ...)`) still anchors correctly relative to its own trigger instead of the row.
- **Right side:** the same `+1 {label} ({value})` progress button and remove-with-confirm control as `LibraryItemCard`, in a `.library-row-actions` flex cluster pushed to the row's right edge (`margin-left: auto`).
- **Logic:** `handleIncrement`, `handleRemove`, `handleStatusChange`, and the `getProgressField` helper are duplicated from `LibraryItemCard.tsx` rather than extracted into a shared hook — two call sites, ~15 lines each, consistent with this codebase's existing precedent (e.g. `icon.tsx`/`apple-icon.tsx` duplicate their mark JSX rather than sharing a helper) of preferring duplication over premature abstraction at this scale.

### 2. `LibraryBoard` changes

- Add `viewMode` state: `useState<"grid" | "list">` with a lazy initializer reading `localStorage.getItem("library-view-mode")` — **a separate key from Explore's `"explore-view-mode"`**, so the two pages' preferences are independent, wrapped in the same try/catch + SSR guard pattern as the Explore page reference implementation.
- Add `handleViewModeChange(mode)` writing back to `localStorage["library-view-mode"]`, same try/catch pattern.
- Wrap the existing status-tabs `<div className="explore-tabs" role="tablist">` in an `.explore-toolbar` flex container (already styled in `globals.css`, used as-is) alongside the two view-toggle buttons (`.explore-view-toggle`/`.explore-view-toggle-btn`/`.explore-view-toggle-btn-active`, also already styled — same grid/list SVG icons as the Explore page toggle). The content-type tabs row stays a separate full-width row below, untouched.
- Replace the unconditional `.series-grid` of `LibraryItemCard` with a conditional: `.series-grid` of `LibraryItemCard` when `viewMode === "grid"`, or a new `.library-list` of `LibraryItemRow` when `"list"`. Both branches map over the same `visible` filtered array — switching modes is a pure render swap, never a re-fetch (`entries` state is untouched).

### 3. CSS additions

Append to `src/app/globals.css`, following the existing `.library-*`/`.series-list-*` naming conventions:
- `.library-list` — flex column container for the row list (can likely just alias `.series-list`'s existing rules — `display: flex; flex-direction: column; gap: var(--space-2);` — but defined under its own class name in case Library-specific row sizing needs to diverge later).
- `.library-list-row` — the row layout: flex, `align-items: center`, thumbnail + info column + action cluster, modeled on `.series-list-row` but with the extra right-side action space `.series-list-row` doesn't need.
- `.library-row-status-wrapper` — `position: relative; display: inline-block;` (the inline-flow counterpart to `.library-status-wrapper`'s absolute positioning).
- `.library-row-actions` — `display: flex; align-items: center; gap: var(--space-2); margin-left: auto;`.

No changes to `.explore-view-toggle*`, `.library-status-badge`, `.library-status-menu`, or `.library-status-menu-item` — all reused exactly as they already exist.

## Error Handling

No new error paths — `handleIncrement`/`handleRemove`/`handleStatusChange` in `LibraryItemRow` use the exact same silent-fail convention already established in `LibraryItemCard` (clear `busy`/close menu in `finally`, no toast on failure). `localStorage` access wrapped in try/catch exactly as the Explore page already does, falling back to `"grid"` for that session if unavailable.

## Testing / Verification

No automated test framework in this repo (per `CLAUDE.md`). Verification is `npm run type-check` + `npm run lint` + manual browser check:
- Toggle to list view on `/library` — rows render with thumbnail, title, status badge, progress button, and remove button all functional (click status badge → dropdown opens and PATCHes; click +1 → increments; click remove → confirm flow works) — same behaviors as the grid card, just laid out horizontally.
- Toggle back to grid — original `LibraryItemCard` grid renders unchanged.
- Reload the page after selecting list view — list view persists via `localStorage["library-view-mode"]`.
- Toggle view mode on `/explore` and `/library` independently — confirm each page remembers its own preference (different `localStorage` keys).
- Confirm no network request fires on a pure view-mode toggle (same `entries` array, no re-fetch).
- `docs/phases.md`'s "Card/list view toggle" item under Library Page gets checked off as part of this work.
