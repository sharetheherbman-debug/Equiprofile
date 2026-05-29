# Marketing App — Target Architecture

> **Status**: Architecture contract for PR41+. This document is the single source of truth for what the Marketing App is, what it delivers, and how every layer is structured.

---

## 1. Product Definition

The Marketing App is a **reusable, multi-tenant AI Marketing Studio add-on** that can be installed into EquiProfile and future host applications.

### Core traits

| Trait | Detail |
|---|---|
| Per-app workspace | Every host app gets an isolated workspace (`workspaceId` + `hostAppId`) |
| Per-app brand kit | Logo, colours, fonts, CTA, tone stored per workspace |
| Per-app provider keys | GenX, Qwen, HuggingFace, Pexels, Pixabay keys scoped per app |
| Per-app assets/campaigns | All media assets and campaigns are isolated by tenant + workspace |
| Export-first workflow | No real social posting until a verified connector is wired |
| Approval-first workflow | All generated content enters a `needs_review` state before export |

---

## 2. Deliverables

| Deliverable | Platform | Approx. duration | Assembly required |
|---|---|---|---|
| Facebook Ad | Facebook | 15–30 s image/video | Yes (assembled_video or image export) |
| Instagram Reel | Instagram | 15–60 s | Yes (assembled_video) |
| TikTok Video | TikTok | 15–60 s | Yes (assembled_video) |
| LinkedIn Post | LinkedIn | image + caption | No (text_pack + image export) |
| YouTube Short | YouTube | 30–60 s | Yes (assembled_video) |
| YouTube 3-minute Video | YouTube | ~180 s | Yes (assembled_video, multi-scene) |
| Email Campaign | Email | n/a | No (text_pack) |
| Blog / SEO Article | Web | n/a | No (text_pack) |
| Weekly Content Pack | Multi-channel | n/a | No (campaign_pack) |
| Launch Campaign | Multi-channel | n/a | No (campaign_pack) |
| Lead-generation Campaign | Multi-channel | n/a | No (campaign_pack) |
| Branded image/video export | Any | varies | No (export_only) |

---

## 3. Studio Workflow

Every deliverable passes through the same ordered workflow. Steps may be skipped if not required for the content type.

```
1. Brief           ← user intent, goal, audience, platform
2. Script / Copy   ← AI-generated copy / narration / body text
3. Scene Plan      ← (video only) ordered scene list with timing
4. Media Sources   ← stock / generated / upload / text card per scene
5. Voice / Audio   ← (optional) voiceover + background music
6. Captions        ← (optional) auto-generated subtitle track
7. Brand Overlay   ← logo, watermark, CTA, colour treatment
8. Render          ← assembly job (Remotion + FFmpeg via BullMQ)
9. Review          ← human QA gate, needs_review → approved
10. Export / Schedule ← download pack or schedule in calendar
```

---

## 4. Frontend Module Map

### Shell
| Module | Path | Role |
|---|---|---|
| `MarketingAppShell` | `app/MarketingAppShell.tsx` | Top-level layout, workspace context loader, section router |
| `StudioHome` | `app/studio/StudioHome.tsx` | Create section home: type picker or free-form chat entry |
| `StudioWorkbench` | `app/studio/StudioWorkbench.tsx` | Ordered step-by-step workbench once a type is selected |

### Workbench steps
| Module | Path |
|---|---|
| `CreateTypeSelector` | `app/studio/CreateTypeSelector.tsx` |
| `BriefStep` | `app/studio/BriefStep.tsx` |
| `ScriptStep` | `app/studio/ScriptStep.tsx` |
| `ScenePlanStep` | `app/studio/ScenePlanStep.tsx` |
| `MediaSelectionStep` | `app/studio/MediaSelectionStep.tsx` |
| `VoiceAudioStep` | `app/studio/VoiceAudioStep.tsx` |
| `CaptionsStep` | `app/studio/CaptionsStep.tsx` |
| `BrandOverlayStep` | `app/studio/BrandOverlayStep.tsx` |
| `RenderStep` | `app/studio/RenderStep.tsx` |
| `ExportStep` | `app/studio/ExportStep.tsx` |

### Library panels
| Module | Path |
|---|---|
| `AssetLibrary` | `app/assets/` |
| `CampaignWorkspace` | `app/campaigns/` |
| `CalendarPlanner` | `app/calendar/` |
| `BrandKitEditor` | `app/brand/` |
| `MarketingSettings` | `app/settings/` |

### Rules for `TheMarketingApp.tsx`
- Load workspace context only.
- Manage active top-level section state only.
- Render `MarketingAppShell` with the active section component.
- Pass required IDs / config via props.
- **No business logic. No large hooks. No inline generation code.**

---

## 5. Backend Module Map

| Module | Path | Responsibility |
|---|---|---|
| `marketingIntentPlanner` | `server/modules/marketing/marketingIntentPlanner.ts` | Classify user prompt into a `MarketingContentType` |
| `marketingContentPlanner` | `server/modules/marketing/marketingContentPlanner.ts` | Generate script / copy from brief |
| `marketingScenePlanner` | `server/modules/marketing/marketingScenePlanner.ts` | Decompose script into ordered scenes |
| `marketingPromptCompiler` | `server/modules/marketing/marketingPromptCompiler.ts` | Build per-scene generation prompts |
| `marketingCapabilityValidator` | `server/modules/marketing/marketingCapabilityValidator.ts` | Decide what generation is possible before any provider call |
| `marketingRenderJobManager` | `server/modules/marketing/marketingRenderJobManager.ts` | Submit/track BullMQ render jobs |
| `marketingAssetAssembler` | `server/modules/marketing/marketingAssetAssembler.ts` | Compose scenes into final video via Remotion/FFmpeg |
| `marketingBrandOverlayService` | `server/modules/marketing/marketingBrandOverlayService.ts` | Apply brand watermark/CTA/colour via Sharp |
| `marketingCaptionService` | `server/modules/marketing/marketingCaptionService.ts` | Generate SRT/VTT from narration text |
| `marketingStockMediaService` | `server/modules/marketing/marketingStockMediaService.ts` | Search Pexels/Pixabay per scene brief |
| `marketingVoiceService` | `server/modules/marketing/marketingVoiceService.ts` | Route TTS requests; guard against unset providers |
| `marketingQualityGate` | `server/modules/marketing/marketingQualityGate.ts` | Set `needs_review` unless visual QA is available |

---

## 6. Required Libraries

These libraries must be installed before PR42 (Media Factory Core). They are listed here so dependency resolution can be planned ahead.

| Library | Purpose |
|---|---|
| `remotion` | Programmatic video composition |
| `@remotion/player` | Preview player in browser |
| `ffmpeg-static` | Bundled FFmpeg binary for server render |
| `execa` | Shell execution for FFmpeg pipelines |
| `bullmq` | Redis-backed job queue for render jobs |
| `ioredis` | Redis client |
| `@fullcalendar/core` + `/react` + `/daygrid` + `/timegrid` + `/interaction` | Calendar planner UI |
| `@huggingface/inference` | HF inference client |
| `subtitle` | Parse/generate SRT/VTT caption files |
| `sharp` | Image processing for brand overlays |
| `react-dropzone` | Media upload UI |
| `react-easy-crop` | In-browser image crop |
| `dayjs` | Date/time utilities |

---

## 7. Capability Rules

These rules are enforced by `marketingCapabilityValidator` **before any provider call is made**.

| Rule | Constraint |
|---|---|
| 3-minute video | Always `assembled_video`. Never `raw_clip`. |
| 30–60 s reels/shorts | `assembled_video` unless provider explicitly supports that duration |
| 15+ second requests | Must not be sent blindly to a raw video provider |
| Raw clip max duration | If provider supports only 5–10 s, split into scenes or block direct generation |
| Horse / equine context | Subject must be horse/equine/stable/stable-owner. Laptop/office/generic gibberish subjects are blocked. |
| Missing capability | Return a user-friendly planning response — never a failed generation |
| Generated content status | All outputs are `needs_review` until a visual QA gate is wired |
| Unsupported actions | Block before API call; surface a clear message, not a silent failure |

---

## 8. What comes next (PR42+)

- **PR42**: Media Factory Core — Remotion renderer, FFmpeg pipeline, BullMQ worker, scene assembly.
- **PR43**: Voice + Captions — TTS provider routing, caption SRT/VTT generation.
- **PR44**: Brand Overlay Service — Sharp-based watermark/CTA pipeline.
- **PR45**: Stock Media Integration — Pexels/Pixabay per-scene search + download.
- **PR46**: Calendar & Approval — Full FullCalendar + approval workflow with real DB states.
- **PR47**: Social Connectors (real OAuth) — Facebook/Instagram posting when connectors are verified.
