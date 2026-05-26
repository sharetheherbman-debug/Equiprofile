import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SUPPORTED_PLATFORMS } from "./types";

export function PlatformConnectionCards() {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {SUPPORTED_PLATFORMS.map((platform) => (
        <article key={platform.id} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold text-stone-800">{platform.label}</h3>
              <p className="mt-1 text-xs text-stone-500">{platform.contentSupport}</p>
            </div>
            <Badge className="rounded-full bg-stone-100 text-xs text-stone-500">Not connected</Badge>
          </div>
          <div className="mt-3 space-y-1 text-xs text-stone-500">
            <p><span className="font-medium text-stone-700">Publishing:</span> {platform.publishSupport}</p>
            <p><span className="font-medium text-stone-700">Analytics:</span> {platform.analyticsSupport}</p>
            {platform.adsSupport ? <p><span className="font-medium text-stone-700">Ads:</span> {platform.adsSupport}</p> : null}
          </div>
          <Button type="button" className="mt-4 w-full rounded-xl bg-stone-900 text-white hover:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-violet-400">
            Connect channel
          </Button>
        </article>
      ))}
    </div>
  );
}
