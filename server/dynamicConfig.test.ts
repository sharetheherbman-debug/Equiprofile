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

  it("uses env value when present", async () => {
    process.env.GENX_API_KEY = "env-genx";
    selectRows.mockResolvedValueOnce([{ value: "db-genx" }]);

    const value = await getRuntimeConfig("genx_api_key", "GENX_API_KEY");

    expect(value).toBe("env-genx");
    expect(selectRows).not.toHaveBeenCalled();
  });

  it("falls back to site settings value when env is missing", async () => {
    selectRows.mockResolvedValueOnce([{ value: "db-genx" }]);

    const value = await getRuntimeConfig("genx_api_key", "GENX_API_KEY");

    expect(value).toBe("db-genx");
  });
});
