import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MarketingAppChat } from "./MarketingAppChat";
import { ChatResultCard } from "./ChatResultCard";
import { MarketingAppBrandPanel, MarketingAppCalendarPanel, MarketingAppCampaignsPanel } from "./MarketingAppPanels";
import { PROVIDER_FIELDS } from "./MarketingAppSettings";
import {
  SOCIAL_CONNECTIONS,
  createSessionCampaign,
  filterMarketingAssets,
  type BrandKit,
} from "./marketingAppHelpers";

const repoRoot = path.resolve(import.meta.dirname, "../../../../..");

const sampleAssets = [
  {
    id: 1,
    status: "completed",
    publicUrl: "https://example.com/video.mp4",
    mimeType: "video/mp4",
    generationPrompt: "Video prompt",
    metadata: { title: "Video asset" },
    createdAt: "2026-05-01T10:00:00.000Z",
    updatedAt: "2026-05-01T10:00:00.000Z",
  },
  {
    id: 2,
    status: "setup_needed",
    publicUrl: null,
    mimeType: null,
    generationPrompt: "Draft prompt",
    metadata: { title: "Draft asset" },
    createdAt: "2026-05-02T10:00:00.000Z",
    updatedAt: "2026-05-02T10:00:00.000Z",
  },
  {
    id: 3,
    status: "deleted",
    publicUrl: "https://example.com/image.png",
    mimeType: "image/png",
    generationPrompt: "Deleted image",
    metadata: { title: "Deleted asset" },
    createdAt: "2026-05-03T10:00:00.000Z",
    updatedAt: "2026-05-03T10:00:00.000Z",
  },
] as const;

describe("Marketing App frontend rebuild", () => {
  it("keeps Create as chat-only flow without a separate AI plan panel", () => {
    const html = renderToStaticMarkup(
      <MarketingAppChat
        messages={[{ id: "assistant-1", role: "assistant", content: "Plan is in chat.", timestamp: Date.now() }]}
        resultCards={[]}
        isSubmitting={false}
        onSubmit={() => undefined}
      />,
    );

    expect(html).toContain("One clean AI chat workspace");
    expect(html).toContain("Plan is in chat.");
    expect(html).not.toContain("AI plan panel");
  });

  it("renders compact chat result preview and includes expand preview control", () => {
    const html = renderToStaticMarkup(
      <ChatResultCard
        result={{
          assetId: 1,
          approvalId: "draft-1",
          status: "completed",
          publicUrl: "https://example.com/image.png",
          mimeType: "image/png",
          title: "Asset",
          provider: "genx",
          model: "image-v1",
        }}
      />,
    );
    const source = fs.readFileSync(
      path.join(repoRoot, "client/src/components/marketing/app/ChatResultCard.tsx"),
      "utf8",
    );

    expect(html).toContain("compact-preview");
    expect(html).toContain("max-h-[200px]");
    expect(html).toContain("Expand preview");
    expect(source).toContain("<Dialog");
  });

  it("filters the asset library by media type and status while hiding deleted assets", () => {
    expect(filterMarketingAssets([...sampleAssets], "video", "")).toHaveLength(1);
    expect(filterMarketingAssets([...sampleAssets], "failed_setup_needed", "")).toHaveLength(1);
    expect(filterMarketingAssets([...sampleAssets], "all", "")).toHaveLength(2);
    expect(filterMarketingAssets([...sampleAssets], "all", "deleted")).toHaveLength(0);
  });

  it("uses permanentDeleteMediaAsset for delete actions", () => {
    const source = fs.readFileSync(
      path.join(repoRoot, "client/src/components/marketing/app/TheMarketingApp.tsx"),
      "utf8",
    );

    expect(source).toContain("trpc.admin.permanentDeleteMediaAsset.useMutation");
  });

  it("renders campaigns with a New Campaign form and detail view", () => {
    const campaign = createSessionCampaign({
      name: "Launch week",
      goal: "Drive signups",
      audience: "Stable owners",
      channels: ["Facebook", "Instagram"],
      startDate: "2026-05-29",
      durationDays: 7,
    });

    const html = renderToStaticMarkup(
      <MarketingAppCampaignsPanel
        form={{
          name: "Launch week",
          goal: "Drive signups",
          audience: "Stable owners",
          channels: "Facebook, Instagram",
          startDate: "2026-05-29",
          durationDays: 7,
        }}
        campaigns={[campaign]}
        selectedCampaign={campaign}
        assets={[...sampleAssets]}
        onFormChange={() => undefined}
        onCreateCampaign={() => undefined}
        onSelectCampaign={() => undefined}
        onGenerateSevenDayPlan={() => undefined}
        onGenerateWeeklyPack={() => undefined}
        onToggleAttachedAsset={() => undefined}
        onExportCampaign={() => undefined}
      />,
    );

    expect(html).toContain("New Campaign");
    expect(html).toContain("Campaign detail view");
    expect(html).toContain("Generate 7-day plan");
    expect(html).toContain("Export campaign plan");
  });

  it("renders calendar week-view empty state", () => {
    const html = renderToStaticMarkup(<MarketingAppCalendarPanel campaigns={[]} />);

    expect(html).toContain("Export-only mode");
    expect(html).toContain("No scheduled content yet. Create or approve campaign items first.");
  });

  it("renders the Brand Kit form", () => {
    const brandKit: BrandKit = {
      brandName: "EquiProfile",
      domain: "equiprofile.com",
      cta: "Start your free trial",
      toneOfVoice: "Helpful and calm",
      primaryColor: "#1e3a5f",
      secondaryColor: "#c5a55a",
    };

    const html = renderToStaticMarkup(
      <MarketingAppBrandPanel
        brandKit={brandKit}
        canApplyBrand={false}
        selectedAssetName={null}
        onBrandKitChange={() => undefined}
        onSaveBrandKit={() => undefined}
        onApplyBrand={() => undefined}
      />,
    );

    expect(html).toContain("Brand Kit");
    expect(html).toContain("Brand name");
    expect(html).toContain("Save Brand Kit");
  });

  it("keeps settings limited to Marketing App provider keys", () => {
    const labels = PROVIDER_FIELDS.map((field) => field.label);

    expect(labels).toEqual([
      "Marketing GenX",
      "Marketing Qwen",
      "Marketing Hugging Face",
      "Pexels",
      "Pixabay",
    ]);
    expect(labels.join(" ")).not.toContain("EquiProfile Admin");
  });

  it("limits social connection statuses to export_only or not_connected", () => {
    expect(SOCIAL_CONNECTIONS.map((item) => item.status)).toEqual([
      "not_connected",
      "export_only",
      "not_connected",
      "export_only",
      "not_connected",
    ]);
  });

  it("does not surface fake analytics in active marketing app UI files", () => {
    const files = [
      "client/src/components/marketing/app/TheMarketingApp.tsx",
      "client/src/components/marketing/app/MarketingAppPanels.tsx",
      "client/src/components/marketing/app/MarketingAppChat.tsx",
      "client/src/components/marketing/app/MarketingAppSettings.tsx",
    ];

    for (const file of files) {
      const source = fs.readFileSync(path.join(repoRoot, file), "utf8").toLowerCase();
      expect(source).not.toContain("analytics");
    }
  });

  it("keeps MarketingStudioV2 inactive and avoids Academy imports", () => {
    const adminCampaignsSource = fs.readFileSync(
      path.join(repoRoot, "client/src/pages/AdminCampaigns.tsx"),
      "utf8",
    );
    const marketingFiles = [
      "client/src/components/marketing/app/TheMarketingApp.tsx",
      "client/src/components/marketing/app/MarketingAppPanels.tsx",
      "client/src/components/marketing/app/MarketingAppChat.tsx",
      "client/src/components/marketing/app/MarketingAppSettings.tsx",
    ];

    expect(adminCampaignsSource).not.toContain("MarketingStudioV2");

    for (const file of marketingFiles) {
      const source = fs.readFileSync(path.join(repoRoot, file), "utf8");
      expect(source).not.toContain("Academy");
    }
  });
});
