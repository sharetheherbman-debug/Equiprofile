/**
 * Dynamic Runtime Configuration
 *
 * Allows API keys and integration settings to be stored in the database
 * (via the admin panel → siteSettings) and used at runtime as fallback
 * with environment variables as fallback.
 *
 * Priority: database siteSettings > environment variable > empty string
 *
 * Cache TTL is 5 minutes to balance responsiveness with DB load.
 */
import { getDb } from "./db";
import { siteSettings } from "../drizzle/schema";
import { eq } from "drizzle-orm";

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  value: string;
  expiresAt: number;
}

const configCache = new Map<string, CacheEntry>();

/**
 * Get a runtime configuration value.
 * Priority: database siteSettings > environment variable > empty string.
 */
export async function getRuntimeConfig(
  settingKey: string,
  envVar: string,
): Promise<string> {
  const cached = configCache.get(settingKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  try {
    const dbConn = await getDb();
    if (!dbConn) return process.env[envVar] ?? "";
    const rows = await dbConn
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.key, settingKey));
    const value = rows[0]?.value ?? "";
    if (value) {
      configCache.set(settingKey, {
        value,
        expiresAt: Date.now() + CACHE_TTL_MS,
      });
      return value;
    }
    const envValue = process.env[envVar] ?? "";
    configCache.set(settingKey, {
      value: envValue,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });
    return envValue;
  } catch (err) {
    console.error(
      `[DynamicConfig] Failed to read setting "${settingKey}":`,
      err,
    );
    return process.env[envVar] ?? "";
  }
}

/**
 * Invalidate cached config entries after a setting is updated.
 * Call this after setSiteSetting to ensure fresh values are used immediately.
 */
export function invalidateConfigCache(settingKey?: string): void {
  if (settingKey) {
    configCache.delete(settingKey);
  } else {
    configCache.clear();
  }
}
