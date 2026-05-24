// Copyright (c) 2025-2026 Amarktai Network. All rights reserved.
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import TeacherDashboardLayout, { type TeacherView } from "@/components/TeacherDashboardLayout";
import {
  Users,
  UsersRound,
  ClipboardList,
  MessageSquare,
  FileText,
  Plus,
  X,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  ArrowLeft,
  Edit2,
  Trash2,
  Star,
  Lightbulb,
  Library,
  BookOpen,
  Award,
  AlertCircle,
  Calendar,
  Shield,
  ChevronLeft,
  FolderOpen,
} from "lucide-react";

// ── Design tokens ─────────────────────────────────────────────────────────
const TEACHER_ACCENT = "#2d6a4f";
const T_CARD = "bg-white dark:bg-[#1a2435] border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm";

// ── Shared sub-components ──────────────────────────────────────────────────

function TCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`${T_CARD} p-5 ${className}`}>{children}</div>;
}

function THeading({ icon: Icon, title }: { icon: React.ComponentType<{ className?: string }>; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-1">
      <Icon className="w-5 h-5 text-[#2d6a4f]" />
      <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">{title}</h2>
    </div>
  );
}

function EmptyState({ icon: Icon, title, body }: { icon: React.ComponentType<{ className?: string }>; title: string; body: string }) {
  return (
    <TCard>
      <div className="text-center py-8">
        <Icon className="w-8 h-8 text-gray-400 mx-auto mb-3" />
        <p className="text-sm font-semibold text-gray-500 mb-1">{title}</p>
        <p className="text-xs text-gray-400 max-w-xs mx-auto">{body}</p>
      </div>
    </TCard>
  );
}

function StatCard({ label, value, color = "#2d6a4f" }: { label: string; value: number | string; color?: string }) {
  return (
    <div className={T_CARD + " p-4"}>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{value}</p>
      <div className="mt-2 h-0.5 rounded-full" style={{ backgroundColor: color, width: "40%" }} />
    </div>
  );
}

const LEVEL_COLORS: Record<string, string> = {
  beginner: "#2d6a4f",
  developing: "#6366f1",
  intermediate: "#f59e0b",
  advanced: "#ef4444",
};

const FEEDBACK_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  good: { label: "Good", color: "#2d6a4f", bg: "rgba(45,106,79,0.08)" },
  needs_improvement: { label: "Needs Improvement", color: "#f59e0b", bg: "rgba(245,158,11,0.08)" },
  urgent: { label: "Urgent Attention", color: "#ef4444", bg: "rgba(239,68,68,0.08)" },
  general: { label: "General", color: "#6366f1", bg: "rgba(99,102,241,0.08)" },
};

// ── Overview View ──────────────────────────────────────────────────────────

function OverviewView({ onNavigate }: { onNavigate: (v: TeacherView) => void }) {
  const { data, isLoading } = trpc.teacher.getTeacherOverview.useQuery();

  if (isLoading) return <TCard><Loader2 className="w-5 h-5 animate-spin text-[#2d6a4f] mx-auto" /></TCard>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Good to see you</h2>
        <p className="text-sm text-gray-500 mt-0.5">Here's what's happening across your classes.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Groups" value={data?.totalGroups ?? 0} color={TEACHER_ACCENT} />
        <StatCard label="Students" value={data?.totalStudents ?? 0} color="#6366f1" />
        <StatCard label="Pending Tasks" value={data?.pendingAssignedTasks ?? 0} color="#f59e0b" />
        <StatCard label="Feedback Sent" value={data?.recentFeedback?.length ?? 0} color="#ec4899" />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { icon: UsersRound, label: "Manage Groups", view: "groups" as TeacherView },
          { icon: Users, label: "View Students", view: "students" as TeacherView },
          { icon: ClipboardList, label: "Assign Tasks", view: "tasks" as TeacherView },
          { icon: MessageSquare, label: "Give Feedback", view: "feedback" as TeacherView },
          { icon: FileText, label: "View Reports", view: "reports" as TeacherView },
        ].map((a) => {
          const AIcon = a.icon;
          return (
            <button
              key={a.view}
              onClick={() => onNavigate(a.view)}
              className="flex items-center gap-3 p-4 min-h-[56px] rounded-xl border border-gray-200 bg-white text-left hover:border-[#2d6a4f]/40 hover:bg-[#2d6a4f]/5 transition-all"
            >
              <AIcon className="w-5 h-5 text-[#2d6a4f] shrink-0" />
              <span className="text-sm font-medium text-gray-800 dark:text-gray-100">{a.label}</span>
            </button>
          );
        })}
      </div>

      <TCard className="border-emerald-200 dark:border-emerald-800">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-emerald-700 dark:text-emerald-300" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Teacher Communications Preview</p>
            <p className="text-xs text-gray-500 mt-1">
              Lesson-promotion and learner communication tools are planned for teachers with approval-first safeguards.
            </p>
          </div>
        </div>
      </TCard>

      {/* Recent feedback */}
      {(data?.recentFeedback?.length ?? 0) > 0 && (
        <TCard>
          <THeading icon={MessageSquare} title="Recent Feedback Sent" />
          <div className="space-y-2 mt-3">
            {data!.recentFeedback.slice(0, 4).map((f) => {
              const style = FEEDBACK_STYLES[f.feedbackType] ?? FEEDBACK_STYLES.general;
              return (
                <div key={f.id} className="flex items-start gap-3 p-3 rounded-lg" style={{ backgroundColor: style.bg, borderLeft: `3px solid ${style.color}` }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-800/80 line-clamp-2">{f.comment}</p>
                    <p className="text-[10px] mt-1" style={{ color: style.color }}>{style.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </TCard>
      )}
    </div>
  );
}

// ── Groups View ────────────────────────────────────────────────────────────

function GroupsView() {
  const utils = trpc.useUtils();
  const { data: groups, isLoading } = trpc.teacher.listGroups.useQuery();
  const createMut = trpc.teacher.createGroup.useMutation({ onSuccess: () => utils.teacher.listGroups.invalidate() });
  const deleteMut = trpc.teacher.deleteGroup.useMutation({ onSuccess: () => utils.teacher.listGroups.invalidate() });
  const addMemberMut = trpc.teacher.addGroupMember.useMutation({ onSuccess: () => utils.teacher.listGroupMembers.invalidate() });
  const removeMemberMut = trpc.teacher.removeGroupMember.useMutation({ onSuccess: () => utils.teacher.listGroupMembers.invalidate() });

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", level: "beginner" as "beginner" | "developing" | "intermediate" | "advanced", academicYear: "" });
  const [expandedGroup, setExpandedGroup] = useState<number | null>(null);
  const [addEmail, setAddEmail] = useState("");
  const [addingTo, setAddingTo] = useState<number | null>(null);
  const [addError, setAddError] = useState("");

  const { data: members } = trpc.teacher.listGroupMembers.useQuery(
    { groupId: expandedGroup! },
    { enabled: expandedGroup !== null },
  );

  const handleAddMember = (groupId: number) => {
    if (!addEmail.trim()) return;
    setAddError("");
    addMemberMut.mutate({ groupId, studentEmail: addEmail.trim() }, {
      onSuccess: () => { setAddEmail(""); setAddingTo(null); },
      onError: (e) => setAddError(e.message),
    });
  };

  if (isLoading) return <TCard><Loader2 className="w-5 h-5 animate-spin text-[#2d6a4f] mx-auto" /></TCard>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <THeading icon={UsersRound} title="Groups & Classes" />
        <button onClick={() => setShowCreate(!showCreate)} className="text-sm text-[#2d6a4f] hover:text-[#2d6a4f] flex items-center gap-1">
          <Plus className="w-4 h-4" /> New Group
        </button>
      </div>

      {showCreate && (
        <TCard>
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input placeholder="Group / class name *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                className="px-4 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:border-[#2d6a4f] focus:outline-none" />
              <input placeholder="Academic year (e.g. 2025–26)" value={form.academicYear} onChange={e => setForm({ ...form, academicYear: e.target.value })}
                className="px-4 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:border-[#2d6a4f] focus:outline-none" />
              <select value={form.level} onChange={e => setForm({ ...form, level: e.target.value as typeof form.level })}
                className="px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100 text-sm focus:border-[#2d6a4f] focus:outline-none">
                <option value="beginner">Beginner</option>
                <option value="developing">Developing</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
              <input placeholder="Description (optional)" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                className="px-4 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:border-[#2d6a4f] focus:outline-none" />
            </div>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2.5 text-sm text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Cancel</button>
              <button
                disabled={!form.name.trim() || createMut.isPending}
                onClick={() => {
                  createMut.mutate({ name: form.name.trim(), level: form.level, description: form.description.trim() || undefined, academicYear: form.academicYear.trim() || undefined });
                  setForm({ name: "", description: "", level: "beginner", academicYear: "" });
                  setShowCreate(false);
                }}
                className="px-5 py-2.5 rounded-lg bg-[#2d6a4f] hover:bg-[#245a42] text-white text-sm font-medium disabled:opacity-50"
              >
                {createMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Group"}
              </button>
            </div>
          </div>
        </TCard>
      )}

      {(groups ?? []).length === 0 ? (
        <EmptyState icon={UsersRound} title="No groups yet" body="Create your first class or group to start managing students and assigning tasks." />
      ) : (
        <div className="space-y-3">
          {(groups ?? []).map((g) => {
            const lc = LEVEL_COLORS[g.level] ?? TEACHER_ACCENT;
            const isExpanded = expandedGroup === g.id;
            return (
              <TCard key={g.id}>
                <div className="flex items-center justify-between">
                  <button className="flex items-center gap-3 flex-1 text-left" onClick={() => setExpandedGroup(isExpanded ? null : g.id)}>
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${lc}18` }}>
                      <UsersRound className="w-4 h-4" style={{ color: lc }} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{g.name}</p>
                      <p className="text-xs text-gray-500">{g.memberCount} students · <span style={{ color: lc }}>{g.level}</span>{g.academicYear ? ` · ${g.academicYear}` : ""}</p>
                    </div>
                    {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-500 ml-auto" /> : <ChevronRight className="w-4 h-4 text-gray-500 ml-auto" />}
                  </button>
                  <button onClick={() => deleteMut.mutate({ id: g.id })} className="ml-3 text-gray-400 hover:text-red-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                    {/* Members list */}
                    {(members ?? []).length === 0 ? (
                      <p className="text-xs text-gray-500 text-center py-2">No students yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {(members ?? []).map((m) => (
                          <div key={m.memberId} className="flex items-center justify-between">
                            <div>
                              <p className="text-xs font-medium text-gray-800 dark:text-gray-100">{m.name}</p>
                              <p className="text-[10px] text-gray-500">{m.email}</p>
                            </div>
                            <button onClick={() => removeMemberMut.mutate({ memberId: m.memberId })} className="text-gray-400 hover:text-red-500 transition-colors ml-2">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add student */}
                    {addingTo === g.id ? (
                      <div className="space-y-2">
                        <input
                          placeholder="Student's email address"
                          value={addEmail}
                          onChange={e => { setAddEmail(e.target.value); setAddError(""); }}
                          className="w-full px-4 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:border-[#2d6a4f] focus:outline-none"
                        />
                        {addError && <p className="text-xs text-red-500">{addError}</p>}
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => { setAddingTo(null); setAddEmail(""); setAddError(""); }} className="text-xs text-gray-500 hover:text-gray-700">Cancel</button>
                          <button onClick={() => handleAddMember(g.id)} disabled={addMemberMut.isPending || !addEmail.trim()}
                            className="px-4 py-2 rounded-lg bg-[#2d6a4f] hover:bg-[#245a42] text-white text-xs font-medium disabled:opacity-50">
                            {addMemberMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Add Student"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setAddingTo(g.id)} className="text-xs text-[#2d6a4f] hover:text-[#2d6a4f] flex items-center gap-1">
                        <Plus className="w-3 h-3" /> Add student by email
                      </button>
                    )}
                  </div>
                )}
              </TCard>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Students View ──────────────────────────────────────────────────────────

function StudentsView({ onFeedback }: { onFeedback: (studentId: number, name: string) => void }) {
  const { data: students, isLoading } = trpc.teacher.listMyStudents.useQuery();
  const [selectedStudent, setSelectedStudent] = useState<number | null>(null);
  const { data: summary, isLoading: summaryLoading } = trpc.teacher.getStudentSummary.useQuery(
    { studentUserId: selectedStudent! },
    { enabled: selectedStudent !== null },
  );

  if (isLoading) return <TCard><Loader2 className="w-5 h-5 animate-spin text-[#2d6a4f] mx-auto" /></TCard>;

  if (selectedStudent !== null) {
    const student = (students ?? []).find(s => s.id === selectedStudent);
    return (
      <div className="space-y-4">
        <button onClick={() => setSelectedStudent(null)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" /> Back to students
        </button>

        {summaryLoading || !summary ? (
          <TCard><Loader2 className="w-5 h-5 animate-spin text-[#2d6a4f] mx-auto" /></TCard>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#2d6a4f]/20 flex items-center justify-center">
                <span className="text-sm font-bold text-[#2d6a4f]">{(summary.student.name ?? "?")[0]?.toUpperCase()}</span>
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-800 dark:text-gray-100">{summary.student.name}</h3>
                <p className="text-xs text-gray-500">{summary.student.email} · <span style={{ color: LEVEL_COLORS[summary.student.learnerLevel] ?? TEACHER_ACCENT }}>{summary.student.learnerLevel}</span></p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label="Care Completion" value={`${summary.stats.careCompletion}%`} color={TEACHER_ACCENT} />
              <StatCard label="Total XP" value={summary.stats.totalXp} color="#6366f1" />
              <StatCard label="Avg Skill Level" value={summary.stats.avgSkillLevel} color="#f59e0b" />
              <StatCard label="Training Sessions" value={summary.stats.trainingCount} color="#ec4899" />
            </div>

            {summary.recentTraining.length > 0 && (
              <TCard>
                <THeading icon={TrendingUp} title="Recent Training" />
                <div className="space-y-2 mt-3">
                  {summary.recentTraining.map((t, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-gray-200 last:border-0">
                      <div>
                        <p className="text-sm text-gray-800 font-medium">{t.title}</p>
                        <p className="text-xs text-gray-500">{String(t.sessionDate).slice(0, 10)} · {t.sessionType}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </TCard>
            )}

            <button
              onClick={() => onFeedback(summary.student.id, summary.student.name ?? "")}
              className="w-full py-3 rounded-xl bg-[#2d6a4f] hover:bg-[#245a42] text-white text-sm font-medium transition-colors"
            >
              <MessageSquare className="w-4 h-4 inline mr-2" /> Give Feedback to {summary.student.name}
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <THeading icon={Users} title="My Students" />
      {(students ?? []).length === 0 ? (
        <EmptyState icon={Users} title="No students yet" body="Create groups and add students by email to see them here." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(students ?? []).map((s) => {
            const lc = LEVEL_COLORS[s.learnerLevel] ?? TEACHER_ACCENT;
            return (
              <button key={s.id} onClick={() => setSelectedStudent(s.id)}
                className="text-left p-4 rounded-xl border border-gray-200 bg-white hover:border-[#2d6a4f]/40 hover:bg-[#2d6a4f]/5 transition-all">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${lc}20` }}>
                    <span className="text-xs font-bold" style={{ color: lc }}>{(s.name ?? "?")[0]?.toUpperCase()}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{s.name}</p>
                    <p className="text-xs text-gray-500 truncate">{s.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: `${lc}18`, color: lc }}>
                    {s.learnerLevel}
                  </span>
                  {s.groups.map(g => (
                    <span key={g.id} className="text-[10px] text-gray-500">{g.name}</span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Tasks View ─────────────────────────────────────────────────────────────

function TasksView() {
  const utils = trpc.useUtils();
  const { data: students } = trpc.teacher.listMyStudents.useQuery();
  const { data: groups } = trpc.teacher.listGroups.useQuery();
  const { data: tasks, isLoading } = trpc.teacher.listAssignedTasksByTeacher.useQuery();
  const assignMut = trpc.teacher.assignTask.useMutation({ onSuccess: () => utils.teacher.listAssignedTasksByTeacher.invalidate() });
  const deleteMut = trpc.teacher.deleteAssignedTask.useMutation({ onSuccess: () => utils.teacher.listAssignedTasksByTeacher.invalidate() });

  const [showForm, setShowForm] = useState(false);
  const [assignTo, setAssignTo] = useState<"student" | "group">("student");
  const [form, setForm] = useState({
    title: "", description: "", category: "care" as const,
    dueDate: "", frequency: "once" as const,
    studentUserId: "", groupId: "",
  });

  const handleAssign = () => {
    const studentUserId = assignTo === "student" && form.studentUserId ? parseInt(form.studentUserId) : undefined;
    const groupId = assignTo === "group" && form.groupId ? parseInt(form.groupId) : undefined;

    assignMut.mutate({
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      category: form.category,
      dueDate: form.dueDate || undefined,
      frequency: form.frequency,
      studentUserId,
      groupId,
    }, {
      onSuccess: () => {
        setForm({ title: "", description: "", category: "care", dueDate: "", frequency: "once", studentUserId: "", groupId: "" });
        setShowForm(false);
      },
    });
  };

  if (isLoading) return <TCard><Loader2 className="w-5 h-5 animate-spin text-[#2d6a4f] mx-auto" /></TCard>;

  const pending = (tasks ?? []).filter(t => !t.isCompleted);
  const completed = (tasks ?? []).filter(t => t.isCompleted);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <THeading icon={ClipboardList} title="Assign Tasks" />
        <button onClick={() => setShowForm(!showForm)} className="text-sm text-[#2d6a4f] hover:text-[#2d6a4f] flex items-center gap-1">
          <Plus className="w-4 h-4" /> Assign Task
        </button>
      </div>

      {showForm && (
        <TCard>
          <div className="space-y-3">
            <div className="flex gap-2">
              {(["student", "group"] as const).map(t => (
                <button key={t} onClick={() => setAssignTo(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${assignTo === t ? "bg-[#2d6a4f] text-white" : "bg-gray-50 text-gray-500 hover:text-gray-700"}`}>
                  {t === "student" ? "Individual Student" : "Whole Group"}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {assignTo === "student" ? (
                <select value={form.studentUserId} onChange={e => setForm({ ...form, studentUserId: e.target.value })}
                  className="px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100 text-sm focus:border-[#2d6a4f] focus:outline-none">
                  <option value="">Select student *</option>
                  {(students ?? []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              ) : (
                <select value={form.groupId} onChange={e => setForm({ ...form, groupId: e.target.value })}
                  className="px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100 text-sm focus:border-[#2d6a4f] focus:outline-none">
                  <option value="">Select group *</option>
                  {(groups ?? []).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              )}

              <input placeholder="Task title *" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                className="px-4 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:border-[#2d6a4f] focus:outline-none" />

              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value as typeof form.category })}
                className="px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100 text-sm focus:border-[#2d6a4f] focus:outline-none">
                <option value="care">Care</option>
                <option value="grooming">Grooming</option>
                <option value="feeding">Feeding</option>
                <option value="study">Study</option>
                <option value="exercise">Exercise</option>
                <option value="safety">Safety</option>
                <option value="other">Other</option>
              </select>

              <select value={form.frequency} onChange={e => setForm({ ...form, frequency: e.target.value as typeof form.frequency })}
                className="px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100 text-sm focus:border-[#2d6a4f] focus:outline-none">
                <option value="once">Once</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>

              <input type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })}
                className="px-4 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100 text-sm focus:border-[#2d6a4f] focus:outline-none" />

              <input placeholder="Instructions (optional)" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                className="px-4 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:border-[#2d6a4f] focus:outline-none" />
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button onClick={() => setShowForm(false)} className="px-4 py-2.5 text-sm text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Cancel</button>
              <button
                disabled={!form.title.trim() || (assignTo === "student" ? !form.studentUserId : !form.groupId) || assignMut.isPending}
                onClick={handleAssign}
                className="px-5 py-2.5 rounded-lg bg-[#2d6a4f] hover:bg-[#245a42] text-white text-sm font-medium disabled:opacity-50 w-full sm:w-auto"
              >
                {assignMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Assign Task"}
              </button>
            </div>
          </div>
        </TCard>
      )}

      {pending.length === 0 && completed.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No assigned tasks" body="Assign tasks to individual students or whole groups to track completion here." />
      ) : (
        <>
          {pending.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Pending ({pending.length})</p>
              <div className="space-y-2">
                {pending.map(t => (
                  <TCard key={t.id} className="!p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{t.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {t.category} · {t.frequency}
                          {t.dueDate ? ` · Due ${String(t.dueDate).slice(0, 10)}` : ""}
                          {t.groupId ? " · Group task" : ""}
                        </p>
                        {t.description && <p className="text-xs text-gray-500 mt-1">{t.description}</p>}
                      </div>
                      <button onClick={() => deleteMut.mutate({ id: t.id })} className="text-gray-400 hover:text-red-500 shrink-0">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </TCard>
                ))}
              </div>
            </div>
          )}

          {completed.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Completed ({completed.length})</p>
              <div className="space-y-2">
                {completed.slice(0, 5).map(t => (
                  <TCard key={t.id} className="!p-4 opacity-60">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#2d6a4f] shrink-0" />
                      <p className="text-sm text-gray-800 dark:text-gray-100">{t.title}</p>
                    </div>
                  </TCard>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Feedback View ──────────────────────────────────────────────────────────

function FeedbackView({ prefillStudentId, prefillStudentName, onClearPrefill }: {
  prefillStudentId?: number;
  prefillStudentName?: string;
  onClearPrefill: () => void;
}) {
  const utils = trpc.useUtils();
  const { data: students } = trpc.teacher.listMyStudents.useQuery();
  const { data: feedbackList, isLoading } = trpc.teacher.listFeedbackByTeacher.useQuery();
  const addMut = trpc.teacher.addFeedback.useMutation({ onSuccess: () => { utils.teacher.listFeedbackByTeacher.invalidate(); onClearPrefill(); } });
  const deleteMut = trpc.teacher.deleteFeedback.useMutation({ onSuccess: () => utils.teacher.listFeedbackByTeacher.invalidate() });

  const [showForm, setShowForm] = useState(prefillStudentId !== undefined);
  const [form, setForm] = useState({
    studentUserId: prefillStudentId?.toString() ?? "",
    entryType: "general" as "training_entry" | "task" | "general" | "progress",
    comment: "",
    feedbackType: "general" as "good" | "needs_improvement" | "urgent" | "general",
  });

  const handleAdd = () => {
    if (!form.studentUserId || !form.comment.trim()) return;
    addMut.mutate({
      studentUserId: parseInt(form.studentUserId),
      entryType: form.entryType,
      comment: form.comment.trim(),
      feedbackType: form.feedbackType,
    }, {
      onSuccess: () => {
        setForm({ studentUserId: "", entryType: "general", comment: "", feedbackType: "general" });
        setShowForm(false);
      },
    });
  };

  if (isLoading) return <TCard><Loader2 className="w-5 h-5 animate-spin text-[#2d6a4f] mx-auto" /></TCard>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <THeading icon={MessageSquare} title="Student Feedback" />
        <button onClick={() => setShowForm(!showForm)} className="text-sm text-[#2d6a4f] hover:text-[#2d6a4f] flex items-center gap-1">
          <Plus className="w-4 h-4" /> Add Feedback
        </button>
      </div>

      {prefillStudentName && (
        <div className="flex items-center gap-2 text-xs text-[#2d6a4f] bg-[#2d6a4f]/10 rounded-lg px-4 py-2">
          <Lightbulb className="w-3.5 h-3.5" />
          Adding feedback for {prefillStudentName}
          <button onClick={onClearPrefill} className="ml-auto text-gray-500 hover:text-gray-700"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {showForm && (
        <TCard>
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <select value={form.studentUserId} onChange={e => setForm({ ...form, studentUserId: e.target.value })}
                className="px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100 text-sm focus:border-[#2d6a4f] focus:outline-none">
                <option value="">Select student *</option>
                {(students ?? []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <select value={form.entryType} onChange={e => setForm({ ...form, entryType: e.target.value as typeof form.entryType })}
                className="px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100 text-sm focus:border-[#2d6a4f] focus:outline-none">
                <option value="general">General</option>
                <option value="training_entry">Training Entry</option>
                <option value="progress">Progress</option>
                <option value="task">Task</option>
              </select>
              <select value={form.feedbackType} onChange={e => setForm({ ...form, feedbackType: e.target.value as typeof form.feedbackType })}
                className="px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100 text-sm focus:border-[#2d6a4f] focus:outline-none">
                <option value="good">Good Work</option>
                <option value="needs_improvement">Needs Improvement</option>
                <option value="urgent">Urgent Attention</option>
                <option value="general">General Comment</option>
              </select>
            </div>
            <textarea
              placeholder="Your feedback comment *"
              value={form.comment}
              onChange={e => setForm({ ...form, comment: e.target.value })}
              rows={3}
              className="w-full px-4 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:border-[#2d6a4f] focus:outline-none resize-none"
            />
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button onClick={() => setShowForm(false)} className="px-4 py-2.5 text-sm text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Cancel</button>
              <button
                disabled={!form.studentUserId || !form.comment.trim() || addMut.isPending}
                onClick={handleAdd}
                className="px-5 py-2.5 rounded-lg bg-[#2d6a4f] hover:bg-[#245a42] text-white text-sm font-medium disabled:opacity-50 w-full sm:w-auto"
              >
                {addMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send Feedback"}
              </button>
            </div>
          </div>
        </TCard>
      )}

      {(feedbackList ?? []).length === 0 ? (
        <EmptyState icon={MessageSquare} title="No feedback sent" body="Select a student from the Students tab and give feedback on their training, tasks, or progress." />
      ) : (
        <div className="space-y-3">
          {(feedbackList ?? []).map(f => {
            const style = FEEDBACK_STYLES[f.feedbackType] ?? FEEDBACK_STYLES.general;
            return (
              <TCard key={f.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: style.bg, color: style.color }}>{style.label}</span>
                      <span className="text-[10px] text-gray-500">{f.entryType.replace(/_/g, " ")}</span>
                    </div>
                    <p className="text-sm text-gray-600">{f.comment}</p>
                    <p className="text-[10px] text-gray-400 mt-1">{String(f.createdAt).slice(0, 10)}</p>
                  </div>
                  <button onClick={() => deleteMut.mutate({ id: f.id })} className="text-gray-400 hover:text-red-500 shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </TCard>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Reports View ───────────────────────────────────────────────────────────

function ReportsView() {
  const { data: students } = trpc.teacher.listMyStudents.useQuery();
  const [selectedStudent, setSelectedStudent] = useState<{ id: number; name: string } | null>(null);
  const [reportType, setReportType] = useState<"weekly" | "monthly" | "term">("monthly");

  const { data: report, isLoading, refetch } = trpc.teacher.generateReport.useQuery(
    { studentUserId: selectedStudent?.id ?? 0, reportType },
    { enabled: selectedStudent !== null },
  );

  const SKILL_LABELS: Record<string, string> = {
    riding_position: "Riding Position", aids_control: "Aids & Control",
    grooming: "Grooming", feeding: "Feeding", tack: "Tack",
    safety: "Safety", health_awareness: "Health Awareness", behaviour: "Behaviour",
  };

  const READINESS_COLORS: Record<string, string> = {
    "Ready for Next Level": "#2d6a4f",
    "Good Progress": "#6366f1",
    "Developing": "#f59e0b",
    "Needs Support": "#ef4444",
  };

  return (
    <div className="space-y-4">
      <THeading icon={FileText} title="Reports" />

      <TCard>
        <p className="text-xs text-gray-500 mb-3">Select a student and report period to generate a report.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <select
            value={selectedStudent?.id?.toString() ?? ""}
            onChange={e => {
              const id = parseInt(e.target.value);
              const student = (students ?? []).find(s => s.id === id);
              setSelectedStudent(student ? { id: student.id, name: student.name ?? "" } : null);
            }}
            className="px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100 text-sm focus:border-[#2d6a4f] focus:outline-none"
          >
            <option value="">Select student</option>
            {(students ?? []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>

          <div className="flex gap-2">
            {(["weekly", "monthly", "term"] as const).map(t => (
              <button
                key={t}
                onClick={() => setReportType(t)}
                className={`flex-1 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${reportType === t ? "bg-[#2d6a4f] text-white" : "bg-gray-50 text-gray-500 hover:text-gray-700"}`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </TCard>

      {selectedStudent === null ? (
        <EmptyState icon={FileText} title="Select a student" body="Choose a student and report period above to generate their performance report." />
      ) : isLoading ? (
        <TCard><Loader2 className="w-5 h-5 animate-spin text-[#2d6a4f] mx-auto" /></TCard>
      ) : report ? (
        <div className="space-y-4" id="report-content">
          {/* Report header */}
          <TCard>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-[#2d6a4f] uppercase tracking-wider">{report.periodLabel}</span>
                </div>
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">{report.student.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{report.student.email} · <span style={{ color: LEVEL_COLORS[report.student.learnerLevel] ?? TEACHER_ACCENT }}>{report.student.learnerLevel}</span> · {report.groupName}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    const el = document.getElementById("report-content");
                    if (!el) return;
                    const printWindow = window.open("", "_blank");
                    if (!printWindow) return;
                    printWindow.document.write(`<!DOCTYPE html><html><head><title>Report — ${report.student.name}</title><style>body{font-family:Inter,system-ui,sans-serif;padding:2rem;color:#1a2e3e}h3{font-size:1.25rem;margin:0 0 0.25rem}p{margin:0.25rem 0}table{width:100%;border-collapse:collapse;margin-top:1rem}td,th{text-align:left;padding:0.5rem;border-bottom:1px solid #e5e7eb}th{font-size:0.75rem;color:#6b7280;text-transform:uppercase}@media print{body{padding:1rem}}</style></head><body>${el.innerHTML}</body></html>`);
                    printWindow.document.close();
                    printWindow.print();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#2d6a4f] text-white hover:bg-[#245a42] transition-colors"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Download Report
                </button>
                <div
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                  style={{
                    backgroundColor: `${READINESS_COLORS[report.readiness.label] ?? TEACHER_ACCENT}18`,
                    color: READINESS_COLORS[report.readiness.label] ?? TEACHER_ACCENT,
                  }}
                >
                  {report.readiness.label}
                </div>
              </div>
            </div>
          </TCard>

          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Care Consistency" value={`${report.stats.careConsistency}%`} color={TEACHER_ACCENT} />
            <StatCard label="Training Sessions" value={report.stats.trainingSessionCount} color="#6366f1" />
            <StatCard label="Pathway Progress" value={report.stats.pathwayCompletions} color="#f59e0b" />
            <StatCard label="AI Tutor Use" value={report.stats.aiTutorSessions} color="#ec4899" />
          </div>

          {/* Readiness bar */}
          <TCard>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Readiness Score</p>
              <p className="text-sm font-bold" style={{ color: READINESS_COLORS[report.readiness.label] ?? TEACHER_ACCENT }}>
                {report.readiness.score}%
              </p>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${report.readiness.score}%`, backgroundColor: READINESS_COLORS[report.readiness.label] ?? TEACHER_ACCENT }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">{report.readiness.label}</p>
          </TCard>

          {/* Strengths and weak areas */}
          {(report.strengths.length > 0 || report.weakAreas.length > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {report.strengths.length > 0 && (
                <TCard>
                  <p className="text-xs font-semibold text-[#2d6a4f] uppercase tracking-wider mb-3">Strengths</p>
                  <div className="space-y-1.5">
                    {report.strengths.map((s, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Star className="w-3.5 h-3.5 text-[#2d6a4f] shrink-0" />
                        <span className="text-sm text-gray-800 capitalize">{SKILL_LABELS[s] ?? s}</span>
                      </div>
                    ))}
                  </div>
                </TCard>
              )}
              {report.weakAreas.length > 0 && (
                <TCard>
                  <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-3">Focus Areas</p>
                  <div className="space-y-1.5">
                    {report.weakAreas.map((w, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span className="text-sm text-gray-800 capitalize">{SKILL_LABELS[w] ?? w}</span>
                      </div>
                    ))}
                  </div>
                </TCard>
              )}
            </div>
          )}

          {/* Recent training */}
          {report.recentTraining.length > 0 && (
            <TCard>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Recent Training</p>
              <div className="space-y-3">
                {report.recentTraining.map((t, i) => (
                  <div key={i} className="pb-3 border-b border-gray-200 last:border-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{t.title}</p>
                      <p className="text-xs text-gray-500">{t.date} · {t.type}</p>
                    </div>
                    {t.wentWell && <p className="text-xs text-[#2d6a4f]">✓ {t.wentWell}</p>}
                    {t.needsImprovement && <p className="text-xs text-amber-600">△ {t.needsImprovement}</p>}
                  </div>
                ))}
              </div>
            </TCard>
          )}

          {/* Teacher feedback in report */}
          {report.teacherFeedback.length > 0 && (
            <TCard>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Instructor Feedback This Period</p>
              <div className="space-y-2">
                {report.teacherFeedback.map((f, i) => {
                  const style = FEEDBACK_STYLES[f.feedbackType] ?? FEEDBACK_STYLES.general;
                  return (
                    <div key={i} className="p-3 rounded-lg" style={{ backgroundColor: style.bg, borderLeft: `3px solid ${style.color}` }}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-semibold" style={{ color: style.color }}>{style.label}</span>
                        <span className="text-[10px] text-gray-500">{f.date}</span>
                      </div>
                      <p className="text-xs text-gray-600">{f.comment}</p>
                    </div>
                  );
                })}
              </div>
            </TCard>
          )}

          {/* Lessons completed — Phase 2 */}
          {(report as any).lessonsCompleted !== undefined && (
            <TCard>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Lessons &amp; Pathways</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                <div className="text-center p-3 rounded-lg bg-[#2e6da4]/[0.08]">
                  <p className="text-2xl font-bold text-[#2e6da4]">{(report as any).lessonsCompleted}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Lessons Completed</p>
                </div>
                {(report as any).averageLessonScore != null && (
                  <div className="text-center p-3 rounded-lg bg-[#2d6a4f]/[0.08]">
                    <p className="text-2xl font-bold text-[#2d6a4f]">{(report as any).averageLessonScore}%</p>
                    <p className="text-xs text-gray-500 mt-0.5">Avg Quiz Score</p>
                  </div>
                )}
              </div>
              {(report as any).lessonsByPathway && Object.keys((report as any).lessonsByPathway).length > 0 && (
                <div className="space-y-1.5 mt-2">
                  {Object.entries((report as any).lessonsByPathway as Record<string, number>).map(([pathway, count]) => (
                    <div key={pathway} className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 capitalize">{pathway.replace(/-/g, " ")}</span>
                      <span className="text-xs font-semibold text-gray-800 dark:text-gray-100">{count} lesson{count !== 1 ? "s" : ""}</span>
                    </div>
                  ))}
                </div>
              )}
            </TCard>
          )}

          {/* Competency summary — Phase 2 */}
          {(report as any).competencies && (
            <TCard>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Competency Progress</p>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div className="text-center p-3 rounded-lg bg-[#2d6a4f]/[0.08]">
                  <p className="text-xl font-bold text-[#2d6a4f]">{(report as any).competencies.achieved}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Achieved</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-[#2e6da4]/[0.08]">
                  <p className="text-xl font-bold text-[#2e6da4]">{(report as any).competencies.inProgress}</p>
                  <p className="text-xs text-gray-500 mt-0.5">In Progress</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-amber-500/[0.08]">
                  <p className="text-xl font-bold text-amber-600">{(report as any).competencies.needsSupport}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Needs Support</p>
                </div>
              </div>
              {(report as any).competencies.total > 0 && (
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-gray-500">Achievement rate</span>
                    <span className="text-xs text-gray-800 dark:text-gray-100">
                      {Math.round(((report as any).competencies.achieved / Math.max((report as any).competencies.total, 1)) * 100)}%
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-[#2d6a4f] transition-all"
                      style={{ width: `${Math.round(((report as any).competencies.achieved / Math.max((report as any).competencies.total, 1)) * 100)}%` }} />
                  </div>
                </div>
              )}
            </TCard>
          )}

          {/* Lesson reviews — Phase 2 */}
          {(report as any).lessonReviews?.length > 0 && (
            <TCard>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Lesson Review Notes</p>
              <div className="space-y-2">
                {((report as any).lessonReviews as Array<{ lessonSlug: string; reviewStatus: string; feedback: string; date: string }>).map((r, i) => (
                  <div key={i} className="flex items-start gap-3 p-2.5 rounded-lg bg-gray-50">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold shrink-0 mt-0.5 ${r.reviewStatus === "satisfactory" ? "bg-[#2d6a4f]/20 text-[#2d6a4f]" : "bg-amber-500/20 text-amber-600"}`}>
                      {r.reviewStatus === "satisfactory" ? "✓ SAT" : "△ IMP"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-gray-800 capitalize">{r.lessonSlug.replace(/-/g, " ")}</p>
                      {r.feedback && <p className="text-xs text-gray-500 mt-0.5">{r.feedback}</p>}
                    </div>
                    <span className="text-[10px] text-gray-400 shrink-0">{String(r.date).slice(0, 10)}</span>
                  </div>
                ))}
              </div>
            </TCard>
          )}

          <p className="text-xs text-gray-400 text-center">Report generated {new Date(report.generatedAt).toLocaleDateString("en-GB")} · EquiProfile</p>
        </div>
      ) : null}
    </div>
  );
}

// ── Teacher Lessons View ───────────────────────────────────────────────────

const COMPETENCY_DEFINITIONS = [
  { key: "grooming_safely", label: "Grooming Safely", category: "Care & Handling" },
  { key: "leading_safely", label: "Leading Safely", category: "Care & Handling" },
  { key: "tying_up_safely", label: "Tying Up Safely", category: "Care & Handling" },
  { key: "feeding_awareness", label: "Feeding Awareness", category: "Care & Handling" },
  { key: "stable_checks", label: "Stable Checks", category: "Care & Handling" },
  { key: "tack_identification", label: "Tack Identification", category: "Tack & Equipment" },
  { key: "tacking_up_correctly", label: "Tacking Up Correctly", category: "Tack & Equipment" },
  { key: "tack_care", label: "Tack Care", category: "Tack & Equipment" },
  { key: "rider_position", label: "Rider Position", category: "Riding Basics" },
  { key: "control_at_walk", label: "Control at Walk", category: "Riding Basics" },
  { key: "control_at_trot", label: "Control at Trot", category: "Riding Basics" },
  { key: "balance_and_coordination", label: "Balance and Coordination", category: "Riding Basics" },
  { key: "yard_safety_awareness", label: "Yard Safety Awareness", category: "Safety & Welfare" },
  { key: "horse_behaviour_awareness", label: "Horse Behaviour Awareness", category: "Safety & Welfare" },
  { key: "welfare_awareness", label: "Welfare Awareness", category: "Safety & Welfare" },
  { key: "risk_awareness", label: "Risk Awareness", category: "Safety & Welfare" },
  { key: "basic_first_aid", label: "Basic First Aid Awareness", category: "Safety & Welfare" },
];

const COMPETENCY_STATUS_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  not_assessed: { label: "Not Assessed", color: "#6b7280", bg: "rgba(107,114,128,0.1)" },
  in_progress: { label: "In Progress", color: "#6366f1", bg: "rgba(99,102,241,0.1)" },
  achieved: { label: "Achieved", color: "#2d6a4f", bg: "rgba(45,106,79,0.1)" },
  needs_support: { label: "Needs Support", color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
};

function TeacherLessonsView() {
  const [tab, setTab] = useState<"assign" | "review" | "competencies">("assign");
  const [assignForm, setAssignForm] = useState<{
    studentUserId?: number; groupId?: number; type: "lesson" | "pathway";
    lessonSlug: string; pathwaySlug: string; dueDate: string; instructions: string;
    targetType: "student" | "group";
  }>({ type: "lesson", lessonSlug: "", pathwaySlug: "", dueDate: "", instructions: "", targetType: "student" });
  const [selectedStudentForCompetency, setSelectedStudentForCompetency] = useState<number | null>(null);
  const [competencyForm, setCompetencyForm] = useState<{
    key: string; category: string; status: string; comment: string;
  } | null>(null);
  const [reviewForm, setReviewForm] = useState<{
    studentUserId?: number; lessonSlug: string;
    reviewStatus: "satisfactory" | "needs_improvement"; feedback: string; recommendedNextLesson: string;
  }>({ lessonSlug: "", reviewStatus: "satisfactory", feedback: "", recommendedNextLesson: "" });

  const utils = trpc.useUtils();
  const { data: students } = trpc.teacher.listMyStudents.useQuery();
  const { data: groups } = trpc.teacher.listGroups.useQuery();
  const { data: assignments } = trpc.teacher.listLessonAssignments.useQuery({});
  const { data: reviews } = trpc.teacher.listLessonReviews.useQuery({});
  const { data: availableLessons } = trpc.teacher.listLessons.useQuery();
  const { data: competencies } = trpc.teacher.listStudentCompetencies.useQuery(
    { studentUserId: selectedStudentForCompetency! },
    { enabled: selectedStudentForCompetency !== null },
  );

  const assignMutation = trpc.teacher.assignLesson.useMutation({
    onSuccess: () => {
      utils.teacher.listLessonAssignments.invalidate();
      setAssignForm({ type: "lesson", lessonSlug: "", pathwaySlug: "", dueDate: "", instructions: "", targetType: "student" });
    },
  });
  const deleteAssignmentMutation = trpc.teacher.deleteLessonAssignment.useMutation({
    onSuccess: () => utils.teacher.listLessonAssignments.invalidate(),
  });
  const reviewMutation = trpc.teacher.reviewLesson.useMutation({
    onSuccess: () => {
      utils.teacher.listLessonReviews.invalidate();
      setReviewForm({ lessonSlug: "", reviewStatus: "satisfactory", feedback: "", recommendedNextLesson: "" });
    },
  });
  const signOffMutation = trpc.teacher.signOffCompetency.useMutation({
    onSuccess: () => {
      utils.teacher.listStudentCompetencies.invalidate();
      setCompetencyForm(null);
    },
  });

  const PATHWAY_OPTIONS = [
    { slug: "horse-care-foundations", label: "Horse Care Foundations" },
    { slug: "rider-foundations", label: "Rider Foundations" },
    { slug: "stable-yard-safety", label: "Stable & Yard Safety" },
    { slug: "horse-behaviour-welfare", label: "Horse Behaviour & Welfare" },
    { slug: "tack-equipment", label: "Tack & Equipment" },
    { slug: "developing-rider-skills", label: "Developing Rider Skills" },
  ];

  const now = new Date();

  return (
    <div className="space-y-5">
      {/* Tab bar */}
      <div className="flex gap-1 rounded-lg bg-gray-50 p-1 w-fit">
        {(["assign", "review", "competencies"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${
              tab === t ? "bg-[#2d6a4f] text-white" : "text-gray-500 hover:text-gray-700"
            }`}>
            {t === "assign" ? "Assign Lessons" : t === "review" ? "Reviews" : "Competencies"}
          </button>
        ))}
      </div>

      {/* ── ASSIGN TAB ── */}
      {tab === "assign" && (
        <div className="space-y-5">
          <TCard>
            <THeading icon={Library} title="Assign a Lesson or Pathway" />
            <p className="text-xs text-gray-500 mb-4">Assign structured learning to individual students or whole groups.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {/* Target type */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Assign to</label>
                <select className="w-full text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-800 dark:text-gray-100"
                  value={assignForm.targetType}
                  onChange={e => setAssignForm(f => ({ ...f, targetType: e.target.value as "student" | "group", studentUserId: undefined, groupId: undefined }))}>
                  <option value="student">Individual Student</option>
                  <option value="group">Group / Class</option>
                </select>
              </div>
              {/* Student or group select */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">{assignForm.targetType === "student" ? "Student" : "Group"}</label>
                {assignForm.targetType === "student" ? (
                  <select className="w-full text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-800 dark:text-gray-100"
                    value={assignForm.studentUserId ?? ""}
                    onChange={e => setAssignForm(f => ({ ...f, studentUserId: parseInt(e.target.value) || undefined }))}>
                    <option value="">Select student…</option>
                    {(students ?? []).map(s => <option key={s.id} value={s.id}>{s.name ?? s.email}</option>)}
                  </select>
                ) : (
                  <select className="w-full text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-800 dark:text-gray-100"
                    value={assignForm.groupId ?? ""}
                    onChange={e => setAssignForm(f => ({ ...f, groupId: parseInt(e.target.value) || undefined }))}>
                    <option value="">Select group…</option>
                    {(groups ?? []).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                )}
              </div>
              {/* Assignment type */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Assignment Type</label>
                <select className="w-full text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-800 dark:text-gray-100"
                  value={assignForm.type}
                  onChange={e => setAssignForm(f => ({ ...f, type: e.target.value as "lesson" | "pathway" }))}>
                  <option value="lesson">Single Lesson</option>
                  <option value="pathway">Full Pathway</option>
                </select>
              </div>
              {/* Lesson or pathway slug */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">{assignForm.type === "lesson" ? "Lesson" : "Pathway"}</label>
                {assignForm.type === "lesson" ? (
                  <select className="w-full text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-800 dark:text-gray-100"
                    value={assignForm.lessonSlug}
                    onChange={e => setAssignForm(f => ({ ...f, lessonSlug: e.target.value }))}>
                    <option value="">Select lesson…</option>
                    {(availableLessons ?? []).map(l => (
                      <option key={l.slug} value={l.slug}>
                        {l.title} ({l.level})
                      </option>
                    ))}
                  </select>
                ) : (
                  <select className="w-full text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-800 dark:text-gray-100"
                    value={assignForm.pathwaySlug}
                    onChange={e => setAssignForm(f => ({ ...f, pathwaySlug: e.target.value }))}>
                    <option value="">Select pathway…</option>
                    {PATHWAY_OPTIONS.map(p => <option key={p.slug} value={p.slug}>{p.label}</option>)}
                  </select>
                )}
              </div>
              {/* Due date */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Due Date (optional)</label>
                <input type="date" className="w-full text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-800 dark:text-gray-100"
                  value={assignForm.dueDate}
                  onChange={e => setAssignForm(f => ({ ...f, dueDate: e.target.value }))} />
              </div>
              {/* Instructions */}
              <div className="sm:col-span-2">
                <label className="block text-xs text-gray-500 mb-1">Instructions (optional)</label>
                <textarea className="w-full text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-800 placeholder-gray-400 dark:placeholder-gray-500 resize-none"
                  rows={2} placeholder="Additional notes for the student…"
                  value={assignForm.instructions}
                  onChange={e => setAssignForm(f => ({ ...f, instructions: e.target.value }))} />
              </div>
            </div>
            <button
              onClick={() => {
                const payload = {
                  assignmentType: assignForm.type,
                  lessonSlug: assignForm.type === "lesson" ? assignForm.lessonSlug || undefined : undefined,
                  pathwaySlug: assignForm.type === "pathway" ? assignForm.pathwaySlug || undefined : undefined,
                  dueDate: assignForm.dueDate || undefined,
                  instructions: assignForm.instructions || undefined,
                  studentUserId: assignForm.targetType === "student" ? assignForm.studentUserId : undefined,
                  groupId: assignForm.targetType === "group" ? assignForm.groupId : undefined,
                };
                assignMutation.mutate(payload);
              }}
              disabled={assignMutation.isPending || (!assignForm.studentUserId && !assignForm.groupId) || (assignForm.type === "lesson" && !assignForm.lessonSlug) || (assignForm.type === "pathway" && !assignForm.pathwaySlug)}
              className="mt-4 px-5 py-2 rounded-lg text-sm font-medium text-white bg-[#2d6a4f] hover:bg-[#245a42] transition-colors disabled:opacity-40">
              {assignMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin inline" /> : "Assign"}
            </button>
          </TCard>

          {/* Active assignments list */}
          <TCard>
            <THeading icon={ClipboardList} title="Active Assignments" />
            {(assignments ?? []).length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">No active assignments.</p>
            ) : (
              <div className="space-y-2 mt-3">
                {(assignments ?? []).map(a => {
                  const isOverdue = a.dueDate ? new Date(a.dueDate) < now : false;
                  return (
                    <div key={a.id} className="flex items-start justify-between gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${a.assignmentType === "lesson" ? "bg-[#2e6da4]/20 text-[#2e6da4]" : "bg-[#2d6a4f]/20 text-[#2d6a4f]"}`}>
                            {a.assignmentType === "lesson" ? "Lesson" : "Pathway"}
                          </span>
                          <span className="text-sm text-gray-800 font-medium truncate">{a.lessonSlug ?? a.pathwaySlug}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          {a.dueDate && (
                            <span className={`text-xs flex items-center gap-1 ${isOverdue ? "text-rose-400" : "text-gray-500"}`}>
                              <Calendar className="w-3 h-3" /> {String(a.dueDate).slice(0, 10)}
                              {isOverdue && " (overdue)"}
                            </span>
                          )}
                          <span className="text-xs text-gray-400">
                            {a.studentUserId ? `Student #${a.studentUserId}` : `Group #${a.groupId}`}
                          </span>
                        </div>
                      </div>
                      <button onClick={() => deleteAssignmentMutation.mutate({ id: a.id })}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </TCard>
        </div>
      )}

      {/* ── REVIEW TAB ── */}
      {tab === "review" && (
        <div className="space-y-4">
          {/* Write a review form */}
          <TCard>
            <THeading icon={BookOpen} title="Write a Lesson Review" />
            <p className="text-xs text-gray-500 mb-4">Leave structured feedback on a student's lesson completion to guide their progress.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Student</label>
                <select className="w-full text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-800 dark:text-gray-100"
                  value={reviewForm.studentUserId ?? ""}
                  onChange={e => setReviewForm(f => ({ ...f, studentUserId: parseInt(e.target.value) || undefined }))}>
                  <option value="">Select student…</option>
                  {(students ?? []).map(s => <option key={s.id} value={s.id}>{s.name ?? s.email}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Lesson</label>
                <select className="w-full text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-800 dark:text-gray-100"
                  value={reviewForm.lessonSlug}
                  onChange={e => setReviewForm(f => ({ ...f, lessonSlug: e.target.value }))}>
                  <option value="">Select lesson…</option>
                  {(availableLessons ?? []).map(l => (
                    <option key={l.slug} value={l.slug}>{l.title} ({l.level})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Review Outcome</label>
                <div className="flex gap-2">
                  {(["satisfactory", "needs_improvement"] as const).map(s => (
                    <button key={s} onClick={() => setReviewForm(f => ({ ...f, reviewStatus: s }))}
                      className={`flex-1 text-xs py-2 rounded-lg font-medium transition-colors ${reviewForm.reviewStatus === s ? (s === "satisfactory" ? "bg-[#2d6a4f] text-white" : "bg-amber-600 text-white") : "bg-gray-100 text-gray-500 hover:text-gray-700"}`}>
                      {s === "satisfactory" ? "✓ Satisfactory" : "△ Needs Improvement"}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Recommended Next Lesson (optional)</label>
                <select className="w-full text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-800 dark:text-gray-100"
                  value={reviewForm.recommendedNextLesson}
                  onChange={e => setReviewForm(f => ({ ...f, recommendedNextLesson: e.target.value }))}>
                  <option value="">None / not specified</option>
                  {(availableLessons ?? []).map(l => (
                    <option key={l.slug} value={l.slug}>{l.title} ({l.level})</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs text-gray-500 mb-1">Feedback for student</label>
                <textarea className="w-full text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-800 placeholder-gray-400 dark:placeholder-gray-500 resize-none"
                  rows={3} placeholder="Describe what the student demonstrated, areas of improvement, and next steps…"
                  value={reviewForm.feedback}
                  onChange={e => setReviewForm(f => ({ ...f, feedback: e.target.value }))} />
              </div>
            </div>
            <button
              onClick={() => reviewMutation.mutate({
                studentUserId: reviewForm.studentUserId!,
                lessonSlug: reviewForm.lessonSlug,
                reviewStatus: reviewForm.reviewStatus,
                feedback: reviewForm.feedback || undefined,
                recommendedNextLesson: reviewForm.recommendedNextLesson || undefined,
              })}
              disabled={reviewMutation.isPending || !reviewForm.studentUserId || !reviewForm.lessonSlug}
              className="mt-4 px-5 py-2 rounded-lg text-sm font-medium text-white bg-[#2d6a4f] hover:bg-[#245a42] transition-colors disabled:opacity-40">
              {reviewMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin inline" /> : "Submit Review"}
            </button>
          </TCard>

          {/* Reviews submitted */}
          <TCard>
            <THeading icon={ClipboardList} title="Reviews Submitted" />
            {(reviews ?? []).length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">No reviews submitted yet.</p>
            ) : (
              <div className="space-y-2 mt-3">
                {(reviews ?? []).map(r => (
                  <div key={r.id} className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.reviewStatus === "satisfactory" ? "bg-[#2d6a4f]/20 text-[#2d6a4f]" : "bg-amber-500/20 text-amber-600"}`}>
                        {r.reviewStatus === "satisfactory" ? "✓ Satisfactory" : "△ Needs Improvement"}
                      </span>
                      <span className="text-sm text-gray-800 font-medium capitalize">{r.lessonSlug.replace(/-/g, " ")}</span>
                    </div>
                    {r.feedback && <p className="text-xs text-gray-500 mt-1">{r.feedback}</p>}
                    {r.recommendedNextLesson && (
                      <p className="text-xs text-[#2e6da4] mt-1 flex items-center gap-1">
                        <ChevronRight className="w-3 h-3" /> Next: {r.recommendedNextLesson}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TCard>
        </div>
      )}

      {/* ── COMPETENCIES TAB ── */}
      {tab === "competencies" && (
        <div className="space-y-4">
          <TCard>
            <THeading icon={Award} title="Competency Sign-Off" />
            <p className="text-xs text-gray-500 mb-4">Select a student to view and sign off their competencies.</p>
            <select className="w-full max-w-xs text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-800 dark:text-gray-100"
              value={selectedStudentForCompetency ?? ""}
              onChange={e => setSelectedStudentForCompetency(parseInt(e.target.value) || null)}>
              <option value="">Select student…</option>
              {(students ?? []).map(s => <option key={s.id} value={s.id}>{s.name ?? s.email}</option>)}
            </select>
          </TCard>

          {selectedStudentForCompetency && (
            <TCard>
              <div className="space-y-4">
                {Object.entries(
                  COMPETENCY_DEFINITIONS.reduce((acc, c) => {
                    if (!acc[c.category]) acc[c.category] = [];
                    acc[c.category].push(c);
                    return acc;
                  }, {} as Record<string, typeof COMPETENCY_DEFINITIONS>)
                ).map(([category, items]) => (
                  <div key={category}>
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#2d6a4f] mb-2 flex items-center gap-2">
                      <Shield className="w-3.5 h-3.5" /> {category}
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {items.map(comp => {
                        const existing = (competencies ?? []).find(c => c.competencyKey === comp.key);
                        const status = existing?.status ?? "not_assessed";
                        const style = COMPETENCY_STATUS_STYLES[status];
                        const isEditing = competencyForm?.key === comp.key;
                        return (
                          <div key={comp.key} className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm text-gray-800 dark:text-gray-100">{comp.label}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0"
                                style={{ color: style.color, backgroundColor: style.bg }}>
                                {style.label}
                              </span>
                            </div>
                            {existing?.teacherComment && !isEditing && (
                              <p className="text-xs text-gray-500 mt-1">{existing.teacherComment}</p>
                            )}
                            {isEditing ? (
                              <div className="mt-2 space-y-2">
                                <select className="w-full text-xs bg-gray-50 border border-gray-200 rounded px-2 py-1.5 text-gray-800 dark:text-gray-100"
                                  value={competencyForm.status}
                                  onChange={e => setCompetencyForm(f => f ? { ...f, status: e.target.value } : null)}>
                                  <option value="not_assessed">Not Assessed</option>
                                  <option value="in_progress">In Progress</option>
                                  <option value="achieved">Achieved ✓</option>
                                  <option value="needs_support">Needs Support</option>
                                </select>
                                <textarea className="w-full text-xs bg-gray-50 border border-gray-200 rounded px-2 py-1.5 text-gray-800 resize-none"
                                  rows={2} placeholder="Teacher comment…"
                                  value={competencyForm.comment}
                                  onChange={e => setCompetencyForm(f => f ? { ...f, comment: e.target.value } : null)} />
                                <div className="flex gap-2">
                                  <button onClick={() => signOffMutation.mutate({
                                    studentUserId: selectedStudentForCompetency,
                                    competencyKey: competencyForm.key,
                                    category: competencyForm.category,
                                    status: competencyForm.status as any,
                                    teacherComment: competencyForm.comment || undefined,
                                  })} disabled={signOffMutation.isPending}
                                    className="text-xs px-3 py-1 rounded-lg bg-[#2d6a4f] text-white hover:bg-[#2d6a4f] transition-colors disabled:opacity-40">
                                    {signOffMutation.isPending ? "Saving…" : "Save"}
                                  </button>
                                  <button onClick={() => setCompetencyForm(null)}
                                    className="text-xs px-3 py-1 rounded-lg bg-gray-200 text-gray-600 hover:bg-gray-300 transition-colors">
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button onClick={() => setCompetencyForm({ key: comp.key, category: comp.category, status, comment: existing?.teacherComment ?? "" })}
                                className="mt-2 text-xs text-[#2d6a4f] hover:text-[#2d6a4f] transition-colors">
                                {status === "not_assessed" ? "Assess" : "Update"}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </TCard>
          )}
        </div>
      )}
    </div>
  );
}

// ── Teacher Progress View ──────────────────────────────────────────────────

function TeacherProgressView() {
  const { data: students, isLoading: loadingStudents } = trpc.teacher.listMyStudents.useQuery();
  const [selectedStudent, setSelectedStudent] = useState<number | null>(null);
  const { data: studentSummary } = trpc.teacher.getStudentSummary.useQuery(
    { studentUserId: selectedStudent! },
    { enabled: selectedStudent !== null },
  );
  const { data: competencies } = trpc.teacher.listStudentCompetencies.useQuery(
    { studentUserId: selectedStudent! },
    { enabled: selectedStudent !== null },
  );
  const { data: lessonSummary } = trpc.teacher.getStudentLessonSummary.useQuery(
    { studentUserId: selectedStudent! },
    { enabled: selectedStudent !== null },
  );

  if (loadingStudents) return <TCard><div className="animate-pulse h-32 rounded bg-gray-50" /></TCard>;

  const studentList = students ?? [];

  const COMP_STATUS_STYLES: Record<string, { label: string; color: string }> = {
    achieved: { label: "Achieved", color: "#2d6a4f" },
    in_progress: { label: "In Progress", color: "#6366f1" },
    not_started: { label: "Not Started", color: "#6b7280" },
    needs_support: { label: "Needs Support", color: "#ef4444" },
  };

  // Group competencies by category
  const competencyGroups: Record<string, typeof competencies extends (infer U)[] | undefined ? U[] : never[]> = {};
  (competencies ?? []).forEach(c => {
    const cat = (c as any).category ?? "General";
    if (!competencyGroups[cat]) competencyGroups[cat] = [];
    competencyGroups[cat].push(c as any);
  });

  return (
    <div className="space-y-6">
      <THeading icon={TrendingUp} title="Student Progress" />

      {studentList.length === 0 ? (
        <EmptyState icon={Users} title="No students yet" body="Add students to your groups to track their progress." />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Student list */}
          <div className="lg:col-span-1">
            <TCard>
              <h3 className="text-sm font-semibold text-gray-600 mb-3">Students</h3>
              <div className="space-y-1 max-h-[500px] overflow-y-auto">
                {studentList.map(s => {
                  const isActive = selectedStudent === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setSelectedStudent(s.id)}
                      className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                        isActive
                          ? "bg-[#2d6a4f]/15 text-[#2d6a4f]"
                          : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                        isActive ? "bg-[#2d6a4f]/20 text-[#2d6a4f]" : "bg-gray-100 text-gray-500"
                      }`}>
                        {(s.name ?? s.email ?? "?").charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm">{s.name || s.email}</p>
                        <p className="text-[10px] text-gray-400">
                          Level: {s.learnerLevel ?? "beginner"}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </TCard>
          </div>

          {/* Progress detail */}
          <div className="lg:col-span-2 space-y-4">
            {!selectedStudent ? (
              <EmptyState icon={TrendingUp} title="Select a student" body="Choose a student from the list to view their detailed progress and competencies." />
            ) : (
              <>
                {/* Summary stats */}
                {studentSummary && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <StatCard label="Lessons Completed" value={studentSummary.stats?.completedTasks ?? 0} color="#6366f1" />
                    <StatCard label="Tasks Completed" value={studentSummary.stats?.totalTasks ?? 0} color="#2d6a4f" />
                    <StatCard label="Training Sessions" value={studentSummary.stats?.trainingCount ?? 0} color="#f59e0b" />
                    <StatCard label="Competencies" value={(competencies ?? []).filter((c: any) => c.status === "achieved").length} color="#06b6d4" />
                  </div>
                )}

                {/* Lesson Progression — from real lesson completion data */}
                {lessonSummary && (
                  <TCard>
                    <h3 className="text-sm font-semibold text-gray-800 mb-3">Learning Level & Progression</h3>
                    <div className="space-y-3">
                      {/* Current level badge */}
                      {(() => {
                        const student = studentList.find(s => s.id === selectedStudent);
                        const level = student?.learnerLevel ?? "beginner";
                        const levelColors: Record<string, string> = {
                          beginner: "#2d6a4f", developing: "#6366f1", intermediate: "#f59e0b", advanced: "#ef4444",
                        };
                        return (
                          <div className="flex items-center gap-2 p-2.5 rounded-lg" style={{ background: `${levelColors[level]}10`, border: `1px solid ${levelColors[level]}25` }}>
                            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: `${levelColors[level]}20` }}>
                              <Star className="w-4 h-4" style={{ color: levelColors[level] }} />
                            </div>
                            <div>
                              <p className="text-xs font-semibold capitalize" style={{ color: levelColors[level] }}>{level} Level</p>
                              <p className="text-[10px] text-gray-500">{lessonSummary.completedCount} lessons completed</p>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Completion by pathway */}
                      {Object.keys(lessonSummary.byPathway ?? {}).length > 0 && (
                        <div>
                          <p className="text-xs text-gray-500 mb-2">Lessons by Pathway</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {Object.entries(lessonSummary.byPathway).map(([pw, count]) => (
                              <div key={pw} className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-gray-50">
                                <span className="text-xs text-gray-500 capitalize truncate">{pw.replace(/-/g, " ")}</span>
                                <span className="text-xs font-semibold text-[#2d6a4f] shrink-0 ml-2">{count as number}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Weak areas: pathways with fewest completions */}
                      {(() => {
                        const allPathways = [
                          "horse-care-foundations", "rider-foundations", "stable-yard-safety",
                          "horse-behaviour-welfare", "tack-equipment", "developing-rider-skills",
                          "polework-jump-foundations", "horse-health-first-response", "stable-management",
                          "competitions-preparation", "rider-fitness-mindset", "coaching-teaching-skills",
                          "handling-groundwork", "nutrition-feeding", "equine-welfare-ethics",
                        ];
                        const bp = lessonSummary.byPathway as Record<string, number>;
                        const weakAreas = allPathways
                          .filter(p => (bp[p] ?? 0) === 0)
                          .slice(0, 4);
                        if (weakAreas.length === 0) return null;
                        return (
                          <div>
                            <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3 text-amber-600" />
                              Areas Not Yet Started
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {weakAreas.map(w => (
                                <span key={w} className="text-[10px] px-2 py-1 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20 capitalize">
                                  {w.replace(/-/g, " ")}
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Recommended next step */}
                      {lessonSummary.completedCount === 0 && (
                        <div className="p-2.5 rounded-lg bg-[#2e6da4]/5 border border-[#2e6da4]/15">
                          <p className="text-xs text-[#2e6da4] font-medium">Suggested Action</p>
                          <p className="text-[10px] text-gray-500 mt-0.5">This student has not completed any lessons yet. Consider assigning a beginner pathway lesson.</p>
                        </div>
                      )}
                      {lessonSummary.completedCount > 0 && lessonSummary.completedCount < 10 && (
                        <div className="p-2.5 rounded-lg bg-[#2e6da4]/5 border border-[#2e6da4]/15">
                          <p className="text-xs text-[#2e6da4] font-medium">Suggested Action</p>
                          <p className="text-[10px] text-gray-500 mt-0.5">This student is early in their learning. Encourage completion of beginner pathways before progressing.</p>
                        </div>
                      )}
                    </div>
                  </TCard>
                )}

                {/* Competency tracking */}
                <TCard>
                  <h3 className="text-sm font-semibold text-gray-800 mb-4">Competency Progress</h3>
                  {Object.keys(competencyGroups).length === 0 ? (
                    <p className="text-xs text-gray-500">No competency data yet. Complete lessons or sign off competencies in the Lessons tab.</p>
                  ) : (
                    <div className="space-y-4">
                      {Object.entries(competencyGroups).map(([cat, comps]) => {
                        const achieved = (comps as any[]).filter(c => c.status === "achieved").length;
                        const total = (comps as any[]).length;
                        const pct = total > 0 ? Math.round((achieved / total) * 100) : 0;
                        return (
                          <div key={cat}>
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs font-medium text-gray-600">{cat}</p>
                              <span className="text-xs text-gray-500">{achieved}/{total}</span>
                            </div>
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
                              <div className="h-full rounded-full bg-[#2d6a4f] transition-all" style={{ width: `${pct}%` }} />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                              {(comps as any[]).map(comp => {
                                const st = COMP_STATUS_STYLES[(comp as any).status] ?? COMP_STATUS_STYLES.not_started;
                                return (
                                  <div key={(comp as any).key ?? (comp as any).competencyKey} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-gray-50">
                                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: st.color }} />
                                    <span className="text-xs text-gray-500 flex-1 truncate">
                                      {((comp as any).key ?? (comp as any).competencyKey ?? "").replace(/-/g, " ")}
                                    </span>
                                    <span className="text-[10px] font-medium shrink-0" style={{ color: st.color }}>
                                      {st.label}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </TCard>

                {/* Weakness identification */}
                {studentSummary && (
                  <TCard>
                    <h3 className="text-sm font-semibold text-gray-800 mb-3">Areas to Watch</h3>
                    {(competencies ?? []).filter((c: any) => c.status === "needs_support").length > 0 ? (
                      <div className="space-y-2">
                        {(competencies ?? []).filter((c: any) => c.status === "needs_support").map((c: any) => (
                          <div key={c.key ?? c.competencyKey} className="flex items-center gap-2 p-2 rounded-lg bg-red-500/5 border border-red-500/10">
                            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                            <span className="text-xs text-gray-600">
                              {(c.key ?? c.competencyKey ?? "").replace(/-/g, " ")}
                            </span>
                            <span className="text-[10px] text-red-500 ml-auto shrink-0">Needs Support</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500">No flagged areas. All competencies are on track or not yet assessed.</p>
                    )}
                  </TCard>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Teacher Assignments View — Create, review, and mark student work ────────

function TeacherAssignmentsView() {
  const { data: students } = trpc.teacher.listMyStudents.useQuery();
  const { data: assignments, isLoading, refetch } = trpc.teacher.listTeacherAssignments.useQuery();
  const createMutation = trpc.teacher.createAssignment.useMutation({
    onSuccess: () => {
      setShowCreate(false);
      setNewTitle("");
      setNewDesc("");
      setNewDueDate("");
      setNewStudentId(null);
      refetch();
    },
  });
  const reviewMutation = trpc.teacher.reviewAssignment.useMutation({
    onSuccess: () => {
      setReviewingId(null);
      setGrade("");
      setFeedback("");
      refetch();
    },
  });

  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [newStudentId, setNewStudentId] = useState<number | null>(null);

  const [reviewingId, setReviewingId] = useState<number | null>(null);
  const [grade, setGrade] = useState("");
  const [feedback, setFeedback] = useState("");

  if (isLoading) return <TCard><Loader2 className="w-5 h-5 animate-spin text-[#2d6a4f] mx-auto" /></TCard>;

  const statusColor: Record<string, string> = {
    pending: "text-amber-600 bg-amber-50",
    submitted: "text-blue-600 bg-blue-50",
    reviewed: "text-[#2d6a4f] bg-[#2d6a4f]/5",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <THeading icon={Edit2} title="Assignments" />
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-[#2d6a4f]/20 text-[#2d6a4f] hover:bg-[#2d6a4f]/30 transition-colors"
        >
          <Plus className="w-4 h-4" /> New Assignment
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <TCard>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Assign To</label>
              <select
                value={newStudentId?.toString() ?? ""}
                onChange={(e) => setNewStudentId(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#2d6a4f]/40"
              >
                <option value="">Select student</option>
                {(students ?? []).map((s: any) => (
                  <option key={s.id} value={s.id}>{s.name || "Unnamed"}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Title</label>
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Horse Anatomy Diagram Labelling"
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-[#2d6a4f]/40"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Description (optional)</label>
              <textarea
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Instructions for the student..."
                rows={3}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-[#2d6a4f]/40 resize-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Due Date (optional)</label>
              <input
                type="date"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#2d6a4f]/40"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (!newTitle.trim() || !newStudentId) return;
                  createMutation.mutate({
                    studentId: newStudentId,
                    title: newTitle.trim(),
                    description: newDesc.trim() || undefined,
                    dueDate: newDueDate || undefined,
                  });
                }}
                disabled={!newTitle.trim() || !newStudentId || createMutation.isPending}
                className="px-4 py-2 rounded-lg bg-[#2d6a4f] text-white text-sm font-medium hover:bg-[#2d6a4f] disabled:opacity-50 transition-colors"
              >
                {createMutation.isPending ? "Creating..." : "Create Assignment"}
              </button>
              <button
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 rounded-lg bg-gray-100 text-gray-500 text-sm font-medium hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </TCard>
      )}

      {/* Assignment list */}
      {(!assignments || assignments.length === 0) && !showCreate ? (
        <EmptyState icon={Edit2} title="No Assignments Yet" body="Create assignments for your students. They can submit work which you'll review and mark here." />
      ) : (
        <div className="space-y-3">
          {(assignments ?? []).map((a: any) => (
            <TCard key={a.id}>
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{a.title}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColor[a.status] ?? "text-gray-500 bg-gray-50"}`}>
                      {a.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Student: {a.studentName ?? "Unknown"}
                    {a.dueDate && <> · Due: {new Date(a.dueDate).toLocaleDateString()}</>}
                  </p>
                  {a.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{a.description}</p>}

                  {/* Submission info */}
                  {a.status === "submitted" && a.submissionUrl && (
                    <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-xs text-blue-600 font-medium">📄 Submission received</p>
                      <a href={a.submissionUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 underline mt-1 inline-block">
                        View submission
                      </a>
                    </div>
                  )}

                  {/* Review info */}
                  {a.status === "reviewed" && (
                    <div className="mt-2 p-2 bg-[#2d6a4f]/5 border border-[#2d6a4f]/10 rounded-lg">
                      <p className="text-xs text-[#2d6a4f] font-medium">✅ Reviewed — Grade: {a.grade || "N/A"}</p>
                      {a.feedback && <p className="text-xs text-gray-500 mt-1">{a.feedback}</p>}
                    </div>
                  )}

                  {/* Review button */}
                  {a.status === "submitted" && reviewingId !== a.id && (
                    <button
                      onClick={() => setReviewingId(a.id)}
                      className="mt-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#2d6a4f]/20 text-[#2d6a4f] hover:bg-[#2d6a4f]/30 transition-colors"
                    >
                      Mark & Review
                    </button>
                  )}

                  {/* Review form */}
                  {reviewingId === a.id && (
                    <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-2">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Grade</label>
                        <input
                          value={grade}
                          onChange={(e) => setGrade(e.target.value)}
                          placeholder="e.g. A, B+, 85%"
                          className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-[#2d6a4f]/40"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Feedback</label>
                        <textarea
                          value={feedback}
                          onChange={(e) => setFeedback(e.target.value)}
                          placeholder="Your feedback for the student..."
                          rows={3}
                          className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-[#2d6a4f]/40 resize-none"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => reviewMutation.mutate({
                            assignmentId: a.id,
                            grade: grade.trim() || undefined,
                            feedback: feedback.trim() || undefined,
                          })}
                          disabled={reviewMutation.isPending}
                          className="px-3 py-1.5 rounded-lg bg-[#2d6a4f] text-white text-xs font-medium hover:bg-[#2d6a4f] disabled:opacity-50 transition-colors"
                        >
                          {reviewMutation.isPending ? "Saving..." : "Submit Review"}
                        </button>
                        <button
                          onClick={() => setReviewingId(null)}
                          className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-500 text-xs hover:bg-gray-100 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </TCard>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Messages View — Teacher ↔ Student messaging (persisted) ────────────────

function MessagesView() {
  const { data: students, isLoading } = trpc.teacher.listMyStudents.useQuery();
  const [selectedStudent, setSelectedStudent] = useState<number | null>(null);
  const [message, setMessage] = useState("");

  const { data: threadMessages, refetch: refetchMessages } = trpc.teacher.getThreadMessages.useQuery(
    { studentId: selectedStudent! },
    { enabled: !!selectedStudent, refetchInterval: 5000 },
  );
  const { data: unreadCounts } = trpc.teacher.getUnreadCounts.useQuery(undefined, {
    refetchInterval: 10000,
  });
  const sendMutation = trpc.teacher.sendMessage.useMutation({
    onSuccess: () => {
      setMessage("");
      refetchMessages();
    },
  });

  const selectedName = students?.find((s: any) => s.id === selectedStudent)?.name ?? "Student";

  const handleSend = () => {
    if (!selectedStudent || !message.trim()) return;
    sendMutation.mutate({ studentId: selectedStudent, content: message.trim() });
  };

  if (isLoading) return <TCard><Loader2 className="w-5 h-5 animate-spin text-[#2d6a4f] mx-auto" /></TCard>;

  return (
    <div className="space-y-4">
      <THeading icon={MessageSquare} title="Messages" />
      <p className="text-xs text-gray-500">Send messages to your students. Select a student to start a conversation.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4" style={{ minHeight: 400 }}>
        {/* Student list */}
        <div className={`${T_CARD} p-0 overflow-hidden`}>
          <div className="p-3 border-b border-gray-200">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Students</p>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {(!students || students.length === 0) ? (
              <p className="text-xs text-gray-500 p-4 text-center">No students assigned yet.</p>
            ) : (
              students.map((s: any) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedStudent(s.id)}
                  className={`w-full flex items-center gap-3 px-3 py-3 text-left text-sm transition-colors border-b border-gray-100 ${
                    selectedStudent === s.id ? "bg-[#2d6a4f]/10 text-gray-800 dark:text-gray-100" : "text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-[#2d6a4f]/20 flex items-center justify-center text-xs font-bold text-[#2d6a4f]">
                    {(s.name || "S").charAt(0).toUpperCase()}
                  </div>
                  <span className="truncate">{s.name || "Unnamed Student"}</span>
                  {(unreadCounts?.[s.id] ?? 0) > 0 && (
                    <span className="ml-auto text-[10px] bg-red-500/20 text-red-500 px-1.5 py-0.5 rounded-full">
                      {unreadCounts?.[s.id]}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat area */}
        <div className={`${T_CARD} p-0 md:col-span-2 flex flex-col`}>
          {selectedStudent ? (
            <>
              <div className="p-3 border-b border-gray-200 flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-[#2d6a4f]/20 flex items-center justify-center text-xs font-bold text-[#2d6a4f]">
                  {selectedName.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-medium text-gray-800 dark:text-gray-100">{selectedName}</span>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[250px]">
                {(!threadMessages || threadMessages.length === 0) && (
                  <p className="text-xs text-gray-400 text-center py-8">No messages yet. Start the conversation below.</p>
                )}
                {(threadMessages ?? []).map((msg) => (
                  <div key={msg.id} className={`flex ${msg.from === "teacher" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[75%] px-3 py-2 rounded-xl text-sm ${
                        msg.from === "teacher"
                          ? "bg-[#2d6a4f]/20 text-[#2d6a4f]"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      <p>{msg.text}</p>
                      <p className="text-[10px] text-gray-500 mt-1">{msg.time}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-3 border-t border-gray-200 flex gap-2">
                <input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Type a message..."
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-[#2d6a4f]/40"
                />
                <button
                  onClick={handleSend}
                  disabled={!message.trim() || sendMutation.isPending}
                  className="px-4 py-2 rounded-lg bg-[#2d6a4f]/20 text-[#2d6a4f] text-sm font-medium hover:bg-[#2d6a4f]/30 disabled:opacity-30 transition-colors"
                >
                  {sendMutation.isPending ? "..." : "Send"}
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Select a student to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Resources View — Teacher resource upload/management (persisted) ──────────

function ResourcesView() {
  const { data: resources, isLoading, refetch } = trpc.teacher.listResources.useQuery();
  const createMutation = trpc.teacher.createResource.useMutation({
    onSuccess: () => {
      setTitle("");
      setDescription("");
      setShowForm(false);
      refetch();
    },
  });
  const deleteMutation = trpc.teacher.deleteResource.useMutation({
    onSuccess: () => refetch(),
  });

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [shareScope, setShareScope] = useState<"all" | "group" | "individual">("all");
  const [fileType, setFileType] = useState<"pdf" | "image" | "document">("pdf");
  const [fileData, setFileData] = useState<{ name: string; data: string; mimeType: string } | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { alert("File too large (max 10MB)"); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1] || "";
      setFileData({ name: file.name, data: base64, mimeType: file.type });
      // Auto-detect file type
      if (file.type.includes("pdf")) setFileType("pdf");
      else if (file.type.startsWith("image/")) setFileType("image");
      else setFileType("document");
    };
    reader.readAsDataURL(file);
  };

  const handleCreate = () => {
    if (!title.trim()) return;
    // Use the real file name if available, or generate a placeholder path
    const url = fileData
      ? `/uploads/resources/${Date.now()}-${fileData.name.replace(/\s+/g, "-")}`
      : `/uploads/resources/${Date.now()}-${title.trim().replace(/\s+/g, "-").toLowerCase()}.${fileType}`;
    createMutation.mutate({
      title: title.trim(),
      description: description.trim() || undefined,
      fileUrl: url,
      fileType,
      shareScope,
    });
  };

  if (isLoading) return <TCard><Loader2 className="w-5 h-5 animate-spin text-[#2d6a4f] mx-auto" /></TCard>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <THeading icon={Library} title="Teaching Resources" />
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-[#2d6a4f]/20 text-[#2d6a4f] hover:bg-[#2d6a4f]/30 transition-colors"
        >
          <Plus className="w-4 h-4" /> Upload Resource
        </button>
      </div>

      {showForm && (
        <TCard>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Resource Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Horse Anatomy Diagram"
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-[#2d6a4f]/40"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Description (optional)</label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the resource"
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-[#2d6a4f]/40"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">File Type</label>
                <select
                  value={fileType}
                  onChange={(e) => setFileType(e.target.value as any)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#2d6a4f]/40"
                >
                  <option value="pdf">PDF</option>
                  <option value="image">Image</option>
                  <option value="document">Document</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Share With</label>
                <select
                  value={shareScope}
                  onChange={(e) => setShareScope(e.target.value as any)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#2d6a4f]/40"
                >
                  <option value="all">All Students</option>
                  <option value="group">Specific Group</option>
                  <option value="individual">Individual Student</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">File (PDF, Image, Document)</label>
              <label className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center hover:border-[#2d6a4f]/40 transition-colors cursor-pointer block">
                <input type="file" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" onChange={handleFileSelect} className="hidden" />
                <FolderOpen className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                {fileData ? (
                  <p className="text-xs text-[#2d6a4f]">✓ {fileData.name}</p>
                ) : (
                  <>
                    <p className="text-xs text-gray-500">Click to upload or drag & drop</p>
                    <p className="text-[10px] text-gray-400 mt-1">PDF, PNG, JPG, DOC up to 10MB</p>
                  </>
                )}
              </label>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                disabled={!title.trim() || createMutation.isPending}
                className="px-4 py-2 rounded-lg bg-[#2d6a4f] text-white text-sm font-medium hover:bg-[#2d6a4f] disabled:opacity-50 transition-colors"
              >
                {createMutation.isPending ? "Saving..." : "Upload"}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-lg bg-gray-100 text-gray-500 text-sm font-medium hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </TCard>
      )}

      {(!resources || resources.length === 0) && !showForm ? (
        <EmptyState
          icon={Library}
          title="No Resources Yet"
          body="Upload PDFs, images, and teaching resources to share with your students."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(resources ?? []).map((res) => (
            <TCard key={res.id}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#2d6a4f]/10 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-[#2d6a4f]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{res.title}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    {res.fileType.toUpperCase()} · Shared with: {res.shareScope === "all" ? "All students" : res.shareScope}
                  </p>
                  {res.description && (
                    <p className="text-xs text-gray-500 mt-1 truncate">{res.description}</p>
                  )}
                </div>
                <button
                  onClick={() => deleteMutation.mutate({ id: res.id })}
                  className="text-gray-500 hover:text-red-500 transition-colors shrink-0"
                  title="Delete resource"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </TCard>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Teacher Dashboard ─────────────────────────────────────────────────

export default function TeacherDashboard() {
  const [activeView, setActiveView] = useState<TeacherView>("overview");
  const [feedbackPrefill, setFeedbackPrefill] = useState<{ id: number; name: string } | null>(null);

  const handleFeedback = (studentId: number, name: string) => {
    setFeedbackPrefill({ id: studentId, name });
    setActiveView("feedback");
  };

  return (
    <TeacherDashboardLayout activeView={activeView} onNavigate={setActiveView}>
      {activeView === "overview" && <OverviewView onNavigate={setActiveView} />}
      {activeView === "students" && <StudentsView onFeedback={handleFeedback} />}
      {activeView === "groups" && <GroupsView />}
      {activeView === "tasks" && <TasksView />}
      {activeView === "assignments" && <TeacherAssignmentsView />}
      {activeView === "lessons" && <TeacherLessonsView />}
      {activeView === "feedback" && (
        <FeedbackView
          prefillStudentId={feedbackPrefill?.id}
          prefillStudentName={feedbackPrefill?.name}
          onClearPrefill={() => setFeedbackPrefill(null)}
        />
      )}
      {activeView === "reports" && <ReportsView />}
      {activeView === "progress" && <TeacherProgressView />}
      {activeView === "messages" && <MessagesView />}
      {activeView === "resources" && <ResourcesView />}
    </TeacherDashboardLayout>
  );
}
