# Calendar & Schedule Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Phase 2.2 MVP — a personalized `/calendar` page showing when the next episode airs for series in the user's library (any status), a week/month view toggle, and a home-page "Airing Today" section for logged-in visitors.

**Architecture:** Two new lightweight API client functions (`getTvNextAirDate` in `tmdb.ts`, `getAnimeNextAiringEpisode` in `anilist.ts`) feed a shared helper (`src/lib/calendar.ts`) that both the `/calendar` route and the home page call. Day-bucketing (which calendar cell an entry belongs in, and what counts as "today") happens entirely client-side, since the server doesn't know the visitor's local timezone — a shared `dayKeyOf()` function is used identically by both client components so they can never disagree on what day an entry falls on.

**Tech Stack:** Next.js 16 App Router (Server Components + client components), TMDB REST API, AniList GraphQL API, TypeScript. No test framework configured in this repo — verification is `npm run type-check` + `npm run lint` + manual browser check.

## Global Constraints

- **"Release notifications (in-app)" is explicitly out of scope** for this plan — it duplicates Phase 2.3's dedicated Notifications sub-project. Do not add any notification mechanism.
- The calendar is **personalized to the user's own library** (all statuses, including ON_HOLD/DROPPED) — never a global/public release calendar across all TMDB/AniList content.
- Manga/manhwa/light novel/webtoon library entries always get `airDate: null` ("No schedule data") — never a fabricated or best-guess date. Only `tmdb`-sourced entries and `anilist`-sourced entries with `contentType === "ANIME"` get a real schedule query.
- **Timezone correctness is the most important constraint in this plan.** AniList's `airingAt` is a Unix timestamp (a UTC instant) — it must be converted to the *viewer's local* calendar day, which can only happen client-side. TMDB's `next_episode_to_air.air_date` is a date-only string (`"YYYY-MM-DD"`, no time component) — it must be used as-is, **never** passed through `new Date(dateString)` and re-read via local getters, since that constructor parses the string as UTC midnight and can shift it onto the wrong day depending on the viewer's UTC offset. Both rules are implemented once, in the shared `dayKeyOf()` function (Task 2) — every other piece of code reads day buckets through this function, never reimplements the logic.
- "Week view" is a rolling 7-day window starting today (today + next 6 days), not a literal Mon–Sun calendar week. "Month view" is the actual current calendar month grid (1st through the last day of the current month).
- No new background-job/cron infrastructure — every external API call goes through the existing `revalidate: 3600` ISR `fetch()` pattern already used by `tmdb.ts`/`anilist.ts`. Per-item fetch failures must never fail the whole page — each API client function (`getTvNextAirDate`, `getAnimeNextAiringEpisode`) catches its own errors and resolves to `null` rather than throwing, so a single slow/failing external call degrades only that one entry to "no schedule data," never the whole `Promise.all` in `getUpcomingReleases`.
- `npm run type-check` and `npm run lint` must be clean before every commit.
- No `git push` without explicit user instruction. Conventional Commits format for every commit message.
- This project's dev server has a known Turbopack bug on this path (non-ASCII `ü` in the directory name) — use `npx next dev --webpack` for manual verification, not `npm run dev`. `NEXTAUTH_URL` in `.env` is hardcoded to `http://localhost:3000` — the dev server **must** run on port 3000 (`npx next dev --webpack -p 3000`) or Auth.js redirects loop incorrectly.
- Local dev DB is Docker Postgres — confirm `docker ps` shows the `serietracker-db-1` container running before any manual verification that touches the library (signup, add-to-library, etc.). If it's not running, start Docker Desktop first.

---

## File Structure

New files:
- `src/lib/calendar.ts` — `CalendarEntry` type, `getUpcomingReleases()`, `dayKeyOf()` (Task 1 consumes from API clients, Task 2 owns this file)
- `src/components/CalendarBoard.tsx` — client component, week/month toggle + day-bucketed rendering (Task 3)
- `src/components/AiringTodaySection.tsx` — client component, today-filter + rendering for the home page (Task 5)
- `src/app/calendar/page.tsx` — public-to-authed-users route (Task 4)

Modified files:
- `src/lib/api/tmdb.ts` — add `getTvNextAirDate()` (Task 1)
- `src/lib/api/anilist.ts` — add `getAnimeNextAiringEpisode()` (Task 1)
- `src/app/globals.css` — calendar page CSS (Task 3), airing-today section CSS (Task 5)
- `src/app/page.tsx` — fetch releases for logged-in users, render `AiringTodaySection` (Task 5)
- `src/components/Navbar.tsx` — add "Calendar" nav link (Task 6)
- `docs/phases.md` — check off shipped items (Task 6)

---

### Task 1: API client functions for next-air-date

**Files:**
- Modify: `src/lib/api/tmdb.ts`
- Modify: `src/lib/api/anilist.ts`

**Interfaces:**
- Produces: `getTvNextAirDate(tmdbId: string): Promise<string | null>` from `tmdb.ts`; `getAnimeNextAiringEpisode(anilistId: string): Promise<string | null>` from `anilist.ts`. Both consumed by Task 2's `getUpcomingReleases`.

These functions have no consumer yet after this task — they can't be exercised through the app UI until Task 2 wires them in. Verification this round is type-check/lint only; Task 2's manual test exercises these functions for real.

- [ ] **Step 1: Add `getTvNextAirDate` to `src/lib/api/tmdb.ts`**

Add this function after the existing `getTvSeriesDetail` function (i.e. right before `/** Get trending TV series (week) */`):

```ts
/** Get the next episode air date for a TV series, or null if none scheduled / API key unset */
export async function getTvNextAirDate(tmdbId: string): Promise<string | null> {
  if (!API_KEY) return null; // no mock schedule data to synthesize — out of scope
  try {
    const detail = await tmdbFetch<{ next_episode_to_air: { air_date: string } | null }>(
      `/tv/${tmdbId}`,
      { language: "en-US" }
    );
    return detail.next_episode_to_air?.air_date ?? null;
  } catch (err) {
    console.error(`[TMDB] Failed to fetch next air date for series ${tmdbId}:`, err);
    return null;
  }
}
```

- [ ] **Step 2: Add `getAnimeNextAiringEpisode` to `src/lib/api/anilist.ts`**

Add this after the existing `getTrendingNovel` function, at the end of the file:

```ts
const NEXT_AIRING_QUERY = `
  query ($id: Int) {
    Media(id: $id, type: ANIME) {
      nextAiringEpisode { airingAt }
    }
  }
`;

/** Get the next airing episode's UTC instant (ISO string) for an anime, or null if none scheduled */
export async function getAnimeNextAiringEpisode(anilistId: string): Promise<string | null> {
  try {
    const data = await anilistFetch<{ Media: { nextAiringEpisode: { airingAt: number } | null } }>(
      NEXT_AIRING_QUERY,
      { id: Number(anilistId) }
    );
    const airingAt = data.Media?.nextAiringEpisode?.airingAt;
    return airingAt != null ? new Date(airingAt * 1000).toISOString() : null;
  } catch (err) {
    console.error(`[AniList] Failed to fetch next airing episode for media ${anilistId}:`, err);
    return null;
  }
}
```

- [ ] **Step 3: Verify**

Run: `npm run type-check && npm run lint`
Expected: both exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/lib/api/tmdb.ts src/lib/api/anilist.ts
git commit -m "feat: add next-air-date API client functions"
```

---

### Task 2: Shared calendar helper

**Files:**
- Create: `src/lib/calendar.ts`

**Interfaces:**
- Consumes: `getTvNextAirDate` from `@/lib/api/tmdb`, `getAnimeNextAiringEpisode` from `@/lib/api/anilist`, `type LibraryEntry` from `@/types/library` (Task 1).
- Produces: `interface CalendarEntry { libraryItemId: string; series: LibraryEntry["series"]; airDate: string | null; hasExactTime: boolean }`; `getUpcomingReleases(entries: LibraryEntry[]): Promise<CalendarEntry[]>`; `dayKeyOf(entry: CalendarEntry): string | null` — all consumed by Task 3's `CalendarBoard`, Task 4's route, and Task 5's `AiringTodaySection`.

- [ ] **Step 1: Write `src/lib/calendar.ts`**

```ts
import { getTvNextAirDate } from "./api/tmdb";
import { getAnimeNextAiringEpisode } from "./api/anilist";
import type { LibraryEntry } from "@/types/library";

export interface CalendarEntry {
  libraryItemId: string;
  series: LibraryEntry["series"];
  airDate: string | null; // "YYYY-MM-DD" for TMDB, ISO instant for AniList, null if unknown
  hasExactTime: boolean;  // true = airDate is a UTC instant (AniList); false = date-only string or null
}

export async function getUpcomingReleases(entries: LibraryEntry[]): Promise<CalendarEntry[]> {
  return Promise.all(
    entries.map(async (entry): Promise<CalendarEntry> => {
      // getTvNextAirDate/getAnimeNextAiringEpisode already catch their own fetch errors
      // and resolve to null rather than throwing — no try/catch needed at this layer too.
      if (entry.series.source === "tmdb") {
        const airDate = await getTvNextAirDate(entry.series.externalId);
        return { libraryItemId: entry.id, series: entry.series, airDate, hasExactTime: false };
      }
      if (entry.series.source === "anilist" && entry.series.contentType === "ANIME") {
        const airDate = await getAnimeNextAiringEpisode(entry.series.externalId);
        return { libraryItemId: entry.id, series: entry.series, airDate, hasExactTime: true };
      }
      return { libraryItemId: entry.id, series: entry.series, airDate: null, hasExactTime: false };
    })
  );
}

/**
 * Returns the local calendar-day key ("YYYY-MM-DD") an entry falls on, or null if unknown.
 * Must only be called from client components — for `hasExactTime` entries it relies on
 * `Date`'s local getters, which resolve to the *caller's* timezone.
 */
export function dayKeyOf(entry: CalendarEntry): string | null {
  if (!entry.airDate) return null;
  if (entry.hasExactTime) {
    const d = new Date(entry.airDate);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  return entry.airDate; // already "YYYY-MM-DD" — never re-parsed through `new Date()`
}
```

- [ ] **Step 2: Verify**

Run: `npm run type-check && npm run lint`
Expected: both exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/lib/calendar.ts
git commit -m "feat: add shared calendar helper (getUpcomingReleases, dayKeyOf)"
```

---

### Task 3: `CalendarBoard` component

**Files:**
- Create: `src/components/CalendarBoard.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: `type CalendarEntry`, `dayKeyOf` from `@/lib/calendar` (Task 2); `SeriesCard` component (default export) from `@/components/SeriesCard`.
- Produces: `CalendarBoard` component, props `{ entries: CalendarEntry[] }` — consumed by Task 4's route.

Not rendered anywhere yet after this task — Task 4's route is what wires it in. No visual change is possible until then, that's expected.

- [ ] **Step 1: Write `src/components/CalendarBoard.tsx`**

```tsx
"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { dayKeyOf, type CalendarEntry } from "@/lib/calendar";

interface CalendarBoardProps {
  entries: CalendarEntry[];
}

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function monthGridKeys(anchorKey: string): string[] {
  const [y, m] = anchorKey.split("-").map(Number);
  const firstOfMonth = new Date(y, m - 1, 1);
  const startOffset = firstOfMonth.getDay(); // 0 = Sunday
  const gridStart = new Date(y, m - 1, 1 - startOffset);
  const keys: string[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
  }
  return keys;
}

export default function CalendarBoard({ entries }: CalendarBoardProps) {
  const [viewMode, setViewMode] = useState<"week" | "month">(() => {
    if (typeof window === "undefined") return "week";
    try {
      const stored = window.localStorage.getItem("calendar-view-mode");
      if (stored === "week" || stored === "month") return stored;
    } catch {
      // localStorage unavailable — keep default "week"
    }
    return "week";
  });

  function handleViewModeChange(mode: "week" | "month") {
    setViewMode(mode);
    try {
      window.localStorage.setItem("calendar-view-mode", mode);
    } catch {
      // localStorage unavailable — preference just won't persist this session
    }
  }

  const { byDay, noScheduleData } = useMemo(() => {
    const byDay = new Map<string, CalendarEntry[]>();
    const noScheduleData: CalendarEntry[] = [];
    for (const entry of entries) {
      const key = dayKeyOf(entry);
      if (key === null) {
        noScheduleData.push(entry);
        continue;
      }
      const existing = byDay.get(key);
      if (existing) {
        existing.push(entry);
      } else {
        byDay.set(key, [entry]);
      }
    }
    return { byDay, noScheduleData };
  }, [entries]);

  const today = todayKey();
  const dayKeys = viewMode === "week"
    ? Array.from({ length: 7 }, (_, i) => addDays(today, i))
    : monthGridKeys(today);

  return (
    <div className="calendar-page">
      <div className="explore-toolbar">
        <h1 className="calendar-title">My Calendar</h1>
        <div className="explore-view-toggle" role="group" aria-label="Calendar view">
          <button
            type="button"
            className={`explore-view-toggle-btn ${viewMode === "week" ? "explore-view-toggle-btn-active" : ""}`}
            onClick={() => handleViewModeChange("week")}
            aria-pressed={viewMode === "week"}
          >
            Week
          </button>
          <button
            type="button"
            className={`explore-view-toggle-btn ${viewMode === "month" ? "explore-view-toggle-btn-active" : ""}`}
            onClick={() => handleViewModeChange("month")}
            aria-pressed={viewMode === "month"}
          >
            Month
          </button>
        </div>
      </div>

      <div className={viewMode === "week" ? "calendar-week-strip" : "calendar-month-grid"}>
        {dayKeys.map((key) => {
          const dayEntries = byDay.get(key) ?? [];
          const [, , dayNum] = key.split("-");
          return (
            <div key={key} className={`calendar-day-cell ${key === today ? "calendar-day-cell-today" : ""}`}>
              <span className="calendar-day-number">{Number(dayNum)}</span>
              <div className="calendar-day-entries">
                {dayEntries.map((entry) => (
                  <Link
                    key={entry.libraryItemId}
                    href={`/series/${entry.series.source}-${entry.series.externalId}`}
                    className="calendar-entry-chip"
                  >
                    {entry.series.title}
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {noScheduleData.length > 0 && (
        <div className="calendar-no-schedule">
          <h2 className="calendar-no-schedule-title">No schedule data</h2>
          <div className="calendar-no-schedule-list">
            {noScheduleData.map((entry) => (
              <Link
                key={entry.libraryItemId}
                href={`/series/${entry.series.source}-${entry.series.externalId}`}
                className="calendar-entry-chip"
              >
                {entry.series.title}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Append CSS to `src/app/globals.css`**

Insert this immediately after the `.profile-favorites-empty { ... }` rule (the last rule in the "Profile Page" section, right before `/* ─── Auth Pages ─── */`):

```css
/* ─── Calendar Page ─── */
.calendar-title {
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 700;
}

.calendar-week-strip {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: var(--space-3);
}

.calendar-month-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: var(--space-2);
}

.calendar-day-cell {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-3);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-bg-elevated);
  min-height: 100px;
}

.calendar-day-cell-today {
  border-color: var(--color-brand);
}

.calendar-day-number {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.calendar-day-entries {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.calendar-entry-chip {
  display: block;
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  background: var(--color-bg-surface);
  font-size: 0.75rem;
  color: var(--color-text-primary);
  text-decoration: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.calendar-entry-chip:hover {
  background: var(--color-bg-overlay);
}

.calendar-no-schedule {
  margin-top: var(--space-8);
}

.calendar-no-schedule-title {
  font-family: var(--font-display);
  font-size: 1.125rem;
  font-weight: 700;
  margin-bottom: var(--space-4);
}

.calendar-no-schedule-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}
```

- [ ] **Step 3: Verify**

Run: `npm run type-check && npm run lint`
Expected: both exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/components/CalendarBoard.tsx src/app/globals.css
git commit -m "feat: add CalendarBoard component"
```

---

### Task 4: Calendar page route

**Files:**
- Create: `src/app/calendar/page.tsx`

**Interfaces:**
- Consumes: `CalendarBoard` from Task 3; `getUpcomingReleases` from `@/lib/calendar` (Task 2); `prisma` from `@/lib/db/prisma`; `requireAuth` from `@/lib/auth/helpers`.
- Produces: the `/calendar` route — this task's deliverable is independently browser-testable end to end.

- [ ] **Step 1: Write `src/app/calendar/page.tsx`**

```tsx
import React from "react";
import type { Metadata } from "next";
import { requireAuth } from "@/lib/auth/helpers";
import { prisma } from "@/lib/db/prisma";
import { getUpcomingReleases } from "@/lib/calendar";
import CalendarBoard from "@/components/CalendarBoard";
import type { LibraryEntry } from "@/types/library";

export const metadata: Metadata = {
  title: "My Calendar",
  description: "When your tracked series air next",
};

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const user = await requireAuth();

  const items = await prisma.libraryItem.findMany({
    where: { userId: user.id },
    include: { series: true },
    orderBy: { updatedAt: "desc" },
  });

  const entries: LibraryEntry[] = items.map((item) => ({
    id: item.id,
    userId: item.userId,
    seriesId: item.seriesId,
    status: item.status,
    isFavorite: item.isFavorite,
    currentSeason: item.currentSeason ?? undefined,
    currentEpisode: item.currentEpisode ?? undefined,
    currentChapter: item.currentChapter ?? undefined,
    currentVolume: item.currentVolume ?? undefined,
    startedAt: item.startedAt?.toISOString(),
    completedAt: item.completedAt?.toISOString(),
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    series: {
      id: item.series.id,
      externalId: item.series.externalId,
      source: item.series.source,
      contentType: item.series.contentType,
      status: item.series.status,
      title: item.series.title,
      titleOriginal: item.series.titleOriginal ?? undefined,
      coverImage: item.series.coverImage ?? undefined,
      year: item.series.year ?? undefined,
      genres: item.series.genres,
      ratingExternal: item.series.ratingExternal ?? undefined,
      totalEpisodes: item.series.totalEpisodes ?? undefined,
      totalChapters: item.series.totalChapters ?? undefined,
      platforms: [],
    },
  }));

  const releases = await getUpcomingReleases(entries);

  return (
    <div className="container-content page-enter">
      {entries.length === 0 ? (
        <div className="library-empty">
          <div className="library-empty-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.25">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
          </div>
          <h2 className="library-empty-title">Your library is empty</h2>
          <p className="library-empty-text">
            Add series to your library to see their release schedule here.
          </p>
        </div>
      ) : (
        <CalendarBoard entries={releases} />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify with type-check and lint**

Run: `npm run type-check && npm run lint`
Expected: both exit 0.

- [ ] **Step 3: Manual browser verification**

Run: `npx next dev --webpack -p 3000` (confirm `docker ps` shows `serietracker-db-1` running first)
- Sign in with a user who has at least one TMDB TV series and one AniList anime in their library, plus one manga/manhwa entry.
- Visit `/calendar` — confirm the TMDB and AniList entries appear on their correct day, and the manga/manhwa entry appears under "No schedule data."
- If neither TV/anime entry has a real upcoming air date (e.g. the show isn't currently airing), confirm they correctly land in "No schedule data" too — that's not a bug.
- Visit `/calendar` while logged out — confirm it redirects to sign-in (same `requireAuth()` behavior as `/library`).
- Visit `/calendar` with an empty library — confirm the empty state renders.

- [ ] **Step 4: Commit**

```bash
git add src/app/calendar
git commit -m "feat: add calendar page route"
```

---

### Task 5: "Airing Today" section on the home page

**Files:**
- Create: `src/components/AiringTodaySection.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: `getCurrentUser` from `@/lib/auth/helpers`; `getUpcomingReleases`, `dayKeyOf`, `type CalendarEntry` from `@/lib/calendar`; `SeriesCard` component from `@/components/SeriesCard`; `prisma` from `@/lib/db/prisma`.
- Produces: nothing further consumed by other tasks.

- [ ] **Step 1: Write `src/components/AiringTodaySection.tsx`**

```tsx
"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import SeriesCard from "./SeriesCard";
import { dayKeyOf, type CalendarEntry } from "@/lib/calendar";

interface AiringTodaySectionProps {
  releases: CalendarEntry[];
}

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function AiringTodaySection({ releases }: AiringTodaySectionProps) {
  const airingToday = useMemo(() => {
    const today = todayKey();
    return releases.filter((entry) => dayKeyOf(entry) === today);
  }, [releases]);

  if (airingToday.length === 0) {
    return null;
  }

  return (
    <section className="trending-section" id="airing-today">
      <div className="section-header">
        <h2 className="section-title">Airing Today</h2>
        <Link href="/calendar" className="section-see-all">
          See calendar →
        </Link>
      </div>
      <div className="series-grid">
        {airingToday.map((entry) => (
          <SeriesCard key={entry.libraryItemId} series={entry.series} />
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Modify `src/app/page.tsx`**

`getMyReleases`'s `LibraryEntry` mapping below is the same shape as `src/app/calendar/page.tsx`'s (Task 4) and `src/app/library/page.tsx`'s mapping — duplicated rather than extracted into a shared function. This matches the established precedent in this codebase (e.g. `LibraryItemCard`/`LibraryItemRow` duplicate their handler logic rather than sharing a hook) of preferring duplication over a premature shared abstraction for a ~15-line mapping block with exactly three call sites.

Add these imports at the top, after the existing `type { SearchResult }` import:

```ts
import { getCurrentUser } from "@/lib/auth/helpers";
import { prisma } from "@/lib/db/prisma";
import { getUpcomingReleases, type CalendarEntry } from "@/lib/calendar";
import AiringTodaySection from "@/components/AiringTodaySection";
import type { LibraryEntry } from "@/types/library";
```

Add this function after `getTrendingData` (before `export default async function HomePage()`):

```ts
async function getMyReleases(): Promise<CalendarEntry[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const items = await prisma.libraryItem.findMany({
    where: { userId: user.id },
    include: { series: true },
  });

  const entries: LibraryEntry[] = items.map((item) => ({
    id: item.id,
    userId: item.userId,
    seriesId: item.seriesId,
    status: item.status,
    isFavorite: item.isFavorite,
    currentSeason: item.currentSeason ?? undefined,
    currentEpisode: item.currentEpisode ?? undefined,
    currentChapter: item.currentChapter ?? undefined,
    currentVolume: item.currentVolume ?? undefined,
    startedAt: item.startedAt?.toISOString(),
    completedAt: item.completedAt?.toISOString(),
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    series: {
      id: item.series.id,
      externalId: item.series.externalId,
      source: item.series.source,
      contentType: item.series.contentType,
      status: item.series.status,
      title: item.series.title,
      titleOriginal: item.series.titleOriginal ?? undefined,
      coverImage: item.series.coverImage ?? undefined,
      year: item.series.year ?? undefined,
      genres: item.series.genres,
      ratingExternal: item.series.ratingExternal ?? undefined,
      totalEpisodes: item.series.totalEpisodes ?? undefined,
      totalChapters: item.series.totalChapters ?? undefined,
      platforms: [],
    },
  }));

  return getUpcomingReleases(entries);
}
```

In `HomePage`, change:

```ts
export default async function HomePage() {
  const { tv, anime, manga, manhwa, novel } = await getTrendingData();
```

to:

```ts
export default async function HomePage() {
  const { tv, anime, manga, manhwa, novel } = await getTrendingData();
  const myReleases = await getMyReleases();
```

Then add `<AiringTodaySection releases={myReleases} />` right after the closing `</section>` of the `stats-row` section and before the `{/* ── Trending TV Series ── */}` comment:

```tsx
        </section>

        <AiringTodaySection releases={myReleases} />

        {/* ── Trending TV Series ── */}
```

- [ ] **Step 3: Append CSS to `src/app/globals.css`**

The "Airing Today" section reuses `.trending-section`, `.section-header`, `.section-title`, `.section-see-all`, and `.series-grid` entirely as-is — no new CSS rules needed for this task.

- [ ] **Step 4: Verify with type-check and lint**

Run: `npm run type-check && npm run lint`
Expected: both exit 0.

- [ ] **Step 5: Manual browser verification**

Run: `npx next dev --webpack -p 3000`
- Visit the home page logged out — confirm no "Airing Today" section renders anywhere on the page.
- Sign in with a user who has a TMDB/AniList library entry airing today (if none air today naturally, this is hard to force — confirm instead that the section correctly does NOT render when nothing airs today, which is the more common case and still validates the conditional logic).
- If a real "airing today" entry is available, confirm it renders as a `SeriesCard` linking to the correct series page.

- [ ] **Step 6: Commit**

```bash
git add src/components/AiringTodaySection.tsx src/app/page.tsx
git commit -m "feat: add Airing Today section to home page"
```

---

### Task 6: Navbar link and docs

**Files:**
- Modify: `src/components/Navbar.tsx`
- Modify: `docs/phases.md`

**Interfaces:**
- Consumes: the `/calendar` route from Task 4.
- Produces: nothing further consumed by other tasks — final, integration-completing task.

- [ ] **Step 1: Add a "Calendar" link to `NAV_LINKS` in `src/components/Navbar.tsx`**

Replace:

```tsx
const NAV_LINKS = [
  { href: "/explore", label: "Browse" },
  { href: "/library", label: "My List" },
] as const;
```

with:

```tsx
const NAV_LINKS = [
  { href: "/explore", label: "Browse" },
  { href: "/library", label: "My List" },
  { href: "/calendar", label: "Calendar" },
] as const;
```

`NAV_LINKS` is mapped identically into both the desktop nav and the mobile nav menu elsewhere in this file — no further changes needed, both pick up the new link automatically.

- [ ] **Step 2: Verify with type-check and lint**

Run: `npm run type-check && npm run lint`
Expected: both exit 0.

- [ ] **Step 3: Manual browser verification**

Run: `npx next dev --webpack -p 3000`
- Confirm "Calendar" appears in both the desktop and mobile nav, links to `/calendar`, and the active-link styling (`navbar-link-active`) applies when on that page (existing `pathname === href` logic, no changes needed there).

- [ ] **Step 4: Update `docs/phases.md`**

Under Phase 2.2, check off the items this slice ships, leaving "Release notifications" unchecked with a pointer to Phase 2.3:

```markdown
### 2.2 Calendar / Schedule
- [x] Weekly release calendar
- [x] "Airing today" section on home
- [ ] Release notifications (in-app) — deferred to 2.3 (Notifications), avoids building the mechanism twice
- [x] Calendar view (week/month toggle)
```

(Match the exact surrounding formatting already in the file — only the checkbox states and the one inline note change.)

- [ ] **Step 5: Commit**

```bash
git add src/components/Navbar.tsx docs/phases.md
git commit -m "feat: add calendar link to navbar, update phases.md"
```
