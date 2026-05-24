// Copyright (c) 2025-2026 Amarktai Network. All rights reserved.
/**
 * SchoolDashboard — Dashboard for school owners to manage their organization.
 * View teachers, students, seat usage, invite members, manage roles.
 * Includes a multi-step onboarding wizard for new schools.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import {
  Building2,
  Users,
  UserPlus,
  Mail,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Trash2,
  ChevronRight,
  ChevronLeft,
  GraduationCap,
  BookOpen,
  ArrowRight,
  Settings,
  LogOut,
  Check,
} from "lucide-react";

// ── Design tokens ────────────────────────────────────────────────────────────
const CARD = "bg-[#111827] border border-white/[0.06] rounded-xl p-5";

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`${CARD} ${className}`}>{children}</div>;
}

// ── Onboarding Wizard ────────────────────────────────────────────────────────
type WizardStep = "welcome" | "details" | "invite" | "done";

function OnboardingWizard({
  onComplete,
}: {
  onComplete: () => void;
}) {
  const [step, setStep] = useState<WizardStep>("welcome");
  const [orgName, setOrgName] = useState("");
  const [orgDesc, setOrgDesc] = useState("");
  const [orgType, setOrgType] = useState<"riding_school" | "college" | "training_centre" | "other">("riding_school");
  const [invites, setInvites] = useState<Array<{ email: string; role: "teacher" | "student" }>>([]);
  const [currentEmail, setCurrentEmail] = useState("");
  const [currentRole, setCurrentRole] = useState<"teacher" | "student">("teacher");
  const [orgCreated, setOrgCreated] = useState(false);

  const createOrgMutation = trpc.school.createOrganization.useMutation({
    onSuccess: () => {
      setOrgCreated(true);
      setStep("invite");
    },
  });

  const inviteMutation = trpc.school.inviteMember.useMutation();

  const addInvite = () => {
    const email = currentEmail.trim();
    if (!email || invites.find((i) => i.email === email)) return;
    setInvites([...invites, { email, role: currentRole }]);
    setCurrentEmail("");
  };

  const removeInvite = (email: string) => {
    setInvites(invites.filter((i) => i.email !== email));
  };

  const sendAllInvites = async () => {
    for (const invite of invites) {
      try {
        await inviteMutation.mutateAsync({ email: invite.email, role: invite.role });
      } catch {
        // Continue with remaining invites
      }
    }
    setStep("done");
  };

  const stepIndex = { welcome: 0, details: 1, invite: 2, done: 3 }[step];

  return (
    <div className="max-w-xl mx-auto py-8">
      {/* Progress steps */}
      <div className="flex items-center justify-center gap-2 mb-10">
        {["Welcome", "Details", "Invite", "Done"].map((label, idx) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                idx <= stepIndex
                  ? "bg-indigo-500 text-white"
                  : "bg-white/[0.06] text-gray-500"
              }`}
            >
              {idx < stepIndex ? <Check className="w-4 h-4" /> : idx + 1}
            </div>
            {idx < 3 && (
              <div className={`w-8 h-0.5 ${idx < stepIndex ? "bg-indigo-500" : "bg-white/[0.06]"}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step: Welcome */}
      {step === "welcome" && (
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#3a93b8] to-[#5b8def] flex items-center justify-center mx-auto mb-6 shadow-lg shadow-[#5b8def]/30">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Welcome to School Management</h2>
          <p className="text-gray-400 mb-2 max-w-md mx-auto">
            Set up your school or organisation in a few simple steps. You'll be able to manage teachers, students, and learning content all from one place.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-8 mb-8">
            {[
              { icon: BookOpen, label: "95+ Lessons", desc: "Structured learning pathways" },
              { icon: Users, label: "Seat Management", desc: "Add teachers & students" },
              { icon: GraduationCap, label: "Track Progress", desc: "Reports & analytics" },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-4 text-center">
                <Icon className="w-6 h-6 text-indigo-400 mx-auto mb-2" />
                <p className="text-xs font-semibold text-white">{label}</p>
                <p className="text-[10px] text-gray-500">{desc}</p>
              </div>
            ))}
          </div>
          <button
            onClick={() => setStep("details")}
            className="px-8 py-3 rounded-xl bg-gradient-to-r from-[#2e86ab] to-[#5b8def] text-white font-semibold hover:from-[#1a5276] hover:to-[#4a7dd4] transition-all inline-flex items-center gap-2"
          >
            Get Started <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Step: Details */}
      {step === "details" && (
        <div>
          <h2 className="text-xl font-bold text-white mb-1 text-center">Organisation Details</h2>
          <p className="text-sm text-gray-400 mb-6 text-center">Tell us about your school</p>

          <Card>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Organisation Name *</label>
                <input
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="e.g. Greenfield Riding School"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/40"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Type of Organisation</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: "riding_school", label: "Riding School" },
                    { value: "college", label: "College" },
                    { value: "training_centre", label: "Training Centre" },
                    { value: "other", label: "Other" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setOrgType(opt.value as typeof orgType)}
                      className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                        orgType === opt.value
                          ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                          : "bg-white/[0.04] text-gray-400 border border-white/[0.06] hover:bg-white/[0.06]"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Description (optional)</label>
                <textarea
                  value={orgDesc}
                  onChange={(e) => setOrgDesc(e.target.value)}
                  placeholder="Brief description of your organisation..."
                  rows={3}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/40 resize-none"
                />
              </div>

              {createOrgMutation.isError && (
                <p className="text-xs text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {createOrgMutation.error?.message || "Failed to create"}
                </p>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => setStep("welcome")}
                  className="px-4 py-2.5 rounded-lg bg-white/[0.06] text-gray-400 text-sm hover:bg-white/[0.1] transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 inline mr-1" /> Back
                </button>
                <button
                  onClick={() => createOrgMutation.mutate({ name: orgName.trim(), description: orgDesc.trim() || undefined })}
                  disabled={!orgName.trim() || createOrgMutation.isPending}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {createOrgMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</>
                  ) : (
                    <>Create Organisation <ChevronRight className="w-4 h-4" /></>
                  )}
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Step: Invite */}
      {step === "invite" && (
        <div>
          <div className="text-center mb-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
            <h2 className="text-xl font-bold text-white mb-1">Organisation Created!</h2>
            <p className="text-sm text-gray-400">Now invite your team. You can also do this later.</p>
          </div>

          <Card>
            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  value={currentEmail}
                  onChange={(e) => setCurrentEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addInvite()}
                  placeholder="email@example.com"
                  type="email"
                  className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/40"
                />
                <select
                  value={currentRole}
                  onChange={(e) => setCurrentRole(e.target.value as "teacher" | "student")}
                  className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/40"
                >
                  <option value="teacher">Teacher</option>
                  <option value="student">Student</option>
                </select>
                <button
                  onClick={addInvite}
                  disabled={!currentEmail.trim()}
                  className="px-4 py-2.5 rounded-lg bg-indigo-500/20 text-indigo-400 text-sm font-medium hover:bg-indigo-500/30 disabled:opacity-30 transition-colors"
                >
                  Add
                </button>
              </div>

              {invites.length > 0 && (
                <div className="space-y-2">
                  {invites.map((invite) => (
                    <div key={invite.email} className="flex items-center gap-3 py-2 px-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                      <Mail className="w-4 h-4 text-gray-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{invite.email}</p>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] text-gray-400 capitalize">
                        {invite.role}
                      </span>
                      <button
                        onClick={() => removeInvite(invite.email)}
                        className="text-gray-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => {
                    setStep("done");
                  }}
                  className="px-4 py-2.5 rounded-lg bg-white/[0.06] text-gray-400 text-sm hover:bg-white/[0.1] transition-colors"
                >
                  Skip for Now
                </button>
                <button
                  onClick={sendAllInvites}
                  disabled={invites.length === 0 || inviteMutation.isPending}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {inviteMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
                  ) : (
                    <>Send {invites.length} Invite{invites.length !== 1 ? "s" : ""} <ArrowRight className="w-4 h-4" /></>
                  )}
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Step: Done */}
      {step === "done" && (
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">You're All Set!</h2>
          <p className="text-gray-400 mb-8 max-w-md mx-auto">
            Your school is ready. You can manage members, track student progress, and assign
            learning content from your dashboard.
          </p>
          <button
            onClick={onComplete}
            className="px-8 py-3 rounded-xl bg-gradient-to-r from-[#2e86ab] to-[#5b8def] text-white font-semibold hover:from-[#1a5276] hover:to-[#4a7dd4] transition-all inline-flex items-center gap-2"
          >
            Go to Dashboard <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

export default function SchoolDashboard() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = trpc.school.getStats.useQuery();
  const { data: members, isLoading: membersLoading, refetch: refetchMembers } = trpc.school.listMembers.useQuery();

  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"teacher" | "student">("student");

  const inviteMutation = trpc.school.inviteMember.useMutation({
    onSuccess: () => {
      setInviteEmail("");
      setShowInvite(false);
      refetchStats();
    },
  });
  const removeMutation = trpc.school.removeMember.useMutation({
    onSuccess: () => { refetchMembers(); refetchStats(); },
  });

  if (statsLoading) {
    return (
      <div className="min-h-screen bg-[#0b1726] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
      </div>
    );
  }

  const org = stats?.organization;
  const teachers = (members ?? []).filter((m: any) => m.role === "teacher" || m.role === "school_owner");
  const students = (members ?? []).filter((m: any) => m.role === "student");

  return (
    <div className="min-h-screen bg-[#0b1726]">
      {/* Header */}
      <header className="bg-[#111827] border-b border-white/[0.06] px-4 sm:px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">School Dashboard</h1>
              <p className="text-xs text-gray-500">{org?.name ?? "Set up your school"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLocation("/settings")}
              className="p-2 rounded-lg hover:bg-white/[0.06] text-gray-400 hover:text-white transition-colors"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={() => logout()}
              className="p-2 rounded-lg hover:bg-white/[0.06] text-gray-400 hover:text-white transition-colors"
              title="Log out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {!org ? (
          // ── Onboarding Wizard ──────────────────────────────────────────
          <OnboardingWizard onComplete={() => { refetchStats(); refetchMembers(); }} />
        ) : (
          // ── Organization Dashboard ────────────────────────────────────
          <>
            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Plan" value={org.planTier.replace(/_/g, " ").toUpperCase()} />
              <StatCard label="Teachers" value={`${stats?.teacherCount ?? 0} / ${org.maxTeachers}`} />
              <StatCard label="Students" value={`${stats?.studentCount ?? 0} / ${org.maxStudents}`} />
              <StatCard label="Pending Invites" value={String(stats?.pendingInviteCount ?? 0)} />
            </div>

            <Card>
              <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-400" />
                Marketing Studio — Coming Soon
              </h3>
              <p className="text-sm text-gray-400">
                Marketing planning, CRM, email campaign tools and approval-first content workflows are coming soon for Stable and School plans. Direct social publishing is not enabled in beta.
              </p>
            </Card>

            {/* Invite button */}
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-400" />
                Members
              </h2>
              <button
                onClick={() => setShowInvite(!showInvite)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 transition-colors"
              >
                <UserPlus className="w-4 h-4" /> Invite Member
              </button>
            </div>

            {/* Invite form */}
            {showInvite && (
              <Card>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Email Address</label>
                    <input
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="teacher@example.com"
                      type="email"
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/40"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Role</label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as any)}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/40"
                    >
                      <option value="student">Student</option>
                      <option value="teacher">Teacher</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        if (inviteEmail.trim()) {
                          inviteMutation.mutate({ email: inviteEmail.trim(), role: inviteRole });
                        }
                      }}
                      disabled={!inviteEmail.trim() || inviteMutation.isPending}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 disabled:opacity-50 transition-colors"
                    >
                      <Mail className="w-4 h-4" />
                      {inviteMutation.isPending ? "Sending..." : "Send Invite"}
                    </button>
                    <button
                      onClick={() => setShowInvite(false)}
                      className="px-4 py-2 rounded-lg bg-white/[0.06] text-gray-400 text-sm hover:bg-white/[0.1] transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                  {inviteMutation.isSuccess && (
                    <p className="text-xs text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Invite sent successfully!
                    </p>
                  )}
                  {inviteMutation.isError && (
                    <p className="text-xs text-red-400 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {inviteMutation.error?.message || "Failed to send invite"}
                    </p>
                  )}
                </div>
              </Card>
            )}

            {/* Teachers list */}
            <Card>
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-400" />
                Teachers ({teachers.length})
              </h3>
              {membersLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-indigo-400 mx-auto" />
              ) : teachers.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-4">No teachers yet. Invite one above.</p>
              ) : (
                <div className="space-y-2">
                  {teachers.map((m: any) => (
                    <MemberRow
                      key={m.id}
                      name={m.userName ?? m.userEmail ?? "Unknown"}
                      role={m.role}
                      joinedAt={m.joinedAt}
                      onRemove={m.role !== "school_owner" ? () => removeMutation.mutate({ memberId: m.id }) : undefined}
                    />
                  ))}
                </div>
              )}
            </Card>

            {/* Students list */}
            <Card>
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                Students ({students.length})
              </h3>
              {membersLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-indigo-400 mx-auto" />
              ) : students.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-4">No students yet. Invite them above.</p>
              ) : (
                <div className="space-y-2">
                  {students.map((m: any) => (
                    <MemberRow
                      key={m.id}
                      name={m.userName ?? m.userEmail ?? "Unknown"}
                      role={m.role}
                      joinedAt={m.joinedAt}
                      onRemove={() => removeMutation.mutate({ memberId: m.id })}
                    />
                  ))}
                </div>
              )}
            </Card>
          </>
        )}
      </main>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className={`${CARD}`}>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-lg font-bold text-white">{value}</p>
    </div>
  );
}

function MemberRow({ name, role, joinedAt, onRemove }: {
  name: string;
  role: string;
  joinedAt: string | Date | null;
  onRemove?: () => void;
}) {
  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
      <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-xs font-bold text-indigo-400">
        {name.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{name}</p>
        <p className="text-[10px] text-gray-500">
          {role === "school_owner" ? "Owner" : role.charAt(0).toUpperCase() + role.slice(1)}
          {joinedAt && <> · Joined {new Date(joinedAt).toLocaleDateString()}</>}
        </p>
      </div>
      {onRemove && (
        <button
          onClick={onRemove}
          className="text-gray-500 hover:text-red-400 transition-colors"
          title="Remove member"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
