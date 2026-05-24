# BETA BLOCKER — AI Capability Map (GenX + Hugging Face)

## Runtime sources audited
- `server/_core/ai/tasks/taskRegistry.ts`
- `server/_core/ai/providers/providerRegistry.ts`
- `server/_core/ai/agents/registry.ts`
- `server/routers.ts` (`admin.generateMarketingDraft`, `admin.createMediaJob`, diagnostics)
- `client/src/pages/AdminCampaigns.tsx`

## Capability matrix
| Capability | Backend task(s) | Primary provider | Fallback | Marketing Studio flow |
|---|---|---|---|---|
| Text/copy generation | `copywriting` | GenX | Hugging Face | Composer / Email draft creation |
| Campaign planning | `copywriting` + GrowthAgent policy | GenX | Hugging Face | Composer (launch/campaign drafting) |
| Email drafts | `copywriting` | GenX | Hugging Face | Email Studio create draft |
| Social drafts | `copywriting` | GenX | Hugging Face | Composer social draft |
| Image prompts | `copywriting` and media queue prep | GenX | Hugging Face | Composer + Media Studio |
| Image generation jobs | `text_to_image`, `image_edit` | Hugging Face | GenX | Media Studio job queue |
| Video prompts | `copywriting` | GenX | Hugging Face | Composer video prompt |
| Video generation jobs | `text_to_video`, `image_to_video` | Hugging Face | GenX | Video Studio job queue |
| Avatar scripts | `copywriting` | GenX | Hugging Face | Composer avatar script |
| Avatar/video jobs | `avatar_video`, `text_to_video`, `image_to_video` | Hugging Face | GenX | Avatar/Video Studio queue |
| Moderation | `moderation` | Hugging Face | GenX | Compliance + policy hooks |
| Classification | `classification` | Hugging Face | GenX | Routing, diagnostics, support tasks |
| Embeddings | `embeddings` | Hugging Face | GenX | Available in AI core/task layer |
| Speech tasks | `speech_to_text`, `text_to_speech` | Hugging Face | GenX | Media agent/runtime support |

## Activation behavior
- If provider key exists, diagnostics show provider as configured/healthy.
- If key missing, diagnostics show explicit missing-key message.
- Composer/media actions route through backend and return explicit errors when provider config is missing.

## Admin wiring status
- Marketing Studio sections are wired to backend contracts (draft generation, media jobs, approvals, diagnostics).
- Provider settings panel supports runtime key/base/model updates via site settings.
- Health state is exposed in AI Providers / Diagnostics tab.
