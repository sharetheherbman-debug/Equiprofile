import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import ffmpegStatic from "ffmpeg-static";
import { execa } from "execa";
import { writeGeneratedAsset } from "../../../_core/storage/localMediaStorage";
import type { MarketingBrandOverlay, MarketingTimeline, RenderOutput } from "./renderJobTypes";
import { generateSrtCaptions, generateVttCaptions } from "./marketingCaptionService";

const TEST_MP4_BASE64 = "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";

function escapeDrawText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/:/g, "\\:")
    .replace(/'/g, "\\'")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function escapeSubtitlePath(filePath: string): string {
  return String(filePath)
    .replace(/\\/g, "\\\\")
    .replace(/:/g, "\\:")
    .replace(/'/g, "\\'");
}

function safeSceneText(value: string): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function isRemoteUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

function isAllowedRemoteStockUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    const allowedHosts = [
      "pexels.com",
      "pixabay.com",
      "pexelscdn.com",
      "cdn.pixabay.com",
      "images.pexels.com",
      "videos.pexels.com",
    ];
    return allowedHosts.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
  } catch {
    return false;
  }
}

function buildSceneOverlayFilter(input: {
  sceneText: string;
  overlay: MarketingBrandOverlay;
  isFinalScene: boolean;
}): string {
  const safe = input.overlay.safeArea ?? { top: 40, right: 40, bottom: 40, left: 40 };
  const placements = input.overlay.placements ?? {
    logo: "top_right" as const,
    brandDomain: "top_left" as const,
    cta: "bottom_right" as const,
  };
  const brandX = placements.brandDomain === "bottom_center" ? "(w-tw)/2" : `${safe.left}`;
  const brandY = placements.brandDomain === "bottom_left" || placements.brandDomain === "bottom_center"
    ? `h-${safe.bottom + 96}`
    : `${safe.top}`;
  const domainX = placements.brandDomain === "bottom_center" ? "(w-tw)/2" : `${safe.left}`;
  const domainY = placements.brandDomain === "bottom_left" || placements.brandDomain === "bottom_center"
    ? `h-${safe.bottom + 64}`
    : `${safe.top + 44}`;
  const ctaText = input.isFinalScene && input.overlay.endCard?.enabled
    ? `CTA: ${input.overlay.endCard.cta || input.overlay.cta}`
    : input.overlay.cta;
  const ctaX = placements.cta === "bottom_center" ? "(w-tw)/2" : placements.cta === "bottom_left" ? `${safe.left}` : `w-tw-${safe.right}`;
  const ctaY = `h-${safe.bottom + 36}`;
  const ctaColor = input.isFinalScene ? input.overlay.secondaryColor : "white";
  const lines = [
    `drawtext=fontcolor=white:fontsize=30:x=${brandX}:y=${brandY}:text='${escapeDrawText(input.overlay.brandName)}'`,
    `drawtext=fontcolor=white:fontsize=22:x=${domainX}:y=${domainY}:text='${escapeDrawText(input.overlay.domain)}'`,
    `drawtext=fontcolor=white:fontsize=28:x=${safe.left}:y=h-${safe.bottom + 100}:text='${escapeDrawText(input.sceneText)}'`,
  ];
  lines.push(`drawtext=fontcolor=${escapeDrawText(ctaColor)}:fontsize=30:x=${ctaX}:y=${ctaY}:text='${escapeDrawText(ctaText)}'`);
  if (input.isFinalScene && input.overlay.endCard?.enabled) {
    lines.push(`drawtext=fontcolor=white:fontsize=40:x=(w-tw)/2:y=(h*0.35):text='${escapeDrawText(input.overlay.endCard.title || input.overlay.brandName)}'`);
  }
  return lines.join(",");
}

function ffmpegBinaryAvailable(): string | null {
  if (typeof ffmpegStatic === "string" && ffmpegStatic.length > 0 && fs.existsSync(ffmpegStatic)) {
    return ffmpegStatic;
  }
  return null;
}

function sceneBaseVideoFilter(): string {
  return "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:black,fps=30,format=yuv420p";
}

export function buildSceneSegmentCommand(input: {
  ffmpegPath: string;
  tmpDir: string;
  scene: MarketingTimeline["scenes"][number];
  sceneIndex: number;
  totalScenes: number;
  overlay: MarketingBrandOverlay;
  enableLogoOverlay?: boolean;
}): { command: string; args: string[]; outputPath: string } {
  const scene = input.scene;
  const duration = String(Math.max(1, Math.round(scene.durationSeconds || 1)));
  const outputPath = path.join(input.tmpDir, `scene-${input.sceneIndex + 1}.mp4`);
  const isFinalScene = input.sceneIndex === input.totalScenes - 1;
  const sceneText = safeSceneText(scene.caption || scene.narration || scene.textCard || `Scene ${input.sceneIndex + 1}`);
  const vf = `${sceneBaseVideoFilter()},${buildSceneOverlayFilter({ sceneText, overlay: input.overlay, isFinalScene })}`;
  const remoteAssetAllowed = Boolean(scene.assetUrl && (!isRemoteUrl(scene.assetUrl) || isAllowedRemoteStockUrl(scene.assetUrl)));
  const logoUrl = input.enableLogoOverlay !== false ? input.overlay.logoUrl : undefined;
  const useLogo = Boolean(logoUrl && input.overlay.placements?.logo !== "none");
  const safe = input.overlay.safeArea ?? { top: 40, right: 40, bottom: 40, left: 40 };
  const logoPlacement = input.overlay.placements?.logo ?? "top_right";
  const logoX = logoPlacement === "top_left" ? `${safe.left}` : `W-w-${safe.right}`;
  const logoY = `${safe.top}`;
  const shouldUseAsset = Boolean(scene.assetUrl && scene.mediaKind !== "text_card" && remoteAssetAllowed);

  if (shouldUseAsset && scene.mediaKind === "image") {
    const filter = `${sceneBaseVideoFilter()},${buildSceneOverlayFilter({ sceneText, overlay: input.overlay, isFinalScene })}`;
    const filterComplex = `[0:v]${filter}[base];[1:v]scale=140:-1[logo];[base][logo]overlay=${logoX}:${logoY}`;
    return {
      command: input.ffmpegPath,
      args: [
        "-y",
        "-loop",
        "1",
        "-t",
        duration,
        "-i",
        scene.assetUrl!,
        ...(useLogo ? ["-i", logoUrl!] : []),
        ...(useLogo ? ["-filter_complex", filterComplex] : ["-vf", vf]),
        "-an",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        outputPath,
      ],
      outputPath,
    };
  }

  if (shouldUseAsset && scene.mediaKind === "video") {
    const filter = `${sceneBaseVideoFilter()},${buildSceneOverlayFilter({ sceneText, overlay: input.overlay, isFinalScene })}`;
    const filterComplex = `[0:v]${filter}[base];[1:v]scale=140:-1[logo];[base][logo]overlay=${logoX}:${logoY}`;
    const args = [
      "-y",
      ...(scene.assetUrl && !isRemoteUrl(scene.assetUrl) ? ["-stream_loop", "-1"] : []),
      ...(scene.assetUrl && isRemoteUrl(scene.assetUrl)
        ? ["-rw_timeout", "15000000", "-timeout", "15000000", "-reconnect", "1", "-reconnect_streamed", "1", "-reconnect_delay_max", "2"]
        : []),
      "-i",
      scene.assetUrl!,
      "-t",
      duration,
      ...(useLogo ? ["-i", logoUrl!] : []),
      ...(useLogo ? ["-filter_complex", filterComplex] : ["-vf", vf]),
      "-an",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      outputPath,
    ];
    return { command: input.ffmpegPath, args, outputPath };
  }

  const fallbackText = safeSceneText(scene.textCard || scene.narration || scene.visualPrompt || `Scene ${input.sceneIndex + 1}`);
  const fallbackFilter = `${buildSceneOverlayFilter({
    sceneText: fallbackText,
    overlay: input.overlay,
    isFinalScene,
  })},format=yuv420p`;
  const fallbackComplex = `[0:v]${fallbackFilter}[base];[1:v]scale=140:-1[logo];[base][logo]overlay=${logoX}:${logoY}`;

  return {
    command: input.ffmpegPath,
    args: [
      "-y",
      "-f",
      "lavfi",
      "-i",
      `color=c=${input.overlay.primaryColor}:s=1280x720:d=${duration}`,
      ...(useLogo ? ["-i", logoUrl!] : []),
      ...(useLogo ? ["-filter_complex", fallbackComplex] : ["-vf", fallbackFilter]),
      "-an",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      outputPath,
    ],
    outputPath,
  };
}

async function renderSceneWithFallback(input: {
  ffmpegPath: string;
  tmpDir: string;
  scene: MarketingTimeline["scenes"][number];
  sceneIndex: number;
  totalScenes: number;
  overlay: MarketingBrandOverlay;
}): Promise<{ outputPath: string; warning?: string }> {
  if (input.scene.assetUrl && isRemoteUrl(input.scene.assetUrl) && !isAllowedRemoteStockUrl(input.scene.assetUrl)) {
    const fallback = buildSceneSegmentCommand({
      ffmpegPath: input.ffmpegPath,
      tmpDir: input.tmpDir,
      scene: {
        ...input.scene,
        sourceType: "text_card",
        mediaKind: "text_card",
        assetUrl: null,
      },
      sceneIndex: input.sceneIndex,
      totalScenes: input.totalScenes,
      overlay: input.overlay,
    });
    await execa(fallback.command, fallback.args, { timeout: 30_000 });
    return {
      outputPath: fallback.outputPath,
      warning: `Scene ${input.scene.id} used disallowed remote host; text card fallback used.`,
    };
  }

  const primary = buildSceneSegmentCommand({
    ffmpegPath: input.ffmpegPath,
    tmpDir: input.tmpDir,
    scene: input.scene,
    sceneIndex: input.sceneIndex,
    totalScenes: input.totalScenes,
    overlay: input.overlay,
    enableLogoOverlay: true,
  });
  try {
    await execa(primary.command, primary.args, { timeout: 45_000 });
    return { outputPath: primary.outputPath };
  } catch (error) {
    if (input.overlay.logoUrl) {
      try {
        const withoutLogo = buildSceneSegmentCommand({
          ffmpegPath: input.ffmpegPath,
          tmpDir: input.tmpDir,
          scene: input.scene,
          sceneIndex: input.sceneIndex,
          totalScenes: input.totalScenes,
          overlay: input.overlay,
          enableLogoOverlay: false,
        });
        await execa(withoutLogo.command, withoutLogo.args, { timeout: 35_000 });
        return {
          outputPath: withoutLogo.outputPath,
          warning: `Scene ${input.sceneIndex + 1} logo overlay failed; rendering continued without logo.`,
        };
      } catch {
        // Continue to text-card fallback below.
      }
    }
    const fallbackScene = {
      ...input.scene,
      sourceType: "text_card" as const,
      mediaKind: "text_card" as const,
      assetUrl: null,
    };
    const fallback = buildSceneSegmentCommand({
      ffmpegPath: input.ffmpegPath,
      tmpDir: input.tmpDir,
      scene: fallbackScene,
      sceneIndex: input.sceneIndex,
      totalScenes: input.totalScenes,
      overlay: input.overlay,
    });
    await execa(fallback.command, fallback.args, { timeout: 30_000 });
    return {
      outputPath: fallback.outputPath,
      warning: `Scene ${input.scene.id} media failed; text card fallback used (${error instanceof Error ? error.message : String(error)}).`,
    };
  }
}

export async function renderMarketingTimeline(input: {
  jobId: string;
  timeline: MarketingTimeline;
  brandOverlay: MarketingBrandOverlay;
  audio?: {
    audioUrl?: string | null;
    backgroundMusicUrl?: string | null;
  };
  captions?: {
    mode?: "none" | "script" | "voice_aligned";
    format?: "srt" | "vtt";
    srt?: string;
    vtt?: string;
  };
  testMode?: boolean;
}): Promise<{ status: "completed"; output: RenderOutput; warnings?: string[] } | { status: "setup_needed"; errorMessage: string }> {
  const duration = Math.max(1, Math.round(input.timeline.totalDurationSeconds || 1));
  const captionMode = input.captions?.mode ?? "none";
  const captionFormat = input.captions?.format ?? "srt";
  const srtText = input.captions?.srt || generateSrtCaptions(input.timeline);
  const vttText = input.captions?.vtt || generateVttCaptions(input.timeline);

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
        metadata: {
          audioIncluded: false,
          captionsBurnedIn: captionMode !== "none" && Boolean(srtText.trim()),
          captionMode,
          captionFormat,
          srt: srtText,
          vtt: vttText,
          audioStatus: "pending",
          captionStatus: captionMode === "none" ? "pending" : "generated",
        },
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

  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), `marketing-render-${input.jobId}-`));
  const tmpOut = path.join(tmpDir, `assembled-${input.jobId}.mp4`);
  const captionOut = path.join(tmpDir, `captioned-${input.jobId}.mp4`);
  const finalOut = path.join(tmpDir, `final-${input.jobId}.mp4`);
  const concatFile = path.join(tmpDir, "segments.txt");
  const srtPath = path.join(tmpDir, "captions.srt");
  const warnings: string[] = [];
  let workingVideoPath = tmpOut;
  let captionsBurnedIn = false;
  let audioIncluded = false;
  let captionStatus: "pending" | "generated" | "burned_in" | "failed" =
    captionMode === "none" ? "pending" : "generated";
  let audioStatus: "pending" | "setup_needed" | "queued" | "completed" | "failed" = "pending";

  try {
    const needsReviewOrTextCardCount = input.timeline.scenes.filter((scene) =>
      scene.sourceType === "text_card" || scene.metadata.status === "needs_review").length;
    if (needsReviewOrTextCardCount > 0) {
      warnings.push(`Render started with ${needsReviewOrTextCardCount} scenes in needs_review/text_card fallback state.`);
    }

    const sceneResults = await Promise.all(input.timeline.scenes.map(async (scene, index) => {
      return renderSceneWithFallback({
        ffmpegPath,
        tmpDir,
        scene,
        sceneIndex: index,
        totalScenes: input.timeline.scenes.length,
        overlay: input.brandOverlay,
      });
    }));
    sceneResults.forEach((result) => {
      if (result.warning) warnings.push(result.warning);
    });

    const concatBody = sceneResults.map((result) => `file '${result.outputPath.replace(/'/g, "'\\''")}'`).join("\n");
    await fs.promises.writeFile(concatFile, concatBody, "utf8");

    await execa(ffmpegPath, [
      "-y",
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      concatFile,
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      tmpOut,
    ], { timeout: 60_000 });

    if (captionMode !== "none" && srtText.trim()) {
      try {
        await fs.promises.writeFile(srtPath, srtText, "utf8");
        await execa(ffmpegPath, [
          "-y",
          "-i",
          workingVideoPath,
          "-vf",
          `subtitles='${escapeSubtitlePath(srtPath)}'`,
          "-c:v",
          "libx264",
          "-pix_fmt",
          "yuv420p",
          "-movflags",
          "+faststart",
          "-an",
          captionOut,
        ], { timeout: 60_000 });
        workingVideoPath = captionOut;
        captionsBurnedIn = true;
        captionStatus = "burned_in";
      } catch {
        captionStatus = "failed";
        warnings.push("Caption burn-in failed; rendering continued without burned captions.");
      }
    }

    const selectedAudioUrl = input.audio?.audioUrl || input.audio?.backgroundMusicUrl || null;
    if (selectedAudioUrl) {
      try {
        const isRemote = /^https?:\/\//i.test(selectedAudioUrl);
        await execa(ffmpegPath, [
          "-y",
          "-i",
          workingVideoPath,
          ...(!isRemote ? ["-stream_loop", "-1"] : []),
          "-i",
          selectedAudioUrl,
          "-shortest",
          "-c:v",
          "libx264",
          "-pix_fmt",
          "yuv420p",
          "-c:a",
          "aac",
          "-movflags",
          "+faststart",
          finalOut,
        ], { timeout: 60_000 });
        workingVideoPath = finalOut;
        audioIncluded = true;
        audioStatus = "completed";
      } catch {
        audioStatus = "failed";
        warnings.push("Voiceover unavailable; silent captioned video rendered.");
      }
    } else {
      audioStatus = "setup_needed";
      warnings.push("Voiceover unavailable; silent captioned video rendered.");
    }

    const data = await fs.promises.readFile(workingVideoPath);
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
        metadata: {
          audioIncluded,
          captionsBurnedIn,
          captionMode,
          captionFormat,
          srt: srtText,
          vtt: vttText,
          audioStatus,
          captionStatus,
        },
      },
      warnings,
    };
  } catch {
    return {
      status: "setup_needed",
      errorMessage: "Media renderer could not execute ffmpeg. Verify binary/runtime permissions.",
    };
  } finally {
    try {
      await fs.promises.rm(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  }
}
