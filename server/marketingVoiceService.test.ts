import { beforeEach, describe, expect, it, vi } from "vitest";

const executeAITaskMock = vi.fn();
const resolveModelCandidatesMock = vi.fn();
const rankProvidersMock = vi.fn();
const getMediaAssetByJobIdMock = vi.fn();
const createMediaAssetMock = vi.fn();

vi.mock("./_core/ai/orchestrator", () => ({
  executeAITask: executeAITaskMock,
}));

vi.mock("./_core/ai/modelRegistry", () => ({
  resolveModelCandidatesForTask: resolveModelCandidatesMock,
}));

vi.mock("./_core/ai/providerRanking", () => ({
  rankProvidersForTask: rankProvidersMock,
}));

vi.mock("./modules/growth-engine", () => ({
  getMediaAssetByJobId: getMediaAssetByJobIdMock,
  createMediaAsset: createMediaAssetMock,
}));

describe("PR46 marketing voice service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns setup_needed when no provider model is configured", async () => {
    resolveModelCandidatesMock.mockResolvedValue([]);
    const { createMarketingVoiceover } = await import("./modules/marketing/media-factory/marketingVoiceService");
    const result = await createMarketingVoiceover({
      tenantId: "global",
      workspaceId: "default",
      hostAppId: "equiprofile",
      voiceId: "voice_1",
      plan: { id: "plan1", script: "Narration", voiceoverScript: "", scenes: [] },
    });
    expect(result.status).toBe("setup_needed");
  });

  it("does not return fake completed voiceover when provider returns no audio", async () => {
    resolveModelCandidatesMock.mockResolvedValue([{ provider: "genx", id: "voice-model" }]);
    rankProvidersMock.mockResolvedValue({ task: "text_to_speech", providers: [{ provider: "genx", available: true, model: "voice-model" }] });
    executeAITaskMock.mockResolvedValue({ status: "completed", provider: "genx", model: "voice-model", jobId: "job_1" });
    getMediaAssetByJobIdMock.mockResolvedValue(null);
    const { createMarketingVoiceover } = await import("./modules/marketing/media-factory/marketingVoiceService");
    const result = await createMarketingVoiceover({
      tenantId: "global",
      workspaceId: "default",
      hostAppId: "equiprofile",
      voiceId: "voice_1",
      plan: { id: "plan1", script: "Narration", voiceoverScript: "", scenes: [] },
    });
    expect(result.status).toBe("setup_needed");
    expect(result.reason).toBe("provider_returned_no_audio");
  });
});
