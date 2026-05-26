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
    { label: "Export campaign", icon: Download },
  ];

  return (
    <nav className="sticky bottom-3 z-20 rounded-[1.5rem] border border-white/10 bg-slate-950/90 p-2 shadow-2xl backdrop-blur" aria-label="Campaign actions">
      <div className="flex gap-2 overflow-x-auto">
        {actions.map(({ label, icon: Icon, onClick }) => (
          <Button
            key={label}
            type="button"
            size="sm"
            variant="ghost"
            disabled={disabled}
            onClick={onClick}
            className="shrink-0 rounded-full border border-white/10 bg-white/5 text-white hover:bg-white/10"
          >
            <Icon className="size-4" />
            {label}
          </Button>
        ))}
      </div>
    </nav>
  );
}
