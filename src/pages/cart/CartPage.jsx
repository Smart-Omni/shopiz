import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ChevronRight,
  Minus,
  Plus,
  Ticket,
  Coins,
  ShoppingCart,
  Store,
  Trash2,
  Truck,
  X,
} from "lucide-react";
import { useCart } from "../../components/cart/CartProvider";
import { getProductDetails } from "../../data/productDetails";
import { money } from "../../data/catalog";
import { ProductGrid } from "../../components/Commerce";
import { getThumbnailUrl } from "../../utils/imageUrl";
import s from "./CartPage.module.css";
import VoucherDialog from "./VoucherDialog";

function SelectAll({
  all,
  some,
  onChange,
  label,
  ariaLabel = label,
  hideLabel = false,
}) {
  return (
    <label className={s.checkbox}>
      <input
        type="checkbox"
        aria-label={ariaLabel}
        checked={all}
        ref={(node) => {
          if (node) node.indeterminate = some && !all;
        }}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className={hideLabel ? s.srOnly : undefined}>{label}</span>
    </label>
  );
}
function CartRow({ line, max }) {
  const { setQuantity, removeItem, toggleItem } = useCart();
  const [value, setValue] = useState(String(line.quantity));
  useEffect(() => setValue(String(line.quantity)), [line.quantity]);
  const name = `${line.product.title} · ${line.variant}${line.size ? ` · ${line.size}` : ""}`;
  function commit() {
    const number = Math.floor(Number(value));
    const next = Number.isFinite(number)
      ? Math.min(max, Math.max(1, number))
      : line.quantity;
    setValue(String(next));
    setQuantity(line.id, next);
  }
  return (
    <article className={s.row} aria-label={name}>
      <input
        className={s.rowSelect}
        type="checkbox"
        aria-label={`Select ${name}`}
        checked={line.selected}
        onChange={() => toggleItem(line.id)}
      />
      <div className={s.product}>
        <Link to={`/product/${line.productId}`}>
          <img
            src={getThumbnailUrl(line.product.image, 100)}
            alt={line.product.title}
          />
        </Link>
        <div>
          <Link className={s.productTitle} to={`/product/${line.productId}`}>
            {line.product.mall && <span className={s.mallBadge}>Mall</span>}
            {line.product.title}
          </Link>
          <small>
            <Truck size={11} /> Vận chuyển nhanh toàn quốc
          </small>
        </div>
      </div>
      <div className={s.variation}>
        <span>Phân loại hàng:</span>
        <p>
          {line.variant}
          {line.size ? ` · ${line.size}` : ""}
        </p>
      </div>
      <div className={s.unitPrice}>
        <del>{money(line.product.original)}</del>
        <span>{money(line.product.price)}</span>
      </div>
      <div className={s.quantityCell}>
        <div className={s.quantity}>
          <button
            aria-label={`Decrease quantity for ${name}`}
            disabled={line.quantity <= 1}
            onClick={() => setQuantity(line.id, line.quantity - 1)}
          >
            <Minus size={12} />
          </button>
          <input
            aria-label={`Quantity for ${name}`}
            type="number"
            min="1"
            max={max}
            step="1"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.currentTarget.blur();
              }
            }}
          />
          <button
            aria-label={`Increase quantity for ${name}`}
            disabled={line.quantity >= max}
            onClick={() => setQuantity(line.id, line.quantity + 1)}
          >
            <Plus size={12} />
          </button>
        </div>
        <small>Còn {max} sản phẩm</small>
      </div>
      <strong className={s.lineTotal}>
        {money(line.product.price * line.quantity)}
      </strong>
      <div className={s.actions}>
        <button
          className={s.remove}
          aria-label={`Remove ${name}`}
          onClick={() => removeItem(line.id)}
        >
          Xóa
        </button>
        <Link to={`/category/${encodeURIComponent(line.product.category)}`}>
          Tìm sản phẩm tương tự
          <ChevronRight size={11} />
        </Link>
      </div>
    </article>
  );
}
export default function CartPage() {
  const {
    lines,
    selectedCount,
    savings,
    appliedVoucher,
    voucherEligibility,
    voucherDiscount,
    total,
    applyVoucher,
    storageError,
    selectAll,
    removeSelected,
    selectItems,
  } = useCart();
  const navigate = useNavigate();
  const [voucherOpen, setVoucherOpen] = useState(false);
  const selected = lines.filter((line) => line.selected);
  const all = lines.length > 0 && selected.length === lines.length;
  const some = selected.length > 0;
  const groups = lines.reduce((list, line) => {
    const seller = getProductDetails(line.product).seller.name;
    const group = list.find((group) => group.seller === seller);
    if (group) group.lines.push(line);
    else list.push({ seller, lines: [line] });
    return list;
  }, []);
  return (
    <div className={s.page}>
      <div className={s.cartContent}>
        {storageError && (
          <p className={s.storageNotice} role="status">
            Your cart is available for this visit. Browser storage is
            unavailable, so it may not be saved after you leave.
          </p>
        )}
        {!lines.length ? (
          <section className={s.empty}>
            <span>
              <ShoppingCart size={42} strokeWidth={1.2} />
            </span>
            <h2>Your next favorite is waiting.</h2>
            <p>
              Your shopping cart is empty. Find a little more of what you love.
            </p>
            <Link to="/">
              Explore the marketplace
              <ArrowRight size={15} />
            </Link>
          </section>
        ) : (
          <>
            <div className={s.tableHeader}>
              <SelectAll
                all={all}
                some={some}
                onChange={selectAll}
                label="Product"
                ariaLabel="Select all products"
              />
              <span>Unit Price</span>
              <span>Quantity</span>
              <span>Item Subtotal</span>
              <span>Action</span>
            </div>
            {groups.map((group) => (
              <section
                className={s.sellerGroup}
                key={group.seller}
                aria-label={group.seller}
              >
                <div className={s.sellerHeading}>
                  <SelectAll
                    all={group.lines.every((line) => line.selected)}
                    some={group.lines.some((line) => line.selected)}
                    onChange={(value) =>
                      selectItems(
                        group.lines.map((line) => line.id),
                        value,
                      )
                    }
                    label={`Select ${group.seller} products`}
                    hideLabel
                  />
                  {group.lines.some((line) => line.product.mall) ? (
                    <span className={s.sellerMall}>Mall</span>
                  ) : (
                    <Store size={17} />
                  )}
                  <h2>{group.seller}</h2>
                  <Link
                    to={`/shop/${getProductDetails(group.lines[0].product).seller.id}`}
                  >
                    Visit Shop
                    <ChevronRight size={12} />
                  </Link>
                </div>
                <div className={s.groupProducts}>
                  <div className={s.offerStrip}>
                    <span>SHOP OFFERS</span>
                    <p>Discover more everyday favorites from this shop.</p>
                    <Link
                      to={`/shop/${getProductDetails(group.lines[0].product).seller.id}`}
                    >
                      Shop more
                      <ChevronRight size={12} />
                    </Link>
                  </div>
                  {group.lines.map((line) => {
                    const otherQuantity = lines
                      .filter(
                        (other) =>
                          other.productId === line.productId &&
                          other.id !== line.id,
                      )
                      .reduce((sum, other) => sum + other.quantity, 0);
                    return (
                      <CartRow
                        key={line.id}
                        line={line}
                        max={line.product.stock - otherQuantity}
                      />
                    );
                  })}
                </div>
                <div className={s.shopVouchers}>
                  <Ticket size={17} />
                  <span>See all shop vouchers</span>
                  <button onClick={() => setVoucherOpen(true)}>
                    Explore vouchers
                  </button>
                </div>
                <div className={s.shippingNote}>
                  <Truck size={16} />
                  <span>Phí vận chuyển chính xác sẽ được tính tại trang Thanh toán</span>
                  <Link to="/help">
                    Tìm hiểu thêm
                    <ChevronRight size={12} />
                  </Link>
                </div>
              </section>
            ))}
            <div className={s.summary}>
              <div className={s.voucherRow}>
                <span>
                  <Ticket size={18} />
                  Shopiz Voucher
                </span>
                <div className={s.voucherSelection}>
                  <button
                    onClick={() => setVoucherOpen(true)}
                    aria-haspopup="dialog"
                  >
                    {appliedVoucher
                      ? appliedVoucher.code
                      : "Chọn hoặc nhập mã"}
                    <ChevronRight size={13} />
                  </button>
                  {appliedVoucher && (
                    <button
                      className={s.removeVoucher}
                      aria-label="Remove voucher"
                      onClick={() => applyVoucher("")}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
              {appliedVoucher && (
                <div className={s.voucherSavings}>
                  <span>
                    {voucherEligibility.eligible
                      ? appliedVoucher.type === "shipping"
                        ? "Voucher vận chuyển đã chọn"
                        : "Voucher giảm giá"
                      : voucherEligibility.reason}
                  </span>
                  <strong>−{money(voucherDiscount)}</strong>
                </div>
              )}
              <div className={s.coinsRow}>
                <label>
                  <input type="checkbox" disabled />
                  <Coins size={18} />
                  Shopee Xu
                </label>
                <span>
                  {some
                    ? "Chưa có xu khả dụng"
                    : "Chọn sản phẩm để dùng xu"}
                </span>
                <small>−{money(0)}</small>
              </div>
              <div className={s.summaryTop}>
                <SelectAll
                  all={all}
                  some={some}
                  onChange={selectAll}
                  label={`Chọn tất cả (${lines.length})`}
                />
                <button
                  className={s.deleteSelected}
                  disabled={!some}
                  onClick={removeSelected}
                >
                  <Trash2 size={14} />
                  Xóa đã chọn
                </button>
                <Link className={s.continueShopping} to="/">
                  Tiếp tục mua sắm
                </Link>
                <div className={s.totals}>
                  <div>
                    <span>
                      Tổng thanh toán ({selectedCount}{" "}
                      {selectedCount === 1 ? "sản phẩm" : "sản phẩm"}):
                    </span>
                    <strong data-testid="cart-total">{money(total)}</strong>
                  </div>
                  <small>
                    Tiết kiệm {money(savings + voucherDiscount)} · Phí vận chuyển tính khi thanh toán
                  </small>
                </div>
                <button
                  className={s.checkout}
                  disabled={!some}
                  onClick={() => navigate("/checkout")}
                >
                  Mua Hàng ({selectedCount})
                </button>
              </div>
            </div>
          </>
        )}
      </div>
      <ProductGrid
        title="CÓ THỂ BẠN CŨNG THÍCH"
        subtitle="Gợi ý sản phẩm phù hợp cho bạn"
      />
      {voucherOpen && <VoucherDialog onClose={() => setVoucherOpen(false)} />}
    </div>
  );
}
