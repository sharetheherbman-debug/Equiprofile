import { useState } from "react";
import type { MarketingStudioPlan } from "@shared/_core/marketingStudioPlan";
import { trpc } from "@/lib/trpc";

export function useMarketingSceneMedia(input: {
  tenantId: string;
  workspaceId: string;
  hostAppId: string;
}) {
  const [lastStatus, setLastStatus] = useState<"ok" | "setup_needed" | null>(null);
  const mutation = trpc.admin.sourceMarketingSceneMedia.useMutation({
    onSuccess: (result) => {
      setLastStatus(result.status);
    },
  });

  async function sourceSceneMedia(plan: MarketingStudioPlan, providerPreference: "auto" | "pexels" | "pixabay" = "auto") {
    const result = await mutation.mutateAsync({
      tenantId: input.tenantId,
      workspaceId: input.workspaceId,
      hostAppId: input.hostAppId,
      providerPreference,
      plan: {
        id: plan.id,
        originalUserPrompt: plan.originalUserPrompt,
        audience: plan.audience,
        scenes: plan.scenes,
      },
    });
    return result.plan;
  }

  return {
    sourceSceneMedia,
    isSourcing: mutation.isPending,
    lastStatus,
  };
}
