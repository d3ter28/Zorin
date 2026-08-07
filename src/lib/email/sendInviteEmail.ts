import { Resend } from "resend";

export async function sendInviteEmail(to: string, merchantName: string, inviteUrl: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  const resend = new Resend(apiKey);
  await resend.emails.send({
    from: "Zorin <onboarding@resend.dev>",
    to,
    subject: `${merchantName} invited you to Zorin`,
    text: [
      `You've been invited to join ${merchantName} on Zorin.`,
      "",
      "Click the link below to accept. This link expires in 7 days.",
      "",
      inviteUrl,
      "",
      "If you weren't expecting this, you can safely ignore this email.",
    ].join("\n"),
  });
}
