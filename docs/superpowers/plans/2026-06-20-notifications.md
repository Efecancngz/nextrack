# Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Phase 2.3 MVP — an in-app notification system that detects new episodes/chapters for TV/Anime/Manga/Manhwa library items, surfaces them via a navbar bell icon with an unread badge, and lets users mute the feature with one toggle. Also closes the "Release notifications (in-app)" item deferred from Phase 2.2.

**Architecture:** Two new lightweight API client functions (`getTvEpisodeCount`, `getAnimeEpisodeCount`) plus the existing `getMangaChapters` feed `checkForNewEpisodes()` — a parallel (`Promise.all`) per-library-item diff against each `Series` row's stored count, writing a `Notification` row and updating the stored count transactionally whenever a count increases. The check runs entirely inside its own `POST /api/notifications/check` route, never inside a page's render path — an invisible client component fires a non-blocking request to it on mount, avoiding both render-blocking latency and Cloudflare Workers' lack of fire-and-forget background execution.

**Tech Stack:** Next.js 16 App Router (Server Components + client components), Prisma + PostgreSQL, Zod, TypeScript, TMDB REST API, AniList GraphQL API, MangaDex REST API. No test framework configured in this repo — verification is `npm run type-check` + `npm run lint` + manual browser check.

## Global Constraints

- **No new cron/background-job infrastructure.** The check is triggered per-visit (throttled to once per hour per user), never by a scheduled job. Real background pre-fetching stays Phase 2.5's scope.
- **The check must never block a page render.** It lives entirely inside `POST /api/notifications/check`, triggered by a non-blocking `fetch()` from a client component — never `await`ed inside a Server Component on the render path. This app deploys to Cloudflare Workers (serverless, request-scoped); there is no safe way to run work after a response starts streaming back from a different request.
- **Episode/chapter detection covers TV (`tmdb`), Anime (`anilist` + `contentType === "ANIME"`), and Manga/Manhwa (`mangadex`) only.** Light Novel/Webtoon (AniList-sourced, non-`ANIME` content types) are explicitly out of scope this round.
- **All library items are checked regardless of status** (including `ON_HOLD`/`DROPPED`), consistent with the Calendar feature's same decision.
- **`checkForNewEpisodes` checks all of a user's library items in parallel via `Promise.all`**, not a sequential loop — matches `getUpcomingReleases`'s existing pattern, avoids latency scaling linearly with library size. Each item's check has its own `try/catch`; one failure never blocks or fails the others.
- **The `Notification` create and the `Series` count update for a given item happen in one `prisma.$transaction`** so they can never drift apart.
- **Preferences MVP scope is a single `notificationsEnabled` boolean** — no per-type preferences UI, since there's only one notification type this round.
- **Read-state model:** opening the bell dropdown marks all currently-listed notifications as read (fires `PATCH /api/notifications/mark-read`), not per-notification click-to-read.
- `npm run type-check` and `npm run lint` must be clean before every commit.
- No `git push` without explicit user instruction. Conventional Commits format for every commit message.
- This project's dev server has a known Turbopack bug on this path (non-ASCII `ü` in the directory name) — use `npx next dev --webpack -p 3000` for manual verification (port 3000 required — `NEXTAUTH_URL` is pinned to it).
- Local dev DB is Docker Postgres (`serietracker-db-1` container) — confirm `docker ps` shows it running before any manual verification.
- `prisma migrate dev` refuses to run in this non-interactive shell entirely (confirmed in two prior sub-projects). Use `prisma migrate diff --from-config-datasource prisma.config.ts --to-schema prisma/schema.prisma --script` to generate the SQL, hand-create the migration folder, then `prisma migrate deploy` to apply non-interactively.

---

## File Structure

New files:
- `src/lib/notifications.ts` — `checkForNewEpisodes()` (Task 3)
- `src/lib/validations/notifications.ts` — `updateNotificationSettingsSchema` (Task 3)
- `src/app/api/notifications/check/route.ts` — `POST` (Task 4)
- `src/app/api/notifications/route.ts` — `GET` (Task 4)
- `src/app/api/notifications/mark-read/route.ts` — `PATCH` (Task 4)
- `src/app/api/notifications/settings/route.ts` — `PATCH` (Task 4)
- `src/components/NotificationTrigger.tsx` — invisible client component (Task 5)
- `src/components/NotificationBell.tsx` — bell icon + dropdown client component (Task 5)

Modified files:
- `prisma/schema.prisma` — `Notification` model, `User.notificationsEnabled`/`lastNotificationCheckAt` (Task 1)
- `src/lib/api/tmdb.ts` — `getTvEpisodeCount()` (Task 2)
- `src/lib/api/anilist.ts` — `getAnimeEpisodeCount()` (Task 2)
- `src/app/layout.tsx` — render `<NotificationTrigger />` (Task 5)
- `src/components/Navbar.tsx` — render `<NotificationBell />` (Task 5)
- `src/app/globals.css` — bell/badge/dropdown CSS (Task 5)
- `docs/phases.md` — check off shipped items (Task 6)

---

### Task 1: Schema — `Notification` model + `User` fields

**Files:**
- Modify: `prisma/schema.prisma`

**Interfaces:**
- Produces: `Notification` model (`id`, `userId`, `seriesId`, `libraryItemId`, `message`, `isRead`, `createdAt`) and `User.notificationsEnabled: boolean` / `User.lastNotificationCheckAt: DateTime | null` on the Prisma client — every later task that reads/writes these can use them.

- [ ] **Step 1: Add fields to the `User` model**

In `prisma/schema.prisma`, find the `User` model and add the two new fields right after `updatedAt`, plus the new relation in the relations block:

```prisma
model User {
  id            String    @id @default(cuid())
  name          String?
  username      String?   @unique
  email         String    @unique
  emailVerified DateTime?
  image         String?
  passwordHash  String?   // null for OAuth-only users
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  notificationsEnabled    Boolean   @default(true)
  lastNotificationCheckAt DateTime?

  accounts      Account[]
  sessions      Session[]
  libraryItems  LibraryItem[]
  userRatings   UserRating[]
  notifications Notification[]

  @@index([email])
}
```

- [ ] **Step 2: Add the `notifications` back-relation to the `Series` model**

In `prisma/schema.prisma`, find the `Series` model and add `notifications Notification[]` to its relations block (next to the existing `libraryItems`/`userRatings`):

```prisma
  libraryItems    LibraryItem[]
  userRatings     UserRating[]
  notifications   Notification[]
```

- [ ] **Step 3: Add the `Notification` model**

Add this new model at the end of `prisma/schema.prisma`, after the `UserRating` model:

```prisma
// ─────────────────────────────────────────────────
// Notifications (new episode/chapter alerts)
// ─────────────────────────────────────────────────

model Notification {
  id            String   @id @default(cuid())
  userId        String
  seriesId      String
  libraryItemId String?
  message       String
  isRead        Boolean  @default(false)
  createdAt     DateTime @default(now())

  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  series Series @relation(fields: [seriesId], references: [id], onDelete: Cascade)

  @@index([userId, isRead])
  @@index([userId, createdAt])
}
```

`libraryItemId` deliberately has no FK relation — a library item can be removed after the notification is created, and the notification should keep displaying via its denormalized `message` and the `series` relation, not break or cascade-delete.

- [ ] **Step 4: Generate the migration SQL (non-interactive workaround)**

Run: `npx prisma migrate diff --from-config-datasource prisma.config.ts --to-schema prisma/schema.prisma --script`
Expected: prints `CREATE TABLE "Notification" (...)`, `ALTER TABLE "User" ADD COLUMN "notificationsEnabled" ...`, `ALTER TABLE "User" ADD COLUMN "lastNotificationCheckAt" ...`, plus `CREATE INDEX` statements and `ALTER TABLE "Notification" ADD CONSTRAINT ... FOREIGN KEY` statements.

- [ ] **Step 5: Create the migration folder and apply it**

```bash
TS=$(date -u +%Y%m%d%H%M%S)
mkdir -p "prisma/migrations/${TS}_add_notifications"
npx prisma migrate diff --from-config-datasource prisma.config.ts --to-schema prisma/schema.prisma --script > "prisma/migrations/${TS}_add_notifications/migration.sql"
npx prisma migrate deploy
```

Expected: `npx prisma migrate deploy` prints `Applying migration '<TS>_add_notifications'` followed by `All migrations have been successfully applied.`

- [ ] **Step 6: Regenerate the Prisma client**

Run: `npm run db:generate`
Expected: exits 0, `src/generated/prisma/` regenerated with `Notification` and the two new `User` fields.

- [ ] **Step 7: Verify with type-check**

Run: `npm run type-check`
Expected: exits 0 (no code references the new model/fields yet, this just confirms the generated client is valid).

- [ ] **Step 8: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: add Notification model and User notification fields"
```

---

### Task 2: Episode-count API client functions

**Files:**
- Modify: `src/lib/api/tmdb.ts`
- Modify: `src/lib/api/anilist.ts`

**Interfaces:**
- Produces: `getTvEpisodeCount(tmdbId: string): Promise<number | null>` from `tmdb.ts`; `getAnimeEpisodeCount(anilistId: string): Promise<number | null>` from `anilist.ts`. Both consumed by Task 3's `checkForNewEpisodes`.

Neither function has a consumer yet after this task — verification this round is type-check/lint only.

- [ ] **Step 1: Add `getTvEpisodeCount` to `src/lib/api/tmdb.ts`**

Add this function right after the existing `getTvNextAirDate` function:

```ts
/** Get the current total episode count for a TV series, or null if unavailable / API key unset */
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

- [ ] **Step 2: Add `getAnimeEpisodeCount` to `src/lib/api/anilist.ts`**

Add this at the end of the file, after the existing `getAnimeNextAiringEpisode` function:

```ts
const EPISODE_COUNT_QUERY = `
  query ($id: Int) {
    Media(id: $id, type: ANIME) {
      episodes
    }
  }
`;

/** Get the current total episode count for an anime, or null if unavailable */
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

- [ ] **Step 3: Verify**

Run: `npm run type-check && npm run lint`
Expected: both exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/lib/api/tmdb.ts src/lib/api/anilist.ts
git commit -m "feat: add episode-count API client functions"
```

---

### Task 3: Shared notification-check helper

**Files:**
- Create: `src/lib/notifications.ts`
- Create: `src/lib/validations/notifications.ts`

**Interfaces:**
- Consumes: `getTvEpisodeCount` from `@/lib/api/tmdb`, `getAnimeEpisodeCount` from `@/lib/api/anilist`, `getMangaChapters` from `@/lib/api/mangadex`, `prisma` from `@/lib/db/prisma` (Task 2, plus the already-existing `getMangaChapters`).
- Produces: `checkForNewEpisodes(userId: string): Promise<{ created: number }>` from `src/lib/notifications.ts`; `updateNotificationSettingsSchema` / `UpdateNotificationSettingsInput` from `src/lib/validations/notifications.ts`. Both consumed by Task 4's routes.

- [ ] **Step 1: Write `src/lib/validations/notifications.ts`**

```ts
import { z } from "zod";

export const updateNotificationSettingsSchema = z.object({
  notificationsEnabled: z.boolean(),
});

export type UpdateNotificationSettingsInput = z.infer<typeof updateNotificationSettingsSchema>;
```

- [ ] **Step 2: Write `src/lib/notifications.ts`**

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

- [ ] **Step 3: Verify**

Run: `npm run type-check && npm run lint`
Expected: both exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/lib/notifications.ts src/lib/validations/notifications.ts
git commit -m "feat: add checkForNewEpisodes notification-check helper"
```

---

### Task 4: API routes

**Files:**
- Create: `src/app/api/notifications/check/route.ts`
- Create: `src/app/api/notifications/route.ts`
- Create: `src/app/api/notifications/mark-read/route.ts`
- Create: `src/app/api/notifications/settings/route.ts`

**Interfaces:**
- Consumes: `checkForNewEpisodes` from `@/lib/notifications`, `updateNotificationSettingsSchema` from `@/lib/validations/notifications` (Task 3); `requireAuth` from `@/lib/auth/helpers`; `prisma` from `@/lib/db/prisma`; `successResponse`, `Responses` from `@/lib/utils/api-response`; `withErrorHandler`, `withRateLimit`, `compose` from `@/lib/utils/middleware`.
- Produces: `POST /api/notifications/check`, `GET /api/notifications`, `PATCH /api/notifications/mark-read`, `PATCH /api/notifications/settings` — all consumed by Task 5's UI components.

- [ ] **Step 1: Write `src/app/api/notifications/check/route.ts`**

```ts
import { requireAuth } from "@/lib/auth/helpers";
import { checkForNewEpisodes } from "@/lib/notifications";
import { successResponse } from "@/lib/utils/api-response";
import { withErrorHandler, withRateLimit, compose } from "@/lib/utils/middleware";

async function postHandler() {
  const user = await requireAuth();
  const result = await checkForNewEpisodes(user.id);
  return successResponse(result);
}

export const POST = compose(withErrorHandler, withRateLimit)(postHandler);
```

`postHandler` takes no parameters — it never reads the request — and TypeScript's structural typing allows a zero-arg function to satisfy `RouteHandler`'s wider signature (the caller passes `req`/`ctx`, the handler just ignores them). This avoids an unused-`req` lint warning rather than declaring a parameter that's never touched.

- [ ] **Step 2: Write `src/app/api/notifications/route.ts`**

```ts
import { prisma } from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth/helpers";
import { successResponse } from "@/lib/utils/api-response";
import { withErrorHandler, withRateLimit, compose } from "@/lib/utils/middleware";

async function getHandler() {
  const user = await requireAuth();

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: user.id },
      include: { series: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.notification.count({
      where: { userId: user.id, isRead: false },
    }),
  ]);

  return successResponse({ notifications, unreadCount });
}

export const GET = compose(withErrorHandler, withRateLimit)(getHandler);
```

- [ ] **Step 3: Write `src/app/api/notifications/mark-read/route.ts`**

```ts
import { prisma } from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth/helpers";
import { successResponse } from "@/lib/utils/api-response";
import { withErrorHandler, withRateLimit, compose } from "@/lib/utils/middleware";

async function patchHandler() {
  const user = await requireAuth();

  const result = await prisma.notification.updateMany({
    where: { userId: user.id, isRead: false },
    data: { isRead: true },
  });

  return successResponse({ updated: result.count });
}

export const PATCH = compose(withErrorHandler, withRateLimit)(patchHandler);
```

- [ ] **Step 4: Write `src/app/api/notifications/settings/route.ts`**

```ts
import { type NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth/helpers";
import { updateNotificationSettingsSchema } from "@/lib/validations/notifications";
import { successResponse, Responses } from "@/lib/utils/api-response";
import { withErrorHandler, withRateLimit, compose } from "@/lib/utils/middleware";

async function patchHandler(req: NextRequest) {
  const user = await requireAuth();

  const body = await req.json().catch(() => null);
  const parsed = updateNotificationSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return Responses.validationError(parsed.error.flatten().fieldErrors);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { notificationsEnabled: parsed.data.notificationsEnabled },
  });

  return successResponse({ notificationsEnabled: parsed.data.notificationsEnabled });
}

export const PATCH = compose(withErrorHandler, withRateLimit)(patchHandler);
```

- [ ] **Step 5: Verify**

Run: `npm run type-check && npm run lint`
Expected: both exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/notifications
git commit -m "feat: add notification API routes (check, list, mark-read, settings)"
```

---

### Task 5: UI components and wiring

**Files:**
- Create: `src/components/NotificationTrigger.tsx`
- Create: `src/components/NotificationBell.tsx`
- Modify: `src/app/layout.tsx`
- Modify: `src/components/Navbar.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: the 4 routes from Task 4.
- Produces: the rendered bell icon + dropdown — this task's deliverable is independently browser-testable end to end, the first in this plan.

- [ ] **Step 1: Write `src/components/NotificationTrigger.tsx`**

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

- [ ] **Step 2: Write `src/components/NotificationBell.tsx`**

```tsx
"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

interface NotificationItem {
  id: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  series: { source: string; externalId: string };
}

export default function NotificationBell() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  async function fetchNotifications() {
    const res = await fetch("/api/notifications");
    const data = await res.json();
    if (data.success) {
      setNotifications(data.data.notifications);
      setUnreadCount(data.data.unreadCount);
    }
  }

  useEffect(() => {
    if (!session?.user) return;
    fetchNotifications();
  }, [session?.user]);

  async function handleToggleOpen() {
    const next = !open;
    setOpen(next);
    if (next && unreadCount > 0) {
      await fetch("/api/notifications/mark-read", { method: "PATCH" });
      await fetchNotifications();
    }
  }

  async function handleToggleEnabled() {
    const next = !notificationsEnabled;
    setNotificationsEnabled(next);
    await fetch("/api/notifications/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificationsEnabled: next }),
    });
  }

  if (!session?.user) return null;

  return (
    <div className="notification-bell-wrapper">
      <button
        type="button"
        className="notification-bell-button"
        onClick={handleToggleOpen}
        aria-label="Notifications"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && <span className="notification-bell-badge">{unreadCount}</span>}
      </button>

      {open && (
        <div className="notification-dropdown" role="menu">
          {notifications.length === 0 ? (
            <p className="notification-dropdown-empty">No notifications yet.</p>
          ) : (
            notifications.map((n) => (
              <Link
                key={n.id}
                href={`/series/${n.series.source}-${n.series.externalId}`}
                className="notification-dropdown-item"
                onClick={() => setOpen(false)}
              >
                {n.message}
              </Link>
            ))
          )}
          <button
            type="button"
            className="notification-dropdown-toggle"
            onClick={handleToggleEnabled}
          >
            Notifications: {notificationsEnabled ? "On" : "Off"}
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Wire `NotificationTrigger` into `src/app/layout.tsx`**

Add the import after the existing `SessionProvider` import:

```tsx
import { SessionProvider } from "@/components/providers/session-provider";
import NotificationTrigger from "@/components/NotificationTrigger";
```

Replace:

```tsx
        <SessionProvider>
          <Navbar />

          <main className="flex-1">
            {children}
          </main>

          <Footer />
        </SessionProvider>
```

with:

```tsx
        <SessionProvider>
          <Navbar />
          <NotificationTrigger />

          <main className="flex-1">
            {children}
          </main>

          <Footer />
        </SessionProvider>
```

- [ ] **Step 4: Wire `NotificationBell` into `src/components/Navbar.tsx`**

Add the import after the existing imports:

```tsx
import NotificationBell from "./NotificationBell";
```

In the `.navbar-auth` block, add `<NotificationBell />` right before the existing `{session?.user ? (` conditional block (so it renders alongside, not replacing, the sign-out/profile-link UI):

```tsx
        <div className="navbar-auth">
          <NotificationBell />
          {session?.user ? (
```

- [ ] **Step 5: Append CSS to `src/app/globals.css`**

Insert this immediately after the `.navbar-auth { ... }` rule:

```css
.notification-bell-wrapper {
  position: relative;
}

.notification-bell-button {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
}
.notification-bell-button:hover {
  background: var(--color-bg-elevated);
  color: var(--color-text-primary);
}

.notification-bell-badge {
  position: absolute;
  top: 2px;
  right: 2px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 999px;
  background: var(--color-danger, #ef4444);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.notification-dropdown {
  position: absolute;
  top: calc(100% + var(--space-2));
  right: 0;
  width: 320px;
  max-height: 400px;
  overflow-y: auto;
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-elevated);
  z-index: 10;
  display: flex;
  flex-direction: column;
}

.notification-dropdown-empty {
  padding: var(--space-4);
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  text-align: center;
}

.notification-dropdown-item {
  display: block;
  padding: var(--space-3);
  border-bottom: 1px solid var(--color-border);
  font-size: 0.8125rem;
  color: var(--color-text-primary);
  text-decoration: none;
}
.notification-dropdown-item:hover {
  background: var(--color-bg-elevated);
}

.notification-dropdown-toggle {
  padding: var(--space-3);
  background: none;
  border: none;
  border-top: 1px solid var(--color-border);
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  cursor: pointer;
  text-align: left;
}
.notification-dropdown-toggle:hover {
  color: var(--color-text-primary);
}
```

- [ ] **Step 6: Verify with type-check and lint**

Run: `npm run type-check && npm run lint`
Expected: both exit 0.

- [ ] **Step 7: Manual browser verification**

Run: `npx next dev --webpack -p 3000` (confirm `docker ps` shows `serietracker-db-1` running first)
- Sign in, confirm the bell icon renders in the navbar with no badge initially (or matching actual unread count).
- Open the browser's Network tab, reload the page — confirm `POST /api/notifications/check` fires once on load.
- Manually lower a library item's `Series.totalEpisodes` via `npx prisma studio`, then trigger another check (e.g. by calling `fetch('/api/notifications/check', {method:'POST'})` from the browser console, bypassing the 1-hour throttle by also clearing `lastNotificationCheckAt` in Prisma Studio) — confirm a notification appears in the dropdown and the badge count increments.
- Click the bell to open the dropdown — confirm the badge clears and the notification shows `isRead: true` in Prisma Studio.
- Click the "Notifications: On/Off" toggle — confirm it flips and persists (reload the page, reopen the dropdown, confirm the label matches what was set).
- Sign out, reload the home page — confirm no bell icon renders and no `POST /api/notifications/check` request fires (check the Network tab).

- [ ] **Step 8: Commit**

```bash
git add src/components/NotificationTrigger.tsx src/components/NotificationBell.tsx src/app/layout.tsx src/components/Navbar.tsx src/app/globals.css
git commit -m "feat: add notification bell UI and wire into navbar/layout"
```

---

### Task 6: Docs

**Files:**
- Modify: `docs/phases.md`

**Interfaces:**
- Consumes: nothing further from earlier tasks — this is a documentation-only final task.
- Produces: nothing consumed elsewhere.

- [ ] **Step 1: Update `docs/phases.md`**

Under Phase 2.3, check off the items this slice ships:

```markdown
### 2.3 Notifications
- [x] In-app notification system
- [x] New episode/chapter alerts for tracked series
- [x] Notification preferences (which types to notify) — single on/off toggle this round; per-type granularity deferred until a second notification type exists
- [x] Notification bell icon with badge count
```

Under Phase 2.2, check off the previously-deferred item:

```markdown
### 2.2 Calendar / Schedule
- [x] Weekly release calendar
- [x] "Airing today" section on home
- [x] Release notifications (in-app) — shipped as part of Phase 2.3
- [x] Calendar view (week/month toggle)
```

(Match the exact surrounding formatting already in the file — only the checkbox states and the one inline note on the 2.3 preferences line change.)

- [ ] **Step 2: Commit**

```bash
git add docs/phases.md
git commit -m "docs: check off Phase 2.3 notifications and deferred 2.2 item"
```
