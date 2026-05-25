# Update 2.1 — Hugging Face Fallback Safety QA

## Changes
- HF copywriting/chat no longer uses implicit default model.
- HF copywriting requires explicit `HF_TASK_COPYWRITING_MODEL`.
- Missing HF copywriting model marks HF copywriting unavailable.
- Provider failures are normalized for user-facing flows to:
  - "AI provider unavailable. Check provider settings."

## QA expectations
- HF network failure is recorded in admin diagnostics.
- User-facing creator flow does not show raw endpoint/stack strings.
- HF is only considered for copywriting when explicitly configured.
