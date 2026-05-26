import { Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { workspaceConfig } from "./workspaceConfig";

export function StudioCommandCenter({
  command,
  loading,
  onCommandChange,
  onSubmit,
}: {
  command: string;
  loading: boolean;
  onCommandChange: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm md:p-7" aria-label="Command Center">
      <div className="mb-5">
        <div className="mb-1 flex items-center gap-2">
          <Sparkles className="size-5 text-violet-500" />
          <p className="text-base font-semibold text-stone-900">What are we growing today?</p>
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
