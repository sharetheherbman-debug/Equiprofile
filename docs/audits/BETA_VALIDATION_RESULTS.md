# Beta Validation Results

Date: 2026-05-24

## Runtime

- Node: `v22.18.0`
- npm: `10.9.3`
- Note: npm scripts are POSIX-style. On Windows validation used `npm_config_script_shell=C:\Program Files\Git\bin\bash.exe`.

## Commands

| Command | Result | Notes |
| --- | --- | --- |
| `npm ci` | PASS | Reports existing peer warning for Vitest/Vite and 35 npm audit vulnerabilities. |
| `npm run check` | PASS | TypeScript `tsc --noEmit`. |
| `npm test` | PASS | 11 test files, 88 tests passed. |
| `npm run preflight` | PASS | Dependency specs and Express route patterns valid. |
| `npm run build` | PASS | Management frontend, school frontend, server, CLI, build fingerprint completed. |

## Build Warnings

- PWA disabled unless `ENABLE_PWA=true` is present during build.
- CSS `@import` ordering warning in generated CSS.
- Large chunk warnings above 500 kB.
- Existing npm audit count: 35 vulnerabilities, including 23 moderate, 10 high, 2 critical.

## Browser QA

Local production route QA passed for core public/auth routes after fixing local static asset CORS. No critical console errors were observed on the rerun for public routes, unauthenticated dashboard redirect, billing redirect, or admin redirect.

## Final Readiness

Status: **READY FOR STAGING REDEPLOY QA, NOT YET PROVEN LIVE-STRIPE READY**

The code builds and core browser smoke passes. Live beta readiness still requires authenticated role QA, real Stripe checkout/webhook testing, and production database verification.
