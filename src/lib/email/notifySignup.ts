import { Resend } from "resend";

export async function notifySignup(entry: {
  email: string;
  storeName: string;
  planTier: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const notifyTo = process.env.EARLY_ACCESS_NOTIFY_EMAIL;
  if (!apiKey || !notifyTo) return;

  const resend = new Resend(apiKey);

  await resend.emails.send({
    from: "Zorin <onboarding@resend.dev>",
    to: notifyTo,
    subject: `New Zorin signup — ${entry.storeName}`,
    text: [
      `Store: ${entry.storeName}`,
      `Email: ${entry.email}`,
      `Plan: ${entry.planTier}`,
    ].join("\n"),
  });
}
