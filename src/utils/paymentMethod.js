/**
 * Formats a raw payment_method value from the backend or mock order
 * into a consistent Vietnamese display label for Seller Center and order modals.
 */
export function formatPaymentMethod(method) {
  if (!method) return "Ví ShopeePay";
  const normalized = String(method).trim();
  if (/\bcod\b|cash on delivery|thanh toán khi nhận hàng/i.test(normalized)) {
    return "Thanh toán khi nhận hàng (COD)";
  }
  if (/shopeepay|wallet/i.test(normalized)) {
    return "Ví ShopeePay";
  }
  return normalized;
}
