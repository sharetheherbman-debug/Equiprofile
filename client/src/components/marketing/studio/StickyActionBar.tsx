import { CalendarClock, Download, Edit3, Image, RefreshCw, Save, Scissors, Sparkles, UserRound, Video, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function StickyActionBar({
  disabled,
  onRegenerate,
  onImprove,
  onShorten,
}: {
  disabled?: boolean;
  onRegenerate: () => void;
  onImprove: () => void;
  onShorten: () => void;
}) {
  const actions = [
    { label: "Edit", icon: Edit3 },
    { label: "Regenerate", icon: RefreshCw, onClick: onRegenerate },
    { label: "Make more premium", icon: Sparkles, onClick: onImprove },
    { label: "Make shorter", icon: Scissors, onClick: onShorten },
    { label: "Generate image", icon: Image },
    { label: "Generate video", icon: Video },
    { label: "Generate voice", icon: Volume2 },
    { label: "Generate avatar", icon: UserRound },
    { label: "Send for approval", icon: Save },
    { label: "Schedule", icon: CalendarClock },
    { label: "Download", icon: Download },
  ];

  return (
    <nav className="sticky bottom-3 z-20 rounded-2xl border border-stone-200 bg-white/95 p-2 shadow-md backdrop-blur" aria-label="Campaign actions">
      <div className="flex gap-1.5 overflow-x-auto">
        {actions.map(({ label, icon: Icon, onClick }) => (
          <Button
            key={label}
            type="button"
            size="sm"
            variant="ghost"
            disabled={disabled}
            onClick={onClick}
            aria-label={label}
            className="shrink-0 rounded-xl border border-stone-100 bg-stone-50 text-stone-600 hover:bg-stone-100 hover:text-stone-800 focus:outline-none focus:ring-2 focus:ring-violet-400 disabled:opacity-40"
          >
            <Icon className="size-4" />
            <span className="hidden sm:inline">{label}</span>
          </Button>
        ))}
      </div>
    </nav>
  );
}
