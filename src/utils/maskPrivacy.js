/**
 * Masks sensitive buyer contact information for Seller Center views
 * in accordance with Shopee's buyer privacy policy.
 */
export function maskPhone(phone) {
  if (!phone || phone === "—") return "—";
  const str = String(phone).trim();
  if (str.length <= 4) return "*****";
  if (str.length <= 7) {
    return `${str.slice(0, 2)}*****${str.slice(-2)}`;
  }
  return `${str.slice(0, 3)}*****${str.slice(-2)}`;
}

export function maskAddress(address) {
  if (!address || address === "—") return "—";
  const str = String(address).trim();
  const parts = str.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const first = parts[0];
    const maskedFirst = first.length > 3 ? `${first.slice(0, 3)}*****` : "*****";
    return `${maskedFirst}, ${parts.slice(1).join(", ")}`;
  }
  if (str.length <= 8) return "*****";
  return `${str.slice(0, 4)}*****${str.slice(-4)}`;
}
