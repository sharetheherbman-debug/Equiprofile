import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { QualityMode } from "@/components/marketing/studio/types";

export type AppSection = "chat" | "assets" | "campaigns" | "calendar" | "brand" | "settings";
export type AppStatus = "ready" | "generating" | "setup_needed" | "needs_approval";

const SECTIONS: Array<{ id: AppSection; label: string }> = [
  { id: "assets", label: "Assets" },
  { id: "campaigns", label: "Campaigns" },
  { id: "calendar", label: "Calendar" },
  { id: "brand", label: "Brand" },
  { id: "settings", label: "Settings" },
];

function statusLabel(status: AppStatus): string {
  if (status === "generating") return "Generating";
  if (status === "setup_needed") return "Setup needed";
  if (status === "needs_approval") return "Needs approval";
  return "Ready";
}

function statusClass(status: AppStatus): string {
  if (status === "generating") return "border-blue-200 bg-blue-50 text-blue-700";
  if (status === "setup_needed") return "border-amber-200 bg-amber-50 text-amber-700";
  if (status === "needs_approval") return "border-violet-200 bg-violet-50 text-violet-700";
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

export function MarketingAppTopBar({
  quality,
  activeSection,
  appStatus,
  onQualityChange,
  onSectionChange,
}: {
  quality: QualityMode;
  activeSection: AppSection;
  appStatus: AppStatus;
  onQualityChange: (value: QualityMode) => void;
  onSectionChange: (section: AppSection) => void;
}) {
  return (
    <header
      className="flex flex-wrap items-center gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-3 shadow-sm"
      aria-label="The Marketing App top bar"
    >
      {/* Title and workspace */}
      <div className="flex min-w-0 flex-col">
        <span className="text-base font-semibold text-stone-900 leading-tight">The Marketing App</span>
        <span className="text-xs text-stone-400 leading-tight">EquiProfile</span>
      </div>

      {/* Status pill */}
      <Badge className={`rounded-full border px-3 py-1 text-xs font-medium ${statusClass(appStatus)}`}>
        {statusLabel(appStatus)}
      </Badge>

      {/* Standard / Elite mode toggle */}
      <div className="flex rounded-xl border border-stone-200 bg-stone-50 p-0.5" role="group" aria-label="Quality mode">
        {(["standard", "elite"] as QualityMode[]).map((mode) => (
          <button
            key={mode}
            type="button"
            aria-pressed={quality === mode}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition focus:outline-none focus:ring-2 focus:ring-violet-400 ${
              quality === mode
                ? "bg-stone-900 text-white shadow-sm"
                : "text-stone-600 hover:bg-stone-100"
            }`}
            onClick={() => onQualityChange(mode)}
          >
            {mode === "elite" ? "Elite" : "Standard"}
          </button>
        ))}
      </div>

      {/* Section navigation */}
      <nav className="ml-auto flex flex-wrap gap-1" aria-label="Marketing App sections">
        {SECTIONS.map((section) => (
          <Button
            key={section.id}
            type="button"
            variant="ghost"
            size="sm"
            aria-current={activeSection === section.id ? "page" : undefined}
            className={`rounded-xl px-3 py-1.5 text-xs font-medium transition focus:outline-none focus:ring-2 focus:ring-violet-400 ${
              activeSection === section.id
                ? "bg-stone-100 text-stone-900"
                : "text-stone-500 hover:bg-stone-50 hover:text-stone-800"
            }`}
            onClick={() => onSectionChange(section.id)}
          >
            {section.label}
          </Button>
        ))}
      </nav>
    </header>
  );
}
