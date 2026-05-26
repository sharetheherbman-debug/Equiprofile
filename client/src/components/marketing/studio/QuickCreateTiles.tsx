import { FileText, Film, Mail, Megaphone, Newspaper, PlaySquare, Rocket, Sparkles, UserRound, CalendarDays } from "lucide-react";

const QUICK_CREATE_LABELS: Array<{ label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { label: "Reel / Short", icon: Film },
  { label: "Social Post", icon: Megaphone },
  { label: "Ad Creative", icon: Sparkles },
  { label: "Email Campaign", icon: Mail },
  { label: "Blog / SEO Article", icon: Newspaper },
  { label: "YouTube Script", icon: PlaySquare },
  { label: "Launch Campaign", icon: Rocket },
  { label: "Weekly Content Pack", icon: FileText },
  { label: "Avatar Video", icon: UserRound },
  { label: "7-Day Growth Plan", icon: CalendarDays },
];

export function QuickCreateTiles({ onSelect }: { onSelect: (label: string) => void }) {
  return (
    <section aria-label="Quick Create Tiles" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {QUICK_CREATE_LABELS.map(({ label, icon: Icon }) => (
        <button
          key={label}
          type="button"
          className="group rounded-2xl border border-stone-200 bg-white p-4 text-left shadow-sm transition hover:border-violet-300 hover:bg-violet-50 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-violet-400"
          onClick={() => onSelect(label)}
        >
          <Icon className="mb-3 size-5 text-violet-500 transition group-hover:scale-110" />
          <span className="text-sm font-semibold text-stone-800">{label}</span>
        </button>
      ))}
    </section>
  );
}
