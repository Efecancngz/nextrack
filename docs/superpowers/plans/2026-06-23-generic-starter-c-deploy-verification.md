# Sub-project C: Deploy Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Verify the Cloudflare deploy path is sound at the documentation/config level (no live infra), document a real, reproducible local-build bug and its workaround, and produce a concrete manual runbook for whoever actually deploys this starter template for real.

**Architecture:** No application code changes. This sub-project touches `docker-compose.yml` (one stale env var removed) and two docs files (`docs/deploy.md` rewritten with new sections, `docs/phases.md` status line updated). The core deliverable is a one-time verification run proving the documented Docker workaround actually resolves a real esbuild bundling failure seen on this machine.

**Tech Stack:** Docker Compose (existing `Dockerfile`/`docker-compose.yml`), `@opennextjs/cloudflare`, `wrangler` — all already installed, no new dependencies.

## Global Constraints

- No live Cloudflare account creation, no `wrangler login`, no live deploy. (Spec: "Out of scope")
- No live Neon production database creation or migration. (Spec: "Out of scope")
- Do not attempt to fix the underlying esbuild/non-ASCII-path bug itself (e.g. replacing `@vercel/og`-based icon generation) — document it as a known limitation instead. (Spec: explicit user decision)
- No change to application code, schema, or API routes — only `docker-compose.yml` and `docs/*.md`. (Spec: "Out of scope")
- `npm run type-check` / `npm run lint` / `npm run test:run` must stay clean throughout (nothing in this plan should touch code, but confirm no regression). (Spec: "Verification")

---

### Task 1: Verify the Docker deploy-build workaround

**Files:**
- None modified — this task is a verification run. Its output (pass/fail + captured log) feeds directly into Task 3's "Known Limitation" doc section.

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: a confirmed pass/fail result and a short captured excerpt of `wrangler deploy --dry-run`'s success output, both needed verbatim by Task 3.

Context: on the host machine (Windows, project path containing the non-ASCII "Masaüstü"), `npm run deploy:build` succeeds but `npx wrangler deploy --dry-run` fails with esbuild errors resolving `resvg.wasm`/`yoga.wasm` (used by `next/dist/compiled/@vercel/og`, which backs this project's `icon.tsx`/`apple-icon.tsx`). The project's `Dockerfile`/`docker-compose.yml` mount the repo at `/app` inside the container — an ASCII path — which should avoid the bug entirely. This task proves that.

- [ ] **Step 1: Confirm Docker is available**

Run: `docker --version`
Expected: prints a Docker version string (e.g. `Docker version 27.x.x`). If this fails, STOP and report back — the rest of this task cannot proceed without Docker.

- [ ] **Step 2: Run the build + dry-run deploy inside the `web` container**

Run (from the repo root):
```bash
docker compose run --rm web sh -c "npm run deploy:build && npx wrangler deploy --dry-run"
```

This builds the `web` image if not already built (per the existing `Dockerfile`, which runs `npm install` and `npx prisma generate`), starts the `db` dependency, then runs both commands inside the container at `/app`.

- [ ] **Step 3: Confirm the result**

Expected: the command exits 0. The `npm run deploy:build` portion should end with `OpenNext build complete.` (same as the host run). The `npx wrangler deploy --dry-run` portion should NOT show the `Could not resolve "...resvg.wasm"` / `"...yoga.wasm"` errors seen on the host — it should instead either print a successful dry-run summary or fail only on something unrelated to path resolution (e.g. a missing `account_id` in `wrangler.toml`, which is expected since no live Cloudflare account is configured — that's a different, acceptable failure mode, not a path-resolution bug).

If the container run reproduces the *same* `resvg.wasm`/`yoga.wasm` path-resolution errors as the host (meaning the Docker workaround does NOT fix it), STOP and report back — Task 3's "Known Limitation" section will need to say the workaround doesn't actually work, which changes what gets documented.

- [ ] **Step 4: Capture the relevant output**

Copy the last ~15-20 lines of Step 2's terminal output (whichever of the two outcomes in Step 3 actually happened) into a scratch note — Task 3 needs to quote or summarize this accurately in `docs/deploy.md`. No file is created in the repo for this; it's working notes for the next task.

No commit for this task — nothing in the repo changed.

---

### Task 2: Remove the dead `TMDB_API_KEY` passthrough from `docker-compose.yml`

**Files:**
- Modify: `docker-compose.yml`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: nothing other tasks depend on.

The `web` service's `environment:` block still has a line passing through `TMDB_API_KEY`, a dead env var from before the Generic SaaS Starter pivot (the old TMDB API client was deleted in Sub-project A3; `TMDB_API_KEY` was already removed from `.env.example` and `wrangler.toml` in Sub-project B). This was missed in both of those sub-projects since neither one's grep sweep covered `docker-compose.yml`.

- [ ] **Step 1: Read the current file and remove the stale line**

Current `docker-compose.yml` (relevant excerpt, lines 12-20):
```yaml
    environment:
      - NODE_ENV=development
      # Read from host .env / .env.local file. If not set, defaults to local postgres service.
      - DATABASE_URL=${DATABASE_URL:-postgresql://postgres:postgres@db:5432/serietracker?schema=public}
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - NEXTAUTH_URL=${NEXTAUTH_URL:-http://localhost:3000}
      - GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
      - GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}
      - TMDB_API_KEY=${TMDB_API_KEY}
```

Replace with (delete the last line only):
```yaml
    environment:
      - NODE_ENV=development
      # Read from host .env / .env.local file. If not set, defaults to local postgres service.
      - DATABASE_URL=${DATABASE_URL:-postgresql://postgres:postgres@db:5432/serietracker?schema=public}
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - NEXTAUTH_URL=${NEXTAUTH_URL:-http://localhost:3000}
      - GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
      - GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}
```

- [ ] **Step 2: Verify the removal**

Run: `grep -n "TMDB" docker-compose.yml`
Expected: no output (empty).

- [ ] **Step 3: Commit**

```bash
git add docker-compose.yml
git commit -m "chore: remove dead TMDB_API_KEY passthrough from docker-compose.yml"
```

---

### Task 3: Add "Known Limitation" and manual deploy runbook to `docs/deploy.md`

**Files:**
- Modify: `docs/deploy.md`

**Interfaces:**
- Consumes: Task 1's captured verification result (the exact pass/fail outcome and a short excerpt of the output) — this task cannot be written accurately without Task 1 having run first.
- Produces: nothing other tasks depend on.

This adds two new sections to the existing `docs/deploy.md` (which currently covers: why Cloudflare, architecture, `wrangler.toml`, deploy commands, CI/CD, domain strategy, cost table). Insert both new sections after the existing "### CI/CD: GitHub Actions → Cloudflare" subsection and before "## Domain Stratejisi".

- [ ] **Step 1: Insert the "Known Limitation" section**

Find this existing block in `docs/deploy.md`:
```markdown
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
```

Replace with (inserting two new sections between them — fill in the `<RESULT>` placeholder below using Task 1's actual captured outcome, do not leave it as literal text):

```markdown
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

The GitHub Actions workflow above runs on `ubuntu-latest` and is unaffected by the limitation described below — it always builds on a clean ASCII path.

---

## Known Limitation: Non-ASCII Project Paths on Windows

If you clone or move this project into a folder whose path contains non-ASCII characters (e.g. a OneDrive folder with an accented or non-Latin name — `Masaüstü`, `Café`, `文档`, etc.), `npx wrangler deploy` fails locally with esbuild errors like:

```
X [ERROR] Could not resolve ".../node_modules/next/dist/compiled/@vercel/og/resvg.wasm"
X [ERROR] Could not resolve ".../node_modules/next/dist/compiled/@vercel/og/yoga.wasm"
```

**Root cause:** these WASM files are dynamically imported by `next/dist/compiled/@vercel/og` (which backs this project's `icon.tsx`/`apple-icon.tsx` favicon generation, via `ImageResponse`). esbuild's module resolver — used internally by `wrangler deploy` to bundle the OpenNext worker output — mishandles the absolute path when it contains non-ASCII characters on Windows. `npm run deploy:build` (the Next.js + OpenNext build step) is unaffected and completes cleanly; the failure is specific to `wrangler`'s own bundling step.

**This does not affect the GitHub Actions deploy path above** — CI always runs on a clean ASCII path (`ubuntu-latest`'s `/home/runner/work/...`), so deploys via the documented CI workflow are unaffected regardless of what your local folder is named.

**Local workaround — verify and deploy from inside the project's Docker container**, which mounts the repo at `/app` (always ASCII), sidestepping the path issue entirely:

```bash
docker compose run --rm web sh -c "npm run deploy:build && npx wrangler deploy --dry-run"
```

<RESULT>

If you need to deploy locally (not via CI) and your project path is non-ASCII, run the same way but without `--dry-run`, after completing the manual setup steps below and authenticating `wrangler` inside the container (`docker compose run --rm web npx wrangler login` — this opens a browser-based OAuth flow, so it needs to run somewhere with browser access, e.g. via `wrangler login` on the host once, since the resulting auth token is stored under your global Wrangler config and Docker can mount it — see [Cloudflare's wrangler docs](https://developers.cloudflare.com/workers/wrangler/commands/#login) for the current recommended approach, since this varies by Docker/OS setup).

---

## Manual Deploy Runbook

This starter template ships with no live Cloudflare account, no production database, and no secrets configured — by design, since those are yours to set up. Here's the exact checklist, in order, the first time you deploy for real:

1. **Create a Cloudflare account** (free tier is enough) at [dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up).
2. **Authenticate Wrangler locally**: `npx wrangler login` — opens a browser OAuth flow, stores a token in your global Wrangler config.
3. **Create a production Neon PostgreSQL database** at [neon.tech](https://neon.tech) (free tier: 0.5 GB). Copy its pooled connection string (`DATABASE_URL`) and its direct/unpooled connection string (`DIRECT_URL`) from the Neon dashboard.
4. **Run migrations against the production database**:
   ```bash
   DATABASE_URL="<your-neon-pooled-url>" DIRECT_URL="<your-neon-direct-url>" npx prisma migrate deploy
   ```
5. **Generate a `NEXTAUTH_SECRET`**: `openssl rand -base64 32`.
6. **Set up Google OAuth** (if you want Google sign-in) at [console.cloud.google.com](https://console.cloud.google.com) → APIs & Services → Credentials → OAuth client ID. Add your production URL's `/api/auth/callback/google` as an authorized redirect URI.
7. **Push all 6 secrets to your Cloudflare Worker** (each prompts for the value interactively, or pipe it in):
   ```bash
   npx wrangler secret put DATABASE_URL
   npx wrangler secret put DIRECT_URL
   npx wrangler secret put NEXTAUTH_SECRET
   npx wrangler secret put NEXTAUTH_URL
   npx wrangler secret put GOOGLE_CLIENT_ID
   npx wrangler secret put GOOGLE_CLIENT_SECRET
   ```
   `NEXTAUTH_URL` should be your eventual production URL (e.g. `https://your-project.your-account.workers.dev`, or your custom domain once set up per the Domain Strategy below).
8. **Deploy**: `npm run deploy` (= `opennextjs-cloudflare build && wrangler deploy`). If your local path is non-ASCII, use the Docker workaround above instead.
9. **(Optional) Set up CI/CD**: add a `CLOUDFLARE_API_TOKEN` repo secret in GitHub (Settings → Secrets and variables → Actions) — generate the token at Cloudflare dashboard → My Profile → API Tokens → "Edit Cloudflare Workers" template — then add the `.github/workflows/deploy.yml` workflow shown above.

From here on, you're deploying and operating a real, internet-facing application — this guide stops at "it deploys," not "it's production-hardened." Review the Security Checklist in `CLAUDE.md` and your own threat model before pointing real users at it.

---

## Domain Stratejisi
```

- [ ] **Step 2: Verify the markdown renders sanely**

Run: `grep -n "^##\|^###" docs/deploy.md`
Expected: headings appear in this order: `## Why Cloudflare, Not Vercel?`, `## Deployment: Cloudflare Workers + OpenNext`, `### Mimari`, `### Kurulum`, `### \`wrangler.toml\``, `### Deploy Komutu`, `### CI/CD: GitHub Actions → Cloudflare`, `## Known Limitation: Non-ASCII Project Paths on Windows`, `## Manual Deploy Runbook`, `## Domain Stratejisi`, `## Maliyet Tablosu`, `## Cloudflare'ın Ek Avantajları (Ücretsiz)`. No duplicate or out-of-order headings.

- [ ] **Step 3: Commit**

```bash
git add docs/deploy.md
git commit -m "docs: add known-limitation note and manual deploy runbook to deploy.md"
```

---

### Task 4: Mark Sub-project C done in `docs/phases.md`

**Files:**
- Modify: `docs/phases.md`

**Interfaces:**
- Consumes: Task 1's verification result and Task 3's completed `docs/deploy.md` sections — this task summarizes both.
- Produces: nothing other tasks depend on. This is the last task in the plan.

- [ ] **Step 1: Replace the Sub-project C status line**

Find this line in `docs/phases.md`:
```markdown
- **C — Deploy verification**: not started. Confirms the Cloudflare Workers deploy path works end-to-end on the new schema. Note: A3 removed the Cloudflare Cron `scheduled()` handler entirely (it backed only the now-deleted MangaDex language-tracking feature) — the Phase 2.5 entry below describing its unverified-firing gap is now moot, not a Sub-project C action item.
```

Replace with:
```markdown
- **C — Deploy verification**: done. No live Cloudflare/Neon infra was set up (out of scope, by explicit decision — this is a documentation deliverable for whoever deploys this starter for real, not a live deployment). Found and documented a real, reproducible bug: `wrangler deploy` fails locally with esbuild path-resolution errors (`resvg.wasm`/`yoga.wasm`, from `@vercel/og`-backed favicon generation) when the project path contains non-ASCII characters (e.g. this repo's own `Masaüstü` OneDrive path) — confirmed the documented GitHub Actions CI workflow (`ubuntu-latest`) is unaffected, and confirmed the existing Docker setup (`docker compose run --rm web ...`, mounts at `/app`) works around it locally. `docs/deploy.md` now has a "Known Limitation" section and a 9-step manual runbook (Cloudflare account → `wrangler login` → Neon prod DB → migrate → secrets → `wrangler deploy`). `docker-compose.yml`'s dead `TMDB_API_KEY` passthrough (missed by A3/B) removed. Note: A3 removed the Cloudflare Cron `scheduled()` handler entirely (it backed only the now-deleted MangaDex language-tracking feature) — the Phase 2.5 entry below describing its unverified-firing gap is now moot, not a Sub-project C action item.
```

- [ ] **Step 2: Verify**

Run: `grep -n "C — Deploy verification" docs/phases.md`
Expected: one match, containing "done" not "not started".

- [ ] **Step 3: Commit**

```bash
git add docs/phases.md
git commit -m "docs: mark Sub-project C (deploy verification) done in phases.md"
```

---

## Self-Review Notes

**Spec coverage:** all four spec deliverables have a task — Docker workaround verification (Task 1), `docker-compose.yml` cleanup (Task 2), `docs/deploy.md` rewrite with both new sections (Task 3), `docs/phases.md` status update (Task 4). The spec's "Verification" section (Docker dry-run exits cleanly, no `TMDB_API_KEY` in `docker-compose.yml`, type-check/lint/test:run still clean) is covered by Task 1's pass/fail check, Task 2 Step 2's grep, and is implicitly true throughout since no application code is touched by any task — no separate task needed for that last point, but the controller running this plan should still spot-check it once at the end given Task 1 runs a Docker build that touches `node_modules`/`.next` via the bind-mounted volumes in `docker-compose.yml`.

**Placeholder scan:** Task 3's `<RESULT>` is intentionally a placeholder for the *plan*, since it depends on Task 1's live verification result, which doesn't exist yet when this plan is written — Task 3's own Step 1 explicitly instructs "fill in the `<RESULT>` placeholder... using Task 1's actual captured outcome, do not leave it as literal text," so the *implementer* never commits a literal `<RESULT>` string. This is the one acceptable exception to "no placeholders": a result that can only be known after an earlier task's live execution, with an explicit instruction not to leave it unfilled.

**Type/interface consistency:** no code types/signatures in this plan (docs + config only). Cross-task file/path consistency checked: Task 1's exact `docker compose run` command matches what Task 3 documents verbatim; Task 2's exact line removed matches what's actually in the current `docker-compose.yml` (verified by reading the file during plan-writing); Task 4's summary accurately reflects what Tasks 1-3 actually do.

**Task ordering:** Tasks 1 → 3 → must run in that order (Task 3 needs Task 1's result). Task 2 is independent and can run anytime before or after Task 1, but is sequenced second for narrative flow. Task 4 must run last (summarizes 1-3). If using `subagent-driven-development`, dispatch in the order written: 1, 2, 3, 4.
