const GMAIL_DOMAINS = new Set(["gmail.com", "googlemail.com"]);

/**
 * Canonicalizes an email address so common alias tricks (Gmail dot/plus
 * variants, generic +tag addressing on other providers) can't be used to
 * register multiple accounts against the same inbox — e.g.
 * "y.o.u+trial@gmail.com" and "you@gmail.com" both normalize to the same
 * value. Used consistently at signup, login, and password reset so lookups
 * always agree on the canonical form.
 */
export function normalizeEmail(raw: string): string {
  const trimmed = raw.trim().toLowerCase();
  const at = trimmed.lastIndexOf("@");
  if (at === -1) return trimmed;

  let local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);

  const plusIdx = local.indexOf("+");
  if (plusIdx !== -1) local = local.slice(0, plusIdx);

  // Dot-insensitivity is a Gmail/Google Workspace-specific quirk — stripping
  // dots for other providers would incorrectly merge distinct mailboxes.
  if (GMAIL_DOMAINS.has(domain)) local = local.replace(/\./g, "");

  return `${local}@${domain}`;
}
