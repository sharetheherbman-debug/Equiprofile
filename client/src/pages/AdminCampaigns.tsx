/**
 * Hidden Admin Marketing Studio.
 *
 * Single source of truth for internal campaigns, CRM, AI content drafting,
 * approval queue review, provider diagnostics, and social-growth readiness.
 */
import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  AlertCircle,
  BarChart3,
  Bot,
  CalendarDays,
  CheckCircle2,
  Clock,
  Clapperboard,
  Image,
  Inbox,
  Loader2,
  Mail,
  Megaphone,
  Palette,
  Plus,
  RadioTower,
  Send,
  Settings,
  ShieldBan,
  Sparkles,
  TableProperties,
  Users,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

const tabs = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "composer", label: "Composer", icon: Sparkles },
  { id: "email", label: "Email Studio", icon: Mail },
  { id: "audience", label: "Audience / CRM", icon: Users },
  { id: "suppression", label: "Suppression List", icon: ShieldBan },
  { id: "sequences", label: "Sequences", icon: Clock },
  { id: "replies", label: "Replies / Inbox", icon: Inbox },
  { id: "media", label: "Media Studio", icon: Image },
  { id: "avatar", label: "Avatar Studio", icon: Bot },
  { id: "video", label: "Video Studio", icon: Clapperboard },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "approval", label: "Approval Queue", icon: CheckCircle2 },
  { id: "platforms", label: "Platforms", icon: RadioTower },
  { id: "analytics", label: "Analytics", icon: TableProperties },
  { id: "settings", label: "Settings", icon: Settings },
  { id: "diagnostics", label: "AI Providers / Diagnostics", icon: Palette },
] as const;

type StudioTab = (typeof tabs)[number]["id"];

function SectionHeader({
  title,
  purpose,
  action,
}: {
  title: string;
  purpose: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        <p className="text-sm text-muted-foreground mt-1">{purpose}</p>
      </div>
      {action}
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
}) {
  return (
    <div className="ep-empty rounded-lg border border-dashed bg-muted/20">
      <Icon className="h-8 w-8 text-muted-foreground/50" />
      <p className="font-medium text-foreground">{title}</p>
      <p className="max-w-md text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

function ComingSoonPanel({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{body}</CardDescription>
      </CardHeader>
      <CardContent>
        <Badge variant="secondary">Internal beta surface</Badge>
      </CardContent>
    </Card>
  );
}

function OverviewTab() {
  const segments = trpc.admin.getSegmentCounts.useQuery();
  const campaigns = trpc.admin.getCampaigns.useQuery();
  const diagnostics = trpc.admin.getAIDiagnostics.useQuery(undefined, {
    staleTime: 30_000,
  });
  const growth = trpc.growthEngine.getOverview.useQuery({ tenantId: "global" });

  const activeCampaigns = (campaigns.data ?? []).filter(
    (c: any) => c.status === "draft" || c.status === "paused",
  ).length;

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Marketing Studio overview"
        purpose="A single internal view for campaign health, audience readiness, approval queues, and provider status."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Marketing contacts", segments.data?.marketing ?? 0],
          ["Suppressed", segments.data?.unsubscribed ?? 0],
          ["Campaigns ready", activeCampaigns],
          ["Pending approvals", diagnostics.data?.queue.pendingApprovals ?? 0],
        ].map(([label, value]) => (
          <Card key={label}>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="mt-2 text-3xl font-semibold">
                {segments.isLoading || campaigns.isLoading || diagnostics.isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  value
                )}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Growth Engine</CardTitle>
            <CardDescription>Backend foundation health and queued lifecycle activity.</CardDescription>
          </CardHeader>
          <CardContent>
            {growth.isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : growth.error ? (
              <p className="text-sm text-destructive">{growth.error.message}</p>
            ) : (
              <pre className="max-h-56 overflow-auto rounded-lg bg-muted p-3 text-xs">
                {JSON.stringify(growth.data ?? {}, null, 2)}
              </pre>
            )}
          </CardContent>
        </Card>
        <ProviderHealthCard />
      </div>
    </div>
  );
}

function ComposerTab() {
  const [kind, setKind] = useState<
    "social_post" | "email_campaign" | "launch_calendar" | "image_prompt" | "video_prompt" | "avatar_script"
  >("social_post");
  const [platform, setPlatform] = useState("LinkedIn");
  const [prompt, setPrompt] = useState(
    "Announce EquiProfile beta readiness for stable owners without making fake claims.",
  );
  const generate = trpc.admin.generateMarketingDraft.useMutation({
    onSuccess: (data) => {
      toast.success("Draft sent to approval queue", {
        description: data.approvalId ? `Approval ${data.approvalId}` : data.status,
      });
    },
    onError: (error) => toast.error("Draft generation failed", { description: error.message }),
  });

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Composer"
        purpose="Generate approval-first drafts for social, email, launch calendars, media prompts, video prompts, and avatar scripts."
        action={
          <Button
            onClick={() => generate.mutate({ kind, prompt, platform })}
            disabled={generate.isPending || prompt.trim().length < 10}
          >
            {generate.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Generate Draft
          </Button>
        }
      />
      <Card>
        <CardContent className="grid gap-4 p-5 lg:grid-cols-[220px_220px_1fr]">
          <div className="space-y-2">
            <Label>Draft type</Label>
            <select
              value={kind}
              onChange={(event) => setKind(event.target.value as any)}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            >
              <option value="social_post">Social post draft</option>
              <option value="email_campaign">Email campaign draft</option>
              <option value="launch_calendar">7-day launch calendar</option>
              <option value="image_prompt">Image prompt</option>
              <option value="video_prompt">Video prompt</option>
              <option value="avatar_script">Avatar script</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>Platform</Label>
            <Input value={platform} onChange={(event) => setPlatform(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Brief</Label>
            <Textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={5} />
          </div>
        </CardContent>
      </Card>
      <p className="text-sm text-muted-foreground">
        Generated drafts are queued for review. Direct social publishing is intentionally disabled for beta.
      </p>
    </div>
  );
}

function EmailStudioTab() {
  const utils = trpc.useUtils();
  const campaigns = trpc.admin.getCampaigns.useQuery();
  const templates = trpc.admin.getTemplates.useQuery();
  const [form, setForm] = useState({
    name: "",
    subject: "",
    templateId: "general",
    segment: "marketing" as "leads" | "trial" | "paid" | "all" | "marketing",
    content: "",
  });
  const create = trpc.admin.createCampaign.useMutation({
    onSuccess: () => {
      toast.success("Campaign draft created");
      setForm((prev) => ({ ...prev, name: "", subject: "", content: "" }));
      utils.admin.getCampaigns.invalidate();
    },
    onError: (error) => toast.error("Campaign draft failed", { description: error.message }),
  });
  const send = trpc.admin.sendCampaign.useMutation({
    onSuccess: () => {
      toast.success("Campaign send queued");
      utils.admin.getCampaigns.invalidate();
    },
    onError: (error) => toast.error("Send blocked", { description: error.message }),
  });

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Email Studio"
        purpose="Create campaign drafts from existing branded templates and send only through the guarded backend policy."
        action={
          <Button
            onClick={() =>
              create.mutate({
                ...form,
                mergeFields: { subject: form.subject, content: form.content },
              })
            }
            disabled={create.isPending || !form.name || !form.subject || !form.templateId}
          >
            {create.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Create Draft
          </Button>
        }
      />
      <Card>
        <CardContent className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">
          <Input placeholder="Campaign name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input placeholder="Subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
          <select
            value={form.templateId}
            onChange={(e) => setForm({ ...form, templateId: e.target.value })}
            className="h-10 rounded-md border bg-background px-3 text-sm"
          >
            {(templates.data ?? []).map((template: any) => (
              <option key={template.id} value={template.id}>{template.name}</option>
            ))}
          </select>
          <select
            value={form.segment}
            onChange={(e) => setForm({ ...form, segment: e.target.value as any })}
            className="h-10 rounded-md border bg-background px-3 text-sm"
          >
            <option value="marketing">Marketing contacts</option>
            <option value="leads">Chat leads</option>
            <option value="trial">Trial users</option>
            <option value="paid">Paid users</option>
            <option value="all">All active users</option>
          </select>
          <Textarea
            className="md:col-span-2 xl:col-span-4"
            rows={4}
            placeholder="Optional body copy for the general template"
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Campaign history</CardTitle>
          <CardDescription>Existing campaigns remain the operational email source of truth.</CardDescription>
        </CardHeader>
        <CardContent>
          {campaigns.isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : !campaigns.data?.length ? (
            <EmptyState icon={Mail} title="No campaigns yet" body="Create a campaign draft above to start beta testing the guarded send flow." />
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Segment</TableHead>
                    <TableHead>Sent</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.data.slice(0, 12).map((campaign: any) => (
                    <TableRow key={campaign.id}>
                      <TableCell>
                        <p className="font-medium">{campaign.name}</p>
                        <p className="text-xs text-muted-foreground">{campaign.subject}</p>
                      </TableCell>
                      <TableCell><Badge variant="outline">{campaign.status}</Badge></TableCell>
                      <TableCell>{campaign.segment}</TableCell>
                      <TableCell>{campaign.sentCount ?? 0}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => send.mutate({ campaignId: campaign.id })}
                          disabled={send.isPending || campaign.status === "sent"}
                        >
                          <Send className="mr-2 h-3.5 w-3.5" />
                          Send
                        </Button>
                      </TableCell>
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

function AudienceTab({ suppressionOnly = false }: { suppressionOnly?: boolean }) {
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [reason, setReason] = useState("");
  const contacts = trpc.admin.getMarketingContacts.useQuery({
    status: suppressionOnly ? "unsubscribed" : "all",
    search: search || undefined,
    limit: 100,
    offset: 0,
  });
  const createContact = trpc.admin.createMarketingContact.useMutation({
    onSuccess: () => {
      toast.success("Contact added");
      setEmail("");
      setName("");
      utils.admin.getMarketingContacts.invalidate();
      utils.admin.getSegmentCounts.invalidate();
    },
    onError: (error) => toast.error("Contact not added", { description: error.message }),
  });
  const addSuppression = trpc.admin.addSuppression.useMutation({
    onSuccess: () => {
      toast.success("Email suppressed");
      setEmail("");
      setReason("");
      utils.admin.getMarketingContacts.invalidate();
      utils.admin.getSegmentCounts.invalidate();
    },
    onError: (error) => toast.error("Suppression failed", { description: error.message }),
  });
  const removeSuppression = trpc.admin.removeSuppression.useMutation({
    onSuccess: () => {
      toast.success("Suppression removed");
      utils.admin.getMarketingContacts.invalidate();
      utils.admin.getSegmentCounts.invalidate();
    },
    onError: (error) => toast.error("Removal failed", { description: error.message }),
  });

  return (
    <div className="space-y-5">
      <SectionHeader
        title={suppressionOnly ? "Suppression List" : "Audience / CRM"}
        purpose={
          suppressionOnly
            ? "Manage do-not-contact records independently from the main CRM."
            : "Manage marketing contacts without mixing them into email campaign controls."
        }
        action={
          suppressionOnly ? (
            <Button
              onClick={() => addSuppression.mutate({ email, reason })}
              disabled={addSuppression.isPending || !email}
            >
              <ShieldBan className="mr-2 h-4 w-4" />
              Add Suppression
            </Button>
          ) : (
            <Button
              onClick={() => createContact.mutate({ email, name, source: "admin_beta_studio" })}
              disabled={createContact.isPending || !email}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Contact
            </Button>
          )
        }
      />
      <Card>
        <CardContent className="grid gap-4 p-5 md:grid-cols-3">
          <Input placeholder="Search contacts" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          {suppressionOnly ? (
            <Input placeholder="Reason" value={reason} onChange={(e) => setReason(e.target.value)} />
          ) : (
            <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          )}
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-0">
          {contacts.isLoading ? (
            <div className="p-5"><Skeleton className="h-36 w-full" /></div>
          ) : !contacts.data?.length ? (
            <EmptyState
              icon={suppressionOnly ? ShieldBan : Users}
              title={suppressionOnly ? "No suppressions found" : "No contacts found"}
              body={suppressionOnly ? "Add an email to prevent future outreach." : "Add contacts manually or use the existing import tools in backend operations."}
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Name / Organization</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Type</TableHead>
                    {suppressionOnly && <TableHead className="text-right">Action</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contacts.data.map((contact: any) => (
                    <TableRow key={contact.id}>
                      <TableCell className="font-medium">{contact.email}</TableCell>
                      <TableCell>{contact.name || contact.organizationName || contact.businessName || "-"}</TableCell>
                      <TableCell><Badge variant={contact.status === "active" ? "default" : "secondary"}>{contact.status}</Badge></TableCell>
                      <TableCell>{contact.contactType || "individual"}</TableCell>
                      {suppressionOnly && (
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" onClick={() => removeSuppression.mutate({ email: contact.email })}>
                            Remove
                          </Button>
                        </TableCell>
                      )}
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

function SequencesTab() {
  const utils = trpc.useUtils();
  const sequences = trpc.admin.getSequenceTemplates.useQuery();
  const launch = trpc.admin.launchSequenceFromTemplate.useMutation({
    onSuccess: (data) => {
      toast.success(`Sequence launched with ${data.stepsCreated} steps`);
      utils.admin.getCampaigns.invalidate();
    },
    onError: (error) => toast.error("Sequence launch failed", { description: error.message }),
  });

  return (
    <div className="space-y-5">
      <SectionHeader title="Sequences / Automations" purpose="Launch existing guarded drip sequences for chosen audience segments." />
      <div className="grid gap-4 lg:grid-cols-2">
        {(sequences.data ?? []).map((sequence: any) => (
          <Card key={sequence.id}>
            <CardHeader>
              <CardTitle>{sequence.name}</CardTitle>
              <CardDescription>{sequence.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-4">
              <Badge variant="outline">{sequence.steps?.length ?? 0} steps</Badge>
              <Button size="sm" onClick={() => launch.mutate({ templateId: sequence.id, segment: "marketing" })} disabled={launch.isPending}>
                Launch
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
      {!sequences.isLoading && !sequences.data?.length && (
        <EmptyState icon={Clock} title="No sequence templates" body="No sequence templates are registered in the backend." />
      )}
    </div>
  );
}

function RepliesTab() {
  const replies = trpc.admin.getCampaignReplies.useQuery({ status: "all", limit: 50, offset: 0 });
  return (
    <div className="space-y-5">
      <SectionHeader title="Replies / Inbox" purpose="Review campaign replies polled by the backend IMAP worker." />
      <Card>
        <CardContent className="p-0">
          {replies.isLoading ? (
            <div className="p-5"><Skeleton className="h-36 w-full" /></div>
          ) : !replies.data?.replies?.length ? (
            <EmptyState icon={Inbox} title="No replies yet" body="Replies will appear here after the mailbox poller stores them." />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>From</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Received</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {replies.data.replies.map((reply: any) => (
                    <TableRow key={reply.id}>
                      <TableCell>{reply.fromEmail}</TableCell>
                      <TableCell>{reply.subject || "-"}</TableCell>
                      <TableCell><Badge variant="outline">{reply.status}</Badge></TableCell>
                      <TableCell>{reply.receivedAt ? new Date(reply.receivedAt).toLocaleString() : "-"}</TableCell>
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

function MediaJobTab({ type }: { type: "media" | "avatar" | "video" }) {
  const [prompt, setPrompt] = useState(
    type === "avatar"
      ? "A 30-second internal beta update script for EquiProfile admins."
      : "A premium but realistic equestrian software visual concept for EquiProfile beta.",
  );
  const task =
    type === "avatar" ? "avatar_video" : type === "video" ? "text_to_video" : "text_to_image";
  const createJob = trpc.admin.createMediaJob.useMutation({
    onSuccess: (data) => toast.success("Media job queued", { description: data.jobId || data.status }),
    onError: (error) => toast.error("Media job failed", { description: error.message }),
  });
  const title =
    type === "avatar" ? "Avatar Studio" : type === "video" ? "Video Studio" : "Media Studio";

  return (
    <div className="space-y-5">
      <SectionHeader
        title={title}
        purpose="Create prompt-backed internal-beta jobs through the AI job queue. Direct publishing is disabled."
        action={
          <Button onClick={() => createJob.mutate({ task, prompt })} disabled={createJob.isPending || !prompt}>
            {createJob.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Queue Job
          </Button>
        }
      />
      <Card>
        <CardContent className="p-5">
          <Label>{type === "avatar" ? "Script" : "Prompt"}</Label>
          <Textarea className="mt-2" rows={6} value={prompt} onChange={(e) => setPrompt(e.target.value)} />
        </CardContent>
      </Card>
    </div>
  );
}

function ApprovalTab() {
  const utils = trpc.useUtils();
  const diagnostics = trpc.admin.getAIDiagnostics.useQuery();
  const [scheduleAt, setScheduleAt] = useState("");
  const approvals = diagnostics.data?.queue.approvals ?? [];
  const approve = trpc.admin.approveMarketingItem.useMutation({
    onSuccess: () => {
      toast.success("Item approved");
      utils.admin.getAIDiagnostics.invalidate();
    },
  });
  const reject = trpc.admin.rejectMarketingItem.useMutation({
    onSuccess: () => {
      toast.success("Item rejected");
      utils.admin.getAIDiagnostics.invalidate();
    },
  });
  const schedule = trpc.admin.scheduleMarketingItem.useMutation({
    onSuccess: () => {
      toast.success("Item scheduled");
      utils.admin.getAIDiagnostics.invalidate();
    },
    onError: (error) => toast.error("Schedule failed", { description: error.message }),
  });

  return (
    <div className="space-y-5">
      <SectionHeader title="Approval Queue" purpose="Approve, reject, and schedule generated content before any publishing phase." />
      <Card>
        <CardContent className="p-5">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              type="datetime-local"
              value={scheduleAt}
              onChange={(e) => setScheduleAt(e.target.value)}
              className="sm:max-w-xs"
            />
            <p className="text-xs text-muted-foreground">Choose a time before using Schedule on an approved item.</p>
          </div>
          {diagnostics.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : approvals.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="Approval queue is empty" body="Generated drafts and approval-required tasks will appear here." />
          ) : (
            <div className="space-y-3">
              {approvals.map((item: any) => (
                <div key={item.id} className="rounded-lg border p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{item.status}</Badge>
                        <Badge variant="secondary">{item.task}</Badge>
                        <span className="text-xs text-muted-foreground">{item.id}</span>
                      </div>
                      <pre className="mt-3 max-h-36 overflow-auto rounded-md bg-muted p-3 text-xs">
                        {JSON.stringify(item.payload, null, 2)}
                      </pre>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Button size="sm" onClick={() => approve.mutate({ id: item.id })}>
                        Approve
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => reject.mutate({ id: item.id, reason: "Rejected during beta QA" })}>
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          schedule.mutate({
                            id: item.id,
                            scheduleAt: new Date(scheduleAt).toISOString(),
                          })
                        }
                        disabled={!scheduleAt}
                      >
                        Schedule
                      </Button>
                    </div>
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

function ProviderHealthCard() {
  const diagnostics = trpc.admin.getAIDiagnostics.useQuery(undefined, {
    staleTime: 30_000,
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle>Provider health</CardTitle>
        <CardDescription>GenX and Hugging Face readiness from the backend registry.</CardDescription>
      </CardHeader>
      <CardContent>
        {diagnostics.isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : diagnostics.error ? (
          <p className="text-sm text-destructive">{diagnostics.error.message}</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {diagnostics.data?.providerHealth.map((provider: any) => (
              <div key={provider.provider} className="rounded-lg border p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium capitalize">{provider.provider}</p>
                  <Badge variant={provider.configured ? "default" : "secondary"}>{provider.status}</Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{provider.message}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DiagnosticsTab() {
  const utils = trpc.useUtils();
  const diagnostics = trpc.admin.getAIDiagnostics.useQuery();
  const setSetting = trpc.admin.setSiteSetting.useMutation({
    onSuccess: () => {
      toast.success("Setting saved");
      utils.admin.getAIDiagnostics.invalidate();
    },
    onError: (error) => toast.error("Setting not saved", { description: error.message }),
  });
  const [settings, setSettings] = useState({
    genx_api_key: "",
    genx_base_url: "",
    ai_model: "",
    huggingface_api_key: "",
  });

  function save(key: keyof typeof settings) {
    setSetting.mutate({ key, value: settings[key] });
  }

  return (
    <div className="space-y-5">
      <SectionHeader title="AI Providers / Diagnostics" purpose="Save runtime provider settings and inspect queue health, agents, task registry, and recent failures." />
      <div className="grid gap-4 lg:grid-cols-2">
        <ProviderHealthCard />
        <Card>
          <CardHeader>
            <CardTitle>Provider settings</CardTitle>
            <CardDescription>Environment variables still take precedence; these settings are dashboard runtime overrides.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.keys(settings).map((key) => (
              <div key={key} className="grid gap-2 sm:grid-cols-[1fr_auto]">
                <Input
                  type={key.includes("key") ? "password" : "text"}
                  placeholder={key}
                  value={settings[key as keyof typeof settings]}
                  onChange={(e) => setSettings({ ...settings, [key]: e.target.value })}
                />
                <Button variant="outline" onClick={() => save(key as keyof typeof settings)} disabled={!settings[key as keyof typeof settings]}>
                  Save
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Registry and queue</CardTitle>
        </CardHeader>
        <CardContent>
          {diagnostics.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <div className="grid gap-4 md:grid-cols-4">
              <Metric label="Agents" value={diagnostics.data?.agents.length ?? 0} />
              <Metric label="Tasks" value={diagnostics.data?.taskRegistry.length ?? 0} />
              <Metric label="Media jobs" value={diagnostics.data?.queue.mediaJobs.length ?? 0} />
              <Metric label="Failures" value={diagnostics.data?.recentFailures.length ?? 0} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function PlatformsTab() {
  const platforms = ["YouTube", "Instagram / Facebook", "TikTok", "LinkedIn Company Pages", "Google Business Profile"];
  return (
    <div className="space-y-5">
      <SectionHeader title="Platforms" purpose="Connection state visibility for future social publishing. OAuth publishing is intentionally deferred." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {platforms.map((platform) => (
          <Card key={platform}>
            <CardHeader>
              <CardTitle className="text-base">{platform}</CardTitle>
              <CardDescription>Not connected for beta. Publishing remains disabled.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button disabled variant="outline" className="w-full">Coming soon / internal beta</Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function CalendarTab() {
  const diagnostics = trpc.admin.getAIDiagnostics.useQuery();
  const scheduled = useMemo(
    () => (diagnostics.data?.queue.approvals ?? []).filter((item: any) => item.status === "scheduled"),
    [diagnostics.data],
  );
  return (
    <div className="space-y-5">
      <SectionHeader title="Calendar" purpose="Scheduled approval items for the future publishing calendar." />
      {!scheduled.length ? (
        <EmptyState icon={CalendarDays} title="No scheduled items" body="Approve and schedule an item from the Approval Queue to populate this calendar." />
      ) : (
        <div className="grid gap-3">
          {scheduled.map((item: any) => (
            <Card key={item.id}>
              <CardContent className="flex items-center justify-between gap-4 p-4">
                <div>
                  <p className="font-medium">{item.task}</p>
                  <p className="text-xs text-muted-foreground">{item.scheduleAt}</p>
                </div>
                <Badge>Scheduled</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminCampaigns() {
  const [activeTab, setActiveTab] = useState<StudioTab>("overview");

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-primary/15 bg-gradient-to-br from-primary/10 via-background to-background">
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Megaphone className="h-6 w-6 text-primary" />
                Marketing Studio
              </CardTitle>
              <CardDescription className="mt-2 max-w-3xl">
                Hidden-admin command center for CRM, email campaigns, content generation, approvals, media jobs, platform readiness, and provider diagnostics.
              </CardDescription>
            </div>
            <Badge variant="secondary" className="w-fit">Direct publishing disabled for beta</Badge>
          </div>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as StudioTab)} className="space-y-5">
        <div className="overflow-x-auto rounded-lg border bg-card p-2">
          <TabsList className="h-auto w-max flex-wrap justify-start bg-transparent p-0">
            {tabs.map(({ id, label, icon: Icon }) => (
              <TabsTrigger key={id} value={id} className="h-9 flex-none">
                <Icon className="h-4 w-4" />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="overview"><OverviewTab /></TabsContent>
        <TabsContent value="composer"><ComposerTab /></TabsContent>
        <TabsContent value="email"><EmailStudioTab /></TabsContent>
        <TabsContent value="audience"><AudienceTab /></TabsContent>
        <TabsContent value="suppression"><AudienceTab suppressionOnly /></TabsContent>
        <TabsContent value="sequences"><SequencesTab /></TabsContent>
        <TabsContent value="replies"><RepliesTab /></TabsContent>
        <TabsContent value="media"><MediaJobTab type="media" /></TabsContent>
        <TabsContent value="avatar"><MediaJobTab type="avatar" /></TabsContent>
        <TabsContent value="video"><MediaJobTab type="video" /></TabsContent>
        <TabsContent value="calendar"><CalendarTab /></TabsContent>
        <TabsContent value="approval"><ApprovalTab /></TabsContent>
        <TabsContent value="platforms"><PlatformsTab /></TabsContent>
        <TabsContent value="analytics">
          <ComingSoonPanel title="Analytics" body="Campaign and growth analytics are visible in backend summaries; polished charts are deferred until more beta data exists." />
        </TabsContent>
        <TabsContent value="settings">
          <ComingSoonPanel title="Settings" body="Operational send limits and SMTP settings remain in the main Admin settings panel for beta." />
        </TabsContent>
        <TabsContent value="diagnostics"><DiagnosticsTab /></TabsContent>
      </Tabs>

      <Card className="border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-100">
        <CardContent className="flex gap-3 p-4 text-sm">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Beta rule: every visible action either calls a real backend contract or is explicitly disabled as internal beta. No social publishing occurs from this screen.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
