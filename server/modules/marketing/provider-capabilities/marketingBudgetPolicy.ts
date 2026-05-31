import type { MarketingCostTier, WorkspaceBudgetPolicy } from "./providerCapabilityTypes";

const COST_ORDER: Record<MarketingCostTier, number> = {
  free: 0,
  budget: 1,
  standard: 2,
  premium: 3,
  elite: 4,
  unknown: 5,
};

export function defaultWorkspaceBudgetPolicy(mode: "standard" | "elite" = "standard"): WorkspaceBudgetPolicy {
  return {
    mode,
    maxCostTier: mode === "elite" ? "elite" : "standard",
    maxVariantsPerRun: 8,
    maxRenderJobsPerRun: 8,
    maxVideoSecondsPerRun: mode === "elite" ? 300 : 90,
    allowPremiumVideo: mode === "elite",
    allowPremiumVoice: mode === "elite",
    allowPremiumAvatar: mode === "elite",
    allowPremiumMusic: mode === "elite",
    allowGenXFallbackInStandard: false,
    requireApprovalForPremiumSpend: true,
  };
}

export type BudgetDecision = {
  allowed: boolean;
  code: "ok" | "budget_blocked";
  reason: string | null;
};

export function evaluateBudgetPolicy(input: {
  policy: WorkspaceBudgetPolicy;
  costTier: MarketingCostTier;
  task: string;
  provider: string;
}): BudgetDecision {
  if (COST_ORDER[input.costTier] > COST_ORDER[input.policy.maxCostTier]) {
    return {
      allowed: false,
      code: "budget_blocked",
      reason: `budget_blocked: ${input.provider}/${input.task} exceeds maxCostTier=${input.policy.maxCostTier}`,
    };
  }

  if (input.policy.mode === "standard" && input.provider === "genx" && ["premium", "elite"].includes(input.costTier) && !input.policy.allowGenXFallbackInStandard) {
    return {
      allowed: false,
      code: "budget_blocked",
      reason: "budget_blocked: standard mode disallows premium GenX fallback without explicit policy override",
    };
  }

  return { allowed: true, code: "ok", reason: null };
}
