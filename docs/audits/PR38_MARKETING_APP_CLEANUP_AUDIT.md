# PR38 Marketing App Cleanup Audit

## Scope
- Repository: `amarktainetwork-blip/Equiprofile`
- PR objective: cleanup/deletion/split/permanent-delete/source-of-truth enforcement only
- Academy: untouched

## Phase 1 — Active layer audit

### Active entry point
- `client/src/pages/AdminCampaigns.tsx` renders only `TheMarketingApp`.
- `client/src/pages/Admin.tsx` loads `AdminCampaigns` for the campaigns section.

### Legacy studio isolation
- `MarketingStudioV2` is not imported by active routes.
- Legacy studio UI files were moved to `client/src/components/marketing/legacy/`:
  - `MarketingStudioV2.tsx`
  - `AssetLibrary.tsx`
  - `SetupDrawer.tsx`
  - `PlatformConnectionCards.tsx`

### TheMarketingApp dependency audit
- `TheMarketingApp` imports only reusable studio helpers/types (`mediaStatus`, `workspaceConfig`, `types`) and app-layer components.
- `TheMarketingApp` does not import quarantined legacy UI components.

## Phase 2 — Settings split audit

### EquiProfile Admin settings
- Admin Settings now exposes only **EquiProfile AI Settings**:
  - `equiprofile_ai_genx_api_key`
  - `equiprofile_ai_genx_model`
- Marketing provider controls were removed from `client/src/pages/Admin.tsx`.

### Marketing App settings
- Marketing provider keys are owned by `TheMarketingApp` settings:
  - `marketing_genx_api_key`
  - `marketing_qwen_api_key`
  - `marketing_huggingface_api_key`
  - `marketing_pexels_api_key`
  - `marketing_pixabay_api_key`
- Backend reads namespaced keys first and falls back to legacy keys for compatibility.
- New saves write namespaced keys only.

## Phase 3 — Permanent delete audit

### Backend mutation
- Added `admin.permanentDeleteMediaAsset`.
- Behavior:
  - validates admin access via `adminUnlockedProcedure`
  - fetches asset by ID
  - safely resolves and deletes local files only under generated media directory
  - deletes derivative files referenced in metadata when safe
  - deletes DB row from `mediaAssets`
  - returns deleted asset id and file deletion summary

### Frontend behavior
- Marketing App now calls `permanentDeleteMediaAsset` for user deletion.
- Delete UI text is **Delete permanently**.
- Confirmation required before mutation.
- Deleted-assets toggle/list is removed from normal UI flow.

## Phase 4 — Reusable add-on structure audit
- Workspace config now includes reusable host/workspace identifiers:
  - `marketing_workspace_id`
  - `host_app_id`
  - `host_app_name`
  - `host_app_domain`
  - `brand_kit_id`
- Existing EquiProfile values remain as seed defaults for first workspace.

## Acceptance grep checklist (expected)
- no active route imports `MarketingStudioV2`
- `TheMarketingApp` imports no quarantined old UI components
- old UI components are deleted from active studio directory or moved under `marketing/legacy`
- one active Marketing App entry point exists (`AdminCampaigns -> TheMarketingApp`)
