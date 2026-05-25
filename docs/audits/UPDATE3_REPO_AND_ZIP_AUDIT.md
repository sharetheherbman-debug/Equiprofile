# Update 3 Repo And Zip Audit

## Scope

Compared current EquiProfile `main` with `Amarktai-Marketing-main (4).zip`.

## Useful Concepts From The Zip To Adapt

- Guided content creation flow with a clear command/brief -> generate -> preview -> approve/schedule path.
- Creation intent cards such as quick post, short video, YouTube kit, talking avatar, image creative, voiceover, and platform pack.
- Platform intelligence catalog ideas for supported formats and recommended channels.
- User-facing draft cards that hide provider/model/debug metadata unless the user opens advanced details.
- Preview-first workflow where generated content is visible immediately.
- Draft/library separation so saved content does not dominate the main creation workspace.
- Approval-first scheduling and rejection/learning concepts.

## Must Not Be Copied

- FastAPI backend, Celery, Alembic/Postgres migrations, Docker deployment, Nginx configs, and Python scripts.
- Separate auth, billing, CRM, scheduler, provider router, posting, or media systems.
- Raw provider/model/debug UI from the reference app.
- Any social publishing claims beyond draft mode.

## EquiProfile Already Has

- React/Express monolith with tRPC admin routes.
- Growth Engine foundations for brand profiles, avatars, social connection state, queues, media assets, content scoring, platform rules, approvals, and scheduling.
- AI core with task registry, provider registry, provider diagnostics, approval queue, media job manager, usage analytics, moderation, and agent registry.
- Marketing contacts, suppression/unsubscribe handling, email campaign schema, campaign replies, and CSV export paths.
- Hidden-admin Marketing Studio route and existing admin shell isolation.

## EquiProfile Was Missing

- Product-intent capability routing that turns user requests into internal tasks without exposing models.
- A full marketing-agent team vocabulary beyond the previous generic GrowthAgent.
- A dedicated platform preview component.
- Key-first provider setup with base URL/model overrides hidden under advanced repair.
- Clear AI team progress in the main Studio.
- Provider documentation truth reflecting verified GenX/Qwen/HF shapes.

## Duplicate/Scaffold Risks

- Importing the zip backend would create duplicate auth, database, provider, scheduler, CRM, and deployment stacks.
- Creating a second Marketing Studio would confuse existing hidden-admin workflows.
- Adding social publishing before OAuth/backend publishing exists would fake capability.
- Exposing task/model matrices in the main workspace would keep the product feeling like a debug panel.

## Files Changed

- `server/_core/ai/capabilityRouter.ts`
- `server/_core/ai/types.ts`
- `server/_core/ai/index.ts`
- `server/_core/ai/agents/registry.ts`
- `server/_core/ai/providers/genxProvider.ts`
- `server/_core/ai/providers/providerRegistry.ts`
- `server/modules/growth-engine/inferMarketingRequest.ts`
- `server/modules/growth-engine/marketingPromptBuilder.ts`
- `server/routers.ts`
- `client/src/components/marketing/PlatformPreview.tsx`
- `client/src/pages/AdminCampaigns.tsx`
- `.env.example`
- Focused tests under `server/_core/ai`, `server/modules/growth-engine`, and `server/marketingStudio.product.test.ts`.
