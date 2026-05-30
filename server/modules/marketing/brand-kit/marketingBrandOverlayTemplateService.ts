import type { MarketingBrandKitSafeArea, MarketingOverlayTemplate } from "./marketingBrandKitTypes";

const SAFE_16_9: MarketingBrandKitSafeArea = { top: 40, right: 40, bottom: 40, left: 40 };

const OVERLAY_TEMPLATE_CONFIG: Record<MarketingOverlayTemplate, {
  logo: "top_right" | "top_left" | "none";
  brandDomain: "top_left" | "bottom_left" | "bottom_center";
  cta: "bottom_right" | "bottom_left" | "bottom_center";
  safeArea: MarketingBrandKitSafeArea;
  endCardEnabled: boolean;
}> = {
  lower_third: {
    logo: "top_right",
    brandDomain: "top_left",
    cta: "bottom_left",
    safeArea: SAFE_16_9,
    endCardEnabled: true,
  },
  corner_logo: {
    logo: "top_right",
    brandDomain: "top_left",
    cta: "bottom_right",
    safeArea: SAFE_16_9,
    endCardEnabled: true,
  },
  end_card: {
    logo: "top_left",
    brandDomain: "bottom_center",
    cta: "bottom_center",
    safeArea: SAFE_16_9,
    endCardEnabled: true,
  },
  social_reel: {
    logo: "top_right",
    brandDomain: "bottom_left",
    cta: "bottom_center",
    safeArea: { top: 80, right: 40, bottom: 180, left: 40 },
    endCardEnabled: true,
  },
  youtube_landscape: {
    logo: "top_right",
    brandDomain: "top_left",
    cta: "bottom_right",
    safeArea: SAFE_16_9,
    endCardEnabled: true,
  },
};

export function listMarketingBrandOverlayTemplates(): MarketingOverlayTemplate[] {
  return Object.keys(OVERLAY_TEMPLATE_CONFIG) as MarketingOverlayTemplate[];
}

export function getMarketingBrandOverlayTemplate(template: MarketingOverlayTemplate) {
  return OVERLAY_TEMPLATE_CONFIG[template] ?? OVERLAY_TEMPLATE_CONFIG.lower_third;
}
