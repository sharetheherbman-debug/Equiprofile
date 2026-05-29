# Media Factory Storage Strategy

## Current decision
- Scene stock assets remain remote by default (Pexels/Pixabay URLs) during PR45A.
- The renderer supports remote scene URLs with per-scene fallback to text cards when remote media cannot be used.
- We do not eagerly download large stock videos in this phase.

## Safety constraints for future localization
- Use `canLocalizeStockAsset` before any download.
- Use `maybeDownloadStockAsset` only with:
  - request timeout
  - maximum download size limit
  - MIME validation
  - source URL preserved in metadata

## Why
- Prevent unbounded storage and network use.
- Keep rendering resilient when upstream assets are slow/unavailable.
- Preserve provenance/license metadata while deferring full cache strategy to a later phase.
