# PR54A-2 Provider Capability Completion Audit

This PR is not Academy.

## Existing PR54A endpoints already present before this PR

- `server/routers.ts`
  - `syncMarketingProviderCapabilities`
  - `getMarketingProviderReadiness`
  - `getMarketingProviderModelInventory`
  - `getMarketingTaskCapabilityMap`
  - `testMarketingProviderTaskRoute`
  - `connectMarketingPlatform`
  - `publishApprovedScheduleDraft`
  - `getMarketingPublishStatus`

## Existing AI discovery/orchestration already present before this PR

- `server/_core/ai/providerModelDiscovery.ts`
- `server/_core/ai/modelRegistry.ts`
- `server/_core/ai/orchestrator.ts` (`executeAITaskWithProviderRoute`)
- `server/_core/ai/providers/providerRegistry.ts` (provider health/testing)

## Existing social publisher registry/stub state before this PR

- `server/modules/marketing/social-publishing/socialPublisherRegistry.ts`
- `server/modules/marketing/social-publishing/socialPublisherTypes.ts`

Status before PR54A-2: registry existed but all platforms were generic setup stubs, and publish calls were export-only placeholders.

## Missing before this PR (confirmed)

- No persisted marketing provider model inventory table.
  - Missing table in `drizzle/schema.ts`
  - Missing startup creation/guard in `server/db.ts`
- No persisted marketing provider health check table.
  - Missing table in `drizzle/schema.ts`
  - Missing startup creation/guard in `server/db.ts`
- No dedicated provider capability module under `server/modules/marketing/provider-capabilities/`.
- No durable Marketing App provider registry read path (router used live discovery snapshot only).
- No explicit marketing task capability matrix covering avatar/voice/music/background-audio tasks.
- No dedicated budget policy module for Standard/Elite + cost-tier enforcement.
- Platform connection persistence existed in `marketingSocialConnections`, but source-of-truth contract was not fully documented/expanded for richer status fields.
- Social publisher adapters were not split by platform-specific contract files.
- PR54 tests were largely string-presence checks (`server/pr54.modelIntelligenceConnector.test.ts`).

## What PR54A-2 adds

- New audit doc: `docs/audits/PR54A2_PROVIDER_CAPABILITY_COMPLETION_AUDIT.md`.
- Provider persistence schema additions:
  - `marketingProviderModels`
  - `marketingProviderHealthChecks`
- Startup DB safety-net updates in `server/db.ts`:
  - `CREATE TABLE IF NOT EXISTS`
  - `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` drift guards
- New module: `server/modules/marketing/provider-capabilities/`
  - `index.ts`
  - `providerCapabilityTypes.ts`
  - `providerModelStore.ts`
  - `providerHealthStore.ts`
  - `providerCapabilitySync.ts`
  - `genxModelCatalogSync.ts`
  - `qwenModelRegistry.ts`
  - `huggingFaceModelRegistry.ts`
  - `marketingTaskCapabilityMatrix.ts`
  - `marketingBudgetPolicy.ts`
  - `marketingProviderReadinessService.ts`
  - `marketingProviderRouteResolver.ts`
- Router integration updates to use persisted provider capability registry and policy-based route resolution.
- Marketing platform connection source-of-truth hardening on `marketingSocialConnections` (expanded fields + status handling).
- Platform-specific social adapter contracts and truthful non-fake publish behavior constraints.
- Behavioral PR54A-2 test coverage replacing simple string-only checks.
