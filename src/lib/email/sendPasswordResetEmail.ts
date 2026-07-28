import { Resend } from "resend";

// No internal try/catch here — matches notifyEarlyAccess.ts: this function
// returns a plain promise, and the caller is responsible for not awaiting
// it and catching failures, so a slow or failing send never blocks or
// changes the timing of the route's response (which must stay
// constant-time regardless of whether the email actually exists, to avoid
// leaking account existence via response latency).
export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  const resend = new Resend(apiKey);
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
}
