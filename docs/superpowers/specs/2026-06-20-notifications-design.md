# Notifications — Design Spec

**Status:** Approved
**Scope:** Phase 2.3 (`docs/phases.md` § "Notifications") — MVP slice. Third Phase 2 sub-project, started after Calendar & Schedule (2.2) merged. Also closes the "Release notifications (in-app)" item that was deliberately deferred out of 2.2's scope to avoid building this mechanism twice.

## Goal

An in-app notification system: detect when a tracked series gets a new episode/chapter (TV, Anime, Manga, Manhwa — not Light Novel/Webtoon this round), surface it via a navbar bell icon with an unread-count badge, and let users mute the whole feature with one toggle.

## Out of Scope (deferred)

- **Granular per-type notification preferences** — there's only one notification type in this slice (new episode/chapter), so a "which types to notify" settings screen would be premature. A single `notificationsEnabled` on/off toggle covers this round; revisit when a second notification type exists.
- **Real-time/push delivery** (web push, email, websockets) — purely in-app, polled/fetched on demand.
- **Light Novel / Webtoon episode detection** — these are AniList-sourced but not `contentType === "ANIME"`, and AniList's `chapters`/`episodes` fields are less reliable for them; out of scope this round, same kind of exclusion the Calendar feature already made for unreliable sources.
- **A new cron/background-job system** — this entire design deliberately avoids one (see Architecture). Real background pre-fetching remains Phase 2.5's scope.
- **Per-episode granularity** (e.g. "Episode 1120 released," with exact episode metadata) — the message is derived from a before/after total-count delta, not a per-episode event feed. Good enough for "something new dropped," not a full episode-by-episode log.

## Current State

- `Series` rows are **never updated after creation**. `getOrCreateSeriesFromCompoundId()` (`src/lib/db/series-cache.ts:167-182`) does `findUnique` → return as-is if it exists; `prisma.series.update` is never called anywhere in the app (confirmed by search — only Prisma's generated client boilerplate comments mention `.update()`). This means `Series.totalEpisodes`/`totalChapters` is effectively a permanent snapshot from first-add time — exactly the "last known count" this feature needs to diff against, with no new field required.
- AniList's existing detail GraphQL queries already request `episodes`/`chapters` fields (`src/lib/api/anilist.ts:83-84,103-104,122-123`) — the field names and types are already proven, just need a new lightweight query that asks for only those two fields by id.
- `src/lib/api/mangadex.ts`'s `getMangaChapters(mangaId, page, limit)` (`:172-185`) already returns `{ chapters, total }` — `total` is exactly what's needed; calling it with `limit=1` keeps the response small while still returning the real `total`.
- TMDB's detail endpoint includes `number_of_episodes`, not currently fetched by any lightweight function (the heavy `getTvSeriesDetail` fetches it as part of a much bigger payload, same situation `getTvNextAirDate` solved for air dates in 2.2).
- This app deploys to **Cloudflare Workers** (`CLAUDE.md`'s Tech Stack table) — a serverless, request-scoped runtime. A Server Component that `await`s a slow batch of external API calls blocks that page's entire render, and there is no safe way to keep work running after a response starts streaming back. Any "check on page visit" design must trigger the check as its own independent request, not piggyback on another page's render path. *(This constraint was missed in the first draft of this spec and caught by an external architecture review before any code was written — see the design-review note below.)*
- `Navbar.tsx` is a `"use client"` component already calling `useSession()` (`:17`) — the cleanest place for a self-gating notification trigger to read session state, no new server-side session plumbing needed.
- `src/app/layout.tsx` is a plain (non-async) Server Component — `SessionProvider` wraps the whole tree, so any client component anywhere under it can call `useSession()` directly.

## Design History Note

The first draft of this spec proposed triggering the episode-count check via `await checkForNewEpisodes(userId)` inside a root-level Server Component (e.g. `layout.tsx`). An external architecture review (conducted by the user via a separate AI tool, written to `docs/superpowers/specs/2026-06-20-notifications-architecture-review.md`) caught two real problems before any code was written: (1) this would block every page load by the full duration of a potentially 20-50-item external API batch whenever the throttle window expired, and (2) Cloudflare Workers' serverless execution model doesn't support fire-and-forget background work after a response begins — the container can freeze immediately after responding. The fix (adopted below): move the check entirely into its own `POST /api/notifications/check` route, triggered by a non-blocking `fetch()` from an invisible client component mounted once in the layout. No page's render path ever depends on the check completing.

## Design

### 1. Schema changes

```prisma
model User {
  // ...existing fields...
  notificationsEnabled    Boolean   @default(true)
  lastNotificationCheckAt DateTime?

  notifications Notification[]
}

model Notification {
  id            String   @id @default(cuid())
  userId        String
  seriesId      String
  libraryItemId String?
  message       String
  isRead        Boolean  @default(false)
  createdAt     DateTime @default(now())

  user   User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  series Series  @relation(fields: [seriesId], references: [id], onDelete: Cascade)

  @@index([userId, isRead])
  @@index([userId, createdAt])
}
```

`Series` gains a back-relation `notifications Notification[]` (required by Prisma for the relation above) — no new scalar fields on `Series` itself; `totalEpisodes`/`totalChapters` already serve as the "last known count."

`libraryItemId` is stored for traceability but deliberately has no FK relation (a library item can be removed after the notification is created — the notification should still display using the denormalized `message` and the `series` relation, not break or cascade-delete just because the user removed the item from their library).

### 2. New/reused API client functions

`src/lib/api/tmdb.ts` — new, mirrors `getTvNextAirDate`'s shape exactly:

```ts
export async function getTvEpisodeCount(tmdbId: string): Promise<number | null> {
  if (!API_KEY) return null;
  try {
    const detail = await tmdbFetch<{ number_of_episodes: number | null }>(`/tv/${tmdbId}`, {
      language: "en-US",
    });
    return detail.number_of_episodes ?? null;
  } catch (err) {
    console.error(`[TMDB] Failed to fetch episode count for series ${tmdbId}:`, err);
    return null;
  }
}
```

`src/lib/api/anilist.ts` — new, mirrors `getAnimeNextAiringEpisode`'s shape:

```ts
const EPISODE_COUNT_QUERY = `
  query ($id: Int) {
    Media(id: $id, type: ANIME) {
      episodes
    }
  }
`;

export async function getAnimeEpisodeCount(anilistId: string): Promise<number | null> {
  try {
    const data = await anilistFetch<{ Media: { episodes: number | null } }>(EPISODE_COUNT_QUERY, {
      id: Number(anilistId),
    });
    return data.Media?.episodes ?? null;
  } catch (err) {
    console.error(`[AniList] Failed to fetch episode count for media ${anilistId}:`, err);
    return null;
  }
}
```

`src/lib/api/mangadex.ts` — no new function. `checkForNewEpisodes` calls the existing `getMangaChapters(mangaId, 1, 1)` and reads `.total`.

### 3. `src/lib/notifications.ts`

```ts
import { prisma } from "./db/prisma";
import { getTvEpisodeCount } from "./api/tmdb";
import { getAnimeEpisodeCount } from "./api/anilist";
import { getMangaChapters } from "./api/mangadex";

const THROTTLE_MS = 60 * 60 * 1000; // 1 hour, matches the existing revalidate:3600 ISR convention

export async function checkForNewEpisodes(userId: string): Promise<{ created: number }> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.notificationsEnabled) return { created: 0 };

  if (user.lastNotificationCheckAt) {
    const elapsed = Date.now() - user.lastNotificationCheckAt.getTime();
    if (elapsed < THROTTLE_MS) return { created: 0 };
  }

  const items = await prisma.libraryItem.findMany({
    where: { userId },
    include: { series: true },
  });

  const results = await Promise.all(
    items.map(async (item): Promise<number> => {
      const { series } = item;
      try {
        let newCount: number | null = null;
        let field: "totalEpisodes" | "totalChapters" = "totalEpisodes";

        if (series.source === "tmdb") {
          newCount = await getTvEpisodeCount(series.externalId);
          field = "totalEpisodes";
        } else if (series.source === "anilist" && series.contentType === "ANIME") {
          newCount = await getAnimeEpisodeCount(series.externalId);
          field = "totalEpisodes";
        } else if (series.source === "mangadex") {
          const { total } = await getMangaChapters(series.externalId, 1, 1);
          newCount = total;
          field = "totalChapters";
        } else {
          return 0;
        }

        const oldCount = field === "totalEpisodes" ? series.totalEpisodes : series.totalChapters;
        if (newCount !== null && oldCount !== null && newCount > oldCount) {
          const unit = field === "totalEpisodes" ? "episode" : "chapter";
          await prisma.$transaction([
            prisma.notification.create({
              data: {
                userId,
                seriesId: series.id,
                libraryItemId: item.id,
                message: `${series.title} just reached ${unit} ${newCount}`,
              },
            }),
            prisma.series.update({
              where: { id: series.id },
              data: { [field]: newCount },
            }),
          ]);
          return 1;
        }
      } catch (err) {
        console.error(`[Notifications] Failed to check ${series.source}-${series.externalId}:`, err);
      }
      return 0;
    })
  );

  const created = results.reduce((acc, val) => acc + val, 0);

  await prisma.user.update({
    where: { id: userId },
    data: { lastNotificationCheckAt: new Date() },
  });

  return { created };
}
```

All library items are checked in parallel via `Promise.all` — matching `getUpcomingReleases`'s existing pattern from the Calendar feature (2.2) exactly, rather than a sequential `for...of` that would make the route's latency scale linearly with library size (and risk a slow/timed-out individual call delaying every other item behind it). Each item's `try/catch` is independent, so one failure never blocks or fails the others, same resilience guarantee as before. No write-conflict risk between parallel branches: each item updates a *different* `Series` row (a user has at most one `LibraryItem` per series, enforced by the existing `@@unique([userId, seriesId])` constraint), and the `Notification` create + `Series` count update for a given item still happen in one `$transaction` so they can never drift apart for that item.

*(This loop-parallelization fix was caught by a second external architecture review, written to `notifications_loop_optimization.md` at the repo root, before any code was written — same review process the trigger-mechanism fix above went through.)*

### 4. API routes

- `src/app/api/notifications/check/route.ts` — `POST`, `requireAuth()`, calls `checkForNewEpisodes(user.id)`, returns `successResponse({ created })`. Wrapped in `compose(withErrorHandler, withRateLimit)` like every other route.
- `src/app/api/notifications/route.ts` — `GET`, `requireAuth()`, returns the user's 20 most recent notifications (`orderBy: { createdAt: "desc" }, take: 20`, including `series` for title/href construction) plus an `unreadCount`.
- `src/app/api/notifications/mark-read/route.ts` — `PATCH`, `requireAuth()`, `prisma.notification.updateMany({ where: { userId: user.id, isRead: false }, data: { isRead: true } })`, returns `successResponse({ updated })`.
- `src/app/api/notifications/settings/route.ts` — `PATCH`, `requireAuth()`, body `{ notificationsEnabled: boolean }` (Zod-validated), `prisma.user.update({ where: { id: user.id }, data: { notificationsEnabled } })`, returns `successResponse({ notificationsEnabled })`.

### 5. `src/components/NotificationTrigger.tsx`

```tsx
"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";

export default function NotificationTrigger() {
  const { data: session } = useSession();

  useEffect(() => {
    if (!session?.user) return;
    fetch("/api/notifications/check", { method: "POST" }).catch(() => {
      // silent — a failed background check is invisible to the user, not an error state
    });
  }, [session?.user]);

  return null;
}
```

Self-gates via `useSession()` — never fires for logged-out visitors. Mounted once in `src/app/layout.tsx`, inside the existing `<SessionProvider>`, as a sibling of `<Navbar />`.

### 6. `src/components/NotificationBell.tsx`

A new, separate client component (not inlined into `Navbar.tsx` — matches the established precedent of keeping `Navbar.tsx` as a thin shell that composes dedicated components, e.g. how `AiringTodaySection` was kept separate from `page.tsx`). Imported into `Navbar.tsx` and rendered in the `.navbar-auth` block, only when `session?.user` exists (same conditional that already gates the sign-out button):

- Bell icon button with a small unread-count badge (only rendered when `unreadCount > 0`).
- Clicking it: toggles a dropdown open AND fires `PATCH /api/notifications/mark-read` (per the read-state design decision — opening the list marks everything currently in it as read), then refetches the list so the badge clears.
- Dropdown lists each notification's `message`, linking to `/series/{series.source}-{series.externalId}`.
- **The `notificationsEnabled` toggle lives at the bottom of this dropdown** (a small "Notifications: On/Off" row) — the simplest possible placement that doesn't require a new settings page for a single boolean. Calls a new route, `PATCH /api/notifications/settings`, body `{ notificationsEnabled: boolean }`, validated with a small Zod schema and following the exact same `compose(withErrorHandler, withRateLimit)` + `requireAuth()` route pattern every other route in this codebase already uses.

## Error Handling

- Per-item check failures inside `checkForNewEpisodes`'s loop are caught individually — one bad external call never aborts the batch (same resilience pattern as `getUpcomingReleases`).
- `notificationsEnabled === false` → immediate no-op, `lastNotificationCheckAt` is **not** updated, so re-enabling the toggle doesn't have to wait out a throttle window that accrued while it was off.
- The `Notification` create + `Series` count update are transactional — never partially applied.
- `NotificationTrigger`'s fetch failure is silently swallowed — never surfaces as a user-visible error.
- All three new routes require auth via the existing `requireAuth()` pattern; `NotificationTrigger` never even attempts the request when there's no session.

## Testing / Verification

No automated test framework in this repo. Verification is `npm run type-check` + `npm run lint` + manual browser check:
- Manually lower a test series's stored `Series.totalEpisodes` (or `totalChapters`) via Prisma Studio, trigger `POST /api/notifications/check`, confirm a `Notification` row appears and the `Series` row's count is updated back up.
- Toggle `notificationsEnabled` off via the dropdown, confirm a forced check (even past the throttle window) creates nothing.
- Confirm the bell badge count matches actual unread rows, and opening the dropdown clears it (both visually and in the DB).
- Confirm `NotificationTrigger` fires no network request when logged out (check the Network tab on a logged-out page load).
- Confirm a second `POST /api/notifications/check` within the same hour returns `{ created: 0 }` immediately with no external API calls in the network tab.
- `docs/phases.md`'s "In-app notification system," "New episode/chapter alerts for tracked series," "Notification preferences (which types to notify)," and "Notification bell icon with badge count" items get checked off — "preferences" interpreted as the single on/off toggle per this slice's explicit scope decision. The "Release notifications (in-app)" item under § 2.2 also gets checked off, with a note pointing here.
