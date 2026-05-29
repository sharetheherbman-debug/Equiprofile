import React from "react";
import type { MarketingStudioPlan } from "@shared/_core/marketingStudioPlan";

export function RenderStep({
  plan,
  isAvailable = false,
  statusLabel,
  canCreateRenderJob,
  isStarting,
  onStartRender,
  onCancelRender,
}: {
  plan: Pick<MarketingStudioPlan, "status" | "renderMode" | "scenes">;
  isAvailable?: boolean;
  statusLabel?: string | null;
  canCreateRenderJob?: boolean;
  isStarting?: boolean;
  onStartRender: () => void;
  onCancelRender?: () => void;
}) {
  if (!isAvailable) {
    return (
      <div className="space-y-4" data-testid="render-step">
        <h3 className="font-semibold text-stone-800">Render</h3>
        <p className="text-sm text-stone-500">
          Renderer not installed yet. This will be assembled in the media factory.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="render-step">
      <h3 className="font-semibold text-stone-800">Render</h3>
      <p className="text-sm text-stone-500">
        Assemble scenes into a final video. Render mode: <strong>{plan.renderMode}</strong>.
      </p>
      <p className="text-xs text-stone-500">
        Scenes with sourced media: {plan.scenes.filter((scene) => scene.assetUrl && scene.mediaKind !== "text_card").length}/{plan.scenes.length}
      </p>
      {statusLabel ? (
        <p className="text-sm text-stone-600">
          Status: <strong>{statusLabel}</strong>
        </p>
      ) : null}
      <div className="flex items-center gap-3 flex-wrap">
        {canCreateRenderJob ? (
          <button
            type="button"
            onClick={onStartRender}
            disabled={isStarting}
            className="rounded-full bg-stone-800 px-4 py-2 text-sm text-white hover:bg-stone-700 disabled:opacity-60"
          >
            {isStarting ? "Creating render job..." : "Create render job"}
          </button>
        ) : (
          <span className="rounded-full border border-stone-200 px-4 py-2 text-sm text-stone-500">
            Render job is available for assembled video plans.
          </span>
        )}
        {onCancelRender ? (
          <button
            type="button"
            onClick={onCancelRender}
            className="rounded-full border border-stone-200 px-4 py-2 text-sm text-stone-600 hover:bg-stone-50"
          >
            Cancel render
          </button>
        ) : null}
      </div>
    </div>
  );
}
