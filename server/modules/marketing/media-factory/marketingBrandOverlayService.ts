import { getBrandProfile, getMediaAssetById } from "../../growth-engine";
import type { MarketingBrandOverlay } from "./renderJobTypes";

export async function buildMarketingBrandOverlay(input: {
  tenantId: string;
  workspaceId: string;
  hostAppId: string;
  brandKit?: {
    brandName?: string;
    domain?: string;
    cta?: string;
    primaryColor?: string;
    secondaryColor?: string;
    logoUrl?: string;
  };
}): Promise<MarketingBrandOverlay> {
  const profile = await getBrandProfile(input.tenantId);
  const profileColors = profile?.colors ?? {};

  let logoUrl = input.brandKit?.logoUrl;
  if (!logoUrl && profile?.logoAssetId) {
    const logoAsset = await getMediaAssetById(profile.logoAssetId);
    logoUrl = logoAsset?.publicUrl ?? undefined;
  }

  return {
    brandName: input.brandKit?.brandName || profile?.name || "EquiProfile",
    domain: input.brandKit?.domain || profile?.positioning || "equiprofile.com",
    cta: input.brandKit?.cta || profile?.primaryCta || "Start today",
    primaryColor: input.brandKit?.primaryColor || profileColors.primary || "#1e3a5f",
    secondaryColor: input.brandKit?.secondaryColor || profileColors.secondary || "#c5a55a",
    ...(logoUrl ? { logoUrl } : {}),
  };
}
