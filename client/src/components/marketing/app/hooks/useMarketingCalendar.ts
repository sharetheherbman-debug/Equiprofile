import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import type { MarketingWorkspaceConfig } from "./useMarketingWorkspaceConfig.types";

export function useMarketingCalendar(workspace: MarketingWorkspaceConfig) {
  const utils = trpc.useUtils();
  const scheduleDrafts = trpc.admin.listMarketingScheduleDrafts.useQuery({ tenantId: workspace.tenantId, workspaceId: workspace.marketing_workspace_id });

  const rescheduleScheduleDraftMutation = trpc.admin.rescheduleMarketingScheduleDraft.useMutation({
    onSuccess: async () => {
      toast.success("Draft rescheduled");
      await utils.admin.listMarketingScheduleDrafts.invalidate();
    },
    onError: (error) => toast.error("Could not reschedule draft", { description: error.message }),
  });
  const cancelScheduleDraftMutation = trpc.admin.cancelMarketingScheduleDraft.useMutation({
    onSuccess: async () => {
      toast.success("Draft cancelled");
      await utils.admin.listMarketingScheduleDrafts.invalidate();
    },
    onError: (error) => toast.error("Could not cancel draft", { description: error.message }),
  });
  const exportScheduleDraftPackMutation = trpc.admin.exportScheduleDraftPack.useMutation({
    onSuccess: (data: unknown) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `schedule-export-pack-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Export pack downloaded");
    },
    onError: (error: { message: string }) => toast.error("Could not export pack", { description: error.message }),
  });

  const mappedScheduleDrafts = ((scheduleDrafts.data as Array<any> | undefined) ?? []).map((item) => ({
    id: Number(item.id),
    title: String(item.title ?? ""),
    channel: String(item.platform ?? "General"),
    platform: String(item.platform ?? "General"),
    status: String(item.status ?? "draft"),
    reviewStatus: String(item.reviewStatus ?? "needs_review"),
    scheduledFor: String(item.scheduledFor ?? new Date().toISOString()),
    campaignId: typeof item.campaignId === "number" ? item.campaignId : null,
    campaignItemId: typeof item.campaignItemId === "number" ? item.campaignItemId : null,
  }));

  return {
    scheduleDrafts,
    mappedScheduleDrafts,
    rescheduleScheduleDraftMutation,
    cancelScheduleDraftMutation,
    exportScheduleDraftPackMutation,
  };
}
