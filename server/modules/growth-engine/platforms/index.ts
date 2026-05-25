import type { SocialConnectionState } from "../types";

export type PlatformCard = {
  id: "facebook" | "instagram" | "tiktok" | "youtube" | "linkedin" | "google_business" | "email";
  label: string;
  supportedContent: string[];
  oauthReady: boolean;
  schedulingReady: boolean;
  approvalFirst: boolean;
  roadmap: string[];
};

export type PlatformReadiness = PlatformCard & {
  connectionStatus: SocialConnectionState | "smtp_ready" | "not_configured";
  publishingReadiness: "ready" | "approval_required" | "draft_only" | "not_ready";
  automationStatus: "enabled" | "approval_required" | "disabled";
};

export const PLATFORM_ARCHITECTURE_CARDS: PlatformCard[] = [
  {
    id: "facebook",
    label: "Facebook",
    supportedContent: ["reels", "posts", "image_ads"],
    oauthReady: true,
    schedulingReady: true,
    approvalFirst: true,
    roadmap: ["OAuth", "token persistence", "approval-first publish hooks"],
  },
  {
    id: "instagram",
    label: "Instagram",
    supportedContent: ["reels", "carousels", "stories"],
    oauthReady: true,
    schedulingReady: true,
    approvalFirst: true,
    roadmap: ["OAuth", "media publish endpoint", "approval queue integration"],
  },
  {
    id: "tiktok",
    label: "TikTok",
    supportedContent: ["short_video"],
    oauthReady: true,
    schedulingReady: true,
    approvalFirst: true,
    roadmap: ["OAuth", "video publish", "rate-limit safe retries"],
  },
  {
    id: "youtube",
    label: "YouTube",
    supportedContent: ["shorts", "long_video"],
    oauthReady: true,
    schedulingReady: true,
    approvalFirst: true,
    roadmap: ["OAuth", "upload pipeline", "metadata optimization"],
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    supportedContent: ["posts", "image_posts", "video_posts"],
    oauthReady: true,
    schedulingReady: true,
    approvalFirst: true,
    roadmap: ["OAuth", "organization token storage", "approval-first publish"],
  },
  {
    id: "google_business",
    label: "Google Business",
    supportedContent: ["business_updates", "offer_posts"],
    oauthReady: true,
    schedulingReady: true,
    approvalFirst: true,
    roadmap: ["OAuth", "location selection", "approval-first update publish"],
  },
  {
    id: "email",
    label: "Email",
    supportedContent: ["campaigns", "nurture", "announcements"],
    oauthReady: false,
    schedulingReady: true,
    approvalFirst: true,
    roadmap: ["SMTP readiness", "approval queue", "send scheduling"],
  },
];

function toPublishingReadiness(state: SocialConnectionState | "smtp_ready" | "not_configured") {
  if (state === "ready_to_publish" || state === "smtp_ready") return "ready" as const;
  if (state === "approval_required" || state === "connected") return "approval_required" as const;
  if (state === "draft_only") return "draft_only" as const;
  return "not_ready" as const;
}

export function buildPlatformReadiness(input: {
  socialConnections: Array<{ platform: string; state: SocialConnectionState }>;
  smtpConfigured: boolean;
}): PlatformReadiness[] {
  return PLATFORM_ARCHITECTURE_CARDS.map((card) => {
    const mappedPlatform =
      card.id === "facebook" || card.id === "instagram"
        ? "meta"
        : card.id === "google_business"
          ? "google_business_profile"
          : card.id;

    const connectionState = card.id === "email"
      ? (input.smtpConfigured ? "smtp_ready" : "not_configured")
      : (input.socialConnections.find((item) => item.platform === mappedPlatform)?.state ?? "not_connected");

    const publishingReadiness = toPublishingReadiness(connectionState);

    return {
      ...card,
      connectionStatus: connectionState,
      publishingReadiness,
      automationStatus:
        publishingReadiness === "ready"
          ? "enabled"
          : publishingReadiness === "approval_required"
            ? "approval_required"
            : "disabled",
    };
  });
}
