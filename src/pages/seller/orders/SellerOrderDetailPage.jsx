import React, { useEffect, useState } from "react";
import {
  ArrowLeft,
  Copy,
  Check,
  Package,
  Truck,
  MapPin,
  CreditCard,
  Printer,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Calendar,
  Phone,
  User,
} from "lucide-react";
import sellerService from "../../../services/sellerService";
import { getThumbnailUrl } from "../../../utils/imageUrl";
import s from "./SellerOrderDetailPage.module.css";

const money = (n) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(n) || 0);

const STATUS_DISPLAY_MAP = {
  UNPAID: { text: "Chờ xác nhận", color: "#fa8c16", bg: "#fff7e6" },
  READY_TO_SHIP: { text: "Chờ lấy hàng", color: "#fa541c", bg: "#fff2e8" },
  PROCESSED: { text: "Đang chuẩn bị", color: "#1890ff", bg: "#e6f7ff" },
  SHIPPED: { text: "Đang giao", color: "#13c2c2", bg: "#e6fffb" },
  COMPLETED: { text: "Đã giao", color: "#52c41a", bg: "#f6ffed" },
  IN_CANCEL: { text: "Yêu cầu hủy", color: "#eb2f96", bg: "#fff0f6" },
  CANCELLED: { text: "Đã hủy", color: "#8c8c8c", bg: "#f5f5f5" },
};

const TIMELINE_STEPS = [
  { key: "Order Placed", label: "Đặt hàng thành công", icon: Clock },
  { key: "Payment Confirmed", label: "Đã thanh toán", icon: CreditCard },
  { key: "Logistics Arranged", label: "Người bán chuẩn bị hàng", icon: Package },
  { key: "Courier Picked Up (In Transit)", label: "Đang vận chuyển", icon: Truck },
  { key: "Delivered & Completed", label: "Giao hàng thành công", icon: CheckCircle2 },
];

export default function SellerOrderDetailPage({ shopId, orderSn, onBack }) {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [actionNotice, setActionNotice] = useState("");

  const fetchOrderDetail = () => {
    if (!orderSn) return;
    setLoading(true);
    setError(null);
    sellerService
      .getOrderDetail(orderSn)
      .then((data) => {
        setOrder(data);
      })
      .catch((err) => {
        setError(err.message || "Không thể tải thông tin chi tiết đơn hàng.");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchOrderDetail();
  }, [orderSn]);

  const handleCopy = (text) => {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleArrangeShipment = async () => {
    try {
      const res = await sellerService.shipOrder(orderSn);
      setActionNotice(`Đã sắp xếp giao hàng thành công cho đơn #${orderSn}!`);
      fetchOrderDetail();
    } catch (err) {
      setActionNotice(err.message || `Sắp xếp giao hàng thất bại.`);
    }
  };

  const handlePrintAwb = async () => {
    try {
      await sellerService.generateAwb(orderSn);
      window.open(sellerService.getAwbDownloadUrl(orderSn), "_blank");
    } catch {
      window.open(sellerService.getAwbDownloadUrl(orderSn), "_blank");
    }
  };

  if (loading) {
    return (
      <div className={s.pageContainer}>
        <div className={s.topNav}>
          <button type="button" className={s.backBtn} onClick={onBack}>
            <ArrowLeft size={16} /> Quay lại danh sách đơn hàng
          </button>
        </div>
        <div className={s.centerState}>
          <div className={s.spinner} />
          <p style={{ color: "#8c8c8c", fontSize: 14 }}>Đang tải thông tin chi tiết đơn hàng #{orderSn}...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className={s.pageContainer}>
        <div className={s.topNav}>
          <button type="button" className={s.backBtn} onClick={onBack}>
            <ArrowLeft size={16} /> Quay lại danh sách đơn hàng
          </button>
        </div>
        <div className={s.centerState}>
          <AlertCircle size={44} color="#ff4d4f" />
          <h3 style={{ margin: 0, color: "#262626" }}>Không tìm thấy đơn hàng</h3>
          <p style={{ color: "#8c8c8c", fontSize: 13, margin: 0 }}>{error || "Đơn hàng không tồn tại trong hệ thống."}</p>
          <button type="button" className={s.backBtn} onClick={fetchOrderDetail} style={{ marginTop: 8 }}>
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  const statusMeta = STATUS_DISPLAY_MAP[order.order_status] || {
    text: order.order_status,
    color: "#595959",
    bg: "#f5f5f5",
  };

  const recipient = order.recipient || order.recipient_address || {};
  const recName = recipient.name || order.recipient_name || order.buyer_username || "Khách hàng Shopee";
  const recPhone = recipient.phone || order.recipient_phone || "—";
  const recAddress = recipient.address || recipient.full_address || order.recipient_address || "—";

  const pkg = order.package || (order.packages && order.packages[0]) || null;
  const trackingNumber = pkg?.tracking_number;
  const hasAwb =
    pkg?.document_status === "READY" ||
    trackingNumber ||
    ["PROCESSED", "SHIPPED", "COMPLETED"].includes(order.order_status);

  const itemsSubtotal = (order.items || []).reduce(
    (sum, it) => sum + Number(it.subtotal || (Number(it.unit_price || it.item_price || 0) * (it.quantity || 1))),
    0
  );

  const buyerShipping = Number(order.buyer_paid_shipping_fee || 0);
  const actualShipping = Number(order.actual_shipping_fee || (buyerShipping > 0 ? buyerShipping : 21500));
  const freeshipRebate = Math.max(0, actualShipping - buyerShipping);
  const sellerVoucher = Number(order.voucher_from_seller || 0);
  const totalAmount = Number(order.total_amount || 0);

  const createdTime = order.created_at
    ? new Date(order.created_at).toLocaleString("vi-VN")
    : order.create_time
    ? new Date(order.create_time * 1000).toLocaleString("vi-VN")
    : "—";

  return (
    <div className={s.pageContainer}>
      {/* 1. Top Navigation Bar */}
      <div className={s.topNav}>
        <button type="button" className={s.backBtn} onClick={onBack}>
          <ArrowLeft size={16} /> Quay lại danh sách đơn hàng
        </button>
      </div>

      {/* 2. Order Metadata Banner Card */}
      <div className={s.bannerCard}>
        <div className={s.bannerLeft}>
          <div className={s.orderHeading}>
            <h1 className={s.title}>Chi tiết đơn hàng</h1>
            <div className={s.orderSnWrap}>
              <span>{order.order_sn}</span>
              <button
                type="button"
                className={s.copyBtn}
                onClick={() => handleCopy(order.order_sn)}
                title="Sao chép mã đơn hàng"
              >
                {copied ? <Check size={14} color="#52c41a" /> : <Copy size={14} />}
              </button>
            </div>
          </div>
          <div className={s.orderDate}>
            <Calendar size={14} />
            <span>Thời gian đặt hàng: {createdTime}</span>
          </div>
        </div>

        <div className={s.bannerRight}>
          <span
            className={s.statusBadge}
            style={{ color: statusMeta.color, backgroundColor: statusMeta.bg }}
          >
            {statusMeta.text}
          </span>

          {order.order_status === "UNPAID" || order.order_status === "READY_TO_SHIP" ? (
            <button
              type="button"
              className={s.btnPrimary}
              onClick={handleArrangeShipment}
            >
              <Package size={15} /> Chuẩn bị hàng
            </button>
          ) : null}

          {hasAwb && (
            <button
              type="button"
              className={s.btnAwb}
              onClick={handlePrintAwb}
              title="Tải & In phiếu giao hàng AWB (PDF)"
            >
              <Printer size={15} /> In phiếu AWB
            </button>
          )}
        </div>
      </div>

      {/* 3. Horizontal Visual Stepper Section */}
      <div className={s.stepperCard}>
        <div className={s.stepperTrack}>
          {TIMELINE_STEPS.map((step, idx) => {
            const IconComponent = step.icon;
            // Match with order.timeline if available
            const backendStep = (order.timeline || []).find((t) => t.title === step.key);
            const isDone =
              backendStep?.status === "DONE" ||
              (step.key === "Order Placed" && Boolean(order.order_sn)) ||
              (step.key === "Payment Confirmed" && order.order_status !== "UNPAID") ||
              (step.key === "Logistics Arranged" && ["PROCESSED", "SHIPPED", "COMPLETED"].includes(order.order_status)) ||
              (step.key === "Courier Picked Up (In Transit)" && ["SHIPPED", "COMPLETED"].includes(order.order_status)) ||
              (step.key === "Delivered & Completed" && order.order_status === "COMPLETED");

            const stepTime = backendStep?.time
              ? new Date(backendStep.time).toLocaleTimeString("vi-VN", {
                  hour: "2-digit",
                  minute: "2-digit",
                  day: "2-digit",
                  month: "2-digit",
                })
              : null;

            return (
              <div
                key={step.key}
                className={`${s.stepItem} ${isDone ? s.stepDone : s.stepPending}`}
              >
                <div className={s.stepIconWrap}>
                  <IconComponent size={20} />
                </div>
                <span className={s.stepTitle}>{step.label}</span>
                {stepTime && <span className={s.stepTime}>{stepTime}</span>}
                {backendStep?.tracking && (
                  <span className={s.stepTracking}>{backendStep.tracking}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Two Columns: Recipient Address & Shipping Info */}
      <div className={s.infoGrid}>
        {/* Recipient Address Card */}
        <div className={s.infoCard}>
          <div className={s.cardHeader}>
            <MapPin size={18} />
            <span>Địa chỉ nhận hàng</span>
          </div>
          <div className={s.cardContent}>
            <div className={s.recipientName}>{recName}</div>
            <div className={s.recipientRow}>
              <Phone size={14} />
              <span>{recPhone}</span>
            </div>
            <div className={s.recipientRow}>
              <span className={s.recipientAddress}>{recAddress}</span>
            </div>
          </div>
        </div>

        {/* Shipping Information Card */}
        <div className={s.infoCard}>
          <div className={s.cardHeader}>
            <Truck size={18} />
            <span>Thông tin vận chuyển</span>
          </div>
          <div className={s.cardContent}>
            <div className={s.infoRow}>
              <span className={s.infoLabel}>Đơn vị vận chuyển:</span>
              <strong className={s.infoVal}>{order.shipping_carrier || "SPX Express"}</strong>
            </div>
            <div className={s.infoRow}>
              <span className={s.infoLabel}>Mã vận đơn:</span>
              <span className={s.infoVal}>
                {trackingNumber ? (
                  <strong className={s.trackingCode}>{trackingNumber}</strong>
                ) : (
                  "Chưa cập nhật"
                )}
              </span>
            </div>
            <div className={s.infoRow}>
              <span className={s.infoLabel}>Trạng thái kiện hàng:</span>
              <span className={s.infoVal}>
                {pkg?.logistics_status === "LOGISTICS_NOT_START"
                  ? "Chưa lấy hàng"
                  : pkg?.logistics_status === "LOGISTICS_PICKED_UP"
                  ? "Đã lấy hàng"
                  : pkg?.logistics_status === "LOGISTICS_DELIVERED"
                  ? "Đã giao thành công"
                  : pkg?.logistics_status || "Đang xử lý"}
              </span>
            </div>
            <div className={s.infoRow}>
              <span className={s.infoLabel}>Phương thức thanh toán:</span>
              <span className={s.infoVal}>
                {order.payment_method === "cod" || order.payment_method === "Cash on delivery"
                  ? "Thanh toán khi nhận hàng (COD)"
                  : order.payment_method || "ShopeePay"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Products Table Section */}
      <div className={s.productsCard}>
        <h2 className={s.sectionTitle}>
          <Package size={18} />
          Sản phẩm đã đặt ({order.items?.length || 0})
        </h2>
        <div className={s.tableWrap}>
          <table className={s.productsTable}>
            <thead>
              <tr>
                <th style={{ width: "50%" }}>Sản phẩm</th>
                <th style={{ width: "18%", textAlign: "right" }}>Đơn giá</th>
                <th style={{ width: "12%", textAlign: "center" }}>Số lượng</th>
                <th style={{ width: "20%", textAlign: "right" }}>Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              {(order.items || []).map((it, idx) => {
                const rawImg = it.image || it.image_url;
                const thumb = getThumbnailUrl(rawImg, 160);
                const unitPrice = Number(it.unit_price || it.item_price || 0);
                const qty = Number(it.quantity || 1);
                const lineTotal = Number(it.subtotal || unitPrice * qty);

                return (
                  <tr key={it.order_item_id || it.item_id || idx}>
                    <td>
                      <div className={s.productCell}>
                        <div className={s.thumbBox}>
                          {thumb ? (
                            <img
                              src={thumb}
                              alt={it.item_name}
                              className={s.thumbImg}
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                                if (e.currentTarget.nextElementSibling) {
                                  e.currentTarget.nextElementSibling.style.display = "flex";
                                }
                              }}
                            />
                          ) : null}
                          <div
                            style={{
                              display: thumb ? "none" : "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: "100%",
                              height: "100%",
                              color: "#bfbfbf",
                            }}
                          >
                            <Package size={24} />
                          </div>
                        </div>
                        <div className={s.productDetails}>
                          <span className={s.productName}>{it.item_name}</span>
                          {it.model_name && (
                            <span className={s.productVariation}>Phân loại: {it.model_name}</span>
                          )}
                          {it.item_id && (
                            <span className={s.productSku}>Mã SP: #{it.item_id}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className={s.priceCol}>{money(unitPrice)}</td>
                    <td className={s.qtyCol}>x{qty}</td>
                    <td className={s.totalCol}>{money(lineTotal)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. Payment Summary Card */}
      <div className={s.paymentCard}>
        <div className={s.summaryWrap}>
          <div className={s.summaryRow}>
            <span>Tổng tiền hàng</span>
            <span className={s.summaryVal}>{money(itemsSubtotal)}</span>
          </div>

          <div className={s.summaryRow}>
            <span>Phí vận chuyển</span>
            <span className={s.summaryVal}>{money(actualShipping)}</span>
          </div>

          {freeshipRebate > 0 && (
            <div className={s.summaryRow}>
              <span>Giảm giá phí vận chuyển (Shopee Freeship)</span>
              <span className={s.discountVal}>−{money(freeshipRebate)}</span>
            </div>
          )}

          {sellerVoucher > 0 && (
            <div className={s.summaryRow}>
              <span>Voucher giảm giá từ Người bán</span>
              <span className={s.discountVal}>−{money(sellerVoucher)}</span>
            </div>
          )}

          <div className={s.divider} />

          <div className={s.grandTotalRow}>
            <span className={s.grandTotalLabel}>Tổng số tiền thanh toán</span>
            <span className={s.grandTotalVal}>{money(totalAmount || itemsSubtotal + buyerShipping)}</span>
          </div>

          <div className={s.paymentMethodRow}>
            <span>Phương thức thanh toán:</span>
            <span>
              {order.payment_method === "cod" || order.payment_method === "Cash on delivery"
                ? "Thanh toán khi nhận hàng (COD)"
                : order.payment_method || "ShopeePay"}
            </span>
          </div>
        </div>
      </div>

      {/* Toast Notice */}
      {actionNotice && (
        <div className={s.toast}>
          <CheckCircle2 size={16} color="#52c41a" />
          <span>{actionNotice}</span>
          <button
            type="button"
            onClick={() => setActionNotice("")}
            style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", marginLeft: 8 }}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
