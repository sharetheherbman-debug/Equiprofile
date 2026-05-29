import { TRPCError } from "@trpc/server";
import { getMediaAssetById } from "../../growth-engine";
import { buildMarketingOverlayTemplate, listMarketingBrandOverlayTemplates } from "./marketingBrandOverlayTemplateService";
import { getMarketingBrandKitByScope, listMarketingAssetVersionsByScope, recordMarketingAssetVersion, upsertMarketingBrandKitRecord } from "./marketingBrandKitStore";
import {
  HEX_COLOR_REGEX,
  MARKETING_BRAND_OVERLAY_TEMPLATES,
  marketingBrandKitInputSchema,
  type MarketingBrandKitInput,
} from "./marketingBrandKitTypes";

const EQUIPROFILE_DEFAULTS = {
  brandName: "EquiProfile",
  domain: "equiprofile.online",
  primaryCta: "Start your free trial",
  toneOfVoice: "professional, helpful, premium equestrian software",
  primaryColor: "#1e3a5f",
  secondaryColor: "#2e6da4",
  accentColor: "#c5a55a",
  overlayTemplate: "lower_third" as const,
  defaultAspectRatio: "16:9",
};

function isSafeHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeDomain(input: string): string {
  const value = input.trim().toLowerCase();
  return value.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function assertNoSecretMetadata(metadata: Record<string, unknown> | null | undefined) {
  if (!metadata) return;
  const dangerousKeys = ["apiKey", "api_key", "token", "secret", "password", "privateKey"];
  const keys = Object.keys(metadata);
  if (keys.some((key) => dangerousKeys.some((bad) => key.toLowerCase().includes(bad.toLowerCase())))) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Brand metadata cannot include secrets." });
  }
}

function assertTemplate(template: string) {
  if (!MARKETING_BRAND_OVERLAY_TEMPLATES.includes(template as (typeof MARKETING_BRAND_OVERLAY_TEMPLATES)[number])) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `Unsupported overlay template: ${template}` });
  }
}

function assertColor(color: string, field: string) {
  if (!HEX_COLOR_REGEX.test(color)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `${field} must be a hex colour.` });
  }
}

function assertDomain(domain: string) {
  const normalized = normalizeDomain(domain);
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(normalized)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Domain must be valid." });
  }
}

async function assertLogo(input: { logoAssetId?: number | null; logoUrl?: string | null }) {
  if (input.logoAssetId) {
    const asset = await getMediaAssetById(input.logoAssetId);
    if (!asset) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Logo asset not found." });
    }
    if (asset.type !== "image") {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Logo asset must be an image." });
    }
  }
  if (input.logoUrl && !isSafeHttpUrl(input.logoUrl)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "logoUrl must be a safe URL." });
  }
}

export async function resolveDefaultMarketingBrandKit(input: {
  tenantId: string;
  workspaceId: string;
  hostAppId: string;
}) {
  const existing = await getMarketingBrandKitByScope(input);
  if (existing) return existing;

  return upsertMarketingBrandKitRecord({
    ...input,
    ...EQUIPROFILE_DEFAULTS,
    tagline: null,
    secondaryCta: null,
    targetAudience: null,
    logoAssetId: null,
    logoUrl: null,
    faviconUrl: null,
    safeArea: null,
    metadata: null,
  });
}

export async function getMarketingBrandKit(input: {
  tenantId: string;
  workspaceId: string;
  hostAppId: string;
}) {
  return resolveDefaultMarketingBrandKit(input);
}

export async function upsertMarketingBrandKit(input: MarketingBrandKitInput) {
  const parsed = marketingBrandKitInputSchema.parse(input);
  assertDomain(parsed.domain);
  assertTemplate(parsed.overlayTemplate);
  assertColor(parsed.primaryColor, "primaryColor");
  assertColor(parsed.secondaryColor, "secondaryColor");
  if (parsed.accentColor) assertColor(parsed.accentColor, "accentColor");
  await assertLogo(parsed);
  assertNoSecretMetadata(parsed.metadata ?? null);

  const domain = normalizeDomain(parsed.domain);
  const logoAsset = parsed.logoAssetId ? await getMediaAssetById(parsed.logoAssetId) : null;

  return upsertMarketingBrandKitRecord({
    ...parsed,
    domain,
    logoUrl: parsed.logoUrl ?? logoAsset?.publicUrl ?? null,
  });
}

export async function resetMarketingBrandKitToWorkspaceDefault(input: {
  tenantId: string;
  workspaceId: string;
  hostAppId: string;
}) {
  return upsertMarketingBrandKitRecord({
    ...input,
    ...EQUIPROFILE_DEFAULTS,
    tagline: null,
    secondaryCta: null,
    targetAudience: null,
    logoAssetId: null,
    logoUrl: null,
    faviconUrl: null,
    safeArea: null,
    metadata: null,
  });
}

export async function selectMarketingBrandLogoAsset(input: {
  tenantId: string;
  workspaceId: string;
  hostAppId: string;
  mediaAssetId: number;
}) {
  const kit = await resolveDefaultMarketingBrandKit(input);
  const asset = await getMediaAssetById(input.mediaAssetId);
  if (!asset) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Media asset not found." });
  }
  if (asset.type !== "image") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Only image media assets can be selected as logo." });
  }

  return upsertMarketingBrandKit({
    tenantId: kit.tenantId,
    workspaceId: kit.workspaceId,
    hostAppId: kit.hostAppId,
    brandName: kit.brandName,
    domain: kit.domain,
    tagline: kit.tagline,
    primaryCta: kit.primaryCta,
    secondaryCta: kit.secondaryCta,
    toneOfVoice: kit.toneOfVoice,
    targetAudience: kit.targetAudience,
    primaryColor: kit.primaryColor,
    secondaryColor: kit.secondaryColor,
    accentColor: kit.accentColor,
    logoAssetId: asset.id,
    logoUrl: asset.publicUrl ?? null,
    faviconUrl: kit.faviconUrl,
    overlayTemplate: kit.overlayTemplate,
    defaultAspectRatio: kit.defaultAspectRatio,
    safeArea: kit.safeArea,
    metadata: kit.metadata,
  });
}

export async function uploadMarketingBrandLogo() {
  return {
    status: "setup_needed" as const,
    reason: "Direct brand logo upload is not wired. Use selectMarketingBrandLogoAsset with existing media assets.",
  };
}

export async function buildMarketingBrandOverlayConfig(input: {
  tenantId: string;
  workspaceId: string;
  hostAppId: string;
  brandKitId?: number | null;
}) {
  const kit = await resolveDefaultMarketingBrandKit(input);

  return {
    brandKitId: kit.id,
    summary: toPublicMarketingBrandSummary(kit),
    overlayConfig: buildMarketingOverlayTemplate({
      template: kit.overlayTemplate,
      logoUrl: kit.logoUrl,
      primaryColor: kit.primaryColor,
      secondaryColor: kit.secondaryColor,
      accentColor: kit.accentColor,
    }),
    endCard: {
      brandName: kit.brandName,
      domain: kit.domain,
      cta: kit.primaryCta,
      template: kit.overlayTemplate,
    },
  };
}

export function toPublicMarketingBrandSummary(kit: Awaited<ReturnType<typeof resolveDefaultMarketingBrandKit>>) {
  return {
    id: kit.id,
    brandName: kit.brandName,
    domain: kit.domain,
    primaryCta: kit.primaryCta,
    toneOfVoice: kit.toneOfVoice,
    primaryColor: kit.primaryColor,
    secondaryColor: kit.secondaryColor,
    accentColor: kit.accentColor,
    logoUrl: kit.logoUrl,
    overlayTemplate: kit.overlayTemplate,
    defaultAspectRatio: kit.defaultAspectRatio,
  };
}

export async function previewMarketingBrandOverlay(input: {
  tenantId: string;
  workspaceId: string;
  hostAppId: string;
  template?: (typeof MARKETING_BRAND_OVERLAY_TEMPLATES)[number];
}) {
  const kit = await resolveDefaultMarketingBrandKit(input);
  const template = input.template ?? kit.overlayTemplate;
  assertTemplate(template);

  return buildMarketingOverlayTemplate({
    template,
    logoUrl: kit.logoUrl,
    primaryColor: kit.primaryColor,
    secondaryColor: kit.secondaryColor,
    accentColor: kit.accentColor,
  });
}

export async function listMarketingAssetVersions(input: { tenantId: string; workspaceId: string; limit?: number }) {
  return listMarketingAssetVersionsByScope(input);
}

export { listMarketingBrandOverlayTemplates, recordMarketingAssetVersion };
