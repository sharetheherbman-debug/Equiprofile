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
  growthScore?: {
    hookScore: number;
    platformFitScore: number;
    conversionScore: number;
    clarityScore: number;
    complianceScore: number;
    viralPotentialScore: number;
    overallScore: number;
    reasons: string[];
    improvementSuggestions: string[];
  };
  mediaStatus?: string;
  inferredRequest?: {
    platform?: string;
    format?: string;
    durationSeconds?: number | null;
    audience?: string | null;
    goal?: string;
    assetType?: string;
  };
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
  const [inferenceNote, setInferenceNote] = useState<string>("");
  const mediaAssets = trpc.admin.listMediaAssets.useQuery();

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
  const createMediaJob = trpc.admin.createMediaJob.useMutation({
    onSuccess: () => {
      toast.success("Media generation queued");
      utils.admin.listMediaAssets.invalidate();
      utils.admin.listMarketingAssets.invalidate();
    },
    onError: (error) => toast.error("Media generation failed", { description: error.message }),
  });

  const canUseDuration = ["video", "short", "reel", "avatar video"].includes(form.format);
  const currentDraftAssets = (mediaAssets.data ?? []).filter((asset: any) => asset.draftId === draft?.id);

  async function inferFromPrompt() {
    if (form.prompt.trim().length < 3) return;
    try {
      const inferred = await utils.admin.inferMarketingRequest.fetch({ prompt: form.prompt });
      setForm((prev) => ({
        ...prev,
        platform: (inferred.platform as typeof prev.platform) ?? prev.platform,
        format: (inferred.format as typeof prev.format) ?? prev.format,
        goal: (inferred.goal as typeof prev.goal) ?? prev.goal,
        durationSeconds: inferred.durationSeconds ? String(inferred.durationSeconds) : prev.durationSeconds,
      }));
      setInferenceNote(`Inferred: ${inferred.platform} · ${inferred.format}${inferred.durationSeconds ? ` · ${inferred.durationSeconds}s` : ""}${inferred.audience ? ` · audience: ${inferred.audience}` : ""}`);
    } catch {
      // non-blocking
    }
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Create</CardTitle>
          <CardDescription>Create → Preview/Edit → Approval Queue → Calendar → Assets</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2 lg:col-span-2">
            <Label>Create command</Label>
            <Textarea
              rows={4}
              placeholder="Create a 30-second Facebook reel for EquiProfile to attract UK stable owners."
              value={form.prompt}
              onChange={(e) => setForm((prev) => ({ ...prev, prompt: e.target.value }))}
              onBlur={inferFromPrompt}
            />
            {inferenceNote ? <p className="text-xs text-muted-foreground">{inferenceNote}</p> : null}
          </div>

          <div className="lg:col-span-2">
            <details className="rounded-md border p-3">
              <summary className="cursor-pointer text-sm font-medium">Advanced fields (optional overrides)</summary>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
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
              </div>
            </details>
          </div>

          <div className="lg:col-span-2">
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" disabled={form.prompt.trim().length < 3} onClick={inferFromPrompt}>
                Infer request details
              </Button>
              <Button
                className="w-full sm:w-auto"
                disabled={createDraft.isPending || form.prompt.trim().length < 10}
                onClick={async () => {
                  await inferFromPrompt();
                  createDraft.mutate({
                    prompt: form.prompt,
                    platform: form.platform,
                    format: form.format,
                    durationSeconds: canUseDuration ? Number(form.durationSeconds || 0) || null : null,
                    goal: form.goal,
                    tone: form.tone,
                  });
                }}
              >
                {createDraft.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Generate
              </Button>
            </div>
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
              {/* Growth Score */}
              {draft.growthScore && (
                <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">AI Growth Score</p>
                    <Badge variant={draft.growthScore.overallScore >= 70 ? "default" : draft.growthScore.overallScore >= 50 ? "secondary" : "outline"}>
                      {draft.growthScore.overallScore}/100
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
                    {[
                      ["Hook", draft.growthScore.hookScore],
                      ["Platform", draft.growthScore.platformFitScore],
                      ["Conversion", draft.growthScore.conversionScore],
                      ["Clarity", draft.growthScore.clarityScore],
                      ["Compliance", draft.growthScore.complianceScore],
                      ["Viral", draft.growthScore.viralPotentialScore],
                    ].map(([label, score]) => (
                      <div key={label as string} className="rounded border bg-background p-1.5">
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <p className="text-sm font-semibold">{score}</p>
                      </div>
                    ))}
                  </div>
                  {draft.growthScore.improvementSuggestions.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Suggestions:</p>
                      <ul className="space-y-0.5">
                        {draft.growthScore.improvementSuggestions.slice(0, 3).map((s, i) => (
                          <li key={i} className="text-xs text-muted-foreground">• {s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
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
              {draft.mediaStatus ? (
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs font-medium">Media status</p>
                  <p className="text-sm text-muted-foreground mt-1">{draft.mediaStatus}</p>
                </div>
              ) : null}
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
                <Button
                  variant="outline"
                  disabled={!draft.id || createMediaJob.isPending}
                  onClick={() => {
                    const format = (form.format || "").toLowerCase();
                    const task = format.includes("avatar")
                      ? "avatar_video"
                      : format.includes("video") || format.includes("reel") || format.includes("short")
                        ? "text_to_video"
                        : "text_to_image";
                    const mediaPrompt =
                      task === "avatar_video"
                        ? String((draft as any).avatarScript || draft.script || form.prompt)
                        : task === "text_to_video"
                          ? String((draft as any).videoPrompt || draft.script || form.prompt)
                          : String((draft as any).imagePrompt || draft.caption || form.prompt);
                    createMediaJob.mutate({ task, prompt: mediaPrompt, draftId: draft.id });
                  }}
                >
                  Generate asset
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
              {currentDraftAssets.length > 0 ? (
                <div className="space-y-2 rounded-lg border p-3">
                  <p className="text-xs font-medium">Generated media preview</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {currentDraftAssets.slice(0, 4).map((asset: any) => (
                      <div key={asset.id} className="rounded border p-2">
                        {asset.publicUrl && asset.type === "image" ? <img src={asset.publicUrl} alt="Asset preview" className="max-h-[150px] w-full object-cover rounded" /> : null}
                        {asset.publicUrl && (asset.type === "video" || asset.type === "avatar") ? <video src={asset.publicUrl} controls className="max-h-[150px] w-full rounded" /> : null}
                        {asset.publicUrl && asset.type === "voice" ? <audio src={asset.publicUrl} controls className="w-full" /> : null}
                        {!asset.publicUrl ? <p className="text-xs text-muted-foreground">{asset.errorMessage || "Prompt-only or pending media output"}</p> : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
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
  const mediaAssets = trpc.admin.listMediaAssets.useQuery();
  const createMediaJob = trpc.admin.createMediaJob.useMutation({
    onSuccess: () => toast.success("Media job queued"),
    onError: (error) => {
      const message = /not configured/i.test(error.message) ? "Provider key missing" : error.message;
      toast.error("Media job failed", { description: message });
    },
  });
  const [prompt, setPrompt] = useState("Create a premium image concept for EquiProfile marketing.");

  // Determine the best output to show for a raw media job row
  function getOutputUrl(item: any): string | null {
    const outputs = item.outputs;
    if (!outputs) return null;
    return outputs.publicUrl ?? outputs.url ?? outputs.raw?.url ?? outputs.raw?.imageUrl ?? outputs.raw?.videoUrl ?? null;
  }

  function getResultType(item: any): string {
    const outputs = item.outputs;
    if (!outputs) return "";
    return outputs.resultType ?? "";
  }

  function getStatusBadge(state: string) {
    const map: Record<string, string> = {
      completed: "default",
      processing: "secondary",
      queued: "outline",
      failed: "destructive",
    };
    return (map[state] ?? "outline") as "default" | "secondary" | "outline" | "destructive";
  }

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

      {/* Media Asset Registry (structured, from Update 1) */}
      {(mediaAssets.data?.length ?? 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Generated Assets</CardTitle>
            <CardDescription>Assets registered in the media asset registry with preview and status.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {mediaAssets.data?.map((asset: any) => (
                <div key={asset.id} className="rounded-lg border overflow-hidden">
                  {/* Preview area */}
                  <div className="bg-muted/30 flex items-center justify-center min-h-[120px]">
                    {asset.publicUrl && asset.type === "image" ? (
                      <img src={asset.publicUrl} alt={asset.task ?? "Generated image"} className="max-h-[180px] w-full object-cover" />
                    ) : asset.publicUrl && asset.type === "video" ? (
                      <video src={asset.publicUrl} controls className="max-h-[180px] w-full" />
                    ) : asset.publicUrl && asset.type === "avatar" ? (
                      <video src={asset.publicUrl} controls className="max-h-[180px] w-full" />
                    ) : asset.publicUrl && asset.type === "voice" ? (
                      <audio src={asset.publicUrl} controls className="w-full" />
                    ) : asset.status === "completed" ? (
                      <div className="text-center p-4">
                        <p className="text-sm text-muted-foreground">Prompt only — no media file returned by provider</p>
                      </div>
                    ) : asset.status === "failed" ? (
                      <div className="text-center p-4">
                        <p className="text-xs text-destructive">{asset.errorMessage ?? "Job failed"}</p>
                      </div>
                    ) : (
                      <div className="text-center p-4">
                        <p className="text-xs text-muted-foreground capitalize">{asset.status}</p>
                      </div>
                    )}
                  </div>
                  {/* Metadata */}
                  <div className="p-3 space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={getStatusBadge(asset.status)} className="text-xs">{asset.status}</Badge>
                      <Badge variant="outline" className="text-xs capitalize">{asset.type}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{asset.task ?? "-"} · {asset.provider ?? "-"}</p>
                    <p className="text-xs text-muted-foreground">{new Date(asset.createdAt).toLocaleString()}</p>
                    {asset.publicUrl && (
                      <a href={asset.publicUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">
                        Open / Download
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Raw media jobs (legacy growthQueueJobs view) */}
      <Card>
        <CardHeader>
          <CardTitle>Media Jobs</CardTitle>
          <CardDescription>All queued and completed media generation jobs.</CardDescription>
        </CardHeader>
        <CardContent>
          {assets.isLoading ? <Skeleton className="h-32 w-full" /> : !assets.data?.length ? <EmptyState title="No assets" body="Media jobs will appear here when queued." /> : (
            <div className="space-y-3">
              {assets.data.map((item: any) => {
                const outputUrl = getOutputUrl(item);
                const resultType = getResultType(item);
                return (
                  <div key={item.id} className="rounded-lg border p-4">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <Badge variant={getStatusBadge(item.state)}>{item.state}</Badge>
                      <Badge variant="outline" className="text-xs">{item.task}</Badge>
                      <span className="text-xs text-muted-foreground">{item.provider ?? "-"}</span>
                      <span className="text-xs text-muted-foreground ml-auto">{new Date(item.updatedAt).toLocaleString()}</span>
                    </div>

                    {/* Preview if output URL available */}
                    {outputUrl && (resultType === "playable_video" || resultType === "avatar_video") && (
                      <video src={outputUrl} controls className="mt-2 max-h-[200px] w-full rounded border" />
                    )}
                    {outputUrl && resultType === "viewable_image" && (
                      <img src={outputUrl} alt="Generated asset" className="mt-2 max-h-[200px] w-full object-cover rounded border" />
                    )}
                    {outputUrl && resultType === "voice_audio" && (
                      <audio src={outputUrl} controls className="mt-2 w-full" />
                    )}

                    {/* States */}
                    {item.state === "completed" && !outputUrl && resultType !== "viewable_image" && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {resultType === "prompt_only"
                          ? "Provider returned a prompt/text only — no media file was generated."
                          : "Job completed — output not yet registered as a previewable asset."}
                      </p>
                    )}
                    {item.state === "failed" && (
                      <p className="text-xs text-destructive mt-1">{item.error ?? "Job failed — check provider key"}</p>
                    )}

                    {/* Download */}
                    {outputUrl && (
                      <a href={outputUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-xs text-primary underline">
                        Open / Download
                      </a>
                    )}
                  </div>
                );
              })}
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
  const brandProfile = trpc.admin.getBrandProfile.useQuery();
  const avatars = trpc.admin.listBrandAvatars.useQuery();
  const queueStatus = trpc.admin.getQueueStatus.useQuery();
  const utils = trpc.useUtils();

  const setSetting = trpc.admin.setSiteSetting.useMutation({ onSuccess: () => { toast.success("Saved"); utils.admin.getAIDiagnostics.invalidate(); } });
  const updateBrandProfile = trpc.admin.updateBrandProfile.useMutation({
    onSuccess: () => { toast.success("Brand profile saved"); utils.admin.getBrandProfile.invalidate(); },
    onError: (error) => toast.error("Failed to save brand profile", { description: error.message }),
  });
  const createAvatar = trpc.admin.createBrandAvatar.useMutation({
    onSuccess: () => { toast.success("Avatar created"); utils.admin.listBrandAvatars.invalidate(); setAvatarForm({ name: "", role: "", visualDescription: "", personality: "", voiceStyle: "", accent: "", promptTemplate: "" }); },
    onError: (error) => toast.error("Failed to create avatar", { description: error.message }),
  });
  const archiveAvatar = trpc.admin.archiveBrandAvatar.useMutation({
    onSuccess: () => { toast.success("Avatar archived"); utils.admin.listBrandAvatars.invalidate(); },
  });
  const seedRules = trpc.admin.seedPlatformStrategyRules.useMutation({
    onSuccess: () => toast.success("Platform strategy rules seeded"),
    onError: (error) => toast.error("Seed failed", { description: error.message }),
  });
  const createDraft = trpc.admin.createMarketingDraft.useMutation({
    onSuccess: (data) => toast[data.status === "provider_missing" ? "error" : "success"](data.message || "GenX test complete"),
    onError: (error) => toast.error("GenX test failed", { description: error.message }),
  });
  const mediaTest = trpc.admin.createMediaJob.useMutation({
    onSuccess: () => toast.success("Hugging Face route test queued"),
    onError: (error) => toast.error("Hugging Face route test failed", { description: /not configured/i.test(error.message) ? "Provider key missing" : error.message }),
  });
  const fullProviderTest = trpc.admin.runFullProviderTest.useMutation({
    onSuccess: () => {
      toast.success("Full provider test completed");
      utils.admin.getAIDiagnostics.invalidate();
    },
    onError: (error) => toast.error("Full provider test failed", { description: error.message }),
  });

  const [keys, setKeys] = useState({ genx_api_key: "", huggingface_api_key: "", qwen_api_key: "" });
  const [brandForm, setBrandForm] = useState({
    brandVoice: "",
    targetAudience: "",
    positioning: "",
    primaryCta: "",
    hashtagStyle: "",
    contentPillarsStr: "",
    prohibitedClaimsStr: "",
  });
  const [avatarForm, setAvatarForm] = useState({
    name: "",
    role: "",
    visualDescription: "",
    personality: "",
    voiceStyle: "",
    accent: "",
    promptTemplate: "",
  });
  const [brandInitialised, setBrandInitialised] = useState(false);

  // Pre-fill brand form from existing profile
  if (brandProfile.data && !brandInitialised) {
    setBrandInitialised(true);
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

  const providerHealth = diagnostics.data?.providerHealth ?? [];
  const queue = diagnostics.data?.queue;
  const errors = diagnostics.data?.recentFailures ?? [];
  const taskCapabilities = diagnostics.data?.taskCapabilities ?? [];
  const storageStatus = diagnostics.data?.storageStatus;

  function saveBrandProfile() {
    updateBrandProfile.mutate({
      tenantId: "global",
      brandVoice: brandForm.brandVoice || undefined,
      targetAudience: brandForm.targetAudience || undefined,
      positioning: brandForm.positioning || undefined,
      primaryCta: brandForm.primaryCta || undefined,
      hashtagStyle: brandForm.hashtagStyle || undefined,
      contentPillars: brandForm.contentPillarsStr ? brandForm.contentPillarsStr.split(",").map((s) => s.trim()).filter(Boolean) : [],
      prohibitedClaims: brandForm.prohibitedClaimsStr ? brandForm.prohibitedClaimsStr.split(",").map((s) => s.trim()).filter(Boolean) : [],
    });
  }

  return (
    <div className="space-y-5">
      {/* Brand Profile */}
      <Card>
        <CardHeader>
          <CardTitle>Brand Profile</CardTitle>
          <CardDescription>Brand identity that automatically enriches generated marketing drafts. Admin-only.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {brandProfile.isLoading ? <Skeleton className="h-48 w-full" /> : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Brand voice</Label>
                <Textarea rows={2} placeholder="Premium, knowledgeable, equestrian-focused, warm" value={brandForm.brandVoice} onChange={(e) => setBrandForm((p) => ({ ...p, brandVoice: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Target audience</Label>
                <Textarea rows={2} placeholder="UK stable owners, riding school managers, equestrian professionals" value={brandForm.targetAudience} onChange={(e) => setBrandForm((p) => ({ ...p, targetAudience: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Positioning</Label>
                <Textarea rows={2} placeholder="The all-in-one management platform for UK equestrian businesses" value={brandForm.positioning} onChange={(e) => setBrandForm((p) => ({ ...p, positioning: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Primary CTA</Label>
                <Input placeholder="Start your free trial" value={brandForm.primaryCta} onChange={(e) => setBrandForm((p) => ({ ...p, primaryCta: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Content pillars (comma-separated)</Label>
                <Input placeholder="Horse care, stable management, equestrian business, community" value={brandForm.contentPillarsStr} onChange={(e) => setBrandForm((p) => ({ ...p, contentPillarsStr: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Prohibited claims (comma-separated)</Label>
                <Input placeholder="guaranteed results, risk free, clinically proven" value={brandForm.prohibitedClaimsStr} onChange={(e) => setBrandForm((p) => ({ ...p, prohibitedClaimsStr: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Hashtag style</Label>
                <Input placeholder="#EquiProfile #HorseManagement #StableLife" value={brandForm.hashtagStyle} onChange={(e) => setBrandForm((p) => ({ ...p, hashtagStyle: e.target.value }))} />
              </div>
              <div className="flex items-end">
                <Button onClick={saveBrandProfile} disabled={updateBrandProfile.isPending}>
                  {updateBrandProfile.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Save brand profile
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Brand Avatars */}
      <Card>
        <CardHeader>
          <CardTitle>Avatar / Brand Character</CardTitle>
          <CardDescription>Saved avatar profiles are injected into avatar video generation prompts for visual consistency.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Existing avatars */}
          {avatars.isLoading ? <Skeleton className="h-20 w-full" /> : (avatars.data ?? []).length > 0 ? (
            <div className="space-y-2">
              {avatars.data?.map((avatar: any) => (
                <div key={avatar.id} className="rounded-lg border p-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{avatar.name}</p>
                    <p className="text-xs text-muted-foreground">{avatar.role ?? ""}{avatar.voiceStyle ? ` · ${avatar.voiceStyle}` : ""}{avatar.accent ? ` · ${avatar.accent}` : ""}</p>
                    {avatar.visualDescription && <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{avatar.visualDescription}</p>}
                  </div>
                  <Button size="sm" variant="outline" onClick={() => archiveAvatar.mutate({ id: avatar.id })}>Archive</Button>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No avatars yet" body="Create a brand character below to ensure avatar content uses a consistent identity." />
          )}

          {/* Create avatar form */}
          <div className="grid gap-3 sm:grid-cols-2 border-t pt-4">
            <div className="space-y-2">
              <Label>Avatar name</Label>
              <Input placeholder="e.g. Emma" value={avatarForm.name} onChange={(e) => setAvatarForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Input placeholder="EquiProfile brand ambassador" value={avatarForm.role} onChange={(e) => setAvatarForm((p) => ({ ...p, role: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Visual description</Label>
              <Textarea rows={2} placeholder="Professional woman in equestrian attire, mid-30s, friendly smile..." value={avatarForm.visualDescription} onChange={(e) => setAvatarForm((p) => ({ ...p, visualDescription: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Personality</Label>
              <Textarea rows={2} placeholder="Knowledgeable, warm, professional, equestrian expert" value={avatarForm.personality} onChange={(e) => setAvatarForm((p) => ({ ...p, personality: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Voice style</Label>
              <Input placeholder="Clear, warm, conversational" value={avatarForm.voiceStyle} onChange={(e) => setAvatarForm((p) => ({ ...p, voiceStyle: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Accent</Label>
              <Input placeholder="British English" value={avatarForm.accent} onChange={(e) => setAvatarForm((p) => ({ ...p, accent: e.target.value }))} />
            </div>
            <div className="sm:col-span-2 space-y-2">
              <Label>Prompt template (optional)</Label>
              <Textarea rows={2} placeholder="A professional woman named Emma presenting EquiProfile..." value={avatarForm.promptTemplate} onChange={(e) => setAvatarForm((p) => ({ ...p, promptTemplate: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <Button disabled={!avatarForm.name || createAvatar.isPending} onClick={() => createAvatar.mutate({ ...avatarForm, tenantId: "global" })}>
                {createAvatar.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Create avatar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Settings */}
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
                  <p className="font-medium capitalize">{provider.provider} status</p>
                  <Badge variant={provider.configured ? "default" : "secondary"}>{provider.configured ? "Configured" : "Missing"}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{provider.message}</p>
                {provider.model ? <p className="mt-1 text-xs text-muted-foreground">Model: {provider.model}</p> : null}
                {provider.endpoint ? <p className="mt-1 text-xs text-muted-foreground break-all">Endpoint: {provider.endpoint}</p> : null}
                {provider.lastLatencyMs ? <p className="mt-1 text-xs text-muted-foreground">Last latency: {provider.lastLatencyMs}ms</p> : null}
                {provider.lastError ? <p className="mt-1 text-xs text-destructive">Last error: {provider.lastError}</p> : null}
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
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <Input type="password" placeholder="qwen_api_key (optional)" value={keys.qwen_api_key} onChange={(e) => setKeys((prev) => ({ ...prev, qwen_api_key: e.target.value }))} />
            <Button variant="outline" disabled={!keys.qwen_api_key} onClick={() => setSetting.mutate({ key: "qwen_api_key", value: keys.qwen_api_key })}>Save Qwen key</Button>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => createDraft.mutate({ prompt: "Test GenX text generation for EquiProfile marketing draft", platform: "LinkedIn", format: "post", goal: "announcement", tone: "professional", durationSeconds: null })}
            >
              Test GenX text generation
            </Button>
            <Button variant="outline" onClick={() => mediaTest.mutate({ task: "text_to_image", prompt: "Test Hugging Face marketing route" })}>Test Hugging Face task route</Button>
            <Button variant="outline" onClick={() => fullProviderTest.mutate()} disabled={fullProviderTest.isPending}>Run full provider test</Button>
            <Button variant="outline" onClick={() => seedRules.mutate()}>Seed platform strategy rules</Button>
          </div>
        </CardContent>
      </Card>

      {/* Queue Status */}
      <Card>
        <CardHeader>
          <CardTitle>Queue + capabilities</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Pending approvals</p><p className="text-2xl font-semibold">{queue?.pendingApprovals ?? 0}</p></div>
            <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Processing media jobs</p><p className="text-2xl font-semibold">{queue?.processingJobs ?? 0}</p></div>
            <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Playable media tasks</p><p className="text-sm font-medium mt-1">{taskCapabilities.filter((t: any) => t.playableMediaCapable).map((t: any) => t.task).join(", ") || "None detected"}</p></div>
          </div>
          {queueStatus.data && (
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-xs font-medium">Queue mode: {queueStatus.data.mode}</p>
              <p className="text-xs text-muted-foreground mt-1">{queueStatus.data.note}</p>
            </div>
          )}
          {storageStatus && (
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-xs font-medium">Storage root: {storageStatus.root}</p>
              <p className="text-xs text-muted-foreground mt-1">Status: {storageStatus.available ? "ready" : "not ready"}</p>
              {storageStatus.error ? <p className="text-xs text-destructive mt-1">{String(storageStatus.error)}</p> : null}
            </div>
          )}
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
