import { createPlatformPublisherStub } from "./basePublisherStub";

export const linkedinPublisher = createPlatformPublisherStub({
  platform: "LinkedIn",
  requiredScopes: ["w_member_social"],
});
