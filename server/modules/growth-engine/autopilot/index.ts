import { resolveWorkflowForIntent } from "../../../_core/ai/agents/workflows";
import { inferProductIntent } from "../../../_core/ai/capabilityRouter";
import { getCampaignTemplate } from "../templates";

export const AUTOPILOT_MODES = ["Conservative", "Balanced", "Aggressive"] as const;
export type AutopilotMode = (typeof AUTOPILOT_MODES)[number];

export type AutopilotSettings = {
  enabled: boolean;
  approveBeforePost: boolean;
  frequency: "daily" | "weekly" | "biweekly";
  platforms: string[];
  goals: string[];
  mode: AutopilotMode;
};

export type AutopilotPlan = {
  mode: AutopilotMode;
  cadencePerWeek: number;
  channels: string[];
  goals: string[];
  templateId: string;
  intent: ReturnType<typeof inferProductIntent>;
  workflowId: string;
  actions: string[];
  optimizationLoop: string[];
};

const MODE_TO_CADENCE: Record<AutopilotMode, number> = {
  Conservative: 2,
  Balanced: 4,
  Aggressive: 7,
};

export function buildAutopilotPlan(input: {
  prompt: string;
  settings: AutopilotSettings;
  templateId?: string;
}): AutopilotPlan {
  const intent = inferProductIntent({ prompt: input.prompt });
  const template = getCampaignTemplate(input.templateId ?? "weekly_social_pack") ?? getCampaignTemplate("weekly_social_pack");
  const workflow = resolveWorkflowForIntent(intent);

  return {
    mode: input.settings.mode,
    cadencePerWeek: MODE_TO_CADENCE[input.settings.mode],
    channels: input.settings.platforms.length ? input.settings.platforms : [...template.platformMix],
    goals: input.settings.goals,
    templateId: template.id,
    intent,
    workflowId: workflow.id,
    actions: [
      "generate_campaigns",
      "generate_assets",
      "propose_schedule",
      input.settings.approveBeforePost ? "wait_for_approval" : "publish_when_ready",
      "track_performance",
      "regenerate_low_performers",
    ],
    optimizationLoop: [
      "audience_segment_refresh",
      "best_time_recalculation",
      "creative_variation_test",
      "cta_strength_adjustment",
    ],
  };
}
