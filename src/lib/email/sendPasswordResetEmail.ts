import { Resend } from "resend";

// Fire-and-forget, same convention as notifyEarlyAccess.ts — a failed send
// is logged but never surfaces to the caller, since the forgot-password
// route always returns a generic { ok: true } regardless.
export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  const resend = new Resend(apiKey);
  try {
    await resend.emails.send({
      from: "Zorin <onboarding@resend.dev>",
      to,
      subject: "Reset your Zorin password",
      text: [
        "Click the link below to reset your Zorin password. This link expires in 1 hour.",
        "",
        resetUrl,
        "",
        "If you didn't request this, you can safely ignore this email.",
      ].join("\n"),
    });
  } catch (err) {
    console.error("Failed to send password reset email:", err);
  }
}
