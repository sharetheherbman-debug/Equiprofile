import type { AITask } from "../ai/types";

export type PromptCompileInput = {
  task: Extract<AITask, "text_to_video" | "image_to_video" | "avatar_video" | "text_to_image" | "image_edit" | "text_to_speech">;
  userPrompt: string;
  platform?: string;
  quality?: "standard" | "elite" | "fast" | "cinematic" | "avatar";
  requestedDurationSeconds?: number;
  promptControls?: Array<"more_cinematic" | "more_realistic" | "more_premium" | "no_people" | "horse_showcase" | "product_demo" | "stable_owner_focus">;
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
  appliedControls: string[];
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
  const allowed = [5, 10, 15, 30, 60, 180];
  if (!input || !Number.isFinite(input)) return 5;
  const target = Math.round(input);
  for (const candidate of allowed) {
    if (target <= candidate) return candidate;
  }
  return 180;
}

function controlDirectives(controls?: PromptCompileInput["promptControls"]) {
  const active = new Set(controls ?? []);
  const applied: string[] = [];
  const directives: string[] = [];
  if (active.has("more_cinematic")) {
    applied.push("more_cinematic");
    directives.push("cinematic camera language, dramatic but natural light transitions");
  }
  if (active.has("more_realistic")) {
    applied.push("more_realistic");
    directives.push("photorealistic natural movement, authentic equestrian environment details");
  }
  if (active.has("more_premium")) {
    applied.push("more_premium");
    directives.push("premium commercial polish, clean composition, luxury-grade color treatment");
  }
  if (active.has("no_people")) {
    applied.push("no_people");
    directives.push("no humans in frame, horse-focused footage only");
  }
  if (active.has("horse_showcase")) {
    applied.push("horse_showcase");
    directives.push("prioritize horse motion, coat detail, and stable ambience");
  }
  if (active.has("product_demo")) {
    applied.push("product_demo");
    directives.push("show product-use context in scene actions without on-screen UI text");
  }
  if (active.has("stable_owner_focus")) {
    applied.push("stable_owner_focus");
    directives.push("story focus on stable owner outcomes and daily operations");
  }
  return { applied, directives };
}

export function compileMarketingPrompt(input: PromptCompileInput): PromptCompileOutput {
  const subject = extractSubject(input.userPrompt);
  const intent = inferIntent(input.userPrompt);
  const durationSeconds = safeDuration(input.requestedDurationSeconds);
  const shotPlan = shotPlanForIntent(intent);
  const styleProfile = styleFromQuality(input.quality);
  const brandContext = input.brandName ? `${input.brandName} brand-safe tone` : "EquiProfile brand-safe tone";
  const controls = controlDirectives(input.promptControls);

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
    appliedControls: controls.applied,
    prompt: [
      `${styleProfile} footage of ${subject}.`,
      `Intent: ${intent}.`,
      `Platform context: ${input.platform ?? "general social"}.`,
      `Duration target: ${durationSeconds}s.`,
      `Brand context: ${brandContext}.`,
      `Shot plan: ${shotPlan.join("; ")}.`,
      controls.directives.length ? `Control directives: ${controls.directives.join("; ")}.` : "",
      TEXT_GUARDRAIL,
    ].join(" "),
    negativePrompt: [...NEGATIVE_BASE, "no deformed anatomy", "no low-quality artifacts"].join(", "),
    rules: {
      noTextInFootage: true,
      postProcessBrandingRequired: true,
    },
  };
}
