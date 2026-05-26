import { Badge } from "@/components/ui/badge";

const STEPS = ["Strategy", "Copy", "Creative", "Media", "Compliance", "Schedule"];

export function AITeamProgress({ state }: { state: "waiting" | "active" | "complete" | "blocked" }) {
  const statusLabel = state === "active" ? "Working" : state === "complete" ? "Complete" : state === "blocked" ? "Setup needed" : "Ready";
  const statusColor = state === "active" ? "bg-amber-50 text-amber-700 border-amber-200" : state === "complete" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : state === "blocked" ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-stone-50 text-stone-500 border-stone-200";

  return (
    <section className="rounded-3xl border border-stone-200 bg-white p-4 shadow-sm md:p-5" aria-label="AI Team Progress">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-semibold text-stone-800">AI Team Progress</p>
        <Badge className={`rounded-full border px-3 py-1 text-xs ${statusColor}`}>{statusLabel}</Badge>
      </div>
      <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {STEPS.map((step, index) => {
          const active = state === "active" && index <= 2;
          const complete = state === "complete";
          const blocked = state === "blocked";
          const barColor = complete ? "bg-emerald-400" : active ? "bg-amber-400" : blocked ? "bg-rose-400" : "bg-stone-200";
          const barWidth = complete ? "w-full" : active ? "w-2/3" : blocked ? "w-1/3" : "w-1/4";
          const cardBg = complete ? "border-emerald-100 bg-emerald-50" : active ? "border-amber-100 bg-amber-50" : blocked ? "border-rose-100 bg-rose-50" : "border-stone-100 bg-stone-50";
          return (
            <div key={step} className={`rounded-2xl border p-3 text-sm ${cardBg}`}>
              <div className="mb-2 h-1.5 rounded-full bg-stone-100">
                <div className={`h-full rounded-full transition-all ${barColor} ${barWidth}`} />
              </div>
              <p className="font-semibold text-stone-800">{step}</p>
              <p className="mt-1 text-xs text-stone-500">{complete ? "Ready" : active ? "In motion" : blocked ? "Needs setup" : "Standing by"}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
