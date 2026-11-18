import { money } from "./catalog";

// Voucher ưu đãi VNĐ cho simulator
export const mockVouchers = [
  {
    code: "FREESHIP",
    type: "shipping",
    title: "Miễn phí vận chuyển",
    minimum: 50000,
    maxDiscount: 15000,
    expiresAt: "2026-12-31",
    description: "Giảm tối đa 15.000₫ phí vận chuyển cho đơn từ 50.000₫.",
  },
  {
    code: "SHIPPLUS",
    type: "shipping",
    title: "Voucher vận chuyển 30k",
    minimum: 150000,
    maxDiscount: 30000,
    expiresAt: "2026-12-31",
    description: "Giảm tối đa 30.000₫ phí vận chuyển cho đơn từ 150.000₫.",
  },
  {
    code: "SHOPIZ10",
    type: "percent",
    title: "Giảm 10% đơn hàng",
    minimum: 100000,
    percent: 10,
    maxDiscount: 50000,
    expiresAt: "2026-12-31",
    description: "Giảm tối đa 50.000₫ cho đơn từ 100.000₫.",
  },
  {
    code: "SHOPIZ50K",
    type: "fixed",
    title: "Giảm 50.000₫",
    minimum: 200000,
    amount: 50000,
    expiresAt: "2026-12-31",
    description: "Giảm ngay 50.000₫ cho đơn từ 200.000₫.",
  },
  {
    code: "SHOPIZ5",
    type: "fixed",
    title: "Giảm 15.000₫",
    minimum: 50000,
    amount: 15000,
    expiresAt: "2026-12-31",
    description: "Giảm 15.000₫ cho đơn từ 50.000₫.",
  },
  {
    code: "WELCOME15",
    type: "percent",
    title: "Giảm 15% khách mới",
    minimum: 100000,
    percent: 15,
    maxDiscount: 100000,
    expiresAt: "2026-12-31",
    description: "Giảm tối đa 100.000₫ khi mua từ 100.000₫.",
  },
];

export const findVoucher = (code) =>
  mockVouchers.find(
    (v) =>
      v.code ===
      String(code || "")
        .trim()
        .toUpperCase(),
  ) || null;

export function voucherStatus(
  voucher,
  { subtotal, selectedCount, shippingFee = 0, now = Date.now() },
) {
  if (!voucher)
    return {
      eligible: false,
      reason: "Mã giảm giá không tồn tại. Vui lòng thử mã khác.",
      discount: 0,
    };
  if (now > new Date(`${voucher.expiresAt}T23:59:59+07:00`).getTime())
    return {
      eligible: false,
      reason: "Mã giảm giá đã hết hạn.",
      discount: 0,
    };
  if (!selectedCount)
    return {
      eligible: false,
      reason: "Vui lòng chọn sản phẩm trong giỏ hàng để áp dụng mã.",
      discount: 0,
    };
  if (subtotal < (voucher.minimum || 0))
    return {
      eligible: false,
      reason: `Mua thêm ${money(voucher.minimum - subtotal)} để sử dụng mã giảm giá này.`,
      discount: 0,
    };
  const raw =
    voucher.type === "percent"
      ? Math.round((subtotal * voucher.percent) / 100)
      : voucher.type === "fixed"
        ? (voucher.amount || 0)
        : shippingFee;
  const cap =
    voucher.maxDiscount === undefined
      ? subtotal
      : voucher.maxDiscount;
  return {
    eligible: true,
    reason:
      voucher.type === "shipping" && shippingFee === 0
        ? "Đơn hàng đã được miễn phí vận chuyển."
        : "",
    discount: Math.min(subtotal, raw, cap),
  };
}
