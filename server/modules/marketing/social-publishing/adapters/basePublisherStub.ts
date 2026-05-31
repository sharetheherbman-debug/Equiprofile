import type { SocialConnectionState, SocialPublisherAdapter, SocialPublisherPlatform, SocialPublishPayload, SocialPublishResult, SocialPublisherValidationResult } from "../socialPublisherTypes";

function validateConnectionState(connection: SocialConnectionState | null) {
  if (!connection) return { canPublish: false, readinessStatus: "setup_needed" as const, reason: "setup_needed" };
  if (connection.status === "token_expired") return { canPublish: false, readinessStatus: "token_expired" as const, reason: "token_expired" };
  if (connection.status === "permission_missing") return { canPublish: false, readinessStatus: "permission_missing" as const, reason: "permission_missing" };
  if (connection.status === "disabled") return { canPublish: false, readinessStatus: "disabled" as const, reason: "disabled" };
  if (connection.status === "ready_for_posting") return { canPublish: true, readinessStatus: "ready_for_posting" as const, reason: "ready" };
  if (connection.status === "connected") return { canPublish: false, readinessStatus: "connected" as const, reason: "connected_but_not_ready" };
  return { canPublish: false, readinessStatus: "setup_needed" as const, reason: "setup_needed" };
}

export function createPlatformPublisherStub(input: {
  platform: SocialPublisherPlatform;
  requiredScopes: string[];
}): SocialPublisherAdapter {
  return {
    platform: input.platform,
    canPublish: false,
    readinessStatus: "setup_needed",
    requiredScopes: [...input.requiredScopes],
    reason: "setup_needed",
    getRequiredScopes: () => [...input.requiredScopes],
    validateConnection(connection: SocialConnectionState | null) {
      const base = validateConnectionState(connection);
      if (base.readinessStatus === "ready_for_posting") {
        const scopes = connection?.scopes ?? [];
        const missing = input.requiredScopes.filter((scope) => !scopes.includes(scope));
        if (missing.length > 0) {
          return { canPublish: false, readinessStatus: "permission_missing", reason: `missing_scopes:${missing.join(",")}` };
        }
      }
      return base;
    },
    validatePayload(payload: SocialPublishPayload): SocialPublisherValidationResult {
      const errors: string[] = [];
      if (payload.reviewStatus !== "approved") errors.push("draft_not_approved");
      if (!payload.content && !payload.videoUrl && !(payload.imageUrls ?? []).length) errors.push("empty_payload");
      return { valid: errors.length === 0, errors, warnings: [] };
    },
    canPublishWithConnection(connection: SocialConnectionState | null): boolean {
      return this.validateConnection(connection).canPublish;
    },
    async publishApprovedDraft(_payload: SocialPublishPayload): Promise<SocialPublishResult> {
      return {
        success: false,
        reason: `setup_needed: ${input.platform} adapter requires real credentials and API wiring before posting`,
      };
    },
    async getPostStatus(_id: string) {
      return { status: "unknown", reason: "setup_needed" };
    },
  };
}
