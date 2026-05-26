# Update 4.2 Frontend Source Of Truth

## Scope

This update replaces the visible Marketing Studio frontend with one canonical command-first Studio. It does not add backend provider logic, campaign tables, suppression backend changes, billing changes, auth changes, academy changes, subscription changes, or normal dashboard changes.

## Canonical entry point

- Kept: `client/src/pages/AdminCampaigns.tsx`
- Role after cleanup: thin route wrapper only.
- Canonical component rendered by the route: `client/src/components/marketing/studio/MarketingStudioV2.tsx`

## Frontend files kept

- `client/src/pages/AdminCampaigns.tsx`
- `client/src/components/marketing/previews/index.tsx`

The existing preview engine remains the one preview source of truth. It was extended to include approved preview surfaces for YouTube Shorts, YouTube Long-form, and Google Business.

## Frontend files replaced

- `client/src/pages/AdminCampaigns.tsx`

The previous 1,000+ line mixed admin/campaign/provider/settings page was replaced with a thin wrapper around `MarketingStudioV2`.

## Frontend files deleted

- `client/src/components/marketing/MarketingActionRail.tsx`
- `client/src/components/marketing/MarketingCommandComposer.tsx`
- `client/src/components/marketing/MarketingResultCard.tsx`
- `client/src/components/marketing/PlatformPreview.tsx`
- `client/src/components/marketing/avatarStudio/index.tsx`

These files were removed because their visible UX was superseded by the canonical V2 components and no remaining source imports them.

## Canonical components after cleanup

- `client/src/components/marketing/studio/MarketingStudioV2.tsx`
- `client/src/components/marketing/studio/StudioHero.tsx`
- `client/src/components/marketing/studio/StudioCommandCenter.tsx`
- `client/src/components/marketing/studio/QuickCreateTiles.tsx`
- `client/src/components/marketing/studio/CampaignContextStrip.tsx`
- `client/src/components/marketing/studio/AITeamProgress.tsx`
- `client/src/components/marketing/studio/OutputCanvas.tsx`
- `client/src/components/marketing/studio/PreviewCanvas.tsx`
- `client/src/components/marketing/studio/StickyActionBar.tsx`
- `client/src/components/marketing/studio/CampaignKanban.tsx`
- `client/src/components/marketing/studio/AssetLibrary.tsx`
- `client/src/components/marketing/studio/AutopilotWizard.tsx`
- `client/src/components/marketing/studio/SetupDrawer.tsx`
- `client/src/components/marketing/studio/PlatformConnectionCards.tsx`
- `client/src/components/marketing/studio/PresenterSelector.tsx`
- `client/src/components/marketing/studio/QualityToggle.tsx`
- `client/src/components/marketing/studio/types.ts`

## Duplicate UI removed

- Old admin-style campaign table as default UX.
- Old technical media/failure list as default UX.
- Old platform tab as dominant navigation.
- Old Brand DNA tab as dominant navigation.
- Old Audience tab as dominant navigation.
- Old Settings tab as dominant navigation.
- Old standalone preview wrapper.
- Old standalone presenter/avatar form.

## Tests added or updated

- `server/marketingStudio.product.test.ts`
- `server/marketingStudio.previewAndAvatar.test.ts`
- `server/marketingDraftOutput.test.ts`

The tests now enforce the V2 source-of-truth contract: one route wrapper, four primary areas, approved platform scope, no admin KPI cards, no normal Studio debug leakage, canonical presenter selector, and canonical preview engine.
