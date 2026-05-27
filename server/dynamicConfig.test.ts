import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const selectRows = vi.fn();
  const fromSpy = vi.fn(() => ({
    where: async () => selectRows(),
  }));
  const getDbMock = vi.fn(async () => ({
    select: () => ({
      from: fromSpy,
    }),
  }));
  return { selectRows, fromSpy, getDbMock };
});

vi.mock("./db", () => ({
  getDb: mocks.getDbMock,
}));

import { getRuntimeConfig, getRuntimeConfigMode, invalidateConfigCache } from "./dynamicConfig";
import { siteSettings } from "../drizzle/schema";

describe("dynamicConfig provider key lookup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidateConfigCache();
    delete process.env.GENX_API_KEY;
    delete process.env.EQUIPROFILE_RUNTIME_CONFIG_MODE;
  });

  it("uses site settings before env when both are present", async () => {
    process.env.EQUIPROFILE_RUNTIME_CONFIG_MODE = "production_live";
    process.env.GENX_API_KEY = "env-genx";
    mocks.selectRows.mockResolvedValueOnce([{ value: "db-genx" }]);

    const value = await getRuntimeConfig("genx_api_key", "GENX_API_KEY");

    expect(value).toBe("db-genx");
    expect(mocks.fromSpy).toHaveBeenCalledWith(siteSettings);
    expect(mocks.selectRows).toHaveBeenCalled();
  });

  it("falls back to env when site setting is missing", async () => {
    process.env.EQUIPROFILE_RUNTIME_CONFIG_MODE = "production_live";
    process.env.GENX_API_KEY = "env-genx";
    mocks.selectRows.mockResolvedValueOnce([]);

    const value = await getRuntimeConfig("genx_api_key", "GENX_API_KEY");

    expect(value).toBe("env-genx");
  });

  it("uses unit_test_mock mode and skips DB reads in test runtime", async () => {
    process.env.GENX_API_KEY = "env-genx";

    const value = await getRuntimeConfig("genx_api_key", "GENX_API_KEY");

    expect(value).toBe("env-genx");
    expect(getRuntimeConfigMode()).toBe("unit_test_mock");
    expect(mocks.getDbMock).not.toHaveBeenCalled();
    expect(mocks.fromSpy).not.toHaveBeenCalled();
  });
});
