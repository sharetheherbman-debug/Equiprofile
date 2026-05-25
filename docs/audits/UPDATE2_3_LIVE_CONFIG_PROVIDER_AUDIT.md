# Update 2.3 Live Config Provider Audit

## Findings

1. Provider keys are stored in `siteSettings` through `admin.setSiteSetting` and can also come from env vars.
2. Provider base URLs are stored the same way: saved lowercase site setting first, env fallback second.
3. The Marketing Studio Settings UI did not expose every required base URL/model field. It now exposes GenX, Hugging Face, and Qwen keys/base/model/task model fields.
4. Diagnostics and generation both route through the same provider config functions.
5. GenX could say configured while still unreachable because a key existed but `genx_base_url` / `GENX_BASE_URL` was missing or wrong.
6. `createMarketingDraft` could not generate when provider readiness failed live testing. It now returns a setup state instead of leaking raw provider errors into Studio.
7. Server outbound access is now probed in diagnostics for Hugging Face and the configured GenX origin when present.
8. `/admin` 503 risk was service-worker/cache related when navigation fell back to an offline 503 HTML response. Static serving and backend route registration were not the direct code cause found in repo.

## Config Storage

| Setting | Saved site setting | Env fallback |
| --- | --- | --- |
| GenX key | `genx_api_key` | `GENX_API_KEY` |
| GenX base URL | `genx_base_url` | `GENX_BASE_URL` |
| GenX model | `genx_model` | `GENX_MODEL` |
| Hugging Face key | `huggingface_api_key` | `HUGGINGFACE_API_KEY` |
| HF image model | `hf_task_text_to_image_model` | `HF_TASK_TEXT_TO_IMAGE_MODEL` |
| HF video model | `hf_task_text_to_video_model` | `HF_TASK_TEXT_TO_VIDEO_MODEL` |
| HF avatar model | `hf_task_avatar_video_model` | `HF_TASK_AVATAR_VIDEO_MODEL` |
| HF copywriting model | `hf_task_copywriting_model` | `HF_TASK_COPYWRITING_MODEL` |
| Qwen key | `qwen_api_key` | `QWEN_API_KEY` |
| Qwen base URL | `qwen_base_url` | `QWEN_BASE_URL` |
| Qwen model | `qwen_model` | `QWEN_MODEL` |

## Root Causes

- `getRuntimeConfig` previously preferred env values over saved site settings, which made admin edits less useful for live repair.
- GenX had no verified default base URL. A key without base URL is not a usable provider.
- Full provider testing did not clearly separate raw GenX connectivity from actual copy/chat generation.
- Hugging Face media readiness could be hidden behind missing HF copywriting setup.
- The service worker offline HTML fallback returned status 503, which could make `/admin` look like a server/Nginx failure when the cached/offline path was involved.

## Repaired

- Site settings now take precedence over env fallback.
- Provider base URLs are validated and normalized before saving.
- GenX raw test and GenX copy-generation readiness are separated.
- HF image/video/avatar tests can run independently of HF copywriting.
- Diagnostics include endpoint, model, status, latency, last success/error, missing config guidance, storage probe, platform state, and outbound network probe.
