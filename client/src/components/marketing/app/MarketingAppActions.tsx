import { CheckCircle, XCircle, RotateCcw, Download, Trash2, Tag, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { hasPlayablePublicAsset } from "@/components/marketing/studio/mediaStatus";

type AssetRow = {
  id?: string | number;
  state?: string;
  status?: string;
  type?: string | null;
  publicUrl?: string | null;
  mimeType?: string | null;
  errorMessage?: string | null;
  updatedAt?: string;
  outputs?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  outputMetadata?: Record<string, unknown>;
};

type CampaignRow = {
  id?: string | number;
  title?: string | null;
  platform?: string | null;
  status?: string | null;
  format?: string | null;
  createdAt?: string;
};

/* ------------------------------------------------------------------ */
/* Asset actions                                                       */
/* ------------------------------------------------------------------ */

export function AssetActions({
  asset,
  onPreview,
  onDelete,
  onRegenerate,
  onApprove,
  onReject,
  onDownload,
  onCreateBranded,
  onCopyUrl,
  onRename,
}: {
  asset: AssetRow;
  onPreview?: (asset: AssetRow) => void;
  onDelete?: (id: number) => void;
  onRegenerate?: (asset: AssetRow) => void;
  onApprove?: (id: string | number) => void;
  onReject?: (id: string | number) => void;
  onDownload?: (url: string) => void;
  onCreateBranded?: (id: number) => void;
  onCopyUrl?: (url: string) => void;
  onRename?: (id: string | number) => void;
}) {
  const id = asset.id;
  const numericId = typeof id === "number" ? id : undefined;
  const url = asset.publicUrl ?? "";
  const playable = hasPlayablePublicAsset({ publicUrl: asset.publicUrl, mimeType: asset.mimeType });

  return (
    <div className="flex flex-wrap gap-2" aria-label="Asset actions">
      {onPreview ? (
        <Button type="button" size="sm" variant="outline" className="rounded-xl border-stone-200 text-xs" onClick={() => onPreview(asset)}>
          Preview
        </Button>
      ) : null}
      {onRegenerate ? (
        <Button type="button" size="sm" variant="outline" className="rounded-xl border-stone-200 text-xs" onClick={() => onRegenerate(asset)}>
          <RotateCcw className="mr-1 size-3" />
          Regenerate
        </Button>
      ) : null}
      {onApprove && id !== undefined ? (
        <Button type="button" size="sm" variant="outline" className="rounded-xl border-emerald-200 text-xs text-emerald-700" onClick={() => onApprove(id)}>
          <CheckCircle className="mr-1 size-3" />
          Approve
        </Button>
      ) : null}
      {onReject && id !== undefined ? (
        <Button type="button" size="sm" variant="outline" className="rounded-xl border-red-200 text-xs text-red-600" onClick={() => onReject(id)}>
          <XCircle className="mr-1 size-3" />
          Reject
        </Button>
      ) : null}
      {url && onDownload ? (
        <a
          href={url}
          download
          className="inline-flex items-center gap-1 rounded-xl border border-stone-200 px-2 py-1 text-xs text-stone-600 hover:bg-stone-50"
          aria-label="Download asset"
          onClick={(e) => {
            e.preventDefault();
            onDownload(url);
          }}
        >
          <Download className="size-3" />
          Download
        </a>
      ) : null}
      {numericId !== undefined && playable && onCreateBranded ? (
        <Button type="button" size="sm" variant="outline" className="rounded-xl border-stone-200 text-xs" onClick={() => onCreateBranded(numericId)}>
          Create branded version
        </Button>
      ) : null}
      {url && onCopyUrl ? (
        <Button type="button" size="sm" variant="outline" className="rounded-xl border-stone-200 text-xs" onClick={() => onCopyUrl(url)}>
          <ExternalLink className="mr-1 size-3" />
          Copy URL
        </Button>
      ) : null}
      {id !== undefined && onRename ? (
        <Button type="button" size="sm" variant="outline" className="rounded-xl border-stone-200 text-xs" onClick={() => onRename(id)}>
          <Tag className="mr-1 size-3" />
          Rename
        </Button>
      ) : null}
      {numericId !== undefined && onDelete ? (
        <Button type="button" size="sm" variant="outline" className="rounded-xl border-red-100 text-xs text-red-600" onClick={() => onDelete(numericId)}>
          <Trash2 className="mr-1 size-3" />
          Delete
        </Button>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Asset card                                                          */
/* ------------------------------------------------------------------ */

export function AssetCard({
  asset,
  onPreview,
  onDelete,
  onRegenerate,
  onApprove,
  onReject,
  onDownload,
  onCreateBranded,
  onCopyUrl,
}: {
  asset: AssetRow;
  onPreview?: (asset: AssetRow) => void;
  onDelete?: (id: number) => void;
  onRegenerate?: (asset: AssetRow) => void;
  onApprove?: (id: string | number) => void;
  onReject?: (id: string | number) => void;
  onDownload?: (url: string) => void;
  onCreateBranded?: (id: number) => void;
  onCopyUrl?: (url: string) => void;
}) {
  const playable = hasPlayablePublicAsset({ publicUrl: asset.publicUrl, mimeType: asset.mimeType });
  const statusText = playable
    ? "completed"
    : asset.status || asset.state || "pending";

  return (
    <article className="rounded-2xl border border-stone-200 bg-stone-50 p-3 shadow-sm">
      <div className="aspect-video overflow-hidden rounded-xl border border-stone-200 bg-stone-100">
        {asset.publicUrl && asset.mimeType?.startsWith("image/") ? (
          <img src={asset.publicUrl} alt="Generated asset" className="h-full w-full object-cover" />
        ) : asset.publicUrl && asset.mimeType?.startsWith("video/") ? (
          <video src={asset.publicUrl} className="h-full w-full object-cover" aria-label="Asset video" />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-stone-400">
            {playable ? "Playable media ready" : "Pending or text asset"}
          </div>
        )}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-stone-700 truncate">
          {String(asset.metadata?.title || asset.outputs?.title || "Generated asset")}
        </p>
        <Badge className={`shrink-0 rounded-full border px-2 text-xs ${
          statusText === "completed"
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : statusText === "failed"
              ? "border-red-200 bg-red-50 text-red-600"
              : "border-stone-200 bg-stone-50 text-stone-500"
        }`}>
          {statusText}
        </Badge>
      </div>
      <div className="mt-2">
        <AssetActions
          asset={asset}
          onPreview={onPreview}
          onDelete={onDelete}
          onRegenerate={onRegenerate}
          onApprove={onApprove}
          onReject={onReject}
          onDownload={onDownload}
          onCreateBranded={onCreateBranded}
          onCopyUrl={onCopyUrl}
        />
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Campaign actions                                                    */
/* ------------------------------------------------------------------ */

export function CampaignActions({
  campaign,
  onView,
  onEdit,
  onDelete,
  onGeneratePack,
  onApprovePlan,
  onExport,
}: {
  campaign: CampaignRow;
  onView?: (id: string | number) => void;
  onEdit?: (id: string | number) => void;
  onDelete?: (id: string | number) => void;
  onGeneratePack?: (id: string | number) => void;
  onApprovePlan?: (id: string | number) => void;
  onExport?: (id: string | number) => void;
}) {
  const id = campaign.id;
  if (id === undefined) return null;

  return (
    <div className="flex flex-wrap gap-2" aria-label="Campaign actions">
      {onView ? (
        <Button type="button" size="sm" variant="outline" className="rounded-xl border-stone-200 text-xs" onClick={() => onView(id)}>
          View
        </Button>
      ) : null}
      {onEdit ? (
        <Button type="button" size="sm" variant="outline" className="rounded-xl border-stone-200 text-xs" onClick={() => onEdit(id)}>
          Edit
        </Button>
      ) : null}
      {onGeneratePack ? (
        <Button type="button" size="sm" variant="outline" className="rounded-xl border-stone-200 text-xs" onClick={() => onGeneratePack(id)}>
          Generate content pack
        </Button>
      ) : null}
      {onApprovePlan ? (
        <Button type="button" size="sm" variant="outline" className="rounded-xl border-emerald-200 text-xs text-emerald-700" onClick={() => onApprovePlan(id)}>
          <CheckCircle className="mr-1 size-3" />
          Approve plan
        </Button>
      ) : null}
      {onExport ? (
        <Button type="button" size="sm" variant="outline" className="rounded-xl border-stone-200 text-xs" onClick={() => onExport(id)}>
          <Download className="mr-1 size-3" />
          Export campaign pack
        </Button>
      ) : null}
      {onDelete ? (
        <Button type="button" size="sm" variant="outline" className="rounded-xl border-red-100 text-xs text-red-600" onClick={() => onDelete(id)}>
          <Trash2 className="mr-1 size-3" />
          Delete
        </Button>
      ) : null}
    </div>
  );
}
