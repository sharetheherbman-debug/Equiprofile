import { buildBeastModeStudioPlan } from "./beastModeBatchRenderPlanner";
import { generateBeastModeCopy } from "./beastModeCopyGenerator";
import { routeBeastModeModel } from "./beastModeModelRouter";
import { validateBeastModeVariant } from "./beastModeQualityRules";
import type { BeastModeBrief, BeastModeLanguage, BeastModeRunPlan, BeastModeRunPlanItem, BeastModeVariantContentType, BeastModeVariantDraft } from "./beastModeTypes";
import type { CampaignPlatform } from "../campaign-engine";

const PLATFORM_TYPES: Record<string, BeastModeVariantContentType[]> = {
  Facebook: ["facebook_ad"],
  Instagram: ["instagram_reel"],
  TikTok: ["tiktok_script"],
  LinkedIn: ["linkedin_post"],
  YouTube: ["youtube_short", "youtube_3min_outline"],
  Email: ["email_sequence"],
  "Blog / SEO": ["blog_seo_outline"],
};

function buildDistribution(brief: BeastModeBrief): BeastModeRunPlanItem[] {
  const platforms = brief.requestedPlatforms.length ? brief.requestedPlatforms : ["Facebook"];
  const languages = brief.requestedLanguages.length ? brief.requestedLanguages : ["English"];
  return Array.from({ length: brief.requestedVariantCount }, (_, index) => {
    const platform = platforms[index % platforms.length] as CampaignPlatform;
    const types = PLATFORM_TYPES[platform] ?? ["facebook_ad"];
    const language = languages[index % languages.length] as BeastModeLanguage;
    return {
      platform,
      contentType: types[index % types.length],
      language,
      variantIndex: index,
    };
  });
}

export function buildBeastModeRunPlan(brief: BeastModeBrief): BeastModeRunPlan {
  const distribution = buildDistribution(brief);
  return {
    distribution,
    batchRenderLimit: 5,
    batchRenderRequested: false,
    routingSummary: {
      copywriting: routeBeastModeModel({ task: "copywriting", mode: brief.mode }),
      hook_generation: routeBeastModeModel({ task: "hook_generation", mode: brief.mode }),
      translation: routeBeastModeModel({ task: "translation", mode: brief.mode }),
      scene_planning: routeBeastModeModel({ task: "scene_planning", mode: brief.mode, qualityTarget: brief.mode === "elite" ? "premium" : "balanced" }),
    },
  };
}

export function generateBeastModeVariants(brief: BeastModeBrief): { plan: BeastModeRunPlan; variants: BeastModeVariantDraft[] } {
  const plan = buildBeastModeRunPlan(brief);
  const variants = plan.distribution.map((entry) => {
    const copy = generateBeastModeCopy({
      brief,
      platform: entry.platform,
      contentType: entry.contentType,
      language: entry.language,
      variantIndex: entry.variantIndex,
    });
    const base: BeastModeVariantDraft = {
      platform: entry.platform,
      contentType: entry.contentType,
      language: entry.language,
      angle: copy.angle,
      hook: copy.hook,
      body: copy.body,
      cta: copy.cta,
      hashtags: copy.hashtags,
      visualPrompt: copy.visualPrompt,
      studioPlan: null,
      metadata: {
        routing: {
          copywriting: plan.routingSummary.copywriting,
          hook_generation: plan.routingSummary.hook_generation,
        },
      },
    };
    const studioPlan = buildBeastModeStudioPlan({ brief, variant: base });
    const withPlan = {
      ...base,
      studioPlan,
      metadata: {
        ...base.metadata,
        studioPlanStatus: studioPlan ? "planned" : "not_applicable",
        validationIssues: [],
      },
    };
    return {
      ...withPlan,
      metadata: {
        ...withPlan.metadata,
        validationIssues: validateBeastModeVariant(withPlan),
      },
    };
  });
  return { plan, variants };
}
