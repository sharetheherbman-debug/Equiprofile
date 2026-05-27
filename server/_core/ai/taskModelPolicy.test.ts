import { describe, expect, it } from "vitest";
import {
  allowedTasksForGenXModel,
  compareCandidatesByTaskPolicy,
  modelDisallowReasonForTask,
  validateTaskInputForModel,
} from "./taskModelPolicy";

describe("taskModelPolicy", () => {
  it("never classifies avatar or i2v models as text_to_video", () => {
    expect(allowedTasksForGenXModel("kling-avatar-v2-pro")).not.toContain("text_to_video");
    expect(allowedTasksForGenXModel("seedance-i2v-pro")).not.toContain("text_to_video");
    expect(modelDisallowReasonForTask("text_to_video", "kling-avatar-v2-pro")).toContain("Avatar models");
    expect(modelDisallowReasonForTask("text_to_video", "seedance-i2v-pro")).toContain("Image-to-video models");
  });

  it("prefers kling-v2.5-turbo for text_to_video when available", () => {
    const candidates = [
      { id: "veo-3.1-fast", suitabilityScore: 0.99 },
      { id: "kling-v2.5-turbo", suitabilityScore: 0.1 },
      { id: "pixverse-v6", suitabilityScore: 0.7 },
    ].sort((a, b) => compareCandidatesByTaskPolicy("text_to_video", a, b));

    expect(candidates[0].id).toBe("kling-v2.5-turbo");
  });

  it("requires image_url for avatar and image-to-video tasks", () => {
    expect(validateTaskInputForModel("avatar_video", "kling-avatar-v2-pro", { prompt: "hello" })).toMatchObject({ ok: false, code: "setup_needed" });
    expect(validateTaskInputForModel("image_to_video", "seedance-i2v-pro", { prompt: "hello" })).toMatchObject({ ok: false, code: "setup_needed" });
    expect(validateTaskInputForModel("avatar_video", "kling-avatar-v2-pro", { image_url: "https://example.com/horse.png" })).toEqual({ ok: true });
  });

  it("does not treat gpt-5.4 as playable media", () => {
    expect(modelDisallowReasonForTask("text_to_video", "gpt-5.4")).toContain("Text/chat models");
  });
});
