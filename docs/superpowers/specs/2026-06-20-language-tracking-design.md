# Language/Translation Tracking — Design Spec

**Status:** Approved
**Scope:** Phase 2.5 (`docs/phases.md` § "Language/Translation Tracking") — fifth Phase 2 sub-project, started after Advanced Search (2.4) merged.

## Goal

Let a user mark a Manga/Manhwa library item as "waiting" for a specific translation language (English or Turkish), periodically check MangaDex for new chapters in that language via a Cloudflare Cron Trigger, and notify the user (via the existing in-app notification system) the moment a new chapter in their requested language appears.

## Out of Scope (deferred / dropped)

- **Anime/TV language tracking** — dropped during brainstorming, not deferred. AniList's GraphQL schema has no per-language dub/sub availability data, and no streaming platform (Crunchyroll, etc.) exposes a public API for this. The only alternative is scraping a platform's proprietary catalog data, which conflicts with this project's "legal-only, no piracy risk" design principle (`CLAUDE.md`'s Technology Decision Log) — fragile, ToS-risk, and not pursued, including the AI-assisted-lookup variant (an LLM web-search is still reading the same unofficial sources indirectly, with added cost and hallucination risk on top). The `EpisodeLanguage` model is keyed generically enough (`seriesId` + `language` string) that a future data source could extend coverage without a schema change, but no Anime/TV code path exists this round.
- **Languages beyond English/Turkish** — the toggle is a fixed two-option choice (`EN` / `TR`), not an open list of MangaDex's dozens of supported language codes. Matches the product's primary audience; extending the list later is additive, not a redesign.
- **Full per-chapter language history** — `EpisodeLanguage` stores one row per `(seriesId, language)` with only the latest known chapter number, the same "last known count, diff on next check" shape `Notification`/`Series.totalEpisodes` already uses for episode-count tracking (Phase 2.3). It does not answer "when did chapter 12 become available in Turkish" — only "what's the latest chapter available in Turkish right now."
- **A separate notification UI** — language-availability events create rows in the existing `Notification` table and surface through the existing bell icon/dropdown (Phase 2.3). No new UI surface for notifications themselves.

## Current State

- **No cron/scheduled infrastructure exists in this app at all.** `wrangler.toml`'s `main` points directly at OpenNext's generated `.open-next/worker.js`, which exports only a `fetch` handler — confirmed via `node_modules/@opennextjs/cloudflare/dist/cli/templates/init.js`, the template OpenNext uses to generate that file. Phase 2.3 Notifications deliberately avoided building any cron/background-job infrastructure specifically because none existed; this phase is the first to need one.
- **OpenNext's official "Custom Worker" pattern is the documented way to add a `scheduled()` handler** without losing the generated `fetch` handler: a hand-written entrypoint file imports the generated worker's `fetch` export, re-exports it unchanged, and adds a `scheduled()` export alongside it. `wrangler.toml`'s `main` is repointed at this new file. No build/deploy command changes are needed beyond that.
- **Critical risk, found by an external architecture review and independently verified against this codebase before any code was written:** `src/lib/db/prisma.ts:22` reads `process.env.DATABASE_URL` at **module top-level** (`const connectionString = process.env.DATABASE_URL || "postgresql://mock:mock@localhost:5432/mock"`), so whatever `process.env.DATABASE_URL` is *at import time* is permanently locked in for that module's lifetime. Cloudflare Workers does not populate Node-style `process.env` automatically — `init.js`'s generated `fetch` handler explicitly calls a `populateProcessEnv(url, env)` helper (copying Cloudflare's `env` bindings onto `process.env`) on the first incoming request, **inside the fetch path only**. A hand-written `scheduled()` handler sits entirely outside that flow. If `prisma.ts` were imported normally at the top of the custom worker file, it would import (and lock its connection string) before any env mapping happens, and every cron run would silently try to connect to the `mock:mock@localhost` placeholder. This is the same category of "serverless execution model surprise" that shaped Phase 2.3's trigger design, just manifesting differently here since this is a genuine background job, not a per-request check.
- `populateProcessEnv` itself is not exported from `@opennextjs/cloudflare`'s public API (only `runWithCloudflareRequestContext` is) — it's a private helper baked into each build's generated `init.js`, so it can't be imported and reused directly. The custom worker must do its own minimal env mapping.
- `prisma.ts`'s runtime client only reads `DATABASE_URL` — `DIRECT_URL` (also present in this project's `.env.example`) is consumed solely by `prisma.config.ts` for the Prisma CLI/migration tooling, never by the runtime adapter. The custom worker's `scheduled()` handler only needs to map `DATABASE_URL`.
- **MangaDex already fetches per-chapter `translatedLanguage`** (`src/lib/api/mangadex.ts`, `MangaDexFeedResponse`), but `getMangaChapters` hardcodes `"translatedLanguage[]": ["en"]` and the exported `MangaDexChapter` shape doesn't carry the language through. Generalizing this to accept a language parameter is a small, additive change.
- **AniList has no per-language availability fields** used anywhere in this codebase (confirmed: zero references to "language" in `anilist.ts`'s GraphQL queries) — consistent with the Out of Scope decision above.
- `prisma/schema.prisma`'s `LibraryItem` model (`id, userId, seriesId, status, isFavorite, ...progress fields..., timestamps`) and `Series` model conventions (`cuid()` ids, `onDelete: Cascade` FKs) are the patterns a new `EpisodeLanguage` model and `LibraryItem.waitLanguage` field should follow.
- `PATCH /api/library/[id]/route.ts` already disambiguates request bodies via a try-schemas-in-sequence pattern (`updateLibraryStatusSchema` tried first, falls back to `updateFavoriteSchema`) — adding a third schema (`updateWaitLanguageSchema`) to that sequence is a natural, additive extension of the existing pattern, not a new mechanism.
- The existing `Notification` model (Phase 2.3) is source-agnostic (`userId`, `seriesId`, `libraryItemId?`, `message`, `isRead`, `createdAt`) and is reused as-is for language-availability events — no schema change needed there.

## Design

### 1. Schema changes

```prisma
model LibraryItem {
  // ...existing fields...
  waitLanguage String?  // "EN" | "TR" | null — only meaningful for MangaDex-sourced (manga/manhwa) items
  // ...existing relations...
}

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

`Series` gains a back-relation `episodeLanguages EpisodeLanguage[]` (required by Prisma for the relation above), matching how `Notification`'s back-relation was added to `Series` in Phase 2.3.

### 2. MangaDex client change

`src/lib/api/mangadex.ts`'s `getMangaChapters` gains a `language` parameter, defaulting to `"en"` so every existing call site (which only ever wants English) is unaffected:

```ts
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
  // ...unchanged mapping...
}
```

### 3. `src/lib/language-tracking.ts` (new file, parallel to `src/lib/notifications.ts`)

```ts
import { prisma } from "./db/prisma";
import { getMangaChapters } from "./api/mangadex";

export async function checkLanguageAvailability(): Promise<{ created: number }> {
  const items = await prisma.libraryItem.findMany({
    where: { waitLanguage: { not: null } },
    include: { series: true },
  });

  const groups = new Map<string, { seriesId: string; externalId: string; title: string; language: string; userIds: string[] }>();
  for (const item of items) {
    if (item.series.source !== "mangadex") continue;
    const key = `${item.seriesId}:${item.waitLanguage}`;
    const existing = groups.get(key);
    if (existing) {
      existing.userIds.push(item.userId);
    } else {
      groups.set(key, {
        seriesId: item.seriesId,
        externalId: item.series.externalId,
        title: item.series.title,
        language: item.waitLanguage!,
        userIds: [item.userId],
      });
    }
  }

  let created = 0;
  await Promise.all(
    Array.from(groups.values()).map(async (group) => {
      try {
        const { chapters } = await getMangaChapters(group.externalId, 1, 1, group.language.toLowerCase());
        const latest = chapters.length > 0 ? Number(chapters[chapters.length - 1].chapter) : null;
        if (latest === null || Number.isNaN(latest)) return;

        const existing = await prisma.episodeLanguage.findUnique({
          where: { seriesId_language: { seriesId: group.seriesId, language: group.language } },
        });

        if (!existing || latest > existing.latestChapter) {
          await prisma.$transaction([
            ...group.userIds.map((userId) =>
              prisma.notification.create({
                data: {
                  userId,
                  seriesId: group.seriesId,
                  message: `${group.title} is now available in ${group.language === "TR" ? "Turkish" : "English"} (chapter ${latest})`,
                },
              })
            ),
            prisma.episodeLanguage.upsert({
              where: { seriesId_language: { seriesId: group.seriesId, language: group.language } },
              create: { seriesId: group.seriesId, language: group.language, latestChapter: latest },
              update: { latestChapter: latest },
            }),
          ]);
          created += group.userIds.length;
        }
      } catch (err) {
        console.error(`[LanguageTracking] Failed to check ${group.seriesId} (${group.language}):`, err);
      }
    })
  );

  return { created };
}
```

Mirrors `checkForNewEpisodes`'s established shape: parallel per-group checks (`Promise.all`), independent `try/catch` per group, one `$transaction` per group covering every notification it creates plus the `EpisodeLanguage` upsert, so a group's notifications and its stored chapter count can never drift apart. Unlike `checkForNewEpisodes` (called per-user, on-demand, throttled), this function takes no arguments and processes every flagged library item across all users in one pass — there is no "current user" in a cron context.

### 4. `custom-worker.ts` (new file, project root)

```ts
import defaultWorker from "./.open-next/worker.js";

export default {
  async fetch(request: Request, env: Record<string, string>, ctx: ExecutionContext) {
    return defaultWorker.fetch(request, env, ctx);
  },

  async scheduled(event: ScheduledEvent, env: Record<string, string>, ctx: ExecutionContext) {
    process.env.DATABASE_URL = env.DATABASE_URL;
    const { checkLanguageAvailability } = await import("./src/lib/language-tracking");
    ctx.waitUntil(checkLanguageAvailability());
  },
};
```

The `process.env.DATABASE_URL` assignment must happen **before** the dynamic `import()` — `import()` is what triggers `language-tracking.ts` (and transitively `prisma.ts`) to actually evaluate, so the env var is in place by the time `prisma.ts`'s top-level `const connectionString = ...` line runs. A static top-level `import` would defeat this entirely, since static imports are hoisted and evaluated before any of `scheduled()`'s own body runs.

### 5. `wrangler.toml` changes

```toml
main = "custom-worker.ts"

[triggers]
crons = ["0 */2 * * *"]
```

### 6. API route change

`src/lib/validations/library.ts` gains:

```ts
export const updateWaitLanguageSchema = z.object({
  waitLanguage: z.enum(["EN", "TR"]).nullable(),
});

export type UpdateWaitLanguageInput = z.infer<typeof updateWaitLanguageSchema>;
```

`src/app/api/library/[id]/route.ts`'s `patchHandler` tries this schema third, after the existing status and favorite schemas (same sequential-`safeParse` pattern already in place):

```ts
const waitLanguageParsed = updateWaitLanguageSchema.safeParse(body);
if (waitLanguageParsed.success) {
  const updated = await prisma.libraryItem.update({
    where: { id },
    data: { waitLanguage: waitLanguageParsed.data.waitLanguage },
  });
  return successResponse(updated);
}
```

### 7. UI

- `LibraryItemCard.tsx` / `LibraryItemRow.tsx`: a small language-picker control next to the existing favorite-star toggle, rendered only when `entry.series.source === "mangadex"`. Cycles through None → EN → TR (or a tiny dropdown), `PATCH`-ing `{ waitLanguage }` the same way the favorite toggle already `PATCH`es `{ isFavorite }`.
- Series detail page (`/series/[id]`): a more explicit "Get notified in [language]" widget, shown only for MangaDex-sourced series, calling the same `PATCH /api/library/[id]` endpoint. Requires the series to already be in the user's library (the toggle is a property of `LibraryItem`, not of the series itself) — if not yet added, the widget is hidden, same gating `AddToLibraryButton` already implies elsewhere.

## Error Handling

- Per-group failures inside `checkLanguageAvailability` are caught individually — one bad MangaDex call never blocks or fails the others (same resilience pattern as `checkForNewEpisodes`).
- The cron handler's `process.env.DATABASE_URL` mapping happens unconditionally at the top of `scheduled()`, before any dynamic import — if `env.DATABASE_URL` is itself missing (misconfigured secret), `prisma.ts` falls back to its existing mock-string default, which will fail loudly on first query rather than silently using stale data.
- `ctx.waitUntil()` wraps the entire check so Cloudflare doesn't tear down the Worker mid-run.
- Each group's notification-creation + `EpisodeLanguage` upsert happens in one `$transaction` — never partially applied.
- All `PATCH /api/library/[id]` validation follows the existing `Responses.validationError` path on schema mismatch, same as every other field on that route.

## Testing / Verification

No automated test framework in this repo. Verification is `npm run type-check` + `npm run lint` + manual checks:

- `wrangler dev`, then trigger the cron manually via `GET /__scheduled?cron=0+*/2+*+*+*` rather than waiting two hours; confirm `checkLanguageAvailability` runs and connects to the real (not mock) database.
- Manually lower a test `EpisodeLanguage.latestChapter` (or delete the row) via Prisma Studio, set a library item's `waitLanguage`, trigger the cron, confirm a `Notification` row appears and `EpisodeLanguage.latestChapter` updates.
- Confirm a TMDB/AniList-sourced library item never shows the language-picker UI (MangaDex-only gating).
- Confirm two different users both waiting on the same series+language each get their own `Notification` row from a single cron pass (dedup-then-fan-out behavior).
- Confirm the bell icon/dropdown displays language-availability notifications identically to episode-count notifications (shared UI, no special-casing needed).
- `docs/phases.md`'s Phase 2.5 checklist items get checked off, each annotated with the MangaDex-only / EN+TR-only scope decisions made here.
