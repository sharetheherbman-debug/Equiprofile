import { writeGeneratedAsset } from "../storage/localMediaStorage";
import type { AITask, AIProviderName } from "./types";

export type ProviderOutputResultType =
  | "text"
  | "json"
  | "image"
  | "video"
  | "audio"
  | "url"
  | "base64"
  | "prompt_only"
  | "job_pending"
  | "video_plan"
  | "failed";

export type ProviderOutput = {
  resultType: ProviderOutputResultType;
  mimeType: string | null;
  fileExtension: string | null;
  publicUrl: string | null;
  localPath: string | null;
  remoteUrl?: string | null;
  providerJobId?: string | null;
  providerStatus?: string | null;
  source?: string | null;
  rawProviderPayload: unknown;
  errorMessage: string | null;
  provider: AIProviderName;
  model: string;
  task: AITask;
  latencyMs: number;
};

function extFromMime(mimeType: string | null): string | null {
  if (!mimeType) return null;
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "video/mp4": "mp4",
    "video/webm": "webm",
    "audio/mpeg": "mp3",
    "audio/wav": "wav",
    "audio/ogg": "ogg",
  };
  return map[mimeType] ?? null;
}

function inferMimeFromUrl(url: string): string | null {
  const lower = url.toLowerCase();
  if (lower.includes(".mp4")) return "video/mp4";
  if (lower.includes(".webm")) return "video/webm";
  if (lower.includes(".mp3")) return "audio/mpeg";
  if (lower.includes(".wav")) return "audio/wav";
  if (lower.includes(".ogg")) return "audio/ogg";
  if (lower.includes(".png")) return "image/png";
  if (lower.includes(".gif")) return "image/gif";
  if (lower.includes(".webp")) return "image/webp";
  if (lower.includes(".jpg") || lower.includes(".jpeg")) return "image/jpeg";
  return null;
}

function firstStringAtPath(payload: any, paths: string[][]): string | null {
  for (const path of paths) {
    let current = payload;
    for (const key of path) {
      current = Array.isArray(current) ? current[Number(key)] : current?.[key];
    }
    if (typeof current === "string" && current.trim()) return current.trim();
  }
  return null;
}

function inferMediaType(task: AITask, mimeType: string | null): ProviderOutputResultType {
  if (task === "text_to_video" || task === "image_to_video" || task === "avatar_video") return "video";
  if (task === "text_to_image" || task === "image_edit") return "image";
  if (task === "text_to_speech") return "audio";
  if (mimeType?.startsWith("video/")) return "video";
  if (mimeType?.startsWith("image/")) return "image";
  if (mimeType?.startsWith("audio/")) return "audio";
  return "json";
}

function expectedMimePrefixForTask(task: AITask): "video/" | "image/" | "audio/" | null {
  if (task === "text_to_video" || task === "image_to_video" || task === "avatar_video") return "video/";
  if (task === "text_to_image" || task === "image_edit") return "image/";
  if (task === "text_to_speech") return "audio/";
  return null;
}

function safeBase64Decode(value: string): Buffer | null {
  try {
    return Buffer.from(value, "base64");
  } catch {
    return null;
  }
}

async function downloadToBuffer(url: string, timeoutMs = 20_000): Promise<{ data: Buffer; mimeType: string | null }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { method: "GET", signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Remote asset download failed: ${response.status}`);
    }
    const mimeType = response.headers.get("content-type")?.split(";")[0] ?? null;
    const arr = await response.arrayBuffer();
    return { data: Buffer.from(arr), mimeType };
  } finally {
    clearTimeout(timeout);
  }
}

function folderFromResultType(resultType: ProviderOutputResultType): "images" | "videos" | "avatars" | "voice" | "generated" {
  if (resultType === "image") return "images";
  if (resultType === "video") return "videos";
  if (resultType === "audio") return "voice";
  return "generated";
}

export function normalizeProviderOutput(input: {
  output: unknown;
  provider: AIProviderName;
  model: string;
  task: AITask;
  latencyMs: number;
}): ProviderOutput {
  const base: ProviderOutput = {
    resultType: "json",
    mimeType: null,
    fileExtension: null,
    publicUrl: null,
    localPath: null,
    remoteUrl: null,
    providerJobId: null,
    providerStatus: null,
    source: null,
    rawProviderPayload: input.output,
    errorMessage: null,
    provider: input.provider,
    model: input.model,
    task: input.task,
    latencyMs: input.latencyMs,
  };

  if (!input.output) {
    return { ...base, resultType: "prompt_only" };
  }
  if (typeof input.output === "string") {
    return { ...base, resultType: "text" };
  }

  const obj = typeof input.output === "object"
    ? input.output as Record<string, unknown>
    : {};

  const providerJobId = firstStringAtPath(obj, [
    ["providerJobId"],
    ["job_id"],
    ["jobId"],
    ["id"],
    ["data", "0", "id"],
    ["result", "id"],
  ]);
  const providerStatus = firstStringAtPath(obj, [
    ["providerStatus"],
    ["status"],
    ["state"],
    ["data", "0", "status"],
    ["result", "status"],
  ]);
  const source = firstStringAtPath(obj, [["source"], ["metadata", "source"]]);
  const completedResultUrl = firstStringAtPath(obj, [
    ["result_url"],
    ["resultUrl"],
    ["url"],
    ["output_url"],
    ["outputUrl"],
    ["result", "result_url"],
    ["result", "url"],
  ]);
  if (providerJobId && completedResultUrl?.startsWith("data:text/plain")) {
    return {
      ...base,
      resultType: "failed",
      mimeType: "text/plain",
      errorMessage: "Provider returned text/plain planning output, not playable media.",
      providerJobId,
      providerStatus: providerStatus ?? "completed",
      source,
    };
  }
  if (providerJobId && !completedResultUrl) {
    return {
      ...base,
      resultType: "job_pending",
      providerJobId,
      providerStatus: providerStatus ?? "pending",
      source,
    };
  }

  const errorText = firstStringAtPath(obj, [["error"], ["message"], ["detail"], ["result", "error"]]);
  if (errorText) {
    return { ...base, resultType: "failed", errorMessage: errorText };
  }

  if (String(obj.resultType ?? "") === "video_plan" || String(obj.status ?? "") === "needs_render_model") {
    const text = firstStringAtPath(obj, [["notes"], ["text"], ["message"]]) ?? "Media model returned plan text instead of playable media.";
    return {
      ...base,
      resultType: "video_plan",
      mimeType: "text/plain",
      errorMessage: text,
      source,
    };
  }

  const url = firstStringAtPath(obj, [
    ["publicUrl"],
    ["url"],
    ["result_url"],
    ["resultUrl"],
    ["output_url"],
    ["outputUrl"],
    ["image_url"],
    ["imageUrl"],
    ["video_url"],
    ["videoUrl"],
    ["audio_url"],
    ["audioUrl"],
    ["result", "url"],
    ["result", "result_url"],
    ["result", "output_url"],
    ["data", "0", "url"],
    ["data", "0", "output_url"],
    ["outputs", "0", "url"],
  ]);
  if (url) {
    if (url.startsWith("data:text/plain")) {
      return {
        ...base,
        resultType: "failed",
        mimeType: "text/plain",
        fileExtension: null,
        errorMessage: "Provider returned text/plain planning output, not playable media.",
        providerStatus: providerStatus ?? "completed",
        source,
      };
    }
    const mimeType = (typeof obj.mimeType === "string" ? obj.mimeType : inferMimeFromUrl(url)) ?? null;
    const expectedPrefix = expectedMimePrefixForTask(input.task);
    if (expectedPrefix && (!mimeType || !mimeType.startsWith(expectedPrefix))) {
      return {
        ...base,
        resultType: input.task === "text_to_video" || input.task === "image_to_video" || input.task === "avatar_video" ? "video_plan" : "failed",
        mimeType,
        remoteUrl: url,
        errorMessage: `Expected ${expectedPrefix} output for ${input.task}, got ${mimeType ?? "unknown MIME"}.`,
        source,
      };
    }
    return {
      ...base,
      resultType: "url",
      publicUrl: url,
      remoteUrl: url,
      mimeType,
      fileExtension: extFromMime(mimeType),
      source,
    };
  }

  const base64 = firstStringAtPath(obj, [
    ["base64"],
    ["b64_json"],
    ["data", "0", "b64_json"],
    ["result", "base64"],
    ["output", "base64"],
  ]) ?? (typeof obj.data === "string" && obj.data.length > 100 ? obj.data : null);
  if (base64) {
    const mimeType = typeof obj.mimeType === "string" ? obj.mimeType : "image/png";
    return {
      ...base,
      resultType: "base64",
      mimeType,
      fileExtension: extFromMime(mimeType),
      source,
    };
  }

  const text = typeof obj.text === "string"
    ? obj.text
    : typeof obj.generated_text === "string"
      ? obj.generated_text
      : Array.isArray(obj) && typeof (obj as any)[0]?.generated_text === "string"
        ? (obj as any)[0].generated_text
        : null;
  if (text) {
    return { ...base, resultType: "text" };
  }

  return { ...base, resultType: "prompt_only" };
}

export async function persistProviderOutput(opts: {
  normalised: ProviderOutput;
  output: unknown;
  task: AITask;
  jobId: string;
}): Promise<ProviderOutput> {
  const current = { ...opts.normalised };

  if (current.resultType === "base64") {
    const obj = opts.output as Record<string, unknown>;
    const raw = typeof obj.base64 === "string" ? obj.base64 : typeof obj.data === "string" ? obj.data : "";
    const buffer = safeBase64Decode(raw);
    if (!buffer) {
      return { ...current, resultType: "failed", errorMessage: "Invalid base64 provider payload" };
    }
    const mime = current.mimeType ?? "image/png";
    const mediaType = inferMediaType(opts.task, mime);
    const stored = await writeGeneratedAsset({
      data: buffer,
      folder: folderFromResultType(mediaType),
      mimeType: mime,
      jobId: opts.jobId,
      ext: current.fileExtension ?? undefined,
    });
    return {
      ...current,
      resultType: mediaType,
      publicUrl: stored.publicUrl,
      localPath: stored.localPath,
      fileExtension: current.fileExtension ?? extFromMime(mime),
    };
  }

  if (current.resultType === "url" && current.remoteUrl) {
    try {
      const downloaded = await downloadToBuffer(current.remoteUrl);
      const mime = downloaded.mimeType ?? current.mimeType ?? inferMimeFromUrl(current.remoteUrl) ?? "image/jpeg";
      const mediaType = inferMediaType(opts.task, mime);
      const stored = await writeGeneratedAsset({
        data: downloaded.data,
        folder: folderFromResultType(mediaType),
        mimeType: mime,
        jobId: opts.jobId,
      });
      return {
        ...current,
        resultType: mediaType,
        mimeType: mime,
        fileExtension: extFromMime(mime),
        publicUrl: stored.publicUrl,
        localPath: stored.localPath,
      };
    } catch (error) {
      // Preserve remote URL truthfully when local download fails.
      return {
        ...current,
        resultType: inferMediaType(opts.task, current.mimeType),
        errorMessage: `Remote media kept (local copy failed): ${error instanceof Error ? error.message : String(error)}`,
        publicUrl: current.remoteUrl,
      };
    }
  }

  if (current.resultType === "text") {
    return { ...current, resultType: "prompt_only" };
  }

  if (current.resultType === "video_plan") {
    return current;
  }

  return current;
}
