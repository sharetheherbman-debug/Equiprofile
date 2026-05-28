import { useEffect, useMemo, useState } from "react";
import { Loader2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { QualityMode } from "@/components/marketing/studio/types";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const MARKETING_APP_PROVIDERS = [
  { id: "genx", key: "genx_api_key", label: "GenX", placeholder: "GenX API key", description: "Primary video generation provider" },
  { id: "qwen", key: "qwen_api_key", label: "Qwen", placeholder: "Qwen API key", description: "Fallback copy + media routing support" },
  { id: "huggingface", key: "huggingface_api_key", label: "Hugging Face", placeholder: "Hugging Face API key", description: "Task-model fallback provider" },
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
  const utils = trpc.useUtils();
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [testResults, setTestResults] = useState<Record<string, { state: "ok" | "fail" | "testing"; message?: string }>>({});

  const providerSettingsQuery = trpc.admin.listAIProviderSettings.useQuery(undefined, { enabled: open });
  const diagnosticsQuery = trpc.admin.getAIDiagnostics.useQuery(undefined, { enabled: open, refetchInterval: 30_000 });
  const saveProviderSettings = trpc.admin.saveAIProviderSettings.useMutation({
    onSuccess: () => {
      toast.success("Provider settings saved");
      utils.admin.listAIProviderSettings.invalidate();
      utils.admin.getAIDiagnostics.invalidate();
    },
    onError: (error) => toast.error("Could not save provider settings", { description: error.message }),
  });
  const testProviderConnection = trpc.admin.testAIProviderConnection.useMutation({
    onError: (error) => toast.error("Provider test failed", { description: error.message }),
  });

  useEffect(() => {
    if (!providerSettingsQuery.data) return;
    const next: Record<string, string> = {};
    for (const provider of MARKETING_APP_PROVIDERS) {
      const payload = (providerSettingsQuery.data as any)?.[provider.id];
      next[provider.id] = payload?.keyMasked ?? "";
    }
    setKeys(next);
  }, [providerSettingsQuery.data]);

  const providerHealthById = useMemo(() => {
    const rows = ((diagnosticsQuery.data as any)?.providerHealth ?? []) as any[];
    return new Map(rows.map((row) => [String(row.provider), row]));
  }, [diagnosticsQuery.data]);

  function runProviderConnectionTest(providerId: "genx" | "huggingface" | "qwen") {
    setTestResults((prev) => ({ ...prev, [providerId]: { state: "testing" } }));
    testProviderConnection.mutate(
      { provider: providerId },
      {
        onSuccess: (result: any) => {
          const ok = result?.status === "success" || result?.configured === true || result?.status === "key_present";
          setTestResults((prev) => ({
            ...prev,
            [providerId]: {
              state: ok ? "ok" : "fail",
              message: result?.message ?? (ok ? "Provider is reachable." : "Provider is not ready."),
            },
          }));
        },
      },
    );
  }

  function saveSettings() {
    const settings: Record<string, string> = {};
    for (const provider of MARKETING_APP_PROVIDERS) {
      const raw = keys[provider.id]?.trim();
      if (raw) settings[provider.key] = raw;
    }
    if (!Object.keys(settings).length) {
      toast.error("No provider keys to save");
      return;
    }
    saveProviderSettings.mutate({ settings });
  }

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent className="w-full overflow-y-auto border-stone-200 bg-white sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle className="text-stone-900">The Marketing App Settings</SheetTitle>
          <SheetDescription className="text-stone-500">
            Provider keys here are separate from dashboard chat keys and only affect The Marketing App generation path.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 px-4 pb-6 pt-4">
          <section className="space-y-3 rounded-2xl border border-stone-200 bg-stone-50 p-4">
            <h2 className="text-sm font-semibold text-stone-800">Standard / Elite routing mode</h2>
            <p className="text-xs text-stone-500">
              Standard prioritizes efficient providers; Elite prioritizes highest-quality routes.
            </p>
            <div className="flex w-fit rounded-xl border border-stone-200 bg-white p-0.5" role="group">
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

          <section className="space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-stone-800">Provider keys</h2>
              <p className="mt-1 text-xs text-stone-500">
                Configure the providers used by The Marketing App. Save persists keys to admin provider settings.
              </p>
            </div>

            {MARKETING_APP_PROVIDERS.map((provider) => (
              <div key={provider.id} className="space-y-3 rounded-2xl border border-stone-200 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-stone-800">{provider.label}</p>
                    <p className="text-xs text-stone-500">{provider.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {testResults[provider.id]?.state === "ok" ? (
                      <Badge className="rounded-full border border-emerald-200 bg-emerald-50 px-2 text-xs text-emerald-700">Connected</Badge>
                    ) : testResults[provider.id]?.state === "fail" ? (
                      <Badge className="rounded-full border border-red-200 bg-red-50 px-2 text-xs text-red-700">Failed</Badge>
                    ) : testResults[provider.id]?.state === "testing" ? (
                      <Badge className="rounded-full border border-stone-200 bg-stone-100 px-2 text-xs text-stone-600">Testing…</Badge>
                    ) : providerHealthById.get(provider.id)?.liveReady ? (
                      <Badge className="rounded-full border border-emerald-200 bg-emerald-50 px-2 text-xs text-emerald-700">Live</Badge>
                    ) : providerHealthById.get(provider.id)?.configured ? (
                      <Badge className="rounded-full border border-amber-200 bg-amber-50 px-2 text-xs text-amber-700">Configured</Badge>
                    ) : null}
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="rounded-xl border-stone-200 text-xs"
                      disabled={testProviderConnection.isPending}
                      onClick={() => runProviderConnectionTest(provider.id as "genx" | "huggingface" | "qwen")}
                    >
                      {testProviderConnection.isPending ? <Loader2 className="mr-1 size-3 animate-spin" /> : null}
                      Test
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
                <p className="text-[11px] text-stone-500">
                  {testResults[provider.id]?.message ??
                    (providerHealthById.get(provider.id)?.routeReason as string | undefined) ??
                    "Not tested yet."}
                </p>
              </div>
            ))}

            <Button
              type="button"
              className="w-full rounded-xl bg-stone-900 text-white hover:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-violet-400"
              disabled={saveProviderSettings.isPending}
              onClick={saveSettings}
            >
              {saveProviderSettings.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Save provider settings
            </Button>
          </section>

          <section className="space-y-2 rounded-2xl border border-stone-200 bg-stone-50 p-4">
            <h2 className="text-sm font-semibold text-stone-800">Social publishing</h2>
            <p className="text-xs text-stone-500">
              Connection flow required before direct publishing to Facebook, Instagram, TikTok, LinkedIn, and YouTube.
              Content is available as export_only until a platform connection is set up.
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs text-stone-500">
                not_connected
              </Badge>
              <Badge className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs text-amber-700">
                export_only — setup_needed
              </Badge>
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-stone-800">Provider health</h2>
            <div className="flex flex-wrap gap-2">
              {MARKETING_APP_PROVIDERS.map((provider) => (
                <Badge
                  key={provider.id}
                  className={`rounded-full border px-3 py-1 text-xs ${
                    providerHealthById.get(provider.id)?.liveReady
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : providerHealthById.get(provider.id)?.configured
                        ? "border-amber-200 bg-amber-50 text-amber-700"
                        : "border-stone-200 bg-stone-50 text-stone-500"
                  }`}
                >
                  {provider.label}: {providerHealthById.get(provider.id)?.liveReady ? "live" : providerHealthById.get(provider.id)?.configured ? "configured" : "missing"}
                </Badge>
              ))}
            </div>
          </section>

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
                    {JSON.stringify((diagnosticsQuery.data as any)?.readiness ?? {}, null, 2)}
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
