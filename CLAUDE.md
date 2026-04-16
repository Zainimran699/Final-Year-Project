# CLAUDE.md — DriveReady221 Technical Handbook

This file is the **internal engineering guide** for the project. It is read by Claude Code (claude.ai/code) on every session and is also the first document a new human contributor should read before touching the codebase. It describes what exists today in the repository — not what was once planned.

> **IMPORTANT — monorepo npm rule:** this project has **no installable packages at the repo root**. Always `cd` into `server/` or `client/` before running `npm` commands, or use the convenience scripts in the root [package.json](package.json) (`npm run dev:server`, `npm run dev:client`, `npm run install:all`, `npm run seed`, `npm run migrate`). The root `package.json` exists only to dispatch into the two subpackages — it has **no dependencies of its own**. Do **not** run `npm install` at the root.

---

## 1. Project overview

**DriveReady221** is a UK driving-test preparation and instructor-booking platform, built as a final-year project by **Zain Imran** (supervisor: **Mohsen Zahedi**). The full design document — use cases, ER diagram, architecture, ethics, risk register — lives in `report fyp.pdf` at the repo root and is the authoritative source for *what* the system must do.

### 1.1 The problem it solves

UK learners typically juggle three separate tools to prepare for the driving test: a theory-question app, a hazard-perception video pack, and some classified-ad site to book lessons. Explanations of wrong answers are either missing or written once, never tailored. DriveReady221 unifies:

- **Theory practice** — 45 seeded UK theory questions across 4 categories (road signs, speed limits, safety, motorway rules). Learners take a 10-question, 6-minute randomised test; 86% (≥9/10) is a pass. On any question they can ask for an **AI-generated explanation** of why a given option is right or wrong.
- **Hazard perception** — 5 image-based developing-hazard questions. Pass mark is 60% (3/5).
- **Instructor marketplace** — learners search instructors by location, browse their hourly rate + bio, view available time slots, and book a lesson in one click. Bookings are race-safe (transaction + unique DB constraint).
- **Progress tracking** — per-learner summary of theory/hazard attempts, average score, pass-rate.
- **Admin panel** — CRUD for theory questions, hazard questions, learners, and a stats dashboard.

### 1.2 Roles

Three roles, all stored in a single `users` table distinguished by a `role` column:

| Role         | Can do                                                                                  |
|--------------|------------------------------------------------------------------------------------------|
| `learner`    | Theory + hazard practice, browse/book instructors, view own bookings + progress          |
| `instructor` | Edit profile, manage availability slots, see bookings made against their slots           |
| `admin`      | Full CRUD on theory & hazard questions, list learners, view per-learner results, stats   |

The three seeded test accounts are listed in §5.5.

### 1.3 Constraints that shape the design

- **Budget = £0.** Supabase free tier (Postgres), Google Gemini free tier (AI), Gmail SMTP free tier (email), Vercel hobby (client), Render free (server). Every external dependency must fit inside a free tier — that's why we cache AI responses aggressively (§7.4) and keep the OTP flow self-hosted instead of using Auth0.
- **FYP report-driven.** The architecture (routes → controllers → services), the AI cache requirement, the booking-transaction requirement, and the three-role model are all dictated by sections of `report fyp.pdf`. Don't "improve" them without checking the report.
- **Single-developer, manual testing only.** There is no automated test suite. Verification is manual against the report's functional-requirement list.

---

## 2. Repository structure (real, not aspirational)

```
Final-Year-Project/
├── CLAUDE.md                       ← this file
├── AUTH.md                         ← deep-dive on the auth + OTP system
├── package.json                    ← ROOT: convenience scripts only, no deps
├── report fyp.pdf                  ← FYP design document (authoritative spec)
│
├── client/                         ← Vite + React 19 + TypeScript frontend
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.js          ← Tailwind 3 — content globs + empty theme
│   ├── postcss.config.js
│   ├── tsconfig.app.json           ← strict TS + verbatimModuleSyntax + erasableSyntaxOnly
│   ├── tsconfig.json / tsconfig.node.json
│   ├── eslint.config.js            ← Vite default + react-refresh/only-export-components
│   ├── vercel.json                 ← SPA fallback rewrite → /index.html
│   ├── package.json
│   ├── public/                     ← static assets (logo.png)
│   └── src/
│       ├── main.tsx                ← ReactDOM.createRoot (unchanged from Vite scaffold)
│       ├── App.tsx                 ← createBrowserRouter route tree
│       ├── api.ts                  ← singleton Axios client (ONLY file importing axios)
│       ├── types.ts                ← shared types + dashboardPathForRole() helper
│       ├── index.css               ← Tailwind directives + body reset
│       ├── context/
│       │   ├── AuthContext.ts      ← createContext + AuthContextValue type
│       │   ├── AuthProvider.tsx    ← provider component (login/register/logout)
│       │   └── useAuth.ts          ← hook (throws outside provider)
│       ├── components/
│       │   ├── RequireAuth.tsx     ← route guard: logged-in users only
│       │   ├── RequireRole.tsx     ← role guard: redirects to own dashboard on mismatch
│       │   ├── Navbar.tsx          ← authenticated role-aware nav
│       │   ├── PublicNavbar.tsx    ← guest nav (Home/FAQ/Contact + Sign In / Register)
│       │   ├── SmartNavbar.tsx     ← picks Navbar vs PublicNavbar by auth state
│       │   ├── Footer.tsx          ← shared footer (landing/contact/FAQ)
│       │   ├── PlaceholderPage.tsx ← "coming soon" wrapper for stub routes
│       │   └── Toast.tsx           ← 3s auto-dismiss toast (success/error)
│       └── pages/
│           ├── Landing.tsx, Login.tsx, Register.tsx,
│           ├── VerifyOtp.tsx, ForgotPassword.tsx, ResetPassword.tsx,
│           ├── Contact.tsx, FAQ.tsx,
│           ├── Dashboard.tsx (learner), Theory.tsx, Hazard.tsx,
│           ├── InstructorSearch.tsx, Bookings.tsx, Progress.tsx,
│           ├── InstructorDashboard.tsx, InstructorProfile.tsx,
│           ├── InstructorAvailability.tsx, InstructorBookings.tsx,
│           ├── AdminDashboard.tsx, AdminQuestions.tsx,
│           ├── AdminHazard.tsx, AdminLearners.tsx
│
└── server/                         ← Express 5 + TypeScript + Prisma 6 backend
    ├── package.json
    ├── tsconfig.json               ← commonjs, strict, rootDir src/
    ├── nodemon.json                ← watches src/ + prisma/, ext=.ts only
    ├── .env                        ← DATABASE_URL, DIRECT_URL, JWT_SECRET, GEMINI_API_KEY, SMTP_*
    ├── .env.example                ← template (safe to commit)
    ├── prisma/
    │   ├── schema.prisma           ← 8 models, Postgres datasource
    │   ├── seed.ts                 ← idempotent seed: 3 users, 45 theory, 5 hazard, 3 slots
    │   └── migrations/             ← Prisma migration history
    └── src/
        ├── index.ts                ← Express app, mounts 8 route groups + /api/health
        ├── lib/
        │   ├── prisma.ts           ← singleton PrismaClient
        │   ├── gemini.ts           ← singleton Gemini (model: gemini-2.0-flash)
        │   ├── otp.ts              ← generateOtp() via crypto.randomInt + expiresAt()
        │   └── email.ts            ← nodemailer sender (dev console fallback)
        ├── middleware/
        │   └── auth.ts             ← authenticateToken + requireRole(role)
        ├── routes/                 ← 8 route files — URL wiring only
        │   ├── auth.routes.ts, theory.routes.ts, hazard.routes.ts,
        │   ├── instructor.routes.ts, booking.routes.ts, progress.routes.ts,
        │   ├── availability.routes.ts, admin.routes.ts
        ├── controllers/            ← HTTP validation + status codes (no DB calls)
        │   ├── auth, theory, hazard, instructor, instructorProfile,
        │   ├── booking, progress, availability,
        │   ├── adminUser, adminTheory, adminHazard, adminStats, adminLearner
        └── services/               ← business logic + ALL Prisma calls
            └── (same filenames as controllers)
```

**Every file in `server/src/controllers/` has a matching `server/src/services/` file.** That pairing is enforced by §4.1 below.

---

## 3. Frontend architecture

### 3.1 Stack

- **Vite 8** (React plugin) — dev server on :5173, HMR.
- **React 19** — function components only, no classes.
- **React Router 7** in **data-router mode** (`createBrowserRouter` + `RouterProvider`).
- **Tailwind CSS 3** — utility-first, no v4. Config lives in [client/tailwind.config.js](client/tailwind.config.js).
- **Axios** — centralised in [client/src/api.ts](client/src/api.ts). No component imports `axios` directly.
- **TypeScript 5** with strict flags — see §3.8.

### 3.2 How HTTP works from the browser's point of view

1. A page component calls `api.get(...)` / `api.post(...)`.
2. The **request interceptor** in [api.ts](client/src/api.ts) reads `localStorage.getItem("token")` and attaches `Authorization: Bearer <token>` if present. Every authed route gets its JWT for free — components never touch the token.
3. Axios sends the HTTP request to `VITE_API_URL` (defaults to `http://localhost:5001` in dev). The server's CORS config (`app.use(cors())` in [server/src/index.ts](server/src/index.ts)) accepts the origin.
4. On success, the promise resolves with `{ data, status, headers }`. Components read `res.data`.
5. On error, the **response interceptor** fires. If `status === 401` it clears `localStorage` and `window.location.assign("/login")` — a **hard navigation** because the interceptor is outside the React tree and can't call `useNavigate()`. This is our replacement for a refresh-token flow.

### 3.3 Auth state (three-file context split)

Auth state lives in a **three-file** context, which is not a stylistic choice — it's required by the ESLint rule `react-refresh/only-export-components` (which forbids a `.tsx` file from exporting both a component and a non-component). Collapsing these three files into one will fail `npm run lint`.

- [client/src/context/AuthContext.ts](client/src/context/AuthContext.ts) — `createContext<AuthContextValue | undefined>(undefined)` + the `AuthContextValue` type. **No JSX, no components.**
- [client/src/context/AuthProvider.tsx](client/src/context/AuthProvider.tsx) — the `AuthProvider` component only. Holds `user`, `token`, `loading` state. Rehydrates both from `localStorage` on mount. Exposes `login`, `register`, `logout` via `useCallback`. Importantly:
  - `login(email, password)` **returns the authed User** so the caller can `navigate(dashboardPathForRole(user.role))` without racing the setState commit.
  - `register(name, email, password, role, location)` **does NOT set auth state** — the account is unverified. It returns `{ email }` so the Register page can redirect to `/verify-otp?email=...`.
- [client/src/context/useAuth.ts](client/src/context/useAuth.ts) — the `useAuth()` hook. Throws if called outside the provider.

JWT is stored in `localStorage` as `token`; the serialised user object as `user`. There is **no refresh-token flow** — the 401 interceptor is the fallback when the 7-day JWT expires.

### 3.4 Routing

[client/src/App.tsx](client/src/App.tsx) wires everything via `createBrowserRouter`. The shape:

```
AuthProvider                          ← root layout route provides auth context to ALL routes
├── Public routes (no guard)
│   /, /login, /register, /verify-otp,
│   /forgot-password, /reset-password,
│   /contact, /faq
│
└── <RequireAuth>                     ← redirects to "/" if not logged in; renders Navbar + Outlet
    ├── <RequireRole role="learner">
    │   /dashboard, /theory, /hazard, /instructors, /progress, /bookings
    ├── <RequireRole role="instructor"> (path: "instructor")
    │   /instructor/dashboard, /profile, /availability, /bookings
    └── <RequireRole role="admin"> (path: "admin")
        /admin/dashboard, /questions, /hazard, /learners

Catch-all path: "*"                   ← <Navigate to="/" replace />
```

- **Public pages that need the navbar** (Landing, Contact, FAQ, Login, Register) use [SmartNavbar.tsx](client/src/components/SmartNavbar.tsx) — it renders `<Navbar />` if logged in, else `<PublicNavbar />`. So a logged-in user visiting `/faq` still sees their role-specific nav.
- **[RequireAuth.tsx](client/src/components/RequireAuth.tsx)** renders `<><Navbar /><Outlet /></>` on the authed branch — every private route gets the navbar for free.
- **[RequireRole.tsx](client/src/components/RequireRole.tsx)** on a role mismatch redirects to **the user's own dashboard** (`dashboardPathForRole(user.role)`), not to `/dashboard`. This prevents the loop where an instructor hitting `/dashboard` would be trapped in a RequireRole("learner") redirect.

### 3.5 The `dashboardPathForRole` helper

Lives in [client/src/types.ts](client/src/types.ts) as a pure function:

```
learner    → "/dashboard"
instructor → "/instructor/dashboard"
admin      → "/admin/dashboard"
```

Single source of truth for "where does this role live". Used by Login, Register, RequireRole fallback, PlaceholderPage back-button, and the post-verify redirect.

### 3.6 Pages

All pages live in [client/src/pages/](client/src/pages/). Conventions:

- **One component per file**, default-exported.
- **Pages own their own data fetching** — `useEffect(() => { api.get(...) }, [])`. There is no React Query / SWR layer; the app is small enough that per-page state is clearer.
- **Loading & error states are inline** — a `useState<string | null>` for the error message, a ternary in the JSX. No global toast for request errors (the [Toast component](client/src/components/Toast.tsx) is used only for *action* feedback like "Booking successful!").
- **Auth pages** (Login, Register, VerifyOtp, ForgotPassword, ResetPassword) wrap the form in `<SmartNavbar /> ... <Footer />` and use a centred `max-w-md` card shell.
- **Feature pages** (Theory, InstructorSearch, Bookings, etc.) assume the navbar is already rendered by RequireAuth and start with their own `<div className="min-h-screen bg-gray-50 p-6">`.

### 3.7 Styling

- Tailwind utility classes everywhere. **No CSS modules, no styled-components, no inline `style={{}}`** except for dynamic values (e.g. progress-bar width).
- Colour palette: **blue-600** (primary), **green-600** (positive / book), **amber-500** (hazard / warn), **red-500/600** (error / logout / destructive), **gray-50** (page bg), **gray-900** (text), **gray-500** (subtext).
- **Card shell pattern** repeated throughout: `bg-white rounded-2xl shadow-sm border border-gray-100 p-6`.
- **Input shell**: `border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`.
- **Primary button**: `bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2.5 rounded-lg transition-colors text-sm`.
- Responsive: mobile-first; `md:` / `lg:` breakpoints. Both navbars collapse to a hamburger below `md`.
- No icon library — **inline SVGs** with Tailwind classes. Keeps bundle small, avoids a dependency a later phase would have to audit.

### 3.8 TypeScript strictness (three flags that bite often)

Enabled in [client/tsconfig.app.json](client/tsconfig.app.json):

- **`verbatimModuleSyntax: true`** — every type-only import **must** use `import type { ... }`. Importing `User` as a value when only used as a type fails the build.
- **`erasableSyntaxOnly: true`** — no TS `enum`s, no parameter properties. Use `type Role = "learner" | "instructor" | "admin"` string-literal unions instead.
- **`noUnusedLocals: true`** / **`noUnusedParameters: true`** — leftover imports after a refactor break the build.

### 3.9 Frontend → backend contract reference

All shared DTO types live in [client/src/types.ts](client/src/types.ts). If you change a backend response shape, update the matching type there in the same commit. Key types:

- `Role`, `User`, `AuthResponse`, `RegisterResponse`
- `TheoryQuestion`, `TheorySubmitResult`, `TheoryAnswerResult`, `TheoryExplainResponse`
- `HazardQuestion`, `HazardSubmitResult`
- `PublicInstructor`, `InstructorWithSlots`, `AvailabilitySlot`, `InstructorProfile`
- `BookingRow`, `InstructorBookingRow`
- `ProgressSummary`
- `AdminTheoryQuestion`, `AdminHazardQuestion`, `AdminLearnerRow`, `AdminStats`

---

## 4. Backend architecture

### 4.1 Layered structure — routes → controllers → services

Non-negotiable (NFR-07 in the report):

| Layer          | Responsibility                                                              | Owns Prisma? |
|----------------|------------------------------------------------------------------------------|:------------:|
| **routes/**    | URL → handler wiring, middleware (`authenticateToken`, `requireRole`)        | ❌           |
| **controllers/** | Validate `req.body` / `req.params` shapes, call services, map errors → HTTP status codes, shape JSON response | ❌           |
| **services/**  | Business rules, custom error classes, **all `prisma.*` calls**, external-API calls (Gemini, Nodemailer) | ✅           |

A controller must **never import `../lib/prisma`**. A service must **never import `express`**. New endpoints must follow this split.

### 4.2 Entry point

[server/src/index.ts](server/src/index.ts) — ~40 lines:

1. `dotenv.config()` loads `.env`.
2. **Startup check**: if `process.env.JWT_SECRET` is missing, `console.error` and `process.exit(1)`. Prevents running without the signing key.
3. `app.use(cors())` — permissive in dev; tighten for prod.
4. `app.use(express.json())` — body parser.
5. Mounts 8 route groups under `/api/...`:
   - `/api/auth` (public + protected mix)
   - `/api/theory`, `/api/hazard`, `/api/instructors`, `/api/bookings`, `/api/progress` (all require auth)
   - `/api/availability` (instructor-only)
   - `/api/admin` (`router.use(authenticateToken, requireRole("admin"))` at the top — all sub-routes admin-only)
6. `GET /api/health` → `{ status: "ok" }` for uptime probes.
7. `app.listen(PORT)` where `PORT = process.env.PORT ?? 5001`.

**Port 5001 is deliberate** — macOS Monterey+ hijacks port 5000 for AirPlay Receiver and silently 403s every request. Don't change it to 5000.

### 4.3 HTTP stack & Express 5 quirks

- **Express 5** auto-forwards rejected promises to `next()` — we don't need `express-async-errors`. But we still wrap service calls in `try/catch` in every controller because we want to **map typed error classes to HTTP codes**.
- No global error handler middleware — each controller catches its own. A bare `err` falls through to `500 { error: "Internal server error" }` with `console.error(err)`. The only exception is in [theory.controller.ts](server/src/controllers/theory.controller.ts) `explainAnswer`, which detects `GoogleGenerativeAI*` errors and returns `503` (§4.9).
- **Request shape conventions:**
  - All bodies are JSON; `Content-Type: application/json` is required.
  - URL params are strings; controllers parse with `Number(req.params.id)` and validate with `Number.isInteger && >0`.
  - Query params are always strings; cast explicitly.
- **Response shape conventions:**
  - Success responses are named-key objects: `{ instructors: [...] }`, `{ instructor: {...} }`, `{ questions: [...] }`. The frontend unwraps the key — do not return bare arrays (avoids JSON-hijacking risk historically, and gives us a place to add metadata later).
  - Error responses are always `{ error: "..." }` with the appropriate status code.
  - 204 No Content for successful delete (DELETE /api/admin/users/:id, DELETE /api/bookings/:id, DELETE /api/availability/:id).

### 4.4 Middleware

[server/src/middleware/auth.ts](server/src/middleware/auth.ts):

- **`authenticateToken(req, res, next)`** — reads `Authorization: Bearer <token>`, `jwt.verify` with `JWT_SECRET`, attaches `{ id, role }` to `req.user`. On missing/invalid token → 401. (The `req.user` type is augmented via a declaration file so TypeScript knows about it.)
- **`requireRole(role)`** — factory. Returns a middleware that checks `req.user?.role === role`; else 403. Must be used **after** `authenticateToken` in the chain.
- There is **no `requireVerified`** middleware — verification is checked inside `loginUser` before a JWT is ever issued, so any request with a valid token is by definition from a verified account.

### 4.5 Routes inventory

| Group | File | Auth | Key routes |
|---|---|---|---|
| Auth | [auth.routes.ts](server/src/routes/auth.routes.ts) | Public | `POST /register`, `/verify-signup`, `/resend-signup`, `/login`, `/forgot-password`, `/reset-password` |
| Theory | [theory.routes.ts](server/src/routes/theory.routes.ts) | Learner | `GET /questions`, `POST /submit`, `POST /explain` |
| Hazard | [hazard.routes.ts](server/src/routes/hazard.routes.ts) | Learner | `GET /questions`, `POST /submit` |
| Instructors | [instructor.routes.ts](server/src/routes/instructor.routes.ts) | Mixed | `GET /` (learner search), `GET /:id`, `GET /profile/me` (instructor), `POST /profile` (instructor), `GET /me/bookings` (instructor) |
| Bookings | [booking.routes.ts](server/src/routes/booking.routes.ts) | Learner | `POST /` (book), `GET /me`, `DELETE /:id` |
| Availability | [availability.routes.ts](server/src/routes/availability.routes.ts) | Instructor | `GET /mine`, `POST /`, `DELETE /:id` |
| Progress | [progress.routes.ts](server/src/routes/progress.routes.ts) | Learner | `GET /me` |
| Admin | [admin.routes.ts](server/src/routes/admin.routes.ts) | Admin | `router.use(authenticateToken, requireRole("admin"))` then `/users`, `/theory`, `/hazard`, `/stats`, `/learners` |

Full list with bodies/responses in §8.

### 4.6 Services — what lives where

Each service exports **custom error classes** (`ValidationError`, `NotFoundError`, `ConflictError`, `UnauthorizedError`, `ForbiddenError`) that its controller catches. This is the only way business-logic errors reach HTTP status codes.

- **[auth.service.ts](server/src/services/auth.service.ts)** — registerUser (hash + OTP), verifySignupOtp, resendSignupOtp (cooldown), loginUser (blocks unverified), forgotPassword, resetPassword. See §6.
- **[theory.service.ts](server/src/services/theory.service.ts)** — `QUESTION_COUNT=10`, `PASS_THRESHOLD=0.86`. `getQuestions()` Fisher-Yates shuffles 10 questions, strips `correctOption` before returning. `submitAnswers()` re-fetches by id, grades, writes `TestResult`. `explainAnswer()` does the cache-first Gemini flow (§4.9).
- **[hazard.service.ts](server/src/services/hazard.service.ts)** — `PASS_THRESHOLD=0.6`. Shuffles all 5 questions, strips `correctOption` + `description`, grades on submit, writes `TestResult`.
- **[instructor.service.ts](server/src/services/instructor.service.ts)** — public listing with optional `location` filter (`contains` + `mode: "insensitive"`), future-slot filter (`slotDate >= today`, `isBooked = false`).
- **[instructorProfile.service.ts](server/src/services/instructorProfile.service.ts)** — `getMyProfile(userId)`, `upsertProfile(userId, {bio, location, hourlyRate})` via `prisma.instructorProfile.upsert`.
- **[booking.service.ts](server/src/services/booking.service.ts)** — **THE** race-critical path. See §7.3.
- **[availability.service.ts](server/src/services/availability.service.ts)** — instructor-scoped CRUD on `Availability` rows.
- **[progress.service.ts](server/src/services/progress.service.ts)** — aggregates `TestResult` rows into theory/hazard/overall summaries with empty-attempts guards.
- **Admin services** — `adminUser`, `adminTheory`, `adminHazard`, `adminStats`, `adminLearner`. `adminUser.deleteUser` has two guards: **self-delete** and **last-admin** (prevents locking everyone out). `adminStats.getStats` fires 15 `count()` queries in one `prisma.$transaction([...])` array call — read-only, fast, one round-trip to the pooler.

### 4.7 Library singletons ([server/src/lib/](server/src/lib/))

- **[prisma.ts](server/src/lib/prisma.ts)** — `export const prisma = new PrismaClient()`. One instance; every service imports this. Never `new PrismaClient()` anywhere else.
- **[gemini.ts](server/src/lib/gemini.ts)** — `new GoogleGenerativeAI(GEMINI_API_KEY).getGenerativeModel({ model: "gemini-2.0-flash" })`. Model name change requires updating **this one file**.
- **[otp.ts](server/src/lib/otp.ts)** — `generateOtp()` uses `crypto.randomInt(0, 1_000_000)` (CSPRNG), zero-pads to 6 digits. `otpExpiresAt()` returns `new Date(Date.now() + 10*60*1000)`. `OTP_EXPIRY_MINUTES = 10` is exported for the resend-cooldown calculation in `auth.service.ts`.
- **[email.ts](server/src/lib/email.ts)** — lazy singleton Nodemailer transporter. If `SMTP_HOST` is unset, logs a warning at startup and falls back to `console.log(otp)` so the dev loop works without Gmail credentials. In prod, reads `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`.

### 4.8 HTTP functionality summary

The HTTP server is plain Express — **no tRPC, no GraphQL, no gRPC**. Every client-server exchange is a JSON-body HTTP request with a Bearer JWT. Content negotiation is trivial (`application/json` in, `application/json` out). CORS is permissive (`cors()`) because the client origin is known and we're not using cookies for auth — the token is in a header. Rate limiting is **not** implemented at the HTTP layer; for OTP flows we rely on the in-service 60-second cooldown (§6.4).

### 4.9 Gemini flow — the one rule that matters

**AI explanations must hit the DB cache before calling Gemini.** (Report §5.3 / FR-08 / R-03.)

In [theory.service.ts](server/src/services/theory.service.ts) `explainAnswer`:

1. `prisma.aIExplanation.findUnique({ where: { questionId_selectedOption: { ... } } })` — one indexed read.
2. If found, return the cached `explanation` string.
3. Else, call `gemini.generateContent(prompt)` (model `gemini-2.0-flash`).
4. Store the new explanation with `prisma.aIExplanation.create({...})`. On `P2002` (unique violation from a racing concurrent call), ignore and re-read the row.

The `AIExplanation` table has `@@unique([questionId, selectedOption])` **specifically** so the cache lookup is a single `findUnique` and the race is caught by the DB. Don't remove that index.

**Gemini error mapping** — [theory.controller.ts](server/src/controllers/theory.controller.ts) detects `err.constructor?.name?.startsWith("GoogleGenerativeAI")` and returns **HTTP 503** with `{ error: "AI explanation is temporarily unavailable. Please try again later." }`. The Theory page renders this string verbatim. Do **not** let Gemini errors surface as 500.

The prompt template is in `buildExplanationPrompt()` in [theory.service.ts](server/src/services/theory.service.ts). Keep it stable — the FYP evaluation depends on consistent explanation style.

---

## 5. Database & Prisma

### 5.1 Hosting

**Supabase** Postgres. Two connection strings are required in [server/.env](server/.env):

- `DATABASE_URL` — Supabase **transaction pooler** (port 6543, with `?pgbouncer=true&connection_limit=1`). Used at runtime by `PrismaClient`.
- `DIRECT_URL` — Supabase **direct connection** (port 5432). Used by `prisma migrate` because PgBouncer can't run DDL.

Both are referenced from the `datasource db` block in [schema.prisma](server/prisma/schema.prisma). If a migration ever fails with "prepared statement does not exist", the `DIRECT_URL` is the thing to check.

### 5.2 The eight models

| Model | Purpose | Key constraints |
|---|---|---|
| `User` | All roles in one table | `email @unique`, `role` string, `isVerified` boolean, `signupOtp`/`signupOtpExpires`, `resetOtp`/`resetOtpExpires` |
| `InstructorProfile` | 1:1 with User (instructors only) | `userId @unique`, FK `onDelete: Cascade` |
| `TheoryQuestion` | 45 seeded questions, 4 categories | `correctOption` = `"a"/"b"/"c"/"d"`, `category` free string |
| `AIExplanation` | Per-question-per-chosen-option cache | `@@unique([questionId, selectedOption])`, FK to TheoryQuestion `onDelete: Cascade` |
| `HazardQuestion` | 5 seeded image-based questions | `imageUrl`, `description` (shown after submit) |
| `TestResult` | One row per theory/hazard attempt | `type` = `"theory"` or `"hazard"`, `score`, `totalQuestions`, `passed`, `timeTakenSeconds` |
| `Availability` | Instructor time slots | `slotDate`/`startTime`/`endTime` as **strings** (ISO-like), `isBooked` boolean, FK to User |
| `Booking` | Confirmed lesson bookings | `availabilityId @unique` (DB-enforced no double-book), `status` = `"confirmed"`/`"cancelled"`, FKs to learner + instructor |

**Why `slotDate`/`startTime`/`endTime` are strings, not `DateTime`:** the FYP UI only ever displays them as-is and compares as strings (`slotDate >= today`). Storing as strings side-steps a raft of timezone bugs; the trade-off is you can't do date arithmetic at the DB level. Fine for this project's scope.

### 5.3 Cascades

- `User` → `InstructorProfile`, `TestResult`, `Availability`, `Booking` (as learner or instructor): all `onDelete: Cascade`. Deleting a user cleans up everything.
- `TheoryQuestion` → `AIExplanation`: `onDelete: Cascade`. Deleting a question clears its AI cache entries.
- `Availability` → `Booking`: `onDelete: Cascade`. Matches the business rule "no booking without a slot".

### 5.4 Migrations

```
cd server
npm run prisma:migrate    # creates/applies a migration, regenerates client
npx prisma generate        # regenerate client only (e.g. after pulling main)
npx prisma studio          # visual DB browser at :5555
npx prisma validate        # schema-only check, no DB call
```

The VSCode Prisma extension is on a v7-style validator and shows **false-positive errors** on `url` / `directUrl`. `npx prisma validate` is the source of truth.

### 5.5 Seed data

[server/prisma/seed.ts](server/prisma/seed.ts) is **idempotent** — re-running wipes and reseeds in FK-safe order. Creates:

| Role       | Email                 | Password | Notes |
|------------|-----------------------|----------|-------|
| admin      | admin@test.com        | admin123 | `isVerified: true` |
| instructor | instructor@test.com   | test123  | `isVerified: true`, has `InstructorProfile` (Manchester, £35/hr) + 3 availability slots |
| learner    | learner@test.com      | test123  | `isVerified: true` |

Plus 45 theory questions (road signs ×12, speed limits ×11, safety ×13, motorway rules ×9), 5 hazard questions with Unsplash image URLs, and 3 availability slots on 2026-06-15 / 06-16.

**Any new user registered through the UI starts as `isVerified: false`** and must go through the OTP flow (§6). Only the three seeded accounts above skip it.

---

## 6. Authentication system

Full deep-dive in **[AUTH.md](AUTH.md)**. Short version:

### 6.1 Flows

1. **Register** → `POST /api/auth/register` — hashes password (bcrypt cost 10), creates user with `isVerified=false`, generates 6-digit OTP, emails it. Returns `201 { user, message }`. Frontend redirects to `/verify-otp?email=...`.
2. **Verify signup OTP** → `POST /api/auth/verify-signup` `{ email, otp }`. Matches + expiry check. On success sets `isVerified=true`, clears `signupOtp`/`signupOtpExpires`. Frontend shows success and redirects to `/login`.
3. **Resend signup OTP** → `POST /api/auth/resend-signup` `{ email }`. 60-second cooldown. Always returns 200 (don't leak whether the email exists) — **except** if cooldown is active, returns `429 "Please wait N seconds"`.
4. **Login** → `POST /api/auth/login` `{ email, password }`. Blocks unverified accounts with `403 { error, code: "NOT_VERIFIED" }` — frontend catches the code and redirects to `/verify-otp`. On success returns `{ token, user }`; JWT signed with `JWT_SECRET`, 7-day expiry.
5. **Forgot password** → `POST /api/auth/forgot-password` `{ email }`. Generates a **separate** `resetOtp`/`resetOtpExpires` pair, emails it. Always returns 200.
6. **Reset password** → `POST /api/auth/reset-password` `{ email, otp, newPassword, confirmPassword }`. Validates OTP + expiry, hashes + stores new password, clears reset OTP.

### 6.2 OTP generation

`crypto.randomInt(0, 1_000_000).toString().padStart(6, "0")` — CSPRNG, uniform, never uses `Math.random`. 10-minute expiry stored as a `DateTime` column.

### 6.3 Email sender

[email.ts](server/src/lib/email.ts) uses Nodemailer with Gmail SMTP. Required env vars: `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`, `SMTP_USER=<gmail>`, `SMTP_PASS=<16-char app password, NO spaces>`, `SMTP_FROM="DriveReady221 <...>"`.

**Gmail App Password gotcha:** Google's UI displays it as `abcd efgh ijkl mnop` (19 chars including spaces). Paste into `.env` **without spaces** → exactly 16 chars. If it's 19, SMTP fails silently.

If `SMTP_HOST` is unset, the server falls back to logging OTPs to the terminal — **intended** for dev. The server still returns 200 to the user.

### 6.4 Cooldown

60 seconds between OTP resends, enforced in `auth.service.ts` by subtracting `OTP_EXPIRY_MINUTES*60*1000` from the stored `*OtpExpires` timestamp to derive `generatedAt`. Returns `429` if too soon.

### 6.5 Security invariants

- **`passwordHash` is never returned.** Every service's `select: {}` clause excludes it. Never shortcut with `findUnique` + return — always project.
- **Enumeration protection**: login returns `"Invalid email or password"` for both wrong-email and wrong-password. Forgot/resend returns 200 regardless of existence.
- **No refresh tokens.** 7-day JWT; on expiry the 401 interceptor forces re-login.
- **Email is normalised to lowercase + trimmed** at the controller boundary before every DB lookup, so the `email @unique` constraint is effective.

---

## 7. Feature-by-feature system documentation

### 7.1 Theory test

- **Route:** learner `/theory`. UI: [Theory.tsx](client/src/pages/Theory.tsx).
- **Start flow:** `GET /api/theory/questions` → server Fisher-Yates shuffles 10 random questions, strips `correctOption`. Client starts a **6-minute countdown** (`TIME_LIMIT = 6*60`). Auto-submits at 0.
- **Submit:** `POST /api/theory/submit { answers: [{questionId, selected}], timeTakenSeconds }`. Server re-fetches by id, grades, writes `TestResult { type: "theory" }`. Returns per-question `{ correct, correctOption }` + totals + `passed` (≥ 86%).
- **Explain a wrong answer:** `POST /api/theory/explain { questionId, selectedOption }`. Cache-first Gemini (§4.9). 503 on Gemini outage — UI shows the friendly message.

### 7.2 Hazard perception

- **Route:** learner `/hazard`. UI: [Hazard.tsx](client/src/pages/Hazard.tsx).
- **5 image questions**, 60% to pass. Same submit-then-grade pattern as theory. The `description` field is included in the submit response so the UI can show "why this was the hazard".
- No AI explanation for hazard — the `description` is authored by the admin.

### 7.3 Instructor marketplace & bookings

- **Learner search:** `GET /api/instructors?location=Manchester` → returns array with only *future, unbooked* availability slots per instructor. Location filter is `contains` + `mode: "insensitive"`.
- **Learner detail:** `GET /api/instructors/:id` → one instructor with its slot list.
- **Learner books:** `POST /api/bookings { availabilityId }`. **This is the one place where a race matters.** [booking.service.ts](server/src/services/booking.service.ts) wraps the logic in `prisma.$transaction(async tx => { ... })`:
  1. Re-fetch the slot **inside the transaction**.
  2. Check `isBooked === false`; else throw `ConflictError` → 409.
  3. `tx.booking.create({ learnerId, instructorId, availabilityId, status: "confirmed" })`.
  4. `tx.availability.update({ where: { id }, data: { isBooked: true } })`.
  - If two users race and both pass the step-2 check, step 3 fails with Prisma `P2002` on `Booking.availabilityId @unique` → also mapped to 409. Defence in depth.
- **Learner cancels:** `DELETE /api/bookings/:id` — only the owning learner; sets `booking.status="cancelled"` and flips `availability.isBooked=false` in a transaction.
- **Instructor view:** `GET /api/instructors/me/bookings` lists all bookings against their slots.
- **Instructor availability CRUD:** `/api/availability/*` — instructor-only. Delete is blocked (409) if the slot already has a booking.

### 7.4 AI explanations (cache economics)

- Table: `AIExplanation`. Rows: `{ questionId, selectedOption, explanation, createdAt }`.
- Worst case: 45 theory questions × 4 options = **180 Gemini calls ever**, and only the subset learners actually pick. After one week of use the cache is hot; Gemini free-tier quota is not a concern.
- Don't try to "improve" by regenerating explanations periodically — risk R-03 in the report explicitly calls this out.

### 7.5 Progress

- `GET /api/progress/me` (learner). Aggregates `TestResult` rows into `{ theory: { attempts, averageScore, passRate }, hazard: {...}, overall: {...} }`. Empty-attempts guard returns zeros instead of `NaN`.

### 7.6 Admin panel

- `/api/admin/*` gated by `router.use(authenticateToken, requireRole("admin"))` at the top of [admin.routes.ts](server/src/routes/admin.routes.ts).
- **Users:** `GET /users?role=learner`, `DELETE /users/:id` (self-delete guard + last-admin guard).
- **Theory questions:** full CRUD — list, create, update, delete (cascades to AIExplanation).
- **Hazard questions:** full CRUD — no cascade concerns since `TestResult` doesn't store answer sheets.
- **Learners:** `GET /learners` (list with `_count: { testResults }`), `GET /learners/:id/results` (full result history).
- **Stats:** `GET /stats` — 15 `count()` queries in one transaction (users by role, questions, attempts by type, pass rates, bookings by status, slots by bookedness).

---

## 8. API reference

All requests are JSON. All protected routes require `Authorization: Bearer <jwt>`. Error responses are `{ error: "..." }` with the appropriate status code.

### 8.1 Auth (`/api/auth`, public)

| Method | Path | Body | Success | Notable errors |
|---|---|---|---|---|
| POST | `/register` | `{ name, email, password, role, location? }` | `201 { user, message }` | 400 validation, 409 email in use |
| POST | `/verify-signup` | `{ email, otp }` | `200 { user, message }` | 400 invalid/expired |
| POST | `/resend-signup` | `{ email }` | `200 { message }` | 429 cooldown |
| POST | `/login` | `{ email, password }` | `200 { token, user }` | 401 bad creds, 403 `{error, code: "NOT_VERIFIED"}` |
| POST | `/forgot-password` | `{ email }` | `200 { message }` | 429 cooldown |
| POST | `/reset-password` | `{ email, otp, newPassword, confirmPassword }` | `200 { message }` | 400 invalid/expired/mismatch |

### 8.2 Theory (`/api/theory`, auth)

| Method | Path | Body/Query | Success |
|---|---|---|---|
| GET | `/questions` | — | `200 { questions: [...] }` (correctOption stripped) |
| POST | `/submit` | `{ answers: [{questionId, selected}], timeTakenSeconds }` | `200 { results, score, totalQuestions, passed }` |
| POST | `/explain` | `{ questionId, selectedOption }` | `200 { explanation }` / 503 on Gemini outage |

### 8.3 Hazard (`/api/hazard`, auth)

| Method | Path | Body | Success |
|---|---|---|---|
| GET | `/questions` | — | `200 { questions: [...] }` (correctOption + description stripped) |
| POST | `/submit` | `{ answers: [...], timeTakenSeconds }` | `200 { results, score, totalQuestions, passed }` (description included in result) |

### 8.4 Instructors (`/api/instructors`, auth)

| Method | Path | Body/Query | Success | Role |
|---|---|---|---|---|
| GET | `/` | `?location=...` | `200 { instructors: [...] }` (future unbooked slots only) | learner |
| GET | `/:id` | — | `200 { instructor: {...with slots...} }` | learner |
| GET | `/profile/me` | — | `200 { profile }` or `{ profile: null }` | instructor |
| POST | `/profile` | `{ bio?, location, hourlyRate }` | `200 { profile }` (upsert) | instructor |
| GET | `/me/bookings` | — | `200 { bookings: [...] }` | instructor |

### 8.5 Bookings (`/api/bookings`, auth/learner)

| Method | Path | Body | Success |
|---|---|---|---|
| POST | `/` | `{ availabilityId }` | `201 { booking }` / 409 already booked |
| GET | `/me` | — | `200 { bookings: [...] }` |
| DELETE | `/:id` | — | `204` / 403 not owner / 404 |

### 8.6 Availability (`/api/availability`, auth/instructor)

| Method | Path | Body | Success |
|---|---|---|---|
| GET | `/mine` | — | `200 { slots: [...] }` |
| POST | `/` | `{ slotDate, startTime, endTime }` | `201 { slot }` |
| DELETE | `/:id` | — | `204` / 409 slot is booked / 403 not owner |

### 8.7 Progress (`/api/progress`, auth/learner)

| Method | Path | Success |
|---|---|---|
| GET | `/me` | `200 { progress: { theory, hazard, overall } }` |

### 8.8 Admin (`/api/admin`, auth + admin)

| Group | Method | Path | Body/Query | Success |
|---|---|---|---|---|
| Users | GET | `/users?role=...` | — | `200 { users: [...] }` |
| | DELETE | `/users/:id` | — | `204` / 409 self-delete / 409 last admin |
| Theory | GET | `/theory` | — | `200 { questions: [...] }` (full fields) |
| | POST | `/theory` | `{ questionText, optionA-D, correctOption, category }` | `201 { question }` |
| | PUT | `/theory/:id` | same | `200 { question }` |
| | DELETE | `/theory/:id` | — | `204` |
| Hazard | full CRUD pattern with `{ imageUrl, ..., description }` | | | |
| Learners | GET | `/learners` | — | `200 { learners: [...] }` |
| | GET | `/learners/:id/results` | — | `200 { results: [...] }` |
| Stats | GET | `/stats` | — | `200 { stats: {...} }` |

---

## 9. Sequence flows (request lifecycle)

### 9.1 Learner takes a theory test

```
[User] clicks "Start test" in Theory.tsx
  → GET /api/theory/questions
    → theory.routes → authenticateToken → theory.controller.getQuestions
      → theory.service.getQuestions() → prisma.theoryQuestion.findMany + shuffle + strip
    ← 200 { questions: [...] }
  Theory.tsx starts 6-min countdown, renders 10 questions

[User] picks answers, clicks Submit
  → POST /api/theory/submit { answers, timeTakenSeconds }
    → theory.controller.submitAnswers (validates body shape)
      → theory.service.submitAnswers (grades + writes TestResult)
    ← 200 { results, score, passed }
  UI renders score + per-question feedback with "Explain" buttons

[User] clicks "Explain" on a wrong answer
  → POST /api/theory/explain { questionId, selectedOption }
    → theory.controller.explainAnswer
      → theory.service.explainAnswer
        → prisma.aIExplanation.findUnique   (cache hit? return immediately)
        → else gemini.generateContent()
        → prisma.aIExplanation.create (P2002 → re-read)
    ← 200 { explanation }  OR  503 on Gemini outage
```

### 9.2 Learner books a lesson (race-safe)

```
[User] clicks "Book" on a slot in InstructorSearch.tsx
  → POST /api/bookings { availabilityId }
    → booking.controller.createBooking
      → booking.service.createBooking
        → prisma.$transaction(async tx => {
            slot = tx.availability.findUnique(...)
            if slot.isBooked → throw ConflictError → 409
            tx.booking.create(...)
            tx.availability.update({ isBooked: true })
          })
          ↑ If two users race and both see isBooked=false, step 3
            fails with Prisma P2002 (Booking.availabilityId @unique) → also 409.
    ← 201 { booking }   OR   409 { error: "slot already booked" }
  On 409, UI re-fetches the instructor's slots so the stale slot disappears.
```

### 9.3 Unverified user tries to log in

```
[User] submits /login form
  → POST /api/auth/login { email, password }
    → auth.service.loginUser
      → user found + password matches
      → user.isVerified === false → throw ForbiddenError
    ← 403 { error: "Please verify your email...", code: "NOT_VERIFIED" }
  Login.tsx sees code==="NOT_VERIFIED" → navigate(`/verify-otp?email=...`)
```

### 9.4 Token expires mid-session

```
[User] navigates to /bookings 8 days after login
  → GET /api/bookings/me with stale JWT
    → authenticateToken → jwt.verify throws → 401
  api.ts response interceptor sees 401
    → localStorage.removeItem("token" | "user")
    → window.location.assign("/login")   (hard nav, bypasses React Router)
  User sees login page, logs in fresh.
```

---

## 10. File connections / dependency map

**Frontend import graph (high level):**

```
main.tsx
  → App.tsx
      → AuthProvider (context/AuthProvider.tsx)
          → api.ts
          → types.ts
      → RequireAuth.tsx → Navbar.tsx → useAuth.ts
      → RequireRole.tsx → types.ts (dashboardPathForRole)
      → pages/*.tsx
          → api.ts                   (every page that fetches data)
          → types.ts                 (DTO types)
          → useAuth.ts               (auth-aware pages)
          → components/Toast.tsx     (action feedback)
          → components/SmartNavbar   (public pages)
          → components/Footer        (public pages)
          → components/PlaceholderPage (stub pages)
```

**Backend import graph (high level):**

```
index.ts
  → routes/*.routes.ts
      → middleware/auth.ts (authenticateToken, requireRole)
      → controllers/*.controller.ts
          → services/*.service.ts
              → lib/prisma.ts
              → lib/gemini.ts        (theory.service only)
              → lib/email.ts         (auth.service only)
              → lib/otp.ts           (auth.service only)
              → bcrypt, jsonwebtoken (auth.service)
```

Never import sideways across layers (route → service, controller → controller, service → controller). The graph is a DAG by design.

---

## 11. Styling / UI system

See §3.7 for the short version. Design tokens in use:

- **Typography:** `font-bold` headings, `font-medium` buttons + labels, `text-gray-900` primary text, `text-gray-500` subtext.
- **Radii:** `rounded-lg` (inputs, buttons, small cards), `rounded-2xl` (feature cards, main card shells).
- **Shadows:** `shadow-sm` (resting), `shadow-md` (hover on feature cards).
- **Transitions:** only `transition-colors` on buttons and `transition-shadow` on cards. No custom keyframes; no Framer Motion.
- **Dark mode:** not implemented. Out of scope for FYP.

---

## 12. Environment variables

### 12.1 Server ([server/.env](server/.env)) — all required except where noted

| Variable | Purpose | Example |
|---|---|---|
| `DATABASE_URL` | Supabase **pooler** (runtime) | `postgresql://...:6543/postgres?pgbouncer=true&connection_limit=1` |
| `DIRECT_URL` | Supabase **direct** (migrations only) | `postgresql://...:5432/postgres` |
| `JWT_SECRET` | HS256 signing key. Startup aborts if missing. | Long random string (≥ 32 chars) |
| `GEMINI_API_KEY` | Google AI Studio key | `AIza...` |
| `PORT` | Express port | `5001` |
| `SMTP_HOST` | Gmail SMTP host (optional in dev — unset → console fallback) | `smtp.gmail.com` |
| `SMTP_PORT` | | `587` |
| `SMTP_USER` | Gmail address | `you@gmail.com` |
| `SMTP_PASS` | **16-char Gmail App Password, NO spaces** | `abcdefghijklmnop` |
| `SMTP_FROM` | RFC-5322 `From` header | `"DriveReady221 <you@gmail.com>"` |

### 12.2 Client ([client/.env](client/.env))

| Variable | Purpose | Example |
|---|---|---|
| `VITE_API_URL` | Backend base URL (no trailing slash) | `http://localhost:5001` |

Vite only exposes variables prefixed `VITE_` to the client bundle. Don't put secrets here — this file is baked into the JS sent to the browser.

Templates are checked in as `.env.example` in both subpackages.

---

## 13. Local development workflow

### 13.1 One-time setup (fresh clone)

```
# Install deps into both subpackages (never at the root)
cd server && npm install
cd ../client && npm install

# Or use the root convenience script:
npm run install:all

# Create server/.env from the template and fill in DATABASE_URL, DIRECT_URL,
# JWT_SECRET, GEMINI_API_KEY, and the SMTP_* block.
cp server/.env.example server/.env

# Create client/.env from its template.
cp client/.env.example client/.env

# Apply migrations + seed
cd server
npm run prisma:migrate
npm run prisma:seed
```

### 13.2 Daily development

Two terminals:

```
# Terminal 1
cd server && npm run dev          # nodemon → :5001

# Terminal 2
cd client && npm run dev          # Vite → :5173
```

Or from the repo root:

```
npm run dev:server
npm run dev:client
```

Open http://localhost:5173. Log in with `learner@test.com` / `test123`.

### 13.3 Nodemon caveat

[server/nodemon.json](server/nodemon.json) watches `src/` and `prisma/`, extension `ts` only. It does **not** watch `.env` — editing environment variables requires a **manual restart** (Ctrl+C, re-run `npm run dev`).

### 13.4 Common tasks

```
# Server type-check without emitting
cd server && npx tsc --noEmit

# Client type-check + build (runs tsc then vite build)
cd client && npm run build

# Client lint
cd client && npm run lint

# Open the DB in a GUI
cd server && npx prisma studio     # :5555

# Reset & reseed the DB (destructive — wipes every table)
cd server && npm run prisma:seed
```

### 13.5 Port 5000 trap

macOS Monterey+ reserves port 5000 for AirPlay Receiver. It silently 403s every request. Our dev port is **5001** for that reason. If you must use 5000, disable AirPlay Receiver in System Settings → General → AirDrop & Handoff.

---

## 14. Deployment overview

**Budget-free split deployment.**

### 14.1 Client — Vercel

- Project root: `client/`.
- Framework preset: **Vite**.
- Build command: `npm run build`. Output dir: `dist`.
- SPA fallback: [client/vercel.json](client/vercel.json) rewrites all paths to `/index.html` (without it, deep-linking `/dashboard` 404s on refresh).
- Env var in Vercel dashboard: `VITE_API_URL` → the Render backend URL (no trailing slash).

### 14.2 Server — Render

- Project root: `server/`.
- Build command: `npm install && npx prisma generate && npm run build`.
- Start command: `npm run start`.
- Env vars in Render dashboard: the full [server/.env](server/.env) variable set (§12.1). Especially: `DATABASE_URL` (Supabase pooler) and `DIRECT_URL` (direct; needed if migrations are run from Render).
- Free tier sleeps after 15 min of inactivity — first request after sleep takes ~30 s. A UptimeRobot ping on `/api/health` keeps it warm during demo days.

### 14.3 Database — Supabase (already live)

- No deploy step; hosted continuously. Run `npm run prisma:migrate` from local (or Render shell) after schema changes.

### 14.4 Post-deploy smoke test

1. `curl https://<backend>/api/health` → `{"status":"ok"}`.
2. Open the Vercel URL, sign up with a fresh email, check inbox for OTP.
3. Verify, log in, take a theory test end-to-end.

---

## 15. Use cases (from the FYP report)

Quick reference — full UC narratives live in `report fyp.pdf`:

| UC | Actor | Summary | Implementation |
|---|---|---|---|
| UC-01 | Guest | Register a new account | /register → /verify-otp → /login |
| UC-02 | Learner | Take a theory test | /theory — 10Q, 6min, ≥86% pass |
| UC-03 | Learner | Ask for AI explanation | Explain button in Theory results |
| UC-04 | Learner | Take a hazard test | /hazard — 5Q, ≥60% pass |
| UC-05 | Learner | Search instructors | /instructors — optional location filter |
| UC-06 | Learner | Book a lesson | POST /api/bookings (transaction-safe) |
| UC-07 | Learner | View own progress | /progress |
| UC-08 | Instructor | Manage availability | /instructor/availability |
| UC-09 | Instructor | View incoming bookings | /instructor/bookings |
| UC-10 | Instructor | Edit profile | /instructor/profile |
| UC-11 | Admin | CRUD theory questions | /admin/questions |
| UC-12 | Admin | CRUD hazard questions | /admin/hazard |
| UC-13 | Admin | View learners + results | /admin/learners |
| UC-14 | Admin | View platform stats | /admin/dashboard (GET /api/admin/stats) |
| UC-15 | Any | Forgot password | /forgot-password → /reset-password |

---

## 16. Roadmap — how the project was built

Built in ordered **phases** (plan files for each live in `~/.claude/plans/`). Phase status as of today:

| Phase | Scope | Status |
|---|---|---|
| 1–5 | Repo scaffolding, Prisma schema, seed data, server health route | ✅ |
| 6–9 | Auth (register, login, JWT middleware, bcrypt) | ✅ |
| 10–13 | Theory questions, submit, AI explain (Gemini + cache), client Theory UI | ✅ |
| 14 | Role-aware dashboards, navbar, placeholder routes for every page | ✅ |
| 15 | Hazard perception (backend + client UI) | ✅ |
| 16 | Instructor marketplace — search, profile, availability, bookings | ✅ |
| 17 | Learner bookings + progress | ✅ |
| 18 | Admin panel — CRUD + stats + learner drill-down | ✅ |
| 19 | Public pages (Landing, Contact, FAQ) + Tailwind polish | ✅ |
| +  | OTP email verification + forgot-password | ✅ |

**Current open items:**

- End-to-end testing pass against the FYP report's functional-requirement checklist (report §10.4).
- Demo script for viva.
- Supabase credential rotation (see report risk register).

---

## 17. Maintenance guide

### 17.1 "I need to add a new route"

1. **Schema change?** Edit [schema.prisma](server/prisma/schema.prisma), run `npm run prisma:migrate`.
2. **Write the service** in `server/src/services/<name>.service.ts` — all Prisma calls, business logic, custom error classes.
3. **Write the controller** in `server/src/controllers/<name>.controller.ts` — validate request, call service, map errors to status codes. **Never import Prisma.**
4. **Wire routes** in `server/src/routes/<name>.routes.ts`. Add auth middleware as needed.
5. **Mount** the router in [server/src/index.ts](server/src/index.ts).
6. **Add the DTO type** to [client/src/types.ts](client/src/types.ts).
7. **Call from a page** via `api.get(...)` / `api.post(...)` — never `axios` directly.
8. **Smoke-test** with curl + a browser click-through.

### 17.2 "I need to add a new page"

1. Create `client/src/pages/<Name>.tsx` — one default-exported component.
2. If it's a stub, render `<PlaceholderPage title="..." subtitle="..." />`.
3. Import it in [App.tsx](client/src/App.tsx) and add to the correct role branch inside `<RequireAuth>`.
4. Add the link to [Navbar.tsx](client/src/components/Navbar.tsx) under the correct role array (`LINKS_BY_ROLE`).
5. Run `npm run lint && npm run build` in `client/` — this catches `verbatimModuleSyntax` and unused-import breakage early.

### 17.3 "The AI stopped working"

- Check [server/src/lib/gemini.ts](server/src/lib/gemini.ts) — model name is `gemini-2.0-flash`. Google retires minor models from the free tier periodically; if `404 not supported for generateContent` appears in the server log, bump to the latest successor on the free tier.
- Check `GEMINI_API_KEY` — quota limits are per-key.
- Server log `GoogleGenerativeAI*` errors surface to the client as 503. The learner sees "AI explanation is temporarily unavailable" — that's by design (§4.9).

### 17.4 "Emails stopped sending"

1. Is `SMTP_HOST` set in [server/.env](server/.env)? Unset → dev console fallback (by design).
2. Is `SMTP_PASS` exactly 16 chars with **no spaces**? (See §6.3.) Gmail's UI formats as `abcd efgh ...` — strip the spaces.
3. Did you save `.env` and **restart** nodemon? It doesn't watch `.env` (§13.3).
4. Gmail App Passwords require **2-Step Verification on the Google account**. Without it, the "App passwords" UI doesn't even appear.
5. Server log line on success: `[email] sent "DriveReady221 — Verify your email" to <addr>`. Absence = SMTP error.

### 17.5 "Migrations fail with weird errors"

- "prepared statement does not exist" → Prisma is using `DATABASE_URL` (pooler) for migrations. Set `DIRECT_URL` in `.env` and make sure the `datasource` block references both.
- "enum type already exists" → a partial migration left state behind. `npx prisma migrate resolve --applied <migration_name>` after inspecting the DB.
- **Never** run `prisma migrate reset` against the Supabase DB unless you're prepared to re-seed from scratch — it drops all data.

### 17.6 "I need to upgrade a pinned dep"

The following are pinned and the reasons matter. Bumping requires deliberate effort, not blind `npm update`:

- **Prisma 6 / @prisma/client 6** — Prisma 7 deprecates `url`/`directUrl` in `schema.prisma` and pushes to `prisma.config.ts` with a new generator. The spec assumes v6.
- **TypeScript 5 / @types/node 20** — `ts-node@10` does not support TS 6 yet.
- **Tailwind CSS 3** (not v4) — v4 has a different setup flow (no `@tailwind` directives, no `tailwind.config.js`).
- **Express 5** (not v4) — mostly compatible; the main upside is automatic async error forwarding.

If you need to bump these, do it deliberately and update this file.

### 17.7 Invariants — don't break these

1. **`passwordHash` never leaves the server.** Every service `select` clause excludes it.
2. **`correctOption` is stripped from learner-facing question payloads.** Only included on submit results.
3. **AI cache hit must precede Gemini call.** §4.9. Removing the `@@unique` index on `AIExplanation` breaks the race-safety.
4. **Bookings use a transaction + DB unique constraint.** §7.3. Removing either makes double-booking possible.
5. **Controllers don't import Prisma; services don't import Express.** §4.1.
6. **Auth context is a three-file split.** §3.3. Merging them fails lint.
7. **Port 5001, not 5000.** §13.5.
8. **The three-file auth context + ESLint's `react-refresh/only-export-components`** — don't add a hook, type, or constant export to a `.tsx` file that also default-exports a component. Move it to a sibling `.ts` file.
9. **Use `import type { ... }`** for every type-only import. §3.8.

### 17.8 When in doubt

1. Is the change in `report fyp.pdf`? If not, ask before adding.
2. Does an existing function/utility already do this? Reuse before creating.
3. Does the change preserve §17.7? If a "fix" requires breaking one of those, stop and ask.

---

## 18. Commenting & clarity requirements

Every non-trivial file in this codebase should open with a short doc-comment describing:

- **What** the module is (one line).
- **Responsibilities** (3–5 bullets).
- **Data flow / callers** — who imports this, what it imports.

Inside functions, comments explain **why**, not **what**. Examples that pass review:

- `// Same error for "not found" and "wrong password" — don't leak existence.`
- `// Cooldown guard (same logic as resend) — prevents SMTP spam.`
- `// Prisma P2002 here means a concurrent caller already wrote the row — refetch.`

Examples that fail review (redundant, paraphrases the line below):

- `// Get user by email`
- `// Increment count`

When you add code to this repo, bring the comment discipline with it. The FYP report's assessors will read this codebase; clarity matters.

---

*Last rewritten in a single pass on 2026-04-15. Keep this file current — when you change an architecture rule, update the relevant section.*
