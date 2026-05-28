import { useMemo } from "react";
import { hasPlayablePublicAsset } from "@/components/marketing/studio/mediaStatus";

export type MarketingAssetRow = {
  id: number;
  status?: string | null;
  jobId?: string | null;
  type?: string | null;
  publicUrl?: string | null;
  mimeType?: string | null;
  generationPrompt?: string | null;
  errorMessage?: string | null;
  metadata?: Record<string, unknown>;
  outputs?: Record<string, unknown>;
  outputMetadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
};

export function isDeletedAsset(asset: MarketingAssetRow): boolean {
  return String(asset.status ?? "").toLowerCase() === "deleted";
}

export function useMarketingAppAssetStore({
  assets,
  selectedAssetId,
  showDeleted,
}: {
  assets: MarketingAssetRow[];
  selectedAssetId: number | null;
  showDeleted: boolean;
}) {
  const sortedAssets = useMemo(
    () =>
      [...assets].sort((a, b) => {
        const aTime = new Date(a.updatedAt ?? a.createdAt ?? 0).getTime();
        const bTime = new Date(b.updatedAt ?? b.createdAt ?? 0).getTime();
        return bTime - aTime;
      }),
    [assets],
  );

  const nonDeletedAssets = useMemo(
    () => sortedAssets.filter((asset) => !isDeletedAsset(asset)),
    [sortedAssets],
  );

  const visibleAssets = showDeleted ? sortedAssets : nonDeletedAssets;

  const selectedAsset = useMemo(
    () => (selectedAssetId ? sortedAssets.find((asset) => asset.id === selectedAssetId) ?? null : null),
    [sortedAssets, selectedAssetId],
  );

  const latestPlayableAsset = useMemo(
    () =>
      nonDeletedAssets.find((asset) =>
        hasPlayablePublicAsset({ publicUrl: asset.publicUrl, mimeType: asset.mimeType }),
      ) ?? null,
    [nonDeletedAssets],
  );

  const latestGeneratedAsset = useMemo(
    () =>
      nonDeletedAssets.find(
        (asset) => !["failed", "deleted"].includes(String(asset.status ?? "").toLowerCase()),
      ) ?? null,
    [nonDeletedAssets],
  );

  const resolvedPreviewAsset = selectedAsset ?? latestPlayableAsset ?? latestGeneratedAsset ?? null;

  return {
    sortedAssets,
    nonDeletedAssets,
    visibleAssets,
    selectedAsset,
    latestPlayableAsset,
    latestGeneratedAsset,
    resolvedPreviewAsset,
  };
}
