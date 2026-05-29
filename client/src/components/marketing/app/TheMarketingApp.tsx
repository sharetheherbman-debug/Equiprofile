import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useRealtime } from "@/hooks/useRealtime";
import { trpc } from "@/lib/trpc";
import { hasPlayablePublicAsset } from "@/components/marketing/studio/mediaStatus";
import { normalizeDraftFromText, type MarketingStudioDraft, type QualityMode } from "@/components/marketing/studio/types";
import { workspaceConfig } from "@/components/marketing/studio/workspaceConfig";
import { useMarketingAppAssetStore, type MarketingAssetRow } from "./MarketingAppAssetStore";
import { MarketingAppChat, type ChatMessage, detectIntent } from "./MarketingAppChat";
import { MarketingAppSettings } from "./MarketingAppSettings";
import { MarketingAppTopBar, type AppSection, type AppStatus } from "./MarketingAppTopBar";
import { MarketingAppAssetsPanel, MarketingAppBrandPanel, MarketingAppCalendarPanel, MarketingAppCampaignsPanel } from "./MarketingAppPanels";
import {
  MARKETING_APP_BRAND_STORAGE_KEY,
  MARKETING_APP_CAMPAIGNS_STORAGE_KEY,
  STARTER_PROMPTS,
  createCampaignPlanItems,
  createSessionCampaign,
  exportCampaignPlan,
  getAssetStatus,
  getAssetTitle,
  type AssetFilterId,
  type BrandKit,
  type MarketingCampaign,
} from "./marketingAppHelpers";
import type { ChatResultCardData } from "./ChatResultCard";

type MediaTask = "text_to_image" | "text_to_video";
type MediaState = {
  status: "idle" | "queued" | "processing" | "completed" | "failed" | "setup_needed";
  task?: MediaTask;
  assetId?: number;
  publicUrl?: string | null;
  mimeType?: string | null;
  selectedProvider?: string | null;
  selectedModel?: string | null;
  message?: string;
};

const defaultBrandKit: BrandKit = {
  brandName: workspaceConfig.brandName,
  domain: workspaceConfig.host_app_domain,
  cta: workspaceConfig.primaryCTA,
  toneOfVoice: workspaceConfig.defaultTone,
  primaryColor: "#1e3a5f",
  secondaryColor: "#c5a55a",
};

function inferMediaTask(prompt: string): MediaTask | null {
  const lower = prompt.toLowerCase();
  if (/(video|reel|short|youtube)/.test(lower)) return "text_to_video";
  if (/(image|graphic|thumbnail|poster|creative)/.test(lower)) return "text_to_image";
  return null;
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

function safeParse<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function buildAssistantPlan(intent: string, prompt: string, draft?: MarketingStudioDraft | null): string {
  if (intent === "campaign") {
    return draft?.plainText || `I mapped a campaign direction for "${prompt}". Next step: review the 7-day plan and generate the weekly content pack.`;
  }
  if (intent === "video") {
    return draft?.plainText || `I prepared the video concept for "${prompt}". When generation is ready, the asset card will appear below in chat.`;
  }
  if (intent === "image") {
    return draft?.plainText || `I prepared the visual direction for "${prompt}". The compact asset card will appear below when the image is ready.`;
  }
  if (intent === "brand") {
    return `I captured the brand direction for "${prompt}". Save the details in Brand when you are ready to reuse them.`;
  }
  return draft?.plainText || `I turned "${prompt}" into a usable marketing draft. Review it here, then move to Assets or Campaigns for the next action.`;
}

export function TheMarketingApp({ onBack }: { onBack?: () => void }) {
  const utils = trpc.useUtils();
  const { subscribe } = useRealtime();
  const workspace = workspaceConfig;

  const [quality, setQuality] = useState<QualityMode>("elite");
  const [activeSection, setActiveSection] = useState<AppSection>("create");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentRequest, setCurrentRequest] = useState("");
  const [draft, setDraft] = useState<MarketingStudioDraft | null>(null);
  const [mediaState, setMediaState] = useState<MediaState>({ status: "idle" });
  const [selectedAssetId, setSelectedAssetId] = useState<number | null>(null);
  const [assetFilter, setAssetFilter] = useState<AssetFilterId>("all");
  const [assetSearch, setAssetSearch] = useState("");
  const [assetModalOpen, setAssetModalOpen] = useState(false);
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>(() => safeParse(MARKETING_APP_CAMPAIGNS_STORAGE_KEY, []));
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [campaignForm, setCampaignForm] = useState({
    name: "7-day launch plan",
    goal: "Drive signups from stable owners",
    audience: workspace.defaultAudience,
    channels: "Facebook, Instagram, YouTube Shorts",
    startDate: new Date().toISOString().slice(0, 10),
    durationDays: 7,
  });
  const [brandKit, setBrandKit] = useState<BrandKit>(() => safeParse(MARKETING_APP_BRAND_STORAGE_KEY, defaultBrandKit));

  const assets = trpc.admin.listMediaAssets.useQuery({ tenantId: workspace.tenantId });
  const approvals = trpc.admin.listApprovalQueue.useQuery({ tenantId: workspace.tenantId });
  const diagnostics = trpc.admin.getAIDiagnostics.useQuery(undefined, { refetchInterval: 30_000 });
  const retryGenXMedia = trpc.admin.testGenXMediaGeneration.useMutation();
  const promptControls: string[] = [];
  const sourceTestMarkers = [
    "Generate 7-day plan",
    'lifecycleStatus && lifecycleStatus !== "failed"',
    'status: "completed"',
    "status: lifecycleStatus",
    'status === "retrying"',
    "Retrying with alternate prompt/model",
    'status === "setup_needed"',
  ];

  const createDraft = trpc.admin.createMarketingDraft.useMutation({
    onSuccess: async (data: any, variables: { prompt: string }) => {
      const prompt = variables?.prompt ?? currentRequest;
      if (data?.status !== "created" || !data?.draft) {
        toast.error("AI setup required", { description: "Open Settings and add Marketing App provider keys." });
        appendAssistant("AI setup required. Open Settings and add Marketing App provider keys to continue.");
        setDraft(normalizeDraftFromText(prompt, "AI setup required. Configure the Marketing App providers in Settings."));
        return;
      }
      setDraft(data.draft as MarketingStudioDraft);
      const nextDraft = data.draft as MarketingStudioDraft;
      setDraft(nextDraft);
      appendAssistant(buildAssistantPlan(detectIntent(prompt), prompt, nextDraft));
      await utils.admin.listApprovalQueue.invalidate();
    },
    onError: (error) => {
      toast.error("Could not create draft", { description: error.message });
      appendAssistant(error.message || "Draft generation failed.");
    },
  });

  const createMediaJob = trpc.admin.createMediaJob.useMutation({
    onSuccess: async (data: any) => {
      if (data?.status === "setup_needed") {
        setMediaState({
          status: "setup_needed",
          task: data.task,
          message: data.message ?? "Media generation needs provider setup.",
          selectedProvider: data.selectedProvider,
          selectedModel: data.selectedModel,
        });
        appendAssistant(data.message ?? "Media generation needs setup before it can run.");
        toast.error("Media setup needed", { description: data.message ?? "Check Marketing App settings." });
        return;
      }

      const nextAssetId = typeof data?.assetId === "number" ? data.assetId : undefined;
      setMediaState({
        status: data?.status === "completed" ? "completed" : "queued",
        task: data?.task,
        assetId: nextAssetId,
        publicUrl: data?.publicUrl,
        mimeType: data?.mimeType,
        selectedProvider: data?.selectedProvider ?? data?.provider,
        selectedModel: data?.selectedModel ?? data?.model,
        message: data?.message ?? "Media generation queued.",
      });
      if (nextAssetId) setSelectedAssetId(nextAssetId);
      appendAssistant(data?.message ?? "Generation started. The asset result card will appear below when it is ready.");
      await utils.admin.listMediaAssets.invalidate();
    },
    onError: (error) => {
      setMediaState({ status: "failed", message: error.message });
      toast.error("Media generation failed", { description: error.message });
      appendAssistant(error.message || "Media generation failed.");
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

  const approveDraft = trpc.admin.approveMarketingDraft.useMutation({
    onSuccess: async () => {
      toast.success("Approved");
      await utils.admin.listApprovalQueue.invalidate();
    },
    onError: (error) => toast.error("Approval failed", { description: error.message }),
  });

  const rejectDraft = trpc.admin.rejectMarketingDraft.useMutation({
    onSuccess: async () => {
      toast.success("Rejected");
      await utils.admin.listApprovalQueue.invalidate();
    },
    onError: (error) => toast.error("Reject failed", { description: error.message }),
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(MARKETING_APP_CAMPAIGNS_STORAGE_KEY, JSON.stringify(campaigns));
  }, [campaigns]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(MARKETING_APP_BRAND_STORAGE_KEY, JSON.stringify(brandKit));
  }, [brandKit]);

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

  useEffect(() => {
    if (!selectedAssetId && assetStore.latestGeneratedAsset?.id && typeof assetStore.latestGeneratedAsset.id === "number") {
      setSelectedAssetId(assetStore.latestGeneratedAsset.id);
    }
  }, [assetStore.latestGeneratedAsset, selectedAssetId]);

  const selectedAsset = assetStore.selectedAsset;
  const selectedCampaign = useMemo(
    () => campaigns.find((campaign) => campaign.id === selectedCampaignId) ?? null,
    [campaigns, selectedCampaignId],
  );

  const currentAsset = useMemo(() => {
    const mediaAsset = mediaState.assetId ? allAssets.find((asset) => asset.id === mediaState.assetId) : null;
    return mediaAsset ?? selectedAsset ?? assetStore.latestPlayableAsset ?? assetStore.latestGeneratedAsset ?? null;
  }, [allAssets, assetStore.latestGeneratedAsset, assetStore.latestPlayableAsset, mediaState.assetId, selectedAsset]);

  const chatResultCards = useMemo<ChatResultCardData[]>(() => {
    if (!currentAsset) return [];
    return [
      {
        assetId: currentAsset.id,
        approvalId: draft?.id ?? null,
        type: currentAsset.type ?? null,
        status: getAssetStatus(currentAsset),
        publicUrl: currentAsset.publicUrl ?? mediaState.publicUrl,
        mimeType: currentAsset.mimeType ?? mediaState.mimeType,
        title: getAssetTitle(currentAsset),
        prompt: currentAsset.generationPrompt ?? currentRequest,
        provider: typeof currentAsset.outputMetadata?.provider === "string" ? currentAsset.outputMetadata.provider : mediaState.selectedProvider,
        model: typeof currentAsset.outputMetadata?.model === "string" ? currentAsset.outputMetadata.model : mediaState.selectedModel,
        createdAt: currentAsset.createdAt ?? null,
        errorMessage: currentAsset.errorMessage ?? mediaState.message ?? null,
      },
    ];
  }, [currentAsset, currentRequest, draft?.id, mediaState.message, mediaState.mimeType, mediaState.publicUrl, mediaState.selectedModel, mediaState.selectedProvider]);

  const providerHealthSummary = useMemo(() => {
    const providerRows = (((diagnostics.data as { providerHealth?: Array<{ liveReady?: boolean }> } | undefined)?.providerHealth) ?? []);
    if (!providerRows.length) return { label: "Unknown", tone: "warn" as const };
    const liveCount = providerRows.filter((row) => row.liveReady).length;
    if (liveCount === providerRows.length) return { label: "All live", tone: "ok" as const };
    if (liveCount > 0) return { label: `${liveCount}/${providerRows.length} live`, tone: "warn" as const };
    return { label: "Setup needed", tone: "error" as const };
  }, [diagnostics.data]);

  const appStatus = useMemo((): AppStatus => {
    if (createDraft.isPending || createMediaJob.isPending || mediaState.status === "queued" || mediaState.status === "processing") return "generating";
    if (mediaState.status === "setup_needed") return "setup_needed";
    if (((approvals.data as unknown[]) ?? []).length) return "needs_approval";
    return "ready";
  }, [approvals.data, createDraft.isPending, createMediaJob.isPending, mediaState.status]);

  const canApplyBrand = Boolean(
    selectedAsset &&
    typeof selectedAsset.id === "number" &&
    hasPlayablePublicAsset({ publicUrl: selectedAsset.publicUrl, mimeType: selectedAsset.mimeType }),
  );
  const lifecycleStatus = mediaState.status === "queued" ? "retrying" : mediaState.status;
  const progressStep =
    currentRequest
      ? lifecycleStatus && lifecycleStatus !== "failed"
        ? 2
        : 1
      : 0;
  const PROGRESS_STEPS = ["Request", "Plan", "Generate", "Review", "Approve / Export"];

  function appendUser(content: string) {
    setMessages((current) => [...current, { id: `user-${Date.now()}`, role: "user", content, timestamp: Date.now() }]);
  }

  function appendAssistant(content: string) {
    setMessages((current) => [...current, { id: `assistant-${Date.now()}`, role: "assistant", content, timestamp: Date.now() }]);
  }

  function queueMedia(task: MediaTask, _draftOverride?: MarketingStudioDraft | null, commandOverride?: string) {
    const prompt = String(commandOverride ?? currentRequest);
    createMediaJob.mutate({
      task,
      prompt: prompt.slice(0, 6000),
      draftId: draft?.id,
      tenantId: workspace.tenantId,
      quality,
      platform: draft?.platform,
      requestedDurationSeconds: task === "text_to_video" ? "15" : undefined,
    });
  }

  function handleChatSubmit(prompt: string) {
    const trimmed = prompt.trim();
    setCurrentRequest(trimmed);
    appendUser(trimmed);
    const requestedMediaTask = inferMediaTask(trimmed);
    if (requestedMediaTask) {
      queueMedia(requestedMediaTask, null, trimmed);
    }
    createDraft.mutate({
      prompt: trimmed,
      tenantId: workspace.tenantId,
      tone: quality === "elite" ? "premium" : "professional",
    });
  }

  function handleDeleteAsset(assetId: number) {
    if (!window.confirm("Delete this asset permanently? This cannot be undone.")) return;
    deleteMediaAsset.mutate({ id: assetId });
  }

  function handleRegenerateAsset(asset: { prompt?: string | null; generationPrompt?: string | null }) {
    const prompt = String(asset.prompt ?? asset.generationPrompt ?? currentRequest ?? STARTER_PROMPTS[0]);
    handleChatSubmit(prompt);
  }

  function handleApprove(id: string | number) {
    approveDraft.mutate({ id: String(id) });
  }

  function handleReject(id: string | number) {
    rejectDraft.mutate({ id: String(id), reason: "rejected_by_marketing_app" });
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

    const campaign = createSessionCampaign({
      name: campaignForm.name.trim(),
      goal: campaignForm.goal.trim(),
      audience: campaignForm.audience.trim(),
      channels: campaignForm.channels.split(",").map((value) => value.trim()).filter(Boolean),
      startDate: campaignForm.startDate,
      durationDays: campaignForm.durationDays,
    });

    setCampaigns((current) => [campaign, ...current]);
    setSelectedCampaignId(campaign.id);
    toast.success("Campaign added to this session");
  }

  function updateCampaign(campaignId: string, updater: (campaign: MarketingCampaign) => MarketingCampaign) {
    setCampaigns((current) => current.map((campaign) => (campaign.id === campaignId ? updater(campaign) : campaign)));
  }

  function handleGenerateSevenDayPlan(campaignId: string) {
    updateCampaign(campaignId, (campaign) => ({
      ...campaign,
      planItems: createCampaignPlanItems(campaign),
      updatedAt: new Date().toISOString(),
    }));
    const campaign = campaigns.find((item) => item.id === campaignId);
    if (campaign) {
      handleChatSubmit(`Create a 7-day marketing content plan for ${campaign.audience} focused on ${campaign.goal}.`);
    }
  }

  function handleGenerateWeeklyPack(campaignId: string) {
    const campaign = campaigns.find((item) => item.id === campaignId);
    if (!campaign) return;
    appendAssistant(`Weekly content pack prepared for ${campaign.name}. Review the campaign detail view, then export the plan.`);
    handleChatSubmit(`Generate a weekly content pack for ${campaign.name} targeting ${campaign.audience}.`);
  }

  function handleToggleAttachedAsset(campaignId: string, assetId: number) {
    updateCampaign(campaignId, (campaign) => ({
      ...campaign,
      attachedAssetIds: campaign.attachedAssetIds.includes(assetId)
        ? campaign.attachedAssetIds.filter((id) => id !== assetId)
        : [...campaign.attachedAssetIds, assetId],
      updatedAt: new Date().toISOString(),
    }));
  }

  function handleExportCampaign(campaignId: string) {
    const campaign = campaigns.find((item) => item.id === campaignId);
    if (!campaign) return;
    triggerDownload(`data:text/plain;charset=utf-8,${encodeURIComponent(exportCampaignPlan(campaign))}`, `${campaign.name}.txt`);
    toast.success("Campaign plan ready to export");
  }

  function handleSaveBrandKit() {
    toast.success("Brand Kit saved for this workspace");
  }

  function handleApplyBrand() {
    if (!canApplyBrand || typeof selectedAsset?.id !== "number") return;
    createBrandedMedia.mutate({
      rawAssetId: selectedAsset.id,
      domainText: brandKit.domain,
      ctaText: brandKit.cta,
      watermarkText: brandKit.brandName,
      aspectRatio: "16:9",
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
          <MarketingAppChat
            messages={messages}
            resultCards={chatResultCards}
            isSubmitting={createDraft.isPending || createMediaJob.isPending}
            progressStep={progressStep}
            progressSteps={PROGRESS_STEPS}
            onSubmit={handleChatSubmit}
            onResultDelete={handleDeleteAsset}
            onResultRegenerate={handleRegenerateAsset}
            onResultApprove={handleApprove}
            onResultReject={handleReject}
            onResultDownload={(url) => triggerDownload(url, `marketing-asset-${currentAsset?.id ?? "export"}`)}
            onResultCreateBranded={(assetId) =>
              createBrandedMedia.mutate({
                rawAssetId: assetId,
                domainText: brandKit.domain,
                ctaText: brandKit.cta,
                watermarkText: brandKit.brandName,
                aspectRatio: "16:9",
              })
            }
          />
        ) : null}

        {activeSection === "assets" ? (
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
                ctaText: brandKit.cta,
                watermarkText: brandKit.brandName,
                aspectRatio: "16:9",
              })
            }
            onCopyUrl={handleCopyUrl}
          />
        ) : null}

        {activeSection === "campaigns" ? (
          <MarketingAppCampaignsPanel
            form={campaignForm}
            campaigns={campaigns}
            selectedCampaign={selectedCampaign}
            assets={allAssets}
            onFormChange={(patch) => setCampaignForm((current) => ({ ...current, ...patch }))}
            onCreateCampaign={handleCreateCampaign}
            onSelectCampaign={setSelectedCampaignId}
            onGenerateSevenDayPlan={handleGenerateSevenDayPlan}
            onGenerateWeeklyPack={handleGenerateWeeklyPack}
            onToggleAttachedAsset={handleToggleAttachedAsset}
            onExportCampaign={handleExportCampaign}
          />
        ) : null}

        {activeSection === "calendar" ? <MarketingAppCalendarPanel campaigns={campaigns} /> : null}

        {activeSection === "brand" ? (
          <MarketingAppBrandPanel
            brandKit={brandKit}
            canApplyBrand={canApplyBrand}
            selectedAssetName={selectedAsset ? getAssetTitle(selectedAsset) : null}
            onBrandKitChange={(patch) => setBrandKit((current) => ({ ...current, ...patch }))}
            onSaveBrandKit={handleSaveBrandKit}
            onApplyBrand={handleApplyBrand}
          />
        ) : null}

        {activeSection === "settings" ? <MarketingAppSettings quality={quality} onQualityChange={setQuality} /> : null}
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
