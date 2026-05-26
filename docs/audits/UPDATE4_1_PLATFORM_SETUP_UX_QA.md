# Update 4.1 Platform Setup UX QA

## Repairs

- Replaced `draft mode` as the primary platform message with go-live language.
- Platform cards now explain:
  - status
  - connect action placeholder
  - supported outputs
  - what works now
  - what is needed before direct publishing
- Direct publishing is not faked.
- Social cards state: `Connection flow required before direct publishing`.
- Content preparation, previews, approvals and scheduling prep remain available.

## Files

- `client/src/pages/AdminCampaigns.tsx`
- `client/src/components/marketing/PlatformPreview.tsx`
- `server/_core/ai/orchestrator.ts`

## Tests

- `server/marketingStudio.product.test.ts`
  - Checks all platform cards render.
  - Checks existing Growth Engine social connection mutation is still used.
  - Checks preview uses `Content prep` instead of raw draft-mode framing.

## Result

Platforms page now points clearly toward connection/OAuth work without pretending publishing is already live.
