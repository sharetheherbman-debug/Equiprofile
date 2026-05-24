import type { AgentId, AITask } from "../types";

export type AgentPolicy = {
  id: AgentId;
  purpose: string;
  allowedTasks: AITask[];
  restrictedTasks: AITask[];
  moderationHooks: string[];
  escalationHooks: string[];
  analyticsHooks: string[];
  timeoutMs: number;
  costAwareness: "low" | "medium" | "high";
  knowledgeSources: string[];
};

const policies: Record<AgentId, AgentPolicy> = {
  GrowthAgent: {
    id: "GrowthAgent",
    purpose: "Marketing strategy, messaging, and growth orchestration",
    allowedTasks: ["copywriting", "classification", "chat", "embeddings"],
    restrictedTasks: ["avatar_video"],
    moderationHooks: ["compliance_marketing_claims"],
    escalationHooks: ["professional_review"],
    analyticsHooks: ["campaign_generation"],
    timeoutMs: 20_000,
    costAwareness: "high",
    knowledgeSources: ["campaign_templates", "cta_templates", "seasonal_campaign_knowledge"],
  },
  MediaAgent: {
    id: "MediaAgent",
    purpose: "Media generation and queue-safe asset production",
    allowedTasks: ["text_to_image", "image_edit", "image_to_video", "text_to_video", "avatar_video", "text_to_speech", "speech_to_text", "image_captioning"],
    restrictedTasks: [],
    moderationHooks: ["media_safety", "impersonation_check"],
    escalationHooks: ["medium_confidence", "high_confidence"],
    analyticsHooks: ["media_generation"],
    timeoutMs: 120_000,
    costAwareness: "high",
    knowledgeSources: ["brand_voice_rules", "social_templates"],
  },
  StableAssistantAgent: {
    id: "StableAssistantAgent",
    purpose: "Stable operations assistant and rider support",
    allowedTasks: ["chat", "classification", "copywriting", "moderation"],
    restrictedTasks: ["avatar_video"],
    moderationHooks: ["unsafe_riding_guard"],
    escalationHooks: ["professional_review"],
    analyticsHooks: ["assistant_support"],
    timeoutMs: 25_000,
    costAwareness: "medium",
    knowledgeSources: ["stable_management_knowledge", "uk_equestrian_terminology", "safety_compliance_rules"],
  },
  AcademyAgent: {
    id: "AcademyAgent",
    purpose: "Education and academy-oriented AI guidance",
    allowedTasks: ["chat", "copywriting", "classification", "moderation"],
    restrictedTasks: ["avatar_video"],
    moderationHooks: ["academy_safety_guard"],
    escalationHooks: ["professional_review"],
    analyticsHooks: ["academy_ai_usage"],
    timeoutMs: 25_000,
    costAwareness: "medium",
    knowledgeSources: ["onboarding_templates", "safety_compliance_rules"],
  },
  CustomerSuccessAgent: {
    id: "CustomerSuccessAgent",
    purpose: "Onboarding, lifecycle communication, and retention messaging",
    allowedTasks: ["chat", "copywriting", "classification", "text_to_speech"],
    restrictedTasks: ["avatar_video"],
    moderationHooks: ["no_fake_claims"],
    escalationHooks: ["medium_confidence"],
    analyticsHooks: ["onboarding_ai_usage"],
    timeoutMs: 20_000,
    costAwareness: "medium",
    knowledgeSources: ["onboarding_templates", "launch_templates", "cta_templates"],
  },
  ComplianceAgent: {
    id: "ComplianceAgent",
    purpose: "Policy moderation, claims safety, and escalation routing",
    allowedTasks: ["moderation", "classification", "chat"],
    restrictedTasks: ["text_to_video", "avatar_video"],
    moderationHooks: ["gdpr_guard", "medical_claim_guard", "endorsement_guard", "autopublish_guard"],
    escalationHooks: ["low_confidence", "medium_confidence", "high_confidence", "professional_review"],
    analyticsHooks: ["compliance_events"],
    timeoutMs: 15_000,
    costAwareness: "low",
    knowledgeSources: ["safety_compliance_rules"],
  },
  AdminOpsAgent: {
    id: "AdminOpsAgent",
    purpose: "System diagnostics, orchestration visibility, and operations support",
    allowedTasks: ["chat", "classification", "moderation", "embeddings"],
    restrictedTasks: [],
    moderationHooks: ["admin_guardrails"],
    escalationHooks: ["medium_confidence"],
    analyticsHooks: ["ops_diagnostics"],
    timeoutMs: 20_000,
    costAwareness: "high",
    knowledgeSources: ["launch_templates", "brand_voice_rules"],
  },
};

export function getAgentPolicy(id: AgentId): AgentPolicy {
  return policies[id];
}

export function listAgentPolicies(): AgentPolicy[] {
  return Object.values(policies);
}
