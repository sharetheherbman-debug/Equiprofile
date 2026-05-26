# Update 4.1 Debug UX Removal QA

## Requirement

Normal Marketing Studio must not expose backend/provider/debug internals such as raw JSON, tenant scope, queue objects, provider matrices, base URLs, model names, endpoint URLs, task names, raw provider failures, or developer diagnostics.

## Repairs

- Main Studio now uses product-facing components:
  - `client/src/components/marketing/MarketingCommandComposer.tsx`
  - `client/src/components/marketing/MarketingResultCard.tsx`
  - `client/src/components/marketing/MarketingActionRail.tsx`
- Provider/base URL/model/task override details remain in Settings only.
- Settings section was renamed to `Developer Diagnostics`.
- Developer Diagnostics is collapsed by default.
- Normal provider setup messages are friendly. Raw Hugging Face task key language is not shown in normal provider cards.

## Tests

- `server/marketingStudio.product.test.ts`
  - Checks generic admin KPI cards are absent.
  - Checks normal Studio components do not contain debug/internal labels.
  - Checks Developer Diagnostics exists and old `Advanced provider repair` label is gone.

## Result

The main Studio path shows readiness and setup guidance only. Technical detail is isolated to Settings -> Developer Diagnostics.
