import { createPlatformPublisherStub } from "./basePublisherStub";

export const facebookPublisher = createPlatformPublisherStub({
  platform: "Facebook",
  requiredScopes: ["pages_manage_posts", "pages_read_engagement"],
});
