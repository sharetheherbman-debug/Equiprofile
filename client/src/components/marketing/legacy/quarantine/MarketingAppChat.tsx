/* LEGACY ONLY — must not be imported by active Marketing App route. */
import React, { useRef, useState } from "react";
import { Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ChatResultCard, type ChatResultCardData } from "../../app/ChatResultCard";
import { STARTER_PROMPTS } from "../../app/marketingAppHelpers";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
};

const INTENT_HINTS: Record<string, string> = {
  campaign: "campaign",
  plan: "campaign",
  weekly: "campaign",
  post: "social_post",
  facebook: "social_post",
  instagram: "social_post",
  youtube: "video",
  video: "video",
  image: "image",
  asset: "asset",
  brand: "brand",
};

export function detectIntent(text: string): string {
  const lower = text.toLowerCase();
  for (const [keyword, intent] of Object.entries(INTENT_HINTS)) {
    if (lower.includes(keyword)) return intent;
  }
  return "general";
}

export function MarketingAppChat({
  messages,
  resultCards,
  isSubmitting,
  progressStep,
  progressSteps,
  onSubmit,
  onExampleSelect,
  onResultDelete,
  onResultRegenerate,
  onResultApprove,
  onResultReject,
  onResultDownload,
  onResultCreateBranded,
}: {
  messages: ChatMessage[];
  resultCards: ChatResultCardData[];
  isSubmitting: boolean;
  progressStep?: number;
  progressSteps?: string[];
  onSubmit: (text: string) => void;
  onExampleSelect?: (value: string) => void;
  onResultDelete?: (id: number) => void;
  onResultRegenerate?: (asset: ChatResultCardData) => void;
  onResultApprove?: (id: string | number) => void;
  onResultReject?: (id: string | number) => void;
  onResultDownload?: (url: string) => void;
  onResultCreateBranded?: (id: number) => void;
}) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  function submit() {
    const trimmed = input.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setInput("");
  }

  return (
    <section className="space-y-4" aria-label="Create">
      <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-stone-900">Create</h2>
            <p className="text-sm text-stone-500">One clean AI chat workspace for prompts, plans, and generated assets.</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs text-stone-600">
            <Sparkles className="size-3.5" />
            AI chat-first flow
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {STARTER_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs text-stone-600 transition hover:bg-stone-100"
              onClick={() => {
                setInput(prompt);
                onExampleSelect?.(prompt);
              }}
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-stone-200 bg-white shadow-sm">
        {progressSteps?.length ? (
          <div className="border-b border-stone-200 px-5 py-4" aria-label="Generation progress">
            <div className="flex flex-wrap gap-2">
              {progressSteps.map((step, index) => (
                <div
                  key={step}
                  className={`rounded-full px-3 py-1 text-xs ${
                    index === progressStep
                      ? "bg-stone-900 text-white"
                      : index < (progressStep ?? 0)
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-stone-100 text-stone-500"
                  }`}
                >
                  {step}
                </div>
              ))}
            </div>
          </div>
        ) : null}
        <div className="max-h-[560px] space-y-4 overflow-y-auto p-5">
          {messages.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-stone-200 bg-stone-50 p-6 text-sm text-stone-500">
              Start with a prompt. Plans and asset results will appear right here in the conversation.
            </div>
          ) : null}

          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-3xl rounded-3xl px-4 py-3 text-sm leading-6 ${
                  message.role === "user" ? "bg-stone-900 text-white" : "border border-stone-200 bg-stone-50 text-stone-700"
                }`}
              >
                {message.content}
              </div>
            </div>
          ))}

          {resultCards.map((result) => (
            <div key={`result-${String(result.assetId ?? result.createdAt ?? result.title)}`} className="flex justify-start">
              <div className="w-full max-w-3xl">
                <ChatResultCard
                  result={result}
                  onDelete={onResultDelete}
                  onRegenerate={onResultRegenerate}
                  onApprove={onResultApprove}
                  onReject={onResultReject}
                  onDownload={onResultDownload}
                  onCreateBranded={onResultCreateBranded}
                />
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-stone-200 p-4">
          <label className="mb-2 block text-sm font-medium text-stone-700" htmlFor="marketing-app-prompt">
            Prompt
          </label>
          <div className="flex flex-col gap-3 md:flex-row md:items-end">
            <Textarea
              id="marketing-app-prompt"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Create a horse video introducing EquiProfile"
              className="min-h-[88px] rounded-3xl border-stone-200 bg-stone-50 text-stone-800 placeholder:text-stone-400"
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  submit();
                }
              }}
            />
            <Button type="button" className="rounded-2xl px-5" onClick={submit} disabled={isSubmitting}>
              <Send className="mr-2 size-4" />
              {isSubmitting ? "Working…" : "Send"}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
