import type { AITask } from "../ai/types";

export type PromptCompileInput = {
  task: Extract<AITask, "text_to_video" | "image_to_video" | "avatar_video" | "text_to_image" | "image_edit" | "text_to_speech">;
  userPrompt: string;
  platform?: string;
  quality?: "standard" | "elite" | "fast" | "cinematic" | "avatar";
  requestedDurationSeconds?: number;
  brandName?: string;
};

export type PromptCompileOutput = {
  task: PromptCompileInput["task"];
  modelHint: string;
  durationSeconds?: number;
  intent: string;
  subject: string;
  styleProfile: string;
  shotPlan: string[];
  prompt: string;
  negativePrompt: string;
  rules: {
    noTextInFootage: true;
    postProcessBrandingRequired: true;
  };
};

const VAGUE_PROMPTS = new Set([
  "video",
  "make a video",
  "create video",
  "ad",
  "marketing",
  "something cool",
]);

const TEXT_GUARDRAIL = "no text, no logos, no watermark, no readable letters, no UI labels";
const NEGATIVE_BASE = [
  "no written words",
  "no reversed text",
  "no fake logo",
  "no watermark",
  "no UI",
  "no distorted lettering",
];

function normalizePrompt(prompt: string) {
  return prompt.trim().replace(/\s+/g, " ");
}

function extractSubject(userPrompt: string) {
  const normalized = normalizePrompt(userPrompt);
  if (!normalized) return "premium equestrian lifestyle scene";
  if (normalized.length < 15 || VAGUE_PROMPTS.has(normalized.toLowerCase())) return "premium equestrian lifestyle scene";
  return normalized;
}

function inferIntent(prompt: string) {
  const lower = prompt.toLowerCase();
  if (/\b(youtube|long-form|3 minute|3-minute|60s|30s)\b/.test(lower)) return "long_form_storytelling";
  if (/\b(tiktok|reel|short|clip)\b/.test(lower)) return "short_form_engagement";
  if (/\b(ad|campaign|promo|launch|cta)\b/.test(lower)) return "conversion_marketing";
  return "brand_awareness";
}

function styleFromQuality(quality: PromptCompileInput["quality"]) {
  if (quality === "cinematic" || quality === "elite") return "cinematic realistic premium commercial";
  if (quality === "fast") return "clean realistic social-ready footage";
  if (quality === "avatar") return "stable framing presenter-ready footage";
  return "realistic premium footage";
}

function shotPlanForIntent(intent: string) {
  if (intent === "short_form_engagement") {
    return [
      "Hook shot with kinetic movement",
      "Hero subject close-up",
      "Context establishing shot",
    ];
  }
  if (intent === "conversion_marketing") {
    return [
      "Problem visual setup",
      "Benefit reveal shot",
      "Confidence-building lifestyle shot",
    ];
  }
  return [
    "Establishing cinematic shot",
    "Subject-focused motion shot",
    "Natural finish shot",
  ];
}

function safeDuration(input?: number) {
  if (!input || !Number.isFinite(input)) return 5;
  if (input <= 5) return 5;
  if (input <= 10) return 10;
  return 15;
}

export function compileMarketingPrompt(input: PromptCompileInput): PromptCompileOutput {
  const subject = extractSubject(input.userPrompt);
  const intent = inferIntent(input.userPrompt);
  const durationSeconds = safeDuration(input.requestedDurationSeconds);
  const shotPlan = shotPlanForIntent(intent);
  const styleProfile = styleFromQuality(input.quality);
  const brandContext = input.brandName ? `${input.brandName} brand-safe tone` : "EquiProfile brand-safe tone";

  return {
    task: input.task,
    modelHint: input.task === "text_to_image" || input.task === "image_edit"
      ? "gpt-image-2"
      : input.task === "text_to_speech"
        ? "grok-tts"
        : "kling-v2.5-turbo",
    durationSeconds,
    intent,
    subject,
    styleProfile,
    shotPlan,
    prompt: [
      `${styleProfile} footage of ${subject}.`,
      `Intent: ${intent}.`,
      `Platform context: ${input.platform ?? "general social"}.`,
      `Brand context: ${brandContext}.`,
      `Shot plan: ${shotPlan.join("; ")}.`,
      TEXT_GUARDRAIL,
    ].join(" "),
    negativePrompt: [...NEGATIVE_BASE, "no deformed anatomy", "no low-quality artifacts"].join(", "),
    rules: {
      noTextInFootage: true,
      postProcessBrandingRequired: true,
    },
  };
}
