import { Send, WandSparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { EXAMPLE_PROMPTS } from "./types";

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
    <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.07] p-4 shadow-2xl backdrop-blur md:p-6" aria-label="Command Center">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">Command Center</p>
          <p className="text-sm text-slate-300">What should your AI marketing team create today?</p>
        </div>
        <WandSparkles className="size-5 text-emerald-200" />
      </div>
      <Textarea
        aria-label="Marketing command"
        value={command}
        onChange={(event) => onCommandChange(event.target.value)}
        placeholder="What should your AI marketing team create today?"
        className="min-h-36 resize-none rounded-3xl border-white/10 bg-black/35 p-5 text-base text-white shadow-inner placeholder:text-slate-400 focus-visible:ring-emerald-300"
      />
      <div className="mt-4 flex flex-wrap gap-2">
        {EXAMPLE_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            className="rounded-full border border-white/10 bg-white/10 px-3 py-2 text-left text-xs text-slate-200 transition hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-emerald-300"
            onClick={() => onCommandChange(prompt)}
          >
            {prompt}
          </button>
        ))}
      </div>
      <div className="mt-5 flex justify-end">
        <Button type="button" onClick={onSubmit} disabled={loading || command.trim().length < 10} className="rounded-full bg-emerald-300 px-5 text-slate-950 hover:bg-emerald-200">
          <Send className="size-4" />
          {loading ? "Creating..." : "Create campaign"}
        </Button>
      </div>
    </section>
  );
}
