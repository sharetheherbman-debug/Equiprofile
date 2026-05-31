import { existsSync } from "node:fs";
import { join, dirname, basename, extname } from "node:path";
import { execa } from "execa";
import ffmpegPath from "ffmpeg-static";

const EXTRACT_TIMEOUT_MS = 15_000;

export interface FrameExtractionResult {
  success: boolean;
  frameUrls: string[];
  thumbnailUrl: string | null;
  setupNeeded: boolean;
  needsManualReview: boolean;
  reason: string | null;
}

function resolveStorageRoot(): string {
  return (
    process.env.STORAGE_ROOT ??
    process.env.LOCAL_MEDIA_STORAGE_ROOT ??
    join(process.cwd(), "storage")
  );
}

function publicUrlForPath(localPath: string): string {
  const storageRoot = resolveStorageRoot();
  const relative = localPath.startsWith(storageRoot)
    ? localPath.slice(storageRoot.length).replace(/\\/g, "/")
    : "/" + basename(localPath);
  return relative.startsWith("/") ? relative : `/${relative}`;
}

export async function extractMarketingVideoFrames(input: {
  localVideoPath?: string | null;
  publicVideoUrl?: string | null;
  frameCount?: number;
}): Promise<FrameExtractionResult> {
  const frameCount = Math.min(Math.max(input.frameCount ?? 3, 1), 5);

  if (!ffmpegPath) {
    return {
      success: false,
      frameUrls: [],
      thumbnailUrl: null,
      setupNeeded: true,
      needsManualReview: true,
      reason: "ffmpeg-static not found — manual visual review required",
    };
  }

  if (!input.localVideoPath || !existsSync(input.localVideoPath)) {
    if (input.publicVideoUrl) {
      return {
        success: false,
        frameUrls: [],
        thumbnailUrl: null,
        setupNeeded: false,
        needsManualReview: true,
        reason: "Only remote URL available — manual visual review required",
      };
    }
    return {
      success: false,
      frameUrls: [],
      thumbnailUrl: null,
      setupNeeded: false,
      needsManualReview: true,
      reason: "No local video path — manual visual review required",
    };
  }

  const storageRoot = resolveStorageRoot();
  const videoDir = dirname(input.localVideoPath);
  const videoBase = basename(input.localVideoPath, extname(input.localVideoPath));
  const outputDir = join(storageRoot, "visual-qa-frames");

  try {
    const { mkdirSync } = await import("node:fs");
    mkdirSync(outputDir, { recursive: true });
  } catch {
    // ignore
  }

  const frameUrls: string[] = [];
  let thumbnailUrl: string | null = null;

  try {
    for (let i = 0; i < frameCount; i++) {
      const outFile = join(outputDir, `${videoBase}_frame${i}.jpg`);
      // Use fixed second-based offsets spread across a typical short marketing video (0–30s).
      // ffmpeg -ss expects seconds; we avoid fractions that cluster near 0s.
      const ss = String(i === 0 ? 1 : i * 5);

      await execa(
        ffmpegPath as string,
        [
          "-y",
          "-ss", ss,
          "-i", input.localVideoPath,
          "-vf", "thumbnail,scale=640:-1",
          "-vframes", "1",
          outFile,
        ],
        { timeout: EXTRACT_TIMEOUT_MS, reject: false },
      );

      if (existsSync(outFile)) {
        const url = publicUrlForPath(outFile);
        frameUrls.push(url);
        if (i === 0) thumbnailUrl = url;
      }
    }

    if (frameUrls.length === 0) {
      return {
        success: false,
        frameUrls: [],
        thumbnailUrl: null,
        setupNeeded: false,
        needsManualReview: true,
        reason: "Frame extraction produced no output — manual review required",
      };
    }

    return {
      success: true,
      frameUrls,
      thumbnailUrl: thumbnailUrl,
      setupNeeded: false,
      needsManualReview: false,
      reason: null,
    };
  } catch (err) {
    return {
      success: false,
      frameUrls: [],
      thumbnailUrl: null,
      setupNeeded: false,
      needsManualReview: true,
      reason: `Frame extraction failed — manual review required: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

export async function extractMarketingVideoThumbnail(input: {
  localVideoPath?: string | null;
  publicVideoUrl?: string | null;
}): Promise<FrameExtractionResult> {
  return extractMarketingVideoFrames({ ...input, frameCount: 1 });
}
