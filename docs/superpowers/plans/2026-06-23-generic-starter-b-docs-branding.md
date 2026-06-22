# Generic SaaS Starter — B: Docs & Branding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite every doc that still describes the old "Free Serie Tracker" TV/anime/manga product so the repo reads as a coherent, accurate "Generic SaaS Starter" portfolio template.

**Architecture:** Pure content rewrite, no code changes except removing two genuinely-unused npm dependencies (`swagger-jsdoc`, `swagger-ui-react`) alongside deleting the doc that motivated installing them. Three docs (`architecture.md`, `design-patterns.md`, `project-structure.md`) get a full rewrite to describe the *actual* implemented architecture (routes → Prisma direct, HOF middleware) instead of the fictional layered/repository/service/provider architecture they currently describe — confirmed via direct inspection that this was never built.

**Tech Stack:** No new dependencies. Source of truth for all content: `prisma/schema.prisma`, the actual route files under `src/app/api/**`, `src/lib/utils/{middleware,app-error,api-response}.ts`, `src/types/{item,user-item,common}.ts`, `src/lib/api/example-source.ts`.

## Global Constraints

- This is content-only — no source code changes beyond the swagger dependency removal (`npm uninstall swagger-jsdoc swagger-ui-react @types/swagger-jsdoc @types/swagger-ui-react`).
- Every fact (route paths, schema fields, file tree, request/response shapes) must come from reading the actual current file, never invented or carried over from the old doc's claims.
- Each file's existing language is preserved as-is: `project-structure.md` and `design-patterns.md` stay Turkish: `database-schema.md`, `api-contracts.md`, `api-sources.md` stay English; `README.md` stays bilingual EN+TR; `monetization-and-deploy.md`/`deploy.md` keeps its English-headers/Turkish-content mix.
- `docs/architecture.md`, `docs/design-patterns.md`, `docs/project-structure.md`: full rewrite to the *real* architecture (routes → Prisma directly via `src/lib/db/prisma.ts`, the HOF middleware chain `compose(withErrorHandler, withRateLimit)(handler)` in `src/lib/utils/middleware.ts`, `AppError` factory pattern in `src/lib/utils/app-error.ts`, Zod validation in `src/lib/validations/*.ts`) — drop the fictional Repository/Service/Provider/AI-recommendation/social-feed layers entirely, do not keep them as an aspirational target.
- `docs/swagger-setup.md` is deleted, not rewritten.
- `docs/phases.md` gets a spot-check only (already updated during A3's close-out) — expect zero or near-zero changes.
- The real `ApiResponse<T>` shape (from `src/types/common.ts`, confirmed by reading it post-A3) is `{ success: boolean; data?: T; error?: string; message?: string }` — flat `error: string`, no nested `error.code`/`error.message` object, no top-level `meta`. Use this exact shape everywhere it's referenced, not the old doc's invented `{ error: { code, message } }` shape.
- `CLAUDE.md` is gitignored and must never be staged or committed — its task has no `git add`/`git commit` step.

---

### Task 1: Rewrite `CLAUDE.md`'s Project Overview / Content Types / Design Inspiration sections

**Files:**
- Modify: `CLAUDE.md` (private, gitignored — never staged or committed)

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: nothing other tasks depend on.

`CLAUDE.md` is not tracked by git (confirmed via `.gitignore` and the file's own "CLAUDE.md Protection" rule). This task edits it directly on disk; there is no commit step.

- [ ] **Step 1: Read the current `CLAUDE.md` to find the exact line ranges**

Read the file first. Locate the `## Project Overview` section (near the top, currently describes "tracks TV series, anime, manga, manhwa, light novels, and webtoons... JustWatch model"), the `## Content Types` table (TV Series/Anime/Manga/Manhwa/Light Novel/Webtoon rows), and the `## Design Inspiration` section (AniList/Letterboxd/JustWatch/MAL/Trakt.tv/IMDb/MangaDex blend).

- [ ] **Step 2: Replace `## Project Overview`**

```markdown
## Project Overview
**Generic SaaS Starter** is a full-stack web application template demonstrating a working pattern for auth, personal content tracking, dual ratings, and cron-based notifications. It's built on a content-agnostic `Item`/`UserItem` model (category/status/title/rating + personal tracking-status/progress/notes) designed to be adapted to any domain — courses, books, habits, watch lists, anything with "items a user tracks progress and opinions on." It ships with one placeholder example data source standing in for a real external API integration.
```

- [ ] **Step 3: Replace `## Content Types`**

```markdown
## Content Model

| Concept | Field | Notes |
|---|---|---|
| `Item` | `category` | `ItemCategory` enum: `TYPE_A` / `TYPE_B` / `TYPE_C` — generic placeholders, rename to real domain categories when adapting this starter |
| `Item` | `status` | `ItemStatus` enum: `ONGOING` / `COMPLETED` / `HIATUS` / `CANCELLED` / `UPCOMING` |
| `UserItem` | `status` | `TrackingStatus` enum: `ACTIVE` / `PLANNED` / `COMPLETED` / `PAUSED` / `DROPPED` |
| `UserItem` | `progress` | a single generic `Int?` counter, not separate episode/chapter/season/volume fields — UI always shows "+1 unit (N)" |
```

- [ ] **Step 4: Replace `## Design Inspiration`**

```markdown
## Design Philosophy

Clean, functional, fast. No flashy animations. Subtle micro-interactions only where they improve UX. Must NOT look like generic AI-generated UI — see `ai-instructions.md` for the specific anti-slop rules this project follows (typography hierarchy, restrained color palette, snappy motion).
```

- [ ] **Step 5: Verify by reading the file back**

Read `CLAUDE.md` once more and confirm the three sections were replaced and no other section was touched. No git commit — this file is gitignored.

---

### Task 2: Rewrite `README.md`

**Files:**
- Modify: `README.md` (full rewrite, both EN and TR sections)

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: nothing other tasks depend on, but its doc links must match the file names produced by Tasks 3, 5-11, 13 (`getting-started.md`, `architecture.md`, `design-patterns.md`, `project-structure.md`, `database-schema.md`, `api-sources.md`, `deploy.md` — renamed from `monetization-and-deploy.md`, `api-contracts.md`, `phases.md`) and must NOT link `swagger-setup.md` (deleted in Task 12).

- [ ] **Step 1: Replace the full contents of `README.md`**

```markdown
# Generic SaaS Starter

*Read this in [Turkish / Türkçe](#türkçe)*

Generic SaaS Starter is a full-stack Next.js 16 template demonstrating a working pattern for auth, personal content tracking, dual ratings, and cron-based notifications — built on a content-agnostic `Item`/`UserItem` data model you can adapt to any domain (a course tracker, a reading list, a habit tracker, a watch list — anything with "items a user tracks progress and opinions on").

This is a portfolio/demonstration project, not a live product. It ships with one placeholder example data source (`src/lib/api/example-source.ts`) standing in for a real external API integration — see [api-sources.md](docs/api-sources.md) for the pattern to follow when wiring in a real one.

---

## 🚀 Features

- **Auth.js v5**: Google OAuth + email/password, JWT sessions, custom username-setup flow.
- **Generic tracking model**: `Item` (category/status/title/rating, no domain-specific fields) + `UserItem` (personal tracking status, favorite toggle, a single generic progress counter, notes).
- **Personal tracking statuses**: Active, Planned, Completed, Paused, Dropped — with a status-filtered, grid/list-toggleable tracking board.
- **Dual rating system**: external rating (cached on the `Item`) alongside a personal 1-10 score + review.
- **Search & browse**: debounced search with autocomplete suggestions, category/status filtering.
- **In-app notifications**: a real Cloudflare Cron-driven (well — request-triggered, throttled server-side) check for item updates, with a bell-icon dropdown and on/off toggle.
- **Public profile pages**: per-user stats (tracked-by-category counts, total progress, average rating) and a favorites grid, no auth required to view.
- **Theme support**: dark mode default, light mode, system preference.

---

## 🛠️ Tech Stack

| Layer | Technology | Description |
|---|---|---|
| **Framework** | Next.js 16 (App Router) | React-based full-stack framework |
| **Language** | TypeScript | Type-safe development |
| **Database** | PostgreSQL (Neon.tech) | Serverless cloud SQL database |
| **ORM** | Prisma | Type-safe SQL client and migration runner |
| **Auth** | Auth.js (NextAuth v5) | Google OAuth & Email/Password authentication |
| **Styling** | Tailwind CSS v4 + shadcn/ui | Custom UI, not generic AI-template look |
| **Deployment** | Cloudflare Workers + Pages | Free tier, unlimited bandwidth |
| **Adapter** | @opennextjs/cloudflare | Bridge to run Next.js on Cloudflare Workers |

---

## 📂 Project Structure & Documentation

Architectural and design decisions are documented in the `docs/` folder:

- 📐 [architecture.md](docs/architecture.md) — System architecture, data flow, caching & rate-limit strategy (describes what's actually built, not an aspirational target).
- 🎨 [design-patterns.md](docs/design-patterns.md) — The patterns actually used in this codebase (HOF middleware composition, error factory, generic response wrapper) with real examples.
- 📁 [project-structure.md](docs/project-structure.md) — Folder layout and naming conventions.
- 🔗 [api-contracts.md](docs/api-contracts.md) — REST API endpoints, request/response shapes, and Zod schemas.
- 🗄️ [database-schema.md](docs/database-schema.md) — ER diagram and Prisma schema.
- 🌐 [api-sources.md](docs/api-sources.md) — The example-data-source pattern for plugging in a real external API.
- 🚀 [deploy.md](docs/deploy.md) — Cloudflare Workers deploy guidance.
- 📈 [phases.md](docs/phases.md) — Development history, including the pivot from a TV-tracker product to this generic template.
- 🏁 [getting-started.md](docs/getting-started.md) — Local setup (with/without Docker), environment variables, and Prisma commands.

---

## 💻 Local Setup Instructions

See the **[Getting Started Guide](docs/getting-started.md)** for step-by-step local setup (native Node.js or Docker), environment variable configuration, and database migrations.

---

## 🚀 Production Deployment

To deploy to Cloudflare Workers & Pages:

```bash
# Login to Cloudflare account
npx wrangler login

# Build & deploy the project with OpenNext
npx opennextjs-cloudflare build
npx wrangler deploy
```

See [deploy.md](docs/deploy.md) for the full Cloudflare setup and why it's used instead of Vercel.

---

## 📄 License
This project is built for portfolio and demonstration purposes. All rights reserved.

<br/>
<hr/>
<br/>

# Türkçe

Generic SaaS Starter, kimlik doğrulama, kişisel içerik takibi, çiftli puanlama sistemi ve cron tabanlı bildirimler için çalışan bir örüntüyü gösteren, Next.js 16 üzerine kurulu full-stack bir şablon projedir. Herhangi bir alana uyarlanabilen, içerik bağımsız bir `Item`/`UserItem` veri modeli üzerine inşa edilmiştir (kurs takibi, okuma listesi, alışkanlık takibi, izleme listesi — kullanıcının ilerleme ve görüş kaydettiği her şey).

Bu proje canlı bir ürün değil, bir portfolyo/demo projesidir. Gerçek bir dış API entegrasyonunun yerine geçen tek bir örnek veri kaynağıyla (`src/lib/api/example-source.ts`) birlikte gelir — gerçek bir kaynak bağlamak için izlenecek örüntü için [api-sources.md](docs/api-sources.md) dosyasına bakın.

---

## 🚀 Özellikler

- **Auth.js v5**: Google OAuth & e-posta/şifre girişi, JWT oturumları, özel kullanıcı adı belirleme akışı.
- **Generic takip modeli**: `Item` (kategori/durum/başlık/puan, alana özgü alan yok) + `UserItem` (kişisel takip durumu, favori, tek bir generic ilerleme sayacı, notlar).
- **Kişisel takip durumları**: Active, Planned, Completed, Paused, Dropped — durum filtreli, grid/liste geçişli bir takip panosu ile.
- **Çiftli puanlama sistemi**: `Item` üzerinde önbelleğe alınan dış puan, kişisel 1-10 puan + yorumun yanında.
- **Arama ve keşfet**: debounce'lu arama, otomatik tamamlama önerileri, kategori/durum filtreleme.
- **Uygulama içi bildirimler**: öğe güncellemeleri için sunucu tarafında saatlik throttle edilen bir kontrol, zil ikonlu açılır liste ve aç/kapa anahtarı ile.
- **Herkese açık profil sayfaları**: kullanıcı başına istatistikler (kategoriye göre takip sayısı, toplam ilerleme, ortalama puan) ve favoriler ızgarası, görüntülemek için giriş gerekmez.
- **Tema desteği**: varsayılan karanlık tema, aydınlık tema, sistem tercihi.

---

## 🛠️ Teknoloji Yığını

| Katman | Teknoloji | Açıklama |
|---|---|---|
| **Framework** | Next.js 16 (App Router) | React tabanlı full-stack framework |
| **Dil** | TypeScript | Güvenli ve ölçeklenebilir kod yapısı |
| **Veritabanı** | PostgreSQL (Neon.tech) | Sunucusuz (Serverless) SQL veritabanı |
| **ORM** | Prisma | Tip güvenli SQL sorguları ve şema yönetimi |
| **Kimlik Doğrulama** | Auth.js (NextAuth v5) | Google OAuth & E-posta/Şifre girişi |
| **Tasarım / Stil** | Tailwind CSS v4 + shadcn/ui | Özel arayüz, generic AI şablon görünümünde değil |
| **Dağıtım (Deploy)** | Cloudflare Workers + Pages | Ücretsiz katman, sınırsız bant genişliği |
| **Adaptör** | @opennextjs/cloudflare (OpenNext) | Next.js'i Cloudflare Workers üzerinde çalıştırma köprüsü |

---

## 📂 Proje Yapısı ve Dokümantasyon

Mimari ve tasarım kararları `docs/` klasöründe belgelenmiştir:

- 📐 [architecture.md](docs/architecture.md) — Sistem mimarisi, veri akışı, caching ve rate-limit stratejisi (gerçekte ne inşa edildiğini anlatır, ulaşılmamış bir hedefi değil).
- 🎨 [design-patterns.md](docs/design-patterns.md) — Bu kod tabanında gerçekten kullanılan pattern'ler (HOF middleware kompozisyonu, hata factory'si, generic response wrapper) gerçek örneklerle.
- 📁 [project-structure.md](docs/project-structure.md) — Klasör yapısı ve isimlendirme kuralları.
- 🔗 [api-contracts.md](docs/api-contracts.md) — REST API uç noktaları, istek/yanıt şemaları ve Zod doğrulama kuralları.
- 🗄️ [database-schema.md](docs/database-schema.md) — ER şeması ve Prisma tanımlamaları.
- 🌐 [api-sources.md](docs/api-sources.md) — Gerçek bir dış API bağlamak için örnek-veri-kaynağı örüntüsü.
- 🚀 [deploy.md](docs/deploy.md) — Cloudflare Workers deploy rehberi.
- 📈 [phases.md](docs/phases.md) — Geliştirme geçmişi, TV-tracker ürününden bu generic şablona geçiş dahil.
- 🏁 [getting-started.md](docs/getting-started.md) — Yerel kurulum (Docker'lı/Docker'sız), çevre değişkenleri ve Prisma komutları.

---

## 💻 Yerel Geliştirme Kurulumu

Adım adım yerel kurulum (native Node.js veya Docker), çevre değişkeni yapılandırması ve veritabanı migration'ları için **[Başlangıç Rehberi](docs/getting-started.md)** belgesine bakın.

---

## 🚀 Canlıya Dağıtım (Deployment)

Cloudflare Workers ve Pages kullanarak canlıya almak için:

```bash
# Cloudflare hesabı ile yetkilendirme
npx wrangler login

# Projeyi OpenNext ile derleme ve deploy etme
npx opennextjs-cloudflare build
npx wrangler deploy
```

Cloudflare kurulumunun tamamı ve neden Vercel yerine Cloudflare kullanıldığı için [deploy.md](docs/deploy.md) dosyasına bakın.

---

## 📄 Lisans
Bu proje portfolyo ve demo amaçlı geliştirilmiştir. Tüm hakları saklıdır.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: rewrite README for generic SaaS starter framing"
```

---

### Task 3: Rewrite `docs/getting-started.md` and `.env.example`

**Files:**
- Modify: `docs/getting-started.md` (full rewrite)
- Modify: `.env.example` (drop TMDB/AniList/MangaDex/Jikan/AdSense vars)

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: nothing other tasks depend on.

Direct inspection of the actual `.env.example` (read in full during plan-writing) found it still lists `TMDB_API_KEY`, `TMDB_BASE_URL`, `ANILIST_BASE_URL`, `MANGADEX_BASE_URL`, `JIKAN_BASE_URL`, and `NEXT_PUBLIC_ADSENSE_PUBLISHER_ID` — all dead, since A3 deleted every client that read them. This task fixes both the prose doc and the actual env template together, since they must stay in sync.

- [ ] **Step 1: Replace the full contents of `.env.example`**

```env
# Environment variables — Generic SaaS Starter
# Copy this file to .env.local and fill in values. NEVER commit .env.local!

# ─── Database (Neon PostgreSQL) ───────────────────
# Get from: https://neon.tech → Project → Connection string
DATABASE_URL="postgresql://user:password@ep-xxx.eu-central-1.aws.neon.tech/neondb?sslmode=require"

# Direct URL for Prisma migrations (bypass connection pooler)
DIRECT_URL="postgresql://user:password@ep-xxx.eu-central-1.aws.neon.tech/neondb?sslmode=require"

# ─── Auth.js v5 ───────────────────────────────────
# Generate secret: openssl rand -base64 32
NEXTAUTH_SECRET="your-32-character-random-secret-here"

# App URL (change in production)
NEXTAUTH_URL="http://localhost:3000"

# Google OAuth — from Google Cloud Console
# https://console.cloud.google.com → APIs & Services → Credentials
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

- [ ] **Step 2: Replace the full contents of `docs/getting-started.md`**

```markdown
# Getting Started Guide

This document provides step-by-step instructions on setting up, running, and developing the **Generic SaaS Starter** application locally (with or without Docker), along with database commands.

## Prerequisites

To run this application locally, you will need:
- **Node.js** v20 or higher
- **Docker & Docker Compose** (Optional, for containerized local database and application)
- **Google OAuth Client Credentials** (optional — only needed to test the Google sign-in path; email/password auth works without it) — from [Google Cloud Console](https://console.cloud.google.com/).
- **NextAuth Secret** — a 32-character random string (generate with `openssl rand -base64 32`).

No external content-source API key is required: the starter ships with a built-in placeholder data source (`src/lib/api/example-source.ts`, seeded via `prisma/seed.ts`) so it runs fully offline. See [api-sources.md](api-sources.md) for how to swap in a real external API.

---

## Local Development Setup

### Step 1: Copy Environment Variables
Create a `.env.local` file by copying `.env.example`:
```bash
cp .env.example .env.local
```
Configure your environment variables:
- If running locally with Node (no Docker), set `DATABASE_URL` to your Neon PostgreSQL connection string.
- If using Docker, `DATABASE_URL` will default to the local Docker Postgres service.

---

### Option A: Running with Docker (Recommended for Offline/Local DB)
This option runs both the Next.js application and a local PostgreSQL database in Docker containers.

1. Ensure **Docker Desktop** is running.
2. Build and launch the container services:
   ```bash
   docker compose up --build
   ```
3. The Docker services will:
   - Run Next.js on `http://localhost:3000`
   - Run PostgreSQL on port `5432`
   - Automatically generate Prisma Client inside the container.
4. To run database migrations inside the container:
   ```bash
   docker compose exec web npx prisma migrate dev
   ```

---

### Option B: Running with local Node.js (Neon PostgreSQL)
This option runs the Next.js app locally and connects to your serverless Neon PostgreSQL database.

1. Install local dependencies:
   ```bash
   npm install
   ```
2. Run database migrations to push schema, then seed the example data:
   ```bash
   # Generates Prisma client types
   npm run db:generate

   # Run migrations (Neon DB)
   npm run db:migrate
   ```
   `npm run db:migrate` also runs `prisma/seed.ts` (configured via `package.json`'s `"prisma": { "seed": "tsx prisma/seed.ts" }`), which loads the 12 example `Item` rows from `src/lib/api/example-source.ts` so the app has content to browse immediately.
3. Start Next.js development server:
   ```bash
   npm run dev
   ```
4. Access the application at `http://localhost:3000`.

---

## Useful Prisma Commands

Prisma is used for database schema management, type generation, and migrations.

- **Generate Prisma Client**: `npm run db:generate` (re-generates types when `schema.prisma` changes).
- **Create a Migration**: `npm run db:migrate` (prompts for migration name, applies changes to database, runs the seed script).
- **Push Schema directly**: `npm run db:push` (forces schema sync, useful for quick prototyping without creating migrations).
- **Prisma Studio**: `npm run db:studio` (launches database GUI dashboard at `http://localhost:5555`).

---

## Production Deployment (Cloudflare)

To deploy to Cloudflare Pages & Workers using Wrangler and OpenNext:

1. Build for Cloudflare environment:
   ```bash
   npm run deploy:build
   ```
2. Login to your Wrangler CLI:
   ```bash
   npx wrangler login
   ```
3. Deploy to production:
   ```bash
   npm run deploy
   ```

See [deploy.md](deploy.md) for why Cloudflare Workers is used instead of Vercel, and the full deploy architecture.
```

- [ ] **Step 3: Commit**

```bash
git add docs/getting-started.md .env.example
git commit -m "docs: rewrite getting-started guide and env template for generic starter"
```

---

### Task 4: Light-touch edit `docs/contributing.md`

**Files:**
- Modify: `docs/contributing.md:3` and `:35`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: nothing other tasks depend on.

Direct inspection confirms the only domain-specific content in this 35-line file is the opening project name and the commit-message examples (one of which references "jikan api client", a deleted module). The git-workflow rules themselves are already generic.

- [ ] **Step 1: Replace the project name in the opening line**

Read the file first. Change:

```markdown
Welcome to the **Free Serie Tracker** repository! To keep the codebase clean, readable, and maintainable, please follow these guidelines when contributing.
```

to:

```markdown
Welcome to the **Generic SaaS Starter** repository! To keep the codebase clean, readable, and maintainable, please follow these guidelines when contributing.
```

- [ ] **Step 2: Replace the commit-message examples**

Change:

```markdown
   *Examples:*
   - `feat: add jikan api client for mal integration`
   - `fix: resolve dynamic route param promise resolution in next.js 16`
   - `style: adjust explore page grid spacing`
```

to:

```markdown
   *Examples:*
   - `feat: add user-items progress increment endpoint`
   - `fix: resolve dynamic route param promise resolution in next.js 16`
   - `style: adjust browse page grid spacing`
```

- [ ] **Step 3: Confirm the "Coding Standards" footer reference is still accurate**

Read the file's closing line (`Refer to [CLAUDE.md](../CLAUDE.md) and [design-patterns.md](design-patterns.md) for detailed coding rules.`) — this is still accurate after Task 8 rewrites `design-patterns.md`, no change needed.

- [ ] **Step 4: Commit**

```bash
git add docs/contributing.md
git commit -m "docs: update contributing.md project name and commit examples"
```

---

### Task 5: Full rewrite of `docs/architecture.md`

**Files:**
- Modify: `docs/architecture.md` (full rewrite)

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: nothing other tasks depend on.

Per the Global Constraints, this is a full rewrite to the *real* architecture (no Repository/Service/Provider/AI/social layers — confirmed via direct inspection these were never built). Source of truth used below: `src/lib/utils/middleware.ts`, `src/lib/utils/app-error.ts`, `src/lib/utils/api-response.ts`, `src/app/api/items/route.ts`, `src/app/api/user-items/route.ts` (all read in full during plan-writing).

- [ ] **Step 1: Replace the full contents of `docs/architecture.md`**

```markdown
# System Architecture — Generic SaaS Starter

## High-Level Architecture

```mermaid
graph TB
    subgraph Client["Browser (Client)"]
        UI["Next.js React UI"]
        SC["Server Components"]
        CC["Client Components"]
    end

    subgraph CFW["Cloudflare Workers (via OpenNext)"]
        subgraph NextJS["Next.js App"]
            AR["App Router"]
            API["API Routes<br/>/api/*"]
            MW["HOF Middleware Chain<br/>(Rate Limit + Error Handler)"]
        end

        subgraph Auth["Auth.js"]
            GO["Google OAuth"]
            EP["Email/Password"]
            JWT["JWT Sessions"]
        end
    end

    subgraph ExampleSource["Example Data Source"]
        ES["src/lib/api/example-source.ts<br/>(in-memory placeholder, seeded into DB)"]
    end

    subgraph Database["Neon PostgreSQL"]
        Users["User / Account / Session"]
        Items["Item"]
        UserItems["UserItem (tracking)"]
        Ratings["Rating"]
        Notifications["Notification"]
    end

    UI --> AR
    AR --> SC
    AR --> CC
    AR --> API
    API --> MW
    MW --> Auth
    API --> Database
    ES -.->|"seeded once via prisma/seed.ts"| Items

    style Client fill:#1a1a2e,stroke:#16213e,color:#e0e0e0
    style CFW fill:#0a0a1a,stroke:#16213e,color:#e0e0e0
    style ExampleSource fill:#1a1a2e,stroke:#16213e,color:#e0e0e0
    style Database fill:#1a1a2e,stroke:#16213e,color:#e0e0e0
```

There is no service/repository/provider layer. Every API route queries Prisma directly — see [project-structure.md](project-structure.md) for the actual file layout and [design-patterns.md](design-patterns.md) for why this is a deliberate choice at this project's size, not an oversight.

## Data Flow

### 1. Browse / Search

```mermaid
sequenceDiagram
    participant User
    participant Browse as /browse page (client)
    participant API as GET /api/items
    participant DB as Neon PostgreSQL

    User->>Browse: types a search query
    Browse->>Browse: debounce (350ms)
    Browse->>API: GET /api/items?q=&category=&status=
    API->>DB: prisma.item.findMany({ where: {...} })
    DB-->>API: matching Item rows
    API-->>Browse: { success: true, data: Item[] }
    Browse-->>User: render ItemCard/ItemListRow grid
```

No caching layer sits in front of this query — every request hits Postgres directly. At this project's scale (a handful of example rows) that's the right tradeoff; if you adapt this starter to a larger dataset, this is the place to add a cache.

### 2. Track an Item & Update Progress

```mermaid
sequenceDiagram
    participant User
    participant API as API Route
    participant Auth as Auth.js (requireAuth)
    participant DB as Neon PostgreSQL

    User->>API: POST /api/user-items { itemId, status }
    API->>Auth: requireAuth()
    Auth-->>API: session user
    API->>DB: prisma.userItem.create(...)
    DB-->>API: created UserItem
    API-->>User: { success: true, data: UserItem }

    User->>API: PATCH /api/user-items/:id { progress }
    API->>Auth: requireAuth()
    API->>DB: confirm ownership, then prisma.userItem.update(...)
    DB-->>API: updated UserItem
    API-->>User: { success: true, data: UserItem }
```

Ownership is enforced in the route handler itself (`getOwnedUserItem()` in `src/app/api/user-items/[id]/route.ts`), not by a separate auth-guard middleware — a cross-user request gets a 404 (not 403), deliberately, so it doesn't leak whether the resource exists.

## Layered Architecture (as actually built)

```
┌─────────────────────────────────────────────────┐
│                  Presentation Layer              │
│   (React Server/Client Components — src/app/*)   │
├─────────────────────────────────────────────────┤
│                  API Layer                       │
│   (Next.js Route Handlers — src/app/api/*/route.ts)  │
│   Each handler does: parse → validate (Zod) →    │
│   query Prisma directly → format response.       │
│   No service or repository indirection.          │
├─────────────────────────────────────────────────┤
│                  Data Access                     │
│   Prisma ORM (src/lib/db/prisma.ts) — PostgreSQL │
├─────────────────────────────────────────────────┤
│                  Infrastructure                  │
│   Auth.js, HOF middleware (rate limit + error     │
│   handling), Zod validation schemas              │
└─────────────────────────────────────────────────┘
```

## Rate Limiting Strategy

Every route wrapped in `compose(withErrorHandler, withRateLimit)(handler)` gets the same uniform limit — `withRateLimit`'s defaults (`src/lib/utils/middleware.ts`), since no route currently overrides them:

| Limit | Window | Scope |
|---|---|---|
| 60 requests | 60 seconds | per IP (via `cf-connecting-ip` / `x-forwarded-for` header), per route path |

In-memory store, reset on redeploy — fine for a single Worker instance, not horizontally consistent across many instances. Swap for Cloudflare's native Rate Limiting or Upstash Redis if that matters for your deployment.

## Error Handling Pattern

```typescript
// The real, current ApiResponse<T> shape (src/types/common.ts)
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
```

`AppError` (`src/lib/utils/app-error.ts`) is a custom error class with factory statics (`AppError.notFound()`, `.unauthorized()`, `.forbidden()`, `.badRequest()`, `.conflict()`, `.validationError()`, `.rateLimited()`, `.externalApiError()`). Route handlers `throw` it; `withErrorHandler` (the outermost middleware in the `compose()` chain) catches it and converts it to a structured `errorResponse()` — anything that isn't an `AppError` is logged and returned as a generic 500, never leaking internals to the client.

See [design-patterns.md](design-patterns.md) for the full HOF middleware composition pattern and [api-contracts.md](api-contracts.md) for every endpoint's exact request/response shape.
```

- [ ] **Step 2: Commit**

```bash
git add docs/architecture.md
git commit -m "docs: rewrite architecture.md to describe the real implemented architecture"
```

---

### Task 6: Full rewrite of `docs/project-structure.md`

**Files:**
- Modify: `docs/project-structure.md` (full rewrite, Turkish — language preserved)

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: nothing other tasks depend on.

Per the Global Constraints, full rewrite to the real file tree (no `repositories/`, `services/`, `providers/`, `swagger/`, `(auth)`/`(main)` route groups, `social/` routes — none exist; `src/app` is flat, confirmed via `CLAUDE.md` and direct inspection). The tree below was read directly from the working tree during plan-writing, not reconstructed from the old doc.

- [ ] **Step 1: Replace the full contents of `docs/project-structure.md`**

```markdown
# Project Structure Deep Dive — Generic SaaS Starter

Her klasörün **neden** var olduğu, **ne içerdiği** ve **kuralları**.

---

## Kök Dizin

```
serietracker/
├── CLAUDE.md                     # AI asistan referans dosyası (gitignored)
├── docs/                         # Proje dokümantasyonu (bu dosyalar)
│   ├── architecture.md           # Gerçek sistem mimarisi
│   ├── design-patterns.md        # Bu kod tabanında gerçekten kullanılan pattern'ler
│   ├── database-schema.md        # ERD + Prisma şeması
│   ├── api-contracts.md          # Endpoint sözleşmeleri
│   ├── api-sources.md            # Örnek veri kaynağı örüntüsü
│   ├── deploy.md                 # Cloudflare deploy rehberi
│   ├── getting-started.md        # Yerel kurulum rehberi
│   ├── project-structure.md      # Bu dosya
│   └── phases.md                 # Geliştirme geçmişi
├── src/                          # Tüm uygulama kodu
├── prisma/                       # Veritabanı şeması ve migration'lar
├── public/                       # Statik dosyalar (favicon, logolar)
├── .env.example                  # Env değişkenleri şablonu
├── .env.local                    # Gerçek env değişkenleri (gitignore'da)
├── .gitignore
├── next.config.ts                # Next.js konfigürasyonu
├── tailwind.config.ts            # Tailwind CSS konfigürasyonu
├── tsconfig.json                 # TypeScript konfigürasyonu
├── eslint.config.mjs             # ESLint konfigürasyonu
├── vitest.config.ts              # Vitest test konfigürasyonu
├── wrangler.toml                 # Cloudflare Workers konfigürasyonu
├── custom-worker.ts              # OpenNext worker wrapper (fetch handler)
└── package.json
```

---

## `src/` — Uygulama Kodu

```
src/
├── app/                          # Next.js App Router (sayfa + API) — DÜZ yapı, route group yok
├── components/                   # React bileşenleri
├── lib/                          # İş mantığı, yardımcılar, altyapı
├── types/                        # TypeScript tip tanımları
└── generated/prisma/             # Prisma client çıktısı (gitignored, `npm run db:generate` ile üretilir)
```

**Not:** Bu projede `repositories/`, `services/`, `providers/` katmanları YOKTUR. API Route'lar Prisma'yı doğrudan çağırır. Bkz. [architecture.md](architecture.md).

---

## `src/app/` — Next.js App Router

```
src/app/
├── page.tsx                      # Ana sayfa — hero slider + trending grid
├── layout.tsx                    # Root layout — HTML, fontlar, navbar, footer
├── globals.css                   # Global stiller, Tailwind @import, CSS variables
├── not-found.tsx                 # 404 sayfası
├── error.tsx                     # Genel hata sayfası
├── loading.tsx                   # Genel loading state
├── icon.tsx, apple-icon.tsx      # Favicon üretimi
│
├── auth/
│   ├── signin/page.tsx           # Giriş sayfası
│   ├── signup/page.tsx           # Kayıt sayfası
│   └── set-username/page.tsx     # Kullanıcı adı belirleme akışı
│
├── browse/page.tsx               # Arama/filtre/sıralama — debounce'lu, autocomplete'li
├── items/[id]/page.tsx           # Item detay sayfası
├── my-items/page.tsx             # requireAuth()-gated — kişisel takip panosu
├── profile/[username]/page.tsx   # Herkese açık, auth gerektirmez — istatistik + favoriler
│
└── api/
    ├── auth/[...nextauth]/route.ts   # Auth.js catch-all handler
    ├── auth/register/route.ts        # POST — e-posta/şifre kayıt
    ├── items/route.ts                # GET — liste/filtre (q/category/status)
    ├── items/suggest/route.ts        # GET — otomatik tamamlama, 8 ile sınırlı
    ├── items/trending/route.ts       # GET — trend olan item'lar
    ├── items/[id]/route.ts           # GET — item detayı
    ├── items/[id]/rating/route.ts    # PUT — kişisel puan ver/güncelle
    ├── user-items/route.ts           # GET/POST — takip listesi / takibe ekle
    ├── user-items/[id]/route.ts      # PATCH/DELETE — durum/favori/ilerleme güncelle, kaldır
    ├── user/username/route.ts        # POST — kullanıcı adı belirle
    └── notifications/
        ├── route.ts                  # GET — bildirim listesi + okunmamış sayısı
        ├── check/route.ts            # POST — yeni güncellemeleri kontrol et (throttled)
        ├── mark-read/route.ts        # PATCH — tümünü okundu işaretle
        └── settings/route.ts         # PATCH — bildirim aç/kapa
```

### API Route Kuralları

1. Her `route.ts` HTTP method export'u yapar (`GET`, `POST`, `PATCH`, `DELETE`)
2. Her handler `compose(withErrorHandler, withRateLimit)(handler)` ile sarılır
3. Auth gerektiren endpoint'ler handler içinde `requireAuth()` çağırır (ayrı bir middleware değil)
4. Her input Zod ile validate edilir (`src/lib/validations/*.ts`)
5. Prisma doğrudan handler içinde çağrılır — Service/Repository katmanı yok

---

## `src/components/` — React Bileşenleri

**Kural**: Bileşenler "aptal" olmalı — kendi veri çekme işlemi yapmazlar, prop alırlar.

```
src/components/
├── ui/                            # shadcn/ui temel bileşenleri
├── Navbar.tsx, Footer.tsx         # Sayfa düzeni
├── HeroSlider.tsx                 # Ana sayfa kahraman görseli — kategoriye göre gruplu
├── ItemCard.tsx, ItemListRow.tsx  # Item kart/satır görünümü
├── AddToTrackingButton.tsx        # Item detay sayfasında takibe ekle/durum değiştir
├── RatingWidget.tsx               # Kişisel puanlama widget'ı
├── TrackingBoard.tsx              # Kişisel takip panosu (durum filtreli, grid/liste)
├── UserItemCard.tsx, UserItemRow.tsx  # TrackingBoard'un kart/satır görünümü
├── BrowseFilters.tsx              # Kategori/durum filtreleri
├── BrowseSuggestions.tsx          # Arama otomatik tamamlama açılır listesi
├── ProfileHeader.tsx, ProfileStats.tsx, ProfileFavorites.tsx  # Profil sayfası bileşenleri
└── NotificationBell.tsx, NotificationTrigger.tsx  # Bildirim zili + sessiz tetikleyici
```

### Bileşen Kuralları

| Kural | Açıklama |
|---|---|
| **Server-first** | Varsayılan olarak Server Component. `"use client"` sadece state/event gerektiğinde. |
| **Prop-driven** | Bileşen kendi datasını çekmez, üstten prop alır. |
| **Tek sorumluluk** | Her bileşen tek bir iş yapar. |
| **Interface Props** | `interface Props {}` kullan, `type Props =` değil. |

---

## `src/lib/` — İş Mantığı & Altyapı

```
src/lib/
├── api/example-source.ts         # Örnek veri kaynağı — gerçek dış API'nin yerine geçen placeholder
├── auth/
│   ├── config.ts                 # Auth.js options (Node runtime)
│   ├── edge.ts                   # Edge-uyumlu hafif NextAuth instance (Prisma/bcrypt import etmez)
│   └── helpers.ts                # requireAuth(), getCurrentUser()
├── db/prisma.ts                  # Prisma singleton client
├── notifications.ts              # checkForItemUpdates() — throttled, paralel, transactional yazma
├── utils.ts                      # cn() — Tailwind className merge
├── utils/
│   ├── api-response.ts           # successResponse(), errorResponse(), Responses.{notFound,...}
│   ├── app-error.ts              # AppError sınıfı + factory metodları
│   └── middleware.ts             # withErrorHandler, withRateLimit, compose() HOF'ları
└── validations/
    ├── auth.ts                   # registerSchema
    ├── item.ts                   # itemCategoryEnum, addToTrackingSchema, rateItemSchema, vb.
    └── notifications.ts          # updateNotificationSettingsSchema
```

**Kural**: Framework-agnostic kod buraya gelir. React import'u OLMAZ.

### Katman İlişkileri

```
API Routes → Prisma (doğrudan) → PostgreSQL
API Routes → src/lib/utils/* (hata yönetimi, response formatlama, rate limit)
API Routes → src/lib/validations/* (Zod doğrulama)
```

**KESİNLİKLE OLMAYACAK İLİŞKİLER:**
- ❌ Component → Prisma (Presentation katmanı veriye doğrudan erişmez, sayfa Server Component'i çeker ve prop olarak geçer)
- ❌ Var olmayan bir Service/Repository katmanına referans

---

## `src/types/` — TypeScript Tip Tanımları

```
src/types/
├── common.ts                     # ApiResponse<T>, PaginationMeta, PaginatedResponse<T> — sadece generic tipler
├── item.ts                       # ItemCategory, ItemStatus, ItemCard, ItemDetail
├── user-item.ts                  # TrackingStatus, UserItemEntry
├── profile.ts                    # ProfileStatsData
└── next-auth.d.ts                # Auth.js Session/JWT tip genişletmeleri
```

---

## `prisma/` — Veritabanı

```
prisma/
├── schema.prisma                 # Ana veritabanı şeması — User/Account/Session/VerificationToken + Item/UserItem/Rating/Notification
├── migrations/                   # Migration dosyaları (asla elle silinmez)
└── seed.ts                       # example-source.ts'deki 12 örnek Item'ı veritabanına yükler
```

---

## İsimlendirme Kuralları

| Öğe | Format | Örnek |
|---|---|---|
| Dosya adı | `kebab-case` | `example-source.ts`, `app-error.ts` |
| React bileşen | `PascalCase` | `ItemCard`, `TrackingBoard` |
| Fonksiyon/değişken | `camelCase` | `requireAuth`, `successResponse` |
| Sabit | `UPPER_SNAKE_CASE` | `EXAMPLE_ITEMS` |
| Tip/Interface | `PascalCase` | `ItemCard`, `UserItemEntry` |
| Enum değeri | `UPPER_SNAKE_CASE` | `TYPE_A`, `ACTIVE` |
| CSS class | `kebab-case` | Tailwind utility class'ları |
| Env variable | `UPPER_SNAKE_CASE` | `DATABASE_URL`, `NEXTAUTH_SECRET` |
| API endpoint | `kebab-case` | `/api/user-items` |
| DB tablo | `PascalCase` | Prisma convention: `Item`, `UserItem` |

---

## Import Sırası Kuralları

```typescript
// 1. External packages
import { type NextRequest } from "next/server";
import { z } from "zod";

// 2. Internal modules (absolute path with @/)
import { prisma } from "@/lib/db/prisma";
import { itemCategoryEnum } from "@/lib/validations/item";
import { withErrorHandler, withRateLimit, compose } from "@/lib/utils/middleware";

// 3. Types
import type { ItemCard } from "@/types/item";

// 4. Relative imports (avoid if possible, use @/ instead)
```
```

- [ ] **Step 2: Commit**

```bash
git add docs/project-structure.md
git commit -m "docs: rewrite project-structure.md to match the real file tree"
```

---

### Task 7: Full rewrite of `docs/database-schema.md`

**Files:**
- Modify: `docs/database-schema.md` (full rewrite)

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: nothing other tasks depend on.

Source of truth: `prisma/schema.prisma`, read in full during plan-writing. Every field/enum/index/relation below is copied exactly from the live schema, not reconstructed from memory or the old doc.

- [ ] **Step 1: Replace the full contents of `docs/database-schema.md`**

```markdown
# Database Schema Design — Generic SaaS Starter

This document describes the database schema used by **Generic SaaS Starter** to store user accounts, authentication sessions, tracked items, personal tracking state, ratings, and notifications.

The schema is intentionally small and generic — `Item` carries no domain-specific fields (no episode counts, no platform availability, nothing TV/anime/manga-specific). Adapt `ItemCategory`'s three placeholder values (`TYPE_A`/`TYPE_B`/`TYPE_C`) to your real domain's categories when you build on this starter.

---

## Entity Relationship Diagram

```mermaid
erDiagram
    User ||--o{ Account : has
    User ||--o{ Session : has
    User ||--o{ UserItem : tracks
    User ||--o{ Rating : rates
    User ||--o{ Notification : receives

    Item ||--o{ UserItem : "tracked via"
    Item ||--o{ Rating : "rated via"
    Item ||--o{ Notification : triggers

    User {
        string id PK
        string name
        string username UK
        string email UK
        datetime emailVerified
        string image
        string passwordHash "null for OAuth-only users"
        boolean notificationsEnabled
        datetime lastNotificationCheckAt
    }

    Account {
        string provider PK
        string providerAccountId PK
        string userId FK
        string type
        string refresh_token
        string access_token
    }

    Session {
        string sessionToken UK
        string userId FK
        datetime expires
    }

    VerificationToken {
        string identifier PK
        string token PK
        datetime expires
    }

    Item {
        string id PK
        string externalId
        string source "always example-source in this starter"
        enum category "TYPE_A | TYPE_B | TYPE_C"
        enum status "ONGOING | COMPLETED | HIATUS | CANCELLED | UPCOMING"
        string title
        string description
        string coverImage
        int totalUnits
        float ratingExternal
    }

    UserItem {
        string id PK
        string userId FK
        string itemId FK
        enum status "ACTIVE | PLANNED | COMPLETED | PAUSED | DROPPED"
        boolean isFavorite
        int progress "single generic counter, not episode/chapter-specific"
        string notes
    }

    Rating {
        string id PK
        string userId FK
        string itemId FK
        int score "1-10"
        string review
    }

    Notification {
        string id PK
        string userId FK
        string itemId FK
        string message
        boolean isRead
    }
```

---

## Models

### Auth models (Auth.js v5 required schema)

`User`, `Account`, `Session`, `VerificationToken` follow the standard Auth.js Prisma adapter schema, with two app-specific additions on `User`: `username` (unique, set via a post-signup flow before the rest of the app is accessible) and `notificationsEnabled`/`lastNotificationCheckAt` (drive the in-app notification check's server-side once-per-hour throttle).

### `Item` — the generic tracked entity

```prisma
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

  @@unique([externalId, source])
  @@index([category])
  @@index([title])
}
```

`externalId` + `source` form a compound unique key, the pattern you'd use to upsert items fetched from (or re-synced against) a real external API — `source` is hardcoded `"example-source"` today since that's the only data source this starter ships with.

### `UserItem` — personal tracking state

```prisma
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

  @@unique([userId, itemId])
  @@index([userId])
  @@index([userId, status])
}
```

`progress` is a single generic `Int?` — not separate episode/chapter/season/volume counters. The UI always presents it as "+1 unit (N)"; rename the concept of a "unit" when adapting this to a real domain (pages read, workouts completed, lessons finished, etc.).

### `Rating` — personal score

```prisma
model Rating {
  id     String @id @default(cuid())
  userId String
  itemId String
  score  Int    // 1-10
  review String?

  @@unique([userId, itemId])
  @@index([userId])
  @@index([itemId])
}
```

One rating per user per item (the unique constraint), upserted via `PUT /api/items/[id]/rating` — see [api-contracts.md](api-contracts.md).

### `Notification` — item-update alerts

```prisma
model Notification {
  id        String   @id @default(cuid())
  userId    String
  itemId    String
  message   String
  isRead    Boolean  @default(false)
  createdAt DateTime @default(now())

  @@index([userId, isRead])
  @@index([userId, createdAt])
}
```

Created by `checkForItemUpdates()` (`src/lib/notifications.ts`) whenever an `Item`'s `totalUnits` increases since the last check — see [architecture.md](architecture.md) for how the check is triggered.

---

## Deployment Target

PostgreSQL via [Neon](https://neon.tech) (serverless, free tier). The schema uses a single `datasource db { provider = "postgresql" }` block — no Cloudflare-specific schema concerns, just the standard Prisma + Neon serverless driver setup (`@prisma/adapter-neon` in production, `@prisma/adapter-pg` for local Docker Postgres — see `src/lib/db/prisma.ts`).
```

- [ ] **Step 2: Commit**

```bash
git add docs/database-schema.md
git commit -m "docs: rewrite database-schema.md to match the actual Prisma schema"
```

---

### Task 8: Trim + rewrite `docs/design-patterns.md`

**Files:**
- Modify: `docs/design-patterns.md` (full rewrite, much shorter, Turkish — language preserved)

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: nothing other tasks depend on.

Per the Global Constraints, this drops the fictional Repository/Service/Strategy-Provider/AI-recommendation/Observer patterns entirely (none exist in the real code — confirmed via direct inspection: no `src/hooks/` directory, no event bus, no auto-complete-on-progress logic in `src/app/api/user-items/[id]/route.ts`'s PATCH handler). It documents only patterns actually present, each backed by the real file and real code, read directly during plan-writing: `src/lib/utils/middleware.ts`, `src/lib/utils/app-error.ts`, `src/lib/utils/api-response.ts`, `src/lib/db/prisma.ts`, `src/lib/auth/helpers.ts`, `src/app/api/user-items/[id]/route.ts`.

- [ ] **Step 1: Replace the full contents of `docs/design-patterns.md`**

```markdown
# Design Patterns Deep Dive — Generic SaaS Starter

Bu doküman bu kod tabanında **gerçekten kullanılan** pattern'leri, nerede ve nasıl kullanıldıklarını gerçek koddan örneklerle açıklar. Inşa edilmemiş, "hedef" bir mimariyi belgelemez — bkz. [architecture.md](architecture.md) bu projenin neden bir Repository/Service katmanı OLMADAN, API Route'ların Prisma'yı doğrudan çağırdığı basit bir yapı kullandığını anlatır.

---

## 1. HOF Middleware Composition

**Neden?** Her API Route'un hata yakalama ve rate limiting gibi ortak ihtiyaçları var. Bunları her handler'a elle yazmak yerine, Higher-Order Function'larla sarıyoruz.

```typescript
// src/lib/utils/middleware.ts
export function withErrorHandler(handler: RouteHandler): RouteHandler {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      if (AppError.isAppError(err)) {
        return errorResponse(err.message, err.statusCode);
      }
      console.error("[Route Error]", err);
      return errorResponse("An unexpected error occurred", 500);
    }
  };
}

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function withRateLimit(
  handler: RouteHandler,
  maxRequests = 60,
  windowMs = 60_000
): RouteHandler {
  return async (req, ctx) => {
    const ip = req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") || "anonymous";
    const now = Date.now();
    const record = rateLimitStore.get(ip);

    if (!record || now > record.resetAt) {
      rateLimitStore.set(ip, { count: 1, resetAt: now + windowMs });
    } else if (record.count >= maxRequests) {
      throw AppError.rateLimited();
    } else {
      record.count++;
    }

    return handler(req, ctx);
  };
}

/** Sağdan sola compose eder: compose(A, B)(h) === A(B(h)) */
export function compose(
  ...middlewares: ((h: RouteHandler) => RouteHandler)[]
): (handler: RouteHandler) => RouteHandler {
  return (handler) => middlewares.reduceRight((acc, mw) => mw(acc), handler);
}
```

Her route handler'ın sonunda görülen kullanım şekli:

```typescript
// src/app/api/items/route.ts
export const GET = compose(withErrorHandler, withRateLimit)(getHandler);
```

`withErrorHandler` en dışta olmalı — `withRateLimit`'in `throw AppError.rateLimited()` ile attığı hatayı bile yakalayıp formatlasın diye.

---

## 2. Custom Error Class + Factory Methods

**Neden?** Tutarlı, route handler'lar arasında okunabilir hata fırlatma.

```typescript
// src/lib/utils/app-error.ts
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode = 500, code = "INTERNAL_ERROR") {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
  }

  static notFound(resource = "Resource") {
    return new AppError(`${resource} not found`, 404, "NOT_FOUND");
  }
  static unauthorized(message = "Unauthorized — please log in") {
    return new AppError(message, 401, "UNAUTHORIZED");
  }
  static conflict(message = "Resource already exists") {
    return new AppError(message, 409, "CONFLICT");
  }
  // ... forbidden, badRequest, validationError, rateLimited, externalApiError

  static isAppError(err: unknown): err is AppError {
    return err instanceof AppError && err.isOperational;
  }
}
```

Kullanım: `throw AppError.notFound("Item")`. `withErrorHandler` bunu yakalar ve `err.statusCode`/`err.message`'ı doğrudan response'a yazar — handler'ın kendisi hiçbir zaman response formatlamasıyla uğraşmaz.

---

## 3. Generic API Response Wrapper

**Neden?** Her endpoint aynı `{ success, data, error }` zarfını döndürmeli.

```typescript
// src/lib/utils/api-response.ts
export function successResponse<T>(data: T, status = 200): Response {
  return Response.json({ success: true, data }, { status });
}

export function errorResponse(message: string, status = 500, details?: unknown): Response {
  return Response.json({ success: false, error: message, ...(details ? { details } : {}) }, { status });
}

export const Responses = {
  notFound: (resource = "Resource") => errorResponse(`${resource} not found`, 404),
  unauthorized: () => errorResponse("Unauthorized — please log in", 401),
  badRequest: (message = "Invalid request body") => errorResponse(message, 400),
  validationError: (errors: unknown) => errorResponse("Validation failed", 422, errors),
  // ... forbidden, internalError
} as const;
```

`ApiResponse<T>` tipi (`src/types/common.ts`) tam olarak `{ success: boolean; data?: T; error?: string; message?: string }` — iç içe `error.code`/`error.message` objesi YOK, ayrı bir `meta` alanı YOK. Sayfalama gerektiren endpoint yok şu an (`/api/items` tüm sonuçları tek seferde döndürür), bu yüzden `PaginatedResponse<T>` tanımlı ama henüz kullanılmıyor.

---

## 4. Singleton Pattern — İkili Adaptörlü Prisma Client

**Neden?** Next.js hot-reload'da birden fazla `PrismaClient` instance'ı oluşmasını engellemek standart bir ihtiyaç. Bu projede ayrıca: production'da Neon'un WebSocket tabanlı serverless driver'ı, yerel Docker Postgres'te ise düz `node-postgres` adaptörü gerekiyor — Neon adaptörü vanilla bir Postgres sunucusuyla konuşamıyor.

```typescript
// src/lib/db/prisma.ts
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

const connectionString = process.env.DATABASE_URL || "postgresql://mock:mock@localhost:5432/mock";
const isLocalDatabase = /localhost|127\.0\.0\.1/.test(connectionString);

const adapter = isLocalDatabase
  ? new PrismaPg({ connectionString })
  : new PrismaNeon({ connectionString });

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ adapter, log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"] });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

---

## 5. Guard-Clause Auth Pattern

**Neden?** Ayrı bir `withAuth` middleware'i yerine, auth gerektiren her handler'ın en başında `requireAuth()` çağrılır — bu fonksiyon ya geçerli bir user döner ya da `AppError.unauthorized()` fırlatır (ki bunu zaten `withErrorHandler` yakalıyor).

```typescript
// src/lib/auth/helpers.ts
export async function getCurrentUser() {
  const session = await auth();
  return session?.user ?? null;
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw AppError.unauthorized();
  }
  return user;
}
```

```typescript
// Kullanım — src/app/api/user-items/route.ts
async function postHandler(req: NextRequest) {
  const user = await requireAuth();   // burada durur, hata fırlatırsa withErrorHandler yakalar
  // ... geri kalan iş mantığı
}
```

### 5.1. Sahiplik Kontrolü (Ownership Check) — 404, 403 değil

`UserItem`/`Rating` gibi kullanıcıya özel kayıtlara erişimde, kayıt başka bir kullanıcıya aitse **403 Forbidden değil, 404 Not Found** döndürülür — bilinçli bir tercih: bir saldırgan, var olan ama kendisine ait olmayan bir kaynağın ID'sini, response kodundan ayırt edemesin.

```typescript
// src/app/api/user-items/[id]/route.ts
async function getOwnedUserItem(id: string, userId: string) {
  const userItem = await prisma.userItem.findUnique({ where: { id } });
  if (!userItem || userItem.userId !== userId) {
    throw AppError.notFound("Tracking entry");
  }
  return userItem;
}
```

---

## 6. Zod Validation — Çoklu Şema Denemesi

**Neden?** Bazı endpoint'ler (örn. `PATCH /api/user-items/[id]`) tek bir body ile üç farklı işlemi destekler (durum değiştir, favori değiştir, ilerleme güncelle). Tek bir şema yerine, üç şema sırayla `safeParse` ile denenir; ilk eşleşen kazanır.

```typescript
// src/app/api/user-items/[id]/route.ts
const statusParsed = updateTrackingStatusSchema.safeParse(body);
if (statusParsed.success) { /* ... */ return successResponse(updated); }

const favoriteParsed = updateTrackingFavoriteSchema.safeParse(body);
if (favoriteParsed.success) { /* ... */ return successResponse(updated); }

const progressParsed = updateTrackingProgressSchema.safeParse(body);
if (progressParsed.success) { /* ... */ return successResponse(updated); }

return Responses.validationError(statusParsed.error.flatten().fieldErrors);
```

Şemaların tanımlı olduğu yer: `src/lib/validations/item.ts`.

---

## 7. Server vs Client Component Sınırı

```
Sayfa yapısı (örnek: /items/[id]):

┌─ page.tsx (SERVER) ──────────────────────────┐
│  - Prisma'dan doğrudan veri çeker (await)    │
│  - SEO meta (generateMetadata)               │
│                                               │
│  ┌─ <AddToTrackingButton> (CLIENT) ────────┐ │
│  │  - Dropdown state, fetch() ile POST/PATCH│ │
│  └──────────────────────────────────────────┘ │
│  ┌─ <RatingWidget> (CLIENT) ────────────────┐ │
│  │  - Puan seçimi state, fetch() ile PUT    │ │
│  └──────────────────────────────────────────┘ │
└───────────────────────────────────────────────┘

Kural:
- Veri çekme → SERVER component (her zaman Prisma'ya doğrudan await)
- Kullanıcı etkileşimi (state, event, fetch çağrısı) → CLIENT component
- Server component, client component'e prop olarak başlangıç verisini (initialEntry, initialEntries) geçer
```

---

## 8. Pattern Özet Tablosu

| Pattern | Nerede | Neden |
|---|---|---|
| **HOF Middleware Composition** | `lib/utils/middleware.ts` | Her route'ta tekrar etmeden hata yakalama + rate limit |
| **Custom Error + Factory** | `lib/utils/app-error.ts` | Tutarlı, okunabilir hata fırlatma |
| **Generic Response Wrapper** | `lib/utils/api-response.ts` | Her endpoint aynı `{success,data,error}` zarfı |
| **Singleton (ikili adaptör)** | `lib/db/prisma.ts` | Hot-reload'da tek instance, Neon/local Postgres ayrımı |
| **Guard-Clause Auth** | `lib/auth/helpers.ts` | Ayrı middleware yerine handler içinde erken dönüş |
| **Sahiplik Kontrolü (404)** | `api/user-items/[id]/route.ts` | Kaynak varlığını sızdırmamak |
| **Çoklu Zod Şema Denemesi** | `api/user-items/[id]/route.ts` | Tek body, birden fazla olası işlem |
| **Server/Client Sınırı** | Tüm sayfalar | Veri çekme sunucuda, etkileşim istemcide |
```

- [ ] **Step 2: Commit**

```bash
git add docs/design-patterns.md
git commit -m "docs: rewrite design-patterns.md to document only patterns actually used"
```

---

### Task 9: Full rewrite of `docs/api-contracts.md`

**Files:**
- Modify: `docs/api-contracts.md` (full rewrite, English — language preserved)

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: nothing other tasks depend on.

Source of truth: every route file under `src/app/api/**` plus `src/lib/validations/{item,auth,notifications}.ts`, all read in full during plan-writing. The old doc's `ApiResponse<T>` shape (`error: { code, message }`, top-level `meta`) does not match the real type — this rewrite uses the real one from `src/types/common.ts`.

- [ ] **Step 1: Replace the full contents of `docs/api-contracts.md`**

```markdown
# API Contracts — Generic SaaS Starter

## Base URL

```
Development: http://localhost:3000/api
```

## Response Format

Every endpoint returns this exact shape (`src/types/common.ts`):

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
```

There is no nested `error.code`/`error.message` object and no top-level `meta` — error responses are a flat string, success responses carry `data` directly. No endpoint currently paginates (`/api/items` returns all matches in one call); `PaginatedResponse<T>`/`PaginationMeta` exist in `src/types/common.ts` for future use but aren't wired into any route yet.

All error responses use the status code attached to the `AppError` that was thrown (`src/lib/utils/app-error.ts`) — `404` not-found, `401` unauthorized, `409` conflict, `422` validation, `429` rate-limited, `500` unexpected.

Every route below is wrapped in `compose(withErrorHandler, withRateLimit)(handler)` unless noted — a uniform 60 requests/60 seconds per IP.

---

## Auth

### `POST /api/auth/register`
Create a new email/password user. Does not sign the user in — the client redirects to `/auth/signin` afterward.

**Body** (`registerSchema`):
```typescript
{ name: string; email: string; password: string /* min 8 chars */ }
```

**Response `201`:** `{ success: true, data: { id, email, name } }`
**Errors:** `422` validation failure, `409` email already registered.

### `POST/GET /api/auth/[...nextauth]`
Auth.js catch-all handler (sign-in, sign-out, session, callback routes). Not a custom contract — see `src/lib/auth/config.ts`.

### `POST /api/user/username`
Set the current user's username (required before the rest of the app is accessible — enforced by `src/middleware.ts`). Auth via `getCurrentUser()`, not `requireAuth()` — throws its own `AppError.unauthorized()` with a custom message.

**Body:** `{ username: string }` — lowercased, trimmed, validated against `/^[a-z0-9_]+$/`, 3-20 characters.

**Response `200`:** `{ success: true, data: { username } }`
**Errors:** `400` invalid format/length, `401` not signed in, `409` username taken by another user.

---

## Items

### `GET /api/items`
List/search/filter items. No auth required.

**Query params (all optional):** `q` (title contains, case-insensitive), `category` (`itemCategoryEnum`: `TYPE_A`/`TYPE_B`/`TYPE_C`), `status` (`itemStatusEnum`: `ONGOING`/`COMPLETED`/`HIATUS`/`CANCELLED`/`UPCOMING`).

**Response `200`:** `{ success: true, data: Item[] }` (full Prisma `Item` rows, ordered by `title` ascending).
**Errors:** `400` invalid `category` or `status` value.

### `GET /api/items/suggest`
Autocomplete suggestions. No auth required.

**Query params:** `q` (required for results — empty/missing `q` returns `{ success: true, data: [] }`, not an error).

**Response `200`:** `{ success: true, data: Item[] }` — title-match, capped at 8 results.

### `GET /api/items/trending`
No params. No auth required.

**Response `200`:** `{ success: true, data: Item[] }` — `status: "ONGOING"` items, ordered by `updatedAt` descending, capped at 8.

### `GET /api/items/[id]`
**Response `200`:** `{ success: true, data: Item }`
**Errors:** `404` item not found.

### `PUT /api/items/[id]/rating`
Create or update the current user's rating for an item. Auth required (`requireAuth()`).

**Body** (`rateItemSchema`):
```typescript
{ score: number /* int, 1-10 */; review?: string /* max 2000 chars */ }
```

**Response `200`:** `{ success: true, data: Rating }` — upserted on the `(userId, itemId)` unique constraint.
**Errors:** `404` item not found, `422` validation failure, `401` not signed in.

---

## User Items (personal tracking)

### `GET /api/user-items`
The current user's tracking list. Auth required.

**Query params:** `status` (optional, `trackingStatusEnum`: `ACTIVE`/`PLANNED`/`COMPLETED`/`PAUSED`/`DROPPED`).

**Response `200`:** `{ success: true, data: UserItem[] }` — each row includes its related `item`, ordered by `updatedAt` descending.
**Errors:** `400` invalid `status` value, `401` not signed in.

### `POST /api/user-items`
Add an item to the current user's tracking list. Auth required.

**Body** (`addToTrackingSchema`):
```typescript
{ itemId: string; status?: TrackingStatus /* default "PLANNED" */ }
```

**Response `201`:** `{ success: true, data: UserItem }`
**Errors:** `404` item not found, `409` already tracked (unique `(userId, itemId)` constraint), `422` validation failure.

### `PATCH /api/user-items/[id]`
Updates exactly one of status, favorite, or progress per call — the body is tried against three schemas in order (status → favorite → progress); whichever parses first wins. Auth required; the entry must belong to the current user (cross-user access returns `404`, not `403`, deliberately, so existence isn't leaked).

**Body — one of:**
```typescript
{ status: TrackingStatus }                              // updateTrackingStatusSchema
{ isFavorite: boolean }                                 // updateTrackingFavoriteSchema
{ progress: number /* int >= 0 */; notes?: string }      // updateTrackingProgressSchema
```

**Response `200`:** `{ success: true, data: UserItem }`
**Errors:** `404` entry not found or not owned by caller, `422` body matches none of the three schemas.

### `DELETE /api/user-items/[id]`
Remove a tracking entry. Auth required, same ownership check as `PATCH`.

**Response `200`:** `{ success: true, data: { id } }`
**Errors:** `404` entry not found or not owned by caller.

---

## Notifications

### `GET /api/notifications`
Auth required.

**Response `200`:**
```typescript
{
  success: true,
  data: {
    notifications: Notification[];  // newest 20, each with its related `item`
    unreadCount: number;
    notificationsEnabled: boolean;
  }
}
```

### `POST /api/notifications/check`
Triggers `checkForItemUpdates(userId)` (`src/lib/notifications.ts`) — compares each tracked item's `totalUnits` against its last-known value and creates a `Notification` on any increase. Throttled server-side to once/hour/user via `User.lastNotificationCheckAt`. Auth required.

**Response `200`:** `{ success: true, data: <checkForItemUpdates() result> }`

### `PATCH /api/notifications/mark-read`
Marks every unread notification for the current user as read. Auth required, no body.

**Response `200`:** `{ success: true, data: { updated: number } }`

### `PATCH /api/notifications/settings`
Auth required.

**Body** (`updateNotificationSettingsSchema`): `{ notificationsEnabled: boolean }`

**Response `200`:** `{ success: true, data: { notificationsEnabled: boolean } }`
**Errors:** `422` validation failure.
```

- [ ] **Step 2: Commit**

```bash
git add docs/api-contracts.md
git commit -m "docs: rewrite api-contracts.md to match the real route contracts"
```

---

### Task 10: Rewrite `docs/api-sources.md`

**Files:**
- Modify: `docs/api-sources.md` (full rewrite, much shorter, English — language preserved)

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: nothing other tasks depend on.

Source of truth: `src/lib/api/example-source.ts`, read in full during plan-writing. This starter has exactly one data source (a static in-memory array seeded into the DB), not four real external API integrations — the doc shrinks accordingly.

- [ ] **Step 1: Replace the full contents of `docs/api-sources.md`**

```markdown
# Data Source Pattern

This starter ships with a single placeholder data source instead of real external API integrations — its job is to demonstrate the *pattern* for plugging one in, not to provide real content.

## `src/lib/api/example-source.ts`

A static, in-memory array of 12 example `Item`s plus four functions:

```typescript
export interface ExampleItem {
  externalId: string;
  title: string;
  description: string;
  category: "TYPE_A" | "TYPE_B" | "TYPE_C";
  status: "ONGOING" | "COMPLETED" | "HIATUS" | "CANCELLED" | "UPCOMING";
  totalUnits: number;
}

export const EXAMPLE_ITEMS: ExampleItem[] = [ /* 12 example rows */ ];

export async function searchExampleItems(query: string): Promise<ExampleItem[]>;
export async function getExampleItemDetail(externalId: string): Promise<ExampleItem | null>;
export async function getTrendingExampleItems(): Promise<ExampleItem[]>;
export async function simulateExampleItemUpdate(externalId: string): Promise<number | null>;
```

`prisma/seed.ts` loads `EXAMPLE_ITEMS` into the `Item` table once, on first setup (`npm run db:migrate` runs the seed script — see [getting-started.md](getting-started.md)). After that, the app reads `Item` rows from Postgres directly (`src/app/api/items/route.ts` etc.) — `example-source.ts` itself isn't called again at runtime except by `simulateExampleItemUpdate()`, which `prisma/seed.ts` can re-invoke to simulate a content update for testing the notification flow (see `checkForItemUpdates()` in `src/lib/notifications.ts`).

## Swapping in a real external API

1. Write a client module under `src/lib/api/` (e.g. `your-api.ts`) that fetches from the real source and maps its response shape into the `Item` fields (`title`, `description`, `category`, `status`, `totalUnits`, `coverImage`, `ratingExternal`).
2. Replace `prisma/seed.ts`'s `EXAMPLE_ITEMS` loop with a call to your client, upserting on `Item`'s `(externalId, source)` unique constraint (`source` should become your API's name instead of `"example-source"`) — see [database-schema.md](database-schema.md) for the `Item` model.
3. If your real API has rate limits, add a `src/lib/api/your-api-mock.ts` fallback for local development without an API key, following the dependency-free pattern `example-source.ts` already demonstrates (no env var, no network call, works offline).
4. Decide whether item data should refresh live per-request (no caching, like today) or be periodically re-synced — there's no caching layer currently in this starter (see [architecture.md](architecture.md)'s Data Flow section).
```

- [ ] **Step 2: Commit**

```bash
git add docs/api-sources.md
git commit -m "docs: rewrite api-sources.md around the example-source pattern"
```

---

### Task 11: Rename `docs/monetization-and-deploy.md` → `docs/deploy.md`, trim to deploy-only, fix `wrangler.toml` stale references

**Files:**
- Delete: `docs/monetization-and-deploy.md`
- Create: `docs/deploy.md`
- Modify: `wrangler.toml`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: nothing other tasks depend on. Note: `README.md` (Task 2) and `getting-started.md` (Task 3) already link to `docs/deploy.md` by this final name — this task must produce that exact path.

Direct inspection of the current `wrangler.toml` (read in full during plan-writing) found three more stale references A3's cleanup sweep didn't catch (A3 only removed the `[triggers]`/`crons` block, since that was tied to functional code; these are cosmetic but still wrong): `name = "free-serie-tracker"`, a comment claiming `custom-worker.ts` "adds a `scheduled()` handler" (removed in A3), and a commented-out `TMDB_API_KEY` in the secrets list.

- [ ] **Step 1: Fix `wrangler.toml`**

Read the file first. Replace:

```toml
name = "free-serie-tracker"
compatibility_date = "2026-06-15"
compatibility_flags = ["nodejs_compat"]

# Main entrypoint — wraps the OpenNext-generated worker, adds a scheduled() handler
main = "custom-worker.ts"

# Static assets
[assets]
directory = ".open-next/assets"
binding = "ASSETS"

# Environment variables (add secrets via: wrangler secret put <KEY>)
# DATABASE_URL
# DIRECT_URL
# NEXTAUTH_SECRET
# NEXTAUTH_URL
# GOOGLE_CLIENT_ID
# GOOGLE_CLIENT_SECRET
# TMDB_API_KEY

# Development (wrangler dev)
[dev]
port = 3001
```

with:

```toml
name = "generic-saas-starter"
compatibility_date = "2026-06-15"
compatibility_flags = ["nodejs_compat"]

# Main entrypoint — wraps the OpenNext-generated worker
main = "custom-worker.ts"

# Static assets
[assets]
directory = ".open-next/assets"
binding = "ASSETS"

# Environment variables (add secrets via: wrangler secret put <KEY>)
# DATABASE_URL
# DIRECT_URL
# NEXTAUTH_SECRET
# NEXTAUTH_URL
# GOOGLE_CLIENT_ID
# GOOGLE_CLIENT_SECRET

# Development (wrangler dev)
[dev]
port = 3001
```

- [ ] **Step 2: Create `docs/deploy.md`**

```markdown
# Deployment Strategy — Generic SaaS Starter

## Why Cloudflare, Not Vercel?

| Özellik | Vercel Free (Hobby) | Cloudflare Free |
|---|---|---|
| **Ticari kullanım** | ❌ Yasak | ✅ Serbest |
| **Reklam** | ❌ Yasak | ✅ Serbest |
| **Bandwidth** | 100 GB/ay | **Sınırsız** |
| **Requests** | 100K serverless/ay | 100K workers/gün (günlük!) |
| **CDN** | Vercel Edge | Cloudflare Global (200+ PoP) |
| **DDoS koruması** | Temel | **Enterprise seviye (ücretsiz)** |
| **Custom domain** | ✅ | ✅ |
| **SSL** | ✅ | ✅ |
| **Build minutes** | 6000/ay | 500/ay (yeterli) |

> [!IMPORTANT]
> Vercel'in ücretsiz katmanı ticari kullanımı ve reklamı yasaklıyor — bir portfolyo/demo projesi için sorun değil, ama gerçek bir ürüne dönüştürmeyi planlıyorsanız bu kısıtlama önemli.

---

## Deployment: Cloudflare Workers + OpenNext

### Mimari

```mermaid
graph LR
    subgraph CF["Cloudflare Edge Network"]
        DNS["Cloudflare DNS"]
        CDN["CDN + Cache"]
        WAF["DDoS/WAF Protection"]

        subgraph Worker["Cloudflare Worker"]
            ON["OpenNext Adapter"]
            NJS["Next.js SSR/API"]
        end

        SA["Static Assets (Pages)"]
    end

    subgraph DB["External Services"]
        Neon["Neon PostgreSQL"]
    end

    User["User Browser"] --> DNS
    DNS --> CDN
    CDN --> WAF
    WAF --> Worker
    WAF --> SA
    Worker --> DB

    style CF fill:#f48120,stroke:#e5730e,color:#fff
    style Worker fill:#1a1a2e,stroke:#f48120,color:#e0e0e0
```

### Kurulum

```bash
# 1. OpenNext adapter ekle
npm install @opennextjs/cloudflare

# 2. Wrangler (Cloudflare CLI) ekle
npm install -D wrangler

# 3. next.config.ts güncelle — @opennextjs/cloudflare otomatik configure eder

# 4. wrangler.toml oluştur (proje kökünde)
```

### `wrangler.toml`

```toml
name = "generic-saas-starter"
compatibility_date = "2026-06-15"
compatibility_flags = ["nodejs_compat"]

# Main entrypoint — wraps the OpenNext-generated worker
main = "custom-worker.ts"

[assets]
directory = ".open-next/assets"
binding = "ASSETS"

# Environment variables (add secrets via: wrangler secret put <KEY>)
# DATABASE_URL
# DIRECT_URL
# NEXTAUTH_SECRET
# NEXTAUTH_URL
# GOOGLE_CLIENT_ID
# GOOGLE_CLIENT_SECRET

[dev]
port = 3001
```

`custom-worker.ts` (project root) wraps OpenNext's generated `.open-next/worker.js`, re-exporting its `fetch` handler — this indirection exists so the project has a place to add a Cloudflare Cron `scheduled()` export later, if your adaptation of this starter needs a background job (the original "Free Serie Tracker" had one for a now-removed feature; the wrapper is kept since it's a real, useful pattern even with nothing currently using it).

### Deploy Komutu

```bash
# Build + Deploy
npx opennextjs-cloudflare build
npx wrangler deploy

# Veya package.json script olarak (zaten tanımlı)
npm run deploy:build   # = opennextjs-cloudflare build
npm run deploy         # = opennextjs-cloudflare build && wrangler deploy
```

### CI/CD: GitHub Actions → Cloudflare

```yaml
# .github/workflows/deploy.yml
name: Deploy to Cloudflare
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npx opennextjs-cloudflare build
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          command: deploy
```

---

## Domain Stratejisi

### Başlangıç (Ücretsiz)

Cloudflare Workers otomatik subdomain verir: `<your-project>.<account>.workers.dev`

### GitHub Student Pack ile Free Domain

1. [GitHub Education](https://education.github.com/pack) başvurusu yap
2. Name.com'dan 1 yıl ücretsiz `.dev` veya `.com` domain al
3. Cloudflare DNS'e bağla (nameserver değiştir)
4. Cloudflare Workers'a custom domain ekle

### Domain Yenileme Planı

- 1. yıl: Ücretsiz (Student Pack)
- 2. yıl+: ~$10-12/yıl

---

## Maliyet Tablosu

| Hizmet | Aylık Maliyet |
|---|---|
| Cloudflare Workers + Pages | **$0** (free tier) |
| Neon PostgreSQL | **$0** (free tier: 0.5 GB) |
| Domain (Student Pack) | **$0** (1 yıl) |
| GitHub Private Repo | **$0** |
| **TOPLAM** | **$0/ay** |

### Büyüme Sonrası (Opsiyonel, gerçek bir ürüne dönüştürürseniz)

| Hizmet | Aylık Maliyet | Tetikleyici |
|---|---|---|
| Cloudflare Workers Paid | $5/ay | 100K+ req/gün aşılırsa |
| Neon PostgreSQL Pro | $19/ay | 0.5 GB storage dolunca |
| Domain yenileme | ~$1/ay | 2. yıl |

---

## Cloudflare'ın Ek Avantajları (Ücretsiz)

| Özellik | Açıklama |
|---|---|
| **DDoS Protection** | Enterprise seviye, otomatik |
| **Web Application Firewall** | SQL injection, XSS koruması |
| **Bot Protection** | Otomatik bot filtreleme |
| **Analytics** | Temel trafik analitiği |
| **DNS** | En hızlı DNS sağlayıcısı |
| **SSL/TLS** | Otomatik, full strict mode |
| **Rate Limiting** | Temel seviye ücretsiz |
```

- [ ] **Step 3: Delete the old file and add the new one**

```bash
git rm docs/monetization-and-deploy.md
git add docs/deploy.md wrangler.toml
git commit -m "docs: rename monetization-and-deploy.md to deploy.md, drop monetization content, fix wrangler.toml stale refs"
```

---

### Task 12: Delete `docs/swagger-setup.md`, remove unused swagger dependencies

**Files:**
- Delete: `docs/swagger-setup.md`
- Modify: `package.json` (remove 4 dependencies)

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: nothing other tasks depend on.

Confirmed during plan-writing (`grep -rli "swagger\|openapi" src` returns nothing, `package.json` lists `swagger-jsdoc`, `swagger-ui-react`, `@types/swagger-jsdoc`, `@types/swagger-ui-react`): these are installed-but-never-used dependencies, and the doc that motivated installing them describes a feature that was never built.

- [ ] **Step 1: Verify zero usages, one more time, immediately before deleting**

```bash
grep -rli "swagger\|openapi" src --include="*.ts" --include="*.tsx"
```

Expected: empty output. If anything prints, STOP and report back — do not proceed with deletion.

- [ ] **Step 2: Delete the doc and uninstall the dependencies**

```bash
git rm docs/swagger-setup.md
npm uninstall swagger-jsdoc swagger-ui-react @types/swagger-jsdoc @types/swagger-ui-react
```

- [ ] **Step 3: Confirm `npm run type-check` and `npm run lint` are still clean**

```bash
npm run type-check
npm run lint
```

Expected: same as before this task (no new errors — these packages had zero usages, so removing them shouldn't change either output).

- [ ] **Step 4: Commit**

```bash
git add docs/swagger-setup.md package.json package-lock.json
git commit -m "chore: delete unused swagger-setup.md and uninstall unused swagger dependencies"
```

---

### Task 13: Spot-check `docs/phases.md`, final whole-corpus grep sweep

**Files:**
- Modify: `docs/phases.md` (only if the spot-check finds something — see Step 1)

**Interfaces:**
- Consumes: every file touched by Tasks 1-12 — this task verifies their combined result.
- Produces: nothing — this is the last task in the plan.

`docs/phases.md` already received a "Pivot" section during A3's close-out (commit `76b76d9`) documenting A1→A2→A3 status. This task spot-checks it's still accurate after B's renames (`monetization-and-deploy.md` → `deploy.md`, `swagger-setup.md` deleted) and runs a final grep across the whole rewritten corpus to catch anything Tasks 1-12 missed.

- [ ] **Step 1: Spot-check `docs/phases.md` for the two file-rename/deletion references**

```bash
grep -n "monetization-and-deploy\.md\|swagger-setup\.md" docs/phases.md
```

If this prints anything, read the surrounding context and update the reference: `monetization-and-deploy.md` → `deploy.md`, or remove a `swagger-setup.md` mention if one exists (it's expected this prints nothing — `phases.md`'s existing content doesn't name either file by inspection during plan-writing — but verify directly rather than trusting that recollection).

- [ ] **Step 2: Run the final corpus-wide grep sweep**

```bash
grep -rniE "free serie tracker|tmdb|anilist|mangadex|jikan|libraryitem|usernote|searchkeyword|episodelanguage|adsense|swagger|repository pattern|service layer|content provider" README.md CLAUDE.md docs/*.md
```

Expected: empty output, OR matches only in places where the term is being used *historically/explicitly* — e.g. `docs/phases.md`'s pre-pivot Phase 1/2 checklists (which correctly describe what was built before the pivot, not current state — see this plan's Global Constraints and the original spec's "Out of Scope" section), or `docs/api-sources.md`'s `getting-started.md` "TMDB_API_KEY" reference being explicitly called out as removed. Read every match before deciding it's acceptable — do not dismiss a match without checking its context.

If a match is found that is NOT one of those expected historical references (i.e. it's a *current-state* claim that's actually stale), fix it directly: read the file, locate the line, correct it to reflect the generic model, save, and note the fix when reporting back.

- [ ] **Step 3: Commit, if Step 1 or Step 2 produced any file changes**

```bash
# Only run if something was actually changed in Steps 1-2
git add docs/phases.md  # plus any other file touched by a Step 2 fix
git commit -m "docs: final B sweep — fix residual references to the pre-pivot domain"
```

If nothing was changed, skip this step — there's nothing to commit.

---

## Self-Review Notes

**Spec coverage:** every file named in the spec's "File-by-File Scope" section (`docs/superpowers/specs/2026-06-23-generic-starter-b-docs-branding-design.md`) has a task: README.md (Task 2), CLAUDE.md (Task 1), getting-started.md (Task 3), contributing.md (Task 4), architecture.md (Task 5), project-structure.md (Task 6), database-schema.md (Task 7), design-patterns.md (Task 8), api-contracts.md (Task 9), api-sources.md (Task 10), monetization-and-deploy.md→deploy.md (Task 11), swagger-setup.md (Task 12), phases.md (Task 13). Two items discovered during plan-writing that weren't in the original spec's file list, both folded into the task whose doc they're paired with rather than given separate tasks: `.env.example` (Task 3, alongside `getting-started.md` — found to reference the same dead TMDB/AdSense vars) and `wrangler.toml`'s stale project name / `scheduled()` comment / `TMDB_API_KEY` (Task 11, alongside `deploy.md`).

**Placeholder scan:** clean — every task has complete, copy-pasteable final file content (or, for the small Task 4 edit, exact before/after snippets); no "rewrite to be generic" hand-waving, no TODOs.

**Type/fact consistency:** every schema field, route path, request/response shape, and file path used across Tasks 5-11 was read directly from the live source files during plan-writing (`prisma/schema.prisma`, every `src/app/api/**/route.ts`, `src/lib/validations/*.ts`, `src/lib/utils/{middleware,app-error,api-response}.ts`, `src/lib/db/prisma.ts`, `src/lib/auth/helpers.ts`, `src/lib/api/example-source.ts`, `src/types/{item,user-item,common}.ts`) — not carried over from the old docs' claims or invented. Cross-task consistency checked: the `ApiResponse<T>` shape is stated identically in Tasks 5 (architecture.md), 8 (design-patterns.md §3), and 9 (api-contracts.md); the real file tree is stated identically in Tasks 5 and 6; doc cross-links (README → docs/*.md, getting-started.md → deploy.md/api-sources.md, architecture.md ↔ design-patterns.md ↔ api-contracts.md ↔ database-schema.md) all point to the post-rename file names Tasks 2-12 actually produce, not the old names.

**Note on task ordering:** Tasks 1-12 are independent (each touches disjoint files except Task 13, which depends on all of them being done first to spot-check the combined result) and could be dispatched in any order, or in parallel via separate worktrees if using `executing-plans`. If using `subagent-driven-development`, dispatch sequentially per that skill's standing rule against parallel implementer subagents — Task 13 must run last regardless of approach.

