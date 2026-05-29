import React from "react";

export function CaptionsStep({
  captionsRequired,
  isAvailable = false,
  status,
  isGenerating = false,
  onGenerate,
}: {
  captionsRequired: boolean;
  isAvailable?: boolean;
  status?: string | null;
  isGenerating?: boolean;
  onGenerate?: () => void;
}) {
  if (!captionsRequired && !isAvailable) {
    return null;
  }

  return (
    <div className="space-y-4" data-testid="captions-step">
      <h3 className="font-semibold text-stone-800">Captions</h3>
      <p className="text-sm text-stone-500">
        Auto-generated SRT/VTT captions from narration text.
      </p>
      <p className="text-xs text-stone-500">{status ?? (isAvailable ? "Captions ready." : "Captions pending generation.")}</p>
      <button
        type="button"
        onClick={onGenerate}
        disabled={isGenerating}
        className="rounded-full bg-stone-800 px-4 py-2 text-sm text-white hover:bg-stone-700 disabled:opacity-60"
      >
        {isGenerating ? "Generating captions..." : "Generate captions"}
      </button>
    </div>
  );
}
