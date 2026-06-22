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
