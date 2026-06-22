# Generic SaaS Starter — Sub-project B: Docs & Branding — Design

## Context

This repo went through a deliberate pivot, decided 2026-06-21: instead of continuing as "Free Serie Tracker" (a TV/anime/manga tracking product), it now stays on GitHub as a generic, portfolio-quality "Generic SaaS Starter" template — auth, personal tracking, ratings, and cron-based notifications, built on a content-agnostic `Item`/`UserItem` model. The pivot was split into Sub-project A (core architecture) → B (docs & branding) → C (deploy verification). Sub-project A is fully done: A1 (schema/backend), A2 (pages/components), and A3 (cleanup sweep — every old domain-specific file physically deleted from the repo) are all merged on `feat/generic-starter-a1-backend`.

What's left behind is a documentation corpus — `README.md`, `CLAUDE.md`, and ten files under `docs/` (~5,000 lines total) — that still describes "Free Serie Tracker" in detail: TMDB/AniList/MangaDex integration, the old `Series`/`LibraryItem` schema, AdSense monetization strategy, etc. None of this is wrong in the sense of referencing deleted code (A1-A3 already fixed every functional reference), but it's misleading narrative: a reader of this repo today would think it's still a TV tracker. Sub-project B's job is to bring every doc's *content and framing* in line with what the repo actually is now.

This is a content rewrite, not an architecture change — no code is touched in this sub-project (the one exception: two genuinely unused npm dependencies, `swagger-jsdoc` and `swagger-ui-react`, are removed alongside deleting the doc that motivated installing them, since they're dead weight discovered during this work).

## Approach

One plan, one pass per file, ordered so foundational identity decisions (README, CLAUDE.md) land before docs that reference them. Each doc gets one of three treatments, decided per-file based on what's actually salvageable:

- **Trim + rewrite**: keep the doc's structural value (diagrams, pattern catalog, schema reference) but cut old-domain depth and rewrite around the generic model. Used where the doc demonstrates something worth keeping (architecture, patterns, schema, API contracts) but was written at TV-tracker-specific depth.
- **Full rewrite, same shape**: same general structure and intent, content fully replaced (README, getting-started).
- **Delete**: the doc no longer earns its place at all (`swagger-setup.md` — confirmed dead, see below).

**Confirmed via direct inspection, not assumption:**
- `swagger-jsdoc`/`swagger-ui-react`/`@types/swagger-jsdoc`/`@types/swagger-ui-react` are listed in `package.json` but have zero usages anywhere in `src/` (`grep -rli "swagger\|openapi" src` returns nothing) — genuinely dead, installed-but-never-wired tooling.
- `docs/project-structure.md` and `docs/design-patterns.md` are written in Turkish (titles bilingual, body Turkish). `docs/database-schema.md` and `docs/api-contracts.md` are written in English. `docs/monetization-and-deploy.md` mixes both (English headers, Turkish table content). Each file's existing language is preserved as-is in this plan — language choice isn't in scope, only content.
- `docs/api-contracts.md`'s documented `ApiResponse<T>` shape (`error: { code, message }`, separate top-level `meta`) does not match the actual implemented type (`src/types/common.ts`'s `ApiResponse<T>` has `error?: string`, no nested `meta` — confirmed by reading the file directly, post-A3 pruning). This was already inaccurate before the pivot, not something this plan introduces — the rewrite uses the *real* implemented shape, not the old aspirational one.
- `docs/phases.md` already received a "Pivot" section during A3's close-out (commit `76b76d9`) documenting the A1→A2→A3 sub-project status. No further content change is needed here beyond a final spot-check that nothing in the older Phase 1/2/3 checklists implies the old domain is still live (the existing pivot notice at the top already disclaims this).

## File-by-File Scope

1. **`README.md`** (EN + TR, bilingual structure preserved) — full rewrite: headline drops "Free Serie Tracker" TV-tracker pitch, becomes a Generic SaaS Starter pitch (what it demonstrates: Auth.js, generic Item/UserItem tracking model, dual ratings, Cloudflare Workers + Cron notifications); feature list reframed around the generic model; both language sections rewritten together so they stay in sync.

2. **`CLAUDE.md`** (private, gitignored, not committed) — rewrite `## Project Overview`, `## Content Types`, `## Design Inspiration`, and the `## Development Phases` / `## User Features (MVP — Phase 1 target)` sections that the A3 pivot notice (added 2026-06-22) already flags as stale. The pivot notice itself can be trimmed once these sections are actually updated — its job was to warn readers the sections below were stale; once they're not stale, the warning is no longer needed for those specific sections (the historical Phase 2.x bullets further down, e.g. "Profile & Statistics (2.1)", remain as an accurate historical record of what was built pre-pivot and are NOT rewritten — same treatment as `docs/phases.md`'s Phase 1/2 checklists).

3. **`docs/getting-started.md`** — rewrite prerequisites/env-var section: drop `TMDB_API_KEY` (TMDB client deleted in A3), drop any AdSense-related env vars, keep `DATABASE_URL`/`NEXTAUTH_*`/`GOOGLE_CLIENT_*` (auth is unchanged by the pivot). Update any setup-step prose that names "Free Serie Tracker" or describes adding TV/anime/manga content.

4. **`docs/contributing.md`** — light touch: the git-workflow/commit-convention rules are already generic (no domain references found in inspection beyond the opening "Welcome to Free Serie Tracker" line) — just the project name and any other stray reference.

5. **`docs/architecture.md`** — genericize the Mermaid diagrams and any entity names that reference `Series`/`LibraryItem`; keep the high-level layered-architecture narrative (this is a documented *target* architecture, already caveated elsewhere as aspirational — that caveat stays).

6. **`docs/project-structure.md`** (Turkish) — genericize the folder-structure tree and any prose referencing old domain folders/files (e.g. the doc's own table of contents lists `swagger-setup.md`, which this plan deletes). Update the root-directory tree to match what A1-A3 actually built (`src/types/item.ts`/`user-item.ts` not `series.ts`/`library.ts`, etc.).

7. **`docs/database-schema.md`** — full rewrite: replace the ERD and entity descriptions (`Series`, `LibraryItem`, `UserRating`, `UserNote`, `SearchKeyword`, `EpisodeLanguage`) with the actual current schema (`Item`, `UserItem`, `Rating`, `Notification`, plus the unchanged `User`/`Account`/`Session`/`VerificationToken` auth tables) — read `prisma/schema.prisma` directly as the source of truth, don't reconstruct from memory.

8. **`docs/design-patterns.md`** (Turkish, 1,364 lines) — trim + rewrite: keep the pattern catalog structure (whatever patterns are still demonstrated by the actual codebase — Adapter, layered architecture, HOF middleware composition, etc.) but cut patterns/examples that only existed for the old multi-source-API domain (e.g. any pattern specifically about reconciling TMDB/AniList/MangaDex data shapes) and rewrite surviving examples against `Item`/`UserItem`. Expect meaningfully shorter than 1,364 lines — this is the one file where "trim" is doing real work, not just a content swap.

9. **`docs/api-contracts.md`** (809 lines) — full rewrite to the real, current contracts: `/api/items` (GET/POST), `/api/items/suggest`, `/api/items/trending`, `/api/items/[id]` (GET), `/api/items/[id]/rating` (POST), `/api/user-items` (GET/POST), `/api/user-items/[id]` (PATCH/DELETE), `/api/auth/*`, `/api/user/username`, `/api/notifications/*` — read each route file directly for its actual request/response shape and Zod schema rather than inventing one; use the real `ApiResponse<T>` shape from `src/types/common.ts`, not the old doc's invented one.

10. **`docs/api-sources.md`** (42 lines) — rewrite from "here are the 4 external APIs we integrate" to "this starter ships with one placeholder example data source (`src/lib/api/example-source.ts`) — here's the pattern for swapping in a real external API" — much shorter, since there's only one source now and its job is to demonstrate the integration pattern, not document four real integrations.

11. **`docs/monetization-and-deploy.md`** → renamed **`docs/deploy.md`** — trim to Cloudflare Workers deploy guidance only (the Vercel-vs-Cloudflare comparison, OpenNext adapter notes, environment setup); delete the AdSense/ad-revenue/monetization-strategy content entirely (doesn't apply to a template with no live traffic).

12. **`docs/phases.md`** — spot-check only, per the Approach section above; expected to need zero or near-zero changes.

13. **`docs/swagger-setup.md`** — deleted. `package.json`'s `swagger-jsdoc`, `swagger-ui-react`, `@types/swagger-jsdoc`, `@types/swagger-ui-react` dependencies removed (confirmed zero usages in `src/`) via `npm uninstall`.

## Out of Scope

- No code changes beyond the swagger dependency removal.
- No CSS/visual changes.
- Sub-project C (deploy verification — actually triggering a real Cloudflare deploy and confirming it works) is a separate sub-project, not touched here, even though `docs/deploy.md` describes the deploy process.
- Translating any currently-English doc to Turkish or vice versa — each file's existing language is preserved.
- `docs/phases.md`'s historical Phase 1/2 checklists and `CLAUDE.md`'s historical Phase 2.x bullets are not rewritten — they're an accurate record of what was built before the pivot, not stale claims about current state.

## Verification

No automated tests apply to a docs-only plan. Verification is manual per task: re-read each rewritten file for (a) zero remaining references to deleted code/old domain terms (`Series`, `LibraryItem`, TMDB/AniList/MangaDex/Jikan as live integrations, `swagger`), (b) factual accuracy against the actual current code (schema, routes, file tree) rather than invented/assumed content, (c) internal consistency with sibling docs (e.g. `getting-started.md`'s env vars matching what `docs/deploy.md` and the actual `.env` setup require). A final task greps the whole `docs/` + `README.md` + `CLAUDE.md` corpus for residual old-domain terms as a closing sanity check.
