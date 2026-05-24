# Beta AI Content QA

Date: 2026-05-24

## Status

Classification: **READY AT APPROVAL-FIRST CONTRACT LEVEL, PROVIDER KEYS REQUIRED FOR LIVE GENERATION**

## Working Flows Wired

The hidden-admin Composer supports:

1. Generate social post draft.
2. Generate email campaign draft.
3. Generate 7-day launch calendar draft.
4. Generate image prompt.
5. Generate video prompt.
6. Generate avatar script.
7. Send generated item to approval queue.
8. Approve generated item.
9. Reject generated item.
10. Schedule approved item.

The Media, Video, and Avatar tabs can queue media jobs through `admin.createMediaJob`.

## Provider UI

The AI Providers / Diagnostics tab supports:

- Saving GenX API key.
- Saving GenX base URL.
- Saving GenX model.
- Saving Hugging Face key.
- Saving optional Hugging Face task overrides.
- Showing provider health.
- Showing queue status.
- Showing agent registry and task registry.
- Showing recent failures from diagnostics.

## Compliance Guardrails

`admin.generateMarketingDraft` includes prompt guidance to avoid fake testimonials, fake charity partnerships, and fake accreditation claims. The Composer also labels all generated drafts as review-required and does not publish directly.

## Agent QA Coverage

| Agent | Status |
| --- | --- |
| GrowthAgent campaign draft | Wired via `admin.generateMarketingDraft`. |
| MediaAgent media job | Wired via `admin.createMediaJob`. |
| ComplianceAgent unsafe/fake claims | Prompt-level guardrail present; provider-level proof requires live generation. |
| StableAssistantAgent normal support/stable questions | Existing AI chat path unchanged. |
| AcademyAgent fake accreditation claims | Public Academy claims softened; live agent response QA still needed. |

## Remaining Manual Verification

- Save/test real GenX key and base URL.
- Save/test real Hugging Face key.
- Generate each draft type with live providers.
- Approve, reject, and schedule a real queued item.
- Confirm provider failure messages are understandable for invalid keys.
