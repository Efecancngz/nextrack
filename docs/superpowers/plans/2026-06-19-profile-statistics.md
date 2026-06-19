# Profile & Statistics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Phase 2.1 MVP — a public `/profile/[username]` page showing a user's library stats (series by content type, episodes watched / chapters read, average rating given) and a favorites showcase, plus a favorite-toggle star on library cards/rows.

**Architecture:** A Prisma schema addition (`LibraryItem.isFavorite`) backs a new public Server Component route that fetches three parallel Prisma queries and renders three new presentational components. The favorite toggle reuses the existing `PATCH /api/library/[id]` endpoint with a second, alternate Zod schema, matching how the route already separates concerns by request shape rather than by sub-resource.

**Tech Stack:** Next.js 16 App Router (Server Components + client components), Prisma + PostgreSQL (Neon/local), Zod, TypeScript. No test framework configured in this repo — verification is `npm run type-check` + `npm run lint` + manual browser check.

## Global Constraints

- This branch (`feat/profile-statistics`) is based on `main` at commit `cf49e88` (Phase 1 close-out fully merged) — `LibraryItemCard.tsx`/`LibraryItemRow.tsx`/`LibraryBoard.tsx` are already in their final Phase 1 state (status dropdown, grid/list toggle) before this plan's changes begin.
- Episodes-watched / chapters-read stats are the **sum of current progress** (`currentEpisode`/`currentChapter`) across all of a user's library items — the MAL/AniList model, not a separate lifetime counter. No new tracking mechanism.
- "Total series by type" is tallied in JS from a `{ series: { contentType } }` projection — Prisma's `groupBy` cannot group across a relation in one query, and this is a per-user dataset of at most a few hundred rows, so JS tallying is the deliberate, scoped choice (not a general pattern to repeat elsewhere).
- The profile page has **no auth requirement and no privacy toggle** — every profile is public, every visitor sees the same stats. Do not add a `requireAuth()` call to `src/app/profile/[username]/page.tsx`.
- `npm run type-check` and `npm run lint` must be clean before every commit.
- No `git push` without explicit user instruction. Conventional Commits format for every commit message.
- This project's dev server has a known Turbopack bug on this path (non-ASCII `ü` in the directory name) — use `npx next dev --webpack` for manual verification, not `npm run dev`.
- Reuse existing CSS/components wherever they already fit: `.card`, `.badge`/`CONTENT_TYPE_BADGE_CLASS`, `.poster-card*`, `.series-grid`, `.btn`/`.btn-secondary`/`.btn-sm`, `.library-card-remove` (as the base style for the new favorite button), `SeriesCard` (for the favorites grid — `LibraryEntry.series`, typed as `SeriesCard` from `@/types/series`, is a structural superset of the `SearchResult` prop `SeriesCard` the component expects, so it can be passed directly).

---

## File Structure

New files:
- `src/types/profile.ts` — `ProfileStatsData` type (Task 4)
- `src/components/ProfileHeader.tsx` — avatar/name/username/joined date (Task 4)
- `src/components/ProfileStats.tsx` — stat cards (Task 4)
- `src/components/ProfileFavorites.tsx` — favorites grid, reuses `SeriesCard` (Task 4)
- `src/app/profile/[username]/page.tsx` — public Server Component route (Task 5)

Modified files:
- `prisma/schema.prisma` — add `LibraryItem.isFavorite` (Task 1)
- `src/lib/validations/library.ts` — add `updateFavoriteSchema` (Task 2)
- `src/app/api/library/[id]/route.ts` — `patchHandler` tries both schemas (Task 2)
- `src/types/library.ts` — `LibraryEntry.isFavorite: boolean` (Task 2)
- `src/app/library/page.tsx` — map `isFavorite` into `LibraryEntry` (Task 2)
- `src/components/LibraryItemCard.tsx` — favorite star button (Task 3)
- `src/components/LibraryItemRow.tsx` — favorite star button (Task 3)
- `src/app/globals.css` — favorite button styles (Task 3), profile page styles (Task 4)
- `src/components/Navbar.tsx` — `@username` becomes a link (Task 6)
- `docs/phases.md` — check off shipped items (Task 6)

---

### Task 1: Schema — `LibraryItem.isFavorite`

**Files:**
- Modify: `prisma/schema.prisma`

**Interfaces:**
- Produces: `LibraryItem.isFavorite: boolean` (default `false`) on the Prisma model and generated client — every later task that reads/writes `prisma.libraryItem` can use this field.

- [ ] **Step 1: Add the field to the `LibraryItem` model**

In `prisma/schema.prisma`, find the `LibraryItem` model and add `isFavorite` right after `status`:

```prisma
model LibraryItem {
  id        String        @id @default(cuid())
  userId    String
  seriesId  String
  status    LibraryStatus @default(PLAN_TO_WATCH)
  isFavorite Boolean      @default(false)

  // Progress tracking
  currentSeason   Int?   // For TV series
  currentEpisode  Int?   // S2E5 → season=2, episode=5
  currentChapter  Int?   // Ch.45
  currentVolume   Int?   // Vol.3

  startedAt   DateTime?
  completedAt DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  series Series @relation(fields: [seriesId], references: [id], onDelete: Cascade)

  @@unique([userId, seriesId])
  @@index([userId])
  @@index([userId, status])
}
```

- [ ] **Step 2: Generate and apply the migration**

Run: `npm run db:migrate -- --name add_library_item_favorite`
Expected: Prisma creates a new folder under `prisma/migrations/` (e.g. `prisma/migrations/<timestamp>_add_library_item_favorite/migration.sql`) containing `ALTER TABLE "LibraryItem" ADD COLUMN "isFavorite" BOOLEAN NOT NULL DEFAULT false;`, applies it to the local database, and exits 0.

- [ ] **Step 3: Regenerate the Prisma client**

Run: `npm run db:generate`
Expected: exits 0, `src/generated/prisma/` is regenerated with `isFavorite` on the `LibraryItem` type.

- [ ] **Step 4: Verify with type-check**

Run: `npm run type-check`
Expected: exits 0 (no code references `isFavorite` yet, so this just confirms the generated client itself is valid).

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: add isFavorite field to LibraryItem"
```

---

### Task 2: Favorite write path (API + types)

**Files:**
- Modify: `src/lib/validations/library.ts`
- Modify: `src/app/api/library/[id]/route.ts`
- Modify: `src/types/library.ts`
- Modify: `src/app/library/page.tsx`

**Interfaces:**
- Consumes: `LibraryItem.isFavorite` from Task 1.
- Produces: `updateFavoriteSchema`/`UpdateFavoriteInput` (consumed by Task 2's own route change); `PATCH /api/library/[id]` now accepts `{ isFavorite: boolean }` as an alternate body shape to `{ status }`; `LibraryEntry.isFavorite: boolean` (consumed by Task 3's UI and Task 5's profile page).

- [ ] **Step 1: Add `updateFavoriteSchema` to `src/lib/validations/library.ts`**

Add this after `updateLibraryStatusSchema` (and its type export), before `updateProgressSchema`:

```ts
export const updateFavoriteSchema = z.object({
  isFavorite: z.boolean(),
});

export type UpdateFavoriteInput = z.infer<typeof updateFavoriteSchema>;
```

- [ ] **Step 2: Update `patchHandler` in `src/app/api/library/[id]/route.ts` to accept either shape**

Replace the existing `patchHandler` function body:

```ts
import { type NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth/helpers";
import { updateLibraryStatusSchema, updateFavoriteSchema } from "@/lib/validations/library";
import { AppError } from "@/lib/utils/app-error";
import { successResponse, Responses } from "@/lib/utils/api-response";
import { withErrorHandler, withRateLimit, compose } from "@/lib/utils/middleware";

async function getOwnedItem(id: string, userId: string) {
  const item = await prisma.libraryItem.findUnique({ where: { id } });
  if (!item || item.userId !== userId) {
    throw AppError.notFound("Library item");
  }
  return item;
}

async function patchHandler(
  req: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) {
  const user = await requireAuth();
  const { id } = await params;

  await getOwnedItem(id, user.id);

  const body = await req.json().catch(() => null);

  const statusParsed = updateLibraryStatusSchema.safeParse(body);
  if (statusParsed.success) {
    const updated = await prisma.libraryItem.update({
      where: { id },
      data: { status: statusParsed.data.status },
    });
    return successResponse(updated);
  }

  const favoriteParsed = updateFavoriteSchema.safeParse(body);
  if (favoriteParsed.success) {
    const updated = await prisma.libraryItem.update({
      where: { id },
      data: { isFavorite: favoriteParsed.data.isFavorite },
    });
    return successResponse(updated);
  }

  return Responses.validationError(statusParsed.error.flatten().fieldErrors);
}

async function deleteHandler(
  req: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) {
  const user = await requireAuth();
  const { id } = await params;

  await getOwnedItem(id, user.id);

  await prisma.libraryItem.delete({ where: { id } });

  return successResponse({ id });
}

export const PATCH = compose(withErrorHandler, withRateLimit)(patchHandler);
export const DELETE = compose(withErrorHandler, withRateLimit)(deleteHandler);
```

- [ ] **Step 3: Add `isFavorite` to `LibraryEntry` in `src/types/library.ts`**

In the `LibraryEntry` interface, add the field right after `status`:

```ts
export interface LibraryEntry {
  id: string;
  userId: string;
  seriesId: string;
  status: LibraryStatus;
  isFavorite: boolean;

  // Progress
  currentSeason?: number;
  currentEpisode?: number;
  currentChapter?: number;
  currentVolume?: number;

  startedAt?: string;    // ISO date string
  completedAt?: string;

  createdAt: string;
  updatedAt: string;

  // Joined series data
  series: SeriesCard;

  // User's personal rating (if exists)
  userScore?: number;
}
```

- [ ] **Step 4: Map `isFavorite` in `src/app/library/page.tsx`**

In the `entries` mapping, add `isFavorite: item.isFavorite,` right after `status: item.status,`:

```ts
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
```

- [ ] **Step 5: Verify**

Run: `npm run type-check && npm run lint`
Expected: both exit 0. (`LibraryItemCard`/`LibraryItemRow` don't read `isFavorite` yet — TypeScript won't complain since it's an additive field — so no visual change is expected until Task 3.)

- [ ] **Step 6: Commit**

```bash
git add src/lib/validations/library.ts src/app/api/library/[id]/route.ts src/types/library.ts src/app/library/page.tsx
git commit -m "feat: add favorite write path to library PATCH endpoint"
```

---

### Task 3: Favorite toggle UI

**Files:**
- Modify: `src/components/LibraryItemCard.tsx`
- Modify: `src/components/LibraryItemRow.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: `LibraryEntry.isFavorite` and the `PATCH /api/library/[id]` favorite path from Task 2.
- Produces: a working favorite star on both the grid card and the list row — this is the task's own testable deliverable (toggle in the browser, confirm it persists across reload).

- [ ] **Step 1: Add the favorite toggle to `LibraryItemCard.tsx`**

Add a `handleToggleFavorite` function right after `handleStatusChange`:

```tsx
  async function handleToggleFavorite() {
    setBusy(true);
    try {
      const res = await fetch(`/api/library/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFavorite: !entry.isFavorite }),
      });
      const data = await res.json();
      if (data.success) {
        onUpdated({ ...entry, isFavorite: !entry.isFavorite });
      }
    } finally {
      setBusy(false);
    }
  }
```

Add the star button inside `.library-card-actions`, right before the `{confirmingRemove ? ... : ...}` block:

```tsx
      <div className="library-card-actions">
        {progress && (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleIncrement}
            disabled={busy}
          >
            +1 {progress.label} ({progress.value})
          </button>
        )}
        <button
          type="button"
          className={`library-card-favorite ${entry.isFavorite ? "library-card-favorite-active" : ""}`}
          onClick={handleToggleFavorite}
          disabled={busy}
          aria-label={entry.isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill={entry.isFavorite ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </button>
        {confirmingRemove ? (
```

- [ ] **Step 2: Add the same toggle to `LibraryItemRow.tsx`**

Add the identical `handleToggleFavorite` function right after `handleStatusChange` in `src/components/LibraryItemRow.tsx`:

```tsx
  async function handleToggleFavorite() {
    setBusy(true);
    try {
      const res = await fetch(`/api/library/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFavorite: !entry.isFavorite }),
      });
      const data = await res.json();
      if (data.success) {
        onUpdated({ ...entry, isFavorite: !entry.isFavorite });
      }
    } finally {
      setBusy(false);
    }
  }
```

Add the star button inside `.library-row-actions`, right before the `{confirmingRemove ? ... : ...}` block:

```tsx
      <div className="library-row-actions">
        {progress && (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleIncrement}
            disabled={busy}
          >
            +1 {progress.label} ({progress.value})
          </button>
        )}
        <button
          type="button"
          className={`library-card-favorite ${entry.isFavorite ? "library-card-favorite-active" : ""}`}
          onClick={handleToggleFavorite}
          disabled={busy}
          aria-label={entry.isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill={entry.isFavorite ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </button>
        {confirmingRemove ? (
```

- [ ] **Step 3: Add CSS for `.library-card-favorite`**

In `src/app/globals.css`, insert this immediately after the `.library-card-remove { ... }` rule (before `.library-card-confirm`):

```css
.library-card-favorite {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-bg-surface);
  cursor: pointer;
  color: var(--color-text-secondary);
}
.library-card-favorite-active {
  color: var(--color-star);
  border-color: var(--color-star);
}
```

- [ ] **Step 4: Verify with type-check and lint**

Run: `npm run type-check && npm run lint`
Expected: both exit 0.

- [ ] **Step 5: Manual browser verification**

Run: `npx next dev --webpack` (not `npm run dev` — Turbopack bug on this path)
- Sign in, go to `/library`, click the star on a card → it fills in and turns amber (`--color-star`); reload the page → state persists (confirms the PATCH actually wrote `isFavorite`).
- Toggle to list view, confirm the same star button works on `LibraryItemRow`.
- Click the star again to un-favorite → it returns to outline state.

- [ ] **Step 6: Commit**

```bash
git add src/components/LibraryItemCard.tsx src/components/LibraryItemRow.tsx src/app/globals.css
git commit -m "feat: add favorite toggle to library card and row"
```

---

### Task 4: Profile components

**Files:**
- Create: `src/types/profile.ts`
- Create: `src/components/ProfileHeader.tsx`
- Create: `src/components/ProfileStats.tsx`
- Create: `src/components/ProfileFavorites.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: `ContentType`, `CONTENT_TYPE_LABELS`, `CONTENT_TYPE_BADGE_CLASS` from `@/types/common`; `SeriesCard` type from `@/types/series`; `SeriesCard` component (default export) from `@/components/SeriesCard`.
- Produces: `ProfileStatsData` type; `ProfileHeader` (props `{ displayName: string | null; username: string; image: string | null; joinedAt: string }`), `ProfileStats` (props `{ stats: ProfileStatsData }`), `ProfileFavorites` (props `{ favorites: SeriesCard[] }`) components — all consumed by Task 5's route.

These components render against typed props only — they are not wired to real data until Task 5, so they can't be visually verified by themselves beyond type-check/lint passing. That's expected; Task 5 is the first end-to-end-testable deliverable.

- [ ] **Step 1: Write `src/types/profile.ts`**

```ts
import type { ContentType } from "./common";

export interface ProfileStatsData {
  byContentType: Record<ContentType, number>;
  episodesWatched: number;
  chaptersRead: number;
  averageRating: number | null;
}
```

- [ ] **Step 2: Write `src/components/ProfileHeader.tsx`**

```tsx
import React from "react";
import Image from "next/image";

interface ProfileHeaderProps {
  displayName: string | null;
  username: string;
  image: string | null;
  joinedAt: string;
}

export default function ProfileHeader({ displayName, username, image, joinedAt }: ProfileHeaderProps) {
  const joined = new Date(joinedAt).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="profile-header">
      <div className="profile-avatar">
        {image ? (
          <Image src={image} alt={username} fill sizes="80px" className="profile-avatar-img" />
        ) : (
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
          </svg>
        )}
      </div>
      <div className="profile-meta">
        <h1 className="profile-display-name">{displayName || `@${username}`}</h1>
        <p className="profile-username">@{username}</p>
        <p className="profile-joined">Joined {joined}</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Write `src/components/ProfileStats.tsx`**

```tsx
import React from "react";
import { CONTENT_TYPE_LABELS, CONTENT_TYPE_BADGE_CLASS, type ContentType } from "@/types/common";
import type { ProfileStatsData } from "@/types/profile";

interface ProfileStatsProps {
  stats: ProfileStatsData;
}

const CONTENT_TYPES: ContentType[] = ["TV_SERIES", "ANIME", "MANGA", "MANHWA", "LIGHT_NOVEL", "WEBTOON"];

export default function ProfileStats({ stats }: ProfileStatsProps) {
  return (
    <div className="profile-stats-grid">
      {CONTENT_TYPES.map((type) => (
        <div key={type} className="card profile-stat-card">
          <span className={`badge ${CONTENT_TYPE_BADGE_CLASS[type]}`}>{CONTENT_TYPE_LABELS[type]}</span>
          <span className="profile-stat-value">{stats.byContentType[type] ?? 0}</span>
        </div>
      ))}
      <div className="card profile-stat-card">
        <span className="profile-stat-label">Episodes Watched</span>
        <span className="profile-stat-value">{stats.episodesWatched}</span>
      </div>
      <div className="card profile-stat-card">
        <span className="profile-stat-label">Chapters Read</span>
        <span className="profile-stat-value">{stats.chaptersRead}</span>
      </div>
      <div className="card profile-stat-card">
        <span className="profile-stat-label">Average Rating Given</span>
        <span className="profile-stat-value">
          {stats.averageRating !== null ? stats.averageRating.toFixed(1) : "—"}
        </span>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Write `src/components/ProfileFavorites.tsx`**

```tsx
import React from "react";
import SeriesCardComponent from "./SeriesCard";
import type { SeriesCard } from "@/types/series";

interface ProfileFavoritesProps {
  favorites: SeriesCard[];
}

export default function ProfileFavorites({ favorites }: ProfileFavoritesProps) {
  if (favorites.length === 0) {
    return <p className="profile-favorites-empty">No favorites yet.</p>;
  }

  return (
    <div className="series-grid">
      {favorites.map((series) => (
        <SeriesCardComponent key={`${series.source}-${series.externalId}`} series={series} />
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Add CSS for the profile page**

In `src/app/globals.css`, insert this immediately after the `.library-content-tabs { ... }` rule (before `/* ─── Auth Pages ─── */`):

```css
/* ─── Profile Page ─── */
.profile-header {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  margin-bottom: var(--space-8);
}

.profile-avatar {
  position: relative;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  overflow: hidden;
  background: var(--color-bg-elevated);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-muted);
  flex-shrink: 0;
}

.profile-avatar-img {
  object-fit: cover;
}

.profile-display-name {
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 700;
}

.profile-username {
  color: var(--color-text-secondary);
  font-size: 0.9375rem;
}

.profile-joined {
  color: var(--color-text-muted);
  font-size: 0.8125rem;
  margin-top: var(--space-1);
}

.profile-section-title {
  font-family: var(--font-display);
  font-size: 1.125rem;
  font-weight: 700;
  margin: var(--space-8) 0 var(--space-4);
}

.profile-stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: var(--space-3);
}

.profile-stat-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-4);
}

.profile-stat-label {
  font-size: 0.8125rem;
  color: var(--color-text-secondary);
}

.profile-stat-value {
  font-family: var(--font-display);
  font-size: 1.75rem;
  font-weight: 700;
}

.profile-favorites-empty {
  color: var(--color-text-muted);
  font-size: 0.9375rem;
}
```

- [ ] **Step 6: Verify**

Run: `npm run type-check && npm run lint`
Expected: both exit 0.

- [ ] **Step 7: Commit**

```bash
git add src/types/profile.ts src/components/ProfileHeader.tsx src/components/ProfileStats.tsx src/components/ProfileFavorites.tsx src/app/globals.css
git commit -m "feat: add profile page components"
```

---

### Task 5: Profile page route

**Files:**
- Create: `src/app/profile/[username]/page.tsx`

**Interfaces:**
- Consumes: `ProfileHeader`, `ProfileStats`, `ProfileFavorites` from Task 4; `ProfilePageData`/`ProfileStatsData` from Task 4; `prisma` from `@/lib/db/prisma`.
- Produces: the public `/profile/[username]` route — this task's deliverable is independently browser-testable end to end.

- [ ] **Step 1: Write `src/app/profile/[username]/page.tsx`**

```tsx
import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import ProfileHeader from "@/components/ProfileHeader";
import ProfileStats from "@/components/ProfileStats";
import ProfileFavorites from "@/components/ProfileFavorites";
import type { ContentType } from "@/types/common";
import type { ProfileStatsData } from "@/types/profile";
import type { SeriesCard } from "@/types/series";

export const dynamic = "force-dynamic";

interface ProfilePageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { username } = await params;
  return {
    title: `@${username}`,
    description: `${username}'s series tracking profile`,
  };
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { username } = await params;

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) {
    notFound();
  }

  const [itemsByType, progressSums, ratingAvg, favoriteItems] = await Promise.all([
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
    prisma.libraryItem.findMany({
      where: { userId: user.id, isFavorite: true },
      include: { series: true },
    }),
  ]);

  const byContentType = itemsByType.reduce((acc, item) => {
    const type = item.series.contentType as ContentType;
    acc[type] = (acc[type] ?? 0) + 1;
    return acc;
  }, {} as Record<ContentType, number>);

  const stats: ProfileStatsData = {
    byContentType,
    episodesWatched: progressSums._sum.currentEpisode ?? 0,
    chaptersRead: progressSums._sum.currentChapter ?? 0,
    averageRating: ratingAvg._avg.score,
  };

  const favorites: SeriesCard[] = favoriteItems.map((item) => ({
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
  }));

  return (
    <div className="container-content page-enter">
      <ProfileHeader
        displayName={user.name}
        username={user.username ?? username}
        image={user.image}
        joinedAt={user.createdAt.toISOString()}
      />

      <h2 className="profile-section-title">Statistics</h2>
      <ProfileStats stats={stats} />

      <h2 className="profile-section-title">Favorites</h2>
      <ProfileFavorites favorites={favorites} />
    </div>
  );
}
```

- [ ] **Step 2: Verify with type-check and lint**

Run: `npm run type-check && npm run lint`
Expected: both exit 0.

- [ ] **Step 3: Manual browser verification**

Run: `npx next dev --webpack`
- Visit `/profile/<your-username>` directly by URL (Navbar isn't linked yet — that's Task 6) — confirm stats match what's in `/library` (spot-check counts and sums), and any favorited items (from Task 3's manual test) appear in the favorites grid.
- Visit `/profile/<a-username-with-an-empty-library>` (or a fresh signup) — confirm all stats show `0`, favorites shows "No favorites yet.", no errors.
- Visit `/profile/this-user-does-not-exist` — confirm the existing 404 page renders.
- If you have a user with zero ratings, confirm "Average Rating Given" shows `—`, not `0`.

- [ ] **Step 4: Commit**

```bash
git add src/app/profile
git commit -m "feat: add public profile page route"
```

---

### Task 6: Navbar link and docs

**Files:**
- Modify: `src/components/Navbar.tsx`
- Modify: `docs/phases.md`

**Interfaces:**
- Consumes: the `/profile/[username]` route from Task 5.
- Produces: nothing further consumed by other tasks — this is the final, integration-completing task.

- [ ] **Step 1: Link the desktop `@username` span in `src/components/Navbar.tsx`**

Replace:

```tsx
              <span className="navbar-user-email">
                {session.user.username ? `@${session.user.username}` : (session.user.name || session.user.email)}
              </span>
```

with:

```tsx
              {session.user.username ? (
                <Link href={`/profile/${session.user.username}`} className="navbar-user-email">
                  @{session.user.username}
                </Link>
              ) : (
                <span className="navbar-user-email">{session.user.name || session.user.email}</span>
              )}
```

- [ ] **Step 2: Link the mobile `@username` span**

Replace:

```tsx
                  <span className="navbar-user-email block mb-2 text-sm opacity-75">
                    {session.user.username ? `@${session.user.username}` : (session.user.name || session.user.email)}
                  </span>
```

with:

```tsx
                  {session.user.username ? (
                    <Link
                      href={`/profile/${session.user.username}`}
                      className="navbar-user-email block mb-2 text-sm opacity-75"
                      onClick={() => setMobileOpen(false)}
                    >
                      @{session.user.username}
                    </Link>
                  ) : (
                    <span className="navbar-user-email block mb-2 text-sm opacity-75">
                      {session.user.name || session.user.email}
                    </span>
                  )}
```

- [ ] **Step 3: Verify with type-check and lint**

Run: `npm run type-check && npm run lint`
Expected: both exit 0.

- [ ] **Step 4: Manual browser verification**

Run: `npx next dev --webpack`
- Sign in, click your `@username` in the navbar (desktop) → lands on your own `/profile/[username]`.
- Open the mobile menu, click `@username` there → same result, menu closes.

- [ ] **Step 5: Update `docs/phases.md`**

Under Phase 2.1, check off the items this slice ships, and leave the deferred ones unchecked with a note:

```markdown
### 2.1 Profile & Statistics
- [x] User profile page
- [ ] Watch/read statistics dashboard
  - [x] Total series by type
  - [x] Episodes watched / chapters read
  - [x] Average rating given
  - [ ] Genre distribution chart
  - [ ] Monthly activity graph
- [x] Favorite series showcase
- [ ] Activity history timeline
```

(Match the exact surrounding formatting already in the file — only the checkbox states change.)

- [ ] **Step 6: Commit**

```bash
git add src/components/Navbar.tsx docs/phases.md
git commit -m "feat: link navbar username to profile page, update phases.md"
```
