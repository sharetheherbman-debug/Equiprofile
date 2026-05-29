import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import ffmpegStatic from "ffmpeg-static";
import { execa } from "execa";
import { writeGeneratedAsset } from "../../../_core/storage/localMediaStorage";
import type { MarketingBrandOverlay, MarketingTimeline, RenderOutput } from "./renderJobTypes";

const TEST_MP4_BASE64 = "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";

function escapeDrawText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/:/g, "\\:")
    .replace(/'/g, "\\'")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function buildOverlayText(timeline: MarketingTimeline, overlay: MarketingBrandOverlay): string {
  const sceneLines = timeline.scenes.slice(0, 3).map((scene, index) => `${index + 1}. ${scene.narration || scene.textCard}`);
  return [
    overlay.brandName,
    overlay.domain,
    ...sceneLines,
    `CTA: ${overlay.cta}`,
  ].join("\\n");
}

function ffmpegBinaryAvailable(): string | null {
  if (typeof ffmpegStatic === "string" && ffmpegStatic.length > 0 && fs.existsSync(ffmpegStatic)) {
    return ffmpegStatic;
  }
  return null;
}

export async function renderMarketingTimeline(input: {
  jobId: string;
  timeline: MarketingTimeline;
  brandOverlay: MarketingBrandOverlay;
  testMode?: boolean;
}): Promise<{ status: "completed"; output: RenderOutput } | { status: "setup_needed"; errorMessage: string }> {
  const duration = Math.max(1, Math.round(input.timeline.totalDurationSeconds || 1));

  if (input.testMode) {
    const { localPath, publicUrl, fileSizeBytes } = await writeGeneratedAsset({
      data: Buffer.from(TEST_MP4_BASE64, "base64"),
      folder: "generated",
      mimeType: "video/mp4",
      jobId: input.jobId,
      ext: "mp4",
    });

    return {
      status: "completed",
      output: {
        publicUrl,
        filePath: localPath,
        mimeType: "video/mp4",
        durationSeconds: duration,
        sizeBytes: fileSizeBytes,
      },
    };
  }

  const ffmpegPath = ffmpegBinaryAvailable();
  if (!ffmpegPath) {
    return {
      status: "setup_needed",
      errorMessage: "ffmpeg-static binary is unavailable in this runtime.",
    };
  }

  const overlayText = escapeDrawText(buildOverlayText(input.timeline, input.brandOverlay));
  const tmpOut = path.join(os.tmpdir(), `marketing-render-${input.jobId}.mp4`);

  try {
    await execa(ffmpegPath, [
      "-y",
      "-f",
      "lavfi",
      "-i",
      `color=c=${input.brandOverlay.primaryColor}:s=1280x720:d=${duration}`,
      "-vf",
      `drawtext=fontcolor=white:fontsize=40:x=80:y=120:text='${overlayText}',format=yuv420p`,
      "-c:v",
      "libx264",
      "-t",
      String(duration),
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      tmpOut,
    ]);

    const data = await fs.promises.readFile(tmpOut);
    const { localPath, publicUrl, fileSizeBytes } = await writeGeneratedAsset({
      data,
      folder: "generated",
      mimeType: "video/mp4",
      jobId: input.jobId,
      ext: "mp4",
    });

    return {
      status: "completed",
      output: {
        publicUrl,
        filePath: localPath,
        mimeType: "video/mp4",
        durationSeconds: duration,
        sizeBytes: fileSizeBytes,
      },
    };
  } catch {
    return {
      status: "setup_needed",
      errorMessage: "Media renderer could not execute ffmpeg. Verify binary/runtime permissions.",
    };
  } finally {
    try {
      await fs.promises.unlink(tmpOut);
    } catch {
      // ignore
    }
  }
}
