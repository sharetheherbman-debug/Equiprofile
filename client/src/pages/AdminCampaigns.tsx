import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  CalendarDays,
  CheckCircle2,
  Download,
  Image,
  Loader2,
  Megaphone,
  Settings,
  ShieldBan,
  Sparkles,
  Users,
  Film,
  Wand2,
  Building2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

const WORKFLOW_TABS = ["create", "drafts", "calendar", "assets", "audience", "suppression", "brand", "settings"] as const;
type WorkflowTab = (typeof WORKFLOW_TABS)[number];

const PLATFORM_OPTIONS = ["Facebook", "Instagram", "TikTok", "YouTube", "LinkedIn", "Google Business", "Email"] as const;
const FORMAT_OPTIONS = ["post", "reel", "short", "email", "carousel", "image", "video", "avatar video"] as const;
const GOAL_OPTIONS = ["signups", "stable owners", "schools", "academy", "retention", "announcement"] as const;
const TONE_OPTIONS = ["professional", "friendly", "premium", "educational", "urgent", "warm"] as const;

type DraftPayload = {
  id: string;
  strategy?: string;
  title?: string;
  hook?: string;
  script?: string;
  shotList?: unknown;
  caption?: string;
  cta?: string;
  hashtags?: unknown;
  imagePrompt?: string;
  videoPrompt?: string;
  avatarScript?: string;
  complianceNotes?: string;
  growthScore?: { overallScore?: number } & Record<string, unknown>;
  mediaStatus?: string;
};

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-dashed bg-muted/30 p-8 text-center">
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

function StatusChip({ label, ok, missingLabel }: { label: string; ok: boolean; missingLabel?: string }) {
  return (
    <Badge variant={ok ? "default" : "secondary"} className="px-2.5 py-1">
      {ok ? `${label} ready` : `${label} ${missingLabel ?? "missing"}`}
    </Badge>
  );
}

function serializeField(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.join("\n");
  if (!value) return "";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function MarketingCreateTab() {
  const utils = trpc.useUtils();
  const [form, setForm] = useState({
    prompt: "",
    platform: "Facebook" as (typeof PLATFORM_OPTIONS)[number],
    format: "reel" as (typeof FORMAT_OPTIONS)[number],
    durationSeconds: "30",
    goal: "signups" as (typeof GOAL_OPTIONS)[number],
    tone: "professional" as (typeof TONE_OPTIONS)[number],
  });
  const [draft, setDraft] = useState<DraftPayload | null>(null);
  const [scheduleAt, setScheduleAt] = useState("");
  const mediaAssets = trpc.admin.listMediaAssets.useQuery();

  const createDraft = trpc.admin.createMarketingDraft.useMutation({
    onSuccess: (data) => {
      if (data.status === "provider_missing" || data.status === "provider_unavailable") {
        toast.error("AI provider unavailable", { description: "AI provider unavailable. Check provider settings." });
        setDraft(null);
        return;
      }
      setDraft(data.draft as DraftPayload);
      toast.success("Draft created");
      utils.admin.listMarketingDrafts.invalidate();
    },
    onError: () => toast.error("AI provider unavailable", { description: "AI provider unavailable. Check provider settings." }),
  });

  const updateDraft = trpc.admin.updateMarketingDraft.useMutation({
    onSuccess: (data) => {
      setDraft(data.draft as DraftPayload);
      toast.success("Draft updated");
      utils.admin.listMarketingDrafts.invalidate();
    },
  });

  const sendToApproval = trpc.admin.sendMarketingDraftToApproval.useMutation({
    onSuccess: () => {
      toast.success("Sent to approval");
      utils.admin.listMarketingDrafts.invalidate();
    },
  });

  const approveDraft = trpc.admin.approveMarketingDraft.useMutation({
    onSuccess: () => toast.success("Approved"),
  });

  const scheduleDraft = trpc.admin.scheduleMarketingDraft.useMutation({
    onSuccess: () => {
      toast.success("Scheduled");
      utils.admin.listMarketingCalendar.invalidate();
    },
  });

  const createMediaJob = trpc.admin.createMediaJob.useMutation({
    onSuccess: () => {
      toast.success("Media generation queued");
      utils.admin.listMediaAssets.invalidate();
      utils.admin.listMarketingAssets.invalidate();
    },
    onError: (error) => toast.error("Media generation unavailable", { description: error.message }),
  });

  const currentDraftAssets = (mediaAssets.data ?? []).filter((asset: any) => asset.draftId === draft?.id);
  const canUseDuration = ["video", "short", "reel", "avatar video"].includes(form.format);

  return (
    <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Create</CardTitle>
          <CardDescription>Type one command and generate assistant-ready campaign output.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Command</Label>
            <Textarea
              rows={5}
              placeholder="Create a 30-second Facebook reel for UK stable owners."
              value={form.prompt}
              onChange={(e) => setForm((prev) => ({ ...prev, prompt: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">Examples: “Write a LinkedIn post for riding schools.” · “Create a launch email for stable managers.”</p>
          </div>

          <details className="rounded-md border p-3">
            <summary className="cursor-pointer text-sm font-medium">Advanced options</summary>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Platform</Label>
                <select
                  value={form.platform}
                  onChange={(e) => setForm((prev) => ({ ...prev, platform: e.target.value as typeof prev.platform }))}
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                >
                  {PLATFORM_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Format</Label>
                <select
                  value={form.format}
                  onChange={(e) => setForm((prev) => ({ ...prev, format: e.target.value as typeof prev.format }))}
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                >
                  {FORMAT_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Goal</Label>
                <select
                  value={form.goal}
                  onChange={(e) => setForm((prev) => ({ ...prev, goal: e.target.value as typeof prev.goal }))}
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                >
                  {GOAL_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Tone</Label>
                <select
                  value={form.tone}
                  onChange={(e) => setForm((prev) => ({ ...prev, tone: e.target.value as typeof prev.tone }))}
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                >
                  {TONE_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Duration (seconds)</Label>
                <Input disabled={!canUseDuration} value={form.durationSeconds} onChange={(e) => setForm((prev) => ({ ...prev, durationSeconds: e.target.value }))} />
              </div>
            </div>
          </details>

          <Button
            className="w-full sm:w-auto"
            disabled={createDraft.isPending || form.prompt.trim().length < 10}
            onClick={() => createDraft.mutate({
              prompt: form.prompt,
              platform: form.platform,
              format: form.format,
              durationSeconds: canUseDuration ? Number(form.durationSeconds || 0) || null : null,
              goal: form.goal,
              tone: form.tone,
            })}
          >
            {createDraft.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Generate
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Assistant response</CardTitle>
          <CardDescription>Preview and next actions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!draft ? (
            <EmptyState title="No draft yet" body="Generate a command to receive strategy, script, CTA and media plans." />
          ) : (
            <>
              <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
                {[
                  ["Strategy", draft.strategy || draft.title],
                  ["Hook", draft.hook],
                  ["Script / Body", draft.script],
                  ["Caption", draft.caption],
                  ["CTA", draft.cta],
                  ["Hashtags", serializeField(draft.hashtags)],
                  ["Visual Plan", draft.imagePrompt],
                  ["Media Plan", draft.videoPrompt],
                  ["Avatar Script", draft.avatarScript],
                  ["Compliance Notes", draft.complianceNotes],
                ].map(([label, value]) => (
                  <div key={label as string} className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">{label}</p>
                    <p className="text-sm whitespace-pre-wrap">{String(value || "-")}</p>
                  </div>
                ))}
                <div className="flex items-center justify-between rounded border bg-background p-2">
                  <p className="text-sm font-medium">Growth Score</p>
                  <Badge>{String((draft.growthScore as any)?.overallScore ?? "-")}/100</Badge>
                </div>
                {draft.mediaStatus ? <p className="text-xs text-muted-foreground">{draft.mediaStatus}</p> : null}
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => updateDraft.mutate({ id: draft.id, fields: draft as any })}>Edit</Button>
                  <Button variant="outline" size="sm" onClick={() => createDraft.mutate({ prompt: form.prompt, platform: form.platform, format: form.format, durationSeconds: canUseDuration ? Number(form.durationSeconds || 0) || null : null, goal: form.goal, tone: form.tone })}>Regenerate</Button>
                  <Button variant="outline" size="sm" onClick={() => createMediaJob.mutate({ task: "text_to_image", prompt: String(draft.imagePrompt || draft.caption || form.prompt), draftId: draft.id })}>Generate Image</Button>
                  <Button variant="outline" size="sm" onClick={() => createMediaJob.mutate({ task: "text_to_video", prompt: String(draft.videoPrompt || draft.script || form.prompt), draftId: draft.id })}>Generate Video</Button>
                  <Button variant="outline" size="sm" onClick={() => createMediaJob.mutate({ task: "avatar_video", prompt: String(draft.avatarScript || draft.script || form.prompt), draftId: draft.id })}>Generate Avatar</Button>
                  <Button size="sm" onClick={() => sendToApproval.mutate({ id: draft.id })}>Send to Approval</Button>
                  <Button size="sm" variant="secondary" onClick={() => approveDraft.mutate({ id: draft.id })}>Approve</Button>
                </div>
                <div className="flex gap-2">
                  <Input type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} className="h-9" />
                  <Button size="sm" variant="secondary" disabled={!scheduleAt} onClick={() => scheduleDraft.mutate({ id: draft.id, scheduleAt: new Date(scheduleAt).toISOString() })}>Schedule</Button>
                </div>
              </div>

              {currentDraftAssets.length > 0 && (
                <div className="space-y-2 rounded-lg border p-3">
                  <p className="text-xs font-medium">Live preview</p>
                  {currentDraftAssets.slice(0, 2).map((asset: any) => (
                    <div key={asset.id}>
                      {asset.publicUrl && asset.type === "image" ? <img src={asset.publicUrl} alt="Asset preview" className="max-h-[160px] w-full rounded object-cover" /> : null}
                      {asset.publicUrl && (asset.type === "video" || asset.type === "avatar") ? <video src={asset.publicUrl} controls className="max-h-[160px] w-full rounded" /> : null}
                      {!asset.publicUrl ? <p className="text-xs text-muted-foreground">{asset.errorMessage || "Prompt-only/pending output"}</p> : null}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DraftsTab() {
  const drafts = trpc.admin.listMarketingDrafts.useQuery();
  return (
    <Card>
      <CardHeader><CardTitle>Drafts</CardTitle></CardHeader>
      <CardContent>
        {drafts.isLoading ? <Skeleton className="h-32 w-full" /> : !drafts.data?.length ? <EmptyState title="No drafts" body="Generated drafts appear here." /> : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Platform</TableHead><TableHead>Format</TableHead><TableHead>Updated</TableHead></TableRow></TableHeader>
              <TableBody>
                {drafts.data.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.output?.title || "Untitled"}</TableCell>
                    <TableCell>{item.payload?.platform || "-"}</TableCell>
                    <TableCell>{item.payload?.format || "-"}</TableCell>
                    <TableCell>{new Date(item.updatedAt).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CalendarTab() {
  const calendar = trpc.admin.listMarketingCalendar.useQuery();
  return (
    <Card>
      <CardHeader><CardTitle>Calendar</CardTitle></CardHeader>
      <CardContent>
        {calendar.isLoading ? <Skeleton className="h-32 w-full" /> : !calendar.data?.length ? <EmptyState title="No scheduled drafts" body="Approved and scheduled drafts appear here." /> : (
          <div className="space-y-3">
            {calendar.data.map((item: any) => (
              <div key={item.id} className="rounded-lg border p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{item.output?.title || "Scheduled draft"}</p>
                  <p className="text-xs text-muted-foreground">{item.scheduleAt ? new Date(item.scheduleAt).toLocaleString() : "No schedule"}</p>
                </div>
                <Badge>Scheduled</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AssetsTab() {
  const assets = trpc.admin.listMediaAssets.useQuery();
  const createMediaJob = trpc.admin.createMediaJob.useMutation({
    onSuccess: () => toast.success("Media job queued"),
    onError: (error) => toast.error("Media generation unavailable", { description: error.message }),
  });
  const [prompt, setPrompt] = useState("Create a premium image concept for EquiProfile marketing.");

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Assets</CardTitle>
          <CardDescription>Show playable media when available, otherwise show prompt-only or failed truthfully.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea rows={3} value={prompt} onChange={(e) => setPrompt(e.target.value)} />
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => createMediaJob.mutate({ task: "text_to_image", prompt })}>Generate Image</Button>
            <Button variant="outline" onClick={() => createMediaJob.mutate({ task: "text_to_video", prompt })}>Generate Video</Button>
            <Button variant="outline" onClick={() => createMediaJob.mutate({ task: "avatar_video", prompt })}>Generate Avatar</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Generated Assets</CardTitle></CardHeader>
        <CardContent>
          {!assets.data?.length ? <EmptyState title="No assets" body="Generated assets appear here." /> : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {assets.data.map((asset: any) => (
                <div key={asset.id} className="rounded-lg border overflow-hidden">
                  <div className="bg-muted/30 flex items-center justify-center min-h-[120px]">
                    {asset.publicUrl && asset.type === "image" ? <img src={asset.publicUrl} alt="Generated" className="max-h-[180px] w-full object-cover" /> : null}
                    {asset.publicUrl && (asset.type === "video" || asset.type === "avatar") ? <video src={asset.publicUrl} controls className="max-h-[180px] w-full" /> : null}
                    {!asset.publicUrl && asset.status === "completed" ? <p className="text-xs text-muted-foreground p-4">Prompt-only output: playable provider/model not available.</p> : null}
                    {!asset.publicUrl && asset.status === "failed" ? <p className="text-xs text-destructive p-4">{asset.errorMessage ?? "Generation failed"}</p> : null}
                  </div>
                  <div className="p-3 space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={asset.status === "completed" ? "default" : asset.status === "failed" ? "destructive" : "secondary"}>{asset.status}</Badge>
                      <Badge variant="outline" className="capitalize">{asset.type}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{asset.task} · {asset.provider}</p>
                    {asset.publicUrl && <a href={asset.publicUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">Open / Download</a>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AudienceTab() {
  const utils = trpc.useUtils();
  const [status, setStatus] = useState<"active" | "unsubscribed" | "bounced" | "all">("active");
  const [search, setSearch] = useState("");
  const [contact, setContact] = useState({ email: "", name: "", organization: "", tags: "", source: "manual", notes: "", status: "active" as "active" | "unsubscribed" | "bounced" });
  const contacts = trpc.admin.getMarketingContacts.useQuery({ status, search: search || undefined, limit: 200, offset: 0 });
  const createContact = trpc.admin.createMarketingContact.useMutation({
    onSuccess: async () => {
      if (contact.status === "unsubscribed") {
        await addSuppression.mutateAsync({ email: contact.email, reason: contact.notes || "Imported as unsubscribed" });
      }
      toast.success("Contact saved");
      setContact({ email: "", name: "", organization: "", tags: "", source: "manual", notes: "", status: "active" });
      utils.admin.getMarketingContacts.invalidate();
    },
    onError: (error) => toast.error("Failed to save contact", { description: error.message }),
  });
  const addSuppression = trpc.admin.addSuppression.useMutation();
  const parseImportFile = trpc.admin.parseImportFile.useMutation();
  const importContacts = trpc.admin.importMarketingContacts.useMutation({
    onSuccess: (data) => {
      toast.success(`Imported ${data.imported} contacts`);
      utils.admin.getMarketingContacts.invalidate();
    },
    onError: (error) => toast.error("Import failed", { description: error.message }),
  });

  function exportCsv() {
    const rows = contacts.data ?? [];
    if (!rows.length) {
      toast.error("No contacts to export");
      return;
    }
    const csv = [
      "email,name,organisation,tags,source,status",
      ...rows.map((c: any) => [c.email, c.name || "", c.organizationName || c.businessName || "", c.tags || "", c.source || "", c.status || ""].map((v) => `\"${String(v).replace(/\"/g, '\"\"')}\"`).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `marketing-contacts-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport(file: File) {
    const ext = file.name.toLowerCase().endsWith(".xlsx") ? "xlsx" : "csv";
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || "");
        resolve(result.includes(",") ? result.split(",").pop() || "" : result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const parsed = await parseImportFile.mutateAsync({ fileContent: base64, fileType: ext as "csv" | "xlsx", fileName: file.name });
    const rows = (parsed as any).allRows ?? [];
    const contactsPayload = rows.map((row: Record<string, string>) => {
      const lc = Object.fromEntries(Object.entries(row).map(([k, v]) => [k.toLowerCase().trim(), String(v ?? "").trim()]));
      return {
        email: lc.email || lc["email address"] || lc["e-mail"] || "",
        name: lc.name || lc.fullname || lc["full name"] || "",
        businessName: lc.business || lc["business name"] || "",
        organizationName: lc.organisation || lc.organization || lc["organization name"] || "",
        contactType: "individual",
        tags: lc.tags || "",
        country: lc.country || "",
        region: lc.region || "",
        leadFocus: lc.notes || lc["lead focus"] || "",
      };
    }).filter((r: any) => r.email);

    await importContacts.mutateAsync({ contacts: contactsPayload, source: ext === "xlsx" ? "xlsx_import" : "csv_import" });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Audience</CardTitle>
        <CardDescription>Add, search, filter, import, and export contacts using existing CRM contact procedures.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-4">
          <Input placeholder="Search contacts" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select value={status} onChange={(e) => setStatus(e.target.value as any)} className="h-10 rounded-md border bg-background px-3 text-sm">
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="unsubscribed">Unsubscribed</option>
            <option value="bounced">Bounced</option>
          </select>
          <div className="flex items-center gap-2">
            <Input type="file" accept=".csv,.xlsx" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImport(f); }} />
          </div>
          <Button variant="outline" onClick={exportCsv}><Download className="mr-2 h-4 w-4" />Export CSV</Button>
        </div>

        <div className="rounded-lg border p-4 space-y-3">
          <p className="text-sm font-medium">Add Contact</p>
          <div className="grid gap-3 md:grid-cols-3">
            <Input placeholder="Email" value={contact.email} onChange={(e) => setContact((p) => ({ ...p, email: e.target.value }))} />
            <Input placeholder="Name" value={contact.name} onChange={(e) => setContact((p) => ({ ...p, name: e.target.value }))} />
            <Input placeholder="Organisation" value={contact.organization} onChange={(e) => setContact((p) => ({ ...p, organization: e.target.value }))} />
            <Input placeholder="Tags (comma separated)" value={contact.tags} onChange={(e) => setContact((p) => ({ ...p, tags: e.target.value }))} />
            <Input placeholder="Source" value={contact.source} onChange={(e) => setContact((p) => ({ ...p, source: e.target.value }))} />
            <select value={contact.status} onChange={(e) => setContact((p) => ({ ...p, status: e.target.value as any }))} className="h-10 rounded-md border bg-background px-3 text-sm">
              <option value="active">active</option>
              <option value="unsubscribed">unsubscribed</option>
              <option value="bounced">bounced</option>
            </select>
          </div>
          <Textarea placeholder="Notes" value={contact.notes} onChange={(e) => setContact((p) => ({ ...p, notes: e.target.value }))} />
          <Button
            disabled={!contact.email || createContact.isPending}
            onClick={() => createContact.mutate({
              email: contact.email,
              name: contact.name || undefined,
              organizationName: contact.organization || undefined,
              source: contact.source || "manual",
              tags: contact.tags || undefined,
              leadFocus: contact.notes || undefined,
            })}
          >
            Save
          </Button>
          {contact.status === "bounced" ? <p className="text-xs text-muted-foreground">Bounced contacts are currently saved as active unless marked via backend processes.</p> : null}
        </div>

        {contacts.isLoading ? <Skeleton className="h-40 w-full" /> : !contacts.data?.length ? <EmptyState title="No contacts" body="Add contacts or import CSV/XLSX." /> : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Organisation</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.data.map((c: any) => (
                  <TableRow key={String(c.id ?? c.email)}>
                    <TableCell>{c.email}</TableCell>
                    <TableCell>{c.name || "-"}</TableCell>
                    <TableCell>{c.organizationName || c.businessName || "-"}</TableCell>
                    <TableCell>{c.tags || "-"}</TableCell>
                    <TableCell>{c.status || "-"}</TableCell>
                    <TableCell>{c.source || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SuppressionTab() {
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const contacts = trpc.admin.getMarketingContacts.useQuery({ status: "unsubscribed", search: search || undefined, limit: 200, offset: 0 });
  const addSuppression = trpc.admin.addSuppression.useMutation({ onSuccess: () => { toast.success("Suppression added"); setEmail(""); setReason(""); utils.admin.getMarketingContacts.invalidate(); } });
  const removeSuppression = trpc.admin.removeSuppression.useMutation({ onSuccess: () => { toast.success("Suppression removed"); utils.admin.getMarketingContacts.invalidate(); } });

  function exportSuppressionCsv() {
    const rows = (contacts.data ?? []).map((c: any) => ({
      email: c.email || "",
      name: c.name || c.organizationName || c.businessName || "",
      reason: c.reason || "",
      source: c.source || "",
      date: c.unsubscribedAt || "",
    }));
    if (!rows.length) {
      toast.error("No suppression data to export");
      return;
    }
    const csv = ["email,name,reason,source,date", ...rows.map((r) => [r.email, r.name, r.reason, r.source, r.date].map((v) => `\"${String(v).replace(/\"/g, '\"\"')}\"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `suppression-list-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Suppression List</CardTitle>
        <CardDescription>Includes legacy emailUnsubscribes + unsubscribed marketing contacts.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-4">
          <Input placeholder="Search email/name/org" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input placeholder="Reason" value={reason} onChange={(e) => setReason(e.target.value)} />
          <div className="flex gap-2">
            <Button onClick={() => addSuppression.mutate({ email, reason })} disabled={!email}>Add suppression</Button>
            <Button variant="outline" onClick={exportSuppressionCsv} disabled={!contacts.data?.length}><Download className="h-4 w-4" /></Button>
          </div>
        </div>

        {contacts.isLoading ? <Skeleton className="h-40 w-full" /> : !contacts.data?.length ? <EmptyState title="No suppressions" body="Suppressed emails appear here." /> : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Name / Org</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.data.map((contact: any) => (
                  <TableRow key={String(contact.id ?? contact.email)}>
                    <TableCell className="font-medium">{contact.email}</TableCell>
                    <TableCell>{contact.name || contact.organizationName || contact.businessName || "-"}</TableCell>
                    <TableCell>{contact.reason || "-"}</TableCell>
                    <TableCell>{contact.source || "-"}</TableCell>
                    <TableCell>{contact.unsubscribedAt ? new Date(contact.unsubscribedAt).toLocaleString() : "-"}</TableCell>
                    <TableCell className="text-right"><Button size="sm" variant="outline" onClick={() => removeSuppression.mutate({ email: contact.email })}>Remove</Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function BrandTab() {
  const brandProfile = trpc.admin.getBrandProfile.useQuery();
  const avatars = trpc.admin.listBrandAvatars.useQuery();
  const utils = trpc.useUtils();

  const updateBrandProfile = trpc.admin.updateBrandProfile.useMutation({
    onSuccess: () => { toast.success("Brand profile saved"); utils.admin.getBrandProfile.invalidate(); },
    onError: (error) => toast.error("Failed to save brand profile", { description: error.message }),
  });
  const createAvatar = trpc.admin.createBrandAvatar.useMutation({
    onSuccess: () => { toast.success("Avatar created"); utils.admin.listBrandAvatars.invalidate(); },
    onError: (error) => toast.error("Failed to create avatar", { description: error.message }),
  });
  const archiveAvatar = trpc.admin.archiveBrandAvatar.useMutation({
    onSuccess: () => { toast.success("Avatar archived"); utils.admin.listBrandAvatars.invalidate(); },
  });

  const [brandForm, setBrandForm] = useState({ brandVoice: "", targetAudience: "", positioning: "", primaryCta: "", hashtagStyle: "", contentPillarsStr: "", prohibitedClaimsStr: "" });
  const [avatarForm, setAvatarForm] = useState({ name: "", role: "", visualDescription: "", personality: "", voiceStyle: "", accent: "", promptTemplate: "" });
  const [initialized, setInitialized] = useState(false);
  if (brandProfile.data && !initialized) {
    setInitialized(true);
    setBrandForm({
      brandVoice: brandProfile.data.brandVoice ?? "",
      targetAudience: brandProfile.data.targetAudience ?? "",
      positioning: brandProfile.data.positioning ?? "",
      primaryCta: brandProfile.data.primaryCta ?? "",
      hashtagStyle: brandProfile.data.hashtagStyle ?? "",
      contentPillarsStr: (brandProfile.data.contentPillars ?? []).join(", "),
      prohibitedClaimsStr: (brandProfile.data.prohibitedClaims ?? []).join(", "),
    });
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader><CardTitle>Brand</CardTitle><CardDescription>Brand voice, audience, positioning, CTA, pillars, claims and hashtag style.</CardDescription></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Textarea rows={2} placeholder="Brand voice" value={brandForm.brandVoice} onChange={(e) => setBrandForm((p) => ({ ...p, brandVoice: e.target.value }))} />
          <Textarea rows={2} placeholder="Audience" value={brandForm.targetAudience} onChange={(e) => setBrandForm((p) => ({ ...p, targetAudience: e.target.value }))} />
          <Textarea rows={2} placeholder="Positioning" value={brandForm.positioning} onChange={(e) => setBrandForm((p) => ({ ...p, positioning: e.target.value }))} />
          <Input placeholder="Primary CTA" value={brandForm.primaryCta} onChange={(e) => setBrandForm((p) => ({ ...p, primaryCta: e.target.value }))} />
          <Input placeholder="Content pillars (comma-separated)" value={brandForm.contentPillarsStr} onChange={(e) => setBrandForm((p) => ({ ...p, contentPillarsStr: e.target.value }))} />
          <Input placeholder="Prohibited claims (comma-separated)" value={brandForm.prohibitedClaimsStr} onChange={(e) => setBrandForm((p) => ({ ...p, prohibitedClaimsStr: e.target.value }))} />
          <Input placeholder="Hashtag style" value={brandForm.hashtagStyle} onChange={(e) => setBrandForm((p) => ({ ...p, hashtagStyle: e.target.value }))} />
          <Button onClick={() => updateBrandProfile.mutate({
            tenantId: "global",
            brandVoice: brandForm.brandVoice || undefined,
            targetAudience: brandForm.targetAudience || undefined,
            positioning: brandForm.positioning || undefined,
            primaryCta: brandForm.primaryCta || undefined,
            hashtagStyle: brandForm.hashtagStyle || undefined,
            contentPillars: brandForm.contentPillarsStr ? brandForm.contentPillarsStr.split(",").map((s) => s.trim()).filter(Boolean) : [],
            prohibitedClaims: brandForm.prohibitedClaimsStr ? brandForm.prohibitedClaimsStr.split(",").map((s) => s.trim()).filter(Boolean) : [],
          })}>Save brand</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Avatar</CardTitle><CardDescription>Avatar profile is injected into avatar/video prompts when relevant.</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          {(avatars.data ?? []).length > 0 ? (
            <div className="space-y-2">
              {avatars.data?.map((avatar: any) => (
                <div key={avatar.id} className="rounded-lg border p-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{avatar.name}</p>
                    <p className="text-xs text-muted-foreground">{avatar.role || ""} {avatar.voiceStyle ? `· ${avatar.voiceStyle}` : ""} {avatar.accent ? `· ${avatar.accent}` : ""}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => archiveAvatar.mutate({ id: avatar.id })}>Archive</Button>
                </div>
              ))}
            </div>
          ) : <EmptyState title="No avatars yet" body="Create an avatar profile for consistent video/voice prompts." />}

          <div className="grid gap-3 sm:grid-cols-2 border-t pt-4">
            <Input placeholder="Avatar name" value={avatarForm.name} onChange={(e) => setAvatarForm((p) => ({ ...p, name: e.target.value }))} />
            <Input placeholder="Role" value={avatarForm.role} onChange={(e) => setAvatarForm((p) => ({ ...p, role: e.target.value }))} />
            <Textarea rows={2} placeholder="Visual identity / wardrobe / background rules" value={avatarForm.visualDescription} onChange={(e) => setAvatarForm((p) => ({ ...p, visualDescription: e.target.value }))} />
            <Textarea rows={2} placeholder="Voice style" value={avatarForm.voiceStyle} onChange={(e) => setAvatarForm((p) => ({ ...p, voiceStyle: e.target.value }))} />
            <Input placeholder="Accent" value={avatarForm.accent} onChange={(e) => setAvatarForm((p) => ({ ...p, accent: e.target.value }))} />
            <Textarea rows={2} placeholder="Prompt template / reference guidance" value={avatarForm.promptTemplate} onChange={(e) => setAvatarForm((p) => ({ ...p, promptTemplate: e.target.value }))} />
            <Button className="sm:col-span-2" disabled={!avatarForm.name} onClick={() => createAvatar.mutate({ ...avatarForm, tenantId: "global" })}>Create avatar</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SettingsTab() {
  const diagnostics = trpc.admin.getAIDiagnostics.useQuery();
  const queueStatus = trpc.admin.getQueueStatus.useQuery();
  const utils = trpc.useUtils();
  const setSetting = trpc.admin.setSiteSetting.useMutation({ onSuccess: () => { toast.success("Saved"); utils.admin.getAIDiagnostics.invalidate(); } });
  const fullProviderTest = trpc.admin.runFullProviderTest.useMutation({ onSuccess: () => { toast.success("Full provider test complete"); utils.admin.getAIDiagnostics.invalidate(); } });
  const [keys, setKeys] = useState({ genx_api_key: "", huggingface_api_key: "", qwen_api_key: "" });

  const providerHealth = diagnostics.data?.providerHealth ?? [];
  const taskCapabilities = diagnostics.data?.taskCapabilities ?? [];
  const errors = diagnostics.data?.recentFailures ?? [];
  const copywritingRouting = (diagnostics.data as any)?.copywritingRouting;

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader><CardTitle>Provider keys + diagnostics</CardTitle><CardDescription>Technical admin settings only.</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {providerHealth.map((provider: any) => (
              <div key={provider.provider} className="rounded-lg border p-3">
                <div className="flex items-center justify-between"><p className="font-medium capitalize">{provider.provider}</p><Badge variant={provider.configured ? "default" : "secondary"}>{provider.configured ? "Configured" : "Missing"}</Badge></div>
                <p className="text-xs text-muted-foreground mt-1">{provider.message}</p>
                {provider.model ? <p className="text-xs text-muted-foreground mt-1">Model: {provider.model}</p> : null}
                {provider.lastError ? <p className="text-xs text-destructive mt-1">Last error: {provider.lastError}</p> : null}
              </div>
            ))}
          </div>

          <div className="grid gap-2 sm:grid-cols-[1fr_auto]"><Input type="password" placeholder="genx_api_key" value={keys.genx_api_key} onChange={(e) => setKeys((p) => ({ ...p, genx_api_key: e.target.value }))} /><Button variant="outline" disabled={!keys.genx_api_key} onClick={() => setSetting.mutate({ key: "genx_api_key", value: keys.genx_api_key })}>Save GenX key</Button></div>
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]"><Input type="password" placeholder="huggingface_api_key" value={keys.huggingface_api_key} onChange={(e) => setKeys((p) => ({ ...p, huggingface_api_key: e.target.value }))} /><Button variant="outline" disabled={!keys.huggingface_api_key} onClick={() => setSetting.mutate({ key: "huggingface_api_key", value: keys.huggingface_api_key })}>Save HF key</Button></div>
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]"><Input type="password" placeholder="qwen_api_key" value={keys.qwen_api_key} onChange={(e) => setKeys((p) => ({ ...p, qwen_api_key: e.target.value }))} /><Button variant="outline" disabled={!keys.qwen_api_key} onClick={() => setSetting.mutate({ key: "qwen_api_key", value: keys.qwen_api_key })}>Save Qwen key</Button></div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => fullProviderTest.mutate()} disabled={fullProviderTest.isPending}>Run full provider test</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Capability matrix</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm">Copywriting provider now: <span className="font-medium">{copywritingRouting?.activeProvider ?? "none"}</span></p>
          <p className="text-xs text-muted-foreground">Candidates: {(copywritingRouting?.candidates ?? []).join(", ") || "none"}</p>
          <div className="rounded border p-3 text-xs text-muted-foreground">
            {taskCapabilities.map((t: any) => `${t.task}: preferred ${t.preferredProvider} · fallback ${(t.fallbackProviders || []).join(", ") || "-"}`).join("\n")}
          </div>
          {queueStatus.data ? <p className="text-xs text-muted-foreground">Queue mode: {queueStatus.data.mode} — {queueStatus.data.note}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Recent provider failures</CardTitle></CardHeader>
        <CardContent>
          {!errors.length ? <EmptyState title="No recent failures" body="Provider failures will appear here." /> : (
            <div className="space-y-2">
              {errors.slice(0, 10).map((error: any, i: number) => (
                <div key={`${error.at}-${i}`} className="rounded border p-2">
                  <p className="text-xs text-muted-foreground">{error.at}</p>
                  <p className="text-sm">{error.provider} · {error.task}</p>
                  <p className="text-xs text-destructive">{error.error}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminCampaigns() {
  const [activeTab, setActiveTab] = useState<WorkflowTab>("create");
  const diagnostics = trpc.admin.getAIDiagnostics.useQuery();

  const tabMeta = useMemo(() => ({
    create: { label: "Create", icon: Sparkles },
    drafts: { label: "Drafts", icon: Megaphone },
    calendar: { label: "Calendar", icon: CalendarDays },
    assets: { label: "Assets", icon: Image },
    audience: { label: "Audience", icon: Users },
    suppression: { label: "Suppression", icon: ShieldBan },
    brand: { label: "Brand", icon: Building2 },
    settings: { label: "Settings", icon: Settings },
  }), []);

  const providerHealth = diagnostics.data?.providerHealth ?? [];
  const storageReady = !!diagnostics.data?.storageStatus?.available;
  const queueReady = diagnostics.data?.queue?.processingJobs !== undefined;
  const genxReady = providerHealth.find((p: any) => p.provider === "genx")?.configured ?? false;
  const mediaReady = (providerHealth.find((p: any) => p.provider === "huggingface")?.configured ?? false)
    && !!providerHealth.find((p: any) => p.provider === "huggingface")?.model;

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-primary/15 bg-gradient-to-br from-primary/10 via-background to-background">
        <CardHeader>
          <div className="flex flex-col gap-3">
            <div>
              <CardTitle className="text-2xl">Marketing Studio</CardTitle>
              <CardDescription className="mt-1">Create, preview, approve and schedule AI marketing content.</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusChip label="GenX" ok={genxReady} />
              <StatusChip label="Media" ok={mediaReady} />
              <StatusChip label="Storage" ok={storageReady} />
              <StatusChip label="Queue" ok={queueReady} />
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        <Card>
          <CardContent className="p-3">
            <div className="space-y-1">
              {WORKFLOW_TABS.map((tab) => {
                const Icon = tabMeta[tab].icon;
                return (
                  <Button key={tab} variant={activeTab === tab ? "default" : "ghost"} className="w-full justify-start" size="sm" onClick={() => setActiveTab(tab)}>
                    <Icon className="mr-2 h-4 w-4" />
                    {tabMeta[tab].label}
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div>
          {activeTab === "create" && <MarketingCreateTab />}
          {activeTab === "drafts" && <DraftsTab />}
          {activeTab === "calendar" && <CalendarTab />}
          {activeTab === "assets" && <AssetsTab />}
          {activeTab === "audience" && <AudienceTab />}
          {activeTab === "suppression" && <SuppressionTab />}
          {activeTab === "brand" && <BrandTab />}
          {activeTab === "settings" && <SettingsTab />}
        </div>
      </div>
    </div>
  );
}
