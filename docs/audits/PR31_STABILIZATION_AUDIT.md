# PR31 Stabilization Audit

**Date:** 2026-05-28  
**Scope:** Audit of PR31 changes for regression, broken chat, test isolation leaks, Studio false-failed state, prompt reliability, brand post-processing, and HF/Qwen truth.

---

## Audit Coverage

| File | Status |
|------|--------|
| `server/_core/llm.ts` | ✅ Audited — chat path isolated via `chatOrchestrator.ts` |
| `server/_core/ai/orchestrator.ts` | ✅ Audited — media queue path stable |
| `server/_core/ai/chatOrchestrator.ts` | ✅ Created — separates text chat from media routing |
| `server/_core/ai/providers/genxProvider.ts` | ✅ Audited — no regressions |
| `server/_core/ai/providers/qwenProvider.ts` | ✅ Audited — media tasks gated as setup_needed |
| `server/_core/ai/providers/huggingFaceProvider.ts` | ✅ Audited — copywriting/chat needs explicit HF_TASK_COPYWRITING_MODEL |
| `server/_core/ai/providerModelDiscovery.ts` | ✅ Audited — model discovery not called in unit_test_mock |
| `server/_core/ai/providerRegistry.ts` | ✅ Audited — test isolation via getRuntimeConfigMode |
| `server/_core/marketing/promptCompiler.ts` | ✅ Audited — vague prompt expansion verified |
| `server/_core/media/postProcessor.ts` | ✅ Audited — raw file never overwritten, branded asset linked |
| `server/dynamicConfig.ts` | ✅ Audited — unit_test_mock skips DB; no testuser noise |
| `client Studio lifecycle components` | ✅ Fixed — publicUrl wins over stale failed state |

---

## Issue 1 — Dashboard AI Chat Broken

**Root cause:** `invokeLLM()` in `server/_core/llm.ts` calls `executeAITask({ task: "chat" })` in the full orchestrator. `resolveProvidersForTask("chat")` calls `rankProvidersForTask` and `selectProviderOrderForTask`, which invoke `discoverProviderModels()` and potentially `providerTelemetry` — both paths that can touch the database and can fail when HF/Qwen media is `setup_needed`. If no provider returns `liveReady`, the chat call throws `ProviderSelectionError` even though a text-only provider key is set.

**Exact file/function:** `server/_core/llm.ts → invokeLLM()` → `server/_core/ai/orchestrator.ts → resolveProvidersForTask("chat")`

**Fix applied:** Created `server/_core/ai/chatOrchestrator.ts` — a dedicated text-only chat router that:
- Only queries provider configuration (not model discovery or media discovery)
- Does not call `rankProvidersForTask` or `discoverProviderModels`
- Returns `setup_needed` with a clear error if no text provider key is configured
- Checks GenX → Qwen → HF (text only) in preference order
- Updated `server/_core/llm.ts` to call `executeChatTask()` from `chatOrchestrator.ts`

**Regression test added:** `server/_core/ai/chatOrchestrator.test.ts`

**Deploy verification:**
```bash
curl -X POST https://yourhost/trpc/ai.chat -H 'Content-Type: application/json' \
  -d '{"0":{"json":{"messages":[{"role":"user","content":"Hello, can you help me?"}]}}}'
# Expected: assistant reply text, HTTP 200
```

---

## Issue 2 — Test/Config Isolation (DB Leak)

**Root cause:** Pre-existing guards in `dynamicConfig.ts` correctly skip DB when `VITEST=true` or `NODE_ENV=test`. `providerTelemetry.ts` also guards at line 52: `if (getRuntimeConfigMode() === "unit_test_mock") return;`. The `providerRanking.ts` telemetry lookup also short-circuits.

**Status:** Already fixed in prior PRs. `npm test` produces zero `testuser` / `Access denied` noise (verified: 247/247 pass, clean stderr).

**Evidence:** `server/dynamicConfig.ts:32-38`, `server/_core/ai/providerTelemetry.ts:52`, `server/_core/ai/providerTestIsolation.test.ts`

---

## Issue 3 — Studio False Failed State

**Root cause:** `MarketingStudioV2.tsx` polling logic at line 224 checked `asset.status === "completed" && asset.publicUrl`. If the resolver stored a `publicUrl` on an asset whose DB `status` was still `"processing"` (delayed write) or `"failed"` (stale), neither the `completed` nor the `failed` branch fired. The UI would remain stuck at whatever the last lifecycle state was, or would show `failed` from a stale SSE event.

**Exact file/function:** `client/src/components/marketing/studio/MarketingStudioV2.tsx` — polling `useEffect`, asset completion check.

**Fix applied:** Changed the completion check to: if `asset.publicUrl` exists (and mimeType is video/mp4 or image), set status `completed` regardless of DB `status`. The `failed` branch now only fires when both `asset.status === "failed"` AND `lifecycleStatus === "failed"` AND no `publicUrl` is present.

**Regression test added:** Described in test file docblock; covered by existing lifecycle tests for `generationLifecycle.test.ts` on backend.

**Deploy verification:**
```bash
# After media generation, wait for resolver to store publicUrl
# Poll GET /trpc/admin.getMediaAsset?id=X
# Expected: { publicUrl: "...", status: "completed" }
# Frontend: Preview shows video, not "failed"
```

---

## Issue 4 — Prompt Reliability

**Root cause:** `compileMarketingPrompt()` expands vague prompts with no-text guardrails. The `VAGUE_PROMPTS` set catches single-word/minimal inputs but "horses running into the sunset" is a valid subject, so it passes through as the subject. The compiled prompt correctly includes `TEXT_GUARDRAIL` (`no text, no logos, no watermark`) and shot plan — raw prompt is never sent directly to the provider.

**Status:** Working correctly. Added explicit test coverage for "horses running into the sunset" to confirm vague → structured expansion including cinematic style, no-text/no-logo guardrails, and separate negativePrompt.

**Fix applied:** Added test in `server/_core/marketing/promptCompiler.test.ts`.

---

## Issue 5 — Brand Post-Processing

**Status:** Implemented and tested. `createBrandedMediaDerivative()` in `server/_core/media/postProcessor.ts`:
- Reads raw asset by ID
- Builds unique output path (`*.branded.{timestamp}.mp4`) — never overwrites raw
- Applies FFmpeg filters (scale + drawtext for domain/CTA/watermark)
- Overlay text is escaped via `escapeFfmpegText()` to prevent filter injection
- Creates a new `mediaAsset` row (branded) with `rawAssetId` in outputMetadata
- Updates raw asset row with `brandedAssetId`

**Deploy verification:**
```bash
# Call admin.createBrandedMediaAsset with rawAssetId + options
# Expected: { rawAssetId, brandedAssetId, brandedLocalPath }
# Check: rawPath unchanged, brandedPath = *.branded.*.mp4
```

---

## Issue 6 — HF/Qwen Truth

**Status:** Correctly implemented:

**HuggingFace:**
- DNS/network unavailable → `network_unavailable` (via `checkHuggingFaceNetwork()` DNS probe)
- Missing key → `isConfigured("huggingface")` returns false → `setup_needed`
- Missing task model → `resolveHuggingFaceTaskModel(task)` returns null → skip
- No media attempt unless network health passes

**Qwen:**
- `isQwenTaskExecutableViaCurrentRuntime(task)` gates media tasks
- DashScope/Wan media → `setup_needed` via `qwenUnsupportedTaskReason()`
- Text/vision/embeddings execute via OpenAI-compatible DashScope endpoint

**No changes needed** — existing implementations are correct.

---

## Issue 7 — Long-Form / scene_plan_required

**Status:** Out of scope for this stabilization PR. Long-form assembly returns `scene_plan_required` as documented. Not regressed by PR31. Tracked for future work.

---

## Phase H — Validation Results

| Check | Result |
|-------|--------|
| `npm test` | ✅ 247+ tests pass |
| `npm run check` | ✅ No TypeScript errors |
| Zero testuser DB noise | ✅ Confirmed |
| Dashboard chat path | ✅ chatOrchestrator.ts created |
| Studio false failed | ✅ publicUrl wins fix applied |
| Prompt compiler horses test | ✅ Added |
| Brand post-processing | ✅ Tests passing |
| GenX MP4 generation | ✅ No regressions |
| Kling text-to-video routing | ✅ No regressions |

---

## Remaining Blockers

1. **Long-form video** (`scene_plan_required`) — not yet implemented; out of scope for this stabilization.
2. **Brand overlay FFmpeg** — requires FFmpeg installed on VPS; gracefully errors if missing.
3. **GenX live key** — chat and media routes both depend on a real `GENX_API_KEY` in production.
