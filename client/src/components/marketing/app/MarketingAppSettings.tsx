import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";

export const PROVIDER_FIELDS = [
  { id: "genx", key: "marketing_genx_api_key", label: "Marketing GenX", group: "Provider Keys", canTest: true },
  { id: "qwen", key: "marketing_qwen_api_key", label: "Marketing Qwen", group: "Provider Keys", canTest: true },
  { id: "huggingface", key: "marketing_huggingface_api_key", label: "Marketing Hugging Face", group: "Provider Keys", canTest: true },
  { id: "pexels", key: "marketing_pexels_api_key", label: "Pexels", group: "Stock Media", canTest: false },
  { id: "pixabay", key: "marketing_pixabay_api_key", label: "Pixabay", group: "Stock Media", canTest: false },
] as const;

type SocialConnection = { platform: string; status: string; accountName?: string | null };

function socialStatusLabel(status: string): string {
  if (status === "ready_for_approval_posting") return "Connected";
  if (status === "setup_needed") return "Needs setup";
  return "Export manually";
}

export function normalizeSocialConnections(value: unknown): SocialConnection[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => ({
      platform: typeof item.platform === "string" ? item.platform : "Unknown",
      status: typeof item.status === "string" ? item.status : "not_connected",
      accountName: typeof item.accountName === "string" ? item.accountName : null,
    }));
}

function obfuscateSecret(value: string): string {
  if (!value) return "";
  if (value.length <= 4) return "••••";
  return `${value.slice(0, 2)}••••${value.slice(-2)}`;
}

export function MarketingAppSettings({
  quality,
  onQualityChange,
  tenantId,
  workspaceId,
}: {
  quality: "standard" | "elite";
  onQualityChange: (value: "standard" | "elite") => void;
  tenantId: string;
  workspaceId: string;
}) {
  const utils = trpc.useUtils();
  const providerSettingsQuery = trpc.admin.listAIProviderSettings.useQuery();
  const diagnosticsQuery = trpc.admin.getAIDiagnostics.useQuery(undefined, { refetchInterval: 30_000 });
  const socialConnectionsQuery = trpc.admin.listMarketingSocialConnections.useQuery({ tenantId, workspaceId });
  const saveProviderSettings = trpc.admin.saveAIProviderSettings.useMutation({
    onSuccess: async () => {
      toast.success("Marketing settings saved");
      await utils.admin.listAIProviderSettings.invalidate();
      await utils.admin.getAIDiagnostics.invalidate();
    },
    onError: (error) => toast.error("Could not save settings", { description: error.message }),
  });
  const testProviderConnection = trpc.admin.testAIProviderConnection.useMutation({
    onError: (error) => toast.error("Connection test failed", { description: error.message }),
  });

  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    const rows = ((providerSettingsQuery.data as Array<{ key: string; value?: string | null }> | undefined) ?? []).reduce<Record<string, string>>(
      (accumulator, row) => {
        accumulator[row.key] = row.value ?? "";
        return accumulator;
      },
      {},
    );
    setValues(rows);
  }, [providerSettingsQuery.data]);

  const groupedFields = useMemo(() => {
    return PROVIDER_FIELDS.reduce<Record<string, Array<(typeof PROVIDER_FIELDS)[number]>>>((accumulator, field) => {
      const current = accumulator[field.group] ?? [];
      accumulator[field.group] = [...current, field];
      return accumulator;
    }, {});
  }, []);

  const providerHealth = (((diagnosticsQuery.data as { providerHealth?: Array<{ provider: string; liveReady?: boolean }> } | undefined)?.providerHealth) ?? []);
  const socialConnections = useMemo(
    () => normalizeSocialConnections(socialConnectionsQuery.data),
    [socialConnectionsQuery.data],
  );

  function saveSettings() {
    saveProviderSettings.mutate({
      settings: values,
    });
  }

  function runConnectionTest(providerId: "genx" | "qwen" | "huggingface") {
    testProviderConnection.mutate(
      { provider: providerId },
      {
        onSuccess: (result) => {
          const response = result as { liveReady?: boolean; message?: string; catalogueCount?: number; selectedModels?: string[] };
          const ready = Boolean(response.liveReady ?? response.selectedModels?.length ?? response.catalogueCount);
          toast[ready ? "success" : "error"](ready ? "Connection ready" : "Connection not ready", {
            description: response.message ?? "Check your provider configuration.",
          });
        },
      },
    );
  }

  return (
    <section className="space-y-4" aria-label="Settings">
      <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-stone-900">Settings</h2>
          <p className="text-sm text-stone-500">Quiet, marketing-only configuration for The Marketing App. Dashboard AI settings stay separate.</p>
          </div>
          <Button type="button" className="rounded-2xl" onClick={saveSettings} disabled={saveProviderSettings.isPending}>
            {saveProviderSettings.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Save settings
          </Button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-stone-900">Generation mode</h3>
          <div className="mt-4 inline-flex rounded-2xl border border-stone-200 bg-stone-50 p-1">
            {(["standard", "elite"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => onQualityChange(mode)}
                className={`rounded-2xl px-4 py-2 text-sm font-medium ${quality === mode ? "bg-stone-900 text-white" : "text-stone-600"}`}
              >
                {mode === "standard" ? "Standard" : "Elite"}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-stone-900">Social Connections</h3>
          <p className="mt-2 text-xs text-stone-500">Connection flow required before direct publishing.</p>
          <div className="mt-4 space-y-3">
            {socialConnectionsQuery.isLoading ? (
              <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-xs text-stone-500">
                Loading social connection status…
              </div>
            ) : null}
            {socialConnectionsQuery.isError ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-xs text-amber-800">Could not load social connections right now.</p>
                <Button type="button" variant="outline" size="sm" className="mt-2 rounded-full" onClick={() => void socialConnectionsQuery.refetch()}>
                  Retry
                </Button>
              </div>
            ) : null}
            {!socialConnectionsQuery.isLoading && !socialConnectionsQuery.isError && socialConnections.length === 0 ? (
              <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-xs text-stone-500">
                No social connections yet. Export manually while connector setup is pending.
              </div>
            ) : null}
            {socialConnections.map((connection) => (
              <div key={connection.platform} className="flex items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-stone-900">{connection.platform}</p>
                  <p className="text-xs text-stone-500">{connection.accountName ? `Connected as ${connection.accountName}` : "Export manually"}</p>
                </div>
                <Badge className="rounded-full border border-stone-200 bg-white px-3 py-1 text-xs text-stone-600">
                  {socialStatusLabel(connection.status)}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </div>

      {Object.entries(groupedFields).map(([group, fields]) => (
        <div key={group} className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-stone-900">{group}</h3>
            {group === "Provider Keys" ? (
              <p className="text-xs text-stone-500">Only Marketing App providers live here.</p>
            ) : null}
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {fields.map((field) => {
              const health = providerHealth.find((entry) => entry.provider === field.id);
              return (
                <div key={field.key} className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-stone-900">{field.label}</p>
                      <p className="text-xs text-stone-500">{field.canTest ? "Connection test available" : "Stored for asset sourcing"}</p>
                    </div>
                    <Badge className="rounded-full border border-stone-200 bg-white px-2 py-0.5 text-xs text-stone-600">
                      {health?.liveReady ? "ready" : "setup_needed"}
                    </Badge>
                  </div>

                  <Input
                    value={values[field.key] ?? ""}
                    onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))}
                    placeholder={field.label}
                    type="password"
                    className="mt-3"
                  />
                  <p className="mt-2 text-xs text-stone-500">
                    Saved value: {values[field.key] ? obfuscateSecret(values[field.key]) : "Not set"}
                  </p>

                  {field.canTest ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-3 rounded-full"
                      onClick={() => runConnectionTest(field.id as "genx" | "qwen" | "huggingface")}
                      disabled={testProviderConnection.isPending}
                    >
                      {testProviderConnection.isPending ? <Loader2 className="mr-2 size-3 animate-spin" /> : null}
                      Test connection
                    </Button>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
        <button
          type="button"
          className="flex w-full items-center justify-between text-left"
          onClick={() => setShowDiagnostics((current) => !current)}
        >
          <div>
            <h3 className="text-sm font-semibold text-stone-900">Developer Diagnostics</h3>
            <p className="text-xs text-stone-500">Collapsed by default.</p>
          </div>
          <ChevronDown className={`size-4 transition ${showDiagnostics ? "rotate-180" : ""}`} />
        </button>

        {showDiagnostics ? (
          <pre className="mt-4 overflow-x-auto rounded-2xl bg-stone-950 p-4 text-xs text-stone-100">
            {JSON.stringify(diagnosticsQuery.data ?? {}, null, 2)}
          </pre>
        ) : null}
      </div>
    </section>
  );
}
