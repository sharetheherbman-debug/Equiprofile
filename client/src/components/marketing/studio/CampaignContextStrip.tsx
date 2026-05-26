import { Badge } from "@/components/ui/badge";
import type { QualityMode } from "./types";

export function CampaignContextStrip({ quality }: { quality: QualityMode }) {
  const items = [
    ["Goal", "Lead generation"],
    ["Audience", "UK stable owners"],
    ["Platform(s)", "Facebook, Instagram, Email"],
    ["Presenter", "Stable Growth Coach"],
    ["Brand voice", "Premium, helpful, expert"],
    ["Quality", quality === "elite" ? "Elite" : "Standard"],
  ];

  return (
    <section className="flex gap-2 overflow-x-auto rounded-full border border-white/10 bg-black/25 p-2" aria-label="Campaign Context Strip">
      {items.map(([label, value]) => (
        <Badge key={label} className="shrink-0 rounded-full border-white/10 bg-white/10 px-3 py-2 text-slate-100">
          <span className="text-slate-400">{label}:</span> {value}
        </Badge>
      ))}
    </section>
  );
}
