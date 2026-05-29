import type { MarketingStudioPlan } from "../../../../shared/_core/marketingStudioPlan";
import type { MarketingTimeline } from "./renderJobTypes";

function normalizeDuration(value: number | undefined): number {
  if (!Number.isFinite(value) || !value || value <= 0) return 4;
  return Math.max(1, Math.min(600, Math.round(value)));
}

function clampText(value: string | undefined, fallback = ""): string {
  return String(value ?? fallback).trim();
}

function toAssetUrl(assetId: number | null): string | null {
  if (!assetId || assetId <= 0) return null;
  return `/media/generated/assets/${assetId}`;
}

function inferSceneAssetUrl(input: {
  assetId: number | null;
  assetUrl?: string | null;
  visualPrompt: string;
  sourceType: string;
}): string | null {
  if (input.assetUrl && input.assetUrl.trim()) return input.assetUrl.trim();
  const byId = toAssetUrl(input.assetId);
  if (byId) return byId;
  if (input.sourceType !== "text_card" && input.visualPrompt.trim().startsWith("http")) {
    return input.visualPrompt.trim();
  }
  return null;
}

function inferMediaKind(input: {
  sourceType: string;
  mediaKind?: string | null;
  assetUrl: string | null;
}): "image" | "video" | "text_card" {
  if (input.sourceType === "text_card") return "text_card";
  if (input.mediaKind === "image" || input.mediaKind === "video" || input.mediaKind === "text_card") return input.mediaKind;
  const value = String(input.assetUrl ?? "").toLowerCase();
  if (/\.(mp4|mov|webm|m4v)(\?|$)/.test(value)) return "video";
  return "image";
}

export function compileMarketingTimeline(plan: Pick<MarketingStudioPlan, "scenes" | "script">): MarketingTimeline {
  let cursor = 0;
  const scenes = [...(plan.scenes ?? [])]
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map((scene, index) => {
      const durationSeconds = normalizeDuration(scene.durationSeconds);
      const narration = clampText(scene.narration, clampText(plan.script, `Scene ${index + 1}`));
      const textCard = scene.sourceType === "text_card"
        ? clampText(scene.visualPrompt, narration)
        : clampText(scene.visualPrompt, narration);

      const startSeconds = cursor;
      const endSeconds = cursor + durationSeconds;
      cursor = endSeconds;

      return {
        id: scene.id,
        order: scene.order,
        durationSeconds,
        sourceType: scene.sourceType,
        mediaKind: inferMediaKind({
          sourceType: scene.sourceType,
          mediaKind: scene.mediaKind,
          assetUrl: scene.assetUrl ?? null,
        }),
        assetId: scene.assetId ?? null,
        assetUrl: inferSceneAssetUrl({
          assetId: scene.assetId,
          assetUrl: scene.assetUrl,
          visualPrompt: scene.visualPrompt,
          sourceType: scene.sourceType,
        }),
        previewUrl: scene.previewUrl ?? null,
        provider: scene.provider ?? null,
        providerAssetId: scene.providerAssetId ?? null,
        textCard,
        narration,
        visualPrompt: clampText(scene.visualPrompt),
        caption: narration,
        metadata: {
          requiredSubject: clampText(scene.requiredSubject),
          negativePrompt: clampText(scene.negativePrompt),
          sourceMetadata: scene.sourceMetadata ?? null,
          selectedAt: scene.selectedAt ?? null,
          selectionReason: scene.selectionReason ?? null,
          status: scene.status ?? "pending",
        },
        _timing: { startSeconds, endSeconds },
      };
    });

  const captionLines = scenes.map((scene) => ({
    startSeconds: scene._timing.startSeconds,
    endSeconds: scene._timing.endSeconds,
    text: scene.caption,
  }));

  return {
    scenes: scenes.map(({ _timing, ...scene }) => scene),
    totalDurationSeconds: captionLines.length > 0 ? captionLines[captionLines.length - 1].endSeconds : 0,
    captionLines,
  };
}
