import { getMediaAssetById } from "../../growth-engine";
import { getMarketingBrandOverlayTemplate } from "./marketingBrandOverlayTemplateService";
import {
  getMarketingBrandKitRowById,
  getMarketingBrandKitRowByScope,
  insertMarketingBrandKitRow,
  updateMarketingBrandKitRow,
} from "./marketingBrandKitStore";
import type {
  MarketingBrandKitRecord,
  MarketingBrandKitUpsertInput,
  MarketingBrandPublicSummary,
  MarketingRenderOverlayConfig,
} from "./marketingBrandKitTypes";

const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const SAFE_URL = /^https?:\/\//i;
const SAFE_DOMAIN = /^(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/;

const EQUI_PROFILE_DEFAULT_SEED = {
  brandName: "EquiProfile",
  domain: "equiprofile.online",
  primaryCta: "Start your free trial",
  toneOfVoice: "professional, helpful, premium equestrian software",
  primaryColor: "#1e3a5f",
  secondaryColor: "#c5a55a",
  overlayTemplate: "lower_third" as const,
  defaultAspectRatio: "16:9",
};

function buildScopedDefaultSeed(input: { hostAppId: string }) {
  if (input.hostAppId.trim().toLowerCase() === "equiprofile") {
    return EQUI_PROFILE_DEFAULT_SEED;
  }
  const safeHost = input.hostAppId.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  const domainHost = safeHost || "workspace-brand";
  const brandName = (safeHost ? safeHost.replace(/-/g, " ") : "workspace brand")
    .replace(/\b\w/g, (char) => char.toUpperCase());
  return {
    brandName,
    domain: `${domainHost}.app`,
    primaryCta: "Learn more",
    toneOfVoice: "professional and helpful",
    primaryColor: "#1f2937",
    secondaryColor: "#0ea5e9",
    overlayTemplate: "lower_third" as const,
    defaultAspectRatio: "16:9",
  };
}

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function validateColor(value: string | undefined, fallback: string) {
  const candidate = (value ?? "").trim();
  if (!candidate) return fallback;
  return HEX_COLOR.test(candidate) ? candidate : fallback;
}

function sanitizeDomain(value: string | undefined, fallback: string) {
  const trimmed = (value ?? "").trim().replace(/^https?:\/\//i, "").replace(/\/$/, "");
  if (!trimmed) return fallback;
  return SAFE_DOMAIN.test(trimmed) ? trimmed.toLowerCase() : fallback;
}

function sanitizeUrl(value: string | null | undefined): string | null {
  const candidate = (value ?? "").trim();
  if (!candidate) return null;
  return SAFE_URL.test(candidate) ? candidate : null;
}

function sanitizeMetadata(value: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!value) return {};
  const blocked = /secret|token|password|api[_-]?key|private|credential|auth|bearer|jwt|session/i;
  return Object.fromEntries(
    Object.entries(value).filter(([key]) => !blocked.test(key)),
  );
}

function resolveAccentColor(input: string | null | undefined, existing: string | null | undefined): string | null {
  if (input === undefined) return existing ?? null;
  const candidate = (input ?? "").trim();
  if (!candidate) return null;
  if (!HEX_COLOR.test(candidate)) return existing ?? null;
  return candidate;
}

function mapBrandKitRow(row: Awaited<ReturnType<typeof getMarketingBrandKitRowByScope>>): MarketingBrandKitRecord | null {
  if (!row) return null;
  return {
    id: row.id,
    tenantId: row.tenantId,
    workspaceId: row.workspaceId,
    hostAppId: row.hostAppId,
    brandName: row.brandName,
    domain: row.domain,
    tagline: row.tagline,
    primaryCta: row.primaryCta,
    secondaryCta: row.secondaryCta,
    toneOfVoice: row.toneOfVoice,
    targetAudience: row.targetAudience,
    primaryColor: row.primaryColor,
    secondaryColor: row.secondaryColor,
    accentColor: row.accentColor,
    logoAssetId: row.logoAssetId,
    logoUrl: row.logoUrl,
    faviconUrl: row.faviconUrl,
    overlayTemplate: row.overlayTemplate as MarketingBrandKitRecord["overlayTemplate"],
    defaultAspectRatio: row.defaultAspectRatio,
    safeArea: parseJson(row.safeAreaJson, null),
    metadata: parseJson(row.metadataJson, {}),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function buildResolvedValues(
  input: MarketingBrandKitUpsertInput,
  existing: MarketingBrandKitRecord | null,
  defaultSeed: ReturnType<typeof buildScopedDefaultSeed>,
): Required<MarketingBrandKitUpsertInput> {
  return {
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
    hostAppId: input.hostAppId,
    brandName: (input.brandName ?? existing?.brandName ?? defaultSeed.brandName).trim() || defaultSeed.brandName,
    domain: sanitizeDomain(input.domain ?? existing?.domain, defaultSeed.domain),
    tagline: input.tagline ?? existing?.tagline ?? null,
    primaryCta: (input.primaryCta ?? existing?.primaryCta ?? defaultSeed.primaryCta).trim() || defaultSeed.primaryCta,
    secondaryCta: input.secondaryCta ?? existing?.secondaryCta ?? null,
    toneOfVoice: (input.toneOfVoice ?? existing?.toneOfVoice ?? defaultSeed.toneOfVoice).trim() || defaultSeed.toneOfVoice,
    targetAudience: input.targetAudience ?? existing?.targetAudience ?? null,
    primaryColor: validateColor(input.primaryColor ?? existing?.primaryColor, defaultSeed.primaryColor),
    secondaryColor: validateColor(input.secondaryColor ?? existing?.secondaryColor, defaultSeed.secondaryColor),
    accentColor: resolveAccentColor(input.accentColor, existing?.accentColor),
    logoAssetId: input.logoAssetId ?? existing?.logoAssetId ?? null,
    logoUrl: sanitizeUrl(input.logoUrl ?? existing?.logoUrl),
    faviconUrl: sanitizeUrl(input.faviconUrl ?? existing?.faviconUrl),
    overlayTemplate: input.overlayTemplate ?? existing?.overlayTemplate ?? defaultSeed.overlayTemplate,
    defaultAspectRatio: (input.defaultAspectRatio ?? existing?.defaultAspectRatio ?? defaultSeed.defaultAspectRatio).trim() || defaultSeed.defaultAspectRatio,
    safeArea: input.safeArea ?? existing?.safeArea ?? null,
    metadata: sanitizeMetadata(input.metadata ?? existing?.metadata ?? {}),
  };
}

export async function getMarketingBrandKit(input: {
  tenantId: string;
  workspaceId: string;
  hostAppId: string;
}) {
  const row = await getMarketingBrandKitRowByScope(input);
  return mapBrandKitRow(row);
}

export async function resolveDefaultMarketingBrandKit(input: {
  tenantId: string;
  workspaceId: string;
  hostAppId: string;
}) {
  const existing = await getMarketingBrandKit(input);
  if (existing) return existing;
  return upsertMarketingBrandKit({ ...input });
}

export async function upsertMarketingBrandKit(input: MarketingBrandKitUpsertInput) {
  const existing = await getMarketingBrandKit(input);
  const defaultSeed = buildScopedDefaultSeed({ hostAppId: input.hostAppId });
  const resolved = buildResolvedValues(input, existing, defaultSeed);

  if (!resolved.logoUrl && resolved.logoAssetId) {
    const logoAsset = await getMediaAssetById(resolved.logoAssetId).catch(() => null);
    resolved.logoUrl = sanitizeUrl(logoAsset?.publicUrl ?? null);
  }

  if (existing) {
    await updateMarketingBrandKitRow(existing.id, resolved);
    const updated = await getMarketingBrandKit(input);
    if (!updated) throw new Error("Failed to update marketing brand kit");
    return updated;
  }

  const id = await insertMarketingBrandKitRow(resolved);
  const created = await getMarketingBrandKit({
    tenantId: resolved.tenantId,
    workspaceId: resolved.workspaceId,
    hostAppId: resolved.hostAppId,
  });
  if (!created) {
    throw new Error(`Failed to create marketing brand kit ${id}`);
  }
  return created;
}

export async function resetMarketingBrandKitToWorkspaceDefault(input: {
  tenantId: string;
  workspaceId: string;
  hostAppId: string;
}) {
  const defaultSeed = buildScopedDefaultSeed({ hostAppId: input.hostAppId });
  return upsertMarketingBrandKit({
    ...input,
    brandName: defaultSeed.brandName,
    domain: defaultSeed.domain,
    primaryCta: defaultSeed.primaryCta,
    toneOfVoice: defaultSeed.toneOfVoice,
    primaryColor: defaultSeed.primaryColor,
    secondaryColor: defaultSeed.secondaryColor,
    accentColor: null,
    logoAssetId: null,
    logoUrl: null,
    faviconUrl: null,
    overlayTemplate: defaultSeed.overlayTemplate,
    defaultAspectRatio: defaultSeed.defaultAspectRatio,
    safeArea: null,
    metadata: {},
  });
}

export async function selectMarketingBrandLogoAsset(input: {
  tenantId: string;
  workspaceId: string;
  hostAppId: string;
  mediaAssetId: number;
}) {
  const asset = await getMediaAssetById(input.mediaAssetId);
  if (!asset) throw new Error("Media asset not found");
  if (asset.type !== "image") throw new Error("Logo asset must be an image media asset");
  return upsertMarketingBrandKit({
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
    hostAppId: input.hostAppId,
    logoAssetId: asset.id,
    logoUrl: sanitizeUrl(asset.publicUrl) ?? null,
  });
}

export async function buildMarketingRenderOverlayConfig(input: {
  tenantId: string;
  workspaceId: string;
  hostAppId: string;
  brandKitId?: number | null;
  ctaOverride?: string;
}) : Promise<MarketingRenderOverlayConfig> {
  const byId = input.brandKitId ? mapBrandKitRow(await getMarketingBrandKitRowById(input.brandKitId)) : null;
  const kit = (byId && byId.tenantId === input.tenantId && byId.workspaceId === input.workspaceId && byId.hostAppId === input.hostAppId)
    ? byId
    : await resolveDefaultMarketingBrandKit(input);
  const template = getMarketingBrandOverlayTemplate(kit.overlayTemplate);
  const safeArea = kit.safeArea ?? template.safeArea;
  return {
    brandKitId: kit.id,
    overlayTemplate: kit.overlayTemplate,
    brandName: kit.brandName,
    domain: kit.domain,
    cta: input.ctaOverride?.trim() || kit.primaryCta,
    primaryColor: kit.primaryColor,
    secondaryColor: kit.secondaryColor,
    ...(kit.accentColor ? { accentColor: kit.accentColor } : {}),
    ...(kit.logoUrl ? { logoUrl: kit.logoUrl } : {}),
    ...(kit.logoAssetId ? { logoAssetId: kit.logoAssetId } : {}),
    placements: {
      logo: template.logo,
      brandDomain: template.brandDomain,
      cta: template.cta,
    },
    safeArea,
    endCard: {
      enabled: template.endCardEnabled,
      title: kit.tagline?.trim() || kit.brandName,
      cta: input.ctaOverride?.trim() || kit.primaryCta,
      domain: kit.domain,
    },
  };
}

export async function getMarketingBrandPublicSummary(input: {
  tenantId: string;
  workspaceId: string;
  hostAppId: string;
}): Promise<MarketingBrandPublicSummary> {
  const kit = await resolveDefaultMarketingBrandKit(input);
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
  };
}
