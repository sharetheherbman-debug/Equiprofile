import { Loader2, Sparkles, Wand2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function MarketingCommandComposer({
  command,
  setCommand,
  aiReady,
  readinessMessage,
  isGenerating,
  hasDraft,
  onGenerate,
  onEdit,
  onRegenerate,
  onImproveHook,
  onMakePremium,
}: {
  command: string;
  setCommand: (value: string) => void;
  aiReady: boolean;
  readinessMessage?: string;
  isGenerating: boolean;
  hasDraft: boolean;
  onGenerate: () => void;
  onEdit: () => void;
  onRegenerate: () => void;
  onImproveHook: () => void;
  onMakePremium: () => void;
}) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.06] p-5 shadow-xl backdrop-blur">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-300">Studio Chat</p>
          <h2 className="mt-2 flex items-center gap-2 text-2xl font-semibold">
            <Sparkles className="h-5 w-5 text-emerald-300" />
            Tell the AI team what to make
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            One command creates strategy, script, caption, CTA, media direction, compliance notes and schedule guidance.
          </p>
        </div>
        <Badge variant={aiReady ? "default" : "secondary"}>{aiReady ? "AI Ready" : "Setup Required"}</Badge>
      </div>

      {!aiReady && (
        <div className="mb-4 rounded-2xl border border-amber-300/40 bg-amber-300/10 p-4 text-sm text-amber-100">
          <p className="font-semibold">AI setup required - add a GenX API key and run provider test.</p>
          <p className="mt-1 text-amber-100/80">
            {readinessMessage || "Open Settings, connect GenX, then run the provider test. Developer Diagnostics is available only for technical repair."}
          </p>
        </div>
      )}

      <Textarea
        rows={6}
        value={command}
        onChange={(event) => setCommand(event.target.value)}
        placeholder="Create a 30-second Facebook reel for UK stable owners."
        className="border-white/10 bg-slate-950/70 text-base text-white placeholder:text-slate-500"
      />
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button disabled={isGenerating || command.trim().length < 10} onClick={onGenerate}>
          {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
          Generate polished campaign
        </Button>
        <Button variant="secondary" disabled={!hasDraft} onClick={onEdit}>Edit</Button>
        <Button variant="outline" disabled={!hasDraft} onClick={onRegenerate}>Regenerate</Button>
        <Button variant="outline" disabled={!hasDraft} onClick={onImproveHook}>Improve hook</Button>
        <Button variant="outline" disabled={!hasDraft} onClick={onMakePremium}>Make more premium</Button>
      </div>
    </div>
  );
}
