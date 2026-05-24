# Guided Onboarding Engine

## Supported onboarding types
- horse owner
- stable
- school
- teacher

## Implemented foundations
- Persistent onboarding records (`growthOnboardingFlows`)
- Progress tracking (`step`, `progressPercent`)
- Checklist persistence (`checklistJson`)
- Quick-win tracking (`quickWinsJson`)
- Completion and skipped states
- Existing user preference onboarding preserved for backward compatibility

## Reusable onboarding APIs
- `growthEngine.upsertOnboardingFlow`
- `user.getOnboardingStatus` now reads persistent flow data when present
- Existing onboarding mutations now sync persistent flow state

## Activation support
- Growth Engine quickstart templates for stable and school flows
- Designed to support sample/demo starter data in Prompt 5 hardening

