import { beforeEach, describe, expect, it, vi } from "vitest";

const selectRows = vi.fn();
const fromSpy = vi.fn(() => ({
  where: async () => selectRows(),
}));
const getDbMock = vi.fn(async () => ({
  select: () => ({
    from: fromSpy,
  }),
}));

vi.mock("./db", () => ({
  getDb: getDbMock,
}));

import { getRuntimeConfig, getRuntimeConfigMode, invalidateConfigCache } from "./dynamicConfig";
import { siteSettings } from "../drizzle/schema";

describe("dynamicConfig provider key lookup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidateConfigCache();
    delete process.env.GENX_API_KEY;
  });

  it("uses site settings before env when both are present", async () => {
    process.env.GENX_API_KEY = "env-genx";
    selectRows.mockResolvedValueOnce([{ value: "db-genx" }]);

    const value = await getRuntimeConfig("genx_api_key", "GENX_API_KEY");

    expect(value).toBe("db-genx");
    expect(fromSpy).toHaveBeenCalledWith(siteSettings);
    expect(selectRows).toHaveBeenCalled();
  });

  it("falls back to env when site setting is missing", async () => {
    process.env.GENX_API_KEY = "env-genx";
    selectRows.mockResolvedValueOnce([]);

    const value = await getRuntimeConfig("genx_api_key", "GENX_API_KEY");

    expect(value).toBe("env-genx");
  });

  it("uses unit_test_mock mode and skips DB reads in test runtime", async () => {
    process.env.GENX_API_KEY = "env-genx";

    const value = await getRuntimeConfig("genx_api_key", "GENX_API_KEY");

    expect(value).toBe("env-genx");
    expect(getRuntimeConfigMode()).toBe("unit_test_mock");
    expect(getDbMock).not.toHaveBeenCalled();
    expect(fromSpy).not.toHaveBeenCalled();
  });
});
