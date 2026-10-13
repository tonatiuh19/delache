import { describe, expect, it } from "vitest";
import {
  locationCaptureStrategy,
  shouldSkipModalAndCapture,
} from "./locationPermissionRules";

describe("locationPermissionRules", () => {
  it("idles when viewer cannot edit or coords already set", () => {
    expect(
      locationCaptureStrategy({
        permission: "prompt",
        hasCoords: false,
        canEdit: false,
        dismissedPrompt: false,
      }),
    ).toBe("idle");
    expect(
      locationCaptureStrategy({
        permission: "granted",
        hasCoords: true,
        canEdit: true,
        dismissedPrompt: false,
      }),
    ).toBe("idle");
  });

  it("auto-captures when permission already granted and GPS missing", () => {
    expect(
      locationCaptureStrategy({
        permission: "granted",
        hasCoords: false,
        canEdit: true,
        dismissedPrompt: false,
      }),
    ).toBe("auto_capture");
  });

  it("shows modal on prompt/unknown unless dismissed", () => {
    expect(
      locationCaptureStrategy({
        permission: "prompt",
        hasCoords: false,
        canEdit: true,
        dismissedPrompt: false,
      }),
    ).toBe("show_modal");
    expect(
      locationCaptureStrategy({
        permission: "unknown",
        hasCoords: false,
        canEdit: true,
        dismissedPrompt: true,
      }),
    ).toBe("idle");
  });

  it("blocks when browser denied location", () => {
    expect(
      locationCaptureStrategy({
        permission: "denied",
        hasCoords: false,
        canEdit: true,
        dismissedPrompt: false,
      }),
    ).toBe("blocked");
  });

  it("skips modal on explicit capture when already granted", () => {
    expect(shouldSkipModalAndCapture("granted")).toBe(true);
    expect(shouldSkipModalAndCapture("prompt")).toBe(false);
  });
});
