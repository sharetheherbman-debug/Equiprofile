import { Upload, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type AssetRow = {
  id?: string;
  state?: string;
  updatedAt?: string;
  outputs?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

const CATEGORIES = ["All", "Uploads", "Images", "Videos", "Voiceovers", "Avatars", "Scripts", "Thumbnails", "Exports"];

export function AssetLibrary({ assets = [] }: { assets?: AssetRow[] }) {
  return (
    <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm" aria-label="Media Library">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-stone-900">Media Library</h2>
          <p className="mt-1 text-sm text-stone-500">Uploads, generated media and campaign-ready exports.</p>
        </div>
        <Button type="button" className="rounded-xl bg-stone-900 text-white hover:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-violet-400">
          <Upload className="mr-1.5 size-4" />
          Upload
        </Button>
      </div>

      {/* Search and filter */}
      <div className="mb-4 flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-400" />
          <Input className="rounded-xl border-stone-200 pl-9 text-stone-800" placeholder="Search media..." />
        </div>
      </div>

      <div className="mb-5 flex gap-2 overflow-x-auto">
        {CATEGORIES.map((category) => (
          <button
            key={category}
            type="button"
            className="shrink-0 rounded-xl border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-100 focus:outline-none focus:ring-2 focus:ring-violet-400 transition"
          >
            {category}
          </button>
        ))}
      </div>

      {assets.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {assets.slice(0, 12).map((asset) => (
            <article key={asset.id} className="rounded-2xl border border-stone-200 bg-stone-50 p-3 shadow-sm">
              <div className="aspect-video rounded-xl border border-stone-200 bg-gradient-to-br from-stone-100 to-stone-200" />
              <p className="mt-3 text-sm font-semibold text-stone-800">{String(asset.metadata?.title || asset.outputs?.title || "Generated asset")}</p>
              <p className="mt-0.5 text-xs text-stone-500">Status: {asset.state || "ready for review"}</p>
              <div className="mt-3 flex gap-2">
                <Button type="button" size="sm" variant="outline" className="rounded-lg border-stone-200 px-3 text-xs text-stone-600">Use in campaign</Button>
                <Button type="button" size="sm" variant="outline" className="rounded-lg border-stone-200 px-3 text-xs text-stone-600">Download</Button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50 p-10 text-center">
          <Upload className="mx-auto mb-3 size-8 text-stone-300" />
          <p className="font-semibold text-stone-700">Your media library is empty</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-stone-400">
            Upload brand assets, or use the Create tab to generate AI media. Text and campaign content are ready now.
          </p>
          <Button type="button" className="mt-4 rounded-xl bg-stone-900 text-white hover:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-violet-400">
            Upload your first asset
          </Button>
        </div>
      )}
    </section>
  );
}
