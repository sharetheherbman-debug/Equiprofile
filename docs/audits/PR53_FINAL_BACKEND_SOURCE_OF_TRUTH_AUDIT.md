# PR53 Final Backend Source-of-Truth Audit

## 1. Active Marketing App route

The active Create path is singular:

1. `client/src/pages/Admin.tsx` lazy-loads the admin campaigns page.
2. `client/src/pages/AdminCampaigns.tsx` renders `TheMarketingApp` directly.
3. `client/src/components/marketing/app/TheMarketingApp.tsx` renders `StudioHome` for the `create` section.
4. `client/src/components/marketing/app/studio/StudioHome.tsx` renders `StudioWorkbench`.

This is the only normal Create route audited for PR53.

## 2. Inactive / quarantined legacy layers

Legacy surfaces are quarantined and explicitly marked:

- `client/src/components/marketing/legacy/quarantine/MarketingStudioV2.tsx`
- `client/src/components/marketing/legacy/quarantine/MarketingAppChat.tsx`
- `client/src/components/marketing/legacy/quarantine/MarketingAppPreview.tsx`

Each file starts with:

`LEGACY ONLY — must not be imported by active Marketing App route.`

Regression coverage:

- `server/pr53.finalBackendSourceOfTruth.test.ts`
- `client/src/components/marketing/app/studio/studioWorkbench.test.tsx`

## 3. DB-backed sources of truth

Startup guards and table creation live in `server/db.ts`.

PR53-audited marketing tables:

- `marketingCampaigns`
- `marketingCampaignItems`
- `marketingCampaignAssets`
- `marketingBrandKits`
- `mediaAssets` / media assets registry
- `marketingMediaAssetVersions`
- `marketingRenderJobs`
- `marketingReviewRecords`
- `marketingVisualQaRecords`
- `marketingScheduleDrafts`
- `marketingBeastModeRuns`
- `marketingBeastModeVariants`

`server/db.ts` uses idempotent `CREATE TABLE IF NOT EXISTS` and `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` guards for these marketing records.

## 4. New generation / execution paths

### Campaign Engine
- `server/modules/marketing/campaign-engine/campaignDeliverablePlanner.ts`
- `server/modules/marketing/campaign-engine/index.ts`
- Router entry points in `server/routers.ts`:
  - `generateCampaignPlan`
  - `exportCampaignPack`
  - `createScheduleDraftsFromCampaign`

### Beast Mode
- `server/modules/marketing/beast-mode/beastModeExecutionService.ts`
- `server/modules/marketing/beast-mode/beastModeVariantPlanner.ts`
- `server/modules/marketing/beast-mode/index.ts`
- Router entry points in `server/routers.ts`:
  - `createBeastModeRun`
  - `generateBeastModeVariants`
  - `createBeastModeBatchRenderJobs`
  - `exportBeastModePack`

### Marketing Model Execution
- `server/modules/marketing/model-execution/marketingModelExecutionService.ts`
  - `executeMarketingModelTask`
- `server/_core/ai/orchestrator.ts`
  - `executeAITaskWithProviderRoute`
- Diagnostic route in `server/routers.ts`
  - `testMarketingModelExecutionRoute`

### Media Factory / assembled rendering
- `server/modules/growth-engine/persistence.ts`
  - `createMediaJob` (legacy compatibility only)
- `server/modules/marketing/beast-mode/beastModeBatchRenderPlanner.ts`
- `server/modules/marketing/campaign-engine/campaignVideoPlanner.ts`
- `server/routers.ts`
  - `createBeastModeBatchRenderJobs`

### Visual QA
- `server/modules/marketing/visual-qa/visualQaService.ts`
- `server/modules/marketing/visual-qa/visualQaFrameExtractor.ts`
- `server/modules/marketing/visual-qa/visualQaStore.ts`
- Router entry points in `server/routers.ts`:
  - `getMarketingVisualQaStatus`
  - `listMarketingVisualQaRecords`
  - `runMarketingVisualQa`
  - `markMarketingVisualQaPassed`
  - `markMarketingVisualQaFailed`
  - `requestMarketingVisualQaChanges`

## 5. Forbidden / legacy paths audited in PR53

### `createMarketingDraft` must not power Studio / Campaign / Beast Mode
- Legacy compatibility procedure remains in `server/routers.ts` as `createMarketingDraft`.
- PR53 marks it with a compatibility-only warning comment.
- Current Campaign Engine / Beast Mode execution modules are audited by source tests to avoid this path.

### `createMediaJob` must not power assembled video / Campaign / Beast Mode
- Legacy compatibility procedure remains in `server/routers.ts` as `createMediaJob`.
- PR53 marks it with a compatibility-only warning comment.
- Assembled flows are routed through Media Factory render jobs and export/render planning instead of raw media-job bypasses.

### No free-form raw chat in normal Create
- Active Create renders `StudioHome` → `StudioWorkbench`.
- Quarantined `MarketingAppChat` is not part of the active route.

### No fake posted state / no fake analytics
- `server/modules/marketing/social-publishing/socialPublisherRegistry.ts` keeps publisher adapters at `canPublish: false` and `setup_needed` unless a real connector is registered.
- `server/modules/marketing/social-publishing/scheduleExportPackBuilder.ts` remains export-only and warns against fake posted state.
- Active Marketing App route tests continue to guard against analytics UI reintroduction.

## 6. Route-locked model execution proof

- `server/modules/marketing/model-execution/marketingModelExecutionService.ts`
  - resolves selected provider/model
  - records `selectedProvider`, `selectedModel`, `executedProvider`, `executedModel`, `routeEnforced`, `routeMismatchReason`
  - converts route mismatches into fallback / reviewable results
- `server/_core/ai/orchestrator.ts`
  - `executeAITaskWithProviderRoute` validates task input
  - runs compliance moderation
  - rejects queued/media tasks
  - executes only against the selected provider route

Regression coverage:

- `server/_core/ai/orchestrator.test.ts`
- `server/pr52b.realModelExecution.test.ts`

## 7. Review / Visual QA / export gates

Enforced in `server/routers.ts`:

- `approveMarketingOutput`
  - requires QA checklist
  - requires passing QA or manual override with reason
  - requires visual QA pass for rendered video targets unless manually overridden with reason
- `approveBeastModeVariant`
  - requires visual QA pass for render-backed variants unless manually overridden with reason
- `markMarketingOutputExported`
  - requires approved status unless manual override with reason
- `exportCampaignPack`, `exportBeastModePack`, and schedule export payloads now carry review and visual QA state in exported metadata/summaries

## 8. Storage / delete / render safety

- `server/routers.ts` → `permanentDeleteMediaAsset`
  - limits deletion candidates to generated media roots / generated public URLs
  - prevents deleting arbitrary paths outside allowed generated storage
- `server/modules/growth-engine/mediaAssets.ts`
  - media asset registry remains queryable even when rows are soft-deleted or permanently removed through the guarded router path
- `server/modules/marketing/visual-qa/visualQaFrameExtractor.ts`
  - frame extraction failures degrade to `needsManualReview` / `setupNeeded` instead of crashing execution

## 9. Tenant / workspace isolation

Marketing admin procedures audited in PR42–PR53 consistently carry `tenantId`, `workspaceId`, and where applicable `hostAppId`, through:

- campaign CRUD / export routes in `server/routers.ts`
- beast mode routes in `server/routers.ts`
- review routes in `server/routers.ts`
- visual QA routes in `server/routers.ts`
- brand kit routes in `server/routers.ts`
- schedule draft routes in `server/routers.ts`

Key record lookups and writes also use tenant/workspace filters in module stores under:

- `server/modules/marketing/campaign-engine`
- `server/modules/marketing/beast-mode`
- `server/modules/marketing/brand-kit`
- `server/modules/marketing/visual-qa`
- `server/modules/growth-engine`

## 10. PR53 shell cleanup proof

`client/src/components/marketing/app/TheMarketingApp.tsx` is now a thinner orchestration shell.
Business wiring moved into hooks under:

- `client/src/components/marketing/app/hooks/useMarketingWorkspaceConfig.ts`
- `client/src/components/marketing/app/hooks/useMarketingBrandKit.ts`
- `client/src/components/marketing/app/hooks/useMarketingAssets.ts`
- `client/src/components/marketing/app/hooks/useMarketingCampaigns.ts`
- `client/src/components/marketing/app/hooks/useMarketingReviewActions.ts`
- `client/src/components/marketing/app/hooks/useMarketingCalendar.ts`

The active route remains unchanged while orchestration is separated from backend wiring.
