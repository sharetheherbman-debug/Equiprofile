# Update 2.1 — GenX Routing QA

## Routing rule implemented for copywriting/chat
1. Valid configured `COPYWRITING_PROVIDER` (if available)
2. GenX
3. Qwen
4. Hugging Face (only with explicit `HF_TASK_COPYWRITING_MODEL`)

## QA coverage
- Added provider routing tests for:
  - GenX configured -> GenX used
  - GenX missing + Qwen configured -> Qwen used
  - GenX/Qwen missing + HF configured with explicit model -> HF used
  - all missing -> `provider_missing`
  - HF network failure does not block GenX success path

## Result
Copywriting no longer defaults to HF Llama when GenX is configured/available.
