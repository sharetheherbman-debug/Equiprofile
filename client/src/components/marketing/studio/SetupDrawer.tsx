import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { PlatformConnectionCards } from "./PlatformConnectionCards";
import { PresenterLibrary } from "./PresenterLibrary";
import type { QualityMode, SetupDrawerKind } from "./types";

export function SetupDrawer({
  openKind,
  quality,
  onQualityChange,
  onOpenChange,
}: {
  openKind: SetupDrawerKind;
  quality: QualityMode;
  onQualityChange: (value: QualityMode) => void;
  onOpenChange: (kind: SetupDrawerKind) => void;
}) {
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const open = openKind !== null;
  const title = openKind === "brand" ? "Brand Setup" : openKind === "audience" ? "Audience Setup" : openKind === "platforms" ? "Platform Connections" : openKind === "providers" ? "Provider Settings" : openKind === "presenter" ? "Presenter Setup" : "Developer Diagnostics";

  return (
    <Sheet open={open} onOpenChange={(nextOpen) => !nextOpen && onOpenChange(null)}>
      <SheetContent className="w-full overflow-y-auto border-stone-200 bg-white sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle className="text-stone-900">{title}</SheetTitle>
          <SheetDescription className="text-stone-500">Setup lives in drawers so the main Studio stays focused on creative output.</SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-6">
          {openKind === "brand" ? (
            <div className="space-y-4">
              {["Website scan", "Logo upload", "Brand voice", "Audience", "CTA", "Colours", "Prohibited claims"].map((label) => (
                <label key={label} className="block">
                  <span className="mb-2 block text-sm font-medium text-stone-700">{label}</span>
                  <Input className="rounded-xl border-stone-200 bg-stone-50 text-stone-800 placeholder:text-stone-400" placeholder={`Add ${label.toLowerCase()}`} />
                </label>
              ))}
            </div>
          ) : null}
          {openKind === "audience" ? (
            <div className="space-y-4">
              {["Contact list", "Segments", "Import CSV", "Tags", "Suppression list link"].map((item) => (
                <div key={item} className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                  <p className="font-semibold text-stone-800">{item}</p>
                  <p className="mt-1 text-sm text-stone-500">Managed through the existing marketing contacts and suppression system.</p>
                </div>
              ))}
            </div>
          ) : null}
          {openKind === "platforms" ? <PlatformConnectionCards /> : null}
          {openKind === "presenter" ? <PresenterLibrary /> : null}
          {openKind === "providers" ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                <p className="font-semibold text-stone-800">Content quality</p>
                <div className="mt-3 flex gap-2">
                  {(["standard", "elite"] as const).map((mode) => (
                    <Button
                      key={mode}
                      type="button"
                      size="sm"
                      className={`rounded-xl capitalize focus:outline-none focus:ring-2 focus:ring-violet-400 ${quality === mode ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"}`}
                      onClick={() => onQualityChange(mode)}
                    >
                      {mode}
                    </Button>
                  ))}
                </div>
              </div>
              {["AI text connected", "Media generation coming soon"].map((status) => (
                <div key={status} className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-stone-800">{status}</p>
                    <Badge className="rounded-full bg-emerald-50 text-xs text-emerald-700">Active</Badge>
                  </div>
                  <p className="mt-2 text-sm text-stone-500">Technical details are available in developer diagnostics.</p>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                className="rounded-xl border-stone-200 text-stone-600 hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-violet-400"
                onClick={() => onOpenChange("diagnostics")}
              >
                Open developer diagnostics
              </Button>
            </div>
          ) : null}
          {openKind === "diagnostics" ? (
            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
              <button
                className="flex w-full items-center justify-between text-left focus:outline-none focus:ring-2 focus:ring-violet-400 rounded-xl"
                onClick={() => setShowDiagnostics((value) => !value)}
                aria-expanded={showDiagnostics}
              >
                <span>
                  <span className="block font-semibold text-stone-800">Developer Diagnostics</span>
                  <span className="text-sm text-stone-500">Technical troubleshooting only. Hidden from normal Studio areas.</span>
                </span>
                <ChevronDown className={`size-4 text-stone-400 transition ${showDiagnostics ? "rotate-180" : ""}`} />
              </button>
              {showDiagnostics ? (
                <div className="mt-4 rounded-xl border border-stone-200 bg-white p-4 text-sm text-stone-600">
                  <p>Provider internals and raw repair details are for technical staff only.</p>
                  <p className="mt-2">No debug content is shown in Setup, Create, Campaigns, Media or Autopilot.</p>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
