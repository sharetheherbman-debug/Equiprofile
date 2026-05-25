export type CampaignTemplate = {
  id: string;
  name: string;
  contentCadence: string;
  platformMix: string[];
  deliverables: string[];
  schedulingLogic: string;
  ctaStyle: string;
  aiWorkflowChain: string[];
};

const templates: CampaignTemplate[] = [
  {
    id: "stable_launch_campaign",
    name: "Stable launch campaign",
    contentCadence: "14-day launch",
    platformMix: ["Facebook", "Instagram", "Email"],
    deliverables: ["reels", "static_posts", "email_sequence"],
    schedulingLogic: "approval-first, weekday windows, launch-day burst",
    ctaStyle: "book_demo",
    aiWorkflowChain: ["launch_campaign", "reel_generation", "email_campaign"],
  },
  {
    id: "riding_school_campaign",
    name: "Riding school campaign",
    contentCadence: "weekly",
    platformMix: ["Facebook", "Instagram", "Google Business"],
    deliverables: ["lesson_spotlight", "testimonial_style_post", "cta_update"],
    schedulingLogic: "parent-traffic evening slots",
    ctaStyle: "book_lesson",
    aiWorkflowChain: ["content_generation", "social_pack_generation"],
  },
  {
    id: "academy_launch_campaign",
    name: "Academy launch campaign",
    contentCadence: "21-day launch",
    platformMix: ["LinkedIn", "YouTube", "Email"],
    deliverables: ["thought_leadership_posts", "video_shorts", "nurture_emails"],
    schedulingLogic: "staggered multi-channel sequencing",
    ctaStyle: "apply_now",
    aiWorkflowChain: ["launch_campaign", "educational_campaign", "email_campaign"],
  },
  {
    id: "weekly_social_pack",
    name: "Weekly social pack",
    contentCadence: "weekly",
    platformMix: ["Facebook", "Instagram", "TikTok", "LinkedIn"],
    deliverables: ["hooks", "captions", "hashtags", "creative_briefs"],
    schedulingLogic: "best-time recommendations per platform",
    ctaStyle: "learn_more",
    aiWorkflowChain: ["social_pack_generation"],
  },
  {
    id: "email_nurture_campaign",
    name: "Email nurture campaign",
    contentCadence: "5-part sequence",
    platformMix: ["Email"],
    deliverables: ["subject_lines", "email_bodies", "followups"],
    schedulingLogic: "triggered drip with suppression-safe windows",
    ctaStyle: "start_trial",
    aiWorkflowChain: ["email_campaign"],
  },
  {
    id: "product_launch",
    name: "Product launch",
    contentCadence: "10-day rollout",
    platformMix: ["Facebook", "YouTube", "Email"],
    deliverables: ["teaser_video", "launch_video", "announcement_email"],
    schedulingLogic: "countdown sequence",
    ctaStyle: "start_trial",
    aiWorkflowChain: ["launch_campaign", "reel_generation", "email_campaign"],
  },
  {
    id: "reactivation_campaign",
    name: "Reactivation campaign",
    contentCadence: "2-week revival",
    platformMix: ["Email", "Facebook"],
    deliverables: ["winback_email", "reminder_post", "offer_post"],
    schedulingLogic: "segment by inactivity and urgency",
    ctaStyle: "come_back_offer",
    aiWorkflowChain: ["content_generation", "email_campaign"],
  },
  {
    id: "referral_campaign",
    name: "Referral campaign",
    contentCadence: "ongoing",
    platformMix: ["Email", "Instagram", "Facebook"],
    deliverables: ["referral_post", "referral_email", "reward_cta"],
    schedulingLogic: "monthly referral cycle",
    ctaStyle: "refer_friend",
    aiWorkflowChain: ["content_generation", "email_campaign"],
  },
  {
    id: "youtube_growth_campaign",
    name: "YouTube growth campaign",
    contentCadence: "weekly",
    platformMix: ["YouTube", "LinkedIn"],
    deliverables: ["shorts", "long_outline", "thumbnail_briefs"],
    schedulingLogic: "series cadence + community posts",
    ctaStyle: "subscribe",
    aiWorkflowChain: ["educational_campaign", "reel_generation"],
  },
  {
    id: "tiktok_reel_growth_campaign",
    name: "TikTok/Reel growth campaign",
    contentCadence: "5x/week",
    platformMix: ["TikTok", "Instagram", "Facebook"],
    deliverables: ["short_video_scripts", "hooks", "caption_sets"],
    schedulingLogic: "high-frequency short-form testing",
    ctaStyle: "follow_for_more",
    aiWorkflowChain: ["reel_generation", "autopilot_growth"],
  },
];

export function listCampaignTemplates(): CampaignTemplate[] {
  return templates;
}

export function getCampaignTemplate(id: string): CampaignTemplate | undefined {
  return templates.find((template) => template.id === id);
}
