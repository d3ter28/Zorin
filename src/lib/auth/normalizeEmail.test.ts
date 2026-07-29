import { describe, expect, it } from "vitest";
import { normalizeEmail } from "./normalizeEmail";

describe("normalizeEmail", () => {
  it("trims and lowercases", () => {
    expect(normalizeEmail("  You@Example.com  ")).toBe("you@example.com");
  });

  it("strips +tag addressing on any provider", () => {
    expect(normalizeEmail("you+trial@example.com")).toBe("you@example.com");
    expect(normalizeEmail("you+1+2@outlook.com")).toBe("you@outlook.com");
  });

  it("strips dots from the local part on gmail.com and googlemail.com only", () => {
    expect(normalizeEmail("y.o.u@gmail.com")).toBe("you@gmail.com");
    expect(normalizeEmail("y.o.u@googlemail.com")).toBe("you@googlemail.com");
    expect(normalizeEmail("john.doe@example.com")).toBe("john.doe@example.com");
  });

  it("combines dot-stripping and +tag-stripping for gmail", () => {
    expect(normalizeEmail("Y.O.U+trial@Gmail.com")).toBe("you@gmail.com");
  });

  it("returns the trimmed/lowercased input unchanged when there's no @", () => {
    expect(normalizeEmail("not-an-email")).toBe("not-an-email");
  });
});
