# Prompt 1 AI Model Operating System Architecture

Date: 2026-05-26
Branch: `codex/prompt1-ai-model-os-media`
Base live SHA: `a8e3343`

## Objective

Activate a real model operating layer for EquiProfile Marketing Studio without creating a duplicate Marketing Studio, duplicate Growth Engine, or duplicate AI provider system.

This update keeps the visible Studio mostly intact and focuses on backend truth:

- discover provider models
- classify capabilities
- route by task and model capability
- execute with ordered fallbacks
- persist playable media only when a playable output exists or a provider async job is honestly pending
- expose detailed diagnostics to admin/provider tools without making normal users choose raw models

## One Source Of Truth

The canonical model operating layer is:

- `server/_core/ai/modelRegistry.ts`
- `server/_core/ai/providerModelDiscovery.ts`

`modelRegistry.ts` re-exports the discovery/candidate APIs so other provider/routing code has one import path for model truth.

The registry tracks:

- provider
- model id
- source
- categories/capabilities
- executable tasks
- multimodal flag
- suitability score
- quality tier preference
- endpoint family
- execution mode
- last test metadata fields
- unavailable task reasons

Supported task coverage includes:

- `chat`
- `copywriting`
- `strategy`
- `campaign_generation`
- `social_generation`
- `email_generation`
- `text_to_image`
- `image_edit`
- `image_to_video`
- `text_to_video`
- `avatar_video`
- `text_to_speech`
- `speech_to_text`
- `image_captioning`
- `embeddings`
- `moderation`
- `classification`
- `analytics`

## GenX

Changed file:

- `server/_core/ai/providers/genxProvider.ts`

GenX now supports:

- `/models` discovery via `discoverGenXModelIds`
- task-specific settings:
  - `genx_text_model`
  - `genx_strategy_model`
  - `genx_image_model`
  - `genx_video_model`
  - `genx_avatar_model`
  - `genx_tts_model`
  - `genx_vision_model`
- matching env fallbacks:
  - `GENX_TEXT_MODEL`
  - `GENX_STRATEGY_MODEL`
  - `GENX_IMAGE_MODEL`
  - `GENX_VIDEO_MODEL`
  - `GENX_AVATAR_MODEL`
  - `GENX_TTS_MODEL`
  - `GENX_VISION_MODEL`
- backward compatibility with `genx_model` / `GENX_MODEL`
- default text model `gpt-5.4`
- selected model injection from the routing candidate

Truthful limitation:

GenX media tasks are discoverable/routable only when a verified GenX media endpoint contract is available. The provider does not force image/video/avatar requests through `/chat/completions` because that would fake playable media support. Unsupported GenX media tasks return a clear provider reason and fall back to another compatible provider.

## Hugging Face

Changed file:

- `server/_core/ai/providers/huggingFaceProvider.ts`

Hugging Face now supports singular and plural task model configuration:

- `hf_task_copywriting_model`
- `hf_task_chat_model`
- `hf_task_text_to_image_model`
- `hf_task_text_to_video_model`
- `hf_task_image_to_video_model`
- `hf_task_avatar_video_model`
- `hf_task_text_to_speech_model`
- `hf_task_speech_to_text_model`
- `hf_task_image_captioning_model`
- `hf_task_embeddings_model`
- `hf_task_moderation_model`
- `hf_task_classification_model`
- `HF_TASK_*_MODEL`
- `HF_TASK_*_MODELS` comma-separated fallbacks

Execution now:

- resolves an ordered model list per task
- retries model-loading responses
- falls back across configured candidates
- supports JSON, URL, base64, and binary media responses
- returns route metadata with provider, model, task, result type, route reason, and endpoint family

## Qwen

Changed file:

- `server/_core/ai/providers/qwenProvider.ts`

The previous chat/copywriting-only hard block was removed and replaced with capability checks.

New supported config:

- `qwen_text_model`
- `qwen_vision_model`
- `qwen_image_model`
- `qwen_video_model`
- `qwen_audio_model`
- `qwen_embedding_model`
- env equivalents

Executable in the current runtime:

- chat/copywriting style tasks through OpenAI-compatible chat completions
- classification/moderation/image-captioning style text tasks where the configured model supports the request shape
- embeddings through the embeddings endpoint

Truthful limitation:

Qwen media model IDs can be cataloged and diagnosed, but image/video/audio execution is not marked executable until the DashScope-native media endpoint/job contract is implemented. The registry records the reason and routing falls back to another compatible provider.

## Routing

Changed files:

- `server/_core/ai/providerCapabilities.ts`
- `server/_core/ai/providers/providerRegistry.ts`
- `server/_core/ai/orchestrator.ts`

Routing now works from model candidates first:

1. `resolveModelCandidatesForTask(task)` returns ordered provider/model candidates.
2. `isProviderAvailableForTask` checks executable model candidates instead of provider name alone.
3. `executeWithFallback` tries compatible provider/model candidates in order.
4. The selected provider receives the routed model and route reason.
5. Result metadata includes provider, model, task, result type, route reason, and endpoint family.

Default preference:

- text/campaign tasks: GenX, then Qwen, then Hugging Face
- image/video/avatar/media tasks: GenX media when a verified executable route exists, then Hugging Face, then Qwen media only when an executable runtime exists

## Media Job Lifecycle

Changed file:

- `server/routers.ts`

`admin.createMediaJob` now accepts:

- `task`
- `prompt`
- `quality`
- `platform`
- `presenterId`
- `uploadedAssetRef`
- tenant scope

It returns:

- job id
- status
- selected provider/model when queued
- route reason
- setup guidance when no executable model is available

New/updated media admin support:

- `admin.getMediaJob`
- `admin.listMediaAssets`
- `admin.deleteMediaAsset`
- media capability truth uses the model registry instead of Hugging Face-only checks

Playable media is only considered successful when the provider returns a usable URL, base64 payload, binary payload, or a valid async job that remains pending.

## Minimal Frontend Scope

Changed files:

- `client/src/components/marketing/studio/MarketingStudioV2.tsx`
- `client/src/components/marketing/studio/StickyActionBar.tsx`
- `client/src/components/marketing/studio/AssetLibrary.tsx`
- related small compatibility edits in existing Studio components

Frontend changes are deliberately small:

- added simple generate image/video/voice/avatar actions from the existing action rail
- queued media jobs through the existing admin router
- moved the user to Assets after queuing
- made Asset Library show playable image/video/audio previews when real assets exist
- added download/delete/archive actions
- kept failure/setup/pending states truthful

No full Studio redesign was attempted in this prompt.

## Build Tooling Repair

Changed files:

- `package.json`
- `scripts/clean.mjs`
- `scripts/build.mjs`
- `scripts/build-target.mjs`
- `scripts/build-fingerprint.mjs`

The repo build script previously required POSIX shell behavior (`rm`, inline env vars, `bash`). That blocked `npm run build` in the Windows Codex workspace. The build now uses Node wrappers while preserving the same build targets:

- service worker version update
- management Vite build
- school Vite build
- server bundle
- CLI bundle
- build fingerprint

Production Linux behavior remains equivalent, but the canonical `npm run build` now works cross-platform.
