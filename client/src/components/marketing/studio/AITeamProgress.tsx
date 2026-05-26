import { Badge } from "@/components/ui/badge";

const STEPS = ["Strategy", "Copy", "Creative", "Media", "Compliance", "Schedule"];

export function AITeamProgress({ state }: { state: "waiting" | "active" | "complete" | "blocked" }) {
  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.06] p-4 text-white md:p-5" aria-label="AI Team Progress">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-semibold">AI Team Progress</p>
        <Badge className="border-white/10 bg-white/10 text-white">{state === "active" ? "Working" : state === "complete" ? "Complete" : state === "blocked" ? "Setup needed" : "Ready"}</Badge>
      </div>
      <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {STEPS.map((step, index) => {
          const active = state === "active" && index <= 2;
          const complete = state === "complete";
          const blocked = state === "blocked";
          return (
            <div key={step} className={`rounded-2xl border p-3 text-sm ${complete ? "border-emerald-300/40 bg-emerald-300/10" : active ? "border-amber-300/40 bg-amber-300/10" : blocked ? "border-rose-300/40 bg-rose-300/10" : "border-white/10 bg-black/20"}`}>
              <div className="mb-2 h-1.5 rounded-full bg-white/10">
                <div className={`h-full rounded-full ${complete ? "w-full bg-emerald-300" : active ? "w-2/3 bg-amber-300" : blocked ? "w-1/3 bg-rose-300" : "w-1/4 bg-slate-500"}`} />
              </div>
              <p className="font-semibold">{step}</p>
              <p className="mt-1 text-xs text-slate-300">{complete ? "Ready" : active ? "In motion" : blocked ? "Needs setup" : "Standing by"}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
