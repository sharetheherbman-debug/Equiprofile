# BETA BLOCKER — Route + Console QA

## Target routes requested
`/`, `/features`, `/pricing`, `/login`, `/register`, `/billing`, dashboard variants, Admin, Marketing Studio, AI Providers, Suppression List, Approval Queue.

## Environment outcome
Attempting to boot local app server (`npm run dev`) failed startup due missing required runtime env:
- `DATABASE_URL`
- `JWT_SECRET`
- `ADMIN_UNLOCK_PASSWORD`

Because server did not start, browser route/console QA could not be executed end-to-end in this sandbox.

## What was validated instead
- Static route definitions and role guards audited in:
  - `client/management/src/ManagementApp.tsx`
  - `client/school/src/SchoolApp.tsx`
  - `client/src/components/ProtectedRoute.tsx`
- Marketing visibility logic audited in:
  - `client/src/pages/StableDashboard.tsx`
  - `client/src/pages/SchoolDashboard.tsx`
  - `client/src/pages/TeacherDashboard.tsx`
- Hidden admin Marketing Studio flow wiring audited in:
  - `client/src/pages/AdminCampaigns.tsx`
  - `server/routers.ts`

## Role gating summary
- Student/Pro: no Marketing Studio surfaced in main plan-aware dashboard modules.
- Stable/School: Coming Soon Marketing Studio card + in-page nav cue.
- Teacher: limited lesson-promotion preview card only.
- Admin: full hidden Marketing Studio access via Admin panel section.

## Required production QA to complete this audit
Run browser QA in production-like env with seeded users for each role and capture:
- Desktop/mobile screenshots
- Console logs per route
- Network call status for each key workflow
- Auth + role redirects
