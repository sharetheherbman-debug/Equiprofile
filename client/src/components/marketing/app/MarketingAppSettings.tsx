import { useState } from "react";
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { QualityMode } from "@/components/marketing/studio/types";

/**
 * The Marketing App provider keys are stored separately from the
 * EquiProfile dashboard AI key (OPENAI_API_KEY / global dashboard chat).
 * These keys power only The Marketing App generation pipeline.
 */
const MARKETING_APP_PROVIDERS = [
  { id: "genx", label: "GenX", placeholder: "GenX API key", description: "Premium video, script and strategy generation" },
  { id: "qwen", label: "Qwen", placeholder: "Qwen API key", description: "Efficient copywriting and campaign drafts (Standard mode)" },
  { id: "huggingface", label: "Hugging Face", placeholder: "Hugging Face API key", description: "Task-first image and text generation (Standard mode)" },
  { id: "pexels", label: "Pexels", placeholder: "Pexels API key", description: "Stock imagery for campaigns and posts" },
  { id: "pixabay", label: "Pixabay", placeholder: "Pixabay API key", description: "Additional stock media source" },
];

export function MarketingAppSettings({
  open,
  quality,
  onQualityChange,
  onClose,
}: {
  open: boolean;
  quality: QualityMode;
  onQualityChange: (value: QualityMode) => void;
  onClose: () => void;
}) {
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [testResults, setTestResults] = useState<Record<string, "ok" | "fail" | "testing">>({});

  function simulateTestConnection(providerId: string) {
    setTestResults((prev) => ({ ...prev, [providerId]: "testing" }));
    setTimeout(() => {
      setTestResults((prev) => ({
        ...prev,
        [providerId]: keys[providerId]?.trim() ? "ok" : "fail",
      }));
    }, 1200);
  }

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent className="w-full overflow-y-auto border-stone-200 bg-white sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle className="text-stone-900">The Marketing App — Settings</SheetTitle>
          <SheetDescription className="text-stone-500">
            Provider keys here are separate from EquiProfile dashboard AI keys.
            These keys power only The Marketing App generation pipeline.
          </SheetDescription>
        </SheetHeader>

        <div className="px-4 pb-6 space-y-6">
          {/* Standard / Elite routing mode */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-stone-800">Standard / Elite routing mode</h2>
            <p className="text-xs text-stone-500">
              Standard uses Qwen and Hugging Face first where capable; Elite uses the best available GenX models first.
            </p>
            <div className="flex rounded-xl border border-stone-200 bg-stone-50 p-0.5 w-fit" role="group">
              {(["standard", "elite"] as QualityMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={quality === mode}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-violet-400 ${
                    quality === mode ? "bg-stone-900 text-white shadow-sm" : "text-stone-600 hover:bg-stone-100"
                  }`}
                  onClick={() => onQualityChange(mode)}
                >
                  {mode === "elite" ? "Elite" : "Standard"}
                </button>
              ))}
            </div>
          </section>

          {/* Provider keys — The Marketing App only */}
          <section className="space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-stone-800">Provider keys — The Marketing App</h2>
              <p className="text-xs text-stone-500 mt-1">
                These are not the EquiProfile dashboard AI keys. Configure only the providers you want The Marketing App to use.
              </p>
            </div>

            {MARKETING_APP_PROVIDERS.map((provider) => (
              <div key={provider.id} className="rounded-2xl border border-stone-200 bg-stone-50 p-4 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-stone-800">{provider.label}</p>
                    <p className="text-xs text-stone-500">{provider.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {testResults[provider.id] === "ok" ? (
                      <Badge className="rounded-full border border-emerald-200 bg-emerald-50 px-2 text-xs text-emerald-700">Connected</Badge>
                    ) : testResults[provider.id] === "fail" ? (
                      <Badge className="rounded-full border border-red-200 bg-red-50 px-2 text-xs text-red-700">Failed</Badge>
                    ) : testResults[provider.id] === "testing" ? (
                      <Badge className="rounded-full border border-stone-200 bg-stone-100 px-2 text-xs text-stone-600">Testing…</Badge>
                    ) : null}
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="rounded-xl border-stone-200 text-xs"
                      onClick={() => simulateTestConnection(provider.id)}
                    >
                      Test connection
                    </Button>
                  </div>
                </div>
                <Input
                  type="password"
                  placeholder={provider.placeholder}
                  value={keys[provider.id] ?? ""}
                  onChange={(e) => setKeys((prev) => ({ ...prev, [provider.id]: e.target.value }))}
                  className="rounded-xl border-stone-200 bg-white text-stone-800 placeholder:text-stone-400"
                  aria-label={`${provider.label} API key`}
                />
              </div>
            ))}

            <Button type="button" className="w-full rounded-xl bg-stone-900 text-white hover:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-violet-400">
              Save provider settings
            </Button>
          </section>

          {/* Connection flow required before direct publishing */}
          <section className="rounded-2xl border border-stone-200 bg-stone-50 p-4 space-y-2">
            <h2 className="text-sm font-semibold text-stone-800">Social publishing</h2>
            <p className="text-xs text-stone-500">
              Connection flow required before direct publishing to Facebook, Instagram, TikTok, LinkedIn, and YouTube.
              Content is available as export_only until a platform connection is set up.
            </p>
            <Badge className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs text-amber-700">
              export_only — setup_needed
            </Badge>
          </section>

          {/* Provider health */}
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-stone-800">Provider health</h2>
            <div className="flex flex-wrap gap-2">
              {MARKETING_APP_PROVIDERS.map((provider) => (
                <Badge
                  key={provider.id}
                  className={`rounded-full border px-3 py-1 text-xs ${
                    testResults[provider.id] === "ok"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-stone-200 bg-stone-50 text-stone-500"
                  }`}
                >
                  {provider.label}: {testResults[provider.id] === "ok" ? "ok" : testResults[provider.id] === "fail" ? "error" : "unchecked"}
                </Badge>
              ))}
            </div>
          </section>

          {/* Developer Diagnostics — hidden by default */}
          <section className="space-y-3">
            <button
              type="button"
              className="flex items-center gap-2 text-xs text-stone-400 hover:text-stone-600 focus:outline-none"
              onClick={() => setShowDiagnostics((prev) => !prev)}
            >
              <Shield className="size-3" />
              {showDiagnostics ? "Hide" : "Show"} Developer Diagnostics
            </button>
            {showDiagnostics ? (
              <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 space-y-2">
                <p className="text-xs font-semibold text-stone-700">Developer Diagnostics</p>
                <p className="text-xs text-stone-500">
                  Advanced provider telemetry, route decisions and raw job metadata are available here.
                  This panel is hidden from normal users.
                </p>
                <div className="rounded-lg border border-stone-200 bg-white p-3">
                  <p className="text-xs text-stone-400 font-mono">
                    Standard / Elite routing mode active. Provider selection follows capability registry.
                    HF copywriting requires HF_TASK_COPYWRITING_MODEL env variable.
                  </p>
                </div>
              </div>
            ) : null}
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
