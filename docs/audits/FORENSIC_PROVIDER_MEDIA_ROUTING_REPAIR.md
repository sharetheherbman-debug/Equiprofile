# Forensic Provider Media Routing Repair

## Dead or Stale Routing Cleaned Up

- `server/_core/ai/providerModelDiscovery.ts` no longer manufactures `gpt-5.4` as a playable media fallback.
- GenX video discovery no longer treats category `video` as every video task.
- `kling-avatar-*` models are restricted to `avatar_video`.
- `*i2v*` / image-to-video models are restricted to `image_to_video`.
- Generic text/chat models remain valid for copy, strategy, and planning only.

## One Source Of Truth

Added `server/_core/ai/taskModelPolicy.ts`.

This file now owns:
- strict GenX task/model contracts
- text-to-video priority order
- text-to-image priority order
- avatar/image-to-video `image_url` requirements
- model disallow reasons
- task-policy sorting that runs before generic suitability score

## Exact Routing Bug Fixed

Production could select `kling-avatar-v2-pro` for `text_to_video`. That is now blocked by policy and execution guards.

For `text_to_video`, valid GenX models are prioritized:
1. `kling-v2.5-turbo`
2. `kling-v2.6-pro`
3. `kling-v3-pro`
4. `pixverse-v6`
5. `pixverse-v5.5`
6. `seedance-2`
7. `seedance-v1-fast`
8. `veo-3.1-fast`
9. `grok-imagine-video`

`gpt-5.4` is explicitly rejected as playable media. It can still be used for text/copy/strategy.

## Resolver Bug Fixed

Added `server/_core/ai/mediaResolver.ts`.

It resolves pending GenX media assets by:
- marking provider-failed jobs as `failed`
- marking `data:text/plain` completed outputs as failed `video_plan`
- fetching `/api/v1/jobs/:id/file` with the GenX bearer token
- storing playable image/video/audio files under `/media/generated/...`
- setting `publicUrl`, `mimeType`, `status=completed`

## HF / Qwen Truth

- Hugging Face media availability now has a DNS/network blocking check for `api-inference.huggingface.co`.
- Qwen media remains `setup_needed` until native DashScope media endpoints are implemented.
- Qwen text, vision-compatible chat, and embeddings paths remain separate from media.

## Post-Deploy Verification Commands

Candidate list for `text_to_video`:

```bash
cd /var/equiprofile/app
node -e "import('./dist/server/_core/ai/modelRegistry.js').then(async m => console.log(await m.resolveModelCandidatesForTask('text_to_video', true)))"
```

Resolver backfill:

```bash
cd /var/equiprofile/app
node -e "import('./dist/server/_core/ai/mediaResolver.js').then(async m => console.log(await m.resolvePendingGenXMediaAssets(50)))"
```

DB media statuses:

```bash
mysql -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "SELECT id, jobId, provider, task, status, mimeType, publicUrl, errorMessage, outputMetadataJson FROM mediaAssets WHERE provider='genx' ORDER BY id DESC LIMIT 20;"
```

Generated file exists:

```bash
test -f /var/equiprofile/storage/videos/<filename>.mp4 && ls -lh /var/equiprofile/storage/videos/<filename>.mp4
```

Public URL opens:

```bash
curl -I https://equiprofile.online/media/generated/videos/<filename>.mp4
```

PreviewCanvas plays video:

```bash
curl -s https://equiprofile.online/admin >/dev/null
# Open Marketing Studio, generate a video, confirm the asset publicUrl appears and the preview uses a video/* URL.
```

## Known Limitations

- `avatar_video` requires `image_url`; plain text presenter requests should return setup guidance.
- `image_to_video` requires `image_url`.
- `grok-tts` requires a discovered/selected `voice_id`.
- Qwen media is intentionally not routed through chat.
