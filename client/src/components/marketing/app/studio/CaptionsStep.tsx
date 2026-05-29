import React from "react";

export function CaptionsStep({
  captionsRequired,
  isAvailable = false,
}: {
  captionsRequired: boolean;
  isAvailable?: boolean;
}) {
  if (!captionsRequired && !isAvailable) {
    return null;
  }

  return (
    <div className="space-y-4" data-testid="captions-step">
      <h3 className="font-semibold text-stone-800">Captions</h3>
      <p className="text-sm text-stone-500">
        Auto-generated SRT/VTT captions from narration text. Caption generation will be available in PR43.
      </p>
    </div>
  );
}
