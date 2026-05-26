# UPDATE 4.3 — Frontend Source of Truth

Generated: 2026-05-26

---

## Summary

Update 4.3 is the final Marketing Studio frontend rebuild. It transforms the Studio from a dashboard-style admin tool into a premium AI marketing operating system with a warm, creative visual identity.

---

## Files Removed / Replaced

| File | Action | Reason |
|------|--------|--------|
| `PresenterSelector.tsx` | **Replaced** by `PresenterLibrary.tsx` | Old component was minimal and did not support custom presenter creation |

**No other canonical files were deleted.** The previous studio layer was built incrementally and Update 4.3 upgrades it in place. There are no duplicate route systems, duplicate preview engines or duplicate campaign flows introduced.

---

## Files Created (New)

| File | Purpose |
|------|---------|
| `workspaceConfig.ts` | App-agnostic workspace configuration — single source of truth for app name, industry, goals, platforms, tone |
| `WorkspaceSetupWizard.tsx` | 5-step onboarding wizard (Business Discovery → Growth Targets → Brand & Creative → Platform Connections → AI Operating Mode) |
| `PresenterLibrary.tsx` | Full presenter/avatar system supporting pre-created and custom presenters |

---

## Files Updated (In-Place Replacement)

| File | Change |
|------|--------|
| `types.ts` | `StudioArea` extended: `"assets"` renamed to `"media"`, `"setup"` added as first area |
| `MarketingStudioV2.tsx` | 5-area nav (Setup, Create, Campaigns, Media, Autopilot), warm premium visual, WorkspaceSetupWizard wired, app-agnostic prompts |
| `StudioHero.tsx` | Warm ivory/stone visual, removed hacker/dark theme, removed provider-leaking buttons |
| `OutputCanvas.tsx` | Deliverable-first: title + caption + platform selector + actions shown first; details hidden behind collapsible "View details" |
| `StudioCommandCenter.tsx` | Warm theme, app-agnostic prompts from workspaceConfig |
| `QuickCreateTiles.tsx` | Warm theme, added "7-Day Growth Plan" tile, removed hardcoded equestrian prompts |
| `CampaignContextStrip.tsx` | App-agnostic data from workspaceConfig |
| `AITeamProgress.tsx` | Warm stone/emerald/amber theme |
| `PreviewCanvas.tsx` | Warm theme, removed dark overlay hack |
| `StickyActionBar.tsx` | Warm theme, removed "Export campaign" duplicate, no provider names |
| `CampaignKanban.tsx` | Warm theme, added "Ideas" column, improved card UI |
| `AssetLibrary.tsx` | Renamed to Media Library in heading, warm theme, search added, proper empty state |
| `AutopilotWizard.tsx` | App-agnostic goals from workspaceConfig, supported platforms from workspaceConfig, mode selector added, warm theme |
| `PlatformConnectionCards.tsx` | Warm theme, consistent with Studio design |
| `QualityToggle.tsx` | Warm stone/white theme, only Standard/Elite visible |
| `SetupDrawer.tsx` | Uses `PresenterLibrary` instead of `PresenterSelector`, warm theme throughout |

---

## Files Kept Unchanged

| File | Status |
|------|--------|
| `types.ts` (SUPPORTED_PLATFORMS) | Kept — already correct 9 platforms, no excluded platforms |
| `previews/index.tsx` | Kept — preview engine unchanged |
| All academy components | Kept unchanged |
| All billing components | Kept unchanged |
| All auth components | Kept unchanged |
| All horse management components | Kept unchanged |
| All school management components | Kept unchanged |
| All server routes | Kept unchanged |

---

## Canonical Studio Component Tree

```
MarketingStudioV2
├── StudioHero
│   └── QualityToggle
├── Nav (Setup | Create | Campaigns | Media | Autopilot)
├── [setup] WorkspaceSetupWizard
│   ├── StepBusinessDiscovery
│   ├── StepGrowthTargets
│   ├── StepBrandCreative
│   ├── StepPlatformConnections (uses PLATFORM_CARDS — 9 supported platforms)
│   └── StepAIOperatingMode
├── [create]
│   ├── StudioCommandCenter (prompts from workspaceConfig)
│   ├── QuickCreateTiles (10 tiles including 7-Day Growth Plan)
│   ├── CampaignContextStrip (data from workspaceConfig)
│   ├── AITeamProgress
│   ├── OutputCanvas (deliverable-first, details hidden)
│   ├── PreviewCanvas
│   └── StickyActionBar
├── [campaigns] CampaignKanban
├── [media] AssetLibrary
├── [autopilot] AutopilotWizard (goals/platforms from workspaceConfig)
└── SetupDrawer (hidden drawer for brand/audience/platforms/presenter/providers/diagnostics)
    ├── PlatformConnectionCards
    └── PresenterLibrary
        ├── PresenterCard (pre-created presenters)
        └── CustomPresenterFlow
```

---

## Old Layers Deleted

None. The Studio was already consolidated in Update 4.2. Update 4.3 upgrades the existing canonical layer in place without introducing new parallel systems.

---

## Remaining Technical Debt

| Item | Status |
|------|--------|
| Live website scanning in WorkspaceSetup Step 1 | Placeholder — backend not yet wired |
| Platform OAuth connections | Connection UI ready — backend OAuth flows pending |
| Avatar video playback | UI ready — media generation backend pending |
| Voice sample upload in custom presenter | Upload UI ready — voice processing backend pending |
| Real media in AssetLibrary | UI ready — media job backend connects when configured |
| Autopilot scheduler | Plan generation wired — publishing schedule backend pending |
