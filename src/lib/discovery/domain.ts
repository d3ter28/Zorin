// Turn user input or a URL into a canonical comparable domain.
// Lowercase, no protocol, no "www.", no path/port. Null when unparseable.
export function normalizeDomain(input: string): string | null {
  const trimmed = input.trim().toLowerCase();
  if (trimmed === "") return null;
  let host: string;
  try {
    // Prepend a scheme when missing so URL() can parse bare domains.
    host = new URL(trimmed.includes("://") ? trimmed : `http://${trimmed}`).hostname;
  } catch {
    return null;
  }
  if (host.startsWith("www.")) host = host.slice(4);
  // Require at least one dot and no spaces — "nodot" or free text is not a domain.
  if (!host.includes(".") || /\s/.test(host)) return null;
  return host;
}
