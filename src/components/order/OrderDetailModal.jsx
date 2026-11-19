import React, { useEffect, useState } from "react";
import {
  X,
  Truck,
  MapPin,
  CreditCard,
  Package,
  Printer,
  CheckCircle2,
  Clock,
  AlertCircle,
  ShieldCheck,
  FileText,
  User,
  Phone,
} from "lucide-react";
import sellerService from "../../services/sellerService";
import { orderService } from "../../services/orderService";
import { getThumbnailUrl } from "../../utils/imageUrl";
import s from "./OrderDetailModal.module.css";

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

const TIMELINE_ICONS = {
  "Order Placed": Clock,
  "Payment Confirmed": CreditCard,
  "Logistics Arranged": Package,
  "Courier Picked Up (In Transit)": Truck,
  "Delivered & Completed": CheckCircle2,
};

const TIMELINE_TITLES_VI = {
  "Order Placed": "Đặt hàng thành công",
  "Payment Confirmed": "Đã thanh toán",
  "Logistics Arranged": "Người bán đang chuẩn bị hàng",
  "Courier Picked Up (In Transit)": "Đang vận chuyển",
  "Delivered & Completed": "Giao hàng thành công",
};

export default function OrderDetailModal({
  orderSn,
  fallbackOrder,
  isOpen,
  onClose,
  isSeller = false,
  onShipOrder,
  onPrintAwb,
  onConfirmDelivery,
  onReview,
}) {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen || !orderSn) {
      setOrder(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const fetcher = isSeller
      ? sellerService.getOrderDetail(orderSn)
      : orderService.getOrderDetail(orderSn);

    fetcher
      .then((data) => {
        setOrder(data);
      })
      .catch((err) => {
        if (fallbackOrder) {
          const createdTimeSec = Math.floor(
            new Date(fallbackOrder.createdAt || Date.now()).getTime() / 1000
          );
          setOrder({
            order_sn: fallbackOrder.orderSn || fallbackOrder.id || orderSn,
            order_status:
              fallbackOrder.backendStatus ||
              (fallbackOrder.status === "completed"
                ? "COMPLETED"
                : fallbackOrder.status === "cancelled"
                ? "CANCELLED"
                : "SHIPPED"),
            create_time: createdTimeSec,
            recipient_address: {
              name: "Khách hàng demo",
              phone: "0901234567",
              full_address: "123 Đường Mẫu, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh",
            },
            shipping_carrier:
              fallbackOrder.shipping?.[0]?.method || "SPX Express",
            payment_method: fallbackOrder.payment || "cod",
            total_amount: fallbackOrder.total,
            buyer_paid_shipping_fee: fallbackOrder.shippingFee || 0,
            voucher_from_seller: fallbackOrder.discount || 0,
            items: (fallbackOrder.items || []).map((it, idx) => ({
              order_item_id: it.itemId || it.productId || idx + 1,
              item_name: it.title,
              model_name: it.variant,
              image: it.image || it.product?.image,
              quantity: it.quantity || 1,
              item_price: it.price || 0,
            })),
            timeline: [
              {
                title: "Order Placed",
                description: "Đơn hàng đã được tạo thành công",
                timestamp: createdTimeSec,
              },
              {
                title: "Delivered & Completed",
                description: "Đơn hàng đã hoàn tất",
                timestamp: createdTimeSec + 3600,
              },
            ],
          });
        } else {
          setError(err.message || "Không thể tải thông tin chi tiết đơn hàng.");
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen, orderSn, isSeller, fallbackOrder]);

  if (!isOpen) return null;

  const statusMeta = order
    ? STATUS_DISPLAY_MAP[order.order_status] || {
        text: order.order_status,
        color: "#595959",
        bg: "#f5f5f5",
      }
    : null;

  const itemsSubtotal = (order?.items || []).reduce(
    (sum, it) => sum + (Number(it.unit_price || it.item_price || 0) * (it.quantity || 1)),
    0,
  );

  return (
    <div className={s.backdrop} onClick={onClose} role="dialog" aria-modal="true">
      <div className={s.modal} onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <header className={s.header}>
          <div className={s.headerLeft}>
            <FileText size={20} className={s.headerIcon} />
            <div>
              <h2 className={s.title}>Chi tiết đơn hàng</h2>
              <span className={s.orderSn}>Mã đơn hàng: <strong>{orderSn}</strong></span>
            </div>
          </div>
          <div className={s.headerRight}>
            {statusMeta && (
              <span
                className={s.statusBadge}
                style={{ color: statusMeta.color, backgroundColor: statusMeta.bg }}
              >
                {statusMeta.text}
              </span>
            )}
            <button
              type="button"
              className={s.closeBtn}
              onClick={onClose}
              aria-label="Đóng"
            >
              <X size={20} />
            </button>
          </div>
        </header>

        {/* Modal Body */}
        <div className={s.body}>
          {loading && (
            <div className={s.loadingState}>
              <div className={s.spinner} />
              <p>Đang tải chi tiết đơn hàng...</p>
            </div>
          )}

          {error && (
            <div className={s.errorState}>
              <AlertCircle size={36} color="#ff4d4f" />
              <p>{error}</p>
              <button
                type="button"
                className={s.retryBtn}
                onClick={() => {
                  setLoading(true);
                  setError(null);
                  (isSeller
                    ? sellerService.getOrderDetail(orderSn)
                    : orderService.getOrderDetail(orderSn)
                  )
                    .then((data) => setOrder(data))
                    .catch((err) => setError(err.message))
                    .finally(() => setLoading(false));
                }}
              >
                Thử lại
              </button>
            </div>
          )}

          {!loading && !error && order && (
            <>
              {/* Timeline Stepper */}
              {order.timeline && order.timeline.length > 0 && (
                <section className={s.timelineSection}>
                  <div className={s.timelineTrack}>
                    {order.timeline.map((step, idx) => {
                      const IconComp = TIMELINE_ICONS[step.title] || Clock;
                      const isDone = step.status === "DONE";
                      const titleVi = TIMELINE_TITLES_VI[step.title] || step.title;

                      return (
                        <div
                          key={idx}
                          className={`${s.timelineStep} ${isDone ? s.stepDone : s.stepPending}`}
                        >
                          <div className={s.stepIconWrap}>
                            <IconComp size={16} />
                          </div>
                          <span className={s.stepTitle}>{titleVi}</span>
                          {step.time && (
                            <time className={s.stepTime}>
                              {new Date(step.time).toLocaleString("vi-VN", {
                                hour: "2-digit",
                                minute: "2-digit",
                                day: "2-digit",
                                month: "2-digit",
                              })}
                            </time>
                          )}
                          {step.tracking && (
                            <span className={s.stepTracking}>Mã: {step.tracking}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Delivery & Logistics Info Grid */}
              <div className={s.infoGrid}>
                {/* Recipient Address */}
                <div className={s.infoCard}>
                  <div className={s.cardHeader}>
                    <MapPin size={16} />
                    <span>Địa chỉ nhận hàng</span>
                  </div>
                  <div className={s.cardContent}>
                    <p className={s.recipientName}>
                      <User size={14} />
                      <strong>{order.recipient?.name || order.recipient_name || "Người nhận"}</strong>
                    </p>
                    <p className={s.recipientPhone}>
                      <Phone size={14} />
                      <span>{order.recipient?.phone || order.recipient_phone || "—"}</span>
                    </p>
                    <p className={s.recipientAddress}>
                      {order.recipient?.address || order.recipient_address || "—"}
                    </p>
                  </div>
                </div>

                {/* Shipping & Package Details */}
                <div className={s.infoCard}>
                  <div className={s.cardHeader}>
                    <Truck size={16} />
                    <span>Thông tin vận chuyển</span>
                  </div>
                  <div className={s.cardContent}>
                    <div className={s.infoRow}>
                      <span className={s.infoLabel}>Đơn vị vận chuyển:</span>
                      <strong className={s.infoVal}>{order.shipping_carrier || "Shopee Xpress"}</strong>
                    </div>
                    <div className={s.infoRow}>
                      <span className={s.infoLabel}>Mã vận đơn:</span>
                      <span className={s.infoVal}>
                        {order.package?.tracking_number ? (
                          <strong className={s.trackingCode}>
                            {order.package.tracking_number}
                          </strong>
                        ) : (
                          "Chưa cập nhật"
                        )}
                      </span>
                    </div>
                    <div className={s.infoRow}>
                      <span className={s.infoLabel}>Trạng thái kiện hàng:</span>
                      <span className={s.infoVal}>
                        {order.package?.logistics_status === "LOGISTICS_NOT_START"
                          ? "Chưa lấy hàng"
                          : order.package?.logistics_status === "LOGISTICS_PICKED_UP"
                            ? "Đã lấy hàng"
                            : order.package?.logistics_status || "Đang xử lý"}
                      </span>
                    </div>
                    <div className={s.infoRow}>
                      <span className={s.infoLabel}>Phương thức thanh toán:</span>
                      <span className={s.infoVal}>{order.payment_method || "ShopeePay"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ordered Items Table */}
              <section className={s.itemsSection}>
                <h3 className={s.sectionTitle}>
                  <Package size={16} />
                  Sản phẩm đã đặt ({order.items?.length || 0})
                </h3>
                <div className={s.itemsTableWrap}>
                  <table className={s.itemsTable}>
                    <thead>
                      <tr>
                        <th style={{ width: "55%" }}>Sản phẩm</th>
                        <th style={{ width: "15%", textAlign: "right" }}>Đơn giá</th>
                        <th style={{ width: "10%", textAlign: "center" }}>Số lượng</th>
                        <th style={{ width: "20%", textAlign: "right" }}>Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(order.items || []).map((it) => {
                        const rawImg = it.image || it.image_url;
                        const thumb = getThumbnailUrl(rawImg, 100);
                        const unitPrice = Number(it.unit_price || it.item_price || 0);
                        const qty = Number(it.quantity || 1);
                        const lineTotal = Number(it.subtotal || unitPrice * qty);

                        return (
                          <tr key={it.order_item_id || it.item_id}>
                            <td className={s.itemCell}>
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
                                  className={s.thumbFallback}
                                  style={{ display: thumb ? "none" : "flex" }}
                                >
                                  <Package size={22} color="#bfbfbf" />
                                </div>
                              </div>
                              <div className={s.itemDetails}>
                                <strong className={s.itemName}>{it.item_name}</strong>
                                {it.model_name && (
                                  <span className={s.modelName}>Phân loại: {it.model_name}</span>
                                )}
                              </div>
                            </td>
                            <td className={s.priceCell}>{money(unitPrice)}</td>
                            <td className={s.qtyCell}>x{qty}</td>
                            <td className={s.totalCell}>{money(lineTotal)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Payment Summary */}
              <section className={s.paymentSummarySection}>
                <dl className={s.summaryList}>
                  <div className={s.summaryRow}>
                    <dt>Tổng tiền hàng</dt>
                    <dd>{money(itemsSubtotal)}</dd>
                  </div>
                  <div className={s.summaryRow}>
                    <dt>Phí vận chuyển</dt>
                    <dd>
                      {Number(order.actual_shipping_fee || order.buyer_paid_shipping_fee || 0) === 0 ? (
                        <span style={{ color: "#00bfa5", fontWeight: 600 }}>0 ₫ (Miễn phí)</span>
                      ) : (
                        money(order.actual_shipping_fee || order.buyer_paid_shipping_fee || 0)
                      )}
                    </dd>
                  </div>
                  {Number(order.voucher_from_shopee || 0) > 0 && (
                    <div className={s.summaryRow}>
                      <dt>Giảm giá phí vận chuyển (Shopee Freeship)</dt>
                      <dd style={{ color: "#00bfa5" }}>−{money(order.voucher_from_shopee)}</dd>
                    </div>
                  )}
                  {Number(order.voucher_from_seller || 0) > 0 && (
                    <div className={s.summaryRow}>
                      <dt>Voucher giảm giá từ Shop</dt>
                      <dd style={{ color: "#ee4d2d" }}>−{money(order.voucher_from_seller)}</dd>
                    </div>
                  )}
                  <div className={`${s.summaryRow} ${s.grandTotalRow}`}>
                    <dt>Tổng số tiền thanh toán</dt>
                    <dd className={s.grandTotalVal}>{money(order.total_amount)}</dd>
                  </div>
                </dl>
              </section>
            </>
          )}
        </div>

        {/* Modal Footer with contextual actions */}
        <footer className={s.footer}>
          <div className={s.footerLeft}>
            <ShieldCheck size={16} color="#52c41a" />
            <span>Mô phỏng Shopee Open API v2 an toàn</span>
          </div>
          <div className={s.footerActions}>
            {isSeller && (order?.order_status === "UNPAID" || order?.order_status === "READY_TO_SHIP") && (
              <button
                type="button"
                className={s.primaryBtn}
                onClick={() => {
                  onShipOrder?.(order.order_sn);
                  onClose();
                }}
              >
                Chuẩn bị hàng
              </button>
            )}

            {isSeller && (order?.order_status === "PROCESSED" || order?.order_status === "SHIPPED" || order?.order_status === "COMPLETED") && (
              <button
                type="button"
                className={s.secondaryBtn}
                onClick={() => onPrintAwb?.(order.order_sn)}
              >
                <Printer size={15} />
                In phiếu AWB
              </button>
            )}

            {!isSeller && order?.order_status === "SHIPPED" && (
              <button
                type="button"
                className={s.primaryBtn}
                onClick={() => {
                  onConfirmDelivery?.(order);
                  onClose();
                }}
              >
                Đã Nhận Được Hàng
              </button>
            )}

            {!isSeller && order?.order_status === "COMPLETED" && (
              <button
                type="button"
                className={s.primaryBtn}
                onClick={() => {
                  onReview?.(order);
                  onClose();
                }}
              >
                Đánh Giá Sản Phẩm
              </button>
            )}

            <button type="button" className={s.closeActionBtn} onClick={onClose}>
              Đóng
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
