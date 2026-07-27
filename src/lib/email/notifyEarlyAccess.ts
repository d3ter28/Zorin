import { Resend } from "resend";

export async function notifyEarlyAccess(entry: {
  name: string;
  email: string;
  storeUrl: string | null;
  message: string | null;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const notifyTo = process.env.EARLY_ACCESS_NOTIFY_EMAIL;
  if (!apiKey || !notifyTo) return;

  const resend = new Resend(apiKey);

  await resend.emails.send({
    from: "Zorin <onboarding@resend.dev>",
    to: notifyTo,
    subject: `New early access request — ${entry.name}`,
    text: [
      `Name: ${entry.name}`,
      `Email: ${entry.email}`,
      `Store URL: ${entry.storeUrl ?? "—"}`,
      `Message: ${entry.message ?? "—"}`,
    ].join("\n"),
  });
}
