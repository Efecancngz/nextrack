# Development Phases — Free Serie Tracker

## Overview

The project is divided into 3 main phases, each with clear deliverables.
Single developer project — prioritize working features over perfect code.

---

## Pivot — Generic SaaS Starter (2026-06-21 →)

**Decision:** all Phase 1/2 work below remains as the historical record of what was built as "Free Serie Tracker," but the project's forward direction changed: it now stays on GitHub as a generic, portfolio-quality "Generic SaaS Starter" template (auth, personal tracking, ratings, cron-based notifications) built on a content-agnostic `Item`/`UserItem` model, not a continuation of the TV/anime/manga tracker product. The pivot is split into three sub-projects:

- **A — Core architecture** (schema, API, pages/components) — split further into:
  - **A1 — Schema & Backend API**: done. New `Item`/`UserItem`/`Rating`/`Notification` Prisma models (replacing `Series`/`LibraryItem`/etc.), new `/api/items/*` and `/api/user-items/*` routes, `checkForItemUpdates()` notification logic genericized. 9 commits on `feat/generic-starter-a1-backend`.
  - **A2 — Pages & Components**: done (12/12 tasks, all individually code-reviewed + a final whole-branch review). New/genericized: `ItemCard`/`ItemListRow`, `AddToTrackingButton`, `TrackingBoard`/`UserItemCard`/`UserItemRow`, `BrowseSuggestions`/`BrowseFilters`, `HeroSlider` (now takes a `byCategory` map), genericized `NotificationBell`/`ProfileStats`/`ProfileFavorites`/`RatingWidget`. New pages: `/browse` (replaces `/explore`), `/items/[id]` (replaces `/series/[id]`), `/my-items` (replaces `/library`), `/` and `/profile/[username]` rewritten. 16 commits, same branch. One Important post-review fix: `AddToTrackingButton` PATCHes an existing tracking entry instead of always POSTing (was 409-ing on already-tracked items).
  - **A3 — Cleanup sweep**: done. Deleted all old domain-specific files (old pages: `/explore`, `/library`, `/series/[id]`, `/calendar`, `/settings`; old components: `SeriesCard`, `LibraryBoard`, `RedirectButton`, `LanguageWaitWidget`, etc. — 14 total; old API routes; old `lib/api/{tmdb,anilist,mangadex,jikan}.ts` clients; old `lib/calendar.ts`/`language-tracking.ts`/`redirect-url.ts`/`db/series-cache.ts`; old `types/{series,library,search-keyword}.ts`; the old-domain half of `types/common.ts`), removed the now-unused Cloudflare Cron `scheduled()` handler from `custom-worker.ts` and the `[triggers]`/`crons` block from `wrangler.toml`, and fixed stale links (`Footer.tsx`, `not-found.tsx`) and `middleware.ts`'s route-protection check (`/library` → `/my-items`). 7 commits, controller-executed directly (the implementer subagent hit a one-time permission-classifier block on the first `git rm`; user granted explicit permission and the controller continued the rest of the sweep directly, mirroring A1's Tasks 4-6 pattern). Independently reviewed via a post-completion whole-range review (Opus) that re-ran every verification grep against the *final* state — zero surviving references to anything deleted. `npm run type-check`/`npm run lint`/`npm run test:run` all clean project-wide for the first time since the pivot began.
- **B — Docs & branding**: not started. Rewrites `CLAUDE.md`'s Project Overview/Content Types/Tech Stack framing, `docs/*` narrative content, and this file's historical phase language to describe a generic starter rather than a TV tracker.
- **C — Deploy verification**: not started. Confirms the Cloudflare Workers deploy path works end-to-end on the new schema. Note: A3 removed the Cloudflare Cron `scheduled()` handler entirely (it backed only the now-deleted MangaDex language-tracking feature) — the Phase 2.5 entry below describing its unverified-firing gap is now moot, not a Sub-project C action item.

**Sub-project A (core architecture) is fully complete: A1 → A2 → A3, all merged.** All work happened on branch `feat/generic-starter-a1-backend`, pushed to `origin` per explicit user instruction (NO AUTO-PUSH rule otherwise in force).

---

## Phase 1 — MVP (Minimum Viable Product)

**Goal**: A functional tracker where users can discover, search, and track series.
**Estimated Time**: 4-6 weeks

### 1.1 Project Setup (~2 days)
- [x] Initialize Next.js 16 with TypeScript
- [x] Configure Tailwind CSS v4
- [x] Install and configure shadcn/ui
- [x] Set up Prisma with Neon PostgreSQL
- [x] Configure ESLint + Prettier
- [x] Set up environment variables
- [x] Configure Cloudflare Wrangler for Workers/Pages deploy
- [x] Create CLAUDE.md and docs

### 1.2 Authentication (~3 days)
- [x] Set up Auth.js v5 (NextAuth)
- [x] Google OAuth provider
- [x] Email/password credentials provider
- [x] Prisma adapter for session storage
- [x] Login page UI
- [x] Registration page UI
- [x] Protected route middleware (via src/proxy.ts)
- [x] bcrypt password hashing
- [x] Custom username selection flow for new and OAuth accounts

### 1.3 External API Integration (~5 days)
- [x] TMDB API client (TV series)
  - [x] Search (mocked fallback if no key)
  - [x] Details (mocked fallback if no key)
  - [x] Trending (mocked fallback if no key)
  - [x] Platform availability (watch providers)
  - [x] Ratings
- [x] AniList GraphQL client (Anime/Manga/LN)
  - [x] Search
  - [x] Details (Awaiting database mapping)
  - [x] Trending (Anime, Manga, and Light Novels)
  - [x] Ratings
- [x] MangaDex API client (Manga/Manhwa chapters)
  - [x] Search
  - [x] Chapter list
- [x] Jikan API client (MAL backup)
  - [x] Search
  - [x] Details (Awaiting database mapping)
  - [x] Ratings as backup source
- [x] Content provider abstraction layer
- [x] Rating normalization (all to 0-10 scale)
- [x] ISR caching for all external data (fetch next revalidate, 0 in development)

### 1.4 Database & API Routes (~4 days)
- [x] Prisma schema (all models)
- [x] Database migrations (Local client generated, pending cloud connection sync)
- [x] API route: Series search
- [x] API route: Series detail
- [x] API route: Trending (segmented by source/countryOfOrigin)
- [x] API route: Explore with filters
- [x] API route: Library CRUD (GET/POST /api/library, PATCH/DELETE /api/library/[id])
- [x] API route: Progress tracking (PATCH /api/library/[id]/progress)
- [x] API route: User ratings (PUT /api/series/[id]/rating)
- [x] Zod validation on all routes (Helper utils implemented)
- [x] Rate limiting middleware (Helper HOF implemented)
- [x] Error handling middleware (Helper HOF implemented)

### 1.5 Frontend Pages (~7 days)
- [x] Root layout (navbar, footer, theme provider)
- [x] Theme system (dark default, light, system auto)
- [x] **Home Page**
  - [x] Trending section (segmented: TV, Anime, Manga, Light Novel)
  - [ ] New episodes/chapters section (Phase 2 Release Calendar)
  - [x] Content type cards/tabs (TV, Anime, Manga, etc.)
- [x] **Explore/Search Page**
  - [x] Search bar with debounced input (350ms)
  - [x] Filter sidebar/tabs (type, status)
  - [x] Card grid view
  - [x] Compact list view
  - [x] View mode toggle (grid/list, persisted via localStorage)
  - [x] Pagination ("Load More")
- [x] **Series Detail Page**
  - [x] Hero banner with poster
  - [x] Description, genres, status
  - [x] Episodes/chapters info
  - [x] Platform availability cards (Where to Watch)
  - [x] Multi-source ratings display
  - [x] "Add to Library" button (live status picker, wired to API)
  - [x] Personal rating widget (1-10 + optional review, wired to API)
  - [ ] Similar series section (future addition)
- [x] **Library Page** (authenticated)
  - [x] Status tabs (Watching, Plan, Completed, On Hold, Dropped) (live, filters real data)
  - [x] Content type filter
  - [x] Card/list view toggle
  - [x] Progress tracking UI (increment episode/chapter, persists)
  - [x] Quick status change (status badge on each library card opens a dropdown, PATCHes the existing endpoint)
  - [x] Personal rating input (on series detail page, not yet surfaced on library cards)
  - [x] Remove from library (with confirm)
- [x] **Auth Pages**
  - [x] Login page (Form UI ready)
  - [x] Register page (Form UI ready)

### 1.6 Polish & Deploy (~2 days)
- [x] Responsive design (mobile, tablet, desktop)
- [x] Loading states (skeletons and spinners)
- [x] Error states (empty search, API failure, error boundary)
- [x] Empty states (empty library)
- [x] SEO meta tags
- [x] Favicon and app icons
- [x] Final Cloudflare Pages/Workers deployment (Wrangler configured)
- [x] Test all flows end-to-end (Verified working)

---

## Phase 2 — Enhanced Features

**Goal**: Add engagement features and personalization.
**Estimated Time**: 3-4 weeks
**Prerequisite**: Phase 1 complete and deployed

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

### 2.2 Calendar / Schedule
- [x] Weekly release calendar
- [x] "Airing today" section on home
- [x] Release notifications (in-app) — shipped as part of Phase 2.3
- [x] Calendar view (week/month toggle)

### 2.3 Notifications
- [x] In-app notification system
- [x] New episode/chapter alerts for tracked series
- [x] Notification preferences (which types to notify) — single on/off toggle this round; per-type granularity deferred until a second notification type exists
- [x] Notification bell icon with badge count

### 2.4 Advanced Search
- [x] Search suggestions / autocomplete
- [x] Advanced filter combinations — genre, year range, status (status applies to Anime/Manga; TMDB's search response has no per-item status field)
- [x] Sort by user rating / popularity
- ~~"Random" discovery feature~~ — dropped during brainstorming, not deferred. Doesn't fit this product's platform-availability-tracker model (not a recommendation engine).

### 2.5 Language/Translation Tracking
- [x] Cron job setup for periodic external API polling — Cloudflare Cron Trigger via a custom Worker wrapper, MangaDex only (AniList has no language-availability data; Anime/TV tracking dropped from scope — see design spec)
- [x] `EpisodeLanguage` database model to store language availability — stores latest known chapter count per (series, language), not full per-chapter history
- [x] "Wait for [Language]" toggle on user library — English/Turkish only, library card + series detail page
- [x] Automated notifications when requested language becomes available — reuses the existing Notification system from Phase 2.3

### 2.6 Personal Private Notes & Custom Links (Google Redirector)
- [x] `UserNote` database model (userId, seriesId, text content) — one free-text note per (user, series), empty content deletes the row
- [x] Save user-preferred site search keywords globally — single global list per user (not per-series, by explicit decision), `SearchKeyword` model with one `isDefault` flag, atomic switching via `prisma.$transaction`
- [x] Implement Google Search Redirector: Watch/Read buttons dynamically link to Google search `https://www.google.com/search?q={title}+{Episode|Chapter} {N}+{keyword}` — pure client-side URL construction (`buildRedirectUrl`), no server-side redirect route, no data ever fetched/scraped from third-party sites
- [x] UI for managing private notes and search keywords on the series details page — `SeriesNoteWidget` (notes, auto-save) and `RedirectButton` (full variant with keyword dropdown)
- [x] Quick access to custom Google redirect search links from library dashboard — `RedirectButton` compact variant (single icon button, default keyword) on both `LibraryItemCard` and `LibraryItemRow`
- [x] Strict backend authorization (users can only view/edit their own notes/keywords) — every route `requireAuth()`-gated and scoped by `userId`, same `getOwnedItem`-style ownership check pattern as Library

### 2.7 AI-Powered Recommendations & Semantic Search
- [ ] Enable `pgvector` database extension on Neon PostgreSQL
- [ ] Add `descriptionEmbedding` vector support to the database schema
- [ ] Implement flexible AI Provider Strategy Pattern (supporting dynamic API key/provider config via env)
- [ ] Apply 3-Way Security Blend (guardrails, structured forms, and 10 queries/day logged-in limit)
- [ ] API route: `/api/explore/ai-search` semantic vector search
- [ ] AI recommendation interface in the Explore page (structured options + 80-char hint box)

---

## Phase 3 — Growth & Community

**Goal**: Scale the platform and build community features.
**Estimated Time**: 4-6 weeks
**Prerequisite**: Phase 2 complete

### 3.1 Internationalization (i18n)
- [ ] i18n framework setup (next-intl)
- [ ] Turkish translation
- [ ] Language switcher in navbar
- [ ] Locale-aware platform availability

### 3.2 Community Features
- [ ] Public user profiles
- [ ] Series reviews (with voting)
- [ ] Series discussion / comments
- [ ] "Follow user" feature (Friend connections)
- [ ] Friend Activity Social Feed (watching updates, ratings, review stream)
- [ ] Shared lists / collections

### 3.3 Performance & Scale
- [ ] Redis caching (Upstash)
- [ ] Image optimization (next/image + CDN)
- [ ] Database query optimization
- [ ] Edge runtime for API routes
- [ ] Analytics (Vercel Analytics or Plausible)

### 3.4 Custom Domain & Branding
- [ ] Purchase and configure custom domain
- [ ] Custom logo and brand assets
- [ ] Open Graph images for social sharing
- [ ] PWA manifest (installable web app)

### 3.5 Gamification & Milestone Badges
- [ ] Custom achievement badges (e.g. "One Piece Marathoner", "Manga Kurdu", "Otaku")
- [ ] Profile card custom showcase for unlocked badges

---

## Technology Decision Log

| Decision | Choice | Reason |
|---|---|---|
| Framework | Next.js 16 (App Router) | Full-stack, Vercel native, SSR/SSG |
| Language | TypeScript | Type safety, better DX, fewer bugs |
| Database | Neon PostgreSQL | Free tier, serverless |
| ORM | Prisma | Type-safe queries, migrations, schema-first |
| Auth | Auth.js v5 | Google + credentials, JWT, HttpOnly cookies |
| Styling | Tailwind CSS v4 + shadcn/ui | Fast development, customizable components |
| Deployment | Cloudflare Pages & Workers | Auto-deploy, unlimited bandwidth, global edge |
| Source Control | GitHub (private) | Cloudflare integration, CI/CD |
| Caching | Next.js ISR | No extra service, built-in |
| Validation | Zod | Runtime type checking, schema-first |
| External APIs | TMDB, AniList, MangaDex, Jikan | Free, comprehensive, reliable |
| Content model | Legal-only (JustWatch model) | No piracy risk, sustainable |
