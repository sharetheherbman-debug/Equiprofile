import {
  buildMarketingRenderOverlayConfig,
  resolveDefaultMarketingBrandKit,
  type MarketingOverlayTemplate,
} from "../brand-kit";
import type { MarketingBrandOverlay } from "./renderJobTypes";

export async function buildMarketingBrandOverlay(input: {
  tenantId: string;
  workspaceId: string;
  hostAppId: string;
  brandKitId?: number | null;
  brandKit?: {
    brandName?: string;
    domain?: string;
    cta?: string;
    primaryColor?: string;
    secondaryColor?: string;
    logoUrl?: string;
    overlayTemplate?: MarketingOverlayTemplate;
  };
}): Promise<MarketingBrandOverlay> {
  const resolved = await buildMarketingRenderOverlayConfig({
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
    hostAppId: input.hostAppId,
    brandKitId: input.brandKitId,
    ctaOverride: input.brandKit?.cta,
  });

  return {
    brandKitId: resolved.brandKitId,
    overlayTemplate: input.brandKit?.overlayTemplate ?? resolved.overlayTemplate,
    brandName: input.brandKit?.brandName || resolved.brandName,
    domain: input.brandKit?.domain || resolved.domain,
    cta: input.brandKit?.cta || resolved.cta,
    primaryColor: input.brandKit?.primaryColor || resolved.primaryColor,
    secondaryColor: input.brandKit?.secondaryColor || resolved.secondaryColor,
    ...(resolved.accentColor ? { accentColor: resolved.accentColor } : {}),
    ...(input.brandKit?.logoUrl || resolved.logoUrl ? { logoUrl: input.brandKit?.logoUrl || resolved.logoUrl! } : {}),
    ...(resolved.logoAssetId ? { logoAssetId: resolved.logoAssetId } : {}),
    placements: resolved.placements,
    safeArea: resolved.safeArea,
    endCard: resolved.endCard,
  };
}

export async function resolveMarketingBrandDefaults(input: {
  tenantId: string;
  workspaceId: string;
  hostAppId: string;
}) {
  return resolveDefaultMarketingBrandKit(input);
}
