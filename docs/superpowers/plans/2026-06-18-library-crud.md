# Library CRUD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let signed-in users add series to a personal library with a status (Watching/Plan to Watch/Completed/On Hold/Dropped), track episode/chapter progress, rate series 1-10 with an optional review, and manage all of it from a real `/library` page — replacing the current empty-state placeholder and disabled "Add to Library" button.

**Architecture:** Routes call `prisma` directly (no service/repository layer — matches the rest of this codebase), wrapped in the existing `compose(withErrorHandler, withRateLimit)(handler)` pattern. A new `getOrCreateSeriesFromCompoundId()` helper bridges the external-API world (`{source}-{externalId}` ids) and the DB world (`Series.id`) by upserting a `Series` cache row the first time a user touches a series they haven't looked at before via library/rating actions.

**Tech Stack:** Next.js 16 App Router, Prisma (`src/generated/prisma`), Zod, Auth.js v5 (`requireAuth()`/`getCurrentUser()` from `src/lib/auth/helpers.ts`), no test framework (none configured in this repo — verification is `npm run type-check` + `npm run lint` + manual `curl`/browser checks, same as the Auth wiring plan).

## Global Constraints

- No `lib/services`/`lib/repositories` layer — routes call `prisma` directly, per `CLAUDE.md`'s documented current-state (not target) architecture.
- All mutating routes wrapped in `compose(withErrorHandler, withRateLimit)(handler)`, matching `src/app/api/auth/register/route.ts`.
- Ownership failures (a `LibraryItem` exists but belongs to another user) return `AppError.notFound()`, never `forbidden()` — avoids leaking existence, per the approved design spec.
- No per-episode rating, no streaming/hosting of any content — this app only tracks a progress number and one overall 1-10 rating per series.
- No new fields (`isFavorite`, `waitLanguage`, `customSearchKeyword`) — they don't exist in `prisma/schema.prisma` and are explicitly deferred (see `docs/superpowers/specs/2026-06-18-library-crud-design.md`).
- Rating lives at `PUT /api/series/[id]/rating` (compound id), not `/api/ratings` — confirmed deviation from `docs/api-contracts.md`, which should be updated to match once this ships (not part of this plan).
- Progress updates live at `PATCH /api/library/[id]/progress`, separate from `PATCH /api/library/[id]` (status only) — matches `docs/api-contracts.md`.
- `npm run type-check` and `npm run lint` must be clean before every commit.
- No `git push` without explicit user instruction. Conventional Commits format for every commit message.
- This project's dev server has a known Turbopack bug on this path (non-ASCII `ü`) — use `npx next dev --webpack` for manual verification, not `npm run dev`.
- Docker Postgres (`docker compose up -d db`) must be running for any DB-touching verification.

---

## File Structure

New files:
- `src/lib/validations/library.ts` — Zod schemas for all library/rating request bodies.
- `src/lib/db/series-cache.ts` — `parseCompoundId()` + `getOrCreateSeriesFromCompoundId()`.
- `src/app/api/library/route.ts` — `GET` (list), `POST` (add).
- `src/app/api/library/[id]/route.ts` — `PATCH` (status), `DELETE` (remove).
- `src/app/api/library/[id]/progress/route.ts` — `PATCH` (progress fields).
- `src/app/api/series/[id]/rating/route.ts` — `PUT` (upsert rating).
- `src/components/AddToLibraryButton.tsx` — status-picker button for the series detail page.
- `src/components/RatingWidget.tsx` — 1-10 + review widget for the series detail page.
- `src/components/LibraryBoard.tsx` — client tab state + grid for `/library`.
- `src/components/LibraryItemCard.tsx` — one card in the library grid (progress +1, remove-with-confirm).

Modified files:
- `src/app/series/[id]/page.tsx` — look up the signed-in user's existing `LibraryItem`/`UserRating` for this series, replace the disabled button with `AddToLibraryButton`, add `RatingWidget`.
- `src/app/library/page.tsx` — becomes an async server component fetching the user's `LibraryItem`s and rendering `LibraryBoard`.
- `src/app/globals.css` — new selectors for the status-picker menu, rating widget, library card actions.

---

### Task 1: Library validation schemas

**Files:**
- Create: `src/lib/validations/library.ts`

**Interfaces:**
- Produces: `addToLibrarySchema` (`{ seriesId: string; status: LibraryStatus }`), `AddToLibraryInput` type; `updateLibraryStatusSchema` (`{ status: LibraryStatus }`), `UpdateLibraryStatusInput` type; `updateProgressSchema` (`{ currentSeason?, currentEpisode?, currentChapter?, currentVolume? }`, all `number().int().min(0)`, refined to require at least one), `UpdateProgressInput` type; `rateSeriesSchema` (`{ score: number (int, 1-10); review?: string (max 2000) }`), `RateSeriesInput` type.

- [ ] **Step 1: Write the file**

```typescript
import { z } from "zod";

const libraryStatusEnum = z.enum([
  "WATCHING",
  "PLAN_TO_WATCH",
  "COMPLETED",
  "ON_HOLD",
  "DROPPED",
]);

export const addToLibrarySchema = z.object({
  seriesId: z.string().min(1, "seriesId is required"),
  status: libraryStatusEnum.default("PLAN_TO_WATCH"),
});

export type AddToLibraryInput = z.infer<typeof addToLibrarySchema>;

export const updateLibraryStatusSchema = z.object({
  status: libraryStatusEnum,
});

export type UpdateLibraryStatusInput = z.infer<typeof updateLibraryStatusSchema>;

export const updateProgressSchema = z
  .object({
    currentSeason: z.number().int().min(0).optional(),
    currentEpisode: z.number().int().min(0).optional(),
    currentChapter: z.number().int().min(0).optional(),
    currentVolume: z.number().int().min(0).optional(),
  })
  .refine(
    (data) =>
      data.currentSeason !== undefined ||
      data.currentEpisode !== undefined ||
      data.currentChapter !== undefined ||
      data.currentVolume !== undefined,
    { message: "At least one progress field is required" }
  );

export type UpdateProgressInput = z.infer<typeof updateProgressSchema>;

export const rateSeriesSchema = z.object({
  score: z.number().int().min(1, "Score must be between 1 and 10").max(10, "Score must be between 1 and 10"),
  review: z.string().max(2000, "Review must be 2000 characters or fewer").optional(),
});

export type RateSeriesInput = z.infer<typeof rateSeriesSchema>;
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run type-check`
Expected: exits 0, no errors mentioning `src/lib/validations/library.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/validations/library.ts
git commit -m "feat: add library and rating validation schemas"
```

---

### Task 2: Series cache helper

**Files:**
- Create: `src/lib/db/series-cache.ts`

**Interfaces:**
- Consumes: `getTvSeriesDetail`, `tmdbImage`, `mapTmdbStatus` from `@/lib/api/tmdb`; `getMangaChapters` from `@/lib/api/mangadex`; `prisma` from `@/lib/db/prisma`; `AppError` from `@/lib/utils/app-error`.
- Produces: `parseCompoundId(compoundId: string): { source: string; externalId: string }` (throws `AppError.badRequest()` on malformed input); `getOrCreateSeriesFromCompoundId(compoundId: string): Promise<SeriesRow>` where `SeriesRow` is whatever `prisma.series.findUnique`/`create` returns (let TypeScript infer it — don't hand-write the type).

This duplicates the per-source detail-fetch logic already in `src/app/api/series/[id]/route.ts` rather than extracting a shared helper — accepted scope tradeoff documented in `docs/superpowers/specs/2026-06-18-library-crud-design.md` (no service layer to share it through yet in this codebase).

- [ ] **Step 1: Write the file**

```typescript
import { getTvSeriesDetail, tmdbImage, mapTmdbStatus } from "@/lib/api/tmdb";
import { getMangaChapters } from "@/lib/api/mangadex";
import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/utils/app-error";
import type { ContentType, ContentStatus } from "@/types/common";
import type { PlatformAvailability } from "@/types/series";

export function parseCompoundId(compoundId: string): { source: string; externalId: string } {
  const dashIndex = compoundId.indexOf("-");
  if (dashIndex === -1) {
    throw AppError.badRequest("Invalid series ID format. Expected: {source}-{externalId}");
  }
  const source = compoundId.substring(0, dashIndex);
  const externalId = compoundId.substring(dashIndex + 1);
  if (!externalId) {
    throw AppError.badRequest("Missing external ID");
  }
  return { source, externalId };
}

interface SeriesFields {
  contentType: ContentType;
  status: ContentStatus;
  title: string;
  titleOriginal?: string;
  titleRomaji?: string;
  synopsis?: string;
  coverImage?: string;
  bannerImage?: string;
  genres: string[];
  tags: string[];
  year?: number;
  totalEpisodes?: number;
  totalChapters?: number;
  totalVolumes?: number;
  ratingExternal?: number;
  ratingTmdb?: number;
  ratingAniList?: number;
  platforms: PlatformAvailability[];
}

const ANILIST_DETAIL_QUERY = `
  query MediaDetail($id: Int) {
    Media(id: $id) {
      id
      title { romaji english native }
      format
      status
      description(asHtml: false)
      coverImage { extraLarge large }
      bannerImage
      startDate { year }
      genres
      tags { name rank }
      episodes
      chapters
      volumes
      averageScore
      meanScore
    }
  }
`;

interface AniListDetailResponse {
  Media: {
    title: { romaji: string; english?: string; native?: string };
    format: string;
    status: string;
    description?: string;
    coverImage: { extraLarge?: string; large: string };
    bannerImage?: string;
    startDate: { year?: number };
    genres: string[];
    tags: { name: string; rank: number }[];
    episodes?: number;
    chapters?: number;
    volumes?: number;
    averageScore?: number;
  };
}

async function fetchAniListFields(externalId: string): Promise<SeriesFields> {
  const res = await fetch("https://graphql.anilist.co", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query: ANILIST_DETAIL_QUERY, variables: { id: Number(externalId) } }),
    next: { revalidate: 3600 },
  });

  const json = (await res.json()) as { data?: AniListDetailResponse };
  const media = json.data?.Media;
  if (!media) throw AppError.notFound("AniList media");

  const formatMap: Record<string, ContentType> = {
    TV: "ANIME", TV_SHORT: "ANIME", MOVIE: "ANIME", SPECIAL: "ANIME",
    OVA: "ANIME", ONA: "ANIME", MUSIC: "ANIME", MANGA: "MANGA",
    NOVEL: "LIGHT_NOVEL", ONE_SHOT: "MANGA",
  };
  const statusMap: Record<string, ContentStatus> = {
    FINISHED: "COMPLETED", RELEASING: "ONGOING", NOT_YET_RELEASED: "UPCOMING",
    CANCELLED: "CANCELLED", HIATUS: "HIATUS",
  };

  return {
    contentType: formatMap[media.format] || "ANIME",
    status: statusMap[media.status] || "ONGOING",
    title: media.title.english || media.title.romaji,
    titleOriginal: media.title.native,
    titleRomaji: media.title.romaji,
    synopsis: media.description?.replace(/<[^>]*>/g, "") || undefined,
    coverImage: media.coverImage.extraLarge || media.coverImage.large,
    bannerImage: media.bannerImage,
    year: media.startDate.year,
    genres: media.genres,
    tags: media.tags.filter((t) => t.rank >= 60).map((t) => t.name),
    totalEpisodes: media.episodes,
    totalChapters: media.chapters,
    totalVolumes: media.volumes,
    ratingExternal: media.averageScore ? media.averageScore / 10 : undefined,
    ratingAniList: media.averageScore ? media.averageScore / 10 : undefined,
    platforms: [],
  };
}

async function fetchSeriesFields(source: string, externalId: string): Promise<SeriesFields> {
  switch (source) {
    case "tmdb": {
      const { detail, platforms } = await getTvSeriesDetail(externalId);
      const rating = detail.vote_average && detail.vote_average > 0 ? detail.vote_average : undefined;
      return {
        contentType: "TV_SERIES",
        status: mapTmdbStatus(detail.status || ""),
        title: detail.name || "Unknown",
        titleOriginal: detail.original_name !== detail.name ? detail.original_name : undefined,
        synopsis: detail.overview,
        coverImage: tmdbImage(detail.poster_path),
        bannerImage: tmdbImage(detail.backdrop_path, "w780"),
        year: detail.first_air_date ? new Date(detail.first_air_date).getFullYear() : undefined,
        genres: detail.genres?.map((g) => g.name) || [],
        tags: detail.keywords?.results?.map((k) => k.name) || [],
        totalEpisodes: detail.number_of_episodes,
        ratingExternal: rating,
        ratingTmdb: rating,
        platforms,
      };
    }
    case "anilist":
      return fetchAniListFields(externalId);
    case "mangadex": {
      const chapters = await getMangaChapters(externalId, 1, 10);
      return {
        contentType: "MANGA",
        status: "ONGOING",
        title: "Manga",
        genres: [],
        tags: [],
        totalChapters: chapters.total,
        platforms: [],
      };
    }
    default:
      throw AppError.notFound("Series source");
  }
}

export async function getOrCreateSeriesFromCompoundId(compoundId: string) {
  const { source, externalId } = parseCompoundId(compoundId);

  const existing = await prisma.series.findUnique({
    where: { externalId_source: { externalId, source } },
  });
  if (existing) return existing;

  const fields = await fetchSeriesFields(source, externalId);

  return prisma.series.create({
    data: {
      externalId,
      source,
      contentType: fields.contentType,
      status: fields.status,
      title: fields.title,
      titleOriginal: fields.titleOriginal,
      titleRomaji: fields.titleRomaji,
      synopsis: fields.synopsis,
      coverImage: fields.coverImage,
      bannerImage: fields.bannerImage,
      genres: fields.genres,
      tags: fields.tags,
      year: fields.year,
      totalEpisodes: fields.totalEpisodes,
      totalChapters: fields.totalChapters,
      totalVolumes: fields.totalVolumes,
      ratingExternal: fields.ratingExternal,
      ratingTmdb: fields.ratingTmdb,
      ratingAniList: fields.ratingAniList,
      platforms: fields.platforms,
    },
  });
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run type-check`
Expected: exits 0, no errors mentioning `src/lib/db/series-cache.ts`.

- [ ] **Step 3: Manual verification (requires `docker compose up -d db` running and a migrated DB)**

Run a one-off script to exercise both branches (cache miss then cache hit):

```bash
node -e "
require('ts-node/register');
const { getOrCreateSeriesFromCompoundId } = require('./src/lib/db/series-cache.ts');
(async () => {
  const first = await getOrCreateSeriesFromCompoundId('tmdb-1399');
  console.log('first:', first.id, first.title);
  const second = await getOrCreateSeriesFromCompoundId('tmdb-1399');
  console.log('second (should be same id):', second.id === first.id);
  process.exit(0);
})();
"
```

If `ts-node` isn't installed, instead write a temporary route at `src/app/api/_debug/series-cache/route.ts` that calls the function and returns the result via `successResponse`, hit it twice with `curl http://localhost:3000/api/_debug/series-cache` (`next dev --webpack` running), confirm the second call's `id` matches the first, then delete the temporary route before committing.

Expected: both calls succeed, return the same `Series.id`, and `prisma.series.findMany()` (e.g. via `npx prisma studio`) shows exactly one row for `tmdb-1399`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/db/series-cache.ts
git commit -m "feat: add series cache helper for library/rating routes"
```

---

### Task 3: GET/POST /api/library

**Files:**
- Create: `src/app/api/library/route.ts`

**Interfaces:**
- Consumes: `requireAuth()` from `@/lib/auth/helpers` (returns `{ id: string; ... }`, throws on no session); `addToLibrarySchema` from Task 1; `getOrCreateSeriesFromCompoundId` from Task 2; `prisma` from `@/lib/db/prisma`; `AppError`, `Responses`, `successResponse`, `compose`, `withErrorHandler`, `withRateLimit` (all existing).
- Produces: `GET /api/library` (optional `?status=` query), `POST /api/library` (body `{ seriesId, status }`, returns `201` with `{ id, status, seriesId }`).

- [ ] **Step 1: Write the file**

```typescript
import { type NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth/helpers";
import { getOrCreateSeriesFromCompoundId } from "@/lib/db/series-cache";
import { addToLibrarySchema } from "@/lib/validations/library";
import { AppError } from "@/lib/utils/app-error";
import { successResponse, Responses } from "@/lib/utils/api-response";
import { withErrorHandler, withRateLimit, compose } from "@/lib/utils/middleware";
import { Prisma } from "@/generated/prisma/client";
import type { LibraryStatus } from "@/types/common";

async function getHandler(req: NextRequest) {
  const user = await requireAuth();
  const statusFilter = req.nextUrl.searchParams.get("status") as LibraryStatus | null;

  const items = await prisma.libraryItem.findMany({
    where: {
      userId: user.id,
      ...(statusFilter ? { status: statusFilter } : {}),
    },
    include: { series: true },
    orderBy: { updatedAt: "desc" },
  });

  return successResponse(items);
}

async function postHandler(req: NextRequest) {
  const user = await requireAuth();
  const body = await req.json().catch(() => null);
  const parsed = addToLibrarySchema.safeParse(body);

  if (!parsed.success) {
    return Responses.validationError(parsed.error.flatten().fieldErrors);
  }

  const { seriesId, status } = parsed.data;
  const series = await getOrCreateSeriesFromCompoundId(seriesId);

  try {
    const item = await prisma.libraryItem.create({
      data: { userId: user.id, seriesId: series.id, status },
    });
    return successResponse(item, 201);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw AppError.conflict("This series is already in your library");
    }
    throw err;
  }
}

export const GET = compose(withErrorHandler, withRateLimit)(getHandler);
export const POST = compose(withErrorHandler, withRateLimit)(postHandler);
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run type-check`
Expected: exits 0.

- [ ] **Step 3: Manual verification**

With `docker compose up -d db` running and `npx next dev --webpack` started, sign in via the existing credentials flow to get a session cookie (same `curl` technique as the Auth plan's reports — `/api/auth/csrf` then `/api/auth/callback/credentials` with a cookie jar), then:

```bash
curl -b cookies.txt -c cookies.txt -X POST http://localhost:3000/api/library \
  -H "Content-Type: application/json" \
  -d '{"seriesId":"tmdb-1399","status":"WATCHING"}'
```

Expected: `201` with `{ "success": true, "data": { "id": "...", "status": "WATCHING", "seriesId": "...", ... } }`.

```bash
curl -b cookies.txt -X POST http://localhost:3000/api/library \
  -H "Content-Type: application/json" \
  -d '{"seriesId":"tmdb-1399","status":"WATCHING"}'
```

Expected: `409` (re-adding the same series).

```bash
curl -b cookies.txt http://localhost:3000/api/library
curl -b cookies.txt "http://localhost:3000/api/library?status=WATCHING"
```

Expected: both `200`, first lists the item, second still lists it (status matches); `?status=COMPLETED` returns an empty array.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/library/route.ts
git commit -m "feat: add GET/POST /api/library endpoints"
```

---

### Task 4: PATCH/DELETE /api/library/[id]

**Files:**
- Create: `src/app/api/library/[id]/route.ts`

**Interfaces:**
- Consumes: `requireAuth()`, `updateLibraryStatusSchema` from Task 1, `prisma`, `AppError`, `Responses`, `successResponse`, middleware HOFs.
- Produces: `PATCH /api/library/[id]` (body `{ status }`), `DELETE /api/library/[id]`.

- [ ] **Step 1: Write the file**

```typescript
import { type NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth/helpers";
import { updateLibraryStatusSchema } from "@/lib/validations/library";
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
  const parsed = updateLibraryStatusSchema.safeParse(body);
  if (!parsed.success) {
    return Responses.validationError(parsed.error.flatten().fieldErrors);
  }

  const updated = await prisma.libraryItem.update({
    where: { id },
    data: { status: parsed.data.status },
  });

  return successResponse(updated);
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

- [ ] **Step 2: Verify it compiles**

Run: `npm run type-check`
Expected: exits 0.

- [ ] **Step 3: Manual verification**

Using the library item id created in Task 3's verification (call it `$ID`):

```bash
curl -b cookies.txt -X PATCH http://localhost:3000/api/library/$ID \
  -H "Content-Type: application/json" -d '{"status":"COMPLETED"}'
```

Expected: `200`, `data.status` is `"COMPLETED"`.

```bash
curl -b cookies.txt -X PATCH http://localhost:3000/api/library/nonexistent-id \
  -H "Content-Type: application/json" -d '{"status":"COMPLETED"}'
```

Expected: `404`.

```bash
curl -b cookies.txt -X DELETE http://localhost:3000/api/library/$ID
curl -b cookies.txt -X DELETE http://localhost:3000/api/library/$ID
```

Expected: first `200`, second `404` (already deleted).

- [ ] **Step 4: Commit**

```bash
git add "src/app/api/library/[id]/route.ts"
git commit -m "feat: add PATCH/DELETE /api/library/[id] endpoints"
```

---

### Task 5: PATCH /api/library/[id]/progress

**Files:**
- Create: `src/app/api/library/[id]/progress/route.ts`

**Interfaces:**
- Consumes: `requireAuth()`, `updateProgressSchema` from Task 1, `prisma`, `AppError`, `Responses`, middleware HOFs. Reuses the same ownership-check shape as Task 4 (duplicated locally — these are two separate route files in Next's App Router and can't share a helper without a new shared module, which is out of scope for this plan).
- Produces: `PATCH /api/library/[id]/progress` (body: any of `currentSeason`/`currentEpisode`/`currentChapter`/`currentVolume`).

- [ ] **Step 1: Write the file**

```typescript
import { type NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth/helpers";
import { updateProgressSchema } from "@/lib/validations/library";
import { AppError } from "@/lib/utils/app-error";
import { successResponse, Responses } from "@/lib/utils/api-response";
import { withErrorHandler, withRateLimit, compose } from "@/lib/utils/middleware";

async function patchHandler(
  req: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) {
  const user = await requireAuth();
  const { id } = await params;

  const item = await prisma.libraryItem.findUnique({ where: { id } });
  if (!item || item.userId !== user.id) {
    throw AppError.notFound("Library item");
  }

  const body = await req.json().catch(() => null);
  const parsed = updateProgressSchema.safeParse(body);
  if (!parsed.success) {
    return Responses.validationError(parsed.error.flatten().fieldErrors);
  }

  const updated = await prisma.libraryItem.update({
    where: { id },
    data: parsed.data,
  });

  return successResponse(updated);
}

export const PATCH = compose(withErrorHandler, withRateLimit)(patchHandler);
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run type-check`
Expected: exits 0.

- [ ] **Step 3: Manual verification**

Add a fresh library item first (`POST /api/library` with a new compound id, e.g. `tmdb-1396`), then with its id `$ID2`:

```bash
curl -b cookies.txt -X PATCH http://localhost:3000/api/library/$ID2/progress \
  -H "Content-Type: application/json" -d '{"currentEpisode":5}'
```

Expected: `200`, `data.currentEpisode` is `5`.

```bash
curl -b cookies.txt -X PATCH http://localhost:3000/api/library/$ID2/progress \
  -H "Content-Type: application/json" -d '{}'
```

Expected: `422` (refine validation — at least one field required).

- [ ] **Step 4: Commit**

```bash
git add "src/app/api/library/[id]/progress/route.ts"
git commit -m "feat: add PATCH /api/library/[id]/progress endpoint"
```

---

### Task 6: PUT /api/series/[id]/rating

**Files:**
- Create: `src/app/api/series/[id]/rating/route.ts`

**Interfaces:**
- Consumes: `requireAuth()`, `rateSeriesSchema` from Task 1, `getOrCreateSeriesFromCompoundId` from Task 2, `prisma`, `Responses`, middleware HOFs.
- Produces: `PUT /api/series/[id]/rating` (`id` = compound `{source}-{externalId}`, body `{ score, review? }`).

- [ ] **Step 1: Write the file**

```typescript
import { type NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth/helpers";
import { getOrCreateSeriesFromCompoundId } from "@/lib/db/series-cache";
import { rateSeriesSchema } from "@/lib/validations/library";
import { successResponse, Responses } from "@/lib/utils/api-response";
import { withErrorHandler, withRateLimit, compose } from "@/lib/utils/middleware";

async function putHandler(
  req: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) {
  const user = await requireAuth();
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = rateSeriesSchema.safeParse(body);
  if (!parsed.success) {
    return Responses.validationError(parsed.error.flatten().fieldErrors);
  }

  const series = await getOrCreateSeriesFromCompoundId(id);
  const { score, review } = parsed.data;

  const rating = await prisma.userRating.upsert({
    where: { userId_seriesId: { userId: user.id, seriesId: series.id } },
    create: { userId: user.id, seriesId: series.id, score, review },
    update: { score, review },
  });

  return successResponse(rating);
}

export const PUT = compose(withErrorHandler, withRateLimit)(putHandler);
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run type-check`
Expected: exits 0.

- [ ] **Step 3: Manual verification**

```bash
curl -b cookies.txt -X PUT http://localhost:3000/api/series/tmdb-1399/rating \
  -H "Content-Type: application/json" -d '{"score":9,"review":"Great show"}'
```

Expected: `201`-shaped body but `200` status (it's a `PUT`), `data.score` is `9`.

```bash
curl -b cookies.txt -X PUT http://localhost:3000/api/series/tmdb-1399/rating \
  -H "Content-Type: application/json" -d '{"score":7}'
```

Expected: `200`, same rating row updated (`data.score` is `7`, `data.review` unchanged from before — confirm via `npx prisma studio` that there's still only one `UserRating` row for this user+series).

```bash
curl -b cookies.txt -X PUT http://localhost:3000/api/series/tmdb-1399/rating \
  -H "Content-Type: application/json" -d '{"score":11}'
```

Expected: `422` (score out of range).

- [ ] **Step 4: Commit**

```bash
git add "src/app/api/series/[id]/rating/route.ts"
git commit -m "feat: add PUT /api/series/[id]/rating endpoint"
```

---

### Task 7: AddToLibraryButton + series detail page wiring

**Files:**
- Create: `src/components/AddToLibraryButton.tsx`
- Modify: `src/app/series/[id]/page.tsx` (add user/library lookup, replace the disabled button block at lines 111-117)
- Modify: `src/app/globals.css` (append after `.library-empty-actions` block)

**Interfaces:**
- Consumes: `POST /api/library` from Task 3; `LIBRARY_STATUS_LABELS`, `LibraryStatus` from `@/types/common`.
- Produces: `AddToLibraryButton` component, props `{ compoundId: string; initialItem: { id: string; status: LibraryStatus } | null; isSignedIn: boolean }`.

- [ ] **Step 1: Write `src/components/AddToLibraryButton.tsx`**

```tsx
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { LIBRARY_STATUS_LABELS, type LibraryStatus } from "@/types/common";

const STATUS_OPTIONS: LibraryStatus[] = [
  "WATCHING",
  "PLAN_TO_WATCH",
  "COMPLETED",
  "ON_HOLD",
  "DROPPED",
];

interface AddToLibraryButtonProps {
  compoundId: string;
  initialItem: { id: string; status: LibraryStatus } | null;
  isSignedIn: boolean;
}

export default function AddToLibraryButton({
  compoundId,
  initialItem,
  isSignedIn,
}: AddToLibraryButtonProps) {
  const router = useRouter();
  const [item, setItem] = useState(initialItem);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePick(status: LibraryStatus) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seriesId: compoundId, status }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Failed to add to library");
        return;
      }
      setItem({ id: data.data.id, status: data.data.status });
      setOpen(false);
      router.refresh();
    } catch {
      setError("Failed to add to library");
    } finally {
      setLoading(false);
    }
  }

  if (!isSignedIn) {
    return (
      <a href="/auth/signin" className="btn btn-primary detail-add-btn">
        Sign in to add to library
      </a>
    );
  }

  return (
    <div className="detail-add-wrapper">
      <button
        type="button"
        className="btn btn-primary detail-add-btn"
        onClick={() => setOpen((o) => !o)}
        disabled={loading}
      >
        {item ? `In Library: ${LIBRARY_STATUS_LABELS[item.status]}` : "Add to Library"}
      </button>
      {open && (
        <div className="detail-add-menu" role="menu">
          {STATUS_OPTIONS.map((status) => (
            <button
              key={status}
              type="button"
              role="menuitem"
              className="detail-add-menu-item"
              onClick={() => handlePick(status)}
              disabled={loading}
            >
              {LIBRARY_STATUS_LABELS[status]}
            </button>
          ))}
        </div>
      )}
      {error && <p className="detail-add-error">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 2: Modify `src/app/series/[id]/page.tsx`**

Add these imports at the top (after the existing imports):

```typescript
import { getCurrentUser } from "@/lib/auth/helpers";
import { prisma } from "@/lib/db/prisma";
import { parseCompoundId } from "@/lib/db/series-cache";
import AddToLibraryButton from "@/components/AddToLibraryButton";
import type { LibraryStatus } from "@/types/common";
```

In `SeriesDetailPage`, right after `const series = await getSeriesDetail(id);` and its not-found check, add the user/library lookup:

```typescript
  const user = await getCurrentUser();
  let existingItem: { id: string; status: LibraryStatus } | null = null;

  if (user) {
    const { source, externalId } = parseCompoundId(id);
    const seriesRow = await prisma.series.findUnique({
      where: { externalId_source: { externalId, source } },
    });
    if (seriesRow) {
      const itemRow = await prisma.libraryItem.findUnique({
        where: { userId_seriesId: { userId: user.id, seriesId: seriesRow.id } },
      });
      if (itemRow) existingItem = { id: itemRow.id, status: itemRow.status };
    }
  }
```

Replace the disabled button block:

```tsx
            {/* Add to Library button placeholder */}
            <button className="btn btn-primary detail-add-btn" disabled title="Sign in to add to library">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14"/>
              </svg>
              Add to Library
            </button>
```

with:

```tsx
            <AddToLibraryButton
              compoundId={id}
              initialItem={existingItem}
              isSignedIn={!!user}
            />
```

- [ ] **Step 3: Append CSS to `src/app/globals.css`**

Insert this new block immediately after the existing `.library-empty-actions { ... }` rule (before the `/* ─── Auth Pages ─── */` comment):

```css
/* ─── Add to Library button ─── */
.detail-add-wrapper {
  position: relative;
  width: 100%;
}

.detail-add-menu {
  position: absolute;
  top: calc(100% + var(--space-2));
  left: 0;
  right: 0;
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-elevated);
  z-index: 10;
  overflow: hidden;
}

.detail-add-menu-item {
  display: block;
  width: 100%;
  text-align: left;
  padding: var(--space-2) var(--space-3);
  background: none;
  border: none;
  font-size: 0.875rem;
  cursor: pointer;
}

.detail-add-menu-item:hover {
  background: var(--color-bg-hover, rgba(255, 255, 255, 0.06));
}

.detail-add-error {
  color: var(--color-danger, #ef4444);
  font-size: 0.8125rem;
  margin-top: var(--space-2);
}
```

- [ ] **Step 4: Verify it compiles**

Run: `npm run type-check` and `npm run lint`
Expected: both exit 0.

- [ ] **Step 5: Manual verification**

With `npx next dev --webpack` running, signed in via the browser (or curl cookie jar), visit `/series/tmdb-1399`:
- Signed out: button reads "Sign in to add to library" and links to `/auth/signin`.
- Signed in, not yet added: button reads "Add to Library"; clicking opens the status menu; picking "Watching" calls `POST /api/library` and the button updates to "In Library: Watching" without a full page reload (then `router.refresh()` re-fetches the server data on next navigation).
- Reload the page: button still reads "In Library: Watching" (server-side lookup confirms persistence).

- [ ] **Step 6: Commit**

```bash
git add src/components/AddToLibraryButton.tsx "src/app/series/[id]/page.tsx" src/app/globals.css
git commit -m "feat: wire Add to Library button on series detail page"
```

---

### Task 8: RatingWidget + series detail page wiring

**Files:**
- Create: `src/components/RatingWidget.tsx`
- Modify: `src/app/series/[id]/page.tsx` (add rating lookup, insert widget after the ratings block)
- Modify: `src/app/globals.css` (append after Task 7's additions)

**Interfaces:**
- Consumes: `PUT /api/series/[id]/rating` from Task 6.
- Produces: `RatingWidget` component, props `{ compoundId: string; initialRating: { score: number; review: string | null } | null; isSignedIn: boolean }`.

- [ ] **Step 1: Write `src/components/RatingWidget.tsx`**

```tsx
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

interface RatingWidgetProps {
  compoundId: string;
  initialRating: { score: number; review: string | null } | null;
  isSignedIn: boolean;
}

export default function RatingWidget({ compoundId, initialRating, isSignedIn }: RatingWidgetProps) {
  const router = useRouter();
  const [score, setScore] = useState(initialRating?.score ?? 0);
  const [review, setReview] = useState(initialRating?.review ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isSignedIn) return null;

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch(`/api/series/${compoundId}/rating`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score, review: review || undefined }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Failed to save rating");
        return;
      }
      setSaved(true);
      router.refresh();
    } catch {
      setError("Failed to save rating");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="detail-rating-widget">
      <h2 className="detail-section-title">Your Rating</h2>
      <div className="detail-rating-input-row">
        <select
          className="detail-rating-select"
          value={score}
          onChange={(e) => setScore(Number(e.target.value))}
        >
          <option value={0}>Select a score</option>
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={handleSave}
          disabled={saving || score < 1}
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
      <textarea
        className="detail-rating-review"
        placeholder="Optional review..."
        value={review}
        onChange={(e) => setReview(e.target.value)}
        maxLength={2000}
      />
      {saved && <p className="detail-rating-saved">Saved!</p>}
      {error && <p className="detail-add-error">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 2: Modify `src/app/series/[id]/page.tsx`**

Add to the imports:

```typescript
import RatingWidget from "@/components/RatingWidget";
```

Extend the user/library lookup block added in Task 7 to also fetch the rating:

```typescript
  const user = await getCurrentUser();
  let existingItem: { id: string; status: LibraryStatus } | null = null;
  let existingRating: { score: number; review: string | null } | null = null;

  if (user) {
    const { source, externalId } = parseCompoundId(id);
    const seriesRow = await prisma.series.findUnique({
      where: { externalId_source: { externalId, source } },
    });
    if (seriesRow) {
      const [itemRow, ratingRow] = await Promise.all([
        prisma.libraryItem.findUnique({
          where: { userId_seriesId: { userId: user.id, seriesId: seriesRow.id } },
        }),
        prisma.userRating.findUnique({
          where: { userId_seriesId: { userId: user.id, seriesId: seriesRow.id } },
        }),
      ]);
      if (itemRow) existingItem = { id: itemRow.id, status: itemRow.status };
      if (ratingRow) existingRating = { score: ratingRow.score, review: ratingRow.review };
    }
  }
```

(This replaces the single-query version from Task 7 with the `Promise.all` two-query version — same variable names, `existingItem` behavior unchanged.)

Insert the widget right after the closing `</div>` of the `ratingsSources.length > 0 && (...)` block (still inside `detail-info`):

```tsx
            <RatingWidget
              compoundId={id}
              initialRating={existingRating}
              isSignedIn={!!user}
            />
```

- [ ] **Step 3: Append CSS to `src/app/globals.css`**

Insert after Task 7's `.detail-add-error` rule:

```css
/* ─── Rating widget ─── */
.detail-rating-widget {
  margin-top: var(--space-6);
}

.detail-rating-input-row {
  display: flex;
  gap: var(--space-3);
  align-items: center;
  margin-bottom: var(--space-2);
}

.detail-rating-select {
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-bg-surface);
}

.detail-rating-review {
  width: 100%;
  min-height: 80px;
  padding: var(--space-3);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-bg-surface);
  resize: vertical;
}

.detail-rating-saved {
  color: var(--color-completed, #22c55e);
  font-size: 0.8125rem;
  margin-top: var(--space-2);
}
```

- [ ] **Step 4: Verify it compiles**

Run: `npm run type-check` and `npm run lint`
Expected: both exit 0.

- [ ] **Step 5: Manual verification**

Signed in, visit `/series/tmdb-1399`: pick a score, optionally type a review, click Save — "Saved!" appears; reload the page — the select shows the saved score and the textarea shows the saved review.

- [ ] **Step 6: Commit**

```bash
git add src/components/RatingWidget.tsx "src/app/series/[id]/page.tsx" src/app/globals.css
git commit -m "feat: wire rating widget on series detail page"
```

---

### Task 9: Library page rebuild (tabs, grid, progress, remove)

**Files:**
- Create: `src/components/LibraryItemCard.tsx`
- Create: `src/components/LibraryBoard.tsx`
- Modify: `src/app/library/page.tsx` (full rewrite to a server component)
- Modify: `src/app/globals.css` (append after Task 8's additions)

**Interfaces:**
- Consumes: `LibraryEntry` type from `@/types/library` (already exists); `LIBRARY_STATUS_LABELS`, `LIBRARY_STATUS_BADGE_CLASS`, `LibraryStatus` from `@/types/common`; `requireAuth()` from `@/lib/auth/helpers`; `prisma`; `PATCH /api/library/[id]/progress` from Task 5; `DELETE /api/library/[id]` from Task 4.
- Produces: `LibraryItemCard` (props `{ entry: LibraryEntry; onRemoved: (id: string) => void; onUpdated: (entry: LibraryEntry) => void }`), `LibraryBoard` (props `{ initialEntries: LibraryEntry[] }`).

- [ ] **Step 1: Write `src/components/LibraryItemCard.tsx`**

```tsx
"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { LIBRARY_STATUS_BADGE_CLASS, LIBRARY_STATUS_LABELS } from "@/types/common";
import type { LibraryEntry } from "@/types/library";

interface LibraryItemCardProps {
  entry: LibraryEntry;
  onRemoved: (id: string) => void;
  onUpdated: (entry: LibraryEntry) => void;
}

function getProgressField(
  entry: LibraryEntry
): { key: "currentEpisode" | "currentChapter"; value: number; label: string } | null {
  if (entry.series.totalEpisodes != null || entry.currentEpisode != null) {
    return { key: "currentEpisode", value: entry.currentEpisode ?? 0, label: "episode" };
  }
  if (entry.series.totalChapters != null || entry.currentChapter != null) {
    return { key: "currentChapter", value: entry.currentChapter ?? 0, label: "chapter" };
  }
  return null;
}

export default function LibraryItemCard({ entry, onRemoved, onUpdated }: LibraryItemCardProps) {
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [busy, setBusy] = useState(false);
  const href = `/series/${entry.series.source}-${entry.series.externalId}`;
  const progress = getProgressField(entry);

  async function handleIncrement() {
    if (!progress) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/library/${entry.id}/progress`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [progress.key]: progress.value + 1 }),
      });
      const data = await res.json();
      if (data.success) {
        onUpdated({ ...entry, [progress.key]: progress.value + 1 });
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove() {
    setBusy(true);
    try {
      const res = await fetch(`/api/library/${entry.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        onRemoved(entry.id);
      }
    } finally {
      setBusy(false);
      setConfirmingRemove(false);
    }
  }

  return (
    <article className="poster-card library-card">
      <Link href={href} className="series-card-link">
        {entry.series.coverImage ? (
          <Image
            src={entry.series.coverImage}
            alt={entry.series.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 200px"
            className="poster-card-img"
          />
        ) : (
          <div className="poster-card-placeholder">No Image</div>
        )}
        <div className="poster-overlay" />
        <div className="poster-card-info">
          <span className={`badge ${LIBRARY_STATUS_BADGE_CLASS[entry.status]}`}>
            {LIBRARY_STATUS_LABELS[entry.status]}
          </span>
          <h3 className="poster-card-title">{entry.series.title}</h3>
        </div>
      </Link>

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
        {confirmingRemove ? (
          <div className="library-card-confirm">
            <span>Remove?</span>
            <button type="button" className="btn btn-sm btn-danger" onClick={handleRemove} disabled={busy}>
              Yes
            </button>
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={() => setConfirmingRemove(false)}
              disabled={busy}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="library-card-remove"
            onClick={() => setConfirmingRemove(true)}
            disabled={busy}
            aria-label="Remove from library"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6" />
            </svg>
          </button>
        )}
      </div>
    </article>
  );
}
```

- [ ] **Step 2: Write `src/components/LibraryBoard.tsx`**

```tsx
"use client";

import React, { useState } from "react";
import { LIBRARY_STATUS_LABELS, type LibraryStatus } from "@/types/common";
import type { LibraryEntry } from "@/types/library";
import LibraryItemCard from "./LibraryItemCard";

const TABS: { value: "ALL" | LibraryStatus; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "WATCHING", label: LIBRARY_STATUS_LABELS.WATCHING },
  { value: "PLAN_TO_WATCH", label: LIBRARY_STATUS_LABELS.PLAN_TO_WATCH },
  { value: "COMPLETED", label: LIBRARY_STATUS_LABELS.COMPLETED },
  { value: "ON_HOLD", label: LIBRARY_STATUS_LABELS.ON_HOLD },
  { value: "DROPPED", label: LIBRARY_STATUS_LABELS.DROPPED },
];

interface LibraryBoardProps {
  initialEntries: LibraryEntry[];
}

export default function LibraryBoard({ initialEntries }: LibraryBoardProps) {
  const [entries, setEntries] = useState(initialEntries);
  const [tab, setTab] = useState<"ALL" | LibraryStatus>("ALL");

  const visible = tab === "ALL" ? entries : entries.filter((e) => e.status === tab);

  function handleRemoved(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  function handleUpdated(updated: LibraryEntry) {
    setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
  }

  return (
    <div>
      <div className="explore-tabs" role="tablist">
        {TABS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            className={`explore-tab ${tab === value ? "explore-tab-active" : ""}`}
            onClick={() => setTab(value)}
          >
            {label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="explore-empty">
          <p>No series in this status yet.</p>
        </div>
      ) : (
        <div className="series-grid">
          {visible.map((entry) => (
            <LibraryItemCard key={entry.id} entry={entry} onRemoved={handleRemoved} onUpdated={handleUpdated} />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Rewrite `src/app/library/page.tsx`**

```tsx
import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { requireAuth } from "@/lib/auth/helpers";
import { prisma } from "@/lib/db/prisma";
import LibraryBoard from "@/components/LibraryBoard";
import type { LibraryEntry } from "@/types/library";

export const metadata: Metadata = {
  title: "My Library",
  description: "Your personal series tracking library",
};

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
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

  return (
    <div className="container-content page-enter library-page">
      <div className="library-header">
        <h1 className="library-title">My Library</h1>
      </div>

      {entries.length === 0 ? (
        <div className="library-empty">
          <div className="library-empty-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.25">
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
              <path d="m9 10 2 2 4-4" />
            </svg>
          </div>
          <h2 className="library-empty-title">Your library is empty</h2>
          <p className="library-empty-text">
            Start by exploring series and adding them to your watchlist.
          </p>
          <div className="library-empty-actions">
            <Link href="/explore" className="btn btn-primary">
              Browse Catalogue
            </Link>
          </div>
        </div>
      ) : (
        <LibraryBoard initialEntries={entries} />
      )}
    </div>
  );
}
```

- [ ] **Step 4: Append CSS to `src/app/globals.css`**

Insert after Task 8's `.detail-rating-saved` rule:

```css
/* ─── Library card actions ─── */
.library-card {
  display: flex;
  flex-direction: column;
}

.library-card-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  padding: var(--space-2);
}

.library-card-remove {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-bg-surface);
  cursor: pointer;
}

.library-card-confirm {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 0.8125rem;
}

.btn-danger {
  background: var(--color-danger, #ef4444);
  color: #fff;
  border: none;
}
```

- [ ] **Step 5: Verify it compiles**

Run: `npm run type-check` and `npm run lint`
Expected: both exit 0.

- [ ] **Step 6: Manual verification**

Signed in, with at least two library items in different statuses (use Task 3/7's flows to add a couple), visit `/library`:
- Tabs filter the grid correctly (clicking "Watching" shows only `WATCHING` items, "All" shows everything).
- "+1 episode"/"+1 chapter" button increments the displayed count and persists across a page reload.
- Clicking the remove icon shows "Remove? Yes/Cancel"; "Cancel" reverts to the icon; "Yes" removes the card from the grid and, on reload, it's gone from the DB-backed list too.
- Signed out, visiting `/library` still redirects to `/auth/signin?callbackUrl=%2Flibrary` (unchanged behavior from `src/proxy.ts`, confirms this rewrite didn't break that).

- [ ] **Step 7: Commit**

```bash
git add src/components/LibraryItemCard.tsx src/components/LibraryBoard.tsx src/app/library/page.tsx src/app/globals.css
git commit -m "feat: rebuild library page with status tabs, progress tracking, and remove"
```

---

## Final Verification

After all 9 tasks are committed:

1. `npm run type-check` — exits 0.
2. `npm run lint` — exits 0.
3. Full click-through with `npx next dev --webpack` running and Docker Postgres up: sign up → sign in → browse to a series → add to library via status picker → rate it → go to `/library` → see it under the right tab → increment progress → remove it (with confirm) → sign out → confirm `/library` redirects again.
4. Recommend a final whole-plan code review (`superpowers:requesting-code-review` or the subagent-driven-development skill's final reviewer step) before merging, same as the Auth wiring plan's process.
