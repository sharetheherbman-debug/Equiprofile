import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import type { MarketingWorkspaceConfig } from "./useMarketingWorkspaceConfig.types";

export function useMarketingReviewActions(_workspace: MarketingWorkspaceConfig) {
  const utils = trpc.useUtils();

  const runQaMutation = trpc.admin.runMarketingQaCheck.useMutation({
    onSuccess: async () => {
      toast.success("QA checklist refreshed");
      await utils.admin.getMarketingCampaign.invalidate();
      await utils.admin.listMarketingReviews.invalidate();
    },
    onError: (error) => toast.error("Could not run QA check", { description: error.message }),
  });
  const approveOutputMutation = trpc.admin.approveMarketingOutput.useMutation({
    onSuccess: async () => {
      toast.success("Output approved");
      await utils.admin.getMarketingCampaign.invalidate();
      await utils.admin.listMarketingReviews.invalidate();
    },
    onError: (error) => toast.error("Could not approve output", { description: error.message }),
  });
  const rejectOutputMutation = trpc.admin.rejectMarketingOutput.useMutation({
    onSuccess: async () => {
      toast.success("Output rejected");
      await utils.admin.getMarketingCampaign.invalidate();
      await utils.admin.listMarketingReviews.invalidate();
    },
    onError: (error) => toast.error("Could not reject output", { description: error.message }),
  });
  const requestChangesMutation = trpc.admin.requestMarketingOutputChanges.useMutation({
    onSuccess: async () => {
      toast.success("Changes requested");
      await utils.admin.getMarketingCampaign.invalidate();
      await utils.admin.listMarketingReviews.invalidate();
    },
    onError: (error) => toast.error("Could not request changes", { description: error.message }),
  });
  const markExportedMutation = trpc.admin.markMarketingOutputExported.useMutation({
    onSuccess: async () => {
      toast.success("Output marked exported");
      await utils.admin.getMarketingCampaign.invalidate();
      await utils.admin.listMarketingReviews.invalidate();
    },
    onError: (error) => toast.error("Could not mark output exported", { description: error.message }),
  });
  const approveBeastModeVariantMutation = trpc.admin.approveBeastModeVariant.useMutation({
    onSuccess: async () => {
      toast.success("Beast Mode variant approved");
      await utils.admin.getBeastModeRun.invalidate();
      await utils.admin.listMarketingReviews.invalidate();
    },
    onError: (error) => toast.error("Could not approve Beast Mode variant", { description: error.message }),
  });
  const rejectBeastModeVariantMutation = trpc.admin.rejectBeastModeVariant.useMutation({
    onSuccess: async () => {
      toast.success("Beast Mode variant rejected");
      await utils.admin.getBeastModeRun.invalidate();
      await utils.admin.listMarketingReviews.invalidate();
    },
    onError: (error) => toast.error("Could not reject Beast Mode variant", { description: error.message }),
  });
  const requestBeastModeVariantChangesMutation = trpc.admin.requestBeastModeVariantChanges.useMutation({
    onSuccess: async () => {
      toast.success("Changes requested for Beast Mode variant");
      await utils.admin.getBeastModeRun.invalidate();
      await utils.admin.listMarketingReviews.invalidate();
    },
    onError: (error) => toast.error("Could not request Beast Mode changes", { description: error.message }),
  });

  return {
    runQaMutation,
    approveOutputMutation,
    rejectOutputMutation,
    requestChangesMutation,
    markExportedMutation,
    approveBeastModeVariantMutation,
    rejectBeastModeVariantMutation,
    requestBeastModeVariantChangesMutation,
  };
}
