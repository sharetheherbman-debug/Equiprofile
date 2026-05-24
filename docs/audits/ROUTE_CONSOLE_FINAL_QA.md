# Route + Console Final QA

Date: 2026-05-24

## Route checks executed
Using Playwright against local Vite frontends:

Management build (`VITE_SITE=management`, `http://127.0.0.1:4173`):
- `/` ✅
- `/pricing` ✅
- `/login` ✅
- `/register` ✅
- `/billing` ✅ (loading state without auth)
- `/dashboard` ✅ (loading state without auth)
- `/stable-dashboard` ✅ (loading state without auth)
- `/school-dashboard` ⚠️ 404 in management build
- `/teacher-dashboard` ⚠️ 404 in management build
- `/admin` ✅ (loading state without auth)

School build (`VITE_SITE=school`, `http://127.0.0.1:4174`):
- `/school-dashboard` ✅ (loading state without auth)
- `/teacher-dashboard` ✅ (loading state without auth)

## Console findings
Observed logs/warnings only:
- Vite client connect logs
- analytics not initialized (env missing)
- OAuth not configured warnings
- no unhandled console crash errors observed

## Auth-required workflow limitation
Create/Preview/Edit/Approval/Calendar/Assets/Suppression/AI Settings inside `/admin` require authenticated admin context; full interactive button-run QA requires real auth + backend env secrets.

