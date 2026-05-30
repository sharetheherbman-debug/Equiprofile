/**
 * Social Publisher Registry — PR50
 *
 * Registry of social publisher adapters. All providers default to
 * canPublish: false / setup_needed. Real connectors are registered in
 * PR51/PR52 once OAuth credentials and posting APIs are configured.
 */

import type {
  SocialPublisherAdapter,
  SocialPublisherPlatform,
  SocialPublishPayload,
  SocialPublisherValidationResult,
  SocialPublishResult,
} from "./socialPublisherTypes";

function makeStubAdapter(platform: SocialPublisherPlatform): SocialPublisherAdapter {
  return {
    platform,
    canPublish: false,
    readinessStatus: "setup_needed",
    requiredScopes: [],
    reason: "setup_needed",
    validatePayload(_payload: SocialPublishPayload): SocialPublisherValidationResult {
      return {
        valid: false,
        errors: [`No real posting adapter registered for ${platform}. Export manually.`],
        warnings: [],
      };
    },
    async publishApprovedDraft(_payload: SocialPublishPayload): Promise<SocialPublishResult> {
      return {
        success: false,
        reason: `No real posting connector for ${platform}. Use export pack for manual posting.`,
      };
    },
  };
}

const KNOWN_PLATFORMS: SocialPublisherPlatform[] = [
  "Facebook",
  "Instagram",
  "TikTok",
  "LinkedIn",
  "YouTube",
  "Email",
  "Blog / SEO",
];

const registry = new Map<SocialPublisherPlatform, SocialPublisherAdapter>(
  KNOWN_PLATFORMS.map((platform) => [platform, makeStubAdapter(platform)]),
);

/** Register a real adapter (called from PR51/PR52 connector modules). */
export function registerSocialPublisher(adapter: SocialPublisherAdapter): void {
  registry.set(adapter.platform, adapter);
}

/** Retrieve the adapter for a given platform. Falls back to a stub. */
export function getSocialPublisher(platform: SocialPublisherPlatform): SocialPublisherAdapter {
  return registry.get(platform) ?? makeStubAdapter(platform);
}

/** Returns true only if a real (canPublish === true) adapter is registered. */
export function canDirectPost(platform: SocialPublisherPlatform): boolean {
  return registry.get(platform)?.canPublish === true;
}

/** Returns readiness status for all registered platforms. */
export function listPublisherReadiness(): Array<{
  platform: SocialPublisherPlatform;
  canPublish: boolean;
  readinessStatus: string;
  reason: string;
}> {
  return KNOWN_PLATFORMS.map((platform) => {
    const adapter = registry.get(platform) ?? makeStubAdapter(platform);
    return {
      platform,
      canPublish: adapter.canPublish,
      readinessStatus: adapter.readinessStatus,
      reason: adapter.reason,
    };
  });
}
