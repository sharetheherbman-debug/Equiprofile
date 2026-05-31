import { buildBeastModeStudioPlan } from "./beastModeBatchRenderPlanner";
import { buildModelBackedVariantDraft } from "./beastModeExecutionService";
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

export async function generateBeastModeVariants(brief: BeastModeBrief): Promise<{ plan: BeastModeRunPlan; variants: BeastModeVariantDraft[] }> {
  const plan = buildBeastModeRunPlan(brief);

  const variants = await Promise.all(
    plan.distribution.map(async (entry) => {
      const result = await buildModelBackedVariantDraft({
        brief,
        platform: entry.platform,
        contentType: entry.contentType,
        language: entry.language,
        variantIndex: entry.variantIndex,
      });

      const studioPlan = buildBeastModeStudioPlan({ brief, variant: result });
      const withPlan = {
        ...result,
        studioPlan,
        metadata: {
          ...result.metadata,
          studioPlanStatus: studioPlan ? "planned" : "not_applicable",
          validationIssues: [],
          reviewStatus: "needs_review",
        },
      };
      return {
        ...withPlan,
        metadata: {
          ...withPlan.metadata,
          validationIssues: validateBeastModeVariant(withPlan),
        },
      };
    }),
  );
  return { plan, variants };
}
