# Update 1 — Architecture Safety Check

**Date**: 2026-05-24  
**Branch**: copilot/update-growth-engine-foundation  
**Purpose**: Confirm no duplicate systems before extending Growth Engine foundation.

---

## 1. Growth Engine — Single Source of Truth

**Location**: `server/modules/growth-engine/`

Files:
- `persistence.ts` — all DB reads/writes (growthQueueJobs, growthSocialConnections, growthOnboardingFlows, growthAutomationRuns, growthReferrals, growthAnalyticsEvents, growthFeedback, marketingContacts)
- `engine.ts` — high-level orchestration functions (getGrowthEngineOverview, saveCrmContact, etc.)
- `types.ts` — shared Growth Engine types (SocialPlatform, OnboardingType, GrowthFunnelEvent, etc.)
- `adapters.ts` — GrowthEngine adapter configuration (EquiProfile adapter definition)
- `crypto.ts` — encryption helpers (encryptGrowthSecret, decryptGrowthSecret)
- `index.ts` — re-exports all of the above

**Verdict**: ✅ Single source of truth confirmed. No duplicate Growth Engine exists.

---

## 2. AI Orchestration — Single Source of Truth

**Location**: `server/_core/ai/`

Files:
- `orchestrator.ts` — `executeAITask()` entry point, `getAIDiagnostics()`
- `jobs/mediaJobManager.ts` — MediaJobManager class (wraps persistence functions)
- `approval/approvalQueue.ts` — aiApprovalQueue (wraps approval persistence)
- `providers/providerRegistry.ts` — executeWithFallback, getProviderHealth
- `tasks/taskRegistry.ts` — task definitions and validation
- `agents/registry.ts` — agent policy registry
- `moderation/compliance.ts` — compliance moderation
- `analytics/usageAnalytics.ts` — usage tracking
- `knowledge/templates.ts` — knowledge library
- `index.ts` — re-exports all of the above

**Verdict**: ✅ Single source of truth confirmed. No duplicate AI orchestration exists.

---

## 3. Media Jobs — Current State

**Where jobs are created**: `server/_core/ai/orchestrator.ts` → `mediaJobManager.createJob()`  
**Where jobs persist**: `growthQueueJobs` table (queueType = "media")  
**Job fields used**: `id`, `queueType`, `status`, `task`, `provider`, `tenantType`, `tenantId`, `payloadJson`, `outputJson`, `errorMessage`, `completedAt`

**Where outputs currently go**:
- Provider result is stored in `outputJson` column via `transitionMediaJob()`
- **Problem**: `outputJson` stores raw provider output with no normalisation
- **Problem**: No local file storage — if provider returns a URL, that URL may expire
- **Problem**: No `mediaAssets` registry — outputs are not surfaced in a structured way
- **Problem**: Marketing Studio Assets tab reads `growthQueueJobs` directly (raw job view, not asset view)

**Verdict**: ⚠️ Media outputs persist in DB but are not normalised, not stored locally, not surfaced as usable assets.

---

## 4. Marketing Studio — Single Source of Truth

**Location**: `client/src/pages/AdminCampaigns.tsx`  
**Router contracts**: `server/routers.ts` (admin router, adminUnlockedProcedure)

Existing procedures:
- `admin.createMarketingDraft` — generates content via AI, saves to growthQueueJobs (approval queue)
- `admin.updateMarketingDraft` — edits draft fields in growthQueueJobs
- `admin.sendMarketingDraftToApproval` — submits draft to approval
- `admin.approveMarketingDraft` / `admin.rejectMarketingDraft` — approval actions
- `admin.scheduleMarketingDraft` — schedule to calendar
- `admin.listMarketingDrafts` — list approval-type jobs in draft status
- `admin.listApprovalQueue` — list needs_review jobs
- `admin.listMarketingCalendar` — list scheduled jobs
- `admin.listMarketingAssets` — list media-type growthQueueJobs (raw view)

**Verdict**: ✅ Single Marketing Studio. No duplicate campaigns system.

---

## 5. Existing Campaign/Email/Suppression System

**Tables**: `emailCampaigns`, `emailCampaignRecipients`, `emailUnsubscribes`, `campaignSequences`, `campaignSequenceRecipients`, `campaignSendLog`, `campaignReplies`, `marketingContacts`

**These are NOT touched by Update 1.** The Growth Engine extension adds new tables only.

**Verdict**: ✅ Campaign/email/suppression system untouched.

---

## 6. Existing Storage

**`server/storage.ts`**:
- `storagePut()` — uses proxy if STORAGE_PROXY_URL/KEY set, else falls back to local disk
- `storagePutLocal()` — writes to `ENV.storagePath` (default: `/var/www/equiprofile/uploads` in prod)
- Security: path traversal check already in place

**New module**: `server/_core/storage/localMediaStorage.ts` extends this for generated media assets with:
- Separate storage root: `EQUIPROFILE_STORAGE_ROOT` (default: `/var/equiprofile/storage`)
- Structured subfolders for media types
- Public URL format: `/media/generated/{folder}/{filename}`

**Verdict**: ✅ New storage module supplements existing storage — does not replace it.

---

## 7. Redis / BullMQ

**Current state**: No Redis, no BullMQ. Media jobs use `setTimeout(fn, 0)` in orchestrator.  
**Update 1 decision**: Document BullMQ adapter interface; use in-process fallback. Do not activate BullMQ without confirmed Redis.

**Verdict**: ✅ No half-implemented queue system added.

---

## 8. What Can Be Safely Extended (Update 1 additions)

| Area | Action | Risk |
|------|---------|------|
| `growthQueueJobs` | Continue using for media/approval jobs | None |
| `server/modules/growth-engine/` | Add mediaAssets.ts, brandProfiles.ts, brandAvatars.ts, growthIntelligence.ts, contentScoring.ts, queues.ts | Low |
| `drizzle/schema.ts` | Add mediaAssets, brandProfiles, brandAvatars, growthProfiles, contentScores, platformStrategyRules tables | Low |
| `server/_core/ai/orchestrator.ts` | Add output normalisation and media asset registration in setTimeout block | Low (additive only) |
| `server/routers.ts` | Add admin procedures for brand/avatar/media/queue | Low (additive only) |
| `client/src/pages/AdminCampaigns.tsx` | Update Assets tab + Settings tab Brand/Avatar cards | Low (additive only) |

---

## 9. What Must NOT Be Touched

- `server/_core/auth*` / `server/_core/billingRouter.ts` — auth/billing
- `server/studentRouter.ts` / `server/teacherRouter.ts` / `server/schoolRouter.ts` — academy/school
- `client/src/pages/DashboardLayout.tsx` / role visibility — dashboard roles
- `emailCampaigns` table + campaign send logic — existing email system
- `emailUnsubscribes` + suppression logic — suppression stays working

---

## 10. Summary

✅ One Growth Engine source of truth  
✅ One AI orchestration source of truth  
✅ Media jobs persist (but outputs need normalisation — fixed in Phase D)  
✅ No duplicate Marketing Studio / Campaigns / CRM  
✅ Safe to extend with new tables and service modules  
✅ Existing auth/billing/academy/dashboard untouched  
