import { buildBeastModeBrief } from "./beastModeBriefBuilder";
import { buildBeastModeStudioPlan, planBeastModeBatchRenders } from "./beastModeBatchRenderPlanner";
import { localizeBeastModeVariant } from "./beastModeMultilingualService";
import { generateBeastModeVariants } from "./beastModeVariantPlanner";
import type { BeastModeBuildInput, BeastModeRunRecord, BeastModeVariantRecord } from "./beastModeTypes";

export * from "./beastModeExecutionService";
export * from "./beastModeTypes";
export * from "./beastModeBriefBuilder";
export * from "./beastModeVariantPlanner";
export * from "./beastModeCopyGenerator";
export * from "./beastModeMultilingualService";
export * from "./beastModeBatchRenderPlanner";
export * from "./beastModeModelRouter";
export * from "./beastModeCostPolicy";
export * from "./beastModeQualityRules";
export * from "./beastModeStore";

export async function createBeastModeGeneration(input: BeastModeBuildInput) {
  const brief = buildBeastModeBrief(input);
  const generated = await generateBeastModeVariants(brief);
  const localized = generated.variants.map((variant) =>
    variant.language === "English"
      ? { ...variant, studioPlan: variant.studioPlan ?? buildBeastModeStudioPlan({ brief, variant }) }
      : localizeBeastModeVariant({ variant, language: variant.language, protectedTerms: [brief.brandSummary.brandName, brief.brandSummary.domain, brief.primaryCta], brief }),
  );
  return { brief, plan: generated.plan, variants: localized };
}

export function buildBeastModeExportPack(input: {
  run: BeastModeRunRecord;
  variants: BeastModeVariantRecord[];
  brandSummary: Record<string, unknown>;
}) {
  const grouped = input.variants.reduce<Record<string, Record<string, BeastModeVariantRecord[]>>>((acc, variant) => {
    const platformGroup = acc[variant.platform] ?? {};
    const languageGroup = platformGroup[variant.language] ?? [];
    languageGroup.push(variant);
    platformGroup[variant.language] = languageGroup;
    acc[variant.platform] = platformGroup;
    return acc;
  }, {});
  const routingSummary = input.variants.reduce<Record<string, unknown[]>>((acc, variant) => {
    const routes = (variant.metadata.routing ?? {}) as Record<string, unknown>;
    acc[variant.platform] = [...(acc[variant.platform] ?? []), routes];
    return acc;
  }, {});
  const markdown = [
    `# Beast Mode Pack — ${input.run.name}`,
    "",
    `- Goal: ${input.run.goal}`,
    `- Audience: ${input.run.audience}`,
    `- Mode: ${input.run.mode}`,
    `- Review gated: yes`,
    "",
    "## Brand summary",
    JSON.stringify(input.brandSummary, null, 2),
    "",
    "## Model routing summary",
    JSON.stringify(routingSummary, null, 2),
    "",
    "## Variants",
    ...input.variants.map((variant) => `### ${variant.platform} / ${variant.language}\n- Hook: ${variant.hook}\n- CTA: ${variant.cta}\n- Review: ${variant.reviewStatus}\n- Export: ${variant.exportStatus}\n- Copy: ${variant.body}`),
    "",
    "## Manual posting instructions",
    "Review approval state before manual export or scheduling.",
  ].join("\n");
  return {
    run: input.run,
    brandSummary: input.brandSummary,
    mode: input.run.mode,
    modelRoutingSummary: routingSummary,
    variantsByPlatformLanguage: grouped,
    reviewStatuses: input.variants.map((variant) => ({ id: variant.id, reviewStatus: variant.reviewStatus, exportStatus: variant.exportStatus })),
    qaChecklistSummaries: input.variants.map((variant) => ({ id: variant.id, issues: Array.isArray((variant.metadata as Record<string, unknown>).validationIssues) ? (variant.metadata as Record<string, unknown>).validationIssues : [] })),
    manualPostingInstructions: ["Review each variant", "Export only approved items", "Use schedule export or media factory render links manually"],
    markdown,
  };
}

export function summarizeBeastModeRun(input: { variants: BeastModeVariantRecord[] }) {
  return {
    totalVariants: input.variants.length,
    byPlatform: input.variants.reduce<Record<string, number>>((acc, variant) => ({ ...acc, [variant.platform]: (acc[variant.platform] ?? 0) + 1 }), {}),
    byLanguage: input.variants.reduce<Record<string, number>>((acc, variant) => ({ ...acc, [variant.language]: (acc[variant.language] ?? 0) + 1 }), {}),
    reviewStatusCounts: input.variants.reduce<Record<string, number>>((acc, variant) => ({ ...acc, [variant.reviewStatus]: (acc[variant.reviewStatus] ?? 0) + 1 }), {}),
  };
}

export { planBeastModeBatchRenders };
