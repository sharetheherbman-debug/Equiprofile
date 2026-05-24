// Copyright (c) 2025-2026 Amarktai Network. All rights reserved.
// VPS-safe local media storage for generated assets.
// Default root: /var/equiprofile/storage (override via EQUIPROFILE_STORAGE_ROOT)
// Public URL base: /media/generated/{folder}/{filename}
//
// Security rules:
//  - safePathJoin() prevents path traversal; all writes are checked
//  - Only allowed media MIME types accepted (see ALLOWED_MEDIA_TYPES)
//  - Safe filenames generated using nanoid — no user-supplied filenames in paths
//  - Never expose .env or secret files through this module

import fs from "fs";
import path from "path";
import { nanoid } from "nanoid";

// ─── Storage root ────────────────────────────────────────────────────────────

export const STORAGE_ROOT: string = path.resolve(
  process.env.EQUIPROFILE_STORAGE_ROOT ?? "/var/equiprofile/storage",
);

export const MEDIA_SUBFOLDERS = [
  "images",
  "videos",
  "avatars",
  "voice",
  "thumbnails",
  "campaigns",
  "generated",
  "uploads",
  "exports",
  "cache",
  "temp",
  "logs",
] as const;

export type MediaFolder = (typeof MEDIA_SUBFOLDERS)[number];

// ─── Allowed MIME types ───────────────────────────────────────────────────────

const ALLOWED_MEDIA_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "video/mp4",
  "video/webm",
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
  "application/pdf",
]);

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "audio/ogg": "ogg",
  "application/pdf": "pdf",
};

// ─── Security helpers ─────────────────────────────────────────────────────────

/**
 * Join path segments safely. Throws if the result is outside `base`.
 * Use this for all file operations to prevent path traversal.
 */
export function safePathJoin(base: string, ...parts: string[]): string {
  const resolved = path.resolve(base, ...parts);
  if (!resolved.startsWith(base + path.sep) && resolved !== base) {
    throw new Error(`Path traversal detected: "${resolved}" is outside base "${base}"`);
  }
  return resolved;
}

/**
 * Generate a safe filename from a MIME type and optional prefix/jobId.
 * Never uses user-supplied filenames directly.
 */
function generateSafeFilename(mimeType: string, prefix?: string, ext?: string): string {
  const extension = ext ?? MIME_TO_EXT[mimeType] ?? "bin";
  const id = nanoid(16);
  const safePfx = prefix
    ? prefix.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 20)
    : "asset";
  return `${safePfx}_${id}.${extension}`;
}

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Returns true if the MIME type is on the allowed list for media storage.
 */
export function validateAllowedMediaType(mimeType: string): boolean {
  return ALLOWED_MEDIA_TYPES.has(mimeType);
}

// ─── Directory initialisation ─────────────────────────────────────────────────

/**
 * Ensure all required storage subdirectories exist.
 * Safe to call multiple times (idempotent).
 * Call once at server startup.
 */
export async function ensureStorageDirs(): Promise<void> {
  await fs.promises.mkdir(STORAGE_ROOT, { recursive: true });
  for (const folder of MEDIA_SUBFOLDERS) {
    await fs.promises.mkdir(path.join(STORAGE_ROOT, folder), { recursive: true });
  }
}

// ─── Public URL builder ───────────────────────────────────────────────────────

/**
 * Derive a public-facing URL from a local absolute path.
 * Local: /var/equiprofile/storage/images/asset_abc.jpg
 * Public: /media/generated/images/asset_abc.jpg
 */
export function getPublicMediaUrl(localPath: string): string {
  const relative = localPath.startsWith(STORAGE_ROOT)
    ? localPath.slice(STORAGE_ROOT.length)
    : localPath;
  const normalised = relative.replace(/\\/g, "/").replace(/^\/+/, "");
  return `/media/generated/${normalised}`;
}

// ─── Write helpers ────────────────────────────────────────────────────────────

/**
 * Write a generated asset to the appropriate subfolder.
 * Returns localPath, publicUrl, and fileSizeBytes.
 */
export async function writeGeneratedAsset(opts: {
  data: Buffer;
  folder: MediaFolder;
  mimeType: string;
  jobId?: string;
  ext?: string;
}): Promise<{ localPath: string; publicUrl: string; fileSizeBytes: number }> {
  if (!validateAllowedMediaType(opts.mimeType)) {
    throw new Error(`MIME type "${opts.mimeType}" is not allowed for media storage`);
  }

  const folder = MEDIA_SUBFOLDERS.includes(opts.folder as MediaFolder) ? opts.folder : "generated";
  const filename = generateSafeFilename(opts.mimeType, opts.jobId ? `job_${opts.jobId}` : undefined, opts.ext);
  const dirPath = path.join(STORAGE_ROOT, folder);

  await fs.promises.mkdir(dirPath, { recursive: true });
  const localPath = safePathJoin(STORAGE_ROOT, folder, filename);

  await fs.promises.writeFile(localPath, opts.data);

  return {
    localPath,
    publicUrl: getPublicMediaUrl(localPath),
    fileSizeBytes: opts.data.byteLength,
  };
}

/**
 * Write data to the temp folder.
 * Returns the local path. Use moveTempToAsset() to promote to permanent storage.
 */
export async function writeTempFile(
  data: Buffer,
  ext: string,
  prefix?: string,
): Promise<string> {
  const safeExt = ext.replace(/[^a-zA-Z0-9]/g, "").slice(0, 10) || "tmp";
  const filename = generateSafeFilename("application/pdf", prefix ?? "tmp", safeExt);
  const tempDir = path.join(STORAGE_ROOT, "temp");
  await fs.promises.mkdir(tempDir, { recursive: true });
  const localPath = safePathJoin(STORAGE_ROOT, "temp", filename);
  await fs.promises.writeFile(localPath, data);
  return localPath;
}

/**
 * Move a temp file to a permanent asset folder.
 * Returns the new localPath and publicUrl.
 */
export async function moveTempToAsset(
  tempPath: string,
  folder: string,
  filename: string,
): Promise<{ localPath: string; publicUrl: string }> {
  const safeFolder = MEDIA_SUBFOLDERS.includes(folder as MediaFolder) ? folder : "generated";
  const safeFilename = path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, "_");

  const destDir = path.join(STORAGE_ROOT, safeFolder);
  await fs.promises.mkdir(destDir, { recursive: true });

  const destPath = safePathJoin(STORAGE_ROOT, safeFolder, safeFilename);

  await fs.promises.rename(tempPath, destPath);

  return {
    localPath: destPath,
    publicUrl: getPublicMediaUrl(destPath),
  };
}

/**
 * Create a thumbnail placeholder file for a job.
 * Real thumbnail generation can be added later.
 * Returns localPath and publicUrl.
 */
export async function createThumbnailPlaceholder(
  jobId: string,
): Promise<{ localPath: string; publicUrl: string }> {
  const safeJobId = jobId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40);
  const filename = `thumb_${safeJobId}_${nanoid(8)}.txt`;
  const thumbDir = path.join(STORAGE_ROOT, "thumbnails");
  await fs.promises.mkdir(thumbDir, { recursive: true });
  const localPath = safePathJoin(STORAGE_ROOT, "thumbnails", filename);
  await fs.promises.writeFile(localPath, `placeholder:${safeJobId}`);
  return {
    localPath,
    publicUrl: getPublicMediaUrl(localPath),
  };
}

// ─── Delete helper ────────────────────────────────────────────────────────────

/**
 * Safely delete an asset file.
 * Only deletes files inside STORAGE_ROOT. Silently ignores missing files.
 */
export async function deleteAssetFile(localPath: string): Promise<void> {
  const resolved = path.resolve(localPath);
  if (!resolved.startsWith(STORAGE_ROOT + path.sep)) {
    throw new Error(`Delete refused: path "${resolved}" is outside storage root`);
  }
  try {
    await fs.promises.unlink(resolved);
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    // File already gone — treat as success
  }
}
