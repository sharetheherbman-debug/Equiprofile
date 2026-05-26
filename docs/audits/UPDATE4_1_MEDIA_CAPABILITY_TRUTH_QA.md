# Update 4.1 Media Capability Truth QA

## Requirement

Do not claim image, video, voice or avatar generation works unless real assets can be produced.

## Repairs

- `server/routers.ts`
  - `text_to_image` now requires both Hugging Face key and `hf_task_text_to_image_model`.
  - `text_to_video` requires `hf_task_text_to_video_model`.
  - `avatar_video` requires `hf_task_avatar_video_model`.
  - `text_to_speech` requires `hf_task_text_to_speech_model`.
  - Added friendly media truth states:
    - `working_real_asset`
    - `provider_config_missing`
    - `model_config_missing`
    - `provider_failed`
    - `not_implemented_yet` remains the documented state for capabilities without a provider path.
- Media job failures no longer break draft generation.
- UI buttons exist for Generate image/video/voice/avatar but return setup guidance unless the relevant provider and model are configured.

## UI behavior

- Normal Studio says media is available or prompt-only.
- Setup/failure details stay friendly in normal UX.
- Technical details stay in Developer Diagnostics.
- Assets tab still distinguishes real `publicUrl` media from prompt-only/pending/failed outputs.

## Tests

- `server/marketingDraftOutput.test.ts`
  - Checks media truth states and friendly setup/failure handling.

## Result

Media generation is truthful. No playable image/video/voice/avatar is claimed unless a real provider/model path is configured.
