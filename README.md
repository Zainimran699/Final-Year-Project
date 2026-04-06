# Driving Instruction & Hazard Perception Training Platform

Final-year project: a full-stack web app that helps learner drivers prepare for their UK theory and hazard perception tests, with AI-generated explanations and an instructor booking marketplace.

## Tech stack

- **Frontend:** React + TypeScript (Vite), Tailwind CSS, Axios, React Router
- **Backend:** Node.js + Express + TypeScript
- **Database:** PostgreSQL (hosted on Supabase)
- **ORM:** Prisma
- **Auth:** JWT + bcrypt
- **AI:** Google Gemini (`gemini-1.5-flash`) for theory question explanations

## Project structure

```
.
├── client/   # Vite React-TS frontend
└── server/   # Express + Prisma backend
```

## Getting started

1. `cd server && cp .env.example .env` and fill in your Supabase `DATABASE_URL` / `DIRECT_URL`, a `JWT_SECRET`, and a `GEMINI_API_KEY`.
2. `cd server && npx prisma migrate dev && npx prisma db seed`
3. `cd server && npm run dev` (starts API on `http://localhost:5000`)
4. `cd client && npm run dev` (starts UI on `http://localhost:5173`)

### Test accounts (created by the seed)

| Role       | Email                 | Password   |
|------------|-----------------------|------------|
| Admin      | admin@test.com        | admin123   |
| Instructor | instructor@test.com   | test123    |
| Learner    | learner@test.com      | test123    |
