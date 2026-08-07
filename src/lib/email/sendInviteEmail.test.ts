import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const send = vi.fn();
vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(function Resend() {
    return { emails: { send } };
  }),
}));

import { sendInviteEmail } from "./sendInviteEmail";

const ORIGINAL_ENV = process.env.RESEND_API_KEY;

beforeEach(() => {
  send.mockReset();
});

afterEach(() => {
  process.env.RESEND_API_KEY = ORIGINAL_ENV;
});

describe("sendInviteEmail", () => {
  it("no-ops when RESEND_API_KEY is unset", async () => {
    delete process.env.RESEND_API_KEY;
    await sendInviteEmail("teammate@example.com", "Acme Co", "https://tryzorin.com/invite/abc");
    expect(send).not.toHaveBeenCalled();
  });

  it("sends an email with the merchant name and invite link when configured", async () => {
    process.env.RESEND_API_KEY = "test-key";
    send.mockResolvedValue({});
    await sendInviteEmail("teammate@example.com", "Acme Co", "https://tryzorin.com/invite/abc");
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "teammate@example.com",
        subject: expect.stringContaining("Acme Co"),
        text: expect.stringContaining("https://tryzorin.com/invite/abc"),
      }),
    );
  });
});
