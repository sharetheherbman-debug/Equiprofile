# Marketing App Source-of-Truth Audit

## Active route(s) rendering Marketing UI
- `client/src/pages/Admin.tsx:510-521` renders `AdminCampaigns` when `activeSection === "campaigns"`.
- `client/src/pages/AdminCampaigns.tsx:1-5` renders only `TheMarketingApp`.

## Imports of `MarketingStudioV2`
- Active imports in `client/src`: **none**.
- `MarketingStudioV2.tsx` was a legacy layer and has been removed from active frontend usage.

## Imports of old Studio UI components
Components audited:
- `PreviewCanvas`
- `OutputCanvas`
- `AssetLibrary`
- `CampaignKanban`
- `QuickCreateTiles`
- `StudioCommandCenter`
- `StudioHero`
- `StickyActionBar`
- `SetupDrawer`
- `WorkspaceSetupWizard`
- `PlatformConnectionCards`

Result:
- Active imports in `client/src`: **none**.
- Legacy files were removed from the active component tree to prevent duplicate rendering/state conflicts.

## Active imports of new Marketing App components
- `client/src/pages/AdminCampaigns.tsx` imports:
  - `@/components/marketing/app/TheMarketingApp`
- `client/src/components/marketing/app/TheMarketingApp.tsx` imports:
  - `./MarketingAppTopBar`
  - `./MarketingAppChat`
  - `./MarketingAppSettings`
  - `./MarketingAppActions`
  - `./ChatResultCard` (type)
  - `./MarketingAppAssetStore`

## Media asset flow paths (list/preview/delete/download/regenerate)
- **List assets**: `TheMarketingApp.tsx` via `trpc.admin.listMediaAssets.useQuery`.
- **Single asset refresh**: `TheMarketingApp.tsx` via `utils.admin.getMediaAsset.fetch`.
- **Preview source selection**: `TheMarketingApp.tsx` via `useMarketingAppAssetStore` + active job/media-state merge.
- **Delete asset**: `TheMarketingApp.tsx` via `trpc.admin.deleteMediaAsset.useMutation`.
- **Download asset**: `TheMarketingApp.tsx` via `triggerDownload(...)`.
- **Regenerate asset/media**:
  - `trpc.admin.createMediaJob.useMutation`
  - `trpc.admin.testGenXMediaGeneration.useMutation` (retry path)
- **Branded derivative**: `trpc.admin.createBrandedMediaAsset.useMutation`.
- **Voice/music actions (truthful setup-needed behavior preserved)**:
  - `trpc.admin.createVoiceoverMediaAsset.useMutation`
  - `trpc.admin.createMusicMediaAsset.useMutation`

## Settings and provider-key paths
- `client/src/components/marketing/app/MarketingAppSettings.tsx`
  - `trpc.admin.listAIProviderSettings.useQuery`
  - `trpc.admin.saveAIProviderSettings.useMutation`
  - `trpc.admin.testAIProviderConnection.useMutation`
  - `trpc.admin.getAIDiagnostics.useQuery`
- Settings remain isolated to The Marketing App surface and do not rely on old Studio drawers.

## Duplicate/conflicting logic found and cleaned
- Legacy dashboard-style preview panel conflicted with chat-first flow.
- Legacy Studio V2 component layer coexisted in repository and created competing UI/state paradigms.
- Asset visibility and selected-asset preview logic were previously split; now centralized through `MarketingAppAssetStore`.
- Default asset visibility now excludes deleted assets; optional admin/debug toggle exposes deleted assets only when explicitly enabled.

## Acceptance grep status
- No active route imports `MarketingStudioV2`: ✅
- `TheMarketingApp` does not import old `PreviewCanvas`/`OutputCanvas`/`AssetLibrary`/`CampaignKanban`: ✅
- `AdminCampaigns` renders `TheMarketingApp` only: ✅
