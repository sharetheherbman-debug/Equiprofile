import type { BeastModeLanguage, BeastModeVariantDraft } from "./beastModeTypes";

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

export function localizeBeastModeVariant(input: {
  variant: BeastModeVariantDraft;
  language: BeastModeLanguage;
  protectedTerms: string[];
}): BeastModeVariantDraft {
  if (input.language === "English") return input.variant;
  const protectedHook = protectTerms(input.variant.hook, input.protectedTerms);
  const protectedBody = protectTerms(input.variant.body, input.protectedTerms);
  return {
    ...input.variant,
    language: input.language,
    hook: restoreTerms(`[${input.language}] ${protectedHook.text}`, protectedHook.placeholders),
    body: restoreTerms(`[${input.language}] ${protectedBody.text}`, protectedBody.placeholders),
    cta: translateCta(input.variant.cta, input.language),
    metadata: {
      ...input.variant.metadata,
      localizedFrom: input.variant.language,
      localizationStatus: "needs_review",
    },
  };
}
