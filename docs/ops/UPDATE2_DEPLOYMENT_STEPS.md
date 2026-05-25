# Update 2 Deployment Steps

## New / relevant environment variables

### GenX
- `GENX_API_KEY`
- `GENX_BASE_URL` (optional; normalized to avoid duplicate `/v1`)
- `GENX_MODEL` (optional)

### Hugging Face
- `HUGGINGFACE_API_KEY`
- Task model overrides (recommended for media truthfulness):
  - `HF_TASK_TEXT_TO_IMAGE_MODEL`
  - `HF_TASK_TEXT_TO_VIDEO_MODEL`
  - `HF_TASK_IMAGE_TO_VIDEO_MODEL`
  - `HF_TASK_TEXT_TO_SPEECH_MODEL`
  - `HF_TASK_AVATAR_VIDEO_MODEL`
  - `HF_TASK_COPYWRITING_MODEL` (optional)

### Qwen (optional advanced provider)
- `QWEN_API_KEY`
- `QWEN_BASE_URL` (optional)
- `QWEN_MODEL` (optional)
- `COPYWRITING_PROVIDER=qwen` (optional override)

### Storage
- `EQUIPROFILE_STORAGE_ROOT` (optional; default `/var/equiprofile/storage`)

## Provider test commands

Use Admin → Marketing Studio → Settings:
- Test GenX text generation
- Test Hugging Face task route
- Run full provider test

## Hugging Face model override examples

- Image generation:
  - `HF_TASK_TEXT_TO_IMAGE_MODEL=black-forest-labs/FLUX.1-schnell`
- Video generation:
  - `HF_TASK_TEXT_TO_VIDEO_MODEL=genmo/mochi-1-preview`
- Avatar/video:
  - `HF_TASK_AVATAR_VIDEO_MODEL=Wan-AI/Wan2.2-I2V-A14B`

## Qwen optional setup

1. Set `QWEN_API_KEY`
2. Optionally set `QWEN_BASE_URL` and `QWEN_MODEL`
3. (Optional) set `COPYWRITING_PROVIDER=qwen` to prefer Qwen for copywriting/chat

## VPS storage verification

- Confirm root path exists and writable by app user.
- Confirm generated files appear under:
  - `${EQUIPROFILE_STORAGE_ROOT:-/var/equiprofile/storage}/images`
  - `${EQUIPROFILE_STORAGE_ROOT:-/var/equiprofile/storage}/videos`
  - `${EQUIPROFILE_STORAGE_ROOT:-/var/equiprofile/storage}/voice`

## Nginx media route verification

Ensure `/media/generated/*` is routed to storage-backed files and serves:
- `image/*`
- `video/*`
- `audio/*`

## Rollback notes

1. Revert to previous release bundle.
2. Keep database schema unchanged (Update 2 is provider/runtime behavior and docs/tests; no new migration required).
3. If provider instability appears, disable optional provider usage by unsetting `COPYWRITING_PROVIDER` and `QWEN_*` vars.
