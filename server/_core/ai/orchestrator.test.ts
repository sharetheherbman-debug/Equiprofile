import { beforeEach, describe, expect, it, vi, afterEach } from "vitest";

const mocks = vi.hoisted(() => ({
  runComplianceModeration: vi.fn(),
  createJob: vi.fn(),
  transition: vi.fn(),
  executeWithFallback: vi.fn(),
  isProviderAvailableForTask: vi.fn(),
  selectProviderOrderForTask: vi.fn(),
  resolveModelCandidatesForTask: vi.fn(),
  normalizeProviderOutput: vi.fn(),
  persistProviderOutput: vi.fn(),
  createMediaAsset: vi.fn(),
  getMediaAssetByJobId: vi.fn(),
  updateMediaAsset: vi.fn(),
}));

vi.mock("./agents/registry", () => ({
  listAgentPolicies: vi.fn(() => []),
  getAgentPolicy: vi.fn(() => undefined),
}));

vi.mock("./analytics/usageAnalytics", () => ({
  aiUsageAnalytics: {
    getSummary: vi.fn(() => ({})),
  },
}));

vi.mock("./approval/approvalQueue", () => ({
  aiApprovalQueue: {
    createDraft: vi.fn(),
    submitForReview: vi.fn(),
    list: vi.fn(async () => []),
  },
}));

vi.mock("./jobs/mediaJobManager", () => ({
  mediaJobManager: {
    createJob: mocks.createJob,
    transition: mocks.transition,
    list: vi.fn(async () => []),
  },
}));

vi.mock("./moderation/compliance", () => ({
  runComplianceModeration: mocks.runComplianceModeration,
}));

vi.mock("./providers/providerRegistry", () => ({
  executeWithFallback: mocks.executeWithFallback,
  getProviderHealth: vi.fn(async () => []),
  getProviderRuntimeDiagnostics: vi.fn(() => ({})),
  isProviderAvailableForTask: mocks.isProviderAvailableForTask,
  ProviderSelectionError: class ProviderSelectionError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.code = code;
    }
  },
}));

vi.mock("./providerCapabilities", () => ({
  selectProviderOrderForTask: mocks.selectProviderOrderForTask,
}));

vi.mock("./modelRegistry", () => ({
  discoverProviderModels: vi.fn(async () => []),
  resolveModelCandidatesForTask: mocks.resolveModelCandidatesForTask,
}));

vi.mock("./knowledge/templates", () => ({
  aiKnowledgeLibrary: {
    list: vi.fn(() => []),
  },
}));

vi.mock("./outputNormalization", () => ({
  normalizeProviderOutput: mocks.normalizeProviderOutput,
  persistProviderOutput: mocks.persistProviderOutput,
}));

vi.mock("../../dynamicConfig", () => ({
  getRuntimeConfig: vi.fn(async () => ""),
}));

vi.mock("../../modules/growth-engine", () => ({
  buildPlatformReadiness: vi.fn(async () => ({})),
  getQueueStatus: vi.fn(async () => ({})),
  listSocialConnections: vi.fn(async () => []),
}));

vi.mock("../../modules/growth-engine/mediaAssets", () => ({
  createMediaAsset: mocks.createMediaAsset,
  getMediaAssetByJobId: mocks.getMediaAssetByJobId,
  updateMediaAsset: mocks.updateMediaAsset,
}));

vi.mock("../storage/localMediaStorage", () => ({
  STORAGE_ROOT: "/tmp/equiprofile-test-storage",
  deleteAssetFile: vi.fn(async () => undefined),
  ensureStorageDirs: vi.fn(async () => undefined),
  writeTempFile: vi.fn(async () => "/tmp/equiprofile-test-storage/probe.txt"),
}));

import { executeAITask } from "./orchestrator";

describe("executeAITask media asset persistence", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.values(mocks).forEach((mock) => mock.mockReset());

    mocks.runComplianceModeration.mockReturnValue({
      blocked: false,
      reasons: [],
      escalation: "low_confidence",
    });
    mocks.selectProviderOrderForTask.mockResolvedValue(["genx"]);
    mocks.isProviderAvailableForTask.mockResolvedValue(true);
    mocks.resolveModelCandidatesForTask.mockResolvedValue([
      {
        provider: "genx",
        id: "kling-v2.5-turbo",
        routeReason: "GenX media endpoint selected model kling-v2.5-turbo for text_to_video",
        endpointFamily: "genx_async_job",
      },
    ]);
    mocks.createJob.mockResolvedValue({ id: "job-1" });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("persists queued GenX jobs as processing media assets with provider metadata", async () => {
    mocks.executeWithFallback.mockResolvedValue({
      provider: "genx",
      task: "text_to_video",
      model: "kling-v2.5-turbo",
      output: {
        providerJobId: "gnxsh_job_123",
        providerStatus: "queued",
        resultType: "job_pending",
      },
      latencyMs: 42,
      routeReason: "GenX media endpoint selected model kling-v2.5-turbo for text_to_video",
      endpointFamily: "genx_async_job",
    });
    mocks.normalizeProviderOutput.mockReturnValue({
      resultType: "job_pending",
      mimeType: null,
      fileExtension: null,
      publicUrl: null,
      localPath: null,
      remoteUrl: null,
      providerJobId: "gnxsh_job_123",
      rawProviderPayload: {},
      errorMessage: null,
      provider: "genx",
      model: "kling-v2.5-turbo",
      task: "text_to_video",
      latencyMs: 42,
    });
    mocks.persistProviderOutput.mockResolvedValue({
      resultType: "job_pending",
      mimeType: null,
      fileExtension: null,
      publicUrl: null,
      localPath: null,
      remoteUrl: null,
      providerJobId: "gnxsh_job_123",
      rawProviderPayload: {},
      errorMessage: null,
      provider: "genx",
      model: "kling-v2.5-turbo",
      task: "text_to_video",
      latencyMs: 42,
    });
    mocks.getMediaAssetByJobId.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 99 });

    const response = await executeAITask({
      task: "text_to_video",
      input: { prompt: "Create a horse video introducing EquiProfile" },
      requiresApproval: false,
      tenantScope: { tenantType: "stable", tenantId: "tenant-1", initiatedByUserId: 7 },
    });

    expect(response.status).toBe("queued");
    expect(mocks.createMediaAsset).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: "tenant-1",
      tenantType: "stable",
      userId: 7,
      jobId: "job-1",
      type: "video",
      provider: "genx",
      task: "text_to_video",
      status: "processing",
      publicUrl: undefined,
      mimeType: undefined,
      outputMetadata: expect.objectContaining({
        resultType: "job_pending",
        provider: "genx",
        model: "kling-v2.5-turbo",
        source: "app_genx_media_job",
      }),
    }));

    await vi.runAllTimersAsync();

    expect(mocks.updateMediaAsset).toHaveBeenCalledWith(99, expect.objectContaining({
      status: "processing",
      publicUrl: undefined,
      mimeType: undefined,
      outputMetadata: expect.objectContaining({
        model: "kling-v2.5-turbo",
        resultType: "job_pending",
        providerJobId: "gnxsh_job_123",
        providerStatus: "queued",
        source: "app_genx_media_job",
      }),
    }));
  });

  it("persists playable GenX media as completed assets with publicUrl and mimeType", async () => {
    mocks.executeWithFallback.mockResolvedValue({
      provider: "genx",
      task: "text_to_video",
      model: "kling-v2.5-turbo",
      output: {
        url: "https://cdn.example.com/video.mp4",
        mimeType: "video/mp4",
        resultType: "url",
      },
      latencyMs: 55,
      routeReason: "GenX media endpoint selected model kling-v2.5-turbo for text_to_video",
      endpointFamily: "genx_async_job",
    });
    mocks.normalizeProviderOutput.mockReturnValue({
      resultType: "url",
      mimeType: "video/mp4",
      fileExtension: "mp4",
      publicUrl: "https://cdn.example.com/video.mp4",
      localPath: null,
      remoteUrl: "https://cdn.example.com/video.mp4",
      providerJobId: null,
      rawProviderPayload: {},
      errorMessage: null,
      provider: "genx",
      model: "kling-v2.5-turbo",
      task: "text_to_video",
      latencyMs: 55,
    });
    mocks.persistProviderOutput.mockResolvedValue({
      resultType: "video",
      mimeType: "video/mp4",
      fileExtension: "mp4",
      publicUrl: "https://cdn.example.com/video.mp4",
      localPath: "/tmp/video.mp4",
      remoteUrl: "https://cdn.example.com/video.mp4",
      providerJobId: null,
      rawProviderPayload: {},
      errorMessage: null,
      provider: "genx",
      model: "kling-v2.5-turbo",
      task: "text_to_video",
      latencyMs: 55,
    });
    mocks.getMediaAssetByJobId.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 100 });

    await executeAITask({
      task: "text_to_video",
      input: { prompt: "Create a horse video introducing EquiProfile" },
      requiresApproval: false,
      tenantScope: { tenantType: "stable", tenantId: "tenant-1", initiatedByUserId: 7 },
    });

    await vi.runAllTimersAsync();

    expect(mocks.updateMediaAsset).toHaveBeenCalledWith(100, expect.objectContaining({
      status: "completed",
      publicUrl: "https://cdn.example.com/video.mp4",
      mimeType: "video/mp4",
      localPath: "/tmp/video.mp4",
      outputMetadata: expect.objectContaining({
        model: "kling-v2.5-turbo",
        resultType: "video",
        remoteUrl: "https://cdn.example.com/video.mp4",
      }),
    }));
  });
});
