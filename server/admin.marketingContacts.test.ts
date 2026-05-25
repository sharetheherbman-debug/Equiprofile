import { beforeEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
}));

vi.mock("./db", () => ({
  getAdminSession: vi.fn().mockResolvedValue({ userId: 1, role: "admin", isAdmin: true }),
  getDb: mocks.getDb,
}));

function makeAdminContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "admin-user",
      email: "admin@example.com",
      name: "Admin",
      loginMethod: "email",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as any,
    res: { clearCookie: vi.fn() } as any,
  };
}

describe("admin marketing contacts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a marketing contact from audience add contact flow", async () => {
    const insertValues = vi.fn(async () => [{ insertId: 1 }]);
    const dbConn = {
      select: () => ({
        from: () => ({ where: vi.fn(async () => []) }),
      }),
      insert: () => ({ values: insertValues }),
    } as any;
    mocks.getDb.mockResolvedValue(dbConn);

    const caller = appRouter.createCaller(makeAdminContext());
    const result = await caller.admin.createMarketingContact({
      email: "new@example.com",
      name: "New Lead",
      organizationName: "Stable Co",
      source: "manual",
      contactType: "individual",
    });

    expect(result).toEqual({ success: true });
    expect(insertValues).toHaveBeenCalled();
  });

  it("returns suppression list rows from emailUnsubscribes + marketingContacts join", async () => {
    const suppressedRows = [{
      id: 10,
      email: "blocked@example.com",
      name: "Blocked",
      businessName: null,
      organizationName: "Org",
      contactType: "individual",
      status: "unsubscribed",
      reason: "manual",
      source: "admin",
      unsubscribedAt: new Date(),
    }];

    const dbConn = {
      select: () => ({
        from: () => ({
          leftJoin: () => ({
            where: () => ({
              orderBy: () => ({
                limit: () => ({
                  offset: async () => suppressedRows,
                }),
              }),
            }),
          }),
        }),
      }),
    } as any;
    mocks.getDb.mockResolvedValue(dbConn);

    const caller = appRouter.createCaller(makeAdminContext());
    const result = await caller.admin.getMarketingContacts({
      status: "unsubscribed",
      search: "blocked",
      limit: 50,
      offset: 0,
    });

    expect(result).toHaveLength(1);
    expect(result[0].email).toBe("blocked@example.com");
    expect(result[0].status).toBe("unsubscribed");
  });
});
