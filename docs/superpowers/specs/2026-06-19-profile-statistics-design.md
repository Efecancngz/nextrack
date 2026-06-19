# Profile & Statistics — Design Spec

**Status:** Approved
**Scope:** Phase 2.1 (`docs/phases.md` § "Profile & Statistics") — MVP slice only. First Phase 2 sub-project, started after Phase 1 close-out fully merged to `main`.

## Goal

A public profile page at `/profile/[username]` showing a user's library stats and favorited series, plus a way to mark library items as favorites. No auth required to view a profile — any visitor can see any user's stats (per explicit decision, no privacy toggle in this slice).

## Out of Scope (deferred to a later 2.1 follow-up)

- Genre distribution chart, monthly activity graph, activity history timeline (the chart/timeline items from `phases.md`'s 2.1 list)
- Profile privacy toggle (`isProfilePublic` or similar) — everything is public for now
- Avatar upload — profile uses `User.image` if set (already exists from OAuth), otherwise a placeholder; no new upload UI
- Any breakdown of "total series by type" beyond `ContentType` (no per-status cross-tab)

## Current State

- `User` model has `username` (unique, set via the existing `/auth/set-username` flow — every active session has one), `image`, `createdAt`. No `isFavorite`-equivalent field anywhere yet.
- `LibraryItem` has `status`, `currentEpisode`/`currentChapter`/`currentSeason`/`currentVolume` (current progress only, not a cumulative watched-count), no favorite flag.
- `UserRating` has `score` (1-10) per user per series — average is a straightforward `aggregate`.
- `Navbar.tsx` renders `@{username}` as a plain `<span>`, not a link — no profile route exists to link to yet.
- `src/app/library/page.tsx` is the reference pattern for this work: `requireAuth()` (we skip this, since the profile page is public) + direct `prisma.libraryItem.findMany` in a Server Component, no service/repository layer — matches `CLAUDE.md`'s documented "Current Implementation State."
- `SeriesCard.tsx` takes a `SearchResult`-shaped prop; `LibraryEntry.series` is typed as `SeriesCard` (the data interface, not the component) and is a structural superset of `SearchResult`'s fields, so passing `entry.series` straight into the `<SeriesCard series={...} />` component works without adapting.

## Design

### 1. Schema change

Add to `LibraryItem` in `prisma/schema.prisma`:

```prisma
isFavorite Boolean @default(false)
```

Run `npx prisma migrate dev --name add_library_item_favorite` locally to generate and apply the migration (matches the existing migration naming style, e.g. `20260617192827_init`).

### 2. Stats calculation (MAL/AniList model)

Episodes-watched / chapters-read stats are **not** a separate cumulative counter — they're the sum of each library item's *current* progress, exactly how MAL/AniList compute the same stat on their own profiles. This requires no new tracking mechanism; it reads `currentEpisode`/`currentChapter` as already stored. Known accepted quirk (same as MAL): if a user drops and restarts a series, the sum reflects current restart position, not lifetime total — not solved here.

Three Prisma calls, run in parallel via `Promise.all` in the page Server Component:

```ts
const [itemsByType, progressSums, ratingAvg] = await Promise.all([
  prisma.libraryItem.findMany({
    where: { userId: user.id },
    select: { series: { select: { contentType: true } } },
  }),
  prisma.libraryItem.aggregate({
    where: { userId: user.id },
    _sum: { currentEpisode: true, currentChapter: true },
  }),
  prisma.userRating.aggregate({
    where: { userId: user.id },
    _avg: { score: true },
  }),
]);
// tally itemsByType into a Record<ContentType, number> in JS
```

Note: Prisma's `groupBy` cannot group by a field on a *related* model (`Series.contentType`) in one query — `LibraryItem` doesn't denormalize `contentType` onto itself, and there's no join-friendly `groupBy` across relations. So "total series by type" is the one stat computed by fetching `{ series: { contentType } }` for all the user's library items and tallying in JS, rather than the DB aggregate used for the other two stats. This is a deliberate, scoped exception to "aggregate in the DB, not JS" — justified because the alternative (raw SQL) isn't worth it for a per-user count over at most a few hundred rows, and the `select` keeps the query payload to a single field per row.

### 3. Route: `src/app/profile/[username]/page.tsx`

- Server Component, **no `requireAuth()`** — public route.
- `prisma.user.findUnique({ where: { username } })` — if `null`, call `notFound()` (renders existing `not-found.tsx`, no new work).
- Run the three queries above plus `prisma.libraryItem.findMany({ where: { userId: user.id, isFavorite: true }, include: { series: true } })` for the favorites grid.
- Pass plain serialized data (dates as ISO strings, matching the `LibraryEntry` convention in `src/types/library.ts`) down to three new components.

### 4. New components

- `src/components/ProfileHeader.tsx` — `User.image` (or placeholder icon, same SVG style as `poster-card-placeholder`), display name, `@username`, "Joined {month year}" from `createdAt`.
- `src/components/ProfileStats.tsx` — stat cards: one per `ContentType` (6 counts, using `CONTENT_TYPE_LABELS`/`CONTENT_TYPE_BADGE_CLASS` from `src/types/common.ts` for consistent styling with the rest of the app), "Episodes Watched" (sum), "Chapters Read" (sum), "Average Rating Given" (formatted to 1 decimal, or `—` if `_avg.score` is `null`).
- `src/components/ProfileFavorites.tsx` — `.series-grid` of `SeriesCard` (reused as-is) for favorited items; if empty, a simple empty-state message ("No favorites yet").

### 5. New type: `src/types/profile.ts`

```ts
export interface ProfileStatsData {
  byContentType: Record<ContentType, number>;
  episodesWatched: number;
  chaptersRead: number;
  averageRating: number | null;
}

export interface ProfilePageData {
  username: string;
  displayName: string | null;
  image: string | null;
  joinedAt: string; // ISO
  stats: ProfileStatsData;
  favorites: SeriesCard[]; // from types/series.ts
}
```

### 6. Favorite toggle (write path)

- Extend `src/lib/validations/library.ts`'s `updateLibraryStatusSchema` usage: add a sibling schema (not folded into the same object, to keep each PATCH call's intent explicit — same pattern as `updateProgressSchema` being separate from `updateLibraryStatusSchema`):

```ts
export const updateFavoriteSchema = z.object({
  isFavorite: z.boolean(),
});
export type UpdateFavoriteInput = z.infer<typeof updateFavoriteSchema>;
```

- `src/app/api/library/[id]/route.ts`'s `patchHandler` tries `updateLibraryStatusSchema` first; if that fails, tries `updateFavoriteSchema` (mirroring how a single `PATCH` endpoint already needs to disambiguate intent — simplest approach given there are now two distinct optional-body shapes hitting the same route). On match, updates only `isFavorite` and returns the updated item.
- `LibraryItemCard.tsx` and `LibraryItemRow.tsx`: add a star-icon button (outline/filled based on `entry.isFavorite`) next to the existing remove button, calling `PATCH /api/library/[id]` with `{ isFavorite: !entry.isFavorite }`, updating local state via the existing `onUpdated` callback — same optimistic-update pattern `handleStatusChange` already uses.
- `LibraryEntry` type (`src/types/library.ts`) gains `isFavorite: boolean`.

### 7. Navbar change

`src/components/Navbar.tsx`: both the desktop and mobile `@{username}` spans become `<Link href={`/profile/${session.user.username}`}>` (only rendered when `session.user.username` is truthy — it always is for an active session per the set-username flow, but the existing code already guards with a ternary fallback to `name`/`email`, so the link only applies in the `username` branch).

## Error Handling

- Unknown `username` in the URL → `notFound()` → existing `not-found.tsx`.
- Zero library items → all stat cards show `0`, favorites grid shows the empty-state message — no special-casing needed beyond what `Promise.all` + empty-array defaults already produce.
- `_avg.score` is `null` when a user has never rated anything → render `—`, not `0` or `NaN`.
- Favorite toggle PATCH failure → same silent-fail convention as `handleStatusChange`/`handleIncrement` (clear `busy` in `finally`, no toast) — consistent with the rest of `LibraryItemCard`.

## Testing / Verification

No automated test framework in this repo (per `CLAUDE.md`). Verification is `npm run type-check` + `npm run lint` + manual browser check:

- `npx prisma migrate dev` applies cleanly, `npx prisma generate` regenerates the client with `isFavorite` on `LibraryItem`.
- Visit `/profile/<own-username>` via the new Navbar link — stats match what's actually in the library (spot-check counts and sums against `/library`).
- Toggle a favorite star on `/library` (both grid and list view) — item appears on the profile's favorites grid; un-favorite removes it.
- Visit `/profile/<username-with-empty-library>` — all stats show `0`, favorites section shows empty state, no errors.
- Visit `/profile/nonexistent-user` — 404 page renders.
- Average rating: rate a series, confirm the profile's "Average Rating Given" updates; for a user with zero ratings, confirm it shows `—` not `0`.
- `docs/phases.md`'s "User profile page" and "Favorite series showcase" items get checked off; the stats-dashboard sub-bullets get partially checked (total series by type ✅, episodes/chapters ✅, average rating ✅; genre chart / monthly activity / activity timeline stay unchecked, called out as deferred).
