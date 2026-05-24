# Beta Dashboard Repair

Date: 2026-05-24

## Status

Classification: **IMPROVED, LIVE AUTHENTICATED VISUAL QA STILL REQUIRED**

## Scope

This repair did not rebuild the dashboard architecture. It used the existing dashboard and Phase 2/V2 surfaces already in the repo, then fixed beta-blocking access, paywall, marketing visibility, and local production asset loading issues.

## Dashboard Work Completed

- Added polished expired-access/paywall state at the protected-route boundary.
- Kept `/billing` reachable for expired users.
- Prevented protected dashboard children from mounting behind paywall.
- Preserved admin preview behavior.
- Updated Stable and School marketing cards to accurate Coming Soon beta language.
- Confirmed dashboard unauthenticated route redirects to login without critical console errors.
- Fixed local production CORS allow-list so built module assets load on `127.0.0.1:3100`.

## Existing Dashboard Surfaces Confirmed

- Dashboard home: `client/src/pages/Dashboard.tsx`, optional V2 in `client/src/v2/pages/DashboardV2.tsx`.
- Stable dashboard: `client/src/pages/StableDashboard.tsx`, optional V2 in `client/src/v2/pages/StableDashboardV2.tsx`.
- School dashboard: `client/src/pages/SchoolDashboard.tsx`.
- Teacher dashboard: `client/src/pages/TeacherDashboard.tsx`.
- Student dashboard: `client/src/pages/StudentDashboard.tsx`.
- Shared app shell: `client/src/components/DashboardLayout.tsx`.

## Visual Areas Still Needing Authenticated QA

Because local QA did not have a populated MySQL database or real users, the following require live/staging login verification:

- Dashboard home cards with real horse/task/weather data.
- Stable, school, teacher, and student dashboards with real account roles.
- Empty/loading/error state polish under authenticated data calls.
- Mobile PWA feel under real auth.
- Admin preview banner with an actual admin session.

## Beta Readiness Notes

The most important beta blocker, expired users seeing broken feature pages and repeated 403/402 noise, is fixed at the route boundary. Visual modernization beyond the safe repairs above should be continued only after authenticated staging screenshots confirm the remaining gaps.
