import { useState, useEffect, lazy, Suspense } from "react";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
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

import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { trpc } from "@/lib/trpc";
import {
  Users,
  Heart,
  Activity,
  FileText,
  AlertCircle,
  Settings,
  Ban,
  Trash2,
  Shield,
  ShieldCheck,
  ShieldOff,
  RefreshCw,
  Search,
  Eye,
  Key,
  Server,
  MessageSquare,
  Save,
  CheckCircle2,
  XCircle,
  Loader2,
  Gift,
  RotateCcw,
  Smartphone,
  Mail,
  BarChart3,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { PageHeader } from "@/components/PageHeader";
import { useAdminViewMode, type AdminViewMode } from "@/contexts/AdminViewContext";
import { getActivityStatus, ACTIVITY_DOT } from "@/hooks/useOnlineStatus";

const AdminCampaigns = lazy(() => import("./AdminCampaigns"));
const AdminAnalytics = lazy(() => import("./AdminAnalytics"));

/* ──────────────────────────────────────────────────────────────────────────
   Admin-visible HORSE TRAINING template catalogue (READ-ONLY view)
   ─────────────────────────────────────────────────────────────────────────
   ⚠️  TEMPLATE SYSTEM SEPARATION — READ THIS BEFORE EDITING
   -----------------------------------------------------------
   There are TWO completely separate template systems in this codebase:

   1. HORSE TRAINING TEMPLATES (user-facing)
      File:    client/src/pages/TrainingTemplates.tsx
      Route:   /training-templates  (protected, for authenticated users)
      Purpose: Pre-built equine workout/exercise plan templates that users
               apply to their horses' training schedules.

   2. EMAIL / MARKETING CAMPAIGN TEMPLATES (admin-only)
      File:    client/src/pages/AdminCampaigns.tsx
      Section: Admin panel → "Marketing Studio" tab
      Purpose: Branded HTML email templates used to send marketing campaigns
               to leads, trial users, paid users, and schools.
      Server:  server/_core/emailTemplates.ts

   The READ-ONLY catalogue below (lines ~109 onwards) mirrors the
   PREDESIGNED_TEMPLATES from TrainingTemplates.tsx so the admin can
   browse and validate horse training content. It is NOT related to
   AdminCampaigns.tsx email templates.
   ────────────────────────────────────────────────────────────────────────── */

function hasUserFreeAccess(user: { preferences?: string | null }): boolean {
  if (!user.preferences) return false;
  try {
    const prefs = JSON.parse(user.preferences);
    return !!prefs.freeAccess;
  } catch {
    return false;
  }
}

function getUserPlanTier(user: { preferences?: string | null }): "standard" | "stable" | "student" | "teacher" | null {
  if (!user.preferences) return null;
  try {
    const prefs = JSON.parse(user.preferences);
    // planTier is the canonical field — check it first for deterministic precedence.
    // selectedExperience is only used as a fallback for older records that pre-date
    // the planTier field being set on student/teacher onboarding.
    if (prefs.planTier === "stable" || prefs.bothDashboardsUnlocked) return "stable";
    if (prefs.planTier === "teacher") return "teacher";
    if (prefs.planTier === "student") return "student";
    if (prefs.planTier === "standard" || prefs.planTier === "pro") return "standard";
    // Fallback for legacy records where only selectedExperience was written
    if (prefs.selectedExperience === "teacher") return "teacher";
    if (prefs.selectedExperience === "student") return "student";
    return null;
  } catch {
    return null;
  }
}

type AdminSection = "users" | "overdue" | "churn" | "leads" | "campaigns" | "whatsapp" | "system" | "settings" | "analytics" | "deleted" | "portals";

const adminSections: { value: AdminSection; label: string; icon: typeof Users; group: string }[] = [
  { value: "users", label: "Users", icon: Users, group: "People" },
  { value: "overdue", label: "Overdue", icon: AlertCircle, group: "People" },
  { value: "churn", label: "Churn", icon: Activity, group: "People" },
  { value: "leads", label: "Leads", icon: MessageSquare, group: "Communications" },
  { value: "campaigns", label: "Marketing Studio", icon: Mail, group: "Communications" },
  { value: "whatsapp", label: "WhatsApp", icon: Smartphone, group: "Communications" },
  { value: "system", label: "System", icon: Server, group: "System" },
  { value: "settings", label: "Settings", icon: Settings, group: "System" },
  { value: "analytics", label: "Analytics", icon: BarChart3, group: "System" },
  { value: "deleted", label: "Deleted", icon: Trash2, group: "Other" },
  { value: "portals", label: "Portals", icon: Eye, group: "Other" },
];

function AdminContent() {
  const [, navigate] = useLocation();
  const { viewMode, setViewMode } = useAdminViewMode();
  const [activeSection, setActiveSection] = useState<AdminSection>("users");
  const [searchQuery, setSearchQuery] = useState("");
  const [suspendReason, setSuspendReason] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [resetPasswordUserId, setResetPasswordUserId] = useState<number | null>(
    null,
  );
  const [resetPasswordValue, setResetPasswordValue] = useState("");
  const [freeAccessTier, setFreeAccessTier] = useState<"standard" | "stable" | "student" | "teacher">("standard");
  const [freeAccessDays, setFreeAccessDays] = useState<7 | 14 | 30>(7);
  const [freeAccessReason, setFreeAccessReason] = useState("");
  const [freeAccessCustomNote, setFreeAccessCustomNote] = useState("");
  const [freeAccessSendEmail, setFreeAccessSendEmail] = useState(true);
  const [whatsappForm, setWhatsappForm] = useState({
    enabled: false,
    accountSid: "",
    authToken: "",
    fromNumber: "",
  });

  // API key configuration form state
  const [aiConfigForm, setAiConfigForm] = useState({
    genx_api_key: "",
    huggingface_api_key: "",
  });
  const [smtpForm, setSmtpForm] = useState({
    smtp_host: "",
    smtp_port: "",
    smtp_user: "",
    smtp_pass: "",
    smtp_from: "",
  });
  const [stripeForm, setStripeForm] = useState({
    stripe_secret_key: "",
    stripe_webhook_secret: "",
  });

  // Check admin session status
  const statusQuery = trpc.adminUnlock.getStatus.useQuery();
  const isUnlocked = !!statusQuery.data?.isUnlocked;

  // All admin queries — only fire once admin session is confirmed
  const { data: stats, isLoading: statsLoading } = trpc.admin.getStats.useQuery(
    undefined,
    { enabled: isUnlocked },
  );
  const { data: segmentation } = trpc.admin.getUserSegmentation.useQuery(
    undefined,
    { enabled: isUnlocked },
  );
  const {
    data: users,
    isLoading: usersLoading,
    refetch: refetchUsers,
  } = trpc.admin.getUsers.useQuery(undefined, { enabled: isUnlocked });
  const {
    data: deletedUsers,
    refetch: refetchDeletedUsers,
  } = trpc.admin.getDeletedUsers.useQuery(undefined, { enabled: isUnlocked });
  const { data: overdueUsers } = trpc.admin.getOverdueUsers.useQuery(
    undefined,
    { enabled: isUnlocked },
  );
  const { data: activityLogs } = trpc.admin.getActivityLogs.useQuery(
    { limit: 50 },
    { enabled: isUnlocked },
  );
  const { data: settings } = trpc.admin.getSettings.useQuery(undefined, {
    enabled: isUnlocked,
  });
  const siteSettingsQuery = trpc.admin.getSiteSettings.useQuery(undefined, {
    enabled: isUnlocked,
  });

  // API Key queries
  const envHealthQuery = trpc.admin.getEnvHealth.useQuery(undefined, {
    enabled: isUnlocked,
    refetchInterval: isUnlocked ? 30000 : false,
  });
  const aiDiagnosticsQuery = trpc.admin.getAIDiagnostics.useQuery(undefined, {
    enabled: isUnlocked,
    refetchInterval: isUnlocked ? 30000 : false,
  });
  const leadsQuery = trpc.admin.getLeads.useQuery(undefined, {
    enabled: isUnlocked,
  });
  const whatsappConfigQuery = trpc.admin.getWhatsAppConfig.useQuery(undefined, {
    enabled: isUnlocked,
  });
  const churnRiskQuery = trpc.admin.getChurnRisk.useQuery(undefined, {
    enabled: isUnlocked,
  });
  const docHealthQuery = trpc.admin.getDocumentHealth.useQuery(undefined, {
    enabled: isUnlocked,
  });

  // All mutations (lazy — no enabled needed)
  const setSiteSettingMutation = trpc.admin.setSiteSetting.useMutation({
    onSuccess: (_data, variables) => {
      toast.success(`${variables.key} saved`);
      siteSettingsQuery.refetch();
    },
    onError: (error) => toast.error(error.message),
  });
  const updateWhatsAppMutation = trpc.admin.updateWhatsAppConfig.useMutation({
    onSuccess: () => {
      toast.success("WhatsApp configuration saved");
      whatsappConfigQuery.refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const suspendMutation = trpc.admin.suspendUser.useMutation({
    onSuccess: () => {
      toast.success("User suspended successfully");
      refetchUsers();
    },
    onError: (error) => toast.error(error.message),
  });

  const unsuspendMutation = trpc.admin.unsuspendUser.useMutation({
    onSuccess: () => {
      toast.success("User unsuspended successfully");
      refetchUsers();
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMutation = trpc.admin.deleteUser.useMutation({
    onSuccess: () => {
      toast.success("User deleted successfully");
      refetchUsers();
      refetchDeletedUsers();
    },
    onError: (error) => toast.error(error.message),
  });

  const restoreUserMutation = trpc.admin.restoreUser.useMutation({
    onSuccess: () => {
      toast.success("User restored successfully");
      refetchUsers();
      refetchDeletedUsers();
    },
    onError: (error) => toast.error(error.message),
  });

  const updateRoleMutation = trpc.admin.updateUserRole.useMutation({
    onSuccess: () => {
      toast.success("User role updated successfully");
      refetchUsers();
    },
    onError: (error) => toast.error(error.message),
  });

  const resetPasswordMutation = trpc.admin.resetUserPassword.useMutation({
    onSuccess: () => {
      toast.success("Password reset successfully");
      setResetPasswordUserId(null);
      setResetPasswordValue("");
      refetchUsers();
    },
    onError: (error) => toast.error(error.message),
  });

  const grantFreeAccessMutation = trpc.admin.grantFreeAccess.useMutation({
    onSuccess: (data) => {
      const until = data.freeAccessUntil
        ? ` (until ${new Date(data.freeAccessUntil).toLocaleDateString()})`
        : "";
      toast.success(`Free access granted${until}`);
      refetchUsers();
    },
    onError: (error) => toast.error(error.message),
  });

  const revokeFreeAccessMutation = trpc.admin.revokeFreeAccess.useMutation({
    onSuccess: () => {
      toast.success("Free access revoked successfully");
      refetchUsers();
    },
    onError: (error) => toast.error(error.message),
  });

  const hardDeleteUserMutation = trpc.admin.hardDeleteUser.useMutation({
    onSuccess: () => {
      toast.success("User permanently purged");
      refetchDeletedUsers();
    },
    onError: (error) => toast.error(error.message),
  });

  // Populate API key forms from stored siteSettings
  useEffect(() => {
    if (siteSettingsQuery.data) {
      const s = siteSettingsQuery.data as Record<string, string>;
      setAiConfigForm({
        genx_api_key: s.genx_api_key ? "••••••••" : "",
        huggingface_api_key: s.huggingface_api_key ? "••••••••" : "",
      });
      setSmtpForm({
        smtp_host: s.smtp_host ?? "",
        smtp_port: s.smtp_port ?? "",
        smtp_user: s.smtp_user ?? "",
        smtp_pass: s.smtp_pass ? "••••••••" : "",
        smtp_from: s.smtp_from ?? "",
      });
      setStripeForm({
        stripe_secret_key: s.stripe_secret_key ? "••••••••" : "",
        stripe_webhook_secret: s.stripe_webhook_secret ? "••••••••" : "",
      });
    }
  }, [siteSettingsQuery.data]);

  // Sync WhatsApp form when data loads
  useEffect(() => {
    if (whatsappConfigQuery.data) {
      setWhatsappForm((prev) => ({
        ...prev,
        enabled: whatsappConfigQuery.data!.enabled,
      }));
    }
  }, [whatsappConfigQuery.data]);

  // When admin session expires, the inline "Admin Access Required" view below
  // handles the locked state correctly — no need to navigate away and lose context.
  // The toast informs the admin without redirecting them to a different page.
  useEffect(() => {
    if (statusQuery.data && !statusQuery.data.isUnlocked && !statusQuery.isLoading) {
      toast.error("Admin session expired. Please unlock admin mode.");
    }
  }, [statusQuery.data, statusQuery.isLoading]);

  // Show loading state while checking admin session
  if (statusQuery.isLoading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Show access required if session is not unlocked
  if (!isUnlocked) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Admin Access Required</AlertTitle>
          <AlertDescription>
            Your admin session has expired or you don't have admin access. Go to
            AI Chat and type <strong>show admin</strong> to unlock.
          </AlertDescription>
        </Alert>
        <Button onClick={() => navigate("/ai-chat")} className="mt-4">
          Go to AI Chat
        </Button>
      </div>
    );
  }

  const filteredUsers = users?.filter(
    (user) =>
      user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const getSubscriptionBadge = (status: string) => {
    switch (status) {
      case "trial":
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-700">
            Trial
          </Badge>
        );
      case "active":
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-700">
            Active
          </Badge>
        );
      case "overdue":
        return <Badge variant="destructive">Overdue</Badge>;
      case "expired":
        return (
          <Badge variant="outline" className="text-muted-foreground">
            Expired
          </Badge>
        );
      case "cancelled":
        return <Badge variant="outline">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (activeSection === "campaigns") {
    return (
      <Suspense
        fallback={
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        }
      >
        <AdminCampaigns onBackToAdmin={() => setActiveSection("users")} />
      </Suspense>
    );
  }

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <PageHeader
            title="Admin Dashboard"
            subtitle="Monitor users, subscriptions, and system health"
          />
        </div>
      </div>

      {/* Stats Overview — clean white cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="bg-white dark:bg-card border border-gray-200 dark:border-gray-700 shadow-sm">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium text-gray-500 dark:text-muted-foreground">Total Users</p>
              <div className="w-8 h-8 rounded-lg bg-[#2e6da4]/10 flex items-center justify-center">
                <Users className="w-4 h-4 text-[#2e6da4]" />
              </div>
            </div>
            {statsLoading ? (
              <Skeleton className="h-8 w-16 mt-1" />
            ) : (
              <p className="text-2xl font-bold text-gray-900 dark:text-foreground">{stats?.users?.totalUsers || 0}</p>
            )}
            <p className="text-xs text-gray-400 dark:text-muted-foreground mt-1">
              {stats?.users?.activeUsers || 0} active
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-card border border-gray-200 dark:border-gray-700 shadow-sm">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium text-gray-500 dark:text-muted-foreground">Paid Subscribers</p>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                <Shield className="w-4 h-4 text-[#2d6a4f]" />
              </div>
            </div>
            {statsLoading ? (
              <Skeleton className="h-8 w-16 mt-1" />
            ) : (
              <p className="text-2xl font-bold text-gray-900 dark:text-foreground">{stats?.users?.paidUsers || 0}</p>
            )}
            <p className="text-xs text-gray-400 dark:text-muted-foreground mt-1">
              {stats?.users?.trialUsers || 0} on trial
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-card border border-gray-200 dark:border-gray-700 shadow-sm">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium text-gray-500 dark:text-muted-foreground">Total Horses</p>
              <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center">
                <Heart className="w-4 h-4 text-rose-500" />
              </div>
            </div>
            {statsLoading ? (
              <Skeleton className="h-8 w-16 mt-1" />
            ) : (
              <p className="text-2xl font-bold text-gray-900 dark:text-foreground">{stats?.horses?.totalHorses || 0}</p>
            )}
            <p className="text-xs text-gray-400 dark:text-muted-foreground mt-1">
              {stats?.horses?.activeHorses || 0} active
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-card border border-gray-200 dark:border-gray-700 shadow-sm">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium text-gray-500 dark:text-muted-foreground">Overdue Payments</p>
              <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                <AlertCircle className="w-4 h-4 text-red-500" />
              </div>
            </div>
            {statsLoading ? (
              <Skeleton className="h-8 w-16 mt-1" />
            ) : (
              <p className="text-2xl font-bold text-gray-900 dark:text-foreground">{stats?.users?.overdueUsers || 0}</p>
            )}
            <p className="text-xs text-gray-400 dark:text-muted-foreground mt-1">
              {stats?.users?.suspendedUsers || 0} suspended
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top navigation menu with dropdown groups */}
      <div className="rounded-xl border border-gray-200/80 dark:border-gray-700/80 bg-white dark:bg-card shadow-sm overflow-hidden">
        <div className="flex items-center gap-1 flex-wrap px-3 py-2 bg-gradient-to-r from-[#0c2352] to-[#1a3a6b]">
          <div className="flex items-center gap-2 mr-2 shrink-0">
            <Shield className="w-3.5 h-3.5 text-blue-300 shrink-0" />
            <span className="text-[10px] font-bold tracking-widest uppercase text-blue-100">Control Centre</span>
          </div>
          <div className="h-4 w-px bg-white/20 mx-1 hidden sm:block shrink-0" />
          {(["People", "Communications", "System", "Other"] as const).map((group) => {
            const groupItems = adminSections.filter((s) => s.group === group);
            const isGroupActive = groupItems.some((s) => s.value === activeSection);
            return (
              <DropdownMenu key={group}>
                <DropdownMenuTrigger asChild>
                  <button
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${
                      isGroupActive
                        ? "bg-white/20 text-white"
                        : "text-blue-200 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {group}
                    <ChevronDown className="w-3 h-3 opacity-70" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-[160px]">
                  {groupItems.map((s) => {
                    const Icon = s.icon;
                    const isActive = activeSection === s.value;
                    return (
                      <DropdownMenuItem
                        key={s.value}
                        onClick={() => setActiveSection(s.value)}
                        className={isActive ? "bg-accent text-accent-foreground font-medium" : ""}
                      >
                        <Icon className="w-4 h-4 mr-2 shrink-0" />
                        {s.label}
                        {isActive && <CheckCircle2 className="w-3.5 h-3.5 ml-auto text-[#2563eb] shrink-0" />}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            );
          })}
        </div>
        {/* Active section breadcrumb */}
        {(() => {
          const active = adminSections.find((s) => s.value === activeSection);
          if (!active) return null;
          const Icon = active.icon;
          return (
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 dark:border-gray-800">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">{active.group}</span>
              <span className="text-gray-300 dark:text-gray-600 text-xs">/</span>
              <Icon className="w-3.5 h-3.5 text-[#2563eb]" />
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">{active.label}</span>
            </div>
          );
        })()}
      </div>

      {/* Content area */}
      <div className="space-y-4">
          {activeSection === "users" && (<>
          {/* User Segmentation — executive summary */}
          {segmentation && (
            <Card className="bg-white dark:bg-card border border-gray-200 dark:border-gray-700 shadow-sm mb-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <div className="w-1 h-4 rounded-full bg-gradient-to-b from-indigo-500 to-purple-500 shrink-0" />
                  User Segmentation
                </CardTitle>
                <CardDescription className="text-xs">Real-time breakdown of user lifecycle stages</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  <div className="text-center p-3 rounded-lg bg-green-50 dark:bg-green-950/30">
                    <p className="text-2xl font-bold text-green-600">{segmentation.paidUsers}</p>
                    <p className="text-[11px] text-muted-foreground font-medium">Paid Users</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30">
                    <p className="text-2xl font-bold text-blue-600">{segmentation.freeAccessUsers}</p>
                    <p className="text-[11px] text-muted-foreground font-medium">Free Access</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30">
                    <p className="text-2xl font-bold text-amber-600">{segmentation.trialUsers}</p>
                    <p className="text-[11px] text-muted-foreground font-medium">Trial Users</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-red-50 dark:bg-red-950/30">
                    <p className="text-2xl font-bold text-red-600">{segmentation.overdueUsers}</p>
                    <p className="text-[11px] text-muted-foreground font-medium">Overdue</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-gray-50 dark:bg-gray-950/30">
                    <p className="text-2xl font-bold text-gray-500">{segmentation.deletedUsers}</p>
                    <p className="text-[11px] text-muted-foreground font-medium">Deleted</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>Leads: <span className="font-semibold text-foreground">{segmentation.leads}</span></span>
                  <span>Cancelled: <span className="font-semibold text-foreground">{segmentation.cancelledUsers}</span></span>
                  <span>Expired: <span className="font-semibold text-foreground">{segmentation.expiredUsers}</span></span>
                  <span>Recent signups (7d): <span className="font-semibold text-foreground">{segmentation.recentSignups}</span></span>
                  <span>Total real users: <span className="font-semibold text-foreground">{segmentation.totalReal}</span></span>
                </div>
              </CardContent>
            </Card>
          )}
          
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle>User Management</CardTitle>
                  <CardDescription>
                    View and manage all registered users
                  </CardDescription>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Subscription</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers?.map((user) => {
                          const activityStatus = getActivityStatus(user.updatedAt);
                          const activityDot = ACTIVITY_DOT[activityStatus];
                          return (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span
                                title={activityDot.title}
                                className={`shrink-0 w-2 h-2 rounded-full ${activityDot.dot}`}
                              />
                              <div>
                                <p className="font-medium">
                                  {user.name || "No name"}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {user.email}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                user.role === "admin" ? "default" : "outline"
                              }
                            >
                              {user.role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1">
                                {getSubscriptionBadge(user.subscriptionStatus)}
                                {hasUserFreeAccess(user) && (() => {
                                  try {
                                    const prefs = user.preferences ? JSON.parse(user.preferences) : {};
                                    const until = prefs.freeAccessUntil ? new Date(prefs.freeAccessUntil) : null;
                                    const now = new Date();
                                    const isExpired = until ? until < now : false;
                                    return (
                                      <Badge variant="secondary" className={isExpired ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}>
                                        {isExpired ? "Free Access (expired)" : until ? `Free until ${until.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}` : "Free Access"}
                                      </Badge>
                                    );
                                  } catch { return null; }
                                })()}
                              </div>
                              {(() => {
                                const tier = getUserPlanTier(user);
                                if (!tier) return null;
                                const tierConfig = {
                                  stable: { label: "Stable", className: "text-xs border-violet-400/50 text-violet-700 bg-violet-50 dark:bg-violet-950/30 dark:text-violet-300" },
                                  student: { label: "Student", className: "text-xs border-amber-400/50 text-amber-700 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-300" },
                                  teacher: { label: "Teacher", className: "text-xs border-emerald-400/50 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-300" },
                                  standard: { label: "Standard", className: "text-xs border-blue-400/50 text-blue-700 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-300" },
                                }[tier];
                                return (
                                  <Badge variant="outline" className={tierConfig.className}>
                                    {tierConfig.label}
                                  </Badge>
                                );
                              })()}
                            </div>
                          </TableCell>
                          <TableCell>
                            {user.loginMethod === "email" ? (
                              user.emailVerified ? (
                                <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                                  Verified
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700">
                                  Unverified
                                </Badge>
                              )
                            ) : (
                              <Badge variant="secondary" className="text-muted-foreground">
                                {user.loginMethod || "OAuth"}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {user.isSuspended ? (
                              <Badge variant="destructive">Suspended</Badge>
                            ) : user.isActive ? (
                              <Badge
                                variant="secondary"
                                className="bg-green-100 text-green-700"
                              >
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="outline">Inactive</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {new Date(user.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              {user.isSuspended ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    unsuspendMutation.mutate({
                                      userId: user.id,
                                    })
                                  }
                                >
                                  Unsuspend
                                </Button>
                              ) : (
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <Ban className="w-4 h-4" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>Suspend User</DialogTitle>
                                      <DialogDescription>
                                        This will prevent{" "}
                                        {user.name || user.email} from accessing
                                        their account.
                                      </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4">
                                      <div className="space-y-2">
                                        <Label>Reason for suspension</Label>
                                        <Textarea
                                          value={suspendReason}
                                          onChange={(e) =>
                                            setSuspendReason(e.target.value)
                                          }
                                          placeholder="Enter reason..."
                                        />
                                      </div>
                                    </div>
                                    <DialogFooter>
                                      <Button
                                        variant="destructive"
                                        onClick={() => {
                                          suspendMutation.mutate({
                                            userId: user.id,
                                            reason: suspendReason,
                                          });
                                          setSuspendReason("");
                                        }}
                                      >
                                        Suspend User
                                      </Button>
                                    </DialogFooter>
                                  </DialogContent>
                                </Dialog>
                              )}

                              <Dialog
                                open={resetPasswordUserId === user.id}
                                onOpenChange={(open) => {
                                  if (!open) {
                                    setResetPasswordUserId(null);
                                    setResetPasswordValue("");
                                  }
                                }}
                              >
                                <DialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      setResetPasswordUserId(user.id)
                                    }
                                  >
                                    <Key className="w-4 h-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Reset Password</DialogTitle>
                                    <DialogDescription>
                                      Set a new password for{" "}
                                      {user.name || user.email}.
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                      <Label htmlFor="reset-password-input">
                                        New Password (min 12 chars)
                                      </Label>
                                      <Input
                                        id="reset-password-input"
                                        type="password"
                                        value={resetPasswordValue}
                                        onChange={(e) =>
                                          setResetPasswordValue(e.target.value)
                                        }
                                        placeholder="Enter new password..."
                                      />
                                    </div>
                                  </div>
                                  <DialogFooter>
                                    <Button
                                      disabled={
                                        resetPasswordValue.length < 8 ||
                                        resetPasswordMutation.isPending
                                      }
                                      onClick={() => {
                                        resetPasswordMutation.mutate({
                                          userId: user.id,
                                          newPassword: resetPasswordValue,
                                        });
                                      }}
                                    >
                                      Reset Password
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>

                              {/* Grant / Revoke Admin role */}
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    title={
                                      user.role === "admin"
                                        ? "Revoke admin role"
                                        : "Grant admin role"
                                    }
                                    className={
                                      user.role === "admin"
                                        ? "text-amber-600 hover:text-amber-700"
                                        : "text-muted-foreground"
                                    }
                                  >
                                    {user.role === "admin" ? (
                                      <ShieldOff className="w-4 h-4" />
                                    ) : (
                                      <ShieldCheck className="w-4 h-4" />
                                    )}
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      {user.role === "admin"
                                        ? "Revoke Admin Role"
                                        : "Grant Admin Role"}
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      {user.role === "admin"
                                        ? `Remove admin privileges from ${user.name || user.email}? They will lose access to the Admin Panel.`
                                        : `Grant admin privileges to ${user.name || user.email}? They will be able to unlock the Admin Panel and manage all users.`}
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>
                                      Cancel
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      className={
                                        user.role === "admin"
                                          ? "bg-amber-600 text-white hover:bg-amber-700"
                                          : ""
                                      }
                                      onClick={() =>
                                        updateRoleMutation.mutate({
                                          userId: user.id,
                                          role:
                                            user.role === "admin"
                                              ? "user"
                                              : "admin",
                                        })
                                      }
                                    >
                                      {user.role === "admin"
                                        ? "Revoke Admin"
                                        : "Grant Admin"}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>

                              {/* Grant / Revoke Free Access */}
                              {hasUserFreeAccess(user) ? (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      title="Revoke free access"
                                      className="text-emerald-600 hover:text-emerald-700"
                                    >
                                      <Gift className="w-4 h-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Revoke Free Access</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Remove free access from {user.name || user.email}? Their subscription will revert to trial status.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        className="bg-amber-600 text-white hover:bg-amber-700"
                                        onClick={() => revokeFreeAccessMutation.mutate({ userId: user.id })}
                                      >
                                        Revoke Free Access
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              ) : (
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      title="Grant free access"
                                      className="text-muted-foreground"
                                    >
                                      <Gift className="w-4 h-4" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>Grant Free Access ({freeAccessDays} Days)</DialogTitle>
                                      <DialogDescription>
                                        Grant complimentary timed access to {user.name || user.email}. A reason is required before granting.
                                      </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4 py-2">
                                      <div className="space-y-2">
                                        <Label>Reason <span className="text-destructive">*</span></Label>
                                        <Select
                                          value={freeAccessReason}
                                          onValueChange={setFreeAccessReason}
                                        >
                                          <SelectTrigger>
                                            <SelectValue placeholder="Select a reason…" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="system_maintenance">System update / maintenance goodwill</SelectItem>
                                            <SelectItem value="service_disruption">Service disruption apology</SelectItem>
                                            <SelectItem value="bug_compensation">Bug impact compensation</SelectItem>
                                            <SelectItem value="support_resolution">Manual support resolution</SelectItem>
                                            <SelectItem value="beta_evaluation">Beta testing / temporary evaluation</SelectItem>
                                            <SelectItem value="special_approval">Special approval / custom case</SelectItem>
                                          </SelectContent>
                                        </Select>
                                        <p className="text-xs text-muted-foreground">
                                          Recorded in the audit trail and shown in the user's notification email.
                                        </p>
                                      </div>
                                      <div className="space-y-2">
                                        <Label>Custom Note <span className="text-muted-foreground text-xs font-normal">(optional)</span></Label>
                                        <textarea
                                          className="w-full min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                          placeholder="Add a short note for the audit trail or email…"
                                          maxLength={500}
                                          value={freeAccessCustomNote}
                                          onChange={(e) => setFreeAccessCustomNote(e.target.value)}
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <Label>Dashboard Access</Label>
                                        <Select
                                          value={freeAccessTier}
                                          onValueChange={(v) => setFreeAccessTier(v as "standard" | "stable" | "student" | "teacher")}
                                        >
                                          <SelectTrigger>
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="standard">Standard (individual horse management)</SelectItem>
                                            <SelectItem value="stable">Stable (yard/stable management)</SelectItem>
                                            <SelectItem value="student">Student (student learning portal)</SelectItem>
                                            <SelectItem value="teacher">Teacher (instructor portal)</SelectItem>
                                          </SelectContent>
                                        </Select>
                                        <p className="text-xs text-muted-foreground">
                                          Standard, Stable, Student, and Teacher access are separate entitlements.
                                        </p>
                                      </div>
                                      <div className="space-y-2">
                                        <Label>Duration</Label>
                                        <Select
                                          value={String(freeAccessDays)}
                                          onValueChange={(v) => setFreeAccessDays(Number(v) as 7 | 14 | 30)}
                                        >
                                          <SelectTrigger>
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="7">7 days (default)</SelectItem>
                                            <SelectItem value="14">14 days</SelectItem>
                                            <SelectItem value="30">30 days</SelectItem>
                                          </SelectContent>
                                        </Select>
                                        <p className="text-xs text-muted-foreground">
                                          Access will expire automatically after this period.
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-2 pt-1">
                                        <input
                                          type="checkbox"
                                          id="sendCompEmail"
                                          checked={freeAccessSendEmail}
                                          onChange={(e) => setFreeAccessSendEmail(e.target.checked)}
                                          className="w-4 h-4 rounded border-gray-300"
                                        />
                                        <Label htmlFor="sendCompEmail" className="text-sm font-normal cursor-pointer">
                                          Send complimentary access email to user
                                        </Label>
                                      </div>
                                    </div>
                                    <DialogFooter>
                                      <Button
                                        className="bg-emerald-600 text-white hover:bg-emerald-700"
                                        onClick={() => grantFreeAccessMutation.mutate({ userId: user.id, tier: freeAccessTier, freeDays: freeAccessDays, reason: freeAccessReason, customNote: freeAccessCustomNote || undefined, sendEmail: freeAccessSendEmail })}
                                        disabled={grantFreeAccessMutation.isPending || !freeAccessReason}
                                      >
                                        {grantFreeAccessMutation.isPending ? (
                                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Granting...</>
                                        ) : (
                                          `Grant ${freeAccessDays}-Day Access`
                                        )}
                                      </Button>
                                    </DialogFooter>
                                  </DialogContent>
                                </Dialog>
                              )}

                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-destructive"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      Delete User
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will permanently deactivate{" "}
                                      {user.name || user.email}'s account. This
                                      action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>
                                      Cancel
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      onClick={() =>
                                        deleteMutation.mutate({
                                          userId: user.id,
                                        })
                                      }
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ); })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>)}

        {activeSection === "overdue" && (<>
          <Card>
            <CardHeader>
              <CardTitle>Overdue Subscriptions</CardTitle>
              <CardDescription>
                Users with payment issues requiring attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!overdueUsers || overdueUsers.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    No overdue subscriptions
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Last Payment</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {overdueUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {user.name || "No name"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {user.email}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {user.lastPaymentAt
                            ? new Date(user.lastPaymentAt).toLocaleDateString()
                            : "Never"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="destructive">Overdue</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm">
                            Send Reminder
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>)}

        {activeSection === "settings" && (<>
          <div className="space-y-6">
            {/* AI / LLM Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5" />
                  AI Configuration
                </CardTitle>
                <CardDescription>
                  Configure the GenX and Hugging Face keys used by the unified AI
                  orchestration layer. Keys saved here override environment
                  variables and take effect immediately.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="genx-key">GenX API Key</Label>
                  <div className="flex gap-2">
                    <Input
                      id="genx-key"
                      type="password"
                      placeholder="Enter new key to update"
                      value={aiConfigForm.genx_api_key}
                      onChange={(e) =>
                        setAiConfigForm((p) => ({
                          ...p,
                          genx_api_key: e.target.value,
                        }))
                      }
                    />
                    <Button
                      size="sm"
                      onClick={() =>
                        setSiteSettingMutation.mutate({
                          key: "genx_api_key",
                          value: aiConfigForm.genx_api_key,
                        })
                      }
                      disabled={
                        setSiteSettingMutation.isPending ||
                        !aiConfigForm.genx_api_key ||
                        aiConfigForm.genx_api_key === "••••••••"
                      }
                    >
                      <Save className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Leave blank / unchanged to keep the existing key.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hf-key">Hugging Face API Key</Label>
                  <div className="flex gap-2">
                    <Input
                      id="hf-key"
                      type="password"
                      placeholder="Enter new key to update"
                      value={aiConfigForm.huggingface_api_key}
                      onChange={(e) =>
                        setAiConfigForm((p) => ({
                          ...p,
                          huggingface_api_key: e.target.value,
                        }))
                      }
                    />
                    <Button
                      size="sm"
                      onClick={() =>
                        setSiteSettingMutation.mutate({
                          key: "huggingface_api_key",
                          value: aiConfigForm.huggingface_api_key,
                        })
                      }
                      disabled={
                        setSiteSettingMutation.isPending ||
                        !aiConfigForm.huggingface_api_key ||
                        aiConfigForm.huggingface_api_key === "••••••••"
                      }
                    >
                      <Save className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Task execution and media generation use this key through the
                    task router.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* SMTP / Email Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Email (SMTP) Configuration
                </CardTitle>
                <CardDescription>
                  Configure the email service for password resets and
                  notifications. Changes take effect on the next email send.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="smtp-host">SMTP Host</Label>
                    <Input
                      id="smtp-host"
                      placeholder="smtp.gmail.com"
                      value={smtpForm.smtp_host}
                      onChange={(e) =>
                        setSmtpForm((p) => ({
                          ...p,
                          smtp_host: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtp-port">SMTP Port</Label>
                    <Input
                      id="smtp-port"
                      placeholder="587"
                      value={smtpForm.smtp_port}
                      onChange={(e) =>
                        setSmtpForm((p) => ({
                          ...p,
                          smtp_port: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp-user">SMTP Username</Label>
                  <Input
                    id="smtp-user"
                    placeholder="you@gmail.com"
                    value={smtpForm.smtp_user}
                    onChange={(e) =>
                      setSmtpForm((p) => ({
                        ...p,
                        smtp_user: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp-pass">
                    SMTP Password / App Password
                  </Label>
                  <Input
                    id="smtp-pass"
                    type="password"
                    placeholder="Enter new password to update"
                    value={smtpForm.smtp_pass}
                    onChange={(e) =>
                      setSmtpForm((p) => ({
                        ...p,
                        smtp_pass: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp-from">From Address</Label>
                  <Input
                    id="smtp-from"
                    placeholder='"EquiProfile" <noreply@equiprofile.online>'
                    value={smtpForm.smtp_from}
                    onChange={(e) =>
                      setSmtpForm((p) => ({
                        ...p,
                        smtp_from: e.target.value,
                      }))
                    }
                  />
                </div>
                <Button
                  onClick={async () => {
                    const fields: Array<{ key: string; value: string }> = [
                      { key: "smtp_host", value: smtpForm.smtp_host },
                      { key: "smtp_port", value: smtpForm.smtp_port },
                      { key: "smtp_user", value: smtpForm.smtp_user },
                      { key: "smtp_from", value: smtpForm.smtp_from },
                    ];
                    if (
                      smtpForm.smtp_pass &&
                      smtpForm.smtp_pass !== "••••••••"
                    ) {
                      fields.push({
                        key: "smtp_pass",
                        value: smtpForm.smtp_pass,
                      });
                    }
                    try {
                      await Promise.all(
                        fields
                          .filter((f) => f.value)
                          .map((f) => setSiteSettingMutation.mutateAsync(f)),
                      );
                      toast.success("SMTP settings saved");
                    } catch {
                      toast.error("Failed to save one or more SMTP settings");
                    }
                  }}
                  disabled={setSiteSettingMutation.isPending}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save SMTP Settings
                </Button>
              </CardContent>
            </Card>

            {/* Stripe Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  Stripe Configuration
                </CardTitle>
                <CardDescription>
                  Store Stripe keys for reference. A server restart is required
                  for Stripe changes to take effect.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="stripe-key">Stripe Secret Key</Label>
                  <div className="flex gap-2">
                    <Input
                      id="stripe-key"
                      type="password"
                      placeholder="sk_live_..."
                      value={stripeForm.stripe_secret_key}
                      onChange={(e) =>
                        setStripeForm((p) => ({
                          ...p,
                          stripe_secret_key: e.target.value,
                        }))
                      }
                    />
                    <Button
                      size="sm"
                      onClick={() =>
                        setSiteSettingMutation.mutate({
                          key: "stripe_secret_key",
                          value: stripeForm.stripe_secret_key,
                        })
                      }
                      disabled={
                        setSiteSettingMutation.isPending ||
                        !stripeForm.stripe_secret_key ||
                        stripeForm.stripe_secret_key === "••••••••"
                      }
                    >
                      <Save className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stripe-webhook">Stripe Webhook Secret</Label>
                  <div className="flex gap-2">
                    <Input
                      id="stripe-webhook"
                      type="password"
                      placeholder="whsec_..."
                      value={stripeForm.stripe_webhook_secret}
                      onChange={(e) =>
                        setStripeForm((p) => ({
                          ...p,
                          stripe_webhook_secret: e.target.value,
                        }))
                      }
                    />
                    <Button
                      size="sm"
                      onClick={() =>
                        setSiteSettingMutation.mutate({
                          key: "stripe_webhook_secret",
                          value: stripeForm.stripe_webhook_secret,
                        })
                      }
                      disabled={
                        setSiteSettingMutation.isPending ||
                        !stripeForm.stripe_webhook_secret ||
                        stripeForm.stripe_webhook_secret === "••••••••"
                      }
                    >
                      <Save className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {settings && settings.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Custom Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {settings.map((setting) => (
                      <div
                        key={setting.id}
                        className="flex items-center justify-between p-3 rounded-lg border"
                      >
                        <div>
                          <p className="font-medium">{setting.settingKey}</p>
                          {setting.description && (
                            <p className="text-sm text-muted-foreground">
                              {setting.description}
                            </p>
                          )}
                        </div>
                        <Badge variant="outline">{setting.settingType}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </>)}

        {activeSection === "system" && (<>
          <Card>
            <CardHeader>
              <CardTitle>Environment Health</CardTitle>
              <CardDescription>System configuration status</CardDescription>
            </CardHeader>
            <CardContent>
              {envHealthQuery.data && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        envHealthQuery.data.healthy ? "default" : "destructive"
                      }
                    >
                      {envHealthQuery.data.healthy
                        ? "✓ All Critical OK"
                        : "✗ Issues Detected"}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      Environment: {envHealthQuery.data.environment}
                    </span>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Variable</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead className="hidden md:table-cell">Description</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {envHealthQuery.data.checks.map((check) => (
                        <TableRow key={check.name}>
                          <TableCell className="font-mono text-sm">
                            {check.name}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={check.status ? "default" : "destructive"}
                            >
                              {check.status ? "✓ Set" : "✗ Missing"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                check.critical ? "destructive" : "secondary"
                              }
                            >
                              {check.critical ? "Critical" : "Optional"}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                            {(check as any).description ?? ""}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>AI Diagnostics</CardTitle>
              <CardDescription>
                Provider status, queue health, failures, and task usage
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!aiDiagnosticsQuery.data ? (
                <Skeleton className="h-24 w-full" />
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {aiDiagnosticsQuery.data.providerHealth.map((provider) => (
                      <div key={provider.provider} className="rounded-lg border p-3">
                        <p className="text-sm font-medium capitalize">{provider.provider}</p>
                        <Badge variant={provider.configured ? "default" : "secondary"} className="mt-2">
                          {provider.status}
                        </Badge>
                        <p className="mt-2 text-xs text-muted-foreground">{provider.message}</p>
                      </div>
                    ))}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Pending approvals</p>
                      <p className="text-2xl font-semibold">{aiDiagnosticsQuery.data.queue.pendingApprovals}</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Processing media jobs</p>
                      <p className="text-2xl font-semibold">{aiDiagnosticsQuery.data.queue.processingJobs}</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Recent failures</p>
                      <p className="text-2xl font-semibold">{aiDiagnosticsQuery.data.recentFailures.length}</p>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Registered agents</p>
                      <p className="text-2xl font-semibold">{aiDiagnosticsQuery.data.agents.length}</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Registered tasks</p>
                      <p className="text-2xl font-semibold">{aiDiagnosticsQuery.data.taskRegistry.length}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Document Health Checker */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Document Health Check
              </CardTitle>
              <CardDescription>
                Detect missing files and broken references on disk
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!docHealthQuery.data ? (
                <Skeleton className="h-20 w-full" />
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-3 rounded-lg bg-muted/30">
                      <p className="text-2xl font-bold">{docHealthQuery.data.total}</p>
                      <p className="text-[11px] text-muted-foreground">Total Documents</p>
                    </div>
                    <div className={`text-center p-3 rounded-lg ${docHealthQuery.data.missing.length > 0 ? "bg-red-50 dark:bg-red-950/20" : "bg-green-50 dark:bg-green-950/20"}`}>
                      <p className={`text-2xl font-bold ${docHealthQuery.data.missing.length > 0 ? "text-red-600" : "text-green-600"}`}>
                        {docHealthQuery.data.missing.length}
                      </p>
                      <p className="text-[11px] text-muted-foreground">Missing Files</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20">
                      <p className="text-2xl font-bold text-amber-600">{docHealthQuery.data.orphaned}</p>
                      <p className="text-[11px] text-muted-foreground">No Horse Link</p>
                    </div>
                  </div>
                  {docHealthQuery.data.missing.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-semibold mb-2">Missing Files:</p>
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {docHealthQuery.data.missing.map((doc: any) => (
                          <div key={doc.id} className="flex items-center justify-between text-xs p-2 rounded bg-red-50/50 dark:bg-red-950/10">
                            <span className="truncate max-w-[60%]">{doc.fileName}</span>
                            <Badge variant="outline" className="text-[10px]">{doc.category || "other"}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {docHealthQuery.data.missing.length === 0 && (
                    <p className="text-sm text-green-600 dark:text-green-400 text-center py-2">
                      ✓ All document files are present on disk
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activity Logs (merged into System) */}
          <Card>
            <CardHeader>
              <CardTitle>Activity Logs</CardTitle>
              <CardDescription>
                Recent system activity and user actions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!activityLogs || activityLogs.length === 0 ? (
                <div className="text-center py-8">
                  <Activity className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground">No activity logs yet</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {activityLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center gap-4 p-3 rounded-lg bg-muted/30"
                    >
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Activity className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {log.action.replace(/_/g, " ")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {log.entityType &&
                            `${log.entityType} #${log.entityId} • `}
                          {new Date(log.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>)}

        {activeSection === "leads" && (<>
          <Card>
            <CardHeader>
              <CardTitle>Chat Leads</CardTitle>
              <CardDescription>
                Visitors who submitted their details via the sales chat widget
              </CardDescription>
            </CardHeader>
            <CardContent>
              {leadsQuery.isLoading ? (
                <div className="space-y-2">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : leadsQuery.data && leadsQuery.data.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leadsQuery.data.map((lead) => (
                      <TableRow key={lead.id}>
                        <TableCell className="font-medium">
                          {lead.name}
                        </TableCell>
                        <TableCell>{lead.email}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {lead.source ?? "chat"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatDistanceToNow(new Date(lead.createdAt), {
                            addSuffix: true,
                          })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>No leads captured yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </>)}

        {activeSection === "whatsapp" && (<>
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5" />
                  WhatsApp Notifications — Twilio
                </CardTitle>
                <CardDescription>
                  Send WhatsApp reminders via Twilio. Credentials are stored
                  securely in the database and take effect immediately.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Status */}
                <div className="flex items-center gap-3 p-3 rounded-lg border">
                  {whatsappConfigQuery.data?.enabled ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-muted-foreground" />
                  )}
                  <div>
                    <p className="font-medium text-sm">
                      Status:{" "}
                      {whatsappConfigQuery.data?.enabled
                        ? "Enabled"
                        : "Disabled"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Account SID:{" "}
                      {whatsappConfigQuery.data?.hasAccountSid
                        ? "Configured"
                        : "Not set"}{" "}
                      · Auth Token:{" "}
                      {whatsappConfigQuery.data?.hasAuthToken
                        ? "Configured"
                        : "Not set"}{" "}
                      · From:{" "}
                      {whatsappConfigQuery.data?.fromNumber || "Not set"}
                    </p>
                  </div>
                </div>

                {/* Toggle */}
                <div className="space-y-2">
                  <Label>Enable WhatsApp</Label>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="wa-enabled"
                      checked={whatsappForm.enabled}
                      onChange={(e) =>
                        setWhatsappForm({
                          ...whatsappForm,
                          enabled: e.target.checked,
                        })
                      }
                      className="w-4 h-4"
                    />
                    <label
                      htmlFor="wa-enabled"
                      className="text-sm text-muted-foreground"
                    >
                      Enable WhatsApp notifications via Twilio
                    </label>
                  </div>
                </div>

                {/* Account SID */}
                <div className="space-y-2">
                  <Label>Twilio Account SID</Label>
                  <Input
                    placeholder={
                      whatsappConfigQuery.data?.hasAccountSid
                        ? "••••••••• (already configured)"
                        : "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    }
                    value={whatsappForm.accountSid}
                    onChange={(e) =>
                      setWhatsappForm({
                        ...whatsappForm,
                        accountSid: e.target.value,
                      })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Found in Twilio Console → Account Info. Leave blank to keep existing.
                  </p>
                </div>

                {/* Auth Token */}
                <div className="space-y-2">
                  <Label>Twilio Auth Token</Label>
                  <Input
                    type="password"
                    placeholder={
                      whatsappConfigQuery.data?.hasAuthToken
                        ? "••••••••• (already configured)"
                        : "Your Twilio Auth Token"
                    }
                    value={whatsappForm.authToken}
                    onChange={(e) =>
                      setWhatsappForm({
                        ...whatsappForm,
                        authToken: e.target.value,
                      })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Found in Twilio Console → Account Info. Leave blank to keep existing.
                  </p>
                </div>

                {/* From Number */}
                <div className="space-y-2">
                  <Label>WhatsApp From Number</Label>
                  <Input
                    placeholder="whatsapp:+14155238886"
                    value={whatsappForm.fromNumber}
                    onChange={(e) =>
                      setWhatsappForm({
                        ...whatsappForm,
                        fromNumber: e.target.value,
                      })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Your Twilio WhatsApp sender number in{" "}
                    <code>whatsapp:+E.164</code> format. Found in Twilio Console
                    → Messaging → Senders.
                  </p>
                </div>

                <Button
                  onClick={() =>
                    updateWhatsAppMutation.mutate({
                      enabled: whatsappForm.enabled,
                      accountSid: whatsappForm.accountSid || undefined,
                      authToken: whatsappForm.authToken || undefined,
                      fromNumber: whatsappForm.fromNumber || undefined,
                    })
                  }
                  disabled={updateWhatsAppMutation.isPending}
                >
                  {updateWhatsAppMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Configuration
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">
                  How It Works
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  EquiProfile uses Twilio's WhatsApp API to send reminders. When enabled,
                  users can enter their mobile number in Settings → Notifications to
                  opt in. Messages are sent automatically by the reminder scheduler.
                </p>
                <ul className="space-y-1.5">
                  {[
                    "Event reminders — 24h before calendar events",
                    "Health & care reminders — upcoming due dates",
                    "Vaccination alerts — vaccination due notifications",
                    "Trial expiry — 2 days, 1 day, and day-of warnings",
                  ].map((t) => (
                    <li key={t} className="flex items-start gap-2 text-sm">
                      <span className="text-primary">•</span>
                      <span className="text-xs text-muted-foreground">{t}</span>
                    </li>
                  ))}
                </ul>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Credentials can also be set via environment variables:{" "}
                    <code className="text-primary">TWILIO_ACCOUNT_SID</code>,{" "}
                    <code className="text-primary">TWILIO_AUTH_TOKEN</code>,{" "}
                    <code className="text-primary">TWILIO_WHATSAPP_FROM</code>.
                    Environment variables take priority over dashboard settings.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>
        </>)}

        {activeSection === "deleted" && (<>
          <Card>
            <CardHeader>
              <CardTitle>Deleted Users</CardTitle>
              <CardDescription>
                Users who have been soft-deleted. They can be restored to active status.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!deletedUsers || deletedUsers.length === 0 ? (
                <div className="text-center py-8">
                  <Trash2 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground">No deleted users</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Deleted</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deletedUsers.map((user) => (
                        <TableRow key={user.id} className="opacity-60">
                          <TableCell>
                            <div>
                              <p className="font-medium">{user.name || "No name"}</p>
                              <p className="text-sm text-muted-foreground">{user.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{user.subscriptionStatus || "free"}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {user.updatedAt
                              ? formatDistanceToNow(new Date(user.updatedAt), { addSuffix: true })
                              : "Unknown"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="outline" size="sm" className="gap-1">
                                    <RotateCcw className="w-3 h-3" />
                                    Restore
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Restore User</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Restore {user.name || user.email} to active status? They will regain access to their account.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => restoreUserMutation.mutate({ userId: user.id })}
                                    >
                                      Restore
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>

                              {/* Hard delete — permanent, cannot be undone */}
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm" className="text-destructive gap-1">
                                    <Trash2 className="w-3 h-3" />
                                    Purge
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Permanently Delete User</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will <strong>permanently</strong> delete {user.name || user.email} and all associated data from the database. This cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      onClick={() => hardDeleteUserMutation.mutate({ userId: user.id })}
                                    >
                                      Permanently Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
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
        </>)}

        {activeSection === "analytics" && (<>
          <Suspense
            fallback={
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            }
          >
            <AdminAnalytics />
          </Suspense>
        </>)}

        {activeSection === "churn" && (<>
          <div className="space-y-4">
            {/* Trial Expiring Soon */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  Trials Expiring Soon
                </CardTitle>
                <CardDescription>Users whose trial ends within 3 days</CardDescription>
              </CardHeader>
              <CardContent>
                {!churnRiskQuery.data?.trialExpiring?.length ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No trials expiring soon</p>
                ) : (
                  <div className="space-y-2">
                    {churnRiskQuery.data.trialExpiring.map((u: any) => (
                      <div key={u.id} className="flex items-center justify-between p-3 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-500/20">
                        <div>
                          <p className="text-sm font-medium">{u.name || "Unknown"}</p>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                        </div>
                        <Badge variant="outline" className="text-amber-600 border-amber-500/30">
                          Expires {u.trialEndsAt ? new Date(u.trialEndsAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "soon"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Overdue / At Risk */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  Overdue / At Risk
                </CardTitle>
                <CardDescription>Users with overdue payments at risk of churning</CardDescription>
              </CardHeader>
              <CardContent>
                {!churnRiskQuery.data?.atRisk?.length ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No users at risk</p>
                ) : (
                  <div className="space-y-2">
                    {churnRiskQuery.data.atRisk.map((u: any) => (
                      <div key={u.id} className="flex items-center justify-between p-3 rounded-lg bg-red-50/50 dark:bg-red-950/20 border border-red-500/20">
                        <div>
                          <p className="text-sm font-medium">{u.name || "Unknown"}</p>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                        </div>
                        <Badge variant="destructive" className="text-xs">Overdue</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Inactive Users */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="w-4 h-4 text-gray-500" />
                  Inactive Users
                </CardTitle>
                <CardDescription>Active subscribers with no activity in 14+ days</CardDescription>
              </CardHeader>
              <CardContent>
                {!churnRiskQuery.data?.inactive?.length ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">All users are active</p>
                ) : (
                  <div className="space-y-2">
                    {churnRiskQuery.data.inactive.map((u: any) => (
                      <div key={u.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                        <div>
                          <p className="text-sm font-medium">{u.name || "Unknown"}</p>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline" className="text-xs">{u.subscriptionStatus}</Badge>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Last active: {u.updatedAt ? new Date(u.updatedAt).toLocaleDateString("en-GB") : "Unknown"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>)}

        {activeSection === "portals" && (<>
          <Card className="bg-white dark:bg-card border border-gray-200 dark:border-gray-700 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Eye className="w-4 h-4 text-[#2e6da4]" /> Dashboard Portal Access
              </CardTitle>
              <CardDescription>
                Select a dashboard to access it with full functionality.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Pro Dashboard", icon: "🐴", path: "/dashboard", mode: "pro" as const, btnColor: "bg-[#2e6da4] hover:bg-[#245a8a]" },
                  { label: "Stable Dashboard", icon: "🏠", path: "/stable-dashboard", mode: "stable" as const, btnColor: "bg-[#2d6a4f] hover:bg-[#245a42]" },
                ].map((portal) => (
                  <Button
                    key={portal.label}
                    size="sm"
                    className={`w-full text-white text-xs h-auto py-3 rounded-lg shadow-sm ${portal.btnColor}`}
                    onClick={() => { setViewMode(portal.mode); navigate(portal.path); }}
                  >
                    <span className="mr-2">{portal.icon}</span> {portal.label}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </>)}

        </div>
    </div>
  );
}

export default function Admin() {
  return (
    <DashboardLayout>
      <AdminContent />
    </DashboardLayout>
  );
}
