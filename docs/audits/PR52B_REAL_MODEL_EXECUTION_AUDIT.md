# PR52B Real Model Execution Audit

## Scope

Audited modules:

- `/tmp/workspace/sharetheherbman-debug/Equiprofile/server/modules/marketing/beast-mode/beastModeExecutionService.ts`
- `/tmp/workspace/sharetheherbman-debug/Equiprofile/server/modules/marketing/beast-mode/beastModeCopyGenerator.ts`
- `/tmp/workspace/sharetheherbman-debug/Equiprofile/server/modules/marketing/beast-mode/beastModeVariantPlanner.ts`
- `/tmp/workspace/sharetheherbman-debug/Equiprofile/server/modules/marketing/beast-mode/beastModeMultilingualService.ts`
- `/tmp/workspace/sharetheherbman-debug/Equiprofile/server/modules/marketing/campaign-engine/campaignCopyGenerator.ts`
- `/tmp/workspace/sharetheherbman-debug/Equiprofile/server/modules/marketing/campaign-engine/campaignDeliverablePlanner.ts`
- `/tmp/workspace/sharetheherbman-debug/Equiprofile/server/modules/marketing/campaign-engine/campaignVideoPlanner.ts`
- AI orchestrator/provider stack under `/tmp/workspace/sharetheherbman-debug/Equiprofile/server/_core/ai/*`

## Pre-PR52B state (deterministic-heavy)

### Beast Mode execution service

- `beastModeExecutionService.ts` selected a route via `routeBeastModeModel`, but did **not** execute provider/orchestrator text generation.
- Even when route status was `ready`, it still used deterministic `generateBeastModeCopy` for final copy.
- Generation metadata could say `generationMode: "model"` while content remained template-derived.

### Beast Mode copy + planner

- `beastModeCopyGenerator.ts` was fully deterministic template logic.
- `beastModeVariantPlanner.ts` switched between model/fallback mode based on router readiness, but both paths were deterministic content generation.

### Beast Mode multilingual

- `beastModeMultilingualService.ts` checked router readiness and stamped localization metadata.
- Localized text was deterministic prefixing + CTA dictionary translation, not orchestrator-backed localization.

### Campaign Engine copy + planner

- `campaignCopyGenerator.ts` was deterministic for all deliverables.
- `campaignDeliverablePlanner.ts` used deterministic builder only, with no orchestrator/provider calls.
- `campaignVideoPlanner.ts` only attached Studio-plan metadata, no raw media calls (correct behavior).

## AI orchestrator/provider APIs available in repo

Available and reusable APIs:

- `executeAITask` in `/server/_core/ai/orchestrator.ts`
- provider fallback execution via `executeWithFallback` in `/server/_core/ai/providers/providerRegistry.ts`
- provider capability/health checks via `isProviderAvailableForTask`
- provider/model discovery via `resolveModelCandidatesForTask`
- provider ranking via `rankProvidersForTask`

Related routing primitives present:

- task registry: `/server/_core/ai/tasks/taskRegistry.ts`
- provider ranking/routing telemetry: `/server/_core/ai/providerRanking.ts`

## Existing usage of executeAITask / routing stack

- `executeAITask` was already used by media and selected router procedures.
- Beast Mode/Campaign Engine generation paths did **not** call `executeAITask` for primary copy/strategy/localization generation.
- Beast Mode model router was policy metadata only for generation content path.

## Forbidden legacy path checks

### createMarketingDraft

No usage found in Beast Mode or Campaign Engine modules:

- `rg createMarketingDraft server/modules/marketing/beast-mode server/modules/marketing/campaign-engine` => no matches.

### createMediaJob

No usage found in Beast Mode or Campaign Engine modules:

- `rg createMediaJob server/modules/marketing/beast-mode server/modules/marketing/campaign-engine` => no matches.

## What PR52B wires to real model execution

This PR introduces centralized marketing model execution under:

- `/tmp/workspace/sharetheherbman-debug/Equiprofile/server/modules/marketing/model-execution/`

and routes Beast Mode + Campaign Engine generation through orchestrator/provider execution (`executeAITask`) when providers are available, with deterministic fallback only for unavailable/failing/malformed provider outputs.
