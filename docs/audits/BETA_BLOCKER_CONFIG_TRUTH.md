# BETA BLOCKER — Config Truth (Stripe + PWA)

## Scope
- `server/_core/env.ts`
- `vite.config.ts`
- `server/_core/index.ts`
- `server/routers.ts`
- `.env.example`

## Root causes found
1. **PWA false-disabled in build logs**
   - Vite config previously read `process.env.ENABLE_PWA` / `process.env.VITE_PWA_ENABLED` directly.
   - `.env` values are not guaranteed to be present in `process.env` at config-evaluation time.
   - Result: build logged `PWA disabled` even when `.env` had `ENABLE_PWA=true`.

2. **Stripe false-disabled reports from env formatting**
   - Feature parsing for `ENABLE_STRIPE` used strict equality (`=== "true"`).
   - Non-canonical truthy values (e.g. `TRUE`, `1`, `yes`, surrounding spaces) could evaluate to false.

## Fixes applied
1. **Robust feature-flag parsing in server env loader**
   - Added normalized boolean parser in `server/_core/env.ts`.
   - `ENABLE_STRIPE` and `ENABLE_UPLOADS` now accept: `true`, `1`, `yes`, `on` (case-insensitive, trimmed).

2. **Load PWA flags from `.env` in Vite config correctly**
   - Switched `vite.config.ts` to `defineConfig(({ mode }) => { ... })` + `loadEnv(mode, repoRoot, "")`.
   - PWA enablement now uses loaded env values, not only shell-exposed vars.
   - Replaced static config-time flag with per-build computed `pwaEnabled`.

## Production truth behavior after fix
- Stripe feature flag truth is now normalized and consistent with configured env intent.
- `/api/admin/status` still reports **"Stripe configured"** when Stripe keys are present.
- PWA build respects `.env` values for `ENABLE_PWA` / `VITE_PWA_ENABLED` and does not emit false disabled logs when enabled.

## Notes
- Test logs can still show Stripe disabled when test env intentionally does not set Stripe flag/keys.
- This is expected and distinct from production config truth.
