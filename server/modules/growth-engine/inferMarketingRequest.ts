const PLATFORM_KEYWORDS: Array<{ pattern: RegExp; value: string }> = [
  { pattern: /linkedin/i, value: "LinkedIn" },
  { pattern: /youtube|yt/i, value: "YouTube" },
  { pattern: /tiktok|tik tok/i, value: "TikTok" },
  { pattern: /instagram|insta/i, value: "Instagram" },
  { pattern: /facebook|fb/i, value: "Facebook" },
  { pattern: /google business|gbp/i, value: "Google Business" },
  { pattern: /\bemail|newsletter/i, value: "Email" },
];

const FORMAT_KEYWORDS: Array<{ pattern: RegExp; value: string }> = [
  { pattern: /avatar/i, value: "avatar video" },
  { pattern: /reel/i, value: "reel" },
  { pattern: /shorts?|short-form/i, value: "short" },
  { pattern: /carousel/i, value: "carousel" },
  { pattern: /image|poster|graphic/i, value: "image" },
  { pattern: /video/i, value: "video" },
  { pattern: /email|newsletter/i, value: "email" },
  { pattern: /post/i, value: "post" },
];

const GOAL_KEYWORDS: Array<{ pattern: RegExp; value: string }> = [
  { pattern: /retain|renewal|re-engage/i, value: "retention" },
  { pattern: /school|riding school/i, value: "schools" },
  { pattern: /academy|course/i, value: "academy" },
  { pattern: /announce|launch|new/i, value: "announcement" },
  { pattern: /stable owners?|yard owners?/i, value: "stable owners" },
  { pattern: /signup|register|trial|lead/i, value: "signups" },
];

export type InferredMarketingRequest = {
  platform: string;
  format: string;
  durationSeconds: number | null;
  audience: string | null;
  goal: string;
  assetType: "video" | "image" | "avatar" | "email" | "social";
  needsVideo: boolean;
  needsImage: boolean;
  needsAvatar: boolean;
  needsEmail: boolean;
  needsSocial: boolean;
};

export function inferMarketingRequest(prompt: string): InferredMarketingRequest {
  const input = prompt.trim();
  const platform = PLATFORM_KEYWORDS.find((k) => k.pattern.test(input))?.value ?? "Facebook";
  const format = FORMAT_KEYWORDS.find((k) => k.pattern.test(input))?.value ?? "post";
  const goal = GOAL_KEYWORDS.find((k) => k.pattern.test(input))?.value ?? "signups";
  const durationMatch = input.match(/(\d{1,3})\s*(?:sec|secs|second|seconds|s)\b/i);
  const durationSeconds = durationMatch ? Number(durationMatch[1]) : null;

  const audienceMatch =
    input.match(/for\s+([^,.!]+)/i)?.[1]?.trim() ??
    input.match(/to\s+([^,.!]+)/i)?.[1]?.trim() ??
    null;

  const needsAvatar = format === "avatar video" || /\bavatar\b/i.test(input);
  const needsVideo = needsAvatar || format === "video" || format === "reel" || format === "short";
  const needsImage = format === "image" || /\bimage|graphic|poster\b/i.test(input);
  const needsEmail = platform === "Email" || format === "email";
  const needsSocial = !needsEmail;
  const assetType = needsAvatar
    ? "avatar"
    : needsVideo
      ? "video"
      : needsImage
        ? "image"
        : needsEmail
          ? "email"
          : "social";

  return {
    platform,
    format,
    durationSeconds,
    audience,
    goal,
    assetType,
    needsVideo,
    needsImage,
    needsAvatar,
    needsEmail,
    needsSocial,
  };
}
