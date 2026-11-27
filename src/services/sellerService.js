import api from "./api";

export const sellerService = {
  async getShops() {
    const data = await api.get("/simulator/shops");
    return data.shops || [];
  },

  async getOrders(shopId, filtersOrStatus = {}) {
    const filters = typeof filtersOrStatus === "string" ? { status: filtersOrStatus } : (filtersOrStatus || {});
    const query = new URLSearchParams();
    if (shopId) query.set("shop_id", String(shopId));
    if (filters.status && filters.status !== "ALL" && filters.status !== "all") {
      query.set("status", Array.isArray(filters.status) ? filters.status.join(",") : String(filters.status));
    }
    if (filters.subStatus) query.set("sub_status", String(filters.subStatus));
    if (filters.carrier && filters.carrier !== "ALL") query.set("carrier", String(filters.carrier));
    if (filters.keyword) query.set("keyword", String(filters.keyword).trim());
    if (filters.searchType) query.set("search_type", String(filters.searchType));
    if (filters.dateFrom) query.set("date_from", String(filters.dateFrom));
    if (filters.dateTo) query.set("date_to", String(filters.dateTo));
    if (filters.sortBy) query.set("sort_by", String(filters.sortBy));
    query.set("page_size", String(filters.pageSize || "200"));

    const data = await api.get(`/simulator/orders?${query.toString()}`);
    const orders = data.orders || [];
    orders.tab_counts = data.tab_counts || {};
    orders.carrier_counts = data.carrier_counts || {};
    orders.carrier_counts_ready = data.carrier_counts_ready || {};
    orders.carrier_counts_processed = data.carrier_counts_processed || {};
    return orders;
  },

  async getOrderDetail(orderSn) {
    const data = await api.get(`/simulator/order/detail?order_sn=${encodeURIComponent(orderSn)}`);
    return data.order || data;
  },

  async shipOrder(orderSn, trackingNumber = "") {
    const data = await api.post("/simulator/order/ship", {
      order_sn: orderSn,
      ...(trackingNumber ? { tracking_number: trackingNumber } : {}),
    });
    return data;
  },

  async handoverOrder(orderSn) {
    const data = await api.post("/simulator/order/handover", {
      order_sn: orderSn,
    });
    return data;
  },

  async generateAwb(orderSn) {
    const data = await api.post("/simulator/order/generate_awb", {
      order_sn: orderSn,
    });
    return data;
  },

  getAwbDownloadUrl(orderSn) {
    return `/api/v2/simulator/order/download_awb?order_sn=${encodeURIComponent(orderSn)}`;
  },

  async batchShipOrders(orderSnList, shippingType = "pickup", pickupTimeId = "", addressId = null) {
    const data = await api.post("/simulator/order/batch_ship", {
      order_sn_list: orderSnList,
      shipping_type: shippingType,
      pickup_time_id: pickupTimeId,
      address_id: addressId,
    });
    return data;
  },

  async batchGenerateAwb(orderSnList, documentType = "shipping_label", printFormat = "thermal") {
    const data = await api.post("/simulator/order/batch_generate_awb", {
      order_sn_list: orderSnList,
      document_type: documentType,
      print_format: printFormat,
    });
    return data;
  },

  getBatchAwbDownloadUrl(orderSnList, documentType = "shipping_label", printFormat = "thermal") {
    const sns = Array.isArray(orderSnList) ? orderSnList.join(",") : orderSnList;
    return `/api/v2/simulator/order/batch_download_awb?order_sn_list=${encodeURIComponent(sns)}&doc_type=${encodeURIComponent(documentType)}&print_format=${encodeURIComponent(printFormat)}`;
  },

  getManifestDownloadUrl(orderSnList, carrier = "Shopee Xpress", shopId = null) {
    const sns = Array.isArray(orderSnList) ? orderSnList.join(",") : orderSnList;
    let url = `/api/v2/simulator/order/manifest?order_sn_list=${encodeURIComponent(sns)}&carrier=${encodeURIComponent(carrier)}`;
    if (shopId) url += `&shop_id=${encodeURIComponent(shopId)}`;
    return url;
  },

  async getReviewSummary(shopId, lastVisitAt) {
    const query = new URLSearchParams({ shop_id: String(shopId) });
    if (lastVisitAt) query.set("last_visit_at", String(lastVisitAt));
    return api.get(`/simulator/reviews/summary?${query.toString()}`);
  },

  async getReviews(shopId, { pageSize = 20, cursor = 0, status = "ALL", ratings = [], keyword = "", dateFrom = "", dateTo = "" } = {}) {
    const query = new URLSearchParams({ shop_id: String(shopId), page_size: String(pageSize), cursor: String(cursor), status });
    if (ratings.length) query.set("rating_star_list", ratings.join(","));
    if (keyword) query.set("keyword", keyword);
    if (dateFrom) query.set("date_from", dateFrom);
    if (dateTo) query.set("date_to", dateTo);
    return api.get(`/simulator/reviews?${query.toString()}`);
  },

  async replyToReview(shopId, commentId, reply) {
    return api.post("/simulator/review/reply", { shop_id: shopId, comment_id: commentId, reply });
  },

  async getAnalytics(shopId, period = "today") {
    const data = await api.get(
      `/simulator/seller/analytics?shop_id=${shopId}&period=${period}`,
    );
    return data; // { metrics, chart }
  },

  async createProduct(formDataOrPayload) {
    const isFormData = formDataOrPayload instanceof FormData;
    const config = isFormData
      ? { headers: { "Content-Type": "multipart/form-data" } }
      : {};
    const data = await api.post(
      "/simulator/product/create",
      formDataOrPayload,
      config,
    );
    return data;
  },

  async getProductDetail(itemId) {
    const data = await api.get(`/simulator/product/detail?item_id=${encodeURIComponent(itemId)}`);
    return data.product;
  },

  async updateProduct(payload) {
    return api.post("/simulator/product/update", payload);
  },

  async getProductCreationConfig(shopId) {
    return api.get(`/simulator/product-creation/config?shop_id=${encodeURIComponent(shopId)}`);
  },

  async deleteProduct(itemId, shopId) {
    const data = await api.post("/simulator/product/delete", {
      item_id: itemId,
      shop_id: shopId,
    });
    return data;
  },

  async toggleUnlist(itemId, shopId, unlist) {
    const data = await api.post("/simulator/product/toggle_unlist", {
      item_id: itemId,
      shop_id: shopId,
      unlist: Boolean(unlist),
    });
    return data;
  },

  async quickUpdateStock(itemId, modelId, normalStock, shopId) {
    const data = await api.post("/simulator/product/quick_update_stock", {
      item_id: itemId,
      model_id: modelId,
      normal_stock: Number(normalStock),
      shop_id: shopId,
    });
    return data;
  },

  async getVoucherConfig(shopId) {
    const query = new URLSearchParams({ shop_id: String(shopId) });
    return api.get(`/simulator/voucher/config?${query.toString()}`);
  },

  async getVouchers(shopId, { status = "all", searchType = "voucher_name", keyword = "", pageNo = 1, pageSize = 20 } = {}) {
    const query = new URLSearchParams({
      shop_id: String(shopId),
      status,
      search_type: searchType,
      page_no: String(pageNo),
      page_size: String(pageSize),
    });
    if (keyword) query.set("keyword", keyword.trim());
    return api.get(`/simulator/voucher/list?${query.toString()}`);
  },

  async getVoucherDetail(voucherId, shopId) {
    const query = new URLSearchParams({
      voucher_id: String(voucherId),
      shop_id: String(shopId),
    });
    return api.get(`/simulator/voucher/detail?${query.toString()}`);
  },

  async createVoucher(payload) {
    return api.post("/simulator/voucher/create", payload);
  },

  async updateVoucher(payload) {
    return api.post("/simulator/voucher/update", payload);
  },

  async endVoucher(voucherId) {
    return api.post("/simulator/voucher/end", { voucher_id: voucherId });
  },

  async deleteVoucher(voucherId) {
    return api.post("/simulator/voucher/delete", { voucher_id: voucherId });
  },

  async getVoucherOrders(shopId, voucherCode, { pageNo = 1, pageSize = 20 } = {}) {
    const query = new URLSearchParams({
      shop_id: String(shopId),
      voucher_code: String(voucherCode),
      page_no: String(pageNo),
      page_size: String(pageSize),
    });
    return api.get(`/simulator/voucher/orders?${query.toString()}`);
  },
};

export default sellerService;
