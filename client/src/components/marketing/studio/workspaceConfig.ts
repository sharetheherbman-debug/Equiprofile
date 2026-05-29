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
  marketing_workspace_id: string;
  host_app_id: string;
  host_app_name: string;
  host_app_domain: string;
  brand_kit_id: string;
  /** Stable app identifier used for reusable Marketing Studio embedding */
  appId: string;
  /** Tenant/workspace identifier used by backend jobs and assets */
  tenantId: string;
  /** Display name of the app or product */
  appName: string;
  /** Public brand name used in generated marketing context */
  brandName: string;
  /** Industry vertical (e.g. "equestrian management", "fitness", "education") */
  industry: string;
  /** Default audience description */
  defaultAudience: string;
  /** Default voice/tone description for AI prompts and media jobs */
  defaultTone: string;
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
  /** Storage namespace for generated assets */
  assetNamespace: string;
  /** Storage prefix for generated assets */
  storagePrefix: string;
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
  marketing_workspace_id: "equiprofile-global",
  host_app_id: "equiprofile",
  host_app_name: "EquiProfile",
  host_app_domain: "equiprofile.com",
  brand_kit_id: "equiprofile-default-brand-kit",
  appId: "equiprofile",
  tenantId: "global",
  appName: "EquiProfile",
  brandName: "EquiProfile",
  industry: "equestrian management",
  defaultAudience: "stable owners, riding school operators and horse owners in the UK",
  defaultTone: "premium, practical and helpful",
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
  assetNamespace: "equiprofile",
  storagePrefix: "marketing/equiprofile/global",
  contentExamples: [
    "Create a horse video introducing EquiProfile",
    "Get me 50 signups this month",
    "Create a 7-day YouTube Shorts campaign",
    "Build a Facebook relaunch campaign",
    "Create a LinkedIn authority post for stable owners",
    "Create an email campaign for inactive trials",
  ],
};
