import { describe, expect, it, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { getDb } from "./db";
import { siteSettings } from "../drizzle/schema";

// Mock the database module
vi.mock("./db", () => ({
  getAdminSession: vi.fn().mockResolvedValue({
    userId: 1,
    role: "admin",
    isAdmin: true,
  }),
  getAllUsers: vi.fn().mockResolvedValue([
    {
      id: 1,
      openId: "user-1",
      name: "Test User",
      email: "test@example.com",
      role: "user",
      subscriptionStatus: "active",
      isSuspended: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]),
  getUserById: vi.fn().mockResolvedValue({
    id: 1,
    openId: "admin-user",
    subscriptionStatus: "active",
    isSuspended: false,
    role: "admin",
  }),
  getHorsesByUserId: vi.fn().mockResolvedValue([]),
  getUserActivityLogs: vi.fn().mockResolvedValue([]),
  suspendUser: vi.fn().mockResolvedValue(undefined),
  unsuspendUser: vi.fn().mockResolvedValue(undefined),
  deleteUser: vi.fn().mockResolvedValue(undefined),
  updateUser: vi.fn().mockResolvedValue(undefined),
  getSystemStats: vi.fn().mockResolvedValue({
    totalUsers: 100,
    activeSubscriptions: 80,
    trialUsers: 15,
    overdueUsers: 5,
    totalHorses: 150,
    totalHealthRecords: 300,
    totalTrainingSessions: 450,
  }),
  getOverdueSubscriptions: vi.fn().mockResolvedValue([]),
  getExpiredTrials: vi.fn().mockResolvedValue([]),
  getActivityLogs: vi.fn().mockResolvedValue([]),
  getAllSettings: vi.fn().mockResolvedValue([]),
  upsertSetting: vi.fn().mockResolvedValue(undefined),
  getRecentBackups: vi.fn().mockResolvedValue([]),
  logActivity: vi.fn().mockResolvedValue(undefined),
  // getDb returns null by default (no DB in test env) — individual tests may override
  getDb: vi.fn().mockResolvedValue(null),
}));

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@example.com",
    name: "Admin User",
    loginMethod: "email",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

function createUserContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "regular-user",
    email: "user@example.com",
    name: "Regular User",
    loginMethod: "email",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("admin router - authorized admin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("gets all users", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.getUsers();

    expect(result).toHaveLength(1);
    expect(result[0].email).toBe("test@example.com");
  });

  it("gets user details", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.getUserDetails({ userId: 1 });

    expect(result).toHaveProperty("user");
    expect(result).toHaveProperty("horses");
    expect(result).toHaveProperty("activity");
  });

  it("suspends a user", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.suspendUser({
      userId: 2,
      reason: "Payment failure",
    });

    expect(result).toEqual({ success: true });
  });

  it("unsuspends a user", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.unsuspendUser({ userId: 2 });

    expect(result).toEqual({ success: true });
  });

  it("deletes a user", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.deleteUser({ userId: 2 });

    expect(result).toEqual({ success: true });
  });

  it("updates user role", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.updateUserRole({
      userId: 2,
      role: "admin",
    });

    expect(result).toEqual({ success: true });
  });

  it("gets system stats", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.getStats();

    expect(result).toHaveProperty("totalUsers");
    expect(result.totalUsers).toBe(100);
  });

  it("gets overdue users", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.getOverdueUsers();

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  it("gets system settings", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.getSettings();

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  it("updates system setting", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.updateSetting({
      key: "site_name",
      value: "EquiProfile",
      type: "string",
      description: "Site name",
    });

    expect(result).toEqual({ success: true });
  });
});

describe("admin router - unauthorized access", () => {
  it("throws error for non-admin user accessing admin routes", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.admin.getUsers()).rejects.toThrow(
      "You do not have required permission",
    );
  });

  it("throws error for unauthenticated user", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: {
        protocol: "https",
        headers: {},
      } as TrpcContext["req"],
      res: {
        clearCookie: vi.fn(),
      } as unknown as TrpcContext["res"],
    };

    const caller = appRouter.createCaller(ctx);

    await expect(caller.admin.getUsers()).rejects.toThrow();
  });
});

describe("admin.setSiteSetting", () => {
  it("throws INTERNAL_SERVER_ERROR when DB is unavailable", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const err = await caller.admin
      .setSiteSetting({ key: "genx_api_key", value: "genx-test" })
      .catch((e) => e);
    expect(err).toBeInstanceOf(TRPCError);
    expect((err as TRPCError).code).toBe("INTERNAL_SERVER_ERROR");
    expect((err as TRPCError).message).toContain("Database not available");
  });

  it("rejects keys with invalid characters", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.admin.setSiteSetting({ key: "GENX-KEY", value: "genx-test" }),
    ).rejects.toThrow();
  });

  it("rejects values longer than 2000 characters", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.admin.setSiteSetting({
        key: "genx_api_key",
        value: "x".repeat(2001),
      }),
    ).rejects.toThrow();
  });

  it("rejects invalid provider base URLs", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.admin.setSiteSetting({ key: "genx_base_url", value: "not-a-url" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("normalizes provider base URLs before saving", async () => {
    const execute = vi.fn().mockResolvedValue([]);
    vi.mocked(getDb).mockResolvedValueOnce({ execute } as any);
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.setSiteSetting({
      key: "genx_base_url",
      value: "https://genx.example.com/v1/",
    });

    expect(result).toEqual({ success: true, key: "genx_base_url", normalized: true });
    expect(execute).toHaveBeenCalled();
  });

  it("reads provider settings from the camelCase siteSettings table", async () => {
    const from = vi.fn().mockResolvedValue([
      { key: "genx_api_key", value: "saved-genx-key" },
      { key: "huggingface_api_key", value: "saved-hf-key" },
    ]);
    const select = vi.fn(() => ({ from }));
    vi.mocked(getDb).mockResolvedValueOnce({ select } as any);
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.getSiteSettings();

    expect(from).toHaveBeenCalledWith(siteSettings);
    expect(result).toMatchObject({
      genx_api_key: "saved-genx-key",
      huggingface_api_key: "saved-hf-key",
    });
  });
});

describe("admin.listAIProviderSettings", () => {
  it("returns configured=false for all providers when DB has no rows", async () => {
    const from = vi.fn().mockResolvedValue([]);
    const select = vi.fn(() => ({ from }));
    vi.mocked(getDb).mockResolvedValueOnce({ select } as any);
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.listAIProviderSettings();

    expect(result.genx.configured).toBe(false);
    expect(result.huggingface.configured).toBe(false);
    expect(result.qwen.configured).toBe(false);
  });

  it("masks API keys — never returns full key", async () => {
    const from = vi.fn().mockResolvedValue([
      { key: "genx_api_key", value: "sk-verylongapikey12345678" },
      { key: "huggingface_api_key", value: "hf_abcdefghijklmnop" },
      { key: "qwen_api_key", value: "qwen-secretkey-xyz" },
    ]);
    const select = vi.fn(() => ({ from }));
    vi.mocked(getDb).mockResolvedValueOnce({ select } as any);
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.listAIProviderSettings();

    // Keys must be present and masked
    expect(result.genx.keyMasked).toBeTruthy();
    expect(result.genx.keyMasked).not.toBe("sk-verylongapikey12345678");
    expect(result.genx.keyMasked).toContain("•");

    expect(result.huggingface.keyMasked).toBeTruthy();
    expect(result.huggingface.keyMasked).not.toBe("hf_abcdefghijklmnop");
    expect(result.huggingface.keyMasked).toContain("•");

    expect(result.qwen.keyMasked).toBeTruthy();
    expect(result.qwen.keyMasked).not.toBe("qwen-secretkey-xyz");
    expect(result.qwen.keyMasked).toContain("•");
  });

  it("returns configured=true when DB has a key stored", async () => {
    const from = vi.fn().mockResolvedValue([
      { key: "marketing_genx_api_key", value: "any-key" },
    ]);
    const select = vi.fn(() => ({ from }));
    vi.mocked(getDb).mockResolvedValueOnce({ select } as any);
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.listAIProviderSettings();

    expect(result.genx.configured).toBe(true);
    expect(result.huggingface.configured).toBe(false);
    expect(result.qwen.configured).toBe(false);
  });

  it("includes model settings in response", async () => {
    const from = vi.fn().mockResolvedValue([
      { key: "genx_api_key", value: "k" },
      { key: "genx_model", value: "gpt-5.4" },
      { key: "hf_task_text_to_image_model", value: "flux-schnell" },
      { key: "qwen_text_model", value: "qwen-plus" },
    ]);
    const select = vi.fn(() => ({ from }));
    vi.mocked(getDb).mockResolvedValueOnce({ select } as any);
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.listAIProviderSettings();

    expect(result.genx.settings.genx_model).toBe("gpt-5.4");
    expect(result.huggingface.settings.hf_task_text_to_image_model).toBe("flux-schnell");
    expect(result.qwen.settings.qwen_text_model).toBe("qwen-plus");
  });

  it("is admin-only — throws UNAUTHORIZED for non-admin", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    const err = await caller.admin.listAIProviderSettings().catch((e) => e);
    expect(err).toBeInstanceOf(TRPCError);
    expect((err as TRPCError).code).toBe("FORBIDDEN");
  });
});

describe("admin.saveAIProviderSettings", () => {
  it("throws INTERNAL_SERVER_ERROR when DB is unavailable", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const err = await caller.admin
      .saveAIProviderSettings({ settings: { genx_api_key: "new-key" } })
      .catch((e) => e);
    expect(err).toBeInstanceOf(TRPCError);
    expect((err as TRPCError).code).toBe("INTERNAL_SERVER_ERROR");
  });

  it("skips blank API key — does not overwrite existing key", async () => {
    const execute = vi.fn().mockResolvedValue([]);
    vi.mocked(getDb).mockResolvedValueOnce({ execute } as any);
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.saveAIProviderSettings({
      settings: { genx_api_key: "" },
    });

    expect(result.skipped).toContain("genx_api_key");
    expect(result.saved).not.toContain("genx_api_key");
    expect(execute).not.toHaveBeenCalled();
  });

  it("skips masked (bullet-containing) API key", async () => {
    const execute = vi.fn().mockResolvedValue([]);
    vi.mocked(getDb).mockResolvedValueOnce({ execute } as any);
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.saveAIProviderSettings({
      settings: { genx_api_key: "sk-12••••••••" },
    });

    expect(result.skipped).toContain("genx_api_key");
    expect(result.saved).not.toContain("genx_api_key");
    expect(execute).not.toHaveBeenCalled();
  });

  it("skips unknown keys", async () => {
    const execute = vi.fn().mockResolvedValue([]);
    vi.mocked(getDb).mockResolvedValueOnce({ execute } as any);
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.saveAIProviderSettings({
      settings: { unknown_key: "value" },
    });

    expect(result.skipped).toContain("unknown_key");
    expect(result.saved).toHaveLength(0);
    expect(execute).not.toHaveBeenCalled();
  });

  it("saves GenX API key when value is new and non-empty", async () => {
    const execute = vi.fn().mockResolvedValue([]);
    vi.mocked(getDb).mockResolvedValueOnce({ execute } as any);
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.saveAIProviderSettings({
      settings: { genx_api_key: "sk-newvalidkey" },
    });

    expect(result.saved).toContain("marketing_genx_api_key");
    expect(result.skipped).not.toContain("genx_api_key");
    expect(execute).toHaveBeenCalled();
  });

  it("maps legacy provider secret keys to namespaced marketing_* keys on save", async () => {
    const execute = vi.fn().mockResolvedValue([]);
    vi.mocked(getDb).mockResolvedValueOnce({ execute } as any);
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.saveAIProviderSettings({
      settings: { genx_api_key: "legacy-value" },
    });

    expect(result.saved).toContain("marketing_genx_api_key");
    expect(result.skipped).not.toContain("genx_api_key");
  });

  it("saves Hugging Face API key", async () => {
    const execute = vi.fn().mockResolvedValue([]);
    vi.mocked(getDb).mockResolvedValueOnce({ execute } as any);
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.saveAIProviderSettings({
      settings: { huggingface_api_key: "hf_newhfkey123" },
    });

    expect(result.saved).toContain("marketing_huggingface_api_key");
    expect(execute).toHaveBeenCalled();
  });

  it("saves Qwen API key", async () => {
    const execute = vi.fn().mockResolvedValue([]);
    vi.mocked(getDb).mockResolvedValueOnce({ execute } as any);
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.saveAIProviderSettings({
      settings: { qwen_api_key: "qwen-newkey-abc" },
    });

    expect(result.saved).toContain("marketing_qwen_api_key");
    expect(execute).toHaveBeenCalled();
  });

  it("saves model settings and skips blank ones", async () => {
    const execute = vi.fn().mockResolvedValue([]);
    vi.mocked(getDb).mockResolvedValueOnce({ execute } as any);
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.saveAIProviderSettings({
      settings: {
        genx_model: "gpt-5.4",
        genx_text_model: "",
        hf_task_text_to_image_model: "flux-schnell",
        qwen_text_model: "qwen-plus",
      },
    });

    expect(result.saved).toContain("genx_model");
    expect(result.skipped).toContain("genx_text_model");
    expect(result.saved).toContain("hf_task_text_to_image_model");
    expect(result.saved).toContain("qwen_text_model");
    expect(execute).toHaveBeenCalledTimes(3);
  });

  it("returns { saved, skipped } shape", async () => {
    const execute = vi.fn().mockResolvedValue([]);
    vi.mocked(getDb).mockResolvedValueOnce({ execute } as any);
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.saveAIProviderSettings({
      settings: { genx_model: "gpt-5.4" },
    });

    expect(result).toMatchObject({
      success: true,
      saved: expect.any(Array),
      skipped: expect.any(Array),
    });
  });

  it("is admin-only — throws UNAUTHORIZED for non-admin", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    const err = await caller.admin
      .saveAIProviderSettings({ settings: { genx_model: "gpt-5.4" } })
      .catch((e) => e);
    expect(err).toBeInstanceOf(TRPCError);
    expect((err as TRPCError).code).toBe("FORBIDDEN");
  });
});

describe("admin.testAIProviderConnection", () => {
  it("returns missing_key status for huggingface when no key is configured", async () => {
    // No DB rows, no env var → no key
    const from = vi.fn().mockResolvedValue([]);
    const select = vi.fn(() => ({ from }));
    vi.mocked(getDb).mockResolvedValueOnce({ select } as any);
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.testAIProviderConnection({ provider: "huggingface" });

    expect(result.status).toBe("missing_key");
    expect((result as any).keyPresent).toBe(false);
  });

  it("returns key_present status for huggingface when key is configured via env", async () => {
    // getDb returns null (default) so getRuntimeConfig falls back to env var (no caching path)
    const original = process.env.HUGGINGFACE_API_KEY;
    process.env.HUGGINGFACE_API_KEY = "hf_test123";
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    try {
      const result = await caller.admin.testAIProviderConnection({ provider: "huggingface" });
      expect(result.status).toBe("key_present");
      expect((result as any).keyPresent).toBe(true);
    } finally {
      if (original !== undefined) process.env.HUGGINGFACE_API_KEY = original;
      else delete process.env.HUGGINGFACE_API_KEY;
    }
  });

  it("returns missing_key status for qwen when no key is configured", async () => {
    const from = vi.fn().mockResolvedValue([]);
    const select = vi.fn(() => ({ from }));
    vi.mocked(getDb).mockResolvedValueOnce({ select } as any);
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.testAIProviderConnection({ provider: "qwen" });

    expect(result.status).toBe("missing_key");
    expect(result.configured).toBe(false);
  });

  it("is admin-only — throws UNAUTHORIZED for non-admin", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    const err = await caller.admin
      .testAIProviderConnection({ provider: "huggingface" })
      .catch((e) => e);
    expect(err).toBeInstanceOf(TRPCError);
    expect((err as TRPCError).code).toBe("FORBIDDEN");
  });
});
