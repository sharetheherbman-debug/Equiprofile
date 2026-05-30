import type { BeastModeLanguage, BeastModeVariantDraft } from "./beastModeTypes";

const CTA_TRANSLATIONS: Record<Exclude<BeastModeLanguage, "English">, Record<string, string>> = {
  Afrikaans: { "Sign up today": "Teken vandag in", "Get started": "Begin nou", "Learn more": "Leer meer" },
  Zulu: { "Sign up today": "Bhalisa namuhla", "Get started": "Qala manje", "Learn more": "Funda kabanzi" },
  French: { "Sign up today": "Inscrivez-vous aujourd'hui", "Get started": "Commencer", "Learn more": "En savoir plus" },
  Spanish: { "Sign up today": "Regístrate hoy", "Get started": "Empezar", "Learn more": "Más información" },
  German: { "Sign up today": "Heute registrieren", "Get started": "Jetzt starten", "Learn more": "Mehr erfahren" },
  Portuguese: { "Sign up today": "Registe-se hoje", "Get started": "Começar", "Learn more": "Saber mais" },
};

function preserveProtectedTerms(text: string, protectedTerms: string[]) {
  return protectedTerms.reduce((acc, term) => acc.replace(new RegExp(term, "g"), term), text);
}

function translateCta(cta: string, language: BeastModeLanguage) {
  if (language === "English") return cta;
  return CTA_TRANSLATIONS[language][cta] ?? cta;
}

export function localizeBeastModeVariant(input: {
  variant: BeastModeVariantDraft;
  language: BeastModeLanguage;
  protectedTerms: string[];
}): BeastModeVariantDraft {
  if (input.language === "English") return input.variant;
  return {
    ...input.variant,
    language: input.language,
    hook: preserveProtectedTerms(`[${input.language}] ${input.variant.hook}`, input.protectedTerms),
    body: preserveProtectedTerms(`[${input.language}] ${input.variant.body}`, input.protectedTerms),
    cta: translateCta(input.variant.cta, input.language),
    metadata: {
      ...input.variant.metadata,
      localizedFrom: input.variant.language,
      localizationStatus: "needs_review",
    },
  };
}
