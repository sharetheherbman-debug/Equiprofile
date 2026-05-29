import React from "react";
import { StudioWorkbench } from "./StudioWorkbench";
import type { MarketingStudioPlan } from "@shared/_core/marketingStudioPlan";

export function StudioHome({
  tenantId,
  workspaceId,
  hostAppId,
  onWorkbenchDone,
}: {
  tenantId: string;
  workspaceId: string;
  hostAppId: string;
  onWorkbenchDone?: (plan: MarketingStudioPlan) => void;
}) {
  return (
    <div className="space-y-4">
      <StudioWorkbench
        tenantId={tenantId}
        workspaceId={workspaceId}
        hostAppId={hostAppId}
        onDone={onWorkbenchDone}
      />
    </div>
  );
}
