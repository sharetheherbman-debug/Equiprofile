/**
 * Chat Orchestrator
 *
 * Handles text-only chat/assistant tasks without touching media routing,
 * video model discovery, or provider telemetry DB writes.
 *
 * This is intentionally kept separate from the main AI orchestrator
 * (orchestrator.ts) so that dashboard chat never fails because
 * HF/Qwen media providers are setup_needed or unreachable.
 *
 * Priority: GenX (text model) → Qwen (text model) → HuggingFace (text model)
 */
import { getRuntimeConfig, getRuntimeConfigMode } from "../../dynamicConfig";
import type { Message } from "../llm";

export type ChatTextProvider = "genx" | "qwen" | "huggingface";

export type ChatProviderConfig = {
  provider: ChatTextProvider;
  apiKey: string;
  endpoint: string;
  model: string;
};

export type ChatResponse = {
  provider: ChatTextProvider;
  model: string;
  content: string;
};

export type ChatSetupNeededError = {
  status: "setup_needed";
  message: string;
};

export type ChatResult = ChatResponse | ChatSetupNeededError;

export function isChatSetupNeeded(result: ChatResult): result is ChatSetupNeededError {
  return (result as ChatSetupNeededError).status === "setup_needed";
}

async function resolveGenXChatConfig(): Promise<ChatProviderConfig | null> {
  const apiKey = await getRuntimeConfig("genx_api_key", "GENX_API_KEY");
  if (!apiKey) return null;
  const baseRaw = (await getRuntimeConfig("genx_base_url", "GENX_BASE_URL")) || "https://query.genx.sh/v1";
  const base = baseRaw.replace(/\/+$/, "").replace(/\/v1$/i, "");
  const endpoint = base + "/v1/chat/completions";
  const model =
    (await getRuntimeConfig("genx_text_model", "GENX_TEXT_MODEL")) ||
    (await getRuntimeConfig("genx_default_model", "GENX_DEFAULT_MODEL")) ||
    (await getRuntimeConfig("genx_model", "GENX_MODEL")) ||
    "gpt-5.4";
  return { provider: "genx", apiKey, endpoint, model };
}

async function resolveQwenChatConfig(): Promise<ChatProviderConfig | null> {
  const apiKey = await getRuntimeConfig("qwen_api_key", "QWEN_API_KEY");
  if (!apiKey) return null;
  const baseRaw = (await getRuntimeConfig("qwen_base_url", "QWEN_BASE_URL")) || "https://dashscope-intl.aliyuncs.com/compatible-mode";
  const base = baseRaw.replace(/\/+$/, "").replace(/\/v1$/i, "");
  const endpoint = base + "/v1/chat/completions";
  const model =
    (await getRuntimeConfig("qwen_text_model", "QWEN_TEXT_MODEL")) ||
    (await getRuntimeConfig("qwen_model", "QWEN_MODEL")) ||
    "qwen-plus";
  return { provider: "qwen", apiKey, endpoint, model };
}

async function resolveHuggingFaceChatConfig(): Promise<ChatProviderConfig | null> {
  const apiKey = await getRuntimeConfig("huggingface_api_key", "HUGGINGFACE_API_KEY");
  if (!apiKey) return null;
  const model =
    (await getRuntimeConfig("hf_task_copywriting_model", "HF_TASK_COPYWRITING_MODEL")) ||
    (await getRuntimeConfig("hf_task_chat_model", "HF_TASK_CHAT_MODEL")) ||
    (await getRuntimeConfig("hf_task_text_generation_model", "HF_TASK_TEXT_GENERATION_MODEL"));
  if (!model) return null;
  const endpoint = "https://api-inference.huggingface.co/models/" + model + "/v1/chat/completions";
  return { provider: "huggingface", apiKey, endpoint, model };
}

async function resolvePreferredChatConfig(): Promise<ChatProviderConfig | null> {
  const preferred = (await getRuntimeConfig("copywriting_provider", "COPYWRITING_PROVIDER")).toLowerCase().trim();

  if (preferred === "qwen") {
    const cfg = await resolveQwenChatConfig();
    if (cfg) return cfg;
  }
  if (preferred === "huggingface") {
    const cfg = await resolveHuggingFaceChatConfig();
    if (cfg) return cfg;
  }

  // Default order: GenX → Qwen → HuggingFace
  const genx = await resolveGenXChatConfig();
  if (genx) return genx;
  const qwen = await resolveQwenChatConfig();
  if (qwen) return qwen;
  const hf = await resolveHuggingFaceChatConfig();
  if (hf) return hf;

  return null;
}

function normalizeChatMessages(messages: Message[]): Array<{ role: string; content: string }> {
  return messages.map((m) => {
    const content = Array.isArray(m.content)
      ? m.content
          .map((part) => {
            if (typeof part === "string") return part;
            if (part.type === "text") return part.text;
            if (part.type === "image_url") return "[image:" + part.image_url.url + "]";
            return "";
          })
          .join("\n")
      : typeof m.content === "string"
        ? m.content
        : "";
    return {
      role: m.role === "function" || m.role === "tool" ? "assistant" : m.role,
      content,
    };
  });
}

async function callChatEndpoint(
  config: ChatProviderConfig,
  messages: Array<{ role: string; content: string }>,
  maxTokens: number,
  timeoutMs: number,
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(config.endpoint, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + config.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        max_tokens: maxTokens,
        stream: false,
      }),
      signal: controller.signal,
    });
    if (!resp.ok) {
      const body = await resp.text().catch(() => "");
      throw new Error(config.provider + " chat HTTP " + resp.status + ": " + body.slice(0, 200));
    }
    const json = (await resp.json()) as Record<string, unknown>;
    const choices = json.choices as Array<{ message?: { content?: unknown } }> | undefined;
    const text = choices?.[0]?.message?.content;
    if (typeof text === "string" && text.trim()) return text.trim();

    // HuggingFace text-generation fallback shape
    if (Array.isArray(json) && json.length > 0) {
      const first = json[0] as Record<string, unknown>;
      const generated = first.generated_text ?? first.summary_text;
      if (typeof generated === "string" && generated.trim()) return generated.trim();
    }

    throw new Error(config.provider + " returned an empty chat response");
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Execute a text-only chat task. Never calls media routing, model discovery,
 * or video provider checks.
 *
 * Returns a ChatSetupNeededError if no text provider is configured, so callers
 * can surface a clear "add API key" message rather than a generic 500.
 */
export async function executeChatTask(
  messages: Message[],
  opts: { maxTokens?: number; timeoutMs?: number } = {},
): Promise<ChatResult> {
  const config = await resolvePreferredChatConfig();
  if (!config) {
    return {
      status: "setup_needed",
      message:
        "No text provider is configured. Add GENX_API_KEY, QWEN_API_KEY, or HUGGINGFACE_API_KEY (with HF_TASK_COPYWRITING_MODEL) in settings.",
    };
  }

  const normalizedMessages = normalizeChatMessages(messages);
  const maxTokens = opts.maxTokens ?? 2048;
  const timeoutMs = opts.timeoutMs ?? 25_000;

  const content = await callChatEndpoint(config, normalizedMessages, maxTokens, timeoutMs);
  return { provider: config.provider, model: config.model, content };
}

/**
 * Returns true if at least one text provider is configured.
 * Never touches DB when in unit_test_mock mode.
 */
export async function isChatProviderConfigured(): Promise<boolean> {
  if (getRuntimeConfigMode() === "unit_test_mock") {
    return !!(
      process.env.GENX_API_KEY ||
      process.env.QWEN_API_KEY ||
      (process.env.HUGGINGFACE_API_KEY &&
        (process.env.HF_TASK_COPYWRITING_MODEL || process.env.HF_TASK_CHAT_MODEL))
    );
  }
  const cfg = await resolvePreferredChatConfig();
  return cfg !== null;
}
