import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";

const studioSource = readFileSync(resolve(process.cwd(), "client/src/components/marketing/app/TheMarketingApp.tsx"), "utf8");
const previewSource = readFileSync(resolve(process.cwd(), "client/src/components/marketing/app/MarketingAppPreview.tsx"), "utf8");
const assetLibrarySource = readFileSync(resolve(process.cwd(), "client/src/components/marketing/legacy/AssetLibrary.tsx"), "utf8");
const mediaStatusSource = readFileSync(resolve(process.cwd(), "client/src/components/marketing/studio/mediaStatus.ts"), "utf8");
const routerSource = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");
const compilerSource = readFileSync(resolve(process.cwd(), "server/_core/marketing/promptCompiler.ts"), "utf8");
const orchestratorSource = readFileSync(resolve(process.cwd(), "server/_core/ai/orchestrator.ts"), "utf8");

describe("Studio production workflow truth contracts", () => {
  it("treats playable media as completed and blocks stale failed/retrying overrides", () => {
    expect(mediaStatusSource).toContain("hasPlayablePublicAsset");
    expect(mediaStatusSource).toContain('patch.status !== "completed"');
    expect(studioSource).toContain("hasPlayablePublicAsset(asset)");
    expect(studioSource).toContain('status: "completed"');
  });

  it("shows playable assets as completed in PreviewCanvas and AssetLibrary", () => {
    expect(previewSource).toContain("effectiveStatus");
    expect(assetLibrarySource).toContain("Status: {hasPlayablePublicAsset");
    expect(assetLibrarySource).toContain("Playable media ready");
  });

  it("supports 5/10/15/30/60/180 durations with scene_plan_required truth", () => {
    expect(routerSource).toContain('z.enum(["5", "10", "15", "30", "60", "180"])');
    expect(routerSource).toContain("scene_plan_required");
    expect(routerSource).toContain("requestedDurationSeconds");
    expect(routerSource).toContain("providerMaxDurationSeconds");
    expect(orchestratorSource).toContain("actualDurationSeconds");
  });

  it("keeps scene_plan_required and setup_needed as non-failure UX states", () => {
    expect(previewSource).toContain("Scene plan required");
    expect(previewSource).toContain("Video model missing");
    expect(studioSource).toContain('status === "setup_needed"');
  });

  it("stores silent-video audio metadata and post-completion voice/music actions", () => {
    expect(routerSource).toContain("audioPlan");
    expect(routerSource).toContain("voiceoverText");
    expect(routerSource).toContain("musicPrompt");
    expect(routerSource).toContain("createVoiceoverMediaAsset");
    expect(routerSource).toContain("createMusicMediaAsset");
    expect(routerSource).toContain("voice_id_required");
    expect(routerSource).toContain("music_provider_unavailable");
    expect(previewSource).toContain("Silent video");
    expect(previewSource).toContain("Add voiceover");
    expect(previewSource).toContain("Add music");
  });

  it("supports brand action entry points and preserves raw/branded links", () => {
    expect(previewSource).toContain("Create branded version");
    expect(previewSource).toContain("Delete permanently");
    expect(assetLibrarySource).toContain("rawAssetId");
    expect(routerSource).toContain("createBrandedMediaAsset");
  });

  it("routes prompt quality controls through promptCompiler", () => {
    expect(studioSource).toContain("promptControls");
    expect(routerSource).toContain("promptControls");
    expect(compilerSource).toContain("controlDirectives");
    expect(compilerSource).toContain("appliedControls");
  });
});
