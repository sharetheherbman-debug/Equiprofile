import { Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { workspaceConfig } from "./workspaceConfig";
import type { DurationOptionSeconds, PromptQualityControl } from "./types";

const DURATION_OPTIONS: DurationOptionSeconds[] = [5, 10, 15, 30, 60, 180];
const PROMPT_CONTROL_LABELS: Array<{ id: PromptQualityControl; label: string }> = [
  { id: "more_cinematic", label: "more cinematic" },
  { id: "more_realistic", label: "more realistic" },
  { id: "more_premium", label: "more premium" },
  { id: "no_people", label: "no people" },
  { id: "horse_showcase", label: "horse showcase" },
  { id: "product_demo", label: "product demo" },
  { id: "stable_owner_focus", label: "stable owner focus" },
];

export function StudioCommandCenter({
  command,
  loading,
  durationSeconds,
  promptControls,
  onCommandChange,
  onDurationChange,
  onPromptControlsChange,
  onSubmit,
}: {
  command: string;
  loading: boolean;
  durationSeconds: DurationOptionSeconds;
  promptControls: PromptQualityControl[];
  onCommandChange: (value: string) => void;
  onDurationChange: (value: DurationOptionSeconds) => void;
  onPromptControlsChange: (value: PromptQualityControl[]) => void;
  onSubmit: () => void;
}) {
  return (
    <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm md:p-7" aria-label="Command Center">
      <div className="mb-5">
        <div className="mb-1 flex items-center gap-2">
          <Sparkles className="size-5 text-violet-500" />
          <p className="text-base font-semibold text-stone-900">What should your AI marketing team create today?</p>
        </div>
        <p className="text-sm text-stone-500">Tell your AI marketing team what to create.</p>
      </div>
      <Textarea
        aria-label="Marketing command"
        value={command}
        onChange={(event) => onCommandChange(event.target.value)}
        placeholder="e.g. Create a horse video introducing EquiProfile"
        className="min-h-36 resize-none rounded-2xl border-stone-200 bg-stone-50 p-4 text-base text-stone-800 shadow-inner placeholder:text-stone-400 focus-visible:ring-violet-400"
      />
      <div className="mt-4 flex flex-wrap gap-2">
        {workspaceConfig.contentExamples.map((prompt) => (
          <button
            key={prompt}
            type="button"
            className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-1.5 text-left text-xs text-stone-600 transition hover:bg-stone-100 focus:outline-none focus:ring-2 focus:ring-violet-400"
            onClick={() => onCommandChange(prompt)}
          >
            {prompt}
          </button>
        ))}
      </div>
      <div className="mt-5 grid gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-3">
        <label className="text-xs font-semibold uppercase tracking-wide text-stone-500" htmlFor="studio-duration-select">Duration</label>
        <select
          id="studio-duration-select"
          className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700"
          value={durationSeconds}
          onChange={(event) => onDurationChange(Number(event.target.value) as DurationOptionSeconds)}
        >
          {DURATION_OPTIONS.map((seconds) => <option key={seconds} value={seconds}>{seconds}s</option>)}
        </select>
        <p className="text-xs text-stone-500">30s / 60s / 180s will generate a truthful scene plan when direct render is not supported.</p>
      </div>
      <div className="mt-3 rounded-2xl border border-stone-200 bg-stone-50 p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">Prompt quality controls</p>
        <div className="flex flex-wrap gap-2">
          {PROMPT_CONTROL_LABELS.map((control) => {
            const active = promptControls.includes(control.id);
            return (
              <button
                key={control.id}
                type="button"
                className={`rounded-xl border px-3 py-1.5 text-xs transition ${active ? "border-violet-300 bg-violet-100 text-violet-700" : "border-stone-200 bg-white text-stone-600 hover:bg-stone-100"}`}
                onClick={() => onPromptControlsChange(active ? promptControls.filter((entry) => entry !== control.id) : [...promptControls, control.id])}
              >
                {control.label}
              </button>
            );
          })}
        </div>
      </div>
      <div className="mt-5 flex justify-end">
        <Button
          type="button"
          onClick={onSubmit}
          disabled={loading || command.trim().length < 10}
          className="rounded-xl bg-[#f97316] px-6 text-white hover:bg-[#ea6c0e] focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:opacity-50"
        >
          <Send className="mr-1.5 size-4" />
          {loading ? "Creating..." : "Create"}
        </Button>
      </div>
    </section>
  );
}
