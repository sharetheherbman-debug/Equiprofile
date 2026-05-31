import { blogSeoPublisher } from "./adapters/blogSeoPublisher";
import { emailPublisher } from "./adapters/emailPublisher";
import { facebookPublisher } from "./adapters/facebookPublisher";
import { instagramPublisher } from "./adapters/instagramPublisher";
import { linkedinPublisher } from "./adapters/linkedinPublisher";
import { tiktokPublisher } from "./adapters/tiktokPublisher";
import { youtubePublisher } from "./adapters/youtubePublisher";
import type { SocialConnectionState, SocialPublisherAdapter, SocialPublisherPlatform } from "./socialPublisherTypes";

const KNOWN_ADAPTERS: SocialPublisherAdapter[] = [
  facebookPublisher,
  instagramPublisher,
  tiktokPublisher,
  linkedinPublisher,
  youtubePublisher,
  emailPublisher,
  blogSeoPublisher,
];
// Truthful default remains canPublish: false and readinessStatus: "setup_needed" until a real credential-backed adapter is wired.

const registry = new Map<SocialPublisherPlatform, SocialPublisherAdapter>(
  KNOWN_ADAPTERS.map((adapter) => [adapter.platform, adapter]),
);

export function registerSocialPublisher(adapter: SocialPublisherAdapter): void {
  registry.set(adapter.platform, adapter);
}

export function getSocialPublisher(platform: SocialPublisherPlatform): SocialPublisherAdapter {
  const adapter = registry.get(platform);
  if (!adapter) throw new Error(`Unknown social publisher adapter for ${platform}`);
  return adapter;
}

export function canDirectPost(platform: SocialPublisherPlatform, connection: SocialConnectionState | null): boolean {
  return getSocialPublisher(platform).canPublishWithConnection(connection);
}

export function listPublisherReadiness(input?: {
  connections?: Partial<Record<SocialPublisherPlatform, SocialConnectionState | null>>;
}) {
  return Array.from(registry.keys()).map((platform) => {
    const adapter = getSocialPublisher(platform);
    const connection = input?.connections?.[platform] ?? null;
    const readiness = adapter.validateConnection(connection);
    return {
      platform,
      canPublish: readiness.canPublish,
      readinessStatus: readiness.readinessStatus,
      reason: readiness.reason,
      requiredScopes: adapter.getRequiredScopes(),
    };
  });
}
