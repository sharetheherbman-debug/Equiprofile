import { ArrowLeft, Sparkles, Zap } from "lucide-react";
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
    <section
      className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#faf8f4] via-[#f3efe8] to-[#ede8df] px-6 py-8 shadow-sm md:px-10 md:py-10"
      aria-label="Marketing Studio hero"
    >
      {/* Subtle decorative gradient blob */}
      <div className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full bg-gradient-to-br from-violet-200/40 to-transparent blur-3xl" />
      <div className="pointer-events-none absolute -bottom-10 left-10 size-48 rounded-full bg-gradient-to-tr from-amber-100/50 to-transparent blur-2xl" />

      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          {onBackToAdmin ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mb-4 -ml-2 text-stone-600 hover:bg-stone-100 focus:outline-none focus:ring-2 focus:ring-violet-400"
              onClick={onBackToAdmin}
            >
              <ArrowLeft className="mr-1 size-4" />
              Admin
            </Button>
          ) : null}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Badge className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700">
              <Sparkles className="mr-1 inline size-3" />
              AI creative workspace
            </Badge>
            <Badge className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
              Approval mode active
            </Badge>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-stone-900 md:text-5xl">Marketing Studio</h1>
          <p className="mt-3 max-w-xl text-base text-stone-500 md:text-lg">
            Your AI marketing team — campaigns, content, media and growth.
          </p>
        </div>

        <div className="flex flex-col gap-3 rounded-3xl border border-stone-200 bg-white p-4 shadow-sm md:min-w-72">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-stone-700">Content quality</span>
            <QualityToggle value={quality} onChange={onQualityChange} />
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              className="rounded-2xl border border-stone-100 bg-stone-50 p-3 text-left transition hover:bg-stone-100 focus:outline-none focus:ring-2 focus:ring-violet-400"
              onClick={() => onAreaChange("autopilot")}
              type="button"
              aria-label="Go to Autopilot"
            >
              <Zap className="mb-1.5 size-4 text-violet-500" />
              <span className="font-medium text-stone-700">Autopilot</span>
            </button>
            <button
              className="rounded-2xl border border-stone-100 bg-stone-50 p-3 text-left transition hover:bg-stone-100 focus:outline-none focus:ring-2 focus:ring-violet-400"
              onClick={() => onAreaChange("setup")}
              type="button"
              aria-label="Go to workspace setup"
            >
              <Sparkles className="mb-1.5 size-4 text-amber-500" />
              <span className="font-medium text-stone-700">Workspace setup</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

