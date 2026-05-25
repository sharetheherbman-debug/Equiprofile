# Update 2.3 Provider Repair QA

## Result

PASS for runtime behavior and focused tests. Live provider success still depends on real production credentials and reachable endpoints.

## Repairs

- Saved site settings now override env fallback through `getRuntimeConfig`.
- `genx_base_url` and `qwen_base_url` are validated as http(s) URLs and normalized before saving.
- Duplicate `/v1/v1` suffixes are normalized to a single `/v1`.
- GenX no longer relies on an unverified default endpoint.
- GenX readiness requires actual copy/chat generation success, not just raw connectivity.
- Raw GenX diagnostics remain available for endpoint/status/latency debugging.
- Hugging Face media tests can run for image/video/avatar models independently.
- Diagnostics include outbound network probe data.

## Main Studio Readiness

- AI: `AI ready` or `AI setup required`
- Media: `Media ready` or `Media setup required`
- Storage: based on write/read/delete probe
- Platforms: connected count or draft mode

## Tests

- `server/dynamicConfig.test.ts`
- `server/admin.test.ts`
- `server/_core/ai/providers/providerRegistry.test.ts`
- `server/_core/ai/providers/httpUtils.test.ts`

## Remaining Live Step

Production admin must save the real GenX base URL, key, and model in Settings, then run raw GenX and full provider tests.
