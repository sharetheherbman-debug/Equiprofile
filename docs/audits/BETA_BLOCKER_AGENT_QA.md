# BETA BLOCKER — Agent End-to-End QA

## Scope audited
- `server/_core/ai/agents/registry.ts`
- `server/_core/ai/tasks/taskRegistry.ts`
- `server/routers.ts` (`admin.generateMarketingDraft`, `admin.createMediaJob`, approval queue endpoints)
- `client/src/pages/AdminCampaigns.tsx`

## Agent contract coverage
| Agent | Registry status | Expected flow coverage |
|---|---|---|
| GrowthAgent | Registered | Campaign/social/email/calendar draft generation |
| MediaAgent | Registered | Media/image/video/avatar queue jobs |
| ComplianceAgent | Registered | Moderation/classification safety routing |
| StableAssistantAgent | Registered | Stable assistant chat/copy/classification/moderation |
| AcademyAgent | Registered | Academy-safe guidance / moderation hooks |
| CustomerSuccessAgent | Registered | Onboarding/help copy generation |
| AdminOpsAgent | Registered | Provider/system diagnostics and ops support |

## QA result
- **Structural E2E wiring:** PASS (agent policies, task compatibility, router entrypoints present).
- **Runtime provider-dependent execution:** BLOCKED in this environment without live DB + provider keys.

## Blocking dependencies for full runtime pass
- `DATABASE_URL`
- `JWT_SECRET`
- `ADMIN_UNLOCK_PASSWORD`
- At least one provider key (`GENX_API_KEY` or `HUGGINGFACE_API_KEY`)

## Recommended production smoke sequence
1. Save provider keys in hidden admin Diagnostics.
2. Run Composer draft generation (social/email/calendar).
3. Queue media/video/avatar jobs.
4. Verify approval queue transitions: draft → needs_approval → approved/rejected/scheduled.
5. Confirm diagnostics failure log visibility for invalid provider credentials.
