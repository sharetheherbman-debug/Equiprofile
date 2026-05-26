# Prompt 1 Media Generation Verification

Date: 2026-05-26
Branch: `codex/prompt1-ai-model-os-media`

## Local Secret Availability

The local Codex workspace did not have live provider secrets configured:

- `GENX_API_KEY`: missing
- `HUGGINGFACE_API_KEY`: missing
- `HF_API_TOKEN`: missing
- `QWEN_API_KEY`: missing

Because of that, local verification could prove routing, candidate selection, fallbacks, diagnostics, asset rendering, tests, and build, but could not honestly produce a live provider image/video/audio asset.

## What Was Verified Locally

Verified through automated tests:

- GenX model discovery fallback and task-specific model support
- GenX text routing uses selected model metadata
- GenX does not fake media execution through chat completions
- Hugging Face task model fallback ordering
- Hugging Face binary/base64 media response handling
- Qwen task-specific models
- Qwen embeddings endpoint selection
- Qwen media tasks are cataloged but not marked executable without a native media endpoint contract
- provider registry uses model candidates for provider availability
- provider registry passes selected model and route metadata into execution
- media jobs can return setup guidance when no executable provider/model exists
- Marketing Studio source tests still pass
- Asset Library renders friendly playable/pending/setup/failure states

## Truthful Media States

Media tasks now resolve into one of these truthful states:

- playable asset exists
- provider async job pending
- provider config missing
- model config missing
- provider failed
- not implemented for this provider endpoint family

No media task is marked successful only because a provider key or model name exists.

## VPS Verification Steps

Run these after deploy on `/var/equiprofile/app`.

### 1. Confirm Provider Settings

In hidden admin settings:

- confirm GenX key is configured
- confirm Hugging Face key is configured if testing HF media
- confirm Qwen key is configured if testing Qwen text/embedding routes
- optionally set task-specific HF models for media

### 2. Run Provider Diagnostics

In admin diagnostics:

- run full provider self-test
- confirm GenX discovery returns model descriptors
- confirm GenX text test succeeds
- confirm HF media task test either produces a playable asset/job or gives a specific model/provider error
- confirm Qwen text or embeddings test succeeds when configured
- confirm Qwen media tasks show "native media endpoint not implemented" unless that endpoint has been wired

### 3. Generate Image

From Marketing Studio:

1. Create or use an existing campaign draft.
2. Click `Generate image`.
3. Confirm the returned media job shows:
   - selected provider
   - selected model
   - task `text_to_image`
   - route reason
4. Open Assets.
5. Confirm one of:
   - playable image preview with public URL
   - pending provider job
   - clear setup/failure state

### 4. Generate Video

From Marketing Studio:

1. Click `Generate video`.
2. Confirm the returned media job shows task `text_to_video`.
3. Open Assets.
4. Confirm one of:
   - playable video preview with public URL
   - pending provider job
   - clear setup/failure state

Video is not considered working unless a real playable video file/URL exists or the provider returns a valid pending async job that later resolves.

### 5. Verify Stored Media

In the database, inspect `mediaAssets` after a successful generation:

```sql
SELECT id, userId, type, status, source, provider, model, publicUrl, mimeType, createdAt
FROM mediaAssets
ORDER BY id DESC
LIMIT 10;
```

Expected for real playable media:

- `status` is complete/available according to existing asset status values
- `provider` is set
- `model` is set
- `publicUrl` points to `/media/generated/...` or a safely stored provider URL
- `mimeType` starts with `image/`, `video/`, or `audio/`

### 6. Verify File Serving

For a locally persisted generated file:

```bash
curl -I https://equiprofile.online/media/generated/<filename>
```

Expected:

- HTTP 200
- correct content type
- no secret-bearing path or signed provider credential in the URL

## Known Limitations

- GenX text generation is supported through the OpenAI-compatible chat route and discovered model metadata. GenX media execution is not marked executable until a verified GenX media endpoint/job contract is wired.
- Hugging Face media support depends on configured task models and whether those models can return usable media through the Inference API or compatible endpoint.
- Qwen chat/copywriting/embeddings style routes are supported. Qwen media model IDs can be represented in diagnostics, but media execution requires adding the DashScope-native async media runtime.
- Local validation could not prove live provider media because no live provider secrets were available in the local environment.
