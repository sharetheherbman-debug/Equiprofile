# Update 3.1 Settings Repair QA

## What Changed

- Added direct tests that `admin.getSiteSettings` reads from the Drizzle `siteSettings` schema object.
- Added direct tests that persisted provider keys survive the `getSiteSettings` response shape.
- Added direct tests that `getRuntimeConfig` reads the same `siteSettings` schema object before falling back to env.
- Left the existing `admin.setSiteSetting` persistence path intact because it already writes to `siteSettings` and invalidates the runtime config cache.

## Provider Keys Covered

- `genx_api_key`
- `huggingface_api_key`
- `qwen_api_key`

## Advanced Settings Covered

- `genx_base_url`
- `genx_model`
- `hf_task_text_to_image_model`
- `hf_task_text_to_video_model`
- `hf_task_avatar_video_model`
- `hf_task_copywriting_model`
- `qwen_base_url`
- `qwen_model`

## Result

The settings repair is a truth/documentation and test-hardening repair, not a duplicate table or migration. The correct live table is `siteSettings`; the failed manual `site_settings` query used the wrong table name.
