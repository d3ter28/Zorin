import { randomBytes } from "node:crypto";

/** Generates an unguessable token for a survey's public URL — not a sequential id, so a stranger can't enumerate a merchant's other surveys. */
export function generateSurveyToken(): string {
  return randomBytes(32).toString("hex");
}
