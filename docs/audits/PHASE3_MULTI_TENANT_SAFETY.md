# Phase 3 Multi-Tenant Safety

## Tenant isolation contract
AI orchestration supports explicit tenant scoping via:
- `tenantType` (`stable`, `school`, `teacher_organization`)
- `tenantId`
- `initiatedByUserId`

## Isolation surfaces
Tenant scope is carried through:
- approval queue items
- media jobs
- orchestration requests
- diagnostics filtering foundations

## Marketing Studio safety foundations
The architecture is prepared to isolate per tenant:
- contacts
- analytics
- campaigns
- assets
- approvals
- API tokens
- media jobs
- generation history

## Current phase note
This phase establishes the shared tenant-safe contracts and queue storage shape. Full tenant DB partitioning/migrations for all marketing entities can be layered in the next prompt without architectural rewrites.
