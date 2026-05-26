# Update 4.1 GenX Text Generation QA

## Live truth used

- Production VPS direct GenX call is confirmed working with OpenAI-compatible `/chat/completions`.
- Working model: `gpt-5.4`.
- Working default base URL: `https://query.genx.sh/v1`.
- `max_tokens` must be at least `16`.
- Invalid old defaults must not be used: `gpt-5.4-turbo`, `openai/gpt-4.1-mini`.

## Repairs

- `server/_core/ai/providers/genxProvider.ts`
  - Default model changed to `gpt-5.4`.
  - Default base URL remains `https://query.genx.sh/v1`.
  - Added `clampGenXMaxTokens()` with minimum `16`.
  - Marketing generation defaults to `512` tokens when no value is supplied.
  - GenX request path remains one source of truth for diagnostics and app generation.
- `server/routers.ts`
  - `admin.createMarketingDraft` now passes `max_tokens: 512` into the existing AI execution path.
- `server/modules/growth-engine/marketingPromptBuilder.ts`
  - Prompt now asks for structured marketing output fields required by the Studio preview.

## Tests

- `server/_core/ai/providers/genxProvider.test.ts`
  - Proves key-only config resolves to `https://query.genx.sh/v1/chat/completions`.
  - Proves default model is `gpt-5.4`.
  - Proves old invalid models are not defaulted.
  - Proves `max_tokens` is clamped to `>=16`.
  - Proves OpenAI-compatible payload shape is used.
- `server/marketingDraftOutput.test.ts`
  - Proves `createMarketingDraft` uses the shared AI task execution path and safe token budget.

## Result

GenX app-level text/copy generation now matches the production-proven route and model.
