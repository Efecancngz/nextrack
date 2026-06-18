# Auth.js Wiring — Design

## Context

`prisma/schema.prisma` already has Auth.js-compatible models (`User`, `Account`,
`Session`, `VerificationToken`). `bcryptjs` and `@auth/prisma-adapter` are
installed but unused. `src/app/auth/signin/page.tsx` and `signup/page.tsx` are
client components with disabled inputs and a "needs DB" notice. `/library`
shows an empty-state placeholder with a "Sign In" link. None of this is wired
to real authentication yet (see `CLAUDE.md`'s "Current Implementation State").

This is sub-project 1 of 2 (Auth, then Library CRUD — Library CRUD depends on
having a real `userId` from a session, so it comes after this one).

## Goals

- Working email/password registration and sign-in.
- Working Google OAuth sign-in (code complete; not testable end-to-end until
  real `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` are added to `.env` — known
  limitation, not a blocker for this round).
- `/library` redirects signed-out visitors to `/auth/signin`.
- A reusable `getCurrentUser()`/`requireAuth()` seam that the next sub-project
  (Library CRUD) will import from.
- Local Docker Postgres as the dev/test database (existing
  `docker-compose.yml` `db` service); no real Neon connection needed for this
  round.

## Non-goals

- Library CRUD, ratings, progress tracking — next sub-project.
- Email verification — schema has `emailVerified` but no email-sending
  service is configured; new accounts can sign in immediately, field stays
  null.
- Any change to the `lib/services`/`lib/repositories` target architecture
  described in `docs/project-structure.md` — this round follows today's
  flatter pattern (routes call helpers directly), consistent with the rest
  of the codebase.

## Architecture

- `src/lib/auth/config.ts` — `NextAuth({...})` exporting `handlers`, `auth`,
  `signIn`, `signOut`.
  - `PrismaAdapter(prisma)` for persistence.
  - **Session strategy: `"jwt"`** — required because a Credentials provider
    is present; the `Session` table stays unused (harmless).
  - Providers: `GoogleProvider` (`GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`)
    and `CredentialsProvider` (email + password, looks up `User` by email,
    compares `passwordHash` via `bcryptjs.compare`).
  - `jwt`/`session` callbacks attach `user.id` onto the token/session so API
    routes get a real id.
- `src/app/api/auth/[...nextauth]/route.ts` — re-exports
  `{ GET, POST } = handlers`.
- `src/lib/auth/helpers.ts` — `getCurrentUser()` (server-side, calls `auth()`)
  and `requireAuth()` (throws `AppError.unauthorized()` when no session) —
  the seam Library CRUD will use.
- `src/lib/validations/auth.ts` — Zod `registerSchema` (name, email,
  password ≥ 8 chars) and `loginSchema` (email, password). First file in a
  new `lib/validations/` directory.
- `middleware.ts` (project root) — checks the session via `auth()`, redirects
  unauthenticated requests to `/library` to
  `/auth/signin?callbackUrl=/library`.

## Components / data flow

- `src/app/api/auth/register/route.ts` — `POST`, validates with
  `registerSchema`, throws a new `AppError.conflict(message)` static (409,
  `"CONFLICT"` code — added to `src/lib/utils/app-error.ts` alongside the
  existing factory methods) on duplicate email, hashes with `bcryptjs`
  (10 salt rounds), creates `User`. Does **not**
  auto-sign-in — client redirects to `/auth/signin` on success. Wrapped in
  `compose(withErrorHandler)` like existing routes (`src/app/api/search/route.ts`).
- `src/app/auth/signin/page.tsx` — becomes a real form: `onSubmit` calls
  `signIn("credentials", { redirect: false, email, password })` from
  `next-auth/react`; shows inline error on failure; redirects to
  `callbackUrl` (or `/`) on success. Adds a "Continue with Google" button
  calling `signIn("google")`.
- `src/app/auth/signup/page.tsx` — `onSubmit` calls `fetch("/api/auth/register")`
  with the form body; on success redirects to `/auth/signin`; shows inline
  validation/duplicate-email errors.
- `src/app/library/page.tsx` — unchanged in this round (still the empty
  state) except it's now reachable only when signed in, thanks to
  `middleware.ts`.
- A `SessionProvider` wrapper is added to `src/app/layout.tsx` (client
  boundary) so `signIn()`/`useSession()` work in the form components.

## Error handling

Register route reuses the existing `AppError`/`Responses` pattern (see
`src/lib/utils/app-error.ts`, `src/lib/utils/api-response.ts`) — consistent
with `/api/search`, `/api/trending`, `/api/series/[id]`. No new error-handling
abstraction introduced.

## Environment / local setup

- **Driver adapter mismatch (discovered during planning):** `src/lib/db/prisma.ts`
  hardcodes `PrismaNeon` from `@prisma/adapter-neon`, which speaks Neon's
  WebSocket proxy protocol — not plain Postgres TCP. A vanilla
  `postgres:15-alpine` container (the `docker-compose.yml` `db` service)
  cannot be reached this way. Fix: add `pg` and `@prisma/adapter-pg` as
  dependencies, and make `src/lib/db/prisma.ts` pick `PrismaPg` when
  `DATABASE_URL` points at `localhost`/`127.0.0.1` (local dev/Docker), and
  keep `PrismaNeon` for real `neon.tech` URLs (production). This is part of
  Task 1 in the implementation plan.
- `.env`: replace the placeholder `DATABASE_URL` with
  `postgresql://postgres:postgres@localhost:5432/serietracker?schema=public`
  (matches `docker-compose.yml`'s `db` service credentials, reachable from
  the host once `docker compose up db` is running).
- `.env`: add a real `NEXTAUTH_SECRET` (generated, not committed) and
  `NEXTAUTH_URL=http://localhost:3000`.
- `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` remain empty for now — Google
  button will reach Google's screen but the round-trip won't complete until
  real credentials are added later by the user.
- Run `docker compose up -d db`, then `npm run db:migrate` from the host to
  create the initial migration against the local Postgres.

## Testing

No test framework is configured in this repo (confirmed — no Jest/Vitest,
no `*.test.*` files). Verification for this round:
1. `npm run type-check` and `npm run lint` clean.
2. Manual run: register a new user → redirected to sign-in → sign in with
   those credentials → redirected to home, session visible (e.g. via navbar
   or a temporary debug log) → visiting `/library` works while signed in.
3. Manual run: sign out, then visit `/library` directly → redirected to
   `/auth/signin?callbackUrl=/library`.
4. Manual click-through: "Continue with Google" reaches Google's consent
   screen (full round-trip not expected to succeed without real credentials —
   documented as a known limitation, not a failure).
