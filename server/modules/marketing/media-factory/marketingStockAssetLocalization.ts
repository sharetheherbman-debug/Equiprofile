import fs from "node:fs";
import path from "node:path";

const DEFAULT_MAX_LOCALIZE_SIZE_BYTES = 50 * 1024 * 1024;
const DEFAULT_LOCALIZE_TIMEOUT_MS = 12_000;
const DEFAULT_ALLOWED_MIME_PREFIXES = ["image/", "video/"];

function inferFileExtension(mimeType: string | null, sourceUrl: string): string {
  const lower = sourceUrl.toLowerCase();
  if (lower.endsWith(".mp4")) return "mp4";
  if (lower.endsWith(".webm")) return "webm";
  if (lower.endsWith(".mov")) return "mov";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "jpg";
  if (lower.endsWith(".png")) return "png";
  if (lower.endsWith(".webp")) return "webp";
  if (mimeType?.includes("mp4")) return "mp4";
  if (mimeType?.includes("webm")) return "webm";
  if (mimeType?.includes("quicktime")) return "mov";
  if (mimeType?.includes("jpeg")) return "jpg";
  if (mimeType?.includes("png")) return "png";
  if (mimeType?.includes("webp")) return "webp";
  return "bin";
}

export function canLocalizeStockAsset(input: {
  sourceUrl: string;
  mimeType?: string | null;
  contentLengthBytes?: number | null;
  maxSizeBytes?: number;
  allowedMimePrefixes?: string[];
}) {
  const maxSizeBytes = input.maxSizeBytes ?? DEFAULT_MAX_LOCALIZE_SIZE_BYTES;
  const allowedMimePrefixes = input.allowedMimePrefixes ?? DEFAULT_ALLOWED_MIME_PREFIXES;
  if (!/^https?:\/\//i.test(input.sourceUrl)) {
    return { ok: false as const, reason: "non_http_source" };
  }
  if (typeof input.contentLengthBytes === "number" && input.contentLengthBytes > maxSizeBytes) {
    return { ok: false as const, reason: "too_large" };
  }
  if (input.mimeType) {
    const allowed = allowedMimePrefixes.some((prefix) => input.mimeType!.toLowerCase().startsWith(prefix.toLowerCase()));
    if (!allowed) return { ok: false as const, reason: "invalid_mime" };
  }
  return { ok: true as const };
}

export async function maybeDownloadStockAsset(input: {
  sourceUrl: string;
  targetDir: string;
  fileNameBase: string;
  maxSizeBytes?: number;
  timeoutMs?: number;
  allowedMimePrefixes?: string[];
}) {
  const maxSizeBytes = input.maxSizeBytes ?? DEFAULT_MAX_LOCALIZE_SIZE_BYTES;
  const timeoutMs = input.timeoutMs ?? DEFAULT_LOCALIZE_TIMEOUT_MS;
  const allowedMimePrefixes = input.allowedMimePrefixes ?? DEFAULT_ALLOWED_MIME_PREFIXES;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(input.sourceUrl, { signal: controller.signal });
    if (!response.ok || !response.body) {
      return { localized: false as const, sourceUrl: input.sourceUrl, reason: "download_failed" };
    }

    const mimeType = response.headers.get("content-type");
    const contentLengthHeader = response.headers.get("content-length");
    const contentLengthBytes = contentLengthHeader ? Number(contentLengthHeader) : null;
    const decision = canLocalizeStockAsset({
      sourceUrl: input.sourceUrl,
      mimeType,
      contentLengthBytes,
      maxSizeBytes,
      allowedMimePrefixes,
    });
    if (!decision.ok) {
      return { localized: false as const, sourceUrl: input.sourceUrl, reason: decision.reason };
    }

    await fs.promises.mkdir(input.targetDir, { recursive: true });
    const ext = inferFileExtension(mimeType, input.sourceUrl);
    const localPath = path.join(input.targetDir, `${input.fileNameBase}.${ext}`);
    const stream = fs.createWriteStream(localPath, { flags: "w" });
    let seenBytes = 0;
    for await (const chunk of response.body as AsyncIterable<Uint8Array>) {
      seenBytes += chunk.length;
      if (seenBytes > maxSizeBytes) {
        stream.destroy();
        await fs.promises.rm(localPath, { force: true });
        return { localized: false as const, sourceUrl: input.sourceUrl, reason: "too_large" };
      }
      stream.write(Buffer.from(chunk));
    }
    stream.end();
    return {
      localized: true as const,
      sourceUrl: input.sourceUrl,
      localPath,
      mimeType,
      sizeBytes: seenBytes,
    };
  } catch {
    return { localized: false as const, sourceUrl: input.sourceUrl, reason: "timeout_or_network" };
  } finally {
    clearTimeout(timer);
  }
}
