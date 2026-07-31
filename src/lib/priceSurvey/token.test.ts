import { describe, it, expect } from "vitest";
import { generateSurveyToken } from "./token";

describe("generateSurveyToken", () => {
  it("returns a 64-character hex string", () => {
    expect(generateSurveyToken()).toMatch(/^[0-9a-f]{64}$/);
  });

  it("returns a different value on each call", () => {
    expect(generateSurveyToken()).not.toBe(generateSurveyToken());
  });
});
