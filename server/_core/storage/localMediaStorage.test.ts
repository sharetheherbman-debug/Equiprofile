import fs from "fs";
import os from "os";
import path from "path";
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("localMediaStorage", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("writes and reads generated assets from configured storage root", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "equiprofile-storage-"));
    process.env.EQUIPROFILE_STORAGE_ROOT = root;

    const mod = await import("./localMediaStorage");
    await mod.ensureStorageDirs();
    const stored = await mod.writeGeneratedAsset({
      data: Buffer.from("image-bytes"),
      folder: "images",
      mimeType: "image/png",
      jobId: "test_job",
    });

    expect(stored.publicUrl.startsWith("/media/generated/images/")).toBe(true);
    const roundtrip = await fs.promises.readFile(stored.localPath, "utf8");
    expect(roundtrip).toBe("image-bytes");
  });
});
