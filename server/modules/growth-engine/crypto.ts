import crypto from "crypto";

function getKey() {
  const secret =
    process.env.GROWTH_ENGINE_TOKEN_KEY ||
    process.env.JWT_SECRET ||
    "equiprofile-growth-engine-default-key-change-me";
  return crypto.createHash("sha256").update(secret).digest();
}

export function encryptGrowthSecret(value?: string | null): string | null {
  if (!value) return null;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}
