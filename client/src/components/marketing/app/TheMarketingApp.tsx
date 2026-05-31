import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import type { QualityMode } from "@/components/marketing/studio/types";
import { MarketingAppSettings } from "./MarketingAppSettings";
import { MarketingAppTopBar, type AppSection, type AppStatus } from "./MarketingAppTopBar";
import { MarketingAppAssetsPanel, MarketingAppBrandPanel, MarketingAppCalendarPanel, MarketingAppCampaignsPanel } from "./MarketingAppPanels";
import { getAssetTitle } from "./marketingAppHelpers";
import { StudioHome } from "./studio/StudioHome";
import { useMarketingAssets } from "./hooks/useMarketingAssets";
import { useMarketingBrandKit } from "./hooks/useMarketingBrandKit";
import { useMarketingCalendar } from "./hooks/useMarketingCalendar";
import { useMarketingCampaigns } from "./hooks/useMarketingCampaigns";
import { useMarketingReviewActions } from "./hooks/useMarketingReviewActions";
import { useMarketingWorkspaceConfig } from "./hooks/useMarketingWorkspaceConfig";

type MediaTask = "text_to_image" | "text_to_video";

const RAW_VIDEO_THRESHOLD_SECONDS = 15;
type RawMediaDecision = {
  allowRaw: boolean;
  requestedDurationSeconds: number;
  reason?: string;
};
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
  const workspace = useMarketingWorkspaceConfig();

  const [quality, setQuality] = useState<QualityMode>("elite");
  const [activeSection, setActiveSection] = useState<AppSection>("create");

  const { brandKit, setBrandKit, overlayTemplates, upsertBrandKitMutation, selectBrandLogoMutation } = useMarketingBrandKit(workspace);
  const {
    assets,
    allAssets,
    selectedAsset,
    selectedAssetId,
    setSelectedAssetId,
    assetFilter,
    setAssetFilter,
    assetSearch,
    setAssetSearch,
    assetModalOpen,
    setAssetModalOpen,
    logoAssets,
    deleteMediaAsset,
    createBrandedMedia,
    canApplyBrand,
  } = useMarketingAssets(workspace);
  const {
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
  } = useMarketingCampaigns(workspace);
  const {
    runQaMutation,
    approveOutputMutation,
    rejectOutputMutation,
    requestChangesMutation,
    markExportedMutation,
    approveBeastModeVariantMutation,
    rejectBeastModeVariantMutation,
    requestBeastModeVariantChangesMutation,
  } = useMarketingReviewActions(workspace);
  const {
    scheduleDrafts,
    mappedScheduleDrafts,
    rescheduleScheduleDraftMutation,
    cancelScheduleDraftMutation,
    exportScheduleDraftPackMutation,
  } = useMarketingCalendar(workspace);
  const approvals = trpc.admin.listApprovalQueue.useQuery({ tenantId: workspace.tenantId });
  const diagnostics = trpc.admin.getAIDiagnostics.useQuery(undefined, { refetchInterval: 30_000 });
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
              scheduleDrafts={mappedScheduleDrafts}
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
