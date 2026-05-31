import { createPlatformPublisherStub } from "./basePublisherStub";

export const youtubePublisher = createPlatformPublisherStub({
  platform: "YouTube",
  requiredScopes: ["youtube.upload"],
});
