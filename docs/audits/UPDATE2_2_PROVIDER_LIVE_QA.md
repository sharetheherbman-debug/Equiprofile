# Update 2.2 Provider Live QA

## Result

PASS for truthful readiness logic. Live GenX/Hugging Face success still requires production secrets and reachable provider endpoints.

## Readiness Rules Implemented

| Area | Rule |
| --- | --- |
| AI Copy | Ready only after a successful live text generation test or recent cached live success. |
| AI Copy Warning | Key/config exists but no live test has passed, or the endpoint failed. |
| AI Copy Missing | No usable provider config exists. |
| Media | Ready only after a recent usable image/video provider result. |
| Media Partial | Prompt/script generation works but playable media is not configured or has not passed a live media test. |
| Storage | Ready only after write/read/delete probe succeeds. |
| Platforms | Shows connected count from existing Growth Engine social connections. |

## GenX Checks

- `GENX_BASE_URL` or saved `genx_base_url` is required.
- `GENX_API_KEY` or saved `genx_api_key` is required.
- Diagnostics and generation use `resolveGenXConfig`.
- `admin.testRawGenXConnection` performs the same OpenAI-compatible chat call path used by generation.
- Key existence without a passing endpoint test is not marked ready.

## Hugging Face Checks

- Hugging Face text readiness still requires a configured API key and task model.
- Media readiness is not inferred from a Hugging Face key. It requires a recent media-capable live result.

## Tests

- Provider availability requires successful live test or recent cached success.
- Key exists but endpoint fails equals not ready.
- Failed provider is not executed for draft generation fallback.
- Focused provider tests passed.

## Remaining Live Requirement

Run Settings > Test raw GenX connection on production after setting the real base URL/key. The expected production result is either `success` with status 2xx or an actionable endpoint/status summary.
