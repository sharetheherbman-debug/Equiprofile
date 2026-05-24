import type { GrowthEngineAdapter } from "./types";

const adapters = new Map<string, GrowthEngineAdapter>();

export const EquiProfileAdapter: GrowthEngineAdapter = {
  id: "equiprofile",
  appName: "EquiProfile",
  appSlug: "equiprofile",
  branding: {
    primaryColor: "#1e3a5f",
    accentColor: "#c5a55a",
    logoPath: "/logo.png",
    domainHint: "equiprofile.online",
  },
  onboardingTypes: ["horse_owner", "stable", "school", "teacher"],
  tenantModel: {
    defaultType: "individual",
    supportedTypes: ["individual", "stable", "school", "academy"],
  },
  planModel: {
    defaultPlan: "pro",
    supportedPlans: ["pro", "stable", "student", "teacher", "school_owner"],
  },
  featureFlags: {
    growthEngineEnabled: true,
    socialFoundationsEnabled: true,
    lifecycleAutomationEnabled: true,
    referralEngineEnabled: true,
  },
  contentTone: {
    voice: "professional_equestrian",
    region: "uk",
  },
  aiContext: {
    domain: "equestrian_management",
    safetyFocus: [
      "no_fake_endorsements",
      "no_medical_claims",
      "no_unsafe_riding_instructions",
    ],
  },
  lifecycleTriggers: [
    "signup_completed",
    "onboarding_started",
    "onboarding_incomplete_48h",
    "onboarding_completed",
    "first_horse_added",
    "stable_created",
    "school_profile_created",
    "inactive_7d",
    "referral_invite_sent",
  ],
};

adapters.set(EquiProfileAdapter.id, EquiProfileAdapter);

export function registerGrowthEngineAdapter(adapter: GrowthEngineAdapter) {
  adapters.set(adapter.id, adapter);
}

export function getGrowthEngineAdapter(id: string) {
  return adapters.get(id);
}

export function listGrowthEngineAdapters() {
  return [...adapters.values()];
}
