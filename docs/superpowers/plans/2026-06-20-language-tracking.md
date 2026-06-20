# Language/Translation Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Phase 2.5 MVP — let a user mark a MangaDex-sourced library item as "waiting" for English or Turkish, run a new Cloudflare Cron Trigger every 2 hours that checks MangaDex for new chapters in that language, and notify the user via the existing Notification system when the chapter count increases.

**Architecture:** A new `EpisodeLanguage` table stores one row per `(seriesId, language)` with the last-known chapter total for that language — same "stored count, diff on next check" shape `Series.totalEpisodes`/`Notification` already use. `checkLanguageAvailability()` groups all `waitLanguage`-flagged library items by `(seriesId, language)` (so two users waiting on the same thing trigger one MangaDex call, not two), checks each group's chapter total via a generalized `getMangaChapters(..., language)`, and creates one `Notification` per affected user when the count increases. This is the app's first genuine background job — no cron infrastructure exists yet, so a `custom-worker.ts` wraps OpenNext's generated Worker to add a `scheduled()` export, with careful handling of a verified Cloudflare Workers gotcha: `process.env` is normally populated by OpenNext's generated `fetch` handler only, so the cron path must map `DATABASE_URL` onto `process.env` itself, before dynamically importing any Prisma-dependent module.

**Tech Stack:** Next.js 16 App Router, Prisma + PostgreSQL, Zod, TypeScript, Cloudflare Workers (Cron Triggers), MangaDex REST API. No test framework configured in this repo — verification is `npm run type-check` + `npm run lint` + manual checks (including a manual cron trigger via `wrangler dev`).

## Global Constraints

- **MangaDex-only this round.** Anime/TV language tracking is out of scope entirely (not deferred) — no official API exposes per-language dub/sub availability, and scraping a streaming platform conflicts with this project's "legal-only, no piracy risk" principle. Every check in this plan must gate on `series.source === "mangadex"`.
- **Language choices are fixed to `"EN"` / `"TR"`** (uppercase, stored as-is) — not an open list of MangaDex's full language code set.
- **`EpisodeLanguage` stores a chapter *total*, not per-chapter history** — mirrors `getMangaChapters`'s existing `total` field and `Series.totalChapters`'s existing semantics exactly. Never parse individual chapter numbers out of the `chapters` array for this feature.
- **`checkLanguageAvailability()` takes no arguments and processes every flagged `LibraryItem` across all users in one pass** — there is no "current user" in a cron context, unlike `checkForNewEpisodes(userId)`.
- **Group MangaDex calls by `(seriesId, language)` before fetching** — if multiple users wait on the same series+language, fetch once and fan the resulting notifications out to every user in that group.
- **The `process.env.DATABASE_URL` mapping in `custom-worker.ts`'s `scheduled()` handler must happen before the dynamic `import()` of `src/lib/language-tracking.ts`** — a static top-level import would be hoisted and evaluated too early, before the mapping runs, locking `prisma.ts`'s connection string onto its mock fallback.
- **`ctx.waitUntil()` must wrap the async check** in `scheduled()`, or Cloudflare may tear down the Worker before the check finishes.
- **`custom-worker.ts` is excluded from `npm run type-check`'s scope** (added to `tsconfig.json`'s `exclude`) because it imports `./.open-next/worker.js`, a gitignored build artifact that doesn't exist on a fresh checkout before the first `npm run deploy:build` — this file's correctness is verified separately via `wrangler dev`'s bundling step, not `tsc --noEmit`.
- `npm run type-check` and `npm run lint` must be clean before every commit (for every file except `custom-worker.ts`, per the point above).
- No `git push` without explicit user instruction. Conventional Commits format for every commit message.
- This project's dev server has a known Turbopack bug on this path (non-ASCII `ü` in the directory name) — use `npx next dev --webpack -p 3000` for manual verification.
- `prisma migrate dev` refuses to run non-interactively in this shell — use `prisma migrate diff --from-config-datasource prisma.config.ts --to-schema prisma/schema.prisma --script` to generate SQL, hand-create the migration folder, then `prisma migrate deploy`.

---

## File Structure

New files:
- `src/lib/language-tracking.ts` — `checkLanguageAvailability()` (Task 3)
- `custom-worker.ts` (project root) — wraps the generated Worker, adds `scheduled()` (Task 4)
- `src/components/LanguageWaitWidget.tsx` — client component for the series detail page (Task 6)

Modified files:
- `prisma/schema.prisma` — `EpisodeLanguage` model, `LibraryItem.waitLanguage`, `Series.episodeLanguages` relation (Task 1)
- `src/lib/api/mangadex.ts` — `getMangaChapters` gains a `language` parameter (Task 2)
- `wrangler.toml` — `main` repointed at `custom-worker.ts`, `[triggers]` cron added (Task 4)
- `tsconfig.json` — `custom-worker.ts` added to `exclude` (Task 4)
- `src/lib/validations/library.ts` — `updateWaitLanguageSchema` (Task 5)
- `src/app/api/library/[id]/route.ts` — `patchHandler` tries the new schema third (Task 5)
- `src/types/library.ts` — `LibraryEntry.waitLanguage` field (Task 5)
- `src/components/LibraryItemCard.tsx`, `src/components/LibraryItemRow.tsx` — inline language-picker control (Task 6)
- `src/app/series/[id]/page.tsx` — fetch `waitLanguage`, render `LanguageWaitWidget` (Task 6)
- `src/app/globals.css` — language-picker and widget styles (Task 6)
- `docs/phases.md` — check off shipped items (Task 7)

---

### Task 1: Schema — `EpisodeLanguage` model, `LibraryItem.waitLanguage`

**Files:**
- Modify: `prisma/schema.prisma`

**Interfaces:**
- Produces: `EpisodeLanguage` model (`id`, `seriesId`, `language`, `latestChapter`, `updatedAt`) and `LibraryItem.waitLanguage: string | null` on the Prisma client — every later task that reads/writes these uses them.

- [ ] **Step 1: Add `waitLanguage` to the `LibraryItem` model**

In `prisma/schema.prisma`, find:

```prisma
model LibraryItem {
  id        String        @id @default(cuid())
  userId    String
  seriesId  String
  status    LibraryStatus @default(PLAN_TO_WATCH)
  isFavorite Boolean      @default(false)
```

Replace with:

```prisma
model LibraryItem {
  id        String        @id @default(cuid())
  userId    String
  seriesId  String
  status    LibraryStatus @default(PLAN_TO_WATCH)
  isFavorite Boolean      @default(false)
  waitLanguage String?    // "EN" | "TR" | null — only meaningful for MangaDex-sourced items
```

- [ ] **Step 2: Add the `episodeLanguages` back-relation to the `Series` model**

In `prisma/schema.prisma`, find:

```prisma
  libraryItems    LibraryItem[]
  userRatings     UserRating[]
  notifications   Notification[]

  @@unique([externalId, source])
```

Replace with:

```prisma
  libraryItems    LibraryItem[]
  userRatings     UserRating[]
  notifications   Notification[]
  episodeLanguages EpisodeLanguage[]

  @@unique([externalId, source])
```

- [ ] **Step 3: Add the `EpisodeLanguage` model**

Add this new model at the end of `prisma/schema.prisma`, after the `Notification` model:

```prisma
// ─────────────────────────────────────────────────
// Language/translation availability tracking
// ─────────────────────────────────────────────────

model EpisodeLanguage {
  id            String   @id @default(cuid())
  seriesId      String
  language      String   // "EN" | "TR"
  latestChapter Int
  updatedAt     DateTime @updatedAt

  series Series @relation(fields: [seriesId], references: [id], onDelete: Cascade)

  @@unique([seriesId, language])
}
```

- [ ] **Step 4: Generate the migration SQL (non-interactive workaround)**

Run: `npx prisma migrate diff --from-config-datasource prisma.config.ts --to-schema prisma/schema.prisma --script`
Expected: prints `ALTER TABLE "LibraryItem" ADD COLUMN "waitLanguage" TEXT;`, `CREATE TABLE "EpisodeLanguage" (...)`, a `CREATE UNIQUE INDEX` for `(seriesId, language)`, and an `ALTER TABLE "EpisodeLanguage" ADD CONSTRAINT ... FOREIGN KEY` statement.

- [ ] **Step 5: Create the migration folder and apply it**

```bash
TS=$(date -u +%Y%m%d%H%M%S)
mkdir -p "prisma/migrations/${TS}_add_language_tracking"
npx prisma migrate diff --from-config-datasource prisma.config.ts --to-schema prisma/schema.prisma --script > "prisma/migrations/${TS}_add_language_tracking/migration.sql"
npx prisma migrate deploy
```

Expected: `npx prisma migrate deploy` prints `Applying migration '<TS>_add_language_tracking'` followed by `All migrations have been successfully applied.`

- [ ] **Step 6: Regenerate the Prisma client**

Run: `npm run db:generate`
Expected: exits 0, `src/generated/prisma/` regenerated with `EpisodeLanguage` and `LibraryItem.waitLanguage`.

- [ ] **Step 7: Verify with type-check**

Run: `npm run type-check`
Expected: exits 0.

- [ ] **Step 8: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: add EpisodeLanguage model and LibraryItem.waitLanguage field"
```

---

### Task 2: MangaDex client — language-parameterized chapter count

**Files:**
- Modify: `src/lib/api/mangadex.ts`

**Interfaces:**
- Produces: `getMangaChapters(mangaId: string, page?: number, limit?: number, language?: string): Promise<{ chapters: MangaDexChapter[]; total: number }>` — the new 4th parameter defaults to `"en"`, so every existing call site (which only ever wants English) is unaffected. Consumed by Task 3.

- [ ] **Step 1: Add the `language` parameter to `getMangaChapters`**

In `src/lib/api/mangadex.ts`, find:

```ts
/** Get chapters feed for a Manga ID (English translation by default) */
export async function getMangaChapters(
  mangaId: string,
  page = 1,
  limit = 100
): Promise<{ chapters: MangaDexChapter[]; total: number }> {
  const offset = (page - 1) * limit;

  const data = await mangadexFetch<MangaDexFeedResponse>(`/manga/${mangaId}/feed`, {
    limit: String(limit),
    offset: String(offset),
    "translatedLanguage[]": ["en"],
    "order[chapter]": "asc",
  });
```

Replace with:

```ts
/** Get chapters feed for a Manga ID (English translation by default) */
export async function getMangaChapters(
  mangaId: string,
  page = 1,
  limit = 100,
  language = "en"
): Promise<{ chapters: MangaDexChapter[]; total: number }> {
  const offset = (page - 1) * limit;

  const data = await mangadexFetch<MangaDexFeedResponse>(`/manga/${mangaId}/feed`, {
    limit: String(limit),
    offset: String(offset),
    "translatedLanguage[]": [language],
    "order[chapter]": "asc",
  });
```

- [ ] **Step 2: Verify**

Run: `npm run type-check && npx eslint src/lib/api/mangadex.ts`
Expected: both exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/lib/api/mangadex.ts
git commit -m "feat: parameterize MangaDex chapter feed by translation language"
```

---

### Task 3: `checkLanguageAvailability()` — shared language-check helper

**Files:**
- Create: `src/lib/language-tracking.ts`

**Interfaces:**
- Consumes: `getMangaChapters` from `@/lib/api/mangadex` (Task 2); `prisma` from `@/lib/db/prisma`.
- Produces: `checkLanguageAvailability(): Promise<{ created: number }>` from `src/lib/language-tracking.ts`. Consumed by Task 4's `custom-worker.ts`.

- [ ] **Step 1: Write `src/lib/language-tracking.ts`**

```ts
import { prisma } from "./db/prisma";
import { getMangaChapters } from "./api/mangadex";

interface LanguageGroup {
  seriesId: string;
  externalId: string;
  title: string;
  language: string;
  userIds: string[];
}

export async function checkLanguageAvailability(): Promise<{ created: number }> {
  const items = await prisma.libraryItem.findMany({
    where: { waitLanguage: { not: null } },
    include: { series: true },
  });

  const groups = new Map<string, LanguageGroup>();
  for (const item of items) {
    if (item.series.source !== "mangadex" || !item.waitLanguage) continue;
    const key = `${item.seriesId}:${item.waitLanguage}`;
    const existing = groups.get(key);
    if (existing) {
      existing.userIds.push(item.userId);
    } else {
      groups.set(key, {
        seriesId: item.seriesId,
        externalId: item.series.externalId,
        title: item.series.title,
        language: item.waitLanguage,
        userIds: [item.userId],
      });
    }
  }

  const results = await Promise.all(
    Array.from(groups.values()).map(async (group): Promise<number> => {
      try {
        const { total } = await getMangaChapters(group.externalId, 1, 1, group.language.toLowerCase());
        if (total === 0) return 0;

        const existing = await prisma.episodeLanguage.findUnique({
          where: { seriesId_language: { seriesId: group.seriesId, language: group.language } },
        });

        if (existing && total <= existing.latestChapter) return 0;

        const languageName = group.language === "TR" ? "Turkish" : "English";
        await prisma.$transaction([
          ...group.userIds.map((userId) =>
            prisma.notification.create({
              data: {
                userId,
                seriesId: group.seriesId,
                message: `${group.title} now has ${total} chapter${total === 1 ? "" : "s"} available in ${languageName}`,
              },
            })
          ),
          prisma.episodeLanguage.upsert({
            where: { seriesId_language: { seriesId: group.seriesId, language: group.language } },
            create: { seriesId: group.seriesId, language: group.language, latestChapter: total },
            update: { latestChapter: total },
          }),
        ]);
        return group.userIds.length;
      } catch (err) {
        console.error(`[LanguageTracking] Failed to check ${group.seriesId} (${group.language}):`, err);
        return 0;
      }
    })
  );

  return { created: results.reduce((acc, val) => acc + val, 0) };
}
```

Each group's check uses `total` (MangaDex's reported chapter count for that language filter) as the comparison value — never individual chapter numbers from the `chapters` array, matching `Series.totalChapters`'s existing count-based semantics exactly. Groups run in parallel via `Promise.all`, each with its own `try/catch`, mirroring `checkForNewEpisodes`'s established resilience pattern.

- [ ] **Step 2: Verify**

Run: `npm run type-check && npx eslint src/lib/language-tracking.ts`
Expected: both exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/lib/language-tracking.ts
git commit -m "feat: add checkLanguageAvailability language-check helper"
```

---

### Task 4: Cron infrastructure — `custom-worker.ts` + Cloudflare Cron Trigger

**Files:**
- Create: `custom-worker.ts` (project root)
- Modify: `wrangler.toml`
- Modify: `tsconfig.json`

**Interfaces:**
- Consumes: `checkLanguageAvailability` from `@/lib/language-tracking` (Task 3), dynamically imported.
- Produces: a working `scheduled()` Worker export, triggered every 2 hours in production and manually triggerable in `wrangler dev` for testing.

- [ ] **Step 1: Write `custom-worker.ts`**

```ts
import defaultWorker from "./.open-next/worker.js";

interface CloudflareEnv {
  DATABASE_URL: string;
  [key: string]: string | undefined;
}

interface MinimalExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
}

interface MinimalScheduledEvent {
  cron: string;
  scheduledTime: number;
}

export default {
  async fetch(request: Request, env: CloudflareEnv, ctx: MinimalExecutionContext) {
    return defaultWorker.fetch(request, env, ctx);
  },

  async scheduled(_event: MinimalScheduledEvent, env: CloudflareEnv, ctx: MinimalExecutionContext) {
    // Must happen before the dynamic import below — process.env is otherwise
    // never populated outside the generated fetch handler's request path,
    // and prisma.ts reads process.env.DATABASE_URL at module top-level.
    process.env.DATABASE_URL = env.DATABASE_URL;
    const { checkLanguageAvailability } = await import("./src/lib/language-tracking");
    ctx.waitUntil(checkLanguageAvailability());
  },
};
```

- [ ] **Step 2: Exclude `custom-worker.ts` from `tsconfig.json`'s type-checked scope**

In `tsconfig.json`, find:

```json
  "exclude": ["node_modules"]
```

Replace with:

```json
  "exclude": ["node_modules", "custom-worker.ts"]
```

This file imports `./.open-next/worker.js`, a gitignored build artifact that only exists after `npm run deploy:build` has run at least once — without this exclusion, `npm run type-check` would fail on a fresh checkout before any Cloudflare build, for a reason unrelated to actual app code correctness. `custom-worker.ts`'s correctness is verified in Step 5 below via `wrangler dev`'s own bundling step, which does type-aware bundling and will surface real errors.

- [ ] **Step 3: Update `wrangler.toml`**

Find:

```toml
# Main entrypoint (generated by OpenNext build)
main = ".open-next/worker.js"
```

Replace with:

```toml
# Main entrypoint — wraps the OpenNext-generated worker, adds a scheduled() handler
main = "custom-worker.ts"
```

Then add this block right after the `[dev]` section (or at the end of the file if no `[dev]` section exists):

```toml
[triggers]
crons = ["0 */2 * * *"]
```

- [ ] **Step 4: Build so `.open-next/worker.js` exists, then verify**

```bash
npm run deploy:build
npm run type-check
```

Expected: `npm run deploy:build` completes (regenerates `.open-next/`); `npm run type-check` exits 0 (it no longer tries to check `custom-worker.ts` per Step 2, so this passes regardless of `.open-next/`'s state going forward).

- [ ] **Step 5: Manual verification — trigger the cron locally**

```bash
npx wrangler dev
```

In a second terminal, with the dev server running:

```bash
curl "http://localhost:8787/__scheduled?cron=0+*/2+*+*+*"
```

Expected: the `wrangler dev` terminal logs show the worker building successfully (confirming `custom-worker.ts` has no real syntax/type errors despite being excluded from `tsc`) and `scheduled()` executing. If `DATABASE_URL` isn't set in local `.dev.vars`, this will fail to query the database — that's expected in an unconfigured environment; the goal of this check is confirming the Worker builds and `scheduled()` fires, not a full end-to-end DB check (Task 3's logic is already verified independently in Task 3, and Task 6 covers the full end-to-end flow once the UI exists).

- [ ] **Step 6: Commit**

```bash
git add custom-worker.ts tsconfig.json wrangler.toml
git commit -m "feat: add Cloudflare Cron Trigger infrastructure via custom worker"
```

---

### Task 5: API route — `waitLanguage` toggle

**Files:**
- Modify: `src/lib/validations/library.ts`
- Modify: `src/app/api/library/[id]/route.ts`
- Modify: `src/types/library.ts`

**Interfaces:**
- Consumes: nothing new from earlier tasks (this task only needs `LibraryItem.waitLanguage` from Task 1's Prisma client).
- Produces: `PATCH /api/library/[id]` accepts `{ waitLanguage: "EN" | "TR" | null }` as a third valid body shape; `LibraryEntry.waitLanguage?: string | null` in the shared type. Consumed by Task 6's UI.

- [ ] **Step 1: Add `updateWaitLanguageSchema` to `src/lib/validations/library.ts`**

Add this at the end of the file:

```ts
export const updateWaitLanguageSchema = z.object({
  waitLanguage: z.enum(["EN", "TR"]).nullable(),
});

export type UpdateWaitLanguageInput = z.infer<typeof updateWaitLanguageSchema>;
```

- [ ] **Step 2: Wire the new schema into `patchHandler`**

In `src/app/api/library/[id]/route.ts`, find:

```ts
import { updateLibraryStatusSchema, updateFavoriteSchema } from "@/lib/validations/library";
```

Replace with:

```ts
import { updateLibraryStatusSchema, updateFavoriteSchema, updateWaitLanguageSchema } from "@/lib/validations/library";
```

Then find:

```ts
  const favoriteParsed = updateFavoriteSchema.safeParse(body);
  if (favoriteParsed.success) {
    const updated = await prisma.libraryItem.update({
      where: { id },
      data: { isFavorite: favoriteParsed.data.isFavorite },
    });
    return successResponse(updated);
  }

  return Responses.validationError(statusParsed.error.flatten().fieldErrors);
```

Replace with:

```ts
  const favoriteParsed = updateFavoriteSchema.safeParse(body);
  if (favoriteParsed.success) {
    const updated = await prisma.libraryItem.update({
      where: { id },
      data: { isFavorite: favoriteParsed.data.isFavorite },
    });
    return successResponse(updated);
  }

  const waitLanguageParsed = updateWaitLanguageSchema.safeParse(body);
  if (waitLanguageParsed.success) {
    const updated = await prisma.libraryItem.update({
      where: { id },
      data: { waitLanguage: waitLanguageParsed.data.waitLanguage },
    });
    return successResponse(updated);
  }

  return Responses.validationError(statusParsed.error.flatten().fieldErrors);
```

- [ ] **Step 3: Add `waitLanguage` to the `LibraryEntry` type**

In `src/types/library.ts`, find:

```ts
  status: LibraryStatus;
  isFavorite: boolean;
```

Replace with:

```ts
  status: LibraryStatus;
  isFavorite: boolean;
  waitLanguage?: string | null;
```

- [ ] **Step 4: Verify**

Run: `npm run type-check && npx eslint src/lib/validations/library.ts src/app/api/library/[id]/route.ts src/types/library.ts`
Expected: both exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/lib/validations/library.ts src/app/api/library/[id]/route.ts src/types/library.ts
git commit -m "feat: add waitLanguage toggle to library item PATCH endpoint"
```

---

### Task 6: UI — language-picker on library cards and series detail page

**Files:**
- Create: `src/components/LanguageWaitWidget.tsx`
- Modify: `src/components/LibraryItemCard.tsx`
- Modify: `src/components/LibraryItemRow.tsx`
- Modify: `src/app/series/[id]/page.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: `PATCH /api/library/[id]` with `{ waitLanguage }` (Task 5).
- Produces: the rendered language-picker controls — this task's deliverable is independently browser-testable end to end.

- [ ] **Step 1: Add the language-picker control to `LibraryItemCard.tsx`**

In `src/components/LibraryItemCard.tsx`, find:

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

Add this function right after it:

```tsx
  async function handleSetWaitLanguage(next: string | null) {
    setBusy(true);
    try {
      const res = await fetch(`/api/library/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ waitLanguage: next }),
      });
      const data = await res.json();
      if (data.success) {
        onUpdated({ ...entry, waitLanguage: next });
      }
    } finally {
      setBusy(false);
    }
  }
```

Then find:

```tsx
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
```

Replace with:

```tsx
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
        {entry.series.source === "mangadex" && (
          <select
            className="library-card-language-select"
            value={entry.waitLanguage ?? ""}
            onChange={(e) => handleSetWaitLanguage(e.target.value || null)}
            disabled={busy}
            aria-label="Wait for language"
          >
            <option value="">No language wait</option>
            <option value="EN">Wait: English</option>
            <option value="TR">Wait: Turkish</option>
          </select>
        )}
```

- [ ] **Step 2: Add the identical control to `LibraryItemRow.tsx`**

In `src/components/LibraryItemRow.tsx`, find:

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

Add this function right after it:

```tsx
  async function handleSetWaitLanguage(next: string | null) {
    setBusy(true);
    try {
      const res = await fetch(`/api/library/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ waitLanguage: next }),
      });
      const data = await res.json();
      if (data.success) {
        onUpdated({ ...entry, waitLanguage: next });
      }
    } finally {
      setBusy(false);
    }
  }
```

Then find:

```tsx
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
```

Replace with:

```tsx
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
        {entry.series.source === "mangadex" && (
          <select
            className="library-card-language-select"
            value={entry.waitLanguage ?? ""}
            onChange={(e) => handleSetWaitLanguage(e.target.value || null)}
            disabled={busy}
            aria-label="Wait for language"
          >
            <option value="">No language wait</option>
            <option value="EN">Wait: English</option>
            <option value="TR">Wait: Turkish</option>
          </select>
        )}
```

- [ ] **Step 3: Write `src/components/LanguageWaitWidget.tsx`**

```tsx
"use client";

import React, { useState } from "react";

interface LanguageWaitWidgetProps {
  libraryItemId: string;
  initialValue: string | null;
}

export default function LanguageWaitWidget({ libraryItemId, initialValue }: LanguageWaitWidgetProps) {
  const [value, setValue] = useState(initialValue);
  const [busy, setBusy] = useState(false);

  async function handleChange(next: string | null) {
    setBusy(true);
    try {
      const res = await fetch(`/api/library/${libraryItemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ waitLanguage: next }),
      });
      const data = await res.json();
      if (data.success) {
        setValue(next);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="language-wait-widget">
      <span className="language-wait-widget-label">Get notified when available in:</span>
      <select
        className="language-wait-widget-select"
        value={value ?? ""}
        onChange={(e) => handleChange(e.target.value || null)}
        disabled={busy}
        aria-label="Wait for language"
      >
        <option value="">Don&apos;t notify</option>
        <option value="EN">English</option>
        <option value="TR">Turkish</option>
      </select>
    </div>
  );
}
```

- [ ] **Step 4: Wire `LanguageWaitWidget` into the series detail page**

In `src/app/series/[id]/page.tsx`, find:

```tsx
import AddToLibraryButton from "@/components/AddToLibraryButton";
import RatingWidget from "@/components/RatingWidget";
import type { LibraryStatus } from "@/types/common";
```

Replace with:

```tsx
import AddToLibraryButton from "@/components/AddToLibraryButton";
import RatingWidget from "@/components/RatingWidget";
import LanguageWaitWidget from "@/components/LanguageWaitWidget";
import type { LibraryStatus } from "@/types/common";
```

Then find:

```tsx
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

Replace with:

```tsx
  const user = await getCurrentUser();
  let existingItem: { id: string; status: LibraryStatus; waitLanguage: string | null } | null = null;
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
      if (itemRow) existingItem = { id: itemRow.id, status: itemRow.status, waitLanguage: itemRow.waitLanguage };
      if (ratingRow) existingRating = { score: ratingRow.score, review: ratingRow.review };
    }
  }
```

Then find:

```tsx
            <AddToLibraryButton
              compoundId={id}
              initialItem={existingItem}
              isSignedIn={!!user}
            />
          </aside>
```

Replace with:

```tsx
            <AddToLibraryButton
              compoundId={id}
              initialItem={existingItem}
              isSignedIn={!!user}
            />
            {existingItem && series.source === "mangadex" && (
              <LanguageWaitWidget
                libraryItemId={existingItem.id}
                initialValue={existingItem.waitLanguage}
              />
            )}
          </aside>
```

Note: `AddToLibraryButton`'s `initialItem` prop type is `{ id: string; status: LibraryStatus } | null` — passing the wider `existingItem` (now also carrying `waitLanguage`) still satisfies that prop via structural typing, no change needed to `AddToLibraryButton.tsx` itself.

- [ ] **Step 5: Append CSS to `src/app/globals.css`**

Insert this immediately after the `.library-card-confirm { ... }` rule:

```css
.library-card-language-select {
  height: 32px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-bg-surface);
  color: var(--color-text-secondary);
  font-family: var(--font-sans);
  font-size: 0.75rem;
  padding: 0 6px;
  cursor: pointer;
}

.language-wait-widget {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-top: var(--space-3);
  width: 100%;
}

.language-wait-widget-label {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.language-wait-widget-select {
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

- [ ] **Step 6: Verify with type-check and lint**

Run: `npm run type-check && npx eslint src/components/LibraryItemCard.tsx src/components/LibraryItemRow.tsx src/components/LanguageWaitWidget.tsx src/app/series/\[id\]/page.tsx`
Expected: both exit 0.

- [ ] **Step 7: Manual browser verification**

Run: `npx next dev --webpack -p 3000` (confirm `docker ps` shows the local Postgres container running first)
- Add a MangaDex-sourced manga to your library, open `/library`, confirm the language `<select>` appears on its card and defaults to "No language wait".
- Pick "Wait: Turkish", reload the page, confirm the selection persisted (re-fetches from the server, not just local state).
- Open that series' detail page, confirm the `LanguageWaitWidget` shows "Turkish" already selected (reads the same underlying field).
- Change it to "English" from the detail page, go back to `/library`, confirm the card's select now shows "Wait: English" (same underlying state, two surfaces).
- Confirm a TV-series (TMDB-sourced) library card never shows the language select at all.
- In Prisma Studio, manually set a test `EpisodeLanguage` row's `latestChapter` lower than MangaDex's actual current total for that series+language (or delete the row entirely), then trigger the cron the same way as Task 4 Step 5 (`npx wrangler dev`, then `curl "http://localhost:8787/__scheduled?cron=0+*/2+*+*+*"` in a second terminal, with `DATABASE_URL` set in `.dev.vars` this time) — confirm a `Notification` row appears and the bell icon's badge increments.

- [ ] **Step 8: Commit**

```bash
git add src/components/LibraryItemCard.tsx src/components/LibraryItemRow.tsx src/components/LanguageWaitWidget.tsx src/app/series/\[id\]/page.tsx src/app/globals.css
git commit -m "feat: add language-wait toggle UI to library cards and series detail page"
```

---

### Task 7: Docs

**Files:**
- Modify: `docs/phases.md`

**Interfaces:**
- Consumes: nothing further from earlier tasks — this is a documentation-only final task.
- Produces: nothing consumed elsewhere.

- [ ] **Step 1: Update `docs/phases.md`**

Under Phase 2.5, replace:

```markdown
### 2.5 Language/Translation Tracking
- [ ] Cron job setup for periodic external API polling (MangaDex, AniList, etc.)
- [ ] `EpisodeLanguage` database model to store language availability timestamps
- [ ] "Wait for [Language]" toggle on user library
- [ ] Automated notifications when requested language (e.g., Turkish) becomes available
```

with:

```markdown
### 2.5 Language/Translation Tracking
- [x] Cron job setup for periodic external API polling — Cloudflare Cron Trigger via a custom Worker wrapper, MangaDex only (AniList has no language-availability data; Anime/TV tracking dropped from scope — see design spec)
- [x] `EpisodeLanguage` database model to store language availability — stores latest known chapter count per (series, language), not full per-chapter history
- [x] "Wait for [Language]" toggle on user library — English/Turkish only, library card + series detail page
- [x] Automated notifications when requested language becomes available — reuses the existing Notification system from Phase 2.3
```

- [ ] **Step 2: Commit**

```bash
git add docs/phases.md
git commit -m "docs: check off Phase 2.5 language tracking"
```
