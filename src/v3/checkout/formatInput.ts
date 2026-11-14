/**
 * Formatting as the shopper types, for checkout and the welcome step. Only Canadian/US numbers and codes are shaped; anything else
 * (an international phone number, say) is left exactly as typed. The server accepts both shapes.
 */

/** "4165550123" → "416-555-0123", "14165550123" → "+1 416-555-0123". Grows as digits are typed, so deleting still works. */
export function formatPhone(raw: string): string {
  const trimmed = raw.trimStart();
  // another country's number (+44 …): leave it alone
  if (trimmed.startsWith("+") && !trimmed.startsWith("+1")) return raw;
  let digits = raw.replace(/\D/g, "");
  // area codes never start with 1, so a leading 1 is the country code
  const withCountry = digits.startsWith("1");
  if (withCountry) digits = digits.slice(1);
  // longer than a North American number (an extension, a typo): don't guess
  if (digits.length > 10) return raw;
  const parts = [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6, 10)].filter(Boolean);
  const number = parts.join("-");
  // "+1" alone (no trailing space) so backspace can still delete it
  return withCountry ? (number ? `+1 ${number}` : "+1") : number;
}

/** Canada: "m5h2n2" → "M5H 2N2". US: "123456789" → "12345-6789". Extra characters are dropped. */
export function formatPostal(raw: string, country: "CA" | "US"): string {
  if (country === "CA") {
    const s = raw
      .replace(/[^A-Za-z0-9]/g, "")
      .toUpperCase()
      .slice(0, 6);
    return s.length > 3 ? `${s.slice(0, 3)} ${s.slice(3)}` : s;
  }
  const d = raw.replace(/\D/g, "").slice(0, 9);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

/**
 * Checkout's phone box sits after a fixed "+1" (Canada and the US share it), so the box holds only the local number: a pasted or
 * autofilled "+1 416 555 0123" shows as "416-555-0123". Other countries' numbers are left as typed.
 */
export const localPhone = (raw: string) => formatPhone(raw).replace(/^\+1 ?/, "");

/** What is saved with the order: "+1 416-555-0123" for a full Canadian/US number; anything else as typed; empty for none. */
export function phoneWithCountry(local: string): string | undefined {
  const t = local.trim();
  if (!t) return undefined;
  return /^\d{3}-\d{3}-\d{4}$/.test(t) ? `+1 ${t}` : t;
}
