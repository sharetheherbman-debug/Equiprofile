import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";

const adminPage = readFileSync(resolve(process.cwd(), "client/src/pages/Admin.tsx"), "utf8");
const adminCampaigns = readFileSync(resolve(process.cwd(), "client/src/pages/AdminCampaigns.tsx"), "utf8");
const marketingApp = readFileSync(resolve(process.cwd(), "client/src/components/marketing/app/TheMarketingApp.tsx"), "utf8");
const marketingSettings = readFileSync(resolve(process.cwd(), "client/src/components/marketing/app/MarketingAppSettings.tsx"), "utf8");
const routersSource = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");
const auditDoc = readFileSync(resolve(process.cwd(), "docs/audits/PR38_MARKETING_APP_CLEANUP_AUDIT.md"), "utf8");

describe("PR38 cleanup enforcement", () => {
  it("AdminCampaigns renders TheMarketingApp only", () => {
    expect(adminCampaigns).toContain("return <TheMarketingApp");
    expect(adminCampaigns).not.toContain("MarketingStudioV2");
  });

  it("active routes do not import MarketingStudioV2", () => {
    expect(adminPage).not.toContain("MarketingStudioV2");
    expect(adminCampaigns).not.toContain("MarketingStudioV2");
  });

  it("TheMarketingApp does not import quarantined old studio UI components", () => {
    for (const legacyName of ["AssetLibrary", "SetupDrawer", "PlatformConnectionCards", "MarketingStudioV2"]) {
      expect(marketingApp).not.toContain(legacyName);
    }
  });

  it("EquiProfile Admin settings only expose EquiProfile GenX namespaced keys", () => {
    expect(adminPage).toContain("EquiProfile AI Settings");
    expect(adminPage).toContain("equiprofile_ai_genx_api_key");
    expect(adminPage).toContain("equiprofile_ai_genx_model");
  });

  it("EquiProfile Admin settings do not show marketing provider controls", () => {
    for (const forbidden of ["Marketing AI Provider Settings", "Qwen", "Hugging Face", "Pexels", "Pixabay"]) {
      expect(adminPage).not.toContain(forbidden);
    }
  });

  it("Marketing App settings expose namespaced marketing provider keys", () => {
    for (const key of [
      "marketing_genx_api_key",
      "marketing_qwen_api_key",
      "marketing_huggingface_api_key",
      "marketing_pexels_api_key",
      "marketing_pixabay_api_key",
    ]) {
      expect(marketingSettings).toContain(key);
    }
  });

  it("saveAIProviderSettings maps legacy provider keys to marketing_* keys", () => {
    expect(routersSource).toContain("MARKETING_PROVIDER_SAVE_KEY_MAP");
    expect(routersSource).toContain('genx_api_key: "marketing_genx_api_key"');
    expect(routersSource).toContain('qwen_api_key: "marketing_qwen_api_key"');
    expect(routersSource).toContain('huggingface_api_key: "marketing_huggingface_api_key"');
  });

  it("permanentDeleteMediaAsset mutation exists and deletes DB row", () => {
    expect(routersSource).toContain("permanentDeleteMediaAsset: adminUnlockedProcedure");
    expect(routersSource).toContain("await deleteMediaAssetRow(input.id)");
  });

  it("permanentDeleteMediaAsset deletes local files with generated-path safety", () => {
    expect(routersSource).toContain("/media/generated/");
    expect(routersSource).toContain("generatedRoot");
    expect(routersSource).toContain("fs.promises.unlink");
  });

  it("permanentDeleteMediaAsset rejects unsafe paths", () => {
    expect(routersSource).toContain("suffix.includes(\"..\")");
    expect(routersSource).toContain("startsWith(generatedRoot + path.sep)");
  });

  it("TheMarketingApp delete actions call permanentDeleteMediaAsset and remove deleted toggle", () => {
    const assetsHook = readFileSync(resolve(process.cwd(), "client/src/components/marketing/app/hooks/useMarketingAssets.ts"), "utf8");
    expect(marketingApp).toContain("useMarketingAssets");
    expect(assetsHook).toContain("trpc.admin.permanentDeleteMediaAsset.useMutation");
    expect(marketingApp).toContain("Delete permanently");
    expect(marketingApp).not.toContain("Show deleted (admin/debug)");
  });

  it("PR38 audit document exists", () => {
    expect(auditDoc).toContain("PR38 Marketing App Cleanup Audit");
  });
});
