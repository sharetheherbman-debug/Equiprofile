import { useState } from "react";
import { PlaneTakeoff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { QualityMode } from "./types";

const GOALS = ["Get stable leads", "Get riding school signups", "Grow social audience", "Promote academy", "Reactivate trials", "Launch/relaunch campaign"];
const PLATFORMS = ["Facebook", "Instagram", "TikTok", "YouTube", "LinkedIn", "Google Business", "Email", "Blog"];
const FREQUENCY = ["Light", "Standard", "Aggressive"];
const PLAN_LENGTH = ["7-day plan", "14-day plan", "30-day plan"];

export function AutopilotWizard({ quality, onGeneratePlan }: { quality: QualityMode; onGeneratePlan: (prompt: string) => void }) {
  const [goal, setGoal] = useState(GOALS[0]);
  const [frequency, setFrequency] = useState(FREQUENCY[1]);
  const [planLength, setPlanLength] = useState(PLAN_LENGTH[0]);

  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-4 text-white shadow-2xl" aria-label="Autopilot Wizard">
      <div className="mb-6 flex items-center gap-3">
        <span className="rounded-2xl bg-emerald-300/15 p-3 text-emerald-100"><PlaneTakeoff className="size-6" /></span>
        <div>
          <h2 className="text-2xl font-semibold">Autopilot</h2>
          <p className="text-sm text-slate-300">Default launch mode is Approval Mode. Plans become drafts for review before any schedule.</p>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
          <p className="mb-3 text-sm font-semibold">1. Choose goal</p>
          <div className="space-y-2">
            {GOALS.map((item) => (
              <button key={item} className={`w-full rounded-2xl px-3 py-2 text-left text-sm ${goal === item ? "bg-emerald-300 text-slate-950" : "bg-white/10 text-white"}`} onClick={() => setGoal(item)}>{item}</button>
            ))}
          </div>
        </div>
        <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
          <p className="mb-3 text-sm font-semibold">2. Choose platforms</p>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map((platform) => <Badge key={platform} className="rounded-full border-white/10 bg-white/10 px-3 py-2 text-white">{platform}</Badge>)}
          </div>
          <p className="mt-5 mb-3 text-sm font-semibold">3. Frequency</p>
          <div className="flex flex-wrap gap-2">
            {FREQUENCY.map((item) => <button key={item} className={`rounded-full px-3 py-2 text-xs ${frequency === item ? "bg-emerald-300 text-slate-950" : "bg-white/10 text-white"}`} onClick={() => setFrequency(item)}>{item}</button>)}
          </div>
        </div>
        <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
          <p className="mb-3 text-sm font-semibold">4. Approval rule</p>
          <Badge className="rounded-full bg-emerald-300 text-slate-950">Always require approval</Badge>
          <p className="mt-5 mb-3 text-sm font-semibold">5. Generate plan</p>
          <div className="flex flex-wrap gap-2">
            {PLAN_LENGTH.map((item) => <button key={item} className={`rounded-full px-3 py-2 text-xs ${planLength === item ? "bg-emerald-300 text-slate-950" : "bg-white/10 text-white"}`} onClick={() => setPlanLength(item)}>{item}</button>)}
          </div>
          <Button
            type="button"
            className="mt-5 w-full rounded-full bg-white text-slate-950 hover:bg-slate-100"
            onClick={() => onGeneratePlan(`Create a ${planLength} for ${goal} across Facebook, Instagram, YouTube, LinkedIn, Google Business, Email and Blog. Frequency: ${frequency}. Quality: ${quality}. Ready for approval workflow.`)}
          >
            Generate plan
          </Button>
        </div>
      </div>
      <div className="mt-5 rounded-3xl border border-emerald-300/20 bg-emerald-300/10 p-4">
        <p className="font-semibold">Ready for approval workflow.</p>
        <p className="mt-1 text-sm text-slate-300">Autopilot creates plan drafts and approval-ready content. Direct publishing waits for connected platform flows.</p>
      </div>
    </section>
  );
}
