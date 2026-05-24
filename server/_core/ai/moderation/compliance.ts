import type { AITask, EscalationLevel } from "../types";

type ModerationRule = {
  id: string;
  pattern: RegExp;
  reason: string;
  escalation: EscalationLevel;
  block: boolean;
};

const RULES: ModerationRule[] = [
  {
    id: "fake_endorsements",
    pattern: /endorsed by|official partner(?!ed data)|certified by .* federation/i,
    reason: "Potential fake endorsement/accreditation claim",
    escalation: "high_confidence",
    block: true,
  },
  {
    id: "fake_charity",
    pattern: /charity partner|donation campaign with/i,
    reason: "Potential fake charity partnership claim",
    escalation: "high_confidence",
    block: true,
  },
  {
    id: "unsafe_riding",
    pattern: /ride without helmet|skip warm[- ]?up|force lame horse/i,
    reason: "Unsafe riding guidance detected",
    escalation: "high_confidence",
    block: true,
  },
  {
    id: "vet_diagnosis",
    pattern: /diagnose|prescribe|guaranteed cure|veterinary diagnosis/i,
    reason: "Potential veterinary diagnosis claim",
    escalation: "professional_review",
    block: true,
  },
  {
    id: "impersonation",
    pattern: /impersonate|pretend to be|write as .* without disclosure/i,
    reason: "Impersonation behavior risk",
    escalation: "high_confidence",
    block: true,
  },
  {
    id: "autopublish",
    pattern: /auto-?publish now|publish immediately to all platforms/i,
    reason: "Uncontrolled autopublishing request",
    escalation: "medium_confidence",
    block: true,
  },
];

export type ModerationResult = {
  blocked: boolean;
  reasons: string[];
  escalation: EscalationLevel;
  matchedRuleIds: string[];
};

function pickEscalation(levels: EscalationLevel[]): EscalationLevel {
  if (levels.includes("professional_review")) return "professional_review";
  if (levels.includes("high_confidence")) return "high_confidence";
  if (levels.includes("medium_confidence")) return "medium_confidence";
  return "low_confidence";
}

const stringifyInput = (input: Record<string, unknown>): string => {
  try {
    return JSON.stringify(input);
  } catch {
    return String(input);
  }
};

export function runComplianceModeration(task: AITask, input: Record<string, unknown>): ModerationResult {
  const text = stringifyInput(input);
  const matched = RULES.filter((rule) => rule.pattern.test(text));
  const reasons = matched.map((rule) => rule.reason);
  const escalation = pickEscalation(matched.map((rule) => rule.escalation));

  const mediaSensitiveTask = ["text_to_image", "image_edit", "image_to_video", "text_to_video", "avatar_video"].includes(task);
  if (mediaSensitiveTask && matched.length === 0) {
    return {
      blocked: false,
      reasons: [],
      escalation: "low_confidence",
      matchedRuleIds: [],
    };
  }

  return {
    blocked: matched.some((rule) => rule.block),
    reasons,
    escalation,
    matchedRuleIds: matched.map((rule) => rule.id),
  };
}
