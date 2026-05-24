# Phase 3 Approval-First Flow

## Canonical lifecycle
- `draft`
- `needs_review`
- `approved`
- `scheduled`
- `published`
- `failed`
- `rejected`

## Implementation
- `server/_core/ai/approval/approvalQueue.ts`

## Behavior
- AI-generated content can be created as draft and moved to `needs_review` before execution/publishing.
- Reviewer actions (approve/reject) are tracked with actor and timestamp.
- Rejection reasons and scheduling metadata are captured.
- Audit log entries are written per lifecycle transition.

## Current publication rule
- No direct social publishing is enabled in this phase.
- Approval queue is foundation-only and admin/internal.
