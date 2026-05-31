import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import type { BeastModeRun, MarketingCampaign } from "../marketingAppHelpers";
import type { MarketingWorkspaceConfig } from "./useMarketingWorkspaceConfig.types";

export function useMarketingCampaigns(workspace: MarketingWorkspaceConfig) {
  const utils = trpc.useUtils();
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
  const [beastModeForm, setBeastModeForm] = useState({
    mode: "standard" as "standard" | "elite",
    requestedVariantCount: 10,
    requestedPlatforms: "Facebook, Instagram, TikTok, LinkedIn, YouTube, Email",
    requestedLanguages: "English",
  });

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
      status: row.status ?? "draft",
      summary: `${row.goal ?? ""} for ${row.audience ?? ""}`.trim(),
      planItems: [],
      createdAt: String(row.createdAt ?? new Date().toISOString()),
      updatedAt: String(row.updatedAt ?? new Date().toISOString()),
    }));
    setCampaigns(mapped);
  }, [marketingCampaigns.data]);

  const selectedCampaign = useMemo(() => {
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
        visualQaStatus: typeof item.visualQaStatus === "string"
          ? item.visualQaStatus
          : typeof metadata.visualQaStatus === "string"
            ? metadata.visualQaStatus
            : null,
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
  }, [campaigns, selectedCampaignDetails.data, selectedCampaignId]);

  const beastModeRunList = useMemo(
    () => (((beastModeRuns.data as Array<any> | undefined) ?? []).map((run) => ({
      id: String(run.id),
      name: String(run.name ?? "Beast Mode run"),
      mode: String(run.mode ?? "standard"),
      status: String(run.status ?? "draft"),
      requestedVariantCount: Number(run.requestedVariantCount ?? 0),
      requestedLanguages: Array.isArray(run.requestedLanguages) ? run.requestedLanguages.map((entry: unknown) => String(entry)) : [],
      requestedPlatforms: Array.isArray(run.requestedPlatforms) ? run.requestedPlatforms.map((entry: unknown) => String(entry)) : [],
      summary: ((run.summary as Record<string, unknown> | undefined) ?? null) as BeastModeRun["summary"],
      variants: [],
    })) as BeastModeRun[]),
    [beastModeRuns.data],
  );

  const selectedBeastModeRunData = useMemo(() => {
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
          visualQaStatus: typeof variant.visualQaStatus === "string"
            ? variant.visualQaStatus
            : typeof metadata.visualQaStatus === "string"
              ? metadata.visualQaStatus
              : null,
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
  }, [selectedBeastModeRun.data]);

  return {
    campaigns,
    selectedCampaignId,
    setSelectedCampaignId,
    campaignForm,
    setCampaignForm,
    beastModeForm,
    setBeastModeForm,
    marketingCampaigns,
    selectedCampaignDetails,
    createCampaignMutation,
    generateCampaignPlanMutation,
    generateWeeklyContentPackMutation,
    attachAssetMutation,
    detachAssetMutation,
    selectedCampaign,
    beastModeRunList,
    selectedBeastModeRunData,
    createBeastModeRunMutation,
    generateBeastModeVariantsMutation,
    createBeastModeBatchRenderJobsMutation,
    createScheduleDraftsFromCampaignMutation,
  };
}
