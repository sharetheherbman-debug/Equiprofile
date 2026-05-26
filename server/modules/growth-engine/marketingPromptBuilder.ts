export function buildMarketingGenerationPrompt(input: {
  platform: string;
  format: string;
  goal: string;
  tone: string;
  durationSeconds?: number | null;
  intent?: string;
  userPrompt: string;
  brandContext?: string;
  avatarContext?: string;
  platformRulesContext?: string;
}) {
  return [
    "Return STRICT JSON only.",
    "Required keys: title, platform, format, durationSeconds, audience, goal, strategy, hook, script, shotList (array), caption, cta, hashtags (array), visualDirection, voiceoverScript, recommendedSchedule, complianceNotes, growthScore, mediaPlan, nextActions (array).",
    "For a reel/video request, make script match the requested duration and include a practical storyboard/shot list.",
    "Keep content realistic, approval-first, no direct publishing.",
    `Platform: ${input.platform}`,
    `Format: ${input.format}`,
    input.intent ? `Product intent: ${input.intent}` : "",
    input.durationSeconds ? `Duration seconds: ${input.durationSeconds}` : "",
    `Goal: ${input.goal}`,
    `Tone: ${input.tone}`,
    input.brandContext ? `Brand context:\n${input.brandContext}` : "",
    input.avatarContext ? `Avatar identity:\n${input.avatarContext}` : "",
    input.platformRulesContext ? input.platformRulesContext : "",
    `User request: ${input.userPrompt}`,
  ]
    .filter(Boolean)
    .join("\n");
}
