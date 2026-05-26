import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const PRESENTERS = [
  { name: "Stable Growth Coach", role: "Lead generation guide", voice: "Warm UK advisor", style: "Stable-smart, practical", bestUse: "Stable owner reels and launch campaigns" },
  { name: "Riding School Advisor", role: "Education and enrolment guide", voice: "Clear and encouraging", style: "Helpful, polished", bestUse: "School signups and lesson promotion" },
  { name: "Calm Professional Presenter", role: "Operations explainer", voice: "Measured and expert", style: "Premium SaaS host", bestUse: "Feature demos and onboarding" },
  { name: "Premium Brand Host", role: "Authority presenter", voice: "Confident and refined", style: "Cinematic brand-led", bestUse: "Launch moments and hero content" },
];

export function PresenterSelector() {
  return (
    <div className="space-y-3">
      {PRESENTERS.map((presenter) => (
        <article key={presenter.name} className="rounded-3xl border border-white/10 bg-white/[0.06] p-4 text-white">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold">{presenter.name}</h3>
              <p className="mt-1 text-sm text-slate-300">{presenter.role}</p>
            </div>
            <Badge className="border-emerald-300/20 bg-emerald-300/10 text-emerald-100">Avatar script ready</Badge>
          </div>
          <div className="mt-4 grid gap-2 text-xs text-slate-300 sm:grid-cols-2">
            <p>Voice: {presenter.voice}</p>
            <p>Style: {presenter.style}</p>
            <p>Best use: {presenter.bestUse}</p>
            <p>Avatar video setup needed for playable presenter video.</p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" size="sm" className="rounded-full bg-white text-slate-950 hover:bg-slate-100">Use presenter</Button>
            <Button type="button" size="sm" variant="outline" className="rounded-full border-white/10 bg-white/10 text-white hover:bg-white/15">Generate avatar script</Button>
          </div>
        </article>
      ))}
    </div>
  );
}
