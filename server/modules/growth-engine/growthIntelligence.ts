// Copyright (c) 2025-2026 Amarktai Network. All rights reserved.
// Growth Intelligence Foundation
// Provides: growth profiles, platform strategy rules (seeded), content score persistence.
//
// IMPORTANT: This module uses best-practice strategy rules only.
// It does NOT make fake algorithm claims or guarantee outcomes.
// All rules are clearly described as "best-practice guidelines."

import { eq } from "drizzle-orm";
import { growthProfiles, platformStrategyRules, contentScores } from "../../../drizzle/schema";

type Db = Awaited<ReturnType<typeof import("../../db")["getDb"]>>;

async function resolveDb(): Promise<Db> {
  const dbModule = await import("../../db");
  if ("getDb" in dbModule && typeof dbModule.getDb === "function") {
    return dbModule.getDb();
  }
  return null;
}

function parseJson<T>(val: string | null | undefined, fallback: T): T {
  if (!val) return fallback;
  try {
    return JSON.parse(val) as T;
  } catch {
    return fallback;
  }
}

// ─── Baseline platform strategy rules ────────────────────────────────────────
// Based on publicly available best practices. Not algorithm secrets.

export const BASELINE_PLATFORM_RULES: Record<
  string,
  {
    rules: string[];
    recommendedCadence: Record<string, unknown>;
    hookGuidelines: string[];
    formatGuidelines: string[];
    complianceNotes: string[];
  }
> = {
  Facebook: {
    rules: [
      "Use native video uploads for better organic reach vs external links",
      "Reels perform best at 15-60 seconds",
      "Post when your audience is online — check Page Insights for best times",
      "Captions should front-load the hook within the first 3 words",
      "Use 1-3 hashtags maximum for Facebook — more does not improve reach",
    ],
    recommendedCadence: { postsPerWeek: 5, reelsPerWeek: 3, storiesPerDay: 1 },
    hookGuidelines: [
      "Open with a question or surprising fact",
      "Address the viewer's pain point in the first 3 seconds",
      "Use movement or visual change in the opening frame",
    ],
    formatGuidelines: [
      "Reels: 9:16 vertical, 15-60s",
      "Feed video: 4:5 recommended, up to 3 minutes",
      "Images: 1080x1080 square or 1080x1350 portrait",
    ],
    complianceNotes: [
      "Never make unsubstantiated health or financial claims",
      "Must include disclosure for paid partnerships",
    ],
  },
  Instagram: {
    rules: [
      "Reels are currently the highest organic-distribution format",
      "Use 5-10 relevant hashtags",
      "Alt text on images improves accessibility and search discoverability",
      "Story links drive direct traffic if the link sticker feature is available",
    ],
    recommendedCadence: { reelsPerWeek: 5, feedPostsPerWeek: 3, storiesPerDay: 3 },
    hookGuidelines: [
      "First frame must stop the scroll — avoid black frames or slow intros",
      "On-screen text hook should appear within 1 second",
    ],
    formatGuidelines: [
      "Reels: 9:16, up to 90s",
      "Feed: 1:1 square or 4:5 portrait",
      "Stories: 9:16",
    ],
    complianceNotes: ["Paid partnership label required for sponsored content"],
  },
  TikTok: {
    rules: [
      "Hook must land in the first 1-2 seconds — no slow intros",
      "Trending sounds can boost distribution — but verify copyright clearance first",
      "Educational content performs well — teach something specific",
      "Replying to comments with videos extends reach and engagement",
    ],
    recommendedCadence: { videosPerDay: 1, minVideosPerWeek: 4 },
    hookGuidelines: [
      "Open mid-action — never with a logo or intro",
      "Ask a polarising or counterintuitive question",
    ],
    formatGuidelines: [
      "9:16 vertical required",
      "15-60s optimal for organic distribution",
      "Up to 10 minutes available but shorter performs better",
    ],
    complianceNotes: [
      "Paid partnership disclosure required",
      "No misleading health, financial, or safety claims",
    ],
  },
  YouTube: {
    rules: [
      "Thumbnails drive 80% of click-through rate — invest design time here",
      "Title should contain the core keyword search phrase",
      "First 30 seconds must earn continued watching — front-load value",
      "Chapters improve watch time and SEO",
    ],
    recommendedCadence: { longFormPerWeek: 1, shortsPerWeek: 3 },
    hookGuidelines: [
      "State the payoff or benefit upfront in the first 10 seconds",
      "Avoid long channel intros before delivering value",
    ],
    formatGuidelines: [
      "Standard: 16:9, minimum 1080p",
      "Shorts: 9:16, under 60s",
    ],
    complianceNotes: [
      "Must follow YouTube advertiser-friendly guidelines",
      "Disclosures required for sponsorships",
    ],
  },
  LinkedIn: {
    rules: [
      "Professional tone — avoid slang unless your brand is known for it",
      "Personal stories from founders or team members outperform corporate announcements",
      "Document carousel posts drive high engagement",
      "Native video gets more reach than YouTube links",
    ],
    recommendedCadence: { postsPerWeek: 3, articlesPerMonth: 2 },
    hookGuidelines: [
      "Lead with a counterintuitive insight or specific data point",
      "Use numbers or specific examples to build credibility",
    ],
    formatGuidelines: [
      "Text posts: 1200-3000 characters for strong performance",
      "Video: 1:1 or 16:9",
      "Documents: PDF carousels up to 300 pages",
    ],
    complianceNotes: [
      "No spam or unsolicited pitches in comments",
      "Disclose AI-generated content per LinkedIn guidelines",
    ],
  },
  "Google Business": {
    rules: [
      "Post updates weekly to maintain active status in local search",
      "Photos significantly improve listing engagement and map presence",
      "Respond to all reviews — positive and negative — within 24-48 hours",
      "Use local keywords in your business description and posts",
    ],
    recommendedCadence: { updatesPerWeek: 1, photoUploadsPerMonth: 4 },
    hookGuidelines: [
      "Use clear offers or events with specific CTAs",
      "Local relevance is more important than reach — be specific",
    ],
    formatGuidelines: [
      "Photos: 720×720 minimum, 1080×1080 recommended",
      "Posts: 1500 characters maximum",
    ],
    complianceNotes: [
      "Must be accurate — Google can suspend listings for misrepresentation",
      "No keyword stuffing in business name",
    ],
  },
  Email: {
    rules: [
      "Subject lines under 50 characters perform best on mobile",
      "Personalisation (first name) increases open rates",
      "Single clear CTA performs better than multiple competing actions",
      "Mobile-first design — 60%+ of opens are on mobile devices",
    ],
    recommendedCadence: { emailsPerWeek: 2, newsletterPerMonth: 1 },
    hookGuidelines: [
      "Subject line is the hook — write it about the reader's benefit, not your product",
      "Preview text reinforces and extends the subject line",
    ],
    formatGuidelines: [
      "Max content width 600px",
      "Plain text or simple single-column HTML preferred",
      "Alt text on all images — many clients block images by default",
    ],
    complianceNotes: [
      "Must include unsubscribe link (CAN-SPAM, GDPR requirement)",
      "Must include physical mailing address",
      "Double opt-in recommended for new subscribers",
    ],
  },
};

// ─── Platform strategy rules ──────────────────────────────────────────────────

/**
 * Seed baseline platform strategy rules into the database (idempotent).
 * Skips platforms already seeded to preserve any admin customisations.
 */
export async function seedPlatformStrategyRules() {
  const db = await resolveDb();
  if (!db) return;

  for (const [platform, data] of Object.entries(BASELINE_PLATFORM_RULES)) {
    const [existing] = await db
      .select()
      .from(platformStrategyRules)
      .where(eq(platformStrategyRules.platform, platform))
      .limit(1);

    if (!existing) {
      await db.insert(platformStrategyRules).values({
        platform,
        version: "1.0",
        rulesJson: JSON.stringify(data.rules),
        recommendedCadenceJson: JSON.stringify(data.recommendedCadence),
        hookGuidelinesJson: JSON.stringify(data.hookGuidelines),
        formatGuidelinesJson: JSON.stringify(data.formatGuidelines),
        complianceNotesJson: JSON.stringify(data.complianceNotes),
      });
    }
  }
}

/**
 * Get platform strategy rules. Falls back to BASELINE_PLATFORM_RULES
 * if no DB record exists for the platform.
 */
export async function getPlatformStrategyRules(platform: string) {
  const db = await resolveDb();

  if (db) {
    const [row] = await db
      .select()
      .from(platformStrategyRules)
      .where(eq(platformStrategyRules.platform, platform))
      .limit(1);

    if (row) {
      return {
        platform: row.platform,
        version: row.version,
        rules: parseJson<string[]>(row.rulesJson, []),
        recommendedCadence: parseJson<Record<string, unknown>>(row.recommendedCadenceJson, {}),
        hookGuidelines: parseJson<string[]>(row.hookGuidelinesJson, []),
        formatGuidelines: parseJson<string[]>(row.formatGuidelinesJson, []),
        complianceNotes: parseJson<string[]>(row.complianceNotesJson, []),
      };
    }
  }

  // Fallback to baseline rules (no DB record yet)
  const baseline = BASELINE_PLATFORM_RULES[platform];
  if (!baseline) return null;
  return { platform, version: "1.0-baseline", ...baseline };
}

// ─── Growth profiles ──────────────────────────────────────────────────────────

export async function upsertGrowthProfile(input: {
  tenantType?: string;
  tenantId: string;
  brandProfileId?: number;
  targetPlatforms?: string[];
  growthGoal?: string;
  audienceDescription?: string;
  postingCadence?: Record<string, unknown>;
  conversionGoal?: string;
  preferredContentTypes?: string[];
  notes?: string;
}) {
  const db = await resolveDb();
  if (!db) throw new Error("Database not available for growth profile");

  const [existing] = await db
    .select()
    .from(growthProfiles)
    .where(eq(growthProfiles.tenantId, input.tenantId))
    .limit(1);

  const values = {
    tenantType: input.tenantType ?? "individual",
    tenantId: input.tenantId,
    brandProfileId: input.brandProfileId ?? null,
    targetPlatformsJson: input.targetPlatforms
      ? JSON.stringify(input.targetPlatforms)
      : null,
    growthGoal: input.growthGoal ?? null,
    audienceDescription: input.audienceDescription ?? null,
    postingCadenceJson: input.postingCadence
      ? JSON.stringify(input.postingCadence)
      : null,
    conversionGoal: input.conversionGoal ?? null,
    preferredContentTypesJson: input.preferredContentTypes
      ? JSON.stringify(input.preferredContentTypes)
      : null,
    notes: input.notes ?? null,
  };

  if (existing) {
    await db
      .update(growthProfiles)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(growthProfiles.id, existing.id));
    return { id: existing.id, ...values };
  }

  const result = await db.insert(growthProfiles).values(values);
  return { id: result[0].insertId, ...values };
}

// ─── Content score persistence ────────────────────────────────────────────────

export async function saveContentScore(input: {
  draftId?: string;
  assetId?: number;
  platform: string;
  hookScore: number;
  platformFitScore: number;
  conversionScore: number;
  clarityScore: number;
  complianceScore: number;
  viralPotentialScore: number;
  reasons: string[];
  improvementSuggestions: string[];
}) {
  const db = await resolveDb();
  if (!db) throw new Error("Database not available for content scoring");

  const result = await db.insert(contentScores).values({
    draftId: input.draftId ?? null,
    assetId: input.assetId ?? null,
    platform: input.platform,
    hookScore: input.hookScore,
    platformFitScore: input.platformFitScore,
    conversionScore: input.conversionScore,
    clarityScore: input.clarityScore,
    complianceScore: input.complianceScore,
    viralPotentialScore: input.viralPotentialScore,
    reasonsJson: JSON.stringify(input.reasons),
    improvementSuggestionsJson: JSON.stringify(input.improvementSuggestions),
  });

  return { id: result[0].insertId, ...input };
}
