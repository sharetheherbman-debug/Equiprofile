# Update 3.1 Provider Key-Only QA

## Normal Setup

The Settings tab now presents normal provider setup as key-only:

- Connect GenX: API key, save, test, status
- Connect Hugging Face: API key, save, test, status
- Connect Qwen: API key, save, test, status

Base URLs, model names, HF task model overrides, raw diagnostics, and task/provider internals remain in the collapsed Advanced provider repair section.

## GenX Default Route

Added a provider-level test proving that when only `genx_api_key` is saved, `resolveGenXConfig()` uses:

- Base: `https://query.genx.sh/v1`
- Endpoint: `https://query.genx.sh/v1/chat/completions`
- Internal default model: `gpt-5.4-turbo`

No normal admin model/base URL choice is required.

## Runtime Source

Provider diagnostics, provider tests, and `createMarketingDraft` share the same `getRuntimeConfig` source:

1. saved `siteSettings`
2. env fallback
3. provider missing/setup state

## Result

Key-only setup is the primary flow. Advanced repair exists only for troubleshooting a failed default route or explicit provider override.
