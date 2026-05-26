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
import { normalizeDraftFromText, type MarketingStudioDraft, type QualityMode, type SetupDrawerKind, type StudioArea } from "./types";

const PRIMARY_AREAS: Array<{ id: StudioArea; label: string }> = [
  { id: "create", label: "Create" },
  { id: "campaigns", label: "Campaigns" },
  { id: "assets", label: "Assets" },
  { id: "autopilot", label: "Autopilot" },
];

const TILE_PROMPTS: Record<string, string> = {
  "Reel / Short": "Create a 30-second Facebook reel for UK stable owners",
  "Social Post": "Write a LinkedIn authority post for equestrian business owners",
  "Ad Creative": "Create a premium Facebook ad creative for riding school signups",
  "Email Campaign": "Create an email campaign for inactive trial users",
  "Blog / SEO Article": "Write a Blog / SEO article outline for stable management software",
  "YouTube Script": "Create a YouTube Long-form script for equestrian business owners",
  "Launch Campaign": "Build a 7-day launch campaign for riding schools",
  "Weekly Content Pack": "Generate a week of YouTube Shorts for horse owners",
  "Avatar Video": "Create an avatar video script for UK stable owners",
};

export function MarketingStudioV2({ onBackToAdmin }: { onBackToAdmin?: () => void }) {
  const utils = trpc.useUtils();
  const [activeArea, setActiveArea] = useState<StudioArea>("create");
  const [quality, setQuality] = useState<QualityMode>("elite");
  const [drawer, setDrawer] = useState<SetupDrawerKind>(null);
  const [command, setCommand] = useState("Create a 30-second Facebook reel for UK stable owners");
  const [draft, setDraft] = useState<MarketingStudioDraft | null>(null);

  const drafts = trpc.admin.listMarketingDrafts.useQuery({ tenantId: "global" });
  const approvals = trpc.admin.listApprovalQueue.useQuery({ tenantId: "global" });
  const calendar = trpc.admin.listMarketingCalendar.useQuery({ tenantId: "global" });
  const assets = trpc.admin.listMarketingAssets.useQuery({ tenantId: "global" });

  const createDraft = trpc.admin.createMarketingDraft.useMutation({
    onSuccess: (data: any) => {
      if (data?.status !== "created" || !data?.draft) {
        setDraft(normalizeDraftFromText(command, "AI setup required. Add provider keys in Provider Settings, then run the campaign again. Sample output is clearly marked until generation is ready."));
        toast.error("AI setup required", { description: "Provider setup is not complete yet." });
        return;
      }
      setDraft(data.draft as MarketingStudioDraft);
      toast.success("Campaign generated");
      utils.admin.listMarketingDrafts.invalidate();
      utils.admin.listApprovalQueue.invalidate();
    },
    onError: () => {
      setDraft(normalizeDraftFromText(command, "AI setup required. Add provider keys in Provider Settings, then run the campaign again. Sample output is clearly marked until generation is ready."));
      toast.error("AI setup required", { description: "Open Provider Settings for the simple setup path." });
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
    <main className="min-h-screen bg-[#050708] px-3 py-4 text-white md:px-6 md:py-6">
      <div className="mx-auto max-w-[1800px] space-y-5">
        <StudioHero quality={quality} onQualityChange={setQuality} onAreaChange={setActiveArea} onOpenSetup={setDrawer} onBackToAdmin={onBackToAdmin} />

        <nav className="sticky top-2 z-10 flex gap-2 overflow-x-auto rounded-full border border-white/10 bg-slate-950/80 p-2 shadow-2xl backdrop-blur" aria-label="Marketing Studio primary areas">
          {PRIMARY_AREAS.map((area) => (
            <button
              key={area.id}
              type="button"
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-emerald-300 ${activeArea === area.id ? "bg-white text-slate-950" : "text-slate-200 hover:bg-white/10"}`}
              onClick={() => setActiveArea(area.id)}
            >
              {area.label}
            </button>
          ))}
          <button type="button" className="ml-auto shrink-0 rounded-full px-4 py-2 text-sm text-slate-200 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-300" onClick={() => setDrawer("brand")}>Brand setup</button>
          <button type="button" className="shrink-0 rounded-full px-4 py-2 text-sm text-slate-200 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-300" onClick={() => setDrawer("audience")}>Audience setup</button>
          <button type="button" className="shrink-0 rounded-full px-4 py-2 text-sm text-slate-200 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-300" onClick={() => setDrawer("presenter")}>Presenter</button>
        </nav>

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

        {activeArea === "campaigns" ? <CampaignKanban drafts={(drafts.data as any[]) ?? []} approvals={(approvals.data as any[]) ?? []} scheduled={(calendar.data as any[]) ?? []} /> : null}
        {activeArea === "assets" ? <AssetLibrary assets={(assets.data as any[]) ?? []} /> : null}
        {activeArea === "autopilot" ? <AutopilotWizard quality={quality} onGeneratePlan={(prompt) => { setActiveArea("create"); setCommand(prompt); runCreate(prompt); }} /> : null}
      </div>

      <SetupDrawer openKind={drawer} quality={quality} onQualityChange={setQuality} onOpenChange={setDrawer} />
    </main>
  );
}
