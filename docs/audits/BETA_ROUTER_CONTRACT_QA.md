# Beta Router Contract QA

Date: 2026-05-24

## Status

Classification: **WIRED AT CONTRACT LEVEL, LIVE DB QA REQUIRED**

## New Admin Procedures Added

Added to `server/routers.ts`:

- `admin.generateMarketingDraft`
- `admin.createMediaJob`
- `admin.approveMarketingItem`
- `admin.rejectMarketingItem`
- `admin.scheduleMarketingItem`

These use the existing AI orchestration and approval queue modules:

- `server/_core/ai/orchestrator.ts`
- `server/_core/ai/approval/approvalQueue.ts`
- `server/modules/growth-engine/persistence.ts`

## Existing Contracts Wired In Marketing Studio

| Area | Backend contract | Frontend usage |
| --- | --- | --- |
| Marketing contacts | `admin.getMarketingContacts`, create/import/update/delete contacts | Audience / CRM tab |
| Suppression list | `admin.getSuppressionList`, add/remove suppression | Suppression List tab |
| Email campaigns | `admin.getCampaigns`, create/start/cancel campaign | Email Studio tab |
| Campaign sequences | `admin.getCampaignSequences`, create/update sequence | Sequences tab |
| Campaign replies | `admin.getCampaignReplies`, mark/fetch replies | Replies / Inbox tab |
| Growth overview | `admin.getGrowthEngineOverview` | Overview/Analytics tabs |
| Approval queue | AI diagnostics plus approve/reject/schedule mutations | Approval Queue tab |
| Media jobs | `admin.createMediaJob`, diagnostics media queue | Media/Video/Avatar tabs |
| Provider diagnostics | `admin.getAIDiagnostics`, site settings | AI Providers / Diagnostics tab |
| GenX/HF settings | `admin.getSiteSettings`, `admin.saveSiteSetting` | Settings and AI Providers tabs |

## Button Policy

All visible Marketing Studio actions now follow one of two rules:

- Perform a real mutation/query.
- Show an explicit disabled internal-beta state.

Direct social publishing buttons are not live and are labelled as internal beta / OAuth deferred.

## Known Limits

- Local route QA did not have a reachable MySQL database with real campaign data, so router calls were contract/build/type checked rather than live-data executed.
- Platform OAuth connection states remain placeholder/internal beta because social posting is out of scope.
- Approval queue list display uses AI diagnostics; a richer dedicated list endpoint can be added later if needed.
