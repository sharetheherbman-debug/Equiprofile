import { buildMarketingBrandOverlayConfig } from "../brand-kit";
import type { MarketingBrandOverlay } from "./renderJobTypes";

export async function buildMarketingBrandOverlay(input: {
  tenantId: string;
  workspaceId: string;
  hostAppId: string;
  brandKit?: {
    id?: number;
    brandName?: string;
    domain?: string;
    cta?: string;
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
    logoUrl?: string;
    overlayTemplate?: "lower_third" | "corner_logo" | "end_card" | "social_reel" | "youtube_landscape";
    defaultAspectRatio?: string;
  };
}): Promise<MarketingBrandOverlay> {
  const resolved = await buildMarketingBrandOverlayConfig({
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
    hostAppId: input.hostAppId,
    brandKitId: input.brandKit?.id ?? null,
  });

  return {
    brandKitId: resolved.brandKitId,
    overlayTemplate: input.brandKit?.overlayTemplate ?? resolved.overlayConfig.template,
    defaultAspectRatio: input.brandKit?.defaultAspectRatio ?? resolved.summary.defaultAspectRatio,
    brandName: input.brandKit?.brandName || resolved.summary.brandName,
    domain: input.brandKit?.domain || resolved.summary.domain,
    cta: input.brandKit?.cta || resolved.summary.primaryCta,
    primaryColor: input.brandKit?.primaryColor || resolved.summary.primaryColor,
    secondaryColor: input.brandKit?.secondaryColor || resolved.summary.secondaryColor,
    accentColor: input.brandKit?.accentColor || resolved.summary.accentColor,
    logoUrl: input.brandKit?.logoUrl || resolved.summary.logoUrl || undefined,
    captionSafeZone: resolved.overlayConfig.captionSafeZone,
    endCard: resolved.overlayConfig.endCard,
  };
}
