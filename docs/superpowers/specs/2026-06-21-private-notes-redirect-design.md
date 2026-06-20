# Phase 2.6 — Personal Private Notes & Custom Redirect Links — Design

## Goal

Let a logged-in user (1) keep a private free-text note per series, and (2) save a global list of preferred search keywords/site names (e.g. `"tranimeizle"`, `"mangasehri"`) and use them to one-click open a Google search for "this series' title + current progress + keyword" — a legal, click-through redirector, not a piracy link store (matches the project's JustWatch-model principle: we never store or serve direct content URLs, only construct a search query).

## Out of Scope

- Per-series keyword override — explicitly dropped per user decision; keywords are a single global list shared across all series.
- Structured/multi-field notes (e.g. separate "spoiler" or "watching on" fields) — free text only.
- Any server-side redirect route or URL shortening — link construction is pure client-side string building, no backend involvement beyond storing the keyword list and note text.
- **No scraping, fetching, or pulling of any data from third-party sites (tranimeizle, mangaşehri, or any other saved keyword's site).** The "keyword" is purely a string token appended to a Google search query (`q={title}+{progress}+{keyword}`). The browser opens Google's own search results page in a new tab; the user clicks through manually from there, exactly as if they'd typed the search themselves. Our server never makes a request to, never receives a response from, and never stores any content from these sites — only the keyword string the user typed in to identify them. This keeps the feature inside the project's legal-only/JustWatch-model principle.
- Public visibility of notes or keywords — both are strictly private to the owning user, never exposed on the public `/profile/[username]` page.

## Current State (relevant precedent)

- `requireAuth()` (`src/lib/auth/helpers.ts`) gates every authenticated route; `/library`, `/calendar` are existing `requireAuth()`-gated pages to follow as precedent for the new `/settings` page.
- Route pattern (`src/app/api/notifications/settings/route.ts`): a single `patchHandler` scoped to `requireAuth()`'s `user.id`, Zod-validated body, `compose(withErrorHandler, withRateLimit)(patchHandler)` export. The Library `[id]` route (`src/app/api/library/[id]/route.ts`) shows the multi-schema `safeParse`-in-sequence pattern used when one PATCH endpoint accepts more than one possible body shape — not needed here since Notes and Keywords get separate routes, but `getOwnedItem`-style ownership check (`item.userId !== userId → AppError.notFound`) is the pattern every per-user-resource route in this codebase follows and this feature reuses verbatim.
- `LibraryItemCard.tsx`'s existing progress-resolution helper (lines ~25-30) already picks `currentEpisode` vs `currentChapter` based on which field is populated on `Series`/`LibraryItem`, returning `{ key, value, label: "episode" | "chapter" }`. This feature reuses that helper's output, capitalizing the label for the search query (`"Episode"`/`"Chapter"`).
- `prisma.$transaction(...)` is an established pattern in this codebase (`src/lib/notifications.ts`, `src/lib/language-tracking.ts`) for "clear old state, set new state" operations — reused here for `isDefault` keyword switching.
- Validation files live in `src/lib/validations/*.ts`, one file per resource area (`library.ts`, `notifications.ts`, `auth.ts`) — this feature adds `notes.ts` and `search-keywords.ts`.

## Design

### Data model

```prisma
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
  label     String   // e.g. "tranimeizle"
  isDefault Boolean  @default(false)
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}
```

`User` gains `userNotes UserNote[]` and `searchKeywords SearchKeyword[]` back-relations. `Series` gains `userNotes UserNote[]`.

### API routes

**`src/app/api/notes/[seriesId]/route.ts`**
- `GET` — `requireAuth()`, returns the caller's `UserNote` for that series (`prisma.userNote.findUnique({ where: { userId_seriesId: { userId, seriesId } } })`) or `null` if none exists. No ownership check needed beyond scoping the query by `userId` directly (no separate resource `id` to verify against).
- `PATCH` — `requireAuth()`, Zod body `{ content: string }` (`updateNoteSchema` in `src/lib/validations/notes.ts`, `z.object({ content: z.string() })` — empty string allowed in the schema, handled specially below). If `content.trim() === ""`, **delete** the row (`deleteMany({ where: { userId, seriesId } })`, no-op if none exists) rather than persisting an empty note — keeps the table free of dead rows. Otherwise `upsert` on `userId_seriesId` (Prisma's compound-unique name for `@@unique([userId, seriesId])`) with the trimmed content. Returns the resulting note or `{ content: null }` if deleted.

**`src/app/api/search-keywords/route.ts`**
- `GET` — `requireAuth()`, returns all of the caller's `SearchKeyword` rows (`orderBy: { createdAt: "asc" }`).
- `POST` — `requireAuth()`, Zod body `{ label: string }` (`createSearchKeywordSchema`, `z.object({ label: z.string().min(1).max(50) })`). Creates a new `SearchKeyword` with `isDefault: false`. If this is the user's first keyword (count was 0 before insert), set `isDefault: true` on creation so the fallback never has to special-case "exists but none marked default" for a brand-new user with exactly one keyword.

**`src/app/api/search-keywords/[id]/route.ts`**
- `DELETE` — `requireAuth()`, ownership check (`getOwnedKeyword` helper, same `findUnique` + `userId !== item.userId → AppError.notFound` pattern as Library), then delete. If the deleted row was `isDefault`, no replacement default is auto-assigned — falls through to the "no default" client-side fallback (see below) until the user explicitly sets a new one.
- `PATCH` — `requireAuth()`, ownership check, Zod body `{ isDefault: true }` (`setDefaultKeywordSchema`, `z.object({ isDefault: z.literal(true) })` — this endpoint only ever sets default to true; "unsetting" happens implicitly when another keyword becomes default). Wrapped in `prisma.$transaction([...])`:
  ```ts
  await prisma.$transaction([
    prisma.searchKeyword.updateMany({
      where: { userId: user.id, isDefault: true },
      data: { isDefault: false },
    }),
    prisma.searchKeyword.update({
      where: { id },
      data: { isDefault: true },
    }),
  ]);
  ```

### Redirect URL construction (client-side)

New helper `src/lib/redirect-url.ts`:

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

This is pure, synchronous, and has no failure mode — no error handling needed. `progress` and `keyword` are both optional; with neither, it degrades to a plain title search (matches the architecture review's fallback requirement).

### UI components

**`src/components/SeriesNoteWidget.tsx`** (new, `"use client"`) — rendered on `src/app/series/[id]/page.tsx`, near `AddToLibraryButton`/`LanguageWaitWidget`. Props: `{ seriesId: string; initialContent: string | null }`. A `<textarea>` with a debounced (500ms, matching the existing 350ms search-debounce precedent in spirit) auto-save PATCH to `/api/notes/[seriesId]`, plus a small "Saved" indicator on success. Server-fetches `initialContent` in the page component via the same Prisma pattern other widgets use (direct `prisma.userNote.findUnique` call in the server component, not a client-side fetch-on-mount, matching `LanguageWaitWidget`'s `existingItem` precedent).

**`src/components/RedirectButton.tsx`** (new, `"use client"`) — shared by both the series detail page and library cards/rows. Props: `{ title: string; progress?: { label: "episode" | "chapter"; value: number } | null }`. Internally: fetches the user's `SearchKeyword` list once (via a small client-side `GET /api/search-keywords` on mount — acceptable here since, unlike Notes, this list is short and not pre-known per-page) and finds the `isDefault` one (or `null` if none). Renders:
- On the series detail page: a button + dropdown (small `<select>`-style affordance, consistent with `LanguageWaitWidget`'s `<select>` pattern) listing all saved keywords, defaulting to `isDefault`; selecting one and clicking "Search" calls `buildRedirectUrl` and `window.open(url, "_blank")`.
- On library cards/rows (`LibraryItemCard.tsx`, `LibraryItemRow.tsx`): a single icon button, no dropdown — always uses the `isDefault` keyword (or no keyword if none set), one click, `window.open`.

This means `RedirectButton` needs a `variant: "full" | "compact"` prop to switch between the two render modes, both sharing the same data-fetch and `buildRedirectUrl` call.

**`src/app/settings/page.tsx`** (new, `requireAuth()`-gated server component) — renders a new `src/components/SearchKeywordManager.tsx` (`"use client"`) client component: list of saved keywords, each with a "Set default" button (disabled/styled differently if already default) and a delete (×) button; an add-keyword text input + submit button at the top. All actions PATCH/POST/DELETE `/api/search-keywords[/[id]]` and refresh the list from the response.

### Validation files

`src/lib/validations/notes.ts`:
```ts
import { z } from "zod";

export const updateNoteSchema = z.object({ content: z.string() });
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;
```

`src/lib/validations/search-keywords.ts`:
```ts
import { z } from "zod";

export const createSearchKeywordSchema = z.object({ label: z.string().min(1).max(50) });
export type CreateSearchKeywordInput = z.infer<typeof createSearchKeywordSchema>;

export const setDefaultKeywordSchema = z.object({ isDefault: z.literal(true) });
export type SetDefaultKeywordInput = z.infer<typeof setDefaultKeywordSchema>;
```

## Error Handling

- `UserNote` PATCH: empty/whitespace-only `content` after `.trim()` deletes the row instead of erroring — this is a deliberate UX choice (clearing the textarea = "remove my note"), not an error case.
- `SearchKeyword` POST: Zod `.min(1)` rejects empty labels with the standard `Responses.validationError(...)` 400 path; no DB-level uniqueness constraint (duplicate labels for the same user are harmless and allowed).
- `SearchKeyword` DELETE/PATCH `[id]`: ownership check via the established `getOwnedKeyword` → `AppError.notFound("Search keyword")` pattern, identical in shape to Library's `getOwnedItem`.
- Redirect link construction has no failure mode (pure string building, no network call) — no error UI needed in `RedirectButton`/`buildRedirectUrl`.
- All five route handlers (`notes/[seriesId]` GET/PATCH, `search-keywords` GET/POST, `search-keywords/[id]` DELETE/PATCH) go through `requireAuth()` first and scope every Prisma query by the authenticated `user.id` — no cross-user data access is possible even with a guessed ID, matching every existing per-user-resource route in this codebase.

## Testing / Verification

No test runner is configured in this repo (per project convention — "verification" means `npm run type-check`, `npm run lint`, and manual browser exercise). Manual verification checklist:
1. Open a series detail page, type a note, confirm auto-save indicator and that it persists on reload.
2. Clear the note entirely, confirm the row is deleted (re-fetch returns `null`) rather than an empty-string row persisting.
3. On `/settings`, add two keywords, set the second as default, confirm the first's `isDefault` flips to `false` (no two simultaneous defaults).
4. Delete the default keyword, confirm the redirect button on a library card falls back to title+progress only (no keyword segment) until a new default is set.
5. Click the redirect button from both a library card (compact, one-click, default keyword) and the series detail page (full, dropdown-selectable) — confirm the opened Google search URL matches `buildRedirectUrl`'s expected shape, including the capitalized `"Episode"`/`"Chapter"` progress segment when the series is in the library with progress, and its absence when not.
6. Confirm notes and keywords are not visible or fetchable from another user's session (manually inspect that `/api/notes/[seriesId]` and `/api/search-keywords` are scoped to the caller's own `userId`).
