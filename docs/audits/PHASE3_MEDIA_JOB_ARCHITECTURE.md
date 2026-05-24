# Phase 3 Media & Avatar Job Architecture

## Canonical media job states
- `job_created`
- `queued`
- `processing`
- `completed`
- `failed`

## Implementation
- `server/_core/ai/jobs/mediaJobManager.ts`
- Queue orchestration in `server/_core/ai/orchestrator.ts`

## Job metadata contract
Each job stores:
- provider
- task
- metadata payload
- outputs
- errors
- timestamps
- tenant scope

## Supported async tasks
- image generation/edit
- video generation
- avatar generation
- speech-to-text/text-to-speech
- image captioning

## Operational controls
- polling support through status getters
- retry-safe provider execution via fallback chain
- cancellation support (`cancel` transitions unfinished jobs to failed/cancelled reason)
