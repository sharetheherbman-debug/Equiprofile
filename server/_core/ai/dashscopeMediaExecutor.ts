import type { AITask } from "./types";

export type DashScopeMediaExecutorResult =
  | {
    status: "setup_needed";
    task: AITask;
    message: string;
    provider: "qwen";
    implementation: "dashscope_native_pending";
  }
  | {
    status: "executed";
    task: AITask;
    output: unknown;
  };

export async function executeDashscopeMediaTask(task: AITask): Promise<DashScopeMediaExecutorResult> {
  return {
    status: "setup_needed",
    task,
    provider: "qwen",
    implementation: "dashscope_native_pending",
    message: "DashScope native media execution is not enabled yet; setup_needed is returned truthfully.",
  };
}
