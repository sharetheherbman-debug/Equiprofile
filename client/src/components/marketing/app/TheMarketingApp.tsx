import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useRealtime } from "@/hooks/useRealtime";
import { MarketingAppTopBar, type AppSection, type AppStatus } from "./MarketingAppTopBar";
import { MarketingAppChat, type ChatMessage, detectIntent } from "./MarketingAppChat";
import { MarketingAppPreview } from "./MarketingAppPreview";
import { MarketingAppSettings } from "./MarketingAppSettings";
import { AssetCard } from "./MarketingAppActions";
import { hasPlayablePublicAsset, mergeStudioMediaState } from "@/components/marketing/studio/mediaStatus";
import { workspaceConfig } from "@/components/marketing/studio/workspaceConfig";
import {
  normalizeDraftFromText,
  type DurationOptionSeconds,
  type MarketingStudioDraft,
  type PromptQualityControl,
  type QualityMode,
  type StudioMediaState,
} from "@/components/marketing/studio/types";

function inferMediaTask(command: string): StudioMediaState["task"] | null {
  const v = command.toLowerCase();
  if (/\b(avatar|presenter|talking head)\b/.test(v) && /\b(video|clip|reel)\b/.test(v)) return "avatar_video";
  if (/\b(video|reel|short|youtube short|tiktok|facebook video|instagram reel|clip)\b/.test(v)) return "text_to_video";
  if (/\b(voice|voiceover|audio|narration|speech)\b/.test(v)) return "text_to_speech";
  if (/\b(image|poster|graphic|ad creative|visual|thumbnail)\b/.test(v)) return "text_to_image";
  return null;
}

function toAssetId(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isInteger(parsed) && parsed > 0) return parsed;
  }
  return undefined;
}

function buildAssistantReply(intent: string, command: string): string {
  if (intent === "delete_asset") return "I'll delete that asset for you. Confirm with the Delete button in your assets panel.";
  if (intent === "approve_asset") return "Asset approved. It's ready to schedule or export.";
  if (intent === "reject_asset") return "Asset rejected and flagged for revision.";
  if (intent === "create_campaign") return `Planning a campaign for: "${command}". I'll create a strategy, content plan and asset list now.`;
  if (intent === "schedule_content") return "To schedule content, a platform connection must be active. Currently export_only — I'll prepare your pack for download.";
  if (intent === "create_avatar_video") return "Avatar video requires a presenter voice setup. If that's not configured, I'll return setup_needed and explain what's missing.";
  if (intent === "create_voiceover") return "Requesting voiceover generation. I'll update the preview when it's ready.";
  if (intent === "show_provider_health") return "Check the Settings panel for provider health and test connection status.";
  return `Working on: "${command}". I'll create a plan, generate the assets and update your preview.`;
}

type MarketingAssetRow = {
  id: number;
  status?: string | null;
  jobId?: string | null;
  publicUrl?: string | null;
  mimeType?: string | null;
  generationPrompt?: string | null;
  metadata?: Record<string, unknown>;
  outputs?: Record<string, unknown>;
  outputMetadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
};

const RELEVANCE_STOPWORDS = new Set([
  "create", "make", "build", "campaign", "video", "clip", "reel", "with", "from", "into", "your", "this", "that",
  "the", "and", "for", "about", "need", "want", "please", "social", "post", "marketing", "content", "show",
]);

function extractRelevanceTerms(value: string) {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter((token) => token.length >= 4 && !RELEVANCE_STOPWORDS.has(token))
    .slice(0, 8);
}

function triggerDownload(url: string, filename = "marketing-asset") {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener noreferrer";
  anchor.target = "_blank";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

export function TheMarketingApp({ onBack }: { onBack?: () => void }) {
  const utils = trpc.useUtils();
  const { subscribe } = useRealtime();
  const workspace = workspaceConfig;

  const [quality, setQuality] = useState<QualityMode>("elite");
  const [activeSection, setActiveSection] = useState<AppSection>("chat");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [draft, setDraft] = useState<MarketingStudioDraft | null>(null);
  const [mediaState, setMediaState] = useState<StudioMediaState>({ status: "idle" });
  const [pendingMediaRequestKey, setPendingMediaRequestKey] = useState<string | null>(null);
  const [durationSeconds, setDurationSeconds] = useState<DurationOptionSeconds>(5);
  const [promptControls, setPromptControls] = useState<PromptQualityControl[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentRequest, setCurrentRequest] = useState("");
  const [selectedAssetId, setSelectedAssetId] = useState<number | null>(null);
  const [approvedDraftIds, setApprovedDraftIds] = useState<Record<string, true>>({});

  /* ------ Queries ------ */
  const assets = trpc.admin.listMediaAssets.useQuery({ tenantId: workspace.tenantId });
  const approvals = trpc.admin.listApprovalQueue.useQuery({ tenantId: workspace.tenantId });
  const calendar = trpc.admin.listMarketingCalendar.useQuery({ tenantId: workspace.tenantId });
  const diagnostics = trpc.admin.getAIDiagnostics.useQuery(undefined, { refetchInterval: 30_000 });

  /* ------ Mutations ------ */
  const createDraft = trpc.admin.createMarketingDraft.useMutation({
    onSuccess: (data: any) => {
      if (data?.status !== "created" || !data?.draft) {
        const fallback = normalizeDraftFromText(
          "",
          "AI setup required. Add provider keys in Settings, then retry. Sample output is clearly marked until generation is ready.",
        );
        setDraft(fallback);
        toast.error("AI setup required", { description: "Open Settings to configure provider keys." });
        appendAssistant("AI setup required. Please open Settings and add your provider keys to enable generation.");
        return;
      }
      setDraft(data.draft as MarketingStudioDraft);
      if (data?.draft?.id) {
        setApprovedDraftIds((prev) => {
          const next = { ...prev };
          delete next[String(data.draft.id)];
          return next;
        });
      }
      toast.success("Campaign generated");
      utils.admin.listMarketingDrafts.invalidate();
      utils.admin.listApprovalQueue.invalidate();
    },
    onError: () => {
      setDraft(normalizeDraftFromText("", "AI setup required. Configure provider keys in Settings to continue."));
      toast.error("AI setup required", { description: "Open Settings to configure your AI providers." });
    },
  });

  const createMediaJob = trpc.admin.createMediaJob.useMutation({
    onSuccess: (data: any) => {
      if (
        data?.status === "setup_needed" ||
        data?.status === "provider_failed" ||
        data?.status === "scene_plan_required"
      ) {
        setMediaState({
          status:
            data.status === "setup_needed"
              ? "setup_needed"
              : data.status === "scene_plan_required"
                ? "scene_plan_required"
                : "failed",
          task: data.task,
          assetId: data.assetId,
          selectedProvider: data.selectedProvider,
          selectedModel: data.selectedModel,
          message: data.message ?? "Playable media could not be queued.",
          requestedDurationSeconds: data.requestedDurationSeconds,
          providerMaxDurationSeconds: data.providerMaxDurationSeconds,
        });
        toast.error(data.status === "provider_failed" ? "Media generation failed" : "Media setup needed", {
          description: data.message ?? "Playable media could not be queued.",
        });
        utils.admin.listMediaAssets.invalidate();
        setPendingMediaRequestKey(null);
        return;
      }
      setMediaState({
        status: data?.status === "queued" ? "queued" : "processing",
        task: data?.task,
        jobId: data?.jobId,
        assetId: toAssetId(data?.assetId),
        selectedProvider: data?.selectedProvider ?? data?.provider,
        selectedModel: data?.selectedModel ?? data?.model,
        message: "Video queued. Rendering may take 2–5 minutes. Retries will run automatically when possible.",
        requestedDurationSeconds: data?.requestedDurationSeconds,
        providerMaxDurationSeconds: data?.providerMaxDurationSeconds,
      });
      toast.success("Media job queued");
      utils.admin.listMediaAssets.invalidate();
      setPendingMediaRequestKey(null);
    },
    onError: (error: any) => {
      setMediaState({
        status: "failed",
        message: error?.message ?? "The draft is safe. Check developer diagnostics before retrying.",
      });
      toast.error("Media job failed", { description: error?.message ?? "Check diagnostics before retrying." });
      setPendingMediaRequestKey(null);
    },
  });

  const retryGenXMedia = trpc.admin.testGenXMediaGeneration.useMutation({
    onSuccess: (data: any) => {
      setMediaState({
        status: data.status === "completed" ? "completed" : data.status === "processing" ? "processing" : "failed",
        task: data.task,
        assetId: data.assetId,
        jobId: data.jobId,
        selectedProvider: "genx",
        selectedModel: data.selectedModel,
        publicUrl: data.publicUrl,
        mimeType: data.mimeType,
        message: data.message,
        isSilent: data.task === "text_to_video" || data.task === "avatar_video" ? true : undefined,
      });
      utils.admin.listMediaAssets.invalidate();
      if (data.status === "failed") toast.error("GenX media test failed", { description: data.message });
      else toast.success("GenX media attempt recorded");
    },
    onError: (error: any) => {
      setMediaState({ status: "failed", message: error?.message ?? "GenX retry failed." });
      toast.error("GenX retry failed", { description: error?.message ?? "Check media settings." });
    },
  });

  const deleteMediaAsset = trpc.admin.deleteMediaAsset.useMutation({
    onSuccess: () => {
      toast.success("Asset deleted");
      setSelectedAssetId(null);
      utils.admin.listMediaAssets.invalidate();
    },
    onError: () => toast.error("Could not delete asset"),
  });

  const createBrandedMedia = trpc.admin.createBrandedMediaAsset.useMutation({
    onSuccess: (data: any) => {
      if (data?.status === "completed") {
        toast.success("Branded version created");
        setMediaState((prev) => ({ ...prev, brandedAssetId: data.brandedAssetId }));
        utils.admin.listMediaAssets.invalidate();
        return;
      }
      toast.error("Branding unavailable", { description: data?.message ?? "Post-processing is not ready." });
    },
    onError: (error: any) =>
      toast.error("Branding failed", { description: error?.message ?? "Could not create branded version." }),
  });

  const createVoiceoverAsset = trpc.admin.createVoiceoverMediaAsset.useMutation({
    onSuccess: (data: any) => {
      if (data?.status === "setup_needed") {
        toast.error("Voice setup needed", { description: data?.message ?? "Select a valid voice to continue." });
      } else {
        toast.success("Voiceover request queued");
      }
      utils.admin.listMediaAssets.invalidate();
    },
  });

  const createMusicAsset = trpc.admin.createMusicMediaAsset.useMutation({
    onSuccess: (data: any) => {
      if (data?.status === "setup_needed") {
        toast.error("Music setup needed", { description: data?.message ?? "Music generation is not configured yet." });
      } else {
        toast.success("Music request queued");
      }
      utils.admin.listMediaAssets.invalidate();
    },
  });

  const approveDraft = trpc.admin.approveMarketingDraft.useMutation({
    onSuccess: () => {
      toast.success("Asset approved");
      if (draft?.id) {
        setApprovedDraftIds((prev) => ({ ...prev, [String(draft.id)]: true }));
      }
      utils.admin.listApprovalQueue.invalidate();
      utils.admin.listMarketingDrafts.invalidate();
    },
    onError: () => toast.error("Could not approve asset"),
  });

  const rejectDraft = trpc.admin.rejectMarketingDraft.useMutation({
    onSuccess: () => {
      toast.success("Asset rejected");
      utils.admin.listApprovalQueue.invalidate();
      utils.admin.listMarketingDrafts.invalidate();
    },
    onError: () => toast.error("Could not reject asset"),
  });

  /* ------ Polling for asset completion ------ */
  useEffect(() => {
    const pending = ["queued", "preparing", "routing", "generating", "rendering", "processing", "retrying"];
    const isPending = pending.includes(mediaState.status);
    const assetId = toAssetId(mediaState.assetId);
    if (!isPending || !assetId) return;

    let cancelled = false;
    const poll = async () => {
      try {
        const data = await utils.admin.getMediaAsset.fetch({ id: assetId });
        if (cancelled || !data) return;
        const asset = data as any;
        const lifecycle = asset.lifecycle as any;
        const lifecycleStatus = lifecycle?.state as StudioMediaState["status"] | undefined;
        if (lifecycleStatus && lifecycleStatus !== "failed") {
          const retryMatch =
            typeof lifecycle?.errorMessage === "string"
              ? lifecycle.errorMessage.match(/\((\d+)\/(\d+)\)/)
              : null;
          setMediaState((prev) =>
            mergeStudioMediaState(prev, {
              status: lifecycleStatus,
              progressPercent:
                typeof lifecycle.progressPercent === "number" ? lifecycle.progressPercent : prev.progressPercent,
              estimatedCompletionSeconds:
                typeof lifecycle.estimatedCompletionSeconds === "number"
                  ? lifecycle.estimatedCompletionSeconds
                  : prev.estimatedCompletionSeconds,
              queuePosition:
                typeof lifecycle.queuePosition === "number" ? lifecycle.queuePosition : prev.queuePosition,
              message:
                lifecycleStatus === "retrying"
                  ? typeof lifecycle?.errorMessage === "string"
                    ? lifecycle.errorMessage
                    : "Retrying with alternate prompt/model"
                  : prev.message,
              retryAttempt: retryMatch ? Number(retryMatch[1]) : prev.retryAttempt,
              retryTotal: retryMatch ? Number(retryMatch[2]) : prev.retryTotal,
            }),
          );
        }
        if (hasPlayablePublicAsset(asset)) {
          setMediaState((prev) =>
            mergeStudioMediaState(prev, {
              status: "completed",
              publicUrl: asset.publicUrl,
              mimeType: asset.mimeType ?? prev.mimeType,
              message: "Media ready. You can now create a branded version.",
              brandedAssetId:
                typeof asset?.outputMetadata?.brandedAssetId === "number"
                  ? asset.outputMetadata.brandedAssetId
                  : prev.brandedAssetId,
              requestedDurationSeconds:
                typeof asset?.outputMetadata?.requestedDurationSeconds === "number"
                  ? asset.outputMetadata.requestedDurationSeconds
                  : prev.requestedDurationSeconds,
              actualDurationSeconds:
                typeof asset?.durationSeconds === "number" ? asset.durationSeconds : prev.actualDurationSeconds,
              providerMaxDurationSeconds:
                typeof asset?.outputMetadata?.providerMaxDurationSeconds === "number"
                  ? asset.outputMetadata.providerMaxDurationSeconds
                  : prev.providerMaxDurationSeconds,
              audioPlan:
                typeof asset?.outputMetadata?.audioPlan === "string"
                  ? asset.outputMetadata.audioPlan
                  : prev.audioPlan,
              voiceoverText:
                typeof asset?.outputMetadata?.voiceoverText === "string"
                  ? asset.outputMetadata.voiceoverText
                  : prev.voiceoverText,
              musicPrompt:
                typeof asset?.outputMetadata?.musicPrompt === "string"
                  ? asset.outputMetadata.musicPrompt
                  : prev.musicPrompt,
              isSilent:
                asset.task === "text_to_video" || asset.task === "avatar_video"
                  ? !Boolean(
                      (asset.outputMetadata as any)?.voiceAssetId ||
                        (asset.outputMetadata as any)?.musicAssetId,
                    )
                  : prev.isSilent,
            }),
          );
          utils.admin.listMediaAssets.invalidate();
          toast.success("Media ready!", { description: "Your generated asset is now playable." });
        } else if (!asset.publicUrl && asset.status === "failed" && lifecycleStatus === "failed") {
          setMediaState((prev) =>
            mergeStudioMediaState(prev, {
              status: "failed",
              message: asset.errorMessage ?? "Generation failed.",
            }),
          );
          utils.admin.listMediaAssets.invalidate();
        }
      } catch {
        // Non-critical — keep polling
      }
    };
    const timer = setInterval(poll, 8_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [mediaState.status, mediaState.assetId, utils.admin.getMediaAsset, utils.admin.listMediaAssets]);

  /* ------ Realtime updates ------ */
  useEffect(() => {
    return subscribe("generation:updated", (event: any) => {
      const currentAssetId = toAssetId(mediaState.assetId);
      const matchesAsset =
        currentAssetId && event?.assetId ? Number(event.assetId) === currentAssetId : false;
      const matchesJob =
        mediaState.jobId && event?.jobId ? String(event.jobId) === String(mediaState.jobId) : false;
      if (!matchesAsset && !matchesJob) return;
      const status = event?.state as StudioMediaState["status"] | undefined;
      if (!status) return;
      setMediaState((prev) =>
        mergeStudioMediaState(prev, {
          status,
          progressPercent:
            typeof event.progressPercent === "number" ? event.progressPercent : prev.progressPercent,
          estimatedCompletionSeconds:
            typeof event.estimatedCompletionSeconds === "number"
              ? event.estimatedCompletionSeconds
              : prev.estimatedCompletionSeconds,
          queuePosition:
            typeof event.queuePosition === "number" ? event.queuePosition : prev.queuePosition,
          message: status === "retrying" ? "Retrying with alternate prompt/model" : prev.message,
        }),
      );
      if (status === "completed") {
        utils.admin.getMediaAsset.invalidate({ id: currentAssetId ?? Number(event.assetId ?? 0) });
        utils.admin.listMediaAssets.invalidate();
      }
    });
  }, [subscribe, mediaState.assetId, mediaState.jobId, utils.admin.getMediaAsset, utils.admin.listMediaAssets]);

  /* ------ Derived state ------ */
  const assetList = useMemo(
    () => ((assets.data as MarketingAssetRow[] | undefined) ?? []).filter((asset) => asset.status !== "deleted"),
    [assets.data],
  );

  const selectedAsset = useMemo(
    () => (selectedAssetId ? assetList.find((asset) => asset.id === selectedAssetId) ?? null : null),
    [assetList, selectedAssetId],
  );
  const activeJobPlayableAsset = useMemo(
    () =>
      assetList.find(
        (asset) =>
          mediaState.jobId &&
          asset.jobId === mediaState.jobId &&
          hasPlayablePublicAsset({ publicUrl: asset.publicUrl, mimeType: asset.mimeType }),
      ) ?? null,
    [assetList, mediaState.jobId],
  );
  const latestPlayableAsset = useMemo(
    () => assetList.find((asset) => hasPlayablePublicAsset({ publicUrl: asset.publicUrl, mimeType: asset.mimeType })) ?? null,
    [assetList],
  );
  const latestGeneratedAsset = useMemo(
    () => assetList.find((asset) => asset.status !== "failed" && asset.status !== "deleted") ?? null,
    [assetList],
  );

  const resolvedPreviewAsset =
    selectedAsset ??
    activeJobPlayableAsset ??
    latestPlayableAsset ??
    latestGeneratedAsset ??
    null;

  const resolvedMediaState: StudioMediaState = resolvedPreviewAsset
    ? mergeStudioMediaState(mediaState, {
      assetId: resolvedPreviewAsset.id,
      jobId: resolvedPreviewAsset.jobId ?? mediaState.jobId,
      publicUrl: resolvedPreviewAsset.publicUrl ?? mediaState.publicUrl,
      mimeType: resolvedPreviewAsset.mimeType ?? mediaState.mimeType,
      status:
        hasPlayablePublicAsset({
          publicUrl: resolvedPreviewAsset.publicUrl,
          mimeType: resolvedPreviewAsset.mimeType,
        })
          ? "completed"
          : (resolvedPreviewAsset.status as StudioMediaState["status"]) ?? mediaState.status,
    })
    : mediaState;

  const planItems = useMemo(
    () =>
      [
        draft?.strategy || (currentRequest ? `Plan strategy for "${currentRequest}".` : ""),
        draft?.script || "",
        draft?.mediaPlan || "Generate media asset and run relevance QA before approval/export.",
      ].filter((item) => Boolean(item && item.trim())),
    [draft, currentRequest],
  );

  const relevanceAssessment = useMemo(() => {
    if (!draft && !resolvedPreviewAsset) return { passed: true, reason: "" };
    const requestTerms = extractRelevanceTerms(currentRequest);
    if (!requestTerms.length) return { passed: true, reason: "" };
    const corpus = [
      draft?.title,
      draft?.strategy,
      draft?.script,
      draft?.caption,
      resolvedPreviewAsset?.generationPrompt,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (!corpus.trim()) return { passed: false, reason: "No generated context available yet for QA relevance check." };
    const matched = requestTerms.filter((term) => corpus.includes(term));
    const ratio = matched.length / requestTerms.length;
    if (ratio >= 0.34) return { passed: true, reason: "" };
    return {
      passed: false,
      reason: `Generated output did not preserve request focus (${matched.length}/${requestTerms.length} keyword match). Regenerate before approval.`,
    };
  }, [currentRequest, draft, resolvedPreviewAsset]);

  const providerHealthSummary = useMemo(() => {
    const providerRows = ((diagnostics.data as any)?.providerHealth ?? []) as any[];
    if (!providerRows.length) return { label: "Unknown", tone: "warn" as const };
    const liveReady = providerRows.filter((row) => row.liveReady).length;
    if (liveReady === providerRows.length) return { label: "All live", tone: "ok" as const };
    if (liveReady > 0) return { label: `${liveReady}/${providerRows.length} live`, tone: "warn" as const };
    return { label: "Setup needed", tone: "error" as const };
  }, [diagnostics.data]);

  const appStatus = useMemo((): AppStatus => {
    if (resolvedMediaState.status === "queued" || resolvedMediaState.status === "generating" || resolvedMediaState.status === "processing") return "generating";
    if (resolvedMediaState.status === "setup_needed" || resolvedMediaState.status === "scene_plan_required") return "setup_needed";
    if ((approvals.data as any[])?.length) return "needs_approval";
    if (relevanceAssessment.passed === false) return "needs_approval";
    return "ready";
  }, [resolvedMediaState.status, approvals.data, relevanceAssessment.passed]);

  /* ------ Chat helpers ------ */
  function appendUser(content: string) {
    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: "user", content, timestamp: Date.now() },
    ]);
  }
  function appendAssistant(content: string) {
    setMessages((prev) => [
      ...prev,
      { id: `a-${Date.now()}`, role: "assistant", content, timestamp: Date.now() },
    ]);
  }

  /* ------ Main media queue ------ */
  function queueMedia(
    task: "text_to_image" | "text_to_video" | "avatar_video" | "text_to_speech",
    draftOverride?: MarketingStudioDraft | null,
    commandOverride?: string,
    controlsOverride?: PromptQualityControl[],
  ) {
    const activeDraft = draftOverride ?? draft;
    const activeCommand = (commandOverride ?? "").trim();
    const activeControls = controlsOverride ?? promptControls;
    const requestKey = `${task}:${activeDraft?.id ?? "cmd"}:${activeCommand}:${durationSeconds}:${activeControls.join("|")}`;
    if (createMediaJob.isPending || pendingMediaRequestKey === requestKey) return;
    const prompt =
      task === "text_to_video"
        ? activeDraft?.videoPrompt || activeDraft?.visualDirection || activeDraft?.script || activeCommand
        : task === "avatar_video"
          ? activeDraft?.avatarScript || activeDraft?.voiceoverScript || activeDraft?.script || activeCommand
          : task === "text_to_speech"
            ? activeDraft?.voiceoverScript || activeDraft?.script || activeCommand
            : activeDraft?.imagePrompt || activeDraft?.visualDirection || activeCommand;
    const requestedDurationSeconds =
      task === "text_to_video" || task === "avatar_video"
        ? (String(durationSeconds) as "5" | "10" | "15" | "30" | "60" | "180")
        : undefined;
    setPendingMediaRequestKey(requestKey);
    setMediaState({
      status: "queued",
      task,
      requestedDurationSeconds:
        task === "text_to_video" || task === "avatar_video" ? durationSeconds : undefined,
      message: `${task === "text_to_video" ? "Video" : "Media"} queued for generation. Rendering may take 2–5 minutes.`,
    });
    createMediaJob.mutate({
      task,
      prompt: String(prompt).slice(0, 6000),
      draftId: activeDraft?.id,
      tenantId: workspace.tenantId,
      quality,
      platform: activeDraft?.platform,
      requestedDurationSeconds,
      promptControls: activeControls,
    });
  }

  /* ------ Chat command handler ------ */
  function handleChatSubmit(trimmed: string) {
    setCurrentRequest(trimmed);
    appendUser(trimmed);
    const intent = detectIntent(trimmed);
    appendAssistant(buildAssistantReply(intent, trimmed));
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

  /* ------ Section handler: settings opens sheet ------ */
  function handleSectionChange(section: AppSection) {
    if (section === "settings") {
      setSettingsOpen(true);
      return;
    }
    setActiveSection(section);
  }

  /* ------ Retry with GenX ------ */
  function retryWithGenX() {
    const task = mediaState.task ?? inferMediaTask("") ?? "text_to_video";
    const prompt =
      task === "avatar_video"
        ? draft?.avatarScript || draft?.voiceoverScript || draft?.script || ""
        : task === "text_to_speech"
          ? draft?.voiceoverScript || draft?.script || ""
          : task === "text_to_image"
            ? draft?.imagePrompt || draft?.visualDirection || ""
            : draft?.videoPrompt || draft?.visualDirection || draft?.script || "";
    setMediaState({ status: "processing", task, message: "Retrying with GenX…" });
    retryGenXMedia.mutate({ task, prompt: String(prompt).slice(0, 6000), tenantId: workspace.tenantId });
  }

  function createBrandedVersion() {
    const rawAssetId = toAssetId(resolvedMediaState.assetId);
    if (!rawAssetId || createBrandedMedia.isPending) return;
    createBrandedMedia.mutate({
      rawAssetId,
      domainText: "equiprofile.com",
      ctaText: "Start your free trial",
      watermarkText: "EquiProfile",
      aspectRatio: "16:9",
    });
  }

  function addVoiceover() {
    const rawAssetId = toAssetId(resolvedMediaState.assetId);
    if (!rawAssetId || createVoiceoverAsset.isPending) return;
    createVoiceoverAsset.mutate({
      rawAssetId,
      voiceoverText: draft?.voiceoverScript || draft?.script || "",
      requestedDurationSeconds: String(durationSeconds) as "5" | "10" | "15" | "30" | "60" | "180",
    });
  }

  function addMusic() {
    const rawAssetId = toAssetId(resolvedMediaState.assetId);
    if (!rawAssetId || createMusicAsset.isPending) return;
    createMusicAsset.mutate({
      rawAssetId,
      musicPrompt: `Instrumental cinematic background music for ${workspace.appName}`,
      requestedDurationSeconds: String(durationSeconds) as "5" | "10" | "15" | "30" | "60" | "180",
    });
  }

  function approveCurrentDraft() {
    if (!draft?.id) return;
    approveDraft.mutate({ id: String(draft.id) });
  }

  function rejectCurrentDraft() {
    if (!draft?.id) return;
    rejectDraft.mutate({ id: String(draft.id), reason: "rejected_by_qa" });
  }

  function deleteCurrentAsset() {
    const id = toAssetId(resolvedMediaState.assetId);
    if (!id) return;
    deleteMediaAsset.mutate({ id });
  }

  function downloadCurrentAsset() {
    if (!resolvedMediaState.publicUrl) return;
    triggerDownload(resolvedMediaState.publicUrl, `marketing-asset-${resolvedMediaState.assetId ?? "export"}`);
  }

  /* ------ Progress strip steps ------ */
  const draftApproved = Boolean(draft?.id && approvedDraftIds[String(draft.id)]);
  const PROGRESS_STEPS = ["Request", "Plan", "Generate", "QA", "Preview", "Approve/Export"];
  const progressStep =
    !currentRequest && !draft
      ? 0
      : draft && resolvedMediaState.status === "idle"
        ? 1
        : ["queued", "preparing", "routing", "generating", "rendering", "processing", "retrying"].includes(resolvedMediaState.status)
          ? 2
          : resolvedMediaState.status === "completed" && !relevanceAssessment.passed
            ? 3
            : resolvedMediaState.status === "completed" && !draftApproved
              ? 4
              : draftApproved
                ? 5
                : 0;

  return (
    <main
      className="flex min-h-screen flex-col gap-4 bg-gradient-to-br from-[#f8f6f2] to-[#edeae3] px-3 py-4 md:px-6 md:py-6"
      aria-label="The Marketing App"
    >
      <div className="mx-auto w-full max-w-[1800px] space-y-4">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-600 hover:bg-stone-50"
          >
            Back
          </button>
        ) : null}
        {/* Top bar — no second sidebar */}
        <MarketingAppTopBar
          quality={quality}
          activeSection={activeSection}
          appStatus={appStatus}
          providerHealth={providerHealthSummary}
          onQualityChange={setQuality}
          onSectionChange={handleSectionChange}
        />

        {activeSection === "chat" ? (
          <div className="grid gap-4 lg:grid-cols-[45%_55%]">
            <section className="space-y-4">
              <MarketingAppChat
                quality={quality}
                loading={createDraft.isPending || createMediaJob.isPending}
                messages={messages}
                onSubmit={handleChatSubmit}
              />

              <section className="rounded-3xl border border-stone-200 bg-white p-4 shadow-sm" aria-label="AI plan">
                <p className="text-sm font-semibold text-stone-900">AI plan</p>
                {planItems.length ? (
                  <ol className="mt-3 space-y-2 text-sm text-stone-700">
                    {planItems.map((item, index) => (
                      <li key={`${index}-${item.slice(0, 24)}`} className="rounded-xl bg-stone-50 px-3 py-2">
                        <span className="mr-2 text-xs font-semibold text-stone-400">Step {index + 1}</span>
                        {item}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="mt-2 text-sm text-stone-500">Submit a request to generate the plan.</p>
                )}
              </section>

              <section className="rounded-3xl border border-stone-200 bg-white p-4 shadow-sm" aria-label="Current task steps">
                <p className="text-sm font-semibold text-stone-900">Current task steps</p>
                <ul className="mt-2 space-y-1 text-xs text-stone-600">
                  <li>• Request captured: {currentRequest ? "yes" : "pending"}</li>
                  <li>• Plan generated: {draft ? "yes" : "pending"}</li>
                  <li>• Media generated: {resolvedMediaState.status === "completed" ? "yes" : resolvedMediaState.status}</li>
                  <li>• QA relevance: {relevanceAssessment.passed ? "pass" : "review needed"}</li>
                </ul>
              </section>
            </section>

            <section className="space-y-4">
              <MarketingAppPreview
                draft={draft}
                mediaState={resolvedMediaState}
                selectedAssetLabel={selectedAsset ? `Asset #${selectedAsset.id}` : latestPlayableAsset ? `Latest asset #${latestPlayableAsset.id}` : undefined}
                relevancePassed={relevanceAssessment.passed}
                relevanceReason={relevanceAssessment.reason}
                approved={draftApproved}
                onRetryGenX={retryWithGenX}
                onRetryPreview={() => retryWithGenX()}
                onApprove={approveCurrentDraft}
                onReject={rejectCurrentDraft}
                onCreateBranded={createBrandedVersion}
                onAddVoiceover={addVoiceover}
                onAddMusic={addMusic}
                onGenerateLongerScenePlan={() => queueMedia("text_to_video", draft, "Build a longer multi-scene plan.")}
                onRegenerateBetter={() => {
                  const nextControls: PromptQualityControl[] = Array.from(
                    new Set([...promptControls, "more_premium" as const, "more_cinematic" as const]),
                  );
                  setPromptControls(nextControls);
                  queueMedia("text_to_video", draft, currentRequest, nextControls);
                }}
                onDownload={downloadCurrentAsset}
                onArchive={deleteCurrentAsset}
              />

              <section className="rounded-3xl border border-stone-200 bg-white p-4 shadow-sm" aria-label="Recent outputs">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold text-stone-900">Recent outputs</p>
                  {assetList.length ? <p className="text-xs text-stone-500">{assetList.length} assets</p> : null}
                </div>
                {assetList.length ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {assetList.slice(0, 4).map((asset: any) => (
                      <AssetCard
                        key={asset.id}
                        asset={asset}
                        onPreview={(row) => {
                          const id = toAssetId((row as any).id);
                          if (id) setSelectedAssetId(id);
                        }}
                        onDelete={(id) => deleteMediaAsset.mutate({ id })}
                        onRegenerate={() => queueMedia("text_to_video", draft, currentRequest)}
                        onApprove={() => approveCurrentDraft()}
                        onReject={() => rejectCurrentDraft()}
                        onDownload={(url) => triggerDownload(url, `marketing-asset-${asset.id}`)}
                        onCreateBranded={(id) =>
                          createBrandedMedia.mutate({
                            rawAssetId: id,
                            domainText: "equiprofile.com",
                            ctaText: "Start your free trial",
                            watermarkText: "EquiProfile",
                            aspectRatio: "16:9",
                          })
                        }
                        onCopyUrl={(url) => {
                          navigator.clipboard.writeText(url).catch(() => null);
                          toast.success("URL copied");
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-stone-500">No generated assets yet.</p>
                )}
              </section>
            </section>
          </div>
        ) : null}

        {/* Assets section */}
        {activeSection === "assets" ? (
          <section className="space-y-4" aria-label="Assets">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-stone-900">Assets</h2>
            </div>
            {assetList.length ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {assetList.slice(0, 18).map((asset: any) => (
                  <AssetCard
                    key={asset.id}
                    asset={asset}
                    onPreview={(row) => {
                      const id = toAssetId((row as any).id);
                      if (id) {
                        setSelectedAssetId(id);
                        setActiveSection("chat");
                      }
                    }}
                    onDelete={(id) => deleteMediaAsset.mutate({ id })}
                    onApprove={(id) => approveDraft.mutate({ id: String(id) })}
                    onReject={(id) => rejectDraft.mutate({ id: String(id), reason: "rejected" })}
                    onRegenerate={() => queueMedia("text_to_video", draft, currentRequest)}
                    onDownload={(url) => triggerDownload(url, `marketing-asset-${asset.id}`)}
                    onCreateBranded={(id) =>
                      createBrandedMedia.mutate({
                        rawAssetId: id,
                        domainText: "equiprofile.com",
                        ctaText: "Start your free trial",
                        watermarkText: "EquiProfile",
                        aspectRatio: "16:9",
                      })
                    }
                    onCopyUrl={(url) => {
                      navigator.clipboard.writeText(url).catch(() => null);
                      toast.success("URL copied");
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-stone-200 bg-white p-10 text-center">
                <p className="font-medium text-stone-700">No assets yet</p>
                <p className="mt-1 text-sm text-stone-400">
                  Use the AI chat to create your first asset. Generated media appears here.
                </p>
              </div>
            )}
          </section>
        ) : null}

        {/* Calendar section */}
        {activeSection === "calendar" ? (
          <section className="rounded-2xl border border-stone-200 bg-white p-6" aria-label="Calendar">
            <h2 className="mb-4 text-lg font-semibold text-stone-900">Calendar</h2>
            {(calendar.data as any[])?.length ? (
              <ul className="space-y-3">
                {(calendar.data as any[]).map((item: any) => (
                  <li key={item.id} className="rounded-xl border border-stone-200 bg-stone-50 p-3 text-sm text-stone-700">
                    {item.title || "Scheduled item"} — {item.scheduledFor ?? "export_only / setup_needed"}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50 p-8 text-center">
                <p className="text-sm text-stone-400">
                  No scheduled content yet. Approve content first, then schedule it here when a platform connection is active.
                  Without a connection: export_only.
                </p>
              </div>
            )}
          </section>
        ) : null}

        {/* Progress strip — compact, bottom of main content */}
        <div
          className="flex items-center gap-1 overflow-x-auto rounded-2xl border border-stone-200 bg-white px-4 py-2 shadow-sm"
          aria-label="Task progress"
          role="progressbar"
        >
          {PROGRESS_STEPS.map((step, i) => (
            <div key={step} className="flex shrink-0 items-center gap-1">
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  i < progressStep
                    ? "bg-emerald-100 text-emerald-700"
                    : i === progressStep
                      ? "bg-stone-900 text-white"
                      : "bg-stone-100 text-stone-400"
                }`}
              >
                {step}
              </span>
              {i < PROGRESS_STEPS.length - 1 ? (
                <span className="text-stone-300 text-xs">→</span>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      {/* Settings sheet */}
      <MarketingAppSettings
        open={settingsOpen}
        quality={quality}
        onQualityChange={setQuality}
        onClose={() => setSettingsOpen(false)}
      />
    </main>
  );
}

/* Type alias to keep external references clean */
