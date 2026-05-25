# Update 2 — Provider Output Normalisation QA

- Added canonical provider output normalization layer (`server/_core/ai/outputNormalization.ts`).
- Normalized result states now distinguish:
  - actual media (`image`/`video`/`audio`)
  - `prompt_only`
  - `job_pending`
  - `failed`
  - plus URL/base64/text/json intermediate states.
- Added media persistence handling:
  - base64 decode and store to VPS storage
  - URL download and local store when possible
  - fallback to remote URL with explicit error when local copy fails.
- Media asset registry now gets truthful status/error/result metadata per job.
