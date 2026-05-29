import type { MarketingOverlayConfig } from "./marketingBrandKitTypes";
import type { MarketingBrandOverlayTemplate } from "./marketingBrandKitTypes";

const TEMPLATE_CONFIGS: Record<MarketingBrandOverlayTemplate, Omit<MarketingOverlayConfig, "colors" | "logo">> = {
  lower_third: {
    template: "lower_third",
    text: { brandNamePosition: "top_left", domainPosition: "top_left", ctaPosition: "bottom_right" },
    captionSafeZone: { topPct: 6, rightPct: 6, bottomPct: 18, leftPct: 6 },
    endCard: { enabled: true, durationSeconds: 3 },
  },
  corner_logo: {
    template: "corner_logo",
    text: { brandNamePosition: "bottom_left", domainPosition: "bottom_left", ctaPosition: "bottom_right" },
    captionSafeZone: { topPct: 6, rightPct: 6, bottomPct: 16, leftPct: 6 },
    endCard: { enabled: true, durationSeconds: 3 },
  },
  end_card: {
    template: "end_card",
    text: { brandNamePosition: "center", domainPosition: "center", ctaPosition: "center" },
    captionSafeZone: { topPct: 8, rightPct: 8, bottomPct: 18, leftPct: 8 },
    endCard: { enabled: true, durationSeconds: 4 },
  },
  social_reel: {
    template: "social_reel",
    text: { brandNamePosition: "top_left", domainPosition: "top_left", ctaPosition: "bottom_left" },
    captionSafeZone: { topPct: 8, rightPct: 6, bottomPct: 22, leftPct: 6 },
    endCard: { enabled: true, durationSeconds: 3 },
  },
  youtube_landscape: {
    template: "youtube_landscape",
    text: { brandNamePosition: "top_left", domainPosition: "top_right", ctaPosition: "bottom_right" },
    captionSafeZone: { topPct: 6, rightPct: 6, bottomPct: 16, leftPct: 6 },
    endCard: { enabled: true, durationSeconds: 3 },
  },
};

export function listMarketingBrandOverlayTemplates() {
  return Object.keys(TEMPLATE_CONFIGS) as MarketingBrandOverlayTemplate[];
}

export function buildMarketingOverlayTemplate(input: {
  template: MarketingBrandOverlayTemplate;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string | null;
}): MarketingOverlayConfig {
  const base = TEMPLATE_CONFIGS[input.template] ?? TEMPLATE_CONFIGS.lower_third;
  return {
    ...base,
    logo: {
      enabled: Boolean(input.logoUrl),
      url: input.logoUrl,
      position: input.template === "corner_logo" ? "top_right" : input.template === "end_card" ? "center" : "top_left",
    },
    colors: {
      primary: input.primaryColor,
      secondary: input.secondaryColor,
      accent: input.accentColor,
    },
  };
}
