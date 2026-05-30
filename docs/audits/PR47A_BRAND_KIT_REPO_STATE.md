# PR47A Brand Kit Repo State Audit

## Scope checked

- `marketingBrandKits` schema/table
- `marketingMediaAssetVersions` schema/table
- `server/modules/marketing/brand-kit/*`
- `getMarketingBrandKit`
- `getMarketingBrandSummary`
- `upsertMarketingBrandKit`
- `resetMarketingBrandKitToWorkspaceDefault`
- `selectMarketingBrandLogoAsset`
- `uploadMarketingBrandLogo`
- `listMarketingBrandOverlayTemplates`
- `previewMarketingBrandOverlay`
- `listMarketingAssetVersions`
- Brand editor persistence in `BrandOverlayStep` / `StudioWorkbench`
- renderer `brandKitId` / template metadata integration

## What was present before PR47A edits

- ✅ `marketingBrandKits` exists in `drizzle/schema.ts` and startup table-creation in `server/db.ts`.
- ✅ `marketingMediaAssetVersions` exists in `drizzle/schema.ts` and startup table-creation in `server/db.ts`.
- ✅ `server/modules/marketing/brand-kit/` exists with:
  - `index.ts`
  - `marketingBrandKitTypes.ts`
  - `marketingBrandKitStore.ts`
  - `marketingBrandKitService.ts`
  - `marketingBrandOverlayTemplateService.ts`
- ✅ Admin router already exposed:
  - `getMarketingBrandKit`
  - `getMarketingBrandSummary`
  - `upsertMarketingBrandKit`
  - `resetMarketingBrandKitToWorkspaceDefault`
  - `selectMarketingBrandLogoAsset`
  - `uploadMarketingBrandLogo`
  - `listMarketingBrandOverlayTemplates`
  - `previewMarketingBrandOverlay`
  - `listMarketingAssetVersions`
- ✅ Renderer and output metadata already carried `brandKitId`, `overlayTemplate`, and brand summary fields via render job + media asset metadata.
- ✅ Asset version lineage records were already written (render exports + branded derivatives).

## What was missing / incorrect before PR47A edits

1. ❌ `docs/audits/PR47A_BRAND_KIT_REPO_STATE.md` did not exist.
2. ❌ Frontend still displayed stale "backend is not ready / export manually" brand-overlay copy in the active brand overlay step.
3. ❌ EquiProfile defaults were hardcoded as global service defaults, not restricted to scoped EquiProfile host-app default seeding.
4. ❌ Startup safety-net did not include idempotent `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` guards for key `marketingBrandKits` and `marketingMediaAssetVersions` columns.

## What PR47A added/changed

1. ✅ Added this audit document.
2. ✅ Removed stale backend-not-ready placeholder language from `BrandOverlayStep` and replaced logo messaging with real setup-needed guidance (direct upload unavailable; select existing image assets).
3. ✅ Scoped EquiProfile seed behavior:
   - EquiProfile defaults are used only when `hostAppId === "equiprofile"`.
   - Other host apps now receive neutral scoped defaults.
4. ✅ Extended startup safety-net migrations in `server/db.ts` with idempotent column guards for brand-kit/version tables.
5. ✅ Expanded PR47 tests to assert:
   - PR47A audit doc exists.
   - `getMarketingBrandSummary` + `uploadMarketingBrandLogo` procedures are registered.
   - EquiProfile seed is scoped (non-`equiprofile` host app does not default to EquiProfile).
   - Brand overlay step no longer contains backend-not-ready placeholder text.
