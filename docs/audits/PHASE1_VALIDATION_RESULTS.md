# Phase 1 Validation Results

## Runtime Versions

| Tool | Version | Notes |
| --- | --- | --- |
| Node | v22.18.0 | From `node --version` |
| npm | 10.9.3 | From `npm.cmd --version`; PowerShell blocks `npm.ps1` by execution policy |

## Commands Run

| Command | Result | Notes |
| --- | --- | --- |
| `npm.cmd ci` | PASS | Installed from `package-lock.json`. npm reported existing audit/deprecation/peer warnings: 35 vulnerabilities, deprecated transitive packages, and a Vite/Vitest peer warning. No install failure. |
| `npm.cmd run build` | FAIL in default Windows script shell | Fails before build because `clean` uses `rm -rf dist`: `'rm' is not recognized as an internal or external command`. This is a Windows shell compatibility issue, not caused by this PR. |
| `$env:npm_config_script_shell='C:\Program Files\Git\bin\bash.exe'; npm.cmd run build` | PASS | Management frontend, school frontend, server bundle, CLI bundle, and build fingerprint completed. Warnings only: CSS `@import` ordering and large chunk warnings. |
| `$env:npm_config_script_shell='C:\Program Files\Git\bin\bash.exe'; npm.cmd run check` | FAIL | `client/src/_core/hooks/useAuth.ts(29,28): error TS2304: Cannot find name 'TRPCClientError'.` This is existing source code, unrelated to the docs-only Phase 1 diff. |
| `$env:npm_config_script_shell='C:\Program Files\Git\bin\bash.exe'; npm.cmd test` | PASS | Vitest: 11 test files passed, 88 tests passed. |
| `$env:npm_config_script_shell='C:\Program Files\Git\bin\bash.exe'; npm.cmd run preflight` | PASS | `scripts/check-pkg.mjs` and `scripts/validate-routes.mjs` passed. |
| `npm run typecheck` | NOT RUN | No `typecheck` script exists in `package.json`. |
| `npm run lint` | NOT RUN | No `lint` script exists in `package.json`. |

## Failure Attribution

- The default Windows `npm.cmd run build` failure is caused by existing POSIX shell assumptions in package scripts (`rm -rf`, inline env assignment, and `bash` usage).
- The build passes when npm uses Git Bash as its script shell, which matches the repo's existing script style.
- The `npm run check` failure is an existing TypeScript source issue in `client/src/_core/hooks/useAuth.ts`, not introduced by Phase 1 documentation/audit changes.

## Final Readiness Status

Phase 1 is ready for review with one known existing typecheck failure documented. No runtime feature changes were made. Prompt 2 can begin from the generated repo, route, backend, AI, marketing, academy, UI, deployment, cleanup, and validation maps.
