import { z } from "zod";

export const MARKETING_STUDIO_SCENE_STATUS_SCHEMA = z.enum(["pending", "asset_selected", "ready", "needs_review", "error"]);

export const MARKETING_STUDIO_SCENE_SCHEMA = z.object({
  id: z.string().min(1).max(120),
  order: z.number().int().min(1),
  durationSeconds: z.number().min(1).max(600),
  narration: z.string().max(8000).default(""),
  visualPrompt: z.string().max(8000).default(""),
  negativePrompt: z.string().max(2000).default(""),
  sourceType: z.enum(["stock", "generated", "upload", "text_card"]),
  requiredSubject: z.string().max(500).default(""),
  assetId: z.number().nullable(),
  assetUrl: z.string().max(2000).nullable().optional(),
  previewUrl: z.string().max(2000).nullable().optional(),
  provider: z.string().max(80).nullable().optional(),
  providerAssetId: z.string().max(120).nullable().optional(),
  mediaKind: z.enum(["image", "video", "text_card"]).optional(),
  sourceMetadata: z.record(z.string(), z.unknown()).nullable().optional(),
  selectedAt: z.string().datetime().nullable().optional(),
  selectionReason: z.string().max(800).nullable().optional(),
  status: MARKETING_STUDIO_SCENE_STATUS_SCHEMA.optional(),
});
