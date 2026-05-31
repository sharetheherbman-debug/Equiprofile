import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useRealtime } from "@/hooks/useRealtime";
import { trpc } from "@/lib/trpc";
import { hasPlayablePublicAsset } from "@/components/marketing/studio/mediaStatus";
import { useMarketingAppAssetStore, type MarketingAssetRow } from "../MarketingAppAssetStore";
import { getAssetTitle } from "../marketingAppHelpers";
import type { MarketingWorkspaceConfig } from "./useMarketingWorkspaceConfig.types";

export function useMarketingAssets(workspace: MarketingWorkspaceConfig) {
  const utils = trpc.useUtils();
  const { subscribe } = useRealtime();
  const [selectedAssetId, setSelectedAssetId] = useState<number | null>(null);
  const [assetFilter, setAssetFilter] = useState<"all" | "video" | "image" | "audio" | "draft_text" | "completed" | "failed_setup_needed">("all");
  const [assetSearch, setAssetSearch] = useState("");
  const [assetModalOpen, setAssetModalOpen] = useState(false);

  const assets = trpc.admin.listMediaAssets.useQuery({ tenantId: workspace.tenantId });
  const deleteMediaAsset = trpc.admin.permanentDeleteMediaAsset.useMutation({
    onSuccess: async () => {
      toast.success("Asset deleted permanently");
      setAssetModalOpen(false);
      setSelectedAssetId(null);
      await utils.admin.listMediaAssets.invalidate();
    },
    onError: (error) => toast.error("Could not delete asset", { description: error.message }),
  });
  const createBrandedMedia = trpc.admin.createBrandedMediaAsset.useMutation({
    onSuccess: async (data: any) => {
      toast.success("Branded asset created");
      if (typeof data?.assetId === "number") setSelectedAssetId(data.assetId);
      await utils.admin.listMediaAssets.invalidate();
    },
    onError: (error) => toast.error("Branding unavailable", { description: error.message }),
  });

  useEffect(() => {
    const unsubscribe = subscribe("marketing-app", (event) => {
      const name = String((event as { type?: string }).type ?? "");
      if (name.includes("media") || name.includes("asset")) {
        void utils.admin.listMediaAssets.invalidate();
      }
    });
    return unsubscribe;
  }, [subscribe, utils.admin.listMediaAssets]);

  const allAssets = useMemo(() => ((assets.data as MarketingAssetRow[] | undefined) ?? []), [assets.data]);
  const assetStore = useMarketingAppAssetStore({ assets: allAssets, selectedAssetId, showDeleted: false });
  const completedAssets = useMemo(() => allAssets.filter((asset) => hasPlayablePublicAsset(asset)), [allAssets]);
  const logoAssets = useMemo(
    () => completedAssets.filter((asset) => asset.type === "image").map((asset) => ({ id: asset.id, label: getAssetTitle(asset) })),
    [completedAssets],
  );

  useEffect(() => {
    if (!selectedAssetId && assetStore.latestGeneratedAsset?.id && typeof assetStore.latestGeneratedAsset.id === "number") {
      setSelectedAssetId(assetStore.latestGeneratedAsset.id);
    }
  }, [assetStore.latestGeneratedAsset, selectedAssetId]);

  const selectedAsset = assetStore.selectedAsset;
  const canApplyBrand = Boolean(
    selectedAsset &&
    typeof selectedAsset.id === "number" &&
    hasPlayablePublicAsset({ publicUrl: selectedAsset.publicUrl, mimeType: selectedAsset.mimeType }),
  );

  return {
    assets,
    allAssets,
    assetStore,
    selectedAsset,
    selectedAssetId,
    setSelectedAssetId,
    assetFilter,
    setAssetFilter,
    assetSearch,
    setAssetSearch,
    assetModalOpen,
    setAssetModalOpen,
    logoAssets,
    deleteMediaAsset,
    createBrandedMedia,
    canApplyBrand,
  };
}
