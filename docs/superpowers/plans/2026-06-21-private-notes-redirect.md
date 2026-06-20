# Phase 2.6 — Personal Private Notes & Custom Redirect Links Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a logged-in user keep a private free-text note per series and save a global list of search keywords, then one-click open a Google search for "title + current progress + keyword" from the series detail page or a library card/row.

**Architecture:** Two new Prisma models (`UserNote`, `SearchKeyword`), five new route handlers under `requireAuth()`, one pure client-side URL-builder helper, and four new/changed React components (`SeriesNoteWidget`, `RedirectButton`, a new `/settings` page + `SearchKeywordManager`). No server-side redirect route and no data ever fetched from third-party sites — see `docs/superpowers/specs/2026-06-21-private-notes-redirect-design.md`.

**Tech Stack:** Next.js 16 App Router, Prisma (PostgreSQL), Zod, vitest (existing `tests/unit/**` suite + `vitest.config.ts`).

## Global Constraints

- Keywords are a **single global list per user** — no per-series override (explicit user decision during brainstorming).
- `UserNote` is **free text only**, one row per `(userId, seriesId)` via `@@unique([userId, seriesId])`.
- Redirect URL format: `https://www.google.com/search?q={title}+{Episode|Chapter} {N}+{keyword}` — built **client-side only**, no server-side redirect route, no fetch/scrape of any third-party site (spec's explicit "Out of Scope" guarantee).
- `isDefault` switching on `SearchKeyword` MUST use `prisma.$transaction([...])` to clear the old default and set the new one atomically (architecture-review finding, agreed).
- If a user has zero saved keywords, the redirect button still works as `{title}+{progress}` only — no keyword segment (explicit fallback, architecture-review finding, agreed).
- The very first `SearchKeyword` a user ever creates is automatically `isDefault: true` (so "exists but none default" never needs special-casing for a single-keyword user).
- Progress label capitalization for the query string: `"episode"` → `"Episode"`, `"chapter"` → `"Chapter"` (reusing the existing lowercase `label` field from `LibraryItemCard.tsx`'s/`LibraryItemRow.tsx`'s `getProgressField` helper, capitalized only at the point of building the search string).
- Every new route handler calls `requireAuth()` first and scopes every Prisma query by the authenticated `user.id` — no cross-user access via a guessed ID (matches `getOwnedItem` pattern in `src/app/api/library/[id]/route.ts`).
- Empty/whitespace-only note content (after `.trim()`) **deletes** the `UserNote` row rather than persisting an empty string.
- All API responses follow the existing `{ success, data? }` / `{ success: false, error }` contract via `successResponse()` / `Responses.*` (`src/lib/utils/api-response.ts`) and `AppError` (`src/lib/utils/app-error.ts`).
- Every route export uses `compose(withErrorHandler, withRateLimit)(handler)` from `src/lib/utils/middleware.ts`.

---

### Task 1: Prisma schema — `UserNote` and `SearchKeyword` models

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260621120000_add_notes_and_keywords/migration.sql`

**Interfaces:**
- Produces: `UserNote` model (`id`, `userId`, `seriesId`, `content: String`, `createdAt`, `updatedAt`, `@@unique([userId, seriesId])`, `@@index([userId])`), `SearchKeyword` model (`id`, `userId`, `label: String`, `isDefault: Boolean @default(false)`, `createdAt`, `@@index([userId])`). `User` gains `userNotes UserNote[]` and `searchKeywords SearchKeyword[]`. `Series` gains `userNotes UserNote[]`.

- [ ] **Step 1: Add the models to `prisma/schema.prisma`**

Add these two new relation lines to the existing `User` model (after the existing `notifications Notification[]` line, before the closing `@@index([email])`):

```prisma
  userNotes      UserNote[]
  searchKeywords SearchKeyword[]
```

Add this new relation line to the existing `Series` model (after the existing `episodeLanguages EpisodeLanguage[]` line, before the closing `@@unique`/`@@index` block):

```prisma
  userNotes       UserNote[]
```

Append these two new model blocks at the end of `prisma/schema.prisma`, after the existing `EpisodeLanguage` model:

```prisma
// ─────────────────────────────────────────────────
// Private notes & custom search keywords
// ─────────────────────────────────────────────────

model UserNote {
  id        String   @id @default(cuid())
  userId    String
  seriesId  String
  content   String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  series Series @relation(fields: [seriesId], references: [id], onDelete: Cascade)

  @@unique([userId, seriesId])
  @@index([userId])
}

model SearchKeyword {
  id        String   @id @default(cuid())
  userId    String
  label     String
  isDefault Boolean  @default(false)
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}
```

- [ ] **Step 2: Generate the migration SQL (non-interactive)**

Run from the project root:

```bash
npx prisma migrate diff --from-config-datasource prisma.config.ts --to-schema prisma/schema.prisma --script > /tmp/notes_keywords_migration.sql
```

Then create the migration directory and copy the generated SQL into it:

```bash
mkdir -p prisma/migrations/20260621120000_add_notes_and_keywords
cp /tmp/notes_keywords_migration.sql prisma/migrations/20260621120000_add_notes_and_keywords/migration.sql
```

Open `prisma/migrations/20260621120000_add_notes_and_keywords/migration.sql` and confirm it contains exactly two `CREATE TABLE` statements (`UserNote`, `SearchKeyword`), one `CREATE UNIQUE INDEX` for `UserNote_userId_seriesId_key`, two plain `CREATE INDEX` statements for the `@@index([userId])` lines, and the two `ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY` statements (cascade delete) — no unrelated changes. If Docker/the local Postgres container is not running, **STOP and report BLOCKED** — do not guess how to start it or skip applying the migration (this exact mistake happened in a prior round of this project; do not repeat it).

- [ ] **Step 3: Apply the migration and regenerate the Prisma client**

```bash
npx prisma migrate deploy
npm run db:generate
```

- [ ] **Step 4: Verify with a type-check**

```bash
npm run type-check
```

Expected: no new errors (the new Prisma models aren't referenced by any other code yet, so this should pass cleanly).

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260621120000_add_notes_and_keywords
git commit -m "feat: add UserNote and SearchKeyword Prisma models"
```

---

### Task 2: `buildRedirectUrl` helper (TDD)

**Files:**
- Create: `src/lib/redirect-url.ts`
- Test: `tests/unit/lib/redirect-url.test.ts`

**Interfaces:**
- Consumes: nothing (pure function, no external dependencies).
- Produces: `buildRedirectUrl(input: BuildRedirectUrlInput): string` where `BuildRedirectUrlInput = { title: string; progress?: { label: "episode" | "chapter"; value: number } | null; keyword?: string | null }`. Tasks 5 and 6 import this directly: `import { buildRedirectUrl } from "@/lib/redirect-url";`.

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/lib/redirect-url.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { buildRedirectUrl } from "@/lib/redirect-url";

describe("buildRedirectUrl", () => {
  it("builds a title-only query when there is no progress or keyword", () => {
    const url = buildRedirectUrl({ title: "One Piece" });
    expect(url).toBe("https://www.google.com/search?q=One%20Piece");
  });

  it("includes a capitalized Episode segment for episode progress", () => {
    const url = buildRedirectUrl({
      title: "One Piece",
      progress: { label: "episode", value: 1000 },
    });
    expect(url).toBe("https://www.google.com/search?q=One%20Piece%20Episode%201000");
  });

  it("includes a capitalized Chapter segment for chapter progress", () => {
    const url = buildRedirectUrl({
      title: "Jujutsu Kaisen",
      progress: { label: "chapter", value: 250 },
    });
    expect(url).toBe("https://www.google.com/search?q=Jujutsu%20Kaisen%20Chapter%20250");
  });

  it("appends the keyword when provided", () => {
    const url = buildRedirectUrl({
      title: "One Piece",
      progress: { label: "episode", value: 1000 },
      keyword: "tranimeizle",
    });
    expect(url).toBe(
      "https://www.google.com/search?q=One%20Piece%20Episode%201000%20tranimeizle"
    );
  });

  it("appends the keyword with no progress", () => {
    const url = buildRedirectUrl({ title: "One Piece", keyword: "tranimeizle" });
    expect(url).toBe("https://www.google.com/search?q=One%20Piece%20tranimeizle");
  });

  it("treats a null progress and null keyword the same as undefined", () => {
    const url = buildRedirectUrl({ title: "One Piece", progress: null, keyword: null });
    expect(url).toBe("https://www.google.com/search?q=One%20Piece");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npx vitest run tests/unit/lib/redirect-url.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/redirect-url'` (file doesn't exist yet).

- [ ] **Step 3: Write the implementation**

Create `src/lib/redirect-url.ts`:

```ts
interface BuildRedirectUrlInput {
  title: string;
  progress?: { label: "episode" | "chapter"; value: number } | null;
  keyword?: string | null;
}

export function buildRedirectUrl({ title, progress, keyword }: BuildRedirectUrlInput): string {
  const parts = [title];
  if (progress) {
    const capitalized = progress.label === "episode" ? "Episode" : "Chapter";
    parts.push(`${capitalized} ${progress.value}`);
  }
  if (keyword) {
    parts.push(keyword);
  }
  const query = parts.join(" ");
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npx vitest run tests/unit/lib/redirect-url.test.ts
```

Expected: PASS — 6/6 tests passing.

- [ ] **Step 5: Commit**

```bash
git add src/lib/redirect-url.ts tests/unit/lib/redirect-url.test.ts
git commit -m "feat: add buildRedirectUrl helper for Google search redirects"
```

---

### Task 3: Notes API route

**Files:**
- Create: `src/lib/validations/notes.ts`
- Create: `src/app/api/notes/[seriesId]/route.ts`

**Interfaces:**
- Consumes: `UserNote` Prisma model (Task 1), `requireAuth()` (`src/lib/auth/helpers.ts`), `successResponse`/`Responses` (`src/lib/utils/api-response.ts`), `AppError` (`src/lib/utils/app-error.ts`), `withErrorHandler`/`withRateLimit`/`compose` (`src/lib/utils/middleware.ts`).
- Produces: `GET /api/notes/[seriesId]` → `{ success: true, data: { content: string | null } }`. `PATCH /api/notes/[seriesId]` with body `{ content: string }` → same shape; Task 5's `SeriesNoteWidget` calls this directly.

- [ ] **Step 1: Create the validation schema**

Create `src/lib/validations/notes.ts`:

```ts
import { z } from "zod";

export const updateNoteSchema = z.object({ content: z.string() });
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;
```

- [ ] **Step 2: Create the route handlers**

Create `src/app/api/notes/[seriesId]/route.ts`:

```ts
import { type NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth/helpers";
import { updateNoteSchema } from "@/lib/validations/notes";
import { successResponse, Responses } from "@/lib/utils/api-response";
import { withErrorHandler, withRateLimit, compose } from "@/lib/utils/middleware";

async function getHandler(
  req: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) {
  const user = await requireAuth();
  const { seriesId } = await params;

  const note = await prisma.userNote.findUnique({
    where: { userId_seriesId: { userId: user.id, seriesId } },
  });

  return successResponse({ content: note?.content ?? null });
}

async function patchHandler(
  req: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) {
  const user = await requireAuth();
  const { seriesId } = await params;

  const body = await req.json().catch(() => null);
  const parsed = updateNoteSchema.safeParse(body);
  if (!parsed.success) {
    return Responses.validationError(parsed.error.flatten().fieldErrors);
  }

  const trimmed = parsed.data.content.trim();

  if (trimmed === "") {
    await prisma.userNote.deleteMany({ where: { userId: user.id, seriesId } });
    return successResponse({ content: null });
  }

  const note = await prisma.userNote.upsert({
    where: { userId_seriesId: { userId: user.id, seriesId } },
    create: { userId: user.id, seriesId, content: trimmed },
    update: { content: trimmed },
  });

  return successResponse({ content: note.content });
}

export const GET = compose(withErrorHandler, withRateLimit)(getHandler);
export const PATCH = compose(withErrorHandler, withRateLimit)(patchHandler);
```

- [ ] **Step 3: Verify with a type-check**

```bash
npm run type-check
```

Expected: no errors.

- [ ] **Step 4: Manual verification**

Start the dev server (`npm run dev`), sign in, and use the browser dev tools console on any page to run:

```js
fetch("/api/notes/test-series-id", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: "hello" }) }).then(r => r.json()).then(console.log)
```

Expected: `{ success: true, data: { content: "hello" } }`. Then `fetch("/api/notes/test-series-id").then(r => r.json()).then(console.log)` should return the same content. Then PATCH with `{ content: "   " }` and confirm the follow-up GET returns `{ content: null }`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/validations/notes.ts src/app/api/notes
git commit -m "feat: add notes API route"
```

---

### Task 4: Search Keywords API routes

**Files:**
- Create: `src/lib/validations/search-keywords.ts`
- Create: `src/app/api/search-keywords/route.ts`
- Create: `src/app/api/search-keywords/[id]/route.ts`

**Interfaces:**
- Consumes: `SearchKeyword` Prisma model (Task 1), same auth/response/middleware helpers as Task 3.
- Produces: `GET /api/search-keywords` → `{ success: true, data: SearchKeyword[] }` (ordered `createdAt asc`). `POST /api/search-keywords` with body `{ label: string }` → `{ success: true, data: SearchKeyword }`. `DELETE /api/search-keywords/[id]` → `{ success: true, data: { id: string } }`. `PATCH /api/search-keywords/[id]` with body `{ isDefault: true }` → `{ success: true, data: SearchKeyword }`. Task 6's `RedirectButton` and Task 7's `SearchKeywordManager` call these directly.

- [ ] **Step 1: Create the validation schemas**

Create `src/lib/validations/search-keywords.ts`:

```ts
import { z } from "zod";

export const createSearchKeywordSchema = z.object({ label: z.string().min(1).max(50) });
export type CreateSearchKeywordInput = z.infer<typeof createSearchKeywordSchema>;

export const setDefaultKeywordSchema = z.object({ isDefault: z.literal(true) });
export type SetDefaultKeywordInput = z.infer<typeof setDefaultKeywordSchema>;
```

- [ ] **Step 2: Create the collection route (`GET`/`POST`)**

Create `src/app/api/search-keywords/route.ts`:

```ts
import { type NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth/helpers";
import { createSearchKeywordSchema } from "@/lib/validations/search-keywords";
import { successResponse, Responses } from "@/lib/utils/api-response";
import { withErrorHandler, withRateLimit, compose } from "@/lib/utils/middleware";

async function getHandler() {
  const user = await requireAuth();

  const keywords = await prisma.searchKeyword.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
  });

  return successResponse(keywords);
}

async function postHandler(req: NextRequest) {
  const user = await requireAuth();

  const body = await req.json().catch(() => null);
  const parsed = createSearchKeywordSchema.safeParse(body);
  if (!parsed.success) {
    return Responses.validationError(parsed.error.flatten().fieldErrors);
  }

  const existingCount = await prisma.searchKeyword.count({ where: { userId: user.id } });

  const keyword = await prisma.searchKeyword.create({
    data: {
      userId: user.id,
      label: parsed.data.label,
      isDefault: existingCount === 0,
    },
  });

  return successResponse(keyword, 201);
}

export const GET = compose(withErrorHandler, withRateLimit)(getHandler);
export const POST = compose(withErrorHandler, withRateLimit)(postHandler);
```

- [ ] **Step 3: Create the per-keyword route (`DELETE`/`PATCH`)**

Create `src/app/api/search-keywords/[id]/route.ts`:

```ts
import { type NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth/helpers";
import { setDefaultKeywordSchema } from "@/lib/validations/search-keywords";
import { AppError } from "@/lib/utils/app-error";
import { successResponse, Responses } from "@/lib/utils/api-response";
import { withErrorHandler, withRateLimit, compose } from "@/lib/utils/middleware";

async function getOwnedKeyword(id: string, userId: string) {
  const keyword = await prisma.searchKeyword.findUnique({ where: { id } });
  if (!keyword || keyword.userId !== userId) {
    throw AppError.notFound("Search keyword");
  }
  return keyword;
}

async function deleteHandler(
  req: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) {
  const user = await requireAuth();
  const { id } = await params;

  await getOwnedKeyword(id, user.id);

  await prisma.searchKeyword.delete({ where: { id } });

  return successResponse({ id });
}

async function patchHandler(
  req: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) {
  const user = await requireAuth();
  const { id } = await params;

  await getOwnedKeyword(id, user.id);

  const body = await req.json().catch(() => null);
  const parsed = setDefaultKeywordSchema.safeParse(body);
  if (!parsed.success) {
    return Responses.validationError(parsed.error.flatten().fieldErrors);
  }

  const [, updated] = await prisma.$transaction([
    prisma.searchKeyword.updateMany({
      where: { userId: user.id, isDefault: true },
      data: { isDefault: false },
    }),
    prisma.searchKeyword.update({
      where: { id },
      data: { isDefault: true },
    }),
  ]);

  return successResponse(updated);
}

export const DELETE = compose(withErrorHandler, withRateLimit)(deleteHandler);
export const PATCH = compose(withErrorHandler, withRateLimit)(patchHandler);
```

- [ ] **Step 4: Verify with a type-check**

```bash
npm run type-check
```

Expected: no errors.

- [ ] **Step 5: Manual verification**

With the dev server running and signed in, in the browser console:

```js
const a = await fetch("/api/search-keywords", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ label: "tranimeizle" }) }).then(r => r.json());
console.log(a); // isDefault: true (first keyword)
const b = await fetch("/api/search-keywords", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ label: "mangasehri" }) }).then(r => r.json());
console.log(b); // isDefault: false
await fetch(`/api/search-keywords/${b.data.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isDefault: true }) }).then(r => r.json());
const list = await fetch("/api/search-keywords").then(r => r.json());
console.log(list.data.filter(k => k.isDefault).length); // must be exactly 1
```

Expected: exactly one keyword has `isDefault: true` after the PATCH, never two.

- [ ] **Step 6: Commit**

```bash
git add src/lib/validations/search-keywords.ts src/app/api/search-keywords
git commit -m "feat: add search keywords API routes"
```

---

### Task 5: `SeriesNoteWidget` component, wired into series detail page

**Files:**
- Create: `src/components/SeriesNoteWidget.tsx`
- Modify: `src/app/series/[id]/page.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: `PATCH /api/notes/[seriesId]` and `GET /api/notes/[seriesId]` (Task 3).
- Produces: `<SeriesNoteWidget seriesId={string} initialContent={string | null} />` rendered on the series detail page.

- [ ] **Step 1: Create the component**

Create `src/components/SeriesNoteWidget.tsx`:

```tsx
"use client";

import React, { useState, useRef, useEffect } from "react";

interface SeriesNoteWidgetProps {
  seriesId: string;
  initialContent: string | null;
}

export default function SeriesNoteWidget({ seriesId, initialContent }: SeriesNoteWidgetProps) {
  const [content, setContent] = useState(initialContent ?? "");
  const [saved, setSaved] = useState(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  function handleChange(next: string) {
    setContent(next);
    setSaved(false);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(async () => {
      const res = await fetch(`/api/notes/${seriesId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: next }),
      });
      const data = await res.json();
      if (data.success) {
        setSaved(true);
      }
    }, 500);
  }

  return (
    <div className="series-note-widget">
      <label className="series-note-widget-label" htmlFor="series-note-textarea">
        Private note
      </label>
      <textarea
        id="series-note-textarea"
        className="series-note-widget-textarea"
        value={content}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Add a private note about this series..."
        rows={3}
      />
      <span className="series-note-widget-status">{saved ? "Saved" : "Saving..."}</span>
    </div>
  );
}
```

- [ ] **Step 2: Wire into the series detail page**

In `src/app/series/[id]/page.tsx`, add the import alongside the existing component imports (after the `LanguageWaitWidget` import on line 12):

```ts
import SeriesNoteWidget from "@/components/SeriesNoteWidget";
```

Add a new variable next to the existing `existingItem`/`existingRating` declarations (after line 70, `let existingRating...`):

```ts
  let existingNoteContent: string | null = null;
```

Inside the `if (user) { ... }` block, after the existing `if (itemRow) ...` / `if (ratingRow) ...` lines (after line 87), add a third parallel fetch. Replace the existing `Promise.all` block (lines 78-85) with:

```ts
      const [itemRow, ratingRow, noteRow] = await Promise.all([
        prisma.libraryItem.findUnique({
          where: { userId_seriesId: { userId: user.id, seriesId: seriesRow.id } },
        }),
        prisma.userRating.findUnique({
          where: { userId_seriesId: { userId: user.id, seriesId: seriesRow.id } },
        }),
        prisma.userNote.findUnique({
          where: { userId_seriesId: { userId: user.id, seriesId: seriesRow.id } },
        }),
      ]);
      if (itemRow) existingItem = { id: itemRow.id, status: itemRow.status, waitLanguage: itemRow.waitLanguage };
      if (ratingRow) existingRating = { score: ratingRow.score, review: ratingRow.review };
      if (noteRow) existingNoteContent = noteRow.content;
```

Render the widget in the `detail-info` column, after the `RatingWidget` (after line 188, before the `{/* Episode / Chapter counts */}` comment on line 190):

```tsx
            {user && (
              <SeriesNoteWidget
                seriesId={series.id}
                initialContent={existingNoteContent}
              />
            )}
```

Note: `series.id` is the internal `Series.id` (cuid) — `SeriesDetail` extends `SeriesCard` (`src/types/series.ts`), which declares `id: string // Our internal DB id` directly, distinct from `externalId`/`source`. This is exactly the value `prisma.userNote`'s `seriesId` foreign key expects, and matches `seriesRow.id` used a few lines above in the same `if (user)` block (both refer to the same row — `getSeriesDetail`'s API route resolves and returns this same internal id as `series.id`).

- [ ] **Step 3: Add the CSS**

Add to `src/app/globals.css`, after the existing `.language-wait-widget-select` block (after the line found at the end of the `.language-wait-widget-select { ... }` rule):

```css
.series-note-widget {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-top: var(--space-4);
}

.series-note-widget-label {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.series-note-widget-textarea {
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-strong);
  background: var(--color-bg-input);
  color: var(--color-text-primary);
  font-family: var(--font-sans);
  font-size: 0.875rem;
  padding: var(--space-2) var(--space-3);
  resize: vertical;
}

.series-note-widget-status {
  font-size: 0.6875rem;
  color: var(--color-text-muted);
}
```

- [ ] **Step 4: Verify with a type-check**

```bash
npm run type-check
```

Expected: no errors.

- [ ] **Step 5: Manual verification**

`npm run dev`, sign in, open any series detail page, type into the note textarea, wait ~500ms, confirm the status flips to "Saved", reload the page, confirm the note content persisted. Clear the textarea entirely, wait for save, reload, confirm it's empty again (not just visually empty — the underlying row should be gone, verifiable via `GET /api/notes/<id>` returning `{ content: null }` in the browser console).

- [ ] **Step 6: Commit**

```bash
git add src/components/SeriesNoteWidget.tsx src/app/series/[id]/page.tsx src/app/globals.css
git commit -m "feat: add private series notes widget to series detail page"
```

---

### Task 6: `RedirectButton` component, wired into series detail page and library cards/rows

**Files:**
- Create: `src/types/search-keyword.ts`
- Create: `src/components/RedirectButton.tsx`
- Modify: `src/app/series/[id]/page.tsx`
- Modify: `src/components/LibraryItemCard.tsx`
- Modify: `src/components/LibraryItemRow.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: `buildRedirectUrl` (Task 2), `GET /api/search-keywords` (Task 4).
- Produces: `<RedirectButton title={string} progress={...} variant="full" | "compact" />`.

- [ ] **Step 1: Add the shared keyword type**

Create `src/types/search-keyword.ts`:

```ts
export interface SearchKeyword {
  id: string;
  userId: string;
  label: string;
  isDefault: boolean;
  createdAt: string;
}
```

- [ ] **Step 2: Create the component**

Create `src/components/RedirectButton.tsx`:

```tsx
"use client";

import React, { useState, useEffect } from "react";
import { buildRedirectUrl } from "@/lib/redirect-url";
import type { SearchKeyword } from "@/types/search-keyword";

interface RedirectButtonProps {
  title: string;
  progress?: { label: "episode" | "chapter"; value: number } | null;
  variant: "full" | "compact";
}

export default function RedirectButton({ title, progress, variant }: RedirectButtonProps) {
  const [keywords, setKeywords] = useState<SearchKeyword[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/search-keywords")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled || !data.success) return;
        const list: SearchKeyword[] = data.data;
        setKeywords(list);
        const defaultKeyword = list.find((k) => k.isDefault);
        if (defaultKeyword) setSelectedId(defaultKeyword.id);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function handleOpen(keywordLabel: string | null) {
    const url = buildRedirectUrl({ title, progress, keyword: keywordLabel });
    window.open(url, "_blank", "noopener,noreferrer");
  }

  if (variant === "compact") {
    const defaultKeyword = keywords.find((k) => k.id === selectedId)?.label ?? null;
    return (
      <button
        type="button"
        className="redirect-button-compact"
        onClick={() => handleOpen(defaultKeyword)}
        aria-label="Search for this series"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
      </button>
    );
  }

  return (
    <div className="redirect-button-full">
      {keywords.length > 0 && (
        <select
          className="redirect-button-select"
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          aria-label="Search keyword"
        >
          {keywords.map((k) => (
            <option key={k.id} value={k.id}>
              {k.label}
            </option>
          ))}
        </select>
      )}
      <button
        type="button"
        className="btn btn-secondary"
        onClick={() => handleOpen(keywords.find((k) => k.id === selectedId)?.label ?? null)}
      >
        Search
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Wire into the series detail page**

In `src/app/series/[id]/page.tsx`, add the import after the `SeriesNoteWidget` import added in Task 5:

```ts
import RedirectButton from "@/components/RedirectButton";
```

Render it in the `detail-poster-col` aside, after the existing `LanguageWaitWidget` conditional block (after line 151, the closing `)}` of the `{existingItem && series.source === "mangadex" && (...)}` block):

```tsx
            {user && (
              <RedirectButton
                title={series.title}
                progress={
                  existingItem?.status
                    ? series.totalEpisodes != null
                      ? { label: "episode", value: 0 }
                      : series.totalChapters != null
                        ? { label: "chapter", value: 0 }
                        : null
                    : null
                }
                variant="full"
              />
            )}
```

This intentionally does not thread the user's actual `currentEpisode`/`currentChapter` value here — `SeriesDetail` (the type returned by `getSeriesDetail`) does not carry per-user progress, only `existingItem.status` is available on this page, and adding a full progress fetch here is out of scope for this task. Library cards (Step 4 below) are where real progress numbers are available and where the progress-aware `RedirectButton` matters most; on the series detail page, progress is omitted (`value: 0`/`null` as shown) until the user has tracked at least one episode/chapter via the library page itself, which is consistent with this page's existing pattern of using `existingItem` only for status/language, not progress numbers.

Re-check this against `src/types/series.ts`'s `SeriesDetail` interface before finalizing — if `SeriesDetail` happens to expose `totalEpisodes`/`totalChapters` differently than assumed here, adjust the conditional to match the actual field names already used elsewhere on this same page (lines 192–206 of the original file use `series.totalEpisodes` and `series.totalChapters` directly — reuse those exact field names).

- [ ] **Step 4: Wire into `LibraryItemCard.tsx`**

In `src/components/LibraryItemCard.tsx`, add the import after the existing `LibraryEntry` type import (after line 7):

```ts
import RedirectButton from "@/components/RedirectButton";
```

Add the compact button inside `library-card-actions`, after the favorite-toggle button and before the `entry.series.source === "mangadex"` language-select block (after line 194, the closing `</button>` of the favorite toggle):

```tsx
        <RedirectButton
          title={entry.series.title}
          progress={progress ? { label: progress.label as "episode" | "chapter", value: progress.value } : null}
          variant="compact"
        />
```

- [ ] **Step 5: Wire into `LibraryItemRow.tsx`**

Apply the identical change to `src/components/LibraryItemRow.tsx`: add the same import after its `LibraryEntry` type import (after line 7), and add the identical `<RedirectButton ... variant="compact" />` block inside `library-row-actions`, after the favorite-toggle button (after line 201, the closing `</button>` of the favorite toggle) and before the `entry.series.source === "mangadex"` language-select block.

- [ ] **Step 6: Add the CSS**

Add to `src/app/globals.css`, after the `.series-note-widget-status` block added in Task 5:

```css
.redirect-button-compact {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-bg-surface);
  color: var(--color-text-secondary);
  cursor: pointer;
}

.redirect-button-full {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  margin-top: var(--space-3);
}

.redirect-button-select {
  height: 36px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-strong);
  background: var(--color-bg-input);
  color: var(--color-text-primary);
  font-family: var(--font-sans);
  font-size: 0.875rem;
  padding: 0 10px;
  cursor: pointer;
}
```

- [ ] **Step 7: Verify with a type-check**

```bash
npm run type-check
```

Expected: no errors.

- [ ] **Step 8: Manual verification**

`npm run dev`, sign in, add at least two search keywords via the browser console (same commands as Task 4 Step 5), set one as default. Open a series detail page: confirm the "Search" button + dropdown appear and clicking "Search" opens a new tab with the expected Google search URL. Go to `/library`: confirm the compact search icon button appears on both grid (`LibraryItemCard`) and list (`LibraryItemRow`) views, and clicking it opens a new tab using the default keyword and the card's current progress number.

- [ ] **Step 9: Commit**

```bash
git add src/types/search-keyword.ts src/components/RedirectButton.tsx src/app/series/[id]/page.tsx src/components/LibraryItemCard.tsx src/components/LibraryItemRow.tsx src/app/globals.css
git commit -m "feat: add RedirectButton to series detail page and library cards"
```

---

### Task 7: `/settings` page for managing search keywords

**Files:**
- Create: `src/app/settings/page.tsx`
- Create: `src/components/SearchKeywordManager.tsx`
- Modify: `src/components/Navbar.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: `GET`/`POST /api/search-keywords`, `DELETE`/`PATCH /api/search-keywords/[id]` (Task 4), `SearchKeyword` type (Task 6), `requireAuth()`.
- Produces: `/settings` route, no new exports consumed by later tasks.

- [ ] **Step 1: Create the manager component**

Create `src/components/SearchKeywordManager.tsx`:

```tsx
"use client";

import React, { useState } from "react";
import type { SearchKeyword } from "@/types/search-keyword";

interface SearchKeywordManagerProps {
  initialKeywords: SearchKeyword[];
}

export default function SearchKeywordManager({ initialKeywords }: SearchKeywordManagerProps) {
  const [keywords, setKeywords] = useState(initialKeywords);
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleAdd() {
    if (!label.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/search-keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: label.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setKeywords((prev) => [...prev, data.data]);
        setLabel("");
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/search-keywords/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setKeywords((prev) => prev.filter((k) => k.id !== id));
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleSetDefault(id: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/search-keywords/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDefault: true }),
      });
      const data = await res.json();
      if (data.success) {
        setKeywords((prev) => prev.map((k) => ({ ...k, isDefault: k.id === id })));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="search-keyword-manager">
      <div className="search-keyword-add-row">
        <input
          type="text"
          className="search-keyword-input"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Add a search keyword (e.g. tranimeizle)"
          disabled={busy}
        />
        <button type="button" className="btn btn-primary btn-sm" onClick={handleAdd} disabled={busy}>
          Add
        </button>
      </div>

      <ul className="search-keyword-list">
        {keywords.map((k) => (
          <li key={k.id} className="search-keyword-list-item">
            <span className="search-keyword-label">{k.label}</span>
            <button
              type="button"
              className={`btn btn-sm ${k.isDefault ? "btn-primary" : "btn-secondary"}`}
              onClick={() => handleSetDefault(k.id)}
              disabled={busy || k.isDefault}
            >
              {k.isDefault ? "Default" : "Set default"}
            </button>
            <button
              type="button"
              className="search-keyword-remove"
              onClick={() => handleDelete(k.id)}
              disabled={busy}
              aria-label={`Remove ${k.label}`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6" />
              </svg>
            </button>
          </li>
        ))}
        {keywords.length === 0 && (
          <li className="search-keyword-empty">No keywords saved yet.</li>
        )}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: Create the page**

Create `src/app/settings/page.tsx`:

```tsx
import React from "react";
import type { Metadata } from "next";
import { requireAuth } from "@/lib/auth/helpers";
import { prisma } from "@/lib/db/prisma";
import SearchKeywordManager from "@/components/SearchKeywordManager";
import type { SearchKeyword } from "@/types/search-keyword";

export const metadata: Metadata = {
  title: "Settings",
  description: "Manage your search keywords",
};

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireAuth();

  const rows = await prisma.searchKeyword.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
  });

  const keywords: SearchKeyword[] = rows.map((k) => ({
    id: k.id,
    userId: k.userId,
    label: k.label,
    isDefault: k.isDefault,
    createdAt: k.createdAt.toISOString(),
  }));

  return (
    <div className="container-content page-enter">
      <h1 className="library-title">Settings</h1>
      <section className="settings-section">
        <h2 className="detail-section-title">Search Keywords</h2>
        <p className="settings-section-hint">
          Saved keywords are appended to the &quot;Search&quot; button on series pages and your library.
        </p>
        <SearchKeywordManager initialKeywords={keywords} />
      </section>
    </div>
  );
}
```

- [ ] **Step 3: Add the navbar link**

In `src/components/Navbar.tsx`, add a `/settings` entry to `NAV_LINKS` (line 9-13):

```ts
const NAV_LINKS = [
  { href: "/explore", label: "Browse" },
  { href: "/library", label: "My List" },
  { href: "/calendar", label: "Calendar" },
  { href: "/settings", label: "Settings" },
] as const;
```

- [ ] **Step 4: Add the CSS**

Add to `src/app/globals.css`, after the `.redirect-button-select` block added in Task 6:

```css
.settings-section {
  margin-top: var(--space-6);
}

.settings-section-hint {
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  margin-bottom: var(--space-3);
}

.search-keyword-manager {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  max-width: 480px;
}

.search-keyword-add-row {
  display: flex;
  gap: var(--space-2);
}

.search-keyword-input {
  flex: 1;
  height: 36px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-strong);
  background: var(--color-bg-input);
  color: var(--color-text-primary);
  font-family: var(--font-sans);
  font-size: 0.875rem;
  padding: 0 10px;
}

.search-keyword-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  list-style: none;
  padding: 0;
  margin: 0;
}

.search-keyword-list-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-bg-surface);
}

.search-keyword-label {
  flex: 1;
  font-size: 0.875rem;
}

.search-keyword-remove {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: var(--radius-md);
  border: none;
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
}

.search-keyword-empty {
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  padding: var(--space-2) 0;
}
```

- [ ] **Step 5: Verify with a type-check**

```bash
npm run type-check
```

Expected: no errors.

- [ ] **Step 6: Manual verification**

`npm run dev`, sign in, click "Settings" in the navbar, confirm `/settings` loads, add a keyword, confirm it appears in the list, click "Set default" on a second keyword, confirm only one shows "Default" at a time, delete a keyword, confirm it disappears from the list. Sign out and visit `/settings` directly, confirm it redirects to sign-in (via `requireAuth()`, same as `/library`/`/calendar`).

- [ ] **Step 7: Commit**

```bash
git add src/app/settings src/components/SearchKeywordManager.tsx src/components/Navbar.tsx src/app/globals.css
git commit -m "feat: add /settings page for managing search keywords"
```

---

### Task 8: Documentation updates

**Files:**
- Modify: `docs/phases.md`

**Interfaces:**
- Consumes: nothing (documentation only).
- Produces: nothing consumed by other tasks — this is the final task.

- [ ] **Step 1: Update `docs/phases.md`'s Phase 2.6 checklist**

In `docs/phases.md`, replace the Phase 2.6 section (currently unchecked items under `### 2.6 Personal Private Notes & Custom Links (Google Redirector)`) with:

```markdown
### 2.6 Personal Private Notes & Custom Links (Google Redirector)
- [x] `UserNote` database model (userId, seriesId, text content) — one free-text note per (user, series), empty content deletes the row
- [x] Save user-preferred site search keywords globally — single global list per user (not per-series, by explicit decision), `SearchKeyword` model with one `isDefault` flag, atomic switching via `prisma.$transaction`
- [x] Implement Google Search Redirector: Watch/Read buttons dynamically link to Google search `https://www.google.com/search?q={title}+{Episode|Chapter} {N}+{keyword}` — pure client-side URL construction (`buildRedirectUrl`), no server-side redirect route, no data ever fetched/scraped from third-party sites
- [x] UI for managing private notes and search keywords on the series details page — `SeriesNoteWidget` (notes, auto-save) and `RedirectButton` (full variant with keyword dropdown)
- [x] Quick access to custom Google redirect search links from library dashboard — `RedirectButton` compact variant (single icon button, default keyword) on both `LibraryItemCard` and `LibraryItemRow`
- [x] Strict backend authorization (users can only view/edit their own notes/keywords) — every route `requireAuth()`-gated and scoped by `userId`, same `getOwnedItem`-style ownership check pattern as Library
```

Note: the keyword-management UI itself lives on a new `/settings` page (not the series detail page) — only the keyword *selector* (for picking which saved keyword to use for a given redirect) is on the series detail page, alongside the note widget.

- [ ] **Step 2: Commit**

```bash
git add docs/phases.md
git commit -m "docs: check off Phase 2.6 private notes and redirect links"
```

---

## Self-Review Notes

**Spec coverage:** `UserNote` model (Task 1) ✓, `SearchKeyword` model + global list (Task 1) ✓, Google Search Redirector (Task 2, 6) ✓, UI on series detail page (Task 5, 6) ✓, quick access from library dashboard (Task 6) ✓, strict backend authorization (Tasks 3, 4 — every handler `requireAuth()` + ownership-scoped) ✓, `isDefault` transaction (Task 4) ✓, no-keyword fallback (Task 6 — `buildRedirectUrl` already handles `keyword: null`) ✓, `/settings` keyword management UI (Task 7) ✓.

**CLAUDE.md staleness note (out of scope for this plan, flagged for the controller):** the project's "Commands" section states "No test runner is configured (no Jest/Vitest)", but `package.json`/`vitest.config.ts`/`tests/unit/**` show vitest is actually wired up and has existing tests for `api-response`, `app-error`, `middleware`, and the four `lib/api/*` clients. Task 2 uses TDD with vitest per the existing precedent. The controller should correct this stale claim in `CLAUDE.md` separately — it predates this sub-project and isn't something this plan's tasks should silently fix as a drive-by, since `CLAUDE.md` is gitignored and edited directly by the controller, not by implementer subagents.
