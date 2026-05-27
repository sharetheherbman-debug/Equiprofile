import { beforeEach, describe, expect, it, vi } from "vitest";

const store = vi.hoisted(() => ({
  rows: [] as any[],
}));

vi.mock("../../db", () => ({
  getDb: async () => ({
    insert: () => ({
      values: async (row: any) => {
        store.rows.push({ ...row, createdAt: new Date() });
        return [{ insertId: store.rows.length }];
      },
    }),
    select: () => ({
      from: () => ({
        where: () => ({
          orderBy: () => ({
            limit: async () => store.rows,
          }),
        }),
      }),
    }),
  }),
}));

import { getProviderTelemetrySummary, recordProviderTelemetry } from "./providerTelemetry";

describe("providerTelemetry", () => {
  beforeEach(() => {
    store.rows = [];
    process.env.EQUIPROFILE_RUNTIME_CONFIG_MODE = "production_live";
  });

  it("persists telemetry events", async () => {
    await recordProviderTelemetry({
      provider: "genx",
      model: "kling",
      task: "text_to_video",
      tenantId: "global",
      latencyMs: 1000,
      queueTimeMs: 200,
      success: true,
    });

    expect(store.rows).toHaveLength(1);
    expect(store.rows[0].eventType).toBe("provider_execution");
  });

  it("aggregates summary metrics", async () => {
    await recordProviderTelemetry({
      provider: "genx",
      model: "kling",
      task: "text_to_video",
      tenantId: "global",
      latencyMs: 1000,
      queueTimeMs: 500,
      success: true,
    });
    await recordProviderTelemetry({
      provider: "genx",
      model: "kling",
      task: "text_to_video",
      tenantId: "global",
      latencyMs: 500,
      queueTimeMs: 500,
      success: false,
      failureReason: "timeout",
    });

    const summary = await getProviderTelemetrySummary({ provider: "genx", task: "text_to_video" });
    expect(summary[0].totalRuns).toBe(2);
    expect(summary[0].successRate).toBe(0.5);
    expect(summary[0].failureRate).toBe(0.5);
    expect(summary[0].avgCompletionTimeMs).toBe(1250);
  });
});
