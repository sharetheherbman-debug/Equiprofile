// Copyright (c) 2025-2026 Amarktai Network. All rights reserved.
import { COOKIE_NAME } from "@shared/const";
import { normalizeImportedEmail } from "@shared/csvImport";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import {
  publicProcedure,
  protectedProcedure,
  adminUnlockedProcedure,
  router,
} from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";
import { invokeLLM, isAIConfigured } from "./_core/llm";
import { invalidateConfigCache, getRuntimeConfig } from "./dynamicConfig";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";
import * as fs from "fs";
import * as path from "path";
import {
  createCheckoutSession,
  createPortalSession,
  STRIPE_PRICING,
  PRICING_PLANS,
} from "./stripe";
import {
  exportHorsesCSV,
  exportHealthRecordsCSV,
  exportTrainingSessionsCSV,
  exportCompetitionsCSV,
  exportFeedCostsCSV,
  exportDocumentsCSV,
  generateCSVFilename,
  exportTasksCSV,
  exportAppointmentsCSV,
  exportContactsCSV,
} from "./csvExport";
import { eq, and, desc, sql, gte, lte, or, inArray } from "drizzle-orm";
import { getDb } from "./db";
import { ENV } from "./_core/env";
import { isWhatsAppEnabled } from "./_core/whatsapp";
import {
  stables,
  stableMembers,
  stableInvites,
  messageThreads,
  messages,
  reports,
  reportSchedules,
  events,
  competitions,
  trainingProgramTemplates,
  trainingPrograms,
  breeding,
  foals,
  trainingSessions,
  healthRecords,
  feedCosts,
  lessonBookings,
  trainerAvailability,
  horses,
  siteSettings,
  chatLeads,
  users,
  emailCampaigns,
  emailCampaignRecipients,
  siteAnalytics,
  marketingContacts,
  emailUnsubscribes,
  campaignSequences,
  campaignSequenceRecipients,
  campaignSendLog,
  campaignReplies,
  vaccinations,
  dewormings,
  treatments,
  appointments,
  documents,
  notes,
  shareLinks,
  growthQueueJobs,
} from "../drizzle/schema";
import {
  CAMPAIGN_TEMPLATES,
  getTemplateById,
  getSequenceTemplates,
  buildSequenceStepHtml,
  applyMergeFields,
} from "./_core/emailTemplates";
import { sendEmail, sendCampaignEmail, sendStableInviteEmail, sendCompensationEmail } from "./_core/email";
import { getLiveVisitorCount } from "./_core/analyticsTracker";
import { detectDuplicatePeople, DUP_THRESHOLD } from "./_core/dupPersonDetection";
import {
  aiApprovalQueue,
  executeAITask,
  getAIDiagnostics,
  getAgentTimelineForIntent,
  getCapabilityPlan,
  runFullProviderSelfTest,
  resolveMediaJobs,
} from "./_core/ai";
import type { AgentId, TenantScope } from "./_core/ai";
import { studentRouter } from "./studentRouter";
import { teacherRouter } from "./teacherRouter";
import { schoolRouter } from "./schoolRouter";
import {
  normalizeCountry,
  normalizeContactType,
  isValidEmail,
  parseCSV,
  autoMapColumns,
  mapRowToContact,
  getTodayDateString,
  DEFAULT_DAILY_LIMIT,
  MANAGEMENT_DAILY_LIMIT,
  ACADEMY_DAILY_LIMIT,
  NEW_OUTREACH_DAILY_CAP,
  TOTAL_MAILBOX_DAILY_CAP,
  NEW_OUTREACH_PER_WINDOW,
  SEND_WINDOWS,
  getNextSendWindow,
  isWeekday,
  isWithinSendHours,
  DEFAULT_FOLLOWUP_SCHEDULE,
  getScheduledDate,
  PRIORITY_COUNTRIES,
  validateContactCompliance,
  isDisposableEmail,
} from "./_core/campaignService";
import {
  ONBOARDING_TYPES,
  SOCIAL_CONNECTION_STATES,
  SOCIAL_PLATFORMS,
  QUICKSTART_TEMPLATES,
  connectSocialPlatform,
  createLifecycleRun,
  createReferralInvite,
  encryptGrowthSecret,
  getGrowthEngineAdminData,
  getGrowthEngineOverview,
  getOnboardingFlow,
  saveCrmContact,
  startOnboardingFlow,
  submitGrowthFeedback,
  trackGrowthFunnelEvent,
  // Update 1: Growth Engine Foundation Core
  getBrandProfile,
  upsertBrandProfile,
  buildBrandContextString,
  listBrandAvatars,
  getActiveBrandAvatar,
  createBrandAvatar,
  updateBrandAvatar,
  archiveBrandAvatar,
  buildAvatarPromptContext,
  listMediaAssetsForTenant,
  getMediaAssetById,
  getMediaAssetByJobId,
  createMediaAsset,
  updateMediaAsset,
  deleteMediaAsset,
  permanentDeleteMediaAsset as deleteMediaAssetRow,
  listPendingMediaAssets,
  getQueueStatus,
  seedPlatformStrategyRules,
  getPlatformStrategyRules,
  saveContentScore,
  scoreMarketingDraft,
  inferMarketingRequest,
  buildMarketingGenerationPrompt,
} from "./modules/growth-engine";
import { executeGenXTask, testRawGenXConnection, discoverGenXModelCatalogue } from "./_core/ai/providers/genxProvider";
import { testQwenTextGeneration } from "./_core/ai/providers/qwenProvider";
import { getHuggingFaceRoutingDiagnostics, resolveHuggingFaceTaskModel } from "./_core/ai/providers/huggingFaceProvider";
import { normalizeBaseUrl } from "./_core/ai/providers/httpUtils";
import { resolveModelCandidatesForTask } from "./_core/ai/modelRegistry";
import { normalizeProviderOutput, persistProviderOutput } from "./_core/ai/outputNormalization";
import { resolvePendingGenXMediaAssets } from "./_core/ai/mediaResolver";
import { getGenerationLifecycleByJobId } from "./_core/ai/generationLifecycle";
import { getProviderTelemetrySummary } from "./_core/ai/providerTelemetry";
import { getProviderDurationSupport, rankProvidersForTask } from "./_core/ai/providerRanking";
import { compileMarketingPrompt } from "./_core/marketing/promptCompiler";
import { getPreferredModelOrder } from "./_core/ai/modelQualityPolicy";
import { createBrandedMediaDerivative } from "./_core/media/postProcessor";
import { STORAGE_ROOT } from "./_core/storage/localMediaStorage";

// Allowed MIME types for document and avatar uploads
const ALLOWED_UPLOAD_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  // HEIC/HEIF — iPhone default photo format; converted to JPEG server-side
  "image/heic",
  "image/heif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
] as const;

const ALLOWED_AVATAR_MIME_PREFIXES = [
  "data:image/jpeg;base64,",
  "data:image/png;base64,",
  "data:image/webp;base64,",
  "data:image/gif;base64,",
] as const;

/** Maximum avatar file size in bytes (2 MB) */
const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024;

// Subscription check middleware
const subscribedProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const user = await db.getUserById(ctx.user.id);
  if (!user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "User not found" });
  }

  // Check if user is suspended
  if (user.isSuspended) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Your account has been suspended. Please contact support.",
    });
  }

  // Check trial expiry BEFORE status check — a "trial" status with a past
  // trialEndsAt must be rejected, not silently allowed.
  if (
    user.subscriptionStatus === "trial" &&
    user.trialEndsAt &&
    new Date(user.trialEndsAt) < new Date()
  ) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Your free trial has expired. Please subscribe to continue.",
    });
  }

  // Check per-user timed free access expiry.
  // If admin has granted free access with an expiry and it has passed, deny.
  const prefs = parseUserPrefs(user.preferences);
  if (prefs.freeAccess && prefs.freeAccessUntil) {
    const now = new Date();
    const expiryDate = new Date(prefs.freeAccessUntil);
    if (expiryDate < now) {
      // Free access period has ended — block access
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Your complimentary access period has ended. Please subscribe to continue.",
      });
    }
  }

  // Check subscription status
  const validStatuses = ["trial", "active"];
  if (!validStatuses.includes(user.subscriptionStatus)) {
    if (
      user.subscriptionStatus === "overdue" ||
      user.subscriptionStatus === "expired" ||
      user.subscriptionStatus === "cancelled"
    ) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Your subscription has expired. Please renew to continue.",
      });
    }
    // Any other unrecognised status — deny access
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Your subscription is not active. Please subscribe to continue.",
    });
  }

  return next({ ctx });
});

/** Safely parse user preferences JSON. Returns empty object on parse failure. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseUserPrefs(raw: string | null | undefined): Record<string, any> {
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

type PlanTier = "free" | "student" | "teacher" | "pro" | "stable" | "school_owner";
const VALID_PLAN_TIERS: readonly PlanTier[] = ["free", "student", "teacher", "pro", "stable", "school_owner"];

/**
 * Extract and validate planTier from parsed preferences.
 * Defaults to "pro" for backward-compatibility: existing users who subscribed
 * before the planTier field was introduced are on the Standard/Pro plan.
 */
function parsePlanTier(prefs: Record<string, unknown>): PlanTier {
  const raw = prefs.planTier;
  if (typeof raw === "string" && (VALID_PLAN_TIERS as readonly string[]).includes(raw)) {
    return raw as PlanTier;
  }
  return "pro";
}

/**
 * Stable-plan procedure — extends subscribedProcedure with a planTier check.
 * Only users whose planTier is "stable" (or who have bothDashboardsUnlocked)
 * may access breeding, stable management, staff, and messaging features.
 */
const stablePlanProcedure = subscribedProcedure.use(async ({ ctx, next }) => {
  const user = await db.getUserById(ctx.user.id);
  if (!user) {
    throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
  }
  const prefs = parseUserPrefs(
    typeof user.preferences === "string"
      ? user.preferences
      : JSON.stringify(user.preferences ?? {}),
  );
  if (prefs.planTier !== "stable" && !prefs.bothDashboardsUnlocked) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "This feature requires the Stable plan. Please upgrade to continue.",
    });
  }
  return next({ ctx });
});

/** Format a date in en-GB style: "4 April 2026" */
function formatDateGB(d: Date = new Date()): string {
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Extract first name from a full name string */
function extractFirstName(name: string | null | undefined): string {
  return name?.split(" ")[0] || "there";
}

// Day-of-week offset map used by applyTemplate to schedule calendar events
const TRAINING_DAY_OFFSET: Record<string, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

// Maximum number of weeks to schedule when applying a template
// Limited to prevent excessive database operations and ensure reasonable initial load
const MAX_WEEKS_TO_SCHEDULE = 4;

// Default duration for training sessions when not specified in template
const DEFAULT_SESSION_DURATION_MINUTES = 30;

// Session type mapping: template type → trainingSessions sessionType
function mapTemplateSessionType(type: string): "flatwork" | "jumping" | "hacking" | "lunging" | "groundwork" | "competition" | "lesson" | "other" {
  const lowerType = type.toLowerCase();
  if (lowerType === "flatwork") return "flatwork";
  if (lowerType === "jumping") return "jumping";
  if (lowerType === "hack" || lowerType === "hacking") return "hacking";
  if (lowerType === "groundwork") return "groundwork";
  if (lowerType === "lunging") return "lunging";
  if (lowerType === "walk") return "hacking"; // walking is a form of hacking
  return "other";
}

const MARKETING_PLATFORMS = [
  "Facebook",
  "Instagram",
  "TikTok",
  "YouTube",
  "LinkedIn",
  "Google Business",
  "Email",
] as const;

const MARKETING_FORMATS = [
  "post",
  "reel",
  "short",
  "email",
  "carousel",
  "image",
  "video",
  "avatar video",
] as const;

const MARKETING_GOALS = [
  "signups",
  "stable owners",
  "schools",
  "academy",
  "retention",
  "announcement",
] as const;

const MARKETING_TONES = [
  "professional",
  "friendly",
  "premium",
  "educational",
  "urgent",
  "warm",
] as const;

function parseJsonSafe<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string") return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function normalizeProviderError(error: unknown): { providerMissing: boolean; message: string } {
  const providerError = error as any;
  if (providerError?.name === "ProviderSelectionError") {
    if (providerError.code === "provider_missing") {
      return {
        providerMissing: true,
        message: "AI provider unavailable. Check provider settings.",
      };
    }
    return {
      providerMissing: false,
      message: "AI provider unavailable. Check provider settings.",
    };
  }
  const message = error instanceof Error ? error.message : String(error);
  if (/provider network fetch failed|request timed out|dns\/network resolution failed|connection refused|all configured providers failed/i.test(message)) {
    return {
      providerMissing: false,
      message: "AI provider unavailable. Check provider settings.",
    };
  }
  return {
    providerMissing:
      /not configured|missing\s+genx_api_key|missing\s+huggingface_api_key|missing\s+qwen_api_key|provider key missing/i.test(
        message,
      ),
    message: /not configured|missing\s+genx_api_key|missing\s+huggingface_api_key|missing\s+qwen_api_key|provider key missing/i.test(
      message,
    )
      ? "AI provider unavailable. Check provider settings."
      : message,
  };
}

async function canProducePlayableMedia(task: "text_to_image" | "image_edit" | "image_to_video" | "text_to_video" | "avatar_video" | "text_to_speech"): Promise<boolean> {
  const candidates = await resolveModelCandidatesForTask(task);
  if (!candidates.length) return false;
  const configuredProviders = await Promise.all(candidates.map(async (candidate) => ({
    provider: candidate.provider,
    configured:
      candidate.provider === "genx"
        ? !!(await getRuntimeConfig("genx_api_key", "GENX_API_KEY"))
        : candidate.provider === "huggingface"
          ? !!(await getRuntimeConfig("huggingface_api_key", "HUGGINGFACE_API_KEY"))
          : !!(await getRuntimeConfig("qwen_api_key", "QWEN_API_KEY")),
  })));
  return configuredProviders.some((candidate) => candidate.configured);
}

async function getMediaCapabilityTruth(task: "text_to_image" | "image_edit" | "image_to_video" | "text_to_video" | "avatar_video" | "text_to_speech") {
  const candidates = await resolveModelCandidatesForTask(task);
  if (!candidates.length) {
    const genxConfigured = !!(await getRuntimeConfig("genx_api_key", "GENX_API_KEY"));
    return {
      status: "model_config_missing" as const,
      userMessage: genxConfigured
      ? `GenX key is configured, but no ${task}-capable model was found. Configure ${task === "text_to_video" || task === "image_to_video" ? "genx_video_model" : task === "text_to_image" || task === "image_edit" ? "genx_image_model" : task === "avatar_video" ? "genx_avatar_model" : "genx_voice_model/genx_audio_model"} or confirm GenX model metadata.`
        : "Media setup needed. No provider/model is currently executable for this media task.",
      candidates: [],
    };
  }
  const configured = [];
  for (const candidate of candidates) {
    const keyConfigured = candidate.provider === "genx"
      ? !!(await getRuntimeConfig("genx_api_key", "GENX_API_KEY"))
      : candidate.provider === "huggingface"
        ? !!(await getRuntimeConfig("huggingface_api_key", "HUGGINGFACE_API_KEY"))
        : !!(await getRuntimeConfig("qwen_api_key", "QWEN_API_KEY"));
    if (keyConfigured) configured.push(candidate);
  }
  if (!configured.length) {
    const providerHints = Array.from(new Set(candidates.map((candidate) => candidate.provider)));
    return {
      status: "provider_config_missing" as const,
      userMessage: `Media setup needed. Add a key for ${providerHints.join(", ")} before generating playable media.`,
      candidates,
    };
  }

  return {
    status: "working_real_asset" as const,
    userMessage: "Media provider/model is configured. Generated assets will be queued and only shown when a real file, URL, or valid provider job exists.",
    candidates: configured,
    selectedProvider: configured[0].provider,
    selectedModel: configured[0].id,
    routeReason: configured[0].routeReason,
  };
}

function extractOutputText(output: unknown): string {
  if (typeof output === "string") return output;
  if (!output || typeof output !== "object") return "";
  const payload = output as any;
  const choiceText = payload?.choices?.[0]?.message?.content;
  if (typeof choiceText === "string" && choiceText.trim()) return choiceText;
  if (payload?.choices?.[0]?.finish_reason === "length" && !choiceText) return "";
  const generatedText = payload?.[0]?.generated_text;
  if (typeof generatedText === "string" && generatedText.trim()) return generatedText;
  const text = payload?.text;
  if (typeof text === "string" && text.trim()) return text;
  return "";
}

function inferMediaTaskFromMarketingInput(input: string): "text_to_image" | "text_to_video" | "avatar_video" | "text_to_speech" | null {
  const value = input.toLowerCase();
  if (/\b(avatar|presenter|talking head)\b/.test(value) && /\b(video|clip|reel|short)\b/.test(value)) return "avatar_video";
  if (/\b(video|reel|short|youtube short|tiktok|facebook video|instagram reel|clip)\b/.test(value)) return "text_to_video";
  if (/\b(voice|voiceover|audio|narration|speech)\b/.test(value)) return "text_to_speech";
  if (/\b(image|poster|graphic|ad creative|visual|thumbnail)\b/.test(value)) return "text_to_image";
  return null;
}

function mediaTypeFromAdminTask(task: "text_to_image" | "image_edit" | "image_to_video" | "text_to_video" | "avatar_video" | "text_to_speech"): "image" | "video" | "avatar" | "voice" {
  if (task === "text_to_image" || task === "image_edit") return "image";
  if (task === "text_to_speech") return "voice";
  if (task === "avatar_video") return "avatar";
  return "video";
}

function buildScenePipelinePlan(prompt: string, requestedDurationSeconds: number, maxClipDurationSeconds: number) {
  const sceneCount = Math.max(2, Math.ceil(requestedDurationSeconds / maxClipDurationSeconds));
  const baseSceneDuration = Math.max(5, Math.floor(requestedDurationSeconds / sceneCount));
  const scenes = Array.from({ length: sceneCount }, (_, index) => ({
    scene: index + 1,
    durationSeconds: index === sceneCount - 1
      ? requestedDurationSeconds - baseSceneDuration * index
      : baseSceneDuration,
    renderTask: "text_to_video",
    renderStatus: "planned" as const,
    promptFocus: index === 0
      ? "hook and establishing cinematic scene"
      : index === sceneCount - 1
        ? "closing scene with CTA-safe framing"
        : "benefit-focused transition scene",
  }));
  return {
    script: `Narrative script required for ${requestedDurationSeconds}s delivery based on: ${prompt}`,
    scenes,
    requiredRenders: scenes.length,
    narrationPlan: "Generate narration per scene, then mix in assembly stage.",
    subtitlePlan: "Generate subtitles from narration transcript after scene renders complete.",
    assemblyPlan: "Stitch rendered scenes, apply transitions, overlays, subtitles, and audio mastering in post-processing.",
  };
}

function extractJsonBlock(text: string): Record<string, unknown> | null {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i)?.[1];
  if (fenced) {
    try {
      return JSON.parse(fenced);
    } catch {
      return null;
    }
  }
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first >= 0 && last > first) {
    const raw = text.slice(first, last + 1);
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return null;
}

function buildMarketingDraftContent(input: {
  prompt: string;
  platform: (typeof MARKETING_PLATFORMS)[number];
  format: (typeof MARKETING_FORMATS)[number];
  goal: (typeof MARKETING_GOALS)[number];
  tone: (typeof MARKETING_TONES)[number];
  durationSeconds?: number | null;
  intent?: string;
  providerText: string;
}): Record<string, unknown> {
  const parsed = extractJsonBlock(input.providerText);
  if (parsed && parsed.title && parsed.script) {
    const visualDirection = parsed.visualDirection ?? parsed.imagePrompt ?? "";
    const mediaPlan = parsed.mediaPlan ?? parsed.videoPrompt ?? parsed.avatarScript ?? "";
    const voiceoverScript = parsed.voiceoverScript ?? parsed.avatarScript ?? parsed.script ?? "";
    const recommendedSchedule = parsed.recommendedSchedule ?? "Weekday morning or early evening after approval.";
    const nextActions = Array.isArray(parsed.nextActions)
      ? parsed.nextActions
      : ["Review copy", "Generate media if configured", "Send to approval", "Schedule"];
    return {
      title: parsed.title,
      platform: parsed.platform ?? input.platform,
      format: parsed.format ?? input.format,
      durationSeconds: parsed.durationSeconds ?? input.durationSeconds ?? null,
      audience: parsed.audience ?? "",
      goal: parsed.goal ?? input.goal,
      strategy: parsed.strategy ?? "",
      hook: parsed.hook ?? "",
      script: parsed.script,
      shotList: parsed.shotList ?? [],
      storyboard: parsed.storyboard ?? parsed.shotList ?? [],
      caption: parsed.caption ?? "",
      cta: parsed.cta ?? "",
      hashtags: parsed.hashtags ?? [],
      imagePrompt: parsed.imagePrompt ?? visualDirection,
      videoPrompt: parsed.videoPrompt ?? mediaPlan,
      avatarScript: parsed.avatarScript ?? voiceoverScript,
      visualDirection,
      voiceoverScript,
      recommendedSchedule,
      complianceNotes: parsed.complianceNotes ?? "",
      growthScore: parsed.growthScore ?? null,
      mediaPlan,
      nextActions,
      approvalStatus: "draft",
      tone: input.tone,
      intent: input.intent ?? "",
    };
  }
  const fallbackShotList = [
    "Open on a busy stable yard moment with records, reminders or staff coordination pressure.",
    "Show the problem clearly: missed notes, scattered messages or time lost chasing updates.",
    "Cut to EquiProfile organising records, tasks, reminders and care workflows.",
    "Close with a calm CTA to start a free trial.",
  ];
  const fallbackVoiceover = input.providerText || input.prompt;
  const fallbackMediaPlan = `${input.durationSeconds ?? 30}-second ${input.platform} ${input.format} storyboard and prompt-only media direction. Playable media requires a configured media provider.`;
  return {
    title: `${input.platform} ${input.format} draft`,
    platform: input.platform,
    format: input.format,
    durationSeconds: input.durationSeconds ?? null,
    audience: "",
    goal: input.goal,
    strategy: `Use a ${input.tone}, practical message for ${input.goal}. Lead with the operational pain stable owners feel every week, then position EquiProfile as the simple next step.`,
    hook: `Still running your stable from notes, messages and memory?`,
    script: fallbackVoiceover,
    shotList: fallbackShotList,
    storyboard: fallbackShotList,
    caption: `EquiProfile helps ${input.goal === "stable owners" ? "stable owners" : "equestrian teams"} keep horse records, reminders and daily work in one professional system.`,
    cta: "Start your EquiProfile trial",
    hashtags: ["#EquiProfile", "#StableManagement", "#EquestrianBusiness"],
    imagePrompt: `Premium SaaS-style visual for ${input.platform}: UK stable owner organising horse care records with EquiProfile, clean realistic stable setting.`,
    videoPrompt: `${input.durationSeconds ?? 30}-second ${input.platform} ${input.format}: problem, product workflow, benefit, trial CTA for UK stable owners.`,
    avatarScript: fallbackVoiceover,
    visualDirection: `Premium SaaS-style visual for ${input.platform}: UK stable owner organising horse care records with EquiProfile, clean realistic stable setting.`,
    voiceoverScript: fallbackVoiceover,
    recommendedSchedule: "Weekday morning or early evening after approval.",
    complianceNotes: "Approval required before scheduling.",
    growthScore: null,
    mediaPlan: fallbackMediaPlan,
    nextActions: ["Review the draft", "Generate media if configured", "Send to approval", "Schedule after approval"],
    approvalStatus: "draft",
    tone: input.tone,
    intent: input.intent ?? "",
  };
}

const PROVIDER_BASE_URL_SETTING_KEYS = new Set(["genx_base_url", "qwen_base_url"]);
const PROVIDER_MODEL_SETTING_KEYS = new Set([
  "genx_model",
  "genx_default_model",
  "genx_text_model",
  "genx_strategy_model",
  "genx_image_model",
  "genx_video_model",
  "genx_avatar_model",
  "genx_voice_model",
  "genx_audio_model",
  "genx_tts_model",
  "genx_vision_model",
  "qwen_model",
  "qwen_text_model",
  "qwen_vision_model",
  "dashscope_wan_text_to_video_model",
  "dashscope_wan_image_to_video_model",
  "dashscope_image_model",
  "dashscope_audio_model",
  "qwen_image_model",
  "qwen_video_model",
  "qwen_audio_model",
  "qwen_embedding_model",
  "hf_use_default_text_generation",
  "hf_use_default_text_to_image",
  "hf_use_default_text_to_video",
  "hf_use_default_text_to_speech",
  "hf_use_default_automatic_speech_recognition",
  "hf_use_default_image_to_text",
  "hf_use_default_feature_extraction",
  "hf_use_default_text_classification",
  "hf_use_default_zero_shot_classification",
  "hf_task_text_generation_model",
  "hf_task_text_generation_models",
  "hf_task_text_generation_fallbacks",
  "hf_task_text_to_image_fallbacks",
  "hf_task_text_to_video_fallbacks",
  "hf_task_text_to_speech_fallbacks",
  "hf_task_automatic_speech_recognition_model",
  "hf_task_automatic_speech_recognition_models",
  "hf_task_automatic_speech_recognition_fallbacks",
  "hf_task_image_to_text_model",
  "hf_task_image_to_text_models",
  "hf_task_image_to_text_fallbacks",
  "hf_task_feature_extraction_model",
  "hf_task_feature_extraction_models",
  "hf_task_feature_extraction_fallbacks",
  "hf_task_text_classification_model",
  "hf_task_text_classification_models",
  "hf_task_text_classification_fallbacks",
  "hf_task_zero_shot_classification_model",
  "hf_task_zero_shot_classification_models",
  "hf_task_zero_shot_classification_fallbacks",
  "hf_task_text_to_image_model",
  "hf_task_text_to_image_models",
  "hf_task_text_to_video_model",
  "hf_task_text_to_video_models",
  "hf_task_image_to_video_model",
  "hf_task_image_to_video_models",
  "hf_task_avatar_video_model",
  "hf_task_avatar_video_models",
  "hf_task_text_to_speech_model",
  "hf_task_text_to_speech_models",
  "hf_task_speech_to_text_model",
  "hf_task_speech_to_text_models",
  "hf_task_image_captioning_model",
  "hf_task_image_captioning_models",
  "hf_task_embeddings_model",
  "hf_task_embeddings_models",
  "hf_task_moderation_model",
  "hf_task_moderation_models",
  "hf_task_classification_model",
  "hf_task_classification_models",
  "hf_task_copywriting_model",
  "hf_task_copywriting_models",
  "hf_task_chat_model",
  "hf_task_chat_models",
]);
const PROVIDER_SECRET_SETTING_KEYS = new Set([
  "genx_api_key",
  "huggingface_api_key",
  "qwen_api_key",
  "marketing_genx_api_key",
  "marketing_huggingface_api_key",
  "marketing_qwen_api_key",
  "marketing_pexels_api_key",
  "marketing_pixabay_api_key",
  "equiprofile_ai_genx_api_key",
]);

const MARKETING_PROVIDER_KEY_ALIASES = {
  genx: ["marketing_genx_api_key", "genx_api_key"] as const,
  huggingface: ["marketing_huggingface_api_key", "huggingface_api_key"] as const,
  qwen: ["marketing_qwen_api_key", "qwen_api_key"] as const,
  pexels: ["marketing_pexels_api_key"] as const,
  pixabay: ["marketing_pixabay_api_key"] as const,
} as const;

const MARKETING_PROVIDER_SAVE_KEY_MAP: Record<string, string> = {
  genx_api_key: "marketing_genx_api_key",
  qwen_api_key: "marketing_qwen_api_key",
  huggingface_api_key: "marketing_huggingface_api_key",
  marketing_genx_api_key: "marketing_genx_api_key",
  marketing_qwen_api_key: "marketing_qwen_api_key",
  marketing_huggingface_api_key: "marketing_huggingface_api_key",
  marketing_pexels_api_key: "marketing_pexels_api_key",
  marketing_pixabay_api_key: "marketing_pixabay_api_key",
};

function pickSettingValue(stored: Record<string, string>, keys: readonly string[], envKey?: string) {
  for (const key of keys) {
    const value = stored[key];
    if (value) return value;
  }
  return envKey ? process.env[envKey] || "" : "";
}

function toSafeLocalMediaPathFromPublicUrl(publicUrl: string): string | null {
  const normalized = publicUrl.trim();
  if (!normalized.startsWith("/media/generated/")) return null;
  const suffix = normalized.slice("/media/generated/".length).replace(/\\/g, "/");
  if (!suffix || suffix.includes("..")) return null;
  const resolved = path.resolve(STORAGE_ROOT, suffix);
  const generatedRoot = path.resolve(STORAGE_ROOT, "generated");
  if (!resolved.startsWith(generatedRoot + path.sep) && resolved !== generatedRoot) return null;
  return resolved;
}

function maskProviderSecret(value: string): string {
  if (!value) return "";
  const visible = Math.min(8, Math.max(4, Math.floor(value.length / 4)));
  return `${value.slice(0, visible)}••••••••`;
}

function normalizeSiteSettingValue(key: string, value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";

  if (PROVIDER_BASE_URL_SETTING_KEYS.has(key)) {
    let parsed: URL;
    try {
      parsed = new URL(trimmed);
    } catch {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `${key} must be a valid http(s) URL.`,
      });
    }
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `${key} must use http or https.`,
      });
    }
    return normalizeBaseUrl(parsed.toString(), "/v1");
  }

  if (PROVIDER_MODEL_SETTING_KEYS.has(key) || PROVIDER_SECRET_SETTING_KEYS.has(key)) {
    return trimmed;
  }

  return value;
}

export const appRouter = router({
  system: systemRouter,
  student: studentRouter,
  teacher: teacherRouter,
  school: schoolRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, cookieOptions);
      return { success: true } as const;
    }),
  }),

  // Admin unlock system
  adminUnlock: router({
    // Check if admin mode is unlocked
    getStatus: protectedProcedure.query(async ({ ctx }) => {
      const session = await db.getAdminSession(ctx.user.id);
      return {
        isUnlocked: session ? session.expiresAt > new Date() : false,
        expiresAt: session?.expiresAt,
      };
    }),

    // Initiate unlock (returns challenge)
    requestUnlock: protectedProcedure.mutation(async ({ ctx }) => {
      // Primary admin always gets access
      if (ENV.primaryAdminEmail && ctx.user.email === ENV.primaryAdminEmail) {
        return {
          challenge: "Admin mode requires password. Enter password:",
          attemptsRemaining: 10,
        };
      }

      // Check rate limit
      const attempts = await db.getUnlockAttempts(ctx.user.id);
      if (attempts >= 10) {
        const lockedUntil = await db.getUnlockLockoutTime(ctx.user.id);
        if (lockedUntil && lockedUntil > new Date()) {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: `Too many attempts. Try again after ${lockedUntil.toISOString()}`,
          });
        }
      }

      return {
        challenge: "Admin mode requires password. Enter password:",
        attemptsRemaining: Math.max(0, 10 - attempts),
      };
    }),

    // Submit password
    submitPassword: protectedProcedure
      .input(z.object({ password: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const isPrimaryAdmin = ENV.primaryAdminEmail ? ctx.user.email === ENV.primaryAdminEmail : false;
        const adminPassword = process.env.ADMIN_UNLOCK_PASSWORD;

        if (!adminPassword) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message:
              "Admin password not configured. Set ADMIN_UNLOCK_PASSWORD in environment.",
          });
        }

        // Check rate limit (skip for primary admin)
        if (!isPrimaryAdmin) {
          const attempts = await db.incrementUnlockAttempts(ctx.user.id);
          if (attempts > 10) {
            await db.setUnlockLockout(ctx.user.id, 15); // 15 minutes
            throw new TRPCError({
              code: "TOO_MANY_REQUESTS",
              message: "Too many attempts. Account locked for 15 minutes.",
            });
          }
        }

        // Use constant-time comparison to prevent timing attacks
        const bcrypt = await import("bcrypt");
        let isValid = false;

        // Support both bcrypt hash and plaintext (bcrypt hash recommended)
        if (
          adminPassword.startsWith("$2a$") ||
          adminPassword.startsWith("$2b$")
        ) {
          // It's a bcrypt hash
          isValid = await bcrypt.compare(input.password, adminPassword);
        } else {
          // It's plaintext – allow but warn
          console.warn(
            "⚠️  WARNING: ADMIN_UNLOCK_PASSWORD is stored in plaintext. " +
              "Run: node dist/cli.js set-admin-password  to store a bcrypt hash instead.",
          );
          isValid = input.password === adminPassword;
        }

        if (!isValid) {
          await db.logActivity({
            userId: ctx.user!.id,
            action: "admin_unlock_failed",
            entityType: "system",
            details: JSON.stringify({
              attempts: isPrimaryAdmin ? "N/A" : "tracked",
            }),
          });
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Incorrect password",
          });
        }

        // Success - create session (8 hours for primary admin, 2 hours for others)
        const sessionDuration = isPrimaryAdmin
          ? 8 * 60 * 60 * 1000 // 8 hours
          : 2 * 60 * 60 * 1000; // 2 hours
        const expiresAt = new Date(Date.now() + sessionDuration);
        await db.createAdminSession(ctx.user.id, expiresAt);
        if (!isPrimaryAdmin) {
          await db.resetUnlockAttempts(ctx.user.id);
        }

        await db.logActivity({
          userId: ctx.user!.id,
          action: "admin_unlocked",
          entityType: "system",
          details: JSON.stringify({ expiresAt }),
        });

        return { success: true, expiresAt };
      }),

    // Revoke admin session
    lock: protectedProcedure.mutation(async ({ ctx }) => {
      await db.revokeAdminSession(ctx.user.id);
      return { success: true };
    }),
  }),

  // AI chat
  ai: router({
    chat: subscribedProcedure
      .input(
        z.object({
          messages: z.array(
            z.object({
              role: z.enum(["system", "user", "assistant"]),
              content: z.string(),
            }),
          ),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const userMessage = input.messages[input.messages.length - 1]?.content
          .toLowerCase()
          .trim();

        // Check for admin unlock command
        if (userMessage === "show admin") {
          // Check if user has admin role
          if (ctx.user.role !== "admin") {
            return {
              role: "assistant" as const,
              content: "You do not have admin privileges.",
            };
          }

          // Check current session
          const session = await db.getAdminSession(ctx.user.id);
          if (session && session.expiresAt > new Date()) {
            return {
              role: "assistant" as const,
              content: `Admin mode is already unlocked. Session expires at ${session.expiresAt.toLocaleString()}.`,
            };
          }

          // Return password challenge
          return {
            role: "assistant" as const,
            content:
              "🔐 **Admin Mode**\n\nPlease enter the admin password to unlock admin features.",
            metadata: { adminChallenge: true },
          };
        }

        // Normal AI chat processing
        if (!(await isAIConfigured())) {
          return {
            role: "assistant" as const,
            content:
              "⚠️ AI assistant is not yet configured. Please set GENX_API_KEY (or a Hugging Face key) in the server environment to enable AI features.",
          };
        }

        try {
          const response = await invokeLLM({
            messages: input.messages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
          });

          return {
            role: "assistant" as const,
            content: response.choices[0]?.message?.content || "No response",
          };
        } catch (err: any) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message:
              err?.message ||
              "The AI service encountered an error. Please try again.",
          });
        }
      }),
  }),

  // Billing and subscription management
  billing: router({
    getPricing: publicProcedure.query(() => {
      // Always return pricing data so the UI never shows £0.
      // When Stripe is disabled, fall back to the hard-coded GBP defaults.
      if (!ENV.enableStripe) {
        console.info(
          "[Pricing] Stripe disabled – returning default GBP prices (£10/£100 Individual, £30/£300 Stable)",
        );
      }

      return {
        enabled: ENV.enableStripe,
        trial: {
          name: PRICING_PLANS.trial.name,
          horses: PRICING_PLANS.trial.horses,
          price: PRICING_PLANS.trial.price,
          currency: PRICING_PLANS.trial.currency,
          interval: PRICING_PLANS.trial.interval,
          duration: PRICING_PLANS.trial.duration,
          features: PRICING_PLANS.trial.features,
        },
        pro: {
          name: PRICING_PLANS.pro.name,
          horses: PRICING_PLANS.pro.horses,
          monthly: {
            amount: PRICING_PLANS.pro.monthly.amount,
            currency: PRICING_PLANS.pro.monthly.currency,
            interval: PRICING_PLANS.pro.monthly.interval,
          },
          yearly: {
            amount: PRICING_PLANS.pro.yearly.amount,
            currency: PRICING_PLANS.pro.yearly.currency,
            interval: PRICING_PLANS.pro.yearly.interval,
          },
          features: PRICING_PLANS.pro.features,
        },
        stable: {
          name: PRICING_PLANS.stable.name,
          horses: PRICING_PLANS.stable.horses,
          monthly: {
            amount: PRICING_PLANS.stable.monthly.amount,
            currency: PRICING_PLANS.stable.monthly.currency,
            interval: PRICING_PLANS.stable.monthly.interval,
          },
          yearly: {
            amount: PRICING_PLANS.stable.yearly.amount,
            currency: PRICING_PLANS.stable.yearly.currency,
            interval: PRICING_PLANS.stable.yearly.interval,
          },
          features: PRICING_PLANS.stable.features,
        },
      };
    }),

    createCheckout: protectedProcedure
      .input(
        z.object({
          plan: z.enum(["student", "pro", "stable", "school_10", "school_20", "school_50"]).default("pro"),
          interval: z.enum(["monthly", "yearly"]).default("monthly"),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        // Check if billing is enabled
        if (!ENV.enableStripe) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Billing is disabled",
          });
        }

        const user = await db.getUserById(ctx.user.id);
        if (!user) {
          throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
        }

        const planConfig = PRICING_PLANS[input.plan as keyof typeof PRICING_PLANS];
        if (!planConfig || !("monthly" in planConfig)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid plan selected",
          });
        }

        // The "monthly" in planConfig check above guarantees planConfig has monthly/yearly
        const billingConfig = planConfig as { monthly: { priceId: string }; yearly: { priceId: string } };
        const priceId =
          input.interval === "yearly"
            ? billingConfig.yearly.priceId
            : billingConfig.monthly.priceId;

        if (!priceId) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Stripe price ID not configured for this plan",
          });
        }

        const protocol = ctx.req.protocol || "https";
        const host = ctx.req.headers.host || "equiprofile.online";
        const baseUrl = `${protocol}://${host}`;

        const session = await createCheckoutSession(
          user.id,
          user.email || "",
          priceId,
          `${baseUrl}/billing?success=true`,
          `${baseUrl}/pricing?cancelled=true`,
          user.stripeCustomerId || undefined,
        );

        if (!session) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create checkout session",
          });
        }

        return { url: session.url };
      }),

    createPortal: protectedProcedure.mutation(async ({ ctx }) => {
      // Check if billing is enabled
      if (!ENV.enableStripe) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Billing is disabled",
        });
      }

      const user = await db.getUserById(ctx.user.id);
      if (!user || !user.stripeCustomerId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active subscription found",
        });
      }

      const protocol = ctx.req.protocol || "https";
      const host = ctx.req.headers.host || "equiprofile.online";
      const baseUrl = `${protocol}://${host}`;

      const portalUrl = await createPortalSession(
        user.stripeCustomerId,
        `${baseUrl}/dashboard`,
      );

      if (!portalUrl) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create portal session",
        });
      }

      return { url: portalUrl };
    }),

    getStatus: protectedProcedure.query(async ({ ctx }) => {
      const user = await db.getUserById(ctx.user.id);
      if (!user) return null;

      const prefs = parseUserPrefs(user.preferences);
      return {
        status: user.subscriptionStatus,
        plan: user.subscriptionPlan,
        planTier: parsePlanTier(prefs),
        trialEndsAt: user.trialEndsAt,
        subscriptionEndsAt: user.subscriptionEndsAt,
        lastPaymentAt: user.lastPaymentAt,
        hasActiveSubscription: ["trial", "active"].includes(
          user.subscriptionStatus,
        ),
      };
    }),
  }),

  // User profile and subscription
  user: router({
    getProfile: protectedProcedure.query(async ({ ctx }) => {
      const user = await db.getUserById(ctx.user.id);
      return user;
    }),

    updateProfile: protectedProcedure
      .input(
        z.object({
          name: z.string().max(500).optional(),
          phone: z.string().max(50).optional(),
          location: z.string().max(500).optional(),
          profileImageUrl: z.string().max(2000).optional(),
          avatarData: z.string().optional(), // base64-encoded image for upload
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const { avatarData, ...profileFields } = input;

        // If base64 avatar data provided, upload it and store the URL
        if (avatarData) {
          const prefix = ALLOWED_AVATAR_MIME_PREFIXES.find((p) =>
            avatarData.startsWith(p),
          );
          if (!prefix) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Avatar must be a JPEG, PNG, WebP or GIF image",
            });
          }
          const mimeType = prefix.split(";")[0].replace("data:", "");
          const base64Data = avatarData.slice(prefix.length);
          const buffer = Buffer.from(base64Data, "base64");
          if (buffer.length > MAX_AVATAR_SIZE_BYTES) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Avatar image must be under 2MB",
            });
          }
          const ext = mimeType.split("/")[1];
          const fileKey = `${ctx.user.id}/avatars/${nanoid()}.${ext}`;
          try {
            const { url } = await storagePut(fileKey, buffer, mimeType);
            profileFields.profileImageUrl = url;
          } catch (err) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message:
                "Failed to upload profile picture. Please try again or use a smaller image.",
              cause: err,
            });
          }
        }

        await db.updateUser(ctx.user.id, profileFields);
        try {
          await db.logActivity({
            userId: ctx.user!.id,
            action: "profile_updated",
            entityType: "user",
            entityId: ctx.user.id,
            details: JSON.stringify({ updatedFields: Object.keys(profileFields) }),
          });
        } catch {
          // Activity logging failure must not block the profile update response
        }
        return { success: true };
      }),

    updateNotificationPreferences: protectedProcedure
      .input(
        z.object({
          emailNotifications: z.boolean().optional(),
          healthReminders: z.boolean().optional(),
          trainingReminders: z.boolean().optional(),
          feedingReminders: z.boolean().optional(),
          weatherAlerts: z.boolean().optional(),
          weeklyDigest: z.boolean().optional(),
          trainingCalendarIntegration: z.boolean().optional(),
          // WhatsApp notification number (user's own mobile number in E.164 format)
          whatsappPhone: z.string().max(20).optional().nullable(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        // Persist notification prefs in the user's JSON preferences field
        const user = await db.getUserById(ctx.user.id);
        const existing = parseUserPrefs(user?.preferences);
        const { whatsappPhone, ...toggles } = input;
        const updated = {
          ...existing,
          notifications: { ...existing.notifications, ...toggles },
          // Store WhatsApp phone at top level of prefs (not nested in notifications)
          ...(whatsappPhone !== undefined ? { whatsappPhone: whatsappPhone || null } : {}),
        };
        await db.updateUser(ctx.user.id, {
          preferences: JSON.stringify(updated),
        });
        return { success: true };
      }),

    getNotificationPreferences: protectedProcedure.query(async ({ ctx }) => {
      const user = await db.getUserById(ctx.user.id);
      const existing = parseUserPrefs(user?.preferences);
      const defaults = {
        emailNotifications: true,
        healthReminders: true,
        trainingReminders: true,
        feedingReminders: true,
        weatherAlerts: true,
        weeklyDigest: true,
        trainingCalendarIntegration: false,
        whatsappPhone: null as string | null,
      };
      return {
        ...defaults,
        ...existing.notifications,
        whatsappPhone: (existing as any).whatsappPhone ?? null,
      };
    }),

    getSubscriptionStatus: protectedProcedure.query(async ({ ctx }) => {
      const user = await db.getUserById(ctx.user.id);
      if (!user) return null;

      // Determine plan tier from preferences (set at checkout)
      const prefs = parseUserPrefs(user.preferences);
      const planTier: PlanTier = parsePlanTier(prefs);

      return {
        status: user.subscriptionStatus,
        plan: user.subscriptionPlan,
        planTier,
        freeAccess: !!prefs.freeAccess,
        bothDashboardsUnlocked: !!prefs.bothDashboardsUnlocked,
        trialEndsAt: user.trialEndsAt,
        subscriptionEndsAt: user.subscriptionEndsAt,
        lastPaymentAt: user.lastPaymentAt,
      };
    }),

    getDashboardStats: subscribedProcedure.query(async ({ ctx }) => {
      const horses = await db.getHorsesByUserId(ctx.user.id);
      const upcomingSessions = await db.getUpcomingTrainingSessions(
        ctx.user.id,
      );
      const reminders = await db.getUpcomingReminders(ctx.user.id, 14);
      const latestWeather = await db.getLatestWeatherLog(ctx.user.id);

      return {
        horseCount: horses.length,
        upcomingSessionCount: upcomingSessions.length,
        reminderCount: reminders.length,
        latestWeather,
      };
    }),

    // ── Onboarding ──────────────────────────────────────────────────────
    getOnboardingStatus: protectedProcedure.query(async ({ ctx }) => {
      const user = await db.getUserById(ctx.user.id);
      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }
      const prefs = parseUserPrefs(user.preferences);
      const tenantId = `user:${ctx.user.id}`;
      const flow = await getOnboardingFlow(ctx.user.id, tenantId);
      return {
        completed:
          flow?.status === "completed" || prefs.onboardingCompleted === true,
        skipped: flow?.status === "skipped" || prefs.onboardingSkipped === true,
        step:
          flow?.step ??
          (typeof prefs.onboardingStep === "number" ? prefs.onboardingStep : 1),
        progressPercent: flow?.progressPercent ?? 0,
        onboardingType: flow?.onboardingType ?? "horse_owner",
        selectedExperience: prefs.selectedExperience ?? null,
        activationChecklist:
          flow?.checklist ??
          prefs.activationChecklist ?? {
          addedHorse: false,
          choseExperience: false,
          viewedDashboard: false,
          addedHealthRecord: false,
          exploredTraining: false,
        },
        quickWins: flow?.quickWins ?? [],
      };
    }),

    updateOnboardingStep: protectedProcedure
      .input(z.object({ step: z.number().min(1).max(5) }))
      .mutation(async ({ ctx, input }) => {
        const user = await db.getUserById(ctx.user.id);
        const prefs = parseUserPrefs(user?.preferences);
        prefs.onboardingStep = input.step;
        const onboardingType = (() => {
          if (prefs.selectedExperience === "stable") return "stable" as const;
          if (prefs.selectedExperience === "student") return "school" as const;
          return "horse_owner" as const;
        })();
        const checklist = prefs.activationChecklist ?? {};
        const completedCount = Object.values(checklist).filter(Boolean).length;
        await startOnboardingFlow({
          userId: ctx.user.id,
          tenantId: `user:${ctx.user.id}`,
          onboardingType,
          status: "in_progress",
          step: input.step,
          progressPercent: Math.min(100, completedCount * 20),
          checklist,
          quickWins: [],
        });
        await db.updateUser(ctx.user.id, { preferences: JSON.stringify(prefs) });
        return { success: true };
      }),

    completeOnboarding: protectedProcedure.mutation(async ({ ctx }) => {
      const user = await db.getUserById(ctx.user.id);
      const prefs = parseUserPrefs(user?.preferences);
      prefs.onboardingCompleted = true;
      prefs.onboardingStep = 5;
      prefs.onboardingSkipped = false;
      const onboardingType = (() => {
        if (prefs.selectedExperience === "stable") return "stable" as const;
        if (prefs.selectedExperience === "student") return "school" as const;
        return "horse_owner" as const;
      })();
      await startOnboardingFlow({
        userId: ctx.user.id,
        tenantId: `user:${ctx.user.id}`,
        onboardingType,
        status: "completed",
        step: 5,
        progressPercent: 100,
        checklist: prefs.activationChecklist ?? {},
        quickWins: ["onboarding_completed"],
      });
      await db.updateUser(ctx.user.id, { preferences: JSON.stringify(prefs) });
      return { success: true };
    }),

    skipOnboarding: protectedProcedure.mutation(async ({ ctx }) => {
      const user = await db.getUserById(ctx.user.id);
      const prefs = parseUserPrefs(user?.preferences);
      prefs.onboardingCompleted = true;
      prefs.onboardingSkipped = true;
      const onboardingType = (() => {
        if (prefs.selectedExperience === "stable") return "stable" as const;
        if (prefs.selectedExperience === "student") return "school" as const;
        return "horse_owner" as const;
      })();
      await startOnboardingFlow({
        userId: ctx.user.id,
        tenantId: `user:${ctx.user.id}`,
        onboardingType,
        status: "skipped",
        step: typeof prefs.onboardingStep === "number" ? prefs.onboardingStep : 1,
        progressPercent: 100,
        checklist: prefs.activationChecklist ?? {},
        quickWins: [],
      });
      await db.updateUser(ctx.user.id, { preferences: JSON.stringify(prefs) });
      return { success: true };
    }),

    resetOnboarding: protectedProcedure.mutation(async ({ ctx }) => {
      const user = await db.getUserById(ctx.user.id);
      const prefs = parseUserPrefs(user?.preferences);
      prefs.onboardingCompleted = false;
      prefs.onboardingSkipped = false;
      prefs.onboardingStep = 1;
      const onboardingType = (() => {
        if (prefs.selectedExperience === "stable") return "stable" as const;
        if (prefs.selectedExperience === "student") return "school" as const;
        return "horse_owner" as const;
      })();
      await startOnboardingFlow({
        userId: ctx.user.id,
        tenantId: `user:${ctx.user.id}`,
        onboardingType,
        status: "not_started",
        step: 1,
        progressPercent: 0,
        checklist: {},
        quickWins: [],
      });
      await db.updateUser(ctx.user.id, { preferences: JSON.stringify(prefs) });
      return { success: true };
    }),

    setExperience: protectedProcedure
      .input(z.object({ experience: z.enum(["standard", "stable", "student"]) }))
      .mutation(async ({ ctx, input }) => {
        const user = await db.getUserById(ctx.user.id);
        const prefs = parseUserPrefs(user?.preferences);
        prefs.selectedExperience = input.experience;
        if (input.experience === "stable") {
          prefs.planTier = "stable";
        } else if (input.experience === "student") {
          prefs.planTier = "student";
        } else {
          prefs.planTier = "pro";
        }
        if (!prefs.activationChecklist) {
          prefs.activationChecklist = {};
        }
        prefs.activationChecklist.choseExperience = true;
        await db.updateUser(ctx.user.id, { preferences: JSON.stringify(prefs) });
        return { success: true };
      }),

    updateActivationChecklist: protectedProcedure
      .input(
        z.object({
          item: z.enum([
            "addedHorse",
            "choseExperience",
            "viewedDashboard",
            "addedHealthRecord",
            "exploredTraining",
          ]),
          value: z.boolean(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const user = await db.getUserById(ctx.user.id);
        const prefs = parseUserPrefs(user?.preferences);
        if (!prefs.activationChecklist) {
          prefs.activationChecklist = {};
        }
        prefs.activationChecklist[input.item] = input.value;
        const onboardingType = (() => {
          if (prefs.selectedExperience === "stable") return "stable" as const;
          if (prefs.selectedExperience === "student") return "school" as const;
          return "horse_owner" as const;
        })();
        const checklist = prefs.activationChecklist as Record<string, boolean>;
        const completedCount = Object.values(checklist).filter(Boolean).length;
        const status = prefs.onboardingCompleted ? "completed" : "in_progress";
        await startOnboardingFlow({
          userId: ctx.user.id,
          tenantId: `user:${ctx.user.id}`,
          onboardingType,
          status,
          step: typeof prefs.onboardingStep === "number" ? prefs.onboardingStep : 1,
          progressPercent: Math.min(100, completedCount * 20),
          checklist,
          quickWins: completedCount > 0 ? ["first_quick_win"] : [],
        });
        await db.updateUser(ctx.user.id, { preferences: JSON.stringify(prefs) });
        return { success: true };
      }),

    dismissTour: protectedProcedure
      .input(z.object({ tourId: z.string().min(1).max(100) }))
      .mutation(async ({ ctx, input }) => {
        const user = await db.getUserById(ctx.user.id);
        const prefs = parseUserPrefs(user?.preferences);
        if (!prefs.dismissedTours) {
          prefs.dismissedTours = [];
        }
        if (!prefs.dismissedTours.includes(input.tourId)) {
          prefs.dismissedTours.push(input.tourId);
        }
        await db.updateUser(ctx.user.id, { preferences: JSON.stringify(prefs) });
        return { success: true };
      }),

    dismissTip: protectedProcedure
      .input(z.object({ tipId: z.string().min(1).max(100) }))
      .mutation(async ({ ctx, input }) => {
        const user = await db.getUserById(ctx.user.id);
        const prefs = parseUserPrefs(user?.preferences);
        if (!prefs.dismissedTips) {
          prefs.dismissedTips = [];
        }
        if (!prefs.dismissedTips.includes(input.tipId)) {
          prefs.dismissedTips.push(input.tipId);
        }
        await db.updateUser(ctx.user.id, { preferences: JSON.stringify(prefs) });
        return { success: true };
      }),
  }),

  // Horse management
  horses: router({
    list: subscribedProcedure.query(async ({ ctx }) => {
      return db.getHorsesByUserId(ctx.user.id);
    }),

    // Public read-only procedure — used by the /passport/:id QR-scanned page.
    // Returns limited identification and vaccination data without requiring auth.
    getPassport: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const drizzleDb = await getDb();
        if (!drizzleDb) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const horseRows = await drizzleDb
          .select({
            id: horses.id,
            name: horses.name,
            breed: horses.breed,
            color: horses.color,
            gender: horses.gender,
            dateOfBirth: horses.dateOfBirth,
            height: horses.height,
            microchipNumber: horses.microchipNumber,
            registrationNumber: horses.registrationNumber,
          })
          .from(horses)
          .where(and(eq(horses.id, input.id), eq(horses.isActive, true)))
          .limit(1);

        if (!horseRows[0]) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Horse not found" });
        }

        const horse = horseRows[0];

        const records = await drizzleDb
          .select({
            id: healthRecords.id,
            title: healthRecords.title,
            recordType: healthRecords.recordType,
            recordDate: healthRecords.recordDate,
            nextDueDate: healthRecords.nextDueDate,
          })
          .from(healthRecords)
          .where(eq(healthRecords.horseId, input.id))
          .orderBy(desc(healthRecords.recordDate))
          .limit(50);

        return { horse, healthRecords: records };
      }),

    // Public endpoint — resolves a share token to passport data
    getPassportByToken: publicProcedure
      .input(z.object({ token: z.string().min(1).max(100) }))
      .query(async ({ input }) => {
        const drizzleDb = await getDb();
        if (!drizzleDb) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const linkRows = await drizzleDb
          .select()
          .from(shareLinks)
          .where(
            and(
              eq(shareLinks.token, input.token),
              eq(shareLinks.isActive, true),
            ),
          )
          .limit(1);

        const link = linkRows[0];
        if (!link) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Share link not found or has been revoked" });
        }

        if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
          throw new TRPCError({ code: "FORBIDDEN", message: "This share link has expired" });
        }

        if (link.linkType !== "medical_passport" || !link.horseId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid passport link" });
        }

        // Increment view count (fire-and-forget)
        drizzleDb
          .update(shareLinks)
          .set({ viewCount: (link.viewCount ?? 0) + 1, lastViewedAt: new Date() })
          .where(eq(shareLinks.id, link.id))
          .catch(() => {});

        const horseRows = await drizzleDb
          .select({
            id: horses.id,
            name: horses.name,
            breed: horses.breed,
            color: horses.color,
            gender: horses.gender,
            dateOfBirth: horses.dateOfBirth,
            height: horses.height,
            microchipNumber: horses.microchipNumber,
            registrationNumber: horses.registrationNumber,
          })
          .from(horses)
          .where(and(eq(horses.id, link.horseId), eq(horses.isActive, true)))
          .limit(1);

        if (!horseRows[0]) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Horse not found" });
        }

        const horse = horseRows[0];

        const records = await drizzleDb
          .select({
            id: healthRecords.id,
            title: healthRecords.title,
            recordType: healthRecords.recordType,
            recordDate: healthRecords.recordDate,
            nextDueDate: healthRecords.nextDueDate,
          })
          .from(healthRecords)
          .where(eq(healthRecords.horseId, link.horseId))
          .orderBy(desc(healthRecords.recordDate))
          .limit(50);

        return { horse, healthRecords: records };
      }),

    get: subscribedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const horse = await db.getHorseById(input.id, ctx.user.id);
        if (!horse) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Horse not found",
          });
        }
        return horse;
      }),

    create: subscribedProcedure
      .input(
        z.object({
          name: z.string().min(1),
          breed: z.string().max(500).optional(),
          age: z.number().optional(),
          dateOfBirth: z.string().optional(),
          height: z.number().optional(),
          weight: z.number().optional(),
          color: z.string().max(500).optional(),
          gender: z.enum(["stallion", "mare", "gelding"]).optional(),
          discipline: z.string().max(200).optional(),
          level: z.string().max(200).optional(),
          registrationNumber: z.string().max(100).optional(),
          microchipNumber: z.string().max(50).optional(),
          notes: z.string().max(10000).optional(),
          photoUrl: z.string().max(2000).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        // Enforce plan horse limits
        const user = await db.getUserById(ctx.user.id);
        if (user) {
          const currentHorses = await db.getHorsesByUserId(ctx.user.id);
          const isTrial = user.subscriptionStatus === "trial";
          const userPrefs =
            typeof user.preferences === "string"
              ? JSON.parse(user.preferences || "{}")
              : (user.preferences ?? {});
          const planTier: string = userPrefs.planTier || "pro";
          // Trial = 1 horse; Pro = 5 horses; Stable = 20 horses
          const limit = isTrial ? 1 : planTier === "stable" ? 20 : 5;
          if (currentHorses.length >= limit) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: isTrial
                ? "Your free trial allows 1 horse. Upgrade to Pro or Stable to add more."
                : `You have reached the maximum of ${limit} horses for your plan. Upgrade to a higher plan to add more.`,
            });
          }
        }

        const id = await db.createHorse({
          ...input,
          userId: ctx.user!.id,
          dateOfBirth: input.dateOfBirth
            ? new Date(input.dateOfBirth)
            : undefined,
        });
        await db.logActivity({
          userId: ctx.user!.id,
          action: "horse_created",
          entityType: "horse",
          entityId: id,
          details: JSON.stringify({ name: input.name }),
        });

        // Publish real-time event
        const { publishModuleEvent } = await import("./_core/realtime");
        const horse = await db.getHorseById(id, ctx.user!.id);
        publishModuleEvent("horses", "created", horse, ctx.user!.id);

        return { id };
      }),

    update: subscribedProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().max(500).optional(),
          breed: z.string().max(500).optional(),
          age: z.number().optional(),
          dateOfBirth: z.string().optional(),
          height: z.number().optional(),
          weight: z.number().optional(),
          color: z.string().max(500).optional(),
          gender: z.enum(["stallion", "mare", "gelding"]).optional(),
          discipline: z.string().max(200).optional(),
          level: z.string().max(200).optional(),
          registrationNumber: z.string().max(100).optional(),
          microchipNumber: z.string().max(50).optional(),
          passportNumber: z.string().max(100).optional(),
          feiId: z.string().max(100).optional(),
          ueln: z.string().max(100).optional(),
          notes: z.string().max(10000).optional(),
          photoUrl: z.string().max(2000).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const { id, dateOfBirth, ...data } = input;
        await db.updateHorse(id, ctx.user.id, {
          ...data,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
        });
        await db.logActivity({
          userId: ctx.user!.id,
          action: "horse_updated",
          entityType: "horse",
          entityId: id,
        });

        // Publish real-time event
        const { publishModuleEvent } = await import("./_core/realtime");
        const horse = await db.getHorseById(id, ctx.user.id);
        publishModuleEvent("horses", "updated", horse, ctx.user.id);

        return { success: true };
      }),

    delete: subscribedProcedure
      .input(
        z.object({
          id: z.number(),
          mode: z.enum(["archive", "delete", "delete_all"]).default("archive"),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const horseId = input.id;
        const userId = ctx.user.id;

        if (input.mode === "archive") {
          // Soft-delete: hide from listing but keep all data
          await db.deleteHorse(horseId, userId);
          await db.logActivity({
            userId,
            action: "horse_archived",
            entityType: "horse",
            entityId: horseId,
          });
        } else if (input.mode === "delete") {
          // Remove the horse record (soft-delete) but keep linked data in case of audit
          await db.deleteHorse(horseId, userId);
          await db.logActivity({
            userId,
            action: "horse_deleted",
            entityType: "horse",
            entityId: horseId,
          });
        } else if (input.mode === "delete_all") {
          // Delete the horse AND all linked data permanently
          await db.deleteHorseAndData(horseId, userId);
          await db.logActivity({
            userId,
            action: "horse_deleted_with_data",
            entityType: "horse",
            entityId: horseId,
          });
        }

        // Publish real-time event
        const { publishModuleEvent } = await import("./_core/realtime");
        publishModuleEvent("horses", "deleted", { id: horseId }, userId);

        return { success: true, mode: input.mode };
      }),

    exportCSV: subscribedProcedure.query(async ({ ctx }) => {
      const horses = await db.getHorsesByUserId(ctx.user.id);
      const csv = exportHorsesCSV(horses);
      const filename = generateCSVFilename("horses");

      return {
        csv,
        filename,
        mimeType: "text/csv",
      };
    }),
  }),

  // Health records
  healthRecords: router({
    listAll: subscribedProcedure.query(async ({ ctx }) => {
      return db.getHealthRecordsByUserId(ctx.user.id);
    }),

    listByHorse: subscribedProcedure
      .input(z.object({ horseId: z.number() }))
      .query(async ({ ctx, input }) => {
        return db.getHealthRecordsByHorseId(input.horseId, ctx.user.id);
      }),

    get: subscribedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const record = await db.getHealthRecordById(input.id, ctx.user.id);
        if (!record) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Health record not found",
          });
        }
        return record;
      }),

    create: subscribedProcedure
      .input(
        z.object({
          horseId: z.number(),
          recordType: z.enum([
            "vaccination",
            "deworming",
            "dental",
            "farrier",
            "veterinary",
            "injury",
            "medication",
            "other",
          ]),
          title: z.string().min(1),
          description: z.string().max(10000).optional(),
          recordDate: z.string(),
          nextDueDate: z.string().optional(),
          vetName: z.string().optional(),
          vetPhone: z.string().optional(),
          vetClinic: z.string().optional(),
          cost: z.number().optional(),
          documentUrl: z.string().optional(),
          notes: z.string().max(10000).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const id = await db.createHealthRecord({
          ...input,
          userId: ctx.user!.id,
          recordDate: new Date(input.recordDate),
          nextDueDate: input.nextDueDate
            ? new Date(input.nextDueDate)
            : undefined,
        });
        await db.logActivity({
          userId: ctx.user!.id,
          action: "health_record_created",
          entityType: "health_record",
          entityId: id,
        });

        // Publish real-time event
        const { publishModuleEvent } = await import("./_core/realtime");
        const record = await db.getHealthRecordById(id, ctx.user!.id);
        publishModuleEvent("health", "created", record, ctx.user!.id);

        return { id };
      }),

    update: subscribedProcedure
      .input(
        z.object({
          id: z.number(),
          recordType: z
            .enum([
              "vaccination",
              "deworming",
              "dental",
              "farrier",
              "veterinary",
              "injury",
              "medication",
              "other",
            ])
            .optional(),
          title: z.string().optional(),
          description: z.string().max(10000).optional(),
          recordDate: z.string().optional(),
          nextDueDate: z.string().optional(),
          vetName: z.string().optional(),
          vetPhone: z.string().optional(),
          vetClinic: z.string().optional(),
          cost: z.number().optional(),
          documentUrl: z.string().optional(),
          notes: z.string().max(10000).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const { id, recordDate, nextDueDate, ...data } = input;
        await db.updateHealthRecord(id, ctx.user.id, {
          ...data,
          recordDate: recordDate ? new Date(recordDate) : undefined,
          nextDueDate: nextDueDate ? new Date(nextDueDate) : undefined,
        });

        // Publish real-time event
        const { publishModuleEvent } = await import("./_core/realtime");
        const record = await db.getHealthRecordById(id, ctx.user.id);
        publishModuleEvent("health", "updated", record, ctx.user.id);

        return { success: true };
      }),

    delete: subscribedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteHealthRecord(input.id, ctx.user.id);

        // Publish real-time event
        const { publishModuleEvent } = await import("./_core/realtime");
        publishModuleEvent("health", "deleted", { id: input.id }, ctx.user.id);

        return { success: true };
      }),

    getReminders: subscribedProcedure
      .input(z.object({ days: z.number().default(30) }))
      .query(async ({ ctx, input }) => {
        return db.getUpcomingReminders(ctx.user.id, input.days);
      }),

    exportCSV: subscribedProcedure.query(async ({ ctx }) => {
      const records = await db.getHealthRecordsByUserId(ctx.user.id);
      const csv = exportHealthRecordsCSV(records);
      const filename = generateCSVFilename("health_records");

      return {
        csv,
        filename,
        mimeType: "text/csv",
      };
    }),
  }),

  // Training sessions
  training: router({
    listByHorse: subscribedProcedure
      .input(z.object({ horseId: z.number() }))
      .query(async ({ ctx, input }) => {
        return db.getTrainingSessionsByHorseId(input.horseId, ctx.user.id);
      }),

    listAll: subscribedProcedure.query(async ({ ctx }) => {
      return db.getTrainingSessionsByUserId(ctx.user.id);
    }),

    getUpcoming: subscribedProcedure.query(async ({ ctx }) => {
      return db.getUpcomingTrainingSessions(ctx.user.id);
    }),

    create: subscribedProcedure
      .input(
        z.object({
          horseId: z.number(),
          sessionDate: z.string(),
          startTime: z.string().optional(),
          endTime: z.string().optional(),
          duration: z.number().optional(),
          sessionType: z.enum([
            "flatwork",
            "jumping",
            "hacking",
            "lunging",
            "groundwork",
            "competition",
            "lesson",
            "other",
          ]),
          discipline: z.string().max(200).optional(),
          trainer: z.string().optional(),
          location: z.string().max(500).optional(),
          goals: z.string().optional(),
          exercises: z.string().optional(),
          notes: z.string().max(10000).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const drizzleDb = await getDb();
        const id = await db.createTrainingSession({
          ...input,
          userId: ctx.user!.id,
          sessionDate: new Date(input.sessionDate),
        });
        await db.logActivity({
          userId: ctx.user!.id,
          action: "training_session_created",
          entityType: "training_session",
          entityId: id,
        });

        // Auto-create a calendar event so the training session appears in Calendar
        if (drizzleDb) {
          const sessionTypeLabel =
            input.sessionType.charAt(0).toUpperCase() +
            input.sessionType.slice(1);
          const title = input.location
            ? `${sessionTypeLabel} – ${input.location}`
            : sessionTypeLabel;
          // Normalise sessionDate to YYYY-MM-DD then combine with startTime
          const datePart = input.sessionDate.slice(0, 10);
          const timePart = input.startTime || "09:00";
          const startDate = new Date(`${datePart}T${timePart}:00`);
          if (!isNaN(startDate.getTime())) {
            await drizzleDb.insert(events).values({
              userId: ctx.user!.id,
              horseId: input.horseId,
              title,
              description: input.goals || input.notes || undefined,
              eventType: "training",
              startDate,
              isAllDay: false,
            });
          }
        }

        // Publish real-time event
        const { publishModuleEvent } = await import("./_core/realtime");
        const session = await db.getTrainingSessionById(id, ctx.user!.id);
        publishModuleEvent("training", "created", session, ctx.user!.id);

        return { id };
      }),

    update: subscribedProcedure
      .input(
        z.object({
          id: z.number(),
          sessionDate: z.string().optional(),
          startTime: z.string().optional(),
          endTime: z.string().optional(),
          duration: z.number().optional(),
          sessionType: z
            .enum([
              "flatwork",
              "jumping",
              "hacking",
              "lunging",
              "groundwork",
              "competition",
              "lesson",
              "other",
            ])
            .optional(),
          discipline: z.string().max(200).optional(),
          trainer: z.string().optional(),
          location: z.string().max(500).optional(),
          goals: z.string().optional(),
          exercises: z.string().optional(),
          notes: z.string().max(10000).optional(),
          performance: z
            .enum(["excellent", "good", "average", "poor"])
            .optional(),
          weather: z.string().optional(),
          temperature: z.number().optional(),
          isCompleted: z.boolean().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const { id, sessionDate, ...data } = input;
        await db.updateTrainingSession(id, ctx.user.id, {
          ...data,
          sessionDate: sessionDate ? new Date(sessionDate) : undefined,
        });

        // Publish real-time event
        const { publishModuleEvent } = await import("./_core/realtime");
        const session = await db.getTrainingSessionById(id, ctx.user.id);
        publishModuleEvent("training", "updated", session, ctx.user.id);

        return { success: true };
      }),

    delete: subscribedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteTrainingSession(input.id, ctx.user.id);

        // Publish real-time event
        const { publishModuleEvent } = await import("./_core/realtime");
        publishModuleEvent(
          "training",
          "deleted",
          { id: input.id },
          ctx.user.id,
        );

        return { success: true };
      }),

    complete: subscribedProcedure
      .input(
        z.object({
          id: z.number(),
          performance: z
            .enum(["excellent", "good", "average", "poor"])
            .optional(),
          notes: z.string().max(10000).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        await db.updateTrainingSession(input.id, ctx.user.id, {
          isCompleted: true,
          performance: input.performance,
          notes: input.notes,
        });

        // Publish real-time event
        const { publishModuleEvent } = await import("./_core/realtime");
        const session = await db.getTrainingSessionById(input.id, ctx.user.id);
        publishModuleEvent("training", "completed", session, ctx.user.id);

        return { success: true };
      }),

    exportCSV: subscribedProcedure.query(async ({ ctx }) => {
      const sessions = await db.getTrainingSessionsByUserId(ctx.user.id);
      const csv = exportTrainingSessionsCSV(sessions);
      const filename = generateCSVFilename("training_sessions");

      return {
        csv,
        filename,
        mimeType: "text/csv",
      };
    }),
  }),

  // Feeding plans
  feeding: router({
    listAll: subscribedProcedure.query(async ({ ctx }) => {
      return db.getFeedingPlansByUserId(ctx.user.id);
    }),

    listByHorse: subscribedProcedure
      .input(z.object({ horseId: z.number() }))
      .query(async ({ ctx, input }) => {
        return db.getFeedingPlansByHorseId(input.horseId, ctx.user.id);
      }),

    create: subscribedProcedure
      .input(
        z.object({
          horseId: z.number(),
          feedType: z.string().min(1),
          brandName: z.string().optional(),
          quantity: z.string().min(1),
          unit: z.string().optional(),
          mealTime: z.enum(["morning", "midday", "evening", "night"]),
          frequency: z.string().optional(),
          specialInstructions: z.string().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const id = await db.createFeedingPlan({
          ...input,
          userId: ctx.user!.id,
        });

        // Publish real-time event
        const { publishModuleEvent } = await import("./_core/realtime");
        const plan = await db.getFeedingPlanById(id, ctx.user!.id);
        publishModuleEvent("feeding", "created", plan, ctx.user!.id);

        return { id };
      }),

    update: subscribedProcedure
      .input(
        z.object({
          id: z.number(),
          feedType: z.string().optional(),
          brandName: z.string().optional(),
          quantity: z.string().optional(),
          unit: z.string().optional(),
          mealTime: z
            .enum(["morning", "midday", "evening", "night"])
            .optional(),
          frequency: z.string().optional(),
          specialInstructions: z.string().optional(),
          isActive: z.boolean().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await db.updateFeedingPlan(id, ctx.user.id, data);

        // Publish real-time event
        const { publishModuleEvent } = await import("./_core/realtime");
        const plan = await db.getFeedingPlanById(id, ctx.user.id);
        publishModuleEvent("feeding", "updated", plan, ctx.user.id);

        return { success: true };
      }),

    delete: subscribedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteFeedingPlan(input.id, ctx.user.id);

        // Publish real-time event
        const { publishModuleEvent } = await import("./_core/realtime");
        publishModuleEvent("feeding", "deleted", { id: input.id }, ctx.user.id);

        return { success: true };
      }),

    exportCSV: subscribedProcedure.query(async ({ ctx }) => {
      const feedPlans = await db.getFeedingPlansByUserId(ctx.user.id);
      const csv = exportFeedCostsCSV(feedPlans);
      const filename = generateCSVFilename("feeding_plans");

      return {
        csv,
        filename,
        mimeType: "text/csv",
      };
    }),
  }),

  // Tasks management
  tasks: router({
    list: subscribedProcedure.query(async ({ ctx }) => {
      return db.getTasksByUserId(ctx.user.id);
    }),

    listByHorse: subscribedProcedure
      .input(z.object({ horseId: z.number() }))
      .query(async ({ ctx, input }) => {
        return db.getTasksByHorseId(input.horseId, ctx.user.id);
      }),

    get: subscribedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const task = await db.getTaskById(input.id, ctx.user.id);
        if (!task) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Task not found" });
        }
        return task;
      }),

    getUpcoming: subscribedProcedure
      .input(z.object({ days: z.number().default(7) }))
      .query(async ({ ctx, input }) => {
        return db.getUpcomingTasks(ctx.user.id, input.days);
      }),

    create: subscribedProcedure
      .input(
        z.object({
          horseId: z.number().optional(),
          title: z.string().min(1),
          description: z.string().max(10000).optional(),
          taskType: z.enum([
            "hoofcare",
            "health_appointment",
            "treatment",
            "vaccination",
            "deworming",
            "dental",
            "general_care",
            "training",
            "feeding",
            "other",
          ]),
          priority: z
            .enum(["low", "medium", "high", "urgent"])
            .default("medium"),
          status: z
            .enum(["pending", "in_progress", "completed", "cancelled"])
            .default("pending"),
          dueDate: z.string().optional(),
          assignedTo: z.string().optional(),
          notes: z.string().max(10000).optional(),
          reminderDays: z.number().default(1),
          isRecurring: z.boolean().default(false),
          recurringInterval: z
            .enum([
              "daily",
              "weekly",
              "biweekly",
              "monthly",
              "quarterly",
              "yearly",
            ])
            .optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const id = await db.createTask({
          ...input,
          userId: ctx.user!.id,
          dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
        });
        await db.logActivity({
          userId: ctx.user!.id,
          action: "task_created",
          entityType: "task",
          entityId: id,
        });

        // Publish real-time event
        const { publishModuleEvent } = await import("./_core/realtime");
        const task = await db.getTaskById(id, ctx.user!.id);
        publishModuleEvent("tasks", "created", task, ctx.user!.id);

        return { id };
      }),

    update: subscribedProcedure
      .input(
        z.object({
          id: z.number(),
          title: z.string().optional(),
          description: z.string().max(10000).optional(),
          taskType: z
            .enum([
              "hoofcare",
              "health_appointment",
              "treatment",
              "vaccination",
              "deworming",
              "dental",
              "general_care",
              "training",
              "feeding",
              "other",
            ])
            .optional(),
          priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
          status: z
            .enum(["pending", "in_progress", "completed", "cancelled"])
            .optional(),
          dueDate: z.string().optional(),
          assignedTo: z.string().optional(),
          notes: z.string().max(10000).optional(),
          reminderDays: z.number().optional(),
          isRecurring: z.boolean().optional(),
          recurringInterval: z
            .enum([
              "daily",
              "weekly",
              "biweekly",
              "monthly",
              "quarterly",
              "yearly",
            ])
            .optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const { id, dueDate, ...data } = input;
        await db.updateTask(id, ctx.user.id, {
          ...data,
          dueDate: dueDate ? new Date(dueDate) : undefined,
        });

        // Publish real-time event
        const { publishModuleEvent } = await import("./_core/realtime");
        const task = await db.getTaskById(id, ctx.user.id);
        publishModuleEvent("tasks", "updated", task, ctx.user.id);

        return { success: true };
      }),

    delete: subscribedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteTask(input.id, ctx.user.id);

        // Publish real-time event
        const { publishModuleEvent } = await import("./_core/realtime");
        publishModuleEvent("tasks", "deleted", { id: input.id }, ctx.user.id);

        return { success: true };
      }),

    complete: subscribedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.completeTask(input.id, ctx.user.id);

        // Publish real-time event
        const { publishModuleEvent } = await import("./_core/realtime");
        const task = await db.getTaskById(input.id, ctx.user.id);
        publishModuleEvent("tasks", "completed", task, ctx.user.id);

        return { success: true };
      }),

    exportCSV: subscribedProcedure.query(async ({ ctx }) => {
      const tasks = await db.getTasksByUserId(ctx.user.id);
      // Enrich with horse names
      const horsesMap: Record<number, string> = {};
      const horses = await db.getHorsesByUserId(ctx.user.id);
      horses.forEach((h: any) => { horsesMap[h.id] = h.name; });
      const enriched = tasks.map((t: any) => ({
        ...t,
        horseName: t.horseId ? (horsesMap[t.horseId] || "") : "",
      }));
      const csv = exportTasksCSV(enriched);
      return {
        csv,
        filename: `tasks_${new Date().toISOString().split("T")[0]}.csv`,
        mimeType: "text/csv",
      };
    }),
  }),

  // Contacts management
  contacts: router({
    list: subscribedProcedure.query(async ({ ctx }) => {
      return db.getContactsByUserId(ctx.user.id);
    }),

    listByType: subscribedProcedure
      .input(z.object({ contactType: z.string() }))
      .query(async ({ ctx, input }) => {
        return db.getContactsByType(ctx.user.id, input.contactType);
      }),

    get: subscribedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const contact = await db.getContactById(input.id, ctx.user.id);
        if (!contact) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Contact not found",
          });
        }
        return contact;
      }),

    create: subscribedProcedure
      .input(
        z.object({
          name: z.string().min(1),
          contactType: z.enum([
            "vet",
            "farrier",
            "trainer",
            "instructor",
            "stable",
            "breeder",
            "supplier",
            "emergency",
            "other",
          ]),
          company: z.string().optional(),
          email: z.string().email().optional(),
          phone: z.string().max(20).optional(),
          mobile: z.string().max(20).optional(),
          address: z.string().optional(),
          city: z.string().optional(),
          postcode: z.string().optional(),
          country: z.string().optional(),
          website: z.string().optional(),
          notes: z.string().max(10000).optional(),
          isPrimary: z.boolean().default(false),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const id = await db.createContact({
          ...input,
          userId: ctx.user!.id,
          isActive: true,
        });
        await db.logActivity({
          userId: ctx.user!.id,
          action: "contact_created",
          entityType: "contact",
          entityId: id,
        });

        // Publish real-time event
        const { publishModuleEvent } = await import("./_core/realtime");
        const contact = await db.getContactById(id, ctx.user!.id);
        publishModuleEvent("contacts", "created", contact, ctx.user!.id);

        return { id };
      }),

    update: subscribedProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().max(500).optional(),
          contactType: z
            .enum([
              "vet",
              "farrier",
              "trainer",
              "instructor",
              "stable",
              "breeder",
              "supplier",
              "emergency",
              "other",
            ])
            .optional(),
          company: z.string().optional(),
          email: z.string().email().optional(),
          phone: z.string().max(20).optional(),
          mobile: z.string().max(20).optional(),
          address: z.string().optional(),
          city: z.string().optional(),
          postcode: z.string().optional(),
          country: z.string().optional(),
          website: z.string().optional(),
          notes: z.string().max(10000).optional(),
          isPrimary: z.boolean().optional(),
          isActive: z.boolean().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await db.updateContact(id, ctx.user.id, data);

        // Publish real-time event
        const { publishModuleEvent } = await import("./_core/realtime");
        const contact = await db.getContactById(id, ctx.user.id);
        publishModuleEvent("contacts", "updated", contact, ctx.user.id);

        return { success: true };
      }),

    delete: subscribedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteContact(input.id, ctx.user.id);

        // Publish real-time event
        const { publishModuleEvent } = await import("./_core/realtime");
        publishModuleEvent(
          "contacts",
          "deleted",
          { id: input.id },
          ctx.user.id,
        );

        return { success: true };
      }),

    exportCSV: subscribedProcedure.query(async ({ ctx }) => {
      const contacts = await db.getContactsByUserId(ctx.user.id);
      const csv = exportContactsCSV(contacts);
      return {
        csv,
        filename: `contacts_${new Date().toISOString().split("T")[0]}.csv`,
        mimeType: "text/csv",
      };
    }),
  }),

  // Vaccinations management
  vaccinations: router({
    list: subscribedProcedure.query(async ({ ctx }) => {
      return db.getVaccinationsByUserId(ctx.user.id);
    }),

    listByHorse: subscribedProcedure
      .input(z.object({ horseId: z.number() }))
      .query(async ({ ctx, input }) => {
        return db.getVaccinationsByHorseId(input.horseId, ctx.user.id);
      }),

    get: subscribedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const vaccination = await db.getVaccinationById(input.id, ctx.user.id);
        if (!vaccination) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Vaccination not found",
          });
        }
        return vaccination;
      }),

    create: subscribedProcedure
      .input(
        z.object({
          horseId: z.number(),
          vaccineName: z.string().min(1),
          vaccineType: z.string().optional(),
          dateAdministered: z.date(),
          nextDueDate: z.date().optional(),
          batchNumber: z.string().optional(),
          vetName: z.string().optional(),
          vetClinic: z.string().optional(),
          cost: z.number().optional(),
          notes: z.string().max(10000).optional(),
          documentUrl: z.string().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const id = await db.createVaccination({
          ...input,
          userId: ctx.user!.id,
        });
        await db.logActivity({
          userId: ctx.user!.id,
          action: "vaccination_created",
          entityType: "vaccination",
          entityId: id,
        });

        // Publish real-time event
        const { publishModuleEvent } = await import("./_core/realtime");
        const vaccination = await db.getVaccinationById(id, ctx.user!.id);
        publishModuleEvent(
          "vaccinations",
          "created",
          vaccination,
          ctx.user!.id,
        );

        return { id };
      }),

    update: subscribedProcedure
      .input(
        z.object({
          id: z.number(),
          vaccineName: z.string().optional(),
          vaccineType: z.string().optional(),
          dateAdministered: z.date().optional(),
          nextDueDate: z.date().optional(),
          batchNumber: z.string().optional(),
          vetName: z.string().optional(),
          vetClinic: z.string().optional(),
          cost: z.number().optional(),
          notes: z.string().max(10000).optional(),
          documentUrl: z.string().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await db.updateVaccination(id, ctx.user.id, data);

        // Publish real-time event
        const { publishModuleEvent } = await import("./_core/realtime");
        const vaccination = await db.getVaccinationById(id, ctx.user.id);
        publishModuleEvent("vaccinations", "updated", vaccination, ctx.user.id);

        return { success: true };
      }),

    delete: subscribedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteVaccination(input.id, ctx.user.id);
        await db.logActivity({
          userId: ctx.user!.id,
          action: "vaccination_deleted",
          entityType: "vaccination",
          entityId: input.id,
        });

        // Publish real-time event
        const { publishModuleEvent } = await import("./_core/realtime");
        publishModuleEvent(
          "vaccinations",
          "deleted",
          { id: input.id },
          ctx.user.id,
        );

        return { success: true };
      }),
  }),

  // Dewormings management
  dewormings: router({
    list: subscribedProcedure.query(async ({ ctx }) => {
      return db.getDewormingsByUserId(ctx.user.id);
    }),

    listByHorse: subscribedProcedure
      .input(z.object({ horseId: z.number() }))
      .query(async ({ ctx, input }) => {
        return db.getDewormingsByHorseId(input.horseId, ctx.user.id);
      }),

    get: subscribedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const deworming = await db.getDewormingById(input.id, ctx.user.id);
        if (!deworming) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Deworming record not found",
          });
        }
        return deworming;
      }),

    create: subscribedProcedure
      .input(
        z.object({
          horseId: z.number(),
          productName: z.string().min(1),
          activeIngredient: z.string().optional(),
          dateAdministered: z.date(),
          nextDueDate: z.date().optional(),
          dosage: z.string().optional(),
          weight: z.number().optional(),
          cost: z.number().optional(),
          notes: z.string().max(10000).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const id = await db.createDeworming({
          ...input,
          userId: ctx.user!.id,
        });
        await db.logActivity({
          userId: ctx.user!.id,
          action: "deworming_created",
          entityType: "deworming",
          entityId: id,
        });

        // Publish real-time event
        const { publishModuleEvent } = await import("./_core/realtime");
        const deworming = await db.getDewormingById(id, ctx.user!.id);
        publishModuleEvent("dewormings", "created", deworming, ctx.user!.id);

        return { id };
      }),

    update: subscribedProcedure
      .input(
        z.object({
          id: z.number(),
          productName: z.string().optional(),
          activeIngredient: z.string().optional(),
          dateAdministered: z.date().optional(),
          nextDueDate: z.date().optional(),
          dosage: z.string().optional(),
          weight: z.number().optional(),
          cost: z.number().optional(),
          notes: z.string().max(10000).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await db.updateDeworming(id, ctx.user.id, data);

        // Publish real-time event
        const { publishModuleEvent } = await import("./_core/realtime");
        const deworming = await db.getDewormingById(id, ctx.user.id);
        publishModuleEvent("dewormings", "updated", deworming, ctx.user.id);

        return { success: true };
      }),

    delete: subscribedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteDeworming(input.id, ctx.user.id);
        await db.logActivity({
          userId: ctx.user!.id,
          action: "deworming_deleted",
          entityType: "deworming",
          entityId: input.id,
        });

        // Publish real-time event
        const { publishModuleEvent } = await import("./_core/realtime");
        publishModuleEvent(
          "dewormings",
          "deleted",
          { id: input.id },
          ctx.user.id,
        );

        return { success: true };
      }),
  }),

  // Pedigree management
  pedigree: router({
    get: subscribedProcedure
      .input(z.object({ horseId: z.number() }))
      .query(async ({ ctx, input }) => {
        return db.getPedigreeByHorseId(input.horseId);
      }),

    createOrUpdate: subscribedProcedure
      .input(
        z.object({
          horseId: z.number(),
          sireId: z.number().optional(),
          sireName: z.string().optional(),
          damId: z.number().optional(),
          damName: z.string().optional(),
          sireOfSireId: z.number().optional(),
          sireOfSireName: z.string().optional(),
          damOfSireId: z.number().optional(),
          damOfSireName: z.string().optional(),
          sireOfDamId: z.number().optional(),
          sireOfDamName: z.string().optional(),
          damOfDamId: z.number().optional(),
          damOfDamName: z.string().optional(),
          geneticInfo: z.string().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const id = await db.createOrUpdatePedigree(input);
        await db.logActivity({
          userId: ctx.user!.id,
          action: "pedigree_updated",
          entityType: "pedigree",
          entityId: id,
        });

        // Publish real-time event
        const { publishModuleEvent } = await import("./_core/realtime");
        const pedigree = await db.getPedigreeByHorseId(input.horseId);
        publishModuleEvent("pedigree", "updated", pedigree, ctx.user!.id);

        return { id };
      }),

    delete: subscribedProcedure
      .input(z.object({ horseId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deletePedigree(input.horseId);
        await db.logActivity({
          userId: ctx.user!.id,
          action: "pedigree_deleted",
          entityType: "pedigree",
          entityId: input.horseId,
        });

        // Publish real-time event
        const { publishModuleEvent } = await import("./_core/realtime");
        publishModuleEvent(
          "pedigree",
          "deleted",
          { horseId: input.horseId },
          ctx.user!.id,
        );

        return { success: true };
      }),
  }),

  // Documents
  documents: router({
    list: subscribedProcedure.query(async ({ ctx }) => {
      return db.getDocumentsByUserId(ctx.user.id);
    }),

    listByHorse: subscribedProcedure
      .input(z.object({ horseId: z.number() }))
      .query(async ({ ctx, input }) => {
        return db.getDocumentsByHorseId(input.horseId, ctx.user.id);
      }),

    upload: subscribedProcedure
      .input(
        z.object({
          fileName: z.string(),
          fileType: z.string(),
          fileSize: z.number(),
          fileData: z.string(), // base64 encoded
          horseId: z.number().optional(),
          healthRecordId: z.number().optional(),
          category: z
            .enum([
              "health",
              "passport",
              "registration",
              "insurance",
              "competition",
              "training",
              "feeding",
              "invoice",
              "gallery",
              "other",
            ])
            .optional(),
          description: z.string().max(10000).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        // Infer MIME type from file extension when the browser did not supply one.
        // iOS Safari and some Android browsers send an empty string for types they
        // don't recognise (CSV, Word, etc.).  Falling back to extension-based
        // detection avoids a blanket "File type not allowed: " rejection.
        const EXT_TO_MIME: Record<string, string> = {
          ".pdf":  "application/pdf",
          ".csv":  "text/csv",
          ".txt":  "text/plain",
          ".doc":  "application/msword",
          ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          ".xls":  "application/vnd.ms-excel",
          ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          ".jpg":  "image/jpeg",
          ".jpeg": "image/jpeg",
          ".png":  "image/png",
          ".gif":  "image/gif",
          ".webp": "image/webp",
          ".svg":  "image/svg+xml",
          ".heic": "image/heic",
          ".heif": "image/heif",
        };
        let resolvedFileType = input.fileType;
        if (!resolvedFileType) {
          const ext = (input.fileName.match(/\.[^.]+$/) ?? [""])[0].toLowerCase();
          resolvedFileType = EXT_TO_MIME[ext] ?? "";
        }

        // Validate MIME type — allow images, PDFs, common document types only
        if (!ALLOWED_UPLOAD_MIME_TYPES.includes(resolvedFileType as any)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: resolvedFileType
              ? `File type not allowed: ${resolvedFileType}`
              : `Cannot determine file type for "${input.fileName}". Please try a PDF, image, Word, Excel, or CSV file.`,
          });
        }

        // Enforce 10MB limit
        const MAX_FILE_SIZE = 10 * 1024 * 1024;
        if (input.fileSize > MAX_FILE_SIZE) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "File size exceeds 10MB limit",
          });
        }

        // Sanitize filename — strip path separators
        const safeFileName = input.fileName.replace(/[/\\]/g, "_");

        // Decode base64
        let buffer = Buffer.from(input.fileData, "base64");

        // Validate decoded buffer size is consistent with the declared file size.
        // base64 expands data by ~33%, so the decoded length should be close to
        // fileSize.  A large discrepancy means the base64 payload was truncated or
        // corrupted in transit — reject early rather than store a corrupt file.
        // Allow 5% tolerance for minor encoding edge-cases.
        const sizeDelta = Math.abs(buffer.length - input.fileSize);
        const tolerance = Math.max(1024, input.fileSize * 0.05); // at least 1 KB
        if (sizeDelta > tolerance) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `File upload appears corrupted: expected ${input.fileSize} bytes but decoded ${buffer.length} bytes. Please try again.`,
          });
        }
        let finalFileType = resolvedFileType;
        let finalFileName = safeFileName;

        // HEIC/HEIF → JPEG conversion (iPhone default photo format)
        if (
          resolvedFileType === "image/heic" ||
          resolvedFileType === "image/heif"
        ) {
          try {
            const heicConvert = await import("heic-convert");
            // Node.js Buffers may share the underlying ArrayBuffer with an
            // offset, so we slice a dedicated copy to pass to heic-convert.
            const srcArrayBuffer = buffer.buffer.slice(
              buffer.byteOffset,
              buffer.byteOffset + buffer.byteLength,
            ) as ArrayBuffer;
            const outputBuffer = await heicConvert.default({
              buffer: srcArrayBuffer,
              format: "JPEG",
              quality: 0.9,
            });
            buffer = Buffer.from(outputBuffer);
            finalFileType = "image/jpeg";
            // Replace .heic/.heif extension with .jpg
            finalFileName = finalFileName.replace(/\.(heic|heif)$/i, ".jpg");

            // Re-validate converted size — a large HEIC can still produce a
            // JPEG that exceeds the 10 MB limit after conversion.
            if (buffer.length > MAX_FILE_SIZE) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message:
                  "Converted image exceeds 10MB limit. Please use a smaller photo.",
              });
            }
          } catch (err) {
            if (err instanceof TRPCError) throw err;
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message:
                "Failed to convert HEIC image. Please try a JPEG or PNG.",
            });
          }
        }

        const fileKey = `${ctx.user.id}/documents/${nanoid()}-${finalFileName}`;
        const { url } = await storagePut(fileKey, buffer, finalFileType);

        const id = await db.createDocument({
          userId: ctx.user!.id,
          horseId: input.horseId,
          healthRecordId: input.healthRecordId,
          fileName: finalFileName,
          fileType: finalFileType,
          fileSize: buffer.length,
          fileUrl: url,
          fileKey,
          // Auto-classify images as "gallery" when no category is specified
          category: input.category || (finalFileType.startsWith("image/") ? "gallery" : "other"),
          description: input.description,
        });

        await db.logActivity({
          userId: ctx.user!.id,
          action: "document_uploaded",
          entityType: "document",
          entityId: id,
          details: JSON.stringify({ fileName: input.fileName }),
        });

        // Publish real-time event
        const { publishModuleEvent } = await import("./_core/realtime");
        const document = await db.getDocumentById(id, ctx.user!.id);
        publishModuleEvent("documents", "uploaded", document, ctx.user!.id);

        return { id, url };
      }),

    delete: subscribedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteDocument(input.id, ctx.user.id);

        // Publish real-time event
        const { publishModuleEvent } = await import("./_core/realtime");
        publishModuleEvent(
          "documents",
          "deleted",
          { id: input.id },
          ctx.user.id,
        );

        return { success: true };
      }),

    exportCSV: subscribedProcedure.query(async ({ ctx }) => {
      const documents = await db.getDocumentsByUserId(ctx.user.id);
      const csv = exportDocumentsCSV(documents);
      const filename = generateCSVFilename("documents");

      return {
        csv,
        filename,
        mimeType: "text/csv",
      };
    }),
  }),

  // Weather and AI analysis
  weather: router({
    analyze: subscribedProcedure
      .input(
        z.object({
          location: z.string(),
          temperature: z.number(),
          humidity: z.number(),
          windSpeed: z.number(),
          precipitation: z.number().optional(),
          conditions: z.string(),
          uvIndex: z.number().optional(),
          visibility: z.number().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        // Use AI to analyze riding conditions
        const prompt = `As an equestrian expert, analyze the following weather conditions for horse riding safety and provide a recommendation:

Location: ${input.location}
Temperature: ${input.temperature}°C
Humidity: ${input.humidity}%
Wind Speed: ${input.windSpeed} km/h
Precipitation: ${input.precipitation || 0} mm
Conditions: ${input.conditions}
UV Index: ${input.uvIndex || "Unknown"}
Visibility: ${input.visibility || "Unknown"} km

Please provide:
1. A riding recommendation (excellent, good, fair, poor, or not_recommended)
2. A brief explanation of the conditions
3. Any safety precautions riders should take
4. Best time of day to ride if conditions are marginal

Format your response as JSON with keys: recommendation, explanation, precautions, bestTime`;

        // Determine basic recommendation from numeric data (no-AI fallback)
        const EXTREME_WIND = 50; // km/h – dangerous for horses
        const HIGH_WIND = 35;
        const MODERATE_WIND = 25;
        const CALM_WIND = 15;
        const EXTREME_HEAT = 38; // °C
        const HIGH_HEAT = 32;
        const WARM = 28;
        const IDEAL_MAX = 25;
        const IDEAL_MIN = 15;
        const COLD = 5;
        const FREEZING = 0;
        const EXTREME_COLD = -10;
        const HEAVY_RAIN = 10; // mm
        const MODERATE_RAIN = 5;
        const LIGHT_RAIN = 2;

        const basicRec = (() => {
          const precip = input.precipitation ?? 0;
          if (
            input.windSpeed > EXTREME_WIND ||
            precip > HEAVY_RAIN ||
            input.temperature > EXTREME_HEAT ||
            input.temperature < EXTREME_COLD
          )
            return "not_recommended";
          if (
            input.windSpeed > HIGH_WIND ||
            precip > MODERATE_RAIN ||
            input.temperature > HIGH_HEAT ||
            input.temperature < FREEZING
          )
            return "poor";
          if (
            input.windSpeed > MODERATE_WIND ||
            precip > LIGHT_RAIN ||
            input.temperature > WARM ||
            input.temperature < COLD
          )
            return "fair";
          if (
            input.windSpeed < CALM_WIND &&
            precip === 0 &&
            input.temperature >= IDEAL_MIN &&
            input.temperature <= IDEAL_MAX
          )
            return "excellent";
          return "good";
        })();

        if (!(await isAIConfigured())) {
          return {
            recommendation: basicRec,
            aiAnalysis:
              "AI analysis not available – configure an API key to enable detailed recommendations.",
          };
        }

        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content:
                "You are an expert equestrian advisor specializing in weather safety for horse riding. Always respond with valid JSON.",
            },
            { role: "user", content: prompt },
          ],
        });

        const messageContent = response.choices[0]?.message?.content;
        let aiAnalysis =
          typeof messageContent === "string" ? messageContent : "";
        let recommendation:
          | "excellent"
          | "good"
          | "fair"
          | "poor"
          | "not_recommended" = "fair";

        try {
          const parsed = JSON.parse(aiAnalysis);
          recommendation = parsed.recommendation || "fair";
        } catch {
          // Default to fair if parsing fails
          const precip = input.precipitation ?? 0;
          if (input.windSpeed > 50 || precip > 10) {
            recommendation = "not_recommended";
          } else if (input.temperature < 0 || input.temperature > 35) {
            recommendation = "poor";
          } else if (input.windSpeed > 30 || precip > 5) {
            recommendation = "fair";
          } else if (input.temperature >= 10 && input.temperature <= 25) {
            recommendation = "excellent";
          } else {
            recommendation = "good";
          }
        }

        // Save weather log
        await db.createWeatherLog({
          userId: ctx.user!.id,
          location: input.location,
          temperature: input.temperature,
          humidity: input.humidity,
          windSpeed: input.windSpeed,
          precipitation: input.precipitation,
          conditions: input.conditions,
          uvIndex: input.uvIndex,
          visibility: input.visibility,
          ridingRecommendation: recommendation,
          aiAnalysis,
        });

        return {
          recommendation,
          analysis: aiAnalysis,
        };
      }),

    getLatest: subscribedProcedure.query(async ({ ctx }) => {
      return db.getLatestWeatherLog(ctx.user.id);
    }),

    getHistory: subscribedProcedure
      .input(z.object({ limit: z.number().default(7) }))
      .query(async ({ ctx, input }) => {
        return db.getWeatherHistory(ctx.user.id, input.limit);
      }),

    // New Open-Meteo endpoints
    getCurrent: protectedProcedure.query(async ({ ctx }) => {
      const user = await db.getUserById(ctx.user.id);
      if (!user || !user.latitude || !user.longitude) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Please set your location in settings first",
        });
      }

      const weather = await import("./_core/weather");
      const current = await weather.getCurrentWeather(
        user.latitude,
        user.longitude,
      );
      // Do not pass hourOfDay — let getRidingAdvice derive it from the weather
      // timestamp returned by Open-Meteo (timezone=auto), which reflects the
      // user's local time rather than the server's UTC clock.
      const advice = weather.getRidingAdvice(current);

      return {
        weather: current,
        advice,
      };
    }),

    getForecast: protectedProcedure.query(async ({ ctx }) => {
      const user = await db.getUserById(ctx.user.id);
      if (!user || !user.latitude || !user.longitude) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Please set your location in settings first",
        });
      }

      const weather = await import("./_core/weather");
      return weather.getWeatherForecast(user.latitude, user.longitude);
    }),

    getHourly: protectedProcedure.query(async ({ ctx }) => {
      const user = await db.getUserById(ctx.user.id);
      if (!user || !user.latitude || !user.longitude) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Please set your location in settings first",
        });
      }

      const weather = await import("./_core/weather");
      return weather.getHourlyForecast(user.latitude, user.longitude);
    }),

    updateLocation: protectedProcedure
      .input(
        z.object({
          latitude: z.string(),
          longitude: z.string(),
          location: z.string().max(500).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        await db.updateUser(ctx.user.id, {
          latitude: input.latitude,
          longitude: input.longitude,
          location: input.location || null,
        });
        return { success: true };
      }),
  }),

  // Notes with voice dictation
  notes: router({
    list: subscribedProcedure
      .input(
        z.object({
          horseId: z.number().optional(),
          limit: z.number().default(50),
        }),
      )
      .query(async ({ ctx, input }) => {
        return db.getNotesByUserId(ctx.user.id, input.horseId, input.limit);
      }),

    create: subscribedProcedure
      .input(
        z.object({
          title: z.string().optional(),
          content: z.string(),
          horseId: z.number().optional(),
          transcribed: z.boolean().default(false),
          tags: z.string().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        try {
          const noteId = await db.createNote({
            userId: ctx.user.id,
            content: input.content,
            transcribed: input.transcribed,
            ...(input.title !== undefined && { title: input.title }),
            ...(input.horseId !== undefined && { horseId: input.horseId }),
            ...(input.tags !== undefined && { tags: input.tags }),
          });

          // Publish real-time event
          const { publishModuleEvent } = await import("./_core/realtime");
          const note = await db.getNoteById(noteId);
          publishModuleEvent("notes", "created", note, ctx.user.id);

          return { id: noteId };
        } catch (err) {
          console.error("[notes.create] DB error:", err);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to save note. Please try again.",
          });
        }
      }),

    update: subscribedProcedure
      .input(
        z.object({
          id: z.number(),
          title: z.string().optional(),
          content: z.string().optional(),
          tags: z.string().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        // Verify ownership
        const note = await db.getNoteById(input.id);
        if (!note || note.userId !== ctx.user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Note not found or access denied",
          });
        }
        const { id, ...updateData } = input;
        await db.updateNote(id, ctx.user.id, updateData);

        // Publish real-time event
        const { publishModuleEvent } = await import("./_core/realtime");
        const updatedNote = await db.getNoteById(id);
        publishModuleEvent("notes", "updated", updatedNote, ctx.user.id);

        return { success: true };
      }),

    delete: subscribedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        // Verify ownership
        const note = await db.getNoteById(input.id);
        if (!note || note.userId !== ctx.user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Note not found or access denied",
          });
        }
        await db.deleteNote(input.id, ctx.user.id);

        // Publish real-time event
        const { publishModuleEvent } = await import("./_core/realtime");
        publishModuleEvent("notes", "deleted", { id: input.id }, ctx.user.id);

        return { success: true };
      }),
  }),

  // GPS Ride Tracking
  rides: router({
    list: subscribedProcedure.query(async ({ ctx }) => {
      return db.getRidesByUserId(ctx.user!.id);
    }),

    get: subscribedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        return db.getRideById(input.id, ctx.user!.id);
      }),

    create: subscribedProcedure
      .input(
        z.object({
          horseId: z.number().optional(),
          name: z.string().min(1).max(200),
          startTime: z.string(), // ISO date string
          endTime: z.string().optional(),
          duration: z.number().min(0),
          distance: z.number().min(0),
          avgSpeed: z.number().min(0),
          maxSpeed: z.number().min(0),
          routeData: z.string().optional(), // JSON array of GPS points
          notes: z.string().max(10000).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const id = await db.createRide({
          userId: ctx.user!.id,
          horseId: input.horseId ?? null,
          name: input.name,
          startTime: new Date(input.startTime),
          endTime: input.endTime ? new Date(input.endTime) : null,
          duration: input.duration,
          distance: Math.round(input.distance),
          avgSpeed: Math.round(input.avgSpeed * 100),
          maxSpeed: Math.round(input.maxSpeed * 100),
          routeData: input.routeData ?? null,
          notes: input.notes ?? null,
        });

        return { id };
      }),

    delete: subscribedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteRide(input.id, ctx.user!.id);
        return { success: true };
      }),
  }),

  // Admin routes
  admin: router({
    // User management
    getUsers: adminUnlockedProcedure.query(async () => {
      return db.getAllUsers();
    }),

    getUserDetails: adminUnlockedProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => {
        const user = await db.getUserById(input.userId);
        if (!user) {
          throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
        }
        const horses = await db.getHorsesByUserId(input.userId);
        const activity = await db.getUserActivityLogs(input.userId, 20);
        return { user, horses, activity };
      }),

    suspendUser: adminUnlockedProcedure
      .input(
        z.object({
          userId: z.number(),
          reason: z.string(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        await db.suspendUser(input.userId, input.reason);
        await db.logActivity({
          userId: ctx.user!.id,
          action: "user_suspended",
          entityType: "user",
          entityId: input.userId,
          details: JSON.stringify({ reason: input.reason }),
        });
        return { success: true };
      }),

    unsuspendUser: adminUnlockedProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.unsuspendUser(input.userId);
        await db.logActivity({
          userId: ctx.user!.id,
          action: "user_unsuspended",
          entityType: "user",
          entityId: input.userId,
        });
        return { success: true };
      }),

    deleteUser: adminUnlockedProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteUser(input.userId);
        await db.logActivity({
          userId: ctx.user!.id,
          action: "user_deleted",
          entityType: "user",
          entityId: input.userId,
        });
        return { success: true };
      }),

    getDeletedUsers: adminUnlockedProcedure.query(async () => {
      return db.getDeletedUsers();
    }),

    restoreUser: adminUnlockedProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.restoreUser(input.userId);
        await db.logActivity({
          userId: ctx.user!.id,
          action: "user_restored",
          entityType: "user",
          entityId: input.userId,
        });
        return { success: true };
      }),

    // Permanently purge a soft-deleted user and all associated data
    hardDeleteUser: adminUnlockedProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        // Safety check: only allow hard-delete on already-soft-deleted users.
        // getUserById returns the user regardless of isActive status, so we
        // must explicitly check isActive to distinguish active vs soft-deleted.
        const targetUser = await db.getUserById(input.userId);
        if (targetUser && targetUser.isActive !== false) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "User must be soft-deleted first before permanently purging. Use the Delete action to soft-delete, then purge from the Deleted Users list.",
          });
        }
        await db.hardDeleteUser(input.userId);
        await db.logActivity({
          userId: ctx.user!.id,
          action: "user_hard_deleted",
          entityType: "user",
          entityId: input.userId,
        });
        return { success: true };
      }),

    updateUserRole: adminUnlockedProcedure
      .input(
        z.object({
          userId: z.number(),
          role: z.enum(["user", "admin"]),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        await db.updateUser(input.userId, { role: input.role });
        await db.logActivity({
          userId: ctx.user!.id,
          action: "user_role_updated",
          entityType: "user",
          entityId: input.userId,
          details: JSON.stringify({ newRole: input.role }),
        });
        return { success: true };
      }),

    // Grant free access — admin must explicitly choose which dashboard tier to unlock
    grantFreeAccess: adminUnlockedProcedure
      .input(
        z.object({
          userId: z.number(),
          // "standard" = Standard dashboard only (pro tier, no stable)
          // "stable"   = Stable dashboard only (stable tier, no standard)
          // "student"  = Student portal access
          // "teacher"  = Teacher portal access
          tier: z.enum(["standard", "stable", "student", "teacher"]),
          // Duration in days: admin-selected per user
          freeDays: z.number().int().min(1).max(365).default(7),
          // Reason template key for the grant (required — admin must pick a reason)
          reason: z.string().min(1).max(500),
          // Optional short custom note from admin
          customNote: z.string().max(500).optional(),
          // Whether to send a branded compensation email to the user
          sendEmail: z.boolean().default(true),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const targetUser = await db.getUserById(input.userId);
        if (!targetUser) {
          throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
        }
        const prefs = parseUserPrefs(targetUser.preferences);
        prefs.freeAccess = true;

        // Store expiry as ISO string — checked by subscribedProcedure middleware
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + input.freeDays);
        prefs.freeAccessUntil = expiryDate.toISOString();
        prefs.freeAccessDays = input.freeDays;

        // Only the explicitly chosen dashboard is unlocked — never both by default.
        // bothDashboardsUnlocked = false is set on every branch to prevent a
        // previous free-access grant from inadvertently leaving it set to true.
        if (input.tier === "stable") {
          // Stable only needs planTier; bothDashboardsUnlocked is cleared for safety.
          prefs.planTier = "stable";
          prefs.bothDashboardsUnlocked = false;
        } else if (input.tier === "student") {
          // Both planTier and selectedExperience are set:
          // - parsePlanTier() (server) reads planTier
          // - ProtectedRoute (client) checks planTier OR selectedExperience
          // Setting both ensures the check works via either path.
          prefs.planTier = "student";
          prefs.selectedExperience = "student";
          prefs.bothDashboardsUnlocked = false;
        } else if (input.tier === "teacher") {
          // Same dual-field pattern as student — see comment above.
          prefs.planTier = "teacher";
          prefs.selectedExperience = "teacher";
          prefs.bothDashboardsUnlocked = false;
        } else {
          prefs.planTier = "pro";
          prefs.bothDashboardsUnlocked = false;
        }
        await db.updateUser(input.userId, {
          subscriptionStatus: "active",
          preferences: JSON.stringify(prefs),
        });
        await db.logActivity({
          userId: ctx.user!.id,
          action: "free_access_granted",
          entityType: "user",
          entityId: input.userId,
          details: JSON.stringify({ targetEmail: targetUser.email, tier: input.tier, freeDays: input.freeDays, reason: input.reason, customNote: input.customNote ?? null }),
        });
        // Send compensation email asynchronously (non-blocking)
        if (input.sendEmail && targetUser.email) {
          sendCompensationEmail(
            targetUser.email,
            targetUser.name || "",
            input.freeDays,
            input.reason,
            input.customNote,
          ).catch((err) =>
            console.error("[Email] Failed to send compensation email:", err),
          );
        }
        return { success: true, freeAccessUntil: expiryDate.toISOString() };
      }),

    // Revoke free access
    revokeFreeAccess: adminUnlockedProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const targetUser = await db.getUserById(input.userId);
        if (!targetUser) {
          throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
        }
        const prefs = parseUserPrefs(targetUser.preferences);
        prefs.freeAccess = false;
        prefs.bothDashboardsUnlocked = false;
        prefs.planTier = "pro";
        await db.updateUser(input.userId, {
          subscriptionStatus: "trial",
          preferences: JSON.stringify(prefs),
        });
        await db.logActivity({
          userId: ctx.user!.id,
          action: "free_access_revoked",
          entityType: "user",
          entityId: input.userId,
          details: JSON.stringify({ targetEmail: targetUser.email }),
        });
        return { success: true };
      }),

    // Admin password reset (for when SMTP is unavailable)
    resetUserPassword: adminUnlockedProcedure
      .input(
        z.object({
          userId: z.number(),
          newPassword: z.string().min(8),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        // Prevent admin from resetting their own password via this admin route.
        // Admins should use the profile change-password endpoint (which requires
        // current password verification) to change their own password.
        if (input.userId === ctx.user!.id) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Use the profile settings to change your own password. This admin action is for resetting other users' passwords only.",
          });
        }

        const targetUser = await db.getUserById(input.userId);
        if (!targetUser) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User not found",
          });
        }
        const bcrypt = await import("bcrypt");
        const passwordHash = await bcrypt.hash(input.newPassword, 10);
        await db.updateUser(input.userId, {
          passwordHash,
          resetToken: null,
          resetTokenExpiry: null,
          passwordChangedAt: new Date(),
        });
        await db.logActivity({
          userId: ctx.user!.id,
          action: "admin_password_reset",
          entityType: "user",
          entityId: input.userId,
          details: JSON.stringify({
            targetEmail: targetUser.email,
            resetBy: ctx.user!.email,
          }),
        });
        return { success: true };
      }),

    // System stats
    getStats: adminUnlockedProcedure.query(async () => {
      return db.getSystemStats();
    }),

    // User segmentation for admin dashboard
    getUserSegmentation: adminUnlockedProcedure.query(async () => {
      return db.getUserSegmentation();
    }),

    getOverdueUsers: adminUnlockedProcedure.query(async () => {
      return db.getOverdueSubscriptions();
    }),

    getExpiredTrials: adminUnlockedProcedure.query(async () => {
      return db.getExpiredTrials();
    }),

    // Churn risk insights for admin
    getChurnRisk: adminUnlockedProcedure.query(async () => {
      const dbConn = await getDb();
      if (!dbConn) return { atRisk: [], trialExpiring: [], inactive: [] };

      const now = new Date();
      const threeDaysFromNow = new Date(now.getTime() + 3 * 86_400_000);
      const fourteenDaysAgo = new Date(now.getTime() - 14 * 86_400_000);

      // Trials expiring within 3 days
      const trialExpiring = await dbConn
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          trialEndsAt: users.trialEndsAt,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(and(
          eq(users.subscriptionStatus, "trial"),
          eq(users.isActive, true),
          lte(users.trialEndsAt, threeDaysFromNow),
          gte(users.trialEndsAt, now),
        ));

      // Overdue users (at risk of churning)
      const atRisk = await dbConn
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          subscriptionStatus: users.subscriptionStatus,
          lastPaymentAt: users.lastPaymentAt,
        })
        .from(users)
        .where(and(
          eq(users.isActive, true),
          eq(users.subscriptionStatus, "overdue"),
        ));

      // Inactive users (no login in 14+ days with active subscription)
      const inactive = await dbConn
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          subscriptionStatus: users.subscriptionStatus,
          updatedAt: users.updatedAt,
        })
        .from(users)
        .where(and(
          eq(users.isActive, true),
          or(eq(users.subscriptionStatus, "active"), eq(users.subscriptionStatus, "trial")),
          lte(users.updatedAt, fourteenDaysAgo),
        ));

      return { atRisk, trialExpiring, inactive };
    }),

    // Document health checker — detect missing files, broken references
    getDocumentHealth: adminUnlockedProcedure.query(async () => {
      const dbConn = await getDb();
      if (!dbConn) return { total: 0, missing: [], orphaned: 0 };

      const allDocs = await dbConn
        .select({
          id: documents.id,
          fileName: documents.fileName,
          fileKey: documents.fileKey,
          fileUrl: documents.fileUrl,
          userId: documents.userId,
          horseId: documents.horseId,
          category: documents.category,
          createdAt: documents.createdAt,
        })
        .from(documents);

      const missing: Array<{ id: number; fileName: string; fileKey: string; userId: number; category: string | null }> = [];
      let orphaned = 0;

      const uploadsDir = path.resolve(ENV.storagePath);

      for (const doc of allDocs) {
        // Check if file exists on disk
        if (doc.fileKey) {
          const filePath = path.resolve(uploadsDir, doc.fileKey);
          // Path traversal protection — ensure file stays within uploads dir
          if (!filePath.startsWith(uploadsDir + path.sep) && filePath !== uploadsDir) {
            continue;
          }
          if (!fs.existsSync(filePath)) {
            missing.push({
              id: doc.id,
              fileName: doc.fileName,
              fileKey: doc.fileKey,
              userId: doc.userId,
              category: doc.category,
            });
          }
        }

        // Check for orphaned documents (no associated horse)
        if (!doc.horseId) {
          orphaned++;
        }
      }

      return { total: allDocs.length, missing, orphaned };
    }),

    // Activity logs
    getActivityLogs: adminUnlockedProcedure
      .input(z.object({ limit: z.number().default(100) }))
      .query(async ({ input }) => {
        return db.getActivityLogs(input.limit);
      }),

    // System settings
    getSettings: adminUnlockedProcedure.query(async () => {
      return db.getAllSettings();
    }),

    updateSetting: adminUnlockedProcedure
      .input(
        z.object({
          key: z.string(),
          value: z.string(),
          type: z.enum(["string", "number", "boolean", "json"]).optional(),
          description: z.string().max(10000).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        await db.upsertSetting(
          input.key,
          input.value,
          input.type,
          input.description,
          ctx.user!.id,
        );
        await db.logActivity({
          userId: ctx.user!.id,
          action: "setting_updated",
          entityType: "setting",
          details: JSON.stringify({ key: input.key }),
        });
        return { success: true };
      }),

    // Backup logs
    getBackupLogs: adminUnlockedProcedure
      .input(z.object({ limit: z.number().default(10) }))
      .query(async ({ input }) => {
        return db.getRecentBackups(input.limit);
      }),

    // API Key Management
    apiKeys: router({
      list: adminUnlockedProcedure.query(async ({ ctx }) => {
        return db.listApiKeys(ctx.user.id);
      }),

      create: adminUnlockedProcedure
        .input(
          z.object({
            name: z.string().min(1).max(100),
            rateLimit: z.number().min(1).max(10000).optional(),
            permissions: z.array(z.string()).optional(),
            expiresAt: z.string().optional(),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const result = await db.createApiKey({
            userId: ctx.user!.id,
            name: input.name,
            rateLimit: input.rateLimit,
            permissions: input.permissions,
            expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
          });

          await db.logActivity({
            userId: ctx.user!.id,
            action: "api_key_created",
            entityType: "api_key",
            entityId: result.id,
            details: JSON.stringify({ name: input.name }),
          });

          return result; // Contains { id, key }
        }),

      revoke: adminUnlockedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ ctx, input }) => {
          await db.revokeApiKey(input.id, ctx.user.id);
          await db.logActivity({
            userId: ctx.user!.id,
            action: "api_key_revoked",
            entityType: "api_key",
            entityId: input.id,
          });
          return { success: true };
        }),

      rotate: adminUnlockedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ ctx, input }) => {
          const result = await db.rotateApiKey(input.id, ctx.user.id);
          if (!result) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "API key not found",
            });
          }

          await db.logActivity({
            userId: ctx.user!.id,
            action: "api_key_rotated",
            entityType: "api_key",
            entityId: input.id,
          });

          return result; // Contains { key }
        }),

      updateSettings: adminUnlockedProcedure
        .input(
          z.object({
            id: z.number(),
            name: z.string().max(500).optional(),
            rateLimit: z.number().optional(),
            permissions: z.array(z.string()).optional(),
            isActive: z.boolean().optional(),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const { id, ...data } = input;
          await db.updateApiKeySettings(id, ctx.user.id, data);
          await db.logActivity({
            userId: ctx.user!.id,
            action: "api_key_updated",
            entityType: "api_key",
            entityId: id,
          });
          return { success: true };
        }),
    }),

    // WhatsApp (Twilio) configuration
    getWhatsAppConfig: adminUnlockedProcedure.query(async () => {
      const enabled =
        process.env.ENABLE_WHATSAPP === "true" ||
        (await getRuntimeConfig("whatsapp_enabled", "ENABLE_WHATSAPP")) === "true";
      const hasAccountSid = !!(
        process.env.TWILIO_ACCOUNT_SID ||
        (await getRuntimeConfig("twilio_account_sid", "TWILIO_ACCOUNT_SID"))
      );
      const hasAuthToken = !!(
        process.env.TWILIO_AUTH_TOKEN ||
        (await getRuntimeConfig("twilio_auth_token", "TWILIO_AUTH_TOKEN"))
      );
      const fromNumber =
        process.env.TWILIO_WHATSAPP_FROM ||
        (await getRuntimeConfig("twilio_whatsapp_from", "TWILIO_WHATSAPP_FROM")) ||
        "";
      return {
        enabled,
        hasAccountSid,
        hasAuthToken,
        fromNumber: fromNumber ? "***configured***" : "",
      };
    }),

    updateWhatsAppConfig: adminUnlockedProcedure
      .input(
        z.object({
          enabled: z.boolean(),
          accountSid: z.string().optional(),
          authToken: z.string().optional(),
          fromNumber: z.string().optional(),
        }),
      )
      .mutation(async ({ input }) => {
        const dbConn = await getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const upsert = async (key: string, value: string) => {
          await dbConn.execute(
            sql`INSERT INTO \`siteSettings\` (\`key\`, \`value\`)
                VALUES (${key}, ${value})
                ON DUPLICATE KEY UPDATE \`value\` = ${value}`,
          );
          invalidateConfigCache(key);
        };
        await upsert("whatsapp_enabled", String(input.enabled));
        if (input.accountSid) {
          await upsert("twilio_account_sid", input.accountSid);
        }
        if (input.authToken) {
          await upsert("twilio_auth_token", input.authToken);
        }
        if (input.fromNumber) {
          await upsert("twilio_whatsapp_from", input.fromNumber);
        }
        return { success: true };
      }),

    // Environment Health Check
    getEnvHealth: adminUnlockedProcedure.query(async () => {
      const aiConfigured = await isAIConfigured();
      // Check SMTP config from both env and dashboard settings (DB)
      const smtpHost = process.env.SMTP_HOST || (await getRuntimeConfig("smtp_host", "SMTP_HOST"));
      const smtpUser = process.env.SMTP_USER || (await getRuntimeConfig("smtp_user", "SMTP_USER"));
      const smtpPass = process.env.SMTP_PASS || (await getRuntimeConfig("smtp_pass", "SMTP_PASS"));
      const smtpConfigured = !!(smtpUser && smtpPass);
      const smtpHostSet = !!smtpHost;
      const smtpSource = (process.env.SMTP_USER && process.env.SMTP_PASS)
        ? "environment"
        : smtpConfigured ? "dashboard settings" : "";
      const checks = [
        // Core required vars (always critical)
        {
          name: "DATABASE_URL",
          status: !!process.env.DATABASE_URL,
          critical: true,
          conditional: false,
          description: "MySQL/MariaDB connection string — required for all data storage",
        },
        {
          name: "JWT_SECRET",
          status: !!process.env.JWT_SECRET,
          critical: true,
          conditional: false,
          description: "Secret used to sign authentication tokens — must be long and random",
        },
        {
          name: "ADMIN_UNLOCK_PASSWORD",
          status: !!process.env.ADMIN_UNLOCK_PASSWORD,
          critical: true,
          conditional: false,
          description: "Password to unlock the admin panel — bcrypt hash recommended",
        },

        // Stripe vars (critical only if ENABLE_STRIPE=true)
        {
          name: "STRIPE_SECRET_KEY",
          status: !!process.env.STRIPE_SECRET_KEY,
          critical: ENV.enableStripe,
          conditional: true,
          requiredWhen: "ENABLE_STRIPE=true",
          description: "Stripe secret API key — required when billing is enabled",
        },
        {
          name: "STRIPE_WEBHOOK_SECRET",
          status: !!process.env.STRIPE_WEBHOOK_SECRET,
          critical: ENV.enableStripe,
          conditional: true,
          requiredWhen: "ENABLE_STRIPE=true",
          description: "Stripe webhook signing secret — required to verify payment events",
        },

        // Upload/Storage vars (optional - falls back to local disk when not configured)
        {
          name: "STORAGE_PROXY_URL",
          status: !!(
            process.env.STORAGE_PROXY_URL || process.env.BUILT_IN_FORGE_API_URL
          ),
          critical: false,
          conditional: true,
          requiredWhen: "ENABLE_UPLOADS=true with proxy storage",
          description: "URL of the file storage proxy — falls back to local disk if unset",
        },
        {
          name: "STORAGE_PROXY_KEY",
          status: !!(
            process.env.STORAGE_PROXY_KEY || process.env.BUILT_IN_FORGE_API_KEY
          ),
          critical: false,
          conditional: true,
          requiredWhen: "ENABLE_UPLOADS=true with proxy storage",
          description: "API key for the storage proxy — required alongside STORAGE_PROXY_URL",
        },

        // Legacy AWS vars (optional - kept for backward compatibility)
        {
          name: "AWS_ACCESS_KEY_ID",
          status: !!process.env.AWS_ACCESS_KEY_ID,
          critical: false,
          conditional: false,
          description: "AWS credentials for S3 uploads (legacy — prefer storage proxy)",
        },
        {
          name: "AWS_SECRET_ACCESS_KEY",
          status: !!process.env.AWS_SECRET_ACCESS_KEY,
          critical: false,
          conditional: false,
          description: "AWS secret key for S3 — required alongside AWS_ACCESS_KEY_ID",
        },
        {
          name: "AWS_S3_BUCKET",
          status: !!process.env.AWS_S3_BUCKET,
          critical: false,
          conditional: false,
          description: "S3 bucket name for file storage (legacy)",
        },

        // Optional features
        {
          name: "GENX_API_KEY",
          status: aiConfigured,
          critical: false,
          conditional: false,
          description: "GenX API key — primary AI orchestration provider for chat and planning",
        },
        {
          name: "SMTP_HOST",
          status: smtpHostSet,
          critical: false,
          conditional: false,
          description: smtpConfigured
            ? `SMTP configured via ${smtpSource} — email is functional`
            : "SMTP server hostname — set in environment or Admin → Settings to enable email",
        },
      ];

      const allCriticalOk = checks
        .filter((c) => c.critical)
        .every((c) => c.status);

      return {
        healthy: allCriticalOk,
        checks,
        featureFlags: {
          enableStripe: ENV.enableStripe,
          enableUploads: true, // Local disk storage always available
        },
        environment: process.env.NODE_ENV || "development",
        timestamp: new Date().toISOString(),
      };
    }),

    // AI diagnostics — provider health, task stats, queue health, failures
    getAIDiagnostics: adminUnlockedProcedure.query(async () => {
      return getAIDiagnostics();
    }),

    runFullProviderTest: adminUnlockedProcedure.mutation(async () => {
      return runFullProviderSelfTest();
    }),

    testRawGenXConnection: adminUnlockedProcedure.mutation(async () => {
      return testRawGenXConnection();
    }),

    inferMarketingRequest: adminUnlockedProcedure
      .input(z.object({ prompt: z.string().min(3).max(6000) }))
      .query(async ({ input }) => inferMarketingRequest(input.prompt)),

    createMarketingDraft: adminUnlockedProcedure
      .input(
        z.object({
          prompt: z.string().min(10).max(6000),
          platform: z.enum(MARKETING_PLATFORMS).optional(),
          format: z.enum(MARKETING_FORMATS).optional(),
          durationSeconds: z.number().min(1).max(3600).nullable().optional(),
          goal: z.enum(MARKETING_GOALS).optional(),
          tone: z.enum(MARKETING_TONES).optional(),
          tenantId: z.string().min(1).max(100).default("global"),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const tenantScope: TenantScope = {
          tenantType: "stable",
          tenantId: input.tenantId,
          initiatedByUserId: ctx.user.id,
        };

        const inferred = inferMarketingRequest(input.prompt);
        const platform = input.platform ?? (inferred.platform as (typeof MARKETING_PLATFORMS)[number]);
        const format = input.format ?? (inferred.format as (typeof MARKETING_FORMATS)[number]);
        const goal = input.goal ?? (inferred.goal as (typeof MARKETING_GOALS)[number]);
        const tone = input.tone ?? "professional";
        const durationSeconds = input.durationSeconds ?? inferred.durationSeconds;
        const capabilityPlan = await getCapabilityPlan(inferred.intent);
        const agentTimeline = await getAgentTimelineForIntent(inferred.intent);

        // Load brand profile for enrichment (non-critical)
        let brandContext = "";
        let brandProfile: Awaited<ReturnType<typeof getBrandProfile>> = null;
        try {
          brandProfile = await getBrandProfile(input.tenantId);
          brandContext = buildBrandContextString(brandProfile);
        } catch {
          // Brand profile is non-critical — draft still generates without it
        }

        // Load active avatar if avatar content is requested (non-critical)
        let avatarContext = "";
        const isAvatarContent = format === "avatar video";
        if (isAvatarContent) {
          try {
            const avatar = await getActiveBrandAvatar(input.tenantId);
            avatarContext = buildAvatarPromptContext(avatar);
          } catch {
            // Avatar is non-critical
          }
        }

        // Load platform strategy rules (non-critical)
        let platformRulesContext = "";
        try {
          const rules = await getPlatformStrategyRules(platform);
          if (rules?.hookGuidelines?.length) {
            platformRulesContext = `Hook guidelines for ${platform}: ${rules.hookGuidelines.slice(0, 2).join("; ")}`;
          }
        } catch {
          // Platform rules are non-critical
        }

        const generationPrompt = buildMarketingGenerationPrompt({
          platform,
          format,
          intent: capabilityPlan.intent,
          durationSeconds,
          goal,
          tone,
          userPrompt: input.prompt,
          brandContext,
          avatarContext,
          platformRulesContext,
        });

        let generationResult: Awaited<ReturnType<typeof executeAITask>>;
        try {
          generationResult = await executeAITask({
            task: "copywriting",
            agentId: "StrategyAgent",
            tenantScope,
            requiresApproval: false,
            input: {
              prompt: generationPrompt,
              platform,
              format,
              goal,
              tone,
              durationSeconds: durationSeconds ?? null,
              max_tokens: 900,
            },
          });
        } catch (error) {
          const normalized = normalizeProviderError(error);
          if (normalized.providerMissing) {
            return {
              status: "provider_missing" as const,
              message: "AI provider unavailable. Check provider settings.",
              draft: null,
            };
          }
          if (normalized.message === "AI provider unavailable. Check provider settings.") {
            return {
              status: "provider_unavailable" as const,
              message: normalized.message,
              draft: null,
            };
          }
          throw new TRPCError({ code: "BAD_REQUEST", message: normalized.message });
        }

        const outputText = extractOutputText(generationResult.output);
        if (!outputText.trim()) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "AI provider returned empty content. Regenerate the draft; raw provider payload was not saved as user content.",
          });
        }
        const draftContent = buildMarketingDraftContent({
          prompt: input.prompt,
          platform,
          format,
          goal,
          tone,
          durationSeconds: durationSeconds ?? null,
          intent: capabilityPlan.intent,
          providerText: outputText,
        });

        // Score the draft (non-critical)
        let growthScore: ReturnType<typeof scoreMarketingDraft> | null = null;
        try {
          growthScore = scoreMarketingDraft({
            hook: typeof draftContent.hook === "string" ? draftContent.hook : undefined,
            script: typeof draftContent.script === "string" ? draftContent.script : undefined,
            caption: typeof draftContent.caption === "string" ? draftContent.caption : undefined,
            cta: typeof draftContent.cta === "string" ? draftContent.cta : undefined,
            hashtags: Array.isArray(draftContent.hashtags) ? (draftContent.hashtags as string[]) : [],
            platform,
            format,
            durationSeconds,
            prohibitedClaims: brandProfile?.prohibitedClaims ?? [],
            targetAudience: brandProfile?.targetAudience ?? undefined,
            brandVoice: brandProfile?.brandVoice ?? undefined,
          });
        } catch {
          // Scoring is non-critical
        }

        const dbConn = await getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const now = new Date();
        const result = await dbConn.insert(growthQueueJobs).values({
          queueType: "approval",
          status: "draft",
          task: "copywriting",
          provider: generationResult.provider ?? "genx",
          tenantType: tenantScope.tenantType,
          tenantId: tenantScope.tenantId,
          createdByUserId: ctx.user.id,
          payloadJson: JSON.stringify({
            prompt: input.prompt,
            platform,
            format,
            durationSeconds: durationSeconds ?? null,
            goal,
            tone,
            intent: capabilityPlan.intent,
            capabilityPlan,
          }),
          outputJson: JSON.stringify(draftContent),
          metadataJson: JSON.stringify({
            workflow: "create",
            createdFrom: "marketing-studio",
            brandEnriched: !!brandContext,
            avatarEnriched: !!avatarContext,
            agentTimeline,
            auditLog: [{ at: now.toISOString(), action: "draft_created", actor: ctx.user.id }],
          }),
          attempts: 0,
          maxAttempts: 3,
          runAfter: now,
        });

        const draftId = String(result[0].insertId);

        // Persist the content score (non-critical)
        if (growthScore) {
          try {
            await saveContentScore({
              draftId,
              platform,
              hookScore: growthScore.hookScore,
              platformFitScore: growthScore.platformFitScore,
              conversionScore: growthScore.conversionScore,
              clarityScore: growthScore.clarityScore,
              complianceScore: growthScore.complianceScore,
              viralPotentialScore: growthScore.viralPotentialScore,
              reasons: growthScore.reasons,
              improvementSuggestions: growthScore.improvementSuggestions,
            });
          } catch {
            // Non-critical
          }
        }

        const mediaCapability: string[] = [];
        if (await canProducePlayableMedia("text_to_image")) mediaCapability.push("image");
        if (await canProducePlayableMedia("text_to_video")) mediaCapability.push("video");
        if (await canProducePlayableMedia("avatar_video")) mediaCapability.push("avatar");
        if (await canProducePlayableMedia("text_to_speech")) mediaCapability.push("voice");

        return {
          status: "created" as const,
          message: "Draft created",
          draft: {
            id: draftId,
            ...draftContent,
            growthScore: growthScore ?? undefined,
            inferredRequest: inferred,
            capabilityPlan,
            agentTimeline,
            recommendedMediaTask: inferMediaTaskFromMarketingInput(input.prompt),
            mediaStatus: mediaCapability.length
              ? `Script ready. Media routes available for: ${mediaCapability.join(", ")}. Video becomes ready only after a queued job or playable asset exists.`
              : "Script ready. Video model missing until a media-capable provider/model is configured.",
          },
        };
      }),

    updateMarketingDraft: adminUnlockedProcedure
      .input(
        z.object({
          id: z.string().min(1),
          fields: z.record(z.string(), z.unknown()),
        }),
      )
      .mutation(async ({ input }) => {
        const dbConn = await getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const idNum = Number(input.id);
        const [existing] = await dbConn
          .select()
          .from(growthQueueJobs)
          .where(and(eq(growthQueueJobs.id, idNum), eq(growthQueueJobs.queueType, "approval")))
          .limit(1);
        if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Marketing draft not found" });
        const currentOutput = parseJsonSafe<Record<string, unknown>>(existing.outputJson, {});
        const metadata = parseJsonSafe<Record<string, unknown>>(existing.metadataJson, {});
        const auditLog = Array.isArray(metadata.auditLog) ? metadata.auditLog : [];
        auditLog.unshift({ at: new Date().toISOString(), action: "draft_updated" });
        const nextOutput = { ...currentOutput, ...input.fields, approvalStatus: existing.status };
        await dbConn
          .update(growthQueueJobs)
          .set({
            outputJson: JSON.stringify(nextOutput),
            metadataJson: JSON.stringify({ ...metadata, auditLog }),
            updatedAt: new Date(),
          })
          .where(eq(growthQueueJobs.id, idNum));
        return { success: true, draft: { id: input.id, ...nextOutput } };
      }),

    sendMarketingDraftToApproval: adminUnlockedProcedure
      .input(z.object({ id: z.string().min(1) }))
      .mutation(async ({ input }) => {
        return aiApprovalQueue.submitForReview(input.id);
      }),

    approveMarketingDraft: adminUnlockedProcedure
      .input(z.object({ id: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        return aiApprovalQueue.approve(input.id, ctx.user.id);
      }),

    rejectMarketingDraft: adminUnlockedProcedure
      .input(
        z.object({
          id: z.string().min(1),
          reason: z.string().min(3).max(1000),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        return aiApprovalQueue.reject(input.id, ctx.user.id, input.reason);
      }),

    scheduleMarketingDraft: adminUnlockedProcedure
      .input(
        z.object({
          id: z.string().min(1),
          scheduleAt: z.string().datetime(),
        }),
      )
      .mutation(async ({ input }) => {
        return aiApprovalQueue.schedule(input.id, input.scheduleAt);
      }),

    listMarketingDrafts: adminUnlockedProcedure
      .input(
        z
          .object({
            tenantId: z.string().min(1).max(100).default("global"),
          })
          .optional(),
      )
      .query(async ({ input }) => {
        const dbConn = await getDb();
        if (!dbConn) return [];
        const rows = await dbConn
          .select()
          .from(growthQueueJobs)
          .where(
            and(
              eq(growthQueueJobs.queueType, "approval"),
              eq(growthQueueJobs.status, "draft"),
              eq(growthQueueJobs.tenantId, input?.tenantId ?? "global"),
            ),
          )
          .orderBy(desc(growthQueueJobs.updatedAt))
          .limit(200);
        return rows.map((row) => ({
          id: String(row.id),
          status: row.status,
          task: row.task,
          provider: row.provider,
          payload: parseJsonSafe<Record<string, unknown>>(row.payloadJson, {}),
          output: parseJsonSafe<Record<string, unknown>>(row.outputJson, {}),
          updatedAt: row.updatedAt.toISOString(),
          createdAt: row.createdAt.toISOString(),
        }));
      }),

    listApprovalQueue: adminUnlockedProcedure
      .input(
        z
          .object({
            tenantId: z.string().min(1).max(100).default("global"),
          })
          .optional(),
      )
      .query(async ({ input }) => {
        const dbConn = await getDb();
        if (!dbConn) return [];
        const rows = await dbConn
          .select()
          .from(growthQueueJobs)
          .where(
            and(
              eq(growthQueueJobs.queueType, "approval"),
              eq(growthQueueJobs.status, "needs_review"),
              eq(growthQueueJobs.tenantId, input?.tenantId ?? "global"),
            ),
          )
          .orderBy(desc(growthQueueJobs.updatedAt))
          .limit(200);
        return rows.map((row) => ({
          id: String(row.id),
          status: row.status,
          task: row.task,
          provider: row.provider,
          payload: parseJsonSafe<Record<string, unknown>>(row.payloadJson, {}),
          output: parseJsonSafe<Record<string, unknown>>(row.outputJson, {}),
          updatedAt: row.updatedAt.toISOString(),
          createdAt: row.createdAt.toISOString(),
        }));
      }),

    listMarketingCalendar: adminUnlockedProcedure
      .input(
        z
          .object({
            tenantId: z.string().min(1).max(100).default("global"),
          })
          .optional(),
      )
      .query(async ({ input }) => {
        const dbConn = await getDb();
        if (!dbConn) return [];
        const rows = await dbConn
          .select()
          .from(growthQueueJobs)
          .where(
            and(
              eq(growthQueueJobs.queueType, "approval"),
              eq(growthQueueJobs.status, "scheduled"),
              eq(growthQueueJobs.tenantId, input?.tenantId ?? "global"),
            ),
          )
          .orderBy(desc(growthQueueJobs.scheduleAt))
          .limit(200);
        return rows.map((row) => ({
          id: String(row.id),
          task: row.task,
          scheduleAt: row.scheduleAt?.toISOString() ?? null,
          payload: parseJsonSafe<Record<string, unknown>>(row.payloadJson, {}),
          output: parseJsonSafe<Record<string, unknown>>(row.outputJson, {}),
        }));
      }),

    listMarketingAssets: adminUnlockedProcedure
      .input(
        z
          .object({
            tenantId: z.string().min(1).max(100).default("global"),
          })
          .optional(),
      )
      .query(async ({ input }) => {
        const dbConn = await getDb();
        if (!dbConn) return [];
        const rows = await dbConn
          .select()
          .from(growthQueueJobs)
          .where(
            and(
              eq(growthQueueJobs.queueType, "media"),
              eq(growthQueueJobs.tenantId, input?.tenantId ?? "global"),
            ),
          )
          .orderBy(desc(growthQueueJobs.updatedAt))
          .limit(200);
        return rows.map((row) => ({
          id: String(row.id),
          task: row.task,
          provider: row.provider,
          state: row.status,
          metadata: parseJsonSafe<Record<string, unknown>>(row.payloadJson, {}),
          outputs: parseJsonSafe<Record<string, unknown>>(row.outputJson, {}),
          error: row.errorMessage ?? null,
          updatedAt: row.updatedAt.toISOString(),
        }));
      }),

    // ── Media Asset Registry (Update 1) ──────────────────────────────────────
    // Structured asset listing from the new mediaAssets table.
    // listMarketingAssets above reads raw growthQueueJobs — this reads the registry.

    listMediaAssets: adminUnlockedProcedure
      .input(z.object({ tenantId: z.string().min(1).max(100).default("global") }).optional())
      .query(async ({ input }) => {
        await resolvePendingGenXMediaAssets(10).catch(() => undefined);
        const assets = await listMediaAssetsForTenant(input?.tenantId ?? "global");
        return Promise.all(assets.map(async (asset) => ({
          ...asset,
          lifecycle: asset.jobId ? await getGenerationLifecycleByJobId(asset.jobId).catch(() => null) : null,
        })));
      }),

    getMediaAsset: adminUnlockedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .query(async ({ input }) => {
        const asset = await getMediaAssetById(input.id);
        if (!asset) return null;
        const lifecycle = asset.jobId ? await getGenerationLifecycleByJobId(asset.jobId).catch(() => null) : null;
        return { ...asset, lifecycle };
      }),

    deleteMediaAsset: adminUnlockedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input }) => {
        await deleteMediaAsset(input.id);
        return { success: true };
      }),

    permanentDeleteMediaAsset: adminUnlockedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input }) => {
        const asset = await getMediaAssetById(input.id);
        if (!asset) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Media asset not found" });
        }

        const candidatePaths = new Set<string>();
        const pushPath = (value: unknown) => {
          if (typeof value !== "string") return;
          const trimmed = value.trim();
          if (!trimmed) return;
          if (trimmed.startsWith("/media/generated/")) {
            const resolved = toSafeLocalMediaPathFromPublicUrl(trimmed);
            if (resolved) candidatePaths.add(resolved);
            return;
          }
          const resolved = path.resolve(trimmed);
          const generatedRoot = path.resolve(STORAGE_ROOT, "generated");
          if (resolved.startsWith(generatedRoot + path.sep) || resolved === generatedRoot) {
            candidatePaths.add(resolved);
          }
        };
        const walkMetadata = (value: unknown) => {
          if (Array.isArray(value)) {
            for (const entry of value) walkMetadata(entry);
            return;
          }
          if (value && typeof value === "object") {
            for (const entry of Object.values(value as Record<string, unknown>)) walkMetadata(entry);
            return;
          }
          pushPath(value);
        };

        pushPath(asset.localPath);
        pushPath(asset.publicUrl);
        walkMetadata(asset.outputMetadata);

        const files: Array<{ path: string; deleted: boolean; reason?: string }> = [];
        for (const filePath of candidatePaths) {
          try {
            await fs.promises.unlink(filePath);
            files.push({ path: filePath, deleted: true });
          } catch (error) {
            const code = (error as NodeJS.ErrnoException).code;
            if (code === "ENOENT") {
              files.push({ path: filePath, deleted: false, reason: "missing" });
            } else {
              files.push({ path: filePath, deleted: false, reason: code || "unlink_failed" });
            }
          }
        }

        await deleteMediaAssetRow(input.id);
        return {
          success: true as const,
          deletedAssetId: input.id,
          files,
        };
      }),

    createBrandedMediaAsset: adminUnlockedProcedure
      .input(
        z.object({
          rawAssetId: z.number().int().positive(),
          domainText: z.string().max(120).optional(),
          ctaText: z.string().max(160).optional(),
          watermarkText: z.string().max(120).optional(),
          aspectRatio: z.enum(["9:16", "1:1", "16:9"]).default("16:9"),
        }),
      )
      .mutation(async ({ input }) => {
        try {
          const branded = await createBrandedMediaDerivative(input.rawAssetId, {
            domainText: input.domainText,
            ctaText: input.ctaText,
            watermarkText: input.watermarkText,
            aspectRatio: input.aspectRatio,
          });
          return {
            status: "completed" as const,
            ...branded,
          };
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          return {
            status: message.includes("ffmpeg")
              ? "setup_needed" as const
              : "failed" as const,
            message,
          };
        }
      }),

    createVoiceoverMediaAsset: adminUnlockedProcedure
      .input(
        z.object({
          rawAssetId: z.number().int().positive(),
          voiceoverText: z.string().min(5).max(6000),
          voiceId: z.string().max(120).optional(),
          requestedDurationSeconds: z.enum(["5", "10", "15", "30", "60", "180"]).transform((value) => Number(value)).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const raw = await getMediaAssetById(input.rawAssetId);
        if (!raw) throw new TRPCError({ code: "NOT_FOUND", message: "Raw video asset not found." });
        if (!input.voiceId) {
          const setupAsset = await createMediaAsset({
            tenantType: raw.tenantType,
            tenantId: raw.tenantId,
            userId: ctx.user.id,
            campaignId: raw.campaignId ?? undefined,
            draftId: raw.draftId ?? undefined,
            type: "voice",
            provider: "genx",
            task: "text_to_speech",
            status: "failed",
            generationPrompt: input.voiceoverText,
            outputMetadata: {
              resultType: "setup_needed",
              setupReason: "voice_id_required",
              rawAssetId: raw.id,
              audioPlan: "voiceover_requested",
              voiceoverText: input.voiceoverText,
              musicPrompt: null,
              requestedDurationSeconds: input.requestedDurationSeconds ?? null,
              actualDurationSeconds: null,
              providerMaxDurationSeconds: null,
            },
            errorMessage: "setup_needed: select a valid voice before generating voiceover.",
          });
          return { status: "setup_needed" as const, assetId: setupAsset.id, message: "Select a valid voice before generating voiceover." };
        }

        const tenantScope: TenantScope = {
          tenantType: raw.tenantType as any,
          tenantId: raw.tenantId,
          initiatedByUserId: ctx.user.id,
        };
        try {
          const result = await executeAITask({
            task: "text_to_speech",
            agentId: "MediaAgent",
            tenantScope,
            requiresApproval: false,
            input: {
              prompt: input.voiceoverText,
              text: input.voiceoverText,
              voiceId: input.voiceId,
              requestedDurationSeconds: input.requestedDurationSeconds,
              duration: input.requestedDurationSeconds,
              draftId: raw.draftId ?? undefined,
              rawAssetId: raw.id,
              audioPlan: "voiceover_requested",
              voiceoverText: input.voiceoverText,
              musicPrompt: null,
            },
          });
          const voiceAsset = result.jobId ? await getMediaAssetByJobId(result.jobId).catch(() => null) : null;
          await updateMediaAsset(raw.id, {
            outputMetadata: {
              ...(raw.outputMetadata ?? {}),
              voiceAssetId: voiceAsset?.id ?? null,
              audioPlan: "voiceover_requested",
              voiceoverText: input.voiceoverText,
              isSilent: false,
            },
          });
          return { ...result, status: "queued" as const, rawAssetId: raw.id, voiceAssetId: voiceAsset?.id };
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          const setupAsset = await createMediaAsset({
            tenantType: raw.tenantType,
            tenantId: raw.tenantId,
            userId: ctx.user.id,
            campaignId: raw.campaignId ?? undefined,
            draftId: raw.draftId ?? undefined,
            type: "voice",
            provider: "genx",
            task: "text_to_speech",
            status: "failed",
            generationPrompt: input.voiceoverText,
            outputMetadata: {
              resultType: "setup_needed",
              setupReason: "voice_unavailable",
              rawAssetId: raw.id,
              audioPlan: "voiceover_requested",
              voiceoverText: input.voiceoverText,
              musicPrompt: null,
              requestedDurationSeconds: input.requestedDurationSeconds ?? null,
              actualDurationSeconds: null,
              providerMaxDurationSeconds: null,
            },
            errorMessage: message,
          });
          return { status: "setup_needed" as const, assetId: setupAsset.id, message };
        }
      }),

    createMusicMediaAsset: adminUnlockedProcedure
      .input(
        z.object({
          rawAssetId: z.number().int().positive(),
          musicPrompt: z.string().min(5).max(6000),
          requestedDurationSeconds: z.enum(["5", "10", "15", "30", "60", "180"]).transform((value) => Number(value)).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const raw = await getMediaAssetById(input.rawAssetId);
        if (!raw) throw new TRPCError({ code: "NOT_FOUND", message: "Raw video asset not found." });
        const setupAsset = await createMediaAsset({
          tenantType: raw.tenantType,
          tenantId: raw.tenantId,
          userId: ctx.user.id,
          campaignId: raw.campaignId ?? undefined,
          draftId: raw.draftId ?? undefined,
          type: "voice",
          provider: "genx",
          task: "text_to_speech",
          status: "failed",
          generationPrompt: input.musicPrompt,
          outputMetadata: {
            resultType: "setup_needed",
            setupReason: "music_provider_unavailable",
            rawAssetId: raw.id,
            audioPlan: "music_requested",
            voiceoverText: null,
            musicPrompt: input.musicPrompt,
            requestedDurationSeconds: input.requestedDurationSeconds ?? null,
            actualDurationSeconds: null,
            providerMaxDurationSeconds: null,
          },
          errorMessage: "setup_needed: music generation provider is not ready yet.",
        });
        return {
          status: "setup_needed" as const,
          assetId: setupAsset.id,
          message: "Music generation provider is not ready yet.",
        };
      }),

    // ── Brand Profile (Update 1) ──────────────────────────────────────────────

    getBrandProfile: adminUnlockedProcedure
      .input(z.object({ tenantId: z.string().min(1).max(100).default("global") }).optional())
      .query(async ({ input }) => {
        return getBrandProfile(input?.tenantId ?? "global");
      }),

    updateBrandProfile: adminUnlockedProcedure
      .input(
        z.object({
          tenantId: z.string().min(1).max(100).default("global"),
          name: z.string().max(200).optional(),
          brandVoice: z.string().max(2000).optional(),
          targetAudience: z.string().max(2000).optional(),
          positioning: z.string().max(2000).optional(),
          primaryCta: z.string().max(200).optional(),
          prohibitedClaims: z.array(z.string().max(200)).optional(),
          approvedClaims: z.array(z.string().max(200)).optional(),
          hashtagStyle: z.string().max(80).optional(),
          contentPillars: z.array(z.string().max(200)).optional(),
        }),
      )
      .mutation(async ({ input }) => {
        return upsertBrandProfile({ ...input });
      }),

    // ── Brand Avatars (Update 1) ──────────────────────────────────────────────

    listBrandAvatars: adminUnlockedProcedure
      .input(z.object({ tenantId: z.string().min(1).max(100).default("global") }).optional())
      .query(async ({ input }) => {
        return listBrandAvatars(input?.tenantId ?? "global");
      }),

    createBrandAvatar: adminUnlockedProcedure
      .input(
        z.object({
          tenantId: z.string().min(1).max(100).default("global"),
          name: z.string().min(1).max(200),
          role: z.string().max(120).optional(),
          visualDescription: z.string().max(2000).optional(),
          personality: z.string().max(2000).optional(),
          voiceStyle: z.string().max(120).optional(),
          accent: z.string().max(80).optional(),
          wardrobeRules: z.string().max(2000).optional(),
          backgroundRules: z.string().max(2000).optional(),
          promptTemplate: z.string().max(4000).optional(),
          negativePrompt: z.string().max(2000).optional(),
        }),
      )
      .mutation(async ({ input }) => {
        return createBrandAvatar({ ...input });
      }),

    updateBrandAvatar: adminUnlockedProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          name: z.string().min(1).max(200).optional(),
          role: z.string().max(120).optional(),
          visualDescription: z.string().max(2000).optional(),
          personality: z.string().max(2000).optional(),
          voiceStyle: z.string().max(120).optional(),
          accent: z.string().max(80).optional(),
          wardrobeRules: z.string().max(2000).optional(),
          backgroundRules: z.string().max(2000).optional(),
          promptTemplate: z.string().max(4000).optional(),
          negativePrompt: z.string().max(2000).optional(),
        }),
      )
      .mutation(async ({ input: { id, ...patch } }) => {
        await updateBrandAvatar(id, patch);
        return { success: true };
      }),

    archiveBrandAvatar: adminUnlockedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input }) => {
        await archiveBrandAvatar(input.id);
        return { success: true };
      }),

    // ── Growth Intelligence (Update 1) ────────────────────────────────────────

    getQueueStatus: adminUnlockedProcedure.query(async () => {
      return getQueueStatus();
    }),

    seedPlatformStrategyRules: adminUnlockedProcedure.mutation(async () => {
      await seedPlatformStrategyRules();
      return { success: true };
    }),

    getPlatformStrategyRules: adminUnlockedProcedure
      .input(z.object({ platform: z.string().min(1).max(80) }))
      .query(async ({ input }) => {
        return getPlatformStrategyRules(input.platform);
      }),

    // ── Content Scoring (Update 1) ────────────────────────────────────────────

    scoreMarketingDraftById: adminUnlockedProcedure
      .input(
        z.object({
          draftId: z.string().min(1),
          platform: z.string().min(1).max(80),
          tenantId: z.string().min(1).max(100).default("global"),
          hook: z.string().max(1000).optional(),
          script: z.string().max(10000).optional(),
          caption: z.string().max(5000).optional(),
          cta: z.string().max(500).optional(),
          hashtags: z.array(z.string().max(100)).optional(),
          format: z.string().max(80).optional(),
          durationSeconds: z.number().nullable().optional(),
        }),
      )
      .mutation(async ({ input }) => {
        const { draftId, tenantId, ...scoreInput } = input;
        let brandProfile: Awaited<ReturnType<typeof getBrandProfile>> = null;
        try {
          brandProfile = await getBrandProfile(tenantId);
        } catch {
          // Non-critical
        }
        const result = scoreMarketingDraft({
          ...scoreInput,
          prohibitedClaims: brandProfile?.prohibitedClaims ?? [],
          targetAudience: brandProfile?.targetAudience ?? undefined,
          brandVoice: brandProfile?.brandVoice ?? undefined,
        });
        // Persist the score
        try {
          await saveContentScore({
            draftId,
            platform: input.platform,
            ...result,
            reasons: result.reasons,
            improvementSuggestions: result.improvementSuggestions,
          });
        } catch {
          // Non-critical — return score even if persistence fails
        }
        return result;
      }),

    // Backward-compatible alias kept for existing internal callers.
    generateMarketingDraft: adminUnlockedProcedure
      .input(
        z.object({
          kind: z.enum([
            "social_post",
            "email_campaign",
            "launch_calendar",
            "image_prompt",
            "video_prompt",
            "avatar_script",
          ]),
          prompt: z.string().min(10).max(6000),
          platform: z.string().max(80).optional(),
          tenantId: z.string().min(1).max(100).default("global"),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const tenantScope: TenantScope = {
          tenantType: "stable",
          tenantId: input.tenantId,
          initiatedByUserId: ctx.user.id,
        };
        const agentId: AgentId =
          input.kind === "image_prompt" ||
          input.kind === "video_prompt" ||
          input.kind === "avatar_script"
            ? "MediaAgent"
            : "GrowthAgent";
        try {
          return await executeAITask({
            task: "copywriting",
            agentId,
            tenantScope,
            requiresApproval: true,
            input: {
              prompt: [
                `Create an internal-beta ${input.kind.replace(/_/g, " ")} draft for EquiProfile.`,
                input.platform ? `Target platform: ${input.platform}.` : "",
                "Do not invent testimonials, charity partnerships, accreditation, guarantees, or direct publishing claims.",
                "Return concise, approval-ready content with a short rationale and next recommended action.",
                input.prompt,
              ]
                .filter(Boolean)
                .join("\\n"),
              kind: input.kind,
              platform: input.platform,
            },
          });
        } catch (error) {
          const normalized = normalizeProviderError(error);
          if (normalized.providerMissing) {
            return { status: "provider_missing", message: "AI provider unavailable. Check provider settings." } as const;
          }
          if (normalized.message === "AI provider unavailable. Check provider settings.") {
            return { status: "provider_unavailable", message: normalized.message } as const;
          }
          throw new TRPCError({ code: "BAD_REQUEST", message: normalized.message });
        }
      }),

    createMediaJob: adminUnlockedProcedure
      .input(
        z.object({
          task: z.enum(["text_to_image", "image_edit", "image_to_video", "text_to_video", "avatar_video", "text_to_speech"]),
          prompt: z.string().min(5).max(6000),
          requestedDurationSeconds: z.enum(["5", "10", "15", "30", "60", "180"]).transform((value) => Number(value)).optional(),
          promptControls: z.array(z.enum(["more_cinematic", "more_realistic", "more_premium", "no_people", "horse_showcase", "product_demo", "stable_owner_focus"])).optional(),
          voiceId: z.string().min(1).max(120).optional(),
          draftId: z.string().min(1).optional(),
          quality: z.enum(["standard", "elite", "fast", "cinematic", "avatar"]).default("standard"),
          platform: z.string().max(80).optional(),
          presenterId: z.number().int().positive().optional(),
          uploadedAssetRef: z.string().max(500).optional(),
          tenantId: z.string().min(1).max(100).default("global"),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const tenantScope: TenantScope = {
          tenantType: "stable",
          tenantId: input.tenantId,
          initiatedByUserId: ctx.user.id,
        };
        const compiledPrompt = compileMarketingPrompt({
          task: input.task as "text_to_image" | "image_edit" | "text_to_video" | "image_to_video" | "avatar_video" | "text_to_speech",
          userPrompt: input.prompt,
          platform: input.platform,
          quality: input.quality,
          requestedDurationSeconds: input.requestedDurationSeconds,
          promptControls: input.promptControls,
          brandName: "EquiProfile",
        });
        const capability = await getMediaCapabilityTruth(input.task);
        const candidatePool = await resolveModelCandidatesForTask(input.task, true);
        const preferredModelOrder = getPreferredModelOrder(input.task);
        const candidates = [...candidatePool].sort((a, b) => {
          const ai = preferredModelOrder.indexOf(a.id);
          const bi = preferredModelOrder.indexOf(b.id);
          if (ai >= 0 || bi >= 0) {
            if (ai < 0) return 1;
            if (bi < 0) return -1;
            return ai - bi;
          }
          return 0;
        });
        if (!candidates.length) {
          const setupAsset = await createMediaAsset({
            tenantType: tenantScope.tenantType,
            tenantId: tenantScope.tenantId,
            userId: ctx.user.id,
            type: mediaTypeFromAdminTask(input.task),
            provider: capability.selectedProvider ?? capability.candidates?.[0]?.provider ?? "genx",
            task: input.task,
            status: "failed",
            generationPrompt: compiledPrompt.prompt,
            draftId: input.draftId,
            outputMetadata: {
              resultType: "setup_needed",
              mediaCapabilityStatus: capability.status,
              compiledPrompt,
              originalUserPrompt: input.prompt,
              requestedDurationSeconds: input.requestedDurationSeconds ?? compiledPrompt.durationSeconds ?? null,
              actualDurationSeconds: null,
              providerMaxDurationSeconds: null,
              source: "app_media_job_setup_needed",
              candidates: capability.candidates?.map((candidate) => ({
                provider: candidate.provider,
                model: candidate.id,
                reason: candidate.routeReason,
              })) ?? [],
            },
            errorMessage: capability.userMessage,
          });
          return {
            status: "setup_needed" as const,
            task: input.task,
            mediaCapabilityStatus: capability.status,
            message: capability.userMessage,
            assetId: setupAsset.id,
            requestedDurationSeconds: input.requestedDurationSeconds ?? compiledPrompt.durationSeconds,
            actualDurationSeconds: null,
            providerMaxDurationSeconds: null,
            candidates: candidates.map((candidate) => ({
              provider: candidate.provider,
              model: candidate.id,
              reason: candidate.routeReason,
            })),
          };
        }
        try {
          const requestedDurationSeconds = input.requestedDurationSeconds;
          const selectedProvider = capability.selectedProvider ?? candidates[0]?.provider ?? "genx";
          const selectedCandidate = candidates.find((candidate) => candidate.provider === selectedProvider) ?? candidates[0];
          const durationSupport = getProviderDurationSupport(selectedProvider as any, input.task);
          if (
            (input.task === "text_to_video" || input.task === "image_to_video" || input.task === "avatar_video") &&
            requestedDurationSeconds &&
            requestedDurationSeconds > durationSupport.maxDurationSeconds
          ) {
            const scenePlan = buildScenePipelinePlan(
              compiledPrompt.prompt,
              requestedDurationSeconds,
              durationSupport.maxDurationSeconds,
            );
            const plannedAsset = await createMediaAsset({
              tenantType: tenantScope.tenantType,
              tenantId: tenantScope.tenantId,
              userId: ctx.user.id,
              type: mediaTypeFromAdminTask(input.task),
              provider: selectedProvider,
              task: input.task,
              status: "created",
              generationPrompt: compiledPrompt.prompt,
              draftId: input.draftId,
              outputMetadata: {
                resultType: "scene_plan_required",
                requestedDurationSeconds,
                actualDurationSeconds: null,
                providerMaxDurationSeconds: durationSupport.maxDurationSeconds,
                compiledPrompt,
                originalUserPrompt: input.prompt,
                audioPlan: "silent_base_video",
                voiceoverText: null,
                musicPrompt: null,
                scenePlan,
                source: "app_media_job_scene_plan",
              },
              errorMessage: null,
            });
            return {
              status: "scene_plan_required" as const,
              task: input.task,
              assetId: plannedAsset.id,
              selectedProvider,
              requestedDurationSeconds,
              actualDurationSeconds: null,
              providerMaxDurationSeconds: durationSupport.maxDurationSeconds,
              resultType: "scene_plan_required" as const,
              scenePlan,
              message: `Requested ${requestedDurationSeconds}s exceeds ${selectedProvider} max ${durationSupport.maxDurationSeconds}s; scene plan is required.`,
            };
          }
          const result = await executeAITask({
            task: input.task,
            agentId: "MediaAgent",
            tenantScope,
            requiresApproval: false,
            input:
              input.task === "avatar_video"
                ? {
                  script: compiledPrompt.prompt,
                  negative_prompt: compiledPrompt.negativePrompt,
                  originalPrompt: input.prompt,
                  model: selectedCandidate?.id,
                  draftId: input.draftId,
                  quality: input.quality,
                  platform: input.platform,
                  presenterId: input.presenterId,
                  uploadedAssetRef: input.uploadedAssetRef,
                  requestedDurationSeconds,
                  duration: compiledPrompt.durationSeconds ?? requestedDurationSeconds,
                  voiceId: input.voiceId,
                  actualDurationSeconds: compiledPrompt.durationSeconds ?? requestedDurationSeconds,
                  providerMaxDurationSeconds: durationSupport.maxDurationSeconds,
                  audioPlan: "silent_base_video",
                  voiceoverText: null,
                  musicPrompt: null,
                  promptCompiler: compiledPrompt,
                }
                : {
                  prompt: compiledPrompt.prompt,
                  negative_prompt: compiledPrompt.negativePrompt,
                  originalPrompt: input.prompt,
                  model: selectedCandidate?.id,
                  draftId: input.draftId,
                  quality: input.quality,
                  platform: input.platform,
                  presenterId: input.presenterId,
                  uploadedAssetRef: input.uploadedAssetRef,
                  requestedDurationSeconds,
                  duration: compiledPrompt.durationSeconds ?? requestedDurationSeconds,
                  voiceId: input.voiceId,
                  actualDurationSeconds: compiledPrompt.durationSeconds ?? requestedDurationSeconds,
                  providerMaxDurationSeconds: durationSupport.maxDurationSeconds,
                  audioPlan: input.task === "text_to_video" ? "silent_base_video" : null,
                  voiceoverText: input.task === "text_to_speech" ? input.prompt : null,
                  musicPrompt: null,
                  promptCompiler: compiledPrompt,
                },
          });
          // Look up the mediaAsset row created by the orchestrator so we can return assetId
          let assetId: number | undefined;
          if (result.jobId) {
            try {
              const asset = await getMediaAssetByJobId(result.jobId);
              assetId = asset?.id;
            } catch {
              // non-critical
            }
          }
          return {
            ...result,
            assetId,
            selectedProvider: result.provider,
            selectedModel: result.model ?? selectedCandidate?.id ?? capability.selectedModel,
            routeReason: result.routeReason ?? capability.routeReason,
            mediaCapabilityStatus: capability.status,
            requestedDurationSeconds: requestedDurationSeconds ?? compiledPrompt.durationSeconds,
            actualDurationSeconds: compiledPrompt.durationSeconds ?? requestedDurationSeconds ?? null,
            providerMaxDurationSeconds: durationSupport.maxDurationSeconds,
          };
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          const setupNeeded = /setup_needed[:\s]/i.test(message);
          const capabilityAny = capability as any;
          const failedAsset = await createMediaAsset({
            tenantType: tenantScope.tenantType,
            tenantId: tenantScope.tenantId,
            userId: ctx.user.id,
            type: mediaTypeFromAdminTask(input.task),
            provider: capabilityAny.selectedProvider ?? capabilityAny.candidates?.[0]?.provider ?? "genx",
            task: input.task,
            status: "failed",
            generationPrompt: compiledPrompt.prompt,
            draftId: input.draftId,
            outputMetadata: {
              resultType: setupNeeded ? "setup_needed" : "failed",
              selectedModel: capabilityAny.selectedModel ?? null,
              routeReason: capabilityAny.routeReason ?? null,
              compiledPrompt,
              originalUserPrompt: input.prompt,
              requestedDurationSeconds: input.requestedDurationSeconds ?? compiledPrompt.durationSeconds ?? null,
              actualDurationSeconds: null,
              providerMaxDurationSeconds: null,
              source: "app_media_job_failed",
            },
            errorMessage: message,
          });
          return {
            status: setupNeeded ? "setup_needed" as const : "provider_failed" as const,
            task: input.task,
            mediaCapabilityStatus: setupNeeded ? "setup_needed" as const : "provider_failed" as const,
            assetId: failedAsset.id,
            message,
            requestedDurationSeconds: input.requestedDurationSeconds ?? compiledPrompt.durationSeconds ?? null,
            actualDurationSeconds: null,
            providerMaxDurationSeconds: null,
          };
        }
      }),

    testGenXMediaGeneration: adminUnlockedProcedure
      .input(
        z.object({
          task: z.enum(["text_to_image", "text_to_video", "avatar_video", "text_to_speech"]),
          prompt: z.string().min(5).max(6000),
          model: z.string().min(1).max(200).optional(),
          tenantId: z.string().min(1).max(100).default("global"),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const jobId = `genx-test-${nanoid(12)}`;
        const tenantScope: TenantScope = {
          tenantType: "stable",
          tenantId: input.tenantId,
          initiatedByUserId: ctx.user.id,
        };
        const initial = await createMediaAsset({
          tenantType: tenantScope.tenantType,
          tenantId: tenantScope.tenantId,
          userId: ctx.user.id,
          jobId,
          type: mediaTypeFromAdminTask(input.task),
          provider: "genx",
          task: input.task,
          status: "processing",
          generationPrompt: input.prompt,
          outputMetadata: {
            resultType: "direct_genx_test_started",
            requestedModel: input.model ?? null,
            source: "app_genx_media_job",
          },
        });

        try {
          const result = await executeGenXTask(
            input.task,
            input.task === "avatar_video"
              ? { script: input.prompt, model: input.model }
              : input.task === "text_to_speech"
                ? { text: input.prompt, model: input.model }
                : { prompt: input.prompt, model: input.model },
            120_000,
          );
          const normalised = normalizeProviderOutput({
            output: result.output,
            provider: result.provider,
            model: result.model,
            task: input.task,
            latencyMs: result.latencyMs,
          });
          const persisted = await persistProviderOutput({
            normalised,
            output: result.output,
            task: input.task,
            jobId,
          });
          const status = persisted.resultType === "failed"
            ? "failed"
            : persisted.resultType === "job_pending"
              ? "processing"
              : "completed";
          await updateMediaAsset(initial.id, {
            status,
            publicUrl: persisted.publicUrl ?? undefined,
            localPath: persisted.localPath ?? undefined,
            mimeType: persisted.mimeType ?? undefined,
            errorMessage: persisted.errorMessage ?? undefined,
            outputMetadata: {
              resultType: persisted.resultType,
              provider: result.provider,
              model: result.model,
              task: input.task,
              routeReason: result.routeReason,
              providerJobId: persisted.providerJobId,
              providerStatus: persisted.providerStatus,
              remoteUrl: persisted.remoteUrl,
              source: persisted.source ?? "app_genx_media_job",
            },
          });
          return {
            status,
            task: input.task,
            assetId: initial.id,
            jobId,
            selectedProvider: "genx",
            selectedModel: result.model,
            publicUrl: persisted.publicUrl,
            mimeType: persisted.mimeType,
            resultType: persisted.resultType,
            message: persisted.resultType === "job_pending"
              ? "GenX accepted the media job. Watch Assets for completion."
              : persisted.errorMessage ?? "GenX media generation completed.",
          };
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          await updateMediaAsset(initial.id, {
            status: "failed",
            errorMessage: message,
            outputMetadata: {
              resultType: "failed",
              provider: "genx",
              requestedModel: input.model ?? null,
              task: input.task,
              source: "app_genx_media_job",
            },
          });
          return {
            status: "failed" as const,
            task: input.task,
            assetId: initial.id,
            jobId,
            selectedProvider: "genx",
            selectedModel: input.model ?? null,
            message,
          };
        }
      }),

    getMediaJob: adminUnlockedProcedure
      .input(z.object({ jobId: z.string().min(1) }))
      .query(async ({ input }) => {
        const jobs = await getQueueStatus();
        const inMemoryJob = (jobs as any)?.jobs?.find?.((job: any) => String(job.id) === input.jobId) ?? null;
        const dbConn = await getDb();
        if (!dbConn) return inMemoryJob;
        const idNum = Number(input.jobId);
        if (!Number.isFinite(idNum)) return inMemoryJob;
        const [row] = await dbConn.select().from(growthQueueJobs).where(eq(growthQueueJobs.id, idNum)).limit(1);
        if (!row) return inMemoryJob;
        return {
          id: String(row.id),
          task: row.task,
          provider: row.provider,
          state: row.status,
          payload: parseJsonSafe<Record<string, unknown>>(row.payloadJson, {}),
          outputs: parseJsonSafe<Record<string, unknown>>(row.outputJson, {}),
          error: row.errorMessage ?? null,
          updatedAt: row.updatedAt.toISOString(),
          createdAt: row.createdAt.toISOString(),
        };
      }),

    resolveMediaJobs: adminUnlockedProcedure
      .input(
        z.object({
          tenantId: z.string().min(1).max(100).optional(),
          assetId: z.number().int().positive().optional(),
          limit: z.number().int().min(1).max(50).default(20),
        }),
      )
      .mutation(async ({ input }) => {
        return resolveMediaJobs({
          tenantId: input.tenantId,
          assetId: input.assetId,
          limit: input.limit,
        });
      }),

    listPendingMediaAssets: adminUnlockedProcedure
      .input(
        z.object({
          tenantId: z.string().min(1).max(100).optional(),
          limit: z.number().int().min(1).max(100).default(50),
        }),
      )
      .query(async ({ input }) => {
        return listPendingMediaAssets({ tenantId: input.tenantId, limit: input.limit });
      }),

    getProviderTelemetry: adminUnlockedProcedure
      .input(
        z.object({
          provider: z.enum(["genx", "huggingface", "qwen"]).optional(),
          task: z.enum(["chat", "copywriting", "strategy", "campaign_generation", "social_generation", "email_generation", "text_to_image", "image_edit", "image_to_video", "text_to_video", "avatar_video", "speech_to_text", "text_to_speech", "image_captioning", "classification", "moderation", "embeddings", "analytics"]).optional(),
          tenantId: z.string().min(1).max(100).optional(),
          lookbackDays: z.number().int().min(1).max(90).default(30),
        }).optional(),
      )
      .query(async ({ input }) => {
        return getProviderTelemetrySummary(input ?? {});
      }),

    getProviderRanking: adminUnlockedProcedure
      .input(
        z.object({
          task: z.enum(["chat", "copywriting", "strategy", "campaign_generation", "social_generation", "email_generation", "text_to_image", "image_edit", "image_to_video", "text_to_video", "avatar_video", "speech_to_text", "text_to_speech", "image_captioning", "classification", "moderation", "embeddings", "analytics"]),
          tenantId: z.string().min(1).max(100).optional(),
        }),
      )
      .query(async ({ input }) => {
        return rankProvidersForTask(input.task, { tenantId: input.tenantId });
      }),

    approveMarketingItem: adminUnlockedProcedure
      .input(z.object({ id: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        return aiApprovalQueue.approve(input.id, ctx.user.id);
      }),

    rejectMarketingItem: adminUnlockedProcedure
      .input(
        z.object({
          id: z.string().min(1),
          reason: z.string().min(3).max(1000),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        return aiApprovalQueue.reject(input.id, ctx.user.id, input.reason);
      }),

    scheduleMarketingItem: adminUnlockedProcedure
      .input(
        z.object({
          id: z.string().min(1),
          scheduleAt: z.string().datetime(),
        }),
      )
      .mutation(async ({ input }) => {
        return aiApprovalQueue.schedule(input.id, input.scheduleAt);
      }),

    // ── Site Settings (admin notification email + feature toggles) ──────────
    getSiteSettings: adminUnlockedProcedure.query(async () => {
      const dbConn = await getDb();
      if (!dbConn) return {};
      const rows = await dbConn.select().from(siteSettings);
      return Object.fromEntries(rows.map((r) => [r.key, r.value ?? ""]));
    }),

    setSiteSetting: adminUnlockedProcedure
      .input(
        z.object({
          key: z
            .string()
            .min(1)
            .max(100)
            .regex(
              /^[a-z_]+$/,
              "Key must be lowercase letters and underscores only",
            ),
          value: z.string().max(2000),
        }),
      )
      .mutation(async ({ input }) => {
        const normalizedValue = normalizeSiteSettingValue(input.key, input.value);
        const dbConn = await getDb();
        if (!dbConn)
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });
        try {
          // Use explicit column list (no id/updatedAt) to avoid DEFAULT keyword
          // issues across MySQL versions.  The UNIQUE key on `key` triggers
          // ON DUPLICATE KEY UPDATE when the same key is saved a second time.
          await dbConn.execute(
            sql`INSERT INTO \`siteSettings\` (\`key\`, \`value\`)
                VALUES (${input.key}, ${normalizedValue})
                ON DUPLICATE KEY UPDATE \`value\` = ${normalizedValue}`,
          );
          invalidateConfigCache(input.key);
          return { success: true, key: input.key, normalized: normalizedValue !== input.value };
        } catch (err) {
          console.error("[admin.setSiteSetting] DB error:", err);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message:
              "Failed to save setting. Check that the siteSettings table exists and is up to date (run migrations).",
          });
        }
      }),

    // ── AI Provider Settings (admin-only, masked secrets) ──────────────────
    listAIProviderSettings: adminUnlockedProcedure.query(async () => {
      const dbConn = await getDb();
      const stored: Record<string, string> = {};
      if (dbConn) {
        const rows = await dbConn.select().from(siteSettings);
        for (const row of rows) {
          stored[row.key] = row.value ?? "";
        }
      }
      const getVal = (key: string, envKey: string): string =>
        stored[key] || process.env[envKey] || "";

      const marketingGenxKey = pickSettingValue(stored, MARKETING_PROVIDER_KEY_ALIASES.genx, "GENX_API_KEY");
      const marketingHfKey = pickSettingValue(stored, MARKETING_PROVIDER_KEY_ALIASES.huggingface, "HUGGINGFACE_API_KEY");
      const marketingQwenKey = pickSettingValue(stored, MARKETING_PROVIDER_KEY_ALIASES.qwen, "QWEN_API_KEY");
      const marketingPexelsKey = pickSettingValue(stored, MARKETING_PROVIDER_KEY_ALIASES.pexels);
      const marketingPixabayKey = pickSettingValue(stored, MARKETING_PROVIDER_KEY_ALIASES.pixabay);

      return {
        genx: {
          provider: "genx" as const,
          configured: !!marketingGenxKey,
          keyMasked: marketingGenxKey ? maskProviderSecret(marketingGenxKey) : null,
          settings: {
            genx_base_url: getVal("genx_base_url", "GENX_BASE_URL"),
            genx_default_model: getVal("genx_default_model", "GENX_DEFAULT_MODEL"),
            genx_model: getVal("genx_model", "GENX_MODEL"),
            genx_text_model: getVal("genx_text_model", "GENX_TEXT_MODEL"),
            genx_strategy_model: getVal("genx_strategy_model", "GENX_STRATEGY_MODEL"),
            genx_image_model: getVal("genx_image_model", "GENX_IMAGE_MODEL"),
            genx_video_model: getVal("genx_video_model", "GENX_VIDEO_MODEL"),
            genx_avatar_model: getVal("genx_avatar_model", "GENX_AVATAR_MODEL"),
            genx_voice_model: getVal("genx_voice_model", "GENX_VOICE_MODEL"),
            genx_audio_model: getVal("genx_audio_model", "GENX_AUDIO_MODEL"),
            genx_tts_model: getVal("genx_tts_model", "GENX_TTS_MODEL"),
            genx_vision_model: getVal("genx_vision_model", "GENX_VISION_MODEL"),
          },
        },
        huggingface: {
          provider: "huggingface" as const,
          configured: !!marketingHfKey,
          keyMasked: marketingHfKey ? maskProviderSecret(marketingHfKey) : null,
          settings: {
            hf_task_chat_model: getVal("hf_task_chat_model", "HF_TASK_CHAT_MODEL"),
            hf_task_copywriting_model: getVal("hf_task_copywriting_model", "HF_TASK_COPYWRITING_MODEL"),
            hf_task_text_generation_model: getVal("hf_task_text_generation_model", "HF_TASK_TEXT_GENERATION_MODEL"),
            hf_task_text_generation_models: getVal("hf_task_text_generation_models", "HF_TASK_TEXT_GENERATION_MODELS"),
            hf_task_text_generation_fallbacks: getVal("hf_task_text_generation_fallbacks", "HF_TASK_TEXT_GENERATION_FALLBACKS"),
            hf_task_text_to_image_model: getVal("hf_task_text_to_image_model", "HF_TASK_TEXT_TO_IMAGE_MODEL"),
            hf_task_text_to_image_fallbacks: getVal("hf_task_text_to_image_fallbacks", "HF_TASK_TEXT_TO_IMAGE_FALLBACKS"),
            hf_task_text_to_video_model: getVal("hf_task_text_to_video_model", "HF_TASK_TEXT_TO_VIDEO_MODEL"),
            hf_task_text_to_video_fallbacks: getVal("hf_task_text_to_video_fallbacks", "HF_TASK_TEXT_TO_VIDEO_FALLBACKS"),
            hf_task_image_to_video_model: getVal("hf_task_image_to_video_model", "HF_TASK_IMAGE_TO_VIDEO_MODEL"),
            hf_task_avatar_video_model: getVal("hf_task_avatar_video_model", "HF_TASK_AVATAR_VIDEO_MODEL"),
            hf_task_text_to_speech_model: getVal("hf_task_text_to_speech_model", "HF_TASK_TEXT_TO_SPEECH_MODEL"),
            hf_task_text_to_speech_fallbacks: getVal("hf_task_text_to_speech_fallbacks", "HF_TASK_TEXT_TO_SPEECH_FALLBACKS"),
            hf_task_speech_to_text_model: getVal("hf_task_speech_to_text_model", "HF_TASK_SPEECH_TO_TEXT_MODEL"),
            hf_task_automatic_speech_recognition_model: getVal("hf_task_automatic_speech_recognition_model", "HF_TASK_AUTOMATIC_SPEECH_RECOGNITION_MODEL"),
            hf_task_automatic_speech_recognition_models: getVal("hf_task_automatic_speech_recognition_models", "HF_TASK_AUTOMATIC_SPEECH_RECOGNITION_MODELS"),
            hf_task_automatic_speech_recognition_fallbacks: getVal("hf_task_automatic_speech_recognition_fallbacks", "HF_TASK_AUTOMATIC_SPEECH_RECOGNITION_FALLBACKS"),
            hf_task_image_captioning_model: getVal("hf_task_image_captioning_model", "HF_TASK_IMAGE_CAPTIONING_MODEL"),
            hf_task_image_to_text_model: getVal("hf_task_image_to_text_model", "HF_TASK_IMAGE_TO_TEXT_MODEL"),
            hf_task_image_to_text_models: getVal("hf_task_image_to_text_models", "HF_TASK_IMAGE_TO_TEXT_MODELS"),
            hf_task_image_to_text_fallbacks: getVal("hf_task_image_to_text_fallbacks", "HF_TASK_IMAGE_TO_TEXT_FALLBACKS"),
            hf_task_feature_extraction_model: getVal("hf_task_feature_extraction_model", "HF_TASK_FEATURE_EXTRACTION_MODEL"),
            hf_task_feature_extraction_models: getVal("hf_task_feature_extraction_models", "HF_TASK_FEATURE_EXTRACTION_MODELS"),
            hf_task_feature_extraction_fallbacks: getVal("hf_task_feature_extraction_fallbacks", "HF_TASK_FEATURE_EXTRACTION_FALLBACKS"),
            hf_task_embeddings_model: getVal("hf_task_embeddings_model", "HF_TASK_EMBEDDINGS_MODEL"),
            hf_task_moderation_model: getVal("hf_task_moderation_model", "HF_TASK_MODERATION_MODEL"),
            hf_task_classification_model: getVal("hf_task_classification_model", "HF_TASK_CLASSIFICATION_MODEL"),
            hf_task_text_classification_model: getVal("hf_task_text_classification_model", "HF_TASK_TEXT_CLASSIFICATION_MODEL"),
            hf_task_text_classification_models: getVal("hf_task_text_classification_models", "HF_TASK_TEXT_CLASSIFICATION_MODELS"),
            hf_task_text_classification_fallbacks: getVal("hf_task_text_classification_fallbacks", "HF_TASK_TEXT_CLASSIFICATION_FALLBACKS"),
            hf_task_zero_shot_classification_model: getVal("hf_task_zero_shot_classification_model", "HF_TASK_ZERO_SHOT_CLASSIFICATION_MODEL"),
            hf_task_zero_shot_classification_models: getVal("hf_task_zero_shot_classification_models", "HF_TASK_ZERO_SHOT_CLASSIFICATION_MODELS"),
            hf_task_zero_shot_classification_fallbacks: getVal("hf_task_zero_shot_classification_fallbacks", "HF_TASK_ZERO_SHOT_CLASSIFICATION_FALLBACKS"),
            hf_use_default_text_generation: getVal("hf_use_default_text_generation", "HF_USE_DEFAULT_TEXT_GENERATION"),
            hf_use_default_text_to_image: getVal("hf_use_default_text_to_image", "HF_USE_DEFAULT_TEXT_TO_IMAGE"),
            hf_use_default_text_to_video: getVal("hf_use_default_text_to_video", "HF_USE_DEFAULT_TEXT_TO_VIDEO"),
            hf_use_default_text_to_speech: getVal("hf_use_default_text_to_speech", "HF_USE_DEFAULT_TEXT_TO_SPEECH"),
            hf_use_default_automatic_speech_recognition: getVal("hf_use_default_automatic_speech_recognition", "HF_USE_DEFAULT_AUTOMATIC_SPEECH_RECOGNITION"),
            hf_use_default_image_to_text: getVal("hf_use_default_image_to_text", "HF_USE_DEFAULT_IMAGE_TO_TEXT"),
            hf_use_default_feature_extraction: getVal("hf_use_default_feature_extraction", "HF_USE_DEFAULT_FEATURE_EXTRACTION"),
            hf_use_default_text_classification: getVal("hf_use_default_text_classification", "HF_USE_DEFAULT_TEXT_CLASSIFICATION"),
            hf_use_default_zero_shot_classification: getVal("hf_use_default_zero_shot_classification", "HF_USE_DEFAULT_ZERO_SHOT_CLASSIFICATION"),
          },
        },
        qwen: {
          provider: "qwen" as const,
          configured: !!marketingQwenKey,
          keyMasked: marketingQwenKey ? maskProviderSecret(marketingQwenKey) : null,
          settings: {
            qwen_base_url: getVal("qwen_base_url", "QWEN_BASE_URL"),
            qwen_model: getVal("qwen_model", "QWEN_MODEL"),
            qwen_text_model: getVal("qwen_text_model", "QWEN_TEXT_MODEL"),
            qwen_vision_model: getVal("qwen_vision_model", "QWEN_VISION_MODEL"),
            qwen_image_model: getVal("qwen_image_model", "QWEN_IMAGE_MODEL"),
            qwen_video_model: getVal("qwen_video_model", "QWEN_VIDEO_MODEL"),
            qwen_audio_model: getVal("qwen_audio_model", "QWEN_AUDIO_MODEL"),
            qwen_embedding_model: getVal("qwen_embedding_model", "QWEN_EMBEDDING_MODEL"),
            dashscope_wan_text_to_video_model: getVal("dashscope_wan_text_to_video_model", "DASHSCOPE_WAN_TEXT_TO_VIDEO_MODEL"),
            dashscope_wan_image_to_video_model: getVal("dashscope_wan_image_to_video_model", "DASHSCOPE_WAN_IMAGE_TO_VIDEO_MODEL"),
            dashscope_image_model: getVal("dashscope_image_model", "DASHSCOPE_IMAGE_MODEL"),
            dashscope_audio_model: getVal("dashscope_audio_model", "DASHSCOPE_AUDIO_MODEL"),
          },
        },
        pexels: {
          provider: "pexels" as const,
          configured: !!marketingPexelsKey,
          keyMasked: marketingPexelsKey ? maskProviderSecret(marketingPexelsKey) : null,
          settings: {},
        },
        pixabay: {
          provider: "pixabay" as const,
          configured: !!marketingPixabayKey,
          keyMasked: marketingPixabayKey ? maskProviderSecret(marketingPixabayKey) : null,
          settings: {},
        },
      };
    }),

    saveAIProviderSettings: adminUnlockedProcedure
      .input(
        z.object({
          settings: z.record(
            z.string().min(1).max(100).regex(/^[a-z_]+$/, "Key must be lowercase letters and underscores only"),
            z.string().max(2000),
          ),
        }),
      )
      .mutation(async ({ input }) => {
        const dbConn = await getDb();
        if (!dbConn) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        }
        const saved: string[] = [];
        const skipped: string[] = [];

        for (const [rawKey, value] of Object.entries(input.settings)) {
          const key = MARKETING_PROVIDER_SAVE_KEY_MAP[rawKey] ?? rawKey;
          // Validate it's a known provider setting key
          if (
            !PROVIDER_SECRET_SETTING_KEYS.has(key) &&
            !PROVIDER_MODEL_SETTING_KEYS.has(key) &&
            !PROVIDER_BASE_URL_SETTING_KEYS.has(key)
          ) {
            skipped.push(rawKey);
            continue;
          }
          // Skip blank or placeholder secrets — keep existing value in DB
          if (PROVIDER_SECRET_SETTING_KEYS.has(key) && (!value.trim() || value.includes("•"))) {
            skipped.push(rawKey);
            continue;
          }
          // Skip blank non-secret values
          if (!value.trim()) {
            skipped.push(rawKey);
            continue;
          }
          const normalizedValue = normalizeSiteSettingValue(key, value);
          try {
            await dbConn.execute(
              sql`INSERT INTO \`siteSettings\` (\`key\`, \`value\`)
                  VALUES (${key}, ${normalizedValue})
                  ON DUPLICATE KEY UPDATE \`value\` = ${normalizedValue}`,
            );
            invalidateConfigCache(key);
            saved.push(key);
          } catch (err) {
            console.error(`[admin.saveAIProviderSettings] DB error for key "${key}":`, err);
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: `Failed to save setting "${key}". Check that the siteSettings table exists and is up to date.`,
            });
          }
        }
        return { success: true, saved, skipped };
      }),

    testAIProviderConnection: adminUnlockedProcedure
      .input(z.object({ provider: z.enum(["genx", "huggingface", "qwen"]) }))
      .mutation(async ({ input }) => {
        if (input.provider === "genx") {
          const conn = await testRawGenXConnection(12_000);
          const discovery = conn.status === "success"
            ? await discoverGenXModelCatalogue(12_000).catch(() => null)
            : null;
          const taskRoutingCandidates = await resolveModelCandidatesForTask("text_to_video", true);
          const effectiveVideoRoute = taskRoutingCandidates[0] ?? null;
          const detailModelId = discovery?.categoryModels.video?.[0] ?? discovery?.models?.[0] ?? null;
          const detailEndpoint = detailModelId && discovery?.endpoint.catalogue
            ? `${discovery.endpoint.catalogue}/${encodeURIComponent(detailModelId)}`
            : null;
          return {
            ...conn,
            catalogueCount: discovery?.models.length ?? 0,
            modelCount: discovery?.models.length ?? 0,
            compatibilityModelCount: discovery?.compatibilityModels.length ?? 0,
            selectedModels: discovery?.models.slice(0, 10) ?? [],
            categoryCounts: discovery
              ? {
                text: discovery.categoryModels.text.length,
                image: discovery.categoryModels.image.length,
                video: discovery.categoryModels.video.length,
                voice: discovery.categoryModels.voice.length,
                audio: discovery.categoryModels.audio.length,
              }
              : null,
            categoryModels: discovery?.categoryModels ?? null,
            endpoints: discovery?.endpoint ?? null,
            selectedModelDetail: detailModelId ? { modelId: detailModelId, endpoint: detailEndpoint } : null,
            normalizedModels: discovery?.normalizedModels ?? [],
            effectiveRoutingPreview: effectiveVideoRoute
              ? {
                task: "text_to_video" as const,
                provider: effectiveVideoRoute.provider,
                model: effectiveVideoRoute.id,
                endpoint: effectiveVideoRoute.endpointFamily === "genx_async_job"
                  ? "/api/v1/generate"
                  : "/v1/chat/completions",
                output: effectiveVideoRoute.endpointFamily === "genx_async_job" ? "video/mp4" : "text/plain",
                polling: effectiveVideoRoute.endpointFamily === "genx_async_job" ? "/api/v1/jobs/:id" : null,
                endpointFamily: effectiveVideoRoute.endpointFamily,
              }
              : null,
            fallbackRoutingPreview: taskRoutingCandidates.slice(1, 4).map((candidate) => ({
              provider: candidate.provider,
              model: candidate.id,
              endpointFamily: candidate.endpointFamily,
            })),
          };
        }

        if (input.provider === "huggingface") {
          const key = await getRuntimeConfig("huggingface_api_key", "HUGGINGFACE_API_KEY");
          const diagnostics = await getHuggingFaceRoutingDiagnostics();
          const textModel = await getRuntimeConfig("hf_task_copywriting_model", "HF_TASK_COPYWRITING_MODEL");
          // resolveHuggingFaceTaskModel includes built-in defaults (e.g. FLUX.1-schnell for image)
          // so these will be non-empty even when not explicitly configured in DB/env.
          const imageModel = await resolveHuggingFaceTaskModel("text_to_image");
          const videoModel = await resolveHuggingFaceTaskModel("text_to_video");
          const avatarModel = await resolveHuggingFaceTaskModel("avatar_video");
          const ttsModel = await resolveHuggingFaceTaskModel("text_to_speech");
          const warnings: string[] = [];
          if (!textModel) warnings.push("No hf_task_copywriting_model set — chat/copywriting tasks will be skipped.");
          return {
            provider: "huggingface" as const,
            status: key ? ("key_present" as const) : ("missing_key" as const),
            configured: !!key,
            keyPresent: !!key,
            textModelConfigured: !!textModel,
            imageModelConfigured: !!imageModel,
            videoModelConfigured: !!videoModel,
            avatarModelConfigured: !!avatarModel,
            ttsModelConfigured: !!ttsModel,
            diagnostics,
            setupWarnings: warnings,
            message: key
              ? "Hugging Face API key is present. Use task-model test buttons to verify individual models."
              : "Missing huggingface_api_key. Add it to enable Hugging Face tasks.",
          };
        }

        if (input.provider === "qwen") {
          const key = await getRuntimeConfig("qwen_api_key", "QWEN_API_KEY");
          const baseUrl = await getRuntimeConfig("qwen_base_url", "QWEN_BASE_URL");
          const model = await getRuntimeConfig("qwen_model", "QWEN_MODEL");
          const textModel = await getRuntimeConfig("qwen_text_model", "QWEN_TEXT_MODEL");
          const imageModel = await getRuntimeConfig("dashscope_image_model", "DASHSCOPE_IMAGE_MODEL") || await getRuntimeConfig("qwen_image_model", "QWEN_IMAGE_MODEL");
          const videoModel = await getRuntimeConfig("dashscope_wan_text_to_video_model", "DASHSCOPE_WAN_TEXT_TO_VIDEO_MODEL") || await getRuntimeConfig("qwen_video_model", "QWEN_VIDEO_MODEL");
          const imageToVideoModel = await getRuntimeConfig("dashscope_wan_image_to_video_model", "DASHSCOPE_WAN_IMAGE_TO_VIDEO_MODEL");
          const audioModel = await getRuntimeConfig("dashscope_audio_model", "DASHSCOPE_AUDIO_MODEL") || await getRuntimeConfig("qwen_audio_model", "QWEN_AUDIO_MODEL");
          const warnings: string[] = [];
          if (!key) {
            return {
              provider: "qwen" as const,
              status: "missing_key" as const,
              configured: false,
              message: "Missing qwen_api_key. Add it to enable Qwen tasks.",
              setupWarnings: ["Add qwen_api_key and qwen_base_url to get started."],
            };
          }
          if (imageModel) warnings.push("Image generation requires DashScope native endpoint — status: setup_needed.");
          if (videoModel || imageToVideoModel) warnings.push("Wan video generation requires DashScope native endpoint — status: setup_needed.");
          if (audioModel) warnings.push("DashScope native audio generation requires native endpoint — status: setup_needed.");
          try {
            const testResult = await testQwenTextGeneration(12_000);
            return {
              ...testResult,
              configured: true,
              baseUrl: baseUrl || "(default DashScope)",
              selectedModels: [textModel || model].filter(Boolean),
              nativeMedia: {
                textToVideo: videoModel || null,
                imageToVideo: imageToVideoModel || null,
                image: imageModel || null,
                audio: audioModel || null,
                status: "setup_needed",
              },
              setupWarnings: warnings,
            };
          } catch (err) {
            return {
              provider: "qwen" as const,
              status: "failed" as const,
              configured: true,
              baseUrl: baseUrl || "(default DashScope)",
              message: err instanceof Error ? err.message : String(err),
              setupWarnings: warnings,
            };
          }
        }

        throw new TRPCError({ code: "BAD_REQUEST", message: "Unknown provider" });
      }),

    testAIProviderTaskModel: adminUnlockedProcedure
      .input(
        z.object({
          provider: z.enum(["genx", "huggingface", "qwen"]),
          task: z.string().min(1).max(60),
        }),
      )
      .mutation(async ({ input }) => {
        const { executeAITask: execTask } = await import("./_core/ai");
        const taskEnum = input.task as import("./_core/ai/types").AITask;
        const startedAt = Date.now();
        try {
          const result = await execTask({
            task: taskEnum,
            input: {
              prompt: "Return one sentence confirming this AI task model is operational.",
              max_tokens: 60,
            },
            tenantScope: { tenantType: "stable", tenantId: "admin-test", initiatedByUserId: 0 },
            timeoutMs: 18_000,
          });
          return {
            provider: input.provider,
            task: input.task,
            status: "success" as const,
            model: result.model ?? null,
            latencyMs: Date.now() - startedAt,
            outputStatus: result.status,
          };
        } catch (err) {
          return {
            provider: input.provider,
            task: input.task,
            status: "failed" as const,
            error: err instanceof Error ? err.message : String(err),
          };
        }
      }),

    getLeads: adminUnlockedProcedure.query(async () => {
      const dbConn = await getDb();
      if (!dbConn) return [];
      return dbConn.select().from(chatLeads).orderBy(desc(chatLeads.createdAt));
    }),

    // ──────────────────────────────────────────────────────────
    // Email Campaign Management
    // ──────────────────────────────────────────────────────────

    getTemplates: adminUnlockedProcedure.query(() => {
      return CAMPAIGN_TEMPLATES.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        previewColor: t.previewColor,
        category: t.category,
        isAdvanced: t.isAdvanced ?? false,
      }));
    }),

    previewTemplate: adminUnlockedProcedure
      .input(
        z.object({
          templateId: z.string(),
          mergeFields: z
            .object({
              firstName: z.string().optional(),
              subject: z.string().optional(),
              content: z.string().optional(),
            })
            .optional(),
        }),
      )
      .query(({ input }) => {
        const tpl = getTemplateById(input.templateId);
        if (!tpl) throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" });
        const html = applyMergeFields(tpl.getHtml(), {
          firstName: input.mergeFields?.firstName || "Preview User",
          email: "preview@example.com",
          currentDate: formatDateGB(),
          subject: input.mergeFields?.subject || "Campaign Subject",
          content: input.mergeFields?.content || "Your campaign content goes here.",
        });
        return { html };
      }),

    getSegmentCounts: adminUnlockedProcedure.query(async () => {
      const dbConn = await getDb();
      if (!dbConn) return { leads: 0, trial: 0, paid: 0, all: 0, marketing: 0, unsubscribed: 0, byCountry: [], byType: [] };

      const [leadsResult] = await dbConn
        .select({ count: sql<number>`COUNT(*)` })
        .from(chatLeads);
      const [trialResult] = await dbConn
        .select({ count: sql<number>`COUNT(*)` })
        .from(users)
        .where(
          and(
            eq(users.subscriptionStatus, "trial"),
            eq(users.isActive, true),
          ),
        );
      const [paidResult] = await dbConn
        .select({ count: sql<number>`COUNT(*)` })
        .from(users)
        .where(
          and(eq(users.subscriptionStatus, "active"), eq(users.isActive, true)),
        );
      const [allResult] = await dbConn
        .select({ count: sql<number>`COUNT(*)` })
        .from(users)
        .where(eq(users.isActive, true));
      const [marketingResult] = await dbConn
        .select({ count: sql<number>`COUNT(*)` })
        .from(marketingContacts)
        .where(eq(marketingContacts.status, "active"));
      const [unsubResult] = await dbConn
        .select({ count: sql<number>`COUNT(*)` })
        .from(emailUnsubscribes);

      // Country breakdown
      const byCountry = await dbConn
        .select({
          country: marketingContacts.country,
          count: sql<number>`COUNT(*)`,
        })
        .from(marketingContacts)
        .where(eq(marketingContacts.status, "active"))
        .groupBy(marketingContacts.country)
        .orderBy(sql`COUNT(*) DESC`);

      // Type breakdown
      const byType = await dbConn
        .select({
          contactType: marketingContacts.contactType,
          count: sql<number>`COUNT(*)`,
        })
        .from(marketingContacts)
        .where(eq(marketingContacts.status, "active"))
        .groupBy(marketingContacts.contactType)
        .orderBy(sql`COUNT(*) DESC`);

      return {
        leads: leadsResult?.count || 0,
        trial: trialResult?.count || 0,
        paid: paidResult?.count || 0,
        all: allResult?.count || 0,
        marketing: marketingResult?.count || 0,
        unsubscribed: unsubResult?.count || 0,
        byCountry: byCountry.map((r) => ({ country: r.country || "Unknown", count: r.count })),
        byType: byType.map((r) => ({ type: r.contactType || "individual", count: r.count })),
      };
    }),

    getCampaigns: adminUnlockedProcedure.query(async () => {
      const dbConn = await getDb();
      if (!dbConn) return [];
      return dbConn
        .select()
        .from(emailCampaigns)
        .orderBy(desc(emailCampaigns.createdAt));
    }),

    getCampaignDetails: adminUnlockedProcedure
      .input(z.object({ campaignId: z.number() }))
      .query(async ({ input }) => {
        const dbConn = await getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const [campaign] = await dbConn
          .select()
          .from(emailCampaigns)
          .where(eq(emailCampaigns.id, input.campaignId));
        if (!campaign) throw new TRPCError({ code: "NOT_FOUND" });

        const recipients = await dbConn
          .select()
          .from(emailCampaignRecipients)
          .where(eq(emailCampaignRecipients.campaignId, input.campaignId));

        return { campaign, recipients };
      }),

    createCampaign: adminUnlockedProcedure
      .input(
        z.object({
          name: z.string().min(1).max(200),
          subject: z.string().min(1).max(500),
          templateId: z.string(),
          segment: z.enum(["leads", "trial", "paid", "all", "marketing"]),
          targetCountry: z.string().optional(),
          targetType: z.string().optional(),
          dailyLimit: z.number().min(1).max(500).default(DEFAULT_DAILY_LIMIT),
          mergeFields: z
            .object({
              subject: z.string().optional(),
              content: z.string().optional(),
            })
            .optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const dbConn = await getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const tpl = getTemplateById(input.templateId);
        if (!tpl) throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" });

        // Apply static merge fields (content, subject) at creation time so the
        // stored htmlBody contains the admin's actual copy. Per-recipient fields
        // (firstName, email, unsubscribeLink) are applied at send time.
        const htmlBody = applyMergeFields(tpl.getHtml(), {
          subject: input.mergeFields?.subject || input.subject,
          content: input.mergeFields?.content || "",
        });

        const result = await dbConn.insert(emailCampaigns).values({
          name: input.name.slice(0, 200),
          subject: input.subject.slice(0, 500),
          htmlBody,
          templateId: input.templateId.slice(0, 50),
          segment: input.segment,
          customFilter: null,
          targetCountry: normalizeCountry(input.targetCountry) || null,
          targetType: input.targetType ? normalizeContactType(input.targetType) : null,
          dailyLimit: input.dailyLimit,
          sentToday: 0,
          lastSendDate: null,
          recipientCount: 0,
          sentCount: 0,
          failedCount: 0,
          status: "draft",
          sentAt: null,
          pausedAt: null,
          sentByUserId: ctx.user.id,
        });

        return { id: result[0].insertId };
      }),

    sendTestEmail: adminUnlockedProcedure
      .input(
        z.object({
          templateId: z.string(),
          subject: z.string(),
          mergeFields: z
            .object({
              firstName: z.string().optional(),
              subject: z.string().optional(),
              content: z.string().optional(),
            })
            .optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const tpl = getTemplateById(input.templateId);
        if (!tpl) throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" });

        const html = applyMergeFields(tpl.getHtml(), {
          firstName: input.mergeFields?.firstName || extractFirstName(ctx.user.name) || "Admin",
          email: ctx.user.email || "",
          currentDate: formatDateGB(),
          subject: input.mergeFields?.subject || input.subject,
          content: input.mergeFields?.content || "",
        });

        if (!ctx.user.email) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Admin email not found" });
        }

        await sendEmail(ctx.user.email, `[TEST] ${input.subject}`, html);
        return { success: true };
      }),

    sendCampaign: adminUnlockedProcedure
      .input(z.object({ campaignId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const dbConn = await getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        // Get campaign
        const [campaign] = await dbConn
          .select()
          .from(emailCampaigns)
          .where(eq(emailCampaigns.id, input.campaignId));

        if (!campaign)
          throw new TRPCError({ code: "NOT_FOUND", message: "Campaign not found" });
        if (campaign.status === "sent")
          throw new TRPCError({ code: "BAD_REQUEST", message: "Campaign already sent" });
        if (campaign.status === "sending")
          throw new TRPCError({ code: "BAD_REQUEST", message: "Campaign is currently sending" });

        // ── WEEKDAY-ONLY CHECK ──
        if (!isWeekday()) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Campaign sending is restricted to weekdays (Monday–Friday) to protect deliverability. Please try again on a weekday.",
          });
        }

        // ── SEND-HOURS CHECK (08:00–17:59 UTC) ──
        if (!isWithinSendHours()) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Campaign sending is only permitted between 08:00 and 18:00 UTC to protect deliverability. Please try again during business hours.",
          });
        }

        // ── GLOBAL MAILBOX CAP CHECK ──
        // Count ALL new outreach sends today across every campaign
        const today = getTodayDateString();
        const [globalLogResult] = await dbConn
          .select({ total: sql<number>`COALESCE(SUM(${campaignSendLog.sendCount}), 0)` })
          .from(campaignSendLog)
          .where(eq(campaignSendLog.sendDate, today));
        const globalOutreachSentToday = Number(globalLogResult?.total ?? 0);

        // Count follow-up sends today
        const [followupResult] = await dbConn
          .select({ total: sql<number>`COALESCE(COUNT(*), 0)` })
          .from(campaignSequenceRecipients)
          .where(and(
            eq(campaignSequenceRecipients.status, "sent"),
            sql`DATE(${campaignSequenceRecipients.sentAt}) = ${today}`,
          ));
        const globalFollowupSentToday = Number(followupResult?.total ?? 0);
        const globalTotalSentToday = globalOutreachSentToday + globalFollowupSentToday;

        if (globalTotalSentToday >= TOTAL_MAILBOX_DAILY_CAP) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Total mailbox cap of ${TOTAL_MAILBOX_DAILY_CAP} emails/day reached. All sends are deferred to tomorrow.`,
          });
        }
        if (globalOutreachSentToday >= NEW_OUTREACH_DAILY_CAP) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `New outreach cap of ${NEW_OUTREACH_DAILY_CAP} emails/day reached. Follow-up sends may still proceed; new outreach resumes tomorrow.`,
          });
        }

        // ── PER-CAMPAIGN DAILY LIMIT CHECK ──
        const dailyLimit = Math.min(campaign.dailyLimit || DEFAULT_DAILY_LIMIT, NEW_OUTREACH_DAILY_CAP);
        // Check how many we've already sent today for this campaign
        const [todayLog] = await dbConn
          .select({ sendCount: campaignSendLog.sendCount })
          .from(campaignSendLog)
          .where(and(
            eq(campaignSendLog.campaignId, input.campaignId),
            eq(campaignSendLog.sendDate, today),
          ));
        const alreadySentToday = todayLog?.sendCount || 0;
        const remainingToday = Math.max(0, dailyLimit - alreadySentToday);

        if (remainingToday === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Daily send limit of ${dailyLimit} reached for today. Try again tomorrow.`,
          });
        }

        // Mark as sending
        await dbConn
          .update(emailCampaigns)
          .set({ status: "sending" })
          .where(eq(emailCampaigns.id, input.campaignId));

        // Build recipient list based on segment
        type Recipient = { email: string; name: string | null; trialEndsAt?: Date | null; unsubscribeToken?: string };
        let recipients: Recipient[] = [];

        if (campaign.segment === "leads") {
          const leads = await dbConn.select().from(chatLeads);
          recipients = leads.map((l) => ({ email: l.email, name: l.name }));
        } else if (campaign.segment === "marketing") {
          // Marketing contacts segment — apply country/type filters
          const mcConditions: ReturnType<typeof eq>[] = [eq(marketingContacts.status, "active")];
          if (campaign.targetCountry) {
            mcConditions.push(eq(marketingContacts.country, campaign.targetCountry));
          }
          if (campaign.targetType) {
            mcConditions.push(eq(marketingContacts.contactType, campaign.targetType));
          }
          const contacts = await dbConn.select().from(marketingContacts)
            .where(and(...mcConditions));
          recipients = contacts.map((c) => ({ email: c.email, name: c.name, unsubscribeToken: c.unsubscribeToken }));
        } else {
          let condition;
          if (campaign.segment === "trial") {
            condition = and(
              eq(users.subscriptionStatus, "trial"),
              eq(users.isActive, true),
            );
          } else if (campaign.segment === "paid") {
            condition = and(
              eq(users.subscriptionStatus, "active"),
              eq(users.isActive, true),
            );
          } else {
            condition = eq(users.isActive, true);
          }

          const userList = await dbConn
            .select({
              email: users.email,
              name: users.name,
              trialEndsAt: users.trialEndsAt,
            })
            .from(users)
            .where(condition);
          recipients = userList.filter((u) => u.email) as Recipient[];
        }

        // ── SUPPRESSION CHECK (UK GDPR + PECR compliance) ──
        const suppressions = await dbConn.select({ email: emailUnsubscribes.email }).from(emailUnsubscribes);
        const suppressedSet = new Set(suppressions.map(s => s.email.toLowerCase()));
        // Also exclude bounced marketing contacts
        const bouncedContacts = await dbConn.select({ email: marketingContacts.email }).from(marketingContacts)
          .where(or(eq(marketingContacts.status, "unsubscribed"), eq(marketingContacts.status, "bounced")));
        for (const b of bouncedContacts) suppressedSet.add(b.email.toLowerCase());

        // Exclude already-sent recipients for this campaign
        const alreadySent = await dbConn.select({ email: emailCampaignRecipients.email }).from(emailCampaignRecipients)
          .where(and(
            eq(emailCampaignRecipients.campaignId, input.campaignId),
            eq(emailCampaignRecipients.status, "sent"),
          ));
        const alreadySentSet = new Set(alreadySent.map(r => r.email.toLowerCase()));

        // Deduplicate by email, remove suppressed, remove already sent
        const seen = new Set<string>();
        const uniqueRecipients = recipients.filter((r) => {
          if (!r.email || seen.has(r.email.toLowerCase())) return false;
          if (suppressedSet.has(r.email.toLowerCase())) return false;
          if (alreadySentSet.has(r.email.toLowerCase())) return false;
          seen.add(r.email.toLowerCase());
          return true;
        });

        // ── ENFORCE DAILY LIMIT + GLOBAL CAP + STAGGER WINDOW ──
        // Cap: min(per-campaign remaining, global mailbox remaining, per-window stagger limit)
        const globalMailboxRemaining = Math.max(0, TOTAL_MAILBOX_DAILY_CAP - globalTotalSentToday);
        const sendLimit = Math.min(remainingToday, globalMailboxRemaining, NEW_OUTREACH_PER_WINDOW);
        const recipientsToSend = uniqueRecipients.slice(0, sendLimit);
        const recipientsDeferred = uniqueRecipients.length - recipientsToSend.length;

        // Update recipient count
        await dbConn
          .update(emailCampaigns)
          .set({ recipientCount: uniqueRecipients.length })
          .where(eq(emailCampaigns.id, input.campaignId));

        // Insert recipient records and send emails
        let sentCount = 0;
        let failedCount = 0;
        const currentDate = formatDateGB();
        const BASE_URL = process.env.BASE_URL || "https://equiprofile.online";

        for (const recipient of recipientsToSend) {
          try {
            const firstName = extractFirstName(recipient.name);
            // Build unsubscribe link
            let unsubToken = recipient.unsubscribeToken || "";
            if (!unsubToken) {
              // Look up marketing contact token or generate fallback
              const [mc] = await dbConn.select().from(marketingContacts)
                .where(eq(marketingContacts.email, recipient.email.toLowerCase()));
              unsubToken = mc?.unsubscribeToken || "";
            }
            const unsubLink = unsubToken
              ? `${BASE_URL}/unsubscribe?token=${unsubToken}`
              : `${BASE_URL}/unsubscribe`;

            const html = applyMergeFields(campaign.htmlBody, {
              firstName,
              email: recipient.email,
              currentDate,
              trialEndDate: recipient.trialEndsAt
                ? formatDateGB(new Date(recipient.trialEndsAt))
                : "",
              unsubscribeLink: unsubLink,
            });

            await sendCampaignEmail(recipient.email, campaign.subject, html, unsubLink);

            await dbConn.insert(emailCampaignRecipients).values({
              campaignId: input.campaignId,
              email: recipient.email,
              name: recipient.name || null,
              status: "sent",
              sentAt: new Date(),
            });
            sentCount++;

            // Update lastContactedAt on marketing contact
            await dbConn.update(marketingContacts)
              .set({ lastContactedAt: new Date() })
              .where(eq(marketingContacts.email, recipient.email.toLowerCase()))
              .catch(() => {}); // non-critical
          } catch (err) {
            await dbConn.insert(emailCampaignRecipients).values({
              campaignId: input.campaignId,
              email: recipient.email,
              name: recipient.name || null,
              status: "failed",
              error: err instanceof Error ? err.message : "Unknown error",
            });
            failedCount++;
          }
        }

        // ── LOG DAILY SEND COUNT ──
        if (sentCount > 0) {
          if (todayLog) {
            await dbConn.update(campaignSendLog)
              .set({ sendCount: alreadySentToday + sentCount })
              .where(and(
                eq(campaignSendLog.campaignId, input.campaignId),
                eq(campaignSendLog.sendDate, today),
              ));
          } else {
            await dbConn.insert(campaignSendLog).values({
              campaignId: input.campaignId,
              sendDate: today,
              sendCount: sentCount,
            });
          }
        }

        // Determine final status — paused if there are deferred recipients
        const finalStatus = recipientsDeferred > 0 ? "paused" : "sent";

        // Mark campaign status
        await dbConn
          .update(emailCampaigns)
          .set({
            status: finalStatus,
            sentCount: (campaign.sentCount || 0) + sentCount,
            failedCount: (campaign.failedCount || 0) + failedCount,
            sentToday: alreadySentToday + sentCount,
            lastSendDate: today,
            sentAt: finalStatus === "sent" ? new Date() : campaign.sentAt,
            pausedAt: finalStatus === "paused" ? new Date() : null,
          })
          .where(eq(emailCampaigns.id, input.campaignId));

        // Log activity
        await db.logActivity({
          userId: ctx.user.id,
          action: "campaign_sent",
          entityType: "campaign",
          entityId: input.campaignId,
          details: JSON.stringify({
            name: campaign.name,
            segment: campaign.segment,
            sentCount,
            failedCount,
            deferred: recipientsDeferred,
            dailyLimit,
          }),
        });

        return { sentCount, failedCount, total: uniqueRecipients.length, deferred: recipientsDeferred, dailyLimit };
      }),

    deleteCampaign: adminUnlockedProcedure
      .input(z.object({ campaignId: z.number() }))
      .mutation(async ({ input }) => {
        const dbConn = await getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        await dbConn
          .delete(emailCampaignRecipients)
          .where(eq(emailCampaignRecipients.campaignId, input.campaignId));
        await dbConn
          .delete(campaignSendLog)
          .where(eq(campaignSendLog.campaignId, input.campaignId));
        await dbConn
          .delete(campaignSequenceRecipients)
          .where(eq(campaignSequenceRecipients.campaignId, input.campaignId));
        await dbConn
          .delete(campaignSequences)
          .where(eq(campaignSequences.campaignId, input.campaignId));
        await dbConn
          .delete(emailCampaigns)
          .where(eq(emailCampaigns.id, input.campaignId));

        return { success: true };
      }),

    // ── Campaign Replies Inbox ─────────────────────────────────────────────

    getCampaignReplies: adminUnlockedProcedure
      .input(z.object({
        status: z.enum(["all", "new", "read", "interested", "not_interested", "follow_up", "converted", "do_not_contact"]).optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }))
      .query(async ({ input }) => {
        const dbConn = await getDb();
        if (!dbConn) return { replies: [], total: 0 };

        const conditions: ReturnType<typeof eq>[] = [];
        if (input.status && input.status !== "all") {
          conditions.push(eq(campaignReplies.status, input.status));
        }

        const { desc } = await import("drizzle-orm");
        const rows = await dbConn
          .select()
          .from(campaignReplies)
          .where(conditions.length ? and(...conditions) : undefined)
          .orderBy(desc(campaignReplies.receivedAt))
          .limit(input.limit)
          .offset(input.offset);

        const [countResult] = await dbConn
          .select({ total: sql<number>`COUNT(*)` })
          .from(campaignReplies)
          .where(conditions.length ? and(...conditions) : undefined);

        return { replies: rows, total: Number(countResult?.total ?? 0) };
      }),

    updateReplyStatus: adminUnlockedProcedure
      .input(z.object({
        replyId: z.number(),
        status: z.enum(["new", "read", "interested", "not_interested", "follow_up", "converted", "do_not_contact"]),
        notes: z.string().max(500).optional(),
        stopSequence: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const dbConn = await getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const [reply] = await dbConn.select().from(campaignReplies)
          .where(eq(campaignReplies.id, input.replyId));
        if (!reply) throw new TRPCError({ code: "NOT_FOUND" });

        await dbConn.update(campaignReplies)
          .set({
            status: input.status,
            notes: input.notes ?? reply.notes,
            sequenceStopped: input.stopSequence ?? reply.sequenceStopped,
          })
          .where(eq(campaignReplies.id, input.replyId));

        // If do_not_contact — add to suppression list
        if (input.status === "do_not_contact" && reply.fromEmail) {
          await dbConn.insert(emailUnsubscribes)
            .values({
              email: reply.fromEmail.toLowerCase(),
              token: nanoid(32),
              reason: "Marked do-not-contact from replies inbox",
              source: "admin",
              unsubscribedAt: new Date(),
            })
            .onDuplicateKeyUpdate({ set: { source: "admin" } });
          // Also update marketing contact status
          await dbConn.update(marketingContacts)
            .set({ status: "unsubscribed" })
            .where(eq(marketingContacts.email, reply.fromEmail.toLowerCase()))
            .catch(() => {});
        }

        // If stopSequence — pause all pending sequence steps for this contact's campaigns
        if (input.stopSequence && reply.fromEmail) {
          const affectedRecipients = await dbConn.selectDistinct({ campaignId: emailCampaignRecipients.campaignId })
            .from(emailCampaignRecipients)
            .where(eq(emailCampaignRecipients.email, reply.fromEmail.toLowerCase()));
          const campaignIdSet = new Set<number>();
          affectedRecipients.forEach(r => campaignIdSet.add(r.campaignId));
          const campaignIds = Array.from(campaignIdSet);
          if (campaignIds.length > 0) {
            await dbConn.update(campaignSequences)
              .set({ status: "skipped" })
              .where(and(
                inArray(campaignSequences.campaignId, campaignIds),
                eq(campaignSequences.status, "pending"),
              )).catch(() => {});
          }
        }

        return { success: true };
      }),

    triggerReplyFetch: adminUnlockedProcedure.mutation(async () => {
      try {
        const { fetchCampaignReplies } = await import("./_core/campaignReplyFetcher");
        const count = await fetchCampaignReplies(50);
        return { fetched: count };
      } catch (err) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: err instanceof Error ? err.message : "Failed to fetch replies",
        });
      }
    }),

    // ── Auto Campaign Assignment ───────────────────────────────────────────
    /**
     * Inspect marketing contacts and return a preview of how they would be
     * assigned to campaign families (management vs academy).
     * No sends are triggered — purely an analysis/reporting endpoint.
     */
    getCampaignAssignmentPreview: adminUnlockedProcedure.query(async () => {
      const dbConn = await getDb();
      if (!dbConn) return { management: 0, academy: 0, blocked: 0, alreadySent: 0, suspectedDuplicate: 0, total: 0 };

      const contacts = await dbConn.select().from(marketingContacts);
      const suppressions = await dbConn.select({ email: emailUnsubscribes.email }).from(emailUnsubscribes);
      const suppressedSet = new Set(suppressions.map(s => s.email.toLowerCase()));

      const alreadySentEmails = await dbConn
        .select({ email: emailCampaignRecipients.email })
        .from(emailCampaignRecipients)
        .where(eq(emailCampaignRecipients.status, "sent"));
      const alreadySentSet = new Set(alreadySentEmails.map(r => r.email.toLowerCase()));

      // Types that map to academy/school family
      const academyTypes = new Set(["school", "college", "academy", "student", "teacher", "instructor"]);

      let management = 0;
      let academy = 0;
      let blocked = 0;
      let alreadySent = 0;
      let suspectedDuplicate = 0;

      for (const c of contacts) {
        const email = c.email?.toLowerCase() || "";
        if (!email || !email.includes("@")) { blocked++; continue; }
        if (c.status !== "active" || suppressedSet.has(email)) { blocked++; continue; }
        if (alreadySentSet.has(email)) { alreadySent++; continue; }
        // Contacts flagged as suspected duplicates are soft-blocked from autopilot
        if (c.suspectedDuplicateOf != null) { suspectedDuplicate++; continue; }
        if (academyTypes.has(c.contactType || "")) {
          academy++;
        } else {
          management++;
        }
      }

      return {
        management,
        academy,
        blocked,
        alreadySent,
        suspectedDuplicate,
        total: contacts.length,
      };
    }),

    /**
     * Campaign Autopilot — classify uncontacted marketing contacts and
     * create family-appropriate paused campaigns ready for the send windows.
     *
     * Rules:
     * - Only active, non-suppressed contacts that have never been sent any
     *   campaign email are eligible.
     * - Management contacts → enrolled into a Management Autopilot campaign
     *   using the mgmt-intro template.
     * - Academy contacts (school/college/academy/student/teacher/instructor)
     *   → enrolled into an Academy Autopilot campaign using the academy-intro
     *   template.
     * - For each campaign, contacts from the OTHER family are pre-marked as
     *   "skipped" so the send windows never accidentally email the wrong
     *   family from a campaign intended for the other.
     * - Both campaigns are set to "paused" so the automated outreach windows
     *   (08:30–16:30 UTC weekdays) pick them up immediately.
     * - Idempotent: if all contacts are already enrolled, returns zeros.
     */
    runCampaignAutopilot: adminUnlockedProcedure.mutation(async ({ ctx }) => {
      const dbConn = await getDb();
      if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Academy family types (same set used by getCampaignAssignmentPreview)
      const ACADEMY_TYPES = new Set(["school", "college", "academy", "student", "teacher", "instructor"]);

      // ── Step 1: Find all active, non-suppressed contacts ─────────────────
      const allContacts = await dbConn
        .select()
        .from(marketingContacts)
        .where(eq(marketingContacts.status, "active"));

      const suppressions = await dbConn
        .select({ email: emailUnsubscribes.email })
        .from(emailUnsubscribes);
      const suppressedSet = new Set(suppressions.map((s) => s.email.toLowerCase()));

      // ── Step 2: Find contacts already sent any campaign email ─────────────
      const alreadySentRows = await dbConn
        .select({ email: emailCampaignRecipients.email })
        .from(emailCampaignRecipients)
        .where(eq(emailCampaignRecipients.status, "sent"));
      const alreadySentSet = new Set(alreadySentRows.map((r) => r.email.toLowerCase()));

      // ── Step 3: Find contacts already enrolled in any autopilot campaign ──
      // "enrolled" = already has a record in emailCampaignRecipients for a
      //   campaign whose name starts with "Autopilot —"
      const autopilotCampaignRows = await dbConn
        .select({ id: emailCampaigns.id })
        .from(emailCampaigns)
        .where(sql`${emailCampaigns.name} LIKE 'Autopilot — %'`);
      const autopilotIds = autopilotCampaignRows.map((r) => r.id);

      const enrolledSet = new Set<string>();
      if (autopilotIds.length > 0) {
        const enrolledRows = await dbConn
          .select({ email: emailCampaignRecipients.email })
          .from(emailCampaignRecipients)
          .where(inArray(emailCampaignRecipients.campaignId, autopilotIds));
        for (const r of enrolledRows) enrolledSet.add(r.email.toLowerCase());
      }

      // ── Step 4: Classify unenrolled contacts (skip suspected duplicates) ──
      const managementEmails: Array<{ email: string; name: string | null }> = [];
      const academyEmails: Array<{ email: string; name: string | null }> = [];

      for (const c of allContacts) {
        const email = c.email?.toLowerCase();
        if (!email || !email.includes("@")) continue;
        if (suppressedSet.has(email)) continue;
        if (alreadySentSet.has(email)) continue;
        if (enrolledSet.has(email)) continue;
        // Skip contacts flagged as suspected duplicates — admin must clear flag to include
        if (c.suspectedDuplicateOf != null) continue;

        if (ACADEMY_TYPES.has(c.contactType || "")) {
          academyEmails.push({ email, name: c.name });
        } else {
          managementEmails.push({ email, name: c.name });
        }
      }

      let managementCampaignId: number | null = null;
      let academyCampaignId: number | null = null;
      const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

      // ── Step 5: Create Management Autopilot campaign if needed ────────────
      if (managementEmails.length > 0) {
        const mgmtTemplate = CAMPAIGN_TEMPLATES.find((t) => t.id === "mgmt-intro");
        if (!mgmtTemplate) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "mgmt-intro template not found" });

        const mgmtResult = await dbConn.insert(emailCampaigns).values({
          name: `Autopilot — Management (${today})`,
          subject: "The professional platform built for equestrian businesses",
          htmlBody: mgmtTemplate.getHtml(),
          templateId: "mgmt-intro",
          segment: "marketing",
          customFilter: null,
          targetCountry: null,
          targetType: null,
          dailyLimit: 25,
          sentToday: 0,
          lastSendDate: null,
          recipientCount: managementEmails.length,
          sentCount: 0,
          failedCount: 0,
          status: "paused",
          sentAt: null,
          pausedAt: new Date(),
          sentByUserId: ctx.user.id,
        });
        managementCampaignId = Number(mgmtResult[0].insertId);

        // Pre-mark academy contacts as "skipped" in the management campaign
        // so the send windows never email academy contacts from this campaign.
        if (academyEmails.length > 0) {
          const skipValues = academyEmails.map((c) => ({
            campaignId: managementCampaignId!,
            email: c.email,
            name: c.name || null,
            status: "skipped" as const,
          }));
          // Insert in batches of 500 to avoid packet size issues
          for (let i = 0; i < skipValues.length; i += 500) {
            await dbConn.insert(emailCampaignRecipients).values(skipValues.slice(i, i + 500));
          }
        }
      }

      // ── Step 6: Create Academy Autopilot campaign if needed ───────────────
      if (academyEmails.length > 0) {
        const acaTemplate = CAMPAIGN_TEMPLATES.find((t) => t.id === "academy-intro");
        if (!acaTemplate) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "academy-intro template not found" });

        const acaResult = await dbConn.insert(emailCampaigns).values({
          name: `Autopilot — Academy (${today})`,
          subject: "A structured learning platform designed for equestrian schools",
          htmlBody: acaTemplate.getHtml(),
          templateId: "academy-intro",
          segment: "marketing",
          customFilter: null,
          targetCountry: null,
          targetType: null,
          dailyLimit: 15,
          sentToday: 0,
          lastSendDate: null,
          recipientCount: academyEmails.length,
          sentCount: 0,
          failedCount: 0,
          status: "paused",
          sentAt: null,
          pausedAt: new Date(),
          sentByUserId: ctx.user.id,
        });
        academyCampaignId = Number(acaResult[0].insertId);

        // Pre-mark management contacts as "skipped" in the academy campaign
        if (managementEmails.length > 0) {
          const skipValues = managementEmails.map((c) => ({
            campaignId: academyCampaignId!,
            email: c.email,
            name: c.name || null,
            status: "skipped" as const,
          }));
          for (let i = 0; i < skipValues.length; i += 500) {
            await dbConn.insert(emailCampaignRecipients).values(skipValues.slice(i, i + 500));
          }
        }
      }

      console.log(
        `[CampaignAutopilot] Enrolled: management=${managementEmails.length} (campaignId=${managementCampaignId}) academy=${academyEmails.length} (campaignId=${academyCampaignId})`,
      );

      return {
        management: managementEmails.length,
        academy: academyEmails.length,
        total: managementEmails.length + academyEmails.length,
        managementCampaignId,
        academyCampaignId,
      };
    }),

    /**
     * runDuplicatePersonScan — scans all marketing contacts using the
     * deterministic trigram + domain + geography fuzzy algorithm, then writes
     * suspected-duplicate flags directly to the DB.
     *
     * Safe to run repeatedly: existing flags are ONLY updated, never downgraded
     * without an explicit clearDuplicateFlag call from an admin.
     *
     * Contacts that already have a flag set are NOT re-evaluated (their flag
     * was either placed by a previous scan or manually overridden).
     *
     * Returns: how many contacts were newly flagged in this scan.
     */
    runDuplicatePersonScan: adminUnlockedProcedure.mutation(async () => {
      const dbConn = await getDb();
      if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Only scan contacts that haven't already been flagged
      const contacts = await dbConn
        .select({
          id: marketingContacts.id,
          email: marketingContacts.email,
          name: marketingContacts.name,
          businessName: marketingContacts.businessName,
          country: marketingContacts.country,
          region: marketingContacts.region,
          contactType: marketingContacts.contactType,
          suspectedDuplicateOf: marketingContacts.suspectedDuplicateOf,
        })
        .from(marketingContacts)
        .where(eq(marketingContacts.status, "active"));

      // Run the in-memory detection
      const results = detectDuplicatePeople(contacts);

      // Only persist newly found duplicates (don't overwrite manually cleared flags)
      const alreadyFlagged = new Set(
        contacts
          .filter((c) => c.suspectedDuplicateOf != null)
          .map((c) => c.id),
      );

      let newlyFlagged = 0;
      for (const r of results) {
        if (alreadyFlagged.has(r.contactId)) continue; // already flagged — leave it
        await dbConn
          .update(marketingContacts)
          .set({
            suspectedDuplicateOf: r.suspectedDuplicateOf,
            dupRiskScore: r.riskScore,
          })
          .where(eq(marketingContacts.id, r.contactId));
        newlyFlagged++;
      }

      return {
        scanned: contacts.length,
        newlyFlagged,
        totalFlagged: alreadyFlagged.size + newlyFlagged,
      };
    }),

    /**
     * clearDuplicateFlag — admin override: removes the suspected-duplicate flag
     * from a single contact, making it eligible for the next autopilot run.
     */
    clearDuplicateFlag: adminUnlockedProcedure
      .input(z.object({ contactId: z.number() }))
      .mutation(async ({ input }) => {
        const dbConn = await getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await dbConn
          .update(marketingContacts)
          .set({ suspectedDuplicateOf: null, dupRiskScore: null })
          .where(eq(marketingContacts.id, input.contactId));
        return { success: true };
      }),

    pauseCampaign: adminUnlockedProcedure
      .input(z.object({ campaignId: z.number() }))
      .mutation(async ({ input }) => {
        const dbConn = await getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await dbConn.update(emailCampaigns)
          .set({ status: "paused", pausedAt: new Date() })
          .where(eq(emailCampaigns.id, input.campaignId));
        return { success: true };
      }),

    resumeCampaign: adminUnlockedProcedure
      .input(z.object({ campaignId: z.number() }))
      .mutation(async ({ input }) => {
        const dbConn = await getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const [campaign] = await dbConn.select().from(emailCampaigns)
          .where(eq(emailCampaigns.id, input.campaignId));
        if (!campaign) throw new TRPCError({ code: "NOT_FOUND" });
        if (campaign.status !== "paused") throw new TRPCError({ code: "BAD_REQUEST", message: "Campaign is not paused" });
        await dbConn.update(emailCampaigns)
          .set({ status: "draft", pausedAt: null })
          .where(eq(emailCampaigns.id, input.campaignId));
        return { success: true };
      }),

    getDailyLimitStatus: adminUnlockedProcedure
      .input(z.object({ campaignId: z.number() }))
      .query(async ({ input }) => {
        const dbConn = await getDb();
        if (!dbConn) return { sentToday: 0, dailyLimit: DEFAULT_DAILY_LIMIT, remaining: DEFAULT_DAILY_LIMIT };
        const today = getTodayDateString();
        const [campaign] = await dbConn.select().from(emailCampaigns)
          .where(eq(emailCampaigns.id, input.campaignId));
        const dailyLimit = campaign?.dailyLimit || DEFAULT_DAILY_LIMIT;
        const [log] = await dbConn.select({ sendCount: campaignSendLog.sendCount }).from(campaignSendLog)
          .where(and(
            eq(campaignSendLog.campaignId, input.campaignId),
            eq(campaignSendLog.sendDate, today),
          ));
        const sentToday = log?.sendCount || 0;
        return { sentToday, dailyLimit, remaining: Math.max(0, dailyLimit - sentToday) };
      }),

    /**
     * getCampaignMailboxStatus — single source of truth for today's send activity.
     * Powers the Admin Campaign Operations Panel.
     */
    getCampaignMailboxStatus: adminUnlockedProcedure.query(async () => {
      const dbConn = await getDb();
      if (!dbConn) {
        const nextWindow = getNextSendWindow();
        return {
          newOutreachSentToday: 0,
          followupsSentToday: 0,
          totalSentToday: 0,
          newOutreachCap: NEW_OUTREACH_DAILY_CAP,
          totalCap: TOTAL_MAILBOX_DAILY_CAP,
          perWindowLimit: NEW_OUTREACH_PER_WINDOW,
          newOutreachRemaining: NEW_OUTREACH_DAILY_CAP,
          totalRemaining: TOTAL_MAILBOX_DAILY_CAP,
          queuedForNextWindow: 0,
          pausedCampaignsCount: 0,
          nextSendWindow: nextWindow ?? "Next weekday 08:30 UTC",
          isWeekday: isWeekday(),
          isWithinSendHours: isWithinSendHours(),
          sendWindows: SEND_WINDOWS.map(w => w.label),
        };
      }

      const today = getTodayDateString();

      // New outreach sent today (sum across all campaigns)
      const [outreachResult] = await dbConn
        .select({ total: sql<number>`COALESCE(SUM(${campaignSendLog.sendCount}), 0)` })
        .from(campaignSendLog)
        .where(eq(campaignSendLog.sendDate, today));
      const newOutreachSentToday = Number(outreachResult?.total ?? 0);

      // Follow-ups sent today
      const [followupResult] = await dbConn
        .select({ total: sql<number>`COALESCE(COUNT(*), 0)` })
        .from(campaignSequenceRecipients)
        .where(and(
          eq(campaignSequenceRecipients.status, "sent"),
          sql`DATE(${campaignSequenceRecipients.sentAt}) = ${today}`,
        ));
      const followupsSentToday = Number(followupResult?.total ?? 0);
      const totalSentToday = newOutreachSentToday + followupsSentToday;

      // Paused campaigns (have remaining recipients to send)
      const pausedCampaigns = await dbConn
        .select({
          id: emailCampaigns.id,
          recipientCount: emailCampaigns.recipientCount,
          sentCount: emailCampaigns.sentCount,
        })
        .from(emailCampaigns)
        .where(eq(emailCampaigns.status, "paused"));

      const queuedForNextWindow = pausedCampaigns.reduce(
        (acc, c) => acc + Math.max(0, (c.recipientCount || 0) - (c.sentCount || 0)),
        0,
      );

      const nextWindow = getNextSendWindow();

      return {
        newOutreachSentToday,
        followupsSentToday,
        totalSentToday,
        newOutreachCap: NEW_OUTREACH_DAILY_CAP,
        totalCap: TOTAL_MAILBOX_DAILY_CAP,
        perWindowLimit: NEW_OUTREACH_PER_WINDOW,
        newOutreachRemaining: Math.max(0, NEW_OUTREACH_DAILY_CAP - newOutreachSentToday),
        totalRemaining: Math.max(0, TOTAL_MAILBOX_DAILY_CAP - totalSentToday),
        queuedForNextWindow,
        pausedCampaignsCount: pausedCampaigns.length,
        nextSendWindow: nextWindow ?? "Next weekday 08:30 UTC",
        isWeekday: isWeekday(),
        isWithinSendHours: isWithinSendHours(),
        sendWindows: SEND_WINDOWS.map(w => w.label),
      };
    }),

    parseImportFile: adminUnlockedProcedure
      .input(z.object({
        fileContent: z.string(), // base64 or raw CSV text
        fileType: z.enum(["csv", "xlsx"]),
        fileName: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        let rows: Array<Record<string, string>> = [];

        if (input.fileType === "csv") {
          // Decode base64 if needed or use directly
          let csvText = input.fileContent;
          if (!csvText.includes(",") && !csvText.includes("\n")) {
            // Likely base64 encoded
            try {
              csvText = Buffer.from(csvText, "base64").toString("utf-8");
            } catch { /* use as-is */ }
          }
          rows = parseCSV(csvText);
        } else {
          // XLSX parsing
          try {
            const ExcelJS = await import("exceljs");
            const workbook = new ExcelJS.Workbook();
            const buffer = Buffer.from(input.fileContent, "base64");
            await workbook.xlsx.load(buffer as any);
            const worksheet = workbook.worksheets[0];
            if (!worksheet) throw new Error("No worksheet found");

            const headers: string[] = [];
            const firstRow = worksheet.getRow(1);
            firstRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
              headers[colNumber - 1] = String(cell.value || `Column ${colNumber}`);
            });

            worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
              if (rowNumber === 1) return; // skip header
              const record: Record<string, string> = {};
              row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                const header = headers[colNumber - 1] || `Column ${colNumber}`;
                record[header] = String(cell.value || "");
              });
              rows.push(record);
            });
          } catch (err) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Failed to parse XLSX file: ${err instanceof Error ? err.message : "Unknown error"}`,
            });
          }
        }

        if (rows.length === 0) {
          return { headers: [], rows: [], mapping: {}, totalRows: 0 };
        }

        const headers = Object.keys(rows[0]);
        const mapping = autoMapColumns(headers);
        // Return preview (first 10 rows)
        const preview = rows.slice(0, 10);

        return {
          headers,
          rows: preview,
          mapping,
          totalRows: rows.length,
          allRows: rows, // for the import step
        };
      }),

    addSuppression: adminUnlockedProcedure
      .input(z.object({ email: z.string().email(), reason: z.string().optional() }))
      .mutation(async ({ input }) => {
        const dbConn = await getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const email = input.email.toLowerCase();
        const [existing] = await dbConn.select().from(emailUnsubscribes)
          .where(eq(emailUnsubscribes.email, email));
        if (existing) return { success: true, message: "Already suppressed" };
        await dbConn.insert(emailUnsubscribes).values({
          email,
          token: nanoid(32),
          reason: input.reason || "Manual suppression by admin",
          source: "admin",
        });
        // Also mark marketing contact as unsubscribed if exists
        await dbConn.update(marketingContacts)
          .set({ status: "unsubscribed" })
          .where(eq(marketingContacts.email, email))
          .catch(() => {});
        return { success: true, message: "Email added to suppression list" };
      }),

    removeSuppression: adminUnlockedProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async ({ input }) => {
        const dbConn = await getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const email = input.email.toLowerCase();
        await dbConn.delete(emailUnsubscribes)
          .where(eq(emailUnsubscribes.email, email));
        // Re-activate marketing contact if it was unsubscribed
        await dbConn.update(marketingContacts)
          .set({ status: "active" })
          .where(and(
            eq(marketingContacts.email, email),
            eq(marketingContacts.status, "unsubscribed"),
          ))
          .catch((err) => {
            console.error("Failed to reactivate marketing contact:", err);
          });
        return { success: true, message: "Email removed from suppression list" };
      }),

    // ──────────────────────────────────────────────────────────
    // Marketing Contacts CRUD
    // ──────────────────────────────────────────────────────────

    getMarketingContacts: adminUnlockedProcedure
      .input(z.object({
        status: z.enum(["active", "unsubscribed", "bounced", "all"]).default("all"),
        contactType: z.string().optional(),
        country: z.string().optional(),
        search: z.string().optional(),
        limit: z.number().min(1).max(500).default(200),
        offset: z.number().min(0).default(0),
      }).optional())
      .query(async ({ input }) => {
        const dbConn = await getDb();
        if (!dbConn) return [];

        if (input?.status === "unsubscribed") {
          const suppressionConditions: any[] = [];
          if (input?.search) {
            const searchTerm = `%${input.search}%`;
            suppressionConditions.push(
              or(
                sql`${emailUnsubscribes.email} LIKE ${searchTerm}`,
                sql`${marketingContacts.name} LIKE ${searchTerm}`,
                sql`${marketingContacts.businessName} LIKE ${searchTerm}`,
                sql`${marketingContacts.organizationName} LIKE ${searchTerm}`,
              ),
            );
          }
          const suppressionWhere =
            suppressionConditions.length > 0 ? and(...suppressionConditions) : undefined;

          const rows = await dbConn
            .select({
              id: marketingContacts.id,
              email: emailUnsubscribes.email,
              name: marketingContacts.name,
              businessName: marketingContacts.businessName,
              organizationName: marketingContacts.organizationName,
              contactType: marketingContacts.contactType,
              status: marketingContacts.status,
              reason: emailUnsubscribes.reason,
              source: emailUnsubscribes.source,
              unsubscribedAt: emailUnsubscribes.unsubscribedAt,
            })
            .from(emailUnsubscribes)
            .leftJoin(
              marketingContacts,
              eq(marketingContacts.email, emailUnsubscribes.email),
            )
            .where(suppressionWhere)
            .orderBy(desc(emailUnsubscribes.unsubscribedAt))
            .limit(input?.limit ?? 200)
            .offset(input?.offset ?? 0);

          return rows.map((row) => ({
            id: row.id ?? `suppression:${row.email}`,
            email: row.email,
            name: row.name,
            businessName: row.businessName,
            organizationName: row.organizationName,
            contactType: row.contactType ?? "individual",
            status: "unsubscribed" as const,
            reason: row.reason ?? "Unsubscribed",
            source: row.source ?? "unknown",
            unsubscribedAt: row.unsubscribedAt,
          }));
        }

        const conditions: ReturnType<typeof eq>[] = [];
        if (input?.status && input.status !== "all") {
          conditions.push(eq(marketingContacts.status, input.status));
        }
        if (input?.contactType) {
          conditions.push(eq(marketingContacts.contactType, input.contactType));
        }
        if (input?.country) {
          conditions.push(eq(marketingContacts.country, input.country));
        }
        if (input?.search) {
          conditions.push(
            or(
              sql`${marketingContacts.email} LIKE ${"%" + input.search + "%"}`,
              sql`${marketingContacts.name} LIKE ${"%" + input.search + "%"}`,
              sql`${marketingContacts.businessName} LIKE ${"%" + input.search + "%"}`,
              sql`${marketingContacts.organizationName} LIKE ${"%" + input.search + "%"}`,
            )! as any,
          );
        }
        const where = conditions.length > 0 ? and(...conditions) : undefined;
        return dbConn.select().from(marketingContacts)
          .where(where)
          .orderBy(desc(marketingContacts.createdAt))
          .limit(input?.limit ?? 200)
          .offset(input?.offset ?? 0);
      }),

    createMarketingContact: adminUnlockedProcedure
      .input(z.object({
        email: z.string().email(),
        name: z.string().optional(),
        businessName: z.string().optional(),
        organizationName: z.string().optional(),
        contactType: z.string().default("individual"),
        source: z.string().default("manual"),
        tags: z.string().optional(), // JSON array string
        region: z.string().optional(),
        country: z.string().optional(),
        leadFocus: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const dbConn = await getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const token = nanoid(32);
        // Check if already exists in suppression list
        const [suppressed] = await dbConn.select().from(emailUnsubscribes)
          .where(eq(emailUnsubscribes.email, input.email.toLowerCase()));
        if (suppressed) throw new TRPCError({ code: "BAD_REQUEST", message: "This email is on the suppression list (previously unsubscribed)" });
        // Check duplicate
        const [existing] = await dbConn.select().from(marketingContacts)
          .where(eq(marketingContacts.email, input.email.toLowerCase()));
        if (existing) throw new TRPCError({ code: "BAD_REQUEST", message: "Contact already exists" });

        await dbConn.insert(marketingContacts).values({
          email: input.email.toLowerCase(),
          name: input.name || null,
          businessName: input.businessName || null,
          organizationName: input.organizationName || null,
          contactType: normalizeContactType(input.contactType),
          source: input.source,
          tags: input.tags || null,
          region: input.region || null,
          country: normalizeCountry(input.country) || null,
          leadFocus: input.leadFocus || null,
          unsubscribeToken: token,
        });
        return { success: true };
      }),

    importMarketingContacts: adminUnlockedProcedure
      .input(z.object({
        contacts: z.array(z.object({
          email: z.string().optional(),
          name: z.string().optional(),
          businessName: z.string().optional(),
          organizationName: z.string().optional(),
          contactType: z.string().default("individual"),
          tags: z.string().optional(),
          region: z.string().optional(),
          country: z.string().optional(),
          leadFocus: z.string().optional(),
        })),
        source: z.string().default("csv_import"),
      }))
      .mutation(async ({ input }) => {
        const dbConn = await getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        // Get suppression list
        const suppressions = await dbConn.select({ email: emailUnsubscribes.email }).from(emailUnsubscribes);
        const suppressedSet = new Set(suppressions.map(s => s.email.toLowerCase()));
        // Get existing contacts
        const existing = await dbConn.select({ email: marketingContacts.email }).from(marketingContacts);
        const existingSet = new Set(existing.map(e => e.email.toLowerCase()));

        let imported = 0;
        let skipped = 0;
        let invalid = 0;
        let rejected = 0;
        const rejections: Array<{ email: string; reason: string }> = [];
        const invalidRows: Array<{ row: number; email: string; reason: string }> = [];

        for (let i = 0; i < input.contacts.length; i++) {
          const c = input.contacts[i];
          const rawEmail = c.email ?? "";
          const email = normalizeImportedEmail(rawEmail);

          // Skip blank email rows from CSV/XLSX imports
          if (!email) {
            skipped++;
            continue;
          }

          // 1. Basic email format validation
          if (!isValidEmail(email)) {
            invalid++;
            invalidRows.push({
              row: i + 2,
              email: rawEmail,
              reason: "invalid_email_format",
            });
            continue;
          }

          // 2. Skip suppressed / existing
          if (suppressedSet.has(email) || existingSet.has(email)) { skipped++; continue; }

          // 3. Compliance validation: rejects disposable, B2B free-mail, etc.
          const compliance = validateContactCompliance(email, c.contactType || "individual");
          if (!compliance.valid) {
            rejected++;
            rejections.push({ email, reason: compliance.reason || "compliance_rejected" });
            continue;
          }

          await dbConn.insert(marketingContacts).values({
            email,
            name: c.name || null,
            businessName: c.businessName || null,
            organizationName: c.organizationName || null,
            contactType: normalizeContactType(c.contactType),
            source: input.source,
            tags: c.tags || null,
            region: c.region || null,
            country: normalizeCountry(c.country) || null,
            leadFocus: c.leadFocus || null,
            unsubscribeToken: nanoid(32),
          });
          existingSet.add(email); // prevent duplicates within batch
          imported++;
        }

        if (imported === 0 && invalidRows.length > 0) {
          const examples = invalidRows
            .slice(0, 3)
            .map((r) => `row ${r.row}: "${r.email}"`)
            .join(", ");
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `No contacts imported. Invalid email values detected (${invalidRows.length} row(s)). ${examples}`,
          });
        }

        return {
          imported,
          skipped,
          invalid,
          rejected,
          rejections: rejections.slice(0, 100),
          invalidRows: invalidRows.slice(0, 100),
          total: input.contacts.length,
        };
      }),

    deleteMarketingContact: adminUnlockedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const dbConn = await getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await dbConn.delete(marketingContacts).where(eq(marketingContacts.id, input.id));
        return { success: true };
      }),

    /**
     * Bulk delete marketing contacts.
     *
     * Mode A — by IDs: deletes exactly the contacts whose IDs are provided.
     * Mode B — by filter: deletes all contacts matching the supplied filter
     *   criteria (search, country, contactType, status). At least one filter
     *   field must be non-empty to prevent a catastrophic "delete everything"
     *   call without an explicit opt-in.
     *
     * Both modes require admin access (adminUnlockedProcedure).
     */
    bulkDeleteMarketingContacts: adminUnlockedProcedure
      .input(
        z.discriminatedUnion("mode", [
          // Mode A — explicit list of IDs
          z.object({
            mode: z.literal("ids"),
            ids: z.array(z.number()).min(1).max(1000),
          }),
          // Mode B — filter-based (must supply at least one criterion)
          z.object({
            mode: z.literal("filter"),
            search: z.string().optional(),
            country: z.string().optional(),
            contactType: z.string().optional(),
            status: z.enum(["active", "unsubscribed", "bounced", "all"]).optional(),
          }),
        ]),
      )
      .mutation(async ({ input }) => {
        const dbConn = await getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        if (input.mode === "ids") {
          await dbConn
            .delete(marketingContacts)
            .where(inArray(marketingContacts.id, input.ids));
          return { deleted: input.ids.length };
        }

        // Mode B — build filter conditions; must have at least one
        const { search, country, contactType, status } = input;
        if (!search && !country && !contactType && !status) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Provide at least one filter criterion for filter-based bulk delete",
          });
        }

        const conditions: ReturnType<typeof eq>[] = [];
        if (status && status !== "all") {
          conditions.push(eq(marketingContacts.status, status));
        }
        if (contactType) {
          conditions.push(eq(marketingContacts.contactType, contactType));
        }
        if (country) {
          conditions.push(eq(marketingContacts.country, country));
        }
        if (search) {
          conditions.push(
            or(
              sql`${marketingContacts.email} LIKE ${"%" + search + "%"}`,
              sql`${marketingContacts.name} LIKE ${"%" + search + "%"}`,
              sql`${marketingContacts.businessName} LIKE ${"%" + search + "%"}`,
            )! as ReturnType<typeof eq>,
          );
        }

        // Count first so we can return an accurate deleted count
        const [countRow] = await dbConn
          .select({ n: sql<number>`COUNT(*)` })
          .from(marketingContacts)
          .where(and(...conditions));
        const toDelete = Number(countRow?.n ?? 0);

        if (toDelete === 0) return { deleted: 0 };

        await dbConn
          .delete(marketingContacts)
          .where(and(...conditions));

        return { deleted: toDelete };
      }),

    // ──────────────────────────────────────────────────────────
    // Suppression / Unsubscribe management
    // ──────────────────────────────────────────────────────────

    getUnsubscribes: adminUnlockedProcedure.query(async () => {
      const dbConn = await getDb();
      if (!dbConn) return [];
      return dbConn.select().from(emailUnsubscribes).orderBy(desc(emailUnsubscribes.unsubscribedAt));
    }),

    // ──────────────────────────────────────────────────────────
    // Campaign sequences (drip steps)
    // ──────────────────────────────────────────────────────────

    getCampaignSequences: adminUnlockedProcedure
      .input(z.object({ campaignId: z.number() }))
      .query(async ({ input }) => {
        const dbConn = await getDb();
        if (!dbConn) return [];
        return dbConn.select().from(campaignSequences)
          .where(eq(campaignSequences.campaignId, input.campaignId))
          .orderBy(campaignSequences.stepNumber);
      }),

    addCampaignSequenceStep: adminUnlockedProcedure
      .input(z.object({
        campaignId: z.number(),
        stepNumber: z.number(),
        delayDays: z.number(),
        subject: z.string(),
        htmlBody: z.string(),
        templateId: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const dbConn = await getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await dbConn.insert(campaignSequences).values({
          campaignId: input.campaignId,
          stepNumber: input.stepNumber,
          delayDays: input.delayDays,
          subject: input.subject,
          htmlBody: input.htmlBody,
          templateId: input.templateId || null,
        });
        return { success: true };
      }),

    sendSequenceStep: adminUnlockedProcedure
      .input(z.object({ sequenceId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const dbConn = await getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const [step] = await dbConn.select().from(campaignSequences).where(eq(campaignSequences.id, input.sequenceId));
        if (!step) throw new TRPCError({ code: "NOT_FOUND" });
        if (step.status === "sent") throw new TRPCError({ code: "BAD_REQUEST", message: "Step already sent" });

        // ── WEEKDAY-ONLY CHECK (follow-ups also weekday-only) ──
        if (!isWeekday()) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Follow-up sending is restricted to weekdays (Monday–Friday). Please try again on a weekday.",
          });
        }

        // ── SEND-HOURS CHECK ──
        if (!isWithinSendHours()) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Follow-up sending is only permitted between 08:00 and 18:00 UTC. Please try again during business hours.",
          });
        }

        // ── GLOBAL MAILBOX CAP CHECK ──
        const today = getTodayDateString();
        const [globalLogResult] = await dbConn
          .select({ total: sql<number>`COALESCE(SUM(${campaignSendLog.sendCount}), 0)` })
          .from(campaignSendLog)
          .where(eq(campaignSendLog.sendDate, today));
        const globalOutreachSentToday = Number(globalLogResult?.total ?? 0);

        const [followupResult] = await dbConn
          .select({ total: sql<number>`COALESCE(COUNT(*), 0)` })
          .from(campaignSequenceRecipients)
          .where(and(
            eq(campaignSequenceRecipients.status, "sent"),
            sql`DATE(${campaignSequenceRecipients.sentAt}) = ${today}`,
          ));
        const globalFollowupSentToday = Number(followupResult?.total ?? 0);
        const globalTotalSentToday = globalOutreachSentToday + globalFollowupSentToday;

        const followupRemaining = Math.max(0, TOTAL_MAILBOX_DAILY_CAP - globalTotalSentToday);
        if (followupRemaining === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Daily mailbox cap of ${TOTAL_MAILBOX_DAILY_CAP} emails reached. Follow-up sends will resume tomorrow.`,
          });
        }

        // Get original campaign recipients who were successfully sent
        const allRecipients = await dbConn.select().from(emailCampaignRecipients)
          .where(and(
            eq(emailCampaignRecipients.campaignId, step.campaignId),
            eq(emailCampaignRecipients.status, "sent"),
          ));

        // Get suppression list
        const suppressions = await dbConn.select({ email: emailUnsubscribes.email }).from(emailUnsubscribes);
        const suppressedSet = new Set(suppressions.map(s => s.email.toLowerCase()));

        // Also check marketing contact status
        const mcBounced = await dbConn.select({ email: marketingContacts.email }).from(marketingContacts)
          .where(or(eq(marketingContacts.status, "unsubscribed"), eq(marketingContacts.status, "bounced")));
        for (const b of mcBounced) suppressedSet.add(b.email.toLowerCase());

        // Partition recipients: skipped vs eligible
        const eligibleRecipients = allRecipients.filter(r => !suppressedSet.has(r.email.toLowerCase()));

        // Cap eligible recipients to remaining daily capacity
        const recipients = eligibleRecipients.slice(0, followupRemaining);
        const deferredCount = eligibleRecipients.length - recipients.length;

        // Insert skipped records for suppressed addresses
        for (const r of allRecipients.filter(r => suppressedSet.has(r.email.toLowerCase()))) {
          await dbConn.insert(campaignSequenceRecipients).values({
            sequenceId: input.sequenceId,
            campaignId: step.campaignId,
            email: r.email,
            status: "skipped",
          });
        }

        let sentCount = 0;
        let failedCount = 0;
        const currentDate = formatDateGB();
        const BASE_URL = process.env.BASE_URL || "https://equiprofile.online";

        for (const recipient of recipients) {
          try {
            // Build unsubscribe link from marketing contact token
            const [mc] = await dbConn.select().from(marketingContacts)
              .where(eq(marketingContacts.email, recipient.email.toLowerCase()));
            const unsubToken = mc?.unsubscribeToken || nanoid(32);
            const unsubLink = `${BASE_URL}/unsubscribe?token=${unsubToken}`;

            const html = applyMergeFields(step.htmlBody, {
              firstName: extractFirstName(recipient.name),
              email: recipient.email,
              currentDate,
              unsubscribeLink: unsubLink,
            });
            await sendCampaignEmail(recipient.email, step.subject, html, unsubLink);
            await dbConn.insert(campaignSequenceRecipients).values({
              sequenceId: input.sequenceId,
              campaignId: step.campaignId,
              email: recipient.email,
              status: "sent",
              sentAt: new Date(),
            });
            sentCount++;
          } catch (err) {
            await dbConn.insert(campaignSequenceRecipients).values({
              sequenceId: input.sequenceId,
              campaignId: step.campaignId,
              email: recipient.email,
              status: "failed",
              error: err instanceof Error ? err.message : "Unknown error",
            });
            failedCount++;
          }
        }

        await dbConn.update(campaignSequences)
          .set({ status: "sent", sentAt: new Date(), sentCount, failedCount })
          .where(eq(campaignSequences.id, input.sequenceId));

        return { sentCount, failedCount, total: allRecipients.length, deferred: deferredCount };
      }),

    // ──────────────────────────────────────────────────────────
    // Pre-built campaign sequence templates
    // ──────────────────────────────────────────────────────────

    getSequenceTemplates: adminUnlockedProcedure.query(() => {
      return getSequenceTemplates().map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        targetAudience: t.targetAudience,
        stepCount: t.steps.length,
        steps: t.steps.map((s) => ({
          stepNumber: s.stepNumber,
          delayDays: s.delayDays,
          subject: s.subject,
          tone: s.tone,
        })),
      }));
    }),

    launchSequenceFromTemplate: adminUnlockedProcedure
      .input(z.object({
        templateId: z.string(),
        segment: z.enum(["leads", "trial", "paid", "all", "marketing"]),
        campaignName: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const dbConn = await getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const template = getSequenceTemplates().find((t) => t.id === input.templateId);
        if (!template) throw new TRPCError({ code: "NOT_FOUND", message: "Sequence template not found" });

        // Create the parent campaign using step 1 as the initial email
        const step1 = template.steps[0];
        const step1Html = buildSequenceStepHtml(step1.body);
        const campaignName = input.campaignName || `${template.name} — Sequence`;

        const result = await dbConn.insert(emailCampaigns).values({
          name: campaignName.slice(0, 200),
          subject: step1.subject.slice(0, 500),
          htmlBody: step1Html,
          templateId: template.id.slice(0, 50),
          segment: input.segment,
          customFilter: null,
          targetCountry: null,
          targetType: null,
          dailyLimit: DEFAULT_DAILY_LIMIT,
          sentToday: 0,
          lastSendDate: null,
          recipientCount: 0,
          sentCount: 0,
          failedCount: 0,
          status: "draft",
          sentAt: null,
          pausedAt: null,
          sentByUserId: ctx.user.id,
        });
        const campaignId = Number(result[0].insertId);

        // Create sequence steps for steps 2-4
        for (const step of template.steps.slice(1)) {
          const stepHtml = buildSequenceStepHtml(step.body);
          await dbConn.insert(campaignSequences).values({
            campaignId,
            stepNumber: step.stepNumber,
            delayDays: step.delayDays,
            subject: step.subject,
            htmlBody: stepHtml,
            templateId: template.id,
          });
        }

        return { campaignId, stepsCreated: template.steps.length - 1 };
      }),

    getAnalytics: adminUnlockedProcedure
      .input(
        z.object({
          period: z.enum(["day", "week", "month"]).default("week"),
        }),
      )
      .query(async ({ input }) => {
        const dbConn = await getDb();
        if (!dbConn) {
          return {
            totalVisits: 0,
            uniqueVisitors: 0,
            pageViews: 0,
            avgSessionDuration: 0,
            liveVisitors: 0,
            topPages: [],
            ctaClicks: 0,
            leadCaptures: 0,
            signupConversions: 0,
            trialToPaid: 0,
            trafficSources: [],
            deviceBreakdown: [],
            dailyTrend: [],
          };
        }

        const now = new Date();
        let startDate: Date;
        if (input.period === "day") {
          startDate = new Date(now.getTime() - 86_400_000);
        } else if (input.period === "week") {
          startDate = new Date(now.getTime() - 7 * 86_400_000);
        } else {
          startDate = new Date(now.getTime() - 30 * 86_400_000);
        }

        // Total visits (all page views in period)
        const [visitsResult] = await dbConn
          .select({ count: sql<number>`COUNT(*)` })
          .from(siteAnalytics)
          .where(gte(siteAnalytics.createdAt, startDate));

        // Unique visitors
        const [uniqueResult] = await dbConn
          .select({
            count: sql<number>`COUNT(DISTINCT ${siteAnalytics.visitorId})`,
          })
          .from(siteAnalytics)
          .where(gte(siteAnalytics.createdAt, startDate));

        // Avg session duration (only non-zero durations for meaningful average)
        const [durationResult] = await dbConn
          .select({
            avg: sql<number>`COALESCE(AVG(CASE WHEN ${siteAnalytics.duration} > 0 THEN ${siteAnalytics.duration} ELSE NULL END), 0)`,
          })
          .from(siteAnalytics)
          .where(gte(siteAnalytics.createdAt, startDate));

        // Top pages — exclude probe/scanner paths that slipped through before filtering was added
        const probePathFilter = sql`${siteAnalytics.path} NOT LIKE '/_profiler%' AND ${siteAnalytics.path} NOT LIKE '/phpinfo%' AND ${siteAnalytics.path} NOT LIKE '/wp-%' AND ${siteAnalytics.path} NOT LIKE '/.env%' AND ${siteAnalytics.path} NOT LIKE '/.git%' AND ${siteAnalytics.path} NOT LIKE '/actuator%' AND ${siteAnalytics.path} NOT LIKE '/solr%' AND ${siteAnalytics.path} NOT LIKE '/admin.php%' AND ${siteAnalytics.path} NOT LIKE '/cgi-bin%' AND ${siteAnalytics.path} NOT LIKE '/phpmyadmin%' AND ${siteAnalytics.path} NOT LIKE '/xmlrpc%'`;
        const topPages = await dbConn
          .select({
            path: siteAnalytics.path,
            views: sql<number>`COUNT(*)`,
          })
          .from(siteAnalytics)
          .where(and(gte(siteAnalytics.createdAt, startDate), probePathFilter))
          .groupBy(siteAnalytics.path)
          .orderBy(sql`COUNT(*) DESC`)
          .limit(10);

        // CTA clicks
        const [ctaResult] = await dbConn
          .select({ count: sql<number>`COUNT(*)` })
          .from(siteAnalytics)
          .where(
            and(
              gte(siteAnalytics.createdAt, startDate),
              eq(siteAnalytics.isCtaClick, true),
            ),
          );

        // Lead captures (chatLeads in period)
        const [leadsResult] = await dbConn
          .select({ count: sql<number>`COUNT(*)` })
          .from(chatLeads)
          .where(gte(chatLeads.createdAt, startDate));

        // Signup conversions (new verified active users in period — excludes soft-deleted and unverified)
        const [signupsResult] = await dbConn
          .select({ count: sql<number>`COUNT(*)` })
          .from(users)
          .where(and(gte(users.createdAt, startDate), eq(users.isActive, true), eq(users.emailVerified, true)));

        // Trial-to-paid conversions
        const [t2pResult] = await dbConn
          .select({ count: sql<number>`COUNT(*)` })
          .from(users)
          .where(
            and(
              eq(users.subscriptionStatus, "active"),
              gte(users.lastPaymentAt, startDate),
            ),
          );

        // Traffic sources (referrers)
        const trafficSources = await dbConn
          .select({
            source: sql<string>`COALESCE(NULLIF(${siteAnalytics.referrer}, ''), 'Direct')`,
            count: sql<number>`COUNT(*)`,
          })
          .from(siteAnalytics)
          .where(gte(siteAnalytics.createdAt, startDate))
          .groupBy(sql`COALESCE(NULLIF(${siteAnalytics.referrer}, ''), 'Direct')`)
          .orderBy(sql`COUNT(*) DESC`)
          .limit(10);

        // Device breakdown
        const deviceBreakdown = await dbConn
          .select({
            device: sql<string>`COALESCE(${siteAnalytics.deviceType}, 'unknown')`,
            count: sql<number>`COUNT(*)`,
          })
          .from(siteAnalytics)
          .where(gte(siteAnalytics.createdAt, startDate))
          .groupBy(sql`COALESCE(${siteAnalytics.deviceType}, 'unknown')`)
          .orderBy(sql`COUNT(*) DESC`);

        // Daily trend
        const dailyTrend = await dbConn
          .select({
            date: sql<string>`DATE(${siteAnalytics.createdAt})`,
            views: sql<number>`COUNT(*)`,
            visitors: sql<number>`COUNT(DISTINCT ${siteAnalytics.visitorId})`,
          })
          .from(siteAnalytics)
          .where(gte(siteAnalytics.createdAt, startDate))
          .groupBy(sql`DATE(${siteAnalytics.createdAt})`)
          .orderBy(sql`DATE(${siteAnalytics.createdAt})`);

        return {
          totalVisits: visitsResult?.count || 0,
          uniqueVisitors: uniqueResult?.count || 0,
          pageViews: visitsResult?.count || 0,
          avgSessionDuration: Math.round(Number(durationResult?.avg) || 0),
          liveVisitors: getLiveVisitorCount(),
          topPages,
          ctaClicks: ctaResult?.count || 0,
          leadCaptures: leadsResult?.count || 0,
          signupConversions: signupsResult?.count || 0,
          trialToPaid: t2pResult?.count || 0,
          trafficSources,
          deviceBreakdown,
          dailyTrend,
        };
      }),

    // Reset analytics — wipes siteAnalytics rows older than a cutoff date so
    // the admin can start fresh without touching user/business data.
    resetAnalytics: adminUnlockedProcedure
      .input(
        z.object({
          // 'all' deletes everything; 'before_today' deletes rows before today
          mode: z.enum(["all", "before_today"]).default("all"),
        }),
      )
      .mutation(async ({ input }) => {
        const dbConn = await getDb();
        if (!dbConn)
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });

        if (input.mode === "all") {
          await dbConn.delete(siteAnalytics);
        } else {
          const todayStart = new Date();
          todayStart.setHours(0, 0, 0, 0);
          await dbConn
            .delete(siteAnalytics)
            .where(sql`${siteAnalytics.createdAt} < ${todayStart}`);
        }

        return { success: true, mode: input.mode };
      }),
  }),

  // Stable management
  stables: router({
    create: stablePlanProcedure
      .input(
        z.object({
          name: z.string().min(1).max(200),
          description: z.string().max(10000).optional(),
          location: z.string().max(500).optional(),
          logo: z.string().optional(),
          primaryColor: z.string().optional(),
          secondaryColor: z.string().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db)
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });

        const result = await db.insert(stables).values({
          ...input,
          ownerId: ctx.user.id,
        });

        // Add creator as owner member
        await db.insert(stableMembers).values({
          stableId: result[0].insertId,
          userId: ctx.user!.id,
          role: "owner",
        });

        return { id: result[0].insertId };
      }),

    list: stablePlanProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];

      // Get stables where user is a member
      const members = await db
        .select()
        .from(stableMembers)
        .where(eq(stableMembers.userId, ctx.user.id));

      if (members.length === 0) return [];

      const stableIds = members.map((m) => m.stableId);
      return db
        .select()
        .from(stables)
        .where(
          and(inArray(stables.id, stableIds), eq(stables.isActive, true)),
        );
    }),

    getById: stablePlanProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) return null;

        // Check if user is a member
        const member = await db
          .select()
          .from(stableMembers)
          .where(
            and(
              eq(stableMembers.stableId, input.id),
              eq(stableMembers.userId, ctx.user.id),
            ),
          )
          .limit(1);

        if (member.length === 0) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }

        const stable = await db
          .select()
          .from(stables)
          .where(eq(stables.id, input.id))
          .limit(1);

        return stable[0] || null;
      }),

    update: stablePlanProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().max(500).optional(),
          description: z.string().max(10000).optional(),
          location: z.string().max(500).optional(),
          logo: z.string().optional(),
          primaryColor: z.string().optional(),
          secondaryColor: z.string().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        // Check if user is owner or admin
        const member = await db
          .select()
          .from(stableMembers)
          .where(
            and(
              eq(stableMembers.stableId, input.id),
              eq(stableMembers.userId, ctx.user.id),
            ),
          )
          .limit(1);

        if (
          member.length === 0 ||
          !["owner", "admin"].includes(member[0].role)
        ) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        const { id, ...updateData } = input;
        await db
          .update(stables)
          .set({ ...updateData, updatedAt: new Date() })
          .where(eq(stables.id, id));

        return { success: true };
      }),

    inviteMember: stablePlanProcedure
      .input(
        z.object({
          stableId: z.number(),
          email: z.string().email(),
          role: z.enum(["admin", "trainer", "member", "viewer"]),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        // Check permissions
        const member = await db
          .select()
          .from(stableMembers)
          .where(
            and(
              eq(stableMembers.stableId, input.stableId),
              eq(stableMembers.userId, ctx.user.id),
            ),
          )
          .limit(1);

        if (
          member.length === 0 ||
          !["owner", "admin"].includes(member[0].role)
        ) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        const token = nanoid(32);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        await db.insert(stableInvites).values({
          stableId: input.stableId,
          invitedByUserId: ctx.user.id,
          email: input.email,
          role: input.role,
          token,
          expiresAt,
        });

        // Fetch stable name for the email
        const stableResult = await db
          .select({ name: stables.name })
          .from(stables)
          .where(eq(stables.id, input.stableId))
          .limit(1);
        const stableName = stableResult[0]?.name ?? "a stable";
        const inviterName = ctx.user.name ?? ctx.user.email ?? "A team member";

        // Send invite email (async, don't block the response)
        sendStableInviteEmail(
          input.email,
          inviterName,
          stableName,
          input.role,
          token,
        ).catch((err) =>
          console.error("[Stable] Failed to send invite email:", err),
        );

        return { token, expiresAt };
      }),

    getMembers: protectedProcedure
      .input(z.object({ stableId: z.number() }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) return [];

        // Verify user is a member
        const isMember = await db
          .select()
          .from(stableMembers)
          .where(
            and(
              eq(stableMembers.stableId, input.stableId),
              eq(stableMembers.userId, ctx.user.id),
            ),
          )
          .limit(1);

        if (isMember.length === 0) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        return db
          .select({
            id: stableMembers.id,
            stableId: stableMembers.stableId,
            userId: stableMembers.userId,
            role: stableMembers.role,
            isActive: stableMembers.isActive,
            joinedAt: stableMembers.joinedAt,
            name: users.name,
            email: users.email,
            avatarUrl: users.profileImageUrl,
          })
          .from(stableMembers)
          .leftJoin(users, eq(stableMembers.userId, users.id))
          .where(
            and(
              eq(stableMembers.stableId, input.stableId),
              eq(stableMembers.isActive, true),
            ),
          );
      }),

    getInvites: protectedProcedure
      .input(z.object({ stableId: z.number() }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) return [];

        // Verify user is admin/owner of this stable
        const member = await db
          .select()
          .from(stableMembers)
          .where(
            and(
              eq(stableMembers.stableId, input.stableId),
              eq(stableMembers.userId, ctx.user.id),
            ),
          )
          .limit(1);

        if (
          member.length === 0 ||
          !["owner", "admin"].includes(member[0].role)
        ) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        return db
          .select({
            id: stableInvites.id,
            email: stableInvites.email,
            role: stableInvites.role,
            status: stableInvites.status,
            expiresAt: stableInvites.expiresAt,
            createdAt: stableInvites.createdAt,
          })
          .from(stableInvites)
          .where(
            and(
              eq(stableInvites.stableId, input.stableId),
              eq(stableInvites.status, "pending"),
            ),
          )
          .orderBy(desc(stableInvites.createdAt));
      }),

    cancelInvite: protectedProcedure
      .input(z.object({ stableId: z.number(), inviteId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        // Verify user is admin/owner of this stable
        const member = await db
          .select()
          .from(stableMembers)
          .where(
            and(
              eq(stableMembers.stableId, input.stableId),
              eq(stableMembers.userId, ctx.user.id),
            ),
          )
          .limit(1);

        if (
          member.length === 0 ||
          !["owner", "admin"].includes(member[0].role)
        ) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        await db
          .update(stableInvites)
          .set({ status: "expired" })
          .where(
            and(
              eq(stableInvites.id, input.inviteId),
              eq(stableInvites.stableId, input.stableId),
              eq(stableInvites.status, "pending"),
            ),
          );

        return { success: true };
      }),

    removeMember: protectedProcedure
      .input(z.object({ stableId: z.number(), memberId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        // Verify the caller is admin/owner of this stable
        const caller = await db
          .select()
          .from(stableMembers)
          .where(
            and(
              eq(stableMembers.stableId, input.stableId),
              eq(stableMembers.userId, ctx.user.id),
            ),
          )
          .limit(1);

        if (
          caller.length === 0 ||
          !["owner", "admin"].includes(caller[0].role)
        ) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        // Cannot remove yourself if you're the owner
        const target = await db
          .select()
          .from(stableMembers)
          .where(eq(stableMembers.id, input.memberId))
          .limit(1);

        if (target.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        if (target[0].role === "owner") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Cannot remove the stable owner",
          });
        }

        await db
          .update(stableMembers)
          .set({ isActive: false })
          .where(
            and(
              eq(stableMembers.id, input.memberId),
              eq(stableMembers.stableId, input.stableId),
            ),
          );

        return { success: true };
      }),

    getInviteByToken: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

        const invite = await db
          .select({
            id: stableInvites.id,
            stableId: stableInvites.stableId,
            email: stableInvites.email,
            role: stableInvites.role,
            status: stableInvites.status,
            expiresAt: stableInvites.expiresAt,
            stableName: stables.name,
          })
          .from(stableInvites)
          .leftJoin(stables, eq(stableInvites.stableId, stables.id))
          .where(eq(stableInvites.token, input.token))
          .limit(1);

        if (invite.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Invite not found" });
        }

        const inv = invite[0];
        if (inv.status !== "pending") {
          throw new TRPCError({ code: "BAD_REQUEST", message: `Invite already ${inv.status}` });
        }
        const now = new Date();
        if (now > new Date(inv.expiresAt)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invite has expired" });
        }

        if (!inv.stableName) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Stable not found" });
        }

        return {
          stableId: inv.stableId,
          stableName: inv.stableName,
          email: inv.email,
          role: inv.role,
          expiresAt: inv.expiresAt,
        };
      }),

    acceptInvite: protectedProcedure
      .input(z.object({ token: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

        // Load invite
        const inviteRows = await db
          .select()
          .from(stableInvites)
          .where(eq(stableInvites.token, input.token))
          .limit(1);

        if (inviteRows.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Invite not found" });
        }

        const invite = inviteRows[0];

        if (invite.status !== "pending") {
          throw new TRPCError({ code: "BAD_REQUEST", message: `Invite already ${invite.status}` });
        }
        const now = new Date();
        if (now > new Date(invite.expiresAt)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invite has expired" });
        }

        // Check already a member
        const existing = await db
          .select()
          .from(stableMembers)
          .where(
            and(
              eq(stableMembers.stableId, invite.stableId),
              eq(stableMembers.userId, ctx.user.id),
            ),
          )
          .limit(1);

        if (existing.length === 0) {
          await db.insert(stableMembers).values({
            stableId: invite.stableId,
            userId: ctx.user.id,
            role: invite.role,
            isActive: true,
          });
        }

        // Mark invite accepted
        await db
          .update(stableInvites)
          .set({ status: "accepted", acceptedAt: new Date() })
          .where(eq(stableInvites.token, input.token));

        return { stableId: invite.stableId };
      }),
  }),

  // Messages
  messages: router({
    getThreads: stablePlanProcedure
      .input(z.object({ stableId: z.number() }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) return [];

        return db
          .select()
          .from(messageThreads)
          .where(
            and(
              eq(messageThreads.stableId, input.stableId),
              eq(messageThreads.isActive, true),
            ),
          )
          .orderBy(desc(messageThreads.updatedAt));
      }),

    getMessages: stablePlanProcedure
      .input(
        z.object({
          threadId: z.number(),
          limit: z.number().default(50),
        }),
      )
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) return [];

        const rows = await db
          .select({
            id: messages.id,
            threadId: messages.threadId,
            senderId: messages.senderId,
            senderName: users.name,
            content: messages.content,
            attachments: messages.attachments,
            isRead: messages.isRead,
            createdAt: messages.createdAt,
          })
          .from(messages)
          .leftJoin(users, eq(messages.senderId, users.id))
          .where(eq(messages.threadId, input.threadId))
          .orderBy(desc(messages.createdAt))
          .limit(input.limit);
        return rows;
      }),

    sendMessage: stablePlanProcedure
      .input(
        z.object({
          threadId: z.number(),
          content: z.string().min(1),
          attachments: z.array(z.string()).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const result = await db.insert(messages).values({
          threadId: input.threadId,
          senderId: ctx.user.id,
          content: input.content,
          attachments: input.attachments
            ? JSON.stringify(input.attachments)
            : null,
        });

        const messageId = result[0].insertId;

        // Notify all active members of the stable so they get live updates
        try {
          const { publishModuleEvent } = await import("./_core/realtime");
          const threadRows = await db
            .select({ stableId: messageThreads.stableId })
            .from(messageThreads)
            .where(eq(messageThreads.id, input.threadId))
            .limit(1);

          if (threadRows[0]) {
            const memberRows = await db
              .select({ userId: stableMembers.userId })
              .from(stableMembers)
              .where(
                and(
                  eq(stableMembers.stableId, threadRows[0].stableId),
                  eq(stableMembers.isActive, true),
                ),
              );

            const payload = {
              messageId,
              threadId: input.threadId,
              senderId: ctx.user.id,
            };

            await Promise.all(
              memberRows.map(m => publishModuleEvent("messages", "created", payload, m.userId))
            );
          }
        } catch (err) {
          console.error("[Messages] Failed to publish realtime event:", err);
        }

        return { id: messageId };
      }),

    createThread: protectedProcedure
      .input(
        z.object({
          stableId: z.number(),
          title: z.string().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const result = await db.insert(messageThreads).values({
          stableId: input.stableId,
          title: input.title,
        });

        return { id: result[0].insertId };
      }),
  }),

  // Analytics
  analytics: router({
    getTrainingStats: protectedProcedure
      .input(
        z.object({
          horseId: z.number().optional(),
          startDate: z.string().optional(),
          endDate: z.string().optional(),
        }),
      )
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) return null;

        const whereConditions = [eq(trainingSessions.userId, ctx.user.id)];
        if (input.horseId) {
          whereConditions.push(eq(trainingSessions.horseId, input.horseId));
        }

        const result = await db
          .select({
            totalSessions: sql<number>`COUNT(*)`,
            completedSessions: sql<number>`SUM(CASE WHEN isCompleted = 1 THEN 1 ELSE 0 END)`,
            totalDuration: sql<number>`SUM(duration)`,
            avgPerformance: sql<number>`AVG(CASE 
            WHEN performance = 'excellent' THEN 4
            WHEN performance = 'good' THEN 3
            WHEN performance = 'average' THEN 2
            WHEN performance = 'poor' THEN 1
            ELSE 0 END)`,
          })
          .from(trainingSessions)
          .where(
            whereConditions.length > 1
              ? and(...whereConditions)
              : whereConditions[0],
          );

        return result[0] || null;
      }),

    getHealthStats: protectedProcedure
      .input(
        z.object({
          horseId: z.number().optional(),
        }),
      )
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) return null;

        const result = await db
          .select({
            totalRecords: sql<number>`COUNT(*)`,
            upcomingReminders: sql<number>`SUM(CASE WHEN nextDueDate >= CURDATE() THEN 1 ELSE 0 END)`,
            overdueReminders: sql<number>`SUM(CASE WHEN nextDueDate < CURDATE() THEN 1 ELSE 0 END)`,
          })
          .from(healthRecords)
          .where(eq(healthRecords.userId, ctx.user.id));

        return result[0] || null;
      }),

    getCostAnalysis: protectedProcedure
      .input(
        z.object({
          horseId: z.number().optional(),
          startDate: z.string().optional(),
          endDate: z.string().optional(),
        }),
      )
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) return null;

        const feedCostsResult = await db
          .select({
            totalCost: sql<number>`SUM(costPerUnit)`,
          })
          .from(feedCosts)
          .where(eq(feedCosts.userId, ctx.user.id));

        const healthCostsResult = await db
          .select({
            totalCost: sql<number>`SUM(cost)`,
          })
          .from(healthRecords)
          .where(eq(healthRecords.userId, ctx.user.id));

        return {
          feedCosts: feedCostsResult[0]?.totalCost || 0,
          healthCosts: healthCostsResult[0]?.totalCost || 0,
          totalCosts:
            (feedCostsResult[0]?.totalCost || 0) +
            (healthCostsResult[0]?.totalCost || 0),
        };
      }),
  }),

  // Reports
  reports: router({
    generate: subscribedProcedure
      .input(
        z.object({
          reportType: z.enum([
            "monthly_summary",
            "health_report",
            "training_progress",
            "cost_analysis",
            "competition_summary",
          ]),
          horseId: z.number().optional(),
          stableId: z.number().optional(),
          startDate: z.string().optional(),
          endDate: z.string().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const drizzleDb = await getDb();
        if (!drizzleDb) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const userId = ctx.user!.id;
        const startDate = input.startDate ? new Date(input.startDate) : undefined;
        const endDate = input.endDate ? new Date(input.endDate) : undefined;

        // Generate report data based on type using real data from the database
        let reportData: Record<string, unknown> = {};
        let reportTitle = `${input.reportType.replace(/_/g, " ")} Report`;

        if (input.reportType === "monthly_summary") {
          const now = new Date();
          const monthStart = startDate ?? new Date(now.getFullYear(), now.getMonth(), 1);
          const monthEnd = endDate ?? new Date(now.getFullYear(), now.getMonth() + 1, 0);
          reportTitle = `Monthly Summary — ${monthStart.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}`;

          const [horsesData, sessions, tasksData, appointments, vaccData] = await Promise.all([
            db.getHorsesByUserId(userId),
            db.getTrainingSessionsByUserId(userId),
            db.getTasksByUserId(userId),
            db.getAppointmentsByUserId(userId),
            db.getVaccinationsByUserId(userId),
          ]);

          const monthSessions = sessions.filter((s) => {
            const d = new Date(s.sessionDate);
            return d >= monthStart && d <= monthEnd;
          });
          const monthTasks = tasksData.filter((t) => t.createdAt && new Date(t.createdAt) >= monthStart && new Date(t.createdAt) <= monthEnd);
          const monthAppointments = appointments.filter((a) => {
            const d = new Date(a.appointmentDate);
            return d >= monthStart && d <= monthEnd;
          });

          reportData = {
            period: { start: monthStart.toISOString(), end: monthEnd.toISOString() },
            horses: { total: horsesData.length, names: horsesData.map((h) => h.name) },
            trainingSessions: {
              total: monthSessions.length,
              completed: monthSessions.filter((s) => s.isCompleted).length,
              disciplines: Array.from(new Set(monthSessions.map((s) => s.discipline).filter(Boolean))),
            },
            tasks: {
              total: monthTasks.length,
              completed: monthTasks.filter((t) => t.status === "completed").length,
              pending: monthTasks.filter((t) => t.status === "pending").length,
            },
            appointments: {
              total: monthAppointments.length,
              types: Array.from(new Set(monthAppointments.map((a) => a.appointmentType))),
            },
            vaccinations: {
              dueSoon: vaccData.filter((v) => {
                if (!v.nextDueDate) return false;
                const due = new Date(v.nextDueDate);
                const in30 = new Date();
                in30.setDate(in30.getDate() + 30);
                return due <= in30 && due >= new Date();
              }).length,
            },
          };

        } else if (input.reportType === "health_report") {
          reportTitle = "Health Report";
          const [vaccData, dewormings, treatments, dentalData] = await Promise.all([
            db.getVaccinationsByUserId(userId),
            db.getDewormingsByUserId(userId),
            db.getTreatmentsByUserId(userId),
            db.getDentalCareByUserId(userId),
          ]);

          const now = new Date();
          const in60Days = new Date();
          in60Days.setDate(in60Days.getDate() + 60);

          reportData = {
            generatedAt: now.toISOString(),
            vaccinations: {
              total: vaccData.length,
              upcomingDue: vaccData
                .filter((v) => v.nextDueDate && new Date(v.nextDueDate) >= now && new Date(v.nextDueDate) <= in60Days)
                .map((v) => ({ horse: v.horseId, vaccine: v.vaccineName, due: v.nextDueDate })),
              overdue: vaccData
                .filter((v) => v.nextDueDate && new Date(v.nextDueDate) < now)
                .map((v) => ({ horse: v.horseId, vaccine: v.vaccineName, due: v.nextDueDate })),
            },
            dewormings: {
              total: dewormings.length,
              upcomingDue: dewormings
                .filter((d) => d.nextDueDate && new Date(d.nextDueDate) >= now && new Date(d.nextDueDate) <= in60Days)
                .map((d) => ({ horse: d.horseId, product: d.productName, due: d.nextDueDate })),
            },
            treatments: {
              total: treatments.length,
              recent: treatments.slice(0, 5).map((t) => ({ horse: t.horseId, type: t.treatmentType, date: t.startDate })),
            },
            dental: {
              total: dentalData.length,
              upcomingDue: dentalData
                .filter((d) => d.nextDueDate && new Date(d.nextDueDate) >= now && new Date(d.nextDueDate) <= in60Days)
                .map((d) => ({ horse: d.horseId, due: d.nextDueDate })),
            },
          };

        } else if (input.reportType === "training_progress") {
          reportTitle = "Training Progress Report";
          const sessions = await db.getTrainingSessionsByUserId(userId);
          const filtered = sessions.filter((s) => {
            if (!startDate && !endDate) return true;
            const d = new Date(s.sessionDate);
            if (startDate && d < startDate) return false;
            if (endDate && d > endDate) return false;
            return true;
          });

          const disciplineCounts: Record<string, number> = {};
          for (const s of filtered) {
            if (s.discipline) disciplineCounts[s.discipline] = (disciplineCounts[s.discipline] ?? 0) + 1;
          }

          reportData = {
            period: {
              start: (startDate ?? new Date(new Date().getFullYear(), 0, 1)).toISOString(),
              end: (endDate ?? new Date()).toISOString(),
            },
            totalSessions: filtered.length,
            completedSessions: filtered.filter((s) => s.isCompleted).length,
            completionRate: filtered.length > 0
              ? Math.round((filtered.filter((s) => s.isCompleted).length / filtered.length) * 100)
              : 0,
            disciplineBreakdown: disciplineCounts,
            recentSessions: filtered
              .sort((a, b) => new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime())
              .slice(0, 10)
              .map((s) => ({
                date: s.sessionDate,
                type: s.sessionType,
                discipline: s.discipline,
                completed: s.isCompleted,
                performance: s.performance,
              })),
          };

        } else if (input.reportType === "cost_analysis") {
          reportTitle = "Cost Analysis Report";
          const [feedData, appointmentData, vaccData, competitionData] = await Promise.all([
            drizzleDb.select().from(feedCosts).where(eq(feedCosts.userId, userId)),
            db.getAppointmentsByUserId(userId),
            db.getVaccinationsByUserId(userId),
            db.getCompetitionsByUserId(userId),
          ]);

          const feedTotal = feedData
            .reduce((sum, f) => sum + (f.costPerUnit ?? 0), 0);
          const apptCostTotal = appointmentData
            .filter((a) => {
              if (!startDate && !endDate) return true;
              const d = new Date(a.appointmentDate);
              if (startDate && d < startDate) return false;
              if (endDate && d > endDate) return false;
              return true;
            })
            .reduce((sum, a) => sum + (a.cost ?? 0), 0);
          const vaccCostTotal = vaccData.reduce((sum, v) => sum + (v.cost ?? 0), 0);
          const compCostTotal = competitionData.reduce((sum, c) => sum + (c.cost ?? 0), 0);
          const compWinnings = competitionData.reduce((sum, c) => sum + (c.winnings ?? 0), 0);

          reportData = {
            currency: "GBP",
            period: {
              start: (startDate ?? new Date(new Date().getFullYear(), 0, 1)).toISOString(),
              end: (endDate ?? new Date()).toISOString(),
            },
            summary: {
              totalCostPence: feedTotal + apptCostTotal + vaccCostTotal + compCostTotal,
              netCostPence: feedTotal + apptCostTotal + vaccCostTotal + compCostTotal - compWinnings,
            },
            breakdown: {
              feeding: { totalPence: feedTotal, entryCount: feedData.length },
              appointments: { totalPence: apptCostTotal, entryCount: appointmentData.length },
              vaccinations: { totalPence: vaccCostTotal, entryCount: vaccData.length },
              competitions: { totalPence: compCostTotal, winningsPence: compWinnings, entryCount: competitionData.length },
            },
          };

        } else if (input.reportType === "competition_summary") {
          reportTitle = "Competition Summary Report";
          const competitionData = await db.getCompetitionsByUserId(userId);
          const filtered = competitionData.filter((c) => {
            if (input.horseId && c.horseId !== input.horseId) return false;
            if (!startDate && !endDate) return true;
            const d = new Date(c.date);
            if (startDate && d < startDate) return false;
            if (endDate && d > endDate) return false;
            return true;
          });

          const disciplineCounts: Record<string, number> = {};
          const placementCounts: Record<string, number> = {};
          for (const c of filtered) {
            if (c.discipline) disciplineCounts[c.discipline] = (disciplineCounts[c.discipline] ?? 0) + 1;
            if (c.placement) placementCounts[c.placement] = (placementCounts[c.placement] ?? 0) + 1;
          }

          reportData = {
            period: {
              start: (startDate ?? new Date(new Date().getFullYear(), 0, 1)).toISOString(),
              end: (endDate ?? new Date()).toISOString(),
            },
            totalCompetitions: filtered.length,
            disciplineBreakdown: disciplineCounts,
            placementBreakdown: placementCounts,
            totalEntryCostPence: filtered.reduce((sum, c) => sum + (c.cost ?? 0), 0),
            totalWinningsPence: filtered.reduce((sum, c) => sum + (c.winnings ?? 0), 0),
            recentResults: filtered
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .slice(0, 15)
              .map((c) => ({
                name: c.competitionName,
                date: c.date,
                venue: c.venue,
                discipline: c.discipline,
                level: c.level,
                placement: c.placement,
                score: c.score,
              })),
          };
        }

        const result = await drizzleDb.insert(reports).values({
          userId: ctx.user!.id,
          stableId: input.stableId,
          horseId: input.horseId,
          reportType: input.reportType,
          title: reportTitle,
          reportData: JSON.stringify(reportData),
        });

        return { id: result[0].insertId };
      }),

    list: protectedProcedure
      .input(
        z.object({
          limit: z.number().default(20),
        }),
      )
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) return [];

        return db
          .select()
          .from(reports)
          .where(eq(reports.userId, ctx.user.id))
          .orderBy(desc(reports.generatedAt))
          .limit(input.limit);
      }),

    scheduleReport: subscribedProcedure
      .input(
        z.object({
          reportType: z.enum([
            "monthly_summary",
            "health_report",
            "training_progress",
            "cost_analysis",
            "competition_summary",
          ]),
          frequency: z.enum(["daily", "weekly", "monthly", "quarterly"]),
          recipients: z.array(z.string().email()),
          stableId: z.number().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const result = await db.insert(reportSchedules).values({
          userId: ctx.user!.id,
          stableId: input.stableId,
          reportType: input.reportType,
          frequency: input.frequency,
          recipients: JSON.stringify(input.recipients),
          nextRunAt: new Date(),
        });

        return { id: result[0].insertId };
      }),

    listSchedules: subscribedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];

      return db
        .select()
        .from(reportSchedules)
        .where(
          and(
            eq(reportSchedules.userId, ctx.user!.id),
            eq(reportSchedules.isActive, true),
          ),
        )
        .orderBy(desc(reportSchedules.createdAt));
    }),

    deleteSchedule: subscribedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        await db
          .update(reportSchedules)
          .set({ isActive: false })
          .where(
            and(
              eq(reportSchedules.id, input.id),
              eq(reportSchedules.userId, ctx.user!.id),
            ),
          );

        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        await db
          .delete(reports)
          .where(
            and(
              eq(reports.id, input.id),
              eq(reports.userId, ctx.user!.id),
            ),
          );

        return { success: true };
      }),
  }),

  // Calendar and Events
  calendar: router({
    getEvents: protectedProcedure
      .input(
        z.object({
          startDate: z.string(),
          endDate: z.string(),
          stableId: z.number().optional(),
        }),
      )
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) return [];

        return db
          .select()
          .from(events)
          .where(
            and(
              eq(events.userId, ctx.user.id),
              gte(events.startDate, new Date(input.startDate)),
              lte(events.startDate, new Date(input.endDate)),
            ),
          )
          .orderBy(events.startDate);
      }),

    createEvent: subscribedProcedure
      .input(
        z.object({
          title: z.string().min(1).max(200),
          description: z.string().max(10000).optional(),
          eventType: z.enum([
            "training",
            "competition",
            "veterinary",
            "farrier",
            "lesson",
            "meeting",
            "other",
          ]),
          startDate: z.string(),
          endDate: z.string().optional(),
          horseId: z.number().optional(),
          stableId: z.number().optional(),
          location: z.string().max(500).optional(),
          isAllDay: z.boolean().default(false),
          color: z.string().max(500).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const drizzleDb = await getDb();
        if (!drizzleDb) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const startDate = new Date(input.startDate);
        const result = await drizzleDb.insert(events).values({
          ...input,
          userId: ctx.user!.id,
          startDate,
          endDate: input.endDate ? new Date(input.endDate) : null,
        });

        const eventId = result[0].insertId;

        // Schedule automatic reminders (24h and 1h before event)
        // Fire-and-forget — don't block the response
        db.createEventReminders(eventId, ctx.user!.id, startDate).catch(
          (err: unknown) =>
            console.error("[Calendar] Failed to create reminders:", err),
        );

        // Log WhatsApp availability for reminders
        const waConfig = isWhatsAppEnabled();
        if (waConfig.enabled) {
          console.log(
            `[Calendar] WhatsApp enabled — reminders queued for event ${eventId}`,
          );
        }

        return { id: eventId };
      }),

    updateEvent: subscribedProcedure
      .input(
        z.object({
          id: z.number(),
          title: z.string().optional(),
          description: z.string().max(10000).optional(),
          startDate: z.string().optional(),
          endDate: z.string().optional(),
          isCompleted: z.boolean().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const { id, ...updateData } = input;
        await db
          .update(events)
          .set({
            ...updateData,
            startDate: updateData.startDate
              ? new Date(updateData.startDate)
              : undefined,
            endDate: updateData.endDate
              ? new Date(updateData.endDate)
              : undefined,
            updatedAt: new Date(),
          })
          .where(and(eq(events.id, id), eq(events.userId, ctx.user.id)));

        return { success: true };
      }),

    deleteEvent: subscribedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        await db
          .delete(events)
          .where(and(eq(events.id, input.id), eq(events.userId, ctx.user.id)));

        return { success: true };
      }),
  }),

  // Competition Management
  competitions: router({
    create: subscribedProcedure
      .input(
        z.object({
          horseId: z.number(),
          competitionName: z.string().min(1).max(200),
          venue: z.string().optional(),
          date: z.string(),
          discipline: z.string().max(200).optional(),
          level: z.string().max(200).optional(),
          class: z.string().optional(),
          placement: z.string().optional(),
          score: z.string().optional(),
          notes: z.string().max(10000).optional(),
          cost: z.number().optional(),
          winnings: z.number().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const result = await db.insert(competitions).values({
          ...input,
          userId: ctx.user!.id,
          date: new Date(input.date),
        });

        return { id: result[0].insertId };
      }),

    list: protectedProcedure
      .input(
        z.object({
          horseId: z.number().optional(),
        }),
      )
      .query(async ({ ctx, input }) => {
        if (input.horseId) {
          return db.getCompetitionsByHorseId(input.horseId, ctx.user.id);
        }
        return db.getCompetitionsByUserId(ctx.user.id);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const dbConn = await getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await dbConn
          .delete(competitions)
          .where(
            and(
              eq(competitions.id, input.id),
              eq(competitions.userId, ctx.user.id),
            ),
          );
        return { success: true };
      }),

    exportCSV: subscribedProcedure.query(async ({ ctx }) => {
      const competitionData = await db.getCompetitionsByUserId(ctx.user.id);
      const csv = exportCompetitionsCSV(competitionData);
      const filename = generateCSVFilename("competitions");

      return {
        csv,
        filename,
        mimeType: "text/csv",
      };
    }),
  }),

  // Training Program Templates
  trainingPrograms: router({
    listTemplates: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];

      return db
        .select()
        .from(trainingProgramTemplates)
        .where(
          or(
            eq(trainingProgramTemplates.userId, ctx.user.id),
            eq(trainingProgramTemplates.isPublic, true),
          ),
        )
        .orderBy(desc(trainingProgramTemplates.createdAt));
    }),

    createTemplate: subscribedProcedure
      .input(
        z.object({
          name: z.string().min(1).max(200),
          description: z.string().max(10000).optional(),
          duration: z.number().optional(),
          discipline: z.string().max(200).optional(),
          level: z.string().max(200).optional(),
          goals: z.string().optional(),
          programData: z.string(),
          isPublic: z.boolean().default(false),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const result = await db.insert(trainingProgramTemplates).values({
          ...input,
          userId: ctx.user!.id,
        });

        return { id: result[0].insertId };
      }),

    getTemplate: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) return null;

        const templates = await db
          .select()
          .from(trainingProgramTemplates)
          .where(eq(trainingProgramTemplates.id, input.id))
          .limit(1);

        if (templates.length === 0) return null;

        // Check permissions
        const template = templates[0];
        if (template.userId !== ctx.user.id && !template.isPublic) {
          return null;
        }

        return template;
      }),

    updateTemplate: subscribedProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().min(1).max(200).optional(),
          description: z.string().max(10000).optional(),
          duration: z.number().optional(),
          discipline: z.string().max(200).optional(),
          level: z.string().max(200).optional(),
          goals: z.string().optional(),
          programData: z.string().optional(),
          isPublic: z.boolean().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const { id, ...updateData } = input;

        // Verify ownership
        const existing = await db
          .select()
          .from(trainingProgramTemplates)
          .where(eq(trainingProgramTemplates.id, id))
          .limit(1);

        if (existing.length === 0 || existing[0].userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        await db
          .update(trainingProgramTemplates)
          .set(updateData)
          .where(eq(trainingProgramTemplates.id, id));

        return { success: true };
      }),

    deleteTemplate: subscribedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        // Verify ownership
        const existing = await db
          .select()
          .from(trainingProgramTemplates)
          .where(eq(trainingProgramTemplates.id, input.id))
          .limit(1);

        if (existing.length === 0 || existing[0].userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        await db
          .delete(trainingProgramTemplates)
          .where(eq(trainingProgramTemplates.id, input.id));

        return { success: true };
      }),

    duplicateTemplate: subscribedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        // Get existing template
        const existing = await db
          .select()
          .from(trainingProgramTemplates)
          .where(eq(trainingProgramTemplates.id, input.id))
          .limit(1);

        if (existing.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        const template = existing[0];

        // Check if user can access this template
        if (template.userId !== ctx.user.id && !template.isPublic) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        // Create duplicate
        const result = await db.insert(trainingProgramTemplates).values({
          name: `${template.name} (Copy)`,
          description: template.description,
          duration: template.duration,
          discipline: template.discipline,
          level: template.level,
          goals: template.goals,
          programData: template.programData,
          isPublic: false,
          userId: ctx.user.id,
        });

        return { id: result[0].insertId };
      }),

    applyTemplate: subscribedProcedure
      .input(
        z.object({
          templateId: z.number(),
          horseId: z.number(),
          startDate: z.string(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const drizzleDb = await getDb();
        if (!drizzleDb) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        // Get template
        const template = await drizzleDb
          .select()
          .from(trainingProgramTemplates)
          .where(eq(trainingProgramTemplates.id, input.templateId))
          .limit(1);

        if (template.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        // Create program instance
        const result = await drizzleDb.insert(trainingPrograms).values({
          horseId: input.horseId,
          userId: ctx.user!.id,
          templateId: input.templateId,
          name: template[0].name,
          startDate: new Date(input.startDate),
          programData: template[0].programData,
        });

        // Create actual training sessions so they appear on the Training page
        let sessionsCreated = 0;
        try {
          if (template[0].programData) {
            const programData = JSON.parse(template[0].programData) as {
              weeks?: Array<{
                week: number;
                sessions?: Array<{
                  day: string;
                  type: string;
                  duration: number;
                  description: string;
                }>;
              }>;
            };

            // Validate programData structure
            if (!programData.weeks || !Array.isArray(programData.weeks)) {
              console.warn("[Templates] Invalid programData structure, skipping session creation");
            } else {
              const baseDate = new Date(input.startDate);
              const baseDayOfWeek = baseDate.getDay();

              // Create sessions for first few weeks
              for (const week of programData.weeks.slice(0, MAX_WEEKS_TO_SCHEDULE)) {
                if (!week.sessions || !Array.isArray(week.sessions)) continue;
                
                const weekOffset = (week.week - 1) * 7;
                for (const session of week.sessions) {
                  if (!session.type || !session.day) continue;
                  if (session.type.toLowerCase() === "rest") continue;
                  
                  // Validate day is in the mapping
                  if (!(session.day in TRAINING_DAY_OFFSET)) {
                    console.warn(`[Templates] Unknown day: ${session.day}, skipping session`);
                    continue;
                  }
                  
                  const dayOffset = TRAINING_DAY_OFFSET[session.day];
                  const diff = (dayOffset - baseDayOfWeek + 7) % 7;
                  const sessionDate = new Date(baseDate);
                  sessionDate.setDate(baseDate.getDate() + weekOffset + diff);
                  sessionDate.setHours(0, 0, 0, 0);

                  await db.createTrainingSession({
                    userId: ctx.user!.id,
                    horseId: input.horseId,
                    sessionDate,
                    sessionType: mapTemplateSessionType(session.type),
                    duration: session.duration || DEFAULT_SESSION_DURATION_MINUTES,
                    notes: session.description || undefined,
                    isCompleted: false,
                  });
                  
                  sessionsCreated++;
                }
              }
            }
          }
        } catch (err) {
          // Training session creation errors should be logged but not fail the mutation
          console.error("[Templates] Failed to create training sessions:", err);
        }

        // If user enabled "Training → Calendar Auto-Events", create calendar
        // events for each training session in the template's week 1 program.
        try {
          const userRecord = await db.getUserById(ctx.user!.id);
          const prefs = userRecord?.preferences
            ? JSON.parse(userRecord.preferences)
            : {};
          const calIntegration = prefs?.notifications?.trainingCalendarIntegration === true;

          if (calIntegration && template[0].programData) {
            const programData = JSON.parse(template[0].programData) as {
              weeks?: Array<{
                week: number;
                sessions?: Array<{
                  day: string;
                  type: string;
                  duration: number;
                  description: string;
                }>;
              }>;
            };

            const baseDate = new Date(input.startDate);
            const baseDayOfWeek = baseDate.getDay();

            const calendarInserts: Array<typeof events.$inferInsert> = [];

            for (const week of (programData.weeks ?? []).slice(0, MAX_WEEKS_TO_SCHEDULE)) {
              const weekOffset = (week.week - 1) * 7;
              for (const session of week.sessions ?? []) {
                if (session.type === "rest") continue;
                const dayOffset = TRAINING_DAY_OFFSET[session.day] ?? 0;
                const diff = (dayOffset - baseDayOfWeek + 7) % 7;
                const eventDate = new Date(baseDate);
                eventDate.setDate(
                  baseDate.getDate() + weekOffset + diff,
                );
                eventDate.setHours(9, 0, 0, 0);

                calendarInserts.push({
                  userId: ctx.user!.id,
                  horseId: input.horseId,
                  title: `${template[0].name} — ${session.type.charAt(0).toUpperCase() + session.type.slice(1)}`,
                  description: session.description,
                  eventType: "training",
                  startDate: eventDate,
                  isAllDay: false,
                });
              }
            }

            if (calendarInserts.length > 0) {
              await drizzleDb.insert(events).values(calendarInserts);
            }
          }
        } catch (err) {
          // Calendar event creation is non-critical — don't fail the apply mutation
          console.error("[Templates] Failed to create calendar events:", err);
        }

        return { id: result[0].insertId, sessionsCreated };
      }),
  }),

  // Breeding Management
  breeding: router({
    createRecord: stablePlanProcedure
      .input(
        z.object({
          mareId: z.number(),
          stallionId: z.number().optional(),
          stallionName: z.string().optional(),
          breedingDate: z.string(),
          method: z.enum(["natural", "artificial", "embryo_transfer"]),
          veterinarianName: z.string().optional(),
          cost: z.number().optional(),
          notes: z.string().max(10000).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const result = await db.insert(breeding).values({
          ...input,
          breedingDate: new Date(input.breedingDate),
        });

        // Publish real-time event
        const { publishModuleEvent } = await import("./_core/realtime");
        const recordId = result[0].insertId;
        const record = await db
          .select()
          .from(breeding)
          .where(eq(breeding.id, recordId))
          .limit(1);
        if (record[0]) {
          publishModuleEvent("breeding", "created", record[0], ctx.user!.id);
        }

        return { id: recordId };
      }),

    list: stablePlanProcedure
      .input(
        z.object({
          mareId: z.number().optional(),
        }),
      )
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) return [];

        // Join with horses table to filter by user ownership
        const userHorses = await db
          .select({ id: horses.id })
          .from(horses)
          .where(eq(horses.userId, ctx.user.id));

        const horseIds = userHorses.map((h) => h.id);
        if (horseIds.length === 0) return [];

        let query = db
          .select()
          .from(breeding)
          .where(inArray(breeding.mareId, horseIds));

        if (input.mareId) {
          query = db
            .select()
            .from(breeding)
            .where(
              and(
                inArray(breeding.mareId, horseIds),
                eq(breeding.mareId, input.mareId),
              ),
            );
        }

        return query.orderBy(desc(breeding.breedingDate));
      }),

    get: stablePlanProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) return null;

        // Verify ownership through horses table
        const userHorses = await db
          .select({ id: horses.id })
          .from(horses)
          .where(eq(horses.userId, ctx.user.id));

        const horseIds = userHorses.map((h) => h.id);

        const records = await db
          .select()
          .from(breeding)
          .where(
            and(eq(breeding.id, input.id), inArray(breeding.mareId, horseIds)),
          )
          .limit(1);

        return records.length > 0 ? records[0] : null;
      }),

    update: stablePlanProcedure
      .input(
        z.object({
          id: z.number(),
          stallionName: z.string().optional(),
          breedingDate: z.string().optional(),
          method: z
            .enum(["natural", "artificial", "embryo_transfer"])
            .optional(),
          veterinarianName: z.string().optional(),
          cost: z.number().optional(),
          notes: z.string().max(10000).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const { id, ...updateData } = input;

        // Verify ownership through horses table
        const userHorses = await db
          .select({ id: horses.id })
          .from(horses)
          .where(eq(horses.userId, ctx.user.id));

        const horseIds = userHorses.map((h) => h.id);

        const existing = await db
          .select()
          .from(breeding)
          .where(and(eq(breeding.id, id), inArray(breeding.mareId, horseIds)))
          .limit(1);

        if (existing.length === 0) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        const dataToUpdate: any = { ...updateData };
        if (updateData.breedingDate) {
          dataToUpdate.breedingDate = new Date(updateData.breedingDate);
        }

        await db.update(breeding).set(dataToUpdate).where(eq(breeding.id, id));

        // Publish real-time event
        const { publishModuleEvent } = await import("./_core/realtime");
        const record = await db
          .select()
          .from(breeding)
          .where(eq(breeding.id, id))
          .limit(1);
        if (record[0]) {
          publishModuleEvent("breeding", "updated", record[0], ctx.user.id);
        }

        return { success: true };
      }),

    delete: stablePlanProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        // Verify ownership through horses table
        const userHorses = await db
          .select({ id: horses.id })
          .from(horses)
          .where(eq(horses.userId, ctx.user.id));

        const horseIds = userHorses.map((h) => h.id);

        const existing = await db
          .select()
          .from(breeding)
          .where(
            and(eq(breeding.id, input.id), inArray(breeding.mareId, horseIds)),
          )
          .limit(1);

        if (existing.length === 0) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        await db.delete(breeding).where(eq(breeding.id, input.id));

        // Publish real-time event
        const { publishModuleEvent } = await import("./_core/realtime");
        publishModuleEvent(
          "breeding",
          "deleted",
          { id: input.id },
          ctx.user.id,
        );

        return { success: true };
      }),

    confirmPregnancy: stablePlanProcedure
      .input(
        z.object({
          id: z.number(),
          confirmed: z.boolean(),
          confirmationDate: z.string().optional(),
          dueDate: z.string().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        // Verify ownership through horses table
        const userHorses = await db
          .select({ id: horses.id })
          .from(horses)
          .where(eq(horses.userId, ctx.user.id));

        const horseIds = userHorses.map((h) => h.id);

        const existing = await db
          .select()
          .from(breeding)
          .where(
            and(eq(breeding.id, input.id), inArray(breeding.mareId, horseIds)),
          )
          .limit(1);

        if (existing.length === 0) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        const updateData: any = {
          pregnancyConfirmed: input.confirmed,
        };

        if (input.confirmationDate) {
          updateData.confirmationDate = new Date(input.confirmationDate);
        }
        if (input.dueDate) {
          updateData.dueDate = new Date(input.dueDate);
        }

        await db
          .update(breeding)
          .set(updateData)
          .where(eq(breeding.id, input.id));

        return { success: true };
      }),

    addFoal: stablePlanProcedure
      .input(
        z.object({
          breedingId: z.number(),
          birthDate: z.string(),
          gender: z.enum(["colt", "filly"]),
          name: z.string().max(500).optional(),
          color: z.string().max(500).optional(),
          birthWeight: z.number().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const result = await db.insert(foals).values({
          ...input,
          birthDate: new Date(input.birthDate),
        });

        return { id: result[0].insertId };
      }),

    listFoals: stablePlanProcedure
      .input(
        z.object({
          breedingId: z.number().optional(),
        }),
      )
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) return [];

        if (input.breedingId) {
          return db
            .select()
            .from(foals)
            .where(eq(foals.breedingId, input.breedingId))
            .orderBy(desc(foals.birthDate));
        }

        return db.select().from(foals).orderBy(desc(foals.birthDate));
      }),

    exportCSV: stablePlanProcedure.query(async ({ ctx }) => {
      const dbInstance = await getDb();
      if (!dbInstance) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }

      // Get user's horses first
      const userHorses = await dbInstance
        .select({ id: horses.id })
        .from(horses)
        .where(eq(horses.userId, ctx.user.id));

      const horseIds = userHorses.map((h) => h.id);
      if (horseIds.length === 0) {
        // No horses, return empty CSV
        const headers = [
          "id",
          "mareId",
          "stallionName",
          "breedingDate",
          "method",
          "cost",
          "pregnancyConfirmed",
          "dueDate",
          "notes",
        ];
        const csv = [headers.join(",")].join("\n");
        return {
          csv,
          filename: generateCSVFilename("breeding"),
          mimeType: "text/csv",
        };
      }

      const breedingRecords = await dbInstance
        .select()
        .from(breeding)
        .where(inArray(breeding.mareId, horseIds))
        .orderBy(desc(breeding.createdAt));

      // Create CSV with breeding data
      const headers = [
        "id",
        "mareId",
        "stallionName",
        "breedingDate",
        "method",
        "cost",
        "pregnancyConfirmed",
        "dueDate",
        "notes",
      ];
      const data = breedingRecords.map((record) => ({
        id: record.id,
        mareId: record.mareId,
        stallionName: record.stallionName || "N/A",
        breedingDate: record.breedingDate
          ? new Date(record.breedingDate).toISOString().split("T")[0]
          : "",
        method: record.method,
        cost: record.cost || 0,
        pregnancyConfirmed: record.pregnancyConfirmed ? "Yes" : "No",
        dueDate: record.dueDate
          ? new Date(record.dueDate).toISOString().split("T")[0]
          : "",
        notes: record.notes || "",
      }));

      const csv =
        data.length > 0
          ? [
              headers.join(","),
              ...data.map((row) =>
                headers.map((h) => (row as any)[h]).join(","),
              ),
            ].join("\n")
          : headers.join(",");

      const filename = generateCSVFilename("breeding_records");

      return {
        csv,
        filename,
        mimeType: "text/csv",
      };
    }),
  }),

  // Trainer availability management
  trainerAvailability: router({
    create: protectedProcedure
      .input(
        z.object({
          dayOfWeek: z.number().min(0).max(6),
          startTime: z.string().regex(/^\d{2}:\d{2}$/),
          endTime: z.string().regex(/^\d{2}:\d{2}$/),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        }

        const result = await db.insert(trainerAvailability).values({
          trainerId: ctx.user.id,
          dayOfWeek: input.dayOfWeek,
          startTime: input.startTime,
          endTime: input.endTime,
          isActive: true,
        });

        return { id: result[0].insertId };
      }),

    list: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];

      return db
        .select()
        .from(trainerAvailability)
        .where(
          and(
            eq(trainerAvailability.trainerId, ctx.user.id),
            eq(trainerAvailability.isActive, true),
          ),
        )
        .orderBy(trainerAvailability.dayOfWeek, trainerAvailability.startTime);
    }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          dayOfWeek: z.number().min(0).max(6).optional(),
          startTime: z
            .string()
            .regex(/^\d{2}:\d{2}$/)
            .optional(),
          endTime: z
            .string()
            .regex(/^\d{2}:\d{2}$/)
            .optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        }

        const existing = await db
          .select()
          .from(trainerAvailability)
          .where(eq(trainerAvailability.id, input.id))
          .limit(1);

        if (!existing.length || existing[0].trainerId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        const updateData: any = {};
        if (input.dayOfWeek !== undefined)
          updateData.dayOfWeek = input.dayOfWeek;
        if (input.startTime) updateData.startTime = input.startTime;
        if (input.endTime) updateData.endTime = input.endTime;

        await db
          .update(trainerAvailability)
          .set(updateData)
          .where(eq(trainerAvailability.id, input.id));

        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        }

        const existing = await db
          .select()
          .from(trainerAvailability)
          .where(eq(trainerAvailability.id, input.id))
          .limit(1);

        if (!existing.length || existing[0].trainerId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        await db
          .update(trainerAvailability)
          .set({ isActive: false })
          .where(eq(trainerAvailability.id, input.id));

        return { success: true };
      }),
  }),

  // Lesson bookings management
  lessonBookings: router({
    create: protectedProcedure
      .input(
        z.object({
          trainerId: z.number(),
          horseId: z.number().optional(),
          lessonDate: z.string(),
          duration: z.number(),
          lessonType: z.string().optional(),
          location: z.string().max(500).optional(),
          fee: z.number().optional(),
          notes: z.string().max(10000).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        }

        const result = await db.insert(lessonBookings).values({
          trainerId: input.trainerId,
          clientId: ctx.user.id,
          horseId: input.horseId,
          lessonDate: new Date(input.lessonDate),
          duration: input.duration,
          lessonType: input.lessonType,
          location: input.location,
          status: "scheduled",
          fee: input.fee,
          paid: false,
          notes: input.notes,
        });

        return { id: result[0].insertId };
      }),

    list: protectedProcedure
      .input(
        z.object({
          asTrainer: z.boolean().optional(),
          status: z
            .enum(["scheduled", "completed", "cancelled", "no_show"])
            .optional(),
        }),
      )
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) return [];

        let conditions: any[] = [];

        if (input.asTrainer) {
          conditions.push(eq(lessonBookings.trainerId, ctx.user.id));
        } else {
          conditions.push(eq(lessonBookings.clientId, ctx.user.id));
        }

        if (input.status) {
          conditions.push(eq(lessonBookings.status, input.status));
        }

        return db
          .select()
          .from(lessonBookings)
          .where(and(...conditions))
          .orderBy(desc(lessonBookings.lessonDate));
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        const lessons = await db
          .select()
          .from(lessonBookings)
          .where(eq(lessonBookings.id, input.id))
          .limit(1);

        if (!lessons.length) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        const lesson = lessons[0];
        if (
          lesson.trainerId !== ctx.user.id &&
          lesson.clientId !== ctx.user.id
        ) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        return lesson;
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          lessonDate: z.string().optional(),
          duration: z.number().optional(),
          lessonType: z.string().optional(),
          location: z.string().max(500).optional(),
          status: z
            .enum(["scheduled", "completed", "cancelled", "no_show"])
            .optional(),
          fee: z.number().optional(),
          paid: z.boolean().optional(),
          notes: z.string().max(10000).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        }

        const existing = await db
          .select()
          .from(lessonBookings)
          .where(eq(lessonBookings.id, input.id))
          .limit(1);

        if (!existing.length) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        const lesson = existing[0];
        if (
          lesson.trainerId !== ctx.user.id &&
          lesson.clientId !== ctx.user.id
        ) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        const updateData: any = {};
        if (input.lessonDate)
          updateData.lessonDate = new Date(input.lessonDate);
        if (input.duration) updateData.duration = input.duration;
        if (input.lessonType) updateData.lessonType = input.lessonType;
        if (input.location) updateData.location = input.location;
        if (input.status) updateData.status = input.status;
        if (input.fee !== undefined) updateData.fee = input.fee;
        if (input.paid !== undefined) updateData.paid = input.paid;
        if (input.notes) updateData.notes = input.notes;

        await db
          .update(lessonBookings)
          .set(updateData)
          .where(eq(lessonBookings.id, input.id));

        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        }

        const existing = await db
          .select()
          .from(lessonBookings)
          .where(eq(lessonBookings.id, input.id))
          .limit(1);

        if (!existing.length) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        const lesson = existing[0];
        if (
          lesson.trainerId !== ctx.user.id &&
          lesson.clientId !== ctx.user.id
        ) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        await db.delete(lessonBookings).where(eq(lessonBookings.id, input.id));

        return { success: true };
      }),

    markCompleted: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        }

        const existing = await db
          .select()
          .from(lessonBookings)
          .where(eq(lessonBookings.id, input.id))
          .limit(1);

        if (!existing.length) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        if (existing[0].trainerId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        await db
          .update(lessonBookings)
          .set({ status: "completed" })
          .where(eq(lessonBookings.id, input.id));

        return { success: true };
      }),

    markCancelled: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        }

        const existing = await db
          .select()
          .from(lessonBookings)
          .where(eq(lessonBookings.id, input.id))
          .limit(1);

        if (!existing.length) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        const lesson = existing[0];
        if (
          lesson.trainerId !== ctx.user.id &&
          lesson.clientId !== ctx.user.id
        ) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        await db
          .update(lessonBookings)
          .set({ status: "cancelled" })
          .where(eq(lessonBookings.id, input.id));

        return { success: true };
      }),
  }),

  // ============ TREATMENTS ROUTER ============
  treatments: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getTreatmentsByUserId(ctx.user.id);
    }),

    listByHorse: protectedProcedure
      .input(z.object({ horseId: z.number() }))
      .query(async ({ ctx, input }) => {
        return await db.getTreatmentsByHorseId(input.horseId, ctx.user.id);
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        return await db.getTreatmentById(input.id, ctx.user.id);
      }),

    create: protectedProcedure
      .input(
        z.object({
          horseId: z.number(),
          treatmentType: z.string().min(1),
          treatmentName: z.string().min(1).max(200),
          description: z.string().max(10000).optional(),
          startDate: z.string(), // ISO date string
          endDate: z.string().optional(),
          frequency: z.string().optional(),
          dosage: z.string().optional(),
          administeredBy: z.string().optional(),
          vetName: z.string().optional(),
          vetClinic: z.string().optional(),
          cost: z.number().optional(),
          status: z.enum(["active", "completed", "discontinued"]).optional(),
          notes: z.string().max(10000).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const { startDate, endDate, ...rest } = input;
        const id = await db.createTreatment({
          ...rest,
          userId: ctx.user.id,
          startDate: new Date(startDate),
          endDate: endDate ? new Date(endDate) : undefined,
        });

        // Publish real-time event
        const { publishModuleEvent } = await import("./_core/realtime");
        const treatment = await db.getTreatmentById(id, ctx.user.id);
        if (treatment) {
          publishModuleEvent("treatments", "created", treatment, ctx.user.id);
        }

        // Audit log
        await db.createActivityLog({
          userId: ctx.user.id,
          action: "treatment_created",
          entityType: "treatment",
          entityId: id,
          details: `Created treatment: ${input.treatmentName}`,
        });

        return { id };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          treatmentType: z.string().optional(),
          treatmentName: z.string().optional(),
          description: z.string().max(10000).optional(),
          startDate: z.string().optional(),
          endDate: z.string().optional(),
          frequency: z.string().optional(),
          dosage: z.string().optional(),
          administeredBy: z.string().optional(),
          vetName: z.string().optional(),
          vetClinic: z.string().optional(),
          cost: z.number().optional(),
          status: z.enum(["active", "completed", "discontinued"]).optional(),
          notes: z.string().max(10000).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const { id, startDate, endDate, ...data } = input;
        await db.updateTreatment(id, ctx.user.id, {
          ...data,
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
        });

        // Publish real-time event
        const { publishModuleEvent } = await import("./_core/realtime");
        const treatment = await db.getTreatmentById(id, ctx.user.id);
        if (treatment) {
          publishModuleEvent("treatments", "updated", treatment, ctx.user.id);
        }

        // Audit log
        await db.createActivityLog({
          userId: ctx.user.id,
          action: "treatment_updated",
          entityType: "treatment",
          entityId: id,
          details: `Updated treatment`,
        });

        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteTreatment(input.id, ctx.user.id);

        // Publish real-time event
        const { publishModuleEvent } = await import("./_core/realtime");
        publishModuleEvent(
          "treatments",
          "deleted",
          { id: input.id },
          ctx.user.id,
        );

        // Audit log
        await db.createActivityLog({
          userId: ctx.user.id,
          action: "treatment_deleted",
          entityType: "treatment",
          entityId: input.id,
          details: `Deleted treatment`,
        });

        return { success: true };
      }),
  }),

  // ============ APPOINTMENTS ROUTER ============
  appointments: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getAppointmentsByUserId(ctx.user.id);
    }),

    listByHorse: protectedProcedure
      .input(z.object({ horseId: z.number() }))
      .query(async ({ ctx, input }) => {
        return await db.getAppointmentsByHorseId(input.horseId, ctx.user.id);
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        return await db.getAppointmentById(input.id, ctx.user.id);
      }),

    create: protectedProcedure
      .input(
        z.object({
          horseId: z.number(),
          appointmentType: z.string().min(1).max(100),
          title: z.string().min(1).max(200),
          description: z.string().max(10000).optional(),
          appointmentDate: z.string(), // ISO date string
          appointmentTime: z.string().optional(),
          duration: z.number().optional(),
          providerName: z.string().optional(),
          providerPhone: z.string().optional(),
          providerClinic: z.string().optional(),
          location: z.string().max(500).optional(),
          cost: z.number().optional(),
          status: z
            .enum(["scheduled", "confirmed", "completed", "cancelled"])
            .optional(),
          notes: z.string().max(10000).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const { appointmentDate, ...rest } = input;
        const id = await db.createAppointment({
          ...rest,
          userId: ctx.user.id,
          appointmentDate: new Date(appointmentDate),
          reminderSent: false,
        });

        // Publish real-time event
        const { publishModuleEvent } = await import("./_core/realtime");
        const appointment = await db.getAppointmentById(id, ctx.user.id);
        if (appointment) {
          publishModuleEvent(
            "appointments",
            "created",
            appointment,
            ctx.user.id,
          );
        }

        // Audit log
        await db.createActivityLog({
          userId: ctx.user.id,
          action: "appointment_created",
          entityType: "appointment",
          entityId: id,
          details: `Created appointment: ${input.title}`,
        });

        return { id };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          appointmentType: z.string().optional(),
          title: z.string().optional(),
          description: z.string().max(10000).optional(),
          appointmentDate: z.string().optional(),
          appointmentTime: z.string().optional(),
          duration: z.number().optional(),
          providerName: z.string().optional(),
          providerPhone: z.string().optional(),
          providerClinic: z.string().optional(),
          location: z.string().max(500).optional(),
          cost: z.number().optional(),
          status: z
            .enum(["scheduled", "confirmed", "completed", "cancelled"])
            .optional(),
          notes: z.string().max(10000).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const { id, appointmentDate, ...data } = input;
        await db.updateAppointment(id, ctx.user.id, {
          ...data,
          appointmentDate: appointmentDate
            ? new Date(appointmentDate)
            : undefined,
        });

        // Publish real-time event
        const { publishModuleEvent } = await import("./_core/realtime");
        const appointment = await db.getAppointmentById(id, ctx.user.id);
        if (appointment) {
          publishModuleEvent(
            "appointments",
            "updated",
            appointment,
            ctx.user.id,
          );
        }

        // Audit log
        await db.createActivityLog({
          userId: ctx.user.id,
          action: "appointment_updated",
          entityType: "appointment",
          entityId: id,
          details: `Updated appointment`,
        });

        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteAppointment(input.id, ctx.user.id);

        // Publish real-time event
        const { publishModuleEvent } = await import("./_core/realtime");
        publishModuleEvent(
          "appointments",
          "deleted",
          { id: input.id },
          ctx.user.id,
        );

        // Audit log
        await db.createActivityLog({
          userId: ctx.user.id,
          action: "appointment_deleted",
          entityType: "appointment",
          entityId: input.id,
          details: `Deleted appointment`,
        });

        return { success: true };
      }),

    exportCSV: protectedProcedure.query(async ({ ctx }) => {
      const appointments = await db.getAppointmentsByUserId(ctx.user.id);
      // Enrich with horse names
      const horses = await db.getHorsesByUserId(ctx.user.id);
      const horsesMap: Record<number, string> = {};
      horses.forEach((h: any) => { horsesMap[h.id] = h.name; });
      const enriched = appointments.map((a: any) => ({
        ...a,
        horseName: a.horseId ? (horsesMap[a.horseId] || "") : "",
      }));
      const csv = exportAppointmentsCSV(enriched);
      return {
        csv,
        filename: `appointments_${new Date().toISOString().split("T")[0]}.csv`,
        mimeType: "text/csv",
      };
    }),
  }),

  // ============ DENTAL CARE ROUTER ============
  dentalCare: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getDentalCareByUserId(ctx.user.id);
    }),

    listByHorse: protectedProcedure
      .input(z.object({ horseId: z.number() }))
      .query(async ({ ctx, input }) => {
        return await db.getDentalCareByHorseId(input.horseId, ctx.user.id);
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        return await db.getDentalCareById(input.id, ctx.user.id);
      }),

    create: protectedProcedure
      .input(
        z.object({
          horseId: z.number(),
          examDate: z.string(), // ISO date string
          dentistName: z.string().optional(),
          dentistClinic: z.string().optional(),
          procedureType: z.string().optional(),
          findings: z.string().optional(),
          treatmentPerformed: z.string().optional(),
          nextDueDate: z.string().optional(),
          cost: z.number().optional(),
          sedationUsed: z.boolean().optional(),
          teethCondition: z
            .enum(["excellent", "good", "fair", "poor"])
            .optional(),
          notes: z.string().max(10000).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const { examDate, nextDueDate, ...rest } = input;
        const id = await db.createDentalCare({
          ...rest,
          userId: ctx.user.id,
          examDate: new Date(examDate),
          nextDueDate: nextDueDate ? new Date(nextDueDate) : undefined,
        });

        // Publish real-time event
        const { publishModuleEvent } = await import("./_core/realtime");
        const dental = await db.getDentalCareById(id, ctx.user.id);
        if (dental) {
          publishModuleEvent("dentalCare", "created", dental, ctx.user.id);
        }

        // Audit log
        await db.createActivityLog({
          userId: ctx.user.id,
          action: "dental_care_created",
          entityType: "dental_care",
          entityId: id,
          details: `Created dental care record`,
        });

        return { id };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          examDate: z.string().optional(),
          dentistName: z.string().optional(),
          dentistClinic: z.string().optional(),
          procedureType: z.string().optional(),
          findings: z.string().optional(),
          treatmentPerformed: z.string().optional(),
          nextDueDate: z.string().optional(),
          cost: z.number().optional(),
          sedationUsed: z.boolean().optional(),
          teethCondition: z
            .enum(["excellent", "good", "fair", "poor"])
            .optional(),
          notes: z.string().max(10000).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const { id, examDate, nextDueDate, ...data } = input;
        await db.updateDentalCare(id, ctx.user.id, {
          ...data,
          examDate: examDate ? new Date(examDate) : undefined,
          nextDueDate: nextDueDate ? new Date(nextDueDate) : undefined,
        });

        // Publish real-time event
        const { publishModuleEvent } = await import("./_core/realtime");
        const dental = await db.getDentalCareById(id, ctx.user.id);
        if (dental) {
          publishModuleEvent("dentalCare", "updated", dental, ctx.user.id);
        }

        // Audit log
        await db.createActivityLog({
          userId: ctx.user.id,
          action: "dental_care_updated",
          entityType: "dental_care",
          entityId: id,
          details: `Updated dental care record`,
        });

        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteDentalCare(input.id, ctx.user.id);

        // Publish real-time event
        const { publishModuleEvent } = await import("./_core/realtime");
        publishModuleEvent(
          "dentalCare",
          "deleted",
          { id: input.id },
          ctx.user.id,
        );

        // Audit log
        await db.createActivityLog({
          userId: ctx.user.id,
          action: "dental_care_deleted",
          entityType: "dental_care",
          entityId: input.id,
          details: `Deleted dental care record`,
        });

        return { success: true };
      }),
  }),

  // ============ X-RAYS ROUTER ============
  xrays: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getXraysByUserId(ctx.user.id);
    }),

    listByHorse: protectedProcedure
      .input(z.object({ horseId: z.number() }))
      .query(async ({ ctx, input }) => {
        return await db.getXraysByHorseId(input.horseId, ctx.user.id);
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        return await db.getXrayById(input.id, ctx.user.id);
      }),

    create: protectedProcedure
      .input(
        z.object({
          horseId: z.number(),
          xrayDate: z.string(), // ISO date string
          bodyPart: z.string().min(1).max(100),
          reason: z.string().optional(),
          vetName: z.string().optional(),
          vetClinic: z.string().optional(),
          findings: z.string().optional(),
          diagnosis: z.string().optional(),
          fileUrl: z.string().optional(),
          fileName: z.string().optional(),
          fileSize: z.number().optional(),
          mimeType: z.string().optional(),
          cost: z.number().optional(),
          notes: z.string().max(10000).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const { xrayDate, ...rest } = input;
        const id = await db.createXray({
          ...rest,
          userId: ctx.user.id,
          xrayDate: new Date(xrayDate),
        });

        // Publish real-time event
        const { publishModuleEvent } = await import("./_core/realtime");
        const xray = await db.getXrayById(id, ctx.user.id);
        if (xray) {
          publishModuleEvent("xrays", "created", xray, ctx.user.id);
        }

        // Audit log
        await db.createActivityLog({
          userId: ctx.user.id,
          action: "xray_created",
          entityType: "xray",
          entityId: id,
          details: `Created x-ray record for ${input.bodyPart}`,
        });

        return { id };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          xrayDate: z.string().optional(),
          bodyPart: z.string().optional(),
          reason: z.string().optional(),
          vetName: z.string().optional(),
          vetClinic: z.string().optional(),
          findings: z.string().optional(),
          diagnosis: z.string().optional(),
          fileUrl: z.string().optional(),
          fileName: z.string().optional(),
          fileSize: z.number().optional(),
          mimeType: z.string().optional(),
          cost: z.number().optional(),
          notes: z.string().max(10000).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const { id, xrayDate, ...data } = input;
        await db.updateXray(id, ctx.user.id, {
          ...data,
          xrayDate: xrayDate ? new Date(xrayDate) : undefined,
        });

        // Publish real-time event
        const { publishModuleEvent } = await import("./_core/realtime");
        const xray = await db.getXrayById(id, ctx.user.id);
        if (xray) {
          publishModuleEvent("xrays", "updated", xray, ctx.user.id);
        }

        // Audit log
        await db.createActivityLog({
          userId: ctx.user.id,
          action: "xray_updated",
          entityType: "xray",
          entityId: id,
          details: `Updated x-ray record`,
        });

        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteXray(input.id, ctx.user.id);

        // Publish real-time event
        const { publishModuleEvent } = await import("./_core/realtime");
        publishModuleEvent("xrays", "deleted", { id: input.id }, ctx.user.id);

        // Audit log
        await db.createActivityLog({
          userId: ctx.user.id,
          action: "xray_deleted",
          entityType: "xray",
          entityId: input.id,
          details: `Deleted x-ray record`,
        });

        return { success: true };
      }),
  }),

  // ============ TAGS ROUTER ============
  tags: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getTagsByUserId(ctx.user.id);
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        return await db.getTagById(input.id, ctx.user.id);
      }),

    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1).max(100),
          color: z.string().max(500).optional(),
          category: z.string().optional(),
          description: z.string().max(10000).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const id = await db.createTag({
          ...input,
          userId: ctx.user.id,
        });

        // Publish real-time event
        const { publishModuleEvent } = await import("./_core/realtime");
        const tag = await db.getTagById(id, ctx.user.id);
        if (tag) {
          publishModuleEvent("tags", "created", tag, ctx.user.id);
        }

        // Audit log
        await db.createActivityLog({
          userId: ctx.user.id,
          action: "tag_created",
          entityType: "tag",
          entityId: id,
          details: `Created tag: ${input.name}`,
        });

        return { id };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().max(500).optional(),
          color: z.string().max(500).optional(),
          category: z.string().optional(),
          description: z.string().max(10000).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await db.updateTag(id, ctx.user.id, data);

        // Publish real-time event
        const { publishModuleEvent } = await import("./_core/realtime");
        const tag = await db.getTagById(id, ctx.user.id);
        if (tag) {
          publishModuleEvent("tags", "updated", tag, ctx.user.id);
        }

        // Audit log
        await db.createActivityLog({
          userId: ctx.user.id,
          action: "tag_updated",
          entityType: "tag",
          entityId: id,
          details: `Updated tag`,
        });

        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteTag(input.id, ctx.user.id);

        // Publish real-time event
        const { publishModuleEvent } = await import("./_core/realtime");
        publishModuleEvent("tags", "deleted", { id: input.id }, ctx.user.id);

        // Audit log
        await db.createActivityLog({
          userId: ctx.user.id,
          action: "tag_deleted",
          entityType: "tag",
          entityId: input.id,
          details: `Deleted tag`,
        });

        return { success: true };
      }),

    attachToHorse: protectedProcedure
      .input(z.object({ horseId: z.number(), tagId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        // Verify horse ownership
        const horse = await db.getHorseById(input.horseId, ctx.user.id);
        if (!horse) throw new TRPCError({ code: "NOT_FOUND", message: "Horse not found" });

        // Verify tag ownership
        const tag = await db.getTagById(input.tagId, ctx.user.id);
        if (!tag) throw new TRPCError({ code: "NOT_FOUND", message: "Tag not found" });

        await db.attachTagToHorse(input.horseId, input.tagId, ctx.user.id);
        return { success: true };
      }),

    detachFromHorse: protectedProcedure
      .input(z.object({ horseId: z.number(), tagId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.detachTagFromHorse(input.horseId, input.tagId, ctx.user.id);
        return { success: true };
      }),

    listByHorse: protectedProcedure
      .input(z.object({ horseId: z.number() }))
      .query(async ({ ctx, input }) => {
        return await db.getTagsByHorse(input.horseId, ctx.user.id);
      }),

    /** Return all horse IDs that have a specific tag — used for client-side filtering */
    getHorsesByTag: protectedProcedure
      .input(z.object({ tagId: z.number() }))
      .query(async ({ ctx, input }) => {
        return await db.getHorseIdsByTag(input.tagId, ctx.user.id);
      }),

    /** Return all tags with a count of horses assigned to each */
    listWithCounts: protectedProcedure.query(async ({ ctx }) => {
      return await db.getTagsWithHorseCount(ctx.user.id);
    }),
  }),

  // ============ HOOFCARE ROUTER ============
  hoofcare: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getHoofcareByUserId(ctx.user.id);
    }),

    listByHorse: protectedProcedure
      .input(z.object({ horseId: z.number() }))
      .query(async ({ ctx, input }) => {
        return await db.getHoofcareByHorseId(input.horseId, ctx.user.id);
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        return await db.getHoofcareById(input.id, ctx.user.id);
      }),

    create: protectedProcedure
      .input(
        z.object({
          horseId: z.number(),
          careDate: z.string(), // ISO date string
          careType: z.enum([
            "shoeing",
            "trimming",
            "remedial",
            "inspection",
            "other",
          ]),
          farrierName: z.string().optional(),
          farrierPhone: z.string().optional(),
          hoofCondition: z
            .enum(["excellent", "good", "fair", "poor"])
            .optional(),
          shoesType: z.string().optional(),
          findings: z.string().optional(),
          workPerformed: z.string().optional(),
          nextDueDate: z.string().optional(),
          cost: z.number().optional(),
          notes: z.string().max(10000).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const { careDate, nextDueDate, ...rest } = input;
        const id = await db.createHoofcare({
          ...rest,
          userId: ctx.user.id,
          careDate: new Date(careDate),
          nextDueDate: nextDueDate ? new Date(nextDueDate) : undefined,
        });

        // Publish real-time event
        const { publishModuleEvent } = await import("./_core/realtime");
        const hoofcare = await db.getHoofcareById(id, ctx.user.id);
        if (hoofcare) {
          publishModuleEvent("hoofcare", "created", hoofcare, ctx.user.id);
        }

        // Audit log
        await db.createActivityLog({
          userId: ctx.user.id,
          action: "hoofcare_created",
          entityType: "hoofcare",
          entityId: id,
          details: `Created hoofcare record`,
        });

        return { id };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          careDate: z.string().optional(),
          careType: z
            .enum(["shoeing", "trimming", "remedial", "inspection", "other"])
            .optional(),
          farrierName: z.string().optional(),
          farrierPhone: z.string().optional(),
          hoofCondition: z
            .enum(["excellent", "good", "fair", "poor"])
            .optional(),
          shoesType: z.string().optional(),
          findings: z.string().optional(),
          workPerformed: z.string().optional(),
          nextDueDate: z.string().optional(),
          cost: z.number().optional(),
          notes: z.string().max(10000).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const { id, careDate, nextDueDate, ...data } = input;
        await db.updateHoofcare(id, ctx.user.id, {
          ...data,
          careDate: careDate ? new Date(careDate) : undefined,
          nextDueDate: nextDueDate ? new Date(nextDueDate) : undefined,
        });

        // Publish real-time event
        const { publishModuleEvent } = await import("./_core/realtime");
        const hoofcare = await db.getHoofcareById(id, ctx.user.id);
        if (hoofcare) {
          publishModuleEvent("hoofcare", "updated", hoofcare, ctx.user.id);
        }

        // Audit log
        await db.createActivityLog({
          userId: ctx.user.id,
          action: "hoofcare_updated",
          entityType: "hoofcare",
          entityId: id,
          details: `Updated hoofcare record`,
        });

        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteHoofcare(input.id, ctx.user.id);

        // Publish real-time event
        const { publishModuleEvent } = await import("./_core/realtime");
        publishModuleEvent(
          "hoofcare",
          "deleted",
          { id: input.id },
          ctx.user.id,
        );

        // Audit log
        await db.createActivityLog({
          userId: ctx.user.id,
          action: "hoofcare_deleted",
          entityType: "hoofcare",
          entityId: input.id,
          details: `Deleted hoofcare record`,
        });

        return { success: true };
      }),
  }),

  // ============ NUTRITION LOGS ROUTER ============
  nutritionLogs: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getNutritionLogsByUserId(ctx.user.id);
    }),

    listByHorse: protectedProcedure
      .input(z.object({ horseId: z.number() }))
      .query(async ({ ctx, input }) => {
        return await db.getNutritionLogsByHorseId(input.horseId, ctx.user.id);
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        return await db.getNutritionLogById(input.id, ctx.user.id);
      }),

    create: protectedProcedure
      .input(
        z.object({
          horseId: z.number(),
          logDate: z.string(), // ISO date string
          feedType: z.string().min(1).max(100),
          feedName: z.string().optional(),
          amount: z.string().optional(),
          mealTime: z.string().optional(),
          supplements: z.string().optional(),
          hay: z.string().optional(),
          water: z.string().optional(),
          bodyConditionScore: z.number().optional(),
          weight: z.number().optional(),
          notes: z.string().max(10000).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const { logDate, ...rest } = input;
        const id = await db.createNutritionLog({
          ...rest,
          userId: ctx.user.id,
          logDate: new Date(logDate),
        });

        // Publish real-time event
        const { publishModuleEvent } = await import("./_core/realtime");
        const log = await db.getNutritionLogById(id, ctx.user.id);
        if (log) {
          publishModuleEvent("nutritionLogs", "created", log, ctx.user.id);
        }

        // Audit log
        await db.createActivityLog({
          userId: ctx.user.id,
          action: "nutrition_log_created",
          entityType: "nutrition_log",
          entityId: id,
          details: `Created nutrition log`,
        });

        return { id };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          logDate: z.string().optional(),
          feedType: z.string().optional(),
          feedName: z.string().optional(),
          amount: z.string().optional(),
          mealTime: z.string().optional(),
          supplements: z.string().optional(),
          hay: z.string().optional(),
          water: z.string().optional(),
          bodyConditionScore: z.number().optional(),
          weight: z.number().optional(),
          notes: z.string().max(10000).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const { id, logDate, ...data } = input;
        await db.updateNutritionLog(id, ctx.user.id, {
          ...data,
          logDate: logDate ? new Date(logDate) : undefined,
        });

        // Publish real-time event
        const { publishModuleEvent } = await import("./_core/realtime");
        const log = await db.getNutritionLogById(id, ctx.user.id);
        if (log) {
          publishModuleEvent("nutritionLogs", "updated", log, ctx.user.id);
        }

        // Audit log
        await db.createActivityLog({
          userId: ctx.user.id,
          action: "nutrition_log_updated",
          entityType: "nutrition_log",
          entityId: id,
          details: `Updated nutrition log`,
        });

        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteNutritionLog(input.id, ctx.user.id);

        // Publish real-time event
        const { publishModuleEvent } = await import("./_core/realtime");
        publishModuleEvent(
          "nutritionLogs",
          "deleted",
          { id: input.id },
          ctx.user.id,
        );

        // Audit log
        await db.createActivityLog({
          userId: ctx.user.id,
          action: "nutrition_log_deleted",
          entityType: "nutrition_log",
          entityId: input.id,
          details: `Deleted nutrition log`,
        });

        return { success: true };
      }),
  }),

  // ============ NUTRITION PLANS ROUTER ============
  nutritionPlans: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getNutritionPlansByUserId(ctx.user.id);
    }),

    listByHorse: protectedProcedure
      .input(z.object({ horseId: z.number() }))
      .query(async ({ ctx, input }) => {
        return await db.getNutritionPlansByHorseId(input.horseId, ctx.user.id);
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        return await db.getNutritionPlanById(input.id, ctx.user.id);
      }),

    create: protectedProcedure
      .input(
        z.object({
          horseId: z.number(),
          planName: z.string().min(1).max(200),
          startDate: z.string(), // ISO date string
          endDate: z.string().optional(),
          targetWeight: z.number().optional(),
          targetBodyCondition: z.number().optional(),
          dailyHay: z.string().optional(),
          dailyConcentrates: z.string().optional(),
          supplements: z.string().optional(),
          specialInstructions: z.string().optional(),
          feedingSchedule: z.string().optional(),
          caloriesPerDay: z.number().optional(),
          proteinPerDay: z.string().optional(),
          isActive: z.boolean().optional(),
          notes: z.string().max(10000).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const { startDate, endDate, ...rest } = input;
        const id = await db.createNutritionPlan({
          ...rest,
          userId: ctx.user.id,
          startDate: new Date(startDate),
          endDate: endDate ? new Date(endDate) : undefined,
        });

        // Publish real-time event
        const { publishModuleEvent } = await import("./_core/realtime");
        const plan = await db.getNutritionPlanById(id, ctx.user.id);
        if (plan) {
          publishModuleEvent("nutritionPlans", "created", plan, ctx.user.id);
        }

        // Audit log
        await db.createActivityLog({
          userId: ctx.user.id,
          action: "nutrition_plan_created",
          entityType: "nutrition_plan",
          entityId: id,
          details: `Created nutrition plan: ${input.planName}`,
        });

        return { id };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          planName: z.string().optional(),
          startDate: z.string().optional(),
          endDate: z.string().optional(),
          targetWeight: z.number().optional(),
          targetBodyCondition: z.number().optional(),
          dailyHay: z.string().optional(),
          dailyConcentrates: z.string().optional(),
          supplements: z.string().optional(),
          specialInstructions: z.string().optional(),
          feedingSchedule: z.string().optional(),
          caloriesPerDay: z.number().optional(),
          proteinPerDay: z.string().optional(),
          isActive: z.boolean().optional(),
          notes: z.string().max(10000).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const { id, startDate, endDate, ...data } = input;
        await db.updateNutritionPlan(id, ctx.user.id, {
          ...data,
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
        });

        // Publish real-time event
        const { publishModuleEvent } = await import("./_core/realtime");
        const plan = await db.getNutritionPlanById(id, ctx.user.id);
        if (plan) {
          publishModuleEvent("nutritionPlans", "updated", plan, ctx.user.id);
        }

        // Audit log
        await db.createActivityLog({
          userId: ctx.user.id,
          action: "nutrition_plan_updated",
          entityType: "nutrition_plan",
          entityId: id,
          details: `Updated nutrition plan`,
        });

        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteNutritionPlan(input.id, ctx.user.id);

        // Publish real-time event
        const { publishModuleEvent } = await import("./_core/realtime");
        publishModuleEvent(
          "nutritionPlans",
          "deleted",
          { id: input.id },
          ctx.user.id,
        );

        // Audit log
        await db.createActivityLog({
          userId: ctx.user.id,
          action: "nutrition_plan_deleted",
          entityType: "nutrition_plan",
          entityId: input.id,
          details: `Deleted nutrition plan`,
        });

        return { success: true };
      }),
  }),

  // Feed Cost Tracking
  feedCosts: router({
    list: protectedProcedure
      .input(
        z
          .object({
            horseId: z.number().optional(),
          })
          .optional(),
      )
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) return [];

        const conditions = [eq(feedCosts.userId, ctx.user.id)];
        if (input?.horseId) {
          conditions.push(eq(feedCosts.horseId, input.horseId));
        }

        return db
          .select()
          .from(feedCosts)
          .where(and(...conditions))
          .orderBy(desc(feedCosts.purchaseDate));
      }),

    create: protectedProcedure
      .input(
        z.object({
          horseId: z.number().optional(),
          feedType: z.string().min(1),
          brandName: z.string().optional(),
          quantity: z.string().min(1),
          unit: z.string().optional(),
          costPerUnit: z.number().min(0),
          purchaseDate: z.string(),
          supplier: z.string().optional(),
          notes: z.string().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const [result] = await db.insert(feedCosts).values({
          userId: ctx.user.id,
          horseId: input.horseId ?? null,
          feedType: input.feedType,
          brandName: input.brandName ?? null,
          quantity: input.quantity,
          unit: input.unit ?? null,
          costPerUnit: input.costPerUnit,
          purchaseDate: new Date(input.purchaseDate),
          supplier: input.supplier ?? null,
          notes: input.notes ?? null,
        });

        const { publishModuleEvent } = await import("./_core/realtime");
        publishModuleEvent(
          "feedCosts",
          "created",
          { id: result.insertId, ...input },
          ctx.user.id,
        );

        return { id: result.insertId, success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        await db
          .delete(feedCosts)
          .where(
            and(eq(feedCosts.id, input.id), eq(feedCosts.userId, ctx.user.id)),
          );

        const { publishModuleEvent } = await import("./_core/realtime");
        publishModuleEvent(
          "feedCosts",
          "deleted",
          { id: input.id },
          ctx.user.id,
        );

        return { success: true };
      }),

    summary: protectedProcedure
      .input(
        z
          .object({
            horseId: z.number().optional(),
          })
          .optional(),
      )
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) return null;

        const conditions = [eq(feedCosts.userId, ctx.user.id)];
        if (input?.horseId) {
          conditions.push(eq(feedCosts.horseId, input.horseId));
        }

        const result = await db
          .select({
            totalSpent: sql<number>`COALESCE(SUM(costPerUnit), 0)`,
            recordCount: sql<number>`COUNT(*)`,
            avgCost: sql<number>`COALESCE(AVG(costPerUnit), 0)`,
          })
          .from(feedCosts)
          .where(and(...conditions));

        // Per-horse breakdown
        const perHorse = await db
          .select({
            horseId: feedCosts.horseId,
            totalSpent: sql<number>`COALESCE(SUM(costPerUnit), 0)`,
            recordCount: sql<number>`COUNT(*)`,
          })
          .from(feedCosts)
          .where(eq(feedCosts.userId, ctx.user.id))
          .groupBy(feedCosts.horseId);

        return {
          totalSpent: result[0]?.totalSpent || 0,
          recordCount: result[0]?.recordCount || 0,
          avgCost: result[0]?.avgCost || 0,
          perHorse,
        };
      }),
  }),

  // ────────────────────────────────────────────────────────────
  // Branded Shareable Links
  // ────────────────────────────────────────────────────────────
  sharing: router({
    create: subscribedProcedure
      .input(z.object({
        linkType: z.enum(["horse", "stable", "medical_passport"]),
        horseId: z.number().optional(),
        expiresInDays: z.number().min(1).max(90).default(30),
      }))
      .mutation(async ({ ctx, input }) => {
        const dbConn = await getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

        // Verify horse ownership if horse link
        if (input.horseId) {
          const horse = await db.getHorseById(input.horseId, ctx.user.id);
          if (!horse) throw new TRPCError({ code: "NOT_FOUND", message: "Horse not found" });
        }

        const token = nanoid(24);
        const expiresAt = new Date(Date.now() + input.expiresInDays * 86_400_000);

        await dbConn.insert(shareLinks).values({
          userId: ctx.user.id,
          horseId: input.horseId || null,
          linkType: input.linkType,
          token,
          isPublic: true,
          isActive: true,
          expiresAt,
        });

        return { token, expiresAt: expiresAt.toISOString() };
      }),

    list: subscribedProcedure.query(async ({ ctx }) => {
      const dbConn = await getDb();
      if (!dbConn) return [];

      return dbConn
        .select()
        .from(shareLinks)
        .where(and(eq(shareLinks.userId, ctx.user.id), eq(shareLinks.isActive, true)))
        .orderBy(desc(shareLinks.createdAt));
    }),

    revoke: subscribedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const dbConn = await getDb();
        if (!dbConn) return { success: false };

        await dbConn
          .update(shareLinks)
          .set({ isActive: false })
          .where(and(eq(shareLinks.id, input.id), eq(shareLinks.userId, ctx.user.id)));

        return { success: true };
      }),
  }),

  // ────────────────────────────────────────────────────────────
  // Horse Timeline — aggregates events across all data sources
  // ────────────────────────────────────────────────────────────
  timeline: router({
    getHorseTimeline: subscribedProcedure
      .input(z.object({ horseId: z.number(), limit: z.number().default(50) }))
      .query(async ({ ctx, input }) => {
        const dbConn = await getDb();
        if (!dbConn) return [];

        // Verify horse ownership
        const horse = await db.getHorseById(input.horseId, ctx.user.id);
        if (!horse) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Horse not found" });
        }

        type TimelineEvent = {
          id: string;
          date: string;
          type: string;
          category: "health" | "training" | "feeding" | "document" | "event" | "vaccination" | "treatment" | "appointment" | "note" | "competition";
          title: string;
          description?: string;
          status?: string;
        };

        const items: TimelineEvent[] = [];

        // Health records
        const healthRows = await dbConn
          .select({
            id: healthRecords.id,
            title: healthRecords.title,
            recordDate: healthRecords.recordDate,
            recordType: healthRecords.recordType,
            description: healthRecords.description,
          })
          .from(healthRecords)
          .where(and(eq(healthRecords.horseId, input.horseId), eq(healthRecords.userId, ctx.user.id)));
        for (const r of healthRows) {
          items.push({
            id: `health-${r.id}`,
            date: r.recordDate instanceof Date ? r.recordDate.toISOString() : String(r.recordDate),
            type: r.recordType || "health",
            category: "health",
            title: r.title || "Health Record",
            description: r.description || undefined,
          });
        }

        // Training sessions
        const trainingRows = await dbConn
          .select({
            id: trainingSessions.id,
            sessionDate: trainingSessions.sessionDate,
            sessionType: trainingSessions.sessionType,
            location: trainingSessions.location,
            isCompleted: trainingSessions.isCompleted,
          })
          .from(trainingSessions)
          .where(and(eq(trainingSessions.horseId, input.horseId), eq(trainingSessions.userId, ctx.user.id)));
        for (const s of trainingRows) {
          items.push({
            id: `training-${s.id}`,
            date: s.sessionDate instanceof Date ? s.sessionDate.toISOString() : String(s.sessionDate),
            type: s.sessionType || "training",
            category: "training",
            title: `${(s.sessionType || "Training").charAt(0).toUpperCase() + (s.sessionType || "training").slice(1)} Session`,
            description: s.location ? `at ${s.location}` : undefined,
            status: s.isCompleted ? "completed" : "scheduled",
          });
        }

        // Vaccinations
        const vaccRows = await dbConn
          .select({
            id: vaccinations.id,
            vaccineName: vaccinations.vaccineName,
            dateAdministered: vaccinations.dateAdministered,
            vetName: vaccinations.vetName,
          })
          .from(vaccinations)
          .where(and(eq(vaccinations.horseId, input.horseId), eq(vaccinations.userId, ctx.user.id)));
        for (const v of vaccRows) {
          items.push({
            id: `vacc-${v.id}`,
            date: v.dateAdministered instanceof Date ? v.dateAdministered.toISOString() : String(v.dateAdministered),
            type: "vaccination",
            category: "vaccination",
            title: v.vaccineName || "Vaccination",
            description: v.vetName ? `by ${v.vetName}` : undefined,
          });
        }

        // Treatments
        const treatmentRows = await dbConn
          .select({
            id: treatments.id,
            treatmentType: treatments.treatmentType,
            startDate: treatments.startDate,
            description: treatments.description,
          })
          .from(treatments)
          .where(and(eq(treatments.horseId, input.horseId), eq(treatments.userId, ctx.user.id)));
        for (const t of treatmentRows) {
          items.push({
            id: `treat-${t.id}`,
            date: t.startDate instanceof Date ? t.startDate.toISOString() : String(t.startDate),
            type: t.treatmentType || "treatment",
            category: "treatment",
            title: `${(t.treatmentType || "Treatment").charAt(0).toUpperCase() + (t.treatmentType || "treatment").slice(1)}`,
            description: t.description || undefined,
          });
        }

        // Appointments
        const apptRows = await dbConn
          .select({
            id: appointments.id,
            title: appointments.title,
            appointmentDate: appointments.appointmentDate,
            appointmentType: appointments.appointmentType,
            status: appointments.status,
          })
          .from(appointments)
          .where(and(eq(appointments.horseId, input.horseId), eq(appointments.userId, ctx.user.id)));
        for (const a of apptRows) {
          items.push({
            id: `appt-${a.id}`,
            date: a.appointmentDate instanceof Date ? a.appointmentDate.toISOString() : String(a.appointmentDate),
            type: a.appointmentType || "appointment",
            category: "appointment",
            title: a.title || "Appointment",
            status: a.status || undefined,
          });
        }

        // Documents
        const docRows = await dbConn
          .select({
            id: documents.id,
            fileName: documents.fileName,
            createdAt: documents.createdAt,
            category: documents.category,
          })
          .from(documents)
          .where(and(eq(documents.horseId, input.horseId), eq(documents.userId, ctx.user.id)));
        for (const d of docRows) {
          items.push({
            id: `doc-${d.id}`,
            date: d.createdAt instanceof Date ? d.createdAt.toISOString() : String(d.createdAt),
            type: d.category || "document",
            category: "document",
            title: d.fileName || "Document uploaded",
          });
        }

        // Notes
        const noteRows = await dbConn
          .select({
            id: notes.id,
            title: notes.title,
            createdAt: notes.createdAt,
          })
          .from(notes)
          .where(and(eq(notes.horseId, input.horseId), eq(notes.userId, ctx.user.id)));
        for (const n of noteRows) {
          items.push({
            id: `note-${n.id}`,
            date: n.createdAt instanceof Date ? n.createdAt.toISOString() : String(n.createdAt),
            type: "note",
            category: "note",
            title: n.title || "Note",
          });
        }

        // Competitions
        const compRows = await dbConn
          .select({
            id: competitions.id,
            competitionName: competitions.competitionName,
            date: competitions.date,
            discipline: competitions.discipline,
            placement: competitions.placement,
          })
          .from(competitions)
          .where(and(eq(competitions.horseId, input.horseId), eq(competitions.userId, ctx.user.id)));
        for (const c of compRows) {
          items.push({
            id: `comp-${c.id}`,
            date: c.date instanceof Date ? c.date.toISOString() : String(c.date),
            type: c.discipline || "competition",
            category: "competition",
            title: c.competitionName || "Competition",
            description: c.placement ? `Placed: ${c.placement}` : undefined,
          });
        }

        // Sort by date descending and limit
        items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return items.slice(0, input.limit);
      }),

    // Smart health alerts — vaccination/deworming/treatment due reminders
    getHealthAlerts: subscribedProcedure
      .input(z.object({ horseId: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        const dbConn = await getDb();
        if (!dbConn) return [];

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

        const alerts: HealthAlert[] = [];
        const now = new Date();
        const thirtyDaysFromNow = new Date(now.getTime() + 30 * 86_400_000);
        const sixtyDaysAgo = new Date(now.getTime() - 60 * 86_400_000);

        // Get user's horses
        const userHorses = input.horseId
          ? [await db.getHorseById(input.horseId, ctx.user.id)].filter(Boolean) as any[]
          : await db.getHorsesByUserId(ctx.user.id);

        for (const horse of userHorses) {
          if (!horse.isActive) continue;

          // Check vaccination due dates
          const vaccList = await dbConn
            .select({ id: vaccinations.id, vaccineName: vaccinations.vaccineName, nextDueDate: vaccinations.nextDueDate })
            .from(vaccinations)
            .where(and(eq(vaccinations.horseId, horse.id), eq(vaccinations.userId, ctx.user.id)));

          for (const v of vaccList) {
            if (v.nextDueDate) {
              const due = new Date(v.nextDueDate);
              const daysDue = Math.ceil((due.getTime() - now.getTime()) / 86_400_000);
              if (daysDue <= 30) {
                alerts.push({
                  id: `vacc-due-${v.id}`,
                  horseId: horse.id,
                  horseName: horse.name,
                  type: "vaccination_due",
                  severity: daysDue <= 0 ? "urgent" : daysDue <= 7 ? "warning" : "info",
                  title: `${v.vaccineName || "Vaccination"} ${daysDue <= 0 ? "overdue" : "due soon"} for ${horse.name}`,
                  dueDate: v.nextDueDate instanceof Date ? v.nextDueDate.toISOString() : String(v.nextDueDate),
                  daysDue,
                });
              }
            }
          }

          // Check deworming due dates
          const dewormList = await dbConn
            .select({ id: dewormings.id, productName: dewormings.productName, nextDueDate: dewormings.nextDueDate })
            .from(dewormings)
            .where(and(eq(dewormings.horseId, horse.id), eq(dewormings.userId, ctx.user.id)));

          for (const d of dewormList) {
            if (d.nextDueDate) {
              const due = new Date(d.nextDueDate);
              const daysDue = Math.ceil((due.getTime() - now.getTime()) / 86_400_000);
              if (daysDue <= 30) {
                alerts.push({
                  id: `deworm-due-${d.id}`,
                  horseId: horse.id,
                  horseName: horse.name,
                  type: "deworming_due",
                  severity: daysDue <= 0 ? "urgent" : daysDue <= 7 ? "warning" : "info",
                  title: `${d.productName || "Deworming"} ${daysDue <= 0 ? "overdue" : "due soon"} for ${horse.name}`,
                  dueDate: d.nextDueDate instanceof Date ? d.nextDueDate.toISOString() : String(d.nextDueDate),
                  daysDue,
                });
              }
            }
          }

          // Check for no recent health activity (60 days)
          const recentHealth = await dbConn
            .select({ count: sql<number>`COUNT(*)` })
            .from(healthRecords)
            .where(and(
              eq(healthRecords.horseId, horse.id),
              eq(healthRecords.userId, ctx.user.id),
              gte(healthRecords.recordDate, sixtyDaysAgo),
            ));
          if ((recentHealth[0]?.count || 0) === 0) {
            alerts.push({
              id: `no-health-${horse.id}`,
              horseId: horse.id,
              horseName: horse.name,
              type: "no_recent_health",
              severity: "info",
              title: `No recent health records for ${horse.name} (60+ days)`,
            });
          }

          // Upcoming appointments (next 7 days)
          const sevenDaysFromNow = new Date(now.getTime() + 7 * 86_400_000);
          const upcomingAppts = await dbConn
            .select({ id: appointments.id, title: appointments.title, appointmentDate: appointments.appointmentDate })
            .from(appointments)
            .where(and(
              eq(appointments.horseId, horse.id),
              eq(appointments.userId, ctx.user.id),
              gte(appointments.appointmentDate, now),
              lte(appointments.appointmentDate, sevenDaysFromNow),
            ));
          for (const a of upcomingAppts) {
            alerts.push({
              id: `appt-soon-${a.id}`,
              horseId: horse.id,
              horseName: horse.name,
              type: "appointment_upcoming",
              severity: "info",
              title: `${a.title || "Appointment"} coming up for ${horse.name}`,
              dueDate: a.appointmentDate instanceof Date ? a.appointmentDate.toISOString() : String(a.appointmentDate),
            });
          }
        }

        // Sort alerts: urgent first, then warning, then info
        const severityOrder = { urgent: 0, warning: 1, info: 2 };
        alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
        return alerts;
      }),
  }),

  // ── Marketing (public routes for unsubscribe + lead capture) ────────────
  growthEngine: router({
    getOverview: adminUnlockedProcedure
      .input(z.object({ tenantId: z.string().min(1).max(100).default("global") }))
      .query(async ({ input }) => {
        return getGrowthEngineOverview(input.tenantId);
      }),

    getAdminData: adminUnlockedProcedure
      .input(z.object({ tenantId: z.string().min(1).max(100).default("global") }))
      .query(async ({ input }) => {
        return getGrowthEngineAdminData(input.tenantId);
      }),

    getQuickstartTemplates: protectedProcedure.query(async () => {
      return QUICKSTART_TEMPLATES;
    }),

    upsertCrmContact: protectedProcedure
      .input(
        z.object({
          email: z.string().email(),
          tenantId: z.string().min(1).max(100).default("global"),
          tenantType: z.string().min(1).max(50).default("individual"),
          contactType: z.string().min(1).max(50).default("individual"),
          source: z.string().min(1).max(100).default("manual"),
          name: z.string().max(200).nullable().optional(),
          organizationName: z.string().max(300).nullable().optional(),
          status: z.string().max(30).optional(),
          lifecycleTags: z.array(z.string().max(50)).optional(),
          onboardingStatus: z.string().max(30).optional(),
          referralCode: z.string().max(80).nullable().optional(),
          engagementScore: z.number().min(0).max(100).optional(),
          metadata: z.record(z.string(), z.unknown()).optional(),
        }),
      )
      .mutation(async ({ input }) => {
        return saveCrmContact(input);
      }),

    updateSocialConnection: adminUnlockedProcedure
      .input(
        z.object({
          tenantId: z.string().min(1).max(100),
          platform: z.enum(SOCIAL_PLATFORMS),
          state: z.enum(SOCIAL_CONNECTION_STATES),
          encryptedAccessToken: z.string().nullable().optional(),
          encryptedRefreshToken: z.string().nullable().optional(),
          expiresAtIso: z.string().datetime().nullable().optional(),
          metadata: z.record(z.string(), z.unknown()).optional(),
        }),
      )
      .mutation(async ({ input }) => {
        return connectSocialPlatform({
          tenantId: input.tenantId,
          platform: input.platform,
          state: input.state,
          encryptedAccessToken: encryptGrowthSecret(input.encryptedAccessToken),
          encryptedRefreshToken: encryptGrowthSecret(input.encryptedRefreshToken),
          expiresAt: input.expiresAtIso ? new Date(input.expiresAtIso) : null,
          metadata: input.metadata,
        });
      }),

    upsertOnboardingFlow: protectedProcedure
      .input(
        z.object({
          tenantId: z.string().min(1).max(100).default("global"),
          onboardingType: z.enum(ONBOARDING_TYPES),
          status: z.enum(["not_started", "in_progress", "completed", "skipped"]),
          step: z.number().min(1).max(20).default(1),
          progressPercent: z.number().min(0).max(100).default(0),
          checklist: z.record(z.string(), z.boolean()).default({}),
          quickWins: z.array(z.string()).default([]),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        return startOnboardingFlow({
          userId: ctx.user.id,
          tenantId: input.tenantId,
          onboardingType: input.onboardingType,
          status: input.status,
          step: input.step,
          progressPercent: input.progressPercent,
          checklist: input.checklist,
          quickWins: input.quickWins,
        });
      }),

    runLifecycleAutomation: adminUnlockedProcedure
      .input(
        z.object({
          tenantId: z.string().min(1).max(100),
          contactId: z.number().optional(),
          workflowKey: z.string().min(1).max(120),
          runStatus: z.enum(["queued", "processing", "completed", "failed", "needs_approval"]),
          triggerSource: z.string().min(1).max(60),
          triggerEvent: z.string().min(1).max(80),
          payload: z.record(z.string(), z.unknown()).optional(),
          outcome: z.record(z.string(), z.unknown()).optional(),
        }),
      )
      .mutation(async ({ input }) => {
        return createLifecycleRun({
          tenantId: input.tenantId,
          contactId: input.contactId,
          workflowKey: input.workflowKey,
          runStatus: input.runStatus,
          triggerSource: input.triggerSource,
          triggerEvent: input.triggerEvent,
          payload: input.payload,
          outcome: input.outcome,
        });
      }),

    createReferralInvite: protectedProcedure
      .input(
        z.object({
          tenantId: z.string().min(1).max(100).default("global"),
          inviteeEmail: z.string().email().nullable().optional(),
          referralType: z.enum(["stable", "school", "academy", "yard", "general"]),
          source: z.string().min(1).max(80).default("share_with_your_yard"),
          metadata: z.record(z.string(), z.unknown()).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const code = `ref_${nanoid(10)}`;
        return createReferralInvite({
          tenantId: input.tenantId,
          inviterUserId: ctx.user.id,
          inviteeEmail: input.inviteeEmail ?? null,
          referralType: input.referralType,
          source: input.source,
          code,
          metadata: input.metadata,
        });
      }),

    trackFunnelEvent: publicProcedure
      .input(
        z.object({
          tenantId: z.string().min(1).max(100).default("global"),
          actorUserId: z.number().optional(),
          eventType: z.string().min(1).max(100),
          stage: z.string().min(1).max(80),
          source: z.string().max(80).optional(),
          metadata: z.record(z.string(), z.unknown()).optional(),
        }),
      )
      .mutation(async ({ input }) => {
        return trackGrowthFunnelEvent(input);
      }),

    submitFeedback: protectedProcedure
      .input(
        z.object({
          tenantId: z.string().min(1).max(100).default("global"),
          feedbackType: z.enum([
            "feedback",
            "bug",
            "feature_request",
            "onboarding_feedback",
            "support",
            "nps",
          ]),
          title: z.string().min(1).max(240),
          description: z.string().min(1).max(10000),
          satisfactionScore: z.number().min(0).max(10).nullable().optional(),
          metadata: z.record(z.string(), z.unknown()).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        return submitGrowthFeedback({
          tenantId: input.tenantId,
          userId: ctx.user.id,
          feedbackType: input.feedbackType,
          title: input.title,
          description: input.description,
          satisfactionScore: input.satisfactionScore ?? null,
          metadata: input.metadata,
        });
      }),
  }),

  marketing: router({
    unsubscribe: publicProcedure
      .input(z.object({ token: z.string().min(1) }))
      .mutation(async ({ input }) => {
        const dbConn = await getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        // Look up contact by unsubscribe token
        const [contact] = await dbConn.select().from(marketingContacts)
          .where(eq(marketingContacts.unsubscribeToken, input.token));

        if (!contact) {
          // Token not found — might be invalid or already processed
          return { success: true, message: "You have been unsubscribed." };
        }

        // Mark contact as unsubscribed
        await dbConn.update(marketingContacts)
          .set({ status: "unsubscribed" })
          .where(eq(marketingContacts.id, contact.id));

        // Add to global suppression list (prevents re-adding)
        const [existing] = await dbConn.select().from(emailUnsubscribes)
          .where(eq(emailUnsubscribes.email, contact.email.toLowerCase()));
        if (!existing) {
          await dbConn.insert(emailUnsubscribes).values({
            email: contact.email.toLowerCase(),
            token: input.token,
            reason: "User clicked unsubscribe link",
            source: "link",
          });
        }

        return { success: true, message: "You have been unsubscribed. You will no longer receive marketing emails from EquiProfile." };
      }),

    captureLead: publicProcedure
      .input(z.object({
        email: z.string().email(),
        name: z.string().optional(),
        source: z.string().default("website"),
      }))
      .mutation(async ({ input }) => {
        const dbConn = await getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const email = input.email.trim().toLowerCase();

        // Reject invalid or disposable emails
        if (!isValidEmail(email) || isDisposableEmail(email)) {
          return { success: true }; // silently reject, don't disclose validation rules
        }

        // Check suppression
        const [suppressed] = await dbConn.select().from(emailUnsubscribes)
          .where(eq(emailUnsubscribes.email, email));
        if (suppressed) return { success: true }; // silently accept, don't add

        // Check existing
        const [existing] = await dbConn.select().from(marketingContacts)
          .where(eq(marketingContacts.email, email));
        if (existing) return { success: true }; // already in system

        await dbConn.insert(marketingContacts).values({
          email,
          name: input.name || null,
          source: input.source,
          contactType: "individual",
          unsubscribeToken: nanoid(32),
        });
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
