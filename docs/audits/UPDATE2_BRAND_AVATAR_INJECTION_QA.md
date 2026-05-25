# Update 2 — Brand/Avatar Injection QA

- Draft generation now uses a shared prompt builder that explicitly includes:
  - brand voice
  - target audience
  - primary CTA
  - prohibited claims
  - platform strategy context
  - avatar profile context when avatar format is requested
- Added unit test coverage for brand/avatar/platform-context prompt injection in `marketingPromptBuilder.test.ts`.
- Content scoring persistence path in admin scoring endpoint repaired to include required `platform` field.
