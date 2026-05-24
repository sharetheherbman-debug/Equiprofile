# Beta Route QA

Date: 2026-05-24

## Local QA Environment

- Built monolith served with `NODE_ENV=production`
- Host: `http://127.0.0.1:3100`
- Browser: headless Chrome via Chrome DevTools Protocol
- Database: local MySQL was not available for authenticated data QA
- Stripe: `ENABLE_STRIPE=false`

## Public Routes

| Route | Desktop | Mobile | Console | Notes |
| --- | --- | --- | --- | --- |
| `/` | PASS | PASS | PASS | Mounted; clean nav. |
| `/features` | PASS | NOT RUN | PASS | Mounted. |
| `/pricing` | PASS | PASS | PASS | Mounted. |
| `/about` | PASS | NOT RUN | PASS | Mounted. |
| `/contact` | PASS | NOT RUN | PASS | Mounted. |
| `/login` | PASS | NOT RUN | PASS | Mounted auth page. |
| `/register` | PASS | NOT RUN | PASS | Mounted auth page. |

## Dashboard And Admin Routes

| Route | Desktop | Mobile | Console | Auth/paywall status |
| --- | --- | --- | --- | --- |
| `/dashboard` | PASS | PASS | PASS | Redirects unauthenticated user to `/login`. |
| `/billing` | PASS | NOT RUN | PASS | Redirects unauthenticated user to `/login`; expired authenticated users are allowed by `ProtectedRoute`. |
| `/stable-dashboard` | CONTRACT QA | NOT RUN | NOT RUN | Protected stable route; needs stable user. |
| `/school-dashboard` | CONTRACT QA | NOT RUN | NOT RUN | Management app does not register standalone school route; school frontend has separate routes/subdomain. |
| `/teacher-dashboard` | CONTRACT QA | NOT RUN | NOT RUN | Teacher dashboard belongs to school/academy flow; requires role QA. |
| `/admin` | PASS | NOT RUN | PASS | Redirects unauthenticated user to `/login`. |
| Hidden-admin Marketing Studio | CONTRACT QA | CONTRACT QA | BUILD PASS | It is inside `/admin`, Marketing Studio section, not `/admin/campaigns`. |

## Academy / School Routes

School/academy pages are split between management and school frontends. Authenticated student/teacher/school dashboards require role-specific login and live DB data. This audit did not create synthetic production users.

## Issue Found And Fixed

Initial route QA showed blank pages and Chrome errors for `/management-assets/*.js` and CSS. Root cause was local production CORS default origins not including `http://127.0.0.1:3100` while Vite emits `crossorigin` module assets. Fixed in `server/_core/index.ts`.

## Remaining Manual Route QA

- Authenticated expired user.
- Authenticated active subscriber.
- Stable, school, teacher, and student roles.
- Hidden admin navigating to Marketing Studio tab.
- Real backend calls with production/staging database.
