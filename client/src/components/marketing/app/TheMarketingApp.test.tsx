import fs from "node:fs";
import path from "node:path";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ChatResultCard } from "./ChatResultCard";
import { normalizeSocialConnections } from "./MarketingAppSettings";
import { StudioHome } from "./studio/StudioHome";
import { buildScenePlanFromPrompt } from "./studio/StudioWorkbench";
import { shouldQueueRawMediaJob } from "./TheMarketingApp";

vi.mock("./studio/useMarketingRenderJob", () => ({
  useMarketingRenderJob: () => ({
    job: null,
    status: null,
    statusLabel: null,
    createRenderJob: async () => undefined,
    cancelRenderJob: async () => undefined,
    isCreating: false,
  }),
}));

const repoRoot = path.resolve(import.meta.dirname, "../../../../..");

describe("PR42A marketing app stabilization", () => {
  it("uses workspace tenant/workspace ids in settings social query input", () => {
    const source = fs.readFileSync(
      path.join(repoRoot, "client/src/components/marketing/app/MarketingAppSettings.tsx"),
      "utf8",
    );
    expect(source).toContain("useQuery({ tenantId, workspaceId })");
    expect(source).not.toContain('tenantId: "global", workspaceId: "default"');
  });

  it("normalizes invalid social query responses without crashing", () => {
    expect(normalizeSocialConnections(undefined)).toEqual([]);
    expect(normalizeSocialConnections({})).toEqual([]);
    expect(normalizeSocialConnections([{ platform: 1, status: null }])).toEqual([
      { platform: "Unknown", status: "not_connected", accountName: null },
    ]);
  });

  it("shows guided Studio Workbench only in Create", () => {
    const html = renderToStaticMarkup(
      <StudioHome tenantId="global" workspaceId="equiprofile-global" hostAppId="equiprofile" />,
    );
    expect(html).toContain("studio-workbench");
    expect(html).not.toContain("Free-form chat");
    expect(html).not.toContain("AI chat-first flow");
  });

  it("does not render compiled prompt or provider metadata in result card", () => {
    const html = renderToStaticMarkup(
      <ChatResultCard
        result={{
          assetId: 1,
          status: "completed",
          publicUrl: "https://example.com/image.png",
          mimeType: "image/png",
          title: "Horse ad",
          summary: "Short horse campaign preview",
          prompt: "compiled provider prompt",
          provider: "genx",
          model: "v1",
        }}
      />,
    );
    expect(html).toContain("Short horse campaign preview");
    expect(html).toContain("Open");
    expect(html).toContain("Download");
    expect(html).toContain("Delete permanently");
    expect(html).not.toContain("compiled provider prompt");
    expect(html).not.toContain("Provider:");
    expect(html).not.toContain("Model:");
  });

  it("blocks raw media jobs for assembled long-form requests", () => {
    expect(shouldQueueRawMediaJob({
      task: "text_to_video",
      prompt: "Create a 3-minute YouTube video for EquiProfile",
    }).allowRaw).toBe(false);

    expect(shouldQueueRawMediaJob({
      task: "text_to_video",
      prompt: "Create a 30-second Facebook video ad for stable owners",
    }).allowRaw).toBe(false);
  });

  it("blocks 15-second raw request unless provider supports it", () => {
    expect(shouldQueueRawMediaJob({
      task: "text_to_video",
      prompt: "Create a 15-second horse video",
    }).allowRaw).toBe(false);

    expect(shouldQueueRawMediaJob({
      task: "text_to_video",
      prompt: "Create a 15-second horse clip",
      providerMaxRawSeconds: 20,
    }).allowRaw).toBe(true);
  });

  it("builds horse/equestrian scene plans without forbidden office terms", () => {
    const scenes = buildScenePlanFromPrompt("Create a horse video ad for stable owners and equestrian teams");
    const combined = scenes.map((scene) => `${scene.narration} ${scene.visualPrompt} ${scene.negativePrompt}`).join(" ").toLowerCase();
    expect(combined).toContain("horse");
    expect(combined).toContain("stable");
    expect(combined).not.toContain("office");
    expect(combined).not.toContain("laptop");
    expect(combined).not.toContain("gibberish");
  });

  it("renders section-level retry error cards for failed queries", () => {
    const source = fs.readFileSync(
      path.join(repoRoot, "client/src/components/marketing/app/TheMarketingApp.tsx"),
      "utf8",
    );
    expect(source).toContain("SectionErrorCard");
    expect(source).toContain("Something failed to load. Please retry.");
  });

  it("keeps Academy untouched and MarketingStudioV2 inactive", () => {
    const files = [
      "client/src/components/marketing/app/TheMarketingApp.tsx",
      "client/src/components/marketing/app/MarketingAppPanels.tsx",
      "client/src/components/marketing/app/MarketingAppSettings.tsx",
      "client/src/components/marketing/app/studio/StudioHome.tsx",
    ];
    for (const file of files) {
      const source = fs.readFileSync(path.join(repoRoot, file), "utf8");
      expect(source).not.toContain("Academy");
    }

    const adminCampaignsSource = fs.readFileSync(
      path.join(repoRoot, "client/src/pages/AdminCampaigns.tsx"),
      "utf8",
    );
    expect(adminCampaignsSource).not.toContain("MarketingStudioV2");
  });
});
