# Development Phases — Free Serie Tracker

## Overview

The project is divided into 3 main phases, each with clear deliverables.
Single developer project — prioritize working features over perfect code.

---

## Phase 1 — MVP (Minimum Viable Product)

**Goal**: A functional tracker where users can discover, search, and track series.
**Estimated Time**: 4-6 weeks

### 1.1 Project Setup (~2 days)
- [ ] Initialize Next.js 15 with TypeScript
- [ ] Configure Tailwind CSS v4
- [ ] Install and configure shadcn/ui
- [ ] Set up Prisma with Neon PostgreSQL
- [ ] Configure ESLint + Prettier
- [ ] Set up environment variables
- [ ] Create GitHub private repo
- [ ] Connect Vercel for auto-deploy
- [ ] Create CLAUDE.md and docs

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
- [ ] TMDB API client (TV series)
  - [ ] Search
  - [ ] Details
  - [ ] Trending
  - [ ] Platform availability (watch providers)
  - [ ] Ratings
- [ ] AniList GraphQL client (Anime/Manga/LN)
  - [ ] Search
  - [ ] Details
  - [ ] Trending
  - [ ] Ratings
- [ ] MangaDex API client (Manga/Manhwa chapters)
  - [ ] Search
  - [ ] Chapter list
- [ ] Jikan API client (MAL backup)
  - [ ] Ratings as backup source
- [ ] Content provider abstraction layer
- [ ] Rating normalization (all to 0-10 scale)
- [ ] ISR caching for all external data

### 1.4 Database & API Routes (~4 days)
- [ ] Prisma schema (all models)
- [ ] Database migrations
- [ ] API route: Series search
- [ ] API route: Series detail
- [ ] API route: Trending
- [ ] API route: Explore with filters
- [ ] API route: Library CRUD
- [ ] API route: Progress tracking
- [ ] API route: User ratings
- [ ] Zod validation on all routes
- [ ] Rate limiting middleware
- [ ] Error handling middleware

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
