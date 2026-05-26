export const CANONICAL_AI_TASKS = [
  "chat",
  "copywriting",
  "strategy",
  "campaign_generation",
  "social_generation",
  "email_generation",
  "text_to_image",
  "image_edit",
  "image_to_video",
  "text_to_video",
  "avatar_video",
  "speech_to_text",
  "text_to_speech",
  "image_captioning",
  "classification",
  "moderation",
  "embeddings",
  "analytics",
] as const;

export type AITask = (typeof CANONICAL_AI_TASKS)[number];

export const AI_PROVIDER_NAMES = ["genx", "huggingface", "qwen"] as const;
export type AIProviderName = (typeof AI_PROVIDER_NAMES)[number];

export const AGENT_IDS = [
  "StrategyAgent",
  "CopyAgent",
  "CreativeDirectorAgent",
  "PlatformIntelligenceAgent",
  "GrowthAgent",
  "MediaAgent",
  "SchedulerAgent",
  "LearningAgent",
  "AnalyticsAgent",
  "AudienceAgent",
  "StableAssistantAgent",
  "AcademyAgent",
  "CustomerSuccessAgent",
  "ComplianceAgent",
  "AdminOpsAgent",
] as const;
export type AgentId = (typeof AGENT_IDS)[number];

export const APPROVAL_STATUSES = [
  "draft",
  "needs_review",
  "approved",
  "scheduled",
  "published",
  "failed",
  "rejected",
] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

export const MEDIA_JOB_STATES = [
  "job_created",
  "queued",
  "processing",
  "completed",
  "failed",
] as const;
export type MediaJobState = (typeof MEDIA_JOB_STATES)[number];

export type EscalationLevel = "low_confidence" | "medium_confidence" | "high_confidence" | "professional_review";

export type TenantType = "stable" | "school" | "teacher_organization";

export type TenantScope = {
  tenantType: TenantType;
  tenantId: string;
  initiatedByUserId?: number;
};

export type AIUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

export type TaskExecutionResult = {
  provider: AIProviderName;
  task: AITask;
  model: string;
  output: unknown;
  usage?: AIUsage;
  latencyMs: number;
  resultType?: "text" | "json" | "url" | "base64" | "binary" | "file" | "provider_job_pending" | "failed";
  routeReason?: string;
  endpointFamily?: string;
};

export type AIExecutionRequest = {
  task: AITask;
  input: Record<string, unknown>;
  tenantScope?: TenantScope;
  agentId?: AgentId;
  timeoutMs?: number;
  maxRetries?: number;
  requiresApproval?: boolean;
};

export type AIExecutionResponse = {
  status: "completed" | "queued" | "needs_review";
  task: AITask;
  provider?: AIProviderName;
  model?: string;
  output?: unknown;
  jobId?: string;
  routeReason?: string;
  approvalId?: string;
  moderation?: {
    blocked: boolean;
    reasons: string[];
    escalation: EscalationLevel;
  };
};
