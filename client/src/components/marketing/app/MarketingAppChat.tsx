import { useRef, useState } from "react";
import { Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { workspaceConfig } from "@/components/marketing/studio/workspaceConfig";
import type { QualityMode } from "@/components/marketing/studio/types";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
};

const EXAMPLE_INTENTS = [
  "Create a 7-day campaign for EquiProfile",
  "Create a horse video introducing EquiProfile",
  "Create posts for Facebook and Instagram",
  "Get me 50 signups this month",
  "Make a 3-minute YouTube video plan",
];

const INTENT_HINTS: Record<string, string> = {
  delete: "delete_asset",
  regenerate: "regenerate_asset",
  approve: "approve_asset",
  reject: "reject_asset",
  preview: "preview_asset",
  campaign: "create_campaign",
  schedule: "schedule_content",
  brand: "update_brand_kit",
  test: "test_provider",
  health: "show_provider_health",
  voiceover: "create_voiceover",
  youtube: "create_youtube_script",
  email: "create_email_campaign",
  blog: "create_blog",
  video: "create_video",
  avatar: "create_avatar_video",
  post: "create_social_post",
};

export function detectIntent(text: string): string {
  const lower = text.toLowerCase();
  for (const [keyword, intent] of Object.entries(INTENT_HINTS)) {
    if (lower.includes(keyword)) return intent;
  }
  return "create_asset";
}

export function MarketingAppChat({
  quality,
  loading,
  messages,
  onSubmit,
}: {
  quality: QualityMode;
  loading: boolean;
  messages: ChatMessage[];
  onSubmit: (text: string) => void;
}) {
  const [input, setInput] = useState(workspaceConfig.contentExamples[0] ?? "Create a campaign for EquiProfile");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  function handleSubmit() {
    const trimmed = input.trim();
    if (trimmed.length < 3) return;
    onSubmit(trimmed);
    setInput("");
  }

  return (
    <section className="flex flex-col gap-4 rounded-3xl border border-stone-200 bg-white p-4 shadow-sm" aria-label="AI Command Chat">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-violet-400 shadow-sm">
          <Sparkles className="size-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-stone-800">AI Command Chat</p>
          <p className="text-xs text-stone-400">
            {quality === "elite" ? "Elite mode — best available models" : "Standard mode — efficient routing"}
          </p>
        </div>
      </div>

      {/* Message history */}
      <div className="flex-1 space-y-3 overflow-y-auto max-h-80" aria-live="polite" aria-label="Chat history">
        {messages.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50 p-4 text-center">
            <p className="text-sm font-medium text-stone-600">
              What should The Marketing App create today?
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {EXAMPLE_INTENTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  className="rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-600 hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-violet-400 transition"
                  onClick={() => {
                    setInput(prompt);
                  }}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                  msg.role === "user"
                    ? "bg-stone-900 text-white"
                    : "border border-stone-200 bg-stone-50 text-stone-800"
                }`}
              >
                {msg.role === "assistant" ? (
                  <span className="mr-2">
                    <Badge className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-xs text-violet-700">AI</Badge>
                  </span>
                ) : null}
                {msg.content}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder="Type a request…"
          className="min-h-[60px] resize-none rounded-2xl border-stone-200 bg-stone-50 text-stone-800 placeholder:text-stone-400 focus:border-violet-400 focus:ring-violet-400"
          disabled={loading}
          aria-label="Marketing App command input"
        />
        <Button
          type="button"
          disabled={loading || input.trim().length < 3}
          className="self-end rounded-2xl bg-stone-900 px-4 text-white hover:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-violet-400"
          onClick={handleSubmit}
          aria-label="Send command"
        >
          <Send className="size-4" />
        </Button>
      </div>
    </section>
  );
}
