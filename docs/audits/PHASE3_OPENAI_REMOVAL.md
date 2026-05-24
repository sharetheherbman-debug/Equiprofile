# Phase 3 OpenAI Removal

## Scope completed
- Removed OpenAI runtime configuration usage from server AI execution paths.
- Replaced OpenAI-first LLM wrapper internals with GenX-first orchestration via `server/_core/ai`.
- Replaced OpenAI admin/env messaging with GenX + Hugging Face provider messaging.
- Replaced OpenAI dashboard setting key usage with `genx_api_key` and retained `huggingface_api_key`.
- Updated deployment/preflight scripts and key docs to reference GenX/Hugging Face.

## Runtime safety
- Existing `invokeLLM` callers (`ai.chat`, weather analysis, student tutor, sales chat) continue using the same function signature.
- AI configuration checks remain graceful; missing provider keys return user-safe fallback messages.

## Removed OpenAI-first naming
- `OPENAI_API_KEY` checks in active server runtime paths
- `openai_api_key` admin setting usage
- OpenAI copy in active admin/settings UX

## Remaining historical references
- Older audit/report documents from Phase 1/2 intentionally remain as historical records and are not used at runtime.
