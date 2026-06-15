# Development Phases — Free Serie Tracker

## Overview

The project is divided into 3 main phases, each with clear deliverables.
Single developer project — prioritize working features over perfect code.

---

## Phase 1 — MVP (Minimum Viable Product)

**Goal**: A functional tracker where users can discover, search, and track series.
**Estimated Time**: 4-6 weeks

### 1.1 Project Setup (~2 days)
- [x] Initialize Next.js 15 with TypeScript
- [x] Configure Tailwind CSS v4
- [x] Install and configure shadcn/ui
- [x] Set up Prisma with Neon PostgreSQL
- [x] Configure ESLint + Prettier
- [x] Set up environment variables
- [x] Create GitHub private repo
- [x] Configure Cloudflare Wrangler for Workers/Pages deploy (Vercel alternative)
- [x] Create CLAUDE.md and docs

### 1.2 Authentication (~3 days)
- [ ] Set up Auth.js v5 (NextAuth)
- [ ] Google OAuth provider
- [ ] Email/password credentials provider
- [ ] Prisma adapter for session storage
- [ ] Login page UI
- [ ] Registration page UI
- [ ] Protected route middleware
- [ ] bcrypt password hashing

### 1.3 External API Integration (~5 days)
- [x] TMDB API client (TV series)
  - [x] Search
  - [x] Details
  - [x] Trending
  - [x] Platform availability (watch providers)
  - [x] Ratings
- [x] AniList GraphQL client (Anime/Manga/LN)
  - [x] Search
  - [x] Details (Awaiting database mapping)
  - [x] Trending
  - [x] Ratings
- [x] MangaDex API client (Manga/Manhwa chapters)
  - [x] Search
  - [x] Chapter list
- [x] Jikan API client (MAL backup)
  - [x] Search
  - [x] Details (Awaiting database mapping)
  - [x] Ratings as backup source
- [/] Content provider abstraction layer (In Progress)
- [x] Rating normalization (all to 0-10 scale)
- [x] ISR caching for all external data (fetch next revalidate)

### 1.4 Database & API Routes (~4 days)
- [x] Prisma schema (all models)
- [x] Database migrations (Local client generated, pending cloud connection sync)
- [ ] API route: Series search
- [ ] API route: Series detail
- [ ] API route: Trending
- [ ] API route: Explore with filters
- [ ] API route: Library CRUD
- [ ] API route: Progress tracking
- [ ] API route: User ratings
- [x] Zod validation on all routes (Helper utils implemented)
- [x] Rate limiting middleware (Helper HOF implemented)
- [x] Error handling middleware (Helper HOF implemented)

### 1.5 Frontend Pages (~7 days)
- [ ] Root layout (navbar, footer, theme provider)
- [ ] Theme system (dark default, light, system auto)
- [ ] **Home Page**
  - [ ] Trending section (carousel/grid)
  - [ ] New episodes/chapters section
  - [ ] Content type tabs (TV, Anime, Manga, etc.)
- [ ] **Explore/Search Page**
  - [ ] Search bar with debounced input
  - [ ] Filter sidebar (type, genre, platform, status)
  - [ ] Card grid view
  - [ ] Compact list view
  - [ ] View mode toggle
  - [ ] Pagination
- [ ] **Series Detail Page**
  - [ ] Hero banner with poster
  - [ ] Description, genres, status
  - [ ] Episodes/chapters list
  - [ ] Platform availability cards
  - [ ] Multi-source ratings display
  - [ ] "Add to Library" button
  - [ ] Similar series section
- [ ] **Library Page** (authenticated)
  - [ ] Status tabs (Watching, Plan, Completed, On Hold, Dropped)
  - [ ] Content type filter
  - [ ] Card/list view toggle
  - [ ] Progress tracking UI (increment/set episode)
  - [ ] Quick status change
  - [ ] Personal rating input
  - [ ] Remove from library
- [ ] **Auth Pages**
  - [ ] Login page
  - [ ] Register page

### 1.6 Polish & Deploy (~2 days)
- [ ] Responsive design (mobile, tablet, desktop)
- [ ] Loading states (skeletons)
- [ ] Error states (empty search, API failure)
- [ ] Empty states (empty library)
- [ ] SEO meta tags
- [ ] Favicon and app icons
- [ ] Final Vercel deployment
- [ ] Test all flows end-to-end

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
- [ ] "Follow user" feature
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

---

## Technology Decision Log

| Decision | Choice | Reason |
|---|---|---|
| Framework | Next.js 15 (App Router) | Full-stack, Vercel native, SSR/SSG |
| Language | TypeScript | Type safety, better DX, fewer bugs |
| Database | Neon PostgreSQL | Free tier, serverless, Vercel integration |
| ORM | Prisma | Type-safe queries, migrations, schema-first |
| Auth | Auth.js v5 | Google + credentials, JWT, HttpOnly cookies |
| Styling | Tailwind CSS v4 + shadcn/ui | Fast development, customizable components |
| Deployment | Vercel (free tier) | Auto-deploy, CDN, edge functions |
| Source Control | GitHub (private) | Vercel integration, CI/CD |
| Caching | Next.js ISR | No extra service, built-in |
| Validation | Zod | Runtime type checking, schema-first |
| External APIs | TMDB, AniList, MangaDex, Jikan | Free, comprehensive, reliable |
| Content model | Legal-only (JustWatch model) | No piracy risk, sustainable |
