/**
 * PR52 Visual QA / Relevance Validator + Beast Mode Execution Service Tests
 */
import { describe, it, expect, vi, beforeAll } from "vitest";
import * as fs from "fs";
import * as path from "path";

// ============================================================
// Phase 1: Module structure existence
// ============================================================
describe("PR52 Phase 1 — Visual QA module files exist", () => {
  const BASE = path.resolve(__dirname, "modules/marketing/visual-qa");
  const FILES = [
    "index.ts",
    "visualQaTypes.ts",
    "visualQaFrameExtractor.ts",
    "visualQaRelevanceRules.ts",
    "visualQaScoring.ts",
    "visualQaStore.ts",
    "visualQaService.ts",
    "visualQaVisionProvider.ts",
  ];
  for (const file of FILES) {
    it(`${file} exists`, () => {
      expect(fs.existsSync(path.join(BASE, file))).toBe(true);
    });
  }
});

// ============================================================
// Phase 2: Schema + startup migration
// ============================================================
describe("PR52 Phase 2 — marketingVisualQaRecords schema", () => {
  it("schema.ts contains marketingVisualQaRecords table definition", () => {
    const schemaPath = path.resolve(__dirname, "../drizzle/schema.ts");
    const content = fs.readFileSync(schemaPath, "utf-8");
    expect(content).toContain("marketingVisualQaRecords");
    expect(content).toContain("targetType");
    expect(content).toContain("expectedSubject");
    expect(content).toContain("frameUrlsJson");
    expect(content).toContain("detectedLabelsJson");
    expect(content).toContain("issuesJson");
    expect(content).toContain("scoreJson");
    expect(content).toContain("reviewerUserId");
    expect(content).toContain("reviewedAt");
  });

  it("db.ts startup migration creates marketing_visual_qa_records table", () => {
    const dbPath = path.resolve(__dirname, "db.ts");
    const content = fs.readFileSync(dbPath, "utf-8");
    expect(content).toContain("marketingVisualQaRecords");
    expect(content).toContain("CREATE TABLE IF NOT EXISTS");
  });

  it("db.ts imports marketingVisualQaRecords from schema", () => {
    const dbPath = path.resolve(__dirname, "db.ts");
    const content = fs.readFileSync(dbPath, "utf-8");
    expect(content).toContain("marketingVisualQaRecords");
  });
});

// ============================================================
// Phase 3: Frame extractor safety
// ============================================================
describe("PR52 Phase 3 — Frame extractor", () => {
  it("visualQaFrameExtractor.ts uses ffmpeg-static", () => {
    const extractorPath = path.resolve(__dirname, "modules/marketing/visual-qa/visualQaFrameExtractor.ts");
    const content = fs.readFileSync(extractorPath, "utf-8");
    expect(content).toContain("ffmpeg-static");
  });

  it("frame extractor returns setup_needed on missing file path", async () => {
    const { extractMarketingVideoFrames } = await import("./modules/marketing/visual-qa/visualQaFrameExtractor");
    const result = await extractMarketingVideoFrames({ localVideoPath: null, publicVideoUrl: null });
    // setupNeeded or needsManualReview must be true; never silently passes
    expect(result.success).toBe(false);
    expect(result.frameUrls).toHaveLength(0);
    expect(result.setupNeeded || result.needsManualReview).toBe(true);
  });

  it("frame extractor returns setup_needed/needs_review on nonexistent file", async () => {
    const { extractMarketingVideoFrames } = await import("./modules/marketing/visual-qa/visualQaFrameExtractor");
    const result = await extractMarketingVideoFrames({ localVideoPath: "/tmp/does_not_exist_pr52.mp4", publicVideoUrl: null });
    expect(result.success).toBe(false);
    expect(result.frameUrls).toHaveLength(0);
    expect(result.needsManualReview).toBe(true);
  });

  it("frame extractor returns needs_review when only remote publicUrl given", async () => {
    const { extractMarketingVideoFrames } = await import("./modules/marketing/visual-qa/visualQaFrameExtractor");
    const result = await extractMarketingVideoFrames({ localVideoPath: null, publicVideoUrl: "https://example.com/video.mp4" });
    expect(result.success).toBe(false);
    expect(result.needsManualReview).toBe(true);
    expect(result.reason).toContain("manual");
  });
});

// ============================================================
// Phase 4: Rule-based relevance validation
// ============================================================
describe("PR52 Phase 4 — Relevance rules", () => {
  it("equine rules apply when hostAppId is equiprofile", async () => {
    const { shouldApplyEquineVisualRules } = await import("./modules/marketing/visual-qa/visualQaRelevanceRules");
    expect(shouldApplyEquineVisualRules({ hostAppId: "equiprofile" })).toBe(true);
  });

  it("equine rules apply when expectedSubject contains horse", async () => {
    const { shouldApplyEquineVisualRules } = await import("./modules/marketing/visual-qa/visualQaRelevanceRules");
    expect(shouldApplyEquineVisualRules({ hostAppId: "other", expectedSubject: "horse riding lessons" })).toBe(true);
  });

  it("equine rules do not apply for generic non-equine app", async () => {
    const { shouldApplyEquineVisualRules } = await import("./modules/marketing/visual-qa/visualQaRelevanceRules");
    expect(shouldApplyEquineVisualRules({ hostAppId: "generic_bakery_app" })).toBe(false);
  });

  it("laptop/office labels fail equine visual QA", async () => {
    const { runEquineVisualRelevanceRules } = await import("./modules/marketing/visual-qa/visualQaRelevanceRules");
    const issues = runEquineVisualRelevanceRules({
      detectedLabels: ["laptop", "office", "city"],
      sourceMetadata: {},
    });
    expect(issues.length).toBeGreaterThan(0);
    expect(issues.some((i) => i.severity === "error")).toBe(true);
  });

  it("horse/stable labels pass equine visual QA", async () => {
    const { runEquineVisualRelevanceRules } = await import("./modules/marketing/visual-qa/visualQaRelevanceRules");
    const issues = runEquineVisualRelevanceRules({
      detectedLabels: ["horse", "stable", "rider"],
      sourceMetadata: {},
    });
    // No forbidden labels and equine term present → no issues
    expect(issues.filter((i) => i.severity === "error").length).toBe(0);
  });

  it("missing visual evidence becomes needs_review, not passed", async () => {
    const { runVisualRelevanceRules } = await import("./modules/marketing/visual-qa/visualQaRelevanceRules");
    const issues = runVisualRelevanceRules({
      hostAppId: "equiprofile",
      detectedLabels: [],
      sourceMetadata: {},
    });
    // Empty labels for equine app means missing equine term → error issue
    expect(issues.some((i) => i.code === "equine_subject_missing")).toBe(true);
  });

  it("off-topic metadata (gibberish_text) fails equine visual QA", async () => {
    const { runEquineVisualRelevanceRules } = await import("./modules/marketing/visual-qa/visualQaRelevanceRules");
    const issues = runEquineVisualRelevanceRules({
      detectedLabels: ["gibberish text", "dashboard screenshot"],
      sourceMetadata: {},
    });
    expect(issues.length).toBeGreaterThan(0);
  });
});

// ============================================================
// Phase 5: AI vision provider hook
// ============================================================
describe("PR52 Phase 5 — Vision provider defaults to setup_needed", () => {
  it("default vision provider canAnalyze is false", async () => {
    const { defaultVisualQaVisionProvider } = await import("./modules/marketing/visual-qa/visualQaVisionProvider");
    expect(defaultVisualQaVisionProvider.canAnalyze).toBe(false);
  });

  it("default vision provider reason is setup_needed", async () => {
    const { defaultVisualQaVisionProvider } = await import("./modules/marketing/visual-qa/visualQaVisionProvider");
    expect(defaultVisualQaVisionProvider.reason).toContain("setup_needed");
  });

  it("analyzeImage on default provider is not available (setup_needed)", async () => {
    const { defaultVisualQaVisionProvider } = await import("./modules/marketing/visual-qa/visualQaVisionProvider");
    // Default provider has canAnalyze=false and no analyzeImage method — no fake detections
    expect(defaultVisualQaVisionProvider.canAnalyze).toBe(false);
    expect(defaultVisualQaVisionProvider.analyzeImage).toBeUndefined();
  });
});

// ============================================================
// Phase 6: Backend procedures
// ============================================================
describe("PR52 Phase 6 — Backend procedures in routers.ts", () => {
  const routersPath = path.resolve(__dirname, "routers.ts");
  let routersContent: string;
  beforeAll(() => {
    routersContent = fs.readFileSync(routersPath, "utf-8");
  });

  it("routers.ts contains runMarketingVisualQa", () => {
    expect(routersContent).toContain("runMarketingVisualQa");
  });

  it("routers.ts contains getMarketingVisualQa", () => {
    expect(routersContent).toContain("getMarketingVisualQa");
  });

  it("routers.ts contains listMarketingVisualQaRecords", () => {
    expect(routersContent).toContain("listMarketingVisualQaRecords");
  });

  it("routers.ts contains markVisualQaPassed", () => {
    expect(routersContent).toContain("markVisualQaPassed");
  });

  it("routers.ts contains markVisualQaFailed", () => {
    expect(routersContent).toContain("markVisualQaFailed");
  });

  it("routers.ts contains requestVisualQaChanges", () => {
    expect(routersContent).toContain("requestVisualQaChanges");
  });

  it("routers.ts contains attachVisualQaReviewNotes", () => {
    expect(routersContent).toContain("attachVisualQaReviewNotes");
  });
});

// ============================================================
// Phase 7: Approval gate integration
// ============================================================
describe("PR52 Phase 7 — Approval gate integration", () => {
  const routersPath = path.resolve(__dirname, "routers.ts");
  let routersContent: string;
  beforeAll(() => {
    routersContent = fs.readFileSync(routersPath, "utf-8");
  });

  it("approveMarketingOutput checks visual QA for video targets", () => {
    expect(routersContent).toContain("isVideoTarget");
    expect(routersContent).toContain("visual QA");
  });

  it("approveBeastModeVariant checks visual QA for video variants", () => {
    expect(routersContent).toContain("video Beast Mode variant requires visual QA");
  });

  it("approveBeastModeVariant has manualOverride field", () => {
    expect(routersContent).toContain("manualOverride");
  });
});

// ============================================================
// Phase 8: Frontend wiring
// ============================================================
describe("PR52 Phase 8 — Frontend wiring", () => {
  it("ExportStep.tsx contains visual QA section", () => {
    const exportPath = path.resolve(__dirname, "../client/src/components/marketing/app/studio/ExportStep.tsx");
    const content = fs.readFileSync(exportPath, "utf-8");
    expect(content).toContain("visual-qa-section");
    expect(content).toContain("run-visual-qa-btn");
    expect(content).toContain("visual-qa-thumbnail");
  });

  it("ExportStep.tsx has onRunVisualQa, onMarkVisualQaPassed, onMarkVisualQaFailed props", () => {
    const exportPath = path.resolve(__dirname, "../client/src/components/marketing/app/studio/ExportStep.tsx");
    const content = fs.readFileSync(exportPath, "utf-8");
    expect(content).toContain("onRunVisualQa");
    expect(content).toContain("onMarkVisualQaPassed");
    expect(content).toContain("onMarkVisualQaFailed");
    expect(content).toContain("onRequestVisualQaChanges");
  });

  it("MarketingAppPanels.tsx has VisualQaBadge component", () => {
    const panelsPath = path.resolve(__dirname, "../client/src/components/marketing/app/MarketingAppPanels.tsx");
    const content = fs.readFileSync(panelsPath, "utf-8");
    expect(content).toContain("VisualQaBadge");
    expect(content).toContain("visual-qa-badge");
  });

  it("MarketingAppPanels.tsx shows visualQaStatus on campaign items", () => {
    const panelsPath = path.resolve(__dirname, "../client/src/components/marketing/app/MarketingAppPanels.tsx");
    const content = fs.readFileSync(panelsPath, "utf-8");
    expect(content).toContain("item.visualQaStatus");
  });

  it("MarketingAppPanels.tsx shows visualQaStatus on beast mode variants", () => {
    const panelsPath = path.resolve(__dirname, "../client/src/components/marketing/app/MarketingAppPanels.tsx");
    const content = fs.readFileSync(panelsPath, "utf-8");
    expect(content).toContain("variant.visualQaStatus");
  });
});

// ============================================================
// Phase 9 (Phase 10): Beast Mode Execution Service
// ============================================================
describe("PR52 Phase 10 — Beast Mode Execution Service", () => {
  it("beastModeExecutionService.ts exists", () => {
    const execPath = path.resolve(__dirname, "modules/marketing/beast-mode/beastModeExecutionService.ts");
    expect(fs.existsSync(execPath)).toBe(true);
  });

  it("executeBeastModeTask returns model generationMode when route is ready", async () => {
    const { executeBeastModeTask } = await import("./modules/marketing/beast-mode/beastModeExecutionService");
    const mockBrief = {
      tenantId: "global",
      workspaceId: "default",
      hostAppId: "equiprofile",
      campaignId: null,
      brandKitId: null,
      campaignName: "Test Campaign",
      goal: "Generate leads",
      audience: "Horse owners",
      offer: "Free trial",
      primaryCta: "Sign up today",
      mode: "standard" as const,
      requestedVariantCount: 1,
      requestedPlatforms: ["Facebook" as const],
      requestedLanguages: ["English" as const],
      brandSummary: {
        brandName: "TestBrand",
        domain: "testbrand.com",
        toneOfVoice: "Friendly",
        primaryColor: "#000000",
        secondaryColor: "#ffffff",
        logoUrl: null,
        overlayTemplate: "lower_third" as const,
      },
      productNames: [],
      generatedAt: new Date().toISOString(),
    };
    const result = await executeBeastModeTask({
      task: "copywriting",
      mode: "standard",
      brief: mockBrief,
      platform: "Facebook",
      contentType: "facebook_ad",
      language: "English",
      variantIndex: 0,
      providerHealthRegistry: [
        { provider: "qwen", available: true, configured: true },
        { provider: "huggingface", available: true, configured: true },
        { provider: "genx", available: false, configured: false },
      ],
    });
    expect(result.generationMode).toBe("model");
    expect(result.status).toBe("needs_review");
    expect(result.provider).toBeTruthy();
    expect(result.copy.hook).toBeTruthy();
    expect(result.copy.body).toBeTruthy();
    expect(result.copy.cta).toBeTruthy();
  });

  it("executeBeastModeTask returns fallback when provider is unavailable", async () => {
    const { executeBeastModeTask } = await import("./modules/marketing/beast-mode/beastModeExecutionService");
    const mockBrief = {
      tenantId: "global",
      workspaceId: "default",
      hostAppId: "equiprofile",
      campaignId: null,
      brandKitId: null,
      campaignName: "Test",
      goal: "Test",
      audience: "Test",
      offer: "Test",
      primaryCta: "Test",
      mode: "standard" as const,
      requestedVariantCount: 1,
      requestedPlatforms: ["Facebook" as const],
      requestedLanguages: ["English" as const],
      brandSummary: {
        brandName: "Brand",
        domain: "brand.com",
        toneOfVoice: "Neutral",
        primaryColor: "#000",
        secondaryColor: "#fff",
        logoUrl: null,
        overlayTemplate: "lower_third" as const,
      },
      productNames: [],
      generatedAt: new Date().toISOString(),
    };
    const result = await executeBeastModeTask({
      task: "copywriting",
      mode: "standard",
      brief: mockBrief,
      platform: "Facebook",
      contentType: "facebook_ad",
      language: "English",
      variantIndex: 0,
      providerHealthRegistry: [
        { provider: "qwen", available: false, configured: false },
        { provider: "huggingface", available: false, configured: false },
        { provider: "genx", available: false, configured: false },
      ],
    });
    expect(result.generationMode).toBe("fallback");
    expect(["setup_needed", "provider_unavailable"]).toContain(result.status);
    expect(result.provider).toBeNull();
    expect(result.fallbackReason).toBeTruthy();
  });

  it("Elite mode prefers genx when available", async () => {
    const { executeBeastModeTask } = await import("./modules/marketing/beast-mode/beastModeExecutionService");
    const mockBrief = {
      tenantId: "global",
      workspaceId: "default",
      hostAppId: "equiprofile",
      campaignId: null,
      brandKitId: null,
      campaignName: "Elite Test",
      goal: "Premium",
      audience: "Premium",
      offer: "Premium",
      primaryCta: "Start",
      mode: "elite" as const,
      requestedVariantCount: 1,
      requestedPlatforms: ["Facebook" as const],
      requestedLanguages: ["English" as const],
      brandSummary: {
        brandName: "Brand",
        domain: "brand.com",
        toneOfVoice: "Premium",
        primaryColor: "#000",
        secondaryColor: "#fff",
        logoUrl: null,
        overlayTemplate: "lower_third" as const,
      },
      productNames: [],
      generatedAt: new Date().toISOString(),
    };
    const result = await executeBeastModeTask({
      task: "strategy",
      mode: "elite",
      brief: mockBrief,
      platform: "Facebook",
      contentType: "facebook_ad",
      language: "English",
      variantIndex: 0,
      providerHealthRegistry: [
        { provider: "qwen", available: true, configured: true },
        { provider: "huggingface", available: true, configured: true },
        { provider: "genx", available: true, configured: true },
      ],
    });
    expect(result.generationMode).toBe("model");
    expect(result.provider).toBe("genx");
  });

  it("generateBeastModeVariants is async", async () => {
    const { generateBeastModeVariants } = await import("./modules/marketing/beast-mode");
    const brief = {
      tenantId: "global",
      workspaceId: "default",
      hostAppId: "equiprofile",
      campaignId: 1,
      brandKitId: null,
      campaignName: "Test",
      goal: "leads",
      audience: "horse owners",
      offer: "Free trial",
      primaryCta: "Sign up",
      mode: "standard" as const,
      requestedVariantCount: 2,
      requestedPlatforms: ["Facebook" as const],
      requestedLanguages: ["English" as const],
      brandSummary: {
        brandName: "TestBrand",
        domain: "testbrand.com",
        toneOfVoice: "Friendly",
        primaryColor: "#000000",
        secondaryColor: "#ffffff",
        logoUrl: null,
        overlayTemplate: "lower_third" as const,
      },
      productNames: ["TestBrand"],
      generatedAt: new Date().toISOString(),
    };
    const result = generateBeastModeVariants(brief);
    expect(result).toBeInstanceOf(Promise);
    const resolved = await result;
    expect(resolved.variants).toHaveLength(2);
    expect(resolved.variants[0].metadata.generationMode).toBeDefined();
  });

  it("multilingual localization stores localizationStatus", async () => {
    const { localizeBeastModeVariant } = await import("./modules/marketing/beast-mode/beastModeMultilingualService");
    const result = localizeBeastModeVariant({
      variant: {
        platform: "Facebook",
        contentType: "facebook_ad",
        language: "English",
        angle: "test",
        hook: "Hook text",
        body: "Body text",
        cta: "Sign up today",
        hashtags: [],
        visualPrompt: "Horses in a field",
        studioPlan: null,
        metadata: {},
      },
      language: "French",
      protectedTerms: ["Brand", "brand.com"],
    });
    expect(result.language).toBe("French");
    expect(result.metadata.localizationStatus).toBeDefined();
    expect(["needs_review", "fallback_needs_review"]).toContain(result.metadata.localizationStatus);
  });

  it("protected terms are preserved in localization", async () => {
    const { localizeBeastModeVariant } = await import("./modules/marketing/beast-mode/beastModeMultilingualService");
    const result = localizeBeastModeVariant({
      variant: {
        platform: "Facebook",
        contentType: "facebook_ad",
        language: "English",
        angle: "test",
        hook: "Visit TestBrand today",
        body: "testbrand.com has great products",
        cta: "Get started",
        hashtags: [],
        visualPrompt: "",
        studioPlan: null,
        metadata: {},
      },
      language: "French",
      protectedTerms: ["TestBrand", "testbrand.com"],
    });
    expect(result.hook).toContain("TestBrand");
    expect(result.body).toContain("testbrand.com");
  });
});

// ============================================================
// Negative / invariant guards
// ============================================================
describe("PR52 — Negative guards (no scope creep)", () => {
  it("no createMarketingDraft usage in visual-qa module", () => {
    const BASE = path.resolve(__dirname, "modules/marketing/visual-qa");
    const files = fs.readdirSync(BASE);
    for (const file of files) {
      const content = fs.readFileSync(path.join(BASE, file), "utf-8");
      expect(content).not.toContain("createMarketingDraft");
    }
  });

  it("no createMediaJob usage in visual-qa module", () => {
    const BASE = path.resolve(__dirname, "modules/marketing/visual-qa");
    const files = fs.readdirSync(BASE);
    for (const file of files) {
      const content = fs.readFileSync(path.join(BASE, file), "utf-8");
      expect(content).not.toContain("createMediaJob");
    }
  });

  it("no createMarketingDraft usage in beastModeExecutionService", () => {
    const execPath = path.resolve(__dirname, "modules/marketing/beast-mode/beastModeExecutionService.ts");
    const content = fs.readFileSync(execPath, "utf-8");
    expect(content).not.toContain("createMarketingDraft");
  });

  it("no createMediaJob usage in beastModeExecutionService", () => {
    const execPath = path.resolve(__dirname, "modules/marketing/beast-mode/beastModeExecutionService.ts");
    const content = fs.readFileSync(execPath, "utf-8");
    expect(content).not.toContain("createMediaJob");
  });

  it("no free-form chat reintroduced in visual-qa module", () => {
    const BASE = path.resolve(__dirname, "modules/marketing/visual-qa");
    const files = fs.readdirSync(BASE);
    for (const file of files) {
      const content = fs.readFileSync(path.join(BASE, file), "utf-8");
      expect(content).not.toContain("MarketingAppChat");
    }
  });

  it("no Academy changes in visual-qa module", () => {
    const BASE = path.resolve(__dirname, "modules/marketing/visual-qa");
    const files = fs.readdirSync(BASE);
    for (const file of files) {
      const content = fs.readFileSync(path.join(BASE, file), "utf-8");
      expect(content).not.toContain("academy");
    }
  });

  it("ExportStep.tsx does not contain social OAuth", () => {
    const exportPath = path.resolve(__dirname, "../client/src/components/marketing/app/studio/ExportStep.tsx");
    const content = fs.readFileSync(exportPath, "utf-8");
    expect(content).not.toContain("oauth");
    expect(content).not.toContain("OAuth");
  });
});
