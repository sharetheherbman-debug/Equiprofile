# UPDATE 4.3 — Plug-and-Play Frontend Architecture

Generated: 2026-05-26

---

## Purpose

Marketing Studio must be installable into ANY app with minimal changes. This document defines the app-agnostic architecture implemented in Update 4.3.

---

## Canonical Configuration File

```
client/src/components/marketing/studio/workspaceConfig.ts
```

### Interface

```typescript
interface WorkspaceConfig {
  appName: string;
  industry: string;
  defaultAudience: string;
  defaultGoals: string[];
  primaryCTA: string;
  brandTone: "warm" | "professional" | "authoritative" | "playful" | "bold";
  supportedPlatforms: SupportedPlatformId[];
  defaultPresenter: string;
  contentExamples: string[];
}
```

### Current Values (EquiProfile)

| Field | Value |
|-------|-------|
| appName | EquiProfile |
| industry | equestrian management |
| defaultAudience | stable owners, riding school operators and horse owners in the UK |
| defaultGoals | Get 50 signups, Grow social following, Promote academy, Launch feature, Reactivate trials |
| primaryCTA | Start your free trial |
| brandTone | warm |
| supportedPlatforms | All 9 supported platforms |
| defaultPresenter | Growth Coach |
| contentExamples | 6 example prompts |

---

## How to Re-skin for a New App

To install Marketing Studio into a new product (e.g. a fitness app or a legal SaaS):

1. Update `workspaceConfig.ts` only
2. Change `appName`, `industry`, `defaultAudience`, `defaultGoals`, `contentExamples`
3. All components dynamically consume config — no hardcoded equestrian references in components
4. PresenterLibrary supports dynamic presenter discovery — future AI model-driven presenters will be surfaced without changing component architecture

---

## App-Agnostic Guarantees

| Component | Hardcoded product? | Source |
|-----------|--------------------|--------|
| MarketingStudioV2 | ❌ No | workspaceConfig |
| StudioCommandCenter | ❌ No | workspaceConfig.contentExamples |
| CampaignContextStrip | ❌ No | workspaceConfig.defaultGoals, defaultAudience, defaultPresenter |
| AutopilotWizard | ❌ No | workspaceConfig.defaultGoals, supportedPlatforms |
| QuickCreateTiles | ❌ No | Static tile labels (generic) |
| PresenterLibrary | ❌ No | Future dynamic from AI model registry |
| WorkspaceSetupWizard | Partial | appName used as placeholder — generic otherwise |

---

## Supported Platforms (Canonical List)

Only these 9 platforms are rendered anywhere in the Studio:

1. Facebook Pages
2. Instagram Business
3. TikTok Business
4. YouTube Shorts
5. YouTube Long-form
6. LinkedIn Company Pages
7. Google Business Profile
8. Email
9. Blog / SEO

### Excluded (removed and not rendered)

- Telegram
- WhatsApp
- Snapchat
- Pinterest
- X / Twitter
- Reddit

---

## Future Dynamic Presenter Discovery

`PresenterLibrary.tsx` is architected to support future dynamic presenter loading from:

- GenX model registry
- Kling-style avatar systems
- Qwen TTS voice models
- Hugging Face voice/video models

The UI abstracts all AI provider details. Users only see: Name, Role, Voice Style, Accent, Energy, Best use.

No provider names, model names or base URLs are exposed.

---

## What Changes Per App Install

| What | How |
|------|-----|
| App name | `workspaceConfig.appName` |
| Industry focus | `workspaceConfig.industry` |
| Audience | `workspaceConfig.defaultAudience` |
| Goals | `workspaceConfig.defaultGoals` |
| CTA | `workspaceConfig.primaryCTA` |
| Tone | `workspaceConfig.brandTone` |
| Platforms | `workspaceConfig.supportedPlatforms` |
| Example prompts | `workspaceConfig.contentExamples` |
| Presenters | `PresenterLibrary` pre-created array or future dynamic registry |

---

## What Does NOT Change Per App Install

- Component architecture
- Route structure
- Preview engine
- Campaign kanban logic
- Media library logic
- Autopilot wizard logic
- AI quality model (Standard / Elite only, never provider names)
- SetupDrawer structure
- Accessibility patterns
