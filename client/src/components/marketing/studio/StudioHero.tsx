import { ArrowLeft, Bot, CheckCircle2, PlaneTakeoff, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { QualityToggle } from "./QualityToggle";
import type { QualityMode, SetupDrawerKind, StudioArea } from "./types";

export function StudioHero({
  quality,
  onQualityChange,
  onAreaChange,
  onOpenSetup,
  onBackToAdmin,
}: {
  quality: QualityMode;
  onQualityChange: (value: QualityMode) => void;
  onAreaChange: (area: StudioArea) => void;
  onOpenSetup: (drawer: SetupDrawerKind) => void;
  onBackToAdmin?: () => void;
}) {
  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.28),transparent_34%),linear-gradient(135deg,#050708_0%,#111827_55%,#1c1917_100%)] p-5 text-white shadow-2xl md:p-8">
      <div className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300/70 to-transparent" />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {onBackToAdmin ? (
              <Button type="button" variant="ghost" size="sm" className="text-white hover:bg-white/10" onClick={onBackToAdmin}>
                <ArrowLeft className="size-4" />
                Admin
              </Button>
            ) : null}
            <Badge className="border-emerald-300/30 bg-emerald-400/15 text-emerald-100">AI creative workspace</Badge>
            <Badge className="border-white/15 bg-white/10 text-white">Approval mode</Badge>
          </div>
          <h1 className="text-3xl font-semibold tracking-normal md:text-5xl">EquiProfile Marketing Studio</h1>
          <p className="mt-3 max-w-2xl text-base text-slate-200 md:text-lg">Your AI marketing team for campaigns, content, media and growth.</p>
        </div>
        <div className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-black/25 p-3 backdrop-blur md:min-w-80">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-slate-200">Quality</span>
            <QualityToggle value={quality} onChange={onQualityChange} />
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button className="rounded-2xl border border-white/10 bg-white/10 p-3 text-left transition hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-emerald-300" onClick={() => onOpenSetup("providers")}>
              <Bot className="mb-2 size-4 text-emerald-200" />
              AI connected
            </button>
            <button className="rounded-2xl border border-white/10 bg-white/10 p-3 text-left transition hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-emerald-300" onClick={() => onAreaChange("autopilot")}>
              <PlaneTakeoff className="mb-2 size-4 text-sky-200" />
              Autopilot shortcut
            </button>
            <button className="rounded-2xl border border-white/10 bg-white/10 p-3 text-left transition hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-emerald-300" onClick={() => onOpenSetup("platforms")}>
              <Sparkles className="mb-2 size-4 text-amber-200" />
              Platforms
            </button>
            <button className="rounded-2xl border border-white/10 bg-white/10 p-3 text-left transition hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-emerald-300" onClick={() => onOpenSetup("providers")}>
              <CheckCircle2 className="mb-2 size-4 text-emerald-200" />
              Approval ready
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
