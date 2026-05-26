import { Button } from "@/components/ui/button";
import type { QualityMode } from "./types";

export function QualityToggle({ value, onChange }: { value: QualityMode; onChange: (value: QualityMode) => void }) {
  return (
    <div className="inline-flex rounded-xl border border-stone-200 bg-stone-100 p-0.5" role="group" aria-label="AI generation quality">
      {(["standard", "elite"] as const).map((mode) => (
        <Button
          key={mode}
          type="button"
          size="sm"
          variant="ghost"
          aria-pressed={value === mode}
          className={`rounded-xl px-4 text-xs capitalize focus:outline-none focus:ring-2 focus:ring-violet-400 ${value === mode ? "bg-white text-stone-900 shadow-sm hover:bg-white" : "text-stone-500 hover:bg-stone-200 hover:text-stone-700"}`}
          onClick={() => onChange(mode)}
        >
          {mode === "standard" ? "Standard" : "Elite"}
        </Button>
      ))}
    </div>
  );
}
