# Update 2 — GenX Provider QA

- Added GenX base URL normalization and endpoint composition to avoid double `/v1`.
- Added rich provider error mapping (DNS/network/auth/403/404/429/timeout/invalid response).
- Added GenX self-test (`testGenXTextGeneration`) with endpoint/model/latency/output preview.
- Provider diagnostics now expose endpoint, model, last success/error and latency.
- GenX copywriting path remains primary and now returns actionable errors instead of generic `fetch failed`.
