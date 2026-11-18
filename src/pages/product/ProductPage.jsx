import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ShoppingCart,
  ShieldCheck,
  Truck,
  RotateCcw,
  ChevronRight,
  Minus,
  Plus,
  MessageCircle,
  Store,
  Ticket,
  X,
  PackageCheck,
  Check,
} from "lucide-react";
import { products, money } from "../../data/catalog";
import { ProductGrid } from "../../components/Commerce";
import Placeholder from "../placeholder/PlaceholderPage";
import ProductGallery from "./ProductGallery";
import ProductReviews, { Stars } from "./ProductReviews";
import { getProductDetails } from "../../data/productDetails";
import { useCart } from "../../components/cart/CartProvider";
import { useAuth } from "../../components/auth/AuthProvider";
import { useCatalog } from "../../components/catalog/CatalogProvider";
import catalogService, { mapBackendProduct } from "../../services/catalogService";
import ChatDialog from "../../components/chat/ChatDialog";
import s from "./ProductPage.module.css";

function ProductDetail({ product: p }) {
  const { addItem } = useCart();
  const { user, buyerId } = useAuth();
  const { products: liveCatalog } = useCatalog();
  const navigate = useNavigate();
  const location = useLocation();
  const [likeState, setLikeState] = useState({ liked: false, likes: 0 });
  const itemId = p.itemId || p.id;
  const backendItem = Boolean(p.itemId);
  const [cartNotice, setCartNotice] = useState(null);
  useEffect(() => {
    if (!cartNotice) return;
    const timer = setTimeout(
      () => setCartNotice(null),
      cartNotice.error ? 5000 : 3000,
    );
    return () => clearTimeout(timer);
  }, [cartNotice]);

  const catTitle =
    typeof p.category === "string"
      ? p.category
      : p.category?.category_name || "General";

  const isMockItem = Number(p.id) >= 1 && Number(p.id) <= 18 && p.price < 1000;
  const details = getProductDetails(p);
  const [variant, setVariant] = useState(details.variants[0] || "Standard");
  const [size, setSize] = useState(details.sizes[0] || "");
  const [quantity, setQuantity] = useState("1");
  const [destination, setDestination] = useState("Ho Chi Minh City");
  const [delivery, setDelivery] = useState(isMockItem ? "standard" : "30001");
  const [shippingChannels, setShippingChannels] = useState([]);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [message, setMessage] = useState("");
  const preview = useRef(null);

  useEffect(() => {
    if (!backendItem || !user || !buyerId) return;
    let active = true;
    catalogService.getProductLike(itemId, buyerId).then((data) => {
      if (active) setLikeState({ liked: Boolean(data.liked), likes: Number(data.likes || 0) });
    }).catch(() => {});
    return () => { active = false; };
  }, [backendItem, itemId, buyerId, user]);

  async function toggleLike() {
    if (!user || !buyerId) {
      navigate("/login", { state: { returnTo: `${location.pathname}${location.search}${location.hash}` } });
      return;
    }
    if (!backendItem) {
      setMessage("Favorites are available for simulator products after sign-in.");
      return;
    }
    try {
      const data = await catalogService.toggleProductLike(itemId, buyerId);
      setLikeState({ liked: Boolean(data.liked), likes: Number(data.likes || 0) });
    } catch {
      setMessage("Could not update favorites. Please try again.");
    }
  }

  // Model-specific pricing and stock if multi-variant
  const selectedModel =
    Array.isArray(p.models) && p.models.length > 0
      ? p.models.find((m) => {
          const name = (m.model_name || "").toLowerCase();
          const v = (variant || "").toLowerCase();
          const sz = (size || "").toLowerCase();
          if (sz) {
            return name.includes(v) && name.includes(sz);
          }
          return name.includes(v);
        }) || p.models[0]
      : null;

  const currentPrice = selectedModel?.current_price ?? p.price ?? 0;
  const currentOriginal =
    selectedModel?.original_price ?? p.original ?? currentPrice;
  const currentStock = selectedModel?.seller_stock ?? details.stock ?? 50;

  const count = Math.max(
    1,
    Math.min(currentStock, Math.floor(Number(quantity) || 1)),
  );

  // Dynamic shipping calculation for backend simulator products
  useEffect(() => {
    if (isMockItem) return;

    let active = true;
    setShippingLoading(true);

    const items = [
      {
        item_id: p.itemId || p.id,
        item_price: currentPrice,
        quantity: count,
      },
    ];

    catalogService
      .calculateShippingFee({
        shopId: p.shopId || p.seller?.id || 727720655,
        recipientCity: destination,
        items,
      })
      .then((res) => {
        if (!active) return;
        const channels = res?.channels || [];
        setShippingChannels(channels);
        const currentChannel = channels.find(
          (c) => String(c.channel_id || c.channelId) === String(delivery),
        );
        if (!currentChannel || !currentChannel.enabled) {
          const firstEnabled = channels.find((c) => c.enabled);
          if (firstEnabled) {
            setDelivery(String(firstEnabled.channel_id || firstEnabled.channelId));
          }
        }
      })
      .catch((err) => {
        console.warn("Could not calculate dynamic shipping fee:", err);
      })
      .finally(() => {
        if (active) setShippingLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isMockItem, p.shopId, p.seller?.id, p.itemId, p.id, destination, count, currentPrice]);

  const activeChannel =
    shippingChannels.find(
      (c) => String(c.channel_id || c.channelId) === String(delivery),
    ) || shippingChannels[0];

  const shippingFee = activeChannel
    ? Number(
        activeChannel.buyer_paid_shipping_fee ??
          activeChannel.buyerPaidShippingFee ??
          activeChannel.actual_shipping_fee ??
          activeChannel.actualShippingFee ??
          15000,
      )
    : delivery === "express"
      ? 35000
      : 15000;

  const estimatedDays = isMockItem
    ? `${delivery === "express" ? "1–2" : "3–5"} business days`
    : activeChannel
      ? activeChannel.estimated_delivery_days ||
        activeChannel.estimatedDeliveryDays ||
        "1–3 business days"
      : "1–3 business days";

  const catalogList = liveCatalog && liveCatalog.length ? liveCatalog : products;
  const related = catalogList
    .filter((x) => String(x.id) !== String(p.id))
    .sort(
      (a, b) =>
        Number((a.category || "") === catTitle) -
        Number((b.category || "") === catTitle),
    )
    .slice(0, 6);
  function addToCart() {
    setQuantity(String(count));
    const result = addItem({
      productId: p.id,
      itemId: p.itemId || p.id,
      modelId: selectedModel?.model_id || null,
      variant: selectedModel?.model_name || variant,
      size,
      quantity: count,
      price: currentPrice,
      original: currentOriginal,
      title: p.title,
      image: p.image,
      shopId: p.shopId || p.seller?.id || p.seller?.shop_id,
      shopName: p.shopName || details.seller?.name || p.seller?.shop_name,
      category: catTitle,
      stock: currentStock,
      shippingFee,
      carrierName: activeChannel?.carrier_name || activeChannel?.channel_name || activeChannel?.channelName || "Shopee Xpress",
    });
    setCartNotice({
      id: Date.now(),
      error: !result.added,
      text: result.added
        ? `Đã thêm sản phẩm vào giỏ hàng.${result.limited ? " Đã điều chỉnh theo số lượng kho." : ""}`
        : result.error,
    });
    return result;
  }

  function handleBuyNow() {
    const result = addToCart();
    if (result && result.added) {
      navigate("/checkout");
    }
  }
  return (
    <div className={s.page}>
      {cartNotice && (
        <div
          key={cartNotice.id}
          className={s.cartToast}
          role={cartNotice.error ? "alert" : "status"}
          aria-atomic="true"
        >
          {cartNotice.error ? <ShoppingCart size={21} /> : <Check size={23} />}
          <span>{cartNotice.text}</span>
        </div>
      )}
      <nav className={s.breadcrumb} aria-label="Breadcrumb">
        <Link to="/">Trang chủ</Link>
        <ChevronRight size={12} />
        <Link to={`/category/${encodeURIComponent(catTitle)}`}>
          {catTitle}
        </Link>
        <ChevronRight size={12} />
        <span>{p.title || "Product"}</span>
      </nav>
      <section className={s.overview}>
        <ProductGallery
          product={p}
          gallery={details.gallery}
          onMessage={setMessage}
          liked={likeState.liked}
          likeCount={likeState.likes}
          onToggleLike={toggleLike}
        />
        <div className={s.purchase}>
          <h1>
            {p.mall && <span className={s.mallBadge}>Mall</span>}
            {p.title}
          </h1>
          <div className={s.metrics}>
            <a href="#product-reviews">
              <strong>{p.rating || "5.0"}</strong>
              <Stars rating={Number(p.rating) || 5.0} />
            </a>
            <a href="#product-reviews">
              <strong>{p.ratingCount ?? (details.reviews || []).length}</strong> Đánh giá
            </a>
            <span>
              <strong>{(p.sold ?? 0).toLocaleString()}</strong> Đã bán
            </span>
          </div>
          <div className={s.pricePanel}>
            <div>
              <del>{money(currentOriginal)}</del>
              <strong>{money(currentPrice)}</strong>
              {p.discount ? <span>GIẢM {p.discount}%</span> : null}
            </div>
            <p>
              <ShieldCheck size={14} />
              Chính hãng 100% · Giao hàng nhanh toàn quốc
            </p>
          </div>
          <dl className={s.purchaseRows}>
            <div>
              <dt>Mã giảm giá</dt>
              <dd>
                <Link className={s.voucher} to="/vouchers">
                  <Ticket size={14} />
                  Xem tất cả voucher
                  <ChevronRight size={12} />
                </Link>
              </dd>
            </div>
            <div>
              <dt>Vận chuyển</dt>
              <dd>
                <span className={s.deliveryLine}>
                  <Truck size={17} />
                  Ships from {p.location || "Ho Chi Minh City"}
                </span>
                <label className={s.deliveryLabel}>
                  Deliver to{" "}
                  <select
                    aria-label="Delivery destination"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                  >
                    {["Ho Chi Minh City", "Hanoi", "Da Nang"].map((city) => (
                      <option key={city}>{city}</option>
                    ))}
                  </select>
                </label>
                <label className={s.deliveryLabel}>
                  Shipping{" "}
                  <select
                    aria-label="Shipping method"
                    value={delivery}
                    onChange={(e) => setDelivery(e.target.value)}
                    disabled={shippingLoading && !shippingChannels.length}
                  >
                    {isMockItem ? (
                      <>
                        <option value="standard">Standard · Free</option>
                        <option value="express">Express · {money(2.9)}</option>
                      </>
                    ) : shippingChannels.length > 0 ? (
                      shippingChannels.map((c) => {
                        const cid = String(c.channel_id || c.channelId);
                        const cname = c.channel_name || c.channelName;
                        const fee = Number(
                          c.buyer_paid_shipping_fee ?? c.buyerPaidShippingFee ?? 0,
                        );
                        const feeStr = fee === 0 ? "Free" : money(fee);
                        const isDis = !c.enabled;
                        const disReason = c.disabled_reason || c.disabledReason;
                        return (
                          <option key={cid} value={cid} disabled={isDis}>
                            {cname} · {feeStr} {isDis && disReason ? `(${disReason})` : ""}
                          </option>
                        );
                      })
                    ) : (
                      <>
                        <option value="30001">SPX Express · Free</option>
                        <option value="30002">SPX Instant · {money(25000)}</option>
                        <option value="30003">SPX Economy · Free</option>
                      </>
                    )}
                  </select>
                </label>
                <small>
                  {shippingLoading ? (
                    "Calculating shipping fee..."
                  ) : (
                    <>Estimated delivery: {estimatedDays}</>
                  )}
                </small>
              </dd>
            </div>
            <div>
              <dt>Returns</dt>
              <dd>
                <span className={s.deliveryLine}>
                  <RotateCcw size={16} />
                  15-day easy returns
                </span>
                <small>Illustrative shipping and return benefits.</small>
              </dd>
            </div>
            <div>
              <dt>{details.option}</dt>
              <dd
                className={s.optionGroup}
                role="group"
                aria-label={details.option}
              >
                {details.variants.map((value) => (
                  <button
                    key={value}
                    aria-pressed={variant === value}
                    className={variant === value ? s.selectedOption : ""}
                    onClick={() => setVariant(value)}
                  >
                    {value}
                    {variant === value && <Check size={11} />}
                  </button>
                ))}
              </dd>
            </div>
            {details.sizes.length > 0 && (
              <div>
                <dt>Size</dt>
                <dd className={s.optionGroup} role="group" aria-label="Size">
                  {details.sizes.map((value) => (
                    <button
                      key={value}
                      aria-pressed={size === value}
                      className={size === value ? s.selectedOption : ""}
                      onClick={() => setSize(value)}
                    >
                      {value}
                    </button>
                  ))}
                </dd>
              </div>
            )}
            <div>
              <dt>Quantity</dt>
              <dd className={s.quantityRow}>
                <div className={s.quantity}>
                  <button
                    aria-label="Decrease quantity"
                    disabled={count <= 1}
                    onClick={() => setQuantity(String(count - 1))}
                  >
                    <Minus size={13} />
                  </button>
                  <input
                    type="number"
                    min="1"
                    max={currentStock}
                    step="1"
                    aria-label="Quantity"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    onBlur={() => setQuantity(String(count))}
                  />
                  <button
                    aria-label="Increase quantity"
                    disabled={count >= currentStock}
                    onClick={() => setQuantity(String(count + 1))}
                  >
                    <Plus size={13} />
                  </button>
                </div>
                <span>{currentStock} sản phẩm có sẵn</span>
              </dd>
            </div>
          </dl>
          <div className={s.buyActions}>
            <button className={s.addToCart} onClick={addToCart}>
              <ShoppingCart size={19} />
              Thêm Vào Giỏ Hàng
            </button>
            <button className={s.buyNow} onClick={handleBuyNow}>
              Mua Ngay
            </button>
          </div>
          <div className={s.assurance}>
            <ShieldCheck size={21} />
            <span>
              <strong>Shopiz Đảm Bảo</strong>
              <small>Đảm bảo quyền lợi khách hàng trong mọi đơn hàng.</small>
            </span>
            <Link to="/help">
              Tìm hiểu thêm
              <ChevronRight size={12} />
            </Link>
          </div>
        </div>
      </section>
      {message && (
        <p className={s.message} role="status">
          {message}
          <button aria-label="Dismiss message" onClick={() => setMessage("")}>
            <X size={14} />
          </button>
        </p>
      )}
      <section className={s.seller} aria-label="Seller information">
        <div className={s.sellerIdentity}>
          <span className={s.storeAvatar}>
            <Store size={28} strokeWidth={1.3} />
          </span>
          <div>
            <h2>{details.seller?.name || p.shopName || "Official Store"}</h2>
            <p>Vừa mới truy cập</p>
            <div>
              <button onClick={() => setChatOpen(true)}>
                <MessageCircle size={13} />
                Chat Ngay
              </button>
              <Link to={`/shop/${details.seller?.id || p.shopId || "shop-001"}`}>
                <Store size={13} />
                Xem Shop
              </Link>
            </div>
          </div>
        </div>
        <dl className={s.sellerStats}>
          {[
            ["Đánh giá", details.seller?.rating || "4.9"],
            ["Sản phẩm", details.seller?.products || 24],
            ["Tỉ lệ phản hồi", details.seller?.responseRate || details.seller?.response_rate || "98%"],
            ["Thời gian phản hồi", details.seller?.responseTime || "Trong vài giờ"],
            ["Tham gia", details.seller?.joined || "2 năm trước"],
            ["Người theo dõi", details.seller?.followers || "15.4k"],
          ].map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section className={s.section}>
        <h2 className={s.sectionTitle}>CHI TIẾT SẢN PHẨM</h2>
        <dl className={s.specs}>
          {[
            ["Danh Mục", catTitle],
            ["Thương hiệu", p.brand || p.shopName || details.brand || "Shopiz Select"],
            ["Mã SKU", p.sku || details.sku || `SZ-${p.id}`],
            ["Tình trạng", p.condition || "Mới"],
            ["Kho hàng", `${currentStock} sản phẩm`],
            ["Gửi từ", p.location || "TP. Hồ Chí Minh"],
          ].map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>
                {label === "Danh Mục" ? (
                  <Link to={`/category/${encodeURIComponent(value)}`}>
                    {value}
                    <ChevronRight size={11} />
                  </Link>
                ) : (
                  value
                )}
              </dd>
            </div>
          ))}
        </dl>
        <h2 className={s.sectionTitle}>MÔ TẢ SẢN PHẨM</h2>
        <div className={s.description}>
          {p.description ? (
            <div style={{ whiteSpace: "pre-line", wordBreak: "break-word" }}>
              {p.description}
            </div>
          ) : (
            <p>Chưa có mô tả chi tiết cho sản phẩm này.</p>
          )}
        </div>
      </section>
      <ProductReviews product={p} reviews={details.reviews || []} />
      <ProductGrid
        items={related}
        title="SẢN PHẨM CÙNG SHOP"
        subtitle="Khám phá các sản phẩm liên quan"
        loadMore={false}
      />
      <ProductGrid
        items={products.filter((x) => String(x.id) !== String(p.id)).slice(-6)}
        title="CÓ THỂ BẠN CŨNG THÍCH"
        loadMore={false}
      />
      <dialog
        ref={preview}
        className={s.previewDialog}
        aria-labelledby="preview-heading"
        onClick={(e) => {
          if (e.target === e.currentTarget) preview.current.close();
        }}
      >
        <button
          className={s.closeDialog}
          aria-label="Close preview"
          onClick={() => preview.current.close()}
        >
          <X size={20} />
        </button>
        <h2 id="preview-heading">Review your selection</h2>
        <div className={s.orderItem}>
          <img src={p.image} alt={p.title} />
          <div>
            <h3>{p.title}</h3>
            <p>
              {variant}
              {size ? ` · ${size}` : ""} · Quantity: {count}
            </p>
            <strong>{money(currentPrice * count)}</strong>
          </div>
        </div>
        <dl className={s.orderTotals}>
          <div>
            <dt>Delivery to</dt>
            <dd>{destination}</dd>
          </div>
          <div>
            <dt>Carrier</dt>
            <dd>{activeChannel?.channel_name || activeChannel?.channelName || "SPX Express"}</dd>
          </div>
          <div>
            <dt>Shipping</dt>
            <dd>{money(shippingFee)}</dd>
          </div>
          <div>
            <dt>Total</dt>
            <dd>{money(currentPrice * count + shippingFee)}</dd>
          </div>
        </dl>
        <p className={s.demoNote}>
          <PackageCheck size={16} />
          This is a selection preview. Checkout is not available.
        </p>
      </dialog>
      <ChatDialog
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        shop={details.seller || { id: p.shopId, name: p.shopName }}
        productContext={{
          id: p.id,
          title: p.title,
          image: p.image,
          price: currentPrice,
        }}
      />
    </div>
  );
}
export default function ProductPage() {
  const { id } = useParams();
  const { products: liveCatalog } = useCatalog();
  const lastVisited = useRef(null);
  const catalogList = liveCatalog && liveCatalog.length ? liveCatalog : products;
  const localProduct = catalogList.find((p) => String(p.id) === String(id));
  const [product, setProduct] = useState(localProduct || null);
  const [loading, setLoading] = useState(!localProduct);

  useEffect(() => {
    let isMounted = true;
    const found = catalogList.find((p) => String(p.id) === String(id));
    if (found) {
      setProduct(found);
    } else {
      setLoading(true);
    }

    catalogService
      .getProductDetail(id)
      .then(async (detail) => {
        if (isMounted && detail) {
          let enriched = detail;
          const sid = detail.shop_id || detail.seller?.shop_id;
          if (sid) {
            try {
              const extraList = await catalogService.getItemExtraInfo(sid, [id]);
              if (extraList?.[0]) {
                enriched = {
                  ...detail,
                  sales: extraList[0].sale,
                  sale: extraList[0].sale,
                  sold: extraList[0].sale,
                  rating_star: extraList[0].rating_star,
                  comment_count: extraList[0].comment_count,
                  views: extraList[0].views,
                  likes: extraList[0].likes,
                };
              }
            } catch {}
          }
          const mapped = mapBackendProduct(enriched);
          setProduct(mapped);
          if (lastVisited.current !== String(id)) {
            lastVisited.current = String(id);
            catalogService.recordProductView(id).catch(() => {});
          }
        }
      })
      .catch((err) => {
        console.warn("Could not fetch remote product detail:", err);
        if (isMounted && !found) {
          setProduct(null);
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "400px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        Loading product details...
      </div>
    );
  }

  return product ? (
    <ProductDetail key={product.id} product={product} />
  ) : (
    <Placeholder title="Product not found" />
  );
}
