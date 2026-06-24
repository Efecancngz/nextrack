# Generic SaaS Starter — A1: Schema & Backend API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the domain-specific Prisma schema and backend API routes (series/library/notifications/search) with a generic `Item`/`UserItem`/`Rating`/`Notification` model and matching routes, backed by a zero-API-key example data source.

**Architecture:** One generic content model (`Item`) replaces `Series`; one generic tracking model (`UserItem`) replaces `LibraryItem`. A static, in-memory "example source" (`src/lib/api/example-source.ts`) replaces all four external API clients (TMDB/AniList/MangaDex/Jikan) — no network calls, no API keys, seeded directly into the DB via `prisma/seed.ts`. All routes keep the existing `requireAuth()` + `compose(withErrorHandler, withRateLimit)` + `successResponse`/`Responses` conventions unchanged.

**Tech Stack:** Next.js 16 App Router, Prisma 7 (PostgreSQL), Zod, vitest.

## Global Constraints

- No external network calls or API keys anywhere in this plan — the only data source is the static, in-process `example-source.ts` module.
- Every route handler calls `requireAuth()` first (except read-only `GET /api/items*` which are public, matching the original `/api/search`/`/api/series/[id]` being public) and scopes user-owned data by `userId`.
- Every route export uses `compose(withErrorHandler, withRateLimit)(handler)`.
- All responses use `successResponse()` / `Responses.*` from `src/lib/utils/api-response.ts` and `AppError` from `src/lib/utils/app-error.ts` — both files are unchanged, reused as-is.
- Item lookups by ID use the Item's own Prisma cuid directly (`Item.id`) — there is no compound `source-externalId` URL scheme in this generic starter, since there is only one source.
- `UserItem` PATCH accepts any of `{status}`, `{isFavorite}`, `{progress, notes}` in the body, tried in that order via `safeParse` (matches the existing `library/[id]/route.ts` multi-schema pattern).
- This is a from-scratch schema reset (no production data to preserve) — migration history is deleted and recreated as a single clean `0001_init` migration.

---

### Task 1: Example data source (zero-API-key mock)

**Files:**
- Create: `src/lib/api/example-source.ts`
- Test: `tests/unit/api/example-source.test.ts`

**Interfaces:**
- Produces: `EXAMPLE_ITEMS: ExampleItem[]` (static array, consumed by Task 2's seed script). `searchExampleItems(query: string): Promise<ExampleItem[]>`, `getExampleItemDetail(externalId: string): Promise<ExampleItem | null>`, `getTrendingExampleItems(): Promise<ExampleItem[]>`, `simulateExampleItemUpdate(externalId: string): Promise<number | null>` (returns the new `totalUnits` value, or `null` if not found) — consumed by Task 6's notification check.
- `interface ExampleItem { externalId: string; title: string; description: string; category: "TYPE_A" | "TYPE_B" | "TYPE_C"; status: "ONGOING" | "COMPLETED" | "HIATUS" | "CANCELLED" | "UPCOMING"; totalUnits: number; }`

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/api/example-source.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  EXAMPLE_ITEMS,
  searchExampleItems,
  getExampleItemDetail,
  getTrendingExampleItems,
  simulateExampleItemUpdate,
} from "@/lib/api/example-source";

describe("example-source", () => {
  it("has at least 10 seed items across all 3 categories", () => {
    expect(EXAMPLE_ITEMS.length).toBeGreaterThanOrEqual(10);
    const categories = new Set(EXAMPLE_ITEMS.map((i) => i.category));
    expect(categories).toEqual(new Set(["TYPE_A", "TYPE_B", "TYPE_C"]));
  });

  it("searchExampleItems matches by case-insensitive title substring", async () => {
    const results = await searchExampleItems(EXAMPLE_ITEMS[0].title.slice(0, 4).toUpperCase());
    expect(results.some((r) => r.externalId === EXAMPLE_ITEMS[0].externalId)).toBe(true);
  });

  it("searchExampleItems returns an empty array for no match", async () => {
    const results = await searchExampleItems("zzz-no-such-title-zzz");
    expect(results).toEqual([]);
  });

  it("getExampleItemDetail returns the matching item by externalId", async () => {
    const target = EXAMPLE_ITEMS[0];
    const result = await getExampleItemDetail(target.externalId);
    expect(result).not.toBeNull();
    expect(result?.title).toBe(target.title);
  });

  it("getExampleItemDetail returns null for an unknown externalId", async () => {
    const result = await getExampleItemDetail("does-not-exist");
    expect(result).toBeNull();
  });

  it("getTrendingExampleItems returns a non-empty subset of EXAMPLE_ITEMS", async () => {
    const results = await getTrendingExampleItems();
    expect(results.length).toBeGreaterThan(0);
    expect(results.length).toBeLessThanOrEqual(EXAMPLE_ITEMS.length);
  });

  it("simulateExampleItemUpdate increments totalUnits and returns the new value", async () => {
    const target = EXAMPLE_ITEMS[0];
    const before = target.totalUnits;
    const result = await simulateExampleItemUpdate(target.externalId);
    expect(result).toBe(before + 1);
    expect(target.totalUnits).toBe(before + 1);
  });

  it("simulateExampleItemUpdate returns null for an unknown externalId", async () => {
    const result = await simulateExampleItemUpdate("does-not-exist");
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npx vitest run tests/unit/api/example-source.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/api/example-source'`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/api/example-source.ts`:

```ts
export interface ExampleItem {
  externalId: string;
  title: string;
  description: string;
  category: "TYPE_A" | "TYPE_B" | "TYPE_C";
  status: "ONGOING" | "COMPLETED" | "HIATUS" | "CANCELLED" | "UPCOMING";
  totalUnits: number;
}

export const EXAMPLE_ITEMS: ExampleItem[] = [
  { externalId: "ex-001", title: "The Starlight Archive", description: "A long-running ongoing project followed by a dedicated community.", category: "TYPE_A", status: "ONGOING", totalUnits: 142 },
  { externalId: "ex-002", title: "Midnight Protocol", description: "A completed, highly rated piece of work.", category: "TYPE_A", status: "COMPLETED", totalUnits: 24 },
  { externalId: "ex-003", title: "Garden of Echoes", description: "Currently on hiatus after a strong opening run.", category: "TYPE_B", status: "HIATUS", totalUnits: 8 },
  { externalId: "ex-004", title: "Iron Tide", description: "A fast-growing ongoing release with frequent updates.", category: "TYPE_B", status: "ONGOING", totalUnits: 56 },
  { externalId: "ex-005", title: "Paper Moon Society", description: "An upcoming release generating early buzz.", category: "TYPE_C", status: "UPCOMING", totalUnits: 0 },
  { externalId: "ex-006", title: "Lighthouse at the End", description: "A completed classic with a small but devoted following.", category: "TYPE_C", status: "COMPLETED", totalUnits: 12 },
  { externalId: "ex-007", title: "The Quiet Algorithm", description: "An ongoing technical deep-dive series.", category: "TYPE_A", status: "ONGOING", totalUnits: 33 },
  { externalId: "ex-008", title: "Velvet Horizon", description: "Cancelled after a short run, still discussed by fans.", category: "TYPE_B", status: "CANCELLED", totalUnits: 6 },
  { externalId: "ex-009", title: "Glass Orchard", description: "A steady, ongoing weekly release.", category: "TYPE_C", status: "ONGOING", totalUnits: 91 },
  { externalId: "ex-010", title: "Static Bloom", description: "A completed limited run, well-reviewed.", category: "TYPE_A", status: "COMPLETED", totalUnits: 18 },
  { externalId: "ex-011", title: "Northern Static", description: "An ongoing release with a recent surge in popularity.", category: "TYPE_B", status: "ONGOING", totalUnits: 47 },
  { externalId: "ex-012", title: "The Long Recess", description: "On hiatus, last update several months ago.", category: "TYPE_C", status: "HIATUS", totalUnits: 21 },
];

export async function searchExampleItems(query: string): Promise<ExampleItem[]> {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];
  return EXAMPLE_ITEMS.filter((item) => item.title.toLowerCase().includes(normalized));
}

export async function getExampleItemDetail(externalId: string): Promise<ExampleItem | null> {
  return EXAMPLE_ITEMS.find((item) => item.externalId === externalId) ?? null;
}

export async function getTrendingExampleItems(): Promise<ExampleItem[]> {
  return EXAMPLE_ITEMS.filter((item) => item.status === "ONGOING").slice(0, 8);
}

export async function simulateExampleItemUpdate(externalId: string): Promise<number | null> {
  const item = EXAMPLE_ITEMS.find((i) => i.externalId === externalId);
  if (!item) return null;
  item.totalUnits += 1;
  return item.totalUnits;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npx vitest run tests/unit/api/example-source.test.ts
```

Expected: PASS — 7/7 tests passing.

- [ ] **Step 5: Commit**

```bash
git add src/lib/api/example-source.ts tests/unit/api/example-source.test.ts
git commit -m "feat: add zero-API-key example data source"
```

---

### Task 2: Prisma schema reset + seed script

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/seed.ts`
- Modify: `package.json` (add `prisma.seed` config)
- Delete: entire `prisma/migrations/` directory contents, replaced with one new migration

**Interfaces:**
- Consumes: `EXAMPLE_ITEMS` from `src/lib/api/example-source.ts` (Task 1).
- Produces: `Item`, `UserItem`, `Rating`, `Notification` Prisma models (exact shape below) — every later task in this plan and in Plans A2/A3 depends on these exact field names.

- [ ] **Step 1: Replace the schema**

Rewrite `prisma/schema.prisma` in full:

```prisma
// Free Serie Tracker — Prisma Schema (generic SaaS starter)
// Learn more: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
}

// ─────────────────────────────────────────────────
// Auth Models (Auth.js v5 required schema)
// ─────────────────────────────────────────────────

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
  userItems     UserItem[]
  ratings       Rating[]
  notifications Notification[]

  @@index([email])
}

model Account {
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@id([provider, providerAccountId])
  @@index([userId])
}

model Session {
  sessionToken String   @unique
  userId       String
  expires      DateTime
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}

model VerificationToken {
  identifier String
  token      String
  expires    DateTime

  @@id([identifier, token])
}

// ─────────────────────────────────────────────────
// Item (generic content model — example domain)
// ─────────────────────────────────────────────────

enum ItemCategory {
  TYPE_A
  TYPE_B
  TYPE_C
}

enum ItemStatus {
  ONGOING
  COMPLETED
  HIATUS
  CANCELLED
  UPCOMING
}

model Item {
  id             String       @id @default(cuid())
  externalId     String
  source         String       // always "example-source" in this starter
  category       ItemCategory
  status         ItemStatus   @default(ONGOING)
  title          String
  description    String?
  coverImage     String?
  totalUnits     Int?
  ratingExternal Float?
  cachedAt       DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  userItems     UserItem[]
  ratings       Rating[]
  notifications Notification[]

  @@unique([externalId, source])
  @@index([category])
  @@index([title])
}

// ─────────────────────────────────────────────────
// UserItem (personal tracking)
// ─────────────────────────────────────────────────

enum TrackingStatus {
  ACTIVE
  PLANNED
  COMPLETED
  PAUSED
  DROPPED
}

model UserItem {
  id         String         @id @default(cuid())
  userId     String
  itemId     String
  status     TrackingStatus @default(PLANNED)
  isFavorite Boolean        @default(false)
  progress   Int?
  notes      String?
  createdAt  DateTime       @default(now())
  updatedAt  DateTime       @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  item Item @relation(fields: [itemId], references: [id], onDelete: Cascade)

  @@unique([userId, itemId])
  @@index([userId])
  @@index([userId, status])
}

// ─────────────────────────────────────────────────
// Rating (personal score 1-10)
// ─────────────────────────────────────────────────

model Rating {
  id        String   @id @default(cuid())
  userId    String
  itemId    String
  score     Int
  review    String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  item Item @relation(fields: [itemId], references: [id], onDelete: Cascade)

  @@unique([userId, itemId])
  @@index([userId])
  @@index([itemId])
}

// ─────────────────────────────────────────────────
// Notification (item-update alerts)
// ─────────────────────────────────────────────────

model Notification {
  id        String   @id @default(cuid())
  userId    String
  itemId    String
  message   String
  isRead    Boolean  @default(false)
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  item Item @relation(fields: [itemId], references: [id], onDelete: Cascade)

  @@index([userId, isRead])
  @@index([userId, createdAt])
}
```

- [ ] **Step 2: Write the seed script**

Create `prisma/seed.ts`:

```ts
import { PrismaClient } from "../src/generated/prisma/client";
import { EXAMPLE_ITEMS } from "../src/lib/api/example-source";

const prisma = new PrismaClient();

async function main() {
  for (const item of EXAMPLE_ITEMS) {
    await prisma.item.upsert({
      where: { externalId_source: { externalId: item.externalId, source: "example-source" } },
      create: {
        externalId: item.externalId,
        source: "example-source",
        category: item.category,
        status: item.status,
        title: item.title,
        description: item.description,
        totalUnits: item.totalUnits,
      },
      update: {
        category: item.category,
        status: item.status,
        title: item.title,
        description: item.description,
        totalUnits: item.totalUnits,
      },
    });
  }
  console.log(`Seeded ${EXAMPLE_ITEMS.length} items.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

- [ ] **Step 3: Register the seed script in `package.json`**

In `package.json`, add a top-level `"prisma"` key (as a sibling of `"scripts"`, `"dependencies"`, etc.):

```json
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  },
```

Add `tsx` as a dev dependency if not already present:

```bash
npm install --save-dev tsx
```

- [ ] **Step 4: Reset migration history and create a clean initial migration**

If Docker/the local Postgres container is not running, **STOP and report BLOCKED** — do not guess how to start it.

```bash
rm -rf prisma/migrations
mkdir -p prisma/migrations/0001_init
npx prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script > prisma/migrations/0001_init/migration.sql
npx prisma db push --force-reset --skip-generate
npx prisma migrate resolve --applied 0001_init
npx prisma generate
npx prisma db seed
```

Verify: open `prisma/migrations/0001_init/migration.sql` and confirm it contains `CREATE TABLE` statements for exactly `User`, `Account`, `Session`, `VerificationToken`, `Item`, `UserItem`, `Rating`, `Notification` (8 tables) — no leftover references to `Series`, `LibraryItem`, `UserRating`, `EpisodeLanguage`, `UserNote`, or `SearchKeyword`.

- [ ] **Step 5: Verify with a type-check**

```bash
npm run type-check
```

Expected: errors are expected at this point — every file that imports the old Prisma models (`Series`, `LibraryItem`, etc.) will now fail to compile, since those models no longer exist. **This is expected and will be resolved by later tasks in this plan and by Plan A3's cleanup sweep.** Do not attempt to fix these errors now — only confirm the *new* models (`Item`, `UserItem`, `Rating`, `Notification`) generated correctly by checking `src/generated/prisma/models/Item.ts` exists.

```bash
ls src/generated/prisma/models/Item.ts src/generated/prisma/models/UserItem.ts src/generated/prisma/models/Rating.ts src/generated/prisma/models/Notification.ts
```

Expected: all four files exist.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/seed.ts prisma/migrations package.json package-lock.json
git commit -m "feat: replace domain schema with generic Item/UserItem/Rating/Notification models"
```

---

### Task 3: Generic types and validation schemas

**Files:**
- Create: `src/types/item.ts`
- Create: `src/types/user-item.ts`
- Create: `src/lib/validations/item.ts`

**Interfaces:**
- Consumes: nothing beyond TypeScript/Zod.
- Produces: `ItemCard` and `ItemDetail` interfaces (Task 4, Plan A2 components depend on these), `UserItemEntry` interface (Task 5, Plan A2 components depend on this), `addToTrackingSchema`, `updateTrackingStatusSchema`, `updateTrackingFavoriteSchema`, `updateTrackingProgressSchema`, `rateItemSchema` (Tasks 4 and 5 depend on these).

- [ ] **Step 1: Create `src/types/item.ts`**

```ts
export type ItemCategory = "TYPE_A" | "TYPE_B" | "TYPE_C";
export type ItemStatus = "ONGOING" | "COMPLETED" | "HIATUS" | "CANCELLED" | "UPCOMING";

export const ITEM_CATEGORY_LABELS: Record<ItemCategory, string> = {
  TYPE_A: "Type A",
  TYPE_B: "Type B",
  TYPE_C: "Type C",
};

export const ITEM_STATUS_LABELS: Record<ItemStatus, string> = {
  ONGOING: "Ongoing",
  COMPLETED: "Completed",
  HIATUS: "On Hiatus",
  CANCELLED: "Cancelled",
  UPCOMING: "Upcoming",
};

/** Card view — minimal data for grid/list display */
export interface ItemCard {
  id: string;
  category: ItemCategory;
  status: ItemStatus;
  title: string;
  description?: string;
  coverImage?: string;
  totalUnits?: number;
  ratingExternal?: number;
}

/** Detail view — full item info */
export interface ItemDetail extends ItemCard {
  externalId: string;
  source: string;
}
```

- [ ] **Step 2: Create `src/types/user-item.ts`**

```ts
import type { ItemCard } from "./item";

export type TrackingStatus = "ACTIVE" | "PLANNED" | "COMPLETED" | "PAUSED" | "DROPPED";

export const TRACKING_STATUS_LABELS: Record<TrackingStatus, string> = {
  ACTIVE: "Active",
  PLANNED: "Planned",
  COMPLETED: "Completed",
  PAUSED: "Paused",
  DROPPED: "Dropped",
};

export const TRACKING_STATUS_BADGE_CLASS: Record<TrackingStatus, string> = {
  ACTIVE: "badge-watching",
  PLANNED: "badge-plan",
  COMPLETED: "badge-completed",
  PAUSED: "badge-on-hold",
  DROPPED: "badge-dropped",
};

/** Full tracking entry with joined item data */
export interface UserItemEntry {
  id: string;
  userId: string;
  itemId: string;
  status: TrackingStatus;
  isFavorite: boolean;
  progress?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  item: ItemCard;
}
```

- [ ] **Step 3: Create `src/lib/validations/item.ts`**

```ts
import { z } from "zod";

export const trackingStatusEnum = z.enum(["ACTIVE", "PLANNED", "COMPLETED", "PAUSED", "DROPPED"]);

export const addToTrackingSchema = z.object({
  itemId: z.string().min(1, "itemId is required"),
  status: trackingStatusEnum.default("PLANNED"),
});
export type AddToTrackingInput = z.infer<typeof addToTrackingSchema>;

export const updateTrackingStatusSchema = z.object({
  status: trackingStatusEnum,
});
export type UpdateTrackingStatusInput = z.infer<typeof updateTrackingStatusSchema>;

export const updateTrackingFavoriteSchema = z.object({
  isFavorite: z.boolean(),
});
export type UpdateTrackingFavoriteInput = z.infer<typeof updateTrackingFavoriteSchema>;

export const updateTrackingProgressSchema = z.object({
  progress: z.number().int().min(0),
  notes: z.string().max(2000).optional(),
});
export type UpdateTrackingProgressInput = z.infer<typeof updateTrackingProgressSchema>;

export const rateItemSchema = z.object({
  score: z.number().int().min(1, "Score must be between 1 and 10").max(10, "Score must be between 1 and 10"),
  review: z.string().max(2000, "Review must be 2000 characters or fewer").optional(),
});
export type RateItemInput = z.infer<typeof rateItemSchema>;
```

- [ ] **Step 4: Verify with a type-check**

```bash
npx tsc --noEmit src/types/item.ts src/types/user-item.ts src/lib/validations/item.ts 2>&1 | grep -v "Cannot find module"
```

Expected: no output (the full-project `npm run type-check` will still show unrelated pre-existing errors from not-yet-updated files — ignore those, only confirm these three new files themselves have no syntax/type errors of their own).

- [ ] **Step 5: Commit**

```bash
git add src/types/item.ts src/types/user-item.ts src/lib/validations/item.ts
git commit -m "feat: add generic Item/UserItem types and validation schemas"
```

---

### Task 4: Items API routes (browse, suggest, detail, trending, rating)

**Files:**
- Create: `src/app/api/items/route.ts`
- Create: `src/app/api/items/suggest/route.ts`
- Create: `src/app/api/items/trending/route.ts`
- Create: `src/app/api/items/[id]/route.ts`
- Create: `src/app/api/items/[id]/rating/route.ts`

**Interfaces:**
- Consumes: `Item`/`Rating` Prisma models (Task 2), `rateItemSchema` (Task 3), `requireAuth`/`getCurrentUser` (`src/lib/auth/helpers.ts`, unchanged), `successResponse`/`Responses` (`src/lib/utils/api-response.ts`, unchanged), `compose`/`withErrorHandler`/`withRateLimit` (`src/lib/utils/middleware.ts`, unchanged).
- Produces: `GET /api/items?q=&category=&status=` → `{ success: true, data: ItemCard[] }`. `GET /api/items/suggest?q=` → `{ success: true, data: ItemCard[] }` (capped at 8). `GET /api/items/trending` → `{ success: true, data: ItemCard[] }`. `GET /api/items/[id]` → `{ success: true, data: ItemDetail }`. `POST /api/items/[id]/rating` → `{ success: true, data: Rating }`. Plan A2's browse/detail pages and components call these directly.

- [ ] **Step 1: Create the items collection route**

Create `src/app/api/items/route.ts`:

```ts
import { type NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { successResponse } from "@/lib/utils/api-response";
import { withErrorHandler, withRateLimit, compose } from "@/lib/utils/middleware";

async function getHandler(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  const category = req.nextUrl.searchParams.get("category");
  const status = req.nextUrl.searchParams.get("status");

  const items = await prisma.item.findMany({
    where: {
      ...(q ? { title: { contains: q, mode: "insensitive" as const } } : {}),
      ...(category ? { category: category as never } : {}),
      ...(status ? { status: status as never } : {}),
    },
    orderBy: { title: "asc" },
  });

  return successResponse(items);
}

export const GET = compose(withErrorHandler, withRateLimit)(getHandler);
```

- [ ] **Step 2: Create the suggest route**

Create `src/app/api/items/suggest/route.ts`:

```ts
import { type NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { successResponse } from "@/lib/utils/api-response";
import { withErrorHandler, withRateLimit, compose } from "@/lib/utils/middleware";

async function getHandler(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  if (!q || !q.trim()) {
    return successResponse([]);
  }

  const items = await prisma.item.findMany({
    where: { title: { contains: q, mode: "insensitive" } },
    orderBy: { title: "asc" },
    take: 8,
  });

  return successResponse(items);
}

export const GET = compose(withErrorHandler, withRateLimit)(getHandler);
```

- [ ] **Step 3: Create the trending route**

Create `src/app/api/items/trending/route.ts`:

```ts
import { prisma } from "@/lib/db/prisma";
import { successResponse } from "@/lib/utils/api-response";
import { withErrorHandler, withRateLimit, compose } from "@/lib/utils/middleware";

async function getHandler() {
  const items = await prisma.item.findMany({
    where: { status: "ONGOING" },
    orderBy: { updatedAt: "desc" },
    take: 8,
  });

  return successResponse(items);
}

export const GET = compose(withErrorHandler, withRateLimit)(getHandler);
```

- [ ] **Step 4: Create the item detail route**

Create `src/app/api/items/[id]/route.ts`:

```ts
import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/utils/app-error";
import { successResponse } from "@/lib/utils/api-response";
import { withErrorHandler, withRateLimit, compose } from "@/lib/utils/middleware";

async function getHandler(
  req: Request,
  { params }: { params: Promise<Record<string, string>> }
) {
  const { id } = await params;

  const item = await prisma.item.findUnique({ where: { id } });
  if (!item) {
    throw AppError.notFound("Item");
  }

  return successResponse(item);
}

export const GET = compose(withErrorHandler, withRateLimit)(getHandler);
```

- [ ] **Step 5: Create the rating route**

Create `src/app/api/items/[id]/rating/route.ts`:

```ts
import { type NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth/helpers";
import { rateItemSchema } from "@/lib/validations/item";
import { AppError } from "@/lib/utils/app-error";
import { successResponse, Responses } from "@/lib/utils/api-response";
import { withErrorHandler, withRateLimit, compose } from "@/lib/utils/middleware";

async function putHandler(
  req: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) {
  const user = await requireAuth();
  const { id } = await params;

  const item = await prisma.item.findUnique({ where: { id } });
  if (!item) {
    throw AppError.notFound("Item");
  }

  const body = await req.json().catch(() => null);
  const parsed = rateItemSchema.safeParse(body);
  if (!parsed.success) {
    return Responses.validationError(parsed.error.flatten().fieldErrors);
  }

  const { score, review } = parsed.data;
  const rating = await prisma.rating.upsert({
    where: { userId_itemId: { userId: user.id, itemId: id } },
    create: { userId: user.id, itemId: id, score, review },
    update: { score, review },
  });

  return successResponse(rating);
}

export const PUT = compose(withErrorHandler, withRateLimit)(putHandler);
```

- [ ] **Step 6: Verify with a type-check**

```bash
npx tsc --noEmit src/app/api/items/route.ts src/app/api/items/suggest/route.ts src/app/api/items/trending/route.ts "src/app/api/items/[id]/route.ts" "src/app/api/items/[id]/rating/route.ts" 2>&1 | grep -v "Cannot find module"
```

Expected: no errors specific to these five files.

- [ ] **Step 7: Manual verification**

With the dev server running (`npm run dev`):

```bash
curl -s "http://localhost:3000/api/items" | head -c 500
curl -s "http://localhost:3000/api/items/trending" | head -c 500
curl -s "http://localhost:3000/api/items/suggest?q=Static" | head -c 500
```

Expected: each returns `{"success":true,"data":[...]}` with seeded items (from Task 2's `prisma db seed`).

- [ ] **Step 8: Commit**

```bash
git add src/app/api/items
git commit -m "feat: add items API routes (browse, suggest, trending, detail, rating)"
```

---

### Task 5: User-items API routes (personal tracking CRUD)

**Files:**
- Create: `src/app/api/user-items/route.ts`
- Create: `src/app/api/user-items/[id]/route.ts`

**Interfaces:**
- Consumes: `UserItem`/`Item` Prisma models (Task 2), `addToTrackingSchema`/`updateTrackingStatusSchema`/`updateTrackingFavoriteSchema`/`updateTrackingProgressSchema`/`trackingStatusEnum` (Task 3).
- Produces: `GET /api/user-items?status=` → `{ success: true, data: UserItemEntry[] }`. `POST /api/user-items` → `{ success: true, data: UserItem }`. `PATCH /api/user-items/[id]` (3-schema try) → `{ success: true, data: UserItem }`. `DELETE /api/user-items/[id]` → `{ success: true, data: { id } }`. Plan A2's `/my-items` page and tracking components call these directly.

- [ ] **Step 1: Create the user-items collection route**

Create `src/app/api/user-items/route.ts`:

```ts
import { type NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth/helpers";
import { addToTrackingSchema, trackingStatusEnum } from "@/lib/validations/item";
import { AppError } from "@/lib/utils/app-error";
import { successResponse, Responses } from "@/lib/utils/api-response";
import { withErrorHandler, withRateLimit, compose } from "@/lib/utils/middleware";
import { Prisma } from "@/generated/prisma/client";

async function getHandler(req: NextRequest) {
  const user = await requireAuth();
  const rawStatus = req.nextUrl.searchParams.get("status");

  let statusFilter: ReturnType<typeof trackingStatusEnum.parse> | undefined;
  if (rawStatus !== null) {
    const parsedStatus = trackingStatusEnum.safeParse(rawStatus);
    if (!parsedStatus.success) {
      return Responses.badRequest("Invalid status filter");
    }
    statusFilter = parsedStatus.data;
  }

  const items = await prisma.userItem.findMany({
    where: {
      userId: user.id,
      ...(statusFilter ? { status: statusFilter } : {}),
    },
    include: { item: true },
    orderBy: { updatedAt: "desc" },
  });

  return successResponse(items);
}

async function postHandler(req: NextRequest) {
  const user = await requireAuth();
  const body = await req.json().catch(() => null);
  const parsed = addToTrackingSchema.safeParse(body);

  if (!parsed.success) {
    return Responses.validationError(parsed.error.flatten().fieldErrors);
  }

  const { itemId, status } = parsed.data;

  const item = await prisma.item.findUnique({ where: { id: itemId } });
  if (!item) {
    throw AppError.notFound("Item");
  }

  try {
    const userItem = await prisma.userItem.create({
      data: { userId: user.id, itemId, status },
    });
    return successResponse(userItem, 201);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw AppError.conflict("This item is already in your tracking list");
    }
    throw err;
  }
}

export const GET = compose(withErrorHandler, withRateLimit)(getHandler);
export const POST = compose(withErrorHandler, withRateLimit)(postHandler);
```

- [ ] **Step 2: Create the per-user-item route**

Create `src/app/api/user-items/[id]/route.ts`:

```ts
import { type NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth/helpers";
import {
  updateTrackingStatusSchema,
  updateTrackingFavoriteSchema,
  updateTrackingProgressSchema,
} from "@/lib/validations/item";
import { AppError } from "@/lib/utils/app-error";
import { successResponse, Responses } from "@/lib/utils/api-response";
import { withErrorHandler, withRateLimit, compose } from "@/lib/utils/middleware";

async function getOwnedUserItem(id: string, userId: string) {
  const userItem = await prisma.userItem.findUnique({ where: { id } });
  if (!userItem || userItem.userId !== userId) {
    throw AppError.notFound("Tracking entry");
  }
  return userItem;
}

async function patchHandler(
  req: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) {
  const user = await requireAuth();
  const { id } = await params;

  await getOwnedUserItem(id, user.id);

  const body = await req.json().catch(() => null);

  const statusParsed = updateTrackingStatusSchema.safeParse(body);
  if (statusParsed.success) {
    const updated = await prisma.userItem.update({
      where: { id },
      data: { status: statusParsed.data.status },
    });
    return successResponse(updated);
  }

  const favoriteParsed = updateTrackingFavoriteSchema.safeParse(body);
  if (favoriteParsed.success) {
    const updated = await prisma.userItem.update({
      where: { id },
      data: { isFavorite: favoriteParsed.data.isFavorite },
    });
    return successResponse(updated);
  }

  const progressParsed = updateTrackingProgressSchema.safeParse(body);
  if (progressParsed.success) {
    const updated = await prisma.userItem.update({
      where: { id },
      data: { progress: progressParsed.data.progress, notes: progressParsed.data.notes },
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

  await getOwnedUserItem(id, user.id);

  await prisma.userItem.delete({ where: { id } });

  return successResponse({ id });
}

export const PATCH = compose(withErrorHandler, withRateLimit)(patchHandler);
export const DELETE = compose(withErrorHandler, withRateLimit)(deleteHandler);
```

- [ ] **Step 3: Verify with a type-check**

```bash
npx tsc --noEmit src/app/api/user-items/route.ts "src/app/api/user-items/[id]/route.ts" 2>&1 | grep -v "Cannot find module"
```

Expected: no errors specific to these two files.

- [ ] **Step 4: Manual verification**

With the dev server running and signed in (use browser console or `curl` with a session cookie):

```js
const item = await fetch("/api/items").then(r => r.json()).then(d => d.data[0]);
const created = await fetch("/api/user-items", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ itemId: item.id, status: "ACTIVE" }) }).then(r => r.json());
console.log(created); // success: true, status: "ACTIVE"
const list = await fetch("/api/user-items").then(r => r.json());
console.log(list.data.length); // >= 1
await fetch(`/api/user-items/${created.data.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isFavorite: true }) }).then(r => r.json());
```

Expected: each call returns `{ success: true, ... }`, and the favorite toggle persists on a follow-up `GET /api/user-items`.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/user-items
git commit -m "feat: add user-items API routes (personal tracking CRUD)"
```

---

### Task 6: Notifications (generic check function + routes)

**Files:**
- Create: `src/lib/notifications.ts` (overwrites the old domain-specific version)
- Test: `tests/unit/lib/notifications.test.ts`
- Modify: `src/app/api/notifications/check/route.ts`
- Modify: `src/app/api/notifications/route.ts`
- Modify: `src/app/api/notifications/mark-read/route.ts`
- Modify: `src/app/api/notifications/settings/route.ts` (no functional change needed — verify only)

**Interfaces:**
- Consumes: `simulateExampleItemUpdate` (Task 1), `UserItem`/`Item`/`Notification` Prisma models (Task 2).
- Produces: `checkForItemUpdates(userId: string): Promise<{ created: number }>` — consumed by `POST /api/notifications/check` (this task) and by Plan A3's cron-trigger wiring in `custom-worker.ts`.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/lib/notifications.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFindUnique = vi.fn();
const mockFindMany = vi.fn();
const mockTransaction = vi.fn();
const mockUpdate = vi.fn();

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    user: { findUnique: (...args: unknown[]) => mockFindUnique(...args), update: (...args: unknown[]) => mockUpdate(...args) },
    userItem: { findMany: (...args: unknown[]) => mockFindMany(...args) },
    notification: { create: vi.fn() },
    item: { update: vi.fn() },
    $transaction: (...args: unknown[]) => mockTransaction(...args),
  },
}));

vi.mock("@/lib/api/example-source", () => ({
  simulateExampleItemUpdate: vi.fn(),
}));

import { checkForItemUpdates } from "@/lib/notifications";
import { simulateExampleItemUpdate } from "@/lib/api/example-source";

describe("checkForItemUpdates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTransaction.mockResolvedValue([{}, {}]);
    mockUpdate.mockResolvedValue({});
  });

  it("returns created: 0 when notifications are disabled", async () => {
    mockFindUnique.mockResolvedValue({ id: "u1", notificationsEnabled: false, lastNotificationCheckAt: null });

    const result = await checkForItemUpdates("u1");

    expect(result).toEqual({ created: 0 });
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it("returns created: 0 when throttled (checked less than an hour ago)", async () => {
    mockFindUnique.mockResolvedValue({
      id: "u1",
      notificationsEnabled: true,
      lastNotificationCheckAt: new Date(),
    });

    const result = await checkForItemUpdates("u1");

    expect(result).toEqual({ created: 0 });
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it("creates a notification when an item's totalUnits increased", async () => {
    mockFindUnique.mockResolvedValue({ id: "u1", notificationsEnabled: true, lastNotificationCheckAt: null });
    mockFindMany.mockResolvedValue([
      { id: "ui1", item: { id: "item1", externalId: "ex-001", title: "The Starlight Archive", totalUnits: 142 } },
    ]);
    vi.mocked(simulateExampleItemUpdate).mockResolvedValue(143);

    const result = await checkForItemUpdates("u1");

    expect(result).toEqual({ created: 1 });
    expect(mockTransaction).toHaveBeenCalledTimes(1);
  });

  it("does not create a notification when totalUnits is unchanged", async () => {
    mockFindUnique.mockResolvedValue({ id: "u1", notificationsEnabled: true, lastNotificationCheckAt: null });
    mockFindMany.mockResolvedValue([
      { id: "ui1", item: { id: "item1", externalId: "ex-001", title: "The Starlight Archive", totalUnits: 142 } },
    ]);
    vi.mocked(simulateExampleItemUpdate).mockResolvedValue(142);

    const result = await checkForItemUpdates("u1");

    expect(result).toEqual({ created: 0 });
    expect(mockTransaction).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run tests/unit/lib/notifications.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/notifications'` or the named export `checkForItemUpdates` doesn't exist yet (the file currently exports the old `checkForNewEpisodes`).

- [ ] **Step 3: Write the implementation**

Overwrite `src/lib/notifications.ts` in full:

```ts
import { prisma } from "./db/prisma";
import { simulateExampleItemUpdate } from "./api/example-source";

const THROTTLE_MS = 60 * 60 * 1000; // 1 hour

export async function checkForItemUpdates(userId: string): Promise<{ created: number }> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.notificationsEnabled) return { created: 0 };

  if (user.lastNotificationCheckAt) {
    const elapsed = Date.now() - user.lastNotificationCheckAt.getTime();
    if (elapsed < THROTTLE_MS) return { created: 0 };
  }

  const trackedItems = await prisma.userItem.findMany({
    where: { userId },
    include: { item: true },
  });

  const results = await Promise.all(
    trackedItems.map(async (tracked): Promise<number> => {
      const { item } = tracked;
      try {
        const newTotal = await simulateExampleItemUpdate(item.externalId);
        if (newTotal !== null && item.totalUnits !== null && newTotal > item.totalUnits) {
          await prisma.$transaction([
            prisma.notification.create({
              data: {
                userId,
                itemId: item.id,
                message: `${item.title} just reached unit ${newTotal}`,
              },
            }),
            prisma.item.update({
              where: { id: item.id },
              data: { totalUnits: newTotal },
            }),
          ]);
          return 1;
        }
      } catch (err) {
        console.error(`[Notifications] Failed to check ${item.source}-${item.externalId}:`, err);
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

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run tests/unit/lib/notifications.test.ts
```

Expected: PASS — 4/4 tests passing.

- [ ] **Step 5: Update the notification routes**

In `src/app/api/notifications/check/route.ts`, replace the import and call:

```ts
import { requireAuth } from "@/lib/auth/helpers";
import { checkForItemUpdates } from "@/lib/notifications";
import { successResponse } from "@/lib/utils/api-response";
import { withErrorHandler, withRateLimit, compose } from "@/lib/utils/middleware";

async function postHandler() {
  const user = await requireAuth();
  const result = await checkForItemUpdates(user.id);
  return successResponse(result);
}

export const POST = compose(withErrorHandler, withRateLimit)(postHandler);
```

In `src/app/api/notifications/route.ts`, replace `include: { series: true }` with `include: { item: true }` (the rest of the file is unchanged):

```ts
import { prisma } from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth/helpers";
import { successResponse } from "@/lib/utils/api-response";
import { withErrorHandler, withRateLimit, compose } from "@/lib/utils/middleware";

async function getHandler() {
  const user = await requireAuth();

  const [notifications, unreadCount, userRow] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: user.id },
      include: { item: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.notification.count({
      where: { userId: user.id, isRead: false },
    }),
    prisma.user.findUnique({
      where: { id: user.id },
      select: { notificationsEnabled: true },
    }),
  ]);

  return successResponse({
    notifications,
    unreadCount,
    notificationsEnabled: userRow?.notificationsEnabled ?? true,
  });
}

export const GET = compose(withErrorHandler, withRateLimit)(getHandler);
```

`src/app/api/notifications/mark-read/route.ts` and `src/app/api/notifications/settings/route.ts` need no changes — both operate on `userId`/`isRead`/`notificationsEnabled`, none of which changed shape. Open both files and confirm neither references `series` or `libraryItemId` anywhere (`mark-read/route.ts` doesn't; `settings/route.ts` doesn't — both already verified against the current file contents during planning).

- [ ] **Step 6: Verify with a type-check**

```bash
npx tsc --noEmit src/lib/notifications.ts src/app/api/notifications/check/route.ts src/app/api/notifications/route.ts src/app/api/notifications/mark-read/route.ts src/app/api/notifications/settings/route.ts 2>&1 | grep -v "Cannot find module"
```

Expected: no errors specific to these five files.

- [ ] **Step 7: Commit**

```bash
git add src/lib/notifications.ts tests/unit/lib/notifications.test.ts src/app/api/notifications
git commit -m "feat: genericize notification check to checkForItemUpdates"
```

---

## Self-Review Notes

**Spec coverage:** Veri modeli (Task 2) ✓, örnek dış kaynak (Task 1) ✓, bildirim mimarisi/`checkForItemUpdates` (Task 6) ✓, sayfalar/route'lar — bu plan sadece API kısmını kapsıyor, sayfa/bileşen kısmı Plan A2'nin kapsamında (spec'te zaten ayrı sub-project olarak işaretli) ✓.

**Placeholder scan:** Temiz — her adımda tam kod var, "TODO"/"benzer şekilde" yok.

**Type consistency:** `Item`/`UserItem`/`Rating`/`Notification` alan adları Task 2'den Task 3-6'ya kadar tutarlı (`itemId`, `totalUnits`, `status`, `progress`, `notes`, `isFavorite`). `ItemCard`/`ItemDetail`/`UserItemEntry` (Task 3) Task 4-5'in döndürdüğü Prisma satırlarının şekliyle uyumlu.

**Not (Task 2, Step 5'te belirtildi):** Bu plan tamamlandığında proje TÜM domain-spesifik dosyalar (sayfalar, bileşenler, eski API route'ları) silinmediği için **type-check hâlâ hata verecek** — bu beklenen bir ara durumdur, Plan A3'ün (temizlik sub-project'i) sonunda çözülür. Plan A2 (sayfalar/bileşenler) bitene kadar `npm run dev` de tam olarak çalışmayabilir; bu üç planın hepsi bitmeden uygulama eksiksiz çalışır duruma gelmez — bu, sub-project'lere bölmenin kabul edilen maliyetidir.
