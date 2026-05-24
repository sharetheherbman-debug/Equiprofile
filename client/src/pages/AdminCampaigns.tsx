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
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

const WORKFLOW_TABS = ["create", "drafts", "approval", "calendar", "assets", "audience", "suppression", "settings"] as const;
type WorkflowTab = (typeof WORKFLOW_TABS)[number];

const PLATFORM_OPTIONS = ["Facebook", "Instagram", "TikTok", "YouTube", "LinkedIn", "Google Business", "Email"] as const;
const FORMAT_OPTIONS = ["post", "reel", "short", "email", "carousel", "image", "video", "avatar video"] as const;
const GOAL_OPTIONS = ["signups", "stable owners", "schools", "academy", "retention", "announcement"] as const;
const TONE_OPTIONS = ["professional", "friendly", "premium", "educational", "urgent", "warm"] as const;

type DraftPayload = {
  id: string;
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
  approvalStatus?: string;
};

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-dashed bg-muted/30 p-8 text-center">
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

function MarketingCreateTab() {
  const utils = trpc.useUtils();
  const [form, setForm] = useState({
    prompt: "",
    platform: "Facebook" as (typeof PLATFORM_OPTIONS)[number],
    format: "post" as (typeof FORMAT_OPTIONS)[number],
    durationSeconds: "30",
    goal: "signups" as (typeof GOAL_OPTIONS)[number],
    tone: "professional" as (typeof TONE_OPTIONS)[number],
  });
  const [draft, setDraft] = useState<DraftPayload | null>(null);

  const createDraft = trpc.admin.createMarketingDraft.useMutation({
    onSuccess: (data) => {
      if (data.status === "provider_missing") {
        toast.error("Provider key missing", { description: "Add GenX or Hugging Face key in AI Settings." });
        return;
      }
      setDraft(data.draft as DraftPayload);
      toast.success("Draft created");
      utils.admin.listMarketingDrafts.invalidate();
    },
    onError: (error) => toast.error("Draft generation failed", { description: error.message }),
  });

  const updateDraft = trpc.admin.updateMarketingDraft.useMutation({
    onSuccess: (data) => {
      setDraft(data.draft as DraftPayload);
      toast.success("Draft updated");
      utils.admin.listMarketingDrafts.invalidate();
    },
    onError: (error) => toast.error("Update failed", { description: error.message }),
  });

  const sendToApproval = trpc.admin.sendMarketingDraftToApproval.useMutation({
    onSuccess: () => {
      toast.success("Draft sent to approval queue");
      utils.admin.listMarketingDrafts.invalidate();
      utils.admin.listApprovalQueue.invalidate();
    },
    onError: (error) => toast.error("Send to approval failed", { description: error.message }),
  });

  const approveDraft = trpc.admin.approveMarketingDraft.useMutation({
    onSuccess: () => {
      toast.success("Draft approved");
      utils.admin.listApprovalQueue.invalidate();
      utils.admin.listMarketingCalendar.invalidate();
    },
  });

  const scheduleDraft = trpc.admin.scheduleMarketingDraft.useMutation({
    onSuccess: () => {
      toast.success("Draft scheduled");
      utils.admin.listMarketingCalendar.invalidate();
    },
    onError: (error) => toast.error("Scheduling failed", { description: error.message }),
  });

  const [scheduleAt, setScheduleAt] = useState("");

  const canUseDuration = ["video", "short", "reel", "avatar video"].includes(form.format);

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Create</CardTitle>
          <CardDescription>Create → Preview/Edit → Approval Queue → Calendar → Assets</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2 lg:col-span-2">
            <Label>What do you want to create?</Label>
            <Textarea
              rows={4}
              placeholder="Create a 30-second Facebook reel for EquiProfile to attract UK stable owners."
              value={form.prompt}
              onChange={(e) => setForm((prev) => ({ ...prev, prompt: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label>Platform</Label>
            <select
              value={form.platform}
              onChange={(e) => setForm((prev) => ({ ...prev, platform: e.target.value as typeof prev.platform }))}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            >
              {PLATFORM_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <Label>Format</Label>
            <select
              value={form.format}
              onChange={(e) => setForm((prev) => ({ ...prev, format: e.target.value as typeof prev.format }))}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            >
              {FORMAT_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <Label>Duration (seconds)</Label>
            <Input
              disabled={!canUseDuration}
              value={form.durationSeconds}
              onChange={(e) => setForm((prev) => ({ ...prev, durationSeconds: e.target.value }))}
              placeholder="30"
            />
          </div>

          <div className="space-y-2">
            <Label>Goal</Label>
            <select
              value={form.goal}
              onChange={(e) => setForm((prev) => ({ ...prev, goal: e.target.value as typeof prev.goal }))}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            >
              {GOAL_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <Label>Tone</Label>
            <select
              value={form.tone}
              onChange={(e) => setForm((prev) => ({ ...prev, tone: e.target.value as typeof prev.tone }))}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            >
              {TONE_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>

          <div className="lg:col-span-2">
            <Button
              className="w-full sm:w-auto"
              disabled={createDraft.isPending || form.prompt.trim().length < 10}
              onClick={() =>
                createDraft.mutate({
                  prompt: form.prompt,
                  platform: form.platform,
                  format: form.format,
                  durationSeconds: canUseDuration ? Number(form.durationSeconds || 0) || null : null,
                  goal: form.goal,
                  tone: form.tone,
                })
              }
            >
              {createDraft.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Generate
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preview / Edit</CardTitle>
        </CardHeader>
        <CardContent>
          {!draft ? (
            <EmptyState title="No draft yet" body="Generate a draft to preview and edit content fields." />
          ) : (
            <div className="space-y-3">
              {[
                ["title", "Title"],
                ["hook", "Hook"],
                ["script", "Script"],
                ["shotList", "Shot list"],
                ["caption", "Caption"],
                ["cta", "CTA"],
                ["hashtags", "Hashtags"],
                ["imagePrompt", "Image prompt"],
                ["videoPrompt", "Video prompt"],
                ["avatarScript", "Avatar script"],
                ["complianceNotes", "Compliance notes"],
              ].map(([key, label]) => (
                <div key={key} className="space-y-1.5">
                  <Label>{label}</Label>
                  <Textarea
                    rows={key === "script" ? 4 : 2}
                    value={typeof (draft as any)[key] === "string" ? (draft as any)[key] : JSON.stringify((draft as any)[key] ?? "", null, 2)}
                    onChange={(e) => setDraft((prev) => (prev ? { ...prev, [key]: e.target.value } : prev))}
                  />
                </div>
              ))}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  disabled={updateDraft.isPending || !draft.id}
                  onClick={() => updateDraft.mutate({ id: draft.id, fields: draft as any })}
                >
                  Save edits
                </Button>
                <Button
                  variant="outline"
                  disabled={createDraft.isPending || form.prompt.trim().length < 10}
                  onClick={() =>
                    createDraft.mutate({
                      prompt: form.prompt,
                      platform: form.platform,
                      format: form.format,
                      durationSeconds: canUseDuration ? Number(form.durationSeconds || 0) || null : null,
                      goal: form.goal,
                      tone: form.tone,
                    })
                  }
                >
                  Regenerate
                </Button>
                <Button disabled={sendToApproval.isPending || !draft.id} onClick={() => sendToApproval.mutate({ id: draft.id })}>
                  Send to approval
                </Button>
                <Button variant="secondary" disabled={!draft.id || approveDraft.isPending} onClick={() => approveDraft.mutate({ id: draft.id })}>
                  Approve
                </Button>
                <div className="flex items-center gap-2">
                  <Input type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} className="h-9" />
                  <Button
                    variant="secondary"
                    disabled={!draft.id || !scheduleAt || scheduleDraft.isPending}
                    onClick={() => scheduleDraft.mutate({ id: draft.id, scheduleAt: new Date(scheduleAt).toISOString() })}
                  >
                    Schedule
                  </Button>
                </div>
              </div>
            </div>
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
      <CardHeader>
        <CardTitle>Drafts</CardTitle>
      </CardHeader>
      <CardContent>
        {drafts.isLoading ? <Skeleton className="h-32 w-full" /> : !drafts.data?.length ? <EmptyState title="No drafts" body="Created marketing drafts appear here." /> : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>Format</TableHead>
                  <TableHead>Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {drafts.data.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.output?.title || "Untitled draft"}</TableCell>
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

function ApprovalTab() {
  const utils = trpc.useUtils();
  const queue = trpc.admin.listApprovalQueue.useQuery();
  const approve = trpc.admin.approveMarketingDraft.useMutation({ onSuccess: () => { toast.success("Approved"); utils.admin.listApprovalQueue.invalidate(); } });
  const reject = trpc.admin.rejectMarketingDraft.useMutation({ onSuccess: () => { toast.success("Rejected"); utils.admin.listApprovalQueue.invalidate(); } });
  const schedule = trpc.admin.scheduleMarketingDraft.useMutation({ onSuccess: () => { toast.success("Scheduled"); utils.admin.listApprovalQueue.invalidate(); utils.admin.listMarketingCalendar.invalidate(); } });
  const [scheduleAt, setScheduleAt] = useState("");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Approval Queue</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} className="max-w-xs" />
        {queue.isLoading ? <Skeleton className="h-32 w-full" /> : !queue.data?.length ? <EmptyState title="No approval items" body="Send a draft to approval from Create." /> : (
          queue.data.map((item: any) => (
            <div key={item.id} className="rounded-lg border p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{item.status}</Badge>
                <Badge variant="secondary">{item.payload?.platform || "Marketing"}</Badge>
                <span className="text-xs text-muted-foreground">{item.id}</span>
              </div>
              <p className="mt-2 text-sm font-medium">{item.output?.title || "Untitled"}</p>
              <p className="text-xs text-muted-foreground line-clamp-2">{item.output?.hook || item.payload?.prompt || ""}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" onClick={() => approve.mutate({ id: item.id })}>Approve</Button>
                <Button size="sm" variant="outline" onClick={() => reject.mutate({ id: item.id, reason: "Rejected during admin review" })}>Reject</Button>
                <Button size="sm" variant="secondary" disabled={!scheduleAt} onClick={() => schedule.mutate({ id: item.id, scheduleAt: new Date(scheduleAt).toISOString() })}>Schedule</Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function CalendarTab() {
  const calendar = trpc.admin.listMarketingCalendar.useQuery();
  return (
    <Card>
      <CardHeader>
        <CardTitle>Calendar</CardTitle>
      </CardHeader>
      <CardContent>
        {calendar.isLoading ? <Skeleton className="h-32 w-full" /> : !calendar.data?.length ? <EmptyState title="No scheduled drafts" body="Schedule approved items to populate the calendar." /> : (
          <div className="space-y-3">
            {calendar.data.map((item: any) => (
              <div key={item.id} className="rounded-lg border p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{item.output?.title || item.task || "Scheduled draft"}</p>
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
  const assets = trpc.admin.listMarketingAssets.useQuery();
  const createMediaJob = trpc.admin.createMediaJob.useMutation({
    onSuccess: () => toast.success("Media job queued"),
    onError: (error) => {
      const message = /not configured/i.test(error.message) ? "Provider key missing" : error.message;
      toast.error("Media job failed", { description: message });
    },
  });
  const [prompt, setPrompt] = useState("Create a premium image concept for EquiProfile marketing.");
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Assets</CardTitle>
          <CardDescription>Create image, video, and avatar media jobs (approval-first, no publishing).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea rows={3} value={prompt} onChange={(e) => setPrompt(e.target.value)} />
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => createMediaJob.mutate({ task: "text_to_image", prompt })}>Image job</Button>
            <Button variant="outline" onClick={() => createMediaJob.mutate({ task: "text_to_video", prompt })}>Video job</Button>
            <Button variant="outline" onClick={() => createMediaJob.mutate({ task: "avatar_video", prompt })}>Avatar job</Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          {assets.isLoading ? <Skeleton className="h-32 w-full" /> : !assets.data?.length ? <EmptyState title="No assets" body="Media jobs will appear here when queued." /> : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assets.data.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.task}</TableCell>
                      <TableCell>{item.provider || "-"}</TableCell>
                      <TableCell><Badge variant="outline">{item.state}</Badge></TableCell>
                      <TableCell>{new Date(item.updatedAt).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
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
        <CardDescription>Includes legacy unsubscribe records from emailUnsubscribes.</CardDescription>
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

function AudienceTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Audience</CardTitle>
        <CardDescription>CRM audience management remains available in admin contact tools.</CardDescription>
      </CardHeader>
      <CardContent>
        <EmptyState title="Audience controls" body="Use existing contacts and segmentation tools in Admin for bulk audience operations." />
      </CardContent>
    </Card>
  );
}

function SettingsTab() {
  const diagnostics = trpc.admin.getAIDiagnostics.useQuery();
  const utils = trpc.useUtils();
  const setSetting = trpc.admin.setSiteSetting.useMutation({ onSuccess: () => { toast.success("Saved"); utils.admin.getAIDiagnostics.invalidate(); } });
  const createDraft = trpc.admin.createMarketingDraft.useMutation({
    onSuccess: (data) => toast[data.status === "provider_missing" ? "error" : "success"](data.message || "GenX test complete"),
    onError: (error) => toast.error("GenX test failed", { description: error.message }),
  });
  const mediaTest = trpc.admin.createMediaJob.useMutation({
    onSuccess: () => toast.success("Hugging Face route test queued"),
    onError: (error) => toast.error("Hugging Face route test failed", { description: /not configured/i.test(error.message) ? "Provider key missing" : error.message }),
  });
  const [keys, setKeys] = useState({ genx_api_key: "", huggingface_api_key: "" });

  const providerHealth = diagnostics.data?.providerHealth ?? [];
  const queue = diagnostics.data?.queue;
  const errors = diagnostics.data?.recentFailures ?? [];

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>AI Settings (hidden admin)</CardTitle>
          <CardDescription>Provider status, tests, queue, capabilities, and recent errors.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {providerHealth.map((provider: any) => (
              <div key={provider.provider} className="rounded-lg border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium capitalize">{provider.provider} key status</p>
                  <Badge variant={provider.configured ? "default" : "secondary"}>{provider.configured ? "Configured" : "Missing"}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{provider.message}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <Input type="password" placeholder="genx_api_key" value={keys.genx_api_key} onChange={(e) => setKeys((prev) => ({ ...prev, genx_api_key: e.target.value }))} />
            <Button variant="outline" disabled={!keys.genx_api_key} onClick={() => setSetting.mutate({ key: "genx_api_key", value: keys.genx_api_key })}>Save GenX key</Button>
          </div>
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <Input type="password" placeholder="huggingface_api_key" value={keys.huggingface_api_key} onChange={(e) => setKeys((prev) => ({ ...prev, huggingface_api_key: e.target.value }))} />
            <Button variant="outline" disabled={!keys.huggingface_api_key} onClick={() => setSetting.mutate({ key: "huggingface_api_key", value: keys.huggingface_api_key })}>Save HF key</Button>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => createDraft.mutate({ prompt: "Test GenX text generation for EquiProfile marketing draft", platform: "LinkedIn", format: "post", goal: "announcement", tone: "professional", durationSeconds: null })}
            >
              Test GenX text generation
            </Button>
            <Button variant="outline" onClick={() => mediaTest.mutate({ task: "text_to_image", prompt: "Test Hugging Face marketing route" })}>Test Hugging Face task route</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Queue + capabilities</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Pending approvals</p><p className="text-2xl font-semibold">{queue?.pendingApprovals ?? 0}</p></div>
          <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Processing media jobs</p><p className="text-2xl font-semibold">{queue?.processingJobs ?? 0}</p></div>
          <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Available capabilities</p><p className="text-sm font-medium mt-1">social, email, calendar, image, video, avatar</p></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent errors</CardTitle>
        </CardHeader>
        <CardContent>
          {!errors.length ? <EmptyState title="No recent provider errors" body="Provider failures will appear here." /> : (
            <div className="space-y-2">
              {errors.slice(0, 8).map((error: any, i: number) => (
                <div key={`${error.at}-${i}`} className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">{error.at}</p>
                  <p className="text-sm">{error.provider} · {error.task}</p>
                  <p className="text-xs text-destructive mt-1">{error.error}</p>
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

  const tabMeta = useMemo(() => ({
    create: { label: "Create", icon: Sparkles },
    drafts: { label: "Drafts", icon: Megaphone },
    approval: { label: "Approval", icon: CheckCircle2 },
    calendar: { label: "Calendar", icon: CalendarDays },
    assets: { label: "Assets", icon: Image },
    audience: { label: "Audience", icon: Users },
    suppression: { label: "Suppression", icon: ShieldBan },
    settings: { label: "Settings", icon: Settings },
  }), []);

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-primary/15 bg-gradient-to-br from-primary/10 via-background to-background">
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-2xl">Marketing Studio</CardTitle>
              <CardDescription className="mt-1">Simple hidden-admin workflow: Create → Preview/Edit → Approval Queue → Calendar → Assets</CardDescription>
            </div>
            <Badge variant="secondary">No direct publishing in beta</Badge>
          </div>
        </CardHeader>
      </Card>

      <div className="overflow-x-auto rounded-lg border bg-card p-2">
        <div className="flex w-max flex-nowrap gap-2">
          {WORKFLOW_TABS.map((tab) => {
            const Icon = tabMeta[tab].icon;
            return (
              <Button key={tab} variant={activeTab === tab ? "default" : "ghost"} size="sm" onClick={() => setActiveTab(tab)}>
                <Icon className="mr-1.5 h-4 w-4" />
                {tabMeta[tab].label}
              </Button>
            );
          })}
        </div>
      </div>

      {activeTab === "create" && <MarketingCreateTab />}
      {activeTab === "drafts" && <DraftsTab />}
      {activeTab === "approval" && <ApprovalTab />}
      {activeTab === "calendar" && <CalendarTab />}
      {activeTab === "assets" && <AssetsTab />}
      {activeTab === "audience" && <AudienceTab />}
      {activeTab === "suppression" && <SuppressionTab />}
      {activeTab === "settings" && <SettingsTab />}
    </div>
  );
}
