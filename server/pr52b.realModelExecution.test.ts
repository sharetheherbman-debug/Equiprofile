import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi, beforeEach } from "vitest";

const root = path.resolve(import.meta.dirname, "..");

function read(rel: string) {
  return fs.readFileSync(path.resolve(root, rel), "utf8");
}

const baseInput = {
  tenantId: "global",
  workspaceId: "default",
  hostAppId: "equiprofile",
  brandKit: { brandName: "EquiProfile", domain: "equiprofile.com", primaryCta: "Sign up today" },
  campaignBrief: {
    campaignName: "Launch",
    goal: "More signups",
    audience: "Stable owners",
    offer: "Free trial",
    primaryCta: "Sign up today",
  },
  platform: "Facebook",
  language: "English",
  contentType: "facebook_ad",
  audience: "Stable owners",
  offer: "Free trial",
};

describe("PR52B real model execution", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("adds centralized marketing model execution module files", () => {
    const dir = path.resolve(root, "server/modules/marketing/model-execution");
    for (const file of [
      "index.ts",
      "marketingModelExecutionTypes.ts",
      "marketingModelExecutionService.ts",
      "marketingModelExecutionPrompts.ts",
      "marketingModelExecutionParser.ts",
      "marketingModelExecutionFallback.ts",
      "marketingModelExecutionTelemetry.ts",
    ]) {
      expect(fs.existsSync(path.join(dir, file))).toBe(true);
    }
  });

  it("uses orchestrator/provider when Standard Qwen route is available", async () => {
    const executeAITask = vi.fn().mockResolvedValue({
      status: "completed",
      provider: "qwen",
      model: "qwen-plus-marketing",
      output: JSON.stringify({
        angle: "Angle",
        hook: "Hook",
        body: "Body",
        cta: "Sign up today",
        hashtags: ["#equiprofile"],
        visualPrompt: "Visual",
        reviewStatus: "needs_review",
      }),
    });
    vi.doMock("./_core/ai/orchestrator", () => ({ executeAITask }));
    vi.doMock("./_core/ai/modelRegistry", () => ({
      resolveModelCandidatesForTask: vi.fn().mockResolvedValue([
        { provider: "qwen", id: "qwen-plus-marketing" },
        { provider: "huggingface", id: "hf-qwen-instruct" },
      ]),
    }));
    vi.doMock("./_core/ai/providers/providerRegistry", () => ({
      isProviderAvailableForTask: vi.fn(async (provider: string) => provider === "qwen"),
    }));
    const { executeMarketingModelTask } = await import("./modules/marketing/model-execution/marketingModelExecutionService");
    const result = await executeMarketingModelTask({ ...baseInput, mode: "standard", task: "platform_copywriting" });
    expect(executeAITask).toHaveBeenCalled();
    expect(result.generationMode).toBe("model");
    expect(result.provider).toBe("qwen");
    expect(result.output.hook).toBe("Hook");
  });

  it("uses GenX first for Elite mode when available", async () => {
    const executeAITask = vi.fn().mockResolvedValue({
      status: "completed",
      provider: "genx",
      model: "genx-premium-strategy",
      output: JSON.stringify({ content: "Elite strategy", reviewStatus: "needs_review" }),
    });
    vi.doMock("./_core/ai/orchestrator", () => ({ executeAITask }));
    vi.doMock("./_core/ai/modelRegistry", () => ({
      resolveModelCandidatesForTask: vi.fn().mockResolvedValue([
        { provider: "genx", id: "genx-premium-strategy" },
        { provider: "qwen", id: "qwen-plus-marketing" },
      ]),
    }));
    vi.doMock("./_core/ai/providers/providerRegistry", () => ({
      isProviderAvailableForTask: vi.fn(async (provider: string) => provider === "genx"),
    }));
    const { executeMarketingModelTask } = await import("./modules/marketing/model-execution/marketingModelExecutionService");
    const result = await executeMarketingModelTask({ ...baseInput, mode: "elite", task: "campaign_strategy" });
    expect(result.provider).toBe("genx");
    expect(result.generationMode).toBe("model");
  });

  it("returns setup_needed/provider_unavailable safely", async () => {
    vi.doMock("./_core/ai/orchestrator", () => ({ executeAITask: vi.fn() }));
    vi.doMock("./_core/ai/modelRegistry", () => ({ resolveModelCandidatesForTask: vi.fn().mockResolvedValue([]) }));
    vi.doMock("./_core/ai/providers/providerRegistry", () => ({ isProviderAvailableForTask: vi.fn().mockResolvedValue(false) }));
    const { executeMarketingModelTask } = await import("./modules/marketing/model-execution/marketingModelExecutionService");
    const result = await executeMarketingModelTask({ ...baseInput, mode: "standard", task: "platform_copywriting" });
    expect(["setup_needed", "provider_unavailable"]).toContain(result.status);
    expect(result.generationMode).toBe("fallback");
  });

  it("rejects empty provider response and falls back", async () => {
    vi.doMock("./_core/ai/orchestrator", () => ({ executeAITask: vi.fn().mockResolvedValue({ status: "completed", provider: "qwen", model: "qwen-plus-marketing", output: "" }) }));
    vi.doMock("./_core/ai/modelRegistry", () => ({ resolveModelCandidatesForTask: vi.fn().mockResolvedValue([{ provider: "qwen", id: "qwen-plus-marketing" }]) }));
    vi.doMock("./_core/ai/providers/providerRegistry", () => ({ isProviderAvailableForTask: vi.fn().mockResolvedValue(true) }));
    const { executeMarketingModelTask } = await import("./modules/marketing/model-execution/marketingModelExecutionService");
    const result = await executeMarketingModelTask({ ...baseInput, mode: "standard", task: "platform_copywriting" });
    expect(result.generationMode).toBe("fallback");
    expect(result.fallbackReason).toContain("empty");
    expect(result.reviewStatus).toBe("needs_review");
  });

  it("malformed provider JSON triggers fallback", async () => {
    vi.doMock("./_core/ai/orchestrator", () => ({ executeAITask: vi.fn().mockResolvedValue({ status: "completed", provider: "qwen", model: "qwen-plus-marketing", output: "{not-json" }) }));
    vi.doMock("./_core/ai/modelRegistry", () => ({ resolveModelCandidatesForTask: vi.fn().mockResolvedValue([{ provider: "qwen", id: "qwen-plus-marketing" }]) }));
    vi.doMock("./_core/ai/providers/providerRegistry", () => ({ isProviderAvailableForTask: vi.fn().mockResolvedValue(true) }));
    const { executeMarketingModelTask } = await import("./modules/marketing/model-execution/marketingModelExecutionService");
    const result = await executeMarketingModelTask({ ...baseInput, mode: "standard", task: "platform_copywriting" });
    expect(result.generationMode).toBe("fallback");
    expect(result.parserWarnings.length).toBeGreaterThan(0);
  });

  it("beast mode and campaign engine files route through marketing model execution service", () => {
    expect(read("server/modules/marketing/beast-mode/beastModeExecutionService.ts")).toContain("executeMarketingModelTask");
    expect(read("server/modules/marketing/beast-mode/beastModeVariantPlanner.ts")).toContain("buildModelBackedVariantDraft");
    expect(read("server/modules/marketing/campaign-engine/campaignDeliverablePlanner.ts")).toContain("executeMarketingModelTask");
  });

  it("forbidden legacy draft/media job paths are absent", () => {
    const combined = [
      read("server/modules/marketing/beast-mode/beastModeExecutionService.ts"),
      read("server/modules/marketing/beast-mode/beastModeVariantPlanner.ts"),
      read("server/modules/marketing/campaign-engine/campaignDeliverablePlanner.ts"),
      read("server/modules/marketing/campaign-engine/campaignVideoPlanner.ts"),
    ].join("\n");
    expect(combined).not.toContain("createMarketingDraft");
    expect(combined).not.toContain("createMediaJob(");
  });

  it("export packs include routing metadata summaries", () => {
    expect(read("server/modules/marketing/beast-mode/index.ts")).toContain("summarizeMarketingRouting");
    expect(read("server/modules/marketing/campaign-engine/campaignExportPackBuilder.ts")).toContain("modelRoutingSummary");
  });

  it("frontend surfaces fallback/provider status without redesign", () => {
    const panel = read("client/src/components/marketing/app/MarketingAppPanels.tsx");
    expect(panel).toContain("Model generated");
    expect(panel).toContain("Fallback generated");
    expect(panel).toContain("Provider unavailable");
    expect(panel).toContain("Needs setup");
  });

  it("PR52B audit doc exists", () => {
    expect(fs.existsSync(path.resolve(root, "docs/audits/PR52B_REAL_MODEL_EXECUTION_AUDIT.md"))).toBe(true);
  });
});
