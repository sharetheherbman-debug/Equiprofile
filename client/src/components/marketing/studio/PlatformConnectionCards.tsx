import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SUPPORTED_PLATFORMS } from "./types";

export function PlatformConnectionCards() {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {SUPPORTED_PLATFORMS.map((platform) => (
        <article key={platform.id} className="rounded-3xl border border-white/10 bg-white/[0.06] p-4 text-white">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold">{platform.label}</h3>
              <p className="mt-1 text-xs text-slate-300">{platform.contentSupport}</p>
            </div>
            <Badge className="border-white/10 bg-white/10 text-white">Needs connection</Badge>
          </div>
          <div className="mt-4 space-y-2 text-xs text-slate-300">
            <p><span className="text-slate-100">Publishing readiness:</span> {platform.publishSupport}</p>
            <p><span className="text-slate-100">Analytics:</span> {platform.analyticsSupport}</p>
            {platform.adsSupport ? <p><span className="text-slate-100">Ads:</span> {platform.adsSupport}</p> : null}
          </div>
          <Button type="button" variant="outline" className="mt-4 w-full rounded-full border-white/10 bg-white/10 text-white hover:bg-white/15">
            Connect channel
          </Button>
        </article>
      ))}
    </div>
  );
}
