import { Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type AssetRow = {
  id?: string;
  state?: string;
  updatedAt?: string;
  outputs?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

const CATEGORIES = ["All", "Images", "Videos", "Voice", "Avatar", "Scripts", "Thumbnails", "Uploads"];

export function AssetLibrary({ assets = [] }: { assets?: AssetRow[] }) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-4 text-white shadow-2xl" aria-label="Asset Library">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Assets</h2>
          <p className="text-sm text-slate-300">Media library for campaign-ready files, prompt-only concepts and uploads.</p>
        </div>
        <Button type="button" className="rounded-full bg-white text-slate-950 hover:bg-slate-100">
          <Upload className="size-4" />
          Upload asset
        </Button>
      </div>
      <div className="mb-5 flex gap-2 overflow-x-auto">
        {CATEGORIES.map((category) => <Badge key={category} className="shrink-0 rounded-full border-white/10 bg-white/10 px-3 py-2 text-white">{category}</Badge>)}
      </div>
      {assets.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {assets.slice(0, 12).map((asset) => (
            <article key={asset.id} className="rounded-3xl border border-white/10 bg-black/20 p-4">
              <div className="aspect-video rounded-2xl border border-white/10 bg-gradient-to-br from-slate-800 to-slate-950" />
              <p className="mt-3 text-sm font-semibold">{String(asset.metadata?.title || asset.outputs?.title || "Generated asset")}</p>
              <p className="mt-1 text-xs text-slate-300">Status: {asset.state || "ready for review"}</p>
              <div className="mt-3 flex gap-2">
                <Badge className="border-white/10 bg-white/10 text-white">Use in campaign</Badge>
                <Badge className="border-white/10 bg-white/10 text-white">Download</Badge>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-white/15 bg-black/20 p-8 text-center">
          <p className="text-lg font-semibold">Text and campaign generation are ready.</p>
          <p className="mx-auto mt-2 max-w-xl text-sm text-slate-300">Connect media generation when you want AI-created images, videos and voice. Prompt-only creative directions stay clearly separated from real playable media.</p>
        </div>
      )}
    </section>
  );
}
