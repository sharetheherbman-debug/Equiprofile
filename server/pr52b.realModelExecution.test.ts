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

describe("PR52C model route enforcement", () => {
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

  it("uses route-locked orchestrator when Standard Qwen route is available", async () => {
    const executeAITaskWithProviderRoute = vi.fn().mockResolvedValue({
      status: "completed",
      provider: "qwen",
      model: "qwen-plus-marketing",
      selectedProvider: "qwen",
      selectedModel: "qwen-plus-marketing",
      executedProvider: "qwen",
      executedModel: "qwen-plus-marketing",
      routeEnforced: true,
      routeMismatchReason: null,
      providerStatus: "ready",
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
    vi.doMock("./_core/ai/orchestrator", () => ({ executeAITaskWithProviderRoute }));
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
    expect(executeAITaskWithProviderRoute).toHaveBeenCalled();
    expect(result.generationMode).toBe("model");
    expect(result.provider).toBe("qwen");
    expect(result.selectedProvider).toBe("qwen");
    expect(result.executedProvider).toBe("qwen");
    expect(result.routeEnforced).toBe(true);
    expect(result.output.hook).toBe("Hook");
  });

  it("uses GenX first for Elite mode when available", async () => {
    const executeAITaskWithProviderRoute = vi.fn().mockResolvedValue({
      status: "completed",
      provider: "genx",
      model: "genx-premium-strategy",
      selectedProvider: "genx",
      selectedModel: "genx-premium-strategy",
      executedProvider: "genx",
      executedModel: "genx-premium-strategy",
      routeEnforced: true,
      routeMismatchReason: null,
      providerStatus: "ready",
      output: JSON.stringify({ content: "Elite strategy", reviewStatus: "needs_review" }),
    });
    vi.doMock("./_core/ai/orchestrator", () => ({ executeAITaskWithProviderRoute }));
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
    vi.doMock("./_core/ai/orchestrator", () => ({ executeAITaskWithProviderRoute: vi.fn() }));
    vi.doMock("./_core/ai/modelRegistry", () => ({ resolveModelCandidatesForTask: vi.fn().mockResolvedValue([]) }));
    vi.doMock("./_core/ai/providers/providerRegistry", () => ({ isProviderAvailableForTask: vi.fn().mockResolvedValue(false) }));
    const { executeMarketingModelTask } = await import("./modules/marketing/model-execution/marketingModelExecutionService");
    const result = await executeMarketingModelTask({ ...baseInput, mode: "standard", task: "platform_copywriting" });
    expect(["setup_needed", "provider_unavailable"]).toContain(result.status);
    expect(result.generationMode).toBe("fallback");
    expect(result.routeEnforced).toBe(false);
  });

  it("rejects empty provider response and falls back", async () => {
    vi.doMock("./_core/ai/orchestrator", () => ({
      executeAITaskWithProviderRoute: vi.fn().mockResolvedValue({
        status: "completed",
        provider: "qwen",
        model: "qwen-plus-marketing",
        selectedProvider: "qwen",
        selectedModel: "qwen-plus-marketing",
        executedProvider: "qwen",
        executedModel: "qwen-plus-marketing",
        routeEnforced: true,
        routeMismatchReason: null,
        providerStatus: "ready",
        output: "",
      }),
    }));
    vi.doMock("./_core/ai/modelRegistry", () => ({ resolveModelCandidatesForTask: vi.fn().mockResolvedValue([{ provider: "qwen", id: "qwen-plus-marketing" }]) }));
    vi.doMock("./_core/ai/providers/providerRegistry", () => ({ isProviderAvailableForTask: vi.fn().mockResolvedValue(true) }));
    const { executeMarketingModelTask } = await import("./modules/marketing/model-execution/marketingModelExecutionService");
    const result = await executeMarketingModelTask({ ...baseInput, mode: "standard", task: "platform_copywriting" });
    expect(result.generationMode).toBe("fallback");
    expect(result.fallbackReason).toContain("empty");
    expect(result.reviewStatus).toBe("needs_review");
  });

  it("malformed provider JSON triggers fallback", async () => {
    vi.doMock("./_core/ai/orchestrator", () => ({
      executeAITaskWithProviderRoute: vi.fn().mockResolvedValue({
        status: "completed",
        provider: "qwen",
        model: "qwen-plus-marketing",
        selectedProvider: "qwen",
        selectedModel: "qwen-plus-marketing",
        executedProvider: "qwen",
        executedModel: "qwen-plus-marketing",
        routeEnforced: true,
        routeMismatchReason: null,
        providerStatus: "ready",
        output: "{not-json",
      }),
    }));
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

  it("detects selected and executed route mismatch", async () => {
    vi.doMock("./_core/ai/orchestrator", () => ({
      executeAITaskWithProviderRoute: vi.fn().mockResolvedValue({
        status: "completed",
        provider: "genx",
        model: "genx-premium-strategy",
        selectedProvider: "qwen",
        selectedModel: "qwen-plus-marketing",
        executedProvider: "genx",
        executedModel: "genx-premium-strategy",
        routeEnforced: false,
        routeMismatchReason: "Selected provider qwen but executed genx.",
        providerStatus: "ready",
        output: JSON.stringify({ hook: "h", body: "b", cta: "c", angle: "a", hashtags: [], visualPrompt: "v", reviewStatus: "needs_review" }),
      }),
    }));
    vi.doMock("./_core/ai/modelRegistry", () => ({
      resolveModelCandidatesForTask: vi.fn().mockResolvedValue([{ provider: "qwen", id: "qwen-plus-marketing" }]),
    }));
    vi.doMock("./_core/ai/providers/providerRegistry", () => ({
      isProviderAvailableForTask: vi.fn().mockResolvedValue(true),
    }));
    const { executeMarketingModelTask } = await import("./modules/marketing/model-execution/marketingModelExecutionService");
    const result = await executeMarketingModelTask({ ...baseInput, mode: "standard", task: "platform_copywriting" });
    expect(result.routeEnforced).toBe(false);
    expect(result.routeMismatchReason).toContain("Selected provider qwen");
    expect(result.status).toBe("fallback");
  });

  it("export packs include routing metadata summaries", () => {
    expect(read("server/modules/marketing/beast-mode/index.ts")).toContain("summarizeMarketingRouting");
    expect(read("server/modules/marketing/campaign-engine/campaignExportPackBuilder.ts")).toContain("modelRoutingSummary");
    expect(read("server/modules/marketing/model-execution/marketingModelExecutionTelemetry.ts")).toContain("enforcedCount");
    expect(read("server/modules/marketing/model-execution/marketingModelExecutionTelemetry.ts")).toContain("mismatchCount");
    expect(read("server/modules/marketing/model-execution/marketingModelExecutionTelemetry.ts")).toContain("providerUnavailableCount");
  });

  it("stores selected/executed route enforcement metadata in beast mode and campaign metadata types", () => {
    const beast = read("server/modules/marketing/beast-mode/beastModeExecutionService.ts");
    const campaign = read("server/modules/marketing/campaign-engine/campaignDeliverableTypes.ts");
    expect(beast).toContain("selectedProvider");
    expect(beast).toContain("executedProvider");
    expect(beast).toContain("routeEnforced");
    expect(campaign).toContain("selectedProvider");
    expect(campaign).toContain("executedProvider");
    expect(campaign).toContain("routeMismatchReason");
  });

  it("frontend surfaces fallback/provider status without redesign", () => {
    const panel = read("client/src/components/marketing/app/MarketingAppPanels.tsx");
    expect(panel).toContain("Model generated");
    expect(panel).toContain("Fallback generated");
    expect(panel).toContain("Provider unavailable");
    expect(panel).toContain("Needs setup");
  });

  it("PR52C audit doc exists", () => {
    expect(fs.existsSync(path.resolve(root, "docs/audits/PR52C_MODEL_ROUTE_ENFORCEMENT_AUDIT.md"))).toBe(true);
  });

  it("adds route-locked helper and admin diagnostic procedure", () => {
    const orchestrator = read("server/_core/ai/orchestrator.ts");
    const router = read("server/routers.ts");
    expect(orchestrator).toContain("executeAITaskWithProviderRoute");
    expect(router).toContain("testMarketingModelExecutionRoute");
    const start = router.indexOf("testMarketingModelExecutionRoute");
    const end = router.indexOf("inferMarketingRequest", start);
    const diagnosticBlock = router.slice(start, end > start ? end : undefined);
    expect(diagnosticBlock).not.toContain("createMarketingCampaignItemRecord");
    expect(diagnosticBlock).not.toContain("createMarketingBeastModeVariantRecords");
    expect(diagnosticBlock).not.toContain("createMediaAsset");
  });
});
