export const cartStorageKey = "shopiz-cart-v1";

export const lineId = (item) =>
  JSON.stringify([
    String(item.productId),
    item.modelId ? String(item.modelId) : (item.variant || "Standard"),
    item.size || "",
  ]);

export function normalizeCart(input) {
  if (!Array.isArray(input)) return [];
  const result = [];
  for (const item of input) {
    if (!item || typeof item !== "object") continue;
    const quantity = Math.floor(Number(item.quantity));
    if (!Number.isFinite(quantity) || quantity < 1) continue;
    const maxStock = Math.max(1, Number(item.stock || 50));
    const remaining =
      maxStock -
      result
        .filter((line) => String(line.productId) === String(item.productId))
        .reduce((sum, line) => sum + line.quantity, 0);
    if (remaining <= 0) continue;
    const existing = result.find((line) => lineId(line) === lineId(item));
    if (existing) {
      existing.quantity += Math.min(quantity, remaining);
    } else {
      result.push({
        productId: String(item.productId),
        itemId: item.itemId || item.productId,
        modelId: item.modelId || null,
        variant: item.variant || "Standard",
        size: item.size || "",
        quantity: Math.min(quantity, remaining),
        selected: item.selected !== false,
        title: item.title || `Sản phẩm #${item.productId}`,
        image: item.image || "",
        price: Number(item.price || 0),
        original: Number(item.original || item.price || 0),
        shopId: item.shopId || null,
        shopName: item.shopName || "",
        category: item.category || "General",
        carrierName: item.carrierName || "Shopee Xpress",
        shippingFee: Number(item.shippingFee || 15000),
        stock: maxStock,
      });
    }
  }
  return result;
}

export function addCartItem(items, item) {
  const clean = normalizeCart([{ ...item, selected: true }])[0];
  if (!clean)
    return {
      items,
      added: 0,
      error: "Vui lòng chọn phân loại và số lượng hợp lệ.",
    };
  const stock = clean.stock || 50;
  const inCart = items
    .filter((line) => String(line.productId) === String(clean.productId))
    .reduce((sum, line) => sum + line.quantity, 0);
  const added = Math.min(clean.quantity, Math.max(0, stock - inCart));
  if (!added)
    return {
      items,
      added: 0,
      error: "Đã đạt số lượng tối đa có sẵn của sản phẩm này.",
    };
  const existing = items.find((line) => lineId(line) === lineId(clean));
  const next = existing
    ? items.map((line) =>
        lineId(line) === lineId(clean)
          ? { ...line, quantity: line.quantity + added, selected: true }
          : line,
      )
    : [...items, { ...clean, quantity: added }];
  return {
    items: next,
    added,
    limited: added < Math.floor(Number(item.quantity)),
  };
}

export function updateCartQuantity(items, id, quantity) {
  const item = items.find((line) => lineId(line) === id);
  if (!item) return items;
  const value = Math.floor(Number(quantity));
  if (!Number.isFinite(value)) return items;
  const max = Math.max(1, Number(item.stock || 50));
  return items.map((line) =>
    lineId(line) === id
      ? { ...line, quantity: Math.min(max, Math.max(1, value)) }
      : line,
  );
}
