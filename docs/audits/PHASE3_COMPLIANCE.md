# Phase 3 Compliance & Moderation

## Compliance agent protections implemented
- fake endorsements/accreditation claim detection
- fake charity partnership claim detection
- unsafe riding instruction blocking
- veterinary diagnosis/prescription claim blocking
- impersonation behavior blocking
- uncontrolled autopublishing intent blocking

## Moderation integration points
Applied centrally in orchestrator before task execution for:
- social/content generation tasks
- media generation tasks
- avatar generation tasks
- assistant/chat tasks
- onboarding/academy task pathways (through shared orchestration)

## Escalation architecture
- `low_confidence`
- `medium_confidence`
- `high_confidence`
- `professional_review`

## Future extensibility
- Rule engine is centralized in `moderation/compliance.ts` and can load expert-reviewed packs without changing task interfaces.
- Platform does not present itself as a governing authority or licensed veterinarian.
