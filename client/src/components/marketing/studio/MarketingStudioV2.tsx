import { useMemo, useState } from "react";
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
import { WorkspaceSetupWizard } from "./WorkspaceSetupWizard";
import { workspaceConfig } from "./workspaceConfig";
import { normalizeDraftFromText, type MarketingStudioDraft, type QualityMode, type SetupDrawerKind, type StudioArea } from "./types";

const PRIMARY_AREAS: Array<{ id: StudioArea; label: string }> = [
  { id: "setup", label: "Setup" },
  { id: "create", label: "Create" },
  { id: "campaigns", label: "Campaigns" },
  { id: "media", label: "Media" },
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

export function MarketingStudioV2({ onBackToAdmin }: { onBackToAdmin?: () => void }) {
  const utils = trpc.useUtils();
  const [activeArea, setActiveArea] = useState<StudioArea>("create");
  const [quality, setQuality] = useState<QualityMode>("elite");
  const [drawer, setDrawer] = useState<SetupDrawerKind>(null);
  const [command, setCommand] = useState(workspaceConfig.contentExamples[0] ?? "Create a campaign for us");
  const [draft, setDraft] = useState<MarketingStudioDraft | null>(null);

  const drafts = trpc.admin.listMarketingDrafts.useQuery({ tenantId: "global" });
  const approvals = trpc.admin.listApprovalQueue.useQuery({ tenantId: "global" });
  const calendar = trpc.admin.listMarketingCalendar.useQuery({ tenantId: "global" });
  const assets = trpc.admin.listMarketingAssets.useQuery({ tenantId: "global" });

  const createDraft = trpc.admin.createMarketingDraft.useMutation({
    onSuccess: (data: any) => {
      if (data?.status !== "created" || !data?.draft) {
        setDraft(normalizeDraftFromText(command, "AI setup required. Add provider keys in settings, then run the campaign again. Sample output is clearly marked until generation is ready."));
        toast.error("AI setup required", { description: "Provider setup is not complete yet." });
        return;
      }
      setDraft(data.draft as MarketingStudioDraft);
      toast.success("Campaign generated");
      utils.admin.listMarketingDrafts.invalidate();
      utils.admin.listApprovalQueue.invalidate();
    },
    onError: () => {
      setDraft(normalizeDraftFromText(command, "AI setup required. Add provider keys in settings, then run the campaign again. Sample output is clearly marked until generation is ready."));
      toast.error("AI setup required", { description: "Open settings to configure your AI team." });
    },
  });

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
    createDraft.mutate({
      prompt: trimmed,
      tenantId: "global",
      tone: quality === "elite" ? "premium" : "professional",
    });
  }

  function improveWith(suffix: string) {
    const next = `${command}. ${suffix}`;
    setCommand(next);
    runCreate(next);
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
        {activeArea === "setup" ? (
          <WorkspaceSetupWizard quality={quality} onQualityChange={setQuality} onComplete={() => setActiveArea("create")} />
        ) : null}

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
              <PreviewCanvas draft={draft} />
              <StickyActionBar
                disabled={!draft || createDraft.isPending}
                onRegenerate={() => runCreate()}
                onImprove={() => improveWith("Make it feel more premium, concise and conversion-focused.")}
                onShorten={() => improveWith("Make the output shorter while keeping the CTA clear.")}
              />
            </div>
          </div>
        ) : null}

        {/* Campaigns — kanban workflow */}
        {activeArea === "campaigns" ? (
          <CampaignKanban drafts={(drafts.data as any[]) ?? []} approvals={(approvals.data as any[]) ?? []} scheduled={(calendar.data as any[]) ?? []} />
        ) : null}

        {/* Media — library */}
        {activeArea === "media" ? (
          <AssetLibrary assets={(assets.data as any[]) ?? []} />
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
    </main>
  );
}

