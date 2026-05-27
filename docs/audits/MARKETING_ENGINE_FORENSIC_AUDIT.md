# MARKETING ENGINE FORENSIC AUDIT

## Active source-of-truth files
- `server/routers.ts` (Marketing Studio admin contracts, media job entrypoints)
- `server/_core/ai/orchestrator.ts` (execution lifecycle + retries)
- `server/_core/ai/providers/providerRegistry.ts` (provider availability and fallback routing)
- `server/_core/ai/providerModelDiscovery.ts` (task-first model discovery)
- `server/_core/ai/mediaResolver.ts` (async GenX resolver and asset updates)
- `server/modules/growth-engine/mediaAssets.ts` (canonical media registry)
- `client/src/components/marketing/studio/MarketingStudioV2.tsx` + `PreviewCanvas.tsx` (studio state truth)

## Dead layers removed/quarantined
- Replaced direct raw user media prompt pass-through with `server/_core/marketing/promptCompiler.ts`.
- Removed telemetry hard-dependency on live DB during unit tests via test-safe runtime mode.
- Quarantined false-ready diagnostics in unit test mode via runtime-config diagnostics.

## Remaining known limitations
- FFmpeg must be installed on host for branded derivative output.
- 30s/60s/180s requests are scene-plan mode unless scene assembly pipeline is executed.
- Provider live quality still depends on external endpoint stability and account quotas.

## Provider status truth
- GenX: primary for playable media (text-to-video/image/audio) when model + endpoint are live.
- Hugging Face: DNS/network check is mandatory for media readiness; unavailable when resolution fails.
- Qwen: text/vision/embeddings are compatible-mode; media remains `setup_needed` until native executor is implemented.

## Generation pipeline diagram
1. Studio request (`createMediaJob`)
2. Prompt compile + policy selection
3. Capability/model resolution
4. Queued execution (`executeAITask`)
5. Retry/variant loop (`retrying` lifecycle state)
6. Persist raw media asset + metadata
7. Optional post-processing overlay (`createBrandedMediaAsset`)
8. Resolver/polling updates lifecycle until terminal state

## Test isolation status
- `dynamicConfig` now defaults to `unit_test_mock` mode in Vitest.
- Provider telemetry read/write returns safely without DB access in unit tests.
- Added `providerTestIsolation.test.ts` to assert no DB call path for provider unit tests.

## Next-phase blockers
- Scene rendering + assembly worker for 30s/60s/3min deliverables.
- FFmpeg runtime packaging and ops monitoring in deployment.
- Model benchmark store and automated prompt quality scoring loop.
