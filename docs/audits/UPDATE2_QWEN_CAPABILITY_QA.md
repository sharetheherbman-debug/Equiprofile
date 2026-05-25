# Update 2 — Qwen Capability QA

- Added optional `qwen` provider path; GenX/HF remain unchanged and supported.
- Qwen is **not mandatory** and is surfaced as optional in diagnostics/settings.
- Added config support:
  - `QWEN_API_KEY`
  - `QWEN_BASE_URL`
  - `QWEN_MODEL`
- Added provider registry support for qwen health/runtime diagnostics and optional text self-test.
- Added fallback routing support for chat/copywriting (`genx -> qwen -> huggingface`) with optional copywriting provider override (`COPYWRITING_PROVIDER=qwen`).
