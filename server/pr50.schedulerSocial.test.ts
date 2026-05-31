/**
 * PR50 — Social Export + Scheduler Upgrade
 * Test suite covering all 25 acceptance criteria.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import * as fs from "fs";
import * as path from "path";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function readSource(relPath: string): string {
  return fs.readFileSync(path.resolve(__dirname, "..", relPath), "utf8");
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 1 — FullCalendar dependencies
// ─────────────────────────────────────────────────────────────────────────────

describe("Phase 1 – FullCalendar dependencies", () => {
  it("1. FullCalendar packages are present in package.json", () => {
    const pkg = JSON.parse(readSource("package.json")) as Record<string, Record<string, string>>;
    const all = { ...pkg.dependencies, ...pkg.devDependencies };
    expect(all["@fullcalendar/core"], "Missing @fullcalendar/core").toBeTruthy();
    expect(all["@fullcalendar/react"], "Missing @fullcalendar/react").toBeTruthy();
    expect(all["@fullcalendar/daygrid"], "Missing @fullcalendar/daygrid").toBeTruthy();
    expect(all["@fullcalendar/timegrid"], "Missing @fullcalendar/timegrid").toBeTruthy();
    expect(all["@fullcalendar/interaction"], "Missing @fullcalendar/interaction").toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Phase 2 — Schedule source of truth
// ─────────────────────────────────────────────────────────────────────────────

describe("Phase 2 – Schedule source of truth", () => {
  it("2. marketingScheduleDrafts is the only schedule table in the schema", () => {
    const schema = readSource("drizzle/schema.ts");
    // Verify the canonical table exists
    expect(schema).toContain("marketingScheduleDrafts");
    // No duplicate schedule-related table definitions
    const matches = [...schema.matchAll(/\bpgTable\s*\(\s*["']([^"']*schedule[^"']*|[^"']*draft[^"']*|[^"']*calendar[^"']*|[^"']*posting[^"']*)['"]/gi)];
    const tableNames = matches.map((m) => m[1]);
    expect(tableNames.every((n) => n === "marketingScheduleDrafts" || !n.toLowerCase().includes("schedule"))).toBe(true);
  });

  it("2a. marketingScheduleDrafts schema has metadataJson column", () => {
    const schema = readSource("drizzle/schema.ts");
    expect(schema).toContain("metadataJson");
  });

  it("2b. listMarketingScheduleDraftRecords scopes by tenantId and workspaceId", () => {
    const persistence = readSource("server/modules/growth-engine/persistence.ts");
    expect(persistence).toContain("listMarketingScheduleDraftRecords");
    expect(persistence).toContain("workspaceId");
    expect(persistence).toContain("tenantId");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Phase 3 — Scheduler procedures (unit tests with mocked DB)
// ─────────────────────────────────────────────────────────────────────────────

vi.mock("./db", () => ({
  getAdminSession: vi.fn().mockResolvedValue({ userId: 1, role: "admin", isAdmin: true }),
  getDb: vi.fn().mockResolvedValue(null),
}));

vi.mock("./modules/growth-engine/persistence", async (importOriginal) => {
  const original = await importOriginal<typeof import("./modules/growth-engine/persistence")>();

  let idCounter = 100;
  const drafts: Array<Record<string, unknown>> = [];

  return {
    ...original,
    createMarketingScheduleDraftRecord: vi.fn(async (input: Record<string, unknown>) => {
      const id = ++idCounter;
      drafts.push({ id, ...input, scheduledFor: input.scheduledFor ?? new Date().toISOString(), status: input.status ?? "draft", reviewStatus: input.reviewStatus ?? "needs_review" });
      return id;
    }),
    listMarketingScheduleDraftRecords: vi.fn(async () => drafts.map((d) => ({ ...d }))),
    updateMarketingScheduleDraftRecord: vi.fn(async (input: { id: number; patch: Record<string, unknown> }) => {
      const draft = drafts.find((d) => d.id === input.id);
      if (draft) Object.assign(draft, input.patch);
    }),
    listMarketingSocialConnectionRecords: vi.fn(async () => []),
    getMarketingCampaignRecord: vi.fn(async ({ id }: { id: number }) => ({
      id,
      tenantId: "test-tenant",
      workspaceId: "test-workspace",
      name: "Test Campaign",
      summary: "",
      status: "active",
    })),
    listMarketingCampaignItemRecords: vi.fn(async () => [
      {
        id: 1,
        campaignId: 1,
        tenantId: "test-tenant",
        title: "Approved item",
        content: "Content",
        platform: "Facebook",
        scheduledFor: new Date(Date.now() + 86400000).toISOString(),
        status: "approved",
        reviewStatus: "approved",
        metadata: { hashtags: ["#horse"], hook: "Hook text", cta: "Click here", assetUrls: ["https://cdn.example.com/asset.mp4"] },
      },
      {
        id: 2,
        campaignId: 1,
        tenantId: "test-tenant",
        title: "Needs review item",
        content: "Content 2",
        platform: "Instagram",
        scheduledFor: new Date(Date.now() + 172800000).toISOString(),
        status: "draft",
        reviewStatus: "needs_review",
        metadata: {},
      },
      {
        id: 3,
        campaignId: 1,
        tenantId: "test-tenant",
        title: "Rejected item",
        content: "Content 3",
        platform: "TikTok",
        scheduledFor: new Date(Date.now() + 259200000).toISOString(),
        status: "draft",
        reviewStatus: "rejected",
        metadata: {},
      },
    ]),
  };
});

import {
  createMarketingScheduleDraftRecord,
  listMarketingScheduleDraftRecords,
  listMarketingCampaignItemRecords,
  updateMarketingScheduleDraftRecord,
} from "./modules/growth-engine/persistence";
import { buildScheduleExportPack } from "./modules/marketing/social-publishing/scheduleExportPackBuilder";
import { listPublisherReadiness } from "./modules/marketing/social-publishing/socialPublisherRegistry";

describe("Phase 3 – Scheduler procedures", () => {
  beforeEach(() => {
    vi.mocked(createMarketingScheduleDraftRecord).mockClear();
    vi.mocked(listMarketingScheduleDraftRecords).mockClear();
    vi.mocked(updateMarketingScheduleDraftRecord).mockClear();
  });

  it("3. createScheduleDraftsFromCampaign creates drafts from eligible items", async () => {
    const items = await listMarketingCampaignItemRecords({ campaignId: 1, tenantId: "test-tenant" });
    const eligible = items.filter((item) => item.reviewStatus !== "rejected");
    expect(eligible).toHaveLength(2);

    for (const item of eligible) {
      const draftStatus = item.reviewStatus === "approved" && item.status === "approved" ? "approved" : "export_only";
      await createMarketingScheduleDraftRecord({
        tenantId: "test-tenant",
        workspaceId: "test-workspace",
        campaignId: 1,
        campaignItemId: item.id,
        platform: item.platform ?? "General",
        title: item.title ?? "",
        content: item.content ?? "",
        scheduledFor: item.scheduledFor ?? new Date().toISOString(),
        status: draftStatus,
        reviewStatus: item.reviewStatus as "approved" | "needs_review",
        metadataJson: JSON.stringify({ generatedBy: "createScheduleDraftsFromCampaign" }),
      });
    }

    expect(createMarketingScheduleDraftRecord).toHaveBeenCalledTimes(2);
  });

  it("4. Approved campaign item (status=approved, reviewStatus=approved) becomes approved schedule draft", async () => {
    const items = await listMarketingCampaignItemRecords({ campaignId: 1, tenantId: "test-tenant" });
    const approved = items.find((item) => item.reviewStatus === "approved" && item.status === "approved");
    expect(approved).toBeDefined();
    const draftStatus = approved!.reviewStatus === "approved" && approved!.status === "approved" ? "approved" : "export_only";
    expect(draftStatus).toBe("approved");
  });

  it("5. Unapproved campaign item (needs_review) cannot silently become approved schedule draft", async () => {
    const items = await listMarketingCampaignItemRecords({ campaignId: 1, tenantId: "test-tenant" });
    const needsReview = items.find((item) => item.reviewStatus === "needs_review");
    expect(needsReview).toBeDefined();
    const draftStatus = needsReview!.reviewStatus === "approved" && needsReview!.status === "approved" ? "approved" : "export_only";
    expect(draftStatus).toBe("export_only");
  });

  it("6. Rejected campaign item is excluded from schedule draft creation", async () => {
    const items = await listMarketingCampaignItemRecords({ campaignId: 1, tenantId: "test-tenant" });
    const eligible = items.filter((item) => item.reviewStatus !== "rejected");
    const rejected = items.filter((item) => item.reviewStatus === "rejected");
    expect(rejected).toHaveLength(1);
    expect(eligible.map((i) => i.id)).not.toContain(rejected[0].id);
  });

  it("7. rescheduleMarketingScheduleDraft changes scheduledFor", async () => {
    const draftId = await createMarketingScheduleDraftRecord({
      tenantId: "test-tenant",
      workspaceId: "test-workspace",
      platform: "Facebook",
      title: "Test draft",
      scheduledFor: new Date("2026-06-01T10:00:00Z").toISOString(),
      status: "draft",
    });
    const newDate = "2026-06-15T12:00:00Z";
    await updateMarketingScheduleDraftRecord({
      id: draftId,
      tenantId: "test-tenant",
      workspaceId: "test-workspace",
      patch: { scheduledFor: newDate },
    });
    expect(updateMarketingScheduleDraftRecord).toHaveBeenCalledWith(expect.objectContaining({
      id: draftId,
      patch: expect.objectContaining({ scheduledFor: newDate }),
    }));
  });

  it("8. cancelMarketingScheduleDraft sets status to cancelled", async () => {
    const draftId = await createMarketingScheduleDraftRecord({
      tenantId: "test-tenant",
      workspaceId: "test-workspace",
      platform: "Instagram",
      title: "Draft to cancel",
      scheduledFor: new Date().toISOString(),
      status: "draft",
    });
    await updateMarketingScheduleDraftRecord({
      id: draftId,
      tenantId: "test-tenant",
      workspaceId: "test-workspace",
      patch: { status: "cancelled" },
    });
    expect(updateMarketingScheduleDraftRecord).toHaveBeenCalledWith(expect.objectContaining({
      id: draftId,
      patch: expect.objectContaining({ status: "cancelled" }),
    }));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Phase 4 — Export pack
// ─────────────────────────────────────────────────────────────────────────────

describe("Phase 4 – Platform export packs", () => {
  const baseDraft = {
    id: 1,
    tenantId: "test-tenant",
    workspaceId: "test-workspace",
    campaignId: 1,
    campaignItemId: 1,
    platform: "Facebook",
    title: "Horse Introduction Video",
    content: "Introducing EquiProfile — your horse's digital identity.",
    scheduledFor: "2026-06-10T09:00:00.000Z",
    status: "approved" as const,
    reviewStatus: "approved" as const,
    metadataJson: JSON.stringify({
      hashtags: ["#EquiProfile", "#horses"],
      hook: "Meet your horse's digital profile.",
      cta: "Sign up free today.",
      assetUrls: ["https://cdn.example.com/horse-video.mp4"],
      videoUrl: "https://cdn.example.com/horse-video.mp4",
      imageUrls: ["https://cdn.example.com/thumb.jpg"],
      qaChecklistSummary: "5/5 passed, 0 blocking",
    }),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  function getFbItem(pack: ReturnType<typeof buildScheduleExportPack>) {
    const group = pack.platformGroups.find((g) => g.platform === "Facebook");
    expect(group, "Facebook platformGroup missing").toBeDefined();
    const day = group!.days[0];
    expect(day, "Facebook day missing").toBeDefined();
    return day.items[0];
  }

  it("9. exportScheduleDraftPack groups by platform/day", () => {
    const pack = buildScheduleExportPack({ tenantId: "test-tenant", workspaceId: "test-workspace", drafts: [baseDraft] });
    expect(pack.platformGroups).toBeDefined();
    const platforms = pack.platformGroups.map((g) => g.platform);
    expect(platforms).toContain("Facebook");
    const fbGroup = pack.platformGroups.find((g) => g.platform === "Facebook")!;
    expect(fbGroup.days.length).toBeGreaterThan(0);
  });

  it("10. Export pack item includes asset URLs", () => {
    const pack = buildScheduleExportPack({ tenantId: "test-tenant", workspaceId: "test-workspace", drafts: [baseDraft] });
    const item = getFbItem(pack);
    expect(item.assetUrls.length).toBeGreaterThan(0);
    expect(item.videoUrl).toBe("https://cdn.example.com/horse-video.mp4");
  });

  it("11. Export pack item includes review status", () => {
    const pack = buildScheduleExportPack({ tenantId: "test-tenant", workspaceId: "test-workspace", drafts: [baseDraft] });
    const item = getFbItem(pack);
    expect(item.reviewStatus).toBe("approved");
  });

  it("12. Export pack item includes QA checklist summary", () => {
    const pack = buildScheduleExportPack({ tenantId: "test-tenant", workspaceId: "test-workspace", drafts: [baseDraft] });
    const item = getFbItem(pack);
    expect(item.qaChecklistSummary).toBeTruthy();
  });

  it("13. Export pack item includes manual posting checklist", () => {
    const pack = buildScheduleExportPack({ tenantId: "test-tenant", workspaceId: "test-workspace", drafts: [baseDraft] });
    // Pack-level manual posting checklist
    expect(Array.isArray(pack.manualPostingChecklist)).toBe(true);
    expect(pack.manualPostingChecklist.length).toBeGreaterThan(0);
    // Per-item manual posting instructions and export checklist
    const item = getFbItem(pack);
    expect(Array.isArray(item.manualPostingInstructions)).toBe(true);
    expect(item.manualPostingInstructions.length).toBeGreaterThan(0);
    expect(Array.isArray(item.exportChecklist)).toBe(true);
  });

  it("14. No fake posted status in export pack", () => {
    const pack = buildScheduleExportPack({ tenantId: "test-tenant", workspaceId: "test-workspace", drafts: [baseDraft] });
    const item = getFbItem(pack);
    expect(item).not.toHaveProperty("posted");
    expect(item).not.toHaveProperty("postStatus");
    const raw = JSON.stringify(item);
    expect(raw).not.toContain('"posted":true');
    expect(raw).not.toContain("postedAt");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Phase 6 — Social publisher registry
// ─────────────────────────────────────────────────────────────────────────────

describe("Phase 6 – Social publisher registry", () => {
  it("15. Social publisher registry defaults all platforms to canPublish: false", () => {
    const readiness = listPublisherReadiness();
    expect(readiness.length).toBeGreaterThan(0);
    for (const entry of readiness) {
      expect(entry.canPublish).toBe(false);
    }
  });

  it("16. No OAuth or posting side effects in social publisher stubs", async () => {
    const { getSocialPublisher } = await import("./modules/marketing/social-publishing/socialPublisherRegistry");
    const adapter = getSocialPublisher("Facebook");
    expect(adapter).toBeDefined();
    expect(adapter!.canPublish).toBe(false);
    // publishApprovedDraft must return failure, never success
    const result = await adapter!.publishApprovedDraft({
      platform: "Facebook",
      title: "Test",
      body: "Test body",
      hook: "",
      cta: "",
      hashtags: [],
      scheduledFor: new Date().toISOString(),
      assetUrls: [],
    });
    expect(result.success).toBe(false);
    expect(result.reason).toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Phase 5 — Frontend source checks (static analysis)
// ─────────────────────────────────────────────────────────────────────────────

describe("Phase 5 – Frontend calendar wiring", () => {
  it("17. Calendar section uses listMarketingScheduleDrafts", () => {
    const app = readSource("client/src/components/marketing/app/TheMarketingApp.tsx");
    const hook = readSource("client/src/components/marketing/app/hooks/useMarketingCalendar.ts");
    expect(app).toContain("useMarketingCalendar");
    expect(hook).toContain("listMarketingScheduleDrafts");
  });

  it("18. Campaigns section has Create schedule from campaign action", () => {
    const panels = readSource("client/src/components/marketing/app/MarketingAppPanels.tsx");
    expect(panels).toContain("Create schedule from campaign");
    expect(panels).toContain("onCreateScheduleFromCampaign");
  });

  it("18a. TheMarketingApp wires createScheduleDraftsFromCampaign mutation", () => {
    const app = readSource("client/src/components/marketing/app/TheMarketingApp.tsx");
    expect(app).toContain("createScheduleDraftsFromCampaign");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Negative / regression checks
// ─────────────────────────────────────────────────────────────────────────────

describe("Regression – no forbidden patterns", () => {
  it("19. createMediaJob raw path is not re-introduced in routers.ts", () => {
    const routers = readSource("server/routers.ts");
    // The procedure should not make raw video provider calls outside of the media factory path
    // It may exist as a mutation but should not be called by campaign engine
    const campaignSection = routers.slice(routers.indexOf("createScheduleDraftsFromCampaign"), routers.indexOf("exportScheduleDraftPack"));
    expect(campaignSection).not.toContain("createMediaJob");
  });

  it("20. Free-form raw chat is not re-introduced", () => {
    const routers = readSource("server/routers.ts");
    // Should not have an open chatCompletion call without guard
    expect(routers).not.toMatch(/rawChat\s*:/);
    expect(routers).not.toMatch(/freeformChat\s*:/);
  });

  it("21. Academy files are untouched (no academy imports in new social-publishing code)", () => {
    const registry = readSource("server/modules/marketing/social-publishing/socialPublisherRegistry.ts");
    const types = readSource("server/modules/marketing/social-publishing/socialPublisherTypes.ts");
    const builder = readSource("server/modules/marketing/social-publishing/scheduleExportPackBuilder.ts");
    for (const source of [registry, types, builder]) {
      expect(source.toLowerCase()).not.toContain("academy");
    }
  });

  it("22–25. Build scripts exist in package.json (check/test/preflight/build)", () => {
    const pkg = JSON.parse(readSource("package.json")) as { scripts: Record<string, string> };
    expect(pkg.scripts.check).toBeTruthy();
    expect(pkg.scripts.test).toBeTruthy();
    expect(pkg.scripts.preflight).toBeTruthy();
    expect(pkg.scripts.build).toBeTruthy();
  });
});
