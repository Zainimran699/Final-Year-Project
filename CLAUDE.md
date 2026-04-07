# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project context

Final-year project by Zain Imran (supervisor: Mohsen Zahedi) — a UK driving theory + hazard perception training platform with AI-generated explanations and an instructor booking marketplace. The full design document (use cases, ER diagram, architecture, ethics, risk register) lives in `report fyp.pdf` at the project root and is the authoritative source for *what* the system must do; the implementation spec (routes, pages, models, 19-step build order) was provided in the conversation that scaffolded this repo.

The system has three roles — **learner**, **instructor**, **admin** — all stored in a single `users` table distinguished by a `role` column.

## Repository layout

Monorepo with two independent npm projects:

- [client/](client/) — Vite + React + TypeScript frontend (Tailwind CSS, Axios, react-router-dom)
- [server/](server/) — Express + TypeScript backend, Prisma ORM, JWT + bcrypt auth, Google Gemini for AI explanations

The Prisma schema lives at [server/prisma/schema.prisma](server/prisma/schema.prisma) and defines 8 models: `User`, `InstructorProfile`, `TheoryQuestion`, `AIExplanation`, `HazardQuestion`, `TestResult`, `Availability`, `Booking`.

## Common commands

All commands are run from the relevant subdirectory (`client/` or `server/`).

### Server ([server/](server/))

```bash
npm run dev              # nodemon → ts-node src/index.ts (watches src/ and prisma/)
npm run build            # tsc → dist/
npm run start            # node dist/index.js (after build)
npm run prisma:migrate   # prisma migrate dev (creates/applies migration, regenerates client)
npm run prisma:seed      # ts-node prisma/seed.ts (idempotent — wipes then re-seeds)
npx prisma generate      # regenerate Prisma client only (no migration)
npx prisma studio        # open the Prisma DB browser at localhost:5555
npx prisma validate      # validate schema.prisma without touching the DB
npx tsc --noEmit         # type-check the server without emitting
```

There is no test runner wired up yet — testing is manual against the requirements (see report §10.4).

### Client ([client/](client/))

```bash
npm run dev      # Vite dev server on http://localhost:5173
npm run build    # type-check + production build
npm run preview  # serve the built bundle
npm run lint     # ESLint (Vite default config)
```

## Database & environment

The database is **Supabase-hosted PostgreSQL**, accessed via Prisma. Two connection strings are required in [server/.env](server/.env):

- `DATABASE_URL` — Supabase **transaction pooler** (port 6543, with `?pgbouncer=true`). Used at runtime by `PrismaClient`.
- `DIRECT_URL` — Supabase **direct connection** (port 5432). Used by `prisma migrate` because PgBouncer can't run schema migrations.

Both are referenced from the `datasource db` block in `schema.prisma`. If migrations fail with "prepared statement does not exist" or similar, the `DIRECT_URL` is the thing to check.

Other env vars: `JWT_SECRET`, `GEMINI_API_KEY`, `PORT` (set to **5001** — port 5000 is taken by macOS AirPlay Receiver on Monterey+, which silently 403s every request). See [server/.env.example](server/.env.example) for the template. The client's `VITE_API_URL` must point at the same port.

The seed file ([server/prisma/seed.ts](server/prisma/seed.ts)) creates three test accounts:

| Role       | Email                 | Password |
|------------|-----------------------|----------|
| admin      | admin@test.com        | admin123 |
| instructor | instructor@test.com   | test123  |
| learner    | learner@test.com      | test123  |

It also seeds 15 theory questions, 5 hazard questions, 1 instructor profile, and 3 availability slots. Re-running it wipes and reseeds in FK-safe order — safe and idempotent.

## Pinned versions (do not auto-upgrade)

`npm install` will pull bleeding-edge versions that break this project. The following are pinned and the reasons matter:

- **Prisma 6 / @prisma/client 6** — Prisma 7 deprecates `url`/`directUrl` in `schema.prisma` and pushes everything into `prisma.config.ts` with the new `prisma-client` generator. The spec assumes the v6 layout.
- **TypeScript 5 / @types/node 20** — `ts-node@10` does not support TypeScript 6 yet, and TS 6 defaults break the rest of the toolchain.
- **Tailwind CSS 3** (not v4) — Tailwind v4 has a different setup flow that doesn't use `@tailwind` directives + `tailwind.config.js`.
- **Express 5** is in use (not v4). Mostly compatible with v4 docs; the main upside is automatic async error forwarding to `next()`.

If you need to bump these, do it deliberately and update this file.

### VSCode Prisma extension caveat

The bundled Prisma extension is on a v7-style validator and will show false-positive errors on `url` / `directUrl` in the datasource block. The actual installed CLI (`npx prisma validate`) is the source of truth — if it says the schema is valid, the IDE diagnostic can be ignored.

## Architectural rules from the spec

These are non-obvious constraints that come from the project spec / report and must be preserved across changes:

1. **Backend is layered as routes → controllers → services** (NFR-07 in the report). Routes only wire URLs; controllers validate input + shape responses; services hold the business logic and own all Prisma calls. New endpoints must follow this split.
2. **All routes except `POST /api/auth/register` and `POST /api/auth/login` require JWT auth.** A central `authenticateToken` middleware reads `Authorization: Bearer <token>` and attaches `req.user`. A `requireRole(role)` middleware gates admin- and instructor-only routes.
3. **Booking creation must use a Prisma transaction.** Inside the transaction, re-check that `Availability.isBooked = false`, then create the `Booking` and flip `isBooked = true`. Return HTTP 409 on conflict. The schema enforces this at the DB level too via `Booking.availabilityId @unique` (see schema and report §5.3 / R-05).
4. **AI explanations must hit the cache before calling Gemini.** The `AIExplanation` table has `@@unique([questionId, selectedOption])` precisely so the cache lookup is a single `findUnique`. This is FR-08 in the report and risk R-03 (Gemini free-tier rate limit). Never call Gemini without checking the cache first.
5. **`passwordHash` must never be returned in any API response.** Strip it explicitly when building user objects to send to the client.
6. **`correctOption` must be stripped from question payloads when serving them to learners** for the test/practice routes. It's only included on the submission-result response.
7. **Gemini model is `gemini-1.5-flash`** via the `@google/generative-ai` package. Prompt template lives in the spec — keep it the way it is (the report's evaluation depends on the explanation style being consistent).

## Build order

The project is being built **incrementally** in 19 ordered phases (from auth → theory test → AI explain → hazard → marketplace → progress → admin → frontend pages → Tailwind styling → end-to-end testing). When picking up work, first determine which phase the repo is at (look at what routes exist in `server/src/`, then what pages exist in `client/src/`) before adding anything. Don't jump ahead — frontend pages depend on the routes they call already existing.

The plan files for completed/in-progress phases live in `~/.claude/plans/` and contain the file-by-file scope for each phase.

## Frontend conventions

- **One component per file.** Pages live alongside their components — keep them small.
- **All API calls go through a single `client/src/api.ts`** that wraps Axios with `VITE_API_URL` and an interceptor that injects `Authorization: Bearer <token>` from `localStorage`. Don't call `axios` directly from components.
- **JWT is stored in `localStorage`** on login and read by the Axios interceptor. There is no refresh-token flow.
- **Routing uses `react-router-dom`** with role-gated routes (learner / instructor / admin pages).

## When in doubt

Before adding a route, page, or model field, check:

1. Is it in the original spec / `report fyp.pdf`? If not, ask the user before adding it.
2. Does an existing function/utility already do this? Reuse before creating.
3. Does the change preserve the rules in "Architectural rules from the spec" above? If a "fix" requires breaking one of those rules, that's a sign to stop and ask.
