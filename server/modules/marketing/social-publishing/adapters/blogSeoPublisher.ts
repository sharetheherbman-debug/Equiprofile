import { createPlatformPublisherStub } from "./basePublisherStub";

export const blogSeoPublisher = createPlatformPublisherStub({
  platform: "Blog / SEO",
  requiredScopes: ["cms.write"],
});
