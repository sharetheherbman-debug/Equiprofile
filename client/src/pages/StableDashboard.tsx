import { useAuth } from "@/_core/hooks/useAuth";
import { useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  Heart,
  Users,
  Calendar,
  Dumbbell,
  Stethoscope,
  ChevronRight,
  Plus,
  Shield,
  Building2,
  UserCog,
  FolderOpen,
  Settings,
  ClipboardList,
  DollarSign,
  Loader2,
  Wrench,
  BarChart3,
  MessageSquare,
  Baby,
  Activity,
  Clock,
  Brain,
  AlertCircle,
  Navigation,
  GitBranch,
  Tag,
  FileText,
  Apple,
  ShoppingCart,
  BookOpen,
  Trophy,
  Cloud,
  Syringe,
  Pill,
  Scissors,
  XCircle,
  Home,
} from "lucide-react";

// ─── Stable module groups for desktop feature directory ──────────────────────
const stableModuleGroups = [
  {
    label: "Operations",
    gradient: "from-amber-500 to-orange-600",
    labelColor: "text-amber-400",
    items: [
      { icon: Heart, label: "Horses", path: "/horses" },
      { icon: UserCog, label: "Staff", path: "/staff" },
      { icon: Users, label: "Contacts", path: "/contacts" },
      { icon: Calendar, label: "Calendar", path: "/calendar" },
      { icon: ClipboardList, label: "Tasks", path: "/tasks" },
      { icon: Clock, label: "Appointments", path: "/appointments" },
      { icon: Cloud, label: "Weather", path: "/weather" },
    ],
  },
  {
    label: "Health",
    gradient: "from-rose-500 to-red-600",
    labelColor: "text-rose-400",
    items: [
      { icon: Stethoscope, label: "Health Hub", path: "/health" },
      { icon: Syringe, label: "Vaccinations", path: "/vaccinations" },
      { icon: Scissors, label: "Dental Care", path: "/dental" },
      { icon: Activity, label: "Hoof Care", path: "/hoofcare" },
      { icon: Pill, label: "Dewormings", path: "/dewormings" },
      { icon: Heart, label: "Treatments", path: "/treatments" },
      { icon: XCircle, label: "X-Rays", path: "/xrays" },
    ],
  },
  {
    label: "Training & Activity",
    gradient: "from-green-500 to-emerald-600",
    labelColor: "text-emerald-400",
    items: [
      { icon: Dumbbell, label: "Training Log", path: "/training" },
      { icon: BookOpen, label: "Templates", path: "/training-templates" },
      { icon: Navigation, label: "GPS Tracking", path: "/ride-tracking" },
      { icon: Trophy, label: "Competitions", path: "/competitions" },
      { icon: Activity, label: "Lessons", path: "/lessons" },
      { icon: Baby, label: "Breeding", path: "/breeding" },
    ],
  },
  {
    label: "Nutrition",
    gradient: "from-lime-500 to-green-600",
    labelColor: "text-lime-400",
    items: [
      { icon: Apple, label: "Feeding Plans", path: "/feeding" },
      { icon: FileText, label: "Nutrition Plans", path: "/nutrition-plans" },
      { icon: BookOpen, label: "Nutrition Logs", path: "/nutrition-logs" },
      { icon: ShoppingCart, label: "Feed Costs", path: "/feed-costs" },
    ],
  },
  {
    label: "Data & Reports",
    gradient: "from-indigo-500 to-violet-600",
    labelColor: "text-indigo-400",
    items: [
      { icon: FolderOpen, label: "Documents", path: "/documents" },
      { icon: BarChart3, label: "Analytics", path: "/analytics" },
      { icon: FileText, label: "Reports", path: "/stable-reports" },
      { icon: Tag, label: "Tags", path: "/tags" },
      { icon: GitBranch, label: "Pedigree", path: "/pedigree" },
      { icon: Shield, label: "Equine Passport", path: "/equine-passport" },
    ],
  },
  {
    label: "Stable & People",
    gradient: "from-cyan-500 to-teal-600",
    labelColor: "text-cyan-400",
    items: [
      { icon: Home, label: "Stable Profile", path: "/stable" },
      { icon: Wrench, label: "Stable Setup", path: "/stable-setup" },
      { icon: Users, label: "Client Portal", path: "/client-portal" },
      { icon: BarChart3, label: "Stable Reports", path: "/stable-reports" },
      { icon: MessageSquare, label: "Messages", path: "/messages" },
      { icon: Brain, label: "AI Assistant", path: "/ai-chat" },
    ],
  },
  {
    label: "Account",
    gradient: "from-slate-500 to-gray-600",
    labelColor: "text-slate-400",
    items: [
      { icon: Settings, label: "Settings", path: "/settings" },
      { icon: DollarSign, label: "Billing", path: "/billing" },
    ],
  },
];

type HorseEntry = {
  id: number;
  name: string;
  breed?: string | null;
  age?: number | null;
  photoUrl?: string | null;
};

type HealthAlert = {
  id: string;
  horseId: number;
  horseName: string;
  type: "vaccination_due" | "deworming_due" | "treatment_due" | "no_recent_health" | "appointment_upcoming";
  severity: "info" | "warning" | "urgent";
  title: string;
  dueDate?: string;
  daysDue?: number;
};

// ─── Stable operational quick-stats ────────────────────────────────────────

const PRIORITY_COLOR: Record<string, string> = {
  high: "bg-red-500",
  medium: "bg-amber-500",
  low: "bg-green-500",
};
function taskPriorityColor(priority: string): string {
  return PRIORITY_COLOR[priority] ?? "bg-green-500";
}



function StableDashboardContent() {
  const { user } = useAuth();
  const { data: horses = [], isLoading: horsesLoading } =
    trpc.horses.list.useQuery(undefined, { retry: false, staleTime: 5 * 60 * 1000 });
  const { data: subscriptionStatus, isLoading: subLoading } =
    trpc.user.getSubscriptionStatus.useQuery();
  const { data: tasks = [] } = trpc.tasks.list.useQuery(undefined, {
    retry: false,
    staleTime: 2 * 60 * 1000,
  });
  const { data: upcomingAppointments = [] } = trpc.appointments.list.useQuery(
    undefined,
    { retry: false, staleTime: 2 * 60 * 1000 },
  );
  const { data: healthAlerts = [] } = trpc.timeline.getHealthAlerts.useQuery({}, {
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
  const { data: trainingStats } = trpc.analytics.getTrainingStats.useQuery(
    {},
    { retry: false, staleTime: 5 * 60 * 1000 },
  );
  const { data: stats } = trpc.user.getDashboardStats.useQuery(undefined, {
    retry: false,
    staleTime: 2 * 60 * 1000,
  });

  // Stable calendar query dates — computed once per mount
  const calendarQueryDates = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return {
      startDate: start.toISOString(),
      endDate: new Date(start.getTime() + 31 * 24 * 60 * 60 * 1000).toISOString(),
    };
  }, []);

  const { data: allCalendarEvents = [] } = trpc.calendar.getEvents.useQuery(
    calendarQueryDates,
    { retry: false, staleTime: 5 * 60 * 1000 },
  );

  // Admin users bypass plan checks — they can review any dashboard
  const isStablePlan = subscriptionStatus?.planTier === "stable" || user?.role === "admin";

  if (subLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isStablePlan) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-5">
          <Shield className="w-5 h-5 text-primary" />
        </div>
        <h2 className="font-serif text-2xl font-bold mb-2">
          Stable Plan Required
        </h2>
        <p className="text-muted-foreground mb-6 max-w-sm text-sm">
          The Stable Dashboard is exclusively for Stable plan subscribers.
          Upgrade to access full stable management, staff tools, client portal,
          and more.
        </p>
        <Link href="/billing">
          <Button>
            Upgrade to Stable Plan
            <ChevronRight className="w-4 h-4 ml-1.5" />
          </Button>
        </Link>
      </div>
    );
  }

  const today = new Date();
  const activeTasks = (tasks as any[]).filter((t: any) => !t.isCompleted);
  const futureAppointments = (upcomingAppointments as any[])
    .filter((a: any) => new Date(a.appointmentDate) >= new Date())
    .sort(
      (a: any, b: any) =>
        new Date(a.appointmentDate).getTime() -
        new Date(b.appointmentDate).getTime(),
    )
    .slice(0, 4);

  const greeting = (() => {
    const h = today.getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <div className="space-y-4 sm:space-y-5 pb-6">
      {/* ── Stable Hero ───────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-amber-950/60 to-orange-950/40 p-5 sm:p-6 text-white shadow-xl shadow-black/30 border border-amber-500/20"
      >
        <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-amber-500/10" />
        <div className="pointer-events-none absolute -bottom-6 right-14 h-28 w-28 rounded-full bg-orange-500/[0.07]" />
        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-0.5">
            <p className="text-xs font-medium text-amber-300/70 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{greeting}, {user?.name?.split(" ")[0] || "Manager"}</span>
            </p>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold leading-tight">
              Stable Operations
            </h1>
            <p className="text-amber-200/50 text-xs">
              {today.toLocaleDateString("en-GB", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </p>
          </div>
          <div className="flex flex-wrap items-start gap-2 shrink-0">
            <Badge className="bg-amber-500/20 text-amber-200 border-amber-500/30 gap-1 text-[11px]">
              <Shield className="w-3 h-3" />
              Stable Plan
            </Badge>
            <Badge className="bg-white/10 text-white/80 border-white/15 gap-1 text-[11px]">
              <Heart className="w-3 h-3" />
              {horsesLoading ? "…" : (horses as HorseEntry[]).length} Horses
            </Badge>
          </div>
        </div>

        {/* Quick actions — pill style matching standard dashboard */}
        <div className="relative mt-4 flex flex-wrap gap-2">
          {[
            { label: "Add Horse", href: "/horses/new", icon: Plus, color: "from-rose-500 to-pink-600" },
            { label: "Staff", href: "/staff", icon: UserCog, color: "from-blue-500 to-indigo-600" },
            { label: "Calendar", href: "/calendar", icon: Calendar, color: "from-amber-500 to-orange-600" },
            { label: "AI Chat", href: "/ai-chat", icon: Brain, color: "from-indigo-500 to-violet-600" },
            { label: "Reports", href: "/stable-reports", icon: BarChart3, color: "from-cyan-500 to-teal-600" },
          ].map((action) => {
            const ActionIcon = action.icon;
            return (
              <Link key={action.href} href={action.href}>
                <button className="flex items-center gap-1.5 shrink-0 px-3 py-2 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-xs font-medium text-white border border-white/15">
                  <div className={`w-4 h-4 rounded-full bg-gradient-to-br ${action.color} flex items-center justify-center`}>
                    <ActionIcon className="w-2.5 h-2.5 text-white" />
                  </div>
                  {action.label}
                </button>
              </Link>
            );
          })}
          <a
            href="#marketing-studio-coming-soon"
            className="flex items-center gap-1.5 shrink-0 px-3 py-2 rounded-full bg-indigo-500/15 hover:bg-indigo-500/25 active:scale-95 transition-all text-xs font-medium text-indigo-100 border border-indigo-400/30"
          >
            <Brain className="w-3 h-3 text-indigo-300" />
            Marketing Studio
          </a>
        </div>
      </motion.div>

      <Card
        id="marketing-studio-coming-soon"
        className="border-indigo-500/20 bg-gradient-to-br from-indigo-950/25 to-slate-950/30"
      >
        <CardHeader className="pb-2">
          <CardTitle className="font-serif text-sm flex items-center gap-2">
            <Brain className="w-4 h-4 text-indigo-400" />
            Marketing Studio — Coming Soon
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Marketing planning, CRM, email campaign tools and approval-first content workflows are coming soon for Stable and School plans. Direct social publishing is not enabled in beta.
          </p>
        </CardContent>
      </Card>

      {/* ── Operational KPIs ─────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05 }}
        className="grid grid-cols-2 min-[480px]:grid-cols-3 gap-3 sm:gap-4"
      >
        <Link href="/horses">
          <div className="flex flex-col items-center gap-1.5 p-4 rounded-xl border border-rose-500/20 bg-gradient-to-br from-rose-950/40 to-pink-950/20 hover:from-rose-950/60 hover:border-rose-500/35 transition-all cursor-pointer text-center group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
              <Heart className="w-4 h-4 text-white" />
            </div>
            <p className="text-2xl font-bold font-serif leading-none mt-0.5">
              {horsesLoading ? "…" : (horses as HorseEntry[]).length}
            </p>
            <p className="text-[10px] text-muted-foreground leading-tight font-medium uppercase tracking-wider">
              Horses
            </p>
          </div>
        </Link>
        <Link href="/tasks">
          <div className="flex flex-col items-center gap-1.5 p-4 rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-950/40 to-orange-950/20 hover:from-amber-950/60 hover:border-amber-500/35 transition-all cursor-pointer text-center group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
              <ClipboardList className="w-4 h-4 text-white" />
            </div>
            <p className="text-2xl font-bold font-serif leading-none mt-0.5">{activeTasks.length}</p>
            <p className="text-[10px] text-muted-foreground leading-tight font-medium uppercase tracking-wider">
              Tasks
            </p>
          </div>
        </Link>
        <Link href="/calendar">
          <div className="flex flex-col items-center gap-1.5 p-4 rounded-xl border border-indigo-500/20 bg-gradient-to-br from-indigo-950/40 to-blue-950/20 hover:from-indigo-950/60 hover:border-indigo-500/35 transition-all cursor-pointer text-center group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
              <Calendar className="w-4 h-4 text-white" />
            </div>
            <p className="text-2xl font-bold font-serif leading-none mt-0.5">
              {futureAppointments.length}
            </p>
            <p className="text-[10px] text-muted-foreground leading-tight font-medium uppercase tracking-wider">
              Upcoming
            </p>
          </div>
        </Link>
      </motion.div>

      {/* ── Care Alerts ──────────────────────────────────────── */}
      {(() => {
        const isActionableAlert = (a: HealthAlert) =>
          (a.severity === "urgent" || a.severity === "warning") && a.type !== "no_recent_health";
        const actionableAlerts = healthAlerts.filter(isActionableAlert);
        if (actionableAlerts.length === 0) return null;
        const visibleAlerts = actionableAlerts.slice(0, 3);
        return (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <Card className="border-amber-500/20 bg-gradient-to-br from-amber-950/20 to-slate-950/30">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="font-serif text-sm flex items-center gap-2">
                    <Stethoscope className="w-4 h-4 text-amber-400" />
                    Care Reminders
                  </CardTitle>
                  {actionableAlerts.length > 3 && (
                    <Link href="/health">
                      <Button variant="ghost" size="sm" className="h-6 text-[11px] text-amber-400/80 hover:text-amber-300 px-2">
                        View all →
                      </Button>
                    </Link>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {visibleAlerts.map((alert) => (
                  <Link key={alert.id} href={alert.horseId ? `/horses/${alert.horseId}` : "/health"}>
                    <div className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-colors ${
                      alert.severity === "urgent"
                        ? "border-red-500/25 bg-red-500/5 hover:bg-red-500/10"
                        : "border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10"
                    }`}>
                      <div className="flex items-center gap-2">
                        <AlertCircle className={`w-3.5 h-3.5 shrink-0 ${alert.severity === "urgent" ? "text-red-400" : "text-amber-400"}`} />
                        <p className="text-xs font-medium leading-snug">{alert.title}</p>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        );
      })()}

      {/* ── Getting Started (shown when no horses yet) ─────────── */}
      {(horses as HorseEntry[]).length === 0 && !horsesLoading && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.08 }}
        >
          <Card className="border-amber-500/20 bg-gradient-to-br from-amber-950/20 to-slate-950/40">
            <CardHeader className="pb-2">
              <CardTitle className="font-serif text-sm flex items-center gap-2">
                <Wrench className="w-4 h-4 text-amber-400" />
                Getting Started
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/stable-setup">
                <div className="flex items-center justify-between p-2.5 rounded-lg border border-amber-500/15 bg-amber-500/5 hover:bg-amber-500/10 cursor-pointer transition-colors">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-amber-400 shrink-0" />
                    <p className="text-xs font-medium">Complete stable setup</p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50" />
                </div>
              </Link>
              <Link href="/horses/new">
                <div className="flex items-center justify-between p-2.5 rounded-lg border border-amber-500/15 bg-amber-500/5 hover:bg-amber-500/10 cursor-pointer transition-colors">
                  <div className="flex items-center gap-2">
                    <Heart className="w-4 h-4 text-rose-400 shrink-0" />
                    <p className="text-xs font-medium">Add your first horse</p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50" />
                </div>
              </Link>
              <Link href="/staff">
                <div className="flex items-center justify-between p-2.5 rounded-lg border border-amber-500/15 bg-amber-500/5 hover:bg-amber-500/10 cursor-pointer transition-colors">
                  <div className="flex items-center gap-2">
                    <UserCog className="w-4 h-4 text-blue-400 shrink-0" />
                    <p className="text-xs font-medium">Add staff members</p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50" />
                </div>
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ── Horse Roster + Upcoming (two-column) ────────────────*/}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-3"
      >
        {/* Horse Roster */}
        <Card className="border-white/5 bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="font-serif text-sm flex items-center gap-2">
                <Heart className="w-4 h-4 text-rose-400" />
                Horse Roster
              </CardTitle>
              <Link href="/horses/new">
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1 px-2">
                  <Plus className="w-3 h-3" /> Add
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {horsesLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            ) : (horses as HorseEntry[]).length === 0 ? (
              <div className="text-center py-5 text-muted-foreground">
                <Heart className="w-7 h-7 mx-auto mb-2 opacity-25" />
                <p className="text-xs">No horses registered</p>
                <Link href="/horses/new">
                  <Button variant="ghost" size="sm" className="mt-2 text-xs h-7">
                    Add first horse
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-1.5">
                {(horses as HorseEntry[]).slice(0, 5).map((horse) => (
                  <Link key={horse.id} href={`/horses/${horse.id}`}>
                    <div className="flex items-center gap-2.5 p-2.5 rounded-lg border border-muted/30 bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer">
                      {horse.photoUrl ? (
                        <img
                          src={horse.photoUrl}
                          alt={horse.name}
                          className="w-8 h-8 rounded-full object-cover shrink-0 border border-border"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              "/images/hero/image6.jpg";
                          }}
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shrink-0">
                          <span className="text-[10px] text-white font-bold">
                            {horse.name.charAt(0)}
                          </span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">
                          {horse.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {horse.breed || "Unknown breed"}
                          {horse.age ? ` · ${horse.age}yr` : ""}
                        </p>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                    </div>
                  </Link>
                ))}
                {(horses as HorseEntry[]).length > 5 && (
                  <Link href="/horses">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full mt-1 text-xs text-muted-foreground hover:text-foreground h-7"
                    >
                      View all {(horses as HorseEntry[]).length} horses{" "}
                      <ChevronRight className="w-3 h-3 ml-1" />
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Appointments + Active Tasks */}
        <div className="flex flex-col gap-3">
          <Card className="border-white/5 bg-card/80 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="font-serif text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-400" />
                Upcoming Appointments
              </CardTitle>
            </CardHeader>
            <CardContent>
              {futureAppointments.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  <Calendar className="w-6 h-6 mx-auto mb-2 opacity-25" />
                  <p className="text-xs">No upcoming appointments</p>
                  <Link href="/appointments">
                    <Button variant="ghost" size="sm" className="mt-1 text-xs h-7">
                      Schedule
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {futureAppointments.map((appt: any) => {
                    const d = new Date(appt.appointmentDate);
                    const isToday =
                      d.toDateString() === new Date().toDateString();
                    return (
                      <div
                        key={appt.id}
                        className={`flex items-center gap-2.5 p-2 rounded-lg border text-xs ${isToday ? "border-amber-500/25 bg-amber-500/5" : "border-muted/30 bg-muted/20"}`}
                      >
                        <div className="text-center shrink-0 w-7">
                          <p className="text-[9px] text-muted-foreground uppercase leading-none">
                            {d.toLocaleDateString("en-GB", { month: "short" })}
                          </p>
                          <p className="text-sm font-bold leading-tight">
                            {d.getDate()}
                          </p>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{appt.title}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {appt.appointmentType || "Appointment"}
                          </p>
                        </div>
                        {isToday && (
                          <Badge className="text-[9px] h-4 px-1.5 bg-amber-500/20 text-amber-300 border-amber-500/30 shrink-0">
                            Today
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pending Tasks */}
          {activeTasks.length > 0 && (
            <Card className="border-white/5 bg-card/80 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="font-serif text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-400" />
                    Pending Tasks
                    <Badge className="text-[9px] h-4 px-1.5 bg-amber-500/20 text-amber-300 border-amber-500/30">
                      {activeTasks.length}
                    </Badge>
                  </CardTitle>
                  <Link href="/tasks">
                    <Button variant="ghost" size="sm" className="h-7 text-xs px-2">
                      View all
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {activeTasks.slice(0, 4).map((task: any) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-2 p-2 rounded-lg border border-muted/25 bg-muted/15 text-xs"
                    >
                      <div
                        className={`w-2 h-2 rounded-full shrink-0 ${taskPriorityColor(task.priority)}`}
                      />
                      <p className="font-medium truncate">{task.title}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </motion.div>

      {/* ── Training & Health Summary ─────────────────────────── */}
      {(trainingStats?.totalSessions || 0) > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.22 }}
          className="grid grid-cols-2 gap-3"
        >
          <div className="flex items-center gap-2.5 p-3 rounded-xl border border-muted/30 bg-card/60">
            <Dumbbell className="w-4 h-4 shrink-0 text-green-400" />
            <div>
              <p className="text-lg font-bold leading-none">{Math.round((trainingStats?.totalDuration || 0) / 60)}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Training hrs logged</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 p-3 rounded-xl border border-muted/30 bg-card/60">
            <Stethoscope className="w-4 h-4 shrink-0 text-amber-400" />
            <div>
              <p className="text-lg font-bold leading-none">{stats?.reminderCount || 0}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Health reminders</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── All Features — desktop-only module directory ─────── */}
      <div className="hidden md:block">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.28 }}
          className="space-y-4"
        >
          <div className="flex items-center gap-3 pb-1 border-b border-white/5">
            <div className="w-1 h-5 rounded-full bg-gradient-to-b from-amber-500 via-orange-500 to-rose-500" />
            <h2 className="font-serif text-base font-semibold">All Features</h2>
            <span className="text-xs text-muted-foreground/70">Complete stable toolkit</span>
          </div>
          <div className="space-y-3">
            {stableModuleGroups.map((group) => (
              <div key={group.label} className="rounded-xl border border-white/[0.07] bg-card/50 p-4 space-y-3 hover:border-white/[0.12] transition-colors">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-sm bg-gradient-to-br ${group.gradient} shrink-0`} />
                  <p className={`text-[11px] font-bold uppercase tracking-widest ${group.labelColor}`}>
                    {group.label}
                  </p>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link key={item.path} href={item.path}>
                        <div className="group flex flex-col items-center gap-1.5 p-3 rounded-xl border border-white/5 bg-card/60 hover:bg-card hover:border-white/15 hover:shadow-sm transition-all duration-200 text-center cursor-pointer active:scale-95">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br ${group.gradient} group-hover:scale-105 transition-transform duration-200`}>
                            <Icon className="h-5 w-5 text-white" />
                          </div>
                          <span className="text-[11px] leading-tight font-medium">{item.label}</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

    </div>
  );
}

export default function StableDashboard() {
  return (
    <DashboardLayout>
      <StableDashboardContent />
    </DashboardLayout>
  );
}
