import { Badge } from "@/components/ui/badge";
import type { QualityMode } from "./types";
import { workspaceConfig } from "./workspaceConfig";

export function CampaignContextStrip({ quality }: { quality: QualityMode }) {
  const items = [
    ["Goal", workspaceConfig.defaultGoals[0] ?? "Lead generation"],
    ["Audience", workspaceConfig.defaultAudience.split(",")[0] ?? "Your audience"],
    ["Platform(s)", "Facebook, Instagram, Email"],
    ["Presenter", workspaceConfig.defaultPresenter],
    ["Brand voice", workspaceConfig.brandTone],
    ["Quality", quality === "elite" ? "Elite" : "Standard"],
  ];

  return (
    <section className="flex gap-2 overflow-x-auto rounded-2xl border border-stone-200 bg-white p-2.5 shadow-sm" aria-label="Campaign Context Strip">
      {items.map(([label, value]) => (
        <Badge key={label} className="shrink-0 rounded-xl border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs text-stone-700">
          <span className="text-stone-400">{label}:</span> {value}
        </Badge>
      ))}
    </section>
  );
}
