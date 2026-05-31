import { createPlatformPublisherStub } from "./basePublisherStub";

export const tiktokPublisher = createPlatformPublisherStub({
  platform: "TikTok",
  requiredScopes: ["video.publish"],
});
