# Phase 3 Hugging Face Task-First Layer

## Canonical HF task layer
Hugging Face is implemented as the task-capability execution layer, not the orchestration brain.

## Canonical tasks covered
- `chat`
- `copywriting`
- `text_to_image`
- `image_edit`
- `image_to_video`
- `text_to_video`
- `avatar_video`
- `speech_to_text`
- `text_to_speech`
- `image_captioning`
- `classification`
- `moderation`
- `embeddings`

## Router/capability behavior
- Task definitions define preferred provider, fallback providers, timeout defaults, queue defaults, and approval defaults.
- Hugging Face model selection is task-based and configurable via `hf_task_<task>_model` / `HF_TASK_<TASK>_MODEL`.
- No frontend hardcoded model names.

## Safety and resilience
- Timeout-protected provider calls.
- Retry + provider fallback handling.
- Queue-first behavior for heavy media tasks.
- Input validation guardrails at task definition layer.
