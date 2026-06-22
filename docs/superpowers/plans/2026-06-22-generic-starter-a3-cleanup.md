# Generic SaaS Starter — A3: Cleanup Sweep Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Delete every old domain-specific file (TV/anime/manga "Free Serie Tracker" pages, components, API routes, lib clients, types, tests) left on disk after Plan A1 (schema/backend) and Plan A2 (pages/components) replaced them with the generic Item/UserItem model, and fix the handful of remaining stale links so the whole project builds clean.

**Architecture:** No new architecture — this is subtractive. Plan A1 already deleted the `Series`/`LibraryItem`/`UserNote`/`SearchKeyword`/`EpisodeLanguage` Prisma models; every file in this plan is dead code that still references those deleted models (confirmed via `grep -rl "prisma\.\(series\|libraryItem\|userNote\|searchKeyword\|episodeLanguage\)" src` against the current repo state) or is a component/lib/type that only those dead routes/pages import. Tasks are grouped so each one leaves the project in a state that still type-checks for everything *not yet deleted in a later task* — but because so much of this is interdependent (e.g. `/explore` imports `SeriesCard` imports `types/common.ts`'s `ContentType`), full project-wide `npm run type-check`/`npm run lint` cleanliness is only reached after the final task. Each task instead verifies via targeted greps that it introduced no *new* dangling imports, and the final task runs the full project-wide check.

**Tech Stack:** Next.js 16 App Router, TypeScript, Prisma 7, vitest (already configured — confirmed via `package.json`'s `"test": "vitest"` and `vitest.config.ts`, despite `CLAUDE.md` historically claiming "no test runner configured"; that doc claim is stale and out of scope for this plan, tracked separately under Sub-project B).

## Global Constraints

- This is purely deletion + small link fixes. Do not refactor, rename, or "improve" anything that survives this plan — if a file isn't on the deletion/edit list below, leave it untouched.
- Every `git rm` must be reviewed against the grep evidence in this plan before running — if a task's verification step finds an importer this plan didn't account for, STOP and report back rather than deleting anyway.
- Never delete Prisma migration files (`prisma/migrations/**`) — migration history is append-only, even for migrations tied to now-deleted models. Not in scope for this plan regardless.
- `src/types/common.ts` is NOT fully deleted — it's edited to remove only the old-domain-specific exports (`ContentType`, `ContentStatus`, `LibraryStatus`, `CONTENT_TYPE_LABELS`, `LIBRARY_STATUS_LABELS`, `CONTENT_TYPE_BADGE_CLASS`, `LIBRARY_STATUS_BADGE_CLASS`) while keeping the generic ones (`ApiResponse`, `PaginationMeta`, `PaginatedResponse`, `PaginationParams`) — `src/lib/utils/api-response.ts` (used by every route, old and new) imports `ApiResponse` from this file and must keep working throughout.
- CSS cleanup (orphaned `library-*`/`series-*`/`explore-*`/`calendar-*` classes in `src/app/globals.css`) is explicitly OUT OF SCOPE for this plan — `docs/superpowers/plans/2026-06-21-generic-starter-a2-pages.md`'s convention of reusing existing CSS classes as-is continues here; removing unused CSS rules is cosmetic, not blocking, and risks no functional regression either way. Do not touch `globals.css`.
- Verification convention (matches A1/A2): `npx tsc --noEmit` / `npm run type-check` for type-checking — a pre-existing Turbopack/Unicode-path environment issue (this project's OneDrive path contains "Masaüstü") blocks `npm run build` in this environment; that's expected, not a regression to chase.
- After every `git rm`, stage with the exact paths removed — do not use `git add -A`.

---

### Task 1: Delete old TV/anime metadata API clients + their tests

**Files:**
- Delete: `src/lib/api/tmdb.ts`
- Delete: `src/lib/api/tmdb-mock.ts`
- Delete: `src/lib/api/anilist.ts`
- Delete: `src/lib/api/mangadex.ts`
- Delete: `src/lib/api/jikan.ts`
- Delete: `tests/unit/api/tmdb.test.ts`
- Delete: `tests/unit/api/anilist.test.ts`
- Delete: `tests/unit/api/mangadex.test.ts`
- Delete: `tests/unit/api/jikan.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks (first task in this plan).
- Produces: nothing later tasks depend on — but Task 2's deleted routes (`/api/search`, `/api/search/suggest`, `/api/trending`, `/api/series/[id]`) are the only consumers of these clients, so this task and Task 2 must both land before `npm run type-check` is clean; doing them in either order is fine since both are pure deletions of files that only reference each other and other to-be-deleted files.

These 5 files are the TMDB/AniList/MangaDex/Jikan API clients built for the old "Free Serie Tracker" product. They are not used by any Plan A1/A2 generic route — confirmed via:
```bash
grep -rl '@/lib/api/tmdb"' src --include="*.ts" --include="*.tsx"
grep -rl '@/lib/api/anilist"' src --include="*.ts" --include="*.tsx"
grep -rl '@/lib/api/mangadex"' src --include="*.ts" --include="*.tsx"
grep -rl '@/lib/api/jikan"' src --include="*.ts" --include="*.tsx"
```
Every result is itself either one of these 5 files (internal cross-import, e.g. `tmdb.ts` imports from `tmdb-mock.ts`) or one of the old routes/pages deleted in Task 2/Task 4 below. `jikan.ts` already has zero importers anywhere in `src` (it was wired as a "backup" client but never actually called from a route).

- [ ] **Step 1: Confirm no surviving file imports these clients**

```bash
grep -rl '@/lib/api/tmdb"\|@/lib/api/tmdb-mock"\|@/lib/api/anilist"\|@/lib/api/mangadex"\|@/lib/api/jikan"' src --include="*.ts" --include="*.tsx" | grep -v -E "src/lib/api/(tmdb|tmdb-mock|anilist|mangadex|jikan)\.ts$|src/app/api/(search|trending|series)/|src/app/(explore|series)/|src/lib/db/series-cache\.ts"
```

Expected: empty output. If anything prints, STOP — a file outside the known deletion set (Tasks 1, 2, 4, 5) depends on one of these clients; report back before proceeding.

- [ ] **Step 2: Delete the client files and their tests**

```bash
git rm src/lib/api/tmdb.ts src/lib/api/tmdb-mock.ts src/lib/api/anilist.ts src/lib/api/mangadex.ts src/lib/api/jikan.ts
git rm tests/unit/api/tmdb.test.ts tests/unit/api/anilist.test.ts tests/unit/api/mangadex.test.ts tests/unit/api/jikan.test.ts
```

- [ ] **Step 3: Commit**

```bash
git commit -m "chore: delete old TV/anime/manga API clients and their tests"
```

Note: `npx tsc --noEmit` will still show errors after this commit (the old routes/pages that imported these clients, deleted in later tasks, are still on disk) — that's expected, not a regression. Don't chase it here.

---

### Task 2: Delete old search/trending/series-detail API routes

**Files:**
- Delete: `src/app/api/search/route.ts`
- Delete: `src/app/api/search/suggest/route.ts`
- Delete: `src/app/api/trending/route.ts`
- Delete: `src/app/api/series/[id]/route.ts`
- Delete: `src/app/api/series/[id]/rating/route.ts`

**Interfaces:**
- Consumes: nothing from Task 1 directly (these routes import the Task 1 clients, but Task 1 already removed those — this task removes the now-broken importers).
- Produces: nothing later tasks depend on.

These are the old multi-source search, trending, and series-detail-with-rating routes — replaced by `/api/items`, `/api/items/suggest`, `/api/items/trending`, `/api/items/[id]`, `/api/items/[id]/rating` in Plan A1. Confirmed only the old `/explore` and `/series/[id]` pages (deleted in Task 4) call these routes client-side, plus `src/lib/db/series-cache.ts` (deleted in Task 5) is used by `series/[id]/route.ts`.

- [ ] **Step 1: Confirm no surviving file references these route paths**

```bash
grep -rln '"/api/search"\|"/api/search/suggest"\|"/api/trending"\|/api/series/' src --include="*.ts" --include="*.tsx" | grep -v -E "src/app/api/(search|trending|series)/|src/app/(explore|series)/"
```

Expected: empty output. If anything prints, STOP and report back.

- [ ] **Step 2: Delete the route files (and their now-empty parent directories)**

```bash
git rm src/app/api/search/route.ts src/app/api/search/suggest/route.ts
git rm src/app/api/trending/route.ts
git rm src/app/api/series/\[id\]/route.ts src/app/api/series/\[id\]/rating/route.ts
```

- [ ] **Step 3: Commit**

```bash
git commit -m "chore: delete old search/trending/series-detail API routes"
```

---

### Task 3: Delete old library/notes/search-keywords API routes

**Files:**
- Delete: `src/app/api/library/route.ts`
- Delete: `src/app/api/library/[id]/route.ts`
- Delete: `src/app/api/library/[id]/progress/route.ts`
- Delete: `src/app/api/notes/[seriesId]/route.ts`
- Delete: `src/app/api/search-keywords/route.ts`
- Delete: `src/app/api/search-keywords/[id]/route.ts`
- Delete: `src/lib/validations/library.ts`
- Delete: `src/lib/validations/notes.ts`
- Delete: `src/lib/validations/search-keywords.ts`

**Interfaces:**
- Consumes: nothing from Tasks 1-2.
- Produces: nothing later tasks depend on.

These are the old library-CRUD, personal-notes, and Google-search-redirect-keyword routes — `/api/user-items` and `/api/user-items/[id]` (Plan A1) replace the library routes; the notes/search-keywords features (`UserNote`/`SearchKeyword` models, from the separate "private-notes-redirect" sub-project) have no generic-model equivalent and are dropped entirely, not replaced — confirmed those Prisma models no longer exist in `prisma/schema.prisma` (`grep -n "^model " prisma/schema.prisma` lists only `User`, `Account`, `Session`, `VerificationToken`, `Item`, `UserItem`, `Rating`, `Notification`).

- [ ] **Step 1: Confirm no surviving file references these route paths or validation modules**

```bash
grep -rln '"/api/library\|/api/notes/\|/api/search-keywords' src --include="*.ts" --include="*.tsx" | grep -v -E "src/app/api/(library|notes|search-keywords)/|src/app/(library|series|settings)/"
grep -rl '@/lib/validations/library"\|@/lib/validations/notes"\|@/lib/validations/search-keywords"' src --include="*.ts" --include="*.tsx" | grep -v -E "src/app/api/(library|notes|search-keywords)/"
```

Expected: empty output for both. If anything prints, STOP and report back.

- [ ] **Step 2: Delete the route and validation files**

```bash
git rm src/app/api/library/route.ts src/app/api/library/\[id\]/route.ts src/app/api/library/\[id\]/progress/route.ts
git rm src/app/api/notes/\[seriesId\]/route.ts
git rm src/app/api/search-keywords/route.ts src/app/api/search-keywords/\[id\]/route.ts
git rm src/lib/validations/library.ts src/lib/validations/notes.ts src/lib/validations/search-keywords.ts
```

- [ ] **Step 3: Commit**

```bash
git commit -m "chore: delete old library/notes/search-keywords API routes and validations"
```

---

### Task 4: Delete old pages (`/explore`, `/library`, `/series/[id]`, `/calendar`, `/settings`)

**Files:**
- Delete: `src/app/explore/page.tsx`
- Delete: `src/app/library/page.tsx`
- Delete: `src/app/series/[id]/page.tsx`
- Delete: `src/app/calendar/page.tsx`
- Delete: `src/app/settings/page.tsx`

**Interfaces:**
- Consumes: nothing from Tasks 1-3 directly — these pages import the old components deleted in Task 6, but order doesn't matter since both this task and Task 6 are pure deletions of mutually-referencing dead files.
- Produces: nothing later tasks depend on. Task 7 (link fixes) depends on these routes being gone conceptually, but doesn't need this task's commit to land first.

`/browse`, `/my-items`, `/items/[id]` (Plan A2) replace `/explore`, `/library`, `/series/[id]`. `/calendar` (next-air-date scheduling) and `/settings` (search-keyword/redirect management) have no generic-model replacement and are dropped entirely — calendar/language-tracking and the private-notes-redirect feature are both out of scope for the generic template (no per-item air-date or platform-language data exists on the generic `Item` model, and personal notes/redirects were a one-off feature tied to the deleted `UserNote`/`SearchKeyword` models).

- [ ] **Step 1: Confirm these pages aren't linked from any surviving page**

```bash
grep -rln 'href="/explore"\|href="/library"\|href="/series/\|href="/calendar"\|href="/settings"' src/app src/components | grep -v -E "src/app/(explore|library|series|calendar|settings)/"
```

This is expected to print `src/components/Footer.tsx` and `src/app/not-found.tsx` — both are fixed in Task 7, not this task. Confirm no *other* file appears. If one does, STOP and report back.

- [ ] **Step 2: Delete the page files (and their now-empty parent directories)**

```bash
git rm src/app/explore/page.tsx
git rm src/app/library/page.tsx
git rm src/app/series/\[id\]/page.tsx
git rm src/app/calendar/page.tsx
git rm src/app/settings/page.tsx
```

- [ ] **Step 3: Commit**

```bash
git commit -m "chore: delete old explore/library/series/calendar/settings pages"
```

---

### Task 5: Delete old domain-specific lib files + their tests

**Files:**
- Delete: `src/lib/db/series-cache.ts`
- Delete: `src/lib/calendar.ts`
- Delete: `src/lib/language-tracking.ts`
- Delete: `src/lib/redirect-url.ts`
- Delete: `tests/unit/lib/redirect-url.test.ts`

**Interfaces:**
- Consumes: nothing from Tasks 1-4.
- Produces: nothing later tasks depend on.

`series-cache.ts` (`getOrCreateSeriesFromCompoundId()`) backed the old TMDB/AniList "compound ID" series lookup, used only by the old library/series-detail/rating routes (all deleted in Tasks 2-3). `calendar.ts` (`getUpcomingReleases()`, `dayKeyOf()`) backed the deleted `/calendar` page and `AiringTodaySection` (deleted in Task 6) — Plan A2's Task 11 home-page rewrite already dropped the `AiringTodaySection` import from `src/app/page.tsx`, confirmed via `grep -n "AiringTodaySection" src/app/page.tsx` returning nothing. `language-tracking.ts` (`checkLanguageAvailability()`) backed the Cloudflare Cron `scheduled()` handler for the old MangaDex-only English/Turkish chapter tracking feature — already confirmed zero importers anywhere in `src` or `custom-worker.ts` (the cron wiring itself is addressed in Task 6's `custom-worker.ts` edit). `redirect-url.ts` (`buildRedirectUrl()`) backed `RedirectButton` (deleted in Task 6), part of the dropped private-notes-redirect feature.

- [ ] **Step 1: Confirm no surviving file imports these lib modules**

```bash
grep -rl '@/lib/db/series-cache"\|@/lib/calendar"\|@/lib/language-tracking"\|@/lib/redirect-url"' src --include="*.ts" --include="*.tsx"
grep -n "language-tracking" custom-worker.ts
```

Expected: empty output for the first grep (everything that imported these was already deleted in Tasks 2-4, or is deleted alongside this task in Task 6). The `custom-worker.ts` grep is expected to print one match (the dynamic `import("./src/lib/language-tracking")` call and its surrounding `scheduled()` handler) — this is fixed in this task's Step 2, not a surprise to escalate on.

- [ ] **Step 2: Delete the lib files, their test, and the cron wiring that calls `language-tracking.ts`**

```bash
git rm src/lib/db/series-cache.ts src/lib/calendar.ts src/lib/language-tracking.ts src/lib/redirect-url.ts
git rm tests/unit/lib/redirect-url.test.ts
```

Then edit `custom-worker.ts` to remove the `scheduled()` export entirely (it exists solely to invoke `checkLanguageAvailability()` on a Cloudflare Cron Trigger, per `CLAUDE.md`'s now-historical Language/Translation Tracking notes — there is no generic-model equivalent feature). Read the file first to see its exact current shape, then remove the `scheduled` handler and the dynamic `language-tracking` import, leaving the rest of the OpenNext worker wrapper (the `fetch` re-export) untouched. After editing, confirm no reference to `language-tracking` remains:

```bash
grep -n "language-tracking\|scheduled" custom-worker.ts
```

Expected: empty output.

Also remove the now-orphaned `[triggers] crons = [...]` block from `wrangler.toml` (added solely for this feature, per `CLAUDE.md`'s historical notes) — read the file first, remove only that block, leave everything else untouched.

```bash
grep -n "triggers\|crons" wrangler.toml
```

Expected: empty output after the edit.

- [ ] **Step 3: Commit**

```bash
git add custom-worker.ts wrangler.toml
git commit -m "chore: delete old calendar/language-tracking/redirect-url lib modules and cron wiring"
```

---

### Task 6: Delete old components

**Files:**
- Delete: `src/components/SeriesCard.tsx`
- Delete: `src/components/SeriesListRow.tsx`
- Delete: `src/components/AddToLibraryButton.tsx`
- Delete: `src/components/LibraryBoard.tsx`
- Delete: `src/components/LibraryItemCard.tsx`
- Delete: `src/components/LibraryItemRow.tsx`
- Delete: `src/components/SearchSuggestions.tsx`
- Delete: `src/components/ExploreFilters.tsx`
- Delete: `src/components/AiringTodaySection.tsx`
- Delete: `src/components/CalendarBoard.tsx`
- Delete: `src/components/LanguageWaitWidget.tsx`
- Delete: `src/components/RedirectButton.tsx`
- Delete: `src/components/SearchKeywordManager.tsx`
- Delete: `src/components/SeriesNoteWidget.tsx`

**Interfaces:**
- Consumes: nothing from Tasks 1-5.
- Produces: nothing later tasks depend on.

Every one of these 14 components is replaced by its Plan A2 generic equivalent (`SeriesCard`→`ItemCard`, `SeriesListRow`→`ItemListRow`, `AddToLibraryButton`→`AddToTrackingButton`, `LibraryBoard`/`LibraryItemCard`/`LibraryItemRow`→`TrackingBoard`/`UserItemCard`/`UserItemRow`, `SearchSuggestions`→`BrowseSuggestions`, `ExploreFilters`→`BrowseFilters`) or dropped entirely with no replacement (`AiringTodaySection`/`CalendarBoard` — calendar feature out of scope; `LanguageWaitWidget` — language-tracking out of scope; `RedirectButton`/`SearchKeywordManager`/`SeriesNoteWidget` — private-notes-redirect feature out of scope). Confirmed each is only imported by an already-deleted (Tasks 2-4) page, with one exception: `AiringTodaySection` already has zero importers anywhere (orphaned since Plan A2's Task 11 home-page rewrite).

- [ ] **Step 1: Confirm no surviving file imports these components**

```bash
for c in SeriesCard SeriesListRow AddToLibraryButton LibraryBoard LibraryItemCard LibraryItemRow SearchSuggestions ExploreFilters AiringTodaySection CalendarBoard LanguageWaitWidget RedirectButton SearchKeywordManager SeriesNoteWidget; do
  grep -rl "@/components/$c\"" src --include="*.ts" --include="*.tsx" | grep -v "^src/components/$c.tsx$"
done
```

Expected: empty output (no lines printed across all 14 checks). If anything prints, STOP and report back — it means a surviving file depends on one of these components.

- [ ] **Step 2: Delete the component files**

```bash
git rm src/components/SeriesCard.tsx src/components/SeriesListRow.tsx src/components/AddToLibraryButton.tsx
git rm src/components/LibraryBoard.tsx src/components/LibraryItemCard.tsx src/components/LibraryItemRow.tsx
git rm src/components/SearchSuggestions.tsx src/components/ExploreFilters.tsx
git rm src/components/AiringTodaySection.tsx src/components/CalendarBoard.tsx
git rm src/components/LanguageWaitWidget.tsx
git rm src/components/RedirectButton.tsx src/components/SearchKeywordManager.tsx src/components/SeriesNoteWidget.tsx
```

- [ ] **Step 3: Commit**

```bash
git commit -m "chore: delete old domain-specific components"
```

---

### Task 7: Delete old types, prune `types/common.ts`, fix stale links, update middleware

**Files:**
- Delete: `src/types/series.ts`
- Delete: `src/types/library.ts`
- Delete: `src/types/search-keyword.ts`
- Modify: `src/types/common.ts`
- Modify: `src/components/Footer.tsx`
- Modify: `src/app/not-found.tsx`
- Modify: `src/middleware.ts`

**Interfaces:**
- Consumes: Tasks 1-6 must all be committed first — this task's verification step (a full project-wide type-check) only makes sense once every old route/page/component/lib file is gone.
- Produces: nothing later — this is the last task in the plan.

This task does four things: (1) deletes the three remaining old-domain type files, (2) strips old-domain-specific exports out of the otherwise-generic `src/types/common.ts`, (3) fixes two stale links to deleted routes, (4) updates auth middleware to protect `/my-items` instead of the now-deleted `/library`.

**Why `types/common.ts` is edited, not deleted:** it mixes generic types still used by every API route (`ApiResponse`, `PaginationMeta`, `PaginatedResponse`, `PaginationParams` — `src/lib/utils/api-response.ts` imports `ApiResponse` from here and is used by every route handler, old and new alike) with old-domain-specific ones (`ContentType`, `ContentStatus`, `LibraryStatus` and their `_LABELS`/`_BADGE_CLASS` const maps) that, after Tasks 1-6, have zero remaining importers.

- [ ] **Step 1: Confirm `types/series.ts`, `types/library.ts`, `types/search-keyword.ts` have no surviving importers**

```bash
grep -rl '@/types/series"\|@/types/library"\|@/types/search-keyword"' src --include="*.ts" --include="*.tsx"
```

Expected: empty output (everything that imported these was deleted in Tasks 1-6). If anything prints, STOP and report back.

- [ ] **Step 2: Delete the three old type files**

```bash
git rm src/types/series.ts src/types/library.ts src/types/search-keyword.ts
```

- [ ] **Step 3: Confirm the old-domain exports of `types/common.ts` have no surviving importers**

```bash
grep -rln 'ContentType\|ContentStatus\|LibraryStatus\|CONTENT_TYPE_LABELS\|LIBRARY_STATUS_LABELS\|CONTENT_TYPE_BADGE_CLASS\|LIBRARY_STATUS_BADGE_CLASS' src --include="*.ts" --include="*.tsx" | grep -v "src/types/common.ts"
```

Expected: empty output. If anything prints, STOP and report back.

- [ ] **Step 4: Edit `src/types/common.ts` to remove the old-domain-specific exports**

Read the current file first. It must end up containing only:

```ts
/**
 * Common shared types used across the application.
 */

/** Generic API response wrapper */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/** Pagination metadata */
export interface PaginationMeta {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/** Paginated response */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: PaginationMeta;
}

export interface PaginationParams {
  page?: number;
  perPage?: number;
}
```

(i.e. delete the `ContentType`, `ContentStatus`, `LibraryStatus` type exports and the `CONTENT_TYPE_LABELS`, `LIBRARY_STATUS_LABELS`, `CONTENT_TYPE_BADGE_CLASS`, `LIBRARY_STATUS_BADGE_CLASS` const exports — keep everything else exactly as-is, same order.)

- [ ] **Step 5: Fix `Footer.tsx`'s stale links**

Read `src/components/Footer.tsx` first to find the exact current lines (around line 24-25 per the pre-edit survey). Change:

```tsx
<Link href="/explore" className="footer-link">Browse</Link>
<Link href="/library" className="footer-link">My List</Link>
```

to:

```tsx
<Link href="/browse" className="footer-link">Browse</Link>
<Link href="/my-items" className="footer-link">My Items</Link>
```

- [ ] **Step 6: Fix `not-found.tsx`'s stale link**

Read `src/app/not-found.tsx` first. Change:

```tsx
<Link href="/explore" className="btn btn-secondary">Browse Series</Link>
```

to:

```tsx
<Link href="/browse" className="btn btn-secondary">Browse</Link>
```

- [ ] **Step 7: Update `src/middleware.ts` to protect `/my-items` instead of `/library`**

Read `src/middleware.ts` first (current matcher logic protects `/library` for unauthenticated users — `/my-items` is currently only protected at the page level via `requireAuth()` inside `src/app/my-items/page.tsx`, which still works, but the middleware's own route-protection list is now stale and should match the real protected route). Change:

```ts
  if (!isLoggedIn) {
    if (pathname.startsWith("/library")) {
```

to:

```ts
  if (!isLoggedIn) {
    if (pathname.startsWith("/my-items")) {
```

Leave everything else in the file (the username-setup redirect logic, the matcher config) untouched.

- [ ] **Step 8: Run the full project type-check**

```bash
npm run type-check
```

Expected: zero errors. This is the first point in the whole A1→A2→A3 sequence where the full project is expected to type-check clean — if any error remains, it means a file or reference this plan's survey missed. STOP and report back with the exact error rather than guessing a fix; do not delete or edit anything not already listed in this plan without confirming first.

- [ ] **Step 9: Run the full project lint**

```bash
npm run lint
```

Expected: zero errors (warnings, if any, should be reviewed but are not necessarily blocking — use judgment, but report any you see).

- [ ] **Step 10: Run the test suite**

```bash
npm run test:run
```

Expected: all passing, pristine output — no tests reference the deleted files at this point (Task 1 and Task 5 already removed the test files that did).

- [ ] **Step 11: Commit**

```bash
git add src/types/common.ts src/components/Footer.tsx src/app/not-found.tsx src/middleware.ts
git commit -m "chore: delete old types, prune types/common.ts, fix stale links, protect /my-items in middleware"
```

---

## Self-Review Notes

**Spec coverage:** every old domain-specific file category named in `CLAUDE.md`'s pivot notice and `docs/phases.md`'s "Pivot" section is covered: old pages (`/explore`, `/library`, `/series/[id]`, `/calendar`, `/settings` — Task 4), old components (`SeriesCard`, `LibraryBoard`, `RedirectButton`, `LanguageWaitWidget`, etc. — Task 6), old API routes (Tasks 2-3), old `lib/api/{tmdb,anilist,mangadex,jikan}.ts` clients (Task 1), old `lib/calendar.ts`/`language-tracking.ts` (Task 5, plus the `custom-worker.ts`/`wrangler.toml` cron wiring those required). Also covered, not explicitly named in the prior pivot notes but discovered during this plan's survey: `lib/db/series-cache.ts`, `lib/redirect-url.ts`, three old type files, the old-domain half of `types/common.ts`, and stale links in `Footer.tsx`/`not-found.tsx`/`middleware.ts`.

**Out of scope, confirmed deliberately:** CSS cleanup in `globals.css` (cosmetic, no functional risk either way); `CLAUDE.md`'s Project Overview/Tech Stack/Content Types narrative sections and `docs/*.md`'s old-domain content (Sub-project B's job, not A3's); Cloudflare deploy verification of the post-cleanup build (Sub-project C's job).

**Placeholder scan:** clean — every step has the exact grep commands, exact file lists, and exact code to write; no "similar to Task N", no TODOs.

**Type consistency:** N/A for this plan — no new functions/types are introduced; every task is deletion or trivial link/string edits, verified via grep against the actual current repo state (not assumed from memory) before being written into this plan.

**Order dependency:** Tasks 1-6 are mutually order-independent (each deletes a cluster of files that only reference each other or other to-be-deleted files) and could in principle run in parallel — but Task 7's Step 8 full-project type-check is only meaningful once all of Tasks 1-6 have landed, so Task 7 must run last. If executed via subagent-driven-development, Tasks 1-6 could be dispatched as a parallel batch (per `superpowers:dispatching-parallel-agents`) before Task 7 — note this as an option when choosing an execution approach, not a requirement.
