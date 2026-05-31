import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useRealtime } from "@/hooks/useRealtime";
import { trpc } from "@/lib/trpc";
import { hasPlayablePublicAsset } from "@/components/marketing/studio/mediaStatus";
import type { QualityMode } from "@/components/marketing/studio/types";
import { workspaceConfig } from "@/components/marketing/studio/workspaceConfig";
import { useMarketingAppAssetStore, type MarketingAssetRow } from "./MarketingAppAssetStore";
import { MarketingAppSettings } from "./MarketingAppSettings";
import { MarketingAppTopBar, type AppSection, type AppStatus } from "./MarketingAppTopBar";
import { MarketingAppAssetsPanel, MarketingAppBrandPanel, MarketingAppCalendarPanel, MarketingAppCampaignsPanel } from "./MarketingAppPanels";
import {
  getAssetTitle,
  type AssetFilterId,
  type BeastModeRun,
  type BrandKit,
  type MarketingCampaign,
} from "./marketingAppHelpers";
import { StudioHome } from "./studio/StudioHome";

type MediaTask = "text_to_image" | "text_to_video";

const RAW_VIDEO_THRESHOLD_SECONDS = 15;
type RawMediaDecision = {
  allowRaw: boolean;
  requestedDurationSeconds: number;
  reason?: string;
};
type RequestedDurationBucket = "5" | "10" | "15" | "30" | "60" | "180";
type PersistedBrandKitResponse = {
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

function mergeBrandKitState(current: BrandKit, data: PersistedBrandKitResponse | undefined): BrandKit {
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

function toRequestedDurationBucket(seconds: number): RequestedDurationBucket {
  if (seconds <= 5) return "5";
  if (seconds <= 10) return "10";
  if (seconds <= 15) return "15";
  if (seconds <= 30) return "30";
  if (seconds <= 60) return "60";
  return "180";
}

function inferRequestedDurationSeconds(prompt: string): number {
  const lower = prompt.toLowerCase();
  const minuteMatch = lower.match(/(\d{1,2})[\s-]*(minute|minutes|min)\b/);
  if (minuteMatch) return Number(minuteMatch[1]) * 60;
  const secondMatch = lower.match(/(\d{1,3})[\s-]*(second|seconds|sec|secs|s)\b/);
  if (secondMatch) return Number(secondMatch[1]);
  if (/youtube/.test(lower) && /(video|long)/.test(lower)) return 180;
  if (/reel|shorts?|facebook.*ad|instagram|tiktok/.test(lower)) return 30;
  return 10;
}

function requiresAssembly(prompt: string): boolean {
  const lower = prompt.toLowerCase();
  return (
    /3-minute|3 minute|youtube/.test(lower) ||
    /assembled|scene plan|campaign/.test(lower) ||
    /(facebook ad|instagram reel|tiktok|shorts?)/.test(lower)
  );
}

export function shouldQueueRawMediaJob(input: {
  task: MediaTask;
  prompt: string;
  providerMaxRawSeconds?: number;
}): RawMediaDecision {
  if (input.task !== "text_to_video") return { allowRaw: true, requestedDurationSeconds: 0 };
  const requestedDurationSeconds = inferRequestedDurationSeconds(input.prompt);
  const providerMaxRawSeconds = input.providerMaxRawSeconds;
  if (requiresAssembly(input.prompt)) {
    return {
      allowRaw: false,
      requestedDurationSeconds,
      reason: "This request needs an assembled scene plan instead of a single raw AI clip.",
    };
  }
  if (
    requestedDurationSeconds >= RAW_VIDEO_THRESHOLD_SECONDS &&
    (typeof providerMaxRawSeconds !== "number" || providerMaxRawSeconds < requestedDurationSeconds)
  ) {
    return {
      allowRaw: false,
      requestedDurationSeconds,
      reason:
        typeof providerMaxRawSeconds === "number"
          ? `Raw clip limit is ${providerMaxRawSeconds}s for the active provider.`
          : "Raw clip duration support is not confirmed for this provider.",
    };
  }
  if (
    typeof providerMaxRawSeconds === "number" &&
    requestedDurationSeconds > providerMaxRawSeconds
  ) {
    return {
      allowRaw: false,
      requestedDurationSeconds,
      reason: `Raw clip limit is ${providerMaxRawSeconds}s for the active provider.`,
    };
  }
  return { allowRaw: true, requestedDurationSeconds };
}

function SectionErrorCard({ title, onRetry }: { title: string; onRetry: () => void }) {
  return (
    <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-xs">Something failed to load. Please retry.</p>
      <Button type="button" variant="outline" size="sm" className="mt-3 rounded-full" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}

const defaultBrandKit: BrandKit = {
  brandName: workspaceConfig.brandName,
  domain: workspaceConfig.host_app_domain,
  primaryCta: workspaceConfig.primaryCTA,
  toneOfVoice: workspaceConfig.defaultTone,
  primaryColor: "#1e3a5f",
  secondaryColor: "#c5a55a",
  overlayTemplate: "lower_third",
};

function triggerDownload(url: string, filename = "marketing-asset") {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noreferrer";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

export function TheMarketingApp({ onBack }: { onBack?: () => void }) {
  const utils = trpc.useUtils();
  const { subscribe } = useRealtime();
  const workspace = workspaceConfig;

  const [quality, setQuality] = useState<QualityMode>("elite");
  const [activeSection, setActiveSection] = useState<AppSection>("create");
  const [selectedAssetId, setSelectedAssetId] = useState<number | null>(null);
  const [assetFilter, setAssetFilter] = useState<AssetFilterId>("all");
  const [assetSearch, setAssetSearch] = useState("");
  const [assetModalOpen, setAssetModalOpen] = useState(false);
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [campaignForm, setCampaignForm] = useState({
    name: "7-day launch plan",
    goal: "Drive signups from stable owners",
    audience: workspace.defaultAudience,
    channels: "Facebook, Instagram, YouTube Shorts",
    startDate: new Date().toISOString().slice(0, 10),
    durationDays: 7,
  });
  const [brandKit, setBrandKit] = useState<BrandKit>(defaultBrandKit);
  const [beastModeForm, setBeastModeForm] = useState({
    mode: "standard" as "standard" | "elite",
    requestedVariantCount: 10,
    requestedPlatforms: "Facebook, Instagram, TikTok, LinkedIn, YouTube, Email",
    requestedLanguages: "English",
  });

  const assets = trpc.admin.listMediaAssets.useQuery({ tenantId: workspace.tenantId });
  const marketingCampaigns = trpc.admin.listMarketingCampaigns.useQuery({ tenantId: workspace.tenantId, workspaceId: workspace.marketing_workspace_id });
  const selectedCampaignDetails = trpc.admin.getMarketingCampaign.useQuery(
    selectedCampaignId
      ? { id: Number(selectedCampaignId), tenantId: workspace.tenantId, workspaceId: workspace.marketing_workspace_id }
      : undefined as any,
    { enabled: !!selectedCampaignId },
  );
  const beastModeRuns = trpc.admin.listBeastModeRuns.useQuery(
    {
      tenantId: workspace.tenantId,
      workspaceId: workspace.marketing_workspace_id,
      campaignId: selectedCampaignId ? Number(selectedCampaignId) : null,
    },
    { enabled: !!selectedCampaignId },
  );
  const selectedBeastModeRunId = useMemo(() => {
    const runs = (beastModeRuns.data as Array<any> | undefined) ?? [];
    return runs.length ? Number(runs[0].id) : null;
  }, [beastModeRuns.data]);
  const selectedBeastModeRun = trpc.admin.getBeastModeRun.useQuery(
    selectedBeastModeRunId
      ? { id: selectedBeastModeRunId, tenantId: workspace.tenantId, workspaceId: workspace.marketing_workspace_id }
      : undefined as any,
    { enabled: !!selectedBeastModeRunId },
  );
  const scheduleDrafts = trpc.admin.listMarketingScheduleDrafts.useQuery({ tenantId: workspace.tenantId, workspaceId: workspace.marketing_workspace_id });
  const approvals = trpc.admin.listApprovalQueue.useQuery({ tenantId: workspace.tenantId });
  const diagnostics = trpc.admin.getAIDiagnostics.useQuery(undefined, { refetchInterval: 30_000 });
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
  const createMarketingStudioPlan = trpc.admin.createMarketingStudioPlan.useMutation({
    onSuccess: async (data) => {
      const result = data as { capability?: { finalDeliveryMode?: string } };
      const mode = result.capability?.finalDeliveryMode;
      if (mode === "assembled_video") {
        toast.success("Plan created", { description: "This request will be assembled in the media factory." });
      } else {
        toast.success("Plan created");
      }
      await utils.admin.listApprovalQueue.invalidate();
    },
    onError: (error) => {
      toast.error("Could not create studio plan", { description: error.message });
    },
  });

  const deleteMediaAsset = trpc.admin.permanentDeleteMediaAsset.useMutation({
    onSuccess: async () => {
      toast.success("Asset deleted permanently");
      setAssetModalOpen(false);
      setSelectedAssetId(null);
      await utils.admin.listMediaAssets.invalidate();
    },
    onError: (error) => toast.error("Could not delete asset", { description: error.message }),
  });

  const createBrandedMedia = trpc.admin.createBrandedMediaAsset.useMutation({
    onSuccess: async (data: any) => {
      toast.success("Branded asset created");
      if (typeof data?.assetId === "number") setSelectedAssetId(data.assetId);
      await utils.admin.listMediaAssets.invalidate();
    },
    onError: (error) => toast.error("Branding unavailable", { description: error.message }),
  });

  const createCampaignMutation = trpc.admin.createMarketingCampaign.useMutation({
    onSuccess: async (data) => {
      toast.success("Campaign created");
      await utils.admin.listMarketingCampaigns.invalidate();
      if (data?.id) setSelectedCampaignId(String(data.id));
    },
    onError: (error) => toast.error("Could not create campaign", { description: error.message }),
  });
  const generateCampaignPlanMutation = trpc.admin.generateCampaignPlan.useMutation({
    onSuccess: async () => {
      toast.success("7-day plan generated");
      await utils.admin.getMarketingCampaign.invalidate();
      await utils.admin.listMarketingCampaigns.invalidate();
    },
    onError: (error) => toast.error("Could not generate campaign plan", { description: error.message }),
  });
  const generateWeeklyContentPackMutation = trpc.admin.generateWeeklyContentPack.useMutation({
    onSuccess: async () => {
      toast.success("Weekly content pack generated");
      await utils.admin.listMarketingScheduleDrafts.invalidate();
      await utils.admin.getMarketingCampaign.invalidate();
    },
    onError: (error) => toast.error("Could not generate weekly pack", { description: error.message }),
  });
  const attachAssetMutation = trpc.admin.attachAssetToCampaign.useMutation({
    onSuccess: async () => {
      await utils.admin.getMarketingCampaign.invalidate();
    },
  });
  const detachAssetMutation = trpc.admin.detachAssetFromCampaign.useMutation({
    onSuccess: async () => {
      await utils.admin.getMarketingCampaign.invalidate();
    },
  });
  const runQaMutation = trpc.admin.runMarketingQaCheck.useMutation({
    onSuccess: async () => {
      toast.success("QA checklist refreshed");
      await utils.admin.getMarketingCampaign.invalidate();
      await utils.admin.listMarketingReviews.invalidate();
    },
    onError: (error) => toast.error("Could not run QA check", { description: error.message }),
  });
  const approveOutputMutation = trpc.admin.approveMarketingOutput.useMutation({
    onSuccess: async () => {
      toast.success("Output approved");
      await utils.admin.getMarketingCampaign.invalidate();
      await utils.admin.listMarketingReviews.invalidate();
    },
    onError: (error) => toast.error("Could not approve output", { description: error.message }),
  });
  const rejectOutputMutation = trpc.admin.rejectMarketingOutput.useMutation({
    onSuccess: async () => {
      toast.success("Output rejected");
      await utils.admin.getMarketingCampaign.invalidate();
      await utils.admin.listMarketingReviews.invalidate();
    },
    onError: (error) => toast.error("Could not reject output", { description: error.message }),
  });
  const requestChangesMutation = trpc.admin.requestMarketingOutputChanges.useMutation({
    onSuccess: async () => {
      toast.success("Changes requested");
      await utils.admin.getMarketingCampaign.invalidate();
      await utils.admin.listMarketingReviews.invalidate();
    },
    onError: (error) => toast.error("Could not request changes", { description: error.message }),
  });
  const markExportedMutation = trpc.admin.markMarketingOutputExported.useMutation({
    onSuccess: async () => {
      toast.success("Output marked exported");
      await utils.admin.getMarketingCampaign.invalidate();
      await utils.admin.listMarketingReviews.invalidate();
    },
    onError: (error) => toast.error("Could not mark output exported", { description: error.message }),
  });
  const createBeastModeRunMutation = trpc.admin.createBeastModeRun.useMutation({
    onError: (error) => toast.error("Could not start Beast Mode", { description: error.message }),
  });
  const generateBeastModeVariantsMutation = trpc.admin.generateBeastModeVariants.useMutation({
    onSuccess: async (data) => {
      toast.success(`Generated ${(data as any)?.variantIds?.length ?? 0} Beast Mode variants`);
      await utils.admin.listBeastModeRuns.invalidate();
      await utils.admin.getBeastModeRun.invalidate();
    },
    onError: (error) => toast.error("Could not generate Beast Mode variants", { description: error.message }),
  });
  const approveBeastModeVariantMutation = trpc.admin.approveBeastModeVariant.useMutation({
    onSuccess: async () => {
      toast.success("Beast Mode variant approved");
      await utils.admin.getBeastModeRun.invalidate();
      await utils.admin.listMarketingReviews.invalidate();
    },
    onError: (error) => toast.error("Could not approve Beast Mode variant", { description: error.message }),
  });
  const rejectBeastModeVariantMutation = trpc.admin.rejectBeastModeVariant.useMutation({
    onSuccess: async () => {
      toast.success("Beast Mode variant rejected");
      await utils.admin.getBeastModeRun.invalidate();
      await utils.admin.listMarketingReviews.invalidate();
    },
    onError: (error) => toast.error("Could not reject Beast Mode variant", { description: error.message }),
  });
  const requestBeastModeVariantChangesMutation = trpc.admin.requestBeastModeVariantChanges.useMutation({
    onSuccess: async () => {
      toast.success("Changes requested for Beast Mode variant");
      await utils.admin.getBeastModeRun.invalidate();
      await utils.admin.listMarketingReviews.invalidate();
    },
    onError: (error) => toast.error("Could not request Beast Mode changes", { description: error.message }),
  });
  const createBeastModeBatchRenderJobsMutation = trpc.admin.createBeastModeBatchRenderJobs.useMutation({
    onSuccess: async (data) => {
      toast.success(`Queued ${(data as any)?.createdJobIds?.length ?? 0} Beast Mode render job(s)`);
      await utils.admin.getBeastModeRun.invalidate();
      await utils.admin.listMarketingRenderJobs.invalidate();
    },
    onError: (error) => toast.error("Could not queue Beast Mode renders", { description: error.message }),
  });

  const createScheduleDraftsFromCampaignMutation = trpc.admin.createScheduleDraftsFromCampaign.useMutation({
    onSuccess: async (data) => {
      toast.success(`Created ${(data as any)?.createdScheduleDraftIds?.length ?? 0} schedule draft(s)`);
      await utils.admin.listMarketingScheduleDrafts.invalidate();
    },
    onError: (error) => toast.error("Could not create schedule drafts", { description: error.message }),
  });
  const rescheduleScheduleDraftMutation = trpc.admin.rescheduleMarketingScheduleDraft.useMutation({
    onSuccess: async () => {
      toast.success("Draft rescheduled");
      await utils.admin.listMarketingScheduleDrafts.invalidate();
    },
    onError: (error) => toast.error("Could not reschedule draft", { description: error.message }),
  });
  const cancelScheduleDraftMutation = trpc.admin.cancelMarketingScheduleDraft.useMutation({
    onSuccess: async () => {
      toast.success("Draft cancelled");
      await utils.admin.listMarketingScheduleDrafts.invalidate();
    },
    onError: (error) => toast.error("Could not cancel draft", { description: error.message }),
  });
  const exportScheduleDraftPackMutation = trpc.admin.exportScheduleDraftPack.useMutation({
    onSuccess: (data: unknown) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `schedule-export-pack-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Export pack downloaded");
    },
    onError: (error: { message: string }) => toast.error("Could not export pack", { description: error.message }),
  });

  useEffect(() => {
    const data = brandKitQuery.data as PersistedBrandKitResponse | undefined;
    if (!data) return;
    setBrandKit((current) => mergeBrandKitState(current, data));
  }, [brandKitQuery.data]);

  useEffect(() => {
    const rows = (marketingCampaigns.data as Array<any> | undefined) ?? [];
    const mapped: MarketingCampaign[] = rows.map((row) => ({
      id: String(row.id),
      name: String(row.name ?? ""),
      goal: String(row.goal ?? ""),
      audience: String(row.audience ?? ""),
      channels: Array.isArray(row.channels) ? row.channels.map(String) : [],
      startDate: String(row.startDate ?? ""),
      durationDays: Number(row.durationDays ?? 7),
      attachedAssetIds: [],
      status: (row.status ?? "draft"),
      summary: `${row.goal ?? ""} for ${row.audience ?? ""}`.trim(),
      planItems: [],
      createdAt: String(row.createdAt ?? new Date().toISOString()),
      updatedAt: String(row.updatedAt ?? new Date().toISOString()),
    }));
    setCampaigns(mapped);
  }, [marketingCampaigns.data]);

  useEffect(() => {
    const unsubscribe = subscribe("marketing-app", (event) => {
      const name = String((event as { type?: string }).type ?? "");
      if (name.includes("media") || name.includes("asset")) {
        void utils.admin.listMediaAssets.invalidate();
      }
    });
    return unsubscribe;
  }, [subscribe, utils.admin.listMediaAssets]);

  const allAssets = useMemo(() => ((assets.data as MarketingAssetRow[] | undefined) ?? []), [assets.data]);
  const assetStore = useMarketingAppAssetStore({ assets: allAssets, selectedAssetId, showDeleted: false });
  const completedAssets = useMemo(() => allAssets.filter((asset) => hasPlayablePublicAsset(asset)), [allAssets]);
  const logoAssets = useMemo(
    () =>
      completedAssets
        .filter((asset) => asset.type === "image")
        .map((asset) => ({ id: asset.id, label: getAssetTitle(asset) })),
    [completedAssets],
  );
  const allowedOverlayTemplates: BrandKit["overlayTemplate"][] = [
    "lower_third",
    "corner_logo",
    "end_card",
    "social_reel",
    "youtube_landscape",
  ];
  const overlayTemplates = useMemo(
    () => {
      const values = (overlayTemplatesQuery.data as string[] | undefined) ?? [];
      const filtered = values.filter((template): template is BrandKit["overlayTemplate"] =>
        allowedOverlayTemplates.includes(template as BrandKit["overlayTemplate"]),
      );
      return filtered.length ? filtered : allowedOverlayTemplates;
    },
    [overlayTemplatesQuery.data],
  );

  useEffect(() => {
    if (!selectedAssetId && assetStore.latestGeneratedAsset?.id && typeof assetStore.latestGeneratedAsset.id === "number") {
      setSelectedAssetId(assetStore.latestGeneratedAsset.id);
    }
  }, [assetStore.latestGeneratedAsset, selectedAssetId]);

  const selectedAsset = assetStore.selectedAsset;
  const selectedCampaign = useMemo(
    () => {
      const base = campaigns.find((campaign) => campaign.id === selectedCampaignId) ?? null;
      const detail = selectedCampaignDetails.data as any;
      if (!base || !detail) return base;
      const planItems = ((detail.items as Array<any> | undefined) ?? []).map((item) => {
        const metadata = (item.metadata as Record<string, unknown> | undefined) ?? {};
        return {
          id: String(item.id),
          dayOffset: 0,
          title: String(item.title ?? ""),
          channel: String(item.platform ?? "General"),
          format: ((item.type === "video" || item.type === "image") ? item.type : "text") as "video" | "image" | "text",
          objective: String(item.content ?? item.prompt ?? ""),
          status: String(item.status ?? "export_only") as "draft" | "approved" | "export_only",
          reviewStatus: String(item.reviewStatus ?? "needs_review") as "needs_review" | "approved" | "rejected" | "changes_requested" | "blocked" | "exported",
          reviewReason: String(metadata.reviewReason ?? "") || null,
          qaChecklist: Array.isArray(metadata.reviewChecklist)
            ? (metadata.reviewChecklist as unknown[]).map((entry) => String(entry))
            : [],
          exported: Boolean((item as Record<string, unknown>).exported ?? item.reviewStatus === "exported"),
          generationMode: metadata.generationMode === "model" ? "model" as const : "fallback" as const,
          provider: typeof metadata.provider === "string" ? metadata.provider : null,
          model: typeof metadata.model === "string" ? metadata.model : null,
          routeReason: typeof metadata.routeReason === "string" ? metadata.routeReason : "",
          fallbackReason: typeof metadata.fallbackReason === "string" ? metadata.fallbackReason : null,
          providerStatus: (metadata.providerStatus === "setup_needed" || metadata.providerStatus === "provider_unavailable"
            ? metadata.providerStatus
            : "ready") as "ready" | "provider_unavailable" | "setup_needed",
        };
      });
      const attachedAssetIds = ((detail.assets as Array<any> | undefined) ?? [])
        .map((asset) => Number(asset.mediaAssetId))
        .filter((assetId) => Number.isFinite(assetId));
      return { ...base, planItems, attachedAssetIds };
    },
    [campaigns, selectedCampaignDetails.data, selectedCampaignId],
  );
  const beastModeRunList = useMemo(
    () => (
      (((beastModeRuns.data as Array<any> | undefined) ?? []).map((run) => ({
        id: String(run.id),
        name: String(run.name ?? "Beast Mode run"),
        mode: String(run.mode ?? "standard"),
        status: String(run.status ?? "draft"),
        requestedVariantCount: Number(run.requestedVariantCount ?? 0),
        requestedLanguages: Array.isArray(run.requestedLanguages) ? run.requestedLanguages.map((entry: unknown) => String(entry)) : [],
        requestedPlatforms: Array.isArray(run.requestedPlatforms) ? run.requestedPlatforms.map((entry: unknown) => String(entry)) : [],
        summary: ((run.summary as Record<string, unknown> | undefined) ?? null) as BeastModeRun["summary"],
        variants: [],
      })) as BeastModeRun[])
    ),
    [beastModeRuns.data],
  );
  const selectedBeastModeRunData = useMemo(
    () => {
      const detail = selectedBeastModeRun.data as any;
      if (!detail) return null;
      return {
        id: String(detail.id),
        name: String(detail.name ?? "Beast Mode run"),
        mode: String(detail.mode ?? "standard"),
        status: String(detail.status ?? "draft"),
        requestedVariantCount: Number(detail.requestedVariantCount ?? 0),
        requestedLanguages: Array.isArray(detail.requestedLanguages) ? detail.requestedLanguages.map((entry: unknown) => String(entry)) : [],
        requestedPlatforms: Array.isArray(detail.requestedPlatforms) ? detail.requestedPlatforms.map((entry: unknown) => String(entry)) : [],
        summary: ((detail.summary as Record<string, unknown> | undefined) ?? null) as BeastModeRun["summary"],
        variants: ((detail.variants as Array<any> | undefined) ?? []).map((variant) => {
          const metadata = (variant.metadata as Record<string, unknown> | undefined) ?? {};
          return {
            id: String(variant.id),
            platform: String(variant.platform ?? ""),
            contentType: String(variant.contentType ?? ""),
            language: String(variant.language ?? "English"),
            hook: String(variant.hook ?? ""),
            body: String(variant.body ?? ""),
            cta: String(variant.cta ?? ""),
            reviewStatus: String(variant.reviewStatus ?? "needs_review"),
            renderJobId: typeof variant.renderJobId === "number" ? variant.renderJobId : null,
            hasStudioPlan: Boolean(variant.studioPlan),
            generationMode: metadata.generationMode === "model" ? "model" as const : "fallback" as const,
            provider: typeof metadata.provider === "string" ? metadata.provider : null,
            model: typeof metadata.model === "string" ? metadata.model : null,
            routeReason: typeof metadata.routeReason === "string" ? metadata.routeReason : "",
            fallbackReason: typeof metadata.fallbackReason === "string" ? metadata.fallbackReason : null,
            providerStatus: (metadata.providerStatus === "setup_needed" || metadata.providerStatus === "provider_unavailable"
              ? metadata.providerStatus
              : "ready") as "ready" | "provider_unavailable" | "setup_needed",
          };
        }),
      } as BeastModeRun;
    },
    [selectedBeastModeRun.data],
  );

  const providerHealthSummary = useMemo(() => {
    const providerRows = (((diagnostics.data as { providerHealth?: Array<{ liveReady?: boolean }> } | undefined)?.providerHealth) ?? []);
    if (!providerRows.length) return { label: "Unknown", tone: "warn" as const };
    const liveCount = providerRows.filter((row) => row.liveReady).length;
    if (liveCount === providerRows.length) return { label: "All live", tone: "ok" as const };
    if (liveCount > 0) return { label: `${liveCount}/${providerRows.length} live`, tone: "warn" as const };
    return { label: "Setup needed", tone: "error" as const };
  }, [diagnostics.data]);

  const appStatus = useMemo((): AppStatus => {
    if (createMarketingStudioPlan.isPending) return "generating";
    if (((approvals.data as unknown[]) ?? []).length) return "needs_approval";
    return "ready";
  }, [approvals.data, createMarketingStudioPlan.isPending]);

  const canApplyBrand = Boolean(
    selectedAsset &&
    typeof selectedAsset.id === "number" &&
    hasPlayablePublicAsset({ publicUrl: selectedAsset.publicUrl, mimeType: selectedAsset.mimeType }),
  );
  const createSectionHasError = createMarketingStudioPlan.isError || diagnostics.isError;
  const assetsSectionHasError = assets.isError;
  const campaignsSectionHasError = marketingCampaigns.isError || selectedCampaignDetails.isError;
  const calendarSectionHasError = scheduleDrafts.isError;

  function handleDeleteAsset(assetId: number) {
    if (!window.confirm("Delete this asset permanently? This cannot be undone.")) return;
    deleteMediaAsset.mutate({ id: assetId });
  }

  function handleRegenerateAsset() {
    toast.info("Regeneration is disabled for this flow. Use guided Studio planning.");
  }

  function handleCopyUrl(url: string) {
    void navigator.clipboard.writeText(url);
    toast.success("URL copied");
  }

  function handleCreateCampaign() {
    if (!campaignForm.name.trim() || !campaignForm.goal.trim() || !campaignForm.audience.trim()) {
      toast.error("Complete the campaign brief first");
      return;
    }

    createCampaignMutation.mutate({
      tenantId: workspace.tenantId,
      workspaceId: workspace.marketing_workspace_id,
      hostAppId: workspace.host_app_id,
      name: campaignForm.name.trim(),
      goal: campaignForm.goal.trim(),
      audience: campaignForm.audience.trim(),
      channels: campaignForm.channels.split(",").map((value) => value.trim()).filter(Boolean),
      startDate: campaignForm.startDate,
      durationDays: campaignForm.durationDays,
    });
  }

  function handleGenerateSevenDayPlan(campaignId: string) {
    generateCampaignPlanMutation.mutate({
      campaignId: Number(campaignId),
      tenantId: workspace.tenantId,
      workspaceId: workspace.marketing_workspace_id,
    });
  }

  function handleGenerateWeeklyPack(campaignId: string) {
    generateWeeklyContentPackMutation.mutate({
      campaignId: Number(campaignId),
      tenantId: workspace.tenantId,
      workspaceId: workspace.marketing_workspace_id,
    });
  }

  function handleToggleAttachedAsset(campaignId: string, assetId: number) {
    if (!selectedCampaign) return;
    const attached = selectedCampaign.attachedAssetIds.includes(assetId);
    if (attached) {
      detachAssetMutation.mutate({ campaignId: Number(campaignId), mediaAssetId: assetId });
      return;
    }
    attachAssetMutation.mutate({ campaignId: Number(campaignId), mediaAssetId: assetId });
  }

  function handleExportCampaign(campaignId: string) {
    utils.admin.exportCampaignPack.fetch({
      campaignId: Number(campaignId),
      tenantId: workspace.tenantId,
      workspaceId: workspace.marketing_workspace_id,
      includeMarkdown: true,
    }).then((pack) => {
      const data = typeof (pack as any).markdown === "string"
        ? (pack as any).markdown
        : JSON.stringify(pack, null, 2);
      triggerDownload(`data:text/plain;charset=utf-8,${encodeURIComponent(data)}`, `campaign-${campaignId}.txt`);
      toast.success("Campaign plan ready to export");
    }).catch((error) => {
      toast.error("Could not export campaign", { description: error instanceof Error ? error.message : String(error) });
    });
  }

  function handleRunCampaignItemQa(campaignItemId: string) {
    runQaMutation.mutate({
      tenantId: workspace.tenantId,
      workspaceId: workspace.marketing_workspace_id,
      hostAppId: workspace.host_app_id,
      targetType: "campaign_item",
      targetId: campaignItemId,
    });
  }

  function handleApproveCampaignItem(campaignItemId: string) {
    approveOutputMutation.mutate({
      tenantId: workspace.tenantId,
      workspaceId: workspace.marketing_workspace_id,
      hostAppId: workspace.host_app_id,
      targetType: "campaign_item",
      targetId: campaignItemId,
    });
  }

  function handleRejectCampaignItem(campaignItemId: string, reason: string) {
    if (!reason.trim()) {
      toast.error("Reason is required");
      return;
    }
    rejectOutputMutation.mutate({
      tenantId: workspace.tenantId,
      workspaceId: workspace.marketing_workspace_id,
      hostAppId: workspace.host_app_id,
      targetType: "campaign_item",
      targetId: campaignItemId,
      reason,
    });
  }

  function handleRequestCampaignItemChanges(campaignItemId: string, reason: string) {
    if (!reason.trim()) {
      toast.error("Reason is required");
      return;
    }
    requestChangesMutation.mutate({
      tenantId: workspace.tenantId,
      workspaceId: workspace.marketing_workspace_id,
      hostAppId: workspace.host_app_id,
      targetType: "campaign_item",
      targetId: campaignItemId,
      reason,
    });
  }

  function parseCommaSeparatedValues(value: string) {
    return value.split(",").map((entry) => entry.trim()).filter(Boolean);
  }

  function handleGenerateBeastMode(campaignId: string) {
    const requestedPlatforms = parseCommaSeparatedValues(beastModeForm.requestedPlatforms);
    const requestedLanguages = parseCommaSeparatedValues(beastModeForm.requestedLanguages);
    if (!requestedPlatforms.length || !requestedLanguages.length) {
      toast.error("Select Beast Mode platforms and languages first");
      return;
    }
    createBeastModeRunMutation.mutate({
      tenantId: workspace.tenantId,
      workspaceId: workspace.marketing_workspace_id,
      hostAppId: workspace.host_app_id,
      campaignId: Number(campaignId),
      name: `${selectedCampaign?.name ?? campaignForm.name} Beast Mode`,
      goal: selectedCampaign?.goal ?? campaignForm.goal,
      audience: selectedCampaign?.audience ?? campaignForm.audience,
      mode: beastModeForm.mode,
      requestedVariantCount: beastModeForm.requestedVariantCount,
      requestedPlatforms: requestedPlatforms as Array<"Facebook" | "Instagram" | "TikTok" | "LinkedIn" | "YouTube" | "Email" | "Blog / SEO">,
      requestedLanguages: requestedLanguages as Array<"English" | "Afrikaans" | "Zulu" | "French" | "Spanish" | "German" | "Portuguese">,
    }, {
      onSuccess: (data) => {
        generateBeastModeVariantsMutation.mutate({
          runId: Number((data as any).id),
          tenantId: workspace.tenantId,
          workspaceId: workspace.marketing_workspace_id,
          hostAppId: workspace.host_app_id,
        });
      },
    });
  }

  function handleApproveBeastModeVariant(variantId: string) {
    approveBeastModeVariantMutation.mutate({
      id: Number(variantId),
      tenantId: workspace.tenantId,
      workspaceId: workspace.marketing_workspace_id,
      hostAppId: workspace.host_app_id,
    });
  }

  function handleRejectBeastModeVariant(variantId: string, reason: string) {
    if (!reason.trim()) {
      toast.error("Reason is required");
      return;
    }
    rejectBeastModeVariantMutation.mutate({
      id: Number(variantId),
      tenantId: workspace.tenantId,
      workspaceId: workspace.marketing_workspace_id,
      hostAppId: workspace.host_app_id,
      reason,
    });
  }

  function handleRequestBeastModeVariantChanges(variantId: string, reason: string) {
    if (!reason.trim()) {
      toast.error("Reason is required");
      return;
    }
    requestBeastModeVariantChangesMutation.mutate({
      id: Number(variantId),
      tenantId: workspace.tenantId,
      workspaceId: workspace.marketing_workspace_id,
      hostAppId: workspace.host_app_id,
      reason,
    });
  }

  function handleCreateBeastModeRenderJobs(runId: string, variantIds: string[]) {
    createBeastModeBatchRenderJobsMutation.mutate({
      runId: Number(runId),
      tenantId: workspace.tenantId,
      workspaceId: workspace.marketing_workspace_id,
      hostAppId: workspace.host_app_id,
      maxRenderJobs: 5,
      variantIds: variantIds.map((id) => Number(id)).filter((id) => Number.isFinite(id)),
    });
  }

  function handleExportBeastModePack(runId: string) {
    utils.admin.exportBeastModePack.fetch({
      runId: Number(runId),
      tenantId: workspace.tenantId,
      workspaceId: workspace.marketing_workspace_id,
      hostAppId: workspace.host_app_id,
      includeRejected: false,
    }).then((pack) => {
      const data = typeof (pack as any).markdown === "string"
        ? (pack as any).markdown
        : JSON.stringify(pack, null, 2);
      triggerDownload(`data:text/plain;charset=utf-8,${encodeURIComponent(data)}`, `beast-mode-${runId}.md`);
      toast.success("Beast Mode pack ready to export");
    }).catch((error) => {
      toast.error("Could not export Beast Mode pack", { description: error instanceof Error ? error.message : String(error) });
    });
  }

  function handleSaveBrandKit() {
    upsertBrandKitMutation.mutate({
      tenantId: workspace.tenantId,
      workspaceId: workspace.marketing_workspace_id,
      hostAppId: workspace.host_app_id,
      brandName: brandKit.brandName,
      domain: brandKit.domain,
      primaryCta: brandKit.primaryCta,
      toneOfVoice: brandKit.toneOfVoice,
      primaryColor: brandKit.primaryColor,
      secondaryColor: brandKit.secondaryColor,
      overlayTemplate: brandKit.overlayTemplate,
      logoAssetId: brandKit.logoAssetId ?? null,
      logoUrl: brandKit.logoUrl ?? null,
    });
  }

  function handleSelectLogoAsset(mediaAssetId: number) {
    selectBrandLogoMutation.mutate({
      tenantId: workspace.tenantId,
      workspaceId: workspace.marketing_workspace_id,
      hostAppId: workspace.host_app_id,
      mediaAssetId,
    });
  }

  function handleApplyBrand() {
    if (!canApplyBrand || typeof selectedAsset?.id !== "number") return;
    createBrandedMedia.mutate({
      rawAssetId: selectedAsset.id,
      domainText: brandKit.domain,
      ctaText: brandKit.primaryCta,
      watermarkText: brandKit.brandName,
      aspectRatio: "16:9",
    });
  }

  function handleMarkCampaignItemExported(campaignItemId: string) {
    markExportedMutation.mutate({
      tenantId: workspace.tenantId,
      workspaceId: workspace.marketing_workspace_id,
      hostAppId: workspace.host_app_id,
      targetType: "campaign_item",
      targetId: campaignItemId,
    });
  }

  return (
    <main className="min-h-screen bg-[#f7f5f0] px-3 py-4 md:px-6 md:py-6" aria-label="The Marketing App">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="w-fit rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-600 hover:bg-stone-50"
          >
            Back
          </button>
        ) : null}

        <MarketingAppTopBar
          quality={quality}
          activeSection={activeSection}
          appStatus={appStatus}
          providerHealth={providerHealthSummary}
          onQualityChange={setQuality}
          onSectionChange={setActiveSection}
        />

        {activeSection === "create" ? (
          createSectionHasError ? (
            <SectionErrorCard
              title="Create is temporarily unavailable."
              onRetry={() => {
                void diagnostics.refetch();
                void utils.admin.listApprovalQueue.invalidate();
              }}
            />
          ) : (
            <StudioHome
              tenantId={workspace.tenantId}
              workspaceId={workspace.marketing_workspace_id}
              hostAppId={workspace.host_app_id}
              onWorkbenchDone={(plan) => {
                createMarketingStudioPlan.mutate({
                  tenantId: workspace.tenantId,
                  workspaceId: workspace.marketing_workspace_id,
                  hostAppId: workspace.host_app_id,
                  originalUserPrompt: plan.originalUserPrompt || `${plan.contentType} for ${plan.platform}`,
                  contentType: plan.contentType,
                  platform: plan.platform,
                  requestedDurationSeconds: plan.durationTargetSeconds,
                  qualityMode: quality,
                  brief: plan.brief,
                  audience: plan.audience,
                  goal: plan.goal,
                  script: plan.script,
                  scenes: plan.scenes,
                });
              }}
            />
          )
        ) : null}

        {activeSection === "assets" ? (
          assetsSectionHasError ? (
            <SectionErrorCard title="Assets failed to load." onRetry={() => void assets.refetch()} />
          ) : (
            <MarketingAppAssetsPanel
              assets={allAssets}
              activeFilter={assetFilter}
              searchTerm={assetSearch}
              selectedAssetId={selectedAssetId}
              onFilterChange={setAssetFilter}
              onSearchChange={setAssetSearch}
              onSelectAsset={(assetId) => {
                setSelectedAssetId(assetId);
                setAssetModalOpen(true);
              }}
              onDeleteAsset={handleDeleteAsset}
              onRegenerateAsset={handleRegenerateAsset}
              onDownloadAsset={(url) => triggerDownload(url, "marketing-asset")}
              onCreateBrandedAsset={(assetId) =>
                createBrandedMedia.mutate({
                  rawAssetId: assetId,
                  domainText: brandKit.domain,
                  ctaText: brandKit.primaryCta,
                  watermarkText: brandKit.brandName,
                  aspectRatio: "16:9",
                })
              }
              onCopyUrl={handleCopyUrl}
              canRegenerate={false}
              canCreateBranded={false}
            />
          )
        ) : null}

        {activeSection === "campaigns" ? (
          campaignsSectionHasError ? (
            <SectionErrorCard
              title="Campaigns failed to load."
              onRetry={() => {
                void marketingCampaigns.refetch();
                if (selectedCampaignId) void selectedCampaignDetails.refetch();
              }}
            />
          ) : (
            <MarketingAppCampaignsPanel
              form={campaignForm}
              campaigns={campaigns}
              selectedCampaign={selectedCampaign}
              assets={allAssets}
              beastMode={{
                form: beastModeForm,
                selectedRun: selectedBeastModeRunData,
                runs: beastModeRunList,
                onFormChange: (patch) => setBeastModeForm((current) => ({ ...current, ...patch })),
                onGenerate: handleGenerateBeastMode,
                onApproveVariant: handleApproveBeastModeVariant,
                onRejectVariant: handleRejectBeastModeVariant,
                onRequestVariantChanges: handleRequestBeastModeVariantChanges,
                onCreateRenderJobs: handleCreateBeastModeRenderJobs,
                onExportPack: handleExportBeastModePack,
              }}
              onFormChange={(patch) => setCampaignForm((current) => ({ ...current, ...patch }))}
              onCreateCampaign={handleCreateCampaign}
              onSelectCampaign={setSelectedCampaignId}
              onGenerateSevenDayPlan={handleGenerateSevenDayPlan}
              onGenerateWeeklyPack={handleGenerateWeeklyPack}
              onToggleAttachedAsset={handleToggleAttachedAsset}
              onExportCampaign={handleExportCampaign}
              onRunQa={handleRunCampaignItemQa}
              onApproveItem={handleApproveCampaignItem}
              onRejectItem={handleRejectCampaignItem}
              onRequestChanges={handleRequestCampaignItemChanges}
              onMarkItemExported={handleMarkCampaignItemExported}
              onCreateScheduleFromCampaign={(campaignId) => {
                createScheduleDraftsFromCampaignMutation.mutate({
                  tenantId: workspace.tenantId,
                  workspaceId: workspace.marketing_workspace_id,
                  campaignId: Number(campaignId),
                });
              }}
            />
          )
        ) : null}

        {activeSection === "calendar" ? (
          calendarSectionHasError ? (
            <SectionErrorCard title="Calendar failed to load." onRetry={() => void scheduleDrafts.refetch()} />
          ) : (
            <MarketingAppCalendarPanel
              campaigns={campaigns}
              scheduleDrafts={((scheduleDrafts.data as Array<any> | undefined) ?? []).map((item) => ({
                id: Number(item.id),
                title: String(item.title ?? ""),
                channel: String(item.platform ?? "General"),
                platform: String(item.platform ?? "General"),
                status: String(item.status ?? "draft"),
                reviewStatus: String(item.reviewStatus ?? "needs_review"),
                scheduledFor: String(item.scheduledFor ?? new Date().toISOString()),
                campaignId: typeof item.campaignId === "number" ? item.campaignId : null,
                campaignItemId: typeof item.campaignItemId === "number" ? item.campaignItemId : null,
              }))}
              onReschedule={(draftId, newDate) => {
                rescheduleScheduleDraftMutation.mutate({
                  id: draftId,
                  tenantId: workspace.tenantId,
                  scheduledFor: newDate,
                  reason: "Manual reschedule via calendar UI",
                });
              }}
              onCancel={(draftId) => {
                cancelScheduleDraftMutation.mutate({ id: draftId, tenantId: workspace.tenantId });
              }}
              onExportPack={() => {
                exportScheduleDraftPackMutation.mutate({
                  tenantId: workspace.tenantId,
                  workspaceId: workspace.marketing_workspace_id,
                });
              }}
            />
          )
        ) : null}

        {activeSection === "brand" ? (
          <MarketingAppBrandPanel
            brandKit={brandKit}
            canApplyBrand={canApplyBrand}
            selectedAssetName={selectedAsset ? getAssetTitle(selectedAsset) : null}
            logoAssets={logoAssets}
            overlayTemplates={overlayTemplates}
            selectedLogoAssetId={brandKit.logoAssetId ?? null}
            isSaving={upsertBrandKitMutation.isPending || selectBrandLogoMutation.isPending}
            onBrandKitChange={(patch) => setBrandKit((current) => ({ ...current, ...patch }))}
            onSaveBrandKit={handleSaveBrandKit}
            onSelectLogoAsset={handleSelectLogoAsset}
            onApplyBrand={handleApplyBrand}
          />
        ) : null}

        {activeSection === "settings" ? <MarketingAppSettings quality={quality} onQualityChange={setQuality} tenantId={workspace.tenantId} workspaceId={workspace.marketing_workspace_id} /> : null}
      </div>

      <Dialog open={assetModalOpen} onOpenChange={setAssetModalOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selectedAsset ? getAssetTitle(selectedAsset) : "Asset preview"}</DialogTitle>
          </DialogHeader>
          {selectedAsset ? (
            <div className="space-y-4">
              <div className="overflow-hidden rounded-3xl border border-stone-200 bg-stone-50 p-3">
                {selectedAsset.publicUrl && String(selectedAsset.mimeType ?? "").startsWith("image/") ? (
                  <img src={selectedAsset.publicUrl} alt={getAssetTitle(selectedAsset)} className="w-full object-contain" />
                ) : selectedAsset.publicUrl && String(selectedAsset.mimeType ?? "").startsWith("video/") ? (
                  <video src={selectedAsset.publicUrl} className="w-full object-contain" controls aria-label={getAssetTitle(selectedAsset)} />
                ) : (
                  <div className="flex min-h-[240px] items-center justify-center text-sm text-stone-500">
                    Preview unavailable for this asset type.
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedAsset.publicUrl ? (
                  <a href={selectedAsset.publicUrl} target="_blank" rel="noreferrer" className="rounded-full border border-stone-200 px-3 py-1.5 text-sm text-stone-700 hover:bg-stone-50">
                    Open
                  </a>
                ) : null}
                {selectedAsset.publicUrl ? (
                  <button type="button" className="rounded-full border border-stone-200 px-3 py-1.5 text-sm text-stone-700 hover:bg-stone-50" onClick={() => triggerDownload(selectedAsset.publicUrl!, `asset-${selectedAsset.id ?? "export"}`)}>
                    Download
                  </button>
                ) : null}
                {typeof selectedAsset.id === "number" ? (
                  <button type="button" className="rounded-full border border-stone-200 px-3 py-1.5 text-sm text-stone-700 hover:bg-stone-50" onClick={() => handleDeleteAsset(selectedAsset.id)}>
                    Delete permanently
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </main>
  );
}
