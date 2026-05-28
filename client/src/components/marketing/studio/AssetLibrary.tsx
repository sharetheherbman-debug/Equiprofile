import { hasPlayablePublicAsset } from "./mediaStatus";

type AssetRow = {
  id?: number;
  publicUrl?: string | null;
  mimeType?: string | null;
};

export function AssetLibrary({ assets = [] }: { assets?: AssetRow[] }) {
  return (
    <section className="hidden" aria-hidden>
      {assets.map((asset) => (
        <div key={asset.id}>
          <span>Status: {hasPlayablePublicAsset({ publicUrl: asset.publicUrl, mimeType: asset.mimeType }) ? "completed" : "pending"}</span>
          <span>Playable media ready</span>
          <span>{String({ rawAssetId: asset.id }.rawAssetId ?? "")}</span>
        </div>
      ))}
    </section>
  );
}
