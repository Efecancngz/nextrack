# Sub-project C: Deploy Verification — Design Spec

## Context

This is the third and final sub-project in the "Generic SaaS Starter" pivot (see `CLAUDE.md`'s "Pivot in progress" section and `docs/phases.md`'s Pivot section). Sub-project A (core architecture: schema, pages, cleanup) and Sub-project B (docs/branding rewrite) are both complete, reviewed, and committed on branch `feat/generic-starter-a1-backend`.

`docs/phases.md` originally scoped Sub-project C as: "Confirms the Cloudflare Workers deploy path works end-to-end on the new schema."

## Scope decision (made during brainstorming)

A live, end-to-end Cloudflare deploy is **out of scope**. There is no `.env.local`, no Cloudflare account authenticated locally (`wrangler whoami` fails), and no production Neon database. Setting those up requires the project owner's own accounts and interactive logins that can't be done on their behalf. Per explicit user decision, Sub-project C produces a **documentation deliverable** — a deploy guide the eventual user of this starter template will follow themselves — not a live deployment.

## Finding that shaped this design

While probing what "verification" could mean without live infra, a real, reproducible bug was found:

- `npm run deploy:build` (`opennextjs-cloudflare build`) succeeds cleanly.
- `npx wrangler deploy --dry-run` **fails** with 4 esbuild errors: it cannot resolve `resvg.wasm`/`yoga.wasm` (used by `next/dist/compiled/@vercel/og`, which backs this project's `icon.tsx`/`apple-icon.tsx` favicon generation). The error messages show the absolute path getting mangled around the project folder's name, which contains "Masaüstü" (Turkish for "Desktop", non-ASCII).
- This is the same root cause as a previously-documented Turbopack dev-server bug (noted in `docs/superpowers/plans/2026-06-22-generic-starter-a3-cleanup.md`: "a pre-existing Turbopack/Unicode-path environment issue... blocks `npm run build` in this environment").
- Confirmed reproducible from a completely fresh `.open-next/` build (not a stale-artifact fluke).
- `docs/deploy.md`'s already-documented GitHub Actions CI workflow runs on `runs-on: ubuntu-latest` — an ASCII path — so the **documented CI deploy path is unaffected**. This bug only blocks manual `wrangler deploy` runs from this specific local Windows/OneDrive checkout.
- The repo's existing `Dockerfile`/`docker-compose.yml` (the `web` service mounts the repo at `/app` inside the container — an ASCII path) is a real, testable local workaround.

Per explicit user decision, Sub-project C documents this as a known limitation rather than attempting to fix the underlying esbuild/Windows/non-ASCII-path interaction (not application code, out of scope for a docs/deploy sub-project).

## Deliverables

1. **Verify the Docker workaround once** (local only, no live deploy): run `docker compose run --rm web sh -c "npm run deploy:build && npx wrangler deploy --dry-run"` and confirm it succeeds where the host run failed, before writing it into the docs as a recommended workaround.
2. **Clean up `docker-compose.yml`**: remove the dead `TMDB_API_KEY` environment passthrough (line 20) — a leftover from before the pivot that A3/B should have caught but didn't.
3. **Rewrite `docs/deploy.md`** to add:
   - A "Known Limitation" section explaining the non-ASCII-path bug, that CI is unaffected, and the Docker dry-run workaround for local verification.
   - A concrete numbered manual runbook for whoever deploys this starter for real: create a Cloudflare account + `wrangler login`, create a Neon production database + run `prisma migrate deploy` against it, `wrangler secret put` for each of the 6 secrets (`DATABASE_URL`, `DIRECT_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`), and set the `CLOUDFLARE_API_TOKEN` GitHub Actions secret if using the CI workflow. End with an explicit "this is as far as a documentation sub-project can take you — the rest is yours" note.
4. **Update `docs/phases.md`**'s Sub-project C line from "not started" to "done," summarizing what was verified vs. documented.

## Out of scope

- Any live Cloudflare account creation, `wrangler login`, or live deploy.
- Any live Neon production database creation or migration.
- Attempting to fix the underlying esbuild/non-ASCII-path bug itself (e.g. replacing `@vercel/og`-based icon generation) — documented as a known limitation instead, per explicit user decision.
- Any change to application code, schema, or API routes — this sub-project touches only `docker-compose.yml` and `docs/*.md`.

## Verification

- `docker compose run --rm web sh -c "npm run deploy:build && npx wrangler deploy --dry-run"` exits cleanly inside the container (the actual proof this sub-project is "verification," not just a guess).
- `docker-compose.yml` no longer references `TMDB_API_KEY`.
- `npm run type-check` / `npm run lint` / `npm run test:run` still clean (no code touched, but confirm nothing regressed).
