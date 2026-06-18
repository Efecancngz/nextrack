# Development Phases — Free Serie Tracker

## Overview

The project is divided into 3 main phases, each with clear deliverables.
Single developer project — prioritize working features over perfect code.

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
- [ ] Set up Auth.js v5 (NextAuth) (blocked: needs DB)
- [ ] Google OAuth provider
- [ ] Email/password credentials provider
- [ ] Prisma adapter for session storage
- [/] Login page UI (placeholder ready)
- [/] Registration page UI (placeholder ready)
- [ ] Protected route middleware (blocked: needs DB)
- [ ] bcrypt password hashing

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
- [ ] API route: Library CRUD (blocked: needs DB)
- [ ] API route: Progress tracking (blocked: needs DB)
- [ ] API route: User ratings (blocked: needs DB)
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
  - [ ] Compact list view
  - [ ] View mode toggle
  - [ ] Pagination
- [x] **Series Detail Page**
  - [x] Hero banner with poster
  - [x] Description, genres, status
  - [x] Episodes/chapters info
  - [x] Platform availability cards (Where to Watch)
  - [x] Multi-source ratings display
  - [x] "Add to Library" button (disabled placeholder)
  - [ ] Similar series section (future addition)
- [x] **Library Page** (authenticated)
  - [/] Status tabs (Watching, Plan, Completed, On Hold, Dropped) (UI empty state ready)
  - [/] Content type filter (UI ready)
  - [ ] Card/list view toggle
  - [/] Progress tracking UI (increment/set episode) (UI ready)
  - [ ] Quick status change
  - [ ] Personal rating input
  - [ ] Remove from library
- [x] **Auth Pages**
  - [x] Login page (Form UI ready)
  - [x] Register page (Form UI ready)

### 1.6 Polish & Deploy (~2 days)
- [x] Responsive design (mobile, tablet, desktop)
- [x] Loading states (skeletons and spinners)
- [x] Error states (empty search, API failure, error boundary)
- [x] Empty states (empty library)
- [x] SEO meta tags
- [ ] Favicon and app icons
- [ ] Final Cloudflare Pages/Workers deployment (Wrangler configured)
- [x] Test all flows end-to-end (Verified working)

---

## Phase 2 — Enhanced Features

**Goal**: Add engagement features and personalization.
**Estimated Time**: 3-4 weeks
**Prerequisite**: Phase 1 complete and deployed

### 2.1 Profile & Statistics
- [ ] User profile page
- [ ] Watch/read statistics dashboard
  - [ ] Total series by type
  - [ ] Episodes watched / chapters read
  - [ ] Average rating given
  - [ ] Genre distribution chart
  - [ ] Monthly activity graph
- [ ] Favorite series showcase
- [ ] Activity history timeline

### 2.2 Calendar / Schedule
- [ ] Weekly release calendar
- [ ] "Airing today" section on home
- [ ] Release notifications (in-app)
- [ ] Calendar view (week/month toggle)

### 2.3 Notifications
- [ ] In-app notification system
- [ ] New episode/chapter alerts for tracked series
- [ ] Notification preferences (which types to notify)
- [ ] Notification bell icon with badge count

### 2.4 Advanced Search
- [ ] Search suggestions / autocomplete
- [ ] Advanced filter combinations
- [ ] Sort by user rating / popularity
- [ ] "Random" discovery feature

### 2.5 Language/Translation Tracking
- [ ] Cron job setup for periodic external API polling (MangaDex, AniList, etc.)
- [ ] `EpisodeLanguage` database model to store language availability timestamps
- [ ] "Wait for [Language]" toggle on user library
- [ ] Automated notifications when requested language (e.g., Turkish) becomes available

### 2.6 Personal Private Notes & Custom Links (Google Redirector)
- [ ] `UserNote` database model (userId, seriesId, text content)
- [ ] Save user-preferred site search keywords (e.g. `tranimeizle`, `mangaşehri`) globally and per-series
- [ ] Implement Google Search Redirector: Watch/Read buttons dynamically link to Google search `https://www.google.com/search?q={title}+{episode}+{keyword}`
- [ ] UI for managing private notes and search keywords on the series details page
- [ ] Quick access to custom Google redirect search links from library dashboard
- [ ] Strict backend authorization (users can only view/edit their own notes/keywords)

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
