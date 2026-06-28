import { describe, expect, it } from "vitest";
import { HttpError } from "./errors";
import { parseCogs, parseJsonBody } from "./validation";

describe("parseCogs", () => {
  it("returns null for null and empty string (clearing cogs)", () => {
    expect(parseCogs(null)).toBeNull();
    expect(parseCogs("")).toBeNull();
  });

  it("parses a numeric value", () => {
    expect(parseCogs(2600)).toBe(2600);
    expect(parseCogs("2600")).toBe(2600);
    expect(parseCogs(0)).toBe(0);
  });

  it("rejects negative values with a 400", () => {
    expect(() => parseCogs(-5)).toThrow(HttpError);
    try {
      parseCogs(-5);
    } catch (e) {
      expect((e as HttpError).status).toBe(400);
    }
  });

  it("rejects non-numeric values with a 400", () => {
    expect(() => parseCogs("abc")).toThrow(HttpError);
    expect(() => parseCogs(undefined)).toThrow(HttpError);
    expect(() => parseCogs(NaN)).toThrow(HttpError);
  });
});

describe("parseJsonBody", () => {
  it("returns the parsed object", async () => {
    const req = { json: async () => ({ cogs: 100 }) };
    await expect(parseJsonBody(req)).resolves.toEqual({ cogs: 100 });
  });

  it("throws a 400 when the body is not valid JSON", async () => {
    const req = {
      json: async () => {
        throw new SyntaxError("Unexpected end of JSON input");
      },
    };
    await expect(parseJsonBody(req)).rejects.toMatchObject({ status: 400 });
  });

  it("throws a 400 when the body is not an object", async () => {
    const req = { json: async () => 42 };
    await expect(parseJsonBody(req)).rejects.toMatchObject({ status: 400 });
  });
});
