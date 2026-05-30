import type { BeastModeCostTier, BeastModeMode, BeastModeTask } from "./beastModeTypes";

const TASK_TIERS: Record<BeastModeTask, BeastModeCostTier> = {
  strategy: "high",
  copywriting: "medium",
  hook_generation: "low",
  translation: "low",
  scriptwriting: "medium",
  scene_planning: "high",
  prompt_direction: "medium",
  captioning: "low",
  qa_summary: "low",
};

export function resolveBeastModeCostTier(input: {
  task: BeastModeTask;
  mode: BeastModeMode;
  qualityTarget?: "balanced" | "premium";
  maxCostTier?: BeastModeCostTier;
}): BeastModeCostTier {
  const base = TASK_TIERS[input.task];
  const elevated = input.mode === "elite" || input.qualityTarget === "premium"
    ? (base === "low" ? "medium" : "high")
    : base;
  if (!input.maxCostTier) return elevated;
  const order: BeastModeCostTier[] = ["low", "medium", "high"];
  return order.indexOf(elevated) > order.indexOf(input.maxCostTier) ? input.maxCostTier : elevated;
}
