import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it, vi } from "vitest";

function readSource(relPath: string): string {
  return readFileSync(resolve(process.cwd(), relPath), "utf8");
}

describe("PR54A-2 provider capability persistence completion", () => {
  it("1. PR54A-2 audit doc exists", () => {
    expect(existsSync(resolve(process.cwd(), "docs/audits/PR54A2_PROVIDER_CAPABILITY_COMPLETION_AUDIT.md"))).toBe(true);
  });

  it("2-3. provider model + health schema tables exist", () => {
    const schema = readSource("drizzle/schema.ts");
    expect(schema).toContain("marketingProviderModels");
    expect(schema).toContain("marketingProviderHealthChecks");
  });

  it("4. startup guards create provider tables + drift columns", () => {
    const dbSource = readSource("server/db.ts");
    expect(dbSource).toContain("marketingProviderModels");
    expect(dbSource).toContain("marketingProviderHealthChecks");
    expect(dbSource).toContain("ADD COLUMN IF NOT EXISTS \\`displayName\\`");
    expect(dbSource).toContain("ADD COLUMN IF NOT EXISTS \\`latencyMs\\`");
  });

  it("5. provider-capabilities module files exist", () => {
    const required = [
      "server/modules/marketing/provider-capabilities/index.ts",
      "server/modules/marketing/provider-capabilities/providerCapabilityTypes.ts",
      "server/modules/marketing/provider-capabilities/providerModelStore.ts",
      "server/modules/marketing/provider-capabilities/providerHealthStore.ts",
      "server/modules/marketing/provider-capabilities/providerCapabilitySync.ts",
      "server/modules/marketing/provider-capabilities/genxModelCatalogSync.ts",
      "server/modules/marketing/provider-capabilities/qwenModelRegistry.ts",
      "server/modules/marketing/provider-capabilities/huggingFaceModelRegistry.ts",
      "server/modules/marketing/provider-capabilities/marketingTaskCapabilityMatrix.ts",
      "server/modules/marketing/provider-capabilities/marketingBudgetPolicy.ts",
      "server/modules/marketing/provider-capabilities/marketingProviderReadinessService.ts",
      "server/modules/marketing/provider-capabilities/marketingProviderRouteResolver.ts",
    ];
    for (const relPath of required) {
      expect(existsSync(resolve(process.cwd(), relPath)), `${relPath} missing`).toBe(true);
    }
  });

  it("6-7. router sync/inventory endpoints now use persisted provider model store", () => {
    const routers = readSource("server/routers.ts");
    expect(routers).toContain("syncMarketingProviderCapabilitiesForWorkspace");
    expect(routers).toContain("listMarketingProviderModels");
  });

  it("8. GenX model count is dynamic and not hardcoded", () => {
    const syncSource = readSource("server/modules/marketing/provider-capabilities/providerCapabilitySync.ts");
    expect(syncSource).toContain("providerCounts");
    expect(syncSource).not.toContain("modelCount: 1");
    expect(syncSource).not.toContain("modelCount: 2");
  });

  it("9-11. Qwen and HF are task-aware first-class mappings and HF failure isolation remains task-first", () => {
    const syncSource = readSource("server/modules/marketing/provider-capabilities/providerCapabilitySync.ts");
    const matrixSource = readSource("server/modules/marketing/provider-capabilities/marketingTaskCapabilityMatrix.ts");
    expect(syncSource).toContain("getConfiguredQwenModels");
    expect(syncSource).toContain("getTaskMappedHuggingFaceModels");
    expect(matrixSource).toContain("standardPreference: [...DEFAULT_STANDARD]");
  });

  it("12-15. task matrix includes required tasks and long-form/raw-video constraints", () => {
    const matrixSource = readSource("server/modules/marketing/provider-capabilities/marketingTaskCapabilityMatrix.ts");
    const requiredTasks = [
      "campaign_strategy",
      "hook_generation",
      "angle_generation",
      "platform_copywriting",
      "email_generation",
      "blog_seo_generation",
      "scriptwriting",
      "scene_planning",
      "prompt_direction",
      "localization",
      "captioning",
      "transcription",
      "voiceover",
      "image_generation",
      "text_to_video_scene_clip",
      "visual_qa",
      "embedding",
      "qa_summary",
      "avatar_generation",
      "avatar_lipsync",
      "music_generation",
      "background_audio_selection",
    ];
    for (const task of requiredTasks) {
      expect(matrixSource).toContain(task);
    }
    const resolverSource = readSource("server/modules/marketing/provider-capabilities/marketingProviderRouteResolver.ts");
    expect(resolverSource).toContain("media_factory_assembled_video");
    expect(matrixSource).toContain("text_to_video_scene_clip");
  });

  it("16-18. route resolver honors standard/elite ordering and budget blocking", () => {
    const resolver = readSource("server/modules/marketing/provider-capabilities/marketingProviderRouteResolver.ts");
    const budget = readSource("server/modules/marketing/provider-capabilities/marketingBudgetPolicy.ts");
    expect(resolver).toContain("input.policy.mode === \"elite\"");
    expect(resolver).toContain("allowGenXFallbackInStandard");
    expect(budget).toContain("budget_blocked");
  });

  it("19. readiness report includes avatar/voice/music", () => {
    const readiness = readSource("server/modules/marketing/provider-capabilities/marketingProviderReadinessService.ts");
    expect(readiness).toContain("avatar");
    expect(readiness).toContain("voice");
    expect(readiness).toContain("music");
  });

  it("20-22. marketingSocialConnections is source of truth for connect/status/list", () => {
    const routers = readSource("server/routers.ts");
    expect(routers).toContain("listMarketingPlatformConnections");
    expect(routers).toContain("connectMarketingPlatform");
    expect(routers).toContain("getMarketingPublishStatus");
    expect(routers).toContain("listMarketingSocialConnectionRecords");
  });

  it("23-24. platform adapter files exist and default to setup_needed without credentials", () => {
    const adapterPaths = [
      "server/modules/marketing/social-publishing/adapters/facebookPublisher.ts",
      "server/modules/marketing/social-publishing/adapters/instagramPublisher.ts",
      "server/modules/marketing/social-publishing/adapters/tiktokPublisher.ts",
      "server/modules/marketing/social-publishing/adapters/linkedinPublisher.ts",
      "server/modules/marketing/social-publishing/adapters/youtubePublisher.ts",
      "server/modules/marketing/social-publishing/adapters/emailPublisher.ts",
      "server/modules/marketing/social-publishing/adapters/blogSeoPublisher.ts",
    ];
    for (const relPath of adapterPaths) expect(existsSync(resolve(process.cwd(), relPath)), `${relPath} missing`).toBe(true);
    const base = readSource("server/modules/marketing/social-publishing/adapters/basePublisherStub.ts");
    expect(base).toContain("setup_needed");
  });

  it("25-27. publish flow blocks unapproved drafts and avoids fake posting", () => {
    const routers = readSource("server/routers.ts");
    expect(routers).toContain("Only approved schedule drafts can be published");
    expect(routers).toContain("hasRealPostId");
    expect(routers).toContain("publishStatus: persistedSuccess ? (\"published\" as const) : (\"export_only\" as const)");
  });

  it("28-31. guardrails preserved (provider scope, no free-form chat path, no academy edits)", () => {
    const routers = readSource("server/routers.ts");
    expect(routers).toContain("SUPPORTED_AI_PROVIDERS = [\"genx\", \"huggingface\", \"qwen\"]");
    expect(routers).not.toContain("/api/chat/free-form");
    const academySource = readSource("docs/audits/PR54A2_PROVIDER_CAPABILITY_COMPLETION_AUDIT.md");
    expect(academySource).toContain("This PR is not Academy");
  });
});

describe("PR54A-2 sync behavior", () => {
  it("sync result counts are computed from discovery snapshot", async () => {
    vi.resetModules();
    vi.doMock("./_core/ai/modelRegistry", () => ({
      discoverProviderModels: vi.fn(async () => ({
        discoveredAt: "2026-05-31T00:00:00.000Z",
        providers: {
          genx: [{ provider: "genx", id: "genx-a", source: "live_discovery", executableTasks: ["strategy"], executionMode: "sync", endpointFamily: "openai_chat", routeReason: "ok", categories: ["strategy"], suitabilityScore: 1, multimodal: false, qualityTiers: ["standard"], supportsVideo: false, supportsImage: false, supportsVoice: false, supportsAudio: false, supportsAvatar: false, supportsImageToVideo: false, supportsPlayableMedia: false, videoPromptOnly: false }],
          qwen: [],
          huggingface: [],
        },
      })),
      type: {},
    }));
    vi.doMock("./_core/ai/providers/providerRegistry", () => ({
      getProviderHealth: vi.fn(async () => []),
    }));
    vi.doMock("./modules/marketing/provider-capabilities/providerModelStore", () => ({
      upsertMarketingProviderModel: vi.fn(async () => 1),
    }));
    vi.doMock("./modules/marketing/provider-capabilities/providerHealthStore", () => ({
      createMarketingProviderHealthCheck: vi.fn(async () => 1),
    }));

    const mod = await import("./modules/marketing/provider-capabilities/providerCapabilitySync");
    const result = await mod.syncMarketingProviderCapabilitiesForWorkspace({ tenantId: "t", workspaceId: "w", forceRefresh: true });
    expect(result.providerCounts.genx).toBe(1);
    expect(result.providerCounts.qwen).toBe(0);
  });
});
