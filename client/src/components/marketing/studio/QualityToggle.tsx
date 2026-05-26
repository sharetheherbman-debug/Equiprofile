import { Button } from "@/components/ui/button";
import type { QualityMode } from "./types";

export function QualityToggle({ value, onChange }: { value: QualityMode; onChange: (value: QualityMode) => void }) {
  return (
    <div className="inline-flex rounded-full border border-white/15 bg-white/10 p-1" role="group" aria-label="AI generation quality">
      {(["standard", "elite"] as const).map((mode) => (
        <Button
          key={mode}
          type="button"
          size="sm"
          variant="ghost"
          aria-pressed={value === mode}
          className={`rounded-full px-4 text-xs capitalize text-white hover:bg-white/15 ${value === mode ? "bg-white text-slate-950 hover:bg-white" : ""}`}
          onClick={() => onChange(mode)}
        >
          {mode === "standard" ? "Standard" : "Elite"}
        </Button>
      ))}
    </div>
  );
}
