import React, { useState, useEffect, useMemo } from "react";
import {
  Truck,
  Printer,
  Search,
  Calendar,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  Package,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  X
} from "lucide-react";
import sellerService from "../../../services/sellerService";
import s from "./MassShipPage.module.css";

// 14 standard Shopee Vietnam shipping carriers matching reference screenshot
const CARRIERS = [
  { id: "Viettel Post", label: "Viettel Post" },
  { id: "Giao Hàng Nhanh", label: "Giao Hàng Nhanh" },
  { id: "Giao Hàng Tiết Kiệm", label: "Giao Hàng Tiết Kiệm" },
  { id: "VNPost Nhanh", label: "VNPost Nhanh" },
  { id: "J&T Express", label: "J&T Express" },
  { id: "Shopee Xpress", label: "Shopee Xpress" },
  { id: "Ninja Van", label: "Ninja Van" },
  { id: "BEST Express", label: "BEST Express" },
  { id: "Đang điều phối ĐVVC", label: "Đang điều phối ĐVVC" },
  { id: "VNPost Tiết Kiệm", label: "VNPost Tiết Kiệm" },
  { id: "GrabExpress", label: "GrabExpress" },
  { id: "Shopee Xpress Instant", label: "Shopee Xpress Instant" },
  { id: "beDelivery", label: "beDelivery" },
  { id: "Nhà vận chuyển khác", label: "Nhà vận chuyển khác" },
];

export default function MassShipPage({ shopId = 727720655, onViewDetail, onNavigateTab }) {
  // Main mode tab: "to_ship" (Chờ giao hàng) | "print_docs" (Tạo phiếu)
  const [activeMode, setActiveMode] = useState("to_ship");

  // Carrier filter pill
  const [selectedCarrier, setSelectedCarrier] = useState("Shopee Xpress");

  // Data state
  const [orders, setOrders] = useState([]);
  const [carrierCountsReady, setCarrierCountsReady] = useState({});
  const [carrierCountsProcessed, setCarrierCountsProcessed] = useState({});
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);

  // Row selection
  const [selectedOrderSns, setSelectedOrderSns] = useState(new Set());

  // Search & Filters
  const [searchField, setSearchField] = useState("product");
  const [searchQuery, setSearchQuery] = useState("");
  const [orderTypeFilter, setOrderTypeFilter] = useState("all");
  const [processStatusFilter, setProcessStatusFilter] = useState("unprocessed");
  const [docFilter, setDocFilter] = useState("all");
  const [channelTypeFilter, setChannelTypeFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState("created_desc");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Document options in Tab 2
  const [docPickList, setDocPickList] = useState(true);
  const [docCombo, setDocCombo] = useState(false);
  const [docShippingLabel, setDocShippingLabel] = useState(false);
  const [labelFormat, setLabelFormat] = useState("thermal"); // "normal" | "thermal"
  const [docPackingList, setDocPackingList] = useState(false);
  const [packingFormat, setPackingFormat] = useState("pdf"); // "pdf" | "excel"

  // Pickup modal
  const [pickupModalOpen, setPickupModalOpen] = useState(false);
  const [pickupDate, setPickupDate] = useState("today");
  const [pickupTimeSlot, setPickupTimeSlot] = useState("afternoon");
  const [pickupNote, setPickupNote] = useState("");
  const [pickupSubmitting, setPickupSubmitting] = useState(false);

  // Guide modal
  const [guideModalOpen, setGuideModalOpen] = useState(false);

  // Load orders from API
  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await sellerService.getOrders(shopId, {
        pageSize: 300,
      });
      const orderList = Array.isArray(res) ? res : res?.orders || [];
      setOrders(orderList);

      if (res?.carrier_counts_ready) {
        setCarrierCountsReady(res.carrier_counts_ready);
      }
      if (res?.carrier_counts_processed) {
        setCarrierCountsProcessed(res.carrier_counts_processed);
      }
    } catch (err) {
      console.error("Failed to load orders for mass ship:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    setSelectedOrderSns(new Set());
  }, [shopId, activeMode]);

  // Normalize carrier match
  const matchesCarrier = (orderCarrier, targetCarrier) => {
    if (!targetCarrier) return true;
    const oc = (orderCarrier || "").toLowerCase();
    const tc = targetCarrier.toLowerCase();

    if (tc.includes("shopee xpress") || tc === "spx") {
      return oc.includes("shopee xpress") || oc.includes("spx");
    }
    if (tc.includes("giao hàng nhanh") || tc === "ghn") {
      return oc.includes("giao hàng nhanh") || oc.includes("ghn");
    }
    if (tc.includes("viettel")) {
      return oc.includes("viettel");
    }
    if (tc.includes("tiết kiệm") || tc === "ghtk") {
      return oc.includes("tiết kiệm") || oc.includes("ghtk");
    }
    if (tc.includes("j&t")) {
      return oc.includes("j&t") || oc.includes("jnt");
    }
    if (tc.includes("ninja")) {
      return oc.includes("ninja");
    }
    return oc.includes(tc);
  };

  // Helper to get count for a carrier pill
  const getCarrierCount = (carrierId) => {
    const countsMap = activeMode === "to_ship" ? carrierCountsReady : carrierCountsProcessed;
    let total = 0;
    Object.entries(countsMap).forEach(([name, cnt]) => {
      if (matchesCarrier(name, carrierId)) {
        total += cnt;
      }
    });
    return total;
  };

  // Filtered orders list
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // Status match by active mode
      if (activeMode === "to_ship") {
        if (o.order_status !== "READY_TO_SHIP") return false;
      } else {
        // print_docs mode requires PROCESSED
        if (o.order_status !== "PROCESSED") return false;
      }

      // Carrier match
      if (selectedCarrier && !matchesCarrier(o.shipping_carrier, selectedCarrier)) {
        return false;
      }

      // Search query match
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        if (searchField === "order_sn") {
          if (!o.order_sn?.toLowerCase().includes(q)) return false;
        } else if (searchField === "buyer") {
          if (!o.buyer_username?.toLowerCase().includes(q)) return false;
        } else {
          // product search
          const matchItem = (o.items || []).some(
            (i) => i.item_name?.toLowerCase().includes(q) || i.model_name?.toLowerCase().includes(q)
          );
          if (!matchItem) return false;
        }
      }

      // Tab 2 doc filter
      if (activeMode === "print_docs" && docFilter !== "all") {
        const hasAwb = o.packages?.some((p) => p.document_status === "READY");
        if (docFilter === "printed" && !hasAwb) return false;
        if (docFilter === "not_printed" && hasAwb) return false;
      }

      return true;
    });
  }, [orders, activeMode, selectedCarrier, searchQuery, searchField, docFilter]);

  // Paginated list
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, currentPage, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));

  // Checkbox handlers
  const isAllSelected =
    paginatedOrders.length > 0 &&
    paginatedOrders.every((o) => selectedOrderSns.has(o.order_sn));

  const toggleSelectAll = () => {
    const next = new Set(selectedOrderSns);
    if (isAllSelected) {
      paginatedOrders.forEach((o) => next.delete(o.order_sn));
    } else {
      paginatedOrders.forEach((o) => next.add(o.order_sn));
    }
    setSelectedOrderSns(next);
  };

  const toggleSelectOrder = (orderSn) => {
    const next = new Set(selectedOrderSns);
    if (next.has(orderSn)) {
      next.delete(orderSn);
    } else {
      next.add(orderSn);
    }
    setSelectedOrderSns(next);
  };

  // Batch Pickup confirm handler
  const handleConfirmPickup = async () => {
    if (selectedOrderSns.size === 0) return;
    setPickupSubmitting(true);
    try {
      const orderSnList = Array.from(selectedOrderSns);
      const res = await sellerService.batchShipOrders(orderSnList, "pickup", `${pickupDate}_${pickupTimeSlot}`);
      const successCount = res?.response?.success_count || orderSnList.length;

      setNotice({
        type: "success",
        message: `Đã yêu cầu bưu tá tới lấy hàng thành công cho ${successCount} đơn hàng!`,
        actionLabel: "Chuyển sang Tạo phiếu",
        onAction: () => {
          setActiveMode("print_docs");
          setNotice(null);
        }
      });

      setPickupModalOpen(false);
      setSelectedOrderSns(new Set());
      await fetchOrders();
    } catch (err) {
      alert("Lỗi khi xử lý giao hàng loạt: " + err.message);
    } finally {
      setPickupSubmitting(false);
    }
  };

  // Batch Drop-off handler
  const handleDropoff = async () => {
    if (selectedOrderSns.size === 0) return;
    const confirmDrop = window.confirm(
      `Xác nhận bạn sẽ tự mang ${selectedOrderSns.size} đơn hàng đã chọn tới bưu cục của ${selectedCarrier}?`
    );
    if (!confirmDrop) return;

    try {
      const orderSnList = Array.from(selectedOrderSns);
      const res = await sellerService.batchShipOrders(orderSnList, "dropoff");
      const successCount = res?.response?.success_count || orderSnList.length;

      setNotice({
        type: "success",
        message: `Đã xác nhận gửi hàng tại bưu cục cho ${successCount} đơn hàng!`,
        actionLabel: "Chuyển sang Tạo phiếu",
        onAction: () => {
          setActiveMode("print_docs");
          setNotice(null);
        }
      });

      setSelectedOrderSns(new Set());
      await fetchOrders();
    } catch (err) {
      alert("Lỗi khi xử lý gửi bưu cục: " + err.message);
    }
  };

  // Batch Print Documents handler (Tab 2)
  const handleBatchPrint = async () => {
    if (selectedOrderSns.size === 0) return;
    const orderSnList = Array.from(selectedOrderSns);

    // Determine doc type to generate
    let docType = "shipping_label";
    if (docPickList && !docShippingLabel && !docPackingList) docType = "picking_list";
    else if (docPackingList && !docShippingLabel && !docPickList) docType = "packing_list";

    try {
      await sellerService.batchGenerateAwb(orderSnList, docType, labelFormat);
      const downloadUrl = sellerService.getBatchAwbDownloadUrl(orderSnList, docType, labelFormat);

      // Open download URL in new window/tab
      window.open(downloadUrl, "_blank");

      // Mark locally as printed
      setOrders((prev) =>
        prev.map((o) => {
          if (selectedOrderSns.has(o.order_sn)) {
            const pkgs = o.packages || [];
            return {
              ...o,
              packages: pkgs.map((p) => ({ ...p, document_status: "READY" })),
            };
          }
          return o;
        })
      );

      setNotice({
        type: "success",
        message: `Đang tạo và tải tài liệu ${labelFormat === "thermal" ? "In nhiệt" : "In thường"} cho ${orderSnList.length} đơn hàng!`,
      });
    } catch (err) {
      alert("Lỗi khi tạo tài liệu in: " + err.message);
    }
  };

  // Batch Handover Manifest handler (Tab 2)
  const handlePrintManifest = () => {
    if (selectedOrderSns.size === 0) return;
    const orderSnList = Array.from(selectedOrderSns);
    const manifestUrl = sellerService.getManifestDownloadUrl(orderSnList, selectedCarrier, shopId);
    window.open(manifestUrl, "_blank");
  };

  return (
    <div className={s.container}>
      {/* 1. Header Area */}
      <div className={s.pageHeader}>
        <div className={s.titleArea}>
          <h1 className={s.pageTitle}>Chọn Ngày/In Phiếu Giao Hàng Loạt</h1>
          <p className={s.pageSubtitle}>
            Chọn ngày giao hàng và in phiếu giao hàng cho nhiều đơn mỗi lần
          </p>
        </div>
        <button
          type="button"
          className={s.btnGuide}
          onClick={() => setGuideModalOpen(true)}
          title="Xem hướng dẫn chuẩn bị hàng"
        >
          <span>Chuẩn bị hàng</span>
          <span style={{ fontSize: "16px" }}>≡</span>
        </button>
      </div>

      {/* Notice Toast */}
      {notice && (
        <div className={s.toastNotice}>
          <div>
            <strong>✓ Thông báo: </strong> {notice.message}
            {notice.actionLabel && (
              <span className={s.toastLink} onClick={notice.onAction}>
                {notice.actionLabel} &rarr;
              </span>
            )}
          </div>
          <button
            type="button"
            style={{ background: "none", border: "none", cursor: "pointer", color: "#0050b3" }}
            onClick={() => setNotice(null)}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* 2. Main White Container */}
      <div className={s.card}>
        {/* Main Mode Tabs */}
        <div className={s.mainTabs}>
          <button
            type="button"
            className={`${s.modeTabBtn} ${activeMode === "to_ship" ? s.modeTabActive : ""}`}
            onClick={() => setActiveMode("to_ship")}
          >
            <Truck size={17} className={s.tabIcon} />
            <span>Chờ giao hàng</span>
          </button>
          <button
            type="button"
            className={`${s.modeTabBtn} ${activeMode === "print_docs" ? s.modeTabActive : ""}`}
            onClick={() => setActiveMode("print_docs")}
          >
            <Printer size={17} className={s.tabIcon} />
            <span>Tạo phiếu</span>
          </button>
        </div>

        {/* Carrier Filter Pills */}
        <div className={s.carrierSection}>
          <div className={s.carrierRow}>
            <span className={s.carrierLabel}>Lọc đơn:</span>
            {CARRIERS.map((c) => {
              const isSelected = selectedCarrier === c.id;
              const count = getCarrierCount(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  className={`${s.carrierPill} ${isSelected ? s.carrierPillActive : ""}`}
                  onClick={() => setSelectedCarrier(c.id)}
                >
                  <span>{c.label}</span>
                  {count > 0 && <span className={s.pillCount}>({count})</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Pagination Toolbar */}
        <div className={s.paginationBar}>
          <div className={s.pageControls}>
            <button
              type="button"
              className={s.navArrowBtn}
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft size={14} />
            </button>
            <span>
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              className={s.navArrowBtn}
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              <ChevronRight size={14} />
            </button>
          </div>
          <select
            className={s.pageSizeSelect}
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
          >
            <option value={10}>10/trang</option>
            <option value={20}>20/trang</option>
            <option value={50}>50/trang</option>
            <option value={100}>100/trang</option>
          </select>
        </div>

        {/* Filters Toolbar */}
        <div className={s.filterToolbar}>
          {/* Row 1: Search */}
          <div className={s.filterRow1}>
            <select
              className={s.searchSelect}
              value={searchField}
              onChange={(e) => setSearchField(e.target.value)}
            >
              <option value="product">Sản Phẩm</option>
              <option value="order_sn">Mã đơn hàng</option>
              <option value="buyer">Người mua</option>
            </select>
            <div className={s.searchInputWrap}>
              <input
                type="text"
                className={s.searchInput}
                placeholder="Nhập Tên sản phẩm/SKU/SKU phân loại"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && setCurrentPage(1)}
              />
              <Search size={15} className={s.searchIcon} />
            </div>
            <button
              type="button"
              className={s.btnReset}
              onClick={() => {
                setSearchQuery("");
                setDateFrom("");
                setDateTo("");
                setCurrentPage(1);
              }}
            >
              Đặt lại
            </button>
            <button
              type="button"
              className={s.btnSearch}
              onClick={() => setCurrentPage(1)}
            >
              Tìm kiếm
            </button>
          </div>

          {/* Row 2: Secondary Dropdowns & Date */}
          <div className={s.filterRow2}>
            {activeMode === "print_docs" && (
              <select
                className={s.secondarySelect}
                value={docFilter}
                onChange={(e) => setDocFilter(e.target.value)}
              >
                <option value="all">Tất cả Phiếu giao hàng</option>
                <option value="printed">Đã in</option>
                <option value="not_printed">Chưa in</option>
              </select>
            )}

            <select
              className={s.secondarySelect}
              value={orderTypeFilter}
              onChange={(e) => setOrderTypeFilter(e.target.value)}
            >
              <option value="all">Tất cả Loại đơn hàng</option>
              <option value="standard">Đơn thường</option>
              <option value="express">Đơn Hỏa tốc</option>
            </select>

            <select
              className={s.secondarySelect}
              value={processStatusFilter}
              onChange={(e) => setProcessStatusFilter(e.target.value)}
            >
              {activeMode === "to_ship" ? (
                <>
                  <option value="unprocessed">Chưa xử lý</option>
                  <option value="all">Tất cả</option>
                </>
              ) : (
                <>
                  <option value="processed">Đã xử lý</option>
                  <option value="all">Tất cả</option>
                </>
              )}
            </select>

            {activeMode === "print_docs" && (
              <select
                className={s.secondarySelect}
                value={channelTypeFilter}
                onChange={(e) => setChannelTypeFilter(e.target.value)}
              >
                <option value="all">Tất cả đơn hàng Chọn giao ...</option>
                <option value="pickup">Lấy hàng tại kho</option>
                <option value="dropoff">Gửi hàng tại bưu cục</option>
              </select>
            )}

            <div className={s.datePickerWrap}>
              <Calendar size={13} />
              <input
                type="text"
                className={s.dateInput}
                placeholder="Ngày xác nhận đặt đơn"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
              <span className={s.dateSeparator}>-</span>
              <input
                type="text"
                className={s.dateInput}
                placeholder="Ngày xác nhận đặt đơn"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>

            <div className={s.sortGroup}>
              <ArrowUpDown size={13} />
              <select
                className={s.sortSelect}
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="created_desc">Sắp xếp theo</option>
                <option value="created_desc">Ngày xác nhận: Mới nhất</option>
                <option value="created_asc">Ngày xác nhận: Cũ nhất</option>
                <option value="deadline_asc">Hạn giao hàng gần nhất</option>
              </select>
            </div>
          </div>
        </div>

        {/* 3. Main Split Grid (Left Table & Right Action Panels) */}
        <div className={s.splitGrid}>
          {/* Left Orders Table */}
          <div className={s.tableCard}>
            <table className={s.ordersTable}>
              <thead>
                <tr>
                  <th className={s.thCheckbox}>
                    <input
                      type="checkbox"
                      className={s.checkboxInput}
                      checked={isAllSelected}
                      onChange={toggleSelectAll}
                      aria-label="Chọn tất cả đơn hàng"
                    />
                  </th>
                  {activeMode === "to_ship" ? (
                    <>
                      <th style={{ width: "34%" }}>Sản Phẩm</th>
                      <th style={{ width: "17%" }}>ID Đơn hàng</th>
                      <th style={{ width: "15%" }}>Người mua</th>
                      <th style={{ width: "17%" }}>Vận chuyển</th>
                      <th style={{ width: "17%" }}>Trạng thái Đơn hàng</th>
                    </>
                  ) : (
                    <>
                      <th style={{ width: "26%" }}>Sản Phẩm</th>
                      <th style={{ width: "15%" }}>ID Đơn hàng</th>
                      <th style={{ width: "13%" }}>Người mua</th>
                      <th style={{ width: "15%" }}>Vận chuyển</th>
                      <th style={{ width: "18%" }}>Mã vận đơn #</th>
                      <th style={{ width: "13%" }}>Đã In</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: "40px" }}>
                      Đang tải danh sách đơn hàng...
                    </td>
                  </tr>
                ) : paginatedOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <div className={s.emptyState}>
                        <FileText className={s.emptyIcon} size={48} />
                        <span className={s.emptyText}>Không có dữ liệu</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedOrders.map((order) => {
                    const isChecked = selectedOrderSns.has(order.order_sn);
                    const firstItem = order.items?.[0] || {};
                    const pkg = order.packages?.[0] || {};
                    const hasTracking = Boolean(pkg.tracking_number);
                    const isPrinted = pkg.document_status === "READY";

                    return (
                      <tr key={order.order_sn}>
                        <td className={s.thCheckbox}>
                          <input
                            type="checkbox"
                            className={s.checkboxInput}
                            checked={isChecked}
                            onChange={() => toggleSelectOrder(order.order_sn)}
                            aria-label={`Chọn đơn ${order.order_sn}`}
                          />
                        </td>
                        <td>
                          <div className={s.productCell}>
                            <img
                              src={
                                firstItem.image_url ||
                                "https://cf.shopee.vn/file/vn-11134207-7r98o-lkm123456789_tn"
                              }
                              alt={firstItem.item_name || "Sản phẩm"}
                              className={s.productThumb}
                              onError={(e) => {
                                e.target.src =
                                  "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=100&q=80";
                              }}
                            />
                            <div className={s.productInfo}>
                              <span className={s.productName} title={firstItem.item_name}>
                                {firstItem.item_name || "Testing testing testing"}
                              </span>
                              {firstItem.model_name && (
                                <span className={s.productVariation}>
                                  Phân loại: {firstItem.model_name}
                                </span>
                              )}
                              <span className={s.productQtyPrice}>
                                x{firstItem.quantity || 1} &bull; đ
                                {(firstItem.item_price || order.total_amount || 0).toLocaleString(
                                  "vi-VN"
                                )}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <a
                            className={s.orderSnLink}
                            onClick={(e) => {
                              e.preventDefault();
                              if (onViewDetail) onViewDetail(order.order_sn);
                            }}
                            title="Xem chi tiết đơn hàng"
                          >
                            {order.order_sn}
                          </a>
                        </td>
                        <td>
                          <span style={{ color: "#333" }}>{order.buyer_username}</span>
                        </td>
                        <td>
                          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                            <span style={{ fontSize: "12px", color: "#666" }}>Nhanh</span>
                            <span style={{ fontWeight: 500, color: "#333" }}>
                              {order.shipping_carrier || "Shopee Xpress"}
                            </span>
                          </div>
                        </td>
                        {activeMode === "to_ship" ? (
                          <td>
                            <span style={{ color: "#ee4d2d", fontWeight: 500 }}>
                              Chờ lấy hàng
                            </span>
                            <div style={{ fontSize: "11px", color: "#888", marginTop: "2px" }}>
                              Chưa xử lý
                            </div>
                          </td>
                        ) : (
                          <>
                            <td>
                              {hasTracking ? (
                                <a
                                  className={s.trackingNumberLink}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    alert(`Mã vận đơn: ${pkg.tracking_number}\nĐVVC: ${order.shipping_carrier}`);
                                  }}
                                  title="Xem hành trình bưu kiện"
                                >
                                  {pkg.tracking_number}
                                </a>
                              ) : (
                                <span style={{ color: "#999" }}>Chưa có mã</span>
                              )}
                            </td>
                            <td>
                              <div className={s.printedBadges}>
                                {isPrinted ? (
                                  <>
                                    <span className={s.badgePrinted}>Phiếu gửi hàng</span>
                                    <span className={s.badgePrinted}>Phiếu đóng gói</span>
                                  </>
                                ) : (
                                  <span className={s.badgeNotPrinted}>Chưa in</span>
                                )}
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Right Action Panels */}
          <div className={s.rightPanelColumn}>
            {activeMode === "to_ship" ? (
              /* TAB 1: Chuẩn bị đơn hàng loạt */
              <div className={s.actionCard}>
                <h3 className={s.actionCardTitle}>Chuẩn bị đơn hàng loạt</h3>
                <div className={s.selectionNotice}>
                  <span className={s.selectionCountHighlight}>
                    {selectedOrderSns.size}
                  </span>{" "}
                  đơn hàng đã chọn
                </div>

                <button
                  type="button"
                  className={s.btnActionPickup}
                  disabled={selectedOrderSns.size === 0}
                  onClick={() => setPickupModalOpen(true)}
                  title="Yêu cầu đơn vị vận chuyển tới kho lấy hàng"
                >
                  <Truck size={16} />
                  <span>Yêu cầu tới lấy hàng</span>
                </button>

                <button
                  type="button"
                  className={s.btnActionDropoff}
                  disabled={selectedOrderSns.size === 0}
                  onClick={handleDropoff}
                  title="Người bán tự mang hàng tới bưu cục"
                >
                  <Package size={16} />
                  <span>Gửi hàng tại bưu cục</span>
                </button>
              </div>
            ) : (
              /* TAB 2: Hai bảng điều khiển (Tạo phiếu & Biên bản giao nhận) */
              <>
                {/* Panel 1: Tạo phiếu hàng loạt */}
                <div className={s.actionCard}>
                  <h3 className={s.actionCardTitle}>Tạo phiếu hàng loạt</h3>
                  <div className={s.selectionNotice} style={{ color: "#d97706" }}>
                    {selectedOrderSns.size > 0
                      ? `Đã chọn ${selectedOrderSns.size} đơn hàng để tạo phiếu.`
                      : "Chọn các đơn hàng để tạo phiếu."}
                  </div>

                  <div className={s.docOptionsList}>
                    <div className={s.docOptionItem}>
                      <label className={s.docCheckboxLabel}>
                        <input
                          type="checkbox"
                          className={s.checkboxInput}
                          checked={docPickList}
                          onChange={(e) => setDocPickList(e.target.checked)}
                        />
                        <span>Phiếu xuất hàng</span>
                      </label>
                    </div>

                    <div className={s.docOptionItem}>
                      <label className={s.docCheckboxLabel}>
                        <input
                          type="checkbox"
                          className={s.checkboxInput}
                          checked={docCombo}
                          onChange={(e) => {
                            setDocCombo(e.target.checked);
                            if (e.target.checked) {
                              setDocShippingLabel(true);
                              setDocPackingList(true);
                            }
                          }}
                        />
                        <span>Phiếu gửi hàng và Phiếu đóng gói ⓘ</span>
                      </label>
                    </div>

                    <div className={s.docOptionItem}>
                      <label className={s.docCheckboxLabel}>
                        <input
                          type="checkbox"
                          className={s.checkboxInput}
                          checked={docShippingLabel}
                          onChange={(e) => setDocShippingLabel(e.target.checked)}
                        />
                        <span>Phiếu gửi hàng</span>
                      </label>
                      {docShippingLabel && (
                        <div className={s.subRadioGroup}>
                          <label className={s.radioLabel}>
                            <input
                              type="radio"
                              name="labelFormat"
                              value="normal"
                              checked={labelFormat === "normal"}
                              onChange={() => setLabelFormat("normal")}
                              className={s.radioInput}
                            />
                            <span>In thường</span>
                          </label>
                          <label className={s.radioLabel}>
                            <input
                              type="radio"
                              name="labelFormat"
                              value="thermal"
                              checked={labelFormat === "thermal"}
                              onChange={() => setLabelFormat("thermal")}
                              className={s.radioInput}
                            />
                            <span>In nhiệt (Thermal)</span>
                          </label>
                        </div>
                      )}
                    </div>

                    <div className={s.docOptionItem}>
                      <label className={s.docCheckboxLabel}>
                        <input
                          type="checkbox"
                          className={s.checkboxInput}
                          checked={docPackingList}
                          onChange={(e) => setDocPackingList(e.target.checked)}
                        />
                        <span>Phiếu đóng gói</span>
                      </label>
                      {docPackingList && (
                        <div className={s.subRadioGroup}>
                          <label className={s.radioLabel}>
                            <input
                              type="radio"
                              name="packingFormat"
                              value="pdf"
                              checked={packingFormat === "pdf"}
                              onChange={() => setPackingFormat("pdf")}
                              className={s.radioInput}
                            />
                            <span>PDF</span>
                          </label>
                          <label className={s.radioLabel}>
                            <input
                              type="radio"
                              name="packingFormat"
                              value="excel"
                              checked={packingFormat === "excel"}
                              onChange={() => setPackingFormat("excel")}
                              className={s.radioInput}
                            />
                            <span>Excel</span>
                          </label>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Output Preview Indicator */}
                  <div className={s.outputSection}>
                    <div className={s.outputLabel}>Phiếu được xuất ra</div>
                    <div className={s.outputItem}>
                      <FileText size={16} />
                      <span>
                        {docShippingLabel
                          ? `Phiếu gửi hàng (${labelFormat === "thermal" ? "In nhiệt" : "In thường"})`
                          : docPickList
                          ? "Phiếu xuất hàng"
                          : docPackingList
                          ? "Phiếu đóng gói"
                          : "Chưa chọn loại phiếu"}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className={s.btnPrimaryPrint}
                    disabled={
                      selectedOrderSns.size === 0 ||
                      (!docPickList && !docCombo && !docShippingLabel && !docPackingList)
                    }
                    onClick={handleBatchPrint}
                    title="In gộp các phiếu đã chọn"
                  >
                    <Printer size={16} />
                    <span>Tạo phiếu đã chọn</span>
                  </button>

                  <p className={s.popupHint}>
                    Vui lòng cho phép hiển thị màn hình pop-up trên trình duyệt để xem trước phiếu.
                  </p>
                </div>

                {/* Panel 2: Biên bản giao nhận */}
                <div className={s.actionCard}>
                  <h3 className={s.actionCardTitle}>Biên bản giao nhận</h3>
                  <div className={s.selectionNotice}>In Biên bản giao nhận</div>
                  <button
                    type="button"
                    className={s.btnSecondaryManifest}
                    disabled={selectedOrderSns.size === 0}
                    onClick={handlePrintManifest}
                    title="In bảng kê biên bản bàn giao đơn hàng cho bưu tá"
                  >
                    <Printer size={16} />
                    <span>Tạo Biên bản giao nhận</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Pickup Schedule Modal */}
      {pickupModalOpen && (
        <div className={s.modalOverlay}>
          <div className={s.modalBox}>
            <div className={s.modalHeader}>
              <h3 className={s.modalTitle}>Yêu cầu tới lấy hàng hàng loạt</h3>
              <button
                type="button"
                className={s.modalCloseBtn}
                onClick={() => setPickupModalOpen(false)}
              >
                &times;
              </button>
            </div>
            <div className={s.modalBody}>
              <div className={s.modalFieldGroup}>
                <label className={s.modalFieldLabel}>Địa chỉ lấy hàng</label>
                <div style={{ padding: "8px 12px", background: "#f8f9fa", borderRadius: "2px", fontSize: "13px" }}>
                  <strong>Kho Tổng SmartOmni</strong>
                  <div style={{ color: "#666", marginTop: "2px" }}>
                    123 Lê Lợi, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh
                  </div>
                </div>
              </div>

              <div className={s.modalFieldGroup}>
                <label className={s.modalFieldLabel}>Ngày hẹn lấy hàng</label>
                <select
                  className={s.secondarySelect}
                  value={pickupDate}
                  onChange={(e) => setPickupDate(e.target.value)}
                >
                  <option value="today">Hôm nay (22/11/2026)</option>
                  <option value="tomorrow">Ngày mai (23/11/2026)</option>
                </select>
              </div>

              <div className={s.modalFieldGroup}>
                <label className={s.modalFieldLabel}>Ca lấy hàng</label>
                <select
                  className={s.secondarySelect}
                  value={pickupTimeSlot}
                  onChange={(e) => setPickupTimeSlot(e.target.value)}
                >
                  <option value="afternoon">Ca Chiều (14:00 - 18:00)</option>
                  <option value="morning">Ca Sáng (08:00 - 12:00)</option>
                </select>
              </div>

              <div className={s.modalFieldGroup}>
                <label className={s.modalFieldLabel}>Ghi chú cho Bưu tá</label>
                <textarea
                  className={s.modalTextarea}
                  placeholder="Ghi chú vị trí kho hàng, số điện thoại liên hệ thủ kho..."
                  value={pickupNote}
                  onChange={(e) => setPickupNote(e.target.value)}
                />
              </div>
            </div>
            <div className={s.modalFooter}>
              <button
                type="button"
                className={s.btnModalCancel}
                onClick={() => setPickupModalOpen(false)}
                disabled={pickupSubmitting}
              >
                Hủy
              </button>
              <button
                type="button"
                className={s.btnModalConfirm}
                onClick={handleConfirmPickup}
                disabled={pickupSubmitting}
              >
                {pickupSubmitting ? "Đang xử lý..." : "Xác nhận lấy hàng"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Guide Modal */}
      {guideModalOpen && (
        <div className={s.modalOverlay}>
          <div className={s.modalBox}>
            <div className={s.modalHeader}>
              <h3 className={s.modalTitle}>Quy Chuẩn Chuẩn Bị Hàng Shopee</h3>
              <button
                type="button"
                className={s.modalCloseBtn}
                onClick={() => setGuideModalOpen(false)}
              >
                &times;
              </button>
            </div>
            <div className={s.modalBody} style={{ fontSize: "13px", lineHeight: "1.6" }}>
              <p><strong>1. Đóng gói tiêu chuẩn:</strong></p>
              <ul>
                <li>Bọc xốp chống sốc ít nhất 2-3 lớp cho sản phẩm dễ vỡ.</li>
                <li>Dán băng keo niêm phong hình chữ H kín miệng thùng carton.</li>
              </ul>
              <p><strong>2. In & Dán Phiếu Gửi Hàng (AWB):</strong></p>
              <ul>
                <li>Dán phẳng phiu trên mặt lớn nhất của kiện hàng, tránh nếp gấp.</li>
                <li>Không dán đè băng dính trong suốt lên mã vạch để máy quét đọc dễ dàng.</li>
              </ul>
              <p><strong>3. Ký Biên Bản Bàn Giao:</strong></p>
              <ul>
                <li>Yêu cầu bưu tá ký xác nhận đủ số lượng kiện trên Biên bản giao nhận.</li>
              </ul>
            </div>
            <div className={s.modalFooter}>
              <button
                type="button"
                className={s.btnModalConfirm}
                onClick={() => setGuideModalOpen(false)}
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
