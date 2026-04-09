# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **IMPORTANT — monorepo npm rule:** this project has **no installable packages at the repo root**. Always `cd` into `server/` or `client/` before running `npm` commands, or use the convenience scripts in the root [package.json](package.json) (`npm run dev:server`, `npm run dev:client`, `npm run install:all`, `npm run seed`, `npm run migrate`). The root `package.json` exists only to dispatch into the subpackages — it has no dependencies. Do **not** run `npm install` at the root.

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

### Running the full app end-to-end

The client and server are independent processes — both must be running to use the app in a browser. Step-by-step from a fresh clone:

1. **Install deps once per package** (only needed after `git clone` or a `package.json` change):
   ```bash
   cd server && npm install
   cd ../client && npm install
   ```
2. **Create `server/.env`** by copying [server/.env.example](server/.env.example) and filling in `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `GEMINI_API_KEY`. `PORT=5001` is already set.
3. **Create `client/.env`** by copying [client/.env.example](client/.env.example). `VITE_API_URL=http://localhost:5001` is the only line and matches the server's port.
4. **Apply migrations + seed the database** (only needed after schema changes or to restore the test users):
   ```bash
   cd server
   npm run prisma:migrate   # applies any pending migrations
   npm run prisma:seed      # wipes & reseeds 3 users + 15 theory + 5 hazard
   ```
5. **Start the server** in one terminal:
   ```bash
   cd server && npm run dev
   # → "Server running on port 5001"
   ```
6. **Start the client** in a second terminal:
   ```bash
   cd client && npm run dev
   # → Vite serves http://localhost:5173
   ```
7. **Open the browser** at http://localhost:5173. Unauthenticated visits redirect to `/login`. Use any of the seeded credentials in the table below to sign in. After login you land on `/dashboard`; learners see a "Start theory practice" button that opens [client/src/pages/Theory.tsx](client/src/pages/Theory.tsx).

To shut down: Ctrl+C in each terminal. The dev servers are stateless — restart freely; nothing in `localStorage` survives beyond the browser tab.

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
7. **Gemini model is `gemini-2.0-flash`** via the `@google/generative-ai` package. The original spec called for `gemini-1.5-flash`, but Google has retired that model from the v1beta API (`404 Not Found ... not supported for generateContent`), so we use the natural successor on the same free tier. The model name lives in [server/src/lib/gemini.ts](server/src/lib/gemini.ts). The prompt template (in [server/src/services/theory.service.ts](server/src/services/theory.service.ts) `buildExplanationPrompt`) is intentionally stable — the report's evaluation depends on the explanation style being consistent, so don't tweak it casually.
8. **Gemini upstream errors must surface as HTTP 503**, not 500. The `@google/generative-ai` SDK throws a `GoogleGenerativeAIFetchError` carrying a numeric `status` (429 quota, 5xx outage, etc.). [server/src/controllers/theory.controller.ts](server/src/controllers/theory.controller.ts) `explainAnswer` detects this by `err.constructor?.name?.startsWith("GoogleGenerativeAI")` and responds with `503 { error: "AI explanation is temporarily unavailable. Please try again later." }`. The Theory page renders that string verbatim, so the learner sees a friendly retry hint instead of an opaque 500. Risk R-03 in the report.

## Build order

The project is being built **incrementally** in 19 ordered phases (from auth → theory test → AI explain → hazard → marketplace → progress → admin → frontend pages → Tailwind styling → end-to-end testing). When picking up work, first determine which phase the repo is at (look at what routes exist in `server/src/`, then what pages exist in `client/src/`) before adding anything. Don't jump ahead — frontend pages depend on the routes they call already existing.

The plan files for completed/in-progress phases live in `~/.claude/plans/` and contain the file-by-file scope for each phase.

## Frontend conventions

- **One component per file.** Pages live alongside their components — keep them small.
- **All API calls go through a single [client/src/api.ts](client/src/api.ts)** that wraps Axios with `VITE_API_URL` and an interceptor that injects `Authorization: Bearer <token>` from `localStorage`. Don't call `axios` directly from components.
- **JWT is stored in `localStorage`** on login and read by the Axios interceptor. There is no refresh-token flow.
- **401 interceptor → hard logout.** The Axios response interceptor in [client/src/api.ts](client/src/api.ts) catches any `401`, clears `localStorage` (`token` + `user`), and `window.location.assign("/login")`. The hard navigation is intentional — the interceptor lives outside the React tree so it can't call `useNavigate()`. This is the replacement for a refresh-token flow.
- **Auth state lives in a 3-file React context split:**
  - [client/src/context/AuthContext.ts](client/src/context/AuthContext.ts) — `createContext` + the `AuthContextValue` type. **No JSX, no components.**
  - [client/src/context/AuthProvider.tsx](client/src/context/AuthProvider.tsx) — the `AuthProvider` component only. Holds `user`, `token`, `loading` state; rehydrates from `localStorage` on mount; exposes `login`, `register`, `logout` via `useCallback`.
  - [client/src/context/useAuth.ts](client/src/context/useAuth.ts) — the `useAuth()` hook only. Throws if used outside the provider.
  This split is **not** stylistic — it satisfies ESLint's `react-refresh/only-export-components` rule, which forbids a `.tsx` file from exporting both a component and a non-component (hook, context, type). Collapsing them back into one file will fail `npm run lint`.
- **Auto-login after register.** [client/src/context/AuthProvider.tsx](client/src/context/AuthProvider.tsx) `register()` POSTs to `/api/auth/register` (which returns `{user}` only, no token), and on success immediately calls its own `login(email, password)` with the credentials the user just typed. The user lands on `/dashboard` without seeing a second form. If the auto-login fails after a successful register, the error bubbles to the Register page.
- **Router is `react-router-dom@7` data-router style** (`createBrowserRouter` + `RouterProvider`) in [client/src/App.tsx](client/src/App.tsx). The shape:
  - Root layout route wraps everything in `<AuthProvider><Outlet /></AuthProvider>` so the auth context is available to every page.
  - Public branch: `/login`, `/register`.
  - Private branch: `path: "/"` with `element: <RequireAuth />` and child routes (`/dashboard`, `/theory`, etc.). [client/src/components/RequireAuth.tsx](client/src/components/RequireAuth.tsx) renders `<Navigate to="/login" replace />` if `useAuth().user` is null, else `<Outlet />`.
  - Catch-all `path: "*"` bounces unknown URLs to `/dashboard` (which transitively bounces to `/login` for unauthed users).
  - Role-gated routes use [client/src/components/RequireRole.tsx](client/src/components/RequireRole.tsx) (`<RequireRole role="instructor" />`) — same pattern as RequireAuth, redirects to `/dashboard` on role mismatch.
- **TypeScript strictness in `client/tsconfig.app.json` is unusually picky.** Three flags bite often:
  - `verbatimModuleSyntax: true` — every type-only import **must** use `import type { ... }`. Importing `User` as a value when it's only used as a type fails the build.
  - `erasableSyntaxOnly: true` — no TS `enum`s, no parameter properties. Use `type Role = "learner" | "instructor" | "admin"` (string literal union) instead.
  - `noUnusedLocals: true` — leftover imports after a refactor break the build.
- **Frontend file layout** (post-Phase 14):
  ```
  client/src/
  ├── api.ts                  # singleton Axios — only file that imports axios
  ├── types.ts                # shared types (User, Role, TheoryQuestion, ...)
  ├── App.tsx                 # createBrowserRouter shell
  ├── main.tsx                # ReactDOM.createRoot — unchanged from Vite default
  ├── index.css               # @tailwind directives + body reset
  ├── context/
  │   ├── AuthContext.ts      # context object + value type
  │   ├── AuthProvider.tsx    # provider component
  │   └── useAuth.ts          # hook
  ├── components/
  │   ├── RequireAuth.tsx     # auth route guard
  │   └── RequireRole.tsx     # role route guard (used by instructor/admin pages)
  └── pages/
      ├── Login.tsx
      ├── Register.tsx
      ├── Dashboard.tsx
      └── Theory.tsx          # quiz UI — calls /api/theory/{questions,submit,explain}
  ```

## When in doubt

Before adding a route, page, or model field, check:

1. Is it in the original spec / `report fyp.pdf`? If not, ask the user before adding it.
2. Does an existing function/utility already do this? Reuse before creating.
3. Does the change preserve the rules in "Architectural rules from the spec" above? If a "fix" requires breaking one of those rules, that's a sign to stop and ask.
