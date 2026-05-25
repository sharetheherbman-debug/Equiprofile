# Update 2.2 GenX Live Connectivity

## Status

PARTIAL until production provides a reachable `GENX_BASE_URL` and valid key. The repo no longer treats a saved key as proof that GenX is ready.

## Provider Truth Found

- Previous GenX provider logic defaulted to `https://api.genx.ai`, which produced live fetch failures and misleading readiness UI.
- `server/_core/ai/providers/genxProvider.ts` now reads `genx_base_url` from saved site settings or `GENX_BASE_URL` from env.
- The GenX chat endpoint is built from the configured base URL using the OpenAI-compatible `/v1/chat/completions` path.
- `genx_api_key`/`GENX_API_KEY`, `genx_model`/`GENX_MODEL`, and `genx_base_url`/`GENX_BASE_URL` are resolved by the same config function for diagnostics and generation.

## Fixes Made

- Removed the unconfirmed hardcoded `api.genx.ai` fallback.
- Added `admin.testRawGenXConnection`, which returns:
  - endpoint used
  - HTTP status code
  - response summary
  - latency
  - missing key/base URL state
  - no secret values
- Provider health now marks GenX ready only after a successful live test or recent cached live success.
- Failed live tests clear the cached ready state.
- `createMarketingDraft` continues to return friendly provider states instead of exposing raw fetch errors to the main Studio.

## Admin Messages

- Missing/wrong base URL: `GenX base URL not reachable. Set GENX_BASE_URL.`
- Main Studio failure: `AI provider not connected correctly.`
- Settings tab shows the raw endpoint/status/latency/summary for admin repair.

## Files Changed

- `server/_core/ai/providers/genxProvider.ts`
- `server/_core/ai/providers/providerRegistry.ts`
- `server/_core/ai/orchestrator.ts`
- `server/routers.ts`
- `client/src/pages/AdminCampaigns.tsx`
- `server/_core/ai/providers/providerRegistry.test.ts`

## Remaining Live Requirement

Production still needs a verified GenX-compatible base URL and key. Without those, GenX correctly remains warning/missing instead of fake-ready.
