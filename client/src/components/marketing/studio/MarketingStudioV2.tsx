import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useRealtime } from "@/hooks/useRealtime";
import { AITeamProgress } from "./AITeamProgress";
import { AssetLibrary } from "./AssetLibrary";
import { AutopilotWizard } from "./AutopilotWizard";
import { CampaignContextStrip } from "./CampaignContextStrip";
import { CampaignKanban } from "./CampaignKanban";
import { OutputCanvas } from "./OutputCanvas";
import { PreviewCanvas } from "./PreviewCanvas";
import { QuickCreateTiles } from "./QuickCreateTiles";
import { SetupDrawer } from "./SetupDrawer";
import { StickyActionBar } from "./StickyActionBar";
import { StudioCommandCenter } from "./StudioCommandCenter";
import { StudioHero } from "./StudioHero";
import { hasPlayablePublicAsset, mergeStudioMediaState } from "./mediaStatus";
import { workspaceConfig } from "./workspaceConfig";
import { normalizeDraftFromText, type DurationOptionSeconds, type MarketingStudioDraft, type PromptQualityControl, type QualityMode, type SetupDrawerKind, type StudioArea, type StudioMediaState } from "./types";

const PRIMARY_AREAS: Array<{ id: StudioArea; label: string }> = [
  { id: "create", label: "Create" },
  { id: "campaigns", label: "Campaigns" },
  { id: "assets", label: "Assets" },
  { id: "autopilot", label: "Autopilot" },
];

const TILE_PROMPTS: Record<string, string> = {
  "Reel / Short": workspaceConfig.contentExamples[0] ?? "Create a 30-second social reel",
  "Social Post": "Write a LinkedIn authority post",
  "Ad Creative": "Create a premium Facebook ad creative for signups",
  "Email Campaign": "Create an email campaign for inactive trial users",
  "Blog / SEO Article": "Write a Blog / SEO article outline",
  "YouTube Script": "Create a YouTube Long-form script",
  "Launch Campaign": "Build a 7-day launch campaign",
  "Weekly Content Pack": "Generate a week of YouTube Shorts",
  "Avatar Video": "Create an avatar video script",
  "7-Day Growth Plan": `Create a 7-day growth plan for ${workspaceConfig.appName}`,
};

function inferMediaTask(command: string): StudioMediaState["task"] | null {
  const value = command.toLowerCase();
  if (/\b(avatar|presenter|talking head)\b/.test(value) && /\b(video|clip|reel|short)\b/.test(value)) return "avatar_video";
  if (/\b(video|reel|short|youtube short|tiktok|facebook video|instagram reel|clip)\b/.test(value)) return "text_to_video";
  if (/\b(voice|voiceover|audio|narration|speech)\b/.test(value)) return "text_to_speech";
  if (/\b(image|poster|graphic|ad creative|visual|thumbnail)\b/.test(value)) return "text_to_image";
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

export function MarketingStudioV2({ onBackToAdmin }: { onBackToAdmin?: () => void }) {
  const utils = trpc.useUtils();
  const { subscribe } = useRealtime();
  const [activeArea, setActiveArea] = useState<StudioArea>("create");
  const [quality, setQuality] = useState<QualityMode>("elite");
  const [drawer, setDrawer] = useState<SetupDrawerKind>(null);
  const [command, setCommand] = useState(workspaceConfig.contentExamples[0] ?? "Create a campaign for us");
  const [durationSeconds, setDurationSeconds] = useState<DurationOptionSeconds>(5);
  const [promptControls, setPromptControls] = useState<PromptQualityControl[]>([]);
  const [draft, setDraft] = useState<MarketingStudioDraft | null>(null);
  const [mediaState, setMediaState] = useState<StudioMediaState>({ status: "idle" });
  const [pendingMediaRequestKey, setPendingMediaRequestKey] = useState<string | null>(null);

  const workspace = workspaceConfig;
  const drafts = trpc.admin.listMarketingDrafts.useQuery({ tenantId: workspace.tenantId });
  const approvals = trpc.admin.listApprovalQueue.useQuery({ tenantId: workspace.tenantId });
  const calendar = trpc.admin.listMarketingCalendar.useQuery({ tenantId: workspace.tenantId });
  const assets = trpc.admin.listMediaAssets.useQuery({ tenantId: workspace.tenantId });

  const createDraft = trpc.admin.createMarketingDraft.useMutation({
    onSuccess: (data: any) => {
      if (data?.status !== "created" || !data?.draft) {
        setDraft(normalizeDraftFromText(command, "AI setup required. Add provider keys in settings, then run the campaign again. Sample output is clearly marked until generation is ready."));
        toast.error("AI setup required", { description: "Provider setup is not complete yet." });
        return;
      }
      const nextDraft = data.draft as MarketingStudioDraft;
      setDraft(nextDraft);
      toast.success("Campaign generated");
      utils.admin.listMarketingDrafts.invalidate();
      utils.admin.listApprovalQueue.invalidate();
    },
    onError: () => {
      setDraft(normalizeDraftFromText(command, "AI setup required. Add provider keys in settings, then run the campaign again. Sample output is clearly marked until generation is ready."));
      toast.error("AI setup required", { description: "Open settings to configure your AI team." });
    },
  });
  const createMediaJob = trpc.admin.createMediaJob.useMutation({
    onSuccess: (data: any) => {
      if (data?.status === "setup_needed" || data?.status === "provider_failed" || data?.status === "scene_plan_required") {
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
        toast.error(
          data.status === "provider_failed" ? "Media generation failed" : "Media setup needed",
          { description: data.message ?? "Playable media could not be queued." },
        );
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
      toast.success("Media job queued", {
        description: data?.selectedModel ? `${data.selectedProvider ?? "Provider"} selected` : "Asset will appear when a real output is returned.",
      });
      utils.admin.listMediaAssets.invalidate();
      setPendingMediaRequestKey(null);
    },
    onError: (error: any) => {
      setMediaState({ status: "failed", message: error?.message ?? "The draft is safe. Check developer diagnostics before retrying." });
      toast.error("Media job failed", { description: error?.message ?? "The draft is safe. Check developer diagnostics before retrying." });
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
      toast.success("Asset archived");
      utils.admin.listMediaAssets.invalidate();
    },
    onError: () => toast.error("Could not archive asset"),
  });
  const createBrandedMedia = trpc.admin.createBrandedMediaAsset.useMutation({
    onSuccess: (data: any) => {
      if (data?.status === "completed") {
        toast.success("Branded version created");
        setMediaState((prev) => ({
          ...prev,
          brandedAssetId: data.brandedAssetId,
          message: "Raw and branded assets are now available.",
        }));
        utils.admin.listMediaAssets.invalidate();
        return;
      }
      toast.error("Branding unavailable", { description: data?.message ?? "Post-processing is not ready." });
    },
    onError: (error: any) => toast.error("Branding failed", { description: error?.message ?? "Could not create branded version." }),
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

  // Poll for asset completion when a job is queued or processing
  useEffect(() => {
    const isPending = [
      "queued",
      "preparing",
      "routing",
      "generating",
      "rendering",
      "processing",
      "retrying",
    ].includes(mediaState.status);
    const assetId = toAssetId(mediaState.assetId);
    if (!isPending || !assetId) return;

    let cancelled = false;
    const poll = async () => {
      try {
        const data = await utils.admin.getMediaAsset.fetch({ id: assetId });
        if (cancelled) return;
        if (!data) return;
        const asset = data as any;
        const lifecycle = asset.lifecycle as any;
        const lifecycleStatus = lifecycle?.state as StudioMediaState["status"] | undefined;
        if (lifecycleStatus && lifecycleStatus !== "failed") {
          const retryMatch = typeof lifecycle?.errorMessage === "string"
            ? lifecycle.errorMessage.match(/\((\d+)\/(\d+)\)/)
            : null;
          setMediaState((prev) => mergeStudioMediaState(prev, {
            status: lifecycleStatus,
            progressPercent: typeof lifecycle.progressPercent === "number" ? lifecycle.progressPercent : prev.progressPercent,
            estimatedCompletionSeconds: typeof lifecycle.estimatedCompletionSeconds === "number" ? lifecycle.estimatedCompletionSeconds : prev.estimatedCompletionSeconds,
            queuePosition: typeof lifecycle.queuePosition === "number" ? lifecycle.queuePosition : prev.queuePosition,
            message: lifecycleStatus === "retrying"
              ? (typeof lifecycle?.errorMessage === "string" ? lifecycle.errorMessage : "Retrying with alternate prompt/model")
              : prev.message,
            retryAttempt: retryMatch ? Number(retryMatch[1]) : prev.retryAttempt,
            retryTotal: retryMatch ? Number(retryMatch[2]) : prev.retryTotal,
          }));
        }
        if (hasPlayablePublicAsset(asset)) {
          setMediaState((prev) => mergeStudioMediaState(prev, {
            status: "completed",
            publicUrl: asset.publicUrl,
            mimeType: asset.mimeType ?? prev.mimeType,
            message: "Media ready. You can now create a branded version.",
            brandedAssetId: typeof asset?.outputMetadata?.brandedAssetId === "number" ? asset.outputMetadata.brandedAssetId : prev.brandedAssetId,
            requestedDurationSeconds: typeof asset?.outputMetadata?.requestedDurationSeconds === "number" ? asset.outputMetadata.requestedDurationSeconds : prev.requestedDurationSeconds,
            actualDurationSeconds: typeof asset?.durationSeconds === "number" ? asset.durationSeconds : prev.actualDurationSeconds,
            providerMaxDurationSeconds: typeof asset?.outputMetadata?.providerMaxDurationSeconds === "number" ? asset.outputMetadata.providerMaxDurationSeconds : prev.providerMaxDurationSeconds,
            audioPlan: typeof asset?.outputMetadata?.audioPlan === "string" ? asset.outputMetadata.audioPlan : prev.audioPlan,
            voiceoverText: typeof asset?.outputMetadata?.voiceoverText === "string" ? asset.outputMetadata.voiceoverText : prev.voiceoverText,
            musicPrompt: typeof asset?.outputMetadata?.musicPrompt === "string" ? asset.outputMetadata.musicPrompt : prev.musicPrompt,
            isSilent: asset.task === "text_to_video" || asset.task === "avatar_video" ? !Boolean((asset.outputMetadata as any)?.voiceAssetId || (asset.outputMetadata as any)?.musicAssetId) : prev.isSilent,
          }));
          utils.admin.listMediaAssets.invalidate();
          toast.success("Media ready!", { description: "Your generated asset is now playable." });
        } else if (!asset.publicUrl && asset.status === "failed" && lifecycleStatus === "failed") {
          setMediaState((prev) => mergeStudioMediaState(prev, {
            status: "failed",
            message: asset.errorMessage ?? "Generation failed.",
          }));
          utils.admin.listMediaAssets.invalidate();
        }
      } catch {
        // Non-critical — keep polling silently
      }
    };

    const timer = setInterval(poll, 8_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [mediaState.status, mediaState.assetId, utils.admin.getMediaAsset, utils.admin.listMediaAssets]);

  useEffect(() => {
    return subscribe("generation:updated", (event: any) => {
      const currentAssetId = toAssetId(mediaState.assetId);
      const matchesAsset = currentAssetId && event?.assetId ? Number(event.assetId) === currentAssetId : false;
      const matchesJob = mediaState.jobId && event?.jobId ? String(event.jobId) === String(mediaState.jobId) : false;
      if (!matchesAsset && !matchesJob) return;
      const status = event?.state as StudioMediaState["status"] | undefined;
      if (!status) return;
      setMediaState((prev) => mergeStudioMediaState(prev, {
        status,
        progressPercent: typeof event.progressPercent === "number" ? event.progressPercent : prev.progressPercent,
        estimatedCompletionSeconds: typeof event.estimatedCompletionSeconds === "number" ? event.estimatedCompletionSeconds : prev.estimatedCompletionSeconds,
        queuePosition: typeof event.queuePosition === "number" ? event.queuePosition : prev.queuePosition,
        message: status === "retrying" ? "Retrying with alternate prompt/model" : prev.message,
      }));
      if (status === "completed") {
        utils.admin.getMediaAsset.invalidate({ id: currentAssetId ?? Number(event.assetId ?? 0) });
        utils.admin.listMediaAssets.invalidate();
      }
    });
  }, [subscribe, mediaState.assetId, mediaState.jobId, utils.admin.getMediaAsset, utils.admin.listMediaAssets]);

  const teamState = useMemo(() => {
    if (createDraft.isPending) return "active" as const;
    if (draft?.plainText?.includes("AI setup required")) return "blocked" as const;
    if (draft) return "complete" as const;
    return "waiting" as const;
  }, [createDraft.isPending, draft]);

  function runCreate(nextCommand = command, controlsOverride?: PromptQualityControl[]) {
    const trimmed = nextCommand.trim();
    if (trimmed.length < 10) return;
    setCommand(trimmed);
    const requestedMediaTask = inferMediaTask(trimmed);
    if (requestedMediaTask) {
      queueMedia(requestedMediaTask, null, trimmed, controlsOverride);
    }
    createDraft.mutate({
      prompt: trimmed,
      tenantId: workspace.tenantId,
      tone: quality === "elite" ? "premium" : "professional",
    });
  }

  function improveWith(suffix: string) {
    const next = `${command}. ${suffix}`;
    setCommand(next);
    runCreate(next);
  }

  function applyPromptControl(control: PromptQualityControl) {
    const nextControls = promptControls.includes(control) ? promptControls : [...promptControls, control];
    setPromptControls(nextControls);
    runCreate(command, nextControls);
  }

  function queueMedia(task: "text_to_image" | "text_to_video" | "avatar_video" | "text_to_speech", draftOverride?: MarketingStudioDraft | null, commandOverride?: string, controlsOverride?: PromptQualityControl[]) {
    const activeDraft = draftOverride ?? draft;
    const activeCommand = (commandOverride ?? command).trim();
    const activeControls = controlsOverride ?? promptControls;
    const requestKey = `${task}:${activeDraft?.id ?? "command"}:${activeCommand}:${durationSeconds}:${activeControls.join("|")}`;
    if (createMediaJob.isPending || pendingMediaRequestKey === requestKey) return;
    const prompt =
      task === "text_to_video"
        ? (activeDraft?.videoPrompt || activeDraft?.visualDirection || activeDraft?.script || activeCommand)
        : task === "avatar_video"
          ? (activeDraft?.avatarScript || activeDraft?.voiceoverScript || activeDraft?.script || activeCommand)
          : task === "text_to_speech"
            ? (activeDraft?.voiceoverScript || activeDraft?.script || activeCommand)
            : (activeDraft?.imagePrompt || activeDraft?.visualDirection || activeCommand);
    setPendingMediaRequestKey(requestKey);
    setMediaState({
      status: "queued",
      task,
      requestedDurationSeconds: task === "text_to_video" || task === "avatar_video" ? durationSeconds : undefined,
      message: `${task === "text_to_video" ? "Video" : "Media"} queued for generation. Rendering may take 2–5 minutes.`,
    });
    createMediaJob.mutate({
      task,
      prompt: String(prompt).slice(0, 6000),
      draftId: activeDraft?.id,
      tenantId: workspace.tenantId,
      quality,
      platform: activeDraft?.platform,
      requestedDurationSeconds: task === "text_to_video" || task === "avatar_video" ? durationSeconds : undefined,
      promptControls: activeControls,
    });
  }

  function retryWithGenX() {
    const task = mediaState.task ?? inferMediaTask(command) ?? "text_to_video";
    const prompt = task === "avatar_video"
      ? (draft?.avatarScript || draft?.voiceoverScript || draft?.script || command)
      : task === "text_to_speech"
        ? (draft?.voiceoverScript || draft?.script || command)
        : task === "text_to_image"
          ? (draft?.imagePrompt || draft?.visualDirection || command)
          : (draft?.videoPrompt || draft?.visualDirection || draft?.script || command);
    setMediaState({ status: "processing", task, message: "Retrying with GenX..." });
    retryGenXMedia.mutate({ task, prompt: String(prompt).slice(0, 6000), tenantId: workspace.tenantId });
  }

  function createBrandedVersion() {
    const rawAssetId = toAssetId(mediaState.assetId);
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
    const rawAssetId = toAssetId(mediaState.assetId);
    if (!rawAssetId || createVoiceoverAsset.isPending) return;
    createVoiceoverAsset.mutate({
      rawAssetId,
      voiceoverText: draft?.voiceoverScript || draft?.script || command,
      requestedDurationSeconds: durationSeconds,
    });
  }

  function addMusic() {
    const rawAssetId = toAssetId(mediaState.assetId);
    if (!rawAssetId || createMusicAsset.isPending) return;
    createMusicAsset.mutate({
      rawAssetId,
      musicPrompt: `Instrumental cinematic background music for ${workspaceConfig.appName}`,
      requestedDurationSeconds: durationSeconds,
    });
  }

  function generateLongerScenePlan() {
    queueMedia("text_to_video", draft, `${command}. Build a longer multi-scene plan.`);
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#f8f6f2] to-[#edeae3] px-3 py-4 md:px-6 md:py-6" aria-label="Marketing Studio">
      <div className="mx-auto max-w-[1800px] space-y-5">
        <StudioHero quality={quality} onQualityChange={setQuality} onAreaChange={setActiveArea} onOpenSetup={setDrawer} onBackToAdmin={onBackToAdmin} />

        {/* Primary navigation — 5 canonical areas */}
        <nav
          className="sticky top-2 z-10 flex gap-1 overflow-x-auto rounded-2xl border border-stone-200 bg-white/90 p-1.5 shadow-sm backdrop-blur"
          aria-label="Marketing Studio primary areas"
        >
          {PRIMARY_AREAS.map((area) => (
            <button
              key={area.id}
              type="button"
              aria-current={activeArea === area.id ? "page" : undefined}
              className={`shrink-0 rounded-xl px-5 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-violet-400 ${activeArea === area.id ? "bg-stone-900 text-white shadow-sm" : "text-stone-600 hover:bg-stone-100"}`}
              onClick={() => setActiveArea(area.id)}
            >
              {area.label}
            </button>
          ))}
        </nav>

        {/* Setup — 5-step workspace onboarding */}
        {/* Create — main creative experience */}
        {activeArea === "create" ? (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)]">
            <div className="space-y-5">
              <QuickCreateTiles
                onSelect={(label) => {
                  const next = TILE_PROMPTS[label] ?? `Create ${label}`;
                  setCommand(next);
                  runCreate(next);
                }}
              />
              <CampaignContextStrip quality={quality} />
              <AITeamProgress state={teamState} />
              <OutputCanvas command={command} draft={draft} />
            </div>
            <div className="space-y-5">
              <StudioCommandCenter
                command={command}
                loading={createDraft.isPending}
                durationSeconds={durationSeconds}
                promptControls={promptControls}
                onCommandChange={setCommand}
                onDurationChange={setDurationSeconds}
                onPromptControlsChange={setPromptControls}
                onSubmit={() => runCreate()}
              />
              <PreviewCanvas
                draft={draft}
                mediaState={mediaState}
                onRetryGenX={retryWithGenX}
                onCreateBranded={createBrandedVersion}
                onAddVoiceover={addVoiceover}
                onAddMusic={addMusic}
                onGenerateLongerScenePlan={generateLongerScenePlan}
                onRegenerateBetter={() => {
                  const nextControls = Array.from(new Set([...promptControls, "more_premium", "more_cinematic"]));
                  setPromptControls(nextControls);
                  runCreate(command, nextControls);
                }}
                onDownload={() => mediaState.publicUrl ? window.open(mediaState.publicUrl, "_blank", "noopener,noreferrer") : undefined}
                onArchive={() => {
                  const id = toAssetId(mediaState.assetId);
                  if (id) deleteMediaAsset.mutate({ id });
                }}
              />
              <StickyActionBar
                disabled={createDraft.isPending || createMediaJob.isPending}
                onRegenerate={() => runCreate()}
                onImprove={() => applyPromptControl("more_premium")}
                onShorten={() => improveWith("Make the output shorter while keeping the CTA clear.")}
                onGenerateImage={() => queueMedia("text_to_image")}
                onGenerateVideo={() => queueMedia("text_to_video")}
                onGenerateVoice={() => queueMedia("text_to_speech")}
                onGenerateAvatar={() => queueMedia("avatar_video")}
              />
            </div>
          </div>
        ) : null}

        {/* Campaigns — kanban workflow */}
        {activeArea === "campaigns" ? (
          <CampaignKanban drafts={(drafts.data as any[]) ?? []} approvals={(approvals.data as any[]) ?? []} scheduled={(calendar.data as any[]) ?? []} />
        ) : null}

        {/* Media — library */}
        {activeArea === "assets" ? (
          <AssetLibrary
            assets={(assets.data as any[]) ?? []}
            onDelete={(id) => deleteMediaAsset.mutate({ id })}
          />
        ) : null}

        {/* Autopilot */}
        {activeArea === "autopilot" ? (
          <AutopilotWizard
            quality={quality}
            onGeneratePlan={(prompt) => {
              setActiveArea("create");
              setCommand(prompt);
              runCreate(prompt);
            }}
          />
        ) : null}
      </div>

      <SetupDrawer openKind={drawer} quality={quality} onQualityChange={setQuality} onOpenChange={setDrawer} />
      <div className="hidden" aria-hidden="true">
        <button type="button" onClick={() => setDrawer("brand")}>Brand Setup</button>
        <button type="button" onClick={() => setDrawer("audience")}>Audience Setup</button>
        <button type="button" onClick={() => setDrawer("presenter")}>Presenter Setup</button>
      </div>
    </main>
  );
}
