import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  ArrowLeft,
  BadgeCheck,
  Bot,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock,
  Download,
  Film,
  Image,
  Inbox,
  Loader2,
  Megaphone,
  Palette,
  RadioTower,
  Search,
  Send,
  Settings,
  ShieldAlert,
  Sparkles,
  Users,
  Wand2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

export const STUDIO_NAV = ["studio", "campaigns", "assets", "audience", "platforms", "brand", "approvals", "calendar", "settings"] as const;
type StudioNav = (typeof STUDIO_NAV)[number];

export const PLATFORM_CONNECTION_CARDS = [
  { id: "facebook", label: "Facebook", growthPlatform: "meta", requirement: "Meta app, page access, publishing permissions" },
  { id: "instagram", label: "Instagram", growthPlatform: "meta", requirement: "Instagram professional account connected to Meta" },
  { id: "tiktok", label: "TikTok", growthPlatform: "tiktok", requirement: "TikTok OAuth and approved app scopes" },
  { id: "youtube", label: "YouTube", growthPlatform: "youtube", requirement: "Google OAuth and YouTube channel scope" },
  { id: "linkedin", label: "LinkedIn", growthPlatform: "linkedin", requirement: "LinkedIn company page admin access" },
  { id: "google-business", label: "Google Business", growthPlatform: "google_business_profile", requirement: "Google Business Profile OAuth access" },
  { id: "email", label: "Email", growthPlatform: "email", requirement: "SMTP configured; draft mode available now" },
] as const;

export const EQUIPROFILE_BRAND_PRESET = {
  name: "EquiProfile UK Equestrian SaaS",
  businessProfile: "EquiProfile is a premium horse and stable management platform for UK equestrian professionals.",
  targetAudience: "UK stable owners, riding schools, horse owners, yard managers, instructors, and equestrian professionals.",
  brandVoice: "Premium, helpful, expert, calm, practical, and trustworthy.",
  contentPillars: [
    "Stable operations and staff coordination",
    "Horse health records and reminders",
    "Riding school organisation",
    "Professional care workflows",
    "Time-saving digital systems",
  ],
  primaryCta: "Start your free trial",
  visualIdentity: "Clean premium SaaS visuals, real stable context, confident navy/green palette, practical screenshots over hype.",
  avatarPersona: "A calm UK equestrian operations advisor who explains stable management clearly.",
  prohibitedClaims: [
    "fake vet diagnosis",
    "fake accreditation",
    "guaranteed growth claims",
    "fake testimonials",
    "fake charity partnerships",
  ],
  approvedClaims: [
    "organise horse records",
    "coordinate stable tasks",
    "prepare professional reminders",
    "support equestrian operations",
  ],
  platformDefaults: "Facebook: practical stable owner reels. LinkedIn: professional operations posts. Email: clear trial-focused nurture.",
};

type DraftPayload = {
  id: string;
  title?: string;
  strategy?: string;
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
  growthScore?: { overallScore?: number; reasons?: string[]; improvementSuggestions?: string[] } & Record<string, unknown>;
  mediaStatus?: string;
  platform?: string;
  format?: string;
};

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-dashed bg-slate-50/80 p-8 text-center dark:bg-slate-900/30">
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

function readinessVariant(state?: string) {
  if (state === "ready") return "default" as const;
  if (state === "warning" || state === "partial") return "secondary" as const;
  return "outline" as const;
}

function StudioStatusChip({ label, state, message }: { label: string; state?: string; message?: string }) {
  return (
    <div className="rounded-xl border bg-white px-3 py-2 shadow-sm dark:bg-card">
      <div className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${state === "ready" ? "bg-emerald-500" : state === "warning" || state === "partial" ? "bg-amber-500" : "bg-slate-300"}`} />
        <p className="text-xs font-semibold">{label}</p>
      </div>
      <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">{message}</p>
    </div>
  );
}

function stringifyList(value: unknown): string {
  if (Array.isArray(value)) return value.join(" ");
  if (typeof value === "string") return value;
  if (!value) return "";
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function draftSections(draft: DraftPayload | null) {
  if (!draft) return [];
  return [
    ["Strategy", draft.strategy || draft.title || "Position the offer around saving time and improving stable organisation."],
    ["Content preview", draft.hook || draft.title || "A polished EquiProfile campaign draft."],
    ["Shot list", stringifyList(draft.shotList)],
    ["Script/body", draft.script],
    ["Caption", draft.caption],
    ["CTA", draft.cta],
    ["Hashtags", stringifyList(draft.hashtags)],
    ["Visual direction", draft.imagePrompt],
    ["Media plan", draft.videoPrompt || draft.avatarScript],
    ["Recommended schedule", "Schedule after approval during a weekday morning or early evening UK audience window."],
    ["Compliance notes", draft.complianceNotes || "Approval required. Avoid fake testimonials, fake accreditation, and guaranteed growth claims."],
  ];
}

function StudioHome() {
  const utils = trpc.useUtils();
  const diagnostics = trpc.admin.getAIDiagnostics.useQuery();
  const brand = trpc.admin.getBrandProfile.useQuery({ tenantId: "global" });
  const approvals = trpc.admin.listApprovalQueue.useQuery();
  const [command, setCommand] = useState("Create a 30-second Facebook reel for UK stable owners.");
  const [draft, setDraft] = useState<DraftPayload | null>(null);
  const [scheduleAt, setScheduleAt] = useState("");

  const createDraft = trpc.admin.createMarketingDraft.useMutation({
    onSuccess: (data) => {
      if (data.status === "provider_missing" || data.status === "provider_unavailable") {
        setDraft(null);
        toast.error("AI provider not connected correctly", {
          description: "Open Settings to run the GenX/HF live test and fix provider setup.",
        });
        return;
      }
      setDraft(data.draft as DraftPayload);
      toast.success("Marketing plan generated");
      utils.admin.listMarketingDrafts.invalidate();
      utils.admin.listApprovalQueue.invalidate();
      utils.admin.getAIDiagnostics.invalidate();
    },
    onError: () => {
      toast.error("AI provider not connected correctly", {
        description: "Open Settings to run the provider test. The main studio hides raw backend failures.",
      });
    },
  });

  const createMediaJob = trpc.admin.createMediaJob.useMutation({
    onSuccess: () => {
      toast.success("Media job queued");
      utils.admin.listMediaAssets.invalidate();
      utils.admin.getAIDiagnostics.invalidate();
    },
    onError: () => toast.error("Playable media is not connected yet"),
  });
  const sendToApproval = trpc.admin.sendMarketingDraftToApproval.useMutation({
    onSuccess: () => {
      toast.success("Sent to approval");
      utils.admin.listMarketingDrafts.invalidate();
      utils.admin.listApprovalQueue.invalidate();
    },
  });
  const scheduleDraft = trpc.admin.scheduleMarketingDraft.useMutation({
    onSuccess: () => {
      toast.success("Scheduled");
      utils.admin.listMarketingCalendar.invalidate();
    },
  });

  const readiness = (diagnostics.data as any)?.readiness;
  const platformConnections = (diagnostics.data as any)?.socialConnections ?? [];
  const connectedLabels = PLATFORM_CONNECTION_CARDS.filter((card) =>
    platformConnections.some((connection: any) => connection.platform === card.growthPlatform && ["connected", "approval_required", "ready_to_publish"].includes(connection.state)),
  ).map((card) => card.label);
  const aiReady = readiness?.aiCopy?.state === "ready";
  const mediaReady = readiness?.media?.state === "ready";
  const sections = draftSections(draft);

  return (
    <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)_320px]">
      <aside className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Growth Brief</CardTitle>
            <CardDescription>Selected brand, audience, campaign goal, platform targets and active presenter.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Voice</p>
              <p>{brand.data?.brandVoice || EQUIPROFILE_BRAND_PRESET.brandVoice}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Audience</p>
              <p>{brand.data?.targetAudience || EQUIPROFILE_BRAND_PRESET.targetAudience}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">CTA</p>
              <Badge variant="secondary">{brand.data?.primaryCta || EQUIPROFILE_BRAND_PRESET.primaryCta}</Badge>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Active avatar / presenter</p>
              <p>{EQUIPROFILE_BRAND_PRESET.avatarPersona}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Connected platforms</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {connectedLabels.length ? connectedLabels.map((label) => (
              <div key={label} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                {label}
              </div>
            )) : (
              <p className="text-sm text-muted-foreground">No publishing accounts connected. Draft mode is available.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick goals</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {["Stable owner leads", "School trial signups", "Launch week", "Reactivation"].map((goal) => (
              <Button key={goal} size="sm" variant="outline" onClick={() => setCommand(`Create a premium ${goal.toLowerCase()} campaign for EquiProfile.`)}>
                {goal}
              </Button>
            ))}
          </CardContent>
        </Card>
      </aside>

      <section className="space-y-5">
        <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:bg-card">
          <CardHeader className="border-b bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950 text-white">
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Sparkles className="h-5 w-5 text-emerald-300" />
                  AI campaign command
                </CardTitle>
                <CardDescription className="text-slate-300">
                  Type one instruction. The Studio infers platform, format, audience, goal, script needs, media plan and next actions.
                </CardDescription>
              </div>
              <Badge variant={aiReady ? "default" : "secondary"}>{aiReady ? "AI copy ready" : "Setup needed"}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 p-5">
            {!aiReady && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <p className="font-semibold">AI setup required — add GenX base URL and run provider test.</p>
                <p className="mt-1">{readiness?.aiCopy?.message || "Open Settings, add GenX key/base URL/model, then run the provider test."}</p>
              </div>
            )}
            <Textarea
              rows={5}
              value={command}
              onChange={(event) => setCommand(event.target.value)}
              placeholder="Create a 30-second Facebook reel for UK stable owners."
              className="text-base"
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button disabled={createDraft.isPending || command.trim().length < 10} onClick={() => createDraft.mutate({ prompt: command })}>
                {createDraft.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                Generate polished campaign
              </Button>
              <Button variant="outline" disabled={!draft} onClick={() => setCommand(draft?.script || command)}>Edit</Button>
              {["Improve hook", "Make shorter", "Make more premium"].map((action) => (
                <Button key={action} variant="outline" disabled={!draft && action !== "Make more premium"} onClick={() => setCommand(`${action}: ${draft?.script || command}`)}>
                  {action}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Generated assistant answer</CardTitle>
            <CardDescription>Clean creative output. Backend/provider details stay in Settings.</CardDescription>
          </CardHeader>
          <CardContent>
            {!draft ? (
              <EmptyState title="Ready for your first command" body="Try: Create a 30-second Facebook reel for UK stable owners." />
            ) : (
              <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  {sections.map(([label, value]) => (
                    <div key={label} className="rounded-xl border bg-slate-50/70 p-4 dark:bg-slate-900/30">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
                      <p className="mt-2 whitespace-pre-wrap text-sm">{String(value || "Not generated yet.")}</p>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2 border-t pt-4">
                  <Button variant="outline" onClick={() => createDraft.mutate({ prompt: `Regenerate with a sharper hook: ${command}` })}>Regenerate</Button>
                  <Button variant="outline" disabled={!mediaReady} onClick={() => createMediaJob.mutate({ task: "text_to_image", prompt: draft.imagePrompt || command, draftId: draft.id })}>Generate image</Button>
                  <Button variant="outline" disabled={!mediaReady} onClick={() => createMediaJob.mutate({ task: "text_to_video", prompt: draft.videoPrompt || draft.script || command, draftId: draft.id })}>Generate video</Button>
                  <Button onClick={() => sendToApproval.mutate({ id: draft.id })}><Send className="mr-2 h-4 w-4" />Send to approval</Button>
                  <div className="flex min-w-[260px] flex-1 gap-2">
                    <Input type="datetime-local" value={scheduleAt} onChange={(event) => setScheduleAt(event.target.value)} />
                    <Button variant="secondary" disabled={!scheduleAt} onClick={() => scheduleDraft.mutate({ id: draft.id, scheduleAt: new Date(scheduleAt).toISOString() })}>Schedule</Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <aside className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-2xl border bg-gradient-to-br from-white to-slate-100 p-4 shadow-inner dark:from-slate-900 dark:to-slate-950">
              <p className="text-xs font-semibold text-muted-foreground">{draft?.platform || "Facebook"} preview</p>
              <p className="mt-3 text-lg font-semibold">{draft?.hook || "Your polished campaign preview will appear here."}</p>
              <p className="mt-3 text-sm text-muted-foreground">{draft?.caption || "Generate a draft to see caption, CTA and media direction."}</p>
              <div className="mt-4 aspect-video rounded-xl bg-slate-200/80 p-4 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {draft?.imagePrompt || "Media visual direction preview"}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Growth score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <p className="text-4xl font-bold">{draft?.growthScore?.overallScore ?? "-"}</p>
              <p className="pb-1 text-sm text-muted-foreground">/100</p>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{draft?.growthScore?.reasons?.[0] || "Generate a draft to score platform fit, clarity and conversion strength."}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Next actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center gap-2"><BadgeCheck className="h-4 w-4 text-emerald-600" /> Review compliance notes</div>
            <div className="flex items-center gap-2"><Image className="h-4 w-4 text-slate-600" /> {readiness?.media?.label || "Check media status"}</div>
            <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-slate-600" /> {approvals.data?.length ?? 0} items waiting</div>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}

function CampaignsTab() {
  const drafts = trpc.admin.listMarketingDrafts.useQuery();
  return (
    <Card>
      <CardHeader>
        <CardTitle>Campaigns</CardTitle>
        <CardDescription>Generated campaign drafts and approval-first campaign work.</CardDescription>
      </CardHeader>
      <CardContent>
        {drafts.isLoading ? <Skeleton className="h-40 w-full" /> : !drafts.data?.length ? <EmptyState title="No campaigns yet" body="Generate from Studio to create the first campaign draft." /> : (
          <div className="overflow-x-auto rounded-xl border">
            <Table>
              <TableHeader><TableRow><TableHead>Campaign</TableHead><TableHead>Platform</TableHead><TableHead>Status</TableHead><TableHead>Updated</TableHead></TableRow></TableHeader>
              <TableBody>
                {drafts.data.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.output?.title || item.output?.hook || "Untitled campaign"}</TableCell>
                    <TableCell>{item.payload?.platform || item.output?.platform || "-"}</TableCell>
                    <TableCell><Badge variant="secondary">{item.status || item.output?.approvalStatus || "draft"}</Badge></TableCell>
                    <TableCell>{item.updatedAt ? new Date(item.updatedAt).toLocaleString() : "-"}</TableCell>
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

function AssetsTab() {
  const diagnostics = trpc.admin.getAIDiagnostics.useQuery();
  const assets = trpc.admin.listMediaAssets.useQuery();
  const readiness = (diagnostics.data as any)?.readiness?.media;
  const assetRows = assets.data ?? [];
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Assets</CardTitle>
          <CardDescription>Truthful media state. Prompt/script assets remain usable when playable media is not connected.</CardDescription>
        </CardHeader>
        <CardContent>
          <Badge variant={readinessVariant(readiness?.state)}>{readiness?.label || "Media status unknown"}</Badge>
          <p className="mt-2 text-sm text-muted-foreground">{readiness?.message || "Run provider diagnostics in Settings."}</p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {assetRows.length ? assetRows.map((asset: any) => (
          <Card key={asset.id} className="overflow-hidden">
            <div className="flex min-h-[180px] items-center justify-center bg-slate-100 dark:bg-slate-900">
              {asset.publicUrl && asset.type === "image" ? <img src={asset.publicUrl} alt="Generated asset" className="h-full max-h-[240px] w-full object-cover" /> : null}
              {asset.publicUrl && (asset.type === "video" || asset.type === "avatar") ? <video src={asset.publicUrl} controls className="max-h-[240px] w-full" /> : null}
              {!asset.publicUrl ? <p className="p-6 text-center text-sm text-muted-foreground">{asset.errorMessage || "Prompt-only or pending media output."}</p> : null}
            </div>
            <CardContent className="space-y-2 p-4">
              <div className="flex flex-wrap gap-2"><Badge>{asset.status}</Badge><Badge variant="outline">{asset.type}</Badge></div>
              <p className="text-xs text-muted-foreground">{asset.task} via {asset.provider}</p>
            </CardContent>
          </Card>
        )) : <div className="md:col-span-2 xl:col-span-3"><EmptyState title="No assets yet" body="Generated media, prompt-only outputs, and failed jobs will appear here truthfully." /></div>}
      </div>
    </div>
  );
}

function AudienceTab() {
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ email: "", name: "", organizationName: "", tags: "", source: "manual" });
  const contacts = trpc.admin.getMarketingContacts.useQuery({ search: search || undefined, limit: 200, offset: 0 });
  const createContact = trpc.admin.createMarketingContact.useMutation({
    onSuccess: () => {
      toast.success("Contact added");
      setForm({ email: "", name: "", organizationName: "", tags: "", source: "manual" });
      utils.admin.getMarketingContacts.invalidate();
    },
    onError: (error) => toast.error("Could not add contact", { description: error.message }),
  });

  function exportCsv() {
    const rows = contacts.data ?? [];
    if (!rows.length) return toast.error("No contacts to export");
    const csv = ["email,name,organization,tags,status,source", ...rows.map((c: any) => [c.email, c.name, c.organizationName || c.businessName, c.tags, c.status, c.source].map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","))].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `marketing-contacts-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Audience</CardTitle>
          <CardDescription>Add, search, segment, import/export, and respect suppression before outreach.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
          <Input placeholder="Email" value={form.email} onChange={(event) => setForm((p) => ({ ...p, email: event.target.value }))} />
          <Input placeholder="Name" value={form.name} onChange={(event) => setForm((p) => ({ ...p, name: event.target.value }))} />
          <Button disabled={!form.email} onClick={() => createContact.mutate({ ...form, tags: form.tags || undefined })}>Add contact</Button>
          <Input placeholder="Organisation" value={form.organizationName} onChange={(event) => setForm((p) => ({ ...p, organizationName: event.target.value }))} />
          <Input placeholder="Tags / segment" value={form.tags} onChange={(event) => setForm((p) => ({ ...p, tags: event.target.value }))} />
          <Button variant="outline" onClick={exportCsv}><Download className="mr-2 h-4 w-4" />Export CSV</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Contact list</CardTitle>
              <CardDescription>Suppressed contacts are excluded from campaign sends.</CardDescription>
            </div>
            <div className="relative md:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search contacts" value={search} onChange={(event) => setSearch(event.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {contacts.isLoading ? <Skeleton className="h-48 w-full" /> : !contacts.data?.length ? <EmptyState title="No contacts found" body="Add a contact or import CSV from the existing admin import flow." /> : (
            <div className="overflow-x-auto rounded-xl border">
              <Table>
                <TableHeader><TableRow><TableHead>Email</TableHead><TableHead>Name</TableHead><TableHead>Tags/segments</TableHead><TableHead>Status</TableHead><TableHead>Source</TableHead></TableRow></TableHeader>
                <TableBody>
                  {contacts.data.map((contact: any) => (
                    <TableRow key={String(contact.id ?? contact.email)}>
                      <TableCell className="font-medium">{contact.email}</TableCell>
                      <TableCell>{contact.name || contact.organizationName || contact.businessName || "-"}</TableCell>
                      <TableCell>{contact.tags || "-"}</TableCell>
                      <TableCell><Badge variant={contact.status === "unsubscribed" ? "destructive" : "secondary"}>{contact.status || "active"}</Badge></TableCell>
                      <TableCell>{contact.source || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <SuppressionPanel />
    </div>
  );
}

function SuppressionPanel() {
  const utils = trpc.useUtils();
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const suppressions = trpc.admin.getMarketingContacts.useQuery({ status: "unsubscribed", limit: 100, offset: 0 });
  const addSuppression = trpc.admin.addSuppression.useMutation({ onSuccess: () => { toast.success("Suppression added"); setEmail(""); setReason(""); utils.admin.getMarketingContacts.invalidate(); } });
  const removeSuppression = trpc.admin.removeSuppression.useMutation({ onSuccess: () => { toast.success("Suppression removed"); utils.admin.getMarketingContacts.invalidate(); } });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-amber-600" />Suppression warning</CardTitle>
        <CardDescription>Never contact suppressed or unsubscribed addresses.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <Input placeholder="email@example.com" value={email} onChange={(event) => setEmail(event.target.value)} />
          <Input placeholder="Reason" value={reason} onChange={(event) => setReason(event.target.value)} />
          <Button variant="outline" disabled={!email} onClick={() => addSuppression.mutate({ email, reason })}>Suppress</Button>
        </div>
        {!suppressions.data?.length ? <p className="text-sm text-muted-foreground">No suppressed contacts in this filtered view.</p> : (
          <div className="space-y-2">
            {suppressions.data.slice(0, 8).map((contact: any) => (
              <div key={String(contact.id ?? contact.email)} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                <span>{contact.email}</span>
                <Button size="sm" variant="ghost" onClick={() => removeSuppression.mutate({ email: contact.email })}>Remove</Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PlatformsTab() {
  const utils = trpc.useUtils();
  const diagnostics = trpc.admin.getAIDiagnostics.useQuery();
  const updateConnection = trpc.growthEngine.updateSocialConnection.useMutation({
    onSuccess: () => {
      toast.success("Platform saved in draft mode");
      utils.admin.getAIDiagnostics.invalidate();
      utils.growthEngine.getOverview.invalidate();
    },
  });
  const connections = (diagnostics.data as any)?.socialConnections ?? [];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {PLATFORM_CONNECTION_CARDS.map((platform) => {
        const isSocialConnection = platform.growthPlatform !== "email";
        const connection = connections.find((item: any) => item.platform === platform.growthPlatform);
        const state = connection?.state || "not_connected";
        const connected = ["connected", "approval_required", "ready_to_publish"].includes(state);
        return (
          <Card key={platform.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base">{platform.label}</CardTitle>
                  <CardDescription>{platform.requirement}</CardDescription>
                </div>
                <Badge variant={connected ? "default" : state === "error" ? "destructive" : "secondary"}>
                  {connected ? "Connected" : state === "draft_only" ? "Draft mode" : state === "error" ? "Error" : "Not connected"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p><span className="font-medium">Draft mode:</span> available</p>
              <p><span className="font-medium">Publishing:</span> {isSocialConnection ? "not enabled until OAuth/backend publishing is complete" : "handled through Email Studio and SMTP readiness, not social OAuth"}</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" disabled>Connect</Button>
                <Button
                  disabled={!isSocialConnection}
                  onClick={() => updateConnection.mutate({ tenantId: "global", platform: platform.growthPlatform as any, state: "draft_only", metadata: { label: platform.label, source: "marketing_studio" } })}
                >
                  Use draft mode
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function BrandTab() {
  const utils = trpc.useUtils();
  const brand = trpc.admin.getBrandProfile.useQuery({ tenantId: "global" });
  const avatars = trpc.admin.listBrandAvatars.useQuery({ tenantId: "global" });
  const [brandForm, setBrandForm] = useState({
    businessProfile: "",
    targetAudience: "",
    brandVoice: "",
    contentPillars: "",
    primaryCta: "",
    visualIdentity: "",
    avatarPersona: "",
    prohibitedClaims: "",
    approvedClaims: "",
    platformDefaults: "",
  });
  const [avatarForm, setAvatarForm] = useState({
    name: "",
    role: "",
    visualDescription: "",
    wardrobeRules: "",
    backgroundRules: "",
    voiceStyle: "",
    accent: "",
    personality: "",
    promptTemplate: "",
  });

  useEffect(() => {
    if (!brand.data) return;
    setBrandForm({
      businessProfile: brand.data.positioning ?? "",
      targetAudience: brand.data.targetAudience ?? "",
      brandVoice: brand.data.brandVoice ?? "",
      contentPillars: (brand.data.contentPillars ?? []).join(", "),
      primaryCta: brand.data.primaryCta ?? "",
      visualIdentity: "",
      avatarPersona: "",
      prohibitedClaims: (brand.data.prohibitedClaims ?? []).join(", "),
      approvedClaims: (brand.data.approvedClaims ?? []).join(", "),
      platformDefaults: brand.data.hashtagStyle ?? "",
    });
  }, [brand.data]);

  const saveBrand = trpc.admin.updateBrandProfile.useMutation({
    onSuccess: () => { toast.success("Brand DNA saved"); utils.admin.getBrandProfile.invalidate(); },
    onError: (error) => toast.error("Could not save Brand DNA", { description: error.message }),
  });
  const createAvatar = trpc.admin.createBrandAvatar.useMutation({
    onSuccess: () => { toast.success("Avatar profile created"); utils.admin.listBrandAvatars.invalidate(); },
    onError: (error) => toast.error("Could not create avatar", { description: error.message }),
  });
  const archiveAvatar = trpc.admin.archiveBrandAvatar.useMutation({ onSuccess: () => utils.admin.listBrandAvatars.invalidate() });

  function applyPreset() {
    setBrandForm({
      businessProfile: EQUIPROFILE_BRAND_PRESET.businessProfile,
      targetAudience: EQUIPROFILE_BRAND_PRESET.targetAudience,
      brandVoice: EQUIPROFILE_BRAND_PRESET.brandVoice,
      contentPillars: EQUIPROFILE_BRAND_PRESET.contentPillars.join(", "),
      primaryCta: EQUIPROFILE_BRAND_PRESET.primaryCta,
      visualIdentity: EQUIPROFILE_BRAND_PRESET.visualIdentity,
      avatarPersona: EQUIPROFILE_BRAND_PRESET.avatarPersona,
      prohibitedClaims: EQUIPROFILE_BRAND_PRESET.prohibitedClaims.join(", "),
      approvedClaims: EQUIPROFILE_BRAND_PRESET.approvedClaims.join(", "),
      platformDefaults: EQUIPROFILE_BRAND_PRESET.platformDefaults,
    });
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Brand DNA</CardTitle>
              <CardDescription>Guided identity for campaign generation, platform defaults, and compliance.</CardDescription>
            </div>
            <Button variant="outline" onClick={applyPreset}><Palette className="mr-2 h-4 w-4" />Apply EquiProfile preset</Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-2">
          {[
            ["Business profile", "businessProfile"],
            ["Target audience", "targetAudience"],
            ["Brand voice", "brandVoice"],
            ["Content pillars", "contentPillars"],
            ["Offer / CTA", "primaryCta"],
            ["Visual identity", "visualIdentity"],
            ["Avatar / persona", "avatarPersona"],
            ["Compliance guardrails", "prohibitedClaims"],
            ["Platform defaults", "platformDefaults"],
          ].map(([label, key]) => (
            <div key={key} className="space-y-2">
              <Label>{label}</Label>
              <Textarea rows={key === "primaryCta" ? 1 : 3} value={(brandForm as any)[key]} onChange={(event) => setBrandForm((p) => ({ ...p, [key]: event.target.value }))} />
            </div>
          ))}
          <div className="space-y-2">
            <Label>Approved claims</Label>
            <Textarea rows={3} value={brandForm.approvedClaims} onChange={(event) => setBrandForm((p) => ({ ...p, approvedClaims: event.target.value }))} />
          </div>
          <Button className="lg:col-span-2" onClick={() => saveBrand.mutate({
            tenantId: "global",
            name: EQUIPROFILE_BRAND_PRESET.name,
            positioning: `${brandForm.businessProfile}\n\nVisual identity: ${brandForm.visualIdentity}\n\nAvatar persona: ${brandForm.avatarPersona}`,
            targetAudience: brandForm.targetAudience,
            brandVoice: brandForm.brandVoice,
            primaryCta: brandForm.primaryCta,
            contentPillars: brandForm.contentPillars.split(",").map((item) => item.trim()).filter(Boolean),
            prohibitedClaims: brandForm.prohibitedClaims.split(",").map((item) => item.trim()).filter(Boolean),
            approvedClaims: brandForm.approvedClaims.split(",").map((item) => item.trim()).filter(Boolean),
            hashtagStyle: brandForm.platformDefaults,
          })}>Save Brand DNA</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Avatar / Presenter</CardTitle>
          <CardDescription>Avatar scripts can be generated now. Playable avatar video requires configured video/avatar provider.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <div className="grid gap-3 md:grid-cols-2">
            <Input placeholder="Avatar name" value={avatarForm.name} onChange={(event) => setAvatarForm((p) => ({ ...p, name: event.target.value }))} />
            <Input placeholder="Role" value={avatarForm.role} onChange={(event) => setAvatarForm((p) => ({ ...p, role: event.target.value }))} />
            <Input placeholder="Voice/accent" value={avatarForm.accent} onChange={(event) => setAvatarForm((p) => ({ ...p, accent: event.target.value }))} />
            <Input placeholder="Voice style" value={avatarForm.voiceStyle} onChange={(event) => setAvatarForm((p) => ({ ...p, voiceStyle: event.target.value }))} />
            <Textarea rows={3} placeholder="Visual identity" value={avatarForm.visualDescription} onChange={(event) => setAvatarForm((p) => ({ ...p, visualDescription: event.target.value }))} />
            <Textarea rows={3} placeholder="Outfit/style" value={avatarForm.wardrobeRules} onChange={(event) => setAvatarForm((p) => ({ ...p, wardrobeRules: event.target.value }))} />
            <Textarea rows={3} placeholder="Personality" value={avatarForm.personality} onChange={(event) => setAvatarForm((p) => ({ ...p, personality: event.target.value }))} />
            <Textarea rows={3} placeholder="Consistency rules / prompt template" value={avatarForm.promptTemplate} onChange={(event) => setAvatarForm((p) => ({ ...p, promptTemplate: event.target.value }))} />
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground md:col-span-2">Reference image upload / asset selector placeholder. Use Assets once provider-backed uploads are connected.</div>
            <Button className="md:col-span-2" disabled={!avatarForm.name} onClick={() => createAvatar.mutate({ tenantId: "global", ...avatarForm })}>Save avatar presenter</Button>
          </div>
          <div className="space-y-3">
            <div className="rounded-2xl border bg-slate-50 p-4 dark:bg-slate-900/40">
              <p className="text-xs font-medium text-muted-foreground">Preview card</p>
              <p className="mt-2 text-lg font-semibold">{avatarForm.name || "Presenter name"}</p>
              <p className="text-sm">{avatarForm.role || "Equestrian marketing presenter"}</p>
              <p className="mt-3 text-sm text-muted-foreground">{avatarForm.visualDescription || "Visual identity and consistency rules appear here."}</p>
            </div>
            {(avatars.data ?? []).map((avatar: any) => (
              <div key={avatar.id} className="rounded-lg border p-3">
                <div className="flex items-center justify-between gap-3">
                  <div><p className="font-medium">{avatar.name}</p><p className="text-xs text-muted-foreground">{avatar.role || avatar.voiceStyle || "Presenter"}</p></div>
                  <Button size="sm" variant="outline" onClick={() => archiveAvatar.mutate({ id: avatar.id })}>Archive</Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ApprovalsTab() {
  const drafts = trpc.admin.listApprovalQueue.useQuery();
  return (
    <Card>
      <CardHeader><CardTitle>Approvals</CardTitle><CardDescription>Review queue before scheduling or publishing.</CardDescription></CardHeader>
      <CardContent>
        {!drafts.data?.length ? <EmptyState title="Approval queue is clear" body="Send a generated item to approval from Studio." /> : (
          <div className="space-y-3">
            {drafts.data.map((item: any) => (
              <div key={item.id} className="rounded-xl border p-4">
                <p className="font-semibold">{item.output?.title || item.output?.hook || "Approval item"}</p>
                <p className="mt-1 text-sm text-muted-foreground">{item.output?.caption || item.output?.script || "No preview text"}</p>
              </div>
            ))}
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
      <CardHeader><CardTitle>Calendar</CardTitle><CardDescription>Scheduled approved campaign items.</CardDescription></CardHeader>
      <CardContent>
        {!calendar.data?.length ? <EmptyState title="Nothing scheduled" body="Approved items scheduled from Studio will appear here." /> : (
          <div className="grid gap-3 md:grid-cols-2">
            {calendar.data.map((item: any) => (
              <div key={item.id} className="rounded-xl border p-4">
                <Badge>Scheduled</Badge>
                <p className="mt-3 font-semibold">{item.output?.title || "Scheduled campaign"}</p>
                <p className="text-sm text-muted-foreground">{item.scheduleAt ? new Date(item.scheduleAt).toLocaleString() : "No date"}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SettingsTab() {
  const utils = trpc.useUtils();
  const diagnostics = trpc.admin.getAIDiagnostics.useQuery();
  const siteSettings = trpc.admin.getSiteSettings.useQuery();
  const fullProviderTest = trpc.admin.runFullProviderTest.useMutation({ onSuccess: () => { toast.success("Provider test complete"); utils.admin.getAIDiagnostics.invalidate(); } });
  const rawGenXTest = trpc.admin.testRawGenXConnection.useMutation({ onSuccess: () => utils.admin.getAIDiagnostics.invalidate() });
  const setSetting = trpc.admin.setSiteSetting.useMutation({
    onSuccess: () => {
      toast.success("Setting saved");
      utils.admin.getAIDiagnostics.invalidate();
      utils.admin.getSiteSettings.invalidate();
    },
    onError: (error) => toast.error("Setting was not saved", { description: error.message }),
  });
  const [settings, setSettings] = useState({
    genx_api_key: "",
    genx_base_url: "",
    genx_model: "",
    huggingface_api_key: "",
    hf_task_text_to_image_model: "",
    hf_task_text_to_video_model: "",
    hf_task_avatar_video_model: "",
    hf_task_copywriting_model: "",
    qwen_api_key: "",
    qwen_base_url: "",
    qwen_model: "",
  });
  const providerHealth = diagnostics.data?.providerHealth ?? [];

  useEffect(() => {
    const saved = siteSettings.data as Record<string, string> | undefined;
    if (!saved) return;
    setSettings((current) => ({
      ...current,
      genx_base_url: saved.genx_base_url ?? current.genx_base_url,
      genx_model: saved.genx_model ?? current.genx_model,
      hf_task_text_to_image_model: saved.hf_task_text_to_image_model ?? current.hf_task_text_to_image_model,
      hf_task_text_to_video_model: saved.hf_task_text_to_video_model ?? current.hf_task_text_to_video_model,
      hf_task_avatar_video_model: saved.hf_task_avatar_video_model ?? current.hf_task_avatar_video_model,
      hf_task_copywriting_model: saved.hf_task_copywriting_model ?? current.hf_task_copywriting_model,
      qwen_base_url: saved.qwen_base_url ?? current.qwen_base_url,
      qwen_model: saved.qwen_model ?? current.qwen_model,
    }));
  }, [siteSettings.data]);

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader><CardTitle>Technical provider settings</CardTitle><CardDescription>Keys, base URLs, models, live tests, queue mode, task matrix, and raw failures live here only.</CardDescription></CardHeader>
        <CardContent className="grid gap-3 lg:grid-cols-2">
          {Object.entries(settings).map(([key, value]) => {
            const isSecret = key.includes("key");
            return (
            <div key={key} className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <Input type={isSecret ? "password" : "text"} placeholder={isSecret ? `${key} (saved securely; leave blank unless replacing)` : key} value={value} onChange={(event) => setSettings((p) => ({ ...p, [key]: event.target.value }))} />
              <Button variant="outline" disabled={!value || setSetting.isPending} onClick={() => setSetting.mutate({ key, value })}>Save</Button>
            </div>
          );})}
          <div className="flex flex-wrap gap-2 lg:col-span-2">
            <Button onClick={() => fullProviderTest.mutate()} disabled={fullProviderTest.isPending}>Run full provider tests</Button>
            <Button variant="outline" onClick={() => rawGenXTest.mutate()} disabled={rawGenXTest.isPending}>Test raw GenX connection</Button>
          </div>
          {rawGenXTest.data && (
            <div className="rounded-xl border bg-slate-50 p-4 text-sm lg:col-span-2 dark:bg-slate-900/30">
              <p className="font-semibold">Raw GenX diagnostic</p>
              <p>Endpoint: {rawGenXTest.data.endpoint || "missing"}</p>
              <p>Status: {rawGenXTest.data.status} {rawGenXTest.data.statusCode ? `(${rawGenXTest.data.statusCode})` : ""}</p>
              <p>Latency: {rawGenXTest.data.latencyMs}ms</p>
              <p className="mt-2 text-muted-foreground">{rawGenXTest.data.responseSummary}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        {providerHealth.map((provider: any) => (
          <Card key={provider.provider}>
            <CardHeader><CardTitle className="capitalize text-base">{provider.provider}</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Badge variant={provider.liveReady ? "default" : provider.configured ? "secondary" : "outline"}>{provider.liveReady ? "Live test passed" : provider.configured ? "Configured, not ready" : "Missing"}</Badge>
              <p>{provider.message}</p>
              {!provider.liveReady && provider.configured ? <p className="text-xs text-amber-700 dark:text-amber-300">Repair guidance: confirm key, base URL and model, then run provider tests.</p> : null}
              <p className="text-xs text-muted-foreground">Endpoint: {provider.endpoint || "missing"}</p>
              <p className="text-xs text-muted-foreground">Model: {provider.model || "missing"}</p>
              {provider.lastSuccessAt ? <p className="text-xs text-muted-foreground">Last success: {new Date(provider.lastSuccessAt).toLocaleString()}</p> : null}
              {provider.lastTestAt ? <p className="text-xs text-muted-foreground">Last test: {new Date(provider.lastTestAt).toLocaleString()}</p> : null}
              {provider.lastError ? <p className="text-xs text-destructive">{provider.lastError}</p> : null}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Raw diagnostics</CardTitle></CardHeader>
        <CardContent>
          <pre className="max-h-[360px] overflow-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-100">{JSON.stringify({
            readiness: (diagnostics.data as any)?.readiness,
            queue: diagnostics.data?.queue,
            taskCapabilities: diagnostics.data?.taskCapabilities,
            recentFailures: diagnostics.data?.recentFailures,
            outboundNetwork: (diagnostics.data as any)?.outboundNetwork,
          }, null, 2)}</pre>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminCampaigns({ onBackToAdmin }: { onBackToAdmin?: () => void }) {
  const [activeTab, setActiveTab] = useState<StudioNav>("studio");
  const diagnostics = trpc.admin.getAIDiagnostics.useQuery();
  const readiness = (diagnostics.data as any)?.readiness;

  const tabMeta = useMemo(() => ({
    studio: { label: "Studio", icon: Sparkles },
    campaigns: { label: "Campaigns", icon: Megaphone },
    assets: { label: "Assets", icon: Image },
    audience: { label: "Audience", icon: Users },
    platforms: { label: "Platforms", icon: RadioTower },
    brand: { label: "Brand DNA", icon: Building2 },
    approvals: { label: "Approvals", icon: Inbox },
    calendar: { label: "Calendar", icon: CalendarDays },
    settings: { label: "Settings", icon: Settings },
  }), []);

  return (
    <div className="min-h-screen bg-slate-50 px-3 py-4 text-slate-950 dark:bg-slate-950 dark:text-slate-50 sm:px-5 lg:px-6">
      <div className="mx-auto max-w-[1600px] space-y-5">
        <header className="rounded-3xl border bg-white p-5 shadow-sm dark:bg-card">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-start gap-4">
              {onBackToAdmin ? (
                <Button variant="outline" size="sm" onClick={onBackToAdmin}><ArrowLeft className="mr-2 h-4 w-4" />Admin</Button>
              ) : null}
              <div>
                <h1 className="text-3xl font-bold tracking-tight">EquiProfile Marketing Studio</h1>
                <p className="mt-2 max-w-3xl text-sm text-muted-foreground">Your AI marketing team for campaigns, content, media and growth.</p>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:w-[620px]">
              <StudioStatusChip label={readiness?.aiCopy?.label || "AI copy"} state={readiness?.aiCopy?.state} message={readiness?.aiCopy?.message} />
              <StudioStatusChip label={readiness?.media?.label || "Media"} state={readiness?.media?.state} message={readiness?.media?.message} />
              <StudioStatusChip label={readiness?.storage?.label || "Storage"} state={readiness?.storage?.state} message={readiness?.storage?.message} />
              <StudioStatusChip label={readiness?.platforms?.label || "Platforms"} state={readiness?.platforms?.state} message={readiness?.platforms?.message} />
            </div>
          </div>
        </header>

        <div className="grid gap-5 lg:grid-cols-[230px_minmax(0,1fr)]">
          <nav className="rounded-2xl border bg-white p-2 shadow-sm dark:bg-card">
            {STUDIO_NAV.map((tab) => {
              const Icon = tabMeta[tab].icon;
              return (
                <Button key={tab} variant={activeTab === tab ? "default" : "ghost"} className="mb-1 w-full justify-start" onClick={() => setActiveTab(tab)}>
                  <Icon className="mr-2 h-4 w-4" />
                  {tabMeta[tab].label}
                </Button>
              );
            })}
          </nav>

          <main>
            {activeTab === "studio" && <StudioHome />}
            {activeTab === "campaigns" && <CampaignsTab />}
            {activeTab === "assets" && <AssetsTab />}
            {activeTab === "audience" && <AudienceTab />}
            {activeTab === "platforms" && <PlatformsTab />}
            {activeTab === "brand" && <BrandTab />}
            {activeTab === "approvals" && <ApprovalsTab />}
            {activeTab === "calendar" && <CalendarTab />}
            {activeTab === "settings" && <SettingsTab />}
          </main>
        </div>
      </div>
    </div>
  );
}
