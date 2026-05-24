import {
  createReferral,
  getFunnelSummary,
  listCrmContacts,
  listFeedback,
  listLifecycleRuns,
  listReferrals,
  listSocialConnections,
  recordFunnelEvent,
  recordLifecycleRun,
  submitFeedback,
  upsertCrmContact,
  upsertOnboardingFlow,
  upsertSocialConnection,
} from "./persistence";
import { listGrowthEngineAdapters } from "./adapters";
import type {
  GrowthFunnelEvent,
  OnboardingType,
  SocialConnectionState,
  SocialPlatform,
} from "./types";

export const QUICKSTART_TEMPLATES = {
  stable: {
    checklist: [
      "Add your first horse profile",
      "Create your stable team",
      "Import or add core contacts",
      "Set your first weekly plan",
    ],
    sampleData: ["sample_horse", "sample_training_week", "sample_health_record"],
  },
  school: {
    checklist: [
      "Create school profile",
      "Invite first teacher",
      "Import first student cohort",
      "Publish first onboarding checklist",
    ],
    sampleData: ["sample_teacher", "sample_student", "sample_lesson_plan"],
  },
};

export async function getGrowthEngineOverview(tenantId: string) {
  const [contacts, referrals, social, lifecycle, funnel, feedback] = await Promise.all([
    listCrmContacts(tenantId),
    listReferrals(tenantId),
    listSocialConnections(tenantId),
    listLifecycleRuns(tenantId),
    getFunnelSummary(tenantId),
    listFeedback(tenantId),
  ]);

  return {
    tenantId,
    adapters: listGrowthEngineAdapters(),
    crm: {
      totalContacts: contacts.length,
      byOnboardingStatus: contacts.reduce<Record<string, number>>((acc, item) => {
        const key = item.onboardingStatus || "unknown";
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {}),
    },
    referrals: {
      total: referrals.length,
      converted: referrals.filter((row) => row.status === "converted").length,
    },
    social: {
      totalConnections: social.length,
      readyToPublish: social.filter((row) => row.state === "ready_to_publish").length,
      approvalRequired: social.filter((row) => row.state === "approval_required").length,
    },
    lifecycle: {
      totalRuns: lifecycle.length,
      failedRuns: lifecycle.filter((row) => row.runStatus === "failed").length,
    },
    funnel,
    feedback: {
      total: feedback.length,
      open: feedback.filter((row) => row.status !== "resolved").length,
    },
  };
}

export async function trackGrowthFunnelEvent(event: GrowthFunnelEvent) {
  return recordFunnelEvent(event);
}

export async function saveCrmContact(input: {
  email: string;
  tenantId: string;
  tenantType: string;
  contactType: string;
  source: string;
  name?: string | null;
  organizationName?: string | null;
  status?: string;
  lifecycleTags?: string[];
  onboardingStatus?: string;
  referralCode?: string | null;
  engagementScore?: number;
  metadata?: Record<string, unknown>;
}) {
  return upsertCrmContact(input);
}

export async function connectSocialPlatform(input: {
  tenantId: string;
  platform: SocialPlatform;
  state: SocialConnectionState;
  encryptedAccessToken?: string | null;
  encryptedRefreshToken?: string | null;
  expiresAt?: Date | null;
  metadata?: Record<string, unknown>;
}) {
  return upsertSocialConnection(input);
}

export async function startOnboardingFlow(input: {
  userId: number;
  tenantId: string;
  onboardingType: OnboardingType;
  status: "not_started" | "in_progress" | "completed" | "skipped";
  step: number;
  progressPercent: number;
  checklist: Record<string, boolean>;
  quickWins: string[];
}) {
  return upsertOnboardingFlow(input);
}

export async function createLifecycleRun(input: {
  tenantId: string;
  contactId?: number;
  workflowKey: string;
  runStatus: "queued" | "processing" | "completed" | "failed" | "needs_approval";
  triggerSource: string;
  triggerEvent: string;
  runAt?: Date;
  payload?: Record<string, unknown>;
  outcome?: Record<string, unknown>;
}) {
  return recordLifecycleRun(input);
}

export async function createReferralInvite(input: {
  tenantId: string;
  inviterUserId?: number;
  inviteeEmail?: string | null;
  referralType: "stable" | "school" | "academy" | "yard" | "general";
  source: string;
  code: string;
  metadata?: Record<string, unknown>;
}) {
  return createReferral(input);
}

export async function submitGrowthFeedback(input: {
  tenantId: string;
  userId?: number;
  feedbackType: "feedback" | "bug" | "feature_request" | "onboarding_feedback" | "support" | "nps";
  title: string;
  description: string;
  satisfactionScore?: number | null;
  status?: "new" | "reviewing" | "planned" | "resolved";
  metadata?: Record<string, unknown>;
}) {
  return submitFeedback(input);
}

export async function getGrowthEngineAdminData(tenantId: string) {
  const [contacts, social, referrals, lifecycle, feedback, funnel] = await Promise.all([
    listCrmContacts(tenantId),
    listSocialConnections(tenantId),
    listReferrals(tenantId),
    listLifecycleRuns(tenantId),
    listFeedback(tenantId),
    getFunnelSummary(tenantId),
  ]);

  return {
    tenantId,
    adapters: listGrowthEngineAdapters(),
    contacts,
    social,
    referrals,
    lifecycle,
    feedback,
    funnel,
    quickstart: QUICKSTART_TEMPLATES,
  };
}
