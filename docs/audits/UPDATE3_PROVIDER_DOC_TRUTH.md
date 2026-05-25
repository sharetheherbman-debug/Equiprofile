# Update 3 Provider Doc Truth

## GenX

Source checked: https://genx.pro/docs/api

Findings:
- Verified GenX Router base URL is `https://query.genx.sh`.
- OpenAI-compatible streaming/text base URL is `https://query.genx.sh/v1`.
- Chat endpoint is `POST /v1/chat/completions`.
- Model listing exists at `GET /v1/models`.
- Async image/video/audio generation uses `POST /api/v1/generate` and polling through `/api/v1/jobs/{id}`.
- The previously seen `https://api.genx.ai/v1/chat/completions` was not verified.

Implementation:
- EquiProfile now defaults internally to `https://query.genx.sh/v1`.
- Normal setup is key-only.
- `GENX_BASE_URL` and `genx_base_url` remain advanced repair overrides.
- Main Studio does not expose endpoint/model details.

## Hugging Face

Sources checked:
- https://huggingface.co/docs/inference-providers/tasks/text-to-image
- https://huggingface.co/docs/inference-providers/tasks/text-to-video
- https://huggingface.co/docs/huggingface_hub/en/package_reference/inference_client

Findings:
- Hugging Face media calls are task/model/provider specific.
- Text-to-image can return an image object/bytes depending on client/provider.
- Text-to-video support is provider/model dependent and may require providers such as fal/Replicate or dedicated Inference Endpoints.
- Video/avatar should not be claimed playable unless a real file/URL/base64 output is returned and stored.

Implementation:
- Hugging Face is media-first in Studio readiness.
- HF copywriting is only used if an explicit copywriting task model is configured and live-tested.
- Media can be `ready`, `partial`, or setup-required; prompt-only fallback remains truthful.

## Qwen

Sources checked:
- https://www.alibabacloud.com/help/en/model-studio/compatibility-of-openai-with-dashscope
- https://help.aliyun.com/zh/model-studio/qwen-api-reference/

Findings:
- Alibaba Cloud Model Studio/DashScope supports an OpenAI-compatible interface.
- International example base URL is `https://dashscope-intl.aliyuncs.com/compatible-mode/v1`.
- Qwen is appropriate as a copy/strategy fallback in EquiProfile, not as an image/video/avatar provider in this implementation.

Implementation:
- Existing Qwen default remains DashScope-compatible.
- Qwen is hidden as optional provider setup.
- Users/admins do not pick task models in the main Studio.

## Product Rule

Provider routing is internal:
- GenX primary for strategy/copy/campaign reasoning when live-ready.
- Qwen fallback for text when live-ready.
- Hugging Face for media when task model/provider tests pass.
- Prompt-only media plans when playable media is unavailable.
