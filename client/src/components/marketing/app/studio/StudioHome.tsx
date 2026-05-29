import React, { useState } from "react";
import { StudioWorkbench } from "./StudioWorkbench";
import { MarketingAppChat, type ChatMessage } from "../MarketingAppChat";
import type { ChatResultCardData } from "../ChatResultCard";
import type { MarketingStudioPlan } from "@shared/_core/marketingStudioPlan";

type CreateMode = "type_selector" | "free_chat";

export function StudioHome({
  workspaceId,
  hostAppId,
  messages,
  resultCards,
  isSubmitting,
  progressStep,
  progressSteps,
  onChatSubmit,
  onResultDelete,
  onResultRegenerate,
  onResultApprove,
  onResultReject,
  onResultDownload,
  onResultCreateBranded,
  onWorkbenchDone,
}: {
  workspaceId: string;
  hostAppId: string;
  messages: ChatMessage[];
  resultCards: ChatResultCardData[];
  isSubmitting: boolean;
  progressStep?: number;
  progressSteps?: string[];
  onChatSubmit: (text: string) => void;
  onResultDelete?: (id: number) => void;
  onResultRegenerate?: (asset: ChatResultCardData) => void;
  onResultApprove?: (id: string | number) => void;
  onResultReject?: (id: string | number) => void;
  onResultDownload?: (url: string) => void;
  onResultCreateBranded?: (assetId: number) => void;
  onWorkbenchDone?: (plan: MarketingStudioPlan) => void;
}) {
  const [mode, setMode] = useState<CreateMode>("type_selector");

  return (
    <div className="space-y-4">
      {/* Mode switcher */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode("type_selector")}
          className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
            mode === "type_selector"
              ? "bg-stone-800 text-white"
              : "border border-stone-200 text-stone-600 hover:bg-stone-50"
          }`}
        >
          Guided create
        </button>
        <button
          type="button"
          onClick={() => setMode("free_chat")}
          className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
            mode === "free_chat"
              ? "bg-stone-800 text-white"
              : "border border-stone-200 text-stone-600 hover:bg-stone-50"
          }`}
        >
          Free-form chat
        </button>
      </div>

      {mode === "type_selector" ? (
        <StudioWorkbench
          workspaceId={workspaceId}
          hostAppId={hostAppId}
          onDone={onWorkbenchDone}
        />
      ) : (
        <MarketingAppChat
          messages={messages}
          resultCards={resultCards}
          isSubmitting={isSubmitting}
          progressStep={progressStep}
          progressSteps={progressSteps}
          onSubmit={onChatSubmit}
          onResultDelete={onResultDelete}
          onResultRegenerate={onResultRegenerate}
          onResultApprove={onResultApprove}
          onResultReject={onResultReject}
          onResultDownload={onResultDownload}
          onResultCreateBranded={onResultCreateBranded}
        />
      )}
    </div>
  );
}
