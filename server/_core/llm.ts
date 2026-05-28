// Copyright (c) 2025-2026 Amarktai Network. All rights reserved.
import { executeChatTask, isChatSetupNeeded } from "./ai/chatOrchestrator";
import { getProviderHealth } from "./ai";

export type Role = "system" | "user" | "assistant" | "tool" | "function";

export type TextContent = {
  type: "text";
  text: string;
};

export type ImageContent = {
  type: "image_url";
  image_url: {
    url: string;
    detail?: "auto" | "low" | "high";
  };
};

export type FileContent = {
  type: "file_url";
  file_url: {
    url: string;
    mime_type?:
      | "audio/mpeg"
      | "audio/wav"
      | "application/pdf"
      | "audio/mp4"
      | "video/mp4";
  };
};

export type MessageContent = string | TextContent | ImageContent | FileContent;

export type Message = {
  role: Role;
  content: MessageContent | MessageContent[];
  name?: string;
  tool_call_id?: string;
};

export type Tool = {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
};

export type ToolChoicePrimitive = "none" | "auto" | "required";
export type ToolChoiceByName = { name: string };
export type ToolChoiceExplicit = {
  type: "function";
  function: {
    name: string;
  };
};

export type ToolChoice =
  | ToolChoicePrimitive
  | ToolChoiceByName
  | ToolChoiceExplicit;

export type JsonSchema = {
  name: string;
  schema: Record<string, unknown>;
  strict?: boolean;
};

export type OutputSchema = JsonSchema;

export type ResponseFormat =
  | { type: "text" }
  | { type: "json_object" }
  | { type: "json_schema"; json_schema: JsonSchema };

export type InvokeParams = {
  messages: Message[];
  tools?: Tool[];
  toolChoice?: ToolChoice;
  tool_choice?: ToolChoice;
  maxTokens?: number;
  max_tokens?: number;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
};

export type ToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

export type InvokeResult = {
  id: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: Role;
      content: string | Array<TextContent | ImageContent | FileContent>;
      tool_calls?: ToolCall[];
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

const ensureArray = (value: MessageContent | MessageContent[]): MessageContent[] =>
  (Array.isArray(value) ? value : [value]);

const normalizeToText = (content: MessageContent | MessageContent[]): string => {
  const parts = ensureArray(content);
  return parts
    .map((part) => {
      if (typeof part === "string") return part;
      if (part.type === "text") return part.text;
      if (part.type === "image_url") return `[image:${part.image_url.url}]`;
      return `[file:${part.file_url.url}]`;
    })
    .join("\n");
};

const normalizeMessageForProvider = (message: Message) => ({
  role: message.role === "function" || message.role === "tool" ? "assistant" : message.role,
  content: normalizeToText(message.content),
});

const extractTextContent = (output: unknown): string => {
  if (!output || typeof output !== "object") return "";
  const payload = output as Record<string, unknown>;

  const choices = payload.choices as Array<{ message?: { content?: unknown } }> | undefined;
  const choiceText = choices?.[0]?.message?.content;
  if (typeof choiceText === "string") return choiceText;

  const generated = payload.generated_text;
  if (typeof generated === "string") return generated;

  if (Array.isArray(payload) && payload.length > 0) {
    const first = payload[0] as Record<string, unknown>;
    if (typeof first.generated_text === "string") return first.generated_text;
    if (typeof first.summary_text === "string") return first.summary_text;
  }

  return "";
};

export async function isAIConfigured(): Promise<boolean> {
  const health = await getProviderHealth();
  return health.some((item) => item.configured);
}

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  const configured = await isAIConfigured();
  if (!configured) {
    throw new Error("AI service is not configured (GENX_API_KEY/genx_api_key or HUGGINGFACE_API_KEY/huggingface_api_key missing)");
  }

  const result = await executeChatTask(params.messages, {
    maxTokens: params.maxTokens ?? params.max_tokens ?? 2048,
    timeoutMs: 25_000,
  });

  if (isChatSetupNeeded(result)) {
    throw new Error(result.message);
  }

  return {
    id: "genx-" + Date.now(),
    created: Math.floor(Date.now() / 1000),
    model: result.model,
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: result.content || "No response",
        },
        finish_reason: "stop",
      },
    ],
    usage: {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
    },
  };
}
