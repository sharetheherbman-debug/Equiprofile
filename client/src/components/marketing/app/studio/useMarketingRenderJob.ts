import { useMemo, useState } from "react";
import type { MarketingStudioPlan } from "@shared/_core/marketingStudioPlan";
import { trpc } from "@/lib/trpc";

export function useMarketingRenderJob(input: {
  tenantId: string;
  workspaceId: string;
  hostAppId: string;
}) {
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  const createMutation = trpc.admin.createMarketingRenderJob.useMutation({
    onSuccess: (result) => {
      setActiveJobId(result.id);
    },
  });

  const cancelMutation = trpc.admin.cancelMarketingRenderJob.useMutation();

  const jobQuery = trpc.admin.getMarketingRenderJob.useQuery(
    {
      id: activeJobId ?? "__none__",
      tenantId: input.tenantId,
      workspaceId: input.workspaceId,
    },
    {
      enabled: Boolean(activeJobId),
      refetchInterval: (query) => {
        const status = query.state.data?.status;
        if (!status) return 5_000;
        return ["queued", "processing"].includes(status) ? 5_000 : false;
      },
    },
  );

  async function createRenderJob(plan: MarketingStudioPlan, brandKit?: {
    id?: number;
    brandName?: string;
    domain?: string;
    cta?: string;
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string | null;
    logoUrl?: string | null;
    overlayTemplate?: "lower_third" | "corner_logo" | "end_card" | "social_reel" | "youtube_landscape";
    defaultAspectRatio?: string;
  }) {
    return createMutation.mutateAsync({
      tenantId: input.tenantId,
      workspaceId: input.workspaceId,
      hostAppId: input.hostAppId,
      plan: {
        id: plan.id,
        contentType: plan.contentType,
        originalUserPrompt: plan.originalUserPrompt,
        renderMode: plan.renderMode,
        durationTargetSeconds: plan.durationTargetSeconds,
        script: plan.script,
        voiceoverScript: plan.voiceoverScript,
        scenes: plan.scenes,
      },
      voiceAssetId: plan.voiceAssetId ?? undefined,
      audioUrl: plan.audioAssetUrl ?? undefined,
      captionMode: plan.captionMode,
      captionFormat: plan.captionFormat,
      brandKit: brandKit
        ? {
          id: brandKit.id,
          brandName: brandKit.brandName,
          domain: brandKit.domain,
          cta: brandKit.cta,
          primaryColor: brandKit.primaryColor,
          secondaryColor: brandKit.secondaryColor,
          accentColor: brandKit.accentColor ?? undefined,
          logoUrl: brandKit.logoUrl ?? undefined,
          overlayTemplate: brandKit.overlayTemplate,
          defaultAspectRatio: brandKit.defaultAspectRatio,
        }
        : undefined,
    });
  }

  async function cancelRenderJob() {
    if (!activeJobId) return;
    await cancelMutation.mutateAsync({
      id: activeJobId,
      tenantId: input.tenantId,
      workspaceId: input.workspaceId,
    });
    await jobQuery.refetch();
  }

  const status = jobQuery.data?.status ?? (createMutation.isPending ? "queued" : null);

  const statusLabel = useMemo(() => {
    switch (status) {
      case "queued":
        return "Queued";
      case "processing":
        return "Processing";
      case "completed":
        return "Completed";
      case "failed":
        return "Failed";
      case "setup_needed":
        return "Setup needed";
      case "cancelled":
        return "Cancelled";
      default:
        return null;
    }
  }, [status]);

  return {
    job: jobQuery.data,
    status,
    statusLabel,
    createRenderJob,
    cancelRenderJob,
    isCreating: createMutation.isPending,
  };
}
