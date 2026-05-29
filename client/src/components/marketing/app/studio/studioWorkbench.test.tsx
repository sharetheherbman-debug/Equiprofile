/**
 * PR41 — Architecture contract + Studio Workbench tests
 *
 * Tests:
 * 1.  Target architecture doc exists.
 * 2.  TheMarketingApp is a thin shell (create section delegates to StudioHome/StudioWorkbench).
 * 3.  StudioWorkbench renders guided content types (CreateTypeSelector).
 * 4.  No duplicate chat blocks render.
 * 5.  Facebook Ad type has platform/duration/media requirements.
 * 6.  YouTube 3-minute Video type is marked needsAssembly.
 * 7.  3-minute video request is never routed to raw_clip generation.
 * 8.  30–60 s reels are assembled_video unless provider capability says otherwise.
 * 9.  Unsupported raw duration is blocked before provider call.
 * 10. Horse/EquiProfile intent is preserved in workbench plan.
 * 11. Laptop/office/gibberish is forbidden for horse/equine prompts.
 * 12. Voice/music/avatar actions hidden when not wired.
 * 13. Social posting hidden when no real connector exists.
 * 14. Analytics hidden when no real analytics.
 * 15. No Academy changes.
 */

import fs from "node:fs";
import path from "node:path";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { CONTENT_TYPE_DEFINITIONS, CreateTypeSelector } from "./CreateTypeSelector";
import { StudioWorkbench } from "./StudioWorkbench";
import { VoiceAudioStep } from "./VoiceAudioStep";
import { ExportStep } from "./ExportStep";
import {
  validateMarketingCapability,
  ASSEMBLY_REQUIRED_THRESHOLD_SECONDS,
  MAX_RAW_CLIP_DURATION_SECONDS,
} from "../../../../../../server/modules/marketing/marketingCapabilityValidator";

vi.mock("./useMarketingRenderJob", () => ({
  useMarketingRenderJob: () => ({
    job: null,
    status: null,
    statusLabel: null,
    createRenderJob: async () => undefined,
    cancelRenderJob: async () => undefined,
    isCreating: false,
  }),
}));

vi.mock("./useMarketingSceneMedia", () => ({
  useMarketingSceneMedia: () => ({
    sourceSceneMedia: async (_plan: unknown) => _plan,
    isSourcing: false,
    lastStatus: null,
  }),
}));

const repoRoot = path.resolve(import.meta.dirname, "../../../../../..");

// ── 1. Architecture doc exists ────────────────────────────────────────────────
describe("Phase 1 — Architecture document", () => {
  it("target architecture document exists at docs/marketing/MARKETING_APP_TARGET_ARCHITECTURE.md", () => {
    const archDocPath = path.join(repoRoot, "docs/marketing/MARKETING_APP_TARGET_ARCHITECTURE.md");
    expect(fs.existsSync(archDocPath)).toBe(true);
    const content = fs.readFileSync(archDocPath, "utf8");
    expect(content).toContain("Marketing App — Target Architecture");
    expect(content).toContain("Studio Workflow");
    expect(content).toContain("Capability Rules");
    expect(content).toContain("Frontend Module Map");
    expect(content).toContain("Backend Module Map");
  });
});

// ── 2. TheMarketingApp is a thin shell ────────────────────────────────────────
describe("Phase 2 — Thin shell", () => {
  it("TheMarketingApp delegates create section to StudioHome instead of embedding MarketingAppChat directly", () => {
    const source = fs.readFileSync(
      path.join(repoRoot, "client/src/components/marketing/app/TheMarketingApp.tsx"),
      "utf8",
    );
    // StudioHome must be imported
    expect(source).toContain("StudioHome");
    // The create section block must reference StudioHome, not MarketingAppChat directly
    const createBlock = source.slice(source.indexOf('activeSection === "create"'));
    const blockEnd = createBlock.indexOf(": null}");
    const block = createBlock.slice(0, blockEnd);
    expect(block).toContain("StudioHome");
    expect(block).not.toContain("<MarketingAppChat");
  });

  it("TheMarketingApp source does not directly embed MarketingAppChat in the create section JSX", () => {
    const source = fs.readFileSync(
      path.join(repoRoot, "client/src/components/marketing/app/TheMarketingApp.tsx"),
      "utf8",
    );
    // MarketingAppChat may still be imported but must not be used as a direct JSX element in the shell
    const jsxSection = source.slice(source.indexOf("return ("));
    expect(jsxSection).not.toContain("<MarketingAppChat");
  });
});

// ── 3. StudioWorkbench renders guided content types ───────────────────────────
describe("Phase 3 — Guided content types", () => {
  it("StudioWorkbench renders CreateTypeSelector with all content type buttons", () => {
    const html = renderToStaticMarkup(
      <StudioWorkbench tenantId="global" workspaceId="test" hostAppId="equiprofile" />,
    );
    expect(html).toContain("studio-workbench");
    expect(html).toContain("create-type-selector");
    // All 11 content types must be present
    for (const type of CONTENT_TYPE_DEFINITIONS) {
      expect(html).toContain(type.id);
    }
  });

  // ── 4. No duplicate chat blocks ──────────────────────────────────────────
  it("StudioWorkbench does not render a free-form chat block by default", () => {
    const html = renderToStaticMarkup(
      <StudioWorkbench tenantId="global" workspaceId="test" hostAppId="equiprofile" />,
    );
    // Should not contain the MarketingAppChat workspace heading
    expect(html).not.toContain("One clean AI chat workspace");
  });
});

// ── 5. Facebook Ad type definition ────────────────────────────────────────────
describe("Phase 3 — Content type definitions", () => {
  it("Facebook Ad type has correct platform, duration, and media requirements", () => {
    const fbAd = CONTENT_TYPE_DEFINITIONS.find((t) => t.id === "facebook_ad");
    expect(fbAd).toBeDefined();
    expect(fbAd!.platform).toBe("Facebook");
    expect(fbAd!.recommendedDurationSeconds).toBe(30);
    expect(fbAd!.mediaRequired).toBe(true);
    expect(fbAd!.copyRequired).toBe(true);
    expect(fbAd!.needsAssembly).toBe(true);
    expect(fbAd!.directRawGenerationAllowed).toBe(false);
  });

  // ── 6. YouTube 3-minute Video is marked needsAssembly ──────────────────
  it("YouTube 3-minute Video type is marked as needing assembly", () => {
    const yt3min = CONTENT_TYPE_DEFINITIONS.find((t) => t.id === "youtube_3min_video");
    expect(yt3min).toBeDefined();
    expect(yt3min!.needsAssembly).toBe(true);
    expect(yt3min!.recommendedDurationSeconds).toBe(180);
    expect(yt3min!.voiceoverRequired).toBe(true);
    expect(yt3min!.directRawGenerationAllowed).toBe(false);
    expect(yt3min!.deliveryMode).toBe("assembled_video");
  });

  it("all 11 guided content types are defined", () => {
    expect(CONTENT_TYPE_DEFINITIONS).toHaveLength(11);
    const ids = CONTENT_TYPE_DEFINITIONS.map((t) => t.id);
    expect(ids).toContain("facebook_ad");
    expect(ids).toContain("instagram_reel");
    expect(ids).toContain("tiktok_video");
    expect(ids).toContain("linkedin_post");
    expect(ids).toContain("youtube_short");
    expect(ids).toContain("youtube_3min_video");
    expect(ids).toContain("email_campaign");
    expect(ids).toContain("blog_seo_article");
    expect(ids).toContain("weekly_content_pack");
    expect(ids).toContain("launch_campaign");
    expect(ids).toContain("lead_gen_campaign");
  });
});

// ── 7–9. Capability validator ─────────────────────────────────────────────────
describe("Phase 4 — Capability validator", () => {
  // 7. 3-minute video is never routed to raw_clip
  it("3-minute video request results in assembled_video, never raw_clip", () => {
    const result = validateMarketingCapability({
      contentType: "youtube_3min_video",
      requestedDurationSeconds: 180,
      userPrompt: "Create a product video about EquiProfile",
    });
    expect(result.finalDeliveryMode).toBe("assembled_video");
    expect(result.canDirectGenerateRawClip).toBe(false);
    expect(result.needsAssembly).toBe(true);
    expect(result.needsScenePlan).toBe(true);
  });

  it("even if content type differs, 180+ s duration forces assembled_video", () => {
    const result = validateMarketingCapability({
      contentType: "facebook_ad",
      requestedDurationSeconds: 200,
      userPrompt: "Long Facebook ad",
    });
    expect(result.finalDeliveryMode).toBe("assembled_video");
    expect(result.canDirectGenerateRawClip).toBe(false);
  });

  // 8. 30–60 s reels are assembled_video
  it("30 second Instagram reel results in assembled_video", () => {
    const result = validateMarketingCapability({
      contentType: "instagram_reel",
      requestedDurationSeconds: 30,
      userPrompt: "Horse stable EquiProfile reel",
    });
    expect(result.finalDeliveryMode).toBe("assembled_video");
    expect(result.needsAssembly).toBe(true);
  });

  it("60 second TikTok video results in assembled_video", () => {
    const result = validateMarketingCapability({
      contentType: "tiktok_video",
      requestedDurationSeconds: 60,
      userPrompt: "TikTok stable tour",
    });
    expect(result.finalDeliveryMode).toBe("assembled_video");
    expect(result.needsAssembly).toBe(true);
  });

  it("short clip within provider max can use raw_clip when content type allows", () => {
    const result = validateMarketingCapability({
      contentType: "facebook_ad",
      requestedDurationSeconds: 5,
      userPrompt: "Quick horse clip",
      providerMaxRawClipSeconds: 10,
    });
    expect(result.canDirectGenerateRawClip).toBe(true);
    expect(result.finalDeliveryMode).toBe("raw_clip");
  });

  // 9. Unsupported raw duration blocked before provider call
  it(`requests at or above ${ASSEMBLY_REQUIRED_THRESHOLD_SECONDS}s are blocked from raw provider`, () => {
    const result = validateMarketingCapability({
      contentType: "instagram_reel",
      requestedDurationSeconds: ASSEMBLY_REQUIRED_THRESHOLD_SECONDS,
      userPrompt: "Equine reel",
    });
    expect(result.canDirectGenerateRawClip).toBe(false);
    expect(result.finalDeliveryMode).not.toBe("raw_clip");
  });

  it("request exceeding provider max raw clip seconds is blocked from raw provider", () => {
    const result = validateMarketingCapability({
      contentType: "facebook_ad",
      requestedDurationSeconds: MAX_RAW_CLIP_DURATION_SECONDS + 1,
      userPrompt: "Stable ad",
      providerMaxRawClipSeconds: MAX_RAW_CLIP_DURATION_SECONDS,
    });
    expect(result.canDirectGenerateRawClip).toBe(false);
    expect(result.finalDeliveryMode).not.toBe("raw_clip");
  });

  // 10. Horse/EquiProfile intent is preserved
  it("horse/EquiProfile prompt preserves equine context in the plan", () => {
    const result = validateMarketingCapability({
      contentType: "instagram_reel",
      requestedDurationSeconds: 30,
      userPrompt: "Create a reel about EquiProfile for horse stable owners",
    });
    expect(result.equineContextPreserved).toBe(true);
    expect(result.unsupportedReason).toBeNull();
  });

  // 11. Laptop/office subjects forbidden for horse prompts
  it("horse prompt with office/laptop subject is blocked before generation", () => {
    const result = validateMarketingCapability({
      contentType: "instagram_reel",
      requestedDurationSeconds: 30,
      userPrompt: "Show a horse stable with a laptop on the desk",
    });
    expect(result.unsupportedReason).not.toBeNull();
    expect(result.unsupportedReason).toContain("off-brief");
    expect(result.canDirectGenerateRawClip).toBe(false);
    expect(result.finalDeliveryMode).toBe("export_only");
  });

  it("office subject in horse context is blocked", () => {
    const result = validateMarketingCapability({
      contentType: "tiktok_video",
      requestedDurationSeconds: 30,
      userPrompt: "EquiProfile horses in a modern office setting",
    });
    expect(result.unsupportedReason).not.toBeNull();
    expect(result.equineContextPreserved).toBe(true);
  });

  it("text-only content types return text_pack delivery mode", () => {
    const emailResult = validateMarketingCapability({
      contentType: "email_campaign",
      requestedDurationSeconds: 0,
      userPrompt: "Email campaign for stable owners",
    });
    expect(emailResult.finalDeliveryMode).toBe("text_pack");

    const blogResult = validateMarketingCapability({
      contentType: "blog_seo_article",
      requestedDurationSeconds: 0,
      userPrompt: "SEO article about equestrian training",
    });
    expect(blogResult.finalDeliveryMode).toBe("text_pack");
  });

  it("campaign pack types return campaign_pack delivery mode", () => {
    const result = validateMarketingCapability({
      contentType: "weekly_content_pack",
      requestedDurationSeconds: 0,
      userPrompt: "Weekly content pack for EquiProfile",
    });
    expect(result.finalDeliveryMode).toBe("campaign_pack");
  });
});

// ── 12. Voice/music/avatar actions hidden when not wired ──────────────────────
describe("Phase 6 — Hidden unsupported actions", () => {
  it("VoiceAudioStep shows setup-needed guidance when not available", () => {
    const html = renderToStaticMarkup(<VoiceAudioStep script="" isAvailable={false} />);
    expect(html).toContain("Voice provider not connected");
  });

  it("VoiceAudioStep renders content when available", () => {
    const html = renderToStaticMarkup(<VoiceAudioStep script="voice script" isAvailable={true} />);
    expect(html).toContain("voice-audio-step");
    expect(html).toContain("Voice / Audio");
  });

  // 13. Social posting hidden in ExportStep
  it("ExportStep shows Export manually and indicates social posting needs setup", () => {
    const html = renderToStaticMarkup(
      <ExportStep
        plan={{ status: "export", contentType: "facebook_ad" }}
        onExport={() => undefined}
      />,
    );
    expect(html).toContain("Export manually");
    expect(html).toContain("Needs setup");
    expect(html).not.toContain("Post to Facebook");
    // "Social posting" may appear as a disabled label; confirm it's not a wired button
    expect(html).not.toContain('href');
    expect(html).not.toContain("Post now");
  });

  // 14. Analytics not in active marketing UI files
  it("marketing app UI files do not surface analytics panels", () => {
    const files = [
      "client/src/components/marketing/app/TheMarketingApp.tsx",
      "client/src/components/marketing/app/MarketingAppPanels.tsx",
      "client/src/components/marketing/app/MarketingAppChat.tsx",
      "client/src/components/marketing/app/MarketingAppSettings.tsx",
      "client/src/components/marketing/app/studio/StudioHome.tsx",
      "client/src/components/marketing/app/studio/StudioWorkbench.tsx",
    ];

    for (const file of files) {
      const source = fs.readFileSync(path.join(repoRoot, file), "utf8").toLowerCase();
      expect(source, `${file} must not contain analytics`).not.toContain("analytics");
    }
  });
});

// ── 15. No Academy changes ────────────────────────────────────────────────────
describe("Phase 7 — Academy guard", () => {
  it("no marketing studio file imports or references Academy", () => {
    const marketingFiles = [
      "client/src/components/marketing/app/TheMarketingApp.tsx",
      "client/src/components/marketing/app/MarketingAppPanels.tsx",
      "client/src/components/marketing/app/MarketingAppChat.tsx",
      "client/src/components/marketing/app/MarketingAppSettings.tsx",
      "client/src/components/marketing/app/studio/StudioHome.tsx",
      "client/src/components/marketing/app/studio/StudioWorkbench.tsx",
      "client/src/components/marketing/app/studio/CreateTypeSelector.tsx",
      "server/modules/marketing/marketingCapabilityValidator.ts",
    ];

    for (const file of marketingFiles) {
      const source = fs.readFileSync(path.join(repoRoot, file), "utf8");
      expect(source, `${file} must not reference Academy`).not.toContain("Academy");
    }
  });

  it("AdminCampaigns does not import MarketingStudioV2", () => {
    const source = fs.readFileSync(
      path.join(repoRoot, "client/src/pages/AdminCampaigns.tsx"),
      "utf8",
    );
    expect(source).not.toContain("MarketingStudioV2");
  });
});
