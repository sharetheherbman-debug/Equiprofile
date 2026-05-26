import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { PlatformConnectionCards } from "./PlatformConnectionCards";
import { PresenterSelector } from "./PresenterSelector";
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
      <SheetContent className="w-full overflow-y-auto border-white/10 bg-slate-950 text-white sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle className="text-white">{title}</SheetTitle>
          <SheetDescription className="text-slate-300">Setup lives in drawers so the main Studio stays focused on creative output.</SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-6">
          {openKind === "brand" ? (
            <div className="space-y-4">
              {["Website scan", "Logo upload", "Brand voice", "Audience", "CTA", "Colours", "Prohibited claims"].map((label) => (
                <label key={label} className="block">
                  <span className="mb-2 block text-sm font-medium">{label}</span>
                  <Input className="border-white/10 bg-white/10 text-white placeholder:text-slate-400" placeholder={`Add ${label.toLowerCase()}`} />
                </label>
              ))}
            </div>
          ) : null}
          {openKind === "audience" ? (
            <div className="space-y-4">
              {["Contact list", "Segments", "Import CSV", "Tags", "Suppression list link"].map((item) => (
                <div key={item} className="rounded-3xl border border-white/10 bg-white/[0.06] p-4">
                  <p className="font-semibold">{item}</p>
                  <p className="mt-1 text-sm text-slate-300">Managed through the existing marketing contacts and suppression system.</p>
                </div>
              ))}
            </div>
          ) : null}
          {openKind === "platforms" ? <PlatformConnectionCards /> : null}
          {openKind === "presenter" ? <PresenterSelector /> : null}
          {openKind === "providers" ? (
            <div className="space-y-4">
              <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-4">
                <p className="font-semibold">AI generation mode</p>
                <div className="mt-3 flex gap-2">
                  {(["standard", "elite"] as const).map((mode) => (
                    <Button key={mode} type="button" size="sm" className={`rounded-full capitalize ${quality === mode ? "bg-emerald-300 text-slate-950" : "bg-white/10 text-white hover:bg-white/15"}`} onClick={() => onQualityChange(mode)}>
                      {mode}
                    </Button>
                  ))}
                </div>
              </div>
              {["GenX connected", "Media generation connected / needs setup"].map((status) => (
                <div key={status} className="rounded-3xl border border-white/10 bg-white/[0.06] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold">{status}</p>
                    <Badge className="border-white/10 bg-white/10 text-white">Simple status</Badge>
                  </div>
                  <p className="mt-2 text-sm text-slate-300">Normal setup is key-first. Technical repair is available in Developer Diagnostics.</p>
                </div>
              ))}
              <Button type="button" variant="outline" className="rounded-full border-white/10 bg-white/10 text-white hover:bg-white/15" onClick={() => onOpenChange("diagnostics")}>
                Open Developer Diagnostics
              </Button>
            </div>
          ) : null}
          {openKind === "diagnostics" ? (
            <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-4">
              <button className="flex w-full items-center justify-between text-left" onClick={() => setShowDiagnostics((value) => !value)}>
                <span>
                  <span className="block font-semibold">Developer Diagnostics</span>
                  <span className="text-sm text-slate-300">Technical troubleshooting only. Hidden from normal Studio areas.</span>
                </span>
                <ChevronDown className={`size-4 transition ${showDiagnostics ? "rotate-180" : ""}`} />
              </button>
              {showDiagnostics ? (
                <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-slate-300">
                  <p>Provider internals and raw repair details should be checked here by technical staff only.</p>
                  <p className="mt-2">No debug content is shown in Create, Campaigns, Assets or Autopilot.</p>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
