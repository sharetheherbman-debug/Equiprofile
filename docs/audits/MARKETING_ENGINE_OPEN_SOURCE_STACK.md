# MARKETING ENGINE OPEN SOURCE STACK PLAN

## Add now
- **FFmpeg** (core overlays, trims, transcode, stitching, subtitle burn-in)
  - Install: `sudo apt-get update && sudo apt-get install -y ffmpeg`
  - Risk: missing binary on VPS blocks branded output.
- **BullMQ + Redis** (long render queue and retries)
  - Install: `npm install bullmq ioredis`
  - Risk: requires Redis ops hardening.
- **OpenTelemetry SDK** (media pipeline observability)
  - Install: `npm install @opentelemetry/api @opentelemetry/sdk-node`

## Defer
- **Remotion** (React composition timelines) until dedicated render worker is allocated.
- **Social scheduling SDK set** (TikTok/Meta/LinkedIn direct publish) after policy gating layer is finalized.
- **Prompt-eval frameworks** (automated benchmark loops) after dataset baseline is defined.

## Subtitle generation libraries
- Recommended now: Whisper-compatible STT pipeline + FFmpeg subtitle mux.
- Candidate packages: `openai-whisper` wrappers or hosted transcription with cached `.srt` output.

## Scene/timeline assembly libraries
- Near-term: FFmpeg concat/filter_complex scripts.
- Later: Remotion composition layer for templated scene timelines and branded motion graphics.

## Social scheduling and analytics
- Queue outbound publishing in worker jobs (BullMQ).
- Persist post metrics via existing growth analytics tables before introducing third-party SaaS analytics.

## Provider/model benchmarking
- Store per-run model, latency, failure reason, retries, and output grade.
- Add nightly benchmark tasks using fixed prompt set and success criteria.

## Licensing notes
- FFmpeg: LGPL/GPL components (ensure chosen build is compliant with deployment policy).
- Remotion: MIT.
- BullMQ/ioredis/OpenTelemetry: permissive licenses (MIT/Apache-2.0 style).

## Production risk summary
- Highest risk: unmanaged long jobs and absent render queue isolation.
- Medium risk: inconsistent provider endpoint quality and quota volatility.
- Low risk: adopting FFmpeg-backed post-processing as deterministic branded layer.
