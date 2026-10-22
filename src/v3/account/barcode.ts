/** Same rule as the server: UPC-A, EAN-8, EAN-13 / JAN and GTIN-14, with a correct check digit. */
const LENGTHS = new Set([8, 12, 13, 14]);

export function cleanBarcode(raw: string): string | null {
  const digits = raw.replace(/[\s-]/g, "");
  if (!/^\d+$/.test(digits) || !LENGTHS.has(digits.length)) return null;
  let sum = 0;
  for (let i = digits.length - 2, weight = 3; i >= 0; i--, weight = weight === 3 ? 1 : 3) sum += Number(digits[i]) * weight;
  return (10 - (sum % 10)) % 10 === Number(digits[digits.length - 1]) ? digits : null;
}
