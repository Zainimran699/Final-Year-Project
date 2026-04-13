# AUTH.md — Authentication System Documentation

> **DriveReady221** — UK Driving Theory & Hazard Perception Training Platform  
> Author: Zain Imran | Supervisor: Mohsen Zahedi

This document covers the complete authentication system: registration with email OTP verification, login, forgot-password, and password reset flows. It is intended as a reference for understanding, maintaining, and extending the auth subsystem.

---

## Table of Contents

1. [Project Structure](#1-project-structure)
2. [Feature Overview](#2-feature-overview)
3. [Database Schema (Auth Fields)](#3-database-schema-auth-fields)
4. [Backend Architecture](#4-backend-architecture)
5. [Frontend Architecture](#5-frontend-architecture)
6. [Functional Flows](#6-functional-flows)
7. [API Reference](#7-api-reference)
8. [Security Design](#8-security-design)
9. [Email Configuration](#9-email-configuration)
10. [Change & Maintenance Guide](#10-change--maintenance-guide)

---

## 1. Project Structure

### Auth-related files at a glance

```
server/
├── prisma/
│   ├── schema.prisma            # User model with OTP/verification fields
│   └── seed.ts                  # Seeded test users (isVerified: true)
├── src/
│   ├── lib/
│   │   ├── otp.ts               # OTP generation (crypto.randomInt) + expiry
│   │   └── email.ts             # Nodemailer: signup OTP + reset OTP emails
│   ├── services/
│   │   └── auth.service.ts      # Business logic: register, verify, login, reset
│   ├── controllers/
│   │   └── auth.controller.ts   # HTTP validation + error-to-status mapping
│   ├── routes/
│   │   └── auth.routes.ts       # 6 POST routes under /api/auth
│   └── middleware/
│       └── auth.middleware.ts    # JWT verification + role guard (non-auth routes)
└── .env.example                 # SMTP config template

client/
├── src/
│   ├── context/
│   │   ├── AuthContext.ts       # createContext + AuthContextValue type
│   │   ├── AuthProvider.tsx     # State management: login, register, logout
│   │   └── useAuth.ts          # useAuth() hook
│   ├── components/
│   │   ├── RequireAuth.tsx      # Route guard: redirects to /login if unauthenticated
│   │   ├── RequireRole.tsx      # Route guard: redirects on role mismatch
│   │   ├── SmartNavbar.tsx      # Shows PublicNavbar or Navbar based on auth state
│   │   ├── Navbar.tsx           # Authenticated user navbar (role-specific links)
│   │   └── PublicNavbar.tsx     # Guest navbar (Home, FAQ, Contact, Sign In, Register)
│   ├── pages/
│   │   ├── Login.tsx            # Email + password login
│   │   ├── Register.tsx         # Account creation form
│   │   ├── VerifyOtp.tsx        # Signup OTP verification
│   │   ├── ForgotPassword.tsx   # Email entry for password reset
│   │   └── ResetPassword.tsx    # OTP + new password form
│   ├── api.ts                   # Axios instance with JWT interceptor
│   └── types.ts                 # User, Role, AuthResponse, RegisterResponse types
└── .env.example                 # VITE_API_URL
```

---

## 2. Feature Overview

| Feature | Description |
|---------|-------------|
| **Registration** | Creates an unverified account. Emails a 6-digit signup OTP. No auto-login. |
| **OTP Verification** | User enters the OTP to activate their account. OTP expires in 10 minutes. |
| **Resend OTP** | Re-generates and re-sends the signup OTP. 60-second cooldown between resends. |
| **Login** | Email + password authentication. Blocked (403) if the account is not verified. |
| **Forgot Password** | Sends a separate reset OTP to the user's email. Does not reveal account existence. |
| **Reset Password** | Validates the reset OTP, then updates the password hash. OTP cleared on success. |
| **Session Persistence** | JWT + user object stored in `localStorage`. Rehydrated on page refresh. |
| **Auto-Logout** | Axios 401 interceptor clears localStorage and redirects to `/login`. |
| **Role-Based Routing** | `RequireAuth` guards private routes; `RequireRole` gates role-specific sections. |

---

## 3. Database Schema (Auth Fields)

The `User` model in `server/prisma/schema.prisma` contains these auth-related fields:

```
model User {
  id               Int       @id @default(autoincrement())
  name             String
  email            String    @unique
  passwordHash     String                          # bcrypt hash (cost=10)
  role             String                          # "learner" | "instructor" | "admin"
  location         String?
  createdAt        DateTime  @default(now())

  // --- Email verification ---
  isVerified       Boolean   @default(false)       # Flipped to true after OTP verification
  signupOtp        String?                         # 6-digit code, cleared after verification
  signupOtpExpires DateTime?                       # 10 minutes from generation

  // --- Password reset ---
  resetOtp         String?                         # Separate from signup OTP
  resetOtpExpires  DateTime?                       # 10 minutes from generation
}
```

**Key design decisions:**
- Signup and reset OTPs use **separate fields** so one flow never interferes with the other.
- `isVerified` defaults to `false` — login is blocked until the signup OTP is verified.
- OTP fields are set to `null` after successful verification/reset (single-use).
- Migration: `20260413200937_add_otp_verification_fields`

**Seeded test users** (`server/prisma/seed.ts`) all have `isVerified: true`:

| Role | Email | Password |
|------|-------|----------|
| admin | admin@test.com | admin123 |
| instructor | instructor@test.com | test123 |
| learner | learner@test.com | test123 |

---

## 4. Backend Architecture

The backend follows the **routes -> controllers -> services** layered pattern.

### 4.1 OTP Utility (`server/src/lib/otp.ts`)

| Export | Purpose |
|--------|---------|
| `generateOtp()` | Returns a 6-digit zero-padded string using `crypto.randomInt` (CSPRNG). |
| `otpExpiresAt()` | Returns a `Date` 10 minutes in the future. |
| `OTP_EXPIRY_MINUTES` | Constant: `10` |

### 4.2 Email Utility (`server/src/lib/email.ts`)

| Export | Purpose |
|--------|---------|
| `sendSignupOtpEmail(to, name, otp)` | Sends HTML email with the signup verification code. |
| `sendResetOtpEmail(to, name, otp)` | Sends HTML email with the password reset code. |

**Dev fallback:** If `SMTP_HOST` is not set in `.env`, emails are logged to the server console instead of being sent via SMTP. The OTP appears in the terminal output so you can copy it during development.

**Error handling:** Email failures are logged but never thrown. The OTP is already stored in the database, so a resend can retry.

### 4.3 Auth Service (`server/src/services/auth.service.ts`)

Contains all business logic. Six exported functions:

| Function | Logic |
|----------|-------|
| `registerUser(input)` | Checks for duplicate email, hashes password (bcrypt, cost=10), generates signup OTP, creates unverified user row, fires off OTP email. Returns safe user (no passwordHash). |
| `verifySignupOtp(email, otp)` | Finds user, checks `isVerified` is false, validates OTP match + expiry, sets `isVerified = true`, clears OTP fields. |
| `resendSignupOtp(email)` | Checks 60-second cooldown (calculated from `signupOtpExpires - 10min`), generates new OTP, updates DB, sends email. Silent return if email not found. |
| `loginUser(input)` | Validates credentials with bcrypt, checks `isVerified`, issues JWT (7-day expiry) with `{ id, role }` payload. |
| `forgotPassword(email)` | Generates reset OTP with 60-second cooldown, stores in DB, sends email. Silent if email not found. |
| `resetPassword(email, otp, newPassword)` | Validates reset OTP + expiry, hashes new password, updates DB, clears OTP fields. |

**Custom error classes** (caught by the controller for HTTP status mapping):

| Error Class | HTTP Status |
|-------------|-------------|
| `ConflictError` | 409 |
| `UnauthorizedError` | 401 |
| `ForbiddenError` | 403 |
| `ValidationError` | 400 (or 429 for cooldown) |

### 4.4 Auth Controller (`server/src/controllers/auth.controller.ts`)

Each handler:
1. Validates request body shape (types, lengths, format).
2. Normalizes email: `email.trim().toLowerCase()`.
3. Calls the corresponding service function.
4. Catches typed errors and maps them to HTTP status codes.
5. Returns JSON response with `user`, `token`, `message`, or `error`.

### 4.5 Auth Routes (`server/src/routes/auth.routes.ts`)

All routes are **public** (no `authenticateToken` middleware) — they handle operations that happen before the user has a JWT.

```
POST /api/auth/register         -> register()
POST /api/auth/verify-signup    -> verifySignup()
POST /api/auth/resend-signup    -> resendSignup()
POST /api/auth/login            -> login()
POST /api/auth/forgot-password  -> forgotPassword()
POST /api/auth/reset-password   -> resetPassword()
```

---

## 5. Frontend Architecture

### 5.1 Auth Context (3-file split)

The auth state is split across three files to satisfy ESLint's `react-refresh/only-export-components` rule:

| File | Contents |
|------|----------|
| `client/src/context/AuthContext.ts` | `createContext` + `AuthContextValue` type definition. No JSX. |
| `client/src/context/AuthProvider.tsx` | `AuthProvider` component. Holds `user`, `token`, `loading` state. Exposes `login`, `register`, `logout` via `useCallback`. Rehydrates from `localStorage` on mount. |
| `client/src/context/useAuth.ts` | `useAuth()` hook. Throws if used outside `AuthProvider`. |

**Key behaviors:**
- `login(email, password)` -> returns the `User` object so the caller can route by role immediately (avoids React `setState` race).
- `register(name, email, password, role, location?)` -> returns `{ email }` only. Does NOT set auth state because the account is unverified.
- `logout()` -> clears `localStorage` and resets state to null.

### 5.2 Route Guards

| Component | File | Purpose |
|-----------|------|---------|
| `RequireAuth` | `client/src/components/RequireAuth.tsx` | Wraps private routes. Redirects to `/login` if `user` is null. Renders `<Navbar />` + `<Outlet />` when authenticated. |
| `RequireRole` | `client/src/components/RequireRole.tsx` | Wraps role-specific route groups. On mismatch, redirects to `dashboardPathForRole(user.role)` instead of a fixed path. |

### 5.3 Auth Pages

| Page | Route | Purpose |
|------|-------|---------|
| `Login.tsx` | `/login` | Email + password form. Handles 403 NOT_VERIFIED by redirecting to `/verify-otp`. Has "Forgot password?" link. |
| `Register.tsx` | `/register` | Name, email, password, role, location form. All fields mandatory (location required for instructors). Redirects to `/verify-otp` on success. |
| `VerifyOtp.tsx` | `/verify-otp` | Pre-fills email from `?email=` query param. 6-digit OTP input (numeric only, centered mono font). Resend button with cooldown. Redirects to `/login` on success. |
| `ForgotPassword.tsx` | `/forgot-password` | Email input only. Redirects to `/reset-password?email=` on submission. Always redirects (doesn't reveal whether email exists). |
| `ResetPassword.tsx` | `/reset-password` | Pre-fills email from query param. OTP + new password + confirm password. Show/hide toggle. Redirects to `/login` on success. |

All auth pages use `<SmartNavbar />` (shows PublicNavbar for guests, Navbar for authenticated users) and `<Footer />`.

### 5.4 Axios Setup (`client/src/api.ts`)

- Base URL from `VITE_API_URL` environment variable.
- **Request interceptor:** Injects `Authorization: Bearer <token>` from `localStorage`.
- **Response interceptor:** On any `401`, clears `localStorage` and does `window.location.assign("/login")` (hard navigation because the interceptor lives outside React).

---

## 6. Functional Flows

### 6.1 Registration Flow

```
User fills Register form
  |
  v
Register.tsx: handleSubmit()
  |-> Frontend validation (name, email format, password >= 6, instructor needs location)
  |-> AuthProvider.register() -> POST /api/auth/register
  |
  v
auth.controller.ts: register()
  |-> Validates body shape + types
  |-> auth.service.ts: registerUser()
  |   |-> Check duplicate email (Prisma findUnique)
  |   |-> bcrypt.hash(password, cost=10)
  |   |-> generateOtp() -> 6-digit code
  |   |-> otpExpiresAt() -> now + 10 minutes
  |   |-> Prisma user.create (isVerified: false, signupOtp, signupOtpExpires)
  |   |-> sendSignupOtpEmail() (fire-and-forget, async)
  |   |-> Return { id, name, email, role }
  |
  v
Response: 201 { user, message }
  |
  v
Register.tsx: navigate("/verify-otp?email=xxx")
```

### 6.2 OTP Verification Flow

```
User enters 6-digit OTP on VerifyOtp page
  |
  v
VerifyOtp.tsx: handleVerify()
  |-> POST /api/auth/verify-signup { email, otp }
  |
  v
auth.controller.ts: verifySignup()
  |-> auth.service.ts: verifySignupOtp()
  |   |-> Find user by email
  |   |-> Check isVerified is false
  |   |-> Check OTP matches
  |   |-> Check OTP not expired (signupOtpExpires > now)
  |   |-> Prisma user.update: isVerified=true, signupOtp=null, signupOtpExpires=null
  |   |-> Return safe user
  |
  v
Response: 200 { user, message }
  |
  v
VerifyOtp.tsx: show success message -> setTimeout -> navigate("/login")
```

### 6.3 Login Flow

```
User enters email + password on Login page
  |
  v
Login.tsx: handleSubmit()
  |-> AuthProvider.login() -> POST /api/auth/login { email, password }
  |
  v
auth.controller.ts: login()
  |-> auth.service.ts: loginUser()
  |   |-> Find user by email
  |   |-> bcrypt.compare(password, passwordHash)
  |   |-> Check isVerified is true (else throw ForbiddenError)
  |   |-> jwt.sign({ id, role }, JWT_SECRET, { expiresIn: "7d" })
  |   |-> Return { token, user: { id, name, email, role } }
  |
  v
Response: 200 { token, user }
  |
  v
AuthProvider: stores token + user in state + localStorage
Login.tsx: navigate(dashboardPathForRole(user.role))

--- Special case: unverified account ---
Response: 403 { error: "...", code: "NOT_VERIFIED" }
  |
  v
Login.tsx: detects code === "NOT_VERIFIED"
  |-> navigate("/verify-otp?email=xxx")
```

### 6.4 Forgot Password Flow

```
User enters email on ForgotPassword page
  |
  v
ForgotPassword.tsx: handleSubmit()
  |-> POST /api/auth/forgot-password { email }
  |
  v
auth.controller.ts: forgotPassword()
  |-> auth.service.ts: forgotPassword()
  |   |-> Find user (silent return if not found)
  |   |-> Check 60-second cooldown on resetOtpExpires
  |   |-> generateOtp() + otpExpiresAt()
  |   |-> Prisma user.update: resetOtp, resetOtpExpires
  |   |-> sendResetOtpEmail() (fire-and-forget)
  |
  v
Response: 200 { message } (always 200 — don't reveal account existence)
  |
  v
ForgotPassword.tsx: navigate("/reset-password?email=xxx")
```

### 6.5 Reset Password Flow

```
User enters OTP + new password on ResetPassword page
  |
  v
ResetPassword.tsx: handleSubmit()
  |-> Frontend validation (password >= 6 chars, passwords match)
  |-> POST /api/auth/reset-password { email, otp, newPassword, confirmPassword }
  |
  v
auth.controller.ts: resetPassword()
  |-> Validate body (both passwords present, match, min length)
  |-> auth.service.ts: resetPassword()
  |   |-> Find user by email
  |   |-> Check resetOtp matches
  |   |-> Check resetOtpExpires > now
  |   |-> bcrypt.hash(newPassword, cost=10)
  |   |-> Prisma user.update: passwordHash, resetOtp=null, resetOtpExpires=null
  |
  v
Response: 200 { message }
  |
  v
ResetPassword.tsx: show success -> setTimeout -> navigate("/login")
```

---

## 7. API Reference

### POST /api/auth/register

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| name | string | Yes | Trimmed |
| email | string | Yes | Must contain `@`, normalized to lowercase |
| password | string | Yes | Min 6 characters |
| role | string | Yes | `"learner"`, `"instructor"`, or `"admin"` |
| location | string | No | Required for instructors |

**Success:** `201 { user: { id, name, email, role }, message }`  
**Errors:** `400` (validation), `409` (duplicate email), `500`

---

### POST /api/auth/verify-signup

| Field | Type | Required |
|-------|------|----------|
| email | string | Yes |
| otp | string | Yes |

**Success:** `200 { user: { id, name, email, role }, message }`  
**Errors:** `400` (invalid/expired OTP, already verified, no account), `500`

---

### POST /api/auth/resend-signup

| Field | Type | Required |
|-------|------|----------|
| email | string | Yes |

**Success:** `200 { message }` (always — doesn't reveal account existence)  
**Errors:** `429` (cooldown — must wait 60 seconds between resends), `500`

---

### POST /api/auth/login

| Field | Type | Required |
|-------|------|----------|
| email | string | Yes |
| password | string | Yes |

**Success:** `200 { token, user: { id, name, email, role } }`  
**Errors:** `400` (missing fields), `401` (wrong credentials), `403 { error, code: "NOT_VERIFIED" }`, `500`

---

### POST /api/auth/forgot-password

| Field | Type | Required |
|-------|------|----------|
| email | string | Yes |

**Success:** `200 { message }` (always — doesn't reveal account existence)  
**Errors:** `429` (cooldown), `500`

---

### POST /api/auth/reset-password

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| email | string | Yes | |
| otp | string | Yes | 6-digit code from email |
| newPassword | string | Yes | Min 6 characters |
| confirmPassword | string | Yes | Must match newPassword |

**Success:** `200 { message }`  
**Errors:** `400` (validation, OTP mismatch, expired), `500`

---

## 8. Security Design

| Concern | Implementation |
|---------|----------------|
| **Password hashing** | bcrypt with cost factor 10. `passwordHash` is never returned in any API response (`select` limits or explicit stripping). |
| **OTP generation** | `crypto.randomInt(0, 1_000_000)` — cryptographically secure pseudo-random number generator, not `Math.random()`. |
| **OTP expiry** | 10 minutes. Checked server-side against `signupOtpExpires` / `resetOtpExpires`. |
| **OTP single-use** | Cleared from DB after successful verification/reset. Cannot be replayed. |
| **Resend cooldown** | 60 seconds between OTP resends. Prevents brute-force and email spam. |
| **Account enumeration** | Forgot-password and resend-signup return generic success messages regardless of whether the email exists. |
| **Login for unverified accounts** | Blocked with HTTP 403 + `code: "NOT_VERIFIED"`. The frontend redirects to the OTP page instead of showing a confusing error. |
| **Credential error messages** | Login returns "Invalid email or password" for both wrong email and wrong password — doesn't reveal which is incorrect. |
| **JWT** | 7-day expiry. Payload contains `{ id, role }`. Stored in `localStorage`. |
| **401 auto-logout** | Axios interceptor catches any 401 response, clears localStorage, and hard-redirects to `/login`. |
| **Email normalization** | All emails are `.trim().toLowerCase()` at both frontend and backend boundaries. |
| **Separate OTP fields** | Signup OTP and reset OTP use separate DB columns, so one flow never overwrites or interferes with the other. |

---

## 9. Email Configuration

### Environment variables (in `server/.env`)

```bash
SMTP_HOST=smtp.gmail.com          # SMTP server hostname
SMTP_PORT=587                     # 587 for TLS, 465 for SSL
SMTP_USER=your_gmail@gmail.com    # SMTP login
SMTP_PASS=your_app_password_here  # Gmail App Password (not your regular password)
SMTP_FROM=DriveReady221 <your_gmail@gmail.com>  # "From" header
```

### Gmail App Password setup

1. Enable 2-factor authentication on your Google account.
2. Go to https://myaccount.google.com/apppasswords
3. Generate an App Password for "Mail".
4. Use that 16-character password as `SMTP_PASS`.

### Development mode (no SMTP)

If `SMTP_HOST` is not set, the email utility falls back to console logging. The OTP will appear in the server terminal output, allowing you to test the full flow without configuring SMTP.

---

## 10. Change & Maintenance Guide

### Common modifications

| Task | Files to change |
|------|----------------|
| Change OTP length | `server/src/lib/otp.ts` — modify `1_000_000` ceiling and `.padStart(6, ...)` |
| Change OTP expiry | `server/src/lib/otp.ts` — modify `OTP_EXPIRY_MINUTES` |
| Change resend cooldown | `server/src/services/auth.service.ts` — modify `RESEND_COOLDOWN_SECONDS` |
| Change password requirements | `server/src/controllers/auth.controller.ts` (backend validation) + `client/src/pages/Register.tsx` and `client/src/pages/ResetPassword.tsx` (frontend validation) |
| Change JWT expiry | `server/src/services/auth.service.ts` — modify `JWT_EXPIRES_IN` |
| Change email templates | `server/src/lib/email.ts` — edit the HTML in `sendSignupOtpEmail()` and `sendResetOtpEmail()` |
| Add a new auth route | 1. Add service function in `auth.service.ts` 2. Add controller in `auth.controller.ts` 3. Add route in `auth.routes.ts` |
| Change role options | `server/src/controllers/auth.controller.ts` (ALLOWED_ROLES) + `client/src/types.ts` (Role type) + `client/src/pages/Register.tsx` (dropdown options) |
| Switch to hashed OTPs | Replace plain string comparison in `auth.service.ts` with `bcrypt.compare()`. Update schema if hash length exceeds column width. |

### Running after schema changes

If you modify `schema.prisma`, run from the `server/` directory:

```bash
npm run prisma:migrate    # Creates + applies migration
npm run prisma:seed       # Re-seeds test data (wipes first)
```

### Adding new auth pages

1. Create the page component in `client/src/pages/`.
2. Add the route in `client/src/App.tsx` — public routes go in the top-level children array (alongside `/login`, `/register`).
3. Wrap with `<SmartNavbar />` and `<Footer />` for consistent layout.

### TypeScript gotchas

- **`verbatimModuleSyntax: true`** — type-only imports MUST use `import type { ... }`. Importing a type as a value will fail the build.
- **`erasableSyntaxOnly: true`** — no TypeScript `enum`s. Use string literal unions instead.
- **`noUnusedLocals: true`** — unused imports break the build.
- **Auth context 3-file split** — do NOT merge `AuthContext.ts`, `AuthProvider.tsx`, and `useAuth.ts` into one file. ESLint's `react-refresh/only-export-components` rule prohibits a `.tsx` file from exporting both components and non-components.
