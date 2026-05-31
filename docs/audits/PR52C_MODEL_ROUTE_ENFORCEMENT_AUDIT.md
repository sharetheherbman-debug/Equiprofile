# PR52C Model Route Enforcement Audit

## 1) PR52B route selection behavior

PR52B route selection lived in `server/modules/marketing/model-execution/marketingModelExecutionService.ts`:

- `preferredProviders(...)` chose provider order by Standard/Elite mode.
- `resolveRoute(...)` selected the first configured+available provider and model candidate.
- `executeMarketingModelTask(...)` passed `providerPreference` and `model` inside `executeAITask(...).input`.

This selected a route in metadata, but did not hard-lock execution to that provider for copywriting/strategy tasks.

## 2) How executeAITask resolved providers before PR52C

`server/_core/ai/orchestrator.ts` used:

- `resolveProvidersForTask(task)` for non-media tasks.
- `executeWithFallback(providers, task, input, ...)` for final provider/model execution.

Provider resolution is based on routing/ranking + availability and can evaluate multiple providers and models.

## 3) Whether providerPreference was enforced

For normal text/copywriting tasks, provider selection in `executeAITask` was not explicitly locked to `input.providerPreference`.
Therefore selected route metadata could silently diverge from actual executed provider/model.

## 4) PR52C code change that guarantees route-enforced execution

PR52C adds `executeAITaskWithProviderRoute(...)` in `server/_core/ai/orchestrator.ts`.

This helper:

- validates task input through task registry
- runs compliance moderation
- checks provider availability for the exact task
- resolves candidates only for the selected provider
- enforces selected model when it matches a valid provider candidate
- executes only through `executeWithProvider(...)` (no cross-provider reroute)
- returns selected/executed provider+model and route enforcement status

`executeMarketingModelTask(...)` now calls this helper with explicit `provider` and `model` fields and records:

- `selectedProvider`, `selectedModel`
- `executedProvider`, `executedModel`
- `routeEnforced`
- `routeMismatchReason`
- `providerStatus`
- `fallbackReason`

Selected route and executed route cannot silently diverge anymore: mismatches are marked and returned as deterministic fallback with review gating.

## 5) Beast Mode / Campaign Engine forbidden legacy paths

Beast Mode and Campaign Engine still route through `executeMarketingModelTask(...)` and still do **not** call:

- `createMarketingDraft`
- `createMediaJob`

Guard coverage remains in tests (`server/pr52b.realModelExecution.test.ts`, `server/pr49.reviewGate.test.ts`, `server/pr48.campaignEngine.test.ts`).

## 6) Remaining fallback behavior

Fallback is still deterministic and review-gated when:

- provider setup is missing (`setup_needed`)
- selected provider is unavailable (`provider_unavailable`)
- provider returns non-completed/empty/malformed output
- selected/executed route mismatch is detected

Empty provider output is still rejected and not accepted as completed model output.
