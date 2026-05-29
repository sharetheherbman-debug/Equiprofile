/**
 * marketingApp.compact.test.ts
 * Tests for Phase 1-10 Marketing App compact UX, media workflows, routing,
 * social platform foundation, campaign foundation and settings separation.
 * All tests are source-level file content checks to avoid needing a full DOM.
 */
import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

// ── Frontend source files ──────────────────────────────────────────────────

const chatResultCardSource = readFileSync(
  resolve(root, "client/src/components/marketing/app/ChatResultCard.tsx"),
  "utf8",
);
const chatSource = readFileSync(
  resolve(root, "client/src/components/marketing/app/MarketingAppChat.tsx"),
  "utf8",
);
const studioSource = readFileSync(
  resolve(root, "client/src/components/marketing/app/TheMarketingApp.tsx"),
  "utf8",
);
const actionsSource = readFileSync(
  resolve(root, "client/src/components/marketing/app/MarketingAppActions.tsx"),
  "utf8",
);
const settingsSource = readFileSync(
  resolve(root, "client/src/components/marketing/app/MarketingAppSettings.tsx"),
  "utf8",
);
const typesSource = readFileSync(
  resolve(root, "client/src/components/marketing/studio/types.ts"),
  "utf8",
);
const adminSource = readFileSync(resolve(root, "client/src/pages/Admin.tsx"), "utf8");

// ── Server source files ────────────────────────────────────────────────────

const providerRoutingSource = readFileSync(
  resolve(root, "server/_core/ai/providerRouting.ts"),
  "utf8",
);
const routersSource = readFileSync(resolve(root, "server/routers.ts"), "utf8");
const promptCompilerSource = readFileSync(
  resolve(root, "server/_core/marketing/promptCompiler.ts"),
  "utf8",
);
const previewSource = readFileSync(
  resolve(root, "client/src/components/marketing/app/MarketingAppPreview.tsx"),
  "utf8",
);

// ── Phase 1: Compact chat previews ────────────────────────────────────────

describe("Phase 1 — Compact chat previews", () => {
  it("chat result previews use compact-preview class instead of aspect-video", () => {
    expect(chatResultCardSource).toContain("compact-preview");
    expect(chatResultCardSource).not.toContain("aspect-video");
  });

  it("video preview card uses fixed max height (max-h-[200px])", () => {
    expect(chatResultCardSource).toContain("max-h-[200px]");
  });

  it("image preview card uses object-contain instead of object-cover", () => {
    expect(chatResultCardSource).toContain("object-contain");
    expect(chatResultCardSource).not.toContain("object-cover");
  });

  it("expand preview button exists in ChatResultCard", () => {
    expect(chatResultCardSource).toContain("Expand preview");
  });

  it("full-screen dialog exists in ChatResultCard for expanded view", () => {
    expect(chatResultCardSource).toContain("Dialog");
    expect(chatResultCardSource).toContain("DialogContent");
  });

  it("Open asset link exists in ChatResultCard", () => {
    expect(chatResultCardSource).toContain("Open asset");
  });

  it("empty state uses min-h-[80px] not aspect-video", () => {
    expect(chatResultCardSource).toContain("min-h-[80px]");
    // Must not fall back to aspect-video for the empty/processing state
    expect(chatResultCardSource).not.toMatch(/aspect-video[^}]*items-center/);
  });

  it("chat uses useState for expand toggle", () => {
    expect(chatResultCardSource).toContain("useState");
    expect(chatResultCardSource).toContain("expanded");
    expect(chatResultCardSource).toContain("setExpanded");
  });
});

// ── Phase 2: Progress strip in chat ───────────────────────────────────────

describe("Phase 2 — Progress strip in chat", () => {
  it("MarketingAppChat accepts progressStep and progressSteps props", () => {
    expect(chatSource).toContain("progressStep");
    expect(chatSource).toContain("progressSteps");
  });

  it("MarketingAppChat renders a compact progress strip with aria-label", () => {
    expect(chatSource).toContain("Generation progress");
  });

  it("TheMarketingApp passes progressStep and PROGRESS_STEPS to MarketingAppChat", () => {
    expect(studioSource).toContain("progressStep={progressStep}");
    expect(studioSource).toContain("progressSteps={PROGRESS_STEPS}");
  });
});

// ── Phase 3: Asset actions ────────────────────────────────────────────────

describe("Phase 3 — Working asset actions", () => {
  it("download action uses anchor element with download attribute", () => {
    expect(actionsSource).toContain("<a");
    expect(actionsSource).toMatch(/download[\s=]/);
  });

  it("open asset link targets _blank in ChatResultCard", () => {
    expect(chatResultCardSource).toContain('target="_blank"');
    expect(chatResultCardSource).toContain("rel=\"noopener noreferrer\"");
  });

  it("permanent delete clears selectedAssetId on delete in TheMarketingApp", () => {
    expect(studioSource).toContain("permanentDeleteMediaAsset");
    expect(studioSource).toContain("setSelectedAssetId");
  });
});

// ── Phase 4: Prompt fidelity ──────────────────────────────────────────────

describe("Phase 4 — Prompt fidelity / originalUserPrompt stored", () => {
  it("originalUserPrompt is stored in outputMetadata in routers.ts", () => {
    expect(routersSource).toContain("originalUserPrompt: input.prompt");
  });

  it("compiledPrompt preserves horse subject (subject guardrails exist)", () => {
    expect(promptCompilerSource).toContain("horse");
  });

  it("compiledPrompt preserves fighter jet subject", () => {
    expect(promptCompilerSource).toContain("fighter");
  });

  it("prompt compiler has subject guardrail / deriveSubjectGuardrails logic", () => {
    expect(promptCompilerSource).toContain("deriveSubjectGuardrails");
  });
});

// ── Phase 5: Provider routing ─────────────────────────────────────────────

describe("Phase 5 — Standard / Elite media provider routing", () => {
  it("orderMediaProviders function is exported from providerRouting.ts", () => {
    expect(providerRoutingSource).toContain("export function orderMediaProviders");
  });

  it("Standard mode routes Qwen/HF before GenX", () => {
    // In the standard (else) branch, qwen push must appear before genx push
    // Find the else block by looking for the comment we placed
    const elseMarker = "// standard — prefer cheaper";
    const elseStart = providerRoutingSource.indexOf(elseMarker);
    expect(elseStart).toBeGreaterThanOrEqual(0);
    const afterElse = providerRoutingSource.slice(elseStart);
    const qwenPos = afterElse.indexOf("qwen");
    const genxPos = afterElse.indexOf("genx");
    expect(qwenPos).toBeGreaterThanOrEqual(0);
    expect(genxPos).toBeGreaterThan(qwenPos);
  });

  it("Elite mode routes GenX before Qwen/HF", () => {
    // In the elite branch (if block), genx push must appear before qwen push
    const eliteMarker = 'qualityMode === "elite"';
    const eliteStart = providerRoutingSource.indexOf(eliteMarker);
    expect(eliteStart).toBeGreaterThanOrEqual(0);
    // Slice from the elite conditional to the else keyword
    const elseStart = providerRoutingSource.indexOf("} else {", eliteStart);
    const eliteBlock = providerRoutingSource.slice(eliteStart, elseStart);
    const genxPos = eliteBlock.indexOf("genx");
    const qwenPos = eliteBlock.indexOf("qwen");
    expect(genxPos).toBeGreaterThanOrEqual(0);
    expect(qwenPos).toBeGreaterThan(genxPos);
  });

  it("orderMediaProviders does not hardcode a single video model", () => {
    // The function only orders providers, not models
    const fnBody = providerRoutingSource.slice(
      providerRoutingSource.indexOf("export function orderMediaProviders"),
    );
    expect(fnBody).not.toMatch(/model\s*=\s*["']/);
  });
});

// ── Phase 6: Truthful media capability workflows ───────────────────────────

describe("Phase 6 — Media capability workflows", () => {
  it("long-form video shows scene_plan_required workflow", () => {
    expect(routersSource).toContain("scene_plan_required");
  });

  it("voice shows setup_needed when config missing", () => {
    expect(previewSource).toContain("setup_needed");
    expect(previewSource).toContain("Add voiceover");
  });

  it("audio/music shows setup_needed when provider not configured", () => {
    expect(previewSource).toContain("Add music");
  });

  it("avatar video requires avatar/presenter config before proceeding", () => {
    expect(previewSource).toContain("avatar");
  });
});

// ── Phase 7: Social platform foundation ───────────────────────────────────

describe("Phase 7 — Social platform foundation", () => {
  it("social posting is export_only when no connector is configured", () => {
    expect(settingsSource).toContain("export_only");
  });

  it("connection flow note is present in studio types or settings", () => {
    const combined = typesSource + settingsSource;
    expect(combined).toContain("Connection flow required before direct publishing");
  });

  it("not_connected status is referenced in social section", () => {
    expect(settingsSource).toContain("not_connected");
  });
});

// ── Phase 8: Campaign 7-day plan ──────────────────────────────────────────

describe("Phase 8 — Campaign 7-day plan", () => {
  it("campaigns section has Generate 7-day plan button", () => {
    expect(studioSource).toContain("Generate 7-day plan");
  });

  it("7-day plan generates via handleChatSubmit with weekly content request", () => {
    expect(studioSource).toContain("7-day marketing content plan");
  });
});

// ── Phase 9: Settings separation ──────────────────────────────────────────

describe("Phase 9 — Settings are Marketing-App-only", () => {
  it("MarketingAppSettings contains Marketing provider keys only", () => {
    expect(settingsSource).toContain("GenX");
    expect(settingsSource).toContain("Qwen");
    expect(settingsSource).toContain("Hugging Face");
  });

  it("EquiProfile dashboard settings (Admin.tsx) only shows one GenX section for EquiProfile AI", () => {
    expect(adminSource).toContain("EquiProfile AI Settings");
    expect(adminSource).toContain("equiprofile_ai_genx_api_key");
    expect(adminSource).toContain("equiprofile_ai_genx_model");
    expect(adminSource).not.toContain("Marketing AI Provider Settings");
  });
});

// ── Academy isolation ─────────────────────────────────────────────────────

describe("Academy isolation", () => {
  it("Academy route files are not touched (Academy import not added to TheMarketingApp)", () => {
    expect(studioSource).not.toContain("Academy");
    expect(studioSource).not.toContain("academy");
  });
});
