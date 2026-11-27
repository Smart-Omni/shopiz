import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Coins,
  MapPin,
  MessageCircle,
  PackageCheck,
  ShieldCheck,
  ShoppingBag,
  Ticket,
  Truck,
  X,
} from "lucide-react";
import { useCart } from "../../components/cart/CartProvider";
import { useAuth } from "../../components/auth/AuthProvider";
import { useAccount } from "../../components/account/AccountProvider";
import { getProductDetails } from "../../data/productDetails";
import { money } from "../../data/catalog";
import { voucherStatus } from "../../data/vouchers";
import catalogService from "../../services/catalogService";
import checkoutService from "../../services/checkoutService";
import { getNumericBuyerId } from "../../services/authService";
import { getThumbnailUrl } from "../../utils/imageUrl";
import VoucherDialog from "../cart/VoucherDialog";
import AddressDialog from "./AddressDialog";
import CheckoutDialog from "./CheckoutDialog";
import {
  sampleAddresses,
  shippingMethods,
  paymentMethods,
  formatAddress,
  validateAddress,
  saveMockOrder,
} from "./checkoutData";
import s from "./CheckoutPage.module.css";

export default function CheckoutPage() {
  const {
    lines,
    subtotal,
    selectedCount,
    appliedVoucher,
    applyVoucher,
    storageError,
    completeCheckout,
  } = useCart();
  const { user } = useAuth();
  const account = useAccount();
  const [addresses, setAddresses] = useState(() => {
    if (account?.addresses && account.addresses.length > 0) {
      return account.addresses;
    }
    return sampleAddresses.map((address) => ({
      ...address,
      ...(user ? { name: user.name, phone: user.phone } : {}),
    }));
  });
  const [addressId, setAddressId] = useState(() => {
    const defaultAddr = account?.addresses?.find((a) => a.isDefault);
    return defaultAddr ? defaultAddr.id : "home";
  });

  // Keep addresses updated if account addresses load asynchronously from backend
  useEffect(() => {
    if (account?.addresses && account.addresses.length > 0) {
      setAddresses(account.addresses);
      setAddressId((currentId) => {
        if (!currentId || !account.addresses.some((a) => a.id === currentId)) {
          const defaultAddr =
            account.addresses.find((a) => a.isDefault) || account.addresses[0];
          return defaultAddr ? defaultAddr.id : currentId;
        }
        return currentId;
      });
    }
  }, [account?.addresses]);
  const [editor, setEditor] = useState(null);
  const [voucherOpen, setVoucherOpen] = useState(false);
  const [shipping, setShipping] = useState({});
  const [shopShippingMethods, setShopShippingMethods] = useState({});
  const [draftShipping, setDraftShipping] = useState("standard");
  const [payment, setPayment] = useState("cod");
  const [draftPayment, setDraftPayment] = useState("cod");
  const [notes, setNotes] = useState({});
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState(null);
  const [receiptPopup, setReceiptPopup] = useState(false);
  const placing = useRef(false);
  const selected = lines.filter((line) => line.selected);
  const address =
    addresses.find((item) => item.id === addressId) || addresses[0];

  const groups = useMemo(() => {
    return selected.reduce((list, line) => {
      const seller =
        line.product?.seller ||
        (line.product?.shopId
          ? { id: line.product.shopId, name: line.product.shopName || `Shop ${line.product.shopId}` }
          : getProductDetails(line.product).seller);
      const shopId = line.product?.shopId || seller?.id || "shop-001";
      const shopName = line.product?.shopName || seller?.name || "Official Store";
      const shop = { id: shopId, name: shopName };

      const group = list.find((g) => String(g.shop.id) === String(shop.id));
      if (group) group.lines.push(line);
      else list.push({ shop, lines: [line] });
      return list;
    }, []);
  }, [selected]);

  // Dynamically calculate shipping rates for backend products based on recipient city
  useEffect(() => {
    let active = true;
    groups.forEach((group) => {
      const rawId = group.shop.id;
      const parsedId = Number(rawId);
      const backendShopId =
        !isNaN(parsedId) && parsedId > 0
          ? parsedId
          : rawId === "shop-002"
            ? 839910244
            : 910283751;

      catalogService
        .calculateShippingFee({
          shopId: backendShopId,
          recipientCity: address?.city || "Ho Chi Minh City",
          items: group.lines.map((l) => ({
            item_id: Number(l.product.itemId || l.product.id),
            item_price: Number(l.product.price) || 0,
            quantity: l.quantity,
          })),
        })
        .then((res) => {
          if (!active) return;
          const channels = res?.channels || [];
          if (channels.length > 0) {
            const formatted = channels
              .filter((c) => c.enabled !== false)
              .map((c) => {
                const buyerFee =
                  c.buyer_paid_shipping_fee !== undefined && c.buyer_paid_shipping_fee !== null
                    ? Number(c.buyer_paid_shipping_fee)
                    : c.buyerPaidShippingFee !== undefined && c.buyerPaidShippingFee !== null
                      ? Number(c.buyerPaidShippingFee)
                      : c.actual_shipping_fee !== undefined && c.actual_shipping_fee !== null
                        ? Number(c.actual_shipping_fee)
                        : c.actualShippingFee !== undefined && c.actualShippingFee !== null
                          ? Number(c.actualShippingFee)
                          : 15000;
                const actualFee =
                  c.actual_shipping_fee !== undefined && c.actual_shipping_fee !== null
                    ? Number(c.actual_shipping_fee)
                    : c.actualShippingFee !== undefined && c.actualShippingFee !== null
                      ? Number(c.actualShippingFee)
                      : buyerFee;
                const rebate =
                  c.shopee_shipping_rebate !== undefined && c.shopee_shipping_rebate !== null
                    ? Number(c.shopee_shipping_rebate)
                    : c.shopeeShippingRebate !== undefined && c.shopeeShippingRebate !== null
                      ? Number(c.shopeeShippingRebate)
                      : 0;
                return {
                  id: String(
                    c.channel_id ||
                      c.channelId ||
                      c.carrier_name?.toLowerCase().replace(/\s+/g, "-") ||
                      "standard",
                  ),
                  name: c.carrier_name || c.channel_name || c.channelName || c.service_type || "Nhanh (Tiêu chuẩn)",
                  fee: buyerFee,
                  actualFee,
                  rebate,
                  estimate:
                    c.estimated_delivery_days ||
                    c.estimatedDeliveryDays ||
                    c.estimated_days ||
                    "1–3 ngày",
                  carrierName: c.carrier_name || c.channel_name || c.channelName || "Shopee Xpress",
                  channelId: Number(c.channel_id || c.channelId || 30001),
                };
              });
            if (formatted.length > 0) {
              setShopShippingMethods((prev) => ({
                ...prev,
                [group.shop.id]: formatted,
              }));
              setShipping((prev) => {
                if (!prev[group.shop.id]) {
                  return { ...prev, [group.shop.id]: formatted[0].id };
                }
                return prev;
              });
            }
          }
        })
        .catch(() => {});
    });

    return () => {
      active = false;
    };
  }, [groups, address?.city]);

  const methodsForShop = (shopId) =>
    shopShippingMethods[shopId] || shippingMethods;

  const methodFor = (shopId) => {
    const list = methodsForShop(shopId);
    return list.find((method) => method.id === shipping[shopId]) || list[0];
  };

  const shippingFee = groups.reduce(
    (sum, group) => sum + Math.round(Number(methodFor(group.shop.id)?.fee || 0)),
    0,
  );
  const discountStatus = voucherStatus(appliedVoucher, {
    subtotal,
    selectedCount,
    shippingFee,
  });
  const discount = discountStatus.discount;
  const total = Math.max(0, subtotal + shippingFee - discount);

  function saveAddress(next) {
    if (!next) return;
    setAddresses((current) =>
      current.some((item) => item.id === next.id)
        ? current.map((item) => (item.id === next.id ? next : item))
        : [...current, next],
    );
    setAddressId(next.id);
    if (account?.saveAddress) {
      account.saveAddress(next);
    }
    setEditor(null);
    setError("");
  }

  function placeOrder() {
    if (placing.current) return;
    if (Object.keys(validateAddress(address)).length) {
      setError("Vui lòng hoàn tất địa chỉ nhận hàng của bạn.");
      setEditor({ type: "address" });
      return;
    }
    if (!selected.length) {
      setError("Vui lòng chọn ít nhất một sản phẩm trong giỏ hàng.");
      return;
    }
    placing.current = true;
    const order = {
      id: `SZ-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 5).toUpperCase()}`,
      createdAt: new Date().toISOString(),
      status: "demo-placed",
      items: selected.map((line) => ({
        productId: line.productId,
        itemId: line.product.itemId || line.productId,
        modelId: line.modelId || null,
        title: line.product.title,
        image: line.product.image || "",
        variant: line.variant,
        size: line.size,
        quantity: line.quantity,
        price: line.product.price,
        shopId: line.product.shopId || null,
        shopName: line.product.shopName || "",
      })),
      shipping: groups.map((group) => ({
        shopId: group.shop.id,
        method: methodFor(group.shop.id).id,
        fee: methodFor(group.shop.id).fee,
      })),
      payment,
      subtotal,
      shippingFee,
      discount,
      voucherCode: discountStatus.eligible ? appliedVoucher.code : null,
      total,
    };
    if (!completeCheckout(selected)) {
      placing.current = false;
      setError(
        "Giỏ hàng của bạn đã thay đổi. Vui lòng kiểm tra lại sản phẩm đã chọn trước khi đặt hàng.",
      );
      return;
    }
    const saved = saveMockOrder(order);
    applyVoucher("");
    setReceipt({ ...order, saved });
    setReceiptPopup(true);
    window.scrollTo(0, 0);

    // Synchronize multi-shop checkout to Shopee Simulator backend
    const batchPayload = {
      buyer_user_id: getNumericBuyerId(user?.id || 1001),
      buyer_username: user?.username || user?.name || "demo",
      recipient_name: address.name || "Demo Shopper",
      recipient_phone: address.phone || "0901234567",
      recipient_address: address.street || "Sample Address",
      recipient_district: address.district || "District 1",
      recipient_city: address.city || "Ho Chi Minh City",
      payment_method: payment === "wallet" ? "ShopeePay" : "Cash on Delivery",
      orders: groups.map((group) => {
        const rawId = group.shop.id;
        const parsed = Number(rawId);
        const backendShopId =
          !isNaN(parsed) && parsed > 0
            ? parsed
            : rawId === "shop-002"
              ? 839910244
              : 910283751;
        const currentMethod = methodFor(group.shop.id);
        const resolvedFee =
          currentMethod.fee !== undefined && currentMethod.fee !== null
            ? Number(currentMethod.fee)
            : 15000;
        return {
          shop_id: backendShopId,
          channel_id: currentMethod.channelId || 30001,
          shipping_carrier:
            currentMethod.carrierName ||
            (currentMethod.id === "express"
              ? "Hỏa tốc"
              : "Shopee Xpress"),
          shipping_fee: resolvedFee,
          message_to_seller: notes[group.shop.id] || "",
          voucher_code: discountStatus.eligible ? appliedVoucher.code : undefined,
          items: group.lines.map((l) => ({
            item_id: Number(l.product.itemId || l.product.id),
            model_id: l.modelId ? Number(l.modelId) : (l.product.modelId ? Number(l.product.modelId) : undefined),
            quantity: l.quantity,
            item_price: l.product.price,
            item_name: l.product.title,
          })),
        };
      }),
    };

    checkoutService
      .batchCheckout(batchPayload)
      .then((res) => {
        if (res?.orders?.length) {
          const firstSn = res.orders[0].order_sn;
          const backendTotal = res.orders.reduce(
            (sum, o) => sum + Number(o.total_amount || 0),
            0,
          );
          const backendShipping = res.orders.reduce(
            (sum, o) => sum + Number(o.buyer_paid_shipping_fee || 0),
            0,
          );
          const updated = {
            ...order,
            id: firstSn,
            orderSn: firstSn,
            total:
              Number.isFinite(backendTotal) && backendTotal >= 0
                ? backendTotal
                : order.total,
            shippingFee:
              Number.isFinite(backendShipping) && backendShipping >= 0
                ? backendShipping
                : order.shippingFee,
            backendOrders: res.orders,
          };
          saveMockOrder(updated);
          setReceipt(updated);
        }
      })
      .catch((err) => {
        console.warn("Backend batch checkout warning:", err);
      });
  }
  if (receipt)
    return (
      <div className={s.page}>
        <section className={s.success}>
          <span className={s.successIcon}>
            <CheckCircle2 size={44} strokeWidth={1.4} />
          </span>
          <span className={s.eyebrow}>SHOPIZ SIMULATOR</span>
          <h2>Đặt hàng thành công</h2>
          <p role="status">
            Đơn hàng của bạn đã được khởi tạo thành công trên hệ thống mô phỏng.
          </p>
          <strong className={s.orderId}>{receipt.id}</strong>
          <dl>
            <div>
              <dt>Số lượng sản phẩm</dt>
              <dd>
                {receipt.items.reduce((sum, item) => sum + item.quantity, 0)}
              </dd>
            </div>
            <div>
              <dt>Phương thức thanh toán</dt>
              <dd>
                {
                  paymentMethods.find((method) => method.id === receipt.payment)
                    ?.name || receipt.payment
                }
              </dd>
            </div>
            <div>
              <dt>Tổng thanh toán</dt>
              <dd>{money(receipt.total)}</dd>
            </div>
          </dl>
          {!receipt.saved && (
            <p className={s.warning}>
              Đơn hàng của bạn chỉ có sẵn trong phiên này do bộ nhớ trình duyệt không thể lưu.
            </p>
          )}
          <div className={s.successActions}>
            <Link className={s.primary} to="/account/purchases">
              Xem Đơn Mua
              <ArrowRight size={15} />
            </Link>
            <Link className={s.secondary} to="/">
              Tiếp tục mua sắm
              <ArrowRight size={15} />
            </Link>
            <Link className={s.secondary} to="/cart">
              Xem lại giỏ hàng
            </Link>
          </div>
        </section>
        {receiptPopup && (
          <CheckoutDialog
            title="Đặt hàng thành công"
            onClose={() => setReceiptPopup(false)}
          >
            <div className={`${s.dialogBody} ${s.successDialog}`}>
              <CheckCircle2 size={44} strokeWidth={1.4} />
              <p>Đơn hàng của bạn đã sẵn sàng trong mục Đơn Mua.</p>
              <strong className={s.orderId}>{receipt.id}</strong>
              <p className={s.muted}>
                Tổng thanh toán: {money(receipt.total)}. Không phát sinh phí thực tế.
              </p>
            </div>
            <footer className={s.dialogFooter}>
              <Link className={s.secondary} to="/">
                Tiếp Tục Mua Sắm
              </Link>
              <Link className={s.primary} to="/account/purchases">
                Xem Đơn Mua
                <ArrowRight size={15} />
              </Link>
            </footer>
          </CheckoutDialog>
        )}
      </div>
    );
  if (!selected.length)
    return (
      <div className={s.page}>
        <section className={s.empty}>
          <ShoppingBag size={43} strokeWidth={1.3} />
          <h2>Chưa có sản phẩm nào được chọn</h2>
          <p>
            Vui lòng chọn sản phẩm bạn muốn đặt mua từ giỏ hàng.
          </p>
          <Link className={s.primary} to="/cart">
            Quay lại Giỏ hàng
            <ArrowRight size={15} />
          </Link>
        </section>
      </div>
    );
  return (
    <div className={s.page}>
      <section
        className={s.addressBlock}
        aria-labelledby="delivery-address-heading"
      >
        <h2 id="delivery-address-heading">
          <MapPin size={18} />
          Địa Chỉ Nhận Hàng
        </h2>
        <div>
          <strong>
            {address.name}
            <span>{address.phone}</span>
          </strong>
          <p>{formatAddress(address)}</p>
          {address.isDefault && <span className={s.defaultBadge}>Mặc định</span>}
          <button onClick={() => setEditor({ type: "address" })}>
            Thay đổi
          </button>
        </div>
      </section>
      {storageError && (
        <p className={s.warning} role="status">
          Bộ nhớ trình duyệt tạm thời không khả dụng.
        </p>
      )}
      <div className={s.productHeader}>
        <h2>Sản phẩm</h2>
        <span>Đơn giá</span>
        <span>Số lượng</span>
        <span>Thành tiền</span>
      </div>
      {groups.map((group) => {
        const method = methodFor(group.shop.id);
        const groupSubtotal = group.lines.reduce(
          (sum, line) =>
            sum + Math.round(Number(line.product.price) || 0) * line.quantity,
          0,
        );
        const quantity = group.lines.reduce(
          (sum, line) => sum + line.quantity,
          0,
        );
        return (
          <section
            className={s.shopBlock}
            key={group.shop.id}
            aria-label={`${group.shop.name} checkout`}
          >
            <div className={s.shopHeading}>
              <Link to={`/shop/${group.shop.id}`}>{group.shop.name}</Link>
              <button
                onClick={() => setEditor({ type: "chat", shop: group.shop })}
              >
                <MessageCircle size={13} />
                Chat Ngay
              </button>
            </div>
            {group.lines.map((line) => (
              <article
                key={line.id}
                className={s.orderRow}
                aria-label={line.product.title}
              >
                <div className={s.product}>
                  <Link to={`/product/${line.productId}`}>
                    <img
                      src={getThumbnailUrl(line.product.image, 100)}
                      alt={line.product.title}
                    />
                  </Link>
                  <Link to={`/product/${line.productId}`}>
                    {line.product.title}
                  </Link>
                  <span>
                    Phân loại: {line.variant}
                    {line.size ? ` · ${line.size}` : ""}
                  </span>
                </div>
                <div className={s.unitPrice}>
                  <span>{money(line.product.price)}</span>
                  <del>{money(line.product.original)}</del>
                </div>
                <span className={s.quantity}>{line.quantity}</span>
                <strong>{money(line.product.price * line.quantity)}</strong>
              </article>
            ))}
            <div className={s.shopVoucher}>
              <span>
                <Ticket size={15} />
                Voucher của Shop
              </span>
              <button onClick={() => setVoucherOpen(true)}>
                Chọn Voucher
                <ChevronRight size={12} />
              </button>
            </div>
            <div className={s.fulfillment}>
              <label className={s.sellerNote}>
                Lời nhắn:
                <input
                  aria-label={`Message to ${group.shop.name}`}
                  placeholder="Lưu ý cho người bán..."
                  maxLength={200}
                  value={notes[group.shop.id] || ""}
                  onChange={(e) =>
                    setNotes({ ...notes, [group.shop.id]: e.target.value })
                  }
                />
              </label>
              <div className={s.delivery}>
                <div>
                  <span>
                    <Truck size={15} />
                    Phương thức vận chuyển:
                  </span>
                  <strong>{method.name}</strong>
                  <button
                    aria-label={`Change shipping for ${group.shop.name}`}
                    onClick={() => {
                      setDraftShipping(method.id);
                      setEditor({ type: "shipping", shop: group.shop });
                    }}
                  >
                    Thay đổi
                  </button>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                    {method.fee === 0 ? (
                      <>
                        {method.actualFee > 0 && (
                          <del style={{ color: "#888", fontSize: "12px" }}>
                            {money(method.actualFee)}
                          </del>
                        )}
                        <span style={{ color: "#00bfa5", fontWeight: 600 }}>0 ₫</span>
                        <span
                          style={{
                            fontSize: "11px",
                            background: "#e6f8f5",
                            color: "#00bfa5",
                            padding: "1px 6px",
                            borderRadius: "2px",
                            fontWeight: 500,
                          }}
                        >
                          Freeship Xtra
                        </span>
                      </>
                    ) : (
                      money(method.fee)
                    )}
                  </span>
                </div>
                <p>Thời gian nhận hàng: {method.estimate}</p>
                <small>
                  <PackageCheck size={12} />
                  Đồng kiểm khi nhận hàng · Tiêu chuẩn Shopee
                </small>
              </div>
            </div>
            <div className={s.shopTotal}>
              <span>
                Tổng số tiền ({quantity} sản phẩm, đã gồm phí vận chuyển):
              </span>
              <strong>{money(groupSubtotal + method.fee)}</strong>
            </div>
          </section>
        );
      })}
      <section className={s.voucherBlock}>
        <div>
          <h2>
            <Ticket size={17} />
            Shopiz Voucher
          </h2>
          <div className={s.voucherActions}>
            <button onClick={() => setVoucherOpen(true)}>
              {appliedVoucher ? appliedVoucher.code : "Chọn hoặc nhập mã"}
              <ChevronRight size={12} />
            </button>
            {appliedVoucher && (
              <button
                aria-label="Remove checkout voucher"
                onClick={() => applyVoucher("")}
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
        {appliedVoucher && (
          <p className={s.voucherNote}>
            {discountStatus.eligible
              ? discountStatus.reason || `Voucher giảm: ${money(discount)}`
              : discountStatus.reason}
          </p>
        )}
        <div className={s.coins}>
          <span>
            <Coins size={17} />
            Shopee Xu<small>Chưa có xu khả dụng</small>
          </span>
          <label>
            −{money(0)}
            <input type="checkbox" disabled aria-label="Use Shopiz Coins" />
          </label>
        </div>
      </section>
      <section className={s.paymentBlock}>
        <div className={s.paymentHeading}>
          <h2>Phương thức thanh toán</h2>
          <span>
            {paymentMethods.find((method) => method.id === payment)?.name || payment}
          </span>
          <button
            onClick={() => {
              setDraftPayment(payment);
              setEditor({ type: "payment" });
            }}
          >
            Thay đổi
          </button>
        </div>
        <dl className={s.totals}>
          <div>
            <dt>Tổng tiền hàng</dt>
            <dd data-testid="checkout-subtotal">{money(subtotal)}</dd>
          </div>
          <div>
            <dt>Tổng cộng tiền phí vận chuyển</dt>
            <dd data-testid="checkout-shipping">
              {shippingFee === 0 ? (
                <span style={{ color: "#00bfa5", fontWeight: 600 }}>
                  0 ₫{" "}
                  <span
                    style={{
                      fontSize: "11px",
                      background: "#e6f8f5",
                      color: "#00bfa5",
                      padding: "1px 6px",
                      borderRadius: "2px",
                      fontWeight: 500,
                      marginLeft: 4,
                    }}
                  >
                    Miễn phí
                  </span>
                </span>
              ) : (
                money(shippingFee)
              )}
            </dd>
          </div>
          <div>
            <dt>Giảm giá từ Voucher</dt>
            <dd data-testid="checkout-discount">−{money(discount)}</dd>
          </div>
          <div className={s.grandTotal}>
            <dt>Tổng thanh toán</dt>
            <dd data-testid="checkout-total" aria-live="polite">
              {money(total)}
            </dd>
          </div>
        </dl>
        <div className={s.placeOrder}>
          <div>
            <p>
              Nhấn &ldquo;Đặt Hàng&rdquo; đồng nghĩa với việc bạn đồng ý tuân theo{" "}
              <Link to="/info/terms-of-service">Điều khoản Shopiz</Link>.
            </p>
            <small>
              <ShieldCheck size={13} />
              Mô phỏng Shopee Open API v2. Đơn hàng được cập nhật thời gian thực.
            </small>
            {error && (
              <p className={s.fieldError} role="alert">
                {error}
              </p>
            )}
          </div>
          <button className={s.primary} onClick={placeOrder}>
            Đặt Hàng
          </button>
        </div>
      </section>
      {voucherOpen && (
        <VoucherDialog
          shippingFee={shippingFee}
          onClose={() => setVoucherOpen(false)}
        />
      )}
      {editor?.type === "address" && (
        <AddressDialog
          addresses={addresses}
          selectedId={addressId}
          onSave={saveAddress}
          onClose={() => setEditor(null)}
        />
      )}
      {editor?.type === "shipping" && (
        <CheckoutDialog
          title="Shipping options"
          onClose={() => setEditor(null)}
        >
          <div className={s.dialogBody}>
            <p className={s.muted}>{editor.shop.name}</p>
            {methodsForShop(editor.shop.id).map((method) => (
              <label
                key={method.id}
                className={`${s.methodChoice} ${draftShipping === method.id ? s.selectedChoice : ""}`}
              >
                <input
                  type="radio"
                  name="shipping-method"
                  aria-label={method.name}
                  checked={draftShipping === method.id}
                  onChange={() => setDraftShipping(method.id)}
                />
                <span>
                  <strong>{method.name}</strong>
                  <small>{method.estimate}</small>
                </span>
                <div>
                  {method.fee === 0 ? (
                    <div style={{ textAlign: "right" }}>
                      {method.actualFee > 0 && (
                        <del style={{ fontSize: "12px", color: "#888", display: "block" }}>
                          {money(method.actualFee)}
                        </del>
                      )}
                      <strong style={{ color: "#00bfa5" }}>0 ₫ (Miễn phí)</strong>
                    </div>
                  ) : (
                    <strong>{money(method.fee)}</strong>
                  )}
                </div>
              </label>
            ))}
          </div>
          <footer className={s.dialogFooter}>
            <button className={s.secondary} onClick={() => setEditor(null)}>
              Cancel
            </button>
            <button
              className={s.primary}
              onClick={() => {
                setShipping({ ...shipping, [editor.shop.id]: draftShipping });
                setEditor(null);
              }}
            >
              Confirm shipping
            </button>
          </footer>
        </CheckoutDialog>
      )}
      {editor?.type === "payment" && (
        <CheckoutDialog
          title="Select payment method"
          onClose={() => setEditor(null)}
        >
          <div className={s.dialogBody}>
            {paymentMethods.map((method) => (
              <label
                key={method.id}
                className={`${s.methodChoice} ${draftPayment === method.id ? s.selectedChoice : ""}`}
              >
                <input
                  type="radio"
                  name="payment-method"
                  aria-label={method.name}
                  checked={draftPayment === method.id}
                  onChange={() => setDraftPayment(method.id)}
                />
                <span>
                  <strong>{method.name}</strong>
                  <small>{method.description}</small>
                </span>
              </label>
            ))}
            <label className={`${s.methodChoice} ${s.unavailable}`}>
              <input type="radio" disabled />
              <span>
                <strong>Credit / Debit Card</strong>
                <small>Not connected. Do not enter real card details.</small>
              </span>
            </label>
          </div>
          <footer className={s.dialogFooter}>
            <button className={s.secondary} onClick={() => setEditor(null)}>
              Cancel
            </button>
            <button
              className={s.primary}
              onClick={() => {
                setPayment(draftPayment);
                setEditor(null);
              }}
            >
              Confirm payment
            </button>
          </footer>
        </CheckoutDialog>
      )}
      {editor?.type === "chat" && (
        <CheckoutDialog
          title={`Chat with ${editor.shop.name}`}
          onClose={() => setEditor(null)}
        >
          <div className={s.dialogBody}>
            <p className={s.muted}>
              Seller messaging is not connected in this simulator. Your checkout
              notes remain on this page for the demo.
            </p>
          </div>
          <footer className={s.dialogFooter}>
            <button className={s.primary} onClick={() => setEditor(null)}>
              Close
            </button>
          </footer>
        </CheckoutDialog>
      )}
    </div>
  );
}
