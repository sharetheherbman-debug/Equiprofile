import { describe, expect, it, vi } from "vitest";

vi.mock("./modelRegistry", () => ({
  resolveModelCandidatesForTask: vi.fn(async () => ([
    { provider: "genx", id: "genx-kling" },
    { provider: "huggingface", id: "hf-mochi" },
  ])),
}));

vi.mock("./providerTelemetry", () => ({
  getProviderTelemetrySummary: vi.fn(async () => ([
    { provider: "genx", task: "text_to_video", totalRuns: 20, successRate: 0.9, failureRate: 0.1, cancellationRate: 0, retries: 0, avgLatencyMs: 1200, avgQueueTimeMs: 800, avgCompletionTimeMs: 2000, avgMediaDurationSeconds: 10, avgGenerationSizeBytes: 1000 },
    { provider: "huggingface", task: "text_to_video", totalRuns: 20, successRate: 0.5, failureRate: 0.5, cancellationRate: 0, retries: 0, avgLatencyMs: 1500, avgQueueTimeMs: 1200, avgCompletionTimeMs: 2700, avgMediaDurationSeconds: 10, avgGenerationSizeBytes: 1000 },
  ])),
}));

vi.mock("./providers/providerRegistry", () => ({
  getProviderHealth: vi.fn(async () => ([
    { provider: "genx", configured: true, liveReady: true },
    { provider: "huggingface", configured: true, liveReady: false },
  ])),
}));

import { getProviderDurationSupport, rankProvidersForTask } from "./providerRanking";

describe("providerRanking", () => {
  it("ranks providers by telemetry and health", async () => {
    const result = await rankProvidersForTask("text_to_video");
    expect(result.providers[0].provider).toBe("genx");
  });

  it("returns truthful duration support limits", () => {
    expect(getProviderDurationSupport("genx", "text_to_video").maxDurationSeconds).toBe(10);
  });
});
