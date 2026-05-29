import React from "react";
import type { MarketingStudioPlan } from "@shared/_core/marketingStudioPlan";

export function MediaSelectionStep({
  plan,
  isSourcing = false,
  sourcingStatus = null,
  onFindSceneMedia,
  onAcceptSourcedMedia,
}: {
  plan: Pick<MarketingStudioPlan, "scenes">;
  isSourcing?: boolean;
  sourcingStatus?: "ok" | "setup_needed" | "provider_unavailable" | null;
  onFindSceneMedia?: () => void;
  onAcceptSourcedMedia?: () => void;
}) {
  return (
    <div className="space-y-4" data-testid="media-selection-step">
      <h3 className="font-semibold text-stone-800">Media Sources</h3>
      <p className="text-sm text-stone-500">
        Source and review media for each scene before rendering.
      </p>
      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={onFindSceneMedia}
          disabled={isSourcing || !onFindSceneMedia}
          className="rounded-full bg-stone-800 px-4 py-2 text-sm text-white hover:bg-stone-700 disabled:opacity-60"
        >
          {isSourcing ? "Finding scene media..." : "Find scene media"}
        </button>
        <button
          type="button"
          onClick={onAcceptSourcedMedia}
          disabled={!onAcceptSourcedMedia}
          className="rounded-full border border-stone-200 px-4 py-2 text-sm text-stone-600 hover:bg-stone-50 disabled:opacity-60"
        >
          Accept sourced media
        </button>
        {sourcingStatus === "setup_needed" ? (
          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs text-amber-700">
            Provider setup needed
          </span>
        ) : sourcingStatus === "provider_unavailable" ? (
          <span className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs text-orange-700">
            Provider unavailable
          </span>
        ) : null}
      </div>
      {plan.scenes.length === 0 ? (
        <p className="text-sm text-stone-400">No scenes to assign media to yet.</p>
      ) : (
        <ol className="space-y-3">
          {plan.scenes.map((scene, index) => (
            <li key={scene.id} className="rounded-2xl border border-stone-200 bg-white p-4">
              <p className="text-xs font-mono text-stone-400 mb-1">Scene {index + 1} · {scene.sourceType} · {scene.mediaKind}</p>
              {scene.assetUrl && scene.mediaKind !== "text_card" ? (
                <p className="text-sm text-green-700">Selected · {scene.provider ?? "stock"} · {scene.status}</p>
              ) : scene.sourceType === "text_card" || scene.mediaKind === "text_card" ? (
                <p className="text-sm text-stone-500">Text card fallback</p>
              ) : scene.status === "needs_review" ? (
                <p className="text-sm text-amber-700">Needs review</p>
              ) : (
                <p className="text-sm text-stone-400">No media selected yet.</p>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
