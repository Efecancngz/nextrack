# Cloudflare Deploy + Neon Migration Sync — Prep Runbook

**Status:** Approved
**Scope:** Phase 1 close-out, sub-project 4 of 4 (explore page, library page, and favicon/app icons all done — see `docs/phases.md`).

## Goal

Get the project to a state where deploying to Cloudflare Workers is a single command away, **without actually deploying**. The user has explicitly decided not to go live until the **entire project** is finished — not just Phase 1, but Phase 2 and Phase 3 too (see `docs/phases.md`'s full roadmap) — this sub-project is preparation only: provision the production database, sync the schema to it, stage all secrets, and verify the production build compiles. The final `wrangler deploy` step is documented but deliberately not executed as part of this work, and won't be until the user confirms every phase is done, not just this Phase 1 close-out effort.

## Out of Scope

- Running `wrangler deploy` or `opennextjs-cloudflare build && wrangler deploy` — explicitly deferred until the user decides the project is ready, per their direct instruction.
- Custom domain setup (GitHub Student Pack → Name.com → Cloudflare DNS) — domain not yet chosen; this is documented as a clearly separate follow-up runbook once a domain exists, not part of this prep.
- Google OAuth production credentials — explicitly skipped this round (per the brainstorming decision). The runbook sets dummy placeholder values for `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` so the secret list is complete and the app doesn't break on missing env vars; the "Sign in with Google" button will be visible but non-functional until real credentials are added in a later round.
- AdSense/monetization wiring (`docs/monetization-and-deploy.md`'s ad-unit components) — a separate, later task, not part of "deploy + migration sync."
- Any code changes — the code-readiness audit (below) found no blockers, so this plan is purely operational/runbook, no source files are touched except possibly `docs/phases.md`'s checklist at the very end.

## Current State (code-readiness audit, already done)

- No Node-only APIs (`fs`, `child_process`) found anywhere in `src/` — confirmed via grep. Nothing blocks running on Cloudflare's `workerd` runtime.
- `bcryptjs` (pure JS) is used for password hashing, not native `bcrypt` — Workers-compatible.
- `src/lib/db/prisma.ts` already auto-detects local vs. Neon via a regex on `DATABASE_URL` (`/localhost|127\.0\.0\.1/`) and picks the matching Prisma driver adapter (`PrismaPg` vs `PrismaNeon`) — no code changes needed to point at Neon, just a different `DATABASE_URL` value.
- `wrangler.toml`, `@opennextjs/cloudflare`, and `next.config.ts` are already correctly configured for a Workers deploy (confirmed by reading all three).
- `src/lib/auth/config.ts` registers the Google provider unconditionally (`Google({ clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET })`) — if these env vars are completely unset in production, this is untested territory for Auth.js v5's startup behavior, so the runbook sets dummy non-empty placeholder values rather than leaving them unset.
- Current local `.env` points `DATABASE_URL`/`DIRECT_URL` at `localhost:5432` (Docker Postgres) — confirmed via grep (values redacted, only host inspected). No Neon project exists yet.
- `prisma/migrations/20260617192827_init` is the only migration so far — this is what needs to be applied to the new Neon database.

## The Runbook

Every step below is **executed by the user**, not automated by an agent — account creation, `wrangler login` (interactive OAuth), and entering real secret values are all things an AI agent should not do. This doc provides the exact commands; the user runs them.

### 1. Create the Neon project

1. Go to https://neon.tech, sign up / log in, create a new project (free tier, 0.5 GB — matches `docs/monetization-and-deploy.md`'s cost table).
2. From the project dashboard, copy two connection strings:
   - The **pooled** connection string → this becomes `DATABASE_URL`.
   - The **direct** (non-pooled) connection string → this becomes `DIRECT_URL` (Prisma migrations need the direct connection, per the existing `.env.example` comments).

### 2. Sync the migration to Neon

With `DIRECT_URL` (and `DATABASE_URL`) pointed at the new Neon project — easiest done by temporarily setting them in a local `.env.production.local` or exporting as shell env vars, not overwriting the working `.env` used for local Docker dev:

```bash
DATABASE_URL="<neon-pooled-url>" DIRECT_URL="<neon-direct-url>" npx prisma migrate deploy
```

This applies the existing `20260617192827_init` migration to the fresh Neon database. `prisma migrate deploy` (not `migrate dev`) is the correct command for an already-written migration being applied to a new environment — it doesn't try to generate a new migration or prompt interactively.

### 3. Authenticate Wrangler

```bash
npx wrangler login
```

Opens a browser to authorize against the user's Cloudflare account (free tier is sufficient, per the cost table).

### 4. Stage production secrets

Run one `wrangler secret put` per line — each prompts for the value via stdin, so real secret values never appear in shell history or get typed by an agent:

```bash
npx wrangler secret put DATABASE_URL
npx wrangler secret put DIRECT_URL
npx wrangler secret put NEXTAUTH_SECRET
npx wrangler secret put NEXTAUTH_URL
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put TMDB_API_KEY
```

Values to use:
- `DATABASE_URL` / `DIRECT_URL`: the same Neon connection strings from step 1.
- `NEXTAUTH_SECRET`: generate a **fresh** value, don't reuse the local dev one — `openssl rand -base64 32` (already documented in `.env.example`).
- `NEXTAUTH_URL`: the eventual production URL. Find the account's `workers.dev` subdomain in the Cloudflare dashboard (Workers & Pages page, top right) after step 3 — the URL will be `https://free-serie-tracker.<that-subdomain>.workers.dev` (the Worker name `free-serie-tracker` is already set in `wrangler.toml`). If this isn't known yet, it's fine to skip this one secret for now and set it after the first real deploy reveals the URL — nothing else in this runbook depends on it.
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`: dummy placeholder strings (e.g. `"not-configured-yet"`) — per Out of Scope above, real Google OAuth credentials are a later task.
- `TMDB_API_KEY`: the same personal TMDB key used locally (per CLAUDE.md, a free Personal key is fine pre-launch).

### 5. Verify the production build compiles (no deploy)

```bash
npx opennextjs-cloudflare build
```

This compiles the Next.js app into a Cloudflare Worker bundle (`.open-next/`) — entirely local, no network calls to Cloudflare, nothing goes live. A clean exit confirms there's no Workers-runtime incompatibility waiting to surprise the user on actual deploy day. If this fails, that's a real finding to fix before considering the project deploy-ready — report it rather than silently leaving it broken.

### 6. (Deferred) The actual deploy command

Documented here for when the user is ready — **not run as part of this sub-project**:

```bash
npx wrangler deploy
```

(equivalently, `npm run deploy`, which already chains steps 5 and 6 per the existing `package.json` script). Once secrets are staged (step 4) and the build is confirmed clean (step 5), this is genuinely the only remaining step — that's the point of this prep work.

## Error Handling

- If `prisma migrate deploy` fails against Neon (e.g. SSL mode, connection pooling quirks), the user should report the exact error — Neon-specific connection string format issues are common and not something to guess-fix blindly.
- If `npx opennextjs-cloudflare build` fails, treat it as a real code-readiness finding, not something to route around — identify the specific incompatibility (likely a dependency using a Node API Workers doesn't support) and report it before considering deploy-prep complete.

## Testing / Verification

No automated test framework in this repo (per `CLAUDE.md`). Verification for this runbook is inherently manual since it touches real external accounts:
- Step 2 succeeds: `npx prisma studio` (pointed at the Neon URLs) shows the expected empty tables (User, Account, Session, Series, LibraryItem, UserRating, etc.) — confirms the migration actually applied.
- Step 5 succeeds: `npx opennextjs-cloudflare build` exits 0 and produces a `.open-next/` directory.
- `docs/phases.md`'s "Final Cloudflare Pages/Workers deployment (Wrangler configured)" item can be checked off once secrets are staged and the build is verified — even though the actual deploy hasn't run, "Wrangler configured" is accurately satisfied by this prep work. The deploy itself stays a separate, future, explicitly-triggered action.
