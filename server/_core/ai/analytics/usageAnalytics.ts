import type { AITask, AIProviderName } from "../types";

type FailureLog = {
  at: string;
  provider: AIProviderName;
  task: AITask;
  error: string;
};

type UsageLog = {
  at: string;
  provider: AIProviderName;
  task: AITask;
  latencyMs: number;
  promptTokens: number;
  completionTokens: number;
};

class UsageAnalyticsStore {
  private usage: UsageLog[] = [];
  private failures: FailureLog[] = [];
  private taskCounts: Record<AITask, number> = {
    chat: 0,
    copywriting: 0,
    text_to_image: 0,
    image_edit: 0,
    image_to_video: 0,
    text_to_video: 0,
    avatar_video: 0,
    speech_to_text: 0,
    text_to_speech: 0,
    image_captioning: 0,
    classification: 0,
    moderation: 0,
    embeddings: 0,
  };

  recordUsage(entry: UsageLog) {
    this.usage.unshift(entry);
    this.taskCounts[entry.task] += 1;
    if (this.usage.length > 500) this.usage.length = 500;
  }

  recordFailure(entry: FailureLog) {
    this.failures.unshift(entry);
    if (this.failures.length > 200) this.failures.length = 200;
  }

  getSummary() {
    const byProvider: Record<AIProviderName, { calls: number; avgLatencyMs: number; promptTokens: number; completionTokens: number }> = {
      genx: { calls: 0, avgLatencyMs: 0, promptTokens: 0, completionTokens: 0 },
      huggingface: { calls: 0, avgLatencyMs: 0, promptTokens: 0, completionTokens: 0 },
    };

    for (const entry of this.usage) {
      const provider = byProvider[entry.provider];
      provider.calls += 1;
      provider.promptTokens += entry.promptTokens;
      provider.completionTokens += entry.completionTokens;
      provider.avgLatencyMs += entry.latencyMs;
    }

    for (const provider of Object.values(byProvider)) {
      if (provider.calls > 0) {
        provider.avgLatencyMs = Math.round(provider.avgLatencyMs / provider.calls);
      }
    }

    return {
      providerUsage: byProvider,
      taskCounts: this.taskCounts,
      recentFailures: this.failures.slice(0, 20),
      recentUsage: this.usage.slice(0, 20),
    };
  }
}

export const aiUsageAnalytics = new UsageAnalyticsStore();
