import React from "react";
import { StudioWorkbench } from "./StudioWorkbench";
import type { MarketingStudioPlan } from "@shared/_core/marketingStudioPlan";

export function StudioHome({
  workspaceId,
  hostAppId,
  onWorkbenchDone,
}: {
  workspaceId: string;
  hostAppId: string;
  onWorkbenchDone?: (plan: MarketingStudioPlan) => void;
}) {
  return (
    <div className="space-y-4">
      <StudioWorkbench
        workspaceId={workspaceId}
        hostAppId={hostAppId}
        onDone={onWorkbenchDone}
      />
    </div>
  );
}
