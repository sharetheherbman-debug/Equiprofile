# Update 3 Agent Team QA

## Implemented Agents

- `StrategyAgent`
- `CopyAgent`
- `CreativeDirectorAgent`
- `MediaAgent`
- `PlatformIntelligenceAgent`
- `ComplianceAgent`
- `SchedulerAgent`
- `LearningAgent`

Existing agents remain:
- `GrowthAgent`
- `StableAssistantAgent`
- `AcademyAgent`
- `CustomerSuccessAgent`
- `AdminOpsAgent`

## Product Behavior

- Users do not configure agents.
- Studio shows a simple AI team progress timeline: Strategist, Copywriter, Creative Director, Compliance, Scheduler.
- Media Agent is added internally for media-capable intents.
- Each policy includes purpose, allowed tasks, moderation hooks, escalation hooks, analytics hooks, timeout, cost awareness, and knowledge sources.

## Safety

- Compliance remains approval-first.
- Media/avatar tasks remain restricted from agents that should not perform them.
- No duplicate orchestration stack was introduced.

## Tests

- `server/_core/ai/agents/registry.test.ts`
- `server/_core/ai/capabilityRouter.test.ts`
- `server/marketingStudio.product.test.ts`
