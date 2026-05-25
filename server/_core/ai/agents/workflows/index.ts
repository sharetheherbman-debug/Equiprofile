import type { AgentId, AITask } from "../../types";
import type { ProductIntent } from "../../capabilityRouter";

export const WORKFLOW_PIPELINES = [
  "content_generation",
  "launch_campaign",
  "autopilot_growth",
  "reel_generation",
  "email_campaign",
  "educational_campaign",
  "avatar_generation",
  "social_pack_generation",
] as const;

export type WorkflowPipelineId = (typeof WORKFLOW_PIPELINES)[number];

export type WorkflowStep = {
  order: number;
  agentId: AgentId;
  task: AITask;
  outputKey: string;
};

export type WorkflowPipeline = {
  id: WorkflowPipelineId;
  intents: ProductIntent[];
  steps: WorkflowStep[];
};

const basePipeline: WorkflowStep[] = [
  { order: 1, agentId: "StrategyAgent", task: "copywriting", outputKey: "strategy" },
  { order: 2, agentId: "CopyAgent", task: "copywriting", outputKey: "copy" },
  { order: 3, agentId: "CreativeDirectorAgent", task: "copywriting", outputKey: "creative_brief" },
  { order: 4, agentId: "MediaAgent", task: "text_to_image", outputKey: "media" },
  { order: 5, agentId: "ComplianceAgent", task: "moderation", outputKey: "compliance" },
  { order: 6, agentId: "SchedulerAgent", task: "classification", outputKey: "schedule" },
  { order: 7, agentId: "LearningAgent", task: "classification", outputKey: "learning" },
];

const pipelines: Record<WorkflowPipelineId, WorkflowPipeline> = {
  content_generation: {
    id: "content_generation",
    intents: ["social_post", "carousel_post", "blog_post", "product_ad"],
    steps: basePipeline,
  },
  launch_campaign: {
    id: "launch_campaign",
    intents: ["launch_campaign", "platform_pack", "ad_campaign"],
    steps: basePipeline,
  },
  autopilot_growth: {
    id: "autopilot_growth",
    intents: ["stable_marketing", "school_marketing", "academy_marketing"],
    steps: basePipeline,
  },
  reel_generation: {
    id: "reel_generation",
    intents: ["facebook_reel", "instagram_reel", "tiktok_short", "youtube_short"],
    steps: [
      ...basePipeline.slice(0, 3),
      { order: 4, agentId: "MediaAgent", task: "text_to_video", outputKey: "video" },
      ...basePipeline.slice(4),
    ],
  },
  email_campaign: {
    id: "email_campaign",
    intents: ["email_campaign"],
    steps: basePipeline,
  },
  educational_campaign: {
    id: "educational_campaign",
    intents: ["educational_content", "youtube_long"],
    steps: basePipeline,
  },
  avatar_generation: {
    id: "avatar_generation",
    intents: ["avatar_video", "talking_head_video", "voiceover_ad"],
    steps: [
      ...basePipeline.slice(0, 3),
      { order: 4, agentId: "MediaAgent", task: "avatar_video", outputKey: "avatar_video" },
      { order: 5, agentId: "MediaAgent", task: "text_to_speech", outputKey: "voice" },
      { order: 6, agentId: "ComplianceAgent", task: "moderation", outputKey: "compliance" },
      { order: 7, agentId: "SchedulerAgent", task: "classification", outputKey: "schedule" },
    ],
  },
  social_pack_generation: {
    id: "social_pack_generation",
    intents: ["platform_pack"],
    steps: basePipeline,
  },
};

export function listWorkflowPipelines(): WorkflowPipeline[] {
  return Object.values(pipelines);
}

export function resolveWorkflowForIntent(intent: ProductIntent): WorkflowPipeline {
  return (
    Object.values(pipelines).find((pipeline) => pipeline.intents.includes(intent)) ??
    pipelines.content_generation
  );
}

export function runWorkflowPipeline(input: {
  intent: ProductIntent;
  prompt: string;
  seed?: Record<string, unknown>;
}) {
  const workflow = resolveWorkflowForIntent(input.intent);
  const outputs: Record<string, unknown> = { ...(input.seed ?? {}), prompt: input.prompt, intent: input.intent };

  for (const step of workflow.steps) {
    outputs[step.outputKey] = {
      generatedBy: step.agentId,
      task: step.task,
      status: "completed",
      summary: `${step.agentId} completed ${step.task}`,
    };
  }

  return {
    workflowId: workflow.id,
    steps: workflow.steps,
    outputs,
  };
}
