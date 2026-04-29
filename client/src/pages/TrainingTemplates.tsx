/**
 * TrainingTemplates — User-facing horse training plan templates.
 *
 * SINGLE SOURCE OF TRUTH: User horse training templates.
 *
 * ⚠️  SYSTEM SEPARATION — READ BEFORE EDITING
 * ---------------------------------------------
 * This file manages HORSE TRAINING PLAN templates only:
 *   - Pre-designed exercise/workout schedules for horses
 *   - Users apply these templates to their horses' training logs
 *   - Route: /training-templates (protected, authenticated users)
 *
 * This is NOT the admin email campaign system. For email campaigns:
 *   client/src/pages/AdminCampaigns.tsx  (admin-only, inside Admin panel)
 *   server/_core/emailTemplates.ts       (HTML email template definitions)
 *
 * The PREDESIGNED_TEMPLATES constant below is also mirrored (read-only)
 * in Admin.tsx so administrators can browse the training content.
 */
import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { trpc } from "@/lib/trpc";
import {
  Plus,
  Edit,
  Copy,
  Trash2,
  Play,
  Globe,
  Lock,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Search,
  X,
  Eye,
  Info,
  AlertTriangle,
  CalendarDays,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";

// Consistent discipline badge color mapping
function getDisciplineBadgeClass(discipline: string): string {
  switch (discipline.toLowerCase()) {
    case "dressage":
      return "bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-700";
    case "jumping":
      return "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-700";
    case "eventing":
      return "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-700";
    case "western":
      return "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-900/20 dark:text-rose-300 dark:border-rose-700";
    case "general":
    default:
      return "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700";
  }
}

/** Color class for session type badge */
function getSessionTypeBadgeClass(type: string): string {
  switch ((type || "").toLowerCase()) {
    case "flatwork":
    case "dressage":
      return "bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-900/20 dark:text-purple-300";
    case "jumping":
    case "poles":
    case "gridwork":
      return "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300";
    case "hack":
    case "hacking":
    case "hack/trail":
      return "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-300";
    case "groundwork":
    case "lunging":
      return "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-300";
    case "rest":
      return "bg-gray-50 text-gray-500 border border-gray-200 dark:bg-gray-800 dark:text-gray-400";
    case "walk":
      return "bg-teal-50 text-teal-700 border border-teal-200 dark:bg-teal-900/20 dark:text-teal-300";
    case "competition":
      return "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-900/20 dark:text-rose-300";
    default:
      return "bg-gray-50 text-gray-600 border border-gray-200 dark:bg-gray-800 dark:text-gray-300";
  }
}

/** Color class for intensity badge */
function getIntensityBadgeClass(intensity: string): string {
  switch ((intensity || "").toLowerCase()) {
    case "high":
      return "bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/20 dark:text-red-300";
    case "moderate-high":
      return "bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-900/20 dark:text-orange-300";
    case "moderate":
      return "bg-yellow-50 text-yellow-700 border border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300";
    case "low-moderate":
      return "bg-lime-50 text-lime-700 border border-lime-200 dark:bg-lime-900/20 dark:text-lime-300";
    case "low":
      return "bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/20 dark:text-green-300";
    default:
      return "bg-gray-50 text-gray-500 border border-gray-200 dark:bg-gray-800 dark:text-gray-400";
  }
}

/** Parse programData JSON safely; returns null on failure */
function parseProgramData(programData: string | null | undefined): {
  weeks: Array<{
    week: number;
    focus?: string;
    warmup?: string;
    main_work?: string;
    cooldown?: string;
    safety_notes?: string;
    sessions: Array<{
      day: string;
      type: string;
      duration: number;
      description: string;
      intensity: string;
    }>;
  }>;
} | null {
  if (!programData) return null;
  try {
    return JSON.parse(programData);
  } catch {
    return null;
  }
}

/** Template Preview dialog — renders full week-by-week schedule */
function TemplatePreviewDialog({
  template,
  open,
  onClose,
}: {
  template: any;
  open: boolean;
  onClose: () => void;
}) {
  const [activeWeek, setActiveWeek] = useState(0);

  const program = parseProgramData(template?.programData);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-[#1a2435]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <CalendarDays className="w-5 h-5 text-primary shrink-0" />
            {template?.name}
          </DialogTitle>
          <DialogDescription className="mt-1">
            {template?.description}
          </DialogDescription>
        </DialogHeader>

        {/* Meta badges */}
        <div className="flex flex-wrap gap-1.5 -mt-1">
          {template?.discipline && (
            <Badge variant="outline" className={`text-xs ${getDisciplineBadgeClass(template.discipline)}`}>
              {template.discipline}
            </Badge>
          )}
          {template?.level && (
            <Badge variant="outline" className="text-xs">
              {template.level}
            </Badge>
          )}
          {template?.duration && (
            <Badge variant="outline" className="text-xs">
              {template.duration} weeks
            </Badge>
          )}
        </div>

        {/* Goals */}
        {template?.goals && (
          <div className="rounded-lg bg-primary/5 border border-primary/10 px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
            <span className="font-semibold text-primary">Goals: </span>
            {template.goals}
          </div>
        )}

        {program && program.weeks && program.weeks.length > 0 ? (
          <>
            {/* Week selector tabs */}
            {program.weeks.length > 1 && (
              <div className="flex gap-1.5 flex-wrap">
                {program.weeks.map((w, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveWeek(i)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      activeWeek === i
                        ? "bg-primary text-white border-primary shadow-sm"
                        : "bg-white dark:bg-[#1a2435] text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-primary/50"
                    }`}
                  >
                    Week {w.week}
                  </button>
                ))}
              </div>
            )}

            {/* Active week detail */}
            {(() => {
              const week = program.weeks[activeWeek];
              if (!week) return null;
              return (
                <div className="space-y-4">
                  {week.focus && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-primary mb-1">
                        Week {week.week} Focus
                      </p>
                      <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                        {week.focus}
                      </p>
                    </div>
                  )}

                  {/* Sessions table */}
                  {week.sessions && week.sessions.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
                        Weekly Schedule
                      </p>
                      <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                              <th className="text-left px-3 py-2 font-semibold text-gray-600 dark:text-gray-300 w-24">Day</th>
                              <th className="text-left px-3 py-2 font-semibold text-gray-600 dark:text-gray-300 w-28">Type</th>
                              <th className="text-left px-3 py-2 font-semibold text-gray-600 dark:text-gray-300 w-20">Duration</th>
                              <th className="text-left px-3 py-2 font-semibold text-gray-600 dark:text-gray-300">Exercise Description</th>
                              <th className="text-left px-3 py-2 font-semibold text-gray-600 dark:text-gray-300 w-28">Intensity</th>
                            </tr>
                          </thead>
                          <tbody>
                            {week.sessions.map((session, si) => (
                              <tr
                                key={si}
                                className={`border-b border-gray-100 dark:border-gray-800 last:border-0 ${
                                  session.type === "rest"
                                    ? "bg-gray-50/50 dark:bg-gray-800/20"
                                    : "hover:bg-gray-50 dark:hover:bg-gray-800/30"
                                }`}
                              >
                                <td className="px-3 py-2.5 font-medium text-gray-700 dark:text-gray-200">
                                  {session.day}
                                </td>
                                <td className="px-3 py-2.5">
                                  <Badge variant="outline" className={`text-xs capitalize ${getSessionTypeBadgeClass(session.type)}`}>
                                    {session.type}
                                  </Badge>
                                </td>
                                <td className="px-3 py-2.5 text-gray-600 dark:text-gray-400">
                                  {session.duration > 0 ? `${session.duration} min` : "—"}
                                </td>
                                <td className="px-3 py-2.5 text-gray-700 dark:text-gray-300 leading-snug">
                                  {session.description}
                                </td>
                                <td className="px-3 py-2.5">
                                  {session.intensity && session.intensity !== "none" ? (
                                    <Badge variant="outline" className={`text-xs capitalize ${getIntensityBadgeClass(session.intensity)}`}>
                                      {session.intensity}
                                    </Badge>
                                  ) : (
                                    <span className="text-gray-400 text-xs">—</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Warmup / Main Work / Cooldown / Safety notes */}
                  {(week.warmup || week.main_work || week.cooldown || week.safety_notes) && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {week.warmup && (
                        <div className="rounded-lg bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 px-3 py-2.5">
                          <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-1">🟢 Warm-Up</p>
                          <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">{week.warmup}</p>
                        </div>
                      )}
                      {week.main_work && (
                        <div className="rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 px-3 py-2.5">
                          <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-1">🔵 Main Work</p>
                          <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">{week.main_work}</p>
                        </div>
                      )}
                      {week.cooldown && (
                        <div className="rounded-lg bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800 px-3 py-2.5">
                          <p className="text-xs font-semibold text-purple-700 dark:text-purple-400 mb-1">🟣 Cool-Down</p>
                          <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">{week.cooldown}</p>
                        </div>
                      )}
                      {week.safety_notes && (
                        <div className="rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 px-3 py-2.5">
                          <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Safety Notes
                          </p>
                          <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">{week.safety_notes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}
          </>
        ) : (
          <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">
            <Info className="mx-auto w-8 h-8 mb-2 opacity-40" />
            <p>No detailed schedule data available for this template.</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="rounded-lg">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Predesigned training templates with week 1 program data
// Note: These templates provide week 1 as a starter. Users can extend
// them by adding additional weeks based on the established pattern.
const PREDESIGNED_TEMPLATES = [
  {
    id: "flatwork",
    category: "foundation",
    name: "Flatwork Session",
    description:
      "Foundation flatwork training focusing on rhythm, suppleness, and connection",
    duration: 4,
    discipline: "general",
    level: "beginner",
    goals: "Develop basic flatwork skills, improve rhythm and balance",
    isPredesigned: true,
    programData: JSON.stringify({
      weeks: [
        {
          week: 1,
          focus: "Establishing rhythm and relaxation",
          sessions: [
            {
              day: "Monday",
              type: "flatwork",
              duration: 30,
              description: "Walk and trot work focusing on rhythm",
              intensity: "low",
            },
            {
              day: "Tuesday",
              type: "rest",
              duration: 0,
              description: "Rest day - turnout",
              intensity: "none",
            },
            {
              day: "Wednesday",
              type: "flatwork",
              duration: 35,
              description: "Circles and transitions",
              intensity: "low",
            },
            {
              day: "Thursday",
              type: "rest",
              duration: 0,
              description: "Light hack or turnout",
              intensity: "none",
            },
            {
              day: "Friday",
              type: "flatwork",
              duration: 40,
              description: "Serpentines and changes of direction",
              intensity: "low-moderate",
            },
            {
              day: "Saturday",
              type: "flatwork",
              duration: 45,
              description: "Review week's work",
              intensity: "low-moderate",
            },
            {
              day: "Sunday",
              type: "rest",
              duration: 0,
              description: "Rest day",
              intensity: "none",
            },
          ],
        },
      ],
    }),
  },
  {
    id: "jumping",
    category: "foundation",
    name: "Jumping Session",
    description:
      "Progressive jumping training from ground poles to small fences",
    duration: 6,
    discipline: "jumping",
    level: "intermediate",
    goals: "Build confidence over fences, improve jumping technique and style",
    isPredesigned: true,
    programData: JSON.stringify({
      weeks: [
        {
          week: 1,
          focus: "Ground poles and rhythm",
          sessions: [
            {
              day: "Monday",
              type: "flatwork",
              duration: 30,
              description: "Flatwork warm-up",
              intensity: "low",
            },
            {
              day: "Tuesday",
              type: "jumping",
              duration: 40,
              description: "Ground poles in trot",
              intensity: "moderate",
            },
            {
              day: "Wednesday",
              type: "rest",
              duration: 0,
              description: "Rest or light hack",
              intensity: "none",
            },
            {
              day: "Thursday",
              type: "flatwork",
              duration: 35,
              description: "Canter work",
              intensity: "moderate",
            },
            {
              day: "Friday",
              type: "jumping",
              duration: 45,
              description: "Small cross-poles",
              intensity: "moderate",
            },
            {
              day: "Saturday",
              type: "rest",
              duration: 0,
              description: "Turnout",
              intensity: "none",
            },
            {
              day: "Sunday",
              type: "jumping",
              duration: 40,
              description: "Grid work",
              intensity: "moderate",
            },
          ],
        },
      ],
    }),
  },
  {
    id: "dressage",
    category: "foundation",
    name: "Dressage Session",
    description:
      "Classical dressage training emphasizing precision and collection",
    duration: 8,
    discipline: "dressage",
    level: "intermediate",
    goals: "Improve collection, lateral work, and test accuracy",
    isPredesigned: true,
    programData: JSON.stringify({
      weeks: [
        {
          week: 1,
          focus: "Establishing the basics",
          sessions: [
            {
              day: "Monday",
              type: "flatwork",
              duration: 45,
              description: "Walk, trot, canter transitions",
              intensity: "moderate",
            },
            {
              day: "Tuesday",
              type: "rest",
              duration: 0,
              description: "Rest day",
              intensity: "none",
            },
            {
              day: "Wednesday",
              type: "flatwork",
              duration: 50,
              description: "Lateral work introduction",
              intensity: "moderate",
            },
            {
              day: "Thursday",
              type: "hack",
              duration: 30,
              description: "Light hack",
              intensity: "low",
            },
            {
              day: "Friday",
              type: "flatwork",
              duration: 45,
              description: "Test practice",
              intensity: "moderate",
            },
            {
              day: "Saturday",
              type: "rest",
              duration: 0,
              description: "Turnout",
              intensity: "none",
            },
            {
              day: "Sunday",
              type: "flatwork",
              duration: 40,
              description: "Review and polish",
              intensity: "moderate",
            },
          ],
        },
      ],
    }),
  },
  {
    id: "conditioning",
    category: "fitness",
    name: "Conditioning Session",
    description:
      "Fitness and stamina building for all-around horse development",
    duration: 6,
    discipline: "general",
    level: "beginner",
    goals:
      "Build cardiovascular fitness, muscle tone, and overall conditioning",
    isPredesigned: true,
    programData: JSON.stringify({
      weeks: [
        {
          week: 1,
          focus: "Building base fitness",
          sessions: [
            {
              day: "Monday",
              type: "walk",
              duration: 30,
              description: "Walk work only",
              intensity: "low",
            },
            {
              day: "Tuesday",
              type: "hack",
              duration: 40,
              description: "Walk and trot hack",
              intensity: "low-moderate",
            },
            {
              day: "Wednesday",
              type: "rest",
              duration: 0,
              description: "Rest day",
              intensity: "none",
            },
            {
              day: "Thursday",
              type: "flatwork",
              duration: 35,
              description: "Trot work",
              intensity: "moderate",
            },
            {
              day: "Friday",
              type: "rest",
              duration: 0,
              description: "Light turnout",
              intensity: "none",
            },
            {
              day: "Saturday",
              type: "hack",
              duration: 45,
              description: "Longer hack with hills",
              intensity: "moderate",
            },
            {
              day: "Sunday",
              type: "rest",
              duration: 0,
              description: "Rest day",
              intensity: "none",
            },
          ],
        },
      ],
    }),
  },
  {
    id: "warmup",
    category: "warmup",
    name: "Warmup Session",
    description: "Essential warmup routine before training or competition",
    duration: 2,
    discipline: "general",
    level: "beginner",
    goals: "Prepare horse physically and mentally for work",
    isPredesigned: true,
    programData: JSON.stringify({
      weeks: [
        {
          week: 1,
          focus: "Standard warmup protocol",
          sessions: [
            {
              day: "Monday",
              type: "walk",
              duration: 15,
              description:
                "Walk on long rein - 10 min, then working walk - 5 min",
              intensity: "low",
            },
            {
              day: "Tuesday",
              type: "flatwork",
              duration: 20,
              description: "Progressive trot work",
              intensity: "low-moderate",
            },
            {
              day: "Wednesday",
              type: "flatwork",
              duration: 20,
              description: "Canter warmup",
              intensity: "moderate",
            },
            {
              day: "Thursday",
              type: "walk",
              duration: 15,
              description: "Pre-jumping warmup",
              intensity: "low",
            },
            {
              day: "Friday",
              type: "flatwork",
              duration: 20,
              description: "Competition day warmup",
              intensity: "moderate",
            },
            {
              day: "Saturday",
              type: "walk",
              duration: 15,
              description: "Gentle warmup",
              intensity: "low",
            },
            {
              day: "Sunday",
              type: "rest",
              duration: 0,
              description: "Rest",
              intensity: "none",
            },
          ],
        },
      ],
    }),
  },
  {
    id: "rehab",
    category: "rehabilitation",
    name: "Rehab Session",
    description:
      "Gentle rehabilitation program for horses returning from injury",
    duration: 8,
    discipline: "general",
    level: "beginner",
    goals: "Safe return to work, rebuild strength and confidence",
    isPredesigned: true,
    programData: JSON.stringify({
      weeks: [
        {
          week: 1,
          focus: "Gentle reintroduction to work",
          sessions: [
            {
              day: "Monday",
              type: "walk",
              duration: 15,
              description: "Walk in hand or under saddle",
              intensity: "low",
            },
            {
              day: "Tuesday",
              type: "rest",
              duration: 0,
              description: "Rest day",
              intensity: "none",
            },
            {
              day: "Wednesday",
              type: "walk",
              duration: 20,
              description: "Walk work only",
              intensity: "low",
            },
            {
              day: "Thursday",
              type: "rest",
              duration: 0,
              description: "Turnout only",
              intensity: "none",
            },
            {
              day: "Friday",
              type: "walk",
              duration: 20,
              description: "Walk with gentle stretching",
              intensity: "low",
            },
            {
              day: "Saturday",
              type: "rest",
              duration: 0,
              description: "Rest day",
              intensity: "none",
            },
            {
              day: "Sunday",
              type: "walk",
              duration: 25,
              description: "Longer walk",
              intensity: "low",
            },
          ],
        },
      ],
    }),
  },
  {
    id: "young-horse",
    category: "development",
    name: "Young Horse Basics",
    description:
      "Progressive foundation program for young horses in early development (3–5 year olds)",
    duration: 12,
    discipline: "general",
    level: "beginner",
    goals:
      "Foundation training, build confidence, develop basic skills under saddle",
    isPredesigned: true,
    programData: JSON.stringify({
      weeks: [
        {
          week: 1,
          focus: "Building confidence and trust",
          warmup:
            "10 min in-hand walking around arena, introducing new sights and sounds",
          main_work:
            "Short groundwork sessions, gentle lunging, accepting tack",
          cooldown:
            "5 min walking on long rein, gentle grooming and positive reinforcement",
          safety_notes:
            "Keep sessions short (15–20 min). Never rush. End on a positive note.",
          sessions: [
            {
              day: "Monday",
              type: "groundwork",
              duration: 20,
              description:
                "Groundwork and handling — leading, halting, backing",
              intensity: "low",
            },
            {
              day: "Tuesday",
              type: "rest",
              duration: 0,
              description: "Turnout — allow free movement",
              intensity: "none",
            },
            {
              day: "Wednesday",
              type: "walk",
              duration: 15,
              description: "Walk work — lead or first ridden steps",
              intensity: "low",
            },
            {
              day: "Thursday",
              type: "groundwork",
              duration: 20,
              description: "Lunging basics — circles on lunge line",
              intensity: "low",
            },
            {
              day: "Friday",
              type: "rest",
              duration: 0,
              description: "Rest day",
              intensity: "none",
            },
            {
              day: "Saturday",
              type: "walk",
              duration: 20,
              description: "Walk with new objects, desensitisation",
              intensity: "low",
            },
            {
              day: "Sunday",
              type: "rest",
              duration: 0,
              description: "Free time / turnout",
              intensity: "none",
            },
          ],
        },
      ],
    }),
  },
  {
    id: "schooling",
    category: "foundation",
    name: "Schooling / Arena Session",
    description:
      "Focused arena schooling session developing suppleness, obedience, and collection",
    duration: 4,
    discipline: "general",
    level: "intermediate",
    goals:
      "Improve responsiveness, establish rhythm, develop throughness and engagement",
    isPredesigned: true,
    programData: JSON.stringify({
      weeks: [
        {
          week: 1,
          focus: "Rhythm, relaxation, and contact",
          warmup:
            "10 min walk on a long rein, progressing to working walk. 5 min rising trot both reins.",
          main_work:
            "20 min focused schooling: transitions, serpentines, leg yields, lengthening and shortening strides.",
          cooldown:
            "5 min walk on a long rein, stretching down. Finish with praise.",
          safety_notes:
            "Warm up thoroughly before asking for collection. Check footing before work.",
          sessions: [
            {
              day: "Monday",
              type: "flatwork",
              duration: 40,
              description: "Walk/trot transitions, working on bend and rhythm",
              intensity: "moderate",
            },
            {
              day: "Tuesday",
              type: "hack",
              duration: 30,
              description: "Light hack — mental break from arena",
              intensity: "low",
            },
            {
              day: "Wednesday",
              type: "flatwork",
              duration: 45,
              description: "Canter work, transitions, 20m circles",
              intensity: "moderate",
            },
            {
              day: "Thursday",
              type: "rest",
              duration: 0,
              description: "Rest day — turnout",
              intensity: "none",
            },
            {
              day: "Friday",
              type: "flatwork",
              duration: 45,
              description: "Lateral work: leg yields and shoulder-fore",
              intensity: "moderate",
            },
            {
              day: "Saturday",
              type: "flatwork",
              duration: 40,
              description: "Review week's movements, polish and flow",
              intensity: "moderate",
            },
            {
              day: "Sunday",
              type: "rest",
              duration: 0,
              description: "Rest day",
              intensity: "none",
            },
          ],
        },
      ],
    }),
  },
  {
    id: "pole-work",
    category: "foundation",
    name: "Pole Work Session",
    description:
      "Ground pole and raised pole exercises to improve rhythm, lift, and proprioception",
    duration: 3,
    discipline: "jumping",
    level: "beginner",
    goals:
      "Improve rhythm over poles, develop lift and engagement, sharpen focus and footwork",
    isPredesigned: true,
    programData: JSON.stringify({
      weeks: [
        {
          week: 1,
          focus: "Introducing poles and rhythm",
          warmup:
            "10 min walk, 5 min trot. Walk over single pole x 4 passes before introducing multiple poles.",
          main_work:
            "3 poles in a row (trot distance ~1.3m apart). Progress to 5 poles. Canter poles at 3m spacing.",
          cooldown: "5 min walk on long rein. Praise.",
          safety_notes:
            "Ensure poles are bright and visible. Check distances suit your horse's stride length. Build gradually.",
          sessions: [
            {
              day: "Monday",
              type: "flatwork",
              duration: 30,
              description: "Flatwork warm-up: circles, transitions, rhythm",
              intensity: "low",
            },
            {
              day: "Tuesday",
              type: "jumping",
              duration: 35,
              description: "Single pole in walk, then trot. Build to 3 poles.",
              intensity: "low-moderate",
            },
            {
              day: "Wednesday",
              type: "rest",
              duration: 0,
              description: "Rest or hack",
              intensity: "none",
            },
            {
              day: "Thursday",
              type: "jumping",
              duration: 40,
              description: "5-pole trot grid, introduce raised poles",
              intensity: "moderate",
            },
            {
              day: "Friday",
              type: "flatwork",
              duration: 30,
              description: "Flat work consolidation — no poles",
              intensity: "low",
            },
            {
              day: "Saturday",
              type: "jumping",
              duration: 40,
              description: "Canter poles 3m spacing, 5 poles in a row",
              intensity: "moderate",
            },
            {
              day: "Sunday",
              type: "rest",
              duration: 0,
              description: "Rest day",
              intensity: "none",
            },
          ],
        },
      ],
    }),
  },
  {
    id: "jump-conditioning",
    category: "fitness",
    name: "Jump Conditioning Programme",
    description:
      "Systematic jumping programme to build confidence, power, and technique over fences",
    duration: 6,
    discipline: "jumping",
    level: "intermediate",
    goals:
      "Build scope, consistency over fences, develop rider–horse jumping partnership",
    isPredesigned: true,
    programData: JSON.stringify({
      weeks: [
        {
          week: 1,
          focus: "Ground poles, trot poles, and small crosses",
          warmup:
            "10 min flatwork on both reins. Walk and trot poles before fence work.",
          main_work:
            "Grid work: 2 poles, then a small cross-pole. Maximum height 50cm. 4–6 repetitions.",
          cooldown: "Walk on long rein for 5–10 min. Stretch and praise.",
          safety_notes:
            "Never jump tired. Stop after refusals and reassess. Check tack before every session.",
          sessions: [
            {
              day: "Monday",
              type: "flatwork",
              duration: 35,
              description: "Flatwork — prepare canter for jump work",
              intensity: "moderate",
            },
            {
              day: "Tuesday",
              type: "jumping",
              duration: 40,
              description: "Pole grid in trot, cross-poles (50cm)",
              intensity: "moderate",
            },
            {
              day: "Wednesday",
              type: "hack",
              duration: 30,
              description: "Relaxing hack — mental rest",
              intensity: "low",
            },
            {
              day: "Thursday",
              type: "flatwork",
              duration: 35,
              description: "Canter work, adjustability, distances",
              intensity: "moderate",
            },
            {
              day: "Friday",
              type: "jumping",
              duration: 45,
              description: "Grid: cross-pole + upright (60cm)",
              intensity: "moderate-high",
            },
            {
              day: "Saturday",
              type: "rest",
              duration: 0,
              description: "Rest — turnout",
              intensity: "none",
            },
            {
              day: "Sunday",
              type: "jumping",
              duration: 45,
              description: "Course of 4–6 fences, emphasis on rhythm",
              intensity: "moderate",
            },
          ],
        },
      ],
    }),
  },
  {
    id: "hacking-conditioning",
    category: "fitness",
    name: "Hacking / Conditioning Ride",
    description:
      "Outdoor conditioning rides combining terrain work, fitness, and mental wellbeing",
    duration: 4,
    discipline: "general",
    level: "beginner",
    goals:
      "Build cardiovascular fitness, strengthen topline, provide variety and mental stimulation",
    isPredesigned: true,
    programData: JSON.stringify({
      weeks: [
        {
          week: 1,
          focus: "Building base fitness through varied terrain",
          warmup:
            "First 10 min always walk to warm up tendons and muscles before trotting.",
          main_work:
            "Include walk, trot, and short canter sections. Introduce gentle hills for hindquarter strength.",
          cooldown: "Last 10 min walk to cool down. Check legs on return.",
          safety_notes:
            "Always tell someone your route. Check footing before canter. Use hi-vis in low light.",
          sessions: [
            {
              day: "Monday",
              type: "hack",
              duration: 45,
              description: "Moderate hack — walk and trot on flat terrain",
              intensity: "low-moderate",
            },
            {
              day: "Tuesday",
              type: "flatwork",
              duration: 30,
              description: "Arena flatwork — transitions and suppleness",
              intensity: "moderate",
            },
            {
              day: "Wednesday",
              type: "rest",
              duration: 0,
              description: "Rest day — turnout",
              intensity: "none",
            },
            {
              day: "Thursday",
              type: "hack",
              duration: 50,
              description: "Hill work hack — includes uphill trot",
              intensity: "moderate",
            },
            {
              day: "Friday",
              type: "flatwork",
              duration: 30,
              description: "Arena work — maintain suppleness",
              intensity: "low-moderate",
            },
            {
              day: "Saturday",
              type: "hack",
              duration: 60,
              description: "Longer conditioning hack — walk/trot/short canters",
              intensity: "moderate",
            },
            {
              day: "Sunday",
              type: "rest",
              duration: 0,
              description: "Rest day",
              intensity: "none",
            },
          ],
        },
      ],
    }),
  },
  {
    id: "groundwork",
    category: "foundation",
    name: "Groundwork Session",
    description:
      "In-hand and lungeing programme to develop obedience, suppleness, and partnership",
    duration: 3,
    discipline: "general",
    level: "beginner",
    goals:
      "Improve responsiveness, develop calmness and focus, build horse–handler relationship",
    isPredesigned: true,
    programData: JSON.stringify({
      weeks: [
        {
          week: 1,
          focus: "Establishing clear communication from the ground",
          warmup:
            "5 min in-hand walk around arena. Introduce equipment calmly.",
          main_work:
            "Lunging on 20m circle both directions. Walk, trot, canter transitions. Lateral movements in-hand.",
          cooldown:
            "5 min walk on lunge, finishing with a pat and positive reward.",
          safety_notes:
            "Always wear gloves when lunging. Keep safe distance. Work on non-slip footing.",
          sessions: [
            {
              day: "Monday",
              type: "groundwork",
              duration: 25,
              description: "In-hand: halt, walk, backing, yielding to pressure",
              intensity: "low",
            },
            {
              day: "Tuesday",
              type: "groundwork",
              duration: 30,
              description: "Lunging: walk-trot transitions on 20m circle",
              intensity: "low",
            },
            {
              day: "Wednesday",
              type: "rest",
              duration: 0,
              description: "Rest day",
              intensity: "none",
            },
            {
              day: "Thursday",
              type: "groundwork",
              duration: 30,
              description: "Lunging: trot-canter transitions, rhythm focus",
              intensity: "low-moderate",
            },
            {
              day: "Friday",
              type: "groundwork",
              duration: 25,
              description:
                "In-hand lateral work: shoulder-in, turn on haunches",
              intensity: "low",
            },
            {
              day: "Saturday",
              type: "rest",
              duration: 0,
              description: "Rest or light turnout",
              intensity: "none",
            },
            {
              day: "Sunday",
              type: "groundwork",
              duration: 30,
              description: "Free lungeing or join-up work",
              intensity: "low",
            },
          ],
        },
      ],
    }),
  },
  {
    id: "rest-recovery",
    category: "recovery",
    name: "Rest & Light Recovery",
    description:
      "Low-intensity recovery week for horses after competition, injury, or heavy training",
    duration: 1,
    discipline: "general",
    level: "beginner",
    goals:
      "Allow physical and mental recovery, maintain light movement, assess soundness",
    isPredesigned: true,
    programData: JSON.stringify({
      weeks: [
        {
          week: 1,
          focus: "Gentle movement and recovery",
          warmup:
            "Always start with 5–10 min slow walk. Do not rush into trot.",
          main_work:
            "Short walk or very light trot sessions only. Prioritise turnout and rest.",
          cooldown: "Always finish with walk. Check legs for heat or swelling.",
          safety_notes:
            "If horse shows any lameness or discomfort, consult vet before continuing exercise.",
          sessions: [
            {
              day: "Monday",
              type: "walk",
              duration: 20,
              description: "Gentle walk in-hand or under saddle",
              intensity: "low",
            },
            {
              day: "Tuesday",
              type: "rest",
              duration: 0,
              description: "Full rest — turnout preferred",
              intensity: "none",
            },
            {
              day: "Wednesday",
              type: "walk",
              duration: 25,
              description: "Light walk hack",
              intensity: "low",
            },
            {
              day: "Thursday",
              type: "rest",
              duration: 0,
              description: "Rest — turnout",
              intensity: "none",
            },
            {
              day: "Friday",
              type: "walk",
              duration: 20,
              description: "Short gentle walk, check soundness",
              intensity: "low",
            },
            {
              day: "Saturday",
              type: "rest",
              duration: 0,
              description: "Rest",
              intensity: "none",
            },
            {
              day: "Sunday",
              type: "walk",
              duration: 25,
              description: "Easy walk, assess readiness to return to work",
              intensity: "low",
            },
          ],
        },
      ],
    }),
  },
  {
    id: "fitness-building",
    category: "fitness",
    name: "Fitness Building Week",
    description:
      "Progressive weekly fitness plan to increase cardiovascular capacity and muscle strength",
    duration: 6,
    discipline: "general",
    level: "intermediate",
    goals:
      "Systematically raise fitness level, build stamina, improve recovery time after work",
    isPredesigned: true,
    programData: JSON.stringify({
      weeks: [
        {
          week: 1,
          focus: "Establishing aerobic base",
          warmup: "10 min walk, increasing pace over the first 5 min.",
          main_work:
            "20–30 min continuous trot with regular rest walks. Include 2× 5-min canter sets.",
          cooldown:
            "10 min walk to let heart rate return to normal. Check breathing.",
          safety_notes:
            "Monitor for excessive sweating, laboured breathing, or stumbling. Build up load progressively.",
          sessions: [
            {
              day: "Monday",
              type: "hack",
              duration: 45,
              description: "Long trot hack with gentle hills",
              intensity: "moderate",
            },
            {
              day: "Tuesday",
              type: "flatwork",
              duration: 40,
              description: "Arena work — active trot transitions",
              intensity: "moderate",
            },
            {
              day: "Wednesday",
              type: "rest",
              duration: 0,
              description: "Rest day — active turnout",
              intensity: "none",
            },
            {
              day: "Thursday",
              type: "hack",
              duration: 50,
              description:
                "Interval training: 3× 5-min canter with 5-min trot recovery",
              intensity: "moderate-high",
            },
            {
              day: "Friday",
              type: "flatwork",
              duration: 35,
              description: "Light schooling — maintain suppleness",
              intensity: "low-moderate",
            },
            {
              day: "Saturday",
              type: "hack",
              duration: 60,
              description: "Longer conditioning ride — mixed terrain",
              intensity: "moderate",
            },
            {
              day: "Sunday",
              type: "rest",
              duration: 0,
              description: "Rest day",
              intensity: "none",
            },
          ],
        },
      ],
    }),
  },
  {
    id: "confidence-rebuilding",
    category: "rehabilitation",
    name: "Confidence Rebuilding",
    description:
      "Gentle, structured programme to rebuild confidence in horses that have had a setback",
    duration: 8,
    discipline: "general",
    level: "beginner",
    goals:
      "Restore confidence and willingness, re-establish trust, identify and address fear triggers",
    isPredesigned: true,
    programData: JSON.stringify({
      weeks: [
        {
          week: 1,
          focus: "Calm foundations — no pressure, only success",
          warmup:
            "Always start further away from any feared object/area. Let the horse observe calmly.",
          main_work:
            "Only ask for things horse is confident doing. Reward try and effort. Short sessions.",
          cooldown:
            "Always end on a positive note, even something very small. Praise lavishly.",
          safety_notes:
            "Never force or flood. If horse is very anxious, consult qualified trainer or behaviourist.",
          sessions: [
            {
              day: "Monday",
              type: "groundwork",
              duration: 20,
              description: "Calm groundwork — things the horse knows well",
              intensity: "low",
            },
            {
              day: "Tuesday",
              type: "walk",
              duration: 20,
              description: "Relaxed walk in a safe, familiar area",
              intensity: "low",
            },
            {
              day: "Wednesday",
              type: "rest",
              duration: 0,
              description: "Rest — turnout in calm environment",
              intensity: "none",
            },
            {
              day: "Thursday",
              type: "groundwork",
              duration: 25,
              description:
                "Desensitisation — introduce calm new stimulus at distance",
              intensity: "low",
            },
            {
              day: "Friday",
              type: "walk",
              duration: 25,
              description: "Gentle ridden walk — familiar route",
              intensity: "low",
            },
            {
              day: "Saturday",
              type: "rest",
              duration: 0,
              description: "Rest",
              intensity: "none",
            },
            {
              day: "Sunday",
              type: "walk",
              duration: 25,
              description: "Walk with companion horse for confidence",
              intensity: "low",
            },
          ],
        },
      ],
    }),
  },
  {
    id: "competition-prep",
    category: "competition",
    name: "4-Week Competition Preparation",
    description:
      "Structured 4-week programme to peak your horse for a competition — covering fitness, school work, and mental preparation",
    duration: 4,
    discipline: "general",
    level: "intermediate",
    goals:
      "Peak fitness and sharpness for competition day; consistent performance under pressure; horse calm and obedient in new environments",
    isPredesigned: true,
    programData: JSON.stringify({
      weeks: [
        {
          week: 1,
          focus: "Fitness and base work",
          warmup: "10 min walk on a loose rein. 5 min rising trot both reins before any schooling.",
          main_work: "40–45 min combination of arena work and hacking. Maintain forward rhythm. No collection this week — focus on relaxation and rhythm only.",
          cooldown: "10 min walk on a long rein. Check legs for heat or swelling after every session.",
          safety_notes: "Do not peak too early. Week 1 is about building confidence and rhythmic fitness, not perfection.",
          sessions: [
            { day: "Monday", type: "flatwork", duration: 40, description: "Rhythmic flatwork — walk, trot, canter on both reins. No collection. Focus on forward, relaxed paces.", intensity: "moderate" },
            { day: "Tuesday", type: "hack", duration: 45, description: "Conditioning hack — walk and trot with 2× 5-min canter on good ground", intensity: "moderate" },
            { day: "Wednesday", type: "rest", duration: 0, description: "Rest day — active turnout preferred", intensity: "none" },
            { day: "Thursday", type: "flatwork", duration: 45, description: "Transitions and suppleness. 20m circles, serpentines, medium trot. Monitor straightness.", intensity: "moderate" },
            { day: "Friday", type: "hack", duration: 30, description: "Short relaxing hack — mental break from arena", intensity: "low" },
            { day: "Saturday", type: "flatwork", duration: 50, description: "Full schooling session — practice competition movements. Note areas needing improvement.", intensity: "moderate" },
            { day: "Sunday", type: "rest", duration: 0, description: "Rest day", intensity: "none" },
          ],
        },
        {
          week: 2,
          focus: "Accuracy and refinement",
          warmup: "10 min walk. 5 min rising trot. Add lateral warm-up: leg yield in walk both directions.",
          main_work: "Focus on the specific movements required for your competition test. Ride each movement 3–5 times, rewarding accuracy and relaxation. Introduce collection work.",
          cooldown: "10 min walk. Stretch long and low in trot for 3 min before final walk.",
          safety_notes: "Do not drill movements to exhaustion. If horse becomes tense, ride forwards and return to basics. Tense schooling creates tension on competition day.",
          sessions: [
            { day: "Monday", type: "flatwork", duration: 45, description: "Lateral work: leg yield, shoulder-in, haunches-in. Focus on consistent bend and engagement.", intensity: "moderate" },
            { day: "Tuesday", type: "hack", duration: 40, description: "Conditioning hack. Include 3× 5-min canter sets. Check respiration and recovery time.", intensity: "moderate" },
            { day: "Wednesday", type: "rest", duration: 0, description: "Rest day — turnout", intensity: "none" },
            { day: "Thursday", type: "flatwork", duration: 50, description: "Competition test walkthrough. Ride full test twice at reduced energy. Mark transitions precisely.", intensity: "moderate" },
            { day: "Friday", type: "flatwork", duration: 35, description: "Light flatwork — keep horse fresh. Canter transitions only. No drilling.", intensity: "low-moderate" },
            { day: "Saturday", type: "flatwork", duration: 50, description: "Mock competition warmup: 10 min warm-up, then ride test as if at the show.", intensity: "moderate" },
            { day: "Sunday", type: "rest", duration: 0, description: "Full rest — long turnout", intensity: "none" },
          ],
        },
        {
          week: 3,
          focus: "Sharpening and confidence",
          warmup: "10 min walk. 5 min trot. Brief lateral walk work. Quick canter on both reins before schooling.",
          main_work: "Focus sessions on the 2–3 weakest movements from your test. Do NOT over-school strong movements. Introduce some work outside the arena to maintain mental freshness.",
          cooldown: "10 min long-rein walk. Cold hose or ice legs if working hard. Check temperature and soundness.",
          safety_notes: "This week is about quality, not quantity. One good repetition outweighs 10 mediocre ones. Stop while the horse is still willing.",
          sessions: [
            { day: "Monday", type: "flatwork", duration: 40, description: "Work on your 2 weakest movements. Short focused session — end as soon as quality is achieved.", intensity: "moderate" },
            { day: "Tuesday", type: "hack", duration: 45, description: "Countryside hack — allow horse to relax, switch off, and enjoy the outing", intensity: "low-moderate" },
            { day: "Wednesday", type: "rest", duration: 0, description: "Rest day", intensity: "none" },
            { day: "Thursday", type: "flatwork", duration: 45, description: "Final practice run of full test. Ride confidently and positively. Praise generously.", intensity: "moderate" },
            { day: "Friday", type: "hack", duration: 30, description: "Short relaxing hack or light arena walk. Keep horse happy and fresh.", intensity: "low" },
            { day: "Saturday", type: "flatwork", duration: 35, description: "Very light flatwork — just enough to keep muscles warm. Finish early.", intensity: "low-moderate" },
            { day: "Sunday", type: "rest", duration: 0, description: "Rest day before competition week", intensity: "none" },
          ],
        },
        {
          week: 4,
          focus: "Competition week — freshness and focus",
          warmup: "Keep warmup short. 10 min walk, 10 min trot/canter, no prolonged collection work. Horse should arrive in the ring FRESH.",
          main_work: "Minimal schooling. Maintain routine but do not fatigue. Trust your preparation — this week is about confidence, not corrections.",
          cooldown: "Cold hose, stretch, and check legs and shoes post-competition.",
          safety_notes: "On competition day: arrive early, walk the venue calmly, allow horse to settle before warming up. Eat and hydrate yourself — a tired rider produces a tense horse.",
          sessions: [
            { day: "Monday", type: "flatwork", duration: 35, description: "Light ride — loose, forward, no collection. Keep horse mentally fresh.", intensity: "low-moderate" },
            { day: "Tuesday", type: "hack", duration: 30, description: "Short relaxing hack. Let horse enjoy being out.", intensity: "low" },
            { day: "Wednesday", type: "rest", duration: 0, description: "Rest day — preparation and tack check", intensity: "none" },
            { day: "Thursday", type: "flatwork", duration: 25, description: "Very light ride — test your warmup routine. 15 min max of active work.", intensity: "low" },
            { day: "Friday", type: "rest", duration: 0, description: "Travel day or pre-competition rest. Check horse overnight.", intensity: "none" },
            { day: "Saturday", type: "flatwork", duration: 0, description: "COMPETITION DAY — Trust your preparation. Warm up calmly. Ride forward and positive.", intensity: "none" },
            { day: "Sunday", type: "rest", duration: 0, description: "Post-competition rest. Cold hose legs. Assess soundness. Celebrate your results!", intensity: "none" },
          ],
        },
      ],
    }),
  },
  {
    id: "advanced-collection",
    category: "foundation",
    name: "Advanced Collection & Lateral Work",
    description:
      "3-week programme for established horses ready to develop collection, self-carriage, and advanced lateral movements",
    duration: 3,
    discipline: "dressage",
    level: "advanced",
    goals:
      "Develop true collection with engagement of hindquarters, improve self-carriage, introduce or refine half-pass, travers, and counter-canter",
    isPredesigned: true,
    programData: JSON.stringify({
      weeks: [
        {
          week: 1,
          focus: "Building engagement and preparing for collection",
          warmup: "15 min progressive warmup: walk on long rein → working walk → rising trot both reins → sitting trot → canter transitions. Lateral warm-up: leg yield in walk, then trot.",
          main_work: "Establish correct contact and rhythm before any collection. Use transitions (walk–trot, trot–canter, canter–walk) to activate hindquarters. Introduce shoulder-in to develop engagement. 30 min active work maximum.",
          cooldown: "5–10 min long-and-low trot stretch, then free walk on a long rein. Always allow the horse to decompress.",
          safety_notes: "Collection must come from the hindquarters pushing through, not the front end being held back. If resistance is felt, ride forward first, then rebalance. Never use force.",
          sessions: [
            { day: "Monday", type: "flatwork", duration: 50, description: "Warm-up + trot and canter transitions. Shoulder-in in trot both reins. 15 min. Finish with stretch.", intensity: "moderate" },
            { day: "Tuesday", type: "hack", duration: 40, description: "Relaxing hack — allow horse to stretch and recover mentally", intensity: "low" },
            { day: "Wednesday", type: "rest", duration: 0, description: "Rest day — turnout", intensity: "none" },
            { day: "Thursday", type: "flatwork", duration: 55, description: "Shoulder-in to travers progression in trot. Counter-canter introduction on large loop. Reward consistency.", intensity: "moderate-high" },
            { day: "Friday", type: "flatwork", duration: 40, description: "Light collection work. Walk pirouette preparation: turn on haunches 180°. Trot half-pass introduction (5m displacement).", intensity: "moderate" },
            { day: "Saturday", type: "hack", duration: 30, description: "Light hack or short ride outside arena — mental rest", intensity: "low" },
            { day: "Sunday", type: "rest", duration: 0, description: "Rest day", intensity: "none" },
          ],
        },
        {
          week: 2,
          focus: "Developing the lateral movements",
          warmup: "12 min warmup. Include rein-back after square halt — this activates the hindquarters effectively before collection work.",
          main_work: "Introduce half-pass properly: begin from shoulder-in in trot, then ask horse to cross and move diagonally while maintaining bend. 3–4 repetitions each rein, keep steps clean. Counter-canter: extend to full 20m loop counter-canter maintaining bend.",
          cooldown: "Always finish with free walk and long-rein trot stretch. Praise and release after every correct response.",
          safety_notes: "Half-pass requires the horse to be supple through the body. Do not attempt without established shoulder-in. If horse falls off the track or loses rhythm, ride forward and reset.",
          sessions: [
            { day: "Monday", type: "flatwork", duration: 55, description: "Half-pass development in trot. Start in shoulder-in, ask for diagonal crossing. 3 reps each rein. Quality over quantity.", intensity: "moderate-high" },
            { day: "Tuesday", type: "hack", duration: 40, description: "Conditioning hack. Trot and canter work to maintain fitness.", intensity: "moderate" },
            { day: "Wednesday", type: "rest", duration: 0, description: "Rest day", intensity: "none" },
            { day: "Thursday", type: "flatwork", duration: 55, description: "Counter-canter on full 20m loop. Travers in trot 10m circle. Introduce collected trot — 3 strides of collection, release.", intensity: "moderate-high" },
            { day: "Friday", type: "flatwork", duration: 40, description: "Consolidation session — revisit week 1 movements. Check shoulder-in quality. Half-pass review.", intensity: "moderate" },
            { day: "Saturday", type: "groundwork", duration: 25, description: "In-hand lateral work — shoulder-in, travers, and rein-back from the ground", intensity: "low" },
            { day: "Sunday", type: "rest", duration: 0, description: "Rest day — long turnout", intensity: "none" },
          ],
        },
        {
          week: 3,
          focus: "Consolidation and self-carriage",
          warmup: "12–15 min full warm-up. Include rein-back, leg yield, and a few shoulder-in steps before collected work begins.",
          main_work: "Focus on self-carriage: horse maintains balance and rhythm WITHOUT constant rider support. Test by briefly releasing leg and hand — horse should stay in balance for 3+ strides. Half-pass in both trot and canter. Extended paces from collection — contrast is key.",
          cooldown: "Always decompress: long-rein trot, free walk, allow back muscles to release.",
          safety_notes: "Self-carriage takes months to develop. Do not rush. End every session on a positive moment — a correct half-pass, a balanced canter transition, or a clean rein-back.",
          sessions: [
            { day: "Monday", type: "flatwork", duration: 55, description: "Self-carriage tests in trot and canter. Half-pass both reins. Medium trot from collection. Finish: extended walk.", intensity: "moderate-high" },
            { day: "Tuesday", type: "hack", duration: 45, description: "Varied terrain hack — hills to build hindquarter strength naturally", intensity: "moderate" },
            { day: "Wednesday", type: "rest", duration: 0, description: "Rest day", intensity: "none" },
            { day: "Thursday", type: "flatwork", duration: 60, description: "Full dressage session: test sequence movements. Half-pass, counter-canter, collected and extended paces. 45 min active work.", intensity: "high" },
            { day: "Friday", type: "flatwork", duration: 35, description: "Short session — consolidate, don't introduce new work. Finish on a strong note.", intensity: "moderate" },
            { day: "Saturday", type: "rest", duration: 0, description: "Rest or very light walk — allow horse to recover from week's hard work", intensity: "low" },
            { day: "Sunday", type: "rest", duration: 0, description: "Full rest day — evaluate progress and plan next training block", intensity: "none" },
          ],
        },
      ],
    }),
  },
];

function TrainingTemplatesContent() {
  const [, setLocation] = useLocation();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isApplyOpen, setIsApplyOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<any>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    duration: "",
    discipline: "",
    level: "",
    goals: "",
    isPublic: false,
  });
  const [applyData, setApplyData] = useState({
    horseId: "",
    startDate: new Date().toISOString().split("T")[0],
  });
  // Collapsible state for predesigned template categories — foundation open by default
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(["foundation"]),
  );
  // Active category filter for quick jump (null = show all)
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  // Template search query
  const [templateSearch, setTemplateSearch] = useState("");

  const openPreviewDialog = (template: any) => {
    setPreviewTemplate(template);
    setIsPreviewOpen(true);
  };

  const toggleCategory = (key: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const utils = trpc.useUtils();
  const { data: templates, isLoading } =
    trpc.trainingPrograms.listTemplates.useQuery();
  const { data: horses } = trpc.horses.list.useQuery();

  const createMutation = trpc.trainingPrograms.createTemplate.useMutation({
    onSuccess: () => {
      toast.success("Template created successfully");
      utils.trainingPrograms.listTemplates.invalidate();
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const updateMutation = trpc.trainingPrograms.updateTemplate.useMutation({
    onSuccess: () => {
      toast.success("Template updated successfully");
      utils.trainingPrograms.listTemplates.invalidate();
      setIsEditOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const deleteMutation = trpc.trainingPrograms.deleteTemplate.useMutation({
    onSuccess: () => {
      toast.success("Template deleted successfully");
      utils.trainingPrograms.listTemplates.invalidate();
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const duplicateMutation = trpc.trainingPrograms.duplicateTemplate.useMutation(
    {
      onSuccess: () => {
        toast.success("Template duplicated successfully");
        utils.trainingPrograms.listTemplates.invalidate();
      },
      onError: (error) => {
        toast.error(`Error: ${error.message}`);
      },
    },
  );

  const applyMutation = trpc.trainingPrograms.applyTemplate.useMutation({
    onSuccess: (data) => {
      const count = data.sessionsCreated || 0;
      toast.success(`Training plan applied! ${count} sessions scheduled.`);
      setIsApplyOpen(false);
      setSelectedTemplate(null);
      setApplyData({
        horseId: "",
        startDate: new Date().toISOString().split("T")[0],
      });
      // Invalidate training sessions so the new plan appears immediately
      utils.training.listAll.invalidate();
      // Navigate to training page so user sees the result immediately
      setLocation("/training");
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const usePredesignedMutation =
    trpc.trainingPrograms.createTemplate.useMutation({
      onSuccess: (data, variables) => {
        utils.trainingPrograms.listTemplates.invalidate();
        // Immediately open the apply dialog so the user can apply the template
        // to a horse right away — no need to search for it in the list.
        const newTemplate = {
          id: data.id,
          name: variables.name,
          description: variables.description,
          duration: variables.duration,
          discipline: variables.discipline,
          level: variables.level,
          goals: variables.goals,
          programData: variables.programData,
        };
        setSelectedTemplate(newTemplate);
        setIsApplyOpen(true);
        toast.success(`"${variables.name}" added — choose a horse to apply it`);
      },
      onError: (error) => {
        toast.error(`Error: ${error.message}`);
      },
    });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      duration: "",
      discipline: "",
      level: "",
      goals: "",
      isPublic: false,
    });
    setSelectedTemplate(null);
  };

  const handleCreate = () => {
    if (!formData.name) {
      toast.error("Template name is required");
      return;
    }

    createMutation.mutate({
      name: formData.name,
      description: formData.description || undefined,
      duration: formData.duration ? parseInt(formData.duration) : undefined,
      discipline: formData.discipline || undefined,
      level: formData.level || undefined,
      goals: formData.goals || undefined,
      programData: JSON.stringify({ weeks: [] }),
      isPublic: formData.isPublic,
    });
  };

  const handleEdit = () => {
    if (!selectedTemplate || !formData.name) {
      toast.error("Template name is required");
      return;
    }

    updateMutation.mutate({
      id: selectedTemplate.id,
      name: formData.name,
      description: formData.description || undefined,
      duration: formData.duration ? parseInt(formData.duration) : undefined,
      discipline: formData.discipline || undefined,
      level: formData.level || undefined,
      goals: formData.goals || undefined,
      isPublic: formData.isPublic,
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this template?")) {
      deleteMutation.mutate({ id });
    }
  };

  const handleDuplicate = (id: number) => {
    duplicateMutation.mutate({ id });
  };

  const openEditDialog = (template: any) => {
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || "",
      duration: template.duration?.toString() || "",
      discipline: template.discipline || "",
      level: template.level || "",
      goals: template.goals || "",
      isPublic: template.isPublic || false,
    });
    setIsEditOpen(true);
  };

  const openApplyDialog = (template: any) => {
    setSelectedTemplate(template);
    setIsApplyOpen(true);
  };

  const handleApply = () => {
    if (!selectedTemplate || !applyData.horseId) {
      toast.error("Please select a horse");
      return;
    }

    applyMutation.mutate({
      templateId: selectedTemplate.id,
      horseId: parseInt(applyData.horseId),
      startDate: applyData.startDate,
    });
  };

  const handleAddPredesignedTemplate = (
    predesigned: (typeof PREDESIGNED_TEMPLATES)[0],
  ) => {
    usePredesignedMutation.mutate({
      name: predesigned.name,
      description: predesigned.description,
      duration: predesigned.duration,
      discipline: predesigned.discipline,
      level: predesigned.level,
      goals: predesigned.goals,
      programData: predesigned.programData,
      isPublic: false,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <PageHeader
            title="Training Templates"
            subtitle="Create reusable training session templates to quickly log consistent workouts. Templates save your common exercises, durations, and goals — apply them to any horse in seconds."
          />
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-lg">
              <Plus className="w-4 h-4 mr-2" />
              Create Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-[#1a2435]">
            <DialogHeader>
              <DialogTitle>Create Training Template</DialogTitle>
              <DialogDescription>
                Create a reusable training program template
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Template Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., Jumping Fundamentals, Dressage Level 1"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Brief description of the training program"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="duration">Duration (weeks)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={formData.duration}
                    onChange={(e) =>
                      setFormData({ ...formData, duration: e.target.value })
                    }
                    placeholder="e.g., 12"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="level">Level</Label>
                  <Select
                    value={formData.level}
                    onValueChange={(value) =>
                      setFormData({ ...formData, level: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                      <SelectItem value="professional">Professional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="discipline">Discipline</Label>
                <Select
                  value={formData.discipline}
                  onValueChange={(value) =>
                    setFormData({ ...formData, discipline: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select discipline" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dressage">Dressage</SelectItem>
                    <SelectItem value="jumping">Jumping</SelectItem>
                    <SelectItem value="eventing">Eventing</SelectItem>
                    <SelectItem value="western">Western</SelectItem>
                    <SelectItem value="endurance">Endurance</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="goals">Goals</Label>
                <Textarea
                  id="goals"
                  value={formData.goals}
                  onChange={(e) =>
                    setFormData({ ...formData, goals: e.target.value })
                  }
                  placeholder="Training goals and objectives"
                  rows={3}
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={formData.isPublic}
                  onChange={(e) =>
                    setFormData({ ...formData, isPublic: e.target.checked })
                  }
                  className="rounded"
                />
                <Label htmlFor="isPublic">
                  Make this template public (visible to all users)
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreateOpen(false);
                  resetForm();
                }}
                className="bg-white dark:bg-[#1a2435] border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={createMutation.isPending}
                className="rounded-lg"
              >
                {createMutation.isPending ? "Creating..." : "Create Template"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Predesigned Templates Section — Grouped by Purpose */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-1 h-5 rounded-full bg-gradient-to-b from-primary to-primary/40" />
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Predesigned Templates</h2>
          <span className="text-xs text-gray-500 dark:text-gray-400 ml-1 hidden sm:inline">— Professional training programs ready to use</span>
        </div>

        {/* Search + category filter row */}
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Search input */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={templateSearch}
              onChange={(e) => setTemplateSearch(e.target.value)}
              placeholder="Search templates…"
              className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a2435] text-gray-700 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
            {templateSearch && (
              <button
                onClick={() => setTemplateSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Category filter tabs */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setActiveCategory(null)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                activeCategory === null
                  ? "bg-primary text-white border-primary shadow-sm"
                  : "bg-white dark:bg-[#1a2435] text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-primary/50 hover:text-primary"
              }`}
            >
              All
            </button>
          {[
            { key: "foundation", label: "Foundation" },
            { key: "fitness", label: "Fitness" },
            { key: "rehabilitation", label: "Rehab" },
            { key: "development", label: "Development" },
            { key: "warmup", label: "Warm-Up" },
            { key: "recovery", label: "Recovery" },
          ].map((cat) => {
            const count = PREDESIGNED_TEMPLATES.filter((t) => t.category === cat.key).length;
            if (count === 0) return null;
            return (
              <button
                key={cat.key}
                onClick={() => {
                  setActiveCategory(cat.key);
                  // Auto-expand selected category
                  setExpandedCategories((prev) => new Set([...prev, cat.key]));
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                  activeCategory === cat.key
                    ? "bg-primary text-white border-primary shadow-sm"
                    : "bg-white dark:bg-[#1a2435] text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-primary/50 hover:text-primary"
                }`}
              >
                {cat.label}
                <span className={`ml-1.5 text-[10px] ${activeCategory === cat.key ? "text-white/75" : "text-gray-500 dark:text-gray-400"}`}>{count}</span>
              </button>
            );
          })}
          </div>
        </div>

        {/* Search results — flat list when searching */}
        {templateSearch.trim() ? (
          (() => {
            const q = templateSearch.toLowerCase();
            const matched = PREDESIGNED_TEMPLATES.filter(
              (t) =>
                t.name.toLowerCase().includes(q) ||
                t.description.toLowerCase().includes(q) ||
                t.discipline.toLowerCase().includes(q) ||
                t.level.toLowerCase().includes(q) ||
                (t.goals || "").toLowerCase().includes(q),
            );
            if (matched.length === 0) {
              return (
                <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">
                  No templates found for "{templateSearch}".{" "}
                  <button onClick={() => setTemplateSearch("")} className="text-primary underline underline-offset-2">Clear search</button>
                </div>
              );
            }
            return (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {matched.map((predesigned) => (
                  <Card
                    key={predesigned.id}
                    className="bg-white dark:bg-[#1a2435] rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary" />
                        {predesigned.name}
                      </CardTitle>
                      <CardDescription className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {predesigned.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-1.5">
                          {predesigned.discipline && (
                            <Badge variant="outline" className={`text-xs ${getDisciplineBadgeClass(predesigned.discipline)}`}>
                              {predesigned.discipline}
                            </Badge>
                          )}
                          {predesigned.level && (
                            <Badge variant="outline" className="text-xs">
                              {predesigned.level}
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {predesigned.duration} wks
                          </Badge>
                        </div>
                        <div className="flex gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 rounded-lg text-xs"
                            onClick={() => openPreviewDialog(predesigned)}
                          >
                            <Eye className="w-3 h-3 mr-1.5" />
                            Preview
                          </Button>
                          <Button
                            size="sm"
                            className="flex-1 rounded-lg text-xs"
                            onClick={() => handleAddPredesignedTemplate(predesigned)}
                            disabled={usePredesignedMutation.isPending}
                          >
                            <Play className="w-3 h-3 mr-1.5" />
                            Use
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            );
          })()
        ) : (
          [{ key: "foundation", label: "Foundation Training", desc: "Core flatwork, schooling, and groundwork sessions" },
          { key: "fitness", label: "Fitness & Conditioning", desc: "Build strength, stamina, and athletic performance" },
          { key: "rehabilitation", label: "Rehabilitation & Confidence", desc: "Recovery programmes and confidence rebuilding" },
          { key: "development", label: "Young Horse Development", desc: "Structured programmes for young or green horses" },
          { key: "warmup", label: "Warm-Up & Cool-Down", desc: "Structured warm-up and cool-down routines" },
          { key: "recovery", label: "Recovery & Rest", desc: "Active recovery and rest day planning" },
        ].filter((group) => activeCategory === null || group.key === activeCategory).map((group) => {
          const groupTemplates = PREDESIGNED_TEMPLATES.filter((t) => t.category === group.key);
          if (groupTemplates.length === 0) return null;
          const isOpen = expandedCategories.has(group.key);
          return (
            <Collapsible key={group.key} open={isOpen} onOpenChange={() => toggleCategory(group.key)}>
              <CollapsibleTrigger asChild>
                <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a2435] hover:bg-gray-50 dark:hover:bg-[#1e2940] transition-colors shadow-sm group">
                  {isOpen
                    ? <ChevronDown className="w-4 h-4 text-primary shrink-0" />
                    : <ChevronRight className="w-4 h-4 text-gray-400 shrink-0 group-hover:text-primary transition-colors" />
                  }
                  <div className="flex-1 flex items-baseline gap-2 text-left">
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{group.label}</span>
                    <span className="text-xs text-gray-400 dark:text-gray-500 hidden sm:inline">{group.desc}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 shrink-0">
                    {groupTemplates.length}
                  </Badge>
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 pt-3 pb-1 px-1">
                  {groupTemplates.map((predesigned) => (
                    <Card
                      key={predesigned.id}
                      className="bg-white dark:bg-[#1a2435] rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                              <Sparkles className="w-4 h-4 text-primary" />
                              {predesigned.name}
                            </CardTitle>
                            <CardDescription className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                              {predesigned.description}
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex flex-wrap gap-1.5">
                            {predesigned.discipline && (
                              <Badge variant="outline" className={`text-xs ${getDisciplineBadgeClass(predesigned.discipline)}`}>
                                {predesigned.discipline}
                              </Badge>
                            )}
                            {predesigned.level && (
                              <Badge variant="outline" className="text-xs bg-gray-50 text-gray-600 border border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700">
                                {predesigned.level}
                              </Badge>
                            )}
                            {predesigned.duration && (
                              <Badge variant="outline" className="text-xs bg-gray-50 text-gray-600 border border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700">
                                {predesigned.duration} weeks
                              </Badge>
                            )}
                          </div>

                          {predesigned.goals && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                              {predesigned.goals}
                            </p>
                          )}

                          <div className="flex gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openPreviewDialog(predesigned)}
                              className="flex-1 rounded-lg bg-white dark:bg-[#1a2435] border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              Preview
                            </Button>
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleAddPredesignedTemplate(predesigned)}
                              disabled={usePredesignedMutation.isPending}
                              className="flex-1 rounded-lg"
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              Use
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })
        )}
      </div>
      {/* User Templates Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-5 rounded-full bg-gradient-to-b from-primary to-primary/40" />
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Your Templates</h2>
          {templates && templates.length > 0 && (
            <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
              {templates.length}
            </Badge>
          )}
        </div>

        {/* Templates Grid */}
        {!templates || templates.length === 0 ? (
          <Card className="border-dashed bg-white dark:bg-[#1a2435] rounded-xl border-gray-200 dark:border-gray-700">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Play className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-gray-100">
                No custom templates yet
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-center mb-6 max-w-sm text-sm">
                Create your first custom training template or use one of the
                predesigned templates above.
              </p>
              <Button
                onClick={() => setIsCreateOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Template
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {templates.map((template) => (
                <Card
                  key={template.id}
                  className="bg-white dark:bg-[#1a2435] rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow"
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100">
                          {template.name}
                        </CardTitle>
                        <CardDescription className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          {template.description || "No description"}
                        </CardDescription>
                      </div>
                      {template.isPublic ? (
                        <Badge variant="secondary" className="ml-2 bg-blue-50 text-primary border border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700">
                          <Globe className="w-3 h-3 mr-1" />
                          Public
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="ml-2 bg-gray-50 text-gray-600 border border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700">
                          <Lock className="w-3 h-3 mr-1" />
                          Private
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {template.discipline && (
                          <Badge variant="outline" className={getDisciplineBadgeClass(template.discipline)}>{template.discipline}</Badge>
                        )}
                        {template.level && (
                          <Badge variant="outline" className="bg-gray-50 text-gray-600 border border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700">{template.level}</Badge>
                        )}
                        {template.duration && (
                          <Badge variant="outline" className="bg-gray-50 text-gray-600 border border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700">
                            {template.duration} weeks
                          </Badge>
                        )}
                      </div>

                      {template.goals && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                          {template.goals}
                        </p>
                      )}

                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openPreviewDialog(template)}
                          className="bg-white dark:bg-[#1a2435] border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg"
                          title="Preview schedule"
                        >
                          <Eye className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => openApplyDialog(template)}
                          className="flex-1 rounded-lg"
                        >
                          <Play className="w-3 h-3 mr-1" />
                          Apply
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditDialog(template)}
                          className="bg-white dark:bg-[#1a2435] border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg"
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDuplicate(template.id)}
                          className="bg-white dark:bg-[#1a2435] border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(template.id)}
                          className="bg-white dark:bg-[#1a2435] border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-[#1a2435]">
          <DialogHeader>
            <DialogTitle>Edit Training Template</DialogTitle>
            <DialogDescription>
              Update the training program template details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Template Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., Jumping Fundamentals, Dressage Level 1"
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Brief description of the training program"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit-duration">Duration (weeks)</Label>
                <Input
                  id="edit-duration"
                  type="number"
                  value={formData.duration}
                  onChange={(e) =>
                    setFormData({ ...formData, duration: e.target.value })
                  }
                  placeholder="e.g., 12"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-level">Level</Label>
                <Select
                  value={formData.level}
                  onValueChange={(value) =>
                    setFormData({ ...formData, level: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                    <SelectItem value="professional">Professional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="edit-discipline">Discipline</Label>
              <Select
                value={formData.discipline}
                onValueChange={(value) =>
                  setFormData({ ...formData, discipline: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select discipline" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dressage">Dressage</SelectItem>
                  <SelectItem value="jumping">Jumping</SelectItem>
                  <SelectItem value="eventing">Eventing</SelectItem>
                  <SelectItem value="western">Western</SelectItem>
                  <SelectItem value="endurance">Endurance</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-goals">Goals</Label>
              <Textarea
                id="edit-goals"
                value={formData.goals}
                onChange={(e) =>
                  setFormData({ ...formData, goals: e.target.value })
                }
                placeholder="Training goals and objectives"
                rows={3}
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="edit-isPublic"
                checked={formData.isPublic}
                onChange={(e) =>
                  setFormData({ ...formData, isPublic: e.target.checked })
                }
                className="rounded"
              />
              <Label htmlFor="edit-isPublic">Make this template public</Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditOpen(false);
                resetForm();
              }}
              className="bg-white dark:bg-[#1a2435] border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg"
            >
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={updateMutation.isPending} className="rounded-lg">
              {updateMutation.isPending ? "Updating..." : "Update Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Apply Template Dialog */}
      <Dialog open={isApplyOpen} onOpenChange={setIsApplyOpen}>
        <DialogContent className="bg-white dark:bg-[#1a2435]">
          <DialogHeader>
            <DialogTitle>Apply Template to Horse</DialogTitle>
            <DialogDescription>
              Select a horse and start date to apply this training template
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="horse">Select Horse *</Label>
              <Select
                value={applyData.horseId}
                onValueChange={(value) =>
                  setApplyData({ ...applyData, horseId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a horse" />
                </SelectTrigger>
                <SelectContent>
                  {horses?.map((horse) => (
                    <SelectItem key={horse.id} value={horse.id.toString()}>
                      {horse.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={applyData.startDate}
                onChange={(e) =>
                  setApplyData({ ...applyData, startDate: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsApplyOpen(false);
                setSelectedTemplate(null);
                setApplyData({
                  horseId: "",
                  startDate: new Date().toISOString().split("T")[0],
                });
              }}
              className="bg-white dark:bg-[#1a2435] border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg"
            >
              Cancel
            </Button>
            <Button onClick={handleApply} disabled={applyMutation.isPending} className="rounded-lg">
              {applyMutation.isPending ? "Applying..." : "Apply Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Preview Dialog */}
      {previewTemplate && (
        <TemplatePreviewDialog
          template={previewTemplate}
          open={isPreviewOpen}
          onClose={() => {
            setIsPreviewOpen(false);
            setPreviewTemplate(null);
          }}
        />
      )}
    </div>
  );
}

export default function TrainingTemplates() {
  return (
    <DashboardLayout>
      <TrainingTemplatesContent />
    </DashboardLayout>
  );
}
