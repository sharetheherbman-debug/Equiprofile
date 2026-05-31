import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import type { BrandKit } from "../marketingAppHelpers";
import type { MarketingWorkspaceConfig } from "./useMarketingWorkspaceConfig.types";

export type PersistedBrandKitResponse = {
  brandName?: string;
  domain?: string;
  primaryCta?: string;
  toneOfVoice?: string;
  primaryColor?: string;
  secondaryColor?: string;
  overlayTemplate?: BrandKit["overlayTemplate"];
  logoAssetId?: number | null;
  logoUrl?: string | null;
};

export function mergeBrandKitState(current: BrandKit, data: PersistedBrandKitResponse | undefined): BrandKit {
  if (!data) return current;
  return {
    ...current,
    brandName: String(data.brandName ?? current.brandName),
    domain: String(data.domain ?? current.domain),
    primaryCta: String(data.primaryCta ?? current.primaryCta),
    toneOfVoice: String(data.toneOfVoice ?? current.toneOfVoice),
    primaryColor: String(data.primaryColor ?? current.primaryColor),
    secondaryColor: String(data.secondaryColor ?? current.secondaryColor),
    overlayTemplate: (data.overlayTemplate ?? current.overlayTemplate) as BrandKit["overlayTemplate"],
    logoAssetId: typeof data.logoAssetId === "number" ? data.logoAssetId : current.logoAssetId ?? null,
    logoUrl: typeof data.logoUrl === "string" ? data.logoUrl : current.logoUrl ?? null,
  };
}

export function createDefaultBrandKit(workspace: MarketingWorkspaceConfig): BrandKit {
  return {
    brandName: workspace.brandName,
    domain: workspace.host_app_domain,
    primaryCta: workspace.primaryCTA,
    toneOfVoice: workspace.defaultTone,
    primaryColor: "#1e3a5f",
    secondaryColor: "#c5a55a",
    overlayTemplate: "lower_third",
  };
}

const allowedOverlayTemplates: BrandKit["overlayTemplate"][] = [
  "lower_third",
  "corner_logo",
  "end_card",
  "social_reel",
  "youtube_landscape",
];

export function useMarketingBrandKit(workspace: MarketingWorkspaceConfig) {
  const utils = trpc.useUtils();
  const [brandKit, setBrandKit] = useState<BrandKit>(() => createDefaultBrandKit(workspace));

  const brandKitQuery = trpc.admin.getMarketingBrandKit.useQuery({
    tenantId: workspace.tenantId,
    workspaceId: workspace.marketing_workspace_id,
    hostAppId: workspace.host_app_id,
  });
  const overlayTemplatesQuery = trpc.admin.listMarketingBrandOverlayTemplates.useQuery();

  const upsertBrandKitMutation = trpc.admin.upsertMarketingBrandKit.useMutation({
    onSuccess: async (data) => {
      setBrandKit((current) => mergeBrandKitState(current, data as PersistedBrandKitResponse));
      await utils.admin.getMarketingBrandKit.invalidate();
      toast.success("Brand Kit saved");
    },
    onError: (error) => toast.error("Could not save Brand Kit", { description: error.message }),
  });

  const selectBrandLogoMutation = trpc.admin.selectMarketingBrandLogoAsset.useMutation({
    onSuccess: async (data) => {
      setBrandKit((current) => mergeBrandKitState(current, data as PersistedBrandKitResponse));
      await utils.admin.getMarketingBrandKit.invalidate();
      toast.success("Brand logo selected");
    },
    onError: (error) => toast.error("Could not select logo", { description: error.message }),
  });

  useEffect(() => {
    const data = brandKitQuery.data as PersistedBrandKitResponse | undefined;
    if (!data) return;
    setBrandKit((current) => mergeBrandKitState(current, data));
  }, [brandKitQuery.data]);

  const overlayTemplates = useMemo(() => {
    const values = (overlayTemplatesQuery.data as string[] | undefined) ?? [];
    const filtered = values.filter((template): template is BrandKit["overlayTemplate"] =>
      allowedOverlayTemplates.includes(template as BrandKit["overlayTemplate"]),
    );
    return filtered.length ? filtered : allowedOverlayTemplates;
  }, [overlayTemplatesQuery.data]);

  return {
    brandKit,
    setBrandKit,
    overlayTemplates,
    brandKitQuery,
    upsertBrandKitMutation,
    selectBrandLogoMutation,
  };
}
