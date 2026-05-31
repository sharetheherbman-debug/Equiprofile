import { createPlatformPublisherStub } from "./basePublisherStub";

export const emailPublisher = createPlatformPublisherStub({
  platform: "Email",
  requiredScopes: ["smtp.send"],
});
