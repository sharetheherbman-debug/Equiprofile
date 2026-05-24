# Phase 3 Canonical AI Architecture

## Canonical structure
- `server/_core/ai/types.ts`
- `server/_core/ai/providers/*`
- `server/_core/ai/tasks/*`
- `server/_core/ai/agents/*`
- `server/_core/ai/jobs/*`
- `server/_core/ai/approval/*`
- `server/_core/ai/moderation/*`
- `server/_core/ai/analytics/*`
- `server/_core/ai/knowledge/*`
- `server/_core/ai/orchestrator.ts`

## Orchestration flow
1. Validate requested canonical task from task registry.
2. Resolve agent policy and enforce allowed/restricted task gates.
3. Run compliance moderation hooks before execution.
4. If approval-first path is required, create draft -> `needs_review` queue item.
5. If task is media/queued, create async media job (`job_created -> queued -> processing -> completed/failed`).
6. Route execution through provider fallback chain.
7. Record usage/failure analytics and expose diagnostics.

## Provider flow
- Provider registry contains one canonical provider layer.
- Primary provider: GenX (`genx_api_key`, `GENX_API_KEY`).
- Task-first capability provider: Hugging Face (`huggingface_api_key`, `HUGGINGFACE_API_KEY`).
- Fallback provider sequence is defined per task.

## Task flow
- Canonical tasks are declared in `types.ts` and mapped in `tasks/taskRegistry.ts`.
- Input validation, timeout defaults, queue defaults, and approval defaults are centralized.

## Moderation flow
- Compliance moderation executes for all AI requests before provider execution.
- Safety checks include fake endorsements, fake charity partnerships, unsafe riding, vet diagnosis claims, impersonation, and uncontrolled autopublish intent.

## Approval flow
- Canonical statuses: `draft`, `needs_review`, `approved`, `scheduled`, `published`, `failed`, `rejected`.
- Drafts are auditable and reviewer actions are logged.

## Analytics flow
- Provider usage, task counts, latency, and recent failures recorded centrally.
- Diagnostics include queue depth and recent execution failure surface.

## Knowledge flow
- Reusable templates and brand/safety knowledge are centralized in one library file.

## Queue flow
- Media generation is asynchronous and stateful with status polling support.

## Extensibility points
- Add providers in `providers/` and register them via provider registry.
- Add new canonical tasks via `types.ts` + `taskRegistry.ts` only.
- Add new moderation rules in `moderation/compliance.ts`.
- Add new knowledge packs in `knowledge/` without changing execution contracts.
