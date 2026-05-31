import { executeMarketingModelTask } from "../model-execution";
import type { BeastModeBrief, BeastModeLanguage, BeastModeVariantDraft } from "./beastModeTypes";

const CTA_TRANSLATIONS: Record<Exclude<BeastModeLanguage, "English">, Record<string, string>> = {
  Afrikaans: { "Sign up today": "Teken vandag in", "Get started": "Begin nou", "Learn more": "Leer meer" },
  Zulu: { "Sign up today": "Bhalisa namuhla", "Get started": "Qala manje", "Learn more": "Funda kabanzi" },
  French: { "Sign up today": "Inscrivez-vous aujourd'hui", "Get started": "Commencer", "Learn more": "En savoir plus" },
  Spanish: { "Sign up today": "Regístrate hoy", "Get started": "Empezar", "Learn more": "Más información" },
  German: { "Sign up today": "Heute registrieren", "Get started": "Jetzt starten", "Learn more": "Mehr erfahren" },
  Portuguese: { "Sign up today": "Registe-se hoje", "Get started": "Começar", "Learn more": "Saber mais" },
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function protectTerms(text: string, protectedTerms: string[]) {
  const placeholders = new Map<string, string>();
  let nextText = text;
  protectedTerms.filter(Boolean).forEach((term, index) => {
    const token = `__BEAST_MODE_PROTECTED_${index}__`;
    placeholders.set(token, term);
    nextText = nextText.replace(new RegExp(escapeRegExp(term), "g"), token);
  });
  return { text: nextText, placeholders };
}

function restoreTerms(text: string, placeholders: Map<string, string>) {
  let nextText = text;
  placeholders.forEach((term, token) => {
    nextText = nextText.replace(new RegExp(escapeRegExp(token), "g"), term);
  });
  return nextText;
}

function translateCta(cta: string, language: BeastModeLanguage) {
  if (language === "English") return cta;
  return CTA_TRANSLATIONS[language][cta] ?? cta;
}

function asString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function containsAllProtectedTerms(text: string, protectedTerms: string[]) {
  const haystack = text.toLowerCase();
  return protectedTerms.filter(Boolean).every((term) => haystack.includes(term.toLowerCase()));
}

export async function localizeBeastModeVariant(input: {
  variant: BeastModeVariantDraft;
  language: BeastModeLanguage;
  protectedTerms: string[];
  brief?: BeastModeBrief;
}): Promise<BeastModeVariantDraft> {
  if (input.language === "English") return input.variant;

  const protectedHook = protectTerms(input.variant.hook, input.protectedTerms);
  const protectedBody = protectTerms(input.variant.body, input.protectedTerms);

  const localization = await executeMarketingModelTask({
    tenantId: input.brief?.tenantId ?? "global",
    workspaceId: input.brief?.workspaceId ?? "default",
    hostAppId: input.brief?.hostAppId ?? "equiprofile",
    mode: input.brief?.mode ?? "standard",
    task: "localization",
    brandKit: input.brief?.brandSummary ?? {},
    campaignBrief: {
      campaignName: input.brief?.campaignName ?? "",
      goal: input.brief?.goal ?? "",
      audience: input.brief?.audience ?? "",
      offer: input.brief?.offer ?? "",
      primaryCta: input.brief?.primaryCta ?? input.variant.cta,
    },
    language: input.language,
    originalPrompt: `${protectedHook.text}\n${protectedBody.text}`,
    constraints: [
      `Keep protected terms unchanged: ${input.protectedTerms.join(", ")}`,
      "Return localized hook/body/cta JSON.",
    ],
  });

  const candidateHook = asString(localization.output.hook, `[${input.language}] ${protectedHook.text}`);
  const candidateBody = asString(localization.output.body, `[${input.language}] ${protectedBody.text}`);
  const localizedHook = restoreTerms(
    containsAllProtectedTerms(candidateHook, input.protectedTerms) ? candidateHook : `[${input.language}] ${protectedHook.text}`,
    protectedHook.placeholders,
  );
  const localizedBody = restoreTerms(
    containsAllProtectedTerms(candidateBody, input.protectedTerms) ? candidateBody : `[${input.language}] ${protectedBody.text}`,
    protectedBody.placeholders,
  );
  const localizedCta = restoreTerms(
    asString(localization.output.cta, translateCta(input.variant.cta, input.language)),
    new Map([...protectedHook.placeholders, ...protectedBody.placeholders]),
  );

  return {
    ...input.variant,
    language: input.language,
    hook: localizedHook,
    body: localizedBody,
    cta: localizedCta,
    metadata: {
      ...input.variant.metadata,
      localizedFrom: input.variant.language,
      localizationStatus: localization.status === "completed" ? "needs_review" : "fallback_needs_review",
      localizationProvider: localization.provider,
      localizationModel: localization.model,
      localizationRouteReason: localization.routeReason,
      protectedTermsApplied: [...input.protectedTerms],
      fallbackReason: localization.fallbackReason,
      reviewStatus: "needs_review",
    },
  };
}
