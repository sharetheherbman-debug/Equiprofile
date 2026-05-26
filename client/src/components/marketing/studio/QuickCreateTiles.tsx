import { FileText, Film, Mail, Megaphone, Newspaper, PlaySquare, Rocket, Sparkles, UserRound } from "lucide-react";
import { QUICK_CREATE_LABELS } from "./types";

const icons = [Film, Megaphone, Sparkles, Mail, Newspaper, PlaySquare, Rocket, FileText, UserRound];

export function QuickCreateTiles({ onSelect }: { onSelect: (label: string) => void }) {
  return (
    <section aria-label="Quick Create Tiles" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {QUICK_CREATE_LABELS.map((label, index) => {
        const Icon = icons[index] ?? Sparkles;
        return (
          <button
            key={label}
            type="button"
            className="group rounded-3xl border border-white/10 bg-white/[0.06] p-4 text-left text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-white/[0.1] focus:outline-none focus:ring-2 focus:ring-emerald-300"
            onClick={() => onSelect(label)}
          >
            <Icon className="mb-4 size-5 text-emerald-200 transition group-hover:scale-110" />
            <span className="text-sm font-semibold">{label}</span>
          </button>
        );
      })}
    </section>
  );
}
