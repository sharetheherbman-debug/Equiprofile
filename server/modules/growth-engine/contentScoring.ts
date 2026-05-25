// Copyright (c) 2025-2026 Amarktai Network. All rights reserved.
// Content Scoring Engine — deterministic heuristics (first pass)
//
// Scores marketing drafts across 6 dimensions, all 0-100:
//   hookScore        — strength and clarity of the opening hook
//   platformFitScore — how well the content fits the platform and format
//   conversionScore  — presence and strength of a CTA
//   clarityScore     — length and substance of the content
//   complianceScore  — absence of prohibited or misleading claims
//   viralPotentialScore — signals associated with shareable/engaging content
//
// Uses deterministic heuristics only.
// Optional AI scoring can be added later if a provider is available.
// Does NOT make fake promises about platform algorithms.

export type ContentScoreInput = {
  hook?: string | null;
  script?: string | null;
  caption?: string | null;
  cta?: string | null;
  hashtags?: string[] | null;
  platform: string;
  format?: string | null;
  durationSeconds?: number | null;
  brandVoice?: string | null;
  targetAudience?: string | null;
  prohibitedClaims?: string[];
};

export type ContentScoreResult = {
  hookScore: number;
  platformFitScore: number;
  conversionScore: number;
  clarityScore: number;
  complianceScore: number;
  viralPotentialScore: number;
  overallScore: number;
  reasons: string[];
  improvementSuggestions: string[];
};

export function scoreMarketingDraft(input: ContentScoreInput): ContentScoreResult {
  const reasons: string[] = [];
  const suggestions: string[] = [];

  // ─── Hook score (0-100) ─────────────────────────────────────────────────────
  let hookScore = 50;
  const hookText = input.hook?.trim() ?? "";

  if (!hookText || hookText.length < 5) {
    hookScore = 10;
    suggestions.push(
      "Add a strong hook that addresses the viewer's pain point in the first 3 seconds.",
    );
  } else {
    hookScore += 20;
    reasons.push("Hook is present and has substance.");
  }

  if (hookText && /\?/.test(hookText)) {
    hookScore = Math.min(hookScore + 10, 100);
    reasons.push("Hook uses a question — effective at stopping the scroll.");
  }

  const hookWords = hookText.split(/\s+/).filter(Boolean);
  if (hookText && hookWords.length <= 12 && hookWords.length >= 3) {
    hookScore = Math.min(hookScore + 10, 100);
    reasons.push("Hook is concise and punchy.");
  } else if (hookText && hookWords.length > 20) {
    hookScore = Math.max(hookScore - 10, 0);
    suggestions.push("Shorten the hook — it should land in 3 seconds or less.");
  }

  if (hookText && /you|your/i.test(hookText)) {
    hookScore = Math.min(hookScore + 5, 100);
    reasons.push("Hook addresses the viewer directly.");
  }

  // ─── Platform fit score (0-100) ─────────────────────────────────────────────
  let platformFitScore = 55;
  const platform = (input.platform ?? "").toLowerCase();
  const format = (input.format ?? "").toLowerCase();

  if (
    (platform === "tiktok" || platform === "instagram") &&
    (format.includes("reel") || format.includes("short"))
  ) {
    platformFitScore += 20;
    reasons.push(`Reel/Short format is optimal for ${input.platform}.`);
  }
  if (platform === "linkedin" && (format.includes("post") || format.includes("carousel"))) {
    platformFitScore += 15;
    reasons.push("Post/Carousel format aligns with LinkedIn best practices.");
  }
  if (platform === "facebook" && (format.includes("reel") || format.includes("video"))) {
    platformFitScore += 15;
    reasons.push("Video/Reel format is effective on Facebook.");
  }
  if (platform === "youtube" && (format.includes("video") || format.includes("short"))) {
    platformFitScore += 15;
    reasons.push("Video format is correct for YouTube.");
  }
  if (platform === "email" && format === "email") {
    platformFitScore += 15;
    reasons.push("Email format matches the email platform correctly.");
  }

  const dur = input.durationSeconds ?? 0;
  if (dur > 0) {
    const isShortForm =
      platform === "tiktok" ||
      format.includes("reel") ||
      format.includes("short");

    if (isShortForm && dur <= 60) {
      platformFitScore = Math.min(platformFitScore + 10, 100);
      reasons.push("Duration is within the optimal range for short-form content.");
    } else if (isShortForm && dur > 90) {
      platformFitScore = Math.max(platformFitScore - 15, 0);
      suggestions.push(
        "Consider shortening to under 60s — this is optimal for Reels/Shorts.",
      );
    }
    if (platform === "youtube" && !format.includes("short") && dur >= 180) {
      platformFitScore = Math.min(platformFitScore + 5, 100);
      reasons.push("Long-form duration is suitable for YouTube standard uploads.");
    }
  }

  const hashtagCount = input.hashtags?.length ?? 0;
  if (hashtagCount > 0) {
    if (platform === "facebook" && hashtagCount > 3) {
      platformFitScore = Math.max(platformFitScore - 10, 0);
      suggestions.push("Facebook works best with 1-3 hashtags.");
    } else if (
      (platform === "instagram" || platform === "tiktok") &&
      hashtagCount >= 3
    ) {
      platformFitScore = Math.min(platformFitScore + 10, 100);
      reasons.push("Good hashtag count for this platform.");
    } else if (platform === "linkedin" && hashtagCount > 5) {
      platformFitScore = Math.max(platformFitScore - 5, 0);
      suggestions.push("LinkedIn works best with 3-5 relevant hashtags.");
    }
  } else if (platform !== "email" && platform !== "youtube") {
    suggestions.push(
      "Add relevant hashtags to improve discoverability on this platform.",
    );
  }

  // ─── Conversion score (0-100) ───────────────────────────────────────────────
  let conversionScore = 30;
  const ctaText = input.cta?.trim() ?? "";

  if (!ctaText || ctaText.length < 3) {
    suggestions.push(
      "Add a clear, single call-to-action (CTA) that tells the viewer exactly what to do next.",
    );
  } else {
    conversionScore += 45;
    reasons.push("A CTA is present.");

    if (/click|sign.?up|book|get|try|download|visit|learn|join|start|discover/i.test(ctaText)) {
      conversionScore = Math.min(conversionScore + 15, 100);
      reasons.push("CTA uses an action verb — increases conversion intent.");
    }
    if (ctaText.length < 60) {
      conversionScore = Math.min(conversionScore + 5, 100);
      reasons.push("CTA is concise and easy to act on.");
    }
  }

  // ─── Clarity score (0-100) ──────────────────────────────────────────────────
  let clarityScore = 40;
  const scriptLen = input.script?.trim().length ?? 0;
  const captionLen = input.caption?.trim().length ?? 0;
  const totalContentLen = scriptLen + captionLen;

  if (totalContentLen >= 100) {
    clarityScore += 30;
    reasons.push("Content has enough substance to convey a full message.");
  } else if (totalContentLen >= 50) {
    clarityScore += 15;
    suggestions.push("Consider expanding the script or caption to fully develop the message.");
  } else {
    suggestions.push(
      "The script or caption is too short — expand it to deliver real value to the viewer.",
    );
  }

  if (captionLen >= 30) {
    clarityScore = Math.min(clarityScore + 10, 100);
    reasons.push("Caption supports the content with additional context.");
  } else if (captionLen === 0 && platform !== "youtube") {
    suggestions.push("Add a caption — it helps with accessibility and viewer comprehension.");
  }

  if (scriptLen >= 200) {
    clarityScore = Math.min(clarityScore + 10, 100);
  }

  // ─── Compliance score (0-100) ───────────────────────────────────────────────
  let complianceScore = 90;
  const allText = [input.hook, input.script, input.caption, input.cta]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const defaultProhibited = [
    "guaranteed",
    "100% proven",
    "miraculous",
    "no risk",
    "risk free",
    "lose weight guaranteed",
    "cure",
    "clinically proven",
  ];
  const allProhibited = [...(input.prohibitedClaims ?? []), ...defaultProhibited];

  for (const claim of allProhibited) {
    if (claim && allText.includes(claim.toLowerCase())) {
      complianceScore = Math.max(complianceScore - 25, 0);
      suggestions.push(
        `Consider rephrasing or removing "${claim}" — this type of claim may be considered misleading.`,
      );
    }
  }

  if (complianceScore >= 80) {
    reasons.push("Content does not appear to contain prohibited or misleading claims.");
  }

  // ─── Viral potential score (0-100) ──────────────────────────────────────────
  let viralPotentialScore = 35;

  if (hookText && /you|your|we|us/i.test(hookText)) {
    viralPotentialScore += 10;
  }
  if (allText.includes("?")) {
    viralPotentialScore += 5;
    reasons.push("Content includes a question — encourages engagement.");
  }
  if (hashtagCount >= 3 && hashtagCount <= 10) {
    viralPotentialScore = Math.min(viralPotentialScore + 10, 100);
  }
  if (dur > 0 && dur >= 15 && dur <= 60) {
    viralPotentialScore = Math.min(viralPotentialScore + 15, 100);
    reasons.push("Duration is within the ideal range for short-form shareable content.");
  }
  if (totalContentLen >= 150) {
    viralPotentialScore = Math.min(viralPotentialScore + 10, 100);
  }
  if (input.targetAudience && input.targetAudience.length > 0) {
    viralPotentialScore = Math.min(viralPotentialScore + 5, 100);
    reasons.push("Audience targeting is defined — increases content relevance.");
  }

  // ─── Overall score ──────────────────────────────────────────────────────────
  const overallScore = Math.round(
    (hookScore +
      platformFitScore +
      conversionScore +
      clarityScore +
      complianceScore +
      viralPotentialScore) /
      6,
  );

  return {
    hookScore: clamp(Math.round(hookScore)),
    platformFitScore: clamp(Math.round(platformFitScore)),
    conversionScore: clamp(Math.round(conversionScore)),
    clarityScore: clamp(Math.round(clarityScore)),
    complianceScore: clamp(Math.round(complianceScore)),
    viralPotentialScore: clamp(Math.round(viralPotentialScore)),
    overallScore: clamp(overallScore),
    reasons,
    improvementSuggestions: suggestions,
  };
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(Math.max(value, min), max);
}
