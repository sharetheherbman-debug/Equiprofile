// Copyright (c) 2025-2026 Amarktai Network. All rights reserved.
// Student system router — Phase 2 backend integration
import {
  protectedProcedure,
  router,
} from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";
import { invokeLLM, isAIConfigured } from "./_core/llm";
import { getRuntimeConfig } from "./dynamicConfig";
import { eq, and, desc, gte, lte, sql, inArray, or } from "drizzle-orm";
import { getDb } from "./db";
import {
  virtualHorses,
  studentHorseAssignments,
  studentTasks,
  studentTrainingEntries,
  studentProgress,
  studyTopics,
  aiTutorSessions,
  horses,
  users,
  teacherAssignedTasks,
  teacherFeedback,
  learningPathwayProgress,
  studentGroups,
  studentGroupMembers,
  lessonPathways,
  lessonUnits,
  lessonCompletion,
  studentCompetencies,
  teacherLessonAssignments,
  lessonReviews,
  teacherStudentMessages,
  studentAssignments,
  teacherResources,
  studentReports,
} from "../drizzle/schema";
import { LESSON_PATHWAYS, LESSON_UNITS } from "./lessonContent";

/** Safely parse user preferences JSON. */
function parseUserPrefs(raw: string | null | undefined): Record<string, any> {
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/**
 * Student procedure — extends protectedProcedure to check that the user has
 * selected the student experience OR is an admin.
 */
const studentProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const user = await db.getUserById(ctx.user.id);
  if (!user) {
    throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
  }
  const prefs = parseUserPrefs(user.preferences);
  const isAdmin = user.role === "admin";
  const isStudent = prefs.selectedExperience === "student" || prefs.planTier === "student";
  if (!isAdmin && !isStudent) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "This feature requires the Student plan.",
    });
  }
  return next({ ctx });
});

// ─────────────────────────────────────────────────────────────────────────────
// AI Tutor — tiered model architecture
// ─────────────────────────────────────────────────────────────────────────────

/** Maximum AI tutor questions per user per day (cost control). */
const AI_TUTOR_DAILY_LIMIT = 20;

/** System prompt for the AI tutor — educational, horse-focused, safe. */
const AI_TUTOR_SYSTEM_PROMPT = `You are EquiProfile AI Tutor, a knowledgeable and friendly equestrian education assistant.

Your role:
- Help students learn about horse care, riding, stable management, and equine health
- Explain concepts clearly at a level appropriate for student riders
- Encourage safe practices and proper horse handling
- Be supportive, patient, and educational
- Reference standard equestrian knowledge and BHS/Pony Club guidelines where relevant

Rules:
- Only answer questions related to horses, riding, equestrian care, and related topics
- If asked about unrelated topics, gently redirect to equestrian learning
- Never give veterinary diagnoses — advise consulting a vet for health concerns
- Keep answers concise but thorough (max 300 words unless more detail is requested)
- Use British English spelling conventions`;

/**
 * Resolve AI tutor model based on tier.
 * Tier 1 (standard): Use the lowest-cost configured model (GenX/HF compatible)
 * Tier 2 (smart): Use a more capable model for complex questions
 */
async function resolveTutorModel(tier: "standard" | "smart"): Promise<string> {
  if (tier === "smart") {
    const smartModel = await getRuntimeConfig("ai_tutor_smart_model", "AI_TUTOR_SMART_MODEL");
    return smartModel?.trim() || "genx-core-reasoner";
  }
  // Standard tier — cheapest model
  const cheapModel = await getRuntimeConfig("ai_tutor_model", "AI_TUTOR_MODEL");
  return cheapModel?.trim() || "genx-core-reasoner";
}

/**
 * Determine whether a question needs the smarter (more expensive) model.
 * Simple heuristic: long questions or those with complex keywords escalate.
 */
function shouldEscalate(question: string): boolean {
  const complexKeywords = [
    "explain in detail", "compare", "difference between",
    "why does", "biomechanics", "physiology", "nutrition plan",
    "detailed analysis", "training programme", "dressage test",
    "show jumping course", "lameness", "colic signs",
  ];
  if (question.length > 500) return true;
  const lower = question.toLowerCase();
  return complexKeywords.some((kw) => lower.includes(kw));
}

// ─────────────────────────────────────────────────────────────────────────────
// Default study topics — seeded on first request if table is empty
// ─────────────────────────────────────────────────────────────────────────────
const DEFAULT_STUDY_TOPICS = [
  // ── BEGINNER ──────────────────────────────────────────────────────────────
  { slug: "riding-position", title: "Riding Position & Balance", description: "Learn the fundamentals of a correct riding position, balance, and independent seat.", category: "riding", difficulty: "beginner" as const, sortOrder: 1 },
  { slug: "aids-and-control", title: "Aids & Control", description: "Understanding natural and artificial aids to communicate clearly with your horse.", category: "riding", difficulty: "beginner" as const, sortOrder: 2 },
  { slug: "grooming-basics", title: "Grooming Basics", description: "How to groom a horse properly — brushes, techniques, sequence, and daily routine.", category: "care", difficulty: "beginner" as const, sortOrder: 3 },
  { slug: "feeding-basics", title: "Feeding Basics", description: "Understanding horse nutrition, feed types, feeding schedules, and water requirements.", category: "care", difficulty: "beginner" as const, sortOrder: 4 },
  { slug: "tack-and-equipment", title: "Tack & Equipment", description: "Identifying, fitting, and caring for saddles, bridles, girths, and protective boots.", category: "care", difficulty: "beginner" as const, sortOrder: 5 },
  { slug: "horse-behaviour", title: "Horse Behaviour Basics", description: "Reading body language, understanding the flight response, herd instinct, and building trust.", category: "theory", difficulty: "beginner" as const, sortOrder: 6 },
  { slug: "stable-safety", title: "Stable & Yard Safety", description: "Essential safety practices around horses, in the stable yard, and when leading.", category: "safety", difficulty: "beginner" as const, sortOrder: 7 },
  { slug: "horse-health-awareness", title: "Signs of Good Health", description: "Recognising normal vital signs, healthy coat and condition, and when to call the vet.", category: "theory", difficulty: "beginner" as const, sortOrder: 8 },
  { slug: "lesson-preparation", title: "Lesson Preparation", description: "How to prepare for a riding lesson — tacking up, warming up, and goal setting.", category: "riding", difficulty: "beginner" as const, sortOrder: 9 },
  { slug: "care-routine", title: "Daily Care Routines", description: "Building consistent daily horse care habits — morning checks, turnout, and evening routines.", category: "care", difficulty: "beginner" as const, sortOrder: 10 },
  { slug: "horse-welfare", title: "Horse Welfare Principles", description: "The Five Freedoms framework and what it means in everyday horse care and management.", category: "theory", difficulty: "beginner" as const, sortOrder: 11 },
  { slug: "leading-and-handling", title: "Leading & Handling", description: "How to lead safely, tie up correctly, and handle a horse with confidence.", category: "safety", difficulty: "beginner" as const, sortOrder: 12 },
  // ── DEVELOPING ────────────────────────────────────────────────────────────
  { slug: "transitions", title: "Transitions & Paces", description: "Riding smooth upward and downward transitions between walk, trot, and canter.", category: "riding", difficulty: "developing" as const, sortOrder: 20 },
  { slug: "trot-work", title: "Trot Work", description: "Rising trot, sitting trot, diagonal awareness, and rhythm development.", category: "riding", difficulty: "developing" as const, sortOrder: 21 },
  { slug: "nutrition-in-depth", title: "Nutrition in Depth", description: "Feed ratios, roughage requirements, condition scoring, and balancing a diet.", category: "care", difficulty: "developing" as const, sortOrder: 22 },
  { slug: "hoof-care", title: "Hoof Care & the Farrier", description: "Understanding hoof structure, regular farrier cycles, and picking out hooves correctly.", category: "care", difficulty: "developing" as const, sortOrder: 23 },
  { slug: "rugging", title: "Rugging & Clipping", description: "When and how to rug, rug weights, turnout vs stable rugs, and basic clipping awareness.", category: "care", difficulty: "developing" as const, sortOrder: 24 },
  { slug: "horse-behaviour-advanced", title: "Understanding Problem Behaviours", description: "Common stable vices, causes of napping, and safe approaches to challenging behaviour.", category: "theory", difficulty: "developing" as const, sortOrder: 25 },
  { slug: "first-aid-basics", title: "Horse First Aid Basics", description: "Wound assessment, cold therapy, poulticing, and when to call the vet immediately.", category: "safety", difficulty: "developing" as const, sortOrder: 26 },
  { slug: "warming-up", title: "Warming Up & Cooling Down", description: "The importance of a proper warm-up, loosening exercises, and cooling down after exercise.", category: "riding", difficulty: "developing" as const, sortOrder: 27 },
  // ── INTERMEDIATE ──────────────────────────────────────────────────────────
  { slug: "canter-work", title: "Canter Work & Leads", description: "Correct canter lead aids, counter-canter introduction, and developing rhythm.", category: "riding", difficulty: "intermediate" as const, sortOrder: 30 },
  { slug: "lateral-work-intro", title: "Lateral Work — Introduction", description: "Leg yield and turn on the forehand — principles and aids.", category: "riding", difficulty: "intermediate" as const, sortOrder: 31 },
  { slug: "health-monitoring", title: "Health Monitoring & Vital Signs", description: "Taking pulse, respiration, and temperature; TPR norms; recognising illness early.", category: "theory", difficulty: "intermediate" as const, sortOrder: 32 },
  { slug: "lameness-awareness", title: "Lameness Awareness", description: "Recognising lameness, common causes, trot-up assessment, and appropriate response.", category: "theory", difficulty: "intermediate" as const, sortOrder: 33 },
  { slug: "competition-basics", title: "Competition Preparation", description: "Preparing for your first competition — tack checks, dress code, warm-up ring etiquette.", category: "riding", difficulty: "intermediate" as const, sortOrder: 34 },
  { slug: "arena-figures", title: "Arena Figures & Geometry", description: "Accurate circles, serpentines, diagonals, and how correct geometry develops the horse.", category: "riding", difficulty: "intermediate" as const, sortOrder: 35 },
  // ── ADVANCED ──────────────────────────────────────────────────────────────
  { slug: "collection-and-engagement", title: "Collection & Engagement", description: "Understanding collection, hindquarter engagement, and the scale of training.", category: "riding", difficulty: "advanced" as const, sortOrder: 40 },
  { slug: "horse-biomechanics", title: "Horse Biomechanics", description: "How the horse's body moves, back mechanics, and how rider position affects movement.", category: "theory", difficulty: "advanced" as const, sortOrder: 41 },
  { slug: "nutrition-advanced", title: "Advanced Nutrition & Supplementation", description: "Sport horse nutrition, supplements, electrolytes, and managing condition under work.", category: "care", difficulty: "advanced" as const, sortOrder: 42 },
  { slug: "accident-management", title: "Accident Management & Procedure", description: "Yard accident procedures, emergency contacts, insurance implications, and incident recording.", category: "safety", difficulty: "advanced" as const, sortOrder: 43 },
];

// ─────────────────────────────────────────────────────────────────────────────
// Scenario Training — static educational scenarios
// ─────────────────────────────────────────────────────────────────────────────

export type ScenarioLevel = "beginner" | "developing" | "intermediate" | "advanced";

export interface ScenarioChoice {
  id: string;
  text: string;
  isCorrect: boolean;
  explanation: string;
}

export interface Scenario {
  id: string;
  title: string;
  level: ScenarioLevel;
  category: string;
  prompt: string;
  choices: ScenarioChoice[];
  learningTakeaway: string;
}

const SCENARIO_DATA: Scenario[] = [
  // ── BEGINNER ──────────────────────────────────────────────────────────────
  {
    id: "s001",
    title: "Horse Unsettled During Grooming",
    level: "beginner",
    category: "Handling & Behaviour",
    prompt: "You are grooming your horse in the stable. He keeps moving away, pinning his ears, and swishing his tail. What is the most appropriate response?",
    choices: [
      { id: "a", text: "Ignore it and carry on — horses are always fidgety.", isCorrect: false, explanation: "Ignoring discomfort signals risks escalating the behaviour and can be unsafe. Horses communicate through body language." },
      { id: "b", text: "Shout at the horse and push him back into position.", isCorrect: false, explanation: "Raising your voice or using force will increase anxiety and may trigger a defensive reaction." },
      { id: "c", text: "Stop, assess the situation — check if the brush is too firm, the area is painful, or the horse is unsettled by something nearby.", isCorrect: true, explanation: "Correct. These are signs of discomfort or stress. Investigate the cause before continuing. Check the grooming tools, the body area, and the horse's surroundings." },
      { id: "d", text: "Remove the horse from the stable and put him out immediately.", isCorrect: false, explanation: "Turnout may not be appropriate at that time and doesn't address the root cause of the discomfort." },
    ],
    learningTakeaway: "Horses communicate discomfort through body language. Ear position, tail swishing, and movement away from the handler are signals to assess — not ignore.",
  },
  {
    id: "s002",
    title: "Water Bucket Empty in the Stable",
    level: "beginner",
    category: "Daily Care",
    prompt: "You go to check on your horse at 3pm and find the water bucket completely empty. The horse was last checked at 8am. What should you do first?",
    choices: [
      { id: "a", text: "Refill it and carry on without concern — it's normal for buckets to empty.", isCorrect: false, explanation: "While horses do drink considerable amounts, an empty bucket by 3pm may indicate unusually high intake, which can be a sign of illness." },
      { id: "b", text: "Refill immediately, note the time and intake, and monitor for signs of dehydration or illness.", isCorrect: true, explanation: "Correct. Always refill promptly. Noting the consumption is important — excessive drinking (polydipsia) can signal health issues. The horse should always have fresh water available." },
      { id: "c", text: "Wait until evening feed to refill as part of the routine.", isCorrect: false, explanation: "A horse should never be left without water. Dehydration can develop rapidly, especially in warm conditions or after exercise." },
      { id: "d", text: "Call the vet immediately because it must be ill.", isCorrect: false, explanation: "Not necessarily — monitoring first is appropriate. A vet call is needed only if there are additional signs of illness." },
    ],
    learningTakeaway: "Fresh water should always be available to horses. Monitoring water intake is part of daily health assessment.",
  },
  {
    id: "s003",
    title: "Yard Gate Left Open",
    level: "beginner",
    category: "Yard Safety",
    prompt: "You notice the yard gate to the road has been left open. Several horses are turned out in the adjoining field. What do you do?",
    choices: [
      { id: "a", text: "Close the gate quietly and continue with your work.", isCorrect: false, explanation: "While closing the gate is essential, you should also alert others on the yard immediately so horses can be accounted for." },
      { id: "b", text: "Immediately close the gate, check horses are accounted for, and inform the yard manager.", isCorrect: true, explanation: "Correct. Close the gate first to prevent escape. Then check all horses are safe and inform the responsible person. This could prevent a serious accident." },
      { id: "c", text: "Run into the field to herd the horses away from the gate.", isCorrect: false, explanation: "Running can startle horses and cause them to bolt toward the open gate. Moving calmly and closing the gate first is safer." },
      { id: "d", text: "Leave it — the horses are unlikely to wander that far.", isCorrect: false, explanation: "Horses on a road present extreme danger to themselves, riders, and the public. An open gate must never be ignored." },
    ],
    learningTakeaway: "Yard security is every person's responsibility. An open gate to a road is a safety emergency. Act calmly and efficiently — close first, then account for animals.",
  },
  {
    id: "s004",
    title: "Finding a Wound on the Leg",
    level: "beginner",
    category: "Health & First Aid",
    prompt: "While picking out hooves, you notice a shallow cut approximately 3cm long on your horse's left foreleg, just below the knee. There is a small amount of dried blood. What should you do?",
    choices: [
      { id: "a", text: "Clean the wound gently with clean water, apply wound spray, and monitor. Report to the yard manager.", isCorrect: true, explanation: "Correct for a minor wound. Clean with clean water (avoid cotton wool fibres), apply antiseptic wound spray if available, and report to the responsible adult. Continuing to monitor for swelling, heat, or lameness is essential." },
      { id: "b", text: "Wrap the leg tightly with a bandage and continue riding.", isCorrect: false, explanation: "Riding a horse with an unassessed wound is inappropriate. Tight bandaging without correct technique can cause pressure injuries." },
      { id: "c", text: "Ignore it — small cuts always heal on their own.", isCorrect: false, explanation: "Even small wounds on legs need attention due to proximity to tendons, joints, and the risk of infection." },
      { id: "d", text: "Call the vet immediately regardless of the wound size.", isCorrect: false, explanation: "For a small superficial wound, immediate first aid and monitoring is appropriate. A vet is needed if the wound is deep, near a joint, or shows signs of infection." },
    ],
    learningTakeaway: "Any wound on a horse's leg requires assessment. Clean, observe, and report. Vet attention is needed for deep wounds, joint proximity, or signs of infection.",
  },
  // ── DEVELOPING ────────────────────────────────────────────────────────────
  {
    id: "s005",
    title: "Horse Showing Signs of Colic",
    level: "developing",
    category: "Health & First Aid",
    prompt: "You arrive at the stable to find your horse refusing his hay, repeatedly looking at his flank, pawing the ground, and appearing restless. What is the most likely concern and what is your immediate action?",
    choices: [
      { id: "a", text: "The horse is probably bored. Put more bedding down and leave him.", isCorrect: false, explanation: "These are classic signs of colic (abdominal pain), not boredom. Ignoring them could be life-threatening." },
      { id: "b", text: "These are signs of possible colic. Remove food, keep the horse calm, contact the vet immediately, and monitor vital signs.", isCorrect: true, explanation: "Correct. Pawing, flank-watching, and restlessness are primary colic indicators. Remove food, keep the horse calm (gentle walking if he wants to lie down), record pulse and respiration if possible, and call the vet without delay. Do not leave the horse unattended." },
      { id: "c", text: "Give the horse a large feed to settle his stomach.", isCorrect: false, explanation: "Feeding a horse showing colic signs can worsen the condition. Food must be removed immediately." },
      { id: "d", text: "Lunge him to encourage gut movement.", isCorrect: false, explanation: "Forcing exercise without veterinary advice is dangerous. Only gentle walking is sometimes appropriate, and only under vet guidance." },
    ],
    learningTakeaway: "Colic is a medical emergency. Recognise the signs early, remove food, keep the horse calm, and call the vet immediately. Do not give feeds, medicines, or vigorous exercise without veterinary advice.",
  },
  {
    id: "s006",
    title: "Saddle Fitting — Identifying a Problem",
    level: "developing",
    category: "Tack & Equipment",
    prompt: "You tack up your horse and notice he is reluctant to stand for mounting, repeatedly moving away and appearing tense when the saddle is placed. Once mounted, he pins his ears and drops his back. What does this suggest?",
    choices: [
      { id: "a", text: "The horse is being difficult and needs firmer handling.", isCorrect: false, explanation: "These behaviours are not naughtiness — they are consistent signs that the saddle is causing discomfort or pain." },
      { id: "b", text: "The behaviour suggests possible saddle fit issues or back discomfort. Dismount, remove the saddle, and report to the instructor or yard manager.", isCorrect: true, explanation: "Correct. Reluctance to mount, back-dropping, and ear-pinning under saddle are classic signs of saddle discomfort. Continuing to ride risks injury to both horse and rider. A qualified saddle fitter should assess the saddle." },
      { id: "c", text: "He's cold — he'll warm up in the lesson.", isCorrect: false, explanation: "While horses may be fresh in cold weather, these specific behavioural patterns under saddle indicate potential pain, not temperature." },
      { id: "d", text: "Tighten the girth further so the saddle doesn't move.", isCorrect: false, explanation: "Tightening a badly fitting saddle worsens the issue. Fit must be assessed by a professional." },
    ],
    learningTakeaway: "Behavioural changes when tacking up or under saddle should be taken seriously. They are often the horse's only way of communicating pain. Never ride if a saddle fit problem is suspected.",
  },
  {
    id: "s007",
    title: "Horse Rolls Repeatedly in the Field",
    level: "developing",
    category: "Health & First Aid",
    prompt: "During turnout, you observe your horse rolling repeatedly in the field, getting up and going down several times in quick succession, unlike his usual single relaxed roll. How do you respond?",
    choices: [
      { id: "a", text: "Repeated rolling during turnout is normal — leave him and check at the next routine time.", isCorrect: false, explanation: "A single roll is normal. Repeated, unsettled rolling is a colic symptom that needs immediate attention." },
      { id: "b", text: "Bring the horse in calmly, assess for other colic signs, remove food, and contact the vet.", isCorrect: true, explanation: "Correct. Repeated rolling is a clear colic indicator. Bring him in calmly (do not rush him), check pulse, gum colour, and gut sounds if trained to do so, and call the vet." },
      { id: "c", text: "Put more hay in the field so he has something to focus on.", isCorrect: false, explanation: "Feeding a horse with suspected colic is dangerous. Food should be withdrawn." },
      { id: "d", text: "It's probably just flies — apply fly repellent.", isCorrect: false, explanation: "Fly irritation causes isolated kicking or tail swishing, not repeated violent rolling. These are colic signs." },
    ],
    learningTakeaway: "Repeated unrestful rolling is a primary sign of abdominal pain. Know the difference between normal rolling behaviour and distress rolling.",
  },
  {
    id: "s008",
    title: "Incorrect Rug Choice",
    level: "developing",
    category: "Daily Care",
    prompt: "It is a mild autumn night (10°C). Your clipped horse has a lightweight turnout rug on. You check at 9pm and find him shivering slightly. What is the correct response?",
    choices: [
      { id: "a", text: "He'll warm up when he moves — leave him until morning.", isCorrect: false, explanation: "A shivering horse is already using energy to stay warm. Leaving a clipped horse under-rugged overnight risks his health and welfare." },
      { id: "b", text: "Replace or add a medium-weight rug appropriate for the temperature and the horse's clip level. Monitor for warming.", isCorrect: true, explanation: "Correct. A clipped horse loses his natural insulation and requires appropriate rugging at 10°C. A medium-weight rug (200–250g fill) is appropriate. Check he has warmed up after 20 minutes." },
      { id: "c", text: "Bring him in and put a thick stable rug on for the rest of the night.", isCorrect: false, explanation: "If he was turned out intentionally, bringing him in may not always be appropriate. The priority is correct rugging — indoor or outdoor depending on yard management." },
      { id: "d", text: "Horses can cope with cold — shivering is normal.", isCorrect: false, explanation: "Shivering indicates the horse is struggling to maintain body temperature. This is a welfare concern, not normal behaviour." },
    ],
    learningTakeaway: "Clipped horses require more rugging support as they have lost their natural coat. Match rug weight to temperature, clip level, and the individual horse.",
  },
  // ── INTERMEDIATE ──────────────────────────────────────────────────────────
  {
    id: "s009",
    title: "Lameness Check",
    level: "intermediate",
    category: "Health & Welfare",
    prompt: "While trotting your horse up for the vet, he appears slightly uneven on his right foreleg — nodding his head up when the right fore lands. The vet asks you to grade the lameness. Which grade best describes this presentation?",
    choices: [
      { id: "a", text: "Grade 0 — no lameness detected.", isCorrect: false, explanation: "A consistent head nod on a specific limb indicates lameness is present." },
      { id: "b", text: "Grade 1–2 — mild/subtle lameness that may only be visible under certain conditions.", isCorrect: true, explanation: "Correct. A subtle but consistent head nod on the right fore at trot, visible on a straight line, typically indicates Grade 1–2 on the AAEP scale. The horse moves inconsistently but isn't severely lame." },
      { id: "c", text: "Grade 4–5 — severe non-weight-bearing lameness.", isCorrect: false, explanation: "Grade 4–5 lameness involves near or complete non-weight-bearing. This horse is still moving with some discomfort, not refusing to use the limb." },
      { id: "d", text: "It's too early to assess — lame horses always show obvious signs.", isCorrect: false, explanation: "Even subtle lameness should be documented. Early detection matters significantly for treatment and welfare." },
    ],
    learningTakeaway: "Understanding lameness grading helps you communicate accurately with your vet. A head nod down on the sound leg (and up when the lame leg lands) is the classic fore-limb lameness indicator.",
  },
  {
    id: "s010",
    title: "Competition Warm-Up Etiquette",
    level: "intermediate",
    category: "Competition",
    prompt: "You are warming up for your dressage test. The warm-up arena is busy. A more advanced rider comes up behind you very closely on a faster horse. What is the correct action?",
    choices: [
      { id: "a", text: "Speed up to match their pace so they don't have to wait.", isCorrect: false, explanation: "Matching an inappropriate pace disrupts your warm-up and may unsettle your horse or compromise safety." },
      { id: "b", text: "Pass left shoulder to left shoulder when your paths cross, allow faster work to have the track, and call your turns early.", isCorrect: true, explanation: "Correct. Standard warm-up etiquette: pass left shoulder to left shoulder, faster work has priority on the track, and slower work moves to the inner track. Communication is key." },
      { id: "c", text: "Stop your horse and wait until the arena is quieter.", isCorrect: false, explanation: "Stopping suddenly in a busy warm-up area is dangerous. Plan your movements and be predictable." },
      { id: "d", text: "Move to the centre of the arena and practise there.", isCorrect: false, explanation: "The centre of the arena is not reserved space for any user — it creates confusion and risk. Use the track and inner tracks correctly." },
    ],
    learningTakeaway: "Warm-up arena etiquette: left shoulder to left shoulder, faster work has the track, communicate your changes of rein, and be predictable at all times.",
  },
  {
    id: "s011",
    title: "Recognising Dehydration",
    level: "intermediate",
    category: "Health & Welfare",
    prompt: "After an endurance training ride on a warm day, you perform a skin pinch test on your horse's neck. The skin takes 3 seconds to return to normal. What does this indicate?",
    choices: [
      { id: "a", text: "Normal — up to 5 seconds is acceptable.", isCorrect: false, explanation: "A skin tent returning within 1–2 seconds is normal. 3 seconds suggests mild to moderate dehydration." },
      { id: "b", text: "Mild to moderate dehydration — offer water immediately and monitor. Rest the horse and allow gradual rehydration.", isCorrect: true, explanation: "Correct. A skin tent test that takes 2–4 seconds to return indicates dehydration. Allow the horse to drink small amounts frequently. Check gum moisture and capillary refill time. Contact the vet if he refuses to drink or condition worsens." },
      { id: "c", text: "The horse has a skin condition — call the vet for dermatology advice.", isCorrect: false, explanation: "The skin pinch test specifically assesses hydration status, not skin condition." },
      { id: "d", text: "He is overheating — cool him with ice water immediately.", isCorrect: false, explanation: "Cooling is a separate consideration from dehydration. Ice water is not recommended for cooling — cool water on major vessels is more appropriate." },
    ],
    learningTakeaway: "The skin pinch test is a quick dehydration check. A tent returning in more than 2 seconds indicates dehydration. Know your basic vital sign monitoring after exercise.",
  },
  // ── ADVANCED ──────────────────────────────────────────────────────────────
  {
    id: "s012",
    title: "Shoeing Decision — To Shoe or Not",
    level: "advanced",
    category: "Hoof Care",
    prompt: "You have a 7-year-old sport horse in light to moderate work on a mix of arena and hacking surfaces. He has good-quality hooves and has been unshod for 6 months without issues. Your farrier suggests continuing barefoot. What factors should influence your decision?",
    choices: [
      { id: "a", text: "All horses in regular work must be shod — barefoot is only for retired horses.", isCorrect: false, explanation: "Many horses successfully perform in moderate work barefoot with correct hoof care and surface management." },
      { id: "b", text: "Consider work intensity, surface type, hoof quality, horse comfort, and farrier/vet advice. Barefoot can be appropriate if the horse is comfortable and performing well.", isCorrect: true, explanation: "Correct. The decision depends on multiple factors: type and intensity of work, surfaces used, individual hoof quality and conformation, and crucially — horse comfort. A horse moving freely and comfortably barefoot on his working surfaces may not require shoeing. Ongoing assessment is key." },
      { id: "c", text: "Shoe him immediately — hacking on roads will damage unshod hooves.", isCorrect: false, explanation: "Road hacking does wear hooves, but this must be balanced against the benefits and the horse's individual hoof quality. Gradual conditioning and appropriate trimming cycles often allow barefoot horses to hack." },
      { id: "d", text: "Ask a fellow livery owner rather than following the farrier's professional advice.", isCorrect: false, explanation: "A qualified farrier is the appropriate professional to consult. Their structural assessment should form the basis of the decision." },
    ],
    learningTakeaway: "Farriery decisions are not one-size-fits-all. Assess the individual horse on work intensity, surfaces, hoof quality, and comfort. A qualified farrier's assessment is essential.",
  },
  {
    id: "s013",
    title: "Muscle Tie-Up (Azoturia)",
    level: "advanced",
    category: "Health & Exercise Management",
    prompt: "During a hack, your horse suddenly becomes stiff behind, is reluctant to move forward, appears distressed, and begins to sweat excessively. The muscles over his quarters feel hard and painful. What is this most likely to be and what is your immediate response?",
    choices: [
      { id: "a", text: "He is tired — walk him home briskly to cool down.", isCorrect: false, explanation: "Tying-up (exertional rhabdomyolysis / azoturia) is serious. Moving the horse can worsen muscle damage and kidney stress significantly." },
      { id: "b", text: "This is consistent with tying-up. Do not move the horse. Keep him warm, call the vet immediately, and do not offer water unless the vet advises.", isCorrect: true, explanation: "Correct. Classic tying-up presentation. Movement causes further muscle fibre damage and can cause myoglobin to damage the kidneys. Keep the horse still and warm, call the vet urgently, and wait for professional guidance before any further action." },
      { id: "c", text: "Walk him in large circles to loosen the muscles.", isCorrect: false, explanation: "Exercise worsens tying-up by increasing muscle damage and myoglobin release. The horse must not be moved without veterinary instruction." },
      { id: "d", text: "Give him a large electrolyte drink to replace lost minerals.", isCorrect: false, explanation: "Do not offer food or water without veterinary advice during a tying-up episode." },
    ],
    learningTakeaway: "Tying-up (azoturia) is a muscular emergency. Do not move the horse. Keep him still and warm, and call the vet immediately. Movement significantly worsens the condition.",
  },
  {
    id: "s014",
    title: "Respiratory Rate — Post Exercise",
    level: "advanced",
    category: "Health Monitoring",
    prompt: "You have just completed a 45-minute canter schooling session. You dismount and check your horse's respiration rate. It is 60 breaths per minute. After 20 minutes of walking cool-down, it is still 36 bpm. The ambient temperature is 18°C. What is your assessment?",
    choices: [
      { id: "a", text: "60 bpm immediately post-canter is normal. 36 bpm after 20 minutes is within acceptable recovery range.", isCorrect: false, explanation: "A resting respiration rate should return to 8–16 bpm within 20–30 minutes post exercise in normal conditions. 36 bpm is elevated and requires monitoring." },
      { id: "b", text: "Immediate post-exercise rate is elevated but expected. However 36 bpm after 20 minutes suggests delayed recovery — continue monitoring, assess for other signs of distress, and consider veterinary advice if not improving.", isCorrect: true, explanation: "Correct. Normal resting respiration is 8–16 bpm. 60 bpm post-canter is expected. By 20 minutes, the rate should be substantially lower. 36 bpm after 20 minutes in mild conditions indicates the horse is working hard to recover. Continue cool-down, assess temperature, pulse, and gum colour, and seek vet advice if not normalising." },
      { id: "c", text: "60 bpm is a respiratory emergency — call the vet immediately before cooling down.", isCorrect: false, explanation: "Immediately post-hard work, elevated respiration is normal. Monitor the recovery rate rather than the immediate post-work figure." },
      { id: "d", text: "The respiration rate doesn't matter as long as the horse is eating normally.", isCorrect: false, explanation: "Vital signs post-exercise are key indicators of fitness, health, and recovery. Respiration monitoring is essential practice for any rider." },
    ],
    learningTakeaway: "Normal resting respiration: 8–16 bpm. Post-work recovery should be substantial within 20 minutes. Delayed recovery needs investigation. Vital sign monitoring post-exercise is essential equestrian practice.",
  },
  {
    id: "s015",
    title: "Stable Vice — Crib-Biting",
    level: "advanced",
    category: "Behaviour & Management",
    prompt: "You have taken on a new livery horse who crib-bites. The previous owner used an anti-cribbing collar. Another livery owner tells you to try a stronger anti-cribbing collar as the current one isn't working. What is the most informed approach?",
    choices: [
      { id: "a", text: "Use a stronger collar — stopping crib-biting is always the right goal.", isCorrect: false, explanation: "Stronger physical restraint addresses the symptom, not the cause. Crib-biting is often linked to stress, boredom, gut pain, or management factors." },
      { id: "b", text: "Review management factors (forage availability, stabling time, social contact, exercise) and seek veterinary advice about underlying gastric issues before increasing physical restraint.", isCorrect: true, explanation: "Correct. Crib-biting can be a response to gastric ulcers, insufficient forage, social isolation, or boredom. Physical restraint prevents the behaviour but does not address the cause, and may increase stress. Reviewing and improving management is the welfare-centred approach." },
      { id: "c", text: "Isolate the horse so other horses don't learn the behaviour.", isCorrect: false, explanation: "Social isolation worsens stress-related behaviours. Crib-biting is not typically learned socially, despite common belief." },
      { id: "d", text: "The collar is fine — increase the horse's workload to reduce boredom.", isCorrect: false, explanation: "Simply increasing work without addressing underlying causes is unlikely to resolve the behaviour and may not address gastric or management issues." },
    ],
    learningTakeaway: "Stable vices are often management or health-related. Investigate the underlying cause — gastric issues, forage, social contact, exercise — before relying on physical restraint.",
  },
  // ── BEGINNER (additional) ─────────────────────────────────────────────────
  {
    id: "s016",
    title: "Approaching a Horse in the Field",
    level: "beginner",
    category: "Handling & Safety",
    prompt: "You need to catch your horse from a large field. He is grazing near the middle. What is the safest and most effective approach?",
    choices: [
      { id: "a", text: "Run straight towards him to catch him before he moves away.", isCorrect: false, explanation: "Running towards a horse is threatening and will likely cause him to flee. Always approach calmly." },
      { id: "b", text: "Approach from the front-left, speaking quietly, with the headcollar behind your back or in a bucket. Walk at a calm, unhurried pace.", isCorrect: true, explanation: "Correct. Horses feel safest when approached from the near-side (left) at a calm pace. Hiding the headcollar reduces wariness. Speaking softly helps them recognise you before you are close." },
      { id: "c", text: "Approach from directly behind so he cannot see you coming.", isCorrect: false, explanation: "Approaching from directly behind is dangerous — horses can kick when startled. Always approach from the side." },
      { id: "d", text: "Shout his name loudly from the gate so he comes to you.", isCorrect: false, explanation: "Loud shouting can startle horses and trigger flight responses. If he is trained to come to his name, a gentle call is fine, but always go to the horse rather than expecting the horse to always come to you." },
    ],
    learningTakeaway: "Always approach horses from the near-side (left), calmly and quietly. Avoid sudden movements and never approach from directly behind.",
  },
  {
    id: "s017",
    title: "Loose Horse in the Yard",
    level: "beginner",
    category: "Handling & Safety",
    prompt: "A horse has slipped its headcollar and is loose in the yard. There are open gates and a road nearby. What is your immediate priority?",
    choices: [
      { id: "a", text: "Chase the horse back into the stable immediately.", isCorrect: false, explanation: "Chasing a loose horse escalates the situation and can cause the horse to panic and bolt towards danger." },
      { id: "b", text: "Shout for help, close open gates and hazardous exits first, then calmly attempt to approach the horse with a headcollar and a handful of feed.", isCorrect: true, explanation: "Correct. The immediate priority is preventing escape to dangerous areas. Alert others, contain the space, then approach calmly. Using feed or another horse can help attract the loose horse without chasing." },
      { id: "c", text: "Ignore it — horses usually find their own way back to their stable.", isCorrect: false, explanation: "A loose horse near a road or open boundary is a serious safety risk to the horse and public. Immediate safe action is required." },
      { id: "d", text: "Tackle the horse physically to stop it moving.", isCorrect: false, explanation: "Physical tackles are dangerous for both handler and horse. Calm, methodical containment and safe approach are always preferred." },
    ],
    learningTakeaway: "A loose horse near hazards requires calm, methodical action: contain exits first, then approach quietly. Chasing a horse increases panic and risk.",
  },
  {
    id: "s018",
    title: "Mucking Out Safely",
    level: "beginner",
    category: "Stable Management",
    prompt: "You are mucking out a stable with the horse still inside. The horse starts to become restless and moves towards you while you are using a fork. What should you do?",
    choices: [
      { id: "a", text: "Continue working quickly to finish — the horse will settle.", isCorrect: false, explanation: "Continuing to work around a restless horse with a sharp tool risks injury. The horse's behaviour should always take priority." },
      { id: "b", text: "Tie the horse up or remove the horse from the stable before continuing.", isCorrect: true, explanation: "Correct. The safest practice is to tie the horse up short or remove it from the stable entirely when mucking out. This protects both horse and handler from accidents with tools." },
      { id: "c", text: "Push the horse away firmly with the fork to create space.", isCorrect: false, explanation: "Using a fork to push a horse is dangerous and abusive. If the horse moves into your space, stop work and reposition the horse safely." },
      { id: "d", text: "Leave the stable and return later when the horse is calmer.", isCorrect: false, explanation: "While temporarily leaving is safer than risking injury, the correct approach is to tie the horse or remove it so the work can be completed safely." },
    ],
    learningTakeaway: "Always tie up or remove horses before mucking out with tools. Never use tools to push a horse — stop work and safely reposition the horse first.",
  },
  {
    id: "s019",
    title: "Incorrect Girth Tightening",
    level: "beginner",
    category: "Tack & Equipment",
    prompt: "You are tacking up for a lesson. You tighten the girth and the horse nips at you and pins its ears. What is the most likely explanation and correct response?",
    choices: [
      { id: "a", text: "The horse is being naughty and should be disciplined.", isCorrect: false, explanation: "Girth sensitivity and associated discomfort are common and can indicate saddle fit issues, girth galls, or gastric problems. Discipline would not address the cause." },
      { id: "b", text: "The horse may be girth-sensitive. Tighten gradually, check for saddle and girth fit issues, and monitor for underlying health problems such as gastric ulcers.", isCorrect: true, explanation: "Correct. Girth-nipping often indicates discomfort. Tighten incrementally (not all at once), check for girth galls, and be aware that gastric ulcers are a common underlying cause. Report persistent girth sensitivity to an instructor or vet." },
      { id: "c", text: "Tighten quickly and efficiently — the horse will tolerate it once you start riding.", isCorrect: false, explanation: "Tightening quickly ignores the horse's communication. Rushing the process can make girth sensitivity worse over time." },
      { id: "d", text: "The saddle is always the problem — book a saddle fitter immediately.", isCorrect: false, explanation: "Saddle fit may be a factor but is not automatically the sole cause. A systematic approach includes girth, saddle, and health assessment." },
    ],
    learningTakeaway: "Girth-nipping is a pain communication, not a behaviour problem. Tighten gradually, check equipment fit, and investigate underlying health causes such as ulcers.",
  },
  {
    id: "s020",
    title: "Horse Refuses to Load",
    level: "beginner",
    category: "Handling & Behaviour",
    prompt: "You need to load your horse into a trailer for a vet appointment. He has loaded before but today plants his feet at the ramp and refuses to move. What is the best approach?",
    choices: [
      { id: "a", text: "Force him on using a lunge whip and maximum pressure from behind.", isCorrect: false, explanation: "Forcing a horse onto a trailer through fear or pressure without understanding the cause is likely to make the problem worse and increases injury risk." },
      { id: "b", text: "Remain calm, investigate whether the trailer environment is causing concern (lighting, floor, ramp angle), and use patient, low-pressure loading methods, giving the horse time to investigate the trailer.", isCorrect: true, explanation: "Correct. Loading refusal often has a cause — dark interior, slippery floor, steep ramp, or previous bad experience. Patient, low-pressure approaches using positive reinforcement or a trained assistant are the most effective long-term solutions." },
      { id: "c", text: "Give up and reschedule the vet appointment.", isCorrect: false, explanation: "While safety is priority and rescheduling may sometimes be necessary, it does not address the loading issue. A structured loading training approach should be implemented." },
      { id: "d", text: "Blindfold the horse and rush him onto the trailer before he can react.", isCorrect: false, explanation: "Blindfolding and rushing increases panic and is not a safe or ethical loading method." },
    ],
    learningTakeaway: "Loading refusal has causes — investigate the trailer environment and use patient, low-pressure methods. Forcing horses increases fear and future loading problems.",
  },
  // ── DEVELOPING (additional) ───────────────────────────────────────────────
  {
    id: "s021",
    title: "Laminitis Risk Assessment",
    level: "developing",
    category: "Health & Welfare",
    prompt: "It is spring and your native pony has been living on lush, rapidly growing grass for two weeks. He is showing slight stiffness and a 'rocking horse' stance at morning turnout. What should you do?",
    choices: [
      { id: "a", text: "Increase exercise to help him warm up through the stiffness.", isCorrect: false, explanation: "If laminitis is suspected, exercise is contraindicated — it can worsen the condition significantly by increasing blood flow to already inflamed laminae." },
      { id: "b", text: "Bring the pony in immediately, restrict turnout to a dry lot or starvation paddock, call the vet, and provide deep supportive bedding.", isCorrect: true, explanation: "Correct. The signs described are classic early laminitis indicators. Immediate box rest on deep bedding, restricted access to grass, and veterinary assessment are critical. Early intervention significantly improves outcomes." },
      { id: "c", text: "Give him anti-inflammatory medication from the first aid kit and monitor for 24 hours.", isCorrect: false, explanation: "Administering medication without veterinary advice is inappropriate. Laminitis requires professional diagnosis. NSAIDs may help but must be prescribed by a vet." },
      { id: "d", text: "Move him to another field with shorter grass.", isCorrect: false, explanation: "Moving to shorter grass reduces fructan intake but does not address the acute episode. If laminitis has developed, the immediate priority is removal from all grass and veterinary contact." },
    ],
    learningTakeaway: "Laminitis signs include stiffness, rocking stance, and heat in feet. Immediate response: restrict grass, deep bedding, box rest, and call the vet. Early treatment is critical.",
  },
  {
    id: "s022",
    title: "Recognising Dehydration",
    level: "developing",
    category: "Health & Welfare",
    prompt: "After a long competitive event on a warm day, your horse has not drunk water for over an hour. You perform a skin pinch test on his neck and the skin takes four seconds to return to normal. What does this indicate?",
    choices: [
      { id: "a", text: "The horse is fine — slow skin return is normal after exercise.", isCorrect: false, explanation: "Skin tenting (slow return after pinching) lasting more than 2 seconds is an indicator of dehydration. Four seconds is a meaningful concern." },
      { id: "b", text: "Mild to moderate dehydration is indicated. Offer water, isotonic electrolytes if available, and monitor vital signs. If no improvement, contact a vet.", isCorrect: true, explanation: "Correct. A skin pinch return of >2 seconds suggests dehydration. Offer water immediately. Electrolytes help replace minerals lost in sweat. Persistent refusal to drink or worsening signs should prompt veterinary contact." },
      { id: "c", text: "The horse is severely dehydrated — administer IV fluids immediately.", isCorrect: false, explanation: "IV fluids are a veterinary procedure and are not appropriate for a handler to administer. Offering water is the correct first step before escalating to veterinary care." },
      { id: "d", text: "The skin test is unreliable — only check if the horse refuses to drink.", isCorrect: false, explanation: "The skin pinch test is a recognised field indicator of hydration status. It is not perfect but is a useful assessment tool alongside others such as gum moistness." },
    ],
    learningTakeaway: "Skin pinch (turgor test) return >2 seconds indicates dehydration. Offer water, monitor vital signs, and seek veterinary advice if signs persist or worsen.",
  },
  {
    id: "s023",
    title: "Managing a Horse That Bolts",
    level: "developing",
    category: "Riding & Behaviour",
    prompt: "Your horse suddenly bolts during a ride in the arena. Which is the correct immediate action?",
    choices: [
      { id: "a", text: "Pull both reins back as hard as possible to stop immediately.", isCorrect: false, explanation: "A direct, hard pull on both reins often increases panic and can cause a horse to rear or flip backwards. A sawing, one-rein technique is safer." },
      { id: "b", text: "Stay balanced and calm, use a one-rein pulley stop by taking one rein to the hip and bending the horse in a circle to safely reduce speed.", isCorrect: true, explanation: "Correct. The one-rein stop (pulley stop) is the established emergency technique for a bolting horse. Maintaining rider balance reduces the risk of falling. Circling reduces forward momentum safely." },
      { id: "c", text: "Jump off the horse immediately.", isCorrect: false, explanation: "Jumping from a bolting horse at speed significantly increases injury risk for both horse and rider. The one-rein stop is a safer and more effective first response." },
      { id: "d", text: "Let the horse run — he will tire and stop on his own.", isCorrect: false, explanation: "While a horse may eventually stop, allowing an uncontrolled bolt in an arena or open space creates significant hazards. Actively managing the situation is correct." },
    ],
    learningTakeaway: "For a bolting horse, use the one-rein pulley stop: one rein to the hip, bend into a circle. Stay balanced. Direct pull-back with both reins can cause rearing.",
  },
  {
    id: "s024",
    title: "Rug Fitting Concerns",
    level: "developing",
    category: "Stable Management",
    prompt: "You notice a fresh rub mark and hair loss on the right shoulder of your horse after removing his turnout rug. What is the most appropriate response?",
    choices: [
      { id: "a", text: "Apply a thick layer of petroleum jelly to the rub and put the rug back on.", isCorrect: false, explanation: "Petroleum jelly treats the symptom, not the cause. The rug fit must be addressed to prevent further rubbing, which can lead to sores and skin breakdown." },
      { id: "b", text: "Remove the rug, assess the severity of the rub, treat the skin as needed, investigate the cause of the rubbing (fit, attachment, liner), and do not use the rug again until the issue is resolved.", isCorrect: true, explanation: "Correct. Rug rubs indicate an ill-fitting rug, incorrect positioning, or insufficient undergarment. The rug should not be reused until the fit is corrected. Sores should be treated and monitored for infection." },
      { id: "c", text: "Continue using the rug — rubs are a normal part of rugging.", isCorrect: false, explanation: "Rubs are a sign of rug problems, not normal. Left unaddressed, they can develop into open sores, infections, and chronic hair loss." },
      { id: "d", text: "Change to a lighter rug with more fill to reduce pressure.", isCorrect: false, explanation: "Rug weight does not directly address fit. The rug's shoulder design, neck cut, and strap configuration need assessment." },
    ],
    learningTakeaway: "Rug rubs indicate poor fit. Remove the rug, treat the skin, and correct the fit or use a rug liner before resuming use. Never ignore recurring rubs.",
  },
  {
    id: "s025",
    title: "Worm Egg Count Management",
    level: "developing",
    category: "Health & Welfare",
    prompt: "Your horse's spring worm egg count (WEC) comes back at 350 eggs per gram (epg). The vet's threshold for treatment is 200 epg. What is the most appropriate action?",
    choices: [
      { id: "a", text: "Worm immediately with ivermectin regardless of the count being borderline.", isCorrect: false, explanation: "300–500 epg is a moderate-to-high count requiring treatment, but the choice of wormer should be guided by current resistance data and vet advice, not automatic ivermectin use." },
      { id: "b", text: "As the count exceeds the treatment threshold, treat with an appropriate wormer as advised by your vet, then retest in 6–8 weeks to check efficacy (reduction expected >95%).", isCorrect: true, explanation: "Correct. A count of 350 epg exceeds the common treatment threshold of 200 epg. Targeted treatment guided by WEC reduces resistance development. Post-treatment efficacy testing is best practice." },
      { id: "c", text: "The count is acceptable — WEC results can vary and may be a false positive.", isCorrect: false, explanation: "At 350 epg, the count is above the recognised treatment threshold. Dismissing the result without action is not appropriate horse care." },
      { id: "d", text: "Worm monthly as a precaution regardless of test results.", isCorrect: false, explanation: "Calendar-based worming regardless of test results contributes to anthelmintic resistance. Targeted strategic worming based on WEC is the current recommended approach." },
    ],
    learningTakeaway: "Targeted worming based on WEC reduces resistance. Counts above the threshold (typically 200 epg) require treatment. Follow-up testing confirms wormer efficacy.",
  },
  // ── INTERMEDIATE (additional) ─────────────────────────────────────────────
  {
    id: "s026",
    title: "Impaction Colic Assessment",
    level: "intermediate",
    category: "Health & Welfare",
    prompt: "Your horse is showing mild colic signs — repeatedly looking at his flanks, occasional pawing, but no rolling yet. Gut sounds are reduced on the right side. Temperature and pulse are normal. What is the best course of action?",
    choices: [
      { id: "a", text: "Wait 24 hours and monitor before calling the vet — mild colic usually resolves.", isCorrect: false, explanation: "While mild colic can resolve, reduced gut sounds alongside colic signs warrant early veterinary assessment. Waiting 24 hours without professional evaluation risks escalation." },
      { id: "b", text: "Walk the horse to keep gut motility going, offer small amounts of water, and call the vet to report signs and receive guidance on whether examination is needed.", isCorrect: true, explanation: "Correct. Gentle walking can help encourage gut motility. Veterinary contact allows professional guidance on urgency. Reduced gut sounds with colic signs should always be reported, even if signs are mild." },
      { id: "c", text: "Administer a full dose of bute immediately to relieve pain.", isCorrect: false, explanation: "Administering high-dose NSAIDs without veterinary guidance can mask symptoms and delay appropriate treatment. Partial pain relief may be appropriate but only under veterinary instruction." },
      { id: "d", text: "Allow the horse to roll — it will help move the blockage.", isCorrect: false, explanation: "Uncontrolled rolling in a colic horse risks gut torsion (twist), which is a surgical emergency. Mild controlled movement (walking) is preferred to uncontrolled rolling." },
    ],
    learningTakeaway: "Mild colic with reduced gut sounds warrants veterinary contact. Walk the horse gently, restrict feed, offer water, and monitor vital signs while awaiting guidance.",
  },
  {
    id: "s027",
    title: "Trot-Canter Transition Issues",
    level: "intermediate",
    category: "Riding & Training",
    prompt: "Your horse consistently strikes off on the wrong canter lead on the left rein. You have checked straightness and maintained an inside flexion, but the problem persists. What should you investigate next?",
    choices: [
      { id: "a", text: "Use a stronger spur to demand the correct lead.", isCorrect: false, explanation: "Using stronger aids to override a physical problem can cause pain, resistance, and reduced trust. Physical causes should be ruled out before increasing pressure." },
      { id: "b", text: "Consider whether there is a physical cause: one-sided stiffness, asymmetry, back pain, or saddle fit. Discuss with a vet, physio, or trainer before concluding it is solely a training issue.", isCorrect: true, explanation: "Correct. Persistent wrong-lead striking-off on one rein often has a physical component: one-sided stiffness, sacroiliac pain, back discomfort, or asymmetric saddle position. Rule out physical causes with appropriate professionals before increasing training pressure." },
      { id: "c", text: "Only canter on the correct lead rein until the horse improves.", isCorrect: false, explanation: "Avoiding the problem lead does not address its cause and increases asymmetry over time. Both reins must be developed, with root cause investigation." },
      { id: "d", text: "The horse is being lazy — increase pace at trot before asking for canter.", isCorrect: false, explanation: "A faster trot does not address consistent one-sided wrong-lead striking-off. Physical and training factors are more likely explanations than laziness." },
    ],
    learningTakeaway: "Persistent one-sided wrong-lead striking-off often indicates physical asymmetry. Rule out pain, stiffness, and saddle fit before assuming training-only causes.",
  },
  {
    id: "s028",
    title: "Overtraining Warning Signs",
    level: "intermediate",
    category: "Training & Management",
    prompt: "Over the last two weeks your horse has become progressively slower to warm up, shows reduced impulsion mid-session, sweats more than usual for the same workload, and has started refusing fences he previously jumped confidently. What is the most likely issue?",
    choices: [
      { id: "a", text: "The horse needs stricter schooling — he is testing boundaries.", isCorrect: false, explanation: "The described signs — progressive decline, increased sweating, refusals at familiar fences — are more consistent with physical overload or pain than with behavioural boundary-testing." },
      { id: "b", text: "These signs suggest overtraining, physical fatigue, or an underlying health issue. Reduce workload, schedule rest days, and arrange veterinary assessment to rule out musculoskeletal pain, gastric ulcers, or other conditions.", isCorrect: true, explanation: "Correct. The pattern described — reduced performance across multiple parameters over two weeks — is a classic overtraining or chronic pain presentation. Progressive decline in previously mastered skills strongly suggests a physical cause. Rest and veterinary investigation are appropriate first steps." },
      { id: "c", text: "Switch to a different training programme immediately to keep the horse engaged.", isCorrect: false, explanation: "Changing the programme without addressing the underlying cause may worsen the physical problem. Rest and investigation should come first." },
      { id: "d", text: "Increase calorie intake — the horse may simply need more energy.", isCorrect: false, explanation: "While nutrition is important, the described multi-parameter decline over time is unlikely to be resolved by increased calories alone and may reflect a health or training load issue." },
    ],
    learningTakeaway: "Progressive multi-symptom decline over weeks suggests overtraining or underlying health issues. Rest, workload review, and veterinary assessment are always the correct first response.",
  },
  {
    id: "s029",
    title: "Electrolyte Management in Competition",
    level: "intermediate",
    category: "Nutrition & Health",
    prompt: "Your horse has completed a cross-country course on a hot, humid day. He is sweating heavily. A fellow competitor suggests giving him a large electrolyte paste immediately. What is the best practice?",
    choices: [
      { id: "a", text: "Give the full dose of electrolyte paste right away regardless of water intake.", isCorrect: false, explanation: "Electrolyte pastes without adequate water can increase blood salt concentration and may cause further dehydration if the horse will not drink. Water must be available first." },
      { id: "b", text: "Cool the horse first (scraping, cool water on large muscle masses), offer fresh water, and only administer electrolytes once the horse is drinking willingly and is no longer at acute temperature risk.", isCorrect: true, explanation: "Correct. Priority post-cross-country is cooling and hydration. Once the horse is drinking willingly, electrolytes support recovery. Electrolytes given to a dehydrated, non-drinking horse can worsen the situation. Always ensure water access is established first." },
      { id: "c", text: "Withhold water for 30 minutes first to avoid post-exercise colic risk.", isCorrect: false, explanation: "The old advice to withhold water post-exercise has been largely discredited. Horses should be offered water freely post-exercise, especially in hot conditions." },
      { id: "d", text: "Wait until the horse returns home before giving electrolytes.", isCorrect: false, explanation: "Recovery begins at the venue. Delay in addressing hydration and electrolyte deficit in hot conditions risks tying-up (azoturia) and prolonged recovery." },
    ],
    learningTakeaway: "Post-exercise in heat: cool first, then offer water freely. Electrolytes support recovery once the horse is drinking — not before. Never withhold water post-exercise.",
  },
  // ── ADVANCED (additional) ─────────────────────────────────────────────────
  {
    id: "s030",
    title: "Azoturia (Tying-Up) Response",
    level: "advanced",
    category: "Health & Emergency",
    prompt: "Midway through a ride your horse suddenly shows extreme muscle stiffness in his hindquarters, reluctance to move, sweating, and clear distress. You suspect tying-up (exertional rhabdomyolysis). What is your immediate action?",
    choices: [
      { id: "a", text: "Continue walking him slowly back to the yard to keep blood moving.", isCorrect: false, explanation: "In acute tying-up, continuing to move the horse causes further muscle damage. Stop exercise immediately." },
      { id: "b", text: "Stop immediately, keep the horse still and warm, call a vet urgently, and do not attempt to move the horse until veterinary guidance is received.", isCorrect: true, explanation: "Correct. Continued movement during tying-up causes further muscle fibre destruction and myoglobin release, which can lead to acute kidney injury. Keep the horse still, maintain warmth to reduce muscle spasm, and seek veterinary attention urgently." },
      { id: "c", text: "Administer a muscle relaxant from the first aid kit and ride back at walk.", isCorrect: false, explanation: "Muscle relaxants without veterinary prescription and diagnosis are inappropriate. Do not continue riding regardless." },
      { id: "d", text: "Give electrolytes and walk the horse to the nearest water source.", isCorrect: false, explanation: "Movement worsens the acute episode. Electrolytes do not address acute tying-up. The horse must stop and await veterinary assistance." },
    ],
    learningTakeaway: "Tying-up (ER): stop immediately, do not move, keep warm, call vet urgently. Further movement causes serious muscle and kidney damage.",
  },
  // ── EXPANDED POOL — BEGINNER ──────────────────────────────────────────────
  {
    id: "s031",
    title: "Horse Refusing to Be Caught",
    level: "beginner",
    category: "Handling & Behaviour",
    prompt: "You need to bring your horse in from the field, but he walks away every time you approach. Other horses are nearby. What do you do?",
    choices: [
      { id: "a", text: "Chase the horse around the field until he is tired.", isCorrect: false, explanation: "Chasing makes the horse more flight-motivated and can endanger you and other horses." },
      { id: "b", text: "Approach calmly at an angle, avoid direct eye contact, speak softly, and use a treat or bucket of feed if appropriate.", isCorrect: true, explanation: "Correct. A calm, non-threatening approach is most effective. Approaching at an angle and avoiding direct eye contact reduces the horse's flight response." },
      { id: "c", text: "Ask someone to help corner the horse.", isCorrect: false, explanation: "Cornering can panic the horse and cause dangerous behaviour. Calm individual approach is safer." },
      { id: "d", text: "Leave the horse and try again tomorrow.", isCorrect: false, explanation: "This avoids addressing the issue and may not be practical if the horse needs attention." },
    ],
    learningTakeaway: "Approach horses calmly, at an angle, without direct eye contact. Patience and low-pressure handling are more effective than chasing.",
  },
  {
    id: "s032",
    title: "Loose Horse on the Yard",
    level: "beginner",
    category: "Yard Safety",
    prompt: "A horse has escaped from its stable and is loose on the yard. What is your first priority?",
    choices: [
      { id: "a", text: "Run after it immediately to catch it.", isCorrect: false, explanation: "Running at a loose horse will likely cause it to bolt, increasing danger." },
      { id: "b", text: "Alert others, secure exits, speak calmly, and position yourself to guide the horse toward its stable or a safe enclosed area.", isCorrect: true, explanation: "Correct. Secure escape routes first, stay calm, and guide rather than chase." },
      { id: "c", text: "Ignore it — it will go back on its own.", isCorrect: false, explanation: "A loose horse near roads, machinery, or other hazards is a safety emergency." },
      { id: "d", text: "Wave your arms to block it.", isCorrect: false, explanation: "Sudden gestures can panic the horse further. Calm, deliberate positioning is safer." },
    ],
    learningTakeaway: "With a loose horse: stay calm, secure exits, alert others, and guide quietly. Never chase or make sudden movements.",
  },
  {
    id: "s033",
    title: "Slippery Yard After Rain",
    level: "beginner",
    category: "Yard Safety",
    prompt: "It rained heavily overnight and the concrete yard is very slippery. You need to lead a horse across it. What precautions should you take?",
    choices: [
      { id: "a", text: "Lead the horse quickly to get across as fast as possible.", isCorrect: false, explanation: "Speed increases the risk of slipping. Slow and controlled is safer." },
      { id: "b", text: "Walk the horse slowly and steadily, keeping it straight, wearing appropriate footwear, and avoiding turning sharply.", isCorrect: true, explanation: "Correct. Slow, straight movement on slippery surfaces minimises the risk of the horse losing its footing." },
      { id: "c", text: "Let the horse find its own way without a lead rope.", isCorrect: false, explanation: "An uncontrolled horse on slippery ground is dangerous to itself and everyone nearby." },
      { id: "d", text: "Wait until the yard dries completely.", isCorrect: false, explanation: "This may not be practical and does not help you manage when conditions are imperfect." },
    ],
    learningTakeaway: "On slippery surfaces: walk slowly, keep straight, avoid sharp turns, and wear proper footwear. Be patient.",
  },
  // ── EXPANDED POOL — DEVELOPING ────────────────────────────────────────────
  {
    id: "s034",
    title: "Horse Reluctant to Load",
    level: "developing",
    category: "Handling & Behaviour",
    prompt: "You are loading your horse onto a trailer for a trip, but he stops at the bottom of the ramp and refuses to go in. He is not panicking but is clearly reluctant. What approach do you take?",
    choices: [
      { id: "a", text: "Push him from behind — he needs to learn.", isCorrect: false, explanation: "Pushing from behind a reluctant horse is dangerous and often causes the horse to rush backwards." },
      { id: "b", text: "Give him time to look, use a calm approach with a lead rope and gentle encouragement, allow him to investigate, and reward each forward step.", isCorrect: true, explanation: "Correct. Patient, progressive loading with positive reinforcement builds confidence and avoids dangerous reactions." },
      { id: "c", text: "Use a lunge whip behind him to drive him in.", isCorrect: false, explanation: "While experienced handlers sometimes use gentle pressure, a whip can frighten a reluctant loader and create a worse problem." },
      { id: "d", text: "Cancel the trip — if he won't load, he shouldn't travel.", isCorrect: false, explanation: "Avoiding loading practice means the problem persists. Patient training is the solution." },
    ],
    learningTakeaway: "Loading requires patience and positive reinforcement. Allow the horse to investigate, reward progress, and never rush or force from behind.",
  },
  {
    id: "s035",
    title: "Recognising Rain Scald",
    level: "developing",
    category: "Health & First Aid",
    prompt: "Your horse has been living out and you notice raised, crusty lumps along his back and hindquarters. The hair comes away in tufts leaving raw patches. What is most likely and what do you do?",
    choices: [
      { id: "a", text: "It is just a skin reaction to new grass — leave it.", isCorrect: false, explanation: "The symptoms described are consistent with rain scald (dermatophilosis), not a dietary reaction." },
      { id: "b", text: "This looks like rain scald — bring the horse in to dry, gently remove crusts, apply antibacterial wash, ensure a waterproof rug is available, and monitor. Call the vet if it worsens.", isCorrect: true, explanation: "Correct. Rain scald is caused by the organism Dermatophilus congolensis in prolonged wet conditions. Treatment involves drying, gentle cleaning, and preventing reinfection." },
      { id: "c", text: "Apply fly spray — it is insect bites.", isCorrect: false, explanation: "The pattern of crusty lesions along the topline in wet weather is characteristic of rain scald, not insect bites." },
      { id: "d", text: "Clip the horse immediately to help the skin breathe.", isCorrect: false, explanation: "Clipping over raw, infected skin is painful and can spread infection. Treat the condition first." },
    ],
    learningTakeaway: "Rain scald presents as crusty lesions on the back in wet weather. Dry the horse, clean gently, apply antibacterial treatment, and prevent reinfection.",
  },
  {
    id: "s036",
    title: "Horse Spooking at Object",
    level: "developing",
    category: "Riding & Safety",
    prompt: "While riding in the arena, your horse suddenly spooks at a new banner on the fence. He jumps sideways and tenses up. What is the safest response?",
    choices: [
      { id: "a", text: "Punish the horse immediately — he should not be afraid of a banner.", isCorrect: false, explanation: "Punishment increases fear and does not address the cause. It can also make the spooking worse." },
      { id: "b", text: "Sit deep, keep a steady contact, use your legs to keep the horse forward and straight, ride past the object at a distance, then gradually reduce the distance as he relaxes.", isCorrect: true, explanation: "Correct. Staying calm, maintaining forward movement, and gradually desensitising the horse teaches confidence without confrontation." },
      { id: "c", text: "Immediately dismount and remove the banner.", isCorrect: false, explanation: "Removing the object teaches the horse that spooking gets obstacles removed. It is better to help the horse learn to cope." },
      { id: "d", text: "Force the horse directly at the banner head-on.", isCorrect: false, explanation: "Forcing confrontation with a feared object can cause panic, rearing, or other dangerous reactions." },
    ],
    learningTakeaway: "When a horse spooks: stay calm, sit deep, keep forward, and desensitise gradually at a distance. Never punish fear.",
  },
  {
    id: "s037",
    title: "Bit Fitting Assessment",
    level: "developing",
    category: "Tack & Equipment",
    prompt: "You notice the horse you are about to ride has the bit sitting very low in its mouth with excessive wrinkling at the lip corners. What should you do?",
    choices: [
      { id: "a", text: "Ride as normal — the groom set it up.", isCorrect: false, explanation: "The rider should always check tack fit before mounting. Incorrect bit fitting causes discomfort and communication problems." },
      { id: "b", text: "Adjust the cheekpieces so the bit sits with one to two wrinkles at the corners of the mouth, then check it is symmetrical on both sides.", isCorrect: true, explanation: "Correct. One to two wrinkles is the standard fit. Too many wrinkles means the bit is too high; too few or none means it is too low." },
      { id: "c", text: "Change to a different bit entirely.", isCorrect: false, explanation: "The bit may be correct — it just needs to be fitted properly first." },
      { id: "d", text: "Ask someone else to fix it — it is not your responsibility.", isCorrect: false, explanation: "Every rider should know how to check and adjust bit fitting. It is a core horsemanship skill." },
    ],
    learningTakeaway: "Check bit fit before every ride. The bit should sit with one to two wrinkles at the lip corners, symmetrically on both sides.",
  },
  // ── EXPANDED POOL — INTERMEDIATE ──────────────────────────────────────────
  {
    id: "s038",
    title: "Horse Goes Above the Bit Consistently",
    level: "intermediate",
    category: "Riding & Schooling",
    prompt: "Your horse consistently rides above the bit during trot work — head high, back hollow, nose pointing forward. Transitions make it worse. What is the most productive approach?",
    choices: [
      { id: "a", text: "Pull the reins down firmly to force the head lower.", isCorrect: false, explanation: "Forcing the head down creates a false outline, increases resistance, and does not engage the hindquarters." },
      { id: "b", text: "Use half-halts, circles, and transitions within the pace to encourage the horse to soften through the back and accept the contact from behind, focusing on impulsion from the hindquarters.", isCorrect: true, explanation: "Correct. The horse goes above the bit because it is not working through its back from the hindquarters into the contact. Improving engagement is the root solution." },
      { id: "c", text: "Switch to a stronger bit.", isCorrect: false, explanation: "A stronger bit masks the problem and often creates more tension and evasion." },
      { id: "d", text: "Just accept it — some horses carry their heads high.", isCorrect: false, explanation: "While conformation influences head carriage, consistently going above the bit indicates a training gap that should be addressed for the horse's long-term soundness." },
    ],
    learningTakeaway: "A horse going above the bit needs hindquarter engagement, not hand pressure. Use half-halts, circles, and transitions to develop throughness.",
  },
  {
    id: "s039",
    title: "Girth Gall Discovered After Riding",
    level: "intermediate",
    category: "Tack & Equipment",
    prompt: "After untacking, you discover a raw, rubbed area behind the elbow where the girth sits. The skin is red and broken. What action should you take?",
    choices: [
      { id: "a", text: "Ignore it — girths always rub a bit.", isCorrect: false, explanation: "Girth galls are painful and will worsen if the cause is not addressed." },
      { id: "b", text: "Clean the area gently, apply wound spray, do not ride until healed, and assess the girth fit, cleanliness, and material — change to a softer or shaped girth if needed.", isCorrect: true, explanation: "Correct. Treat the wound, rest the area, and prevent recurrence by addressing the cause — dirty, stiff, or poorly fitting girths are the usual culprits." },
      { id: "c", text: "Apply petroleum jelly and ride again tomorrow.", isCorrect: false, explanation: "Riding on a girth gall before it has healed will cause further damage and pain." },
      { id: "d", text: "Tighten the girth more next time so it doesn't move.", isCorrect: false, explanation: "Over-tightening the girth increases pressure and can cause worse rubbing." },
    ],
    learningTakeaway: "Girth galls require treatment, rest, and cause investigation. Clean, dry, shaped, and correctly fitted girths prevent recurrence.",
  },
  {
    id: "s040",
    title: "Horse Reluctant on One Rein",
    level: "intermediate",
    category: "Riding & Schooling",
    prompt: "Your horse works well on the left rein but consistently falls in, resists the bend, and feels stiff on the right rein. What is the most likely cause and best approach?",
    choices: [
      { id: "a", text: "The horse is just being lazy on one side — use a stronger whip.", isCorrect: false, explanation: "One-sidedness is usually physical (natural crookedness, muscle asymmetry) rather than laziness." },
      { id: "b", text: "Natural one-sidedness — address with suppling exercises on the stiffer rein such as circles, leg-yielding, and frequent rein changes. Have the saddle fit and teeth checked.", isCorrect: true, explanation: "Correct. Most horses are naturally stiffer on one side. Systematic suppling work on the stiff rein, combined with ruling out pain causes, is the correct approach." },
      { id: "c", text: "Only work on the good rein to keep things positive.", isCorrect: false, explanation: "Avoiding the stiff rein allows the asymmetry to worsen over time." },
      { id: "d", text: "The arena surface must be uneven on that side.", isCorrect: false, explanation: "While surface can be a factor, consistent one-sidedness is usually the horse's natural crookedness." },
    ],
    learningTakeaway: "Most horses are naturally one-sided. Address stiffness with suppling exercises, frequent rein changes, and rule out saddle fit or dental issues.",
  },
  // ── EXPANDED POOL — ADVANCED ──────────────────────────────────────────────
  {
    id: "s041",
    title: "Suspecting Gastric Ulcers",
    level: "advanced",
    category: "Health & Veterinary",
    prompt: "A competition horse in your care has become increasingly girthy, has intermittent loose droppings, is reluctant to work forward, and seems uncomfortable when the girth is tightened. The behaviour has developed over several weeks. What do you suspect and what is the correct course of action?",
    choices: [
      { id: "a", text: "The horse is becoming sour — increase turnout.", isCorrect: false, explanation: "While turnout can help, the combination of symptoms described is consistent with equine gastric ulcer syndrome, which requires veterinary investigation." },
      { id: "b", text: "These signs are consistent with equine gastric ulcer syndrome (EGUS). Discuss with the vet, consider gastroscopy for diagnosis, review management including feeding frequency, forage access, turnout, and workload.", isCorrect: true, explanation: "Correct. Girthiness, attitude changes, loose droppings, and reluctance to work are classic indicators of EGUS. Gastroscopy is the gold standard for diagnosis. Management changes — ad-lib forage, reduced starch, more turnout — support treatment." },
      { id: "c", text: "Add an antacid supplement and see if it improves.", isCorrect: false, explanation: "While supplements may help, they do not replace veterinary diagnosis. Treating without diagnosis may mask a serious condition." },
      { id: "d", text: "Change the girth to solve the girthiness issue.", isCorrect: false, explanation: "The girthiness is a symptom of discomfort, not a tack problem. The underlying cause must be investigated." },
    ],
    learningTakeaway: "Girthiness, attitude changes, and reluctance to work may indicate gastric ulcers. Veterinary investigation (gastroscopy) and management review are essential.",
  },
  {
    id: "s042",
    title: "Managing a Horse with PPID (Cushing's)",
    level: "advanced",
    category: "Health & Veterinary",
    prompt: "An older horse on the yard has developed a long, curly coat that does not shed properly, increased drinking and urination, recurrent laminitis episodes, and loss of topline. These signs have progressed over months. What condition do you suspect?",
    choices: [
      { id: "a", text: "Normal ageing — older horses always look like this.", isCorrect: false, explanation: "While ageing causes changes, the combination of hirsutism, PU/PD, laminitis, and muscle wastage strongly indicates a specific endocrine condition." },
      { id: "b", text: "Pituitary Pars Intermedia Dysfunction (PPID / Cushing's disease). Arrange veterinary blood testing (ACTH levels), begin management including clipping, careful laminitis prevention, dental care, and discuss medication (pergolide) with the vet.", isCorrect: true, explanation: "Correct. The constellation of hirsutism, polydipsia/polyuria, recurrent laminitis, and muscle wastage is classic PPID. Blood testing confirms the diagnosis. Pergolide is the standard treatment, alongside careful management." },
      { id: "c", text: "Severe parasite burden — worm the horse immediately.", isCorrect: false, explanation: "While weight loss can indicate parasites, the combination of symptoms described is characteristic of PPID, not worms." },
      { id: "d", text: "Change the diet to higher protein to rebuild muscle.", isCorrect: false, explanation: "Diet alone will not address the hormonal imbalance causing these symptoms. Veterinary diagnosis and treatment are needed." },
    ],
    learningTakeaway: "PPID (Cushing's) presents with a non-shedding coat, increased thirst, recurrent laminitis, and muscle wastage. Veterinary diagnosis and pergolide treatment are standard.",
  },
  {
    id: "s043",
    title: "Dealing with a Cast Horse",
    level: "intermediate",
    category: "Stable Management",
    prompt: "You find a horse lying flat against the stable wall, unable to get up despite several attempts. The horse is sweating and distressed. It appears to be 'cast'. What should you do?",
    choices: [
      { id: "a", text: "Pull the horse by its legs away from the wall.", isCorrect: false, explanation: "Pulling legs puts you at extreme risk of being kicked, and is rarely effective without specialist equipment." },
      { id: "b", text: "Stay calm, speak quietly to the horse, use lunge lines or flat ropes under the horse to roll it away from the wall if safe to do so, or call for experienced help immediately. Do not stand directly behind the horse.", isCorrect: true, explanation: "Correct. Using ropes to roll the horse away from the wall is the safest method. Stay calm, avoid the danger zones (behind and between horse and wall), and get help if unsure." },
      { id: "c", text: "Leave the horse and hope it gets up on its own.", isCorrect: false, explanation: "A cast horse can injure itself severely and may develop circulation problems if left too long. It needs help." },
      { id: "d", text: "Push the horse firmly on the back to roll it over.", isCorrect: false, explanation: "A thrashing horse can kick or roll onto you. Using ropes provides safer distance." },
    ],
    learningTakeaway: "A cast horse needs calm, immediate assistance. Use ropes to roll the horse away from the wall. Stay in safe zones and call for experienced help if needed.",
  },
  {
    id: "s044",
    title: "Feeding a Laminitis-Prone Pony",
    level: "developing",
    category: "Nutrition & Care",
    prompt: "You have been asked to manage the feeding for a laminitis-prone native pony. It is spring and the grass is growing fast. What is the most important dietary management step?",
    choices: [
      { id: "a", text: "Restrict all food — the pony should be on a complete fast.", isCorrect: false, explanation: "Complete food restriction can cause hyperlipaemia, especially in native ponies. The pony needs controlled forage, not starvation." },
      { id: "b", text: "Restrict grass access using strip grazing or a muzzle, provide soaked hay to reduce sugar, avoid cereal-based feeds, and monitor weight and body condition regularly.", isCorrect: true, explanation: "Correct. Managing grass access while maintaining adequate forage intake is key. Soaked hay reduces water-soluble carbohydrates. Avoiding cereal feeds reduces starch and sugar intake." },
      { id: "c", text: "Let the pony have full turnout — exercise will burn off the calories.", isCorrect: false, explanation: "Unrestricted access to spring grass is a major laminitis trigger for susceptible ponies, regardless of exercise level." },
      { id: "d", text: "Switch to a high-protein feed for more energy.", isCorrect: false, explanation: "More energy is the opposite of what a laminitis-prone, overweight pony needs. Dietary restriction and low-sugar forage are appropriate." },
    ],
    learningTakeaway: "For laminitis-prone ponies: restrict grass (strip graze or muzzle), soak hay, avoid cereal feeds, and monitor weight. Never starve — maintain controlled forage.",
  },
  {
    id: "s045",
    title: "Emergency Dismount Situation",
    level: "intermediate",
    category: "Riding Safety",
    prompt: "You are riding and your horse becomes uncontrollable — bolting with head down. You have tried pulling up, one-rein stop, and circling, but the horse is not responding and heading toward a main road. What is your final option?",
    choices: [
      { id: "a", text: "Jump off immediately regardless of the terrain.", isCorrect: false, explanation: "While an emergency dismount may be necessary, doing so at full speed without preparation is extremely dangerous." },
      { id: "b", text: "Try to steer toward the softest ground available, kick your feet out of the stirrups, and perform an emergency dismount by pushing away from the horse and landing in a roll. This is a last resort.", isCorrect: true, explanation: "Correct. An emergency dismount is an absolute last resort. Steering toward soft ground, freeing your feet from the stirrups, and rolling on landing reduce injury risk. No option is without risk in this scenario." },
      { id: "c", text: "Lean forward and grab the horse's mane — it will slow eventually.", isCorrect: false, explanation: "If the horse is heading toward a road, waiting is not an option. Sometimes an emergency dismount is the only safe choice." },
      { id: "d", text: "Shout for help from bystanders.", isCorrect: false, explanation: "Shouting may alert others to help, but it does not solve the immediate safety problem of a bolting horse heading toward danger." },
    ],
    learningTakeaway: "An emergency dismount is the absolute last resort. Free your feet from the stirrups, aim for soft ground, push away from the horse, and roll on landing.",
  },
  // ── ADVANCED (additional) ─────────────────────────────────────────────────
  {
    id: "s046",
    title: "Suspecting Kissing Spines",
    level: "advanced" as ScenarioLevel,
    category: "Health & Diagnostics",
    prompt: "A horse you ride has been gradually becoming resistant to being saddled, dips away when you press along the back, and has started bucking into canter. The behaviour has worsened over several months. What is the most appropriate course of action?",
    choices: [
      { id: "a", text: "Use a stronger girth and more leg to ride through the resistance.", isCorrect: false, explanation: "Forcing the horse through pain-related behaviour is both unethical and dangerous. The underlying cause must be investigated." },
      { id: "b", text: "Request a veterinary investigation including back palpation and potentially diagnostic imaging for kissing spines.", isCorrect: true, explanation: "Correct. The progressive pattern of back pain — saddle resistance, dipping, and bucking in canter — is classic for dorsal spinous process impingement (kissing spines). Veterinary assessment with X-rays is the gold standard." },
      { id: "c", text: "Change to a treeless saddle and see if the behaviour improves.", isCorrect: false, explanation: "While saddle fit is important, changing equipment without diagnosis does not address a potential skeletal condition. A vet assessment is needed first." },
      { id: "d", text: "Rest the horse for two weeks and then reassess.", isCorrect: false, explanation: "Rest alone won't resolve a structural issue. If kissing spines are the cause, the horse needs diagnosis and a targeted treatment plan." },
    ],
    learningTakeaway: "Progressive back pain signs — saddle resistance, dipping under pressure, and behavioural changes under saddle — warrant veterinary investigation for conditions like kissing spines.",
  },
  {
    id: "s047",
    title: "Designing a Rehab Programme",
    level: "advanced" as ScenarioLevel,
    category: "Rehabilitation & Management",
    prompt: "A horse has been on box rest for 8 weeks following a superficial digital flexor tendon injury. The vet has cleared the horse for controlled rehabilitation. What is the correct approach to the initial phase?",
    choices: [
      { id: "a", text: "Start with 10 minutes of walk in-hand on firm, level ground, gradually increasing by 5 minutes per week.", isCorrect: true, explanation: "Correct. Controlled in-hand walking on firm ground allows the tendon to load progressively. Gradual increase is essential — too much too soon risks re-injury." },
      { id: "b", text: "Lunge the horse at walk and trot for 20 minutes to rebuild fitness quickly.", isCorrect: false, explanation: "Lungeing places lateral forces on tendons and is inappropriate at this early stage. Only straight-line work should be used initially." },
      { id: "c", text: "Turn the horse out in a small paddock to self-exercise.", isCorrect: false, explanation: "Uncontrolled movement, including sudden stops, turns, and bursts of speed, risks re-injury. Exercise must be strictly controlled in early rehab." },
      { id: "d", text: "Begin ridden walk work immediately since the vet has given clearance.", isCorrect: false, explanation: "The vet cleared controlled rehabilitation, not ridden work. In-hand walking comes first. Ridden walk is typically introduced several weeks into the rehab programme." },
    ],
    learningTakeaway: "Tendon rehabilitation requires strict, progressive loading: start with short in-hand walks on firm ground, increase gradually, and avoid lateral forces or uncontrolled exercise.",
  },
  {
    id: "s048",
    title: "Assessing Nutritional Needs for a Veteran Horse",
    level: "advanced" as ScenarioLevel,
    category: "Nutrition & Management",
    prompt: "You are responsible for a 22-year-old horse who has lost condition over winter despite ad-lib hay. He has poor dentition and is currently on a standard chaff-and-pony-nut diet. What changes would you prioritise?",
    choices: [
      { id: "a", text: "Simply increase the amount of pony nuts to add more calories.", isCorrect: false, explanation: "More of the same feed may not be digestible given the horse's dental issues. The feed type needs changing, not just the quantity." },
      { id: "b", text: "Switch to a soaked, high-fibre veteran feed, add oil for calories, arrange a dental check, and consider soaked hay or hay replacer.", isCorrect: true, explanation: "Correct. Veteran horses with poor dentition need easily digestible fibre sources. Soaked feeds, beet pulp, and oil provide safe calories. A dental check is essential to assess chewing ability." },
      { id: "c", text: "Add sugar beet and molasses to make the current feed more palatable.", isCorrect: false, explanation: "While sugar beet is useful, adding molasses increases sugar content unnecessarily. A more comprehensive dietary review is needed." },
      { id: "d", text: "Put the horse on a high-protein competition feed to rebuild muscle.", isCorrect: false, explanation: "Competition feeds are too energy-dense and may contain high starch levels, which is inappropriate for a veteran. The approach should focus on digestible fibre and fat." },
    ],
    learningTakeaway: "Veteran horses with poor dentition need soaked, high-fibre feeds, supplementary oil for calories, regular dental care, and potentially hay replacers to maintain condition.",
  },
  {
    id: "s049",
    title: "Managing a Multi-Horse Field Dispute",
    level: "advanced" as ScenarioLevel,
    category: "Behaviour & Welfare",
    prompt: "In a field of five horses, one gelding has become increasingly aggressive — resource guarding the water trough, chasing a particular mare, and causing minor bite wounds. The other horses are becoming stressed. How should you manage this?",
    choices: [
      { id: "a", text: "Remove the aggressive gelding and reassess the herd dynamics after a separation period.", isCorrect: true, explanation: "Correct. The immediate priority is safety. Remove the aggressor, treat any injuries, and allow the herd to settle. Reassess whether reintroduction is appropriate after addressing the behaviour." },
      { id: "b", text: "Add a second water trough to reduce resource guarding and leave the group together.", isCorrect: false, explanation: "Adding resources may help but does not address the escalating aggression toward the mare. Safety must come first." },
      { id: "c", text: "Leave them to sort it out — horses establish hierarchies naturally.", isCorrect: false, explanation: "While hierarchies are natural, persistent aggression causing injuries is not acceptable. Duty of care requires intervention." },
      { id: "d", text: "Remove the mare being targeted since she is the victim.", isCorrect: false, explanation: "Removing the victim does not address the aggressor's behaviour and may redirect aggression toward another horse." },
    ],
    learningTakeaway: "Persistent aggression causing injuries requires immediate intervention — remove the aggressor, treat injuries, and reassess herd composition and dynamics.",
  },
  {
    id: "s050",
    title: "Evaluating Saddle Fit After Weight Change",
    level: "advanced" as ScenarioLevel,
    category: "Tack & Equipment",
    prompt: "A horse has gained significant muscle along the topline after 3 months of correct work. The saddle, which fitted well previously, now appears to sit high at the pommel and the rider feels tipped backward. What is your assessment?",
    choices: [
      { id: "a", text: "The saddle needs reflocking or a wider tree to accommodate the increased muscle development.", isCorrect: true, explanation: "Correct. Increased topline muscle changes the horse's back shape. A saddle sitting high at the pommel with the rider tipped back indicates the tree is now too narrow. Reflocking or a wider gullet plate is needed." },
      { id: "b", text: "Add a thick numnah to fill the gap between the saddle and the back.", isCorrect: false, explanation: "Extra padding on an ill-fitting saddle creates more pressure, not less. It does not solve a tree-width problem and can make it worse." },
      { id: "c", text: "The horse needs to lose the excess muscle as it is causing saddle problems.", isCorrect: false, explanation: "Correct muscular development is positive. The saddle should be adjusted to fit the horse, not the other way around." },
      { id: "d", text: "Continue using the saddle as it will compress the new muscle back to the original shape.", isCorrect: false, explanation: "An ill-fitting saddle causes pain, muscle atrophy, and behavioural issues. It must be adjusted to the horse's current shape." },
    ],
    learningTakeaway: "Saddle fit should be reassessed whenever a horse's body shape changes — muscle gain, weight loss, or fitness changes all affect how a saddle sits and distributes the rider's weight.",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Router
// ─────────────────────────────────────────────────────────────────────────────
export const studentRouter = router({

  // ── Overview ─────────────────────────────────────────────────────────────
  getOverview: studentProcedure.query(async ({ ctx }) => {
    const dbConn = await getDb();
    if (!dbConn) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

    const userId = ctx.user.id;

    // Fetch virtual horse
    const [vHorse] = await dbConn.select().from(virtualHorses)
      .where(and(eq(virtualHorses.userId, userId), eq(virtualHorses.isActive, true)))
      .limit(1);

    // Fetch assigned real horse
    const assignments = await dbConn.select({
      assignmentId: studentHorseAssignments.id,
      horseId: studentHorseAssignments.horseId,
      horseName: horses.name,
      horseBreed: horses.breed,
      horsePhotoUrl: horses.photoUrl,
    }).from(studentHorseAssignments)
      .innerJoin(horses, eq(studentHorseAssignments.horseId, horses.id))
      .where(and(
        eq(studentHorseAssignments.studentUserId, userId),
        eq(studentHorseAssignments.isActive, true),
      ))
      .limit(1);
    const assignedHorse = assignments[0] ?? null;

    // Today's tasks
    const today = new Date().toISOString().split("T")[0];
    const todayTasks = await dbConn.select().from(studentTasks)
      .where(and(
        eq(studentTasks.userId, userId),
        sql`${studentTasks.targetDate} = ${today}`,
      ))
      .orderBy(studentTasks.createdAt);

    // Incomplete daily tasks (no target date or today)
    const pendingDailyTasks = await dbConn.select().from(studentTasks)
      .where(and(
        eq(studentTasks.userId, userId),
        eq(studentTasks.frequency, "daily"),
        eq(studentTasks.isCompleted, false),
      ))
      .limit(10);

    // Recent training entries (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().split("T")[0];
    const recentTraining = await dbConn.select().from(studentTrainingEntries)
      .where(and(
        eq(studentTrainingEntries.userId, userId),
        sql`${studentTrainingEntries.sessionDate} >= ${weekAgoStr}`,
      ))
      .orderBy(desc(studentTrainingEntries.sessionDate));

    // Progress summary
    const progress = await dbConn.select().from(studentProgress)
      .where(eq(studentProgress.userId, userId));

    // Stats
    const totalTasks = todayTasks.length + pendingDailyTasks.filter(
      (t) => !todayTasks.some((tt) => tt.id === t.id)
    ).length;
    const completedTasks = todayTasks.filter((t) => t.isCompleted).length;

    return {
      virtualHorse: vHorse ?? null,
      assignedHorse,
      todayTasks: [...todayTasks, ...pendingDailyTasks.filter(
        (t) => !todayTasks.some((tt) => tt.id === t.id)
      )],
      tasksCompleted: completedTasks,
      tasksPending: totalTasks - completedTasks,
      weeklySessionCount: recentTraining.length,
      progressSkills: progress,
    };
  }),

  // ── Virtual Horse ────────────────────────────────────────────────────────
  getVirtualHorse: studentProcedure.query(async ({ ctx }) => {
    const dbConn = await getDb();
    if (!dbConn) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
    const [vHorse] = await dbConn.select().from(virtualHorses)
      .where(and(eq(virtualHorses.userId, ctx.user.id), eq(virtualHorses.isActive, true)))
      .limit(1);
    return vHorse ?? null;
  }),

  createVirtualHorse: studentProcedure
    .input(z.object({
      name: z.string().min(1).max(100),
      breed: z.string().max(100).optional(),
      color: z.string().max(50).optional(),
      age: z.number().int().min(1).max(40).optional(),
      personality: z.string().max(100).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const dbConn = await getDb();
      if (!dbConn) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      // Only allow one active virtual horse per student
      const [existing] = await dbConn.select().from(virtualHorses)
        .where(and(eq(virtualHorses.userId, ctx.user.id), eq(virtualHorses.isActive, true)))
        .limit(1);
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "You already have an active virtual horse." });
      }

      const [result] = await dbConn.insert(virtualHorses).values({
        userId: ctx.user.id,
        name: input.name,
        breed: input.breed ?? null,
        color: input.color ?? null,
        age: input.age ?? null,
        personality: input.personality ?? null,
      });
      return { id: result.insertId, success: true };
    }),

  updateVirtualHorse: studentProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).max(100).optional(),
      breed: z.string().max(100).optional(),
      color: z.string().max(50).optional(),
      age: z.number().int().min(1).max(40).optional(),
      personality: z.string().max(100).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const dbConn = await getDb();
      if (!dbConn) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      const { id, ...updates } = input;
      await dbConn.update(virtualHorses)
        .set(updates)
        .where(and(eq(virtualHorses.id, id), eq(virtualHorses.userId, ctx.user.id)));
      return { success: true };
    }),

  // ── Assigned Horse ───────────────────────────────────────────────────────
  getAssignedHorse: studentProcedure.query(async ({ ctx }) => {
    const dbConn = await getDb();
    if (!dbConn) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
    const assignments = await dbConn.select({
      assignmentId: studentHorseAssignments.id,
      horseId: studentHorseAssignments.horseId,
      notes: studentHorseAssignments.notes,
      assignedAt: studentHorseAssignments.assignedAt,
      horseName: horses.name,
      horseBreed: horses.breed,
      horseColor: horses.color,
      horseAge: horses.age,
      horsePhotoUrl: horses.photoUrl,
      horseGender: horses.gender,
    }).from(studentHorseAssignments)
      .innerJoin(horses, eq(studentHorseAssignments.horseId, horses.id))
      .where(and(
        eq(studentHorseAssignments.studentUserId, ctx.user.id),
        eq(studentHorseAssignments.isActive, true),
      ))
      .limit(1);
    return assignments[0] ?? null;
  }),

  // ── Tasks ────────────────────────────────────────────────────────────────
  listTasks: studentProcedure
    .input(z.object({
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
      completed: z.boolean().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const dbConn = await getDb();
      if (!dbConn) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      const conditions = [eq(studentTasks.userId, ctx.user.id)];
      if (input?.completed !== undefined) {
        conditions.push(eq(studentTasks.isCompleted, input.completed));
      }
      if (input?.dateFrom) {
        conditions.push(sql`${studentTasks.targetDate} >= ${input.dateFrom}` as any);
      }
      if (input?.dateTo) {
        conditions.push(sql`${studentTasks.targetDate} <= ${input.dateTo}` as any);
      }

      return dbConn.select().from(studentTasks)
        .where(and(...conditions))
        .orderBy(desc(studentTasks.createdAt))
        .limit(100);
    }),

  createTask: studentProcedure
    .input(z.object({
      title: z.string().min(1).max(200),
      description: z.string().optional(),
      category: z.enum(["care", "grooming", "feeding", "study", "exercise", "other"]).default("care"),
      frequency: z.enum(["daily", "weekly", "once"]).default("daily"),
      targetDate: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const dbConn = await getDb();
      if (!dbConn) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
      const [result] = await dbConn.insert(studentTasks).values({
        userId: ctx.user.id,
        title: input.title,
        description: input.description ?? null,
        category: input.category,
        frequency: input.frequency,
        targetDate: input.targetDate ? new Date(input.targetDate) : null,
      });
      return { id: result.insertId, success: true };
    }),

  completeTask: studentProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const dbConn = await getDb();
      if (!dbConn) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
      await dbConn.update(studentTasks)
        .set({ isCompleted: true, completedAt: new Date() })
        .where(and(eq(studentTasks.id, input.id), eq(studentTasks.userId, ctx.user.id)));
      return { success: true };
    }),

  uncompleteTask: studentProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const dbConn = await getDb();
      if (!dbConn) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
      await dbConn.update(studentTasks)
        .set({ isCompleted: false, completedAt: null })
        .where(and(eq(studentTasks.id, input.id), eq(studentTasks.userId, ctx.user.id)));
      return { success: true };
    }),

  deleteTask: studentProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const dbConn = await getDb();
      if (!dbConn) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
      await dbConn.delete(studentTasks)
        .where(and(eq(studentTasks.id, input.id), eq(studentTasks.userId, ctx.user.id)));
      return { success: true };
    }),

  // ── Training Log ─────────────────────────────────────────────────────────
  listTraining: studentProcedure
    .input(z.object({
      limit: z.number().int().min(1).max(100).default(20),
    }).optional())
    .query(async ({ ctx, input }) => {
      const dbConn = await getDb();
      if (!dbConn) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
      return dbConn.select().from(studentTrainingEntries)
        .where(eq(studentTrainingEntries.userId, ctx.user.id))
        .orderBy(desc(studentTrainingEntries.sessionDate))
        .limit(input?.limit ?? 20);
    }),

  createTraining: studentProcedure
    .input(z.object({
      title: z.string().min(1).max(200),
      sessionDate: z.string(),
      duration: z.number().int().min(1).optional(),
      sessionType: z.enum(["lesson", "practice", "groundwork", "theory", "other"]).default("lesson"),
      notes: z.string().optional(),
      wentWell: z.string().optional(),
      needsImprovement: z.string().optional(),
      instructor: z.string().max(100).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const dbConn = await getDb();
      if (!dbConn) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
      const [result] = await dbConn.insert(studentTrainingEntries).values({
        userId: ctx.user.id,
        title: input.title,
        sessionDate: new Date(input.sessionDate),
        duration: input.duration ?? null,
        sessionType: input.sessionType,
        notes: input.notes ?? null,
        wentWell: input.wentWell ?? null,
        needsImprovement: input.needsImprovement ?? null,
        instructor: input.instructor ?? null,
      });
      return { id: result.insertId, success: true };
    }),

  deleteTraining: studentProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const dbConn = await getDb();
      if (!dbConn) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
      await dbConn.delete(studentTrainingEntries)
        .where(and(eq(studentTrainingEntries.id, input.id), eq(studentTrainingEntries.userId, ctx.user.id)));
      return { success: true };
    }),

  // ── Progress ─────────────────────────────────────────────────────────────
  getProgress: studentProcedure.query(async ({ ctx }) => {
    const dbConn = await getDb();
    if (!dbConn) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
    return dbConn.select().from(studentProgress)
      .where(eq(studentProgress.userId, ctx.user.id))
      .orderBy(studentProgress.skillArea);
  }),

  // ── Study Hub ────────────────────────────────────────────────────────────
  listStudyTopics: studentProcedure
    .input(z.object({
      category: z.string().optional(),
    }).optional())
    .query(async ({ ctx: _ctx, input }) => {
      const dbConn = await getDb();
      if (!dbConn) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      // Seed defaults if table is empty
      const existing = await dbConn.select({ id: studyTopics.id }).from(studyTopics).limit(1);
      if (existing.length === 0) {
        await dbConn.insert(studyTopics).values(DEFAULT_STUDY_TOPICS);
      }

      const conditions = [eq(studyTopics.isPublished, true)];
      if (input?.category) {
        conditions.push(eq(studyTopics.category, input.category));
      }

      return dbConn.select().from(studyTopics)
        .where(and(...conditions))
        .orderBy(studyTopics.sortOrder);
    }),

  getStudyTopic: studentProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx: _ctx, input }) => {
      const dbConn = await getDb();
      if (!dbConn) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
      const [topic] = await dbConn.select().from(studyTopics)
        .where(eq(studyTopics.slug, input.slug))
        .limit(1);
      if (!topic) throw new TRPCError({ code: "NOT_FOUND", message: "Topic not found" });
      return topic;
    }),

  // ── AI Tutor ─────────────────────────────────────────────────────────────
  askTutor: studentProcedure
    .input(z.object({
      question: z.string().min(1).max(2000),
      conversationHistory: z.array(z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })).max(10).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const dbConn = await getDb();
      if (!dbConn) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      // Rate limit: check daily usage
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todaySessions = await dbConn.select({ id: aiTutorSessions.id })
        .from(aiTutorSessions)
        .where(and(
          eq(aiTutorSessions.userId, ctx.user.id),
          gte(aiTutorSessions.createdAt, todayStart),
        ));

      if (todaySessions.length >= AI_TUTOR_DAILY_LIMIT) {
        return {
          answer: `You've reached today's limit of ${AI_TUTOR_DAILY_LIMIT} questions. Your limit resets at midnight. Keep studying — you're doing great! 🐴`,
          tier: "limited" as const,
          modelUsed: "none",
        };
      }

      // Check if AI is configured
      if (!(await isAIConfigured())) {
        return {
          answer: "⚠️ The AI Tutor is not yet configured. Please ask your school or check back later.",
          tier: "unavailable" as const,
          modelUsed: "none",
        };
      }

      // Determine tier
      const tier = shouldEscalate(input.question) ? "smart" : "standard";
      const model = await resolveTutorModel(tier);

      // Build messages
      const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
        { role: "system", content: AI_TUTOR_SYSTEM_PROMPT },
      ];

      // Add conversation history for context
      if (input.conversationHistory?.length) {
        for (const msg of input.conversationHistory.slice(-6)) {
          messages.push({ role: msg.role, content: msg.content });
        }
      }

      messages.push({ role: "user", content: input.question });

      try {
        const response = await invokeLLM({
          messages,
          maxTokens: tier === "smart" ? 1024 : 512,
        });

        const answer = typeof response.choices[0]?.message?.content === "string"
          ? response.choices[0].message.content
          : "I couldn't generate a response. Please try rephrasing your question.";

        // Log the session
        await dbConn.insert(aiTutorSessions).values({
          userId: ctx.user.id,
          question: input.question,
          answer,
          modelUsed: model,
          tier,
          promptTokens: response.usage?.prompt_tokens ?? 0,
          completionTokens: response.usage?.completion_tokens ?? 0,
        });

        return { answer, tier, modelUsed: model };
      } catch (err: any) {
        // Log the failed attempt
        await dbConn.insert(aiTutorSessions).values({
          userId: ctx.user.id,
          question: input.question,
          answer: `Error: ${err?.message || "Unknown error"}`,
          modelUsed: model,
          tier,
          promptTokens: 0,
          completionTokens: 0,
        }).catch((logErr: unknown) => {
          console.error("[AI Tutor] Failed to log error session:", logErr);
        }); // don't fail on logging failure

        return {
          answer: "Sorry, the AI Tutor encountered an error. Please try again in a moment.",
          tier: "error" as const,
          modelUsed: model,
        };
      }
    }),

  getTutorUsage: studentProcedure.query(async ({ ctx }) => {
    const dbConn = await getDb();
    if (!dbConn) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todaySessions = await dbConn.select({ id: aiTutorSessions.id })
      .from(aiTutorSessions)
      .where(and(
        eq(aiTutorSessions.userId, ctx.user.id),
        gte(aiTutorSessions.createdAt, todayStart),
      ));

    return {
      usedToday: todaySessions.length,
      dailyLimit: AI_TUTOR_DAILY_LIMIT,
      remaining: Math.max(0, AI_TUTOR_DAILY_LIMIT - todaySessions.length),
    };
  }),

  // ── Scenario Training ────────────────────────────────────────────────────
  listScenarios: studentProcedure
    .input(z.object({
      level: z.enum(["beginner", "developing", "intermediate", "advanced"]).optional(),
      category: z.string().optional(),
      /** Optional list of already-seen scenario IDs for rotation/repetition control */
      excludeIds: z.array(z.string()).optional(),
      /** Max scenarios to return per request — defaults to 8 for manageable batches */
      limit: z.number().int().min(1).max(50).optional(),
    }).optional())
    .query(({ input }) => {
      let results = SCENARIO_DATA as Scenario[];
      if (input?.level) {
        results = results.filter((s) => s.level === input.level);
      }
      if (input?.category) {
        results = results.filter((s) => s.category === input.category);
      }

      // ── Rotation / Randomization Logic ────────────────────────────────
      // 1. Filter out already-seen scenarios if the client sends exclusion list
      const excludeSet = new Set(input?.excludeIds ?? []);
      let unseen = results.filter((s) => !excludeSet.has(s.id));
      // If all scenarios at this level/category have been seen, reset and show all (full rotation)
      if (unseen.length === 0) {
        unseen = results;
      }
      // 2. Shuffle using Fisher-Yates for true randomization
      const shuffled = [...unseen];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      // 3. Return limited batch (default 8)
      const limit = input?.limit ?? 8;
      const batch = shuffled.slice(0, limit);

      // Strip correct answer info before sending — frontend gets it after answering
      return batch.map(({ choices, ...rest }) => ({
        ...rest,
        choices: choices.map(({ id, text }) => ({ id, text })),
      }));
    }),

  checkScenarioAnswer: studentProcedure
    .input(z.object({
      scenarioId: z.string(),
      choiceId: z.string(),
    }))
    .mutation(({ input }) => {
      const scenario = SCENARIO_DATA.find((s) => s.id === input.scenarioId);
      if (!scenario) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Scenario not found" });
      }
      const choice = scenario.choices.find((c) => c.id === input.choiceId);
      if (!choice) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Choice not found" });
      }
      // Return the full choice with explanation + all choices with explanations so the frontend can show the reveal
      return {
        isCorrect: choice.isCorrect,
        selectedChoice: choice,
        allChoices: scenario.choices,
        learningTakeaway: scenario.learningTakeaway,
      };
    }),

  /** Daily Practice — deterministic 3 scenarios per user per day */
  getDailyScenarios: studentProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.user.id;
      const user = await db.getUserById(userId);
      const prefs = parseUserPrefs(user?.preferences);
      const currentLevel = (prefs.studentLevel as string) ?? "beginner";

      // Deterministic daily seed based on userId + date
      const today = new Date();
      const dayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
      const seedStr = `${userId}-${dayKey}`;
      let seed = 0;
      for (let i = 0; i < seedStr.length; i++) {
        seed = ((seed << 5) - seed + seedStr.charCodeAt(i)) | 0;
      }

      // Seeded random number generator (mulberry32)
      function mulberry32(s: number) {
        return function () {
          s |= 0; s = (s + 0x6D2B79F5) | 0;
          let t = Math.imul(s ^ (s >>> 15), 1 | s);
          t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
          return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
      }
      const rng = mulberry32(seed);

      // Prefer scenarios at current level, then one level below/above
      const levelOrder = ["beginner", "developing", "intermediate", "advanced"];
      const currentIdx = levelOrder.indexOf(currentLevel);
      const preferredLevels = [currentLevel];
      if (currentIdx > 0) preferredLevels.push(levelOrder[currentIdx - 1]);
      if (currentIdx < levelOrder.length - 1) preferredLevels.push(levelOrder[currentIdx + 1]);

      // Filter scenarios to preferred levels
      let pool = SCENARIO_DATA.filter((s) => preferredLevels.includes(s.level));
      if (pool.length < 3) pool = [...SCENARIO_DATA]; // fallback to all

      // Shuffle with seeded RNG
      const shuffled = [...pool];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }

      // Pick exactly 3
      const daily = shuffled.slice(0, 3);

      // Strip correct answer info
      return {
        date: dayKey,
        scenarios: daily.map(({ choices, ...rest }) => ({
          ...rest,
          choices: choices.map(({ id, text }) => ({ id, text })),
        })),
      };
    }),

  // ── Training Log — Update ────────────────────────────────────────────────
  updateTraining: studentProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().min(1).max(200).optional(),
      sessionDate: z.string().optional(),
      duration: z.number().int().min(1).optional(),
      sessionType: z.enum(["lesson", "practice", "groundwork", "theory", "other"]).optional(),
      notes: z.string().optional(),
      wentWell: z.string().optional(),
      needsImprovement: z.string().optional(),
      instructor: z.string().max(100).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const dbConn = await getDb();
      if (!dbConn) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
      const { id, sessionDate, ...rest } = input;
      const updateData: Record<string, any> = { ...rest };
      if (sessionDate) {
        updateData.sessionDate = new Date(sessionDate);
      }
      await dbConn.update(studentTrainingEntries)
        .set(updateData)
        .where(and(eq(studentTrainingEntries.id, id), eq(studentTrainingEntries.userId, ctx.user.id)));
      return { success: true };
    }),

  // ── Learner Level ────────────────────────────────────────────────────────
  getLearnerLevel: studentProcedure.query(async ({ ctx }) => {
    const user = await db.getUserById(ctx.user.id);
    if (!user) throw new TRPCError({ code: "NOT_FOUND" });
    const prefs = parseUserPrefs(user.preferences);
    return {
      level: (prefs.studentLevel as "beginner" | "developing" | "intermediate" | "advanced") ?? "beginner",
    };
  }),

  setLearnerLevel: studentProcedure
    .input(z.object({
      level: z.enum(["beginner", "developing", "intermediate", "advanced"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const dbConn = await getDb();
      if (!dbConn) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
      const user = await db.getUserById(ctx.user.id);
      if (!user) throw new TRPCError({ code: "NOT_FOUND" });
      const prefs = parseUserPrefs(user.preferences);
      prefs.studentLevel = input.level;
      await dbConn.update(users)
        .set({ preferences: JSON.stringify(prefs) })
        .where(eq(users.id, ctx.user.id));
      return { success: true };
    }),

  /** Get the highest unlocked level based on lesson completion progress.
   *  Rules:
   *  - Beginner is always unlocked
   *  - Developing unlocks when ≥60% of beginner lessons are completed
   *  - Intermediate unlocks when ≥60% of developing lessons are completed
   *  - Advanced unlocks when ≥60% of intermediate lessons are completed
   *  Returns: unlockedLevel, completedByLevel counts, totalByLevel counts
   */
  getUnlockedLevel: studentProcedure.query(async ({ ctx }) => {
    const dbConn = await getDb();
    if (!dbConn) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

    // Count total lessons per level from static content
    const totalByLevel: Record<string, number> = { beginner: 0, developing: 0, intermediate: 0, advanced: 0 };
    for (const u of LESSON_UNITS) {
      if (totalByLevel[u.level] !== undefined) totalByLevel[u.level]++;
    }

    // Count completed lessons per level for this user
    const completions = await dbConn.select({
      level: lessonCompletion.level,
    }).from(lessonCompletion).where(eq(lessonCompletion.studentUserId, ctx.user.id));

    const completedByLevel: Record<string, number> = { beginner: 0, developing: 0, intermediate: 0, advanced: 0 };
    for (const c of completions) {
      if (completedByLevel[c.level] !== undefined) completedByLevel[c.level]++;
    }

    // Determine highest unlocked level (60% threshold to unlock next)
    const UNLOCK_THRESHOLD = 0.6;
    const levels = ["beginner", "developing", "intermediate", "advanced"] as const;
    let unlockedLevel: string = "beginner";

    for (let i = 0; i < levels.length - 1; i++) {
      const lev = levels[i];
      const total = totalByLevel[lev] || 1;
      const done = completedByLevel[lev] || 0;
      if (done / total >= UNLOCK_THRESHOLD) {
        unlockedLevel = levels[i + 1];
      } else {
        break;
      }
    }

    // Find recommended next lesson (first incomplete lesson at current working level)
    const allCompletions = await dbConn.select({ lessonSlug: lessonCompletion.lessonSlug })
      .from(lessonCompletion).where(eq(lessonCompletion.studentUserId, ctx.user.id));
    const completedSlugs = new Set(allCompletions.map(c => c.lessonSlug));

    // Working level = highest unlocked level where there are still incomplete lessons
    let workingLevel = unlockedLevel;
    for (const lev of levels) {
      const idx = levels.indexOf(lev);
      if (idx > levels.indexOf(unlockedLevel as any)) break;
      const levLessons = LESSON_UNITS.filter(u => u.level === lev);
      const hasIncomplete = levLessons.some(u => !completedSlugs.has(u.slug));
      if (hasIncomplete) { workingLevel = lev; break; }
    }

    const nextLesson = LESSON_UNITS
      .filter(u => u.level === workingLevel)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .find(u => !completedSlugs.has(u.slug));

    return {
      unlockedLevel,
      workingLevel,
      totalByLevel,
      completedByLevel,
      recommendedNextLesson: nextLesson ? { slug: nextLesson.slug, title: nextLesson.title, pathwaySlug: nextLesson.pathwaySlug, level: nextLesson.level } : null,
    };
  }),

  // ── Teacher-assigned tasks (student view) ─────────────────────────────────

  listAssignedTasksForMe: studentProcedure.query(async ({ ctx }) => {
    const dbConn = await getDb();
    if (!dbConn) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

    // Find groups the student is in
    const memberships = await dbConn.select({ groupId: studentGroupMembers.groupId })
      .from(studentGroupMembers)
      .where(eq(studentGroupMembers.studentUserId, ctx.user.id));

    const groupIds = memberships.map(m => m.groupId);

    // Individual + group tasks
    const conditions = groupIds.length
      ? [eq(teacherAssignedTasks.studentUserId, ctx.user.id)]
      : [eq(teacherAssignedTasks.studentUserId, ctx.user.id)];

    const individualTasks = await dbConn.select().from(teacherAssignedTasks)
      .where(eq(teacherAssignedTasks.studentUserId, ctx.user.id))
      .orderBy(desc(teacherAssignedTasks.createdAt));

    const groupTasks = groupIds.length
      ? await dbConn.select().from(teacherAssignedTasks)
          .where(inArray(teacherAssignedTasks.groupId, groupIds))
          .orderBy(desc(teacherAssignedTasks.createdAt))
      : [];

    return [...individualTasks, ...groupTasks];
  }),

  completeAssignedTask: studentProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const dbConn = await getDb();
      if (!dbConn) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      // Verify the task is assigned to this student (individual or group)
      const [task] = await dbConn.select().from(teacherAssignedTasks)
        .where(eq(teacherAssignedTasks.id, input.id)).limit(1);

      if (!task) throw new TRPCError({ code: "NOT_FOUND" });

      // Check group membership if group task
      if (task.groupId) {
        const [membership] = await dbConn.select({ id: studentGroupMembers.id })
          .from(studentGroupMembers)
          .where(and(eq(studentGroupMembers.groupId, task.groupId), eq(studentGroupMembers.studentUserId, ctx.user.id)))
          .limit(1);
        if (!membership) throw new TRPCError({ code: "FORBIDDEN" });
      } else if (task.studentUserId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      await dbConn.update(teacherAssignedTasks)
        .set({ isCompleted: true, completedAt: new Date(), completedByStudentId: ctx.user.id })
        .where(eq(teacherAssignedTasks.id, input.id));
      return { success: true };
    }),

  // ── Teacher feedback (student view) ──────────────────────────────────────

  listMyFeedback: studentProcedure.query(async ({ ctx }) => {
    const dbConn = await getDb();
    if (!dbConn) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

    const feedback = await dbConn.select({
      id: teacherFeedback.id,
      teacherId: teacherFeedback.teacherId,
      entryType: teacherFeedback.entryType,
      entryId: teacherFeedback.entryId,
      comment: teacherFeedback.comment,
      feedbackType: teacherFeedback.feedbackType,
      isRead: teacherFeedback.isRead,
      createdAt: teacherFeedback.createdAt,
    }).from(teacherFeedback)
      .where(eq(teacherFeedback.studentUserId, ctx.user.id))
      .orderBy(desc(teacherFeedback.createdAt))
      .limit(50);

    if (!feedback.length) return [];

    // Fetch teacher names
    const teacherIds = Array.from(new Set(feedback.map(f => f.teacherId)));
    const teacherUsers = await dbConn.select({ id: users.id, name: users.name })
      .from(users).where(inArray(users.id, teacherIds));
    const teacherMap = new Map(teacherUsers.map(u => [u.id, u.name]));

    return feedback.map(f => ({ ...f, teacherName: teacherMap.get(f.teacherId) ?? "Instructor" }));
  }),

  markFeedbackRead: studentProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const dbConn = await getDb();
      if (!dbConn) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
      await dbConn.update(teacherFeedback)
        .set({ isRead: true })
        .where(and(eq(teacherFeedback.id, input.id), eq(teacherFeedback.studentUserId, ctx.user.id)));
      return { success: true };
    }),

  // ── Learning Pathway Progress ─────────────────────────────────────────────

  getPathwayProgress: studentProcedure.query(async ({ ctx }) => {
    const dbConn = await getDb();
    if (!dbConn) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

    const completed = await dbConn.select().from(learningPathwayProgress)
      .where(eq(learningPathwayProgress.studentUserId, ctx.user.id));

    const user = await db.getUserById(ctx.user.id);
    const prefs = parseUserPrefs(user?.preferences);
    const currentLevel = (prefs.studentLevel as string) ?? "beginner";

    return { completed, currentLevel };
  }),

  markPathwayItemComplete: studentProcedure
    .input(z.object({
      pathwayLevel: z.enum(["beginner", "developing", "intermediate", "advanced"]),
      itemType: z.enum(["study_topic", "scenario"]),
      itemSlug: z.string().min(1).max(100),
    }))
    .mutation(async ({ ctx, input }) => {
      const dbConn = await getDb();
      if (!dbConn) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      // Idempotent — only insert if not already completed
      const [existing] = await dbConn.select({ id: learningPathwayProgress.id })
        .from(learningPathwayProgress)
        .where(and(
          eq(learningPathwayProgress.studentUserId, ctx.user.id),
          eq(learningPathwayProgress.pathwayLevel, input.pathwayLevel),
          eq(learningPathwayProgress.itemType, input.itemType),
          eq(learningPathwayProgress.itemSlug, input.itemSlug),
        )).limit(1);

      if (!existing) {
        await dbConn.insert(learningPathwayProgress).values({
          studentUserId: ctx.user.id,
          pathwayLevel: input.pathwayLevel,
          itemType: input.itemType,
          itemSlug: input.itemSlug,
        });
      }

      return { success: true };
    }),

  // ─────────────────────────────────────────────────────────────────────────
  // Lesson Engine — structured learning pathways
  // ─────────────────────────────────────────────────────────────────────────

  /** List all lesson pathways (seeds DB on first call). */
  listLessonPathways: studentProcedure
    .query(async () => {
      const dbConn = await getDb();
      if (!dbConn) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database unavailable" });

      // Seed pathways if table is empty
      const existing = await dbConn.select({ id: lessonPathways.id }).from(lessonPathways).limit(1);
      if (existing.length === 0) {
        try {
          await dbConn.insert(lessonPathways).values(
            LESSON_PATHWAYS.map((p) => ({
              slug: p.slug,
              title: p.title,
              description: p.description,
              sortOrder: p.sortOrder,
              iconName: p.iconName,
              isPublished: true,
            })),
          );
        } catch (seedErr) {
          console.error("[lesson-seed] Failed to seed pathways:", seedErr);
        }
      }

      const rows = await dbConn.select().from(lessonPathways).orderBy(lessonPathways.sortOrder);
      return rows;
    }),

  /** List lessons, optionally filtered by pathway and/or level. Seeds DB on first call. */
  listLessons: studentProcedure
    .input(z.object({
      pathwaySlug: z.string().optional(),
      level: z.enum(["beginner", "developing", "intermediate", "advanced"]).optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const dbConn = await getDb();
      if (!dbConn) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database unavailable" });

      // Seed lessons if table is empty — use batched insert to avoid max_packet issues
      const existing = await dbConn.select({ id: lessonUnits.id }).from(lessonUnits).limit(1);
      if (existing.length === 0) {
        const allValues = LESSON_UNITS.map((l) => ({
          slug: l.slug,
          pathwaySlug: l.pathwaySlug,
          title: l.title,
          level: l.level,
          category: l.category,
          sortOrder: l.sortOrder,
          objectives: JSON.stringify(l.objectives),
          content: l.content,
          keyPoints: JSON.stringify(l.keyPoints),
          safetyNote: l.safetyNote,
          practicalApplication: l.practicalApplication,
          commonMistakes: JSON.stringify(l.commonMistakes),
          knowledgeCheck: JSON.stringify(l.knowledgeCheck),
          aiTutorPrompts: JSON.stringify(l.aiTutorPrompts),
          isPublished: true,
        }));

        // Insert in batches of 10 to avoid MySQL max_allowed_packet issues
        const BATCH_SIZE = 10;
        for (let i = 0; i < allValues.length; i += BATCH_SIZE) {
          const batch = allValues.slice(i, i + BATCH_SIZE);
          try {
            await dbConn.insert(lessonUnits).values(batch);
          } catch (seedErr) {
            console.error(`[lesson-seed] Failed to seed lessons batch ${i}-${i + batch.length}:`, seedErr);
          }
        }
      }

      // ── Progression gating: determine unlocked level for this student ──
      const LEVEL_ORDER = ["beginner", "developing", "intermediate", "advanced"];
      const UNLOCK_THRESHOLD = 0.6;
      const totalByLevel: Record<string, number> = { beginner: 0, developing: 0, intermediate: 0, advanced: 0 };
      for (const u of LESSON_UNITS) {
        if (totalByLevel[u.level] !== undefined) totalByLevel[u.level]++;
      }
      const completions = await dbConn.select({ level: lessonCompletion.level })
        .from(lessonCompletion).where(eq(lessonCompletion.studentUserId, ctx.user.id));
      const completedByLevel: Record<string, number> = { beginner: 0, developing: 0, intermediate: 0, advanced: 0 };
      for (const c of completions) {
        if (completedByLevel[c.level] !== undefined) completedByLevel[c.level]++;
      }
      let unlockedIdx = 0; // beginner is always unlocked
      for (let i = 0; i < LEVEL_ORDER.length - 1; i++) {
        const lev = LEVEL_ORDER[i];
        const total = totalByLevel[lev] || 1;
        const done = completedByLevel[lev] || 0;
        if (done / total >= UNLOCK_THRESHOLD) {
          unlockedIdx = i + 1;
        } else {
          break;
        }
      }

      const conditions = [];
      if (input?.pathwaySlug) conditions.push(eq(lessonUnits.pathwaySlug, input.pathwaySlug));
      if (input?.level) conditions.push(eq(lessonUnits.level, input.level));

      const rows = conditions.length > 0
        ? await dbConn.select().from(lessonUnits).where(and(...conditions)).orderBy(lessonUnits.sortOrder)
        : await dbConn.select().from(lessonUnits).orderBy(lessonUnits.sortOrder);

      // Return summary with locked state
      return rows.map((r) => ({
        id: r.id,
        slug: r.slug,
        pathwaySlug: r.pathwaySlug,
        title: r.title,
        level: r.level,
        category: r.category,
        sortOrder: r.sortOrder,
        locked: LEVEL_ORDER.indexOf(r.level) > unlockedIdx,
      }));
    }),

  /** Get full lesson content by slug. */
  getLesson: studentProcedure
    .input(z.object({ slug: z.string().min(1).max(150) }))
    .query(async ({ input }) => {
      const dbConn = await getDb();
      if (!dbConn) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database unavailable" });

      const [row] = await dbConn.select().from(lessonUnits).where(eq(lessonUnits.slug, input.slug)).limit(1);
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Lesson not found" });

      // Parse JSON fields
      const parseJSON = (val: string | null) => {
        if (val === null || val === undefined) return [];
        try { return JSON.parse(val); } catch { return []; }
      };

      // Lookup static competency mapping from lesson content definitions
      const staticUnit = LESSON_UNITS.find(u => u.slug === input.slug);

      return {
        ...row,
        objectives: parseJSON(row.objectives),
        keyPoints: parseJSON(row.keyPoints),
        commonMistakes: parseJSON(row.commonMistakes),
        knowledgeCheck: parseJSON(row.knowledgeCheck),
        aiTutorPrompts: parseJSON(row.aiTutorPrompts),
        linkedCompetencies: staticUnit?.linkedCompetencies ?? [],
      };
    }),

  /** Mark a lesson as complete, with optional quiz score. */
  completeLesson: studentProcedure
    .input(z.object({
      lessonSlug: z.string().min(1).max(150),
      pathwaySlug: z.string().min(1).max(100),
      level: z.enum(["beginner", "developing", "intermediate", "advanced"]),
      score: z.number().min(0).max(100).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const dbConn = await getDb();
      if (!dbConn) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database unavailable" });

      // Check if already completed
      const [existing] = await dbConn.select({ id: lessonCompletion.id })
        .from(lessonCompletion)
        .where(and(
          eq(lessonCompletion.studentUserId, ctx.user.id),
          eq(lessonCompletion.lessonSlug, input.lessonSlug),
        )).limit(1);

      if (existing) {
        // Update score if provided
        if (input.score !== undefined) {
          await dbConn.update(lessonCompletion)
            .set({ score: input.score })
            .where(eq(lessonCompletion.id, existing.id));
        }
        return { success: true, alreadyCompleted: true };
      }

      await dbConn.insert(lessonCompletion).values({
        studentUserId: ctx.user.id,
        lessonSlug: input.lessonSlug,
        pathwaySlug: input.pathwaySlug,
        level: input.level,
        score: input.score ?? null,
      });

      return { success: true, alreadyCompleted: false };
    }),

  /** Get lesson completion progress for the current student. */
  getLessonProgress: studentProcedure
    .query(async ({ ctx }) => {
      const dbConn = await getDb();
      if (!dbConn) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database unavailable" });

      const completions = await dbConn.select()
        .from(lessonCompletion)
        .where(eq(lessonCompletion.studentUserId, ctx.user.id))
        .orderBy(desc(lessonCompletion.completedAt));

      return completions;
    }),

  // ─────────────────────────────────────────────────────────────────────────
  // Phase 2 — Assigned Lessons, Competencies, Progress Intelligence
  // ─────────────────────────────────────────────────────────────────────────

  /** Get lessons assigned to this student by their teacher(s). */
  getAssignedLessons: studentProcedure.query(async ({ ctx }) => {
    const dbConn = await getDb();
    if (!dbConn) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

    // Find groups this student belongs to
    const memberships = await dbConn.select({ groupId: studentGroupMembers.groupId })
      .from(studentGroupMembers)
      .where(eq(studentGroupMembers.studentUserId, ctx.user.id));

    const groupIds = memberships.map(m => m.groupId);

    // Get assignments for this student directly or via group
    const directCondition = eq(teacherLessonAssignments.studentUserId, ctx.user.id);
    const studentCondition = groupIds.length > 0
      ? (or(directCondition, inArray(teacherLessonAssignments.groupId, groupIds)) ?? directCondition)
      : directCondition;

    const assignments = await dbConn
      .select({
        id: teacherLessonAssignments.id,
        assignmentType: teacherLessonAssignments.assignmentType,
        lessonSlug: teacherLessonAssignments.lessonSlug,
        pathwaySlug: teacherLessonAssignments.pathwaySlug,
        dueDate: teacherLessonAssignments.dueDate,
        instructions: teacherLessonAssignments.instructions,
        isActive: teacherLessonAssignments.isActive,
        createdAt: teacherLessonAssignments.createdAt,
        groupId: teacherLessonAssignments.groupId,
        studentUserId: teacherLessonAssignments.studentUserId,
        lessonTitle: lessonUnits.title,
      })
      .from(teacherLessonAssignments)
      .leftJoin(lessonUnits, eq(teacherLessonAssignments.lessonSlug, lessonUnits.slug))
      .where(and(eq(teacherLessonAssignments.isActive, true), studentCondition))
      .orderBy(teacherLessonAssignments.dueDate);

    // Get completion data to mark which are done
    const completions = await dbConn.select({ lessonSlug: lessonCompletion.lessonSlug })
      .from(lessonCompletion)
      .where(eq(lessonCompletion.studentUserId, ctx.user.id));

    const completedSlugs = new Set(completions.map(c => c.lessonSlug));
    const now = new Date();

    return assignments.map(a => ({
      ...a,
      isCompleted: a.assignmentType === "lesson" && a.lessonSlug ? completedSlugs.has(a.lessonSlug) : false,
      isOverdue: a.dueDate ? new Date(a.dueDate) < now : false,
    }));
  }),

  /** Get this student's competency records. */
  getMyCompetencies: studentProcedure.query(async ({ ctx }) => {
    const dbConn = await getDb();
    if (!dbConn) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

    return dbConn.select().from(studentCompetencies)
      .where(eq(studentCompetencies.userId, ctx.user.id))
      .orderBy(studentCompetencies.category, studentCompetencies.competencyKey);
  }),

  /** Get lesson reviews (teacher feedback) for this student. */
  getMyLessonReviews: studentProcedure.query(async ({ ctx }) => {
    const dbConn = await getDb();
    if (!dbConn) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

    return dbConn.select().from(lessonReviews)
      .where(eq(lessonReviews.studentUserId, ctx.user.id))
      .orderBy(desc(lessonReviews.createdAt));
  }),

  /** Mark a lesson review as read. */
  markReviewRead: studentProcedure
    .input(z.object({ reviewId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const dbConn = await getDb();
      if (!dbConn) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
      await dbConn.update(lessonReviews)
        .set({ isRead: true })
        .where(and(eq(lessonReviews.id, input.reviewId), eq(lessonReviews.studentUserId, ctx.user.id)));
      return { success: true };
    }),

  /** Calculate intelligent progress across pathways, competencies, and skill areas. */
  getProgressIntelligence: studentProcedure.query(async ({ ctx }) => {
    const dbConn = await getDb();
    if (!dbConn) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

    const TOTAL_LESSONS_PER_PATHWAY: Record<string, number> = {
      "horse-care-foundations": 7,
      "rider-foundations": 7,
      "stable-yard-safety": 6,
      "horse-behaviour-welfare": 7,
      "tack-equipment": 6,
      "developing-rider-skills": 8,
    };
    const TOTAL_LESSONS = Object.values(TOTAL_LESSONS_PER_PATHWAY).reduce((a, b) => a + b, 0);

    const [completions, competencies, skillProgress, reviews, assignments] = await Promise.all([
      dbConn.select().from(lessonCompletion).where(eq(lessonCompletion.studentUserId, ctx.user.id)),
      dbConn.select().from(studentCompetencies).where(eq(studentCompetencies.userId, ctx.user.id)),
      dbConn.select().from(studentProgress).where(eq(studentProgress.userId, ctx.user.id)),
      dbConn.select().from(lessonReviews).where(eq(lessonReviews.studentUserId, ctx.user.id)),
      dbConn.select().from(teacherLessonAssignments)
        .where(and(eq(teacherLessonAssignments.studentUserId, ctx.user.id), eq(teacherLessonAssignments.isActive, true))),
    ]);

    // Pathway completion %
    const completedByPathway = completions.reduce((acc, lc) => {
      acc[lc.pathwaySlug] = (acc[lc.pathwaySlug] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const pathwayProgress = Object.entries(TOTAL_LESSONS_PER_PATHWAY).map(([slug, total]) => ({
      slug,
      completed: completedByPathway[slug] ?? 0,
      total,
      percent: Math.round(((completedByPathway[slug] ?? 0) / total) * 100),
    }));

    const overallLessonPercent = Math.round((completions.length / TOTAL_LESSONS) * 100);

    // Competency summary
    const achievedCompetencies = competencies.filter(c => c.status === "achieved").length;
    const needsSupportCompetencies = competencies.filter(c => c.status === "needs_support").length;
    const REQUIRED_COMPETENCIES = 17; // defined competency count
    const competencyPercent = Math.round((achievedCompetencies / REQUIRED_COMPETENCIES) * 100);

    // Weak areas — skill areas with lowest XP
    const sortedSkills = skillProgress.slice().sort((a, b) => a.xp - b.xp);
    const weakAreas = sortedSkills.slice(0, 3).map(s => s.skillArea.replace(/_/g, " "));

    // Category-based weak areas from competencies needing support
    const categoryWeakness: Record<string, number> = {};
    for (const c of competencies) {
      if (c.status === "needs_support") {
        categoryWeakness[c.category] = (categoryWeakness[c.category] ?? 0) + 1;
      }
    }
    const weakCategories = Object.entries(categoryWeakness)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([cat]) => cat);

    // Reviews with needs_improvement
    const needsImprovementLessons = reviews
      .filter(r => r.reviewStatus === "needs_improvement")
      .map(r => r.lessonSlug);

    // Recommended next lesson — first uncompleted lesson in order
    const completedSlugs = new Set(completions.map(c => c.lessonSlug));
    const orderedPathways = [
      "horse-care-foundations", "rider-foundations", "stable-yard-safety",
      "horse-behaviour-welfare", "tack-equipment", "developing-rider-skills",
    ];
    let recommendedNextPathway: string | null = null;
    for (const pw of orderedPathways) {
      if ((completedByPathway[pw] ?? 0) < (TOTAL_LESSONS_PER_PATHWAY[pw] ?? 0)) {
        recommendedNextPathway = pw;
        break;
      }
    }

    // Readiness status
    let readinessStatus: "ready_for_next_level" | "needs_support" | "focus_on_safety" | "focus_on_riding" | "focus_on_care";
    if (needsSupportCompetencies > 2 || needsImprovementLessons.length > 3) {
      readinessStatus = "needs_support";
    } else if (weakCategories.some(c => c.toLowerCase().includes("safety"))) {
      readinessStatus = "focus_on_safety";
    } else if (weakCategories.some(c => c.toLowerCase().includes("riding") || c.toLowerCase().includes("rider"))) {
      readinessStatus = "focus_on_riding";
    } else if (weakCategories.some(c => c.toLowerCase().includes("care") || c.toLowerCase().includes("handling"))) {
      readinessStatus = "focus_on_care";
    } else {
      readinessStatus = overallLessonPercent >= 70 && competencyPercent >= 50 ? "ready_for_next_level" : "needs_support";
    }

    // Unread reviews
    const unreadReviews = reviews.filter(r => !r.isRead);

    return {
      overallLessonPercent,
      pathwayProgress,
      competencies: {
        achieved: achievedCompetencies,
        total: REQUIRED_COMPETENCIES,
        percent: competencyPercent,
        needsSupport: needsSupportCompetencies,
      },
      weakAreas,
      weakCategories,
      needsImprovementLessons,
      recommendedNextPathway,
      readinessStatus,
      unreadReviewCount: unreadReviews.length,
      assignedLessonsCount: assignments.length,
    };
  }),

  // ─────────────────────────────────────────────────────────────────────────
  // Virtual Horse Daily Task Engine
  // ─────────────────────────────────────────────────────────────────────────

  /** Get whether the daily task engine is enabled for this user. */
  getTaskEngineStatus: studentProcedure.query(async ({ ctx }) => {
    const user = await db.getUserById(ctx.user.id);
    const prefs = parseUserPrefs(user?.preferences);
    return {
      enabled: prefs.virtualHorseTaskEngine === true,
    };
  }),

  /** Toggle the virtual horse daily task engine on/off. */
  toggleTaskEngine: studentProcedure.mutation(async ({ ctx }) => {
    const user = await db.getUserById(ctx.user.id);
    const prefs = parseUserPrefs(user?.preferences);
    prefs.virtualHorseTaskEngine = !prefs.virtualHorseTaskEngine;
    await db.updateUser(ctx.user.id, { preferences: JSON.stringify(prefs) });
    return { enabled: prefs.virtualHorseTaskEngine as boolean };
  }),

  /** Generate today's virtual-horse daily tasks if they haven't been generated yet.
   *  Only runs when the engine is enabled and the student has a virtual horse.
   *  Returns the generated tasks (or empty array if already generated today or disabled).
   */
  generateDailyTasks: studentProcedure.mutation(async ({ ctx }) => {
    const dbConn = await getDb();
    if (!dbConn) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

    // Check engine is enabled
    const user = await db.getUserById(ctx.user.id);
    const prefs = parseUserPrefs(user?.preferences);
    if (!prefs.virtualHorseTaskEngine) return { generated: 0, tasks: [] };

    // Check student has a virtual horse
    const [vHorse] = await dbConn.select().from(virtualHorses)
      .where(and(eq(virtualHorses.userId, ctx.user.id), eq(virtualHorses.isActive, true)))
      .limit(1);
    if (!vHorse) return { generated: 0, tasks: [] };

    const today = new Date().toISOString().split("T")[0];

    // Check if already generated today — look for auto-generated marker in description
    const allTodayTasks = await dbConn.select()
      .from(studentTasks)
      .where(and(
        eq(studentTasks.userId, ctx.user.id),
        eq(studentTasks.targetDate, today as unknown as Date),
      ));

    const alreadyGenerated = allTodayTasks.some(t =>
      t.description?.startsWith("__vhorse__")
    );
    if (alreadyGenerated) return { generated: 0, tasks: [] };

    // Determine learner level from preferences
    const levelPrefs = parseUserPrefs(user?.preferences);
    const level: string = levelPrefs.learnerLevel ?? "beginner";

    // Task pools keyed by level
    const TASK_POOLS: Record<string, Array<{ title: string; category: string; description: string }>> = {
      beginner: [
        { title: "Morning feed check", category: "feeding", description: "__vhorse__ Check feed bucket and water supply for your virtual horse." },
        { title: "Grooming session", category: "grooming", description: "__vhorse__ Brush coat, mane and tail. Check for any mud or tangles." },
        { title: "Stable check", category: "care", description: "__vhorse__ Check stable for hazards, clean bedding, and safe environment." },
        { title: "Health observation", category: "care", description: "__vhorse__ Observe posture, eyes, and general demeanour for signs of health." },
        { title: "Water bucket refill", category: "feeding", description: "__vhorse__ Ensure fresh clean water is always available — refill if needed." },
        { title: "Hoof pick check", category: "care", description: "__vhorse__ Pick out all four hooves and check for stones or thrush." },
        { title: "Evening check-in", category: "care", description: "__vhorse__ Evening welfare check — rugging, feed, water, and stable security." },
      ],
      developing: [
        { title: "Tack cleaning", category: "grooming", description: "__vhorse__ Clean saddle, bridle, and stirrups after today's ride." },
        { title: "Pre-ride tack check", category: "care", description: "__vhorse__ Check girth, stirrups, and bridle fit before riding." },
        { title: "Post-ride care routine", category: "care", description: "__vhorse__ Cool down, wash off sweat marks, and check for rubs from tack." },
        { title: "Feed ration review", category: "feeding", description: "__vhorse__ Review today's feed ration — check quantity and fibre balance." },
        { title: "Turnout rug check", category: "care", description: "__vhorse__ Inspect rug for damage, correct fit, and cleanliness." },
        { title: "Revision: leg care", category: "study", description: "__vhorse__ Revise bandaging and leg checking techniques." },
        { title: "Groundwork exercise", category: "exercise", description: "__vhorse__ Practice leading, stopping and basic groundwork in a safe space." },
      ],
      intermediate: [
        { title: "Conditioning session", category: "exercise", description: "__vhorse__ Plan and carry out a structured conditioning ride or lunge." },
        { title: "Nutrition check", category: "feeding", description: "__vhorse__ Review forage and hard feed balance relative to workload." },
        { title: "Preventive health check", category: "care", description: "__vhorse__ Check legs for heat/swelling, teeth condition, and coat health." },
        { title: "Training log entry", category: "study", description: "__vhorse__ Record today's schooling session — goal, exercises, outcome." },
        { title: "Tack fit assessment", category: "care", description: "__vhorse__ Assess saddle and bridle fit — identify any rub points." },
        { title: "Stable enrichment", category: "care", description: "__vhorse__ Provide enrichment (forage net, mirror, safe toy) to reduce boredom." },
        { title: "Cool-down and stretch", category: "exercise", description: "__vhorse__ 15-minute walk cool-down after exercise — check respiration returns to normal." },
      ],
      advanced: [
        { title: "Performance analysis", category: "study", description: "__vhorse__ Analyse recent training session — identify 2 areas for improvement." },
        { title: "Competition preparation", category: "care", description: "__vhorse__ Prepare tack, plaiting plan, and travel kit for upcoming show." },
        { title: "Biomechanics check", category: "exercise", description: "__vhorse__ Assess straightness and suppleness in training — adjust as needed." },
        { title: "Feed programme review", category: "feeding", description: "__vhorse__ Review feed programme against current training load and body condition score." },
        { title: "Welfare audit", category: "care", description: "__vhorse__ Full welfare assessment — Five Domains model applied to your horse." },
        { title: "First aid kit check", category: "care", description: "__vhorse__ Check first aid kit contents and expiry dates are current." },
        { title: "Mentoring reflection", category: "study", description: "__vhorse__ Reflect on one piece of instructor/peer feedback and apply one change." },
      ],
    };

    const pool = TASK_POOLS[level] ?? TASK_POOLS.beginner;
    // Pick 3 varied tasks from the pool deterministically by weekday
    const dayOfWeek = new Date().getDay(); // 0-6
    const selected = [
      pool[dayOfWeek % pool.length],
      pool[(dayOfWeek + 2) % pool.length],
      pool[(dayOfWeek + 4) % pool.length],
    ].filter((t, i, arr) => arr.findIndex(x => x.title === t.title) === i); // deduplicate

    const inserted: typeof selected = [];
    for (const task of selected) {
      await dbConn.insert(studentTasks).values({
        userId: ctx.user.id,
        title: task.title,
        description: task.description,
        category: task.category as "care" | "grooming" | "feeding" | "study" | "exercise" | "other",
        frequency: "daily",
        targetDate: today as unknown as Date,
        isCompleted: false,
      });
      inserted.push(task);
    }

    return { generated: inserted.length, tasks: inserted };
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // STUDENT MESSAGING — Student side of teacher ↔ student messages
  // ═══════════════════════════════════════════════════════════════════════════

  /** Send a message to a teacher. */
  sendMessageToTeacher: studentProcedure
    .input(z.object({
      teacherId: z.number(),
      content: z.string().min(1).max(5000),
    }))
    .mutation(async ({ ctx, input }) => {
      const dbConn = await getDb();
      if (!dbConn) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      const [result] = await dbConn.insert(teacherStudentMessages).values({
        teacherId: input.teacherId,
        studentId: ctx.user.id,
        senderRole: "student",
        content: input.content,
      });
      return { id: result.insertId };
    }),

  /** Get messages between this student and a specific teacher. */
  getTeacherMessages: studentProcedure
    .input(z.object({ teacherId: z.number() }))
    .query(async ({ ctx, input }) => {
      const dbConn = await getDb();
      if (!dbConn) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      const msgs = await dbConn.select()
        .from(teacherStudentMessages)
        .where(and(
          eq(teacherStudentMessages.teacherId, input.teacherId),
          eq(teacherStudentMessages.studentId, ctx.user.id),
        ))
        .orderBy(teacherStudentMessages.createdAt);

      // Mark unread messages from teacher as read
      await dbConn.update(teacherStudentMessages)
        .set({ isRead: true })
        .where(and(
          eq(teacherStudentMessages.teacherId, input.teacherId),
          eq(teacherStudentMessages.studentId, ctx.user.id),
          eq(teacherStudentMessages.senderRole, "teacher"),
          eq(teacherStudentMessages.isRead, false),
        ));

      return msgs.map((m) => ({
        id: m.id,
        from: m.senderRole as "teacher" | "student",
        text: m.content,
        time: m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
        createdAt: m.createdAt,
      }));
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // STUDENT ASSIGNMENTS — View & submit assignments
  // ═══════════════════════════════════════════════════════════════════════════

  /** List assignments assigned to this student. */
  listMyAssignments: studentProcedure.query(async ({ ctx }) => {
    const dbConn = await getDb();
    if (!dbConn) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

    return dbConn.select({
      id: studentAssignments.id,
      teacherId: studentAssignments.teacherId,
      title: studentAssignments.title,
      description: studentAssignments.description,
      dueDate: studentAssignments.dueDate,
      status: studentAssignments.status,
      submissionUrl: studentAssignments.submissionUrl,
      submittedAt: studentAssignments.submittedAt,
      grade: studentAssignments.grade,
      feedback: studentAssignments.feedback,
      reviewedAt: studentAssignments.reviewedAt,
      createdAt: studentAssignments.createdAt,
      teacherName: users.name,
    })
      .from(studentAssignments)
      .leftJoin(users, eq(studentAssignments.teacherId, users.id))
      .where(eq(studentAssignments.studentId, ctx.user.id))
      .orderBy(desc(studentAssignments.createdAt));
  }),

  /** Submit work for an assignment. */
  submitAssignment: studentProcedure
    .input(z.object({
      assignmentId: z.number(),
      submissionUrl: z.string().min(1).max(1000),
    }))
    .mutation(async ({ ctx, input }) => {
      const dbConn = await getDb();
      if (!dbConn) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      // Verify this assignment belongs to the student
      const [assignment] = await dbConn.select()
        .from(studentAssignments)
        .where(and(
          eq(studentAssignments.id, input.assignmentId),
          eq(studentAssignments.studentId, ctx.user.id),
        ))
        .limit(1);

      if (!assignment) throw new TRPCError({ code: "NOT_FOUND", message: "Assignment not found" });
      if (assignment.status === "reviewed") throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Already reviewed" });

      await dbConn.update(studentAssignments)
        .set({
          submissionUrl: input.submissionUrl,
          submittedAt: new Date(),
          status: "submitted",
        })
        .where(eq(studentAssignments.id, input.assignmentId));

      return { success: true };
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // STUDENT RESOURCES — View shared resources from teachers
  // ═══════════════════════════════════════════════════════════════════════════

  /** List resources shared with this student. */
  listSharedResources: studentProcedure.query(async ({ ctx }) => {
    const dbConn = await getDb();
    if (!dbConn) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

    // Find groups this student is in
    const memberships = await dbConn.select({ groupId: studentGroupMembers.groupId })
      .from(studentGroupMembers)
      .where(eq(studentGroupMembers.studentUserId, ctx.user.id));
    const groupIds = memberships.map((m) => m.groupId);

    // Get resources shared with: all, this student specifically, or groups they're in
    const conditions = [
      eq(teacherResources.shareScope, "all"),
      and(eq(teacherResources.shareScope, "individual"), eq(teacherResources.studentId, ctx.user.id)),
    ];
    if (groupIds.length > 0) {
      conditions.push(
        and(eq(teacherResources.shareScope, "group"), inArray(teacherResources.groupId, groupIds)),
      );
    }

    return dbConn.select()
      .from(teacherResources)
      .where(or(...conditions))
      .orderBy(desc(teacherResources.createdAt));
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // STUDENT REPORTS — View reports sent by teachers
  // ═══════════════════════════════════════════════════════════════════════════

  /** List reports sent to this student. */
  listMyReports: studentProcedure.query(async ({ ctx }) => {
    const dbConn = await getDb();
    if (!dbConn) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

    return dbConn.select({
      id: studentReports.id,
      title: studentReports.title,
      reportData: studentReports.reportData,
      sentAt: studentReports.sentAt,
      createdAt: studentReports.createdAt,
      teacherName: users.name,
    })
      .from(studentReports)
      .leftJoin(users, eq(studentReports.teacherId, users.id))
      .where(eq(studentReports.studentId, ctx.user.id))
      .orderBy(desc(studentReports.createdAt));
  }),
});
