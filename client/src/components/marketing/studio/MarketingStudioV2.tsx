import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
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
import { workspaceConfig } from "./workspaceConfig";
import { normalizeDraftFromText, type MarketingStudioDraft, type QualityMode, type SetupDrawerKind, type StudioArea, type StudioMediaState } from "./types";

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
  const [activeArea, setActiveArea] = useState<StudioArea>("create");
  const [quality, setQuality] = useState<QualityMode>("elite");
  const [drawer, setDrawer] = useState<SetupDrawerKind>(null);
  const [command, setCommand] = useState(workspaceConfig.contentExamples[0] ?? "Create a campaign for us");
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
      if (data?.status === "setup_needed" || data?.status === "provider_failed") {
        setMediaState({
          status: data.status === "setup_needed" ? "setup_needed" : "failed",
          task: data.task,
          assetId: data.assetId,
          selectedProvider: data.selectedProvider,
          selectedModel: data.selectedModel,
          message: data.message ?? "Playable media could not be queued.",
        });
        toast.error("Media setup needed", { description: data.message ?? "Playable media could not be queued." });
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
        message: "Video queued. The preview will update when a playable asset or provider job is returned.",
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

  // Poll for asset completion when a job is queued or processing
  useEffect(() => {
    const isPending = mediaState.status === "processing" || mediaState.status === "queued";
    const assetId = toAssetId(mediaState.assetId);
    if (!isPending || !assetId) return;

    let cancelled = false;
    const poll = async () => {
      try {
        const data = await utils.admin.getMediaAsset.fetch({ id: assetId });
        if (cancelled) return;
        if (!data) return;
        const asset = data as any;
        if (asset.status === "completed" && asset.publicUrl) {
          setMediaState((prev) => ({
            ...prev,
            status: "completed",
            publicUrl: asset.publicUrl,
            mimeType: asset.mimeType ?? prev.mimeType,
            message: "Media ready.",
          }));
          utils.admin.listMediaAssets.invalidate();
          toast.success("Media ready!", { description: "Your generated asset is now playable." });
        } else if (asset.status === "failed") {
          setMediaState((prev) => ({
            ...prev,
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

  const teamState = useMemo(() => {
    if (createDraft.isPending) return "active" as const;
    if (draft?.plainText?.includes("AI setup required")) return "blocked" as const;
    if (draft) return "complete" as const;
    return "waiting" as const;
  }, [createDraft.isPending, draft]);

  function runCreate(nextCommand = command) {
    const trimmed = nextCommand.trim();
    if (trimmed.length < 10) return;
    setCommand(trimmed);
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

  function improveWith(suffix: string) {
    const next = `${command}. ${suffix}`;
    setCommand(next);
    runCreate(next);
  }

  function queueMedia(task: "text_to_image" | "text_to_video" | "avatar_video" | "text_to_speech", draftOverride?: MarketingStudioDraft | null, commandOverride?: string) {
    const activeDraft = draftOverride ?? draft;
    const activeCommand = (commandOverride ?? command).trim();
    const requestKey = `${task}:${activeDraft?.id ?? "command"}:${activeCommand}`;
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
    setMediaState({ status: "queued", task, message: `${task === "text_to_video" ? "Video" : "Media"} queued for generation.` });
    createMediaJob.mutate({
      task,
      prompt: String(prompt).slice(0, 6000),
      draftId: activeDraft?.id,
      tenantId: workspace.tenantId,
      quality,
      platform: activeDraft?.platform,
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
              <StudioCommandCenter command={command} loading={createDraft.isPending} onCommandChange={setCommand} onSubmit={() => runCreate()} />
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
              <PreviewCanvas draft={draft} mediaState={mediaState} onRetryGenX={retryWithGenX} />
              <StickyActionBar
                disabled={createDraft.isPending || createMediaJob.isPending}
                onRegenerate={() => runCreate()}
                onImprove={() => improveWith("Make it feel more premium, concise and conversion-focused.")}
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
