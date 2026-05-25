# Update 3 Capability Router QA

## Implemented

- Added `server/_core/ai/capabilityRouter.ts`.
- Product intents include social posts, reels/shorts, YouTube scripts, LinkedIn, Google Business, email campaigns, image ads, avatar video, voiceover, campaign calendars, platform packs, compliance review, and growth scoring.
- Each intent maps to internal steps for strategy, copywriting, creative/script, media if applicable, compliance, and scheduling.

## Provider Routing

- Text strategy/copy defaults to GenX first.
- Qwen is the next text fallback.
- Hugging Face remains media-first and only copy fallback when explicitly configured/tested.
- Reel/short video plans remain prompt-only until playable video provider tests pass.

## User-Facing Surface

The UI receives only simple readiness and generated draft/preview data. It does not expose task IDs, provider order, model choices, base URLs, or capability matrices in the main Studio.

## Tests

- `server/_core/ai/capabilityRouter.test.ts`
- `server/modules/growth-engine/inferMarketingRequest.test.ts`
- `server/marketingStudio.product.test.ts`
