import { useState } from "react";
import { Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { workspaceConfig } from "./workspaceConfig";
import type { QualityMode } from "./types";

const PLATFORM_LABELS: Record<string, string> = {
  "facebook-pages": "Facebook",
  "instagram-business": "Instagram",
  "tiktok-business": "TikTok",
  "youtube-shorts": "YouTube Shorts",
  "youtube-long-form": "YouTube Long-form",
  "linkedin-company-pages": "LinkedIn",
  "google-business-profile": "Google Business",
  email: "Email",
  "blog-seo": "Blog",
};

const FREQUENCY = ["Light", "Standard", "Aggressive"];
const PLAN_LENGTH = ["7-day plan", "14-day plan", "30-day plan"];
const MODES = [
  { id: "off", label: "Off", description: "No automated creation." },
  { id: "approval", label: "Approval Mode", description: "AI creates drafts — you approve before anything is scheduled." },
  { id: "growth", label: "Growth Mode", description: "AI operates as your full marketing team." },
];

export function AutopilotWizard({ quality, onGeneratePlan }: { quality: QualityMode; onGeneratePlan: (prompt: string) => void }) {
  const [goal, setGoal] = useState(workspaceConfig.defaultGoals[0] ?? "Get leads");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["facebook-pages", "instagram-business", "email"]);
  const [frequency, setFrequency] = useState(FREQUENCY[1]);
  const [planLength, setPlanLength] = useState(PLAN_LENGTH[0]);
  const [mode, setMode] = useState("approval");

  function togglePlatform(id: string) {
    setSelectedPlatforms((prev) => prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]);
  }

  function buildPrompt() {
    const platformNames = selectedPlatforms.map((id) => PLATFORM_LABELS[id] ?? id).join(", ");
    return `Create a ${planLength} for "${goal}" across ${platformNames}. Frequency: ${frequency}. Quality: ${quality === "elite" ? "Elite" : "Standard"}. All content requires approval before scheduling.`;
  }

  return (
    <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm" aria-label="Autopilot Wizard">
      <div className="mb-6 flex items-center gap-3">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-500">
          <Zap className="size-6" />
        </span>
        <div>
          <h2 className="text-2xl font-semibold text-stone-900">Autopilot</h2>
          <p className="text-sm text-stone-500">Your AI marketing team runs on a plan. Approval mode is always on by default.</p>
        </div>
      </div>

      {/* Step 1 — Mode */}
      <div className="mb-5 space-y-2">
        <p className="text-sm font-semibold text-stone-800">1. Choose operating mode</p>
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            aria-pressed={mode === m.id}
            className={`w-full rounded-2xl border-2 p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-violet-400 ${mode === m.id ? "border-violet-400 bg-violet-50" : "border-stone-200 bg-stone-50 hover:border-stone-300"}`}
            onClick={() => setMode(m.id)}
          >
            <p className={`font-semibold ${mode === m.id ? "text-violet-800" : "text-stone-800"}`}>{m.label}</p>
            <p className="mt-0.5 text-xs text-stone-500">{m.description}</p>
          </button>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Step 2 — Goal */}
        <div className="rounded-2xl border border-stone-100 bg-stone-50 p-4">
          <p className="mb-3 text-sm font-semibold text-stone-800">2. Choose growth goal</p>
          <div className="space-y-2">
            {workspaceConfig.defaultGoals.map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={goal === item}
                className={`w-full rounded-xl px-3 py-2.5 text-left text-sm transition focus:outline-none focus:ring-2 focus:ring-violet-400 ${goal === item ? "bg-stone-900 text-white" : "bg-white text-stone-700 border border-stone-200 hover:border-stone-300"}`}
                onClick={() => setGoal(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {/* Step 3 — Platforms + Frequency */}
        <div className="rounded-2xl border border-stone-100 bg-stone-50 p-4">
          <p className="mb-3 text-sm font-semibold text-stone-800">3. Choose platforms</p>
          <div className="flex flex-wrap gap-2">
            {workspaceConfig.supportedPlatforms.map((id) => (
              <button
                key={id}
                type="button"
                aria-pressed={selectedPlatforms.includes(id)}
                className={`rounded-xl px-3 py-1.5 text-xs font-medium transition focus:outline-none focus:ring-2 focus:ring-violet-400 ${selectedPlatforms.includes(id) ? "bg-stone-900 text-white" : "border border-stone-200 bg-white text-stone-600 hover:bg-stone-50"}`}
                onClick={() => togglePlatform(id)}
              >
                {PLATFORM_LABELS[id] ?? id}
              </button>
            ))}
          </div>
          <p className="mb-2 mt-4 text-sm font-semibold text-stone-800">4. Frequency</p>
          <div className="flex gap-2">
            {FREQUENCY.map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={frequency === item}
                className={`rounded-xl px-3 py-1.5 text-xs font-medium transition focus:outline-none focus:ring-2 focus:ring-violet-400 ${frequency === item ? "bg-stone-900 text-white" : "border border-stone-200 bg-white text-stone-600 hover:bg-stone-50"}`}
                onClick={() => setFrequency(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {/* Step 4 — Quality + Plan length + Launch */}
        <div className="rounded-2xl border border-stone-100 bg-stone-50 p-4">
          <p className="mb-2 text-sm font-semibold text-stone-800">5. Content quality</p>
          <Badge className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs text-emerald-700 border border-emerald-200">
            {quality === "elite" ? "Elite" : "Standard"}
          </Badge>
          <p className="mb-2 mt-4 text-sm font-semibold text-stone-800">6. Plan length</p>
          <div className="flex flex-wrap gap-2">
            {PLAN_LENGTH.map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={planLength === item}
                className={`rounded-xl px-3 py-1.5 text-xs font-medium transition focus:outline-none focus:ring-2 focus:ring-violet-400 ${planLength === item ? "bg-stone-900 text-white" : "border border-stone-200 bg-white text-stone-600 hover:bg-stone-50"}`}
                onClick={() => setPlanLength(item)}
              >
                {item}
              </button>
            ))}
          </div>
          <Button
            type="button"
            className="mt-5 w-full rounded-xl bg-[#f97316] text-white hover:bg-[#ea6c0e] focus:outline-none focus:ring-2 focus:ring-orange-400"
            onClick={() => onGeneratePlan(buildPrompt())}
          >
            Generate plan
          </Button>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
        <p className="font-semibold text-emerald-800">Approval required before any scheduling.</p>
        <p className="mt-1 text-sm text-emerald-700">Ready for approval workflow. Autopilot creates plan drafts and approval-ready content. Direct publishing waits for connected platform flows.</p>
      </div>
    </section>
  );
}
