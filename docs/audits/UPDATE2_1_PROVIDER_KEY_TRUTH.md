# Update 2.1 — Provider Key Truth Audit

## Scope reviewed
- `admin.setSiteSetting`, `admin.getSiteSettings`
- `getRuntimeConfig`
- `siteSettings` table schema
- `server/_core/env.ts`
- `providerRegistry`, `genxProvider`, `huggingFaceProvider`, `qwenProvider`
- `getAIDiagnostics`, `createMarketingDraft`, `executeAITask`, `taskRegistry`

## Findings
1. **Are GenX/HF/Qwen keys read from `.env`?**
   - Yes. `getRuntimeConfig(settingKey, envVar)` checks env first.
2. **Are GenX/HF/Qwen keys read from site settings?**
   - Yes. If env is missing, `getRuntimeConfig` reads `siteSettings` (`genx_api_key`, `huggingface_api_key`, `qwen_api_key`).
3. **Does `getAIDiagnostics` use same lookup path as generation?**
   - After Update 2.1 fixes: yes. Both diagnostics and runtime routing depend on provider registry availability checks using `getRuntimeConfig`.
4. **Why UI said configured but generation called HF and failed?**
   - Prior behavior allowed fallback to HF with implicit default copywriting model, and provider errors surfaced raw.
5. **Why `createMarketingDraft` used HF Llama instead of GenX?**
   - Fallback and model resolution allowed HF copywriting defaults; routing did not hard-block unavailable paths with clean provider_missing handling.
6. **Does `COPYWRITING_PROVIDER` override routing incorrectly?**
   - Fixed to only prioritize the override if valid **and available** for copywriting.
7. **Does missing `GENX_BASE_URL` cause GenX to be skipped?**
   - No. GenX provider defaults to `https://api.genx.ai` and normalizes `/v1`.
8. **Are saved admin keys encrypted/decrypted correctly?**
   - `siteSettings.value` stores raw text (not encrypted). This is current implementation behavior.

## Final truth statement
Diagnostics and real generation now share the same provider availability source (`getRuntimeConfig` + provider availability checks), including explicit HF copywriting model gating.
