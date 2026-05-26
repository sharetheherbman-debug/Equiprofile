/**
 * workspaceConfig.ts
 *
 * App-agnostic workspace configuration for Marketing Studio.
 * This file defines the context that makes the Studio work for ANY product or brand
 * without hardcoding equestrian or product-specific references in components.
 *
 * To adapt for a new product, update only this file.
 */

export interface WorkspaceConfig {
  /** Display name of the app or product */
  appName: string;
  /** Industry vertical (e.g. "equestrian management", "fitness", "education") */
  industry: string;
  /** Default audience description */
  defaultAudience: string;
  /** Primary growth goals the business cares about */
  defaultGoals: string[];
  /** Primary call-to-action phrase */
  primaryCTA: string;
  /** Default brand tone */
  brandTone: "warm" | "professional" | "authoritative" | "playful" | "bold";
  /** Platforms enabled for content creation and publishing */
  supportedPlatforms: SupportedPlatformId[];
  /** Default presenter/avatar name */
  defaultPresenter: string;
  /** Sample content prompts shown to users on the Create screen */
  contentExamples: string[];
}

export type SupportedPlatformId =
  | "facebook-pages"
  | "instagram-business"
  | "tiktok-business"
  | "youtube-shorts"
  | "youtube-long-form"
  | "linkedin-company-pages"
  | "google-business-profile"
  | "email"
  | "blog-seo";

/**
 * Canonical workspace configuration for EquiProfile.
 * Update this object to re-skin the Studio for a different app.
 */
export const workspaceConfig: WorkspaceConfig = {
  appName: "EquiProfile",
  industry: "equestrian management",
  defaultAudience: "stable owners, riding school operators and horse owners in the UK",
  defaultGoals: [
    "Get 50 signups this month",
    "Grow social following",
    "Promote the academy",
    "Launch a new feature",
    "Reactivate inactive trials",
  ],
  primaryCTA: "Start your free trial",
  brandTone: "warm",
  supportedPlatforms: [
    "facebook-pages",
    "instagram-business",
    "tiktok-business",
    "youtube-shorts",
    "youtube-long-form",
    "linkedin-company-pages",
    "google-business-profile",
    "email",
    "blog-seo",
  ],
  defaultPresenter: "Growth Coach",
  contentExamples: [
    "Create a horse video introducing EquiProfile",
    "Get me 50 signups this month",
    "Create a 7-day YouTube Shorts campaign",
    "Build a Facebook relaunch campaign",
    "Create a LinkedIn authority post for stable owners",
    "Create an email campaign for inactive trials",
  ],
};
