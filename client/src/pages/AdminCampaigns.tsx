/**
 * AdminCampaigns — hidden Marketing Studio operations foundation.
 *
 * SINGLE SOURCE OF TRUTH: Marketing Studio (campaigns + CRM + orchestration foundation).
 *
 * ⚠️  SYSTEM SEPARATION — READ BEFORE EDITING
 * ---------------------------------------------
 * This file manages Marketing Studio internals:
 *   - Branded HTML email templates (server/_core/emailTemplates.ts)
 *   - Campaign creation, scheduling, and segment targeting
 *   - Marketing contacts management
 *   - Drip-sequence launching
 *
 * This is NOT the horse training template system. For horse training plans:
 *   client/src/pages/TrainingTemplates.tsx  (user-facing, /training-templates)
 *   Admin read-only view of training templates → Admin.tsx (templates section)
 *
 * This component is lazy-loaded from Admin.tsx → "campaigns" section.
 */
import { useState, useRef, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { normalizeImportedEmail } from "@shared/csvImport";
import {
  Mail,
  Send,
  Eye,
  Plus,
  Trash2,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  TestTube,
  Palette,
  Pause,
  Play,
  Globe,
  Upload,
  Search,
  ChevronLeft,
  ChevronRight,
  ShieldBan,
  ShieldCheck,
  MapPin,
  BarChart3,
  CalendarDays,
  Building2,
  GraduationCap,
  Info,
  TrendingUp,
  Zap,
  Timer,
  Bot,
  ChevronDown,
  ChevronUp,
  Sparkles,
  AlertTriangle,
  ScanSearch,
} from "lucide-react";
import { toast } from "sonner";

// ─── Unified Campaign Control Center ─────────────────────────────────────────
/**
 * Single-panel operations console merging:
 *   • Live mailbox status (today's sends, follow-ups, capacity, next window)
 *   • Autopilot status (management/academy ready, suspected duplicates, last run)
 *   • Scan + Run Autopilot actions
 *
 * Replaces the former CampaignAutopilotPanel + CampaignOperationsPanel.
 * Autopilot also runs automatically at 07:30 UTC on weekdays.
 * Duplicate scan runs at 07:00 UTC on weekdays.
 */
function CampaignControlCenter() {
  const utils = trpc.useUtils();

  const mailbox = trpc.admin.getCampaignMailboxStatus.useQuery(undefined, {
    refetchInterval: 60_000,
  });
  const preview = trpc.admin.getCampaignAssignmentPreview.useQuery(undefined, {
    refetchInterval: 120_000,
  });

  const now = new Date();
  const nowUTC = `${String(now.getUTCHours()).padStart(2, "0")}:${String(now.getUTCMinutes()).padStart(2, "0")} UTC`;

  const [lastRun, setLastRun] = useState<{
    management: number;
    academy: number;
    total: number;
  } | null>(null);
  const [lastScan, setLastScan] = useState<{
    scanned: number;
    newlyFlagged: number;
  } | null>(null);

  const autopilotMutation = trpc.admin.runCampaignAutopilot.useMutation({
    onSuccess: (data) => {
      setLastRun({ management: data.management, academy: data.academy, total: data.total });
      if (data.total === 0) {
        toast.info("Autopilot: no new contacts to enrol — everyone is already in a campaign.");
      } else {
        toast.success(
          `Autopilot enrolled ${data.total} contact${data.total !== 1 ? "s" : ""}` +
          ` (${data.management} management · ${data.academy} academy)` +
          ` — campaigns queued for next send window.`,
        );
      }
      utils.admin.getCampaigns.invalidate();
      utils.admin.getCampaignAssignmentPreview.invalidate();
    },
    onError: (e) => toast.error(`Autopilot error: ${e.message}`),
  });

  const scanMutation = trpc.admin.runDuplicatePersonScan.useMutation({
    onSuccess: (data) => {
      setLastScan({ scanned: data.scanned, newlyFlagged: data.newlyFlagged });
      if (data.newlyFlagged === 0) {
        toast.info(`Dup scan complete — no new suspected duplicates found (${data.scanned} contacts scanned).`);
      } else {
        toast.warning(`Dup scan: flagged ${data.newlyFlagged} new suspected duplicate${data.newlyFlagged !== 1 ? "s" : ""} (${data.scanned} contacts scanned). Review in the Contacts tab.`);
      }
      utils.admin.getCampaignAssignmentPreview.invalidate();
    },
    onError: (e) => toast.error(`Dup scan error: ${e.message}`),
  });

  const ready = (preview.data?.management ?? 0) + (preview.data?.academy ?? 0);
  const newPct = mailbox.data ? Math.round((mailbox.data.newOutreachSentToday / mailbox.data.newOutreachCap) * 100) : 0;
  const totalPct = mailbox.data ? Math.round((mailbox.data.totalSentToday / mailbox.data.totalCap) * 100) : 0;
  const dupCount = preview.data?.suspectedDuplicate ?? 0;

  const isLoading = mailbox.isLoading || preview.isLoading;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="w-4 h-4 text-[#2e6da4]" />
            Marketing Studio Engine — Operations Center
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">{nowUTC}</span>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs gap-1"
              onClick={() => scanMutation.mutate()}
              disabled={scanMutation.isPending}
              title="Scan all active contacts for probable duplicates"
            >
              {scanMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <ScanSearch className="w-3 h-3" />}
              Scan Dups
            </Button>
            <Button
              size="sm"
              className="h-7 px-2 text-xs gap-1 bg-[#2e6da4] hover:bg-[#1a5ca0]"
              onClick={() => autopilotMutation.mutate()}
              disabled={autopilotMutation.isPending}
            >
              {autopilotMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
              Run Autopilot
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { mailbox.refetch(); preview.refetch(); }} className="h-7 px-2 text-xs">
              Refresh
            </Button>
          </div>
        </div>
        <CardDescription>
          Live send activity · capacity · autopilot status · duplicate protection.
          Dup scan runs at <strong>07:00 UTC</strong>, autopilot at <strong>07:30 UTC</strong> (weekdays).
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
          </div>
        ) : (
          <div className="space-y-4">
            {/* ── Row 1: engine status badges ──────────────────────────── */}
            <div className="flex flex-wrap gap-2">
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${mailbox.data?.isWeekday ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"}`}>
                {mailbox.data?.isWeekday ? "✓ Weekday — sends active" : "✗ Weekend — sends paused"}
              </span>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${mailbox.data?.isWithinSendHours ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"}`}>
                {mailbox.data?.isWithinSendHours ? "✓ Within send hours" : "○ Outside send hours"}
              </span>
              {dupCount > 0 && (
                <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                  ⚠ {dupCount} suspected dup{dupCount !== 1 ? "s" : ""} suppressed
                </span>
              )}
            </div>

            {/* ── Row 2: today's send metrics ──────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl border border-[#2e6da4]/20 bg-[#f0f6ff] dark:bg-[#0c1e3c]/30 p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold mb-1">New Outreach</p>
                <p className="text-2xl font-bold text-[#2e6da4]">{mailbox.data?.newOutreachSentToday ?? 0}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">of {mailbox.data?.newOutreachCap ?? 25} today</p>
                <div className="mt-1.5 h-1.5 rounded-full bg-[#2e6da4]/15 overflow-hidden">
                  <div className="h-full rounded-full bg-[#2e6da4] transition-all" style={{ width: `${Math.min(100, newPct)}%` }} />
                </div>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-700/30 p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold mb-1">Follow-ups</p>
                <p className="text-2xl font-bold text-emerald-600">{mailbox.data?.followupsSentToday ?? 0}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">auto-sequenced today</p>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-700/40 bg-slate-50 dark:bg-slate-800/30 p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold mb-1">Total Sent</p>
                <p className="text-2xl font-bold">{mailbox.data?.totalSentToday ?? 0}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">of {mailbox.data?.totalCap ?? 40} cap</p>
                <div className="mt-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${totalPct >= 90 ? "bg-red-500" : totalPct >= 70 ? "bg-amber-500" : "bg-emerald-500"}`}
                    style={{ width: `${Math.min(100, totalPct)}%` }} />
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-700/40 bg-slate-50 dark:bg-slate-800/30 p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold mb-1">Remaining Today</p>
                <p className={`text-2xl font-bold ${(mailbox.data?.totalRemaining ?? 1) === 0 ? "text-red-500" : (mailbox.data?.totalRemaining ?? 1) <= 5 ? "text-amber-500" : "text-slate-700 dark:text-slate-200"}`}>
                  {mailbox.data?.totalRemaining ?? 0}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {mailbox.data?.newOutreachRemaining ?? 0} outreach + {Math.max(0, (mailbox.data?.totalRemaining ?? 0) - (mailbox.data?.newOutreachRemaining ?? 0))} followup
                </p>
              </div>
            </div>

            {/* ── Row 3: family / queue / dup metrics ──────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl border border-[#2e6da4]/20 bg-[#f0f6ff] dark:bg-[#0c1e3c]/30 p-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold mb-1 flex items-center justify-center gap-1">
                  <Building2 className="w-3 h-3" /> Management
                </p>
                <p className="text-2xl font-bold text-[#2e6da4]">{preview.data?.management ?? 0}</p>
                <p className="text-[10px] text-muted-foreground">ready to enrol</p>
              </div>

              <div className="rounded-xl border border-[#163563]/20 bg-[#eff6ff] dark:bg-[#0c1e3c]/30 p-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold mb-1 flex items-center justify-center gap-1">
                  <GraduationCap className="w-3 h-3" /> Academy
                </p>
                <p className="text-2xl font-bold text-[#163563]">{preview.data?.academy ?? 0}</p>
                <p className="text-[10px] text-muted-foreground">ready to enrol</p>
              </div>

              <div className={`rounded-xl border p-3 text-center ${dupCount > 0 ? "border-amber-200 bg-amber-50 dark:bg-amber-900/20" : "border-slate-200 dark:border-slate-700/40 bg-slate-50 dark:bg-slate-800/30"}`}>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold mb-1 flex items-center justify-center gap-1">
                  <AlertTriangle className={`w-3 h-3 ${dupCount > 0 ? "text-amber-500" : ""}`} /> Suspected Dups
                </p>
                <p className={`text-2xl font-bold ${dupCount > 0 ? "text-amber-600" : ""}`}>{dupCount}</p>
                <p className="text-[10px] text-muted-foreground">suppressed from autopilot</p>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700/30 p-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold mb-1 flex items-center justify-center gap-1">
                  <Timer className="w-3 h-3 text-amber-600" /> Queued
                </p>
                <p className="text-2xl font-bold text-amber-700">{mailbox.data?.queuedForNextWindow ?? 0}</p>
                <p className="text-[10px] text-muted-foreground">{mailbox.data?.pausedCampaignsCount ?? 0} campaign{mailbox.data?.pausedCampaignsCount !== 1 ? "s" : ""} paused</p>
              </div>
            </div>

            {/* ── Row 4: next window + contextual alerts ────────────────── */}
            <div className="flex items-center gap-3 rounded-xl border border-[#2e6da4]/20 bg-[#f0f6ff] dark:bg-[#0c1e3c]/30 px-4 py-3">
              <TrendingUp className="w-5 h-5 text-[#2e6da4] shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#0c1e3c] dark:text-blue-200">
                  Next window: {mailbox.data?.nextSendWindow ?? "—"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  Windows: {mailbox.data?.sendWindows?.join(" · ") ?? "08:30 · 10:30 · 12:30 · 14:30 · 16:30 UTC"}
                </p>
              </div>
            </div>

            {/* ── Contextual notices ────────────────────────────────────── */}
            {ready > 0 && (
              <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-700/30 px-3 py-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                <p className="text-xs text-emerald-800 dark:text-emerald-300">
                  <strong>{ready} contact{ready !== 1 ? "s" : ""}</strong> ready to enrol. Click <em>Run Autopilot</em> or wait for the 07:30 UTC automatic run.
                </p>
              </div>
            )}

            {lastRun && (
              <div className="flex items-start gap-2 rounded-lg border border-[#2e6da4]/20 bg-[#f0f6ff] dark:bg-[#0c1e3c]/30 px-3 py-2">
                <Bot className="w-3.5 h-3.5 text-[#2e6da4] mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground">
                  Last autopilot run: enrolled <strong>{lastRun.management}</strong> management + <strong>{lastRun.academy}</strong> academy (total: <strong>{lastRun.total}</strong>).
                </p>
              </div>
            )}

            {lastScan && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/20 px-3 py-2">
                <ScanSearch className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  Last dup scan: {lastScan.scanned} contacts scanned, <strong>{lastScan.newlyFlagged}</strong> newly flagged.
                  {lastScan.newlyFlagged > 0 && " Review and clear flags in the Contacts tab."}
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}


// ─── Status Badge Helper ─────────────────────────────────────────────────────

function statusBadge(status: string) {
  switch (status) {
    case "draft":
      return (
        <Badge variant="outline" className="gap-1">
          <Clock className="w-3 h-3" /> Draft
        </Badge>
      );
    case "sending":
      return (
        <Badge className="gap-1 bg-yellow-500">
          <Loader2 className="w-3 h-3 animate-spin" /> Sending
        </Badge>
      );
    case "sent":
      return (
        <Badge className="gap-1 bg-green-600">
          <CheckCircle2 className="w-3 h-3" /> Sent
        </Badge>
      );
    case "paused":
      return (
        <Badge className="gap-1 bg-orange-500">
          <Pause className="w-3 h-3" /> Paused
        </Badge>
      );
    case "failed":
      return (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="w-3 h-3" /> Failed
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function AdminCampaigns() {
  const [createOpen, setCreateOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [confirmSendId, setConfirmSendId] = useState<number | null>(null);
  const [showAdvancedTemplates, setShowAdvancedTemplates] = useState(false);
  // campaign type drives which template subset is shown
  const [campaignCategory, setCampaignCategory] = useState<"management" | "academy_school" | "">("");
  const [historyFilter, setHistoryFilter] = useState<"all" | "manual" | "autopilot">("all");
  const [newCampaign, setNewCampaign] = useState({
    name: "",
    subject: "",
    templateId: "",
    segment: "" as "leads" | "trial" | "paid" | "all" | "marketing" | "",
    content: "",
    firstName: "",
    targetCountry: "",
    targetType: "",
    dailyLimit: 25,
  });

  // Queries
  const templates = trpc.admin.getTemplates.useQuery();
  const segments = trpc.admin.getSegmentCounts.useQuery();
  const campaigns = trpc.admin.getCampaigns.useQuery();
  const utils = trpc.useUtils();

  // Mutations
  const createMutation = trpc.admin.createCampaign.useMutation({
    onSuccess: () => {
      toast.success("Campaign created");
      setCreateOpen(false);
      setCampaignCategory("");
      setNewCampaign({
        name: "",
        subject: "",
        templateId: "",
        segment: "",
        content: "",
        firstName: "",
        targetCountry: "",
        targetType: "",
        dailyLimit: 25,
      });
      utils.admin.getCampaigns.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const sendMutation = trpc.admin.sendCampaign.useMutation({
    onSuccess: (data) => {
      const parts = [`${data.sentCount} delivered`, `${data.failedCount} failed`];
      if (data.deferred > 0) parts.push(`${data.deferred} deferred (daily limit: ${data.dailyLimit})`);
      toast.success(`Campaign sent! ${parts.join(", ")}`);
      setConfirmSendId(null);
      utils.admin.getCampaigns.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const testEmailMutation = trpc.admin.sendTestEmail.useMutation({
    onSuccess: () => toast.success("Test email sent to your admin email"),
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.admin.deleteCampaign.useMutation({
    onSuccess: () => {
      toast.success("Campaign deleted");
      utils.admin.getCampaigns.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const pauseMutation = trpc.admin.pauseCampaign.useMutation({
    onSuccess: () => {
      toast.success("Campaign paused");
      utils.admin.getCampaigns.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const resumeMutation = trpc.admin.resumeCampaign.useMutation({
    onSuccess: () => {
      toast.success("Campaign resumed");
      utils.admin.getCampaigns.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const previewMutation = trpc.admin.previewTemplate.useQuery(
    {
      templateId: newCampaign.templateId || "general",
      mergeFields: {
        firstName: newCampaign.firstName || "Preview User",
        subject: newCampaign.subject || "Campaign Subject",
        content: newCampaign.content || "Your content here.",
      },
    },
    {
      enabled: previewOpen && !!newCampaign.templateId,
    },
  );

  function handlePreview(templateId?: string) {
    if (templateId) {
      setNewCampaign((prev) => ({ ...prev, templateId }));
    }
    setPreviewOpen(true);
  }

  function handleCreate() {
    if (
      !newCampaign.name ||
      !newCampaign.subject ||
      !newCampaign.templateId ||
      !newCampaign.segment
    ) {
      toast.error("Please fill in all required fields");
      return;
    }
    createMutation.mutate({
      name: newCampaign.name,
      subject: newCampaign.subject,
      templateId: newCampaign.templateId,
      segment: newCampaign.segment as "leads" | "trial" | "paid" | "all" | "marketing",
      targetCountry: newCampaign.targetCountry || undefined,
      targetType: newCampaign.targetType || undefined,
      dailyLimit: newCampaign.dailyLimit,
      mergeFields: {
        subject: newCampaign.subject,
        content: newCampaign.content,
      },
    });
  }

  function handleTestSend() {
    if (!newCampaign.templateId || !newCampaign.subject) {
      toast.error("Select a template and enter a subject first");
      return;
    }
    testEmailMutation.mutate({
      templateId: newCampaign.templateId,
      subject: newCampaign.subject,
      mergeFields: {
        firstName: newCampaign.firstName || undefined,
        subject: newCampaign.subject,
        content: newCampaign.content || undefined,
      },
    });
  }

  // Derive country options for dropdowns
  const countryOptions = segments.data?.byCountry ?? [];
  const typeOptions = segments.data?.byType ?? [];
  const priorityCountries = ["UK", "Ireland", "USA"];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#2e6da4]" />
            Marketing Studio (Hidden Admin Foundation)
          </CardTitle>
          <CardDescription>
            Unified internal architecture for CRM, campaigns, content/media generation, approvals, scheduling, analytics, and AI orchestration.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2">
            {[
              "Dashboard",
              "Campaigns",
              "Content Calendar",
              "Composer",
              "Media Studio",
              "Email Studio",
              "Audience / CRM",
              "Automations",
              "Approval Queue",
              "Platforms",
              "Analytics",
              "AI Settings",
            ].map((section) => (
              <Badge key={section} variant="outline" className="justify-center py-1.5">
                {section}
              </Badge>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            This internal surface is approval-first and queue-first; direct social publishing remains deferred.
          </p>
        </CardContent>
      </Card>

      {/* Segment Counts */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          {
            label: "Chat Leads",
            key: "leads" as const,
            color: "text-orange-600",
          },
          {
            label: "Marketing",
            key: "marketing" as const,
            color: "text-indigo-600",
          },
          {
            label: "Trial Users",
            key: "trial" as const,
            color: "text-blue-600",
          },
          {
            label: "Paid Users",
            key: "paid" as const,
            color: "text-green-600",
          },
          {
            label: "All Users",
            key: "all" as const,
            color: "text-purple-600",
          },
          {
            label: "Unsubscribed",
            key: "unsubscribed" as const,
            color: "text-red-500",
          },
        ].map((seg) => (
          <Card key={seg.key}>
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-sm text-muted-foreground">{seg.label}</p>
              <p className={`text-2xl font-bold ${seg.color}`}>
                {segments.isLoading ? (
                  <Skeleton className="h-8 w-12 mx-auto" />
                ) : (
                  segments.data?.[seg.key] || 0
                )}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Segment Breakdown: By Country & By Type */}
      {segments.data && (segments.data.byCountry.length > 0 || segments.data.byType.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* By Country */}
          {segments.data.byCountry.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Globe className="w-4 h-4" />
                  Contacts by Country
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {/* Priority countries first */}
                  {priorityCountries.map((pc) => {
                    const entry = segments.data!.byCountry.find(
                      (c) => c.country.toLowerCase() === pc.toLowerCase(),
                    );
                    if (!entry) return null;
                    return (
                      <div key={pc} className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3 h-3 text-primary" />
                          <span className="text-sm font-medium">{entry.country}</span>
                        </div>
                        <Badge variant="secondary">{entry.count}</Badge>
                      </div>
                    );
                  })}
                  {/* Other countries */}
                  {segments.data.byCountry
                    .filter((c) => !priorityCountries.some((pc) => pc.toLowerCase() === c.country.toLowerCase()))
                    .map((c) => (
                      <div key={c.country} className="flex items-center justify-between px-3 py-1.5">
                        <span className="text-sm text-muted-foreground">{c.country}</span>
                        <span className="text-sm">{c.count}</span>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* By Type */}
          {segments.data.byType.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3 className="w-4 h-4" />
                  Contacts by Type
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {segments.data.byType.map((t) => (
                    <div key={t.type} className="flex items-center justify-between px-3 py-2 rounded-md bg-muted/50">
                      <Badge variant="outline" className="capitalize">
                        {t.type.replace(/_/g, " ")}
                      </Badge>
                      <Badge variant="secondary">{t.count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Templates */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5" />
              Email Templates
            </CardTitle>
            <CardDescription>
              Primary conversion sequences (4-email drip families) and advanced spotlight templates
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {templates.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* ── Primary: Management sequence templates ── */}
              {templates.data?.filter((t) => t.category === "management" && !t.isAdvanced).length ? (
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 text-[#2e6da4]" />
                    Management · Stable · Yard · Owner — Primary Sequence
                    <Badge variant="secondary" className="text-[10px] ml-auto">{templates.data?.filter((t) => t.category === "management" && !t.isAdvanced).length} templates</Badge>
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {templates.data
                      ?.filter((t) => t.category === "management" && !t.isAdvanced)
                      .map((tpl) => (
                        <div
                          key={tpl.id}
                          className="border rounded-xl p-4 hover:shadow-md hover:border-[#2e6da4]/40 transition-all flex flex-col bg-white dark:bg-[#0f1a2e]/40"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-7 h-7 rounded-lg shrink-0 flex items-center justify-center" style={{ background: "#0c1e3c" }}>
                              <Building2 className="w-3.5 h-3.5 text-white" />
                            </div>
                            <h4 className="font-semibold text-sm leading-snug">{tpl.name}</h4>
                          </div>
                          <p className="text-xs text-muted-foreground mb-3 flex-1 leading-relaxed">
                            {tpl.description}
                          </p>
                          <div className="flex gap-2 mt-auto">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={() => handlePreview(tpl.id)}
                            >
                              <Eye className="w-3 h-3 mr-1" /> Preview
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              className="flex-1 bg-[#2e6da4] hover:bg-[#1a5ca0]"
                              onClick={() => {
                                setCampaignCategory("management");
                                setNewCampaign((p) => ({ ...p, templateId: tpl.id }));
                                setCreateOpen(true);
                              }}
                            >
                              <Plus className="w-3 h-3 mr-1" /> Use
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ) : null}

              {/* ── Primary: Academy sequence templates ── */}
              {templates.data?.filter((t) => t.category === "academy_school" && !t.isAdvanced).length ? (
                <div>
                  <div className="pt-2 border-t border-border mb-3">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                      <GraduationCap className="w-3.5 h-3.5 text-[#1a5ca0]" />
                      Academy · Riding School · Education — Primary Sequence
                      <Badge variant="secondary" className="text-[10px] ml-auto">{templates.data?.filter((t) => t.category === "academy_school" && !t.isAdvanced).length} templates</Badge>
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {templates.data
                      ?.filter((t) => t.category === "academy_school" && !t.isAdvanced)
                      .map((tpl) => (
                        <div
                          key={tpl.id}
                          className="border rounded-xl p-4 hover:shadow-md hover:border-[#1a5ca0]/40 transition-all flex flex-col bg-white dark:bg-[#0f1a2e]/40"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-7 h-7 rounded-lg shrink-0 flex items-center justify-center" style={{ background: "#163563" }}>
                              <GraduationCap className="w-3.5 h-3.5 text-white" />
                            </div>
                            <h4 className="font-semibold text-sm leading-snug">{tpl.name}</h4>
                          </div>
                          <p className="text-xs text-muted-foreground mb-3 flex-1 leading-relaxed">
                            {tpl.description}
                          </p>
                          <div className="flex gap-2 mt-auto">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={() => handlePreview(tpl.id)}
                            >
                              <Eye className="w-3 h-3 mr-1" /> Preview
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              className="flex-1 bg-[#163563] hover:bg-[#0c1e3c]"
                              onClick={() => {
                                setCampaignCategory("academy_school");
                                setNewCampaign((p) => ({ ...p, templateId: tpl.id }));
                                setCreateOpen(true);
                              }}
                            >
                              <Plus className="w-3 h-3 mr-1" /> Use
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ) : null}

              {/* ── Advanced / Spotlight Templates (collapsible) ── */}
              {templates.data?.some((t) => t.isAdvanced) && (
                <div className="pt-2 border-t border-border">
                  <button
                    type="button"
                    className="flex items-center gap-2 w-full text-left mb-3 group"
                    onClick={() => setShowAdvancedTemplates((v) => !v)}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider group-hover:text-foreground transition-colors">
                      Advanced &amp; Spotlight Templates
                    </span>
                    <Badge variant="outline" className="text-[10px] ml-1">
                      {templates.data?.filter((t) => t.isAdvanced).length}
                    </Badge>
                    <span className="ml-auto text-muted-foreground">
                      {showAdvancedTemplates
                        ? <ChevronUp className="w-3.5 h-3.5" />
                        : <ChevronDown className="w-3.5 h-3.5" />}
                    </span>
                  </button>

                  {showAdvancedTemplates && (
                    <div className="space-y-4">
                      <p className="text-xs text-muted-foreground -mt-1 mb-2">
                        Standalone feature-spotlight and seasonal emails. Use for specific re-engagement or targeted pushes outside the main sequence.
                      </p>
                      {/* Advanced management */}
                      {templates.data?.filter((t) => t.category === "management" && t.isAdvanced).length ? (
                        <div>
                          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                            <Building2 className="w-3 h-3 text-[#2e6da4]" /> Management
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {templates.data
                              .filter((t) => t.category === "management" && t.isAdvanced)
                              .map((tpl) => (
                                <div
                                  key={tpl.id}
                                  className="border border-dashed rounded-xl p-4 hover:shadow-sm hover:border-[#2e6da4]/40 transition-all flex flex-col bg-white dark:bg-[#0f1a2e]/30"
                                >
                                  <div className="flex items-center gap-2 mb-2">
                                    <div className="w-6 h-6 rounded-md shrink-0 flex items-center justify-center" style={{ background: "#0c1e3c" }}>
                                      <Building2 className="w-3 h-3 text-white" />
                                    </div>
                                    <h4 className="font-semibold text-sm leading-snug">{tpl.name}</h4>
                                    <Badge variant="outline" className="ml-auto text-[9px] py-0 shrink-0">Advanced</Badge>
                                  </div>
                                  <p className="text-xs text-muted-foreground mb-3 flex-1 leading-relaxed">{tpl.description}</p>
                                  <div className="flex gap-2 mt-auto">
                                    <Button variant="outline" size="sm" className="flex-1" onClick={() => handlePreview(tpl.id)}>
                                      <Eye className="w-3 h-3 mr-1" /> Preview
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="flex-1 border-[#2e6da4]/50 text-[#2e6da4] hover:bg-[#f0f6ff]"
                                      onClick={() => {
                                        setCampaignCategory("management");
                                        setNewCampaign((p) => ({ ...p, templateId: tpl.id }));
                                        setCreateOpen(true);
                                      }}
                                    >
                                      <Plus className="w-3 h-3 mr-1" /> Use
                                    </Button>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      ) : null}
                      {/* Advanced academy */}
                      {templates.data?.filter((t) => t.category === "academy_school" && t.isAdvanced).length ? (
                        <div>
                          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                            <GraduationCap className="w-3 h-3 text-[#1a5ca0]" /> Academy / School
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {templates.data
                              .filter((t) => t.category === "academy_school" && t.isAdvanced)
                              .map((tpl) => (
                                <div
                                  key={tpl.id}
                                  className="border border-dashed rounded-xl p-4 hover:shadow-sm hover:border-[#163563]/40 transition-all flex flex-col bg-white dark:bg-[#0f1a2e]/30"
                                >
                                  <div className="flex items-center gap-2 mb-2">
                                    <div className="w-6 h-6 rounded-md shrink-0 flex items-center justify-center" style={{ background: "#163563" }}>
                                      <GraduationCap className="w-3 h-3 text-white" />
                                    </div>
                                    <h4 className="font-semibold text-sm leading-snug">{tpl.name}</h4>
                                    <Badge variant="outline" className="ml-auto text-[9px] py-0 shrink-0">Advanced</Badge>
                                  </div>
                                  <p className="text-xs text-muted-foreground mb-3 flex-1 leading-relaxed">{tpl.description}</p>
                                  <div className="flex gap-2 mt-auto">
                                    <Button variant="outline" size="sm" className="flex-1" onClick={() => handlePreview(tpl.id)}>
                                      <Eye className="w-3 h-3 mr-1" /> Preview
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="flex-1 border-[#163563]/50 text-[#163563] hover:bg-[#eff6ff]"
                                      onClick={() => {
                                        setCampaignCategory("academy_school");
                                        setNewCampaign((p) => ({ ...p, templateId: tpl.id }));
                                        setCreateOpen(true);
                                      }}
                                    >
                                      <Plus className="w-3 h-3 mr-1" /> Use
                                    </Button>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sending Policy Banner */}
      <div className="rounded-xl border border-[#2e6da4]/30 bg-[#f0f6ff] dark:bg-[#0c1e3c]/30 p-4 flex flex-wrap gap-4 items-start">
        <Info className="w-4 h-4 text-[#2e6da4] shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#0c1e3c] dark:text-blue-200 mb-1">Campaign Sending Policy</p>
          <div className="flex flex-wrap gap-x-6 gap-y-1">
            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
              <CalendarDays className="w-3 h-3 text-[#2e6da4]" />
              <strong>Weekdays only</strong> — Mon–Fri, 08:00–18:00 UTC
            </span>
            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Building2 className="w-3 h-3 text-[#2e6da4]" />
              Max <strong>25 new outreach</strong> emails/day
            </span>
            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Send className="w-3 h-3 text-[#2e6da4]" />
              <strong>5 per window</strong> · auto-staggered at 08:30 / 10:30 / 12:30 / 14:30 / 16:30 UTC
            </span>
            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
              <ShieldCheck className="w-3 h-3 text-green-600" />
              40 total/day hard cap · suppression + dedup enforced
            </span>
          </div>
        </div>
      </div>

      {/* Unified Campaign Control Center */}
      <CampaignControlCenter />

      {/* Create Campaign */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Create Campaign
            </CardTitle>
            <CardDescription>
              Compose and send emails to your audience segments
            </CardDescription>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-1" /> New Campaign
          </Button>
        </CardHeader>
      </Card>

      {/* Sequence Templates — Pre-built Drip Campaigns */}
      <SequenceTemplatesSection />

      {/* Campaign History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Campaign History
              </CardTitle>
              <CardDescription>
                Past and pending email campaigns
              </CardDescription>
            </div>
            {/* Filter tabs */}
            <div className="flex rounded-lg border border-border overflow-hidden text-xs">
              {(["all", "manual", "autopilot"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setHistoryFilter(f)}
                  className={`px-3 py-1.5 font-medium transition-colors capitalize ${historyFilter === f ? "bg-[#2e6da4] text-white" : "bg-background text-muted-foreground hover:bg-muted"}`}
                >
                  {f === "autopilot" ? <span className="flex items-center gap-1"><Bot className="w-3 h-3" />Autopilot</span> : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {campaigns.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : !campaigns.data?.length ? (
            <p className="text-center text-muted-foreground py-8">
              No campaigns yet. Create your first campaign above.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Segment</TableHead>
                    <TableHead>Targeting</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Recipients</TableHead>
                    <TableHead className="text-right">Sent</TableHead>
                    <TableHead className="text-right">Failed</TableHead>
                    <TableHead className="text-right">Daily Limit</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.data
                    .filter((c) => {
                      const isAutopilot = c.name?.startsWith("Autopilot — ");
                      if (historyFilter === "autopilot") return isAutopilot;
                      if (historyFilter === "manual") return !isAutopilot;
                      return true;
                    })
                    .map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">
                        {c.name?.startsWith("Autopilot — ") ? (
                          <span className="flex items-center gap-1.5">
                            <Bot className="w-3.5 h-3.5 text-[#2e6da4] shrink-0" />
                            <span className="truncate max-w-[200px]" title={c.name}>{c.name}</span>
                          </span>
                        ) : c.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{c.segment}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {c.targetCountry && (
                            <Badge variant="outline" className="text-xs gap-1">
                              <Globe className="w-3 h-3" />
                              {c.targetCountry}
                            </Badge>
                          )}
                          {c.targetType && (
                            <Badge variant="outline" className="text-xs capitalize">
                              {c.targetType.replace(/_/g, " ")}
                            </Badge>
                          )}
                          {!c.targetCountry && !c.targetType && (
                            <span className="text-xs text-muted-foreground">All</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{statusBadge(c.status)}</TableCell>
                      <TableCell className="text-right">
                        {c.recipientCount}
                      </TableCell>
                      <TableCell className="text-right">
                        {c.sentCount}
                        {c.sentToday ? (
                          <span className="text-xs text-muted-foreground ml-1">
                            ({c.sentToday} today)
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-right">
                        {c.failedCount}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        <span className="text-muted-foreground">{c.dailyLimit ?? 50}/day</span>
                        {c.status !== "sent" && (
                          <span className="block text-emerald-600 font-medium">
                            {Math.max(0, (c.dailyLimit ?? 50) - (c.sentToday ?? 0))} left
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {c.sentAt
                          ? new Date(c.sentAt).toLocaleDateString()
                          : c.createdAt
                            ? new Date(c.createdAt).toLocaleDateString()
                            : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {(c.status === "draft" || c.status === "paused") && (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => setConfirmSendId(c.id)}
                              disabled={sendMutation.isPending}
                            >
                              <Send className="w-3 h-3 mr-1" /> Send
                            </Button>
                          )}
                          {c.status === "paused" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => resumeMutation.mutate({ campaignId: c.id })}
                              disabled={resumeMutation.isPending}
                            >
                              <Play className="w-3 h-3 mr-1" /> Resume
                            </Button>
                          )}
                          {(c.status === "draft" || c.status === "sending") && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => pauseMutation.mutate({ campaignId: c.id })}
                              disabled={pauseMutation.isPending || c.status === "sending"}
                            >
                              <Pause className="w-3 h-3 mr-1" /> Pause
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              deleteMutation.mutate({
                                campaignId: c.id,
                              })
                            }
                            disabled={
                              c.status === "sending" ||
                              deleteMutation.isPending
                            }
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Campaign Dialog */}
      <Dialog open={createOpen} onOpenChange={(v) => { setCreateOpen(v); if (!v) setCampaignCategory(""); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Campaign</DialogTitle>
            <DialogDescription>
              Set up your email campaign — select a type, template, audience, and daily limit
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">

            {/* Step 1: Campaign Type */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">Campaign Type <span className="text-destructive">*</span></Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCampaignCategory("management");
                    if (newCampaign.templateId) {
                      const tpl = templates.data?.find((t) => t.id === newCampaign.templateId);
                      if (tpl && tpl.category !== "management") setNewCampaign((p) => ({ ...p, templateId: "" }));
                    }
                  }}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 text-sm font-medium transition-all cursor-pointer ${campaignCategory === "management" ? "border-[#2e6da4] bg-[#f0f6ff] dark:bg-[#0c1e3c]/50" : "border-border hover:border-[#2e6da4]/40"}`}
                >
                  <Building2 className={`w-5 h-5 ${campaignCategory === "management" ? "text-[#2e6da4]" : "text-muted-foreground"}`} />
                  <span>Management</span>
                  <span className="text-[10px] text-muted-foreground font-normal">Stable · Yard · Owner</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCampaignCategory("academy_school");
                    if (newCampaign.templateId) {
                      const tpl = templates.data?.find((t) => t.id === newCampaign.templateId);
                      if (tpl && tpl.category !== "academy_school") setNewCampaign((p) => ({ ...p, templateId: "" }));
                    }
                  }}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 text-sm font-medium transition-all cursor-pointer ${campaignCategory === "academy_school" ? "border-[#163563] bg-[#f0f4ff] dark:bg-[#0c1e3c]/50" : "border-border hover:border-[#163563]/40"}`}
                >
                  <GraduationCap className={`w-5 h-5 ${campaignCategory === "academy_school" ? "text-[#163563]" : "text-muted-foreground"}`} />
                  <span>Academy / School</span>
                  <span className="text-[10px] text-muted-foreground font-normal">Riding School · Education</span>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="campaign-name">Campaign Name <span className="text-destructive">*</span></Label>
              <Input
                id="campaign-name"
                placeholder="e.g., Spring Health Tracking Promo"
                value={newCampaign.name}
                onChange={(e) =>
                  setNewCampaign((p) => ({
                    ...p,
                    name: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="campaign-subject">Email Subject <span className="text-destructive">*</span></Label>
              <Input
                id="campaign-subject"
                placeholder="e.g., Track your horse's health like never before"
                value={newCampaign.subject}
                onChange={(e) =>
                  setNewCampaign((p) => ({
                    ...p,
                    subject: e.target.value,
                  }))
                }
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Template <span className="text-destructive">*</span></Label>
                <Select
                  value={newCampaign.templateId}
                  onValueChange={(v) =>
                    setNewCampaign((p) => ({ ...p, templateId: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={campaignCategory ? "Select template" : "Select type first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {campaignCategory === "management" && (
                      <>
                        <SelectGroup>
                          <SelectLabel className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-2 py-1.5 flex items-center gap-1.5">
                            <Building2 className="w-3 h-3" /> Primary Sequence
                          </SelectLabel>
                          {templates.data?.filter((t) => t.category === "management" && !t.isAdvanced).map((t) => (
                            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                          ))}
                        </SelectGroup>
                        {templates.data?.some((t) => t.category === "management" && t.isAdvanced) && (
                          <SelectGroup>
                            <SelectLabel className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-2 py-1.5 mt-1 border-t border-border pt-2">
                              Advanced / Spotlight
                            </SelectLabel>
                            {templates.data.filter((t) => t.category === "management" && t.isAdvanced).map((t) => (
                              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                            ))}
                          </SelectGroup>
                        )}
                      </>
                    )}
                    {campaignCategory === "academy_school" && (
                      <>
                        <SelectGroup>
                          <SelectLabel className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-2 py-1.5 flex items-center gap-1.5">
                            <GraduationCap className="w-3 h-3" /> Primary Sequence
                          </SelectLabel>
                          {templates.data?.filter((t) => t.category === "academy_school" && !t.isAdvanced).map((t) => (
                            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                          ))}
                        </SelectGroup>
                        {templates.data?.some((t) => t.category === "academy_school" && t.isAdvanced) && (
                          <SelectGroup>
                            <SelectLabel className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-2 py-1.5 mt-1 border-t border-border pt-2">
                              Advanced / Spotlight
                            </SelectLabel>
                            {templates.data.filter((t) => t.category === "academy_school" && t.isAdvanced).map((t) => (
                              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                            ))}
                          </SelectGroup>
                        )}
                      </>
                    )}
                    {!campaignCategory && (
                      <>
                        <SelectGroup>
                          <SelectLabel className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-2 py-1.5">Management — Primary</SelectLabel>
                          {templates.data?.filter((t) => t.category === "management" && !t.isAdvanced).map((t) => (
                            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                          ))}
                        </SelectGroup>
                        {templates.data?.some((t) => t.category === "management" && t.isAdvanced) && (
                          <SelectGroup>
                            <SelectLabel className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-2 py-1.5">Management — Advanced</SelectLabel>
                            {templates.data?.filter((t) => t.category === "management" && t.isAdvanced).map((t) => (
                              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                            ))}
                          </SelectGroup>
                        )}
                        {templates.data?.some((t) => t.category === "academy_school" && !t.isAdvanced) && (
                          <SelectGroup>
                            <SelectLabel className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-2 py-1.5 mt-1 border-t border-border pt-2">Academy — Primary</SelectLabel>
                            {templates.data?.filter((t) => t.category === "academy_school" && !t.isAdvanced).map((t) => (
                              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                            ))}
                          </SelectGroup>
                        )}
                        {templates.data?.some((t) => t.category === "academy_school" && t.isAdvanced) && (
                          <SelectGroup>
                            <SelectLabel className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-2 py-1.5">Academy — Advanced</SelectLabel>
                            {templates.data?.filter((t) => t.category === "academy_school" && t.isAdvanced).map((t) => (
                              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                            ))}
                          </SelectGroup>
                        )}
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Audience Segment</Label>
                <Select
                  value={newCampaign.segment}
                  onValueChange={(v) =>
                    setNewCampaign((p) => ({
                      ...p,
                      segment: v as "leads" | "trial" | "paid" | "all" | "marketing",
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select segment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="leads">
                      Chat Leads ({segments.data?.leads || 0})
                    </SelectItem>
                    <SelectItem value="marketing">
                      Marketing Contacts ({segments.data?.marketing || 0})
                    </SelectItem>
                    <SelectItem value="trial">
                      Trial Users ({segments.data?.trial || 0})
                    </SelectItem>
                    <SelectItem value="paid">
                      Paid Users ({segments.data?.paid || 0})
                    </SelectItem>
                    <SelectItem value="all">
                      All Users ({segments.data?.all || 0})
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Targeting: Country, Type, Daily Limit */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Target Country</Label>
                <Select
                  value={newCampaign.targetCountry}
                  onValueChange={(v) =>
                    setNewCampaign((p) => ({ ...p, targetCountry: v === "__all__" ? "" : v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All countries" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All Countries</SelectItem>
                    {priorityCountries.map((pc) => {
                      const entry = countryOptions.find(
                        (c) => c.country.toLowerCase() === pc.toLowerCase(),
                      );
                      return (
                        <SelectItem key={pc} value={pc}>
                          {pc} {entry ? `(${entry.count})` : ""}
                        </SelectItem>
                      );
                    })}
                    {countryOptions
                      .filter((c) => !priorityCountries.some((pc) => pc.toLowerCase() === c.country.toLowerCase()))
                      .map((c) => (
                        <SelectItem key={c.country} value={c.country}>
                          {c.country} ({c.count})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Target Type</Label>
                <Select
                  value={newCampaign.targetType}
                  onValueChange={(v) =>
                    setNewCampaign((p) => ({ ...p, targetType: v === "__all__" ? "" : v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All Types</SelectItem>
                    {typeOptions.map((t) => (
                      <SelectItem key={t.type} value={t.type}>
                        {t.type.replace(/_/g, " ")} ({t.count})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="daily-limit">Daily Limit</Label>
                <Input
                  id="daily-limit"
                  type="number"
                  min={1}
                  max={25}
                  value={newCampaign.dailyLimit}
                  onChange={(e) =>
                    setNewCampaign((p) => ({
                      ...p,
                      dailyLimit: Math.max(1, Math.min(25, parseInt(e.target.value) || 25)),
                    }))
                  }
                />
                <p className="text-[10px] text-muted-foreground">
                  Max 25 new outreach/day. Total mailbox cap: 40/day.
                </p>
              </div>
            </div>

            {/* Weekday-only notice */}
            <div className="flex items-center gap-2 rounded-lg border border-[#2e6da4]/20 bg-[#f0f6ff] dark:bg-[#0c1e3c]/30 px-3 py-2">
              <CalendarDays className="w-3.5 h-3.5 text-[#2e6da4] shrink-0" />
              <p className="text-xs text-muted-foreground">
                <strong>Weekdays only.</strong> Campaign sending is restricted to Mon–Fri to protect deliverability.
              </p>
            </div>

            {/* Inline template preview card — shown immediately after selection */}
            {newCampaign.templateId && (() => {
              const selected = templates.data?.find((t) => t.id === newCampaign.templateId);
              return selected ? (
                <div className="flex items-start gap-3 rounded-xl border border-[#2e6da4]/30 bg-[#f0f6ff] dark:bg-[#0c1e3c]/30 p-3">
                  <div className="mt-0.5 h-9 w-9 shrink-0 rounded-lg flex items-center justify-center" style={{ background: "#0c1e3c" }}>
                    {selected.category === "academy_school"
                      ? <GraduationCap className="w-4 h-4 text-white" />
                      : <Building2 className="w-4 h-4 text-white" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold leading-snug">{selected.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{selected.description}</p>
                    <Button
                      variant="link"
                      size="sm"
                      className="mt-1 h-auto p-0 text-xs text-[#2e6da4]"
                      onClick={() => handlePreview(selected.id)}
                    >
                      <Eye className="mr-1 w-3 h-3" /> Full preview →
                    </Button>
                  </div>
                </div>
              ) : null;
            })()}
            {newCampaign.templateId === "general" && (
              <div className="space-y-2">
                <Label htmlFor="campaign-content">Email Content</Label>
                <Textarea
                  id="campaign-content"
                  placeholder="Write your email content here..."
                  rows={5}
                  value={newCampaign.content}
                  onChange={(e) =>
                    setNewCampaign((p) => ({
                      ...p,
                      content: e.target.value,
                    }))
                  }
                />
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePreview()}
                disabled={!newCampaign.templateId}
              >
                <Eye className="w-3 h-3 mr-1" /> Preview
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestSend}
                disabled={
                  !newCampaign.templateId ||
                  !newCampaign.subject ||
                  testEmailMutation.isPending
                }
              >
                {testEmailMutation.isPending ? (
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                ) : (
                  <TestTube className="w-3 h-3 mr-1" />
                )}
                Test Send to Me
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-1" />
              )}
              Create Campaign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Template Preview</DialogTitle>
            <DialogDescription>
              This is how the email will look to recipients
            </DialogDescription>
          </DialogHeader>
          {previewMutation.isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : previewMutation.data?.html ? (
            <div className="border rounded-lg overflow-hidden">
              <iframe
                srcDoc={previewMutation.data.html}
                title="Email Preview"
                className="w-full min-h-[500px] border-0"
                sandbox="allow-same-origin"
              />
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Select a template to preview
            </p>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm Send Dialog */}
      <AlertDialog
        open={confirmSendId !== null}
        onOpenChange={() => setConfirmSendId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send Campaign?</AlertDialogTitle>
            <AlertDialogDescription>
              This will send the campaign to all recipients in the selected
              segment, up to the configured daily limit. Sending is restricted
              to weekdays (Mon–Fri). This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmSendId) {
                  sendMutation.mutate({ campaignId: confirmSendId });
                }
              }}
              disabled={sendMutation.isPending}
            >
              {sendMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-1" />
              )}
              Send Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Marketing Contacts Section */}
      <MarketingContactsSection />

      {/* Replies Inbox */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Replies Inbox
          </CardTitle>
          <CardDescription>
            Incoming replies to campaign emails — polled automatically every 15 minutes on weekdays
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RepliesInboxSection />
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Sequence Templates Sub-Component ─────────────────────────────────────────

function SequenceTemplatesSection() {
  const seqTemplates = trpc.admin.getSequenceTemplates.useQuery();
  const utils = trpc.useUtils();
  const [launchingId, setLaunchingId] = useState<string | null>(null);
  const [segment, setSegment] = useState<"marketing" | "leads" | "trial" | "paid" | "all">("marketing");
  const segments = trpc.admin.getSegmentCounts.useQuery();

  const launchMutation = trpc.admin.launchSequenceFromTemplate.useMutation({
    onSuccess: (data) => {
      toast.success(`Campaign created with ${data.stepsCreated} follow-up steps`);
      setLaunchingId(null);
      utils.admin.getCampaigns.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="w-5 h-5" />
          Ready-to-Run Campaign Sequences
        </CardTitle>
        <CardDescription>
          Pre-built 4-step drip sequences — Initial → Day 3 → Day 6 → Day 10. Sends weekdays only, 30/day total.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {seqTemplates.isLoading ? (
          <div className="space-y-2"><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></div>
        ) : (
          <div className="space-y-4">
            {seqTemplates.data?.map((tpl) => (
              <div key={tpl.id} className="border rounded-xl p-4 hover:shadow-sm transition-all">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm">{tpl.name}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{tpl.description}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {tpl.steps.map((s) => (
                        <Badge key={s.stepNumber} variant="outline" className="text-xs">
                          Day {s.delayDays}: {s.subject.slice(0, 40)}{s.subject.length > 40 ? "…" : ""}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 items-end">
                    {launchingId === tpl.id ? (
                      <div className="flex items-center gap-2">
                        <Select value={segment} onValueChange={(v) => setSegment(v as typeof segment)}>
                          <SelectTrigger className="w-40 h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="marketing">Marketing ({segments.data?.marketing || 0})</SelectItem>
                            <SelectItem value="leads">Chat Leads ({segments.data?.leads || 0})</SelectItem>
                            <SelectItem value="trial">Trial ({segments.data?.trial || 0})</SelectItem>
                            <SelectItem value="paid">Paid ({segments.data?.paid || 0})</SelectItem>
                            <SelectItem value="all">All ({segments.data?.all || 0})</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          className="text-xs"
                          onClick={() => launchMutation.mutate({ templateId: tpl.id, segment })}
                          disabled={launchMutation.isPending}
                        >
                          {launchMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Create"}
                        </Button>
                        <Button variant="ghost" size="sm" className="text-xs" onClick={() => setLaunchingId(null)}>
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button variant="outline" size="sm" className="text-xs" onClick={() => setLaunchingId(tpl.id)}>
                        <Plus className="w-3 h-3 mr-1" />
                        Launch Sequence
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Marketing Contacts Sub-Component ────────────────────────────────────────

function MarketingContactsSection() {
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [newContact, setNewContact] = useState({
    email: "",
    name: "",
    businessName: "",
    contactType: "individual" as "individual" | "riding_school" | "stable",
    region: "",
    country: "",
    tags: "",
  });

  // Filters & pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCountry, setFilterCountry] = useState("");
  const [filterType, setFilterType] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 50;

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  // Confirm-delete modal
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleteMode, setBulkDeleteMode] = useState<"selected" | "filtered">("selected");

  const utils = trpc.useUtils();
  const segments = trpc.admin.getSegmentCounts.useQuery();

  const contacts = trpc.admin.getMarketingContacts.useQuery({
    search: searchQuery || undefined,
    country: filterCountry || undefined,
    contactType: filterType || undefined,
    limit: pageSize,
    offset: page * pageSize,
  });

  // Total count for current filter — capped at 500 to match backend validator max (z.number().max(500)).
  // Using a higher value causes a 400 validation error from the server.
  const filteredTotal = trpc.admin.getMarketingContacts.useQuery({
    search: searchQuery || undefined,
    country: filterCountry || undefined,
    contactType: filterType || undefined,
    limit: 500, // Must not exceed backend validator max of 500
    offset: 0,
  });

  const unsubscribes = trpc.admin.getUnsubscribes.useQuery();

  const createMutation = trpc.admin.createMarketingContact.useMutation({
    onSuccess: () => {
      toast.success("Contact added");
      setAddOpen(false);
      setNewContact({ email: "", name: "", businessName: "", contactType: "individual", region: "", country: "", tags: "" });
      utils.admin.getMarketingContacts.invalidate();
      utils.admin.getSegmentCounts.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.admin.deleteMarketingContact.useMutation({
    onSuccess: () => {
      toast.success("Contact removed");
      utils.admin.getMarketingContacts.invalidate();
      utils.admin.getSegmentCounts.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const bulkDeleteMutation = trpc.admin.bulkDeleteMarketingContacts.useMutation({
    onSuccess: (result) => {
      toast.success(`Deleted ${result.deleted} contact${result.deleted !== 1 ? "s" : ""}`);
      setSelectedIds(new Set());
      setBulkDeleteOpen(false);
      utils.admin.getMarketingContacts.invalidate();
      utils.admin.getSegmentCounts.invalidate();
    },
    onError: (e) => {
      toast.error(`Bulk delete failed: ${e.message}`);
      setBulkDeleteOpen(false);
    },
  });

  const clearDupFlagMutation = trpc.admin.clearDuplicateFlag.useMutation({
    onSuccess: () => {
      toast.success("Duplicate flag cleared — contact will be included in next autopilot run.");
      utils.admin.getMarketingContacts.invalidate();
      utils.admin.getCampaignAssignmentPreview.invalidate();
    },
    onError: (e) => toast.error(`Clear flag failed: ${e.message}`),
  });

  const hasMore = (contacts.data?.length ?? 0) >= pageSize;
  const countryOptions = segments.data?.byCountry ?? [];
  const typeOptions = segments.data?.byType ?? [];

  // Current page IDs
  const pageIds = contacts.data?.map((c) => c.id) ?? [];
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
  const somePageSelected = pageIds.some((id) => selectedIds.has(id));

  function toggleSelectAll() {
    if (allPageSelected) {
      // Deselect all on page
      setSelectedIds((prev) => {
        const next = new Set(prev);
        pageIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      // Select all on page
      setSelectedIds((prev) => {
        const next = new Set(prev);
        pageIds.forEach((id) => next.add(id));
        return next;
      });
    }
  }

  function toggleRow(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function openBulkDeleteSelected() {
    if (selectedIds.size === 0) return;
    setBulkDeleteMode("selected");
    setBulkDeleteOpen(true);
  }

  function openBulkDeleteFiltered() {
    setBulkDeleteMode("filtered");
    setBulkDeleteOpen(true);
  }

  function confirmBulkDelete() {
    if (bulkDeleteMode === "selected") {
      bulkDeleteMutation.mutate({ mode: "ids", ids: Array.from(selectedIds) });
    } else {
      // Filter-based delete — at least one criterion must be set
      if (!searchQuery && !filterCountry && !filterType) {
        toast.error("Set at least one filter before using 'Delete all matching'");
        setBulkDeleteOpen(false);
        return;
      }
      bulkDeleteMutation.mutate({
        mode: "filter",
        search: searchQuery || undefined,
        country: filterCountry || undefined,
        contactType: filterType || undefined,
      });
    }
  }

  const hasActiveFilter = !!(searchQuery || filterCountry || filterType);
  const filteredCount = filteredTotal.data?.length ?? 0;
  const deleteTargetCount = bulkDeleteMode === "selected" ? selectedIds.size : filteredCount;

  return (
    <>
      {/* Marketing Contacts */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Marketing Contacts
            </CardTitle>
            <CardDescription>
              Manage external leads and outreach contacts (UK GDPR compliant)
            </CardDescription>
          </div>
          <div className="flex gap-2 flex-wrap">
            {selectedIds.size > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={openBulkDeleteSelected}
                className="gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete {selectedIds.size} selected
              </Button>
            )}
            {hasActiveFilter && (
              <Button
                variant="outline"
                size="sm"
                onClick={openBulkDeleteFiltered}
                className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete all matching ({filteredCount})
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
              <Upload className="w-4 h-4 mr-1" />
              Import
            </Button>
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Add Contact
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search email, name, business..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(0);
                    setSelectedIds(new Set());
                  }}
                />
              </div>
            </div>
            <Select
              value={filterCountry || "__all__"}
              onValueChange={(v) => {
                setFilterCountry(v === "__all__" ? "" : v);
                setPage(0);
                setSelectedIds(new Set());
              }}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Countries" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Countries</SelectItem>
                {countryOptions.map((c) => (
                  <SelectItem key={c.country} value={c.country}>
                    {c.country} ({c.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filterType || "__all__"}
              onValueChange={(v) => {
                setFilterType(v === "__all__" ? "" : v);
                setPage(0);
                setSelectedIds(new Set());
              }}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Types</SelectItem>
                {typeOptions.map((t) => (
                  <SelectItem key={t.type} value={t.type}>
                    {t.type.replace(/_/g, " ")} ({t.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Selection status bar */}
          {(selectedIds.size > 0 || hasActiveFilter) && (
            <div className="flex flex-wrap items-center gap-3 mb-3 px-3 py-2 rounded-lg bg-muted/50 text-xs">
              {selectedIds.size > 0 && (
                <span className="font-medium text-[#0c1e3c] dark:text-blue-200">
                  {selectedIds.size} selected
                </span>
              )}
              {hasActiveFilter && (
                <span className="text-muted-foreground">
                  {filteredCount}{filteredCount === 500 ? "+" : ""} match current filter
                </span>
              )}
              {selectedIds.size > 0 && (
                <button
                  className="text-muted-foreground hover:text-foreground underline"
                  onClick={() => setSelectedIds(new Set())}
                >
                  Clear selection
                </button>
              )}
            </div>
          )}

          {contacts.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : !contacts.data?.length ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {searchQuery || filterCountry || filterType
                ? "No contacts match your filters."
                : "No marketing contacts yet. Add contacts manually or import a file."}
            </p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox
                          checked={allPageSelected}
                          data-state={somePageSelected && !allPageSelected ? "indeterminate" : undefined}
                          onCheckedChange={toggleSelectAll}
                          aria-label="Select all on page"
                        />
                      </TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Business</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Country</TableHead>
                      <TableHead>Region</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contacts.data.map((contact) => (
                      <TableRow
                        key={contact.id}
                        className={selectedIds.has(contact.id) ? "bg-muted/40" : undefined}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.has(contact.id)}
                            onCheckedChange={() => toggleRow(contact.id)}
                            aria-label={`Select ${contact.email}`}
                          />
                        </TableCell>
                        <TableCell className="text-xs">{contact.email}</TableCell>
                        <TableCell className="text-xs">{contact.name || "—"}</TableCell>
                        <TableCell className="text-xs">{contact.businessName || "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs capitalize">
                            {contact.contactType?.replace(/_/g, " ") || "—"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">{contact.country || "—"}</TableCell>
                        <TableCell className="text-xs">{contact.region || "—"}</TableCell>
                        <TableCell>
                          <Badge
                            variant={contact.status === "active" ? "default" : "destructive"}
                            className="text-xs"
                          >
                            {contact.status}
                          </Badge>
                          {contact.suspectedDuplicateOf != null && (
                            <Badge variant="outline" className="text-xs ml-1 border-amber-400 text-amber-700 dark:text-amber-300 gap-1">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              Dup?
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {contact.suspectedDuplicateOf != null && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs text-amber-700 hover:text-amber-900 hover:bg-amber-50"
                                title={`Suspected dup of contact #${contact.suspectedDuplicateOf} (score: ${contact.dupRiskScore ?? "?"}). Click to clear.`}
                                onClick={() => clearDupFlagMutation.mutate({ contactId: contact.id })}
                                disabled={clearDupFlagMutation.isPending}
                              >
                                Clear Flag
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => deleteMutation.mutate({ id: contact.id })}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Page {page + 1} · Showing {contacts.data.length} contacts
                  {hasActiveFilter && filteredCount > 0 && (
                    <span className="ml-1">of {filteredCount}{filteredCount === 500 ? "+" : ""} matching</span>
                  )}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!hasMore}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Suppression List */}
      <SuppressionListSection />

      {/* Add Contact Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Marketing Contact</DialogTitle>
            <DialogDescription>Add a new contact to your outreach list</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Email *</Label>
              <Input
                value={newContact.email}
                onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                placeholder="info@example.com"
              />
            </div>
            <div>
              <Label>Name</Label>
              <Input
                value={newContact.name}
                onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                placeholder="Jane Smith"
              />
            </div>
            <div>
              <Label>Business Name</Label>
              <Input
                value={newContact.businessName}
                onChange={(e) => setNewContact({ ...newContact, businessName: e.target.value })}
                placeholder="Happy Hooves Stables"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select
                  value={newContact.contactType}
                  onValueChange={(v) => setNewContact({ ...newContact, contactType: v as "individual" | "riding_school" | "stable" })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">Individual</SelectItem>
                    <SelectItem value="riding_school">Riding School</SelectItem>
                    <SelectItem value="stable">Stable / Yard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Country</Label>
                <Input
                  value={newContact.country}
                  onChange={(e) => setNewContact({ ...newContact, country: e.target.value })}
                  placeholder="e.g. UK"
                />
              </div>
            </div>
            <div>
              <Label>Region</Label>
              <Input
                value={newContact.region}
                onChange={(e) => setNewContact({ ...newContact, region: e.target.value })}
                placeholder="e.g. South East England"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button
              onClick={() => createMutation.mutate({
                email: newContact.email,
                name: newContact.name || undefined,
                businessName: newContact.businessName || undefined,
                contactType: newContact.contactType,
                region: newContact.region || undefined,
                country: newContact.country || undefined,
              })}
              disabled={createMutation.isPending || !newContact.email}
            >
              {createMutation.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Add Contact
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation Modal */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              Confirm bulk delete
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  You are about to permanently delete{" "}
                  <strong className="text-foreground">{deleteTargetCount} contact{deleteTargetCount !== 1 ? "s" : ""}</strong>.
                </p>
                {bulkDeleteMode === "filtered" && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-xs text-amber-800 dark:text-amber-200 space-y-0.5">
                    <p className="font-semibold">Active filters:</p>
                    {searchQuery && <p>Search: "{searchQuery}"</p>}
                    {filterCountry && <p>Country: {filterCountry}</p>}
                    {filterType && <p>Type: {filterType}</p>}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  This action cannot be undone. All selected contacts will be removed from the marketing database.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDeleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmBulkDelete}
              disabled={bulkDeleteMutation.isPending || deleteTargetCount === 0}
            >
              {bulkDeleteMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Deleting…</>
              ) : (
                `Delete ${deleteTargetCount} contact${deleteTargetCount !== 1 ? "s" : ""}`
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* File Import Dialog */}
      <FileImportDialog open={importOpen} onOpenChange={setImportOpen} />
    </>
  );
}

// ─── Suppression List with Manual Add/Remove ─────────────────────────────────

function SuppressionListSection() {
  const [suppressEmail, setSuppressEmail] = useState("");
  const [suppressReason, setSuppressReason] = useState("");

  const utils = trpc.useUtils();
  const unsubscribes = trpc.admin.getUnsubscribes.useQuery();

  const addSuppressionMutation = trpc.admin.addSuppression.useMutation({
    onSuccess: (data) => {
      toast.success(data.message || "Email added to suppression list");
      setSuppressEmail("");
      setSuppressReason("");
      utils.admin.getUnsubscribes.invalidate();
      utils.admin.getMarketingContacts.invalidate();
      utils.admin.getSegmentCounts.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const removeSuppressionMutation = trpc.admin.removeSuppression.useMutation({
    onSuccess: (data) => {
      toast.success(data.message || "Email removed from suppression list");
      utils.admin.getUnsubscribes.invalidate();
      utils.admin.getMarketingContacts.invalidate();
      utils.admin.getSegmentCounts.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  function handleAddSuppression() {
    if (!suppressEmail.trim() || !suppressEmail.includes("@")) {
      toast.error("Enter a valid email address");
      return;
    }
    addSuppressionMutation.mutate({
      email: suppressEmail.trim(),
      reason: suppressReason.trim() || undefined,
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldBan className="w-5 h-5" />
          Suppression List
        </CardTitle>
        <CardDescription>
          Unsubscribed emails — excluded from all marketing sends. Remove an entry to re-enable sending if requested by the user.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Manual Suppression Form */}
        <div className="flex flex-wrap gap-2 mb-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <Label className="text-xs">Email to suppress</Label>
            <Input
              placeholder="email@example.com"
              value={suppressEmail}
              onChange={(e) => setSuppressEmail(e.target.value)}
            />
          </div>
          <div className="flex-1 min-w-[160px]">
            <Label className="text-xs">Reason (optional)</Label>
            <Input
              placeholder="e.g. Requested removal"
              value={suppressReason}
              onChange={(e) => setSuppressReason(e.target.value)}
            />
          </div>
          <Button
            size="sm"
            variant="destructive"
            onClick={handleAddSuppression}
            disabled={addSuppressionMutation.isPending || !suppressEmail.trim()}
          >
            {addSuppressionMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <ShieldBan className="w-4 h-4 mr-1" />
            )}
            Suppress
          </Button>
        </div>

        {unsubscribes.isLoading ? (
          <Skeleton className="h-8 w-full" />
        ) : !unsubscribes.data?.length ? (
          <p className="text-sm text-muted-foreground text-center py-4">No unsubscribes yet.</p>
        ) : (
          <div className="max-h-60 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {unsubscribes.data.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="text-xs">{u.email}</TableCell>
                    <TableCell className="text-xs">{u.reason || "—"}</TableCell>
                    <TableCell className="text-xs">{u.source || "—"}</TableCell>
                    <TableCell className="text-xs">
                      {u.unsubscribedAt ? new Date(u.unsubscribedAt).toLocaleDateString("en-GB") : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7 px-2"
                        disabled={removeSuppressionMutation.isPending}
                        onClick={() => {
                          if (confirm(`Remove ${u.email} from suppression list? They will be able to receive marketing emails again.`)) {
                            removeSuppressionMutation.mutate({ email: u.email });
                          }
                        }}
                      >
                        Remove
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
  );
}

// ─── File Import Dialog ──────────────────────────────────────────────────────

type ParsedImport = {
  headers: string[];
  rows: Array<Record<string, string>>;
  mapping: Record<string, string>;
  totalRows: number;
  allRows: Array<Record<string, string>>;
};

const MAPPING_FIELDS = ["email", "name", "businessName", "contactType", "region", "country", "organizationName", "leadFocus"] as const;

// ─── Campaign Replies Inbox ──────────────────────────────────────────────────

const REPLY_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  new: { label: "New", color: "bg-blue-100 text-blue-700" },
  read: { label: "Read", color: "bg-slate-100 text-slate-600" },
  interested: { label: "Interested", color: "bg-emerald-100 text-emerald-700" },
  not_interested: { label: "Not Interested", color: "bg-slate-100 text-slate-500" },
  follow_up: { label: "Follow Up", color: "bg-amber-100 text-amber-700" },
  converted: { label: "Converted", color: "bg-green-100 text-green-700" },
  do_not_contact: { label: "Do Not Contact", color: "bg-red-100 text-red-600" },
};

function RepliesInboxSection() {
  const [statusFilter, setStatusFilter] = useState<"all" | "new" | "read" | "interested" | "not_interested" | "follow_up" | "converted" | "do_not_contact">("all");
  const utils = trpc.useUtils();

  const { data, isLoading, refetch } = trpc.admin.getCampaignReplies.useQuery(
    { status: statusFilter, limit: 50, offset: 0 },
    { refetchInterval: 120_000 },
  );

  const fetchMutation = trpc.admin.triggerReplyFetch.useMutation({
    onSuccess: (result) => {
      toast.success(`Fetched ${result.fetched} new reply(s) from mailbox`);
      refetch();
    },
    onError: (err) => toast.error(`Fetch failed: ${err.message}`),
  });

  const statusMutation = trpc.admin.updateReplyStatus.useMutation({
    onSuccess: () => {
      utils.admin.getCampaignReplies.invalidate();
      toast.success("Reply status updated");
    },
    onError: (err) => toast.error(`Update failed: ${err.message}`),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All replies</SelectItem>
            {Object.entries(REPLY_STATUS_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          size="sm"
          variant="outline"
          onClick={() => fetchMutation.mutate()}
          disabled={fetchMutation.isPending}
          className="gap-1.5"
        >
          {fetchMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mail className="w-3 h-3" />}
          Check Mailbox
        </Button>
        <span className="text-xs text-muted-foreground ml-auto">
          {data?.total ?? 0} reply(s) total
        </span>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
        </div>
      ) : !data?.replies.length ? (
        <div className="text-center py-12 text-muted-foreground">
          <Mail className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm">No replies found</p>
          <p className="text-xs mt-1">The mailbox poller runs every 15 minutes on weekdays, or click "Check Mailbox" above.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {data.replies.map((reply) => {
            const statusInfo = REPLY_STATUS_LABELS[reply.status] ?? REPLY_STATUS_LABELS.new;
            return (
              <div key={reply.id} className="border rounded-xl p-4 bg-white dark:bg-[#0f1a2e]/40 hover:shadow-sm transition-shadow">
                <div className="flex flex-wrap items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-[#0c1e3c] dark:text-blue-100 truncate">
                        {reply.fromName || reply.fromEmail}
                      </span>
                      {reply.fromName && (
                        <span className="text-xs text-muted-foreground truncate">{reply.fromEmail}</span>
                      )}
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 truncate">
                      {reply.subject || "(no subject)"}
                    </p>
                    {reply.snippet && (
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {reply.snippet}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {new Date(reply.receivedAt).toLocaleString()}
                      {reply.matchedCampaignId && (
                        <span className="ml-2 text-[#2e6da4]">Campaign #{reply.matchedCampaignId}</span>
                      )}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <Select
                      value={reply.status}
                      onValueChange={(v) =>
                        statusMutation.mutate({ replyId: reply.id, status: v as "new" | "read" | "interested" | "not_interested" | "follow_up" | "converted" | "do_not_contact" })
                      }
                    >
                      <SelectTrigger className="h-7 text-xs w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(REPLY_STATUS_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k} className="text-xs">{v.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {!reply.sequenceStopped && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => statusMutation.mutate({ replyId: reply.id, status: reply.status as "new" | "read" | "interested" | "not_interested" | "follow_up" | "converted" | "do_not_contact", stopSequence: true })}
                        disabled={statusMutation.isPending}
                      >
                        Stop Sequence
                      </Button>
                    )}
                    {reply.sequenceStopped && (
                      <span className="text-[10px] text-orange-500 font-medium text-center">Sequence stopped</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Campaign Assignment Preview ─────────────────────────────────────────────

function CampaignAssignmentPreview() {
  const { data, isLoading, refetch } = trpc.admin.getCampaignAssignmentPreview.useQuery(undefined, {
    refetchInterval: 300_000,
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="w-4 h-4 text-[#2e6da4]" />
            Contact Assignment Preview
          </CardTitle>
          <Button size="sm" variant="ghost" onClick={() => refetch()} className="h-7 px-2 text-xs">
            Refresh
          </Button>
        </div>
        <CardDescription>
          How your marketing contacts would be distributed across campaign families
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
          </div>
        ) : data ? (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="rounded-xl border border-[#2e6da4]/20 bg-[#f0f6ff] dark:bg-[#0c1e3c]/30 p-3 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold mb-1">Management</p>
              <p className="text-2xl font-bold text-[#2e6da4]">{data.management}</p>
              <p className="text-[10px] text-muted-foreground">eligible leads</p>
            </div>
            <div className="rounded-xl border border-[#163563]/20 bg-[#eff6ff] dark:bg-[#0c1e3c]/30 p-3 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold mb-1">Academy</p>
              <p className="text-2xl font-bold text-[#163563]">{data.academy}</p>
              <p className="text-[10px] text-muted-foreground">eligible leads</p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/20 p-3 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold mb-1">Already Sent</p>
              <p className="text-2xl font-bold text-amber-600">{data.alreadySent}</p>
              <p className="text-[10px] text-muted-foreground">contacts</p>
            </div>
            <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 p-3 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold mb-1">Blocked</p>
              <p className="text-2xl font-bold text-red-500">{data.blocked}</p>
              <p className="text-[10px] text-muted-foreground">suppressed/invalid</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 dark:bg-slate-800/30 p-3 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold mb-1">Total</p>
              <p className="text-2xl font-bold">{data.total}</p>
              <p className="text-[10px] text-muted-foreground">contacts</p>
            </div>
          </div>
        ) : null}
        <p className="text-xs text-muted-foreground mt-3">
          Academy types: school, college, academy, student, teacher, instructor. All others → Management family.
        </p>
      </CardContent>
    </Card>
  );
}

function FileImportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<ParsedImport | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; invalid: number; rejected: number; total: number } | null>(null);

  const utils = trpc.useUtils();

  const parseMutation = trpc.admin.parseImportFile.useMutation({
    onSuccess: (data) => {
      if (!data.totalRows) {
        toast.error("No rows found in file");
        return;
      }
      setParsed(data as ParsedImport);
      setMapping(data.mapping as Record<string, string>);
    },
    onError: (e) => toast.error(e.message),
  });

  const importMutation = trpc.admin.importMarketingContacts.useMutation({
    onSuccess: (data) => {
      setImportResult(data);
      const parts = [`${data.imported} imported`];
      if (data.skipped > 0) parts.push(`${data.skipped} already in DB`);
      if (data.invalid > 0) parts.push(`${data.invalid} invalid`);
      if (data.rejected > 0) parts.push(`${data.rejected} rejected (compliance)`);
      toast.success(parts.join(" · "));
      utils.admin.getMarketingContacts.invalidate();
      utils.admin.getSegmentCounts.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "csv" && ext !== "xlsx") {
      toast.error("Please upload a CSV or XLSX file");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1] || reader.result as string;
      parseMutation.mutate({
        fileContent: base64,
        fileType: ext as "csv" | "xlsx",
        fileName: file.name,
      });
    };
    reader.readAsDataURL(file);
  }, [parseMutation]);

  function handleImport() {
    if (!parsed?.allRows) return;

    const contacts: Array<{
      email: string;
      name?: string;
      businessName?: string;
      organizationName?: string;
      contactType?: string;
      region?: string;
      country?: string;
      leadFocus?: string;
    }> = [];

    // Build reverse mapping: field -> header column
    const reverseMap: Record<string, string> = {};
    for (const [header, field] of Object.entries(mapping)) {
      if (field && field !== "__skip__") {
        reverseMap[field] = header;
      }
    }

    if (!reverseMap.email) {
      toast.error("Please map at least the Email column");
      return;
    }

    // Client-side deduplication — dedupe by email (case-insensitive) before sending
    const seenEmails = new Set<string>();
    let clientDuplicates = 0;
    let blankEmailRows = 0;
    let invalidEmailRows = 0;

    for (const row of parsed.allRows) {
      const email = normalizeImportedEmail(row[reverseMap.email]);
      if (!email) {
        blankEmailRows++;
        continue;
      }
      if (!email.includes("@")) {
        invalidEmailRows++;
        continue;
      }

      const emailLower = email.toLowerCase();
      if (seenEmails.has(emailLower)) {
        clientDuplicates++;
        continue;
      }
      seenEmails.add(emailLower);

      contacts.push({
        email,
        name: reverseMap.name ? row[reverseMap.name]?.trim() || undefined : undefined,
        businessName: reverseMap.businessName ? row[reverseMap.businessName]?.trim() || undefined : undefined,
        organizationName: reverseMap.organizationName ? row[reverseMap.organizationName]?.trim() || undefined : undefined,
        contactType: reverseMap.contactType ? row[reverseMap.contactType]?.trim() || "individual" : "individual",
        region: reverseMap.region ? row[reverseMap.region]?.trim() || undefined : undefined,
        country: reverseMap.country ? row[reverseMap.country]?.trim() || undefined : undefined,
        leadFocus: reverseMap.leadFocus ? row[reverseMap.leadFocus]?.trim() || undefined : undefined,
      });
    }

    if (contacts.length === 0) {
      toast.error(
        `No valid contacts found with the current mapping (blank: ${blankEmailRows}, invalid: ${invalidEmailRows}, duplicates: ${clientDuplicates}). Please check your file format and column mapping.`,
      );
      return;
    }

    if (clientDuplicates > 0) {
      toast.info(`Removed ${clientDuplicates} duplicate email${clientDuplicates > 1 ? "s" : ""} from the file before importing.`);
    }
    if (blankEmailRows > 0 || invalidEmailRows > 0) {
      toast.info(
        `Skipped ${blankEmailRows} blank and ${invalidEmailRows} malformed email row${blankEmailRows + invalidEmailRows === 1 ? "" : "s"} before import.`,
      );
    }

    importMutation.mutate({ contacts, source: "file_import" });
  }

  function handleClose(v: boolean) {
    if (!v) {
      setParsed(null);
      setMapping({});
      setImportResult(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
    onOpenChange(v);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Import Marketing Contacts
          </DialogTitle>
          <DialogDescription>
            Upload a CSV or XLSX file to import contacts in bulk
          </DialogDescription>
        </DialogHeader>

        {importResult ? (
          /* Import Result Summary */
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <Card>
                <CardContent className="pt-4 pb-4 text-center">
                  <p className="text-sm text-muted-foreground">Imported</p>
                  <p className="text-2xl font-bold text-green-600">{importResult.imported}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-4 text-center">
                  <p className="text-sm text-muted-foreground">Skipped</p>
                  <p className="text-2xl font-bold text-yellow-600">{importResult.skipped}</p>
                  <p className="text-[10px] text-muted-foreground">already in DB, bounced, or unsubscribed</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-4 text-center">
                  <p className="text-sm text-muted-foreground">Rejected</p>
                  <p className="text-2xl font-bold text-orange-600">{importResult.rejected}</p>
                  <p className="text-[10px] text-muted-foreground">compliance / B2B freemail</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-4 text-center">
                  <p className="text-sm text-muted-foreground">Invalid</p>
                  <p className="text-2xl font-bold text-red-600">{importResult.invalid}</p>
                  <p className="text-[10px] text-muted-foreground">bad email format</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-4 text-center">
                  <p className="text-sm text-muted-foreground">Total Rows</p>
                  <p className="text-2xl font-bold">{importResult.total}</p>
                </CardContent>
              </Card>
            </div>
            <DialogFooter>
              <Button onClick={() => handleClose(false)}>Done</Button>
            </DialogFooter>
          </div>
        ) : !parsed ? (
          /* File Upload Step */
          <div className="space-y-4 py-4">
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm font-medium">Click to upload CSV or XLSX file</p>
              <p className="text-xs text-muted-foreground mt-1">
                File should contain columns for email, name, business, type, country, etc.
              </p>
              {parseMutation.isPending && (
                <div className="flex items-center justify-center gap-2 mt-3">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Parsing file...</span>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx"
              className="hidden"
              onChange={handleFileSelect}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => handleClose(false)}>Cancel</Button>
            </DialogFooter>
          </div>
        ) : (
          /* Preview & Mapping Step */
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">
                Found <span className="text-primary font-bold">{parsed.totalRows}</span> rows with{" "}
                <span className="text-primary font-bold">{parsed.headers.length}</span> columns
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setParsed(null);
                  setMapping({});
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
              >
                Choose different file
              </Button>
            </div>

            {/* Column Mapping */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Column Mapping</CardTitle>
                <CardDescription className="text-xs">
                  Map your file columns to contact fields. Auto-detected mappings are shown.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {parsed.headers.map((header) => (
                    <div key={header} className="flex items-center gap-2">
                      <span className="text-xs font-mono bg-muted px-2 py-1 rounded min-w-[100px] truncate">
                        {header}
                      </span>
                      <span className="text-xs text-muted-foreground">→</span>
                      <Select
                        value={mapping[header] || "__skip__"}
                        onValueChange={(v) =>
                          setMapping((prev) => ({ ...prev, [header]: v }))
                        }
                      >
                        <SelectTrigger className="h-8 text-xs flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__skip__">— Skip —</SelectItem>
                          {MAPPING_FIELDS.map((f) => (
                            <SelectItem key={f} value={f}>
                              {f}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Preview Table */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Preview (first {Math.min(10, parsed.rows.length)} rows)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto max-h-60">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {parsed.headers.map((h) => (
                          <TableHead key={h} className="text-xs whitespace-nowrap">
                            {h}
                            {mapping[h] && mapping[h] !== "__skip__" && (
                              <Badge variant="secondary" className="ml-1 text-[10px]">
                                {mapping[h]}
                              </Badge>
                            )}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsed.rows.map((row, i) => (
                        <TableRow key={i}>
                          {parsed.headers.map((h) => (
                            <TableCell key={h} className="text-xs whitespace-nowrap">
                              {row[h] || "—"}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => handleClose(false)}>Cancel</Button>
              <Button
                onClick={handleImport}
                disabled={importMutation.isPending || !Object.values(mapping).includes("email")}
              >
                {importMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 mr-1" />
                )}
                Import {parsed.totalRows} Contacts
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
