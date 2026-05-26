# Update 4.1 Command Output QA

## Requirement

Typing `Create a 30-second Facebook reel for UK stable owners.` should produce a structured result and update the preview immediately.

## Structured fields

`createMarketingDraft` now normalizes provider output into:

- `title`
- `platform`
- `format`
- `durationSeconds`
- `audience`
- `goal`
- `strategy`
- `hook`
- `script`
- `storyboard` / `shotList`
- `caption`
- `cta`
- `hashtags`
- `visualDirection`
- `voiceoverScript`
- `recommendedSchedule`
- `complianceNotes`
- `growthScore`
- `mediaPlan`
- `nextActions`

## Repairs

- JSON provider output is normalized into the full payload.
- Plain-text provider output falls back to a structured draft instead of dumping raw text.
- Frontend sets `draft` immediately on successful generation.
- Preview/action rail receives the same draft state, so there is no separate queue lookup requirement.

## Tests

- `server/marketingDraftOutput.test.ts`
  - Checks required structured keys exist in prompt and backend normalization.
  - Checks frontend stores the returned draft immediately.
- `server/marketingStudio.product.test.ts`
  - Checks structured result sections render in the Studio.

## Result

Generated content is now usable in the same Studio view immediately.
