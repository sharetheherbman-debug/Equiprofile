# Update 2 — Hugging Face Provider QA

- Added task-aware payload shaping for text/image/video/avatar/voice/captioning/embeddings/moderation/chat/copywriting.
- Added per-task model resolution including:
  - `HF_TASK_TEXT_TO_IMAGE_MODEL`
  - `HF_TASK_TEXT_TO_VIDEO_MODEL`
  - `HF_TASK_IMAGE_TO_VIDEO_MODEL`
  - `HF_TASK_TEXT_TO_SPEECH_MODEL`
  - `HF_TASK_AVATAR_VIDEO_MODEL`
  - plus existing/default task model keys.
- Added model-loading detection with bounded retry/backoff.
- Added response handling for JSON/text/url and binary media responses (base64-encoded payload for normalization/storage).
- Added provider self-test for text and optional image (explicit skip when image model is not configured).
