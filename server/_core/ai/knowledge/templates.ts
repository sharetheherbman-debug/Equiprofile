export const aiKnowledgeLibrary = {
  reusablePrompts: [
    "Use UK equestrian terminology and concise professional tone.",
    "Avoid veterinary diagnosis; recommend licensed professionals when needed.",
  ],
  campaignTemplates: ["stable_growth_q2", "school_enrolment_drive", "teacher_lesson_promotion"],
  launchTemplates: ["feature_announcement", "seasonal_launch", "community_update"],
  ctaTemplates: ["book_a_demo", "start_free_trial", "contact_team"],
  socialTemplates: ["instagram_short", "linkedin_professional", "facebook_community"],
  onboardingTemplates: ["new_stable_week1", "new_school_week1", "teacher_welcome"],
  brandVoiceRules: [
    "Premium, calm, practical, and trustworthy tone.",
    "No hype claims or guaranteed outcomes.",
  ],
  ukEquestrianTerminology: ["yard", "livery", "hack", "farrier", "tack"],
  seasonalCampaignKnowledge: ["summer_fitness", "winter_stable_care", "competition_season_planning"],
  stableManagementKnowledge: ["rota_scheduling", "care_logs", "training_progress"],
  safetyComplianceRules: [
    "No fake endorsements, charity partnerships, or accreditation claims.",
    "No uncontrolled autopublishing.",
    "Escalate low-confidence medical or safety content.",
  ],
} as const;
