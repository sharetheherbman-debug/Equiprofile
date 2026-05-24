# Social Integrations Foundation

## Supported foundations
- YouTube
- Meta (Facebook + Instagram)
- TikTok
- LinkedIn
- Google Business Profile

## Implemented architecture
- OAuth-ready connection model in `growthSocialConnections`
- Encrypted token storage fields (`encryptedAccessToken`, `encryptedRefreshToken`)
- Token expiry tracking (`tokenExpiresAt`)
- Platform connection state machine
- Scheduling and approval readiness represented by connection states
- Queue and analytics hooks through Growth Engine queue/events APIs

## Connection states
- `not_connected`
- `draft_only`
- `connected`
- `approval_required`
- `ready_to_publish`
- `error`

## API surfaces
- `growthEngine.updateSocialConnection`
- `growthEngine.getAdminData` (social status visibility)

## Guardrails
- No direct autopublish implemented in Phase 4.
- Approval-first publishing lifecycle remains enforced.

