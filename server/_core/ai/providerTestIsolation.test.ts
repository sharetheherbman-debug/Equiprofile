import { describe, expect, it, vi } from "vitest";

const getDbMock = vi.fn();

vi.mock("../../db", () => ({
  getDb: getDbMock,
}));

import { getRuntimeConfig, getRuntimeConfigMode } from "../../dynamicConfig";
import { getProviderTelemetrySummary, recordProviderTelemetry } from "./providerTelemetry";

describe("provider unit-test isolation", () => {
  it("keeps runtime config in unit_test_mock mode and avoids DB lookup", async () => {
    process.env.GENX_API_KEY = "env-only-key";
    const value = await getRuntimeConfig("genx_api_key", "GENX_API_KEY");

    expect(getRuntimeConfigMode()).toBe("unit_test_mock");
    expect(value).toBe("env-only-key");
    expect(getDbMock).not.toHaveBeenCalled();
  });

  it("skips telemetry DB writes/reads in unit_test_mock mode", async () => {
    await recordProviderTelemetry({
      provider: "genx",
      model: "kling-v2.5-turbo",
      task: "text_to_video",
      tenantId: "global",
      success: true,
    });
    const rows = await getProviderTelemetrySummary({ task: "text_to_video" });

    expect(rows).toEqual([]);
    expect(getDbMock).not.toHaveBeenCalled();
  });
});
