# Library CRUD — Design

## Context

This is sub-project 2 of 2 (Auth, then Library CRUD). Auth.js wiring is done
and merged to `main`: `getCurrentUser()`/`requireAuth()` exist in
`src/lib/auth/helpers.ts`, `/library` is already protected by `src/proxy.ts`.

`prisma/schema.prisma` has `Series` (a cache of external API data),
`LibraryItem` (per-user status + progress, unique on `[userId, seriesId]`),
and `UserRating` (per-user 1-10 score + optional review, unique on
`[userId, seriesId]`) — none of these have ever been read or written by any
route. `src/app/api/series/[id]/route.ts` returns a `SeriesDetail` built live
from TMDB/AniList/MangaDex, keyed by a compound id `"{source}-{externalId}"`
— this is **not** a `Series.id`, so the first time a user adds something to
their library, a `Series` row has to be created from that external data.
`src/app/library/page.tsx` and the "Add to Library" button on
`src/app/series/[id]/page.tsx` are both placeholder/disabled UI.

This app is JustWatch-style: it points users to where to legally watch/read,
and tracks "what episode/chapter am I on" for notification purposes. It does
not host or stream content, and there is no per-episode rating — only one
overall 1-10 rating (+ optional review) per series, set by the user.

## Goals

- `POST /api/library` — add a series to the signed-in user's library. Accepts
  the compound id (`{source}-{externalId}`) plus an initial `status`. If no
  `Series` row exists yet for that `(externalId, source)`, fetch the detail
  (reusing the existing logic in `src/app/api/series/[id]/route.ts`) and
  upsert a `Series` row, then create the `LibraryItem`.
- `GET /api/library` — list the signed-in user's library items (joined with
  `Series` for title/cover/etc.), optionally filtered by `status`.
- `PATCH /api/library/[id]` — update status for one `LibraryItem`
  (`id` = `LibraryItem.id`).
- `PATCH /api/library/[id]/progress` — update progress fields
  (`currentSeason`/`currentEpisode`/`currentChapter`/`currentVolume`) for one
  `LibraryItem`, separate from status (matches `docs/api-contracts.md`'s
  documented split).
- `DELETE /api/library/[id]` — remove a `LibraryItem`.
- `PUT /api/series/[id]/rating` — create/update the signed-in user's
  `UserRating` for a series (score 1-10 + optional review), keyed by the
  compound `{source}-{externalId}` id so rating doesn't require the series
  to already be in the library.
- `src/app/series/[id]/page.tsx` — replace the disabled "Add to Library"
  button with a working status-picker (small dropdown/menu: choose
  WATCHING/PLAN_TO_WATCH/COMPLETED/ON_HOLD/DROPPED, which calls
  `POST /api/library`), and add a "Your rating" widget near the existing
  external-ratings block (visible/usable only when signed in).
- `src/app/library/page.tsx` — replace the empty-state-only UI with: status
  tabs (All/Watching/Plan to Watch/Completed/On Hold/Dropped), a card grid
  (reusing/adapting `SeriesCard`), an inline "+1 episode/chapter" progress
  button per card, and a remove button with a confirm step.

## Non-goals

- Per-episode ratings/reviews — only one rating per series, as established.
- Any actual streaming/hosting/episode delivery — this app only tracks
  progress numbers and points to external platforms; no video/file handling
  of any kind.
- Notifications for new episodes — schema/UX hooks for "current episode"
  exist so this is buildable later, but sending real notifications is out of
  scope for this round.
- Changing the `lib/services`/`lib/repositories` target architecture —
  follows today's pattern: routes call `prisma` directly via
  `compose(withErrorHandler, withRateLimit)(handler)`.
- Editing/removing a `Series` cache row directly — it's only ever
  created/read as a side effect of library operations.

## Architecture

- `src/lib/validations/library.ts` — new file, alongside `auth.ts`. Zod
  schemas: `addToLibrarySchema` (`{ seriesId: string (compound id),
  status: LibraryStatus enum }`), `updateLibraryStatusSchema` (`{ status:
  LibraryStatus enum }`), `updateProgressSchema` (`{ currentSeason?,
  currentEpisode?, currentChapter?, currentVolume? }`, all optional, at
  least one required), `rateSeriesSchema` (`{ score: int 1-10, review?:
  string }`). No `isFavorite`/`waitLanguage`/`customSearchKeyword` —
  those fields don't exist on `LibraryItem` in `prisma/schema.prisma` and
  are deferred (see Non-goals).
- `src/lib/db/series-cache.ts` — new helper,
  `getOrCreateSeriesFromCompoundId(compoundId: string): Promise<Series>`.
  Parses `{source}-{externalId}` (same split logic as
  `src/app/api/series/[id]/route.ts`), checks
  `prisma.series.findUnique({ where: { externalId_source: {...} } })`, and if
  missing, fetches detail via the same TMDB/AniList/MangaDex calls and
  `prisma.series.create(...)`s it. The duplicate fetch-detail logic between
  this helper and the `/api/series/[id]` route is accepted for this round
  (see Non-goals — no service layer to share it through yet); a follow-up
  could extract a shared `getSeriesDetailByCompoundId()` if this duplication
  becomes a problem.
- `src/app/api/library/route.ts` — `GET` (list, `requireAuth()`, optional
  `?status=` query filter, includes `series`), `POST` (add, `requireAuth()`,
  validates with `addToLibrarySchema`, calls
  `getOrCreateSeriesFromCompoundId`, then
  `prisma.libraryItem.create({ data: { userId, seriesId: series.id, status }
  })` — throws `AppError.conflict(...)` on the `[userId, seriesId]` unique
  violation (Prisma error code `P2002`) so re-adding an existing item is a
  clean 409, not a 500).
- `src/app/api/library/[id]/route.ts` — `PATCH` (`requireAuth()`, validates
  ownership — `LibraryItem.userId` must match the session user, else
  `AppError.notFound()` to avoid leaking existence of other users' items —
  validates body with `updateLibraryStatusSchema`, updates `status` only),
  `DELETE` (`requireAuth()`, same ownership check,
  `prisma.libraryItem.delete(...)`).
- `src/app/api/library/[id]/progress/route.ts` — `PATCH` (`requireAuth()`,
  same ownership check, validates with `updateProgressSchema`, updates the
  progress fields only — separate from status per `docs/api-contracts.md`).
- `src/app/api/series/[id]/rating/route.ts` — `PUT` (`requireAuth()`, `id`
  = compound `{source}-{externalId}`, calls
  `getOrCreateSeriesFromCompoundId`, validates with `rateSeriesSchema`,
  `prisma.userRating.upsert({ where: { userId_seriesId: {...} }, create:...,
  update:... })`). Deliberately diverges from `docs/api-contracts.md`'s
  `POST/PATCH/DELETE /api/ratings(/[id])` design — confirmed with the user;
  this lets rating happen without first knowing a rating id or adding to
  the library. `docs/api-contracts.md` should be updated to match once this
  ships (tracked as a follow-up, not part of this plan's tasks).
- All five route files wrapped in `compose(withErrorHandler, withRateLimit)`,
  matching `/api/auth/register`'s pattern (Auth's final review added rate
  limiting there specifically because mutating routes need it).
- `src/components/AddToLibraryButton.tsx` — new client component, replaces
  the disabled button in `src/app/series/[id]/page.tsx`. Small
  dropdown/menu of statuses; on pick, `fetch("/api/library", { method:
  "POST", body: { seriesId: compoundId, status } })`; shows the current
  status (or "Add to Library" if not yet added — needs an initial check,
  see below) and a loading/error state.
  - To know whether the series is already in the library when the detail
    page loads (so the button can show "In Library: Watching" instead of
    "Add to Library"), the server component `SeriesDetailPage` calls
    `getCurrentUser()` and, if signed in, a small Prisma lookup
    (`prisma.libraryItem.findFirst({ where: { userId, series: { externalId,
    source } } })`) and passes the existing item (or null) as a prop.
- `src/components/RatingWidget.tsx` — new client component, same
  signed-in-prop pattern: server page passes the existing `UserRating` (or
  null) plus the compound id; widget renders a 1-10 picker + optional review
  textarea, `PUT`s to `/api/series/[id]/rating`.
- `src/app/library/page.tsx` — becomes an async server component:
  `requireAuth()` (already protected by `proxy.ts`, but this gets us the
  user id), `prisma.libraryItem.findMany({ where: { userId }, include:
  { series: true } })`, renders tabs (client component for tab-state) +
  grid of cards (client component `LibraryItemCard` with the +1 progress
  button and remove-with-confirm).

## Components / data flow

- `AddToLibraryButton` posts the **compound id** (not a `Series.id` — the
  page doesn't have one yet for never-added series); `POST /api/library`
  resolves it server-side via `getOrCreateSeriesFromCompoundId`.
- `LibraryItemCard` (on `/library`) already has the real `LibraryItem.id`
  from the page's Prisma query, so its PATCH/DELETE calls use
  `/api/library/[id]` directly with no compound-id resolution needed.
- Status tabs on `/library` are client-side filtering over the
  already-fetched list (no extra round-trip per tab click) — the page does
  one `findMany` for all items; `?status=` filtering on `GET /api/library`
  still exists for completeness/future use (e.g. a future paginated view)
  but the initial page load fetches everything at once given expected small
  per-user library sizes.

## Error handling

Same `AppError`/`Responses` pattern as Auth wiring. New cases introduced:
- `AppError.conflict()` (already exists, added during Auth round) — re-add
  attempts on `POST /api/library`.
- Ownership checks on `PATCH`/`DELETE /api/library/[id]`,
  `PATCH /api/library/[id]/progress`, and the rating route return
  `AppError.notFound()` (not `unauthorized()`) when the `LibraryItem`/
  `Series` exists but belongs to another user, to avoid leaking existence.
- `requireAuth()` (existing helper) throws `AppError.unauthorized()` for all
  six routes when there's no session — defense in depth alongside
  `src/proxy.ts`'s page-level redirect (API routes aren't covered by the
  proxy's `matcher`, which only covers `/library/:path*` pages).

## Testing

No test framework configured (still true). Verification plan:
1. `npm run type-check` and `npm run lint` clean.
2. Manual via `curl` with a session cookie (same technique as Auth round):
   - `POST /api/library` with a fresh compound id → 201, creates `Series` +
     `LibraryItem`; re-`POST` same id → 409.
   - `GET /api/library` → lists it; `?status=WATCHING` filters correctly.
   - `PATCH /api/library/[id]` → updates status; with another user's item
     id → 404.
   - `PATCH /api/library/[id]/progress` → updates progress fields; with
     another user's item id → 404.
   - `DELETE /api/library/[id]` → 200/204; second delete → 404.
   - `PUT /api/series/[id]/rating` → upserts; score outside 1-10 → 400.
3. Manual browser/curl-assisted click-through: series detail page status
   picker creates a library item and the button updates to reflect it; the
   rating widget saves and reloads with the saved value; `/library` shows
   tabs, the new item appears under the right tab, +1 progress and
   remove-with-confirm both work.
