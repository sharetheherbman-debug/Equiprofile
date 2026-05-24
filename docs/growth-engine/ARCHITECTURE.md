# AmarktAI Growth Engine Architecture

## Canonical module location
- `server/modules/growth-engine/`

## Core design goals
- One reusable Growth Engine powering EquiProfile now and future apps later.
- App-agnostic core that only knows tenants, contacts, campaigns, onboarding, lifecycle, referrals, approvals, analytics, assets, and providers.
- No duplicate queue, onboarding, analytics, CRM, approval, or social orchestration systems.

## Module map
- `types.ts` — canonical social states, onboarding types, adapter contract.
- `adapters.ts` — adapter registry and EquiProfile adapter.
- `persistence.ts` — tenant-safe persistence layer for queue, social, onboarding, CRM, lifecycle, referrals, analytics, feedback.
- `engine.ts` — service-level orchestrators and reusable quickstart templates.
- `index.ts` — canonical exports.

## Persistence-backed foundations
- Approval lifecycle and media queue persistence use `growthQueueJobs`.
- Social OAuth/token state persistence uses `growthSocialConnections`.
- Onboarding progression persistence uses `growthOnboardingFlows`.
- Lifecycle automation audit trail uses `growthAutomationRuns`.
- Referral tracking uses `growthReferrals`.
- Funnel and lifecycle events use `growthAnalyticsEvents`.
- Feedback/support loop uses `growthFeedback`.
- Unified CRM is extended on `marketingContacts` with tenant/app lifecycle fields.

## Adapter system
- Adapter registry allows one core engine with app-specific branding, plans, feature flags, AI context, and lifecycle trigger definitions.
- `EquiProfileAdapter` is registered as default and demonstrates expected integration shape for future apps.

## Hook points
- Onboarding hooks: `startOnboardingFlow`, `getOnboardingFlow`.
- Tenant hooks: all persistence methods are tenant-scoped via `tenantId` and `tenantType`.
- Provider hooks: social connection records include platform and encrypted token fields.
- Analytics hooks: `trackGrowthFunnelEvent` and `getFunnelSummary`.
- Social hooks: `connectSocialPlatform`, `listSocialConnections`.
- Lifecycle hooks: `createLifecycleRun`, lifecycle dashboards in `getGrowthEngineAdminData`.

## Runtime integrations
- AI approval queue and media job manager are now persistence-backed via Growth Engine repository APIs.
- Admin diagnostics and dashboard APIs can read a single canonical queue source.

