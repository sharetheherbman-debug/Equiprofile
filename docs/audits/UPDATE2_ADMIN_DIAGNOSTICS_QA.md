# Update 2 — Admin Diagnostics QA

- Upgraded diagnostics now include:
  - GenX/HF/Qwen status
  - endpoint/model
  - last success/error
  - latency
  - queue mode and queue status
  - task capability classification
  - storage root readiness
- Added `runFullProviderTest` admin action:
  - GenX text test
  - HF text (+ optional image) test
  - Qwen text test when configured
  - storage write/delete probe
- Diagnostics avoid secret leakage (status and metadata only).
