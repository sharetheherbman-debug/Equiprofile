import { createPlatformPublisherStub } from "./basePublisherStub";

export const instagramPublisher = createPlatformPublisherStub({
  platform: "Instagram",
  requiredScopes: ["instagram_content_publish", "instagram_basic"],
});
