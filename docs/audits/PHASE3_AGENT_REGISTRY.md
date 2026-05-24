# Phase 3 Agent Registry

## Production agents (only)
1. GrowthAgent
2. MediaAgent
3. StableAssistantAgent
4. AcademyAgent
5. CustomerSuccessAgent
6. ComplianceAgent
7. AdminOpsAgent

## Registry location
- `server/_core/ai/agents/registry.ts`

## Per-agent contract
Each agent defines:
- purpose
- allowed tasks
- restricted tasks
- moderation hooks
- escalation hooks
- analytics hooks
- timeout handling
- cost awareness
- knowledge sources

## Enforcement
- Orchestrator validates allowed/restricted task execution against the selected agent policy.
