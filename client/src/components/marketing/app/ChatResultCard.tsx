import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export type ChatResultCardData = {
  assetId?: number | string | null;
  approvalId?: number | string | null;
  type?: string | null;
  status?: string | null;
  publicUrl?: string | null;
  mimeType?: string | null;
  title?: string | null;
  prompt?: string | null;
  provider?: string | null;
  model?: string | null;
  createdAt?: string | null;
  errorMessage?: string | null;
};

export function ChatResultCard({
  result,
  onDelete,
  onRegenerate,
  onApprove,
  onReject,
  onDownload,
  onCreateBranded,
}: {
  result: ChatResultCardData;
  onDelete?: (id: number) => void;
  onRegenerate?: (asset: ChatResultCardData) => void;
  onApprove?: (id: string | number) => void;
  onReject?: (id: string | number) => void;
  onDownload?: (url: string) => void;
  onCreateBranded?: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const status = String(result.status ?? "draft");
  const numericId = typeof result.assetId === "number" ? result.assetId : undefined;
  const hasPreview = Boolean(result.publicUrl);
  const isImage = String(result.mimeType ?? "").startsWith("image/");
  const isVideo = String(result.mimeType ?? "").startsWith("video/");

  return (
    <>
      <article className="rounded-3xl border border-stone-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row">
          <div className="w-full max-w-[240px] shrink-0 overflow-hidden rounded-2xl border border-stone-200 bg-stone-50">
            {result.publicUrl && isImage ? (
              <img src={result.publicUrl} alt={result.title ?? "Generated asset"} className="compact-preview h-full max-h-[200px] w-full object-contain" />
            ) : result.publicUrl && isVideo ? (
              <video src={result.publicUrl} className="compact-preview h-full max-h-[200px] w-full object-contain" controls aria-label={result.title ?? "Generated asset"} />
            ) : (
              <div className="flex min-h-[80px] items-center justify-center px-4 text-center text-xs text-stone-500">
                {result.errorMessage ?? "Preview will appear when the asset is ready."}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-stone-900">{result.title ?? "Generated asset"}</h3>
                {result.prompt ? <p className="mt-1 text-sm text-stone-500">{result.prompt}</p> : null}
              </div>
              <Badge className="rounded-full border border-stone-200 bg-stone-50 px-2 py-0.5 text-xs text-stone-600">
                {status}
              </Badge>
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
              <Button type="button" variant="outline" size="sm" className="rounded-full text-xs" onClick={() => setExpanded(true)} disabled={!hasPreview}>
                Expand preview
              </Button>
              {result.publicUrl ? (
                <a href={result.publicUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center rounded-full border border-stone-200 px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-50">
                  Open asset
                </a>
              ) : null}
              {result.publicUrl ? (
                <Button type="button" variant="outline" size="sm" className="rounded-full text-xs" onClick={() => onDownload?.(result.publicUrl!)}>
                  Download
                </Button>
              ) : null}
              {numericId !== undefined ? (
                <Button type="button" variant="outline" size="sm" className="rounded-full text-xs" onClick={() => onDelete?.(numericId)}>
                  Delete permanently
                </Button>
              ) : null}
              <Button type="button" variant="outline" size="sm" className="rounded-full text-xs" onClick={() => onRegenerate?.(result)}>
                Regenerate
              </Button>
              {result.approvalId !== undefined && result.approvalId !== null ? (
                <>
                  <Button type="button" variant="outline" size="sm" className="rounded-full text-xs" onClick={() => onApprove?.(result.approvalId!)}>
                    Approve
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="rounded-full text-xs" onClick={() => onReject?.(result.approvalId!)}>
                    Reject
                  </Button>
                </>
              ) : null}
              {numericId !== undefined ? (
                <Button type="button" variant="outline" size="sm" className="rounded-full text-xs" onClick={() => onCreateBranded?.(numericId)}>
                  Brand
                </Button>
              ) : null}
            </div>

            {(result.provider || result.model || result.createdAt) ? (
              <div className="flex flex-wrap gap-3 border-t border-stone-200 pt-3 text-[11px] uppercase tracking-[0.12em] text-stone-400">
                {result.provider ? <span>Provider: {result.provider}</span> : null}
                {result.model ? <span>Model: {result.model}</span> : null}
                {result.createdAt ? <span>{new Date(result.createdAt).toLocaleString()}</span> : null}
              </div>
            ) : null}
          </div>
        </div>
      </article>

      <Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{result.title ?? "Asset preview"}</DialogTitle>
          </DialogHeader>
          <div className="overflow-hidden rounded-2xl border border-stone-200 bg-stone-50 p-3">
            {result.publicUrl && isImage ? (
              <img src={result.publicUrl} alt={result.title ?? "Generated asset"} className="w-full object-contain" />
            ) : result.publicUrl && isVideo ? (
              <video src={result.publicUrl} className="w-full object-contain" controls aria-label={result.title ?? "Generated asset"} />
            ) : (
              <div className="flex min-h-[240px] items-center justify-center text-sm text-stone-500">
                {result.errorMessage ?? "Preview unavailable"}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
