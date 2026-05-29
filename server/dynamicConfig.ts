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

export type RuntimeConfigMode = "unit_test_mock" | "local_dev" | "production_live";

interface CacheEntry {
  value: string;
  expiresAt: number;
}

const configCache = new Map<string, CacheEntry>();

const RUNTIME_SETTING_FALLBACK_KEYS: Record<string, string[]> = {
  genx_api_key: ["marketing_genx_api_key", "equiprofile_ai_genx_api_key"],
  huggingface_api_key: ["marketing_huggingface_api_key"],
  qwen_api_key: ["marketing_qwen_api_key"],
  genx_model: ["equiprofile_ai_genx_model"],
};

export function getRuntimeConfigMode(): RuntimeConfigMode {
  const explicit = String(process.env.EQUIPROFILE_RUNTIME_CONFIG_MODE ?? "").trim().toLowerCase();
  if (explicit === "unit_test_mock" || explicit === "local_dev" || explicit === "production_live") {
    return explicit;
  }
  if (process.env.VITEST === "true" || process.env.NODE_ENV === "test") {
    return "unit_test_mock";
  }
  if (process.env.NODE_ENV === "production") {
    return "production_live";
  }
  return "local_dev";
}

function shouldUseDatabaseForRuntimeConfig() {
  if (process.env.FORCE_RUNTIME_CONFIG_DB_IN_TESTS === "true") return true;
  return getRuntimeConfigMode() !== "unit_test_mock";
}

export function getRuntimeConfigDiagnostics() {
  return {
    mode: getRuntimeConfigMode(),
    dbLookupEnabled: shouldUseDatabaseForRuntimeConfig(),
  };
}

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

  if (!shouldUseDatabaseForRuntimeConfig()) {
    return process.env[envVar] ?? "";
  }

  try {
    const dbConn = await getDb();
    if (!dbConn) return process.env[envVar] ?? "";
    const keysToCheck = [settingKey, ...(RUNTIME_SETTING_FALLBACK_KEYS[settingKey] ?? [])];
    let value = "";
    for (const key of keysToCheck) {
      const rows = await dbConn
        .select()
        .from(siteSettings)
        .where(eq(siteSettings.key, key));
      const next = rows[0]?.value ?? "";
      if (next) {
        value = next;
        break;
      }
    }
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
    if (getRuntimeConfigMode() !== "unit_test_mock") {
      console.error(
        `[DynamicConfig] Failed to read setting "${settingKey}":`,
        err,
      );
    }
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
