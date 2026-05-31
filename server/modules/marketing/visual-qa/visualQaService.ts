import { extractMarketingVideoFrames } from "./visualQaFrameExtractor";
import { runVisualRelevanceRules, shouldApplyEquineVisualRules } from "./visualQaRelevanceRules";
import { scoreVisualQa } from "./visualQaScoring";
import { createVisualQaRecord, getLatestVisualQaForTarget } from "./visualQaStore";
import { getVisualQaVisionProvider } from "./visualQaVisionProvider";
import type { RunVisualQaInput, VisualQaRecord, VisualQaStatus, VisualQaTargetType } from "./visualQaTypes";

function isVideoTarget(targetType: VisualQaTargetType) {
  return targetType === "render_job" || targetType === "beast_mode_variant" || targetType === "media_asset";
}

export async function runVisualQa(input: RunVisualQaInput): Promise<VisualQaRecord> {
  const sourceMetadata = input.sourceMetadata ?? {};
  const detectedLabels: string[] = [];
  let frameUrls: string[] = [];
  let thumbnailUrl: string | null = null;
  let setupNeeded = false;
  let needsManualReview = false;

  if (isVideoTarget(input.targetType)) {
    const extraction = await extractMarketingVideoFrames({
      localVideoPath: input.localVideoPath,
      publicVideoUrl: input.publicVideoUrl,
      frameCount: 3,
    });
    frameUrls = extraction.frameUrls;
    thumbnailUrl = extraction.thumbnailUrl;
    setupNeeded = extraction.setupNeeded;
    needsManualReview = extraction.needsManualReview;
  }

  const visionProvider = getVisualQaVisionProvider();
  if (!setupNeeded && visionProvider.canAnalyze && frameUrls.length > 0 && visionProvider.analyzeVideoFrames) {
    try {
      const analysis = await visionProvider.analyzeVideoFrames({
        frameUrls,
        expectedSubject: input.expectedSubject,
        expectedBrand: input.expectedBrand,
      });
      detectedLabels.push(...analysis.labels);
    } catch {
      needsManualReview = true;
    }
  }

  if (setupNeeded) {
    const id = await createVisualQaRecord({
      ...input,
      status: "setup_needed",
      frameUrls: [],
      thumbnailUrl: null,
      detectedLabels: [],
      issues: [],
      score: null,
    });
    const record = await getLatestVisualQaForTarget({ ...input, targetId: input.targetId });
    return record ?? buildInMemoryRecord(id, input, "setup_needed", [], [], null, null);
  }

  if (needsManualReview && frameUrls.length === 0) {
    const id = await createVisualQaRecord({
      ...input,
      status: "needs_review",
      frameUrls: [],
      thumbnailUrl: null,
      detectedLabels: [],
      issues: [
        {
          code: "no_visual_evidence",
          message: "No frames could be extracted — manual visual review required before approval.",
          severity: "error",
        },
      ],
      score: { relevanceScore: 0, pass: false, blockingIssueCount: 1, warningCount: 0 },
    });
    const record = await getLatestVisualQaForTarget({ ...input, targetId: input.targetId });
    return record ?? buildInMemoryRecord(id, input, "needs_review", [], [], null, null);
  }

  const requireBrandDomainCta =
    input.targetType === "render_job" ||
    (input.targetType === "beast_mode_variant" && Boolean(sourceMetadata.studioPlan));

  const requireCaptions = requireBrandDomainCta;

  const issues = runVisualRelevanceRules({
    hostAppId: input.hostAppId,
    detectedLabels,
    sourceMetadata,
    expectedSubject: input.expectedSubject,
    expectedBrand: input.expectedBrand,
    expectedAudience: input.expectedAudience,
    requireBrandDomainCta,
    requireCaptions,
  });

  const score = scoreVisualQa(issues);
  let status: VisualQaStatus = score.pass ? "passed" : "failed";
  if (needsManualReview) status = "needs_review";

  const id = await createVisualQaRecord({
    ...input,
    status,
    frameUrls,
    thumbnailUrl,
    detectedLabels,
    issues,
    score,
  });

  const record = await getLatestVisualQaForTarget({ ...input, targetId: input.targetId });
  return record ?? buildInMemoryRecord(id, input, status, frameUrls, issues, score, thumbnailUrl);
}

function buildInMemoryRecord(
  id: number,
  input: RunVisualQaInput,
  status: VisualQaStatus,
  frameUrls: string[],
  issues: ReturnType<typeof runVisualRelevanceRules>,
  score: ReturnType<typeof scoreVisualQa> | null,
  thumbnailUrl: string | null,
): VisualQaRecord {
  const now = new Date().toISOString();
  return {
    id,
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
    hostAppId: input.hostAppId,
    targetType: input.targetType,
    targetId: input.targetId,
    status,
    expectedSubject: input.expectedSubject ?? null,
    expectedBrand: input.expectedBrand ?? null,
    expectedAudience: input.expectedAudience ?? null,
    frameUrls,
    thumbnailUrl,
    detectedLabels: [],
    issues,
    score,
    reviewerUserId: null,
    reviewNotes: null,
    createdAt: now,
    updatedAt: now,
    reviewedAt: null,
  };
}
