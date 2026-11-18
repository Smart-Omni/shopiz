export {
  sampleAddresses,
  validateAddress,
  formatAddress,
} from "../../data/addresses";

export const shippingMethods = [
  {
    id: "standard",
    name: "Nhanh (Tiêu chuẩn)",
    fee: 15000,
    estimate: "1–3 ngày làm việc",
    carrierName: "Shopee Xpress",
    channelId: 30001,
  },
  {
    id: "express",
    name: "Hỏa tốc",
    fee: 35000,
    estimate: "Giao trong ngày",
    carrierName: "Express Delivery",
    channelId: 30002,
  },
];

export const paymentMethods = [
  {
    id: "cod",
    name: "Thanh toán khi nhận hàng (COD)",
    description:
      "Thanh toán bằng tiền mặt khi nhận hàng trong mô phỏng Shopee.",
  },
  {
    id: "wallet",
    name: "Ví ShopeePay",
    description:
      "Thanh toán trực tiếp qua số dư ví ShopeePay mô phỏng.",
  },
];

export { saveMockOrder } from "../../data/orders";
