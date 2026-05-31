import type { VisualQaIssue } from "./visualQaTypes";

const EQUINE_EXPECTED_TERMS = [
  "horse",
  "horses",
  "equine",
  "stable",
  "rider",
  "equestrian",
  "yard",
  "paddock",
  "livery",
  "horse owner",
  "stable owner",
];

const EQUINE_FORBIDDEN_LABELS = [
  "laptop",
  "office",
  "city",
  "skyline",
  "corporate meeting",
  "dashboard screenshot",
  "gibberish text",
  "unreadable letters",
  "random ui",
  "computer screen",
  "generic office",
];

const EQUINE_SCOPE_TERMS = [
  "equiprofile",
  "horse",
  "equine",
  "stable",
  "rider",
  "equestrian",
];

function lower(value: string) {
  return value.toLowerCase();
}

export function shouldApplyEquineVisualRules(input: {
  hostAppId?: string | null;
  expectedSubject?: string | null;
  expectedAudience?: string | null;
  sourceMetadata?: Record<string, unknown>;
}): boolean {
  if (lower(input.hostAppId ?? "").includes("equiprofile")) return true;
  const subject = lower(input.expectedSubject ?? "");
  const audience = lower(input.expectedAudience ?? "");
  if (EQUINE_SCOPE_TERMS.some((term) => subject.includes(term))) return true;
  if (EQUINE_SCOPE_TERMS.some((term) => audience.includes(term))) return true;
  const meta = JSON.stringify(input.sourceMetadata ?? "").toLowerCase();
  return EQUINE_SCOPE_TERMS.some((term) => meta.includes(term));
}

export function runEquineVisualRelevanceRules(input: {
  detectedLabels: string[];
  sourceMetadata: Record<string, unknown>;
  expectedSubject?: string | null;
  expectedBrand?: string | null;
  expectedAudience?: string | null;
}): VisualQaIssue[] {
  const issues: VisualQaIssue[] = [];
  const labelsLower = input.detectedLabels.map(lower);
  const metaText = lower(JSON.stringify(input.sourceMetadata));
  const allText = [...labelsLower, metaText].join(" ");
  const subjectText = lower(input.expectedSubject ?? "");

  const hasEquineTerm =
    EQUINE_EXPECTED_TERMS.some((term) => allText.includes(term)) ||
    EQUINE_EXPECTED_TERMS.some((term) => subjectText.includes(term));

  if (!hasEquineTerm) {
    issues.push({
      code: "equine_subject_missing",
      message:
        "No horse/equine/stable/equestrian term detected in labels or metadata. Expected equine visual content.",
      severity: "error",
    });
  }

  const forbiddenFound = EQUINE_FORBIDDEN_LABELS.filter((label) => labelsLower.some((l) => l.includes(label)));
  for (const forbidden of forbiddenFound) {
    issues.push({
      code: "equine_off_topic_label",
      message: `Off-topic label detected for equine output: "${forbidden}". This visual likely does not match equine context.`,
      severity: "error",
    });
  }

  return issues;
}

export function runGenericVisualRelevanceRules(input: {
  detectedLabels: string[];
  sourceMetadata: Record<string, unknown>;
  expectedSubject?: string | null;
  expectedBrand?: string | null;
  expectedAudience?: string | null;
  requireBrandDomainCta: boolean;
  requireCaptions: boolean;
}): VisualQaIssue[] {
  const issues: VisualQaIssue[] = [];
  const meta = input.sourceMetadata;

  if (input.requireBrandDomainCta) {
    const hasBrand = Boolean(meta.brandName || meta.brand || input.expectedBrand);
    const hasDomain = Boolean(meta.domain);
    const hasCta = Boolean(meta.cta || meta.primaryCta);
    if (!hasBrand || !hasDomain || !hasCta) {
      issues.push({
        code: "missing_brand_domain_cta",
        message: "Final rendered video is missing brand name, domain, or CTA metadata.",
        severity: "error",
      });
    }
  }

  if (input.requireCaptions) {
    const hasCaptions =
      Boolean(meta.captionStatus) ||
      Boolean(meta.captions) ||
      Boolean(meta.captionFallback);
    if (!hasCaptions) {
      issues.push({
        code: "missing_captions",
        message: "No captions or caption fallback found on rendered video.",
        severity: "error",
      });
    }
  }

  return issues;
}

export function runVisualRelevanceRules(input: {
  hostAppId?: string | null;
  detectedLabels: string[];
  sourceMetadata: Record<string, unknown>;
  expectedSubject?: string | null;
  expectedBrand?: string | null;
  expectedAudience?: string | null;
  requireBrandDomainCta?: boolean;
  requireCaptions?: boolean;
}): VisualQaIssue[] {
  const issues: VisualQaIssue[] = [];

  issues.push(
    ...runGenericVisualRelevanceRules({
      detectedLabels: input.detectedLabels,
      sourceMetadata: input.sourceMetadata,
      expectedSubject: input.expectedSubject,
      expectedBrand: input.expectedBrand,
      expectedAudience: input.expectedAudience,
      requireBrandDomainCta: input.requireBrandDomainCta ?? false,
      requireCaptions: input.requireCaptions ?? false,
    }),
  );

  if (
    shouldApplyEquineVisualRules({
      hostAppId: input.hostAppId,
      expectedSubject: input.expectedSubject,
      expectedAudience: input.expectedAudience,
      sourceMetadata: input.sourceMetadata,
    })
  ) {
    issues.push(
      ...runEquineVisualRelevanceRules({
        detectedLabels: input.detectedLabels,
        sourceMetadata: input.sourceMetadata,
        expectedSubject: input.expectedSubject,
        expectedBrand: input.expectedBrand,
        expectedAudience: input.expectedAudience,
      }),
    );
  }

  return issues;
}
