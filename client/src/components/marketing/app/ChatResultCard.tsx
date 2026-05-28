import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Expand, ExternalLink } from "lucide-react";
import { AssetActions } from "./MarketingAppActions";

export type ChatResultCardData = {
  assetId?: number | string;
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
  onPreview,
  onDelete,
  onRegenerate,
  onApprove,
  onReject,
  onDownload,
  onCreateBranded,
  onCopyUrl,
}: {
  result: ChatResultCardData;
  onPreview?: (asset: any) => void;
  onDelete?: (id: number) => void;
  onRegenerate?: (asset: any) => void;
  onApprove?: (id: string | number) => void;
  onReject?: (id: string | number) => void;
  onDownload?: (url: string) => void;
  onCreateBranded?: (id: number) => void;
  onCopyUrl?: (url: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const status = (result.status ?? "pending").toLowerCase();
  const mime = result.mimeType ?? "";
  const hasPublicUrl = Boolean(result.publicUrl);
  const createdLabel = result.createdAt
    ? new Date(result.createdAt).toLocaleString()
    : null;

  return (
    <article className="rounded-2xl border border-stone-200 bg-white p-3 shadow-sm">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Badge className="rounded-full border border-violet-200 bg-violet-50 text-violet-700">
          Result
        </Badge>
        <Badge
          className={`rounded-full border ${
            status === "completed"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : status === "failed"
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-stone-200 bg-stone-50 text-stone-600"
          }`}
        >
          {status}
        </Badge>
        {result.type ? (
          <Badge className="rounded-full border border-stone-200 bg-stone-50 text-stone-600">
            {result.type}
          </Badge>
        ) : null}
      </div>

      <p className="text-sm font-semibold text-stone-800">
        {result.title || result.prompt || "Generated output"}
      </p>
      {result.prompt ? (
        <p className="mt-1 text-xs text-stone-500 line-clamp-2">{result.prompt}</p>
      ) : null}

      {/* Compact preview — fixed max height so it never dominates chat */}
      <div className="mt-3 overflow-hidden rounded-xl border border-stone-200 bg-stone-100">
        {hasPublicUrl && mime.startsWith("video/") ? (
          <video
            src={result.publicUrl ?? undefined}
            controls
            className="compact-preview max-h-[200px] w-full object-contain"
            aria-label="Generated video preview"
          />
        ) : hasPublicUrl && mime.startsWith("image/") ? (
          <img
            src={result.publicUrl ?? undefined}
            alt="Generated image preview"
            className="compact-preview max-h-[200px] w-full object-contain"
          />
        ) : hasPublicUrl && mime.startsWith("audio/") ? (
          <div className="p-3">
            <audio src={result.publicUrl ?? undefined} controls className="w-full" />
          </div>
        ) : (
          <div className="flex min-h-[80px] items-center justify-center px-4 text-center text-xs text-stone-500">
            {result.errorMessage || "Output is still processing."}
          </div>
        )}
      </div>

      {/* Expand preview / Open asset controls */}
      {hasPublicUrl ? (
        <div className="mt-2 flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="rounded-xl border-stone-200 text-xs"
            onClick={() => setExpanded(true)}
            aria-label="Expand preview"
          >
            <Expand className="mr-1 size-3" />
            Expand preview
          </Button>
          <a
            href={result.publicUrl ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-xl border border-stone-200 px-2 py-1 text-xs text-stone-600 hover:bg-stone-50"
            aria-label="Open asset in new tab"
          >
            <ExternalLink className="size-3" />
            Open asset
          </a>
        </div>
      ) : null}

      <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-stone-500">
        {result.provider ? <span>Provider: {result.provider}</span> : null}
        {result.model ? <span>Model: {result.model}</span> : null}
        {createdLabel ? <span>Created: {createdLabel}</span> : null}
      </div>

      <div className="mt-3">
        <AssetActions
          asset={{
            id: result.assetId,
            type: result.type,
            status: result.status ?? undefined,
            publicUrl: result.publicUrl ?? undefined,
            mimeType: result.mimeType ?? undefined,
            errorMessage: result.errorMessage ?? undefined,
            metadata: result.title ? { title: result.title } : undefined,
          }}
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

      {/* Full-size expand dialog */}
      <Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent className="max-w-3xl border-stone-200 bg-white">
          <DialogHeader>
            <DialogTitle className="text-stone-900">
              {result.title || result.prompt || "Generated output"}
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-hidden rounded-xl border border-stone-200 bg-stone-100">
            {mime.startsWith("video/") ? (
              <video
                src={result.publicUrl ?? undefined}
                controls
                autoPlay
                className="w-full"
                aria-label="Full-size video preview"
              />
            ) : mime.startsWith("image/") ? (
              <img
                src={result.publicUrl ?? undefined}
                alt="Full-size image preview"
                className="w-full object-contain"
              />
            ) : mime.startsWith("audio/") ? (
              <div className="p-4">
                <audio src={result.publicUrl ?? undefined} controls autoPlay className="w-full" />
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </article>
  );
}
