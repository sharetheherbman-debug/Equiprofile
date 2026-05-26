# GenX-First Media Repair QA

## Live failure addressed

Live SHA before this repair: `3efbb75`.

Prompt tested on VPS: `Create a horse video introducing EquiProfile`.

Observed failure:
- Studio created a copywriting draft only.
- The text route used GenX chat (`gpt-5.4`) and never queued video.
- No new `mediaAssets` row was created.
- No file appeared under `/var/equiprofile/storage`.
- Logs showed `POST /admin.createMediaJob 403`.
- Raw provider JSON could be displayed when chat output had `content: null` and `finish_reason: length`.

## Exact causes found

1. `admin.createMarketingDraft` always executed `task: "copywriting"` and did not create a media job when the prompt asked for video.
2. `providerModelDiscovery.ts` filtered GenX non-chat discovered models back down to text-only tasks, so GenX media models were not routable.
3. Media task definitions preferred Hugging Face first, which made missing HF video config block the practical GenX-first path.
4. `admin.createMediaJob` gated execution behind a previous media capability state instead of creating a traceable attempt.
5. `extractOutputText()` fell back to `JSON.stringify(payload)`, which could leak raw provider JSON into user-facing content.
6. `createMediaJob` and `createMarketingDraft` both use `adminUnlockedProcedure`; the 403 means the live request reached the route without a valid admin-unlock session (`adminSessions` missing/expired for the user context). The frontend now queues video immediately after draft creation in the same Studio flow and surfaces the auth/error state cleanly instead of silently leaving no asset trace.

## Repairs made

- GenX media-capable discovered/configured models are now classified as executable for:
  - `text_to_image`
  - `image_edit`
  - `text_to_video`
  - `image_to_video`
  - `avatar_video`
  - `text_to_speech`
- Media tasks now prefer GenX first, then Hugging Face, then Qwen where applicable.
- GenX media execution now targets the documented async media route derived from the configured base URL:
  - chat base: `https://query.genx.sh/v1`
  - media route: `https://query.genx.sh/api/v1/generate`
- GenX no longer fakes media through `gpt-5.4` chat. If no media model is found, it returns:
  - `GenX key is configured, but no text_to_video-capable model was found. Configure genx_video_model or confirm GenX model metadata.`
- `createMediaJob` now records every attempt in `mediaAssets`:
  - `processing` for queued/provider-pending work
  - `completed` only for playable/stored media
  - `failed` for setup/provider failures
- `admin.testGenXMediaGeneration` was added for direct live GenX media testing.
- Provider JSON/null content is no longer used as user script/body content.
- Studio video prompts now infer `text_to_video` and queue media after draft generation.
- Preview now shows truthful states:
  - `Script ready`
  - `Video queued`
  - `Generating video`
  - `Video failed`
  - `Video ready`
  - `Video model missing`

## VPS verification commands

Check GenX model diagnostics through the admin diagnostics UI or tRPC route, then verify DB rows:

```sql
SELECT id, type, provider, task, status, publicUrl, mimeType, errorMessage, createdAt
FROM mediaAssets
WHERE provider = 'genx'
ORDER BY id DESC
LIMIT 10;
```

Verify storage output if completed:

```bash
find /var/equiprofile/storage -type f -mmin -60 | sort
```

Watch live request path:

```bash
journalctl -u equiprofile.service -f
```

Direct live test expectation:
- Call `admin.testGenXMediaGeneration` with `task: "text_to_video"` and prompt `Create a horse video introducing EquiProfile`.
- Expected result is one of:
  - `completed` with playable `publicUrl`
  - `processing` with provider job id/pending metadata
  - `failed` with exact GenX endpoint/model error
  - `setup_needed`/failed row if no video model is discoverable/configured

Studio live test expectation:
- Type `Create a horse video introducing EquiProfile`.
- `admin.createMarketingDraft` may still create script/campaign text.
- `admin.createMediaJob` must also be called for `text_to_video`.
- A `mediaAssets` row must be created.
- Preview must show queued/generating/completed/failed state.
- Raw provider JSON must not appear in the script/body.
