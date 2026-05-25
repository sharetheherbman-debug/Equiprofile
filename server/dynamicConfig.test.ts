import { beforeEach, describe, expect, it, vi } from "vitest";

const selectRows = vi.fn();

vi.mock("./db", () => ({
  getDb: vi.fn(async () => ({
    select: () => ({
      from: () => ({
        where: async () => selectRows(),
      }),
    }),
  })),
}));

import { getRuntimeConfig, invalidateConfigCache } from "./dynamicConfig";

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
    expect(selectRows).toHaveBeenCalled();
  });

  it("falls back to env when site setting is missing", async () => {
    process.env.GENX_API_KEY = "env-genx";
    selectRows.mockResolvedValueOnce([]);

    const value = await getRuntimeConfig("genx_api_key", "GENX_API_KEY");

    expect(value).toBe("env-genx");
  });
});
