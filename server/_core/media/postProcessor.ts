import { promises as fs } from "fs";
import path from "path";
import { spawn } from "child_process";
import { createMediaAsset, getMediaAssetById, updateMediaAsset } from "../../modules/growth-engine/mediaAssets";

export type BrandOverlayOptions = {
  logoPath?: string;
  domainText?: string;
  ctaText?: string;
  introCardText?: string;
  endCardText?: string;
  subtitlesPath?: string;
  watermarkText?: string;
  aspectRatio?: "9:16" | "1:1" | "16:9";
};

type PostProcessDeps = {
  runFfmpeg?: (args: string[]) => Promise<void>;
};

function outputScaleFilter(aspectRatio: BrandOverlayOptions["aspectRatio"]) {
  if (aspectRatio === "9:16") return "scale=1080:1920";
  if (aspectRatio === "1:1") return "scale=1080:1080";
  return "scale=1920:1080";
}

async function defaultRunFfmpeg(args: string[]) {
  await new Promise<void>((resolve, reject) => {
    const child = spawn("ffmpeg", args, { stdio: "ignore" });
    child.on("error", reject);
    child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited with ${code}`))));
  });
}

function buildOutputPath(rawPath: string) {
  const ext = path.extname(rawPath) || ".mp4";
  const base = rawPath.slice(0, rawPath.length - ext.length);
  return `${base}.branded.${Date.now()}${ext}`;
}

export async function createBrandedMediaDerivative(
  rawAssetId: number,
  options: BrandOverlayOptions,
  deps: PostProcessDeps = {},
) {
  const raw = await getMediaAssetById(rawAssetId);
  if (!raw) {
    throw new Error(`Raw media asset not found: ${rawAssetId}`);
  }
  const rawPath = raw.localPath;
  if (!rawPath) {
    throw new Error("Raw media must have a localPath before post-processing.");
  }
  await fs.access(rawPath);
  const outputPath = buildOutputPath(rawPath);
  if (outputPath === rawPath) {
    throw new Error("Post-processing must not overwrite raw media.");
  }

  const filterParts = [outputScaleFilter(options.aspectRatio)];
  if (options.watermarkText) {
    filterParts.push(`drawtext=text='${options.watermarkText.replace(/'/g, "\\'")}':x=w-tw-40:y=40:fontsize=32:fontcolor=white@0.8`);
  }
  if (options.domainText) {
    filterParts.push(`drawtext=text='${options.domainText.replace(/'/g, "\\'")}':x=40:y=h-th-40:fontsize=38:fontcolor=white`);
  }
  if (options.ctaText) {
    filterParts.push(`drawtext=text='${options.ctaText.replace(/'/g, "\\'")}':x=(w-tw)/2:y=h-th-80:fontsize=44:fontcolor=white`);
  }
  const filterComplex = filterParts.join(",");
  const ffmpeg = deps.runFfmpeg ?? defaultRunFfmpeg;

  try {
    await ffmpeg([
      "-y",
      "-i",
      rawPath,
      ...(options.logoPath ? ["-i", options.logoPath] : []),
      "-vf",
      filterComplex,
      "-c:v",
      "libx264",
      "-c:a",
      "aac",
      outputPath,
    ]);
  } catch (error) {
    throw new Error(`post_processing_failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  const branded = await createMediaAsset({
    tenantType: raw.tenantType,
    tenantId: raw.tenantId,
    userId: raw.userId ?? undefined,
    campaignId: raw.campaignId ?? undefined,
    draftId: raw.draftId ?? undefined,
    type: raw.type,
    provider: "post_processor",
    task: raw.task ?? undefined,
    status: "completed",
    localPath: outputPath,
    mimeType: raw.mimeType ?? "video/mp4",
    generationPrompt: raw.generationPrompt ?? undefined,
    outputMetadata: {
      source: "post_processing_overlay",
      rawAssetId: raw.id,
      aspectRatio: options.aspectRatio ?? "16:9",
      overlays: {
        domainText: options.domainText ?? null,
        ctaText: options.ctaText ?? null,
        watermarkText: options.watermarkText ?? null,
        logoPath: options.logoPath ?? null,
      },
    },
  });

  await updateMediaAsset(raw.id, {
    outputMetadata: {
      ...(raw.outputMetadata ?? {}),
      brandedAssetId: branded.id,
      postProcessingStatus: "completed",
    },
  });

  return {
    rawAssetId: raw.id,
    brandedAssetId: branded.id,
    brandedLocalPath: outputPath,
  };
}
