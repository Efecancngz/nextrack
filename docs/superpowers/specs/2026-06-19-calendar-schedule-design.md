# Calendar / Schedule — Design Spec

**Status:** Approved
**Scope:** Phase 2.2 (`docs/phases.md` § "Calendar / Schedule") — MVP slice. Second Phase 2 sub-project, started after Profile & Statistics (2.1) merged to `main` via PR #8.

## Goal

A personalized `/calendar` page showing when the next episode airs for series in the user's library (any status), plus an "Airing Today" section on the home page for logged-in visitors. Week/month view toggle.

## Out of Scope (deferred)

- **"Release notifications (in-app)"** — explicitly dropped from this slice. It's a literal duplicate of Phase 2.3's dedicated Notifications sub-project (in-app system, alerts, preferences, bell icon). Building a one-off mechanism here would mean redoing it properly in 2.3 immediately after. Revisit when 2.3 is scoped.
- **Global/public release calendar** (all TMDB/AniList content, not just the user's library) — out of scope; this is a personalized feature like Library and Profile, not a discovery feature like Explore.
- **Cron job / background pre-fetching** — no new background-job infrastructure. Air-date data is fetched live per page visit through the same `fetch(..., { next: { revalidate: 3600 } })` ISR pattern already used by every other external API call in this codebase (`src/lib/api/tmdb.ts:52`, `src/lib/api/anilist.ts:56`). A real cron job (mentioned under Phase 2.5's scope, not 2.2's) can be layered in later without changing this design's data shape.
- **Manga/manhwa/light novel/webtoon schedule data** — MangaDex and Jikan don't provide reliable per-chapter release dates. These library items always show with `airDate: null` ("No schedule data"), never a fabricated or best-guess date.

## Current State

- `Series` (Prisma model, `prisma/schema.prisma`) has no air-date field — air dates are never persisted, only ever fetched live from the source API at render time.
- `src/lib/api/tmdb.ts`'s `getTvSeriesDetail(tmdbId)` fetches the full series detail (genres, keywords, watch providers, etc.) — too heavy to call once per library item just to read one field. TMDB's raw `/tv/{id}` response does include `next_episode_to_air: { air_date, episode_number, season_number } | null`, just not currently requested or typed in this client.
- `src/lib/api/anilist.ts` has no per-ID detail fetch at all (`fetchAniListDetail` lives inline in `src/app/api/series/[id]/route.ts`, not exported from `anilist.ts`). AniList's GraphQL schema has `Media.nextAiringEpisode { airingAt, episode }` (`airingAt` is a Unix timestamp, an exact UTC instant — fundamentally different in kind from TMDB's date-only string).
- `src/app/library/page.tsx` is the reference pattern for an auth-gated personalized page: `requireAuth()` + `prisma.libraryItem.findMany({ where: { userId }, include: { series: true } })`.
- `src/lib/auth/helpers.ts` has `getCurrentUser()` (returns `null`, does not redirect) alongside `requireAuth()` (throws/redirects) — `src/app/page.tsx` (home) is a public route today and must stay public; it needs the non-redirecting helper to conditionally render "Airing Today" only for signed-in visitors.
- `src/app/page.tsx` already does per-source `try/catch` around each trending fetch (`getTrendingTvSeries`, `getTrendingAnime`, etc.) so one failing source doesn't break the page — the same resilience pattern applies to per-library-item air-date fetches.

## Design

### 1. New lightweight API client functions

In `src/lib/api/tmdb.ts`, add:

```ts
export async function getTvNextAirDate(tmdbId: string): Promise<string | null> {
  if (!API_KEY) return null; // mock fallback has no schedule data — out of scope to synthesize it
  const detail = await tmdbFetch<{ next_episode_to_air: { air_date: string } | null }>(
    `/tv/${tmdbId}`,
    { language: "en-US" }
  );
  return detail.next_episode_to_air?.air_date ?? null;
}
```

In `src/lib/api/anilist.ts`, add:

```ts
const NEXT_AIRING_QUERY = `
  query ($id: Int) {
    Media(id: $id, type: ANIME) {
      nextAiringEpisode { airingAt }
    }
  }
`;

export async function getAnimeNextAiringEpisode(anilistId: string): Promise<string | null> {
  const data = await anilistFetch<{ Media: { nextAiringEpisode: { airingAt: number } | null } }>(
    NEXT_AIRING_QUERY,
    { id: Number(anilistId) }
  );
  const airingAt = data.Media?.nextAiringEpisode?.airingAt;
  return airingAt != null ? new Date(airingAt * 1000).toISOString() : null;
}
```

Both are separate from the existing heavy detail-fetch functions — deliberately, to keep the per-library-item calendar fetch cheap. Both inherit the existing `revalidate: 3600` ISR caching from `tmdbFetch`/`anilistFetch`, no new caching mechanism needed.

### 2. Shared helper: `src/lib/calendar.ts`

```ts
import { getTvNextAirDate } from "./api/tmdb";
import { getAnimeNextAiringEpisode } from "./api/anilist";
import type { LibraryEntry } from "@/types/library";

export interface CalendarEntry {
  libraryItemId: string;
  series: LibraryEntry["series"];
  airDate: string | null;       // ISO date ("YYYY-MM-DD") for TMDB, ISO instant for AniList, null if unknown
  hasExactTime: boolean;        // true = airDate is a UTC instant (AniList); false = airDate is a date-only string (TMDB) or airDate is null
}

export async function getUpcomingReleases(entries: LibraryEntry[]): Promise<CalendarEntry[]> {
  return Promise.all(
    entries.map(async (entry): Promise<CalendarEntry> => {
      try {
        if (entry.series.source === "tmdb") {
          const airDate = await getTvNextAirDate(entry.series.externalId);
          return { libraryItemId: entry.id, series: entry.series, airDate, hasExactTime: false };
        }
        if (entry.series.source === "anilist" && entry.series.contentType === "ANIME") {
          const airDate = await getAnimeNextAiringEpisode(entry.series.externalId);
          return { libraryItemId: entry.id, series: entry.series, airDate, hasExactTime: true };
        }
      } catch (err) {
        console.error(`[Calendar] Failed to fetch air date for ${entry.series.source}-${entry.series.externalId}:`, err);
      }
      return { libraryItemId: entry.id, series: entry.series, airDate: null, hasExactTime: false };
    })
  );
}
```

A per-item `try/catch` inside the `Promise.all` mapper (not a single `try` around the whole `Promise.all`) — one failing fetch must not fail the others, matching the home page's existing per-source resilience pattern. AniList items that are `MANGA`/`MANHWA`/`LIGHT_NOVEL` (AniList serves all of these, not just `ANIME`) fall through to the `airDate: null` default — only `ANIME`-typed AniList entries get a real schedule query, since `nextAiringEpisode` is anime-specific in AniList's schema.

This one function is called from both `/calendar` and the home page — no duplicated fetch-loop logic.

`src/lib/calendar.ts` also exports the shared day-bucketing function both client components use — framework-free, no `"use client"` needed on this file, since it has no DOM dependency beyond reading `Date` getters (which only resolve to the *caller's* local timezone once actually invoked inside a client component running in the browser):

```ts
export function dayKeyOf(entry: CalendarEntry): string | null {
  if (!entry.airDate) return null;
  if (entry.hasExactTime) {
    const d = new Date(entry.airDate); // real instant — local getters below are correct
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  return entry.airDate; // already "YYYY-MM-DD" — a plain calendar date, used as-is, never re-parsed through `new Date()`
}
```

### 3. Route: `src/app/calendar/page.tsx`

- Server Component, `requireAuth()`-gated (same pattern as `src/app/library/page.tsx`).
- `prisma.libraryItem.findMany({ where: { userId: user.id }, include: { series: true } })` — **all statuses**, no `status` filter (per the design decision: ON_HOLD/DROPPED items still show).
- Maps Prisma rows to `LibraryEntry[]` using the identical mapping already in `src/app/library/page.tsx` (don't diverge the shape).
- Calls `getUpcomingReleases(entries)`, passes the resulting `CalendarEntry[]` into a new client component, `CalendarBoard`.

### 4. Component: `src/components/CalendarBoard.tsx`

Client component (`"use client"`) — owns the week/month view toggle and all date-bucketing logic, because **bucketing must happen in the browser**, not the server: the Server Component has no reliable access to the visitor's local timezone, and AniList's `airingAt` is a UTC instant that must be converted to the *viewer's* local calendar day before being placed in a calendar cell.

- `viewMode` state (`"week" | "month"`), lazy `useState` initializer reading `localStorage["calendar-view-mode"]` — a new, separate key (not reusing Explore's or Library's `"...-view-mode"` keys), same SSR-guarded try/catch pattern already established for `LibraryBoard`'s `viewMode`.
- Bucketing logic, run once via `useMemo` over the `entries` prop, grouping by `dayKeyOf(entry)` (the shared helper from `src/lib/calendar.ts`, §2 above) into a `Map<string, CalendarEntry[]>`:
  - `hasExactTime: true` entries (AniList) get their UTC instant converted to the browser's local calendar day inside `dayKeyOf` — correct because `Date`'s local getters (`getFullYear`/`getMonth`/`getDate`) only resolve once actually called client-side, in the viewer's own timezone.
  - `hasExactTime: false, airDate !== null` entries (TMDB) use the date string as-is inside `dayKeyOf` — it's never re-parsed through `new Date(airDate)`, which would parse it as UTC midnight and risk shifting it onto the wrong day depending on the viewer's UTC offset (the classic date-only-string-via-Date off-by-one bug).
  - `dayKeyOf(entry) === null` entries (i.e. `airDate === null`) go into a separate `noScheduleData: CalendarEntry[]` bucket, always rendered, never silently dropped.
- Renders either a 7-day week strip or a month grid (both consuming the same bucketed-by-day-key `Map<string, CalendarEntry[]>`) depending on `viewMode`, plus the "No schedule data" section below the calendar grid. **Week view is a rolling 7-day window starting today** (today + the next 6 days), not a literal Mon–Sun calendar week — this is a personalized "what's coming up" view, not a generic calendar widget, so anchoring to "today" is more useful than anchoring to the calendar week boundary. **Month view is the actual current calendar month grid** (1st through the last day of the current month, standard month-grid layout), matching the conventional meaning of "month view" in a calendar UI.

### 5. Home page: "Airing Today" section

Same timezone constraint as `CalendarBoard` applies here: the server doesn't know the visitor's local "today," so the today-filter must run client-side too, not be computed server-side and passed down already-filtered. The fix is a second small client component, not a server-side date comparison.

In `src/app/page.tsx` (Server Component, stays public):

```ts
import { getCurrentUser } from "@/lib/auth/helpers";
// ...
const user = await getCurrentUser(); // null if logged out — page stays public either way
let releases: CalendarEntry[] = [];
if (user) {
  const items = await prisma.libraryItem.findMany({ where: { userId: user.id }, include: { series: true } });
  const entries = /* same LibraryEntry mapping as library/page.tsx */;
  releases = await getUpcomingReleases(entries);
}
```

`releases` (the full unfiltered list — typically small, bounded by library size) is passed to a new client component, `src/components/AiringTodaySection.tsx`:

```tsx
"use client";
// receives `releases: CalendarEntry[]`
// filters to today using the exact same dayKeyOf() logic CalendarBoard uses for bucketing
// (extracted into a shared `dayKeyOf(entry: CalendarEntry): string | null` helper in
// src/lib/calendar.ts so the two client components can never drift on what "today" means)
// renders nothing — not even a wrapper element — if the filtered list is empty
```

`dayKeyOf` is a plain, framework-free function (no `"use client"` needed on `calendar.ts` itself) — it only runs inside client components, but the function itself has no DOM/browser dependency beyond reading `new Date()` getters, so it's safely importable from both `CalendarBoard.tsx` and `AiringTodaySection.tsx` without duplicating the date-math. The component renders nothing at all (not even an empty-state message) when `user` is `null` (server never fetched `releases`, stays `[]`) or the client-side "today" filter comes up empty — a quiet section, not a placeholder, consistent with how the rest of the home page already only shows sections that have content.

## Error Handling

- Per-item fetch failures (TMDB/AniList rate limit, network error, deleted series) are caught inside `getUpcomingReleases`'s mapper and degrade that single entry to `airDate: null` — never fail the whole page.
- Series with `ContentStatus` `COMPLETED`/`CANCELLED` naturally return `next_episode_to_air: null` / `nextAiringEpisode: null` from the APIs — these aren't errors, they fall into "No schedule data" exactly like a manga entry does.
- Empty library → existing-pattern empty state, same visual treatment as `/library`'s "Your library is empty."
- `TMDB_API_KEY` unset (dev without a key) → `getTvNextAirDate` returns `null` immediately, no attempted fetch, no console spam — consistent with how `getTvSeriesDetail` already short-circuits to mock data when the key is missing (here there's no mock schedule data to synthesize, so it's just `null`).

## Testing / Verification

No automated test framework in this repo (per `CLAUDE.md`). Verification is `npm run type-check` + `npm run lint` + manual browser check:

- Visit `/calendar` with a library containing a mix of: a TMDB TV series with a real upcoming `next_episode_to_air`, an AniList anime with a real `nextAiringEpisode`, and a manga/manhwa entry — confirm the first two land on their correct calendar day and the third appears in "No schedule data."
- Toggle week ↔ month view, confirm `localStorage["calendar-view-mode"]` persists across reload.
- Visit the home page logged out — confirm no "Airing Today" section renders at all (not even an empty one).
- Log in with a series whose air date is today (TMDB or AniList) — confirm it appears in "Airing Today."
- If possible, spot-check an AniList entry's day-bucketing near a UTC day boundary (e.g. late evening in a timezone behind UTC) to confirm it lands on the viewer's local day, not UTC's day.
- `docs/phases.md`'s "Weekly release calendar," "Airing today section on home," and "Calendar view (week/month toggle)" items get checked off; "Release notifications (in-app)" stays unchecked, with a note pointing to Phase 2.3.
