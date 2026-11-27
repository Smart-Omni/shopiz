import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Search,
  FileSpreadsheet,
  History,
  Package,
  Clock,
  Printer,
  Truck,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  Calendar,
  Filter,
  MessageSquare,
  User,
  HelpCircle,
  PackageCheck,
  ArrowUpDown,
} from "lucide-react";
import sellerService from "../../../services/sellerService";
import SellerPagination from "../SellerPagination";
import { getThumbnailUrl } from "../../../utils/imageUrl";
import { formatPaymentMethod } from "../../../utils/paymentMethod";
import s from "./AllOrdersPage.module.css";

const money = (n) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(n);

// 8 Official Shopee Status Tabs
const STATUS_TABS = [
  { id: "all", label: "Tất cả" },
  { id: "unpaid", label: "Chờ xác nhận", backendStatuses: ["UNPAID"] },
  { id: "to_ship", label: "Chờ lấy hàng", backendStatuses: ["READY_TO_SHIP", "PROCESSED"], hasSubTabs: true },
  { id: "shipping", label: "Đang giao", backendStatuses: ["SHIPPED", "TO_CONFIRM_RECEIVE"] },
  { id: "completed", label: "Đã giao", backendStatuses: ["COMPLETED"] },
  { id: "cancelled", label: "Đơn Huỷ", backendStatuses: ["CANCELLED", "IN_CANCEL"] },
  { id: "returns", label: "Trả hàng/Hoàn tiền", backendStatuses: ["TO_RETURN"] },
  { id: "failed_delivery", label: "Giao không thành công", backendStatuses: ["DELIVERY_FAILED"] },
];

// Sub-tabs for "Chờ lấy hàng"
const TO_SHIP_SUBTABS = [
  { id: "all", label: "Tất cả" },
  { id: "unprocessed", label: "Chưa xử lý", backendStatuses: ["READY_TO_SHIP"] },
  { id: "processed", label: "Đã xử lý", backendStatuses: ["PROCESSED"] },
];

const STATUS_DISPLAY_MAP = {
  UNPAID: { text: "Chờ xác nhận", color: "#222222" },
  READY_TO_SHIP: { text: "Chờ lấy hàng", color: "#222222" },
  PROCESSED: { text: "Chờ lấy hàng", color: "#222222" },
  SHIPPED: { text: "Đang giao", color: "#222222" },
  TO_CONFIRM_RECEIVE: { text: "Đang giao", color: "#222222" },
  COMPLETED: { text: "Đã giao", color: "#222222" },
  IN_CANCEL: { text: "Yêu cầu hủy", color: "#ee4d2d" },
  CANCELLED: { text: "Đã hủy", color: "#8c8c8c" },
  TO_RETURN: { text: "Trả hàng/Hoàn tiền", color: "#fa8c16" },
  DELIVERY_FAILED: { text: "Giao không thành công", color: "#ee4d2d" },
};

function formatCountdown(shipByDateSeconds) {
  if (!shipByDateSeconds) return "—";
  const now = Math.floor(Date.now() / 1000);
  const diffSec = shipByDateSeconds - now;
  if (diffSec <= 0) return "Quá hạn gửi hàng";
  const hours = Math.floor(diffSec / 3600);
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  if (days > 0) return `Còn ${days} ngày ${remHours} giờ`;
  return `Còn ${hours} giờ`;
}

function formatSlaWarning(shipByDateSeconds) {
  if (!shipByDateSeconds) return null;
  const date = new Date(shipByDateSeconds * 1000);
  const weekdays = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
  const dayOfWeek = weekdays[date.getDay()];
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `Để tránh việc giao hàng trễ, vui lòng giao hàng/chuẩn bị hàng trước ${day} Th${month} ${year} (${dayOfWeek})`;
}

export default function AllOrdersPage({ shopId = 727720655, onViewDetail }) {
  const [params, setParams] = useSearchParams();
  const activeTabId = params.get("order_status") || "all";
  const [activeSubTab, setActiveSubTab] = useState("all");

  const [orders, setOrders] = useState([]);
  const [backendCounts, setBackendCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search and filter controls
  const [searchType, setSearchType] = useState("order_sn");
  const [searchQuery, setSearchQuery] = useState("");
  const [carrierFilter, setCarrierFilter] = useState("ALL");
  const [dateRange, setDateRange] = useState("2022/10/18 - 2022/11/17");
  const [sortBy, setSortBy] = useState("created_desc");
  const [appliedFilters, setAppliedFilters] = useState({
    searchType: "order_sn",
    query: "",
    carrier: "ALL",
  });

  const [actionNotice, setActionNotice] = useState("");
  const [historyModal, setHistoryModal] = useState(false);

  const handleViewDetail = (orderSn) => {
    if (onViewDetail) {
      onViewDetail(orderSn);
    } else {
      const next = new URLSearchParams(params);
      next.set("order_sn", orderSn);
      setParams(next);
    }
  };

  const handleOpenChat = (buyerUsername, buyerUserId) => {
    window.dispatchEvent(
      new CustomEvent("shopiz-open-seller-chat", {
        detail: {
          buyerId: buyerUserId || 1001,
          buyerUsername: buyerUsername || "Người mua",
        },
      }),
    );
  };

  const handleNavigateMassShip = () => {
    const next = new URLSearchParams(params);
    next.set("tab", "orders_mass_ship");
    setParams(next);
  };

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Reset to page 1 whenever activeTabId or subTab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTabId, activeSubTab]);

  // Fetch orders from simulator backend
  const fetchOrders = () => {
    setLoading(true);
    setError(null);
    sellerService
      .getOrders(shopId, { sortBy })
      .then((data) => {
        setOrders(data || []);
        if (data?.tab_counts) {
          setBackendCounts(data.tab_counts);
        }
      })
      .catch((err) => {
        setError(err.message || "Không thể tải danh sách đơn hàng.");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchOrders();
  }, [shopId, sortBy]);

  // Available carriers derived dynamically from orders
  const availableCarriers = useMemo(() => {
    const set = new Set();
    orders.forEach((o) => {
      if (o.shipping_carrier) set.add(o.shipping_carrier);
    });
    return Array.from(set);
  }, [orders]);

  // Tab switching
  const handleSelectTab = (tabId) => {
    setCurrentPage(1);
    setActiveSubTab("all");
    const next = new URLSearchParams(params);
    next.set("order_status", tabId);
    setParams(next);
  };

  // Filter application
  const handleApplyFilter = (e) => {
    e?.preventDefault();
    setCurrentPage(1);
    setAppliedFilters({
      searchType,
      query: searchQuery.trim(),
      carrier: carrierFilter,
    });
  };

  const handleResetFilter = () => {
    setCurrentPage(1);
    setSearchQuery("");
    setCarrierFilter("ALL");
    setAppliedFilters({
      searchType: "order_sn",
      query: "",
      carrier: "ALL",
    });
  };

  // Filtered orders calculation
  const filteredOrders = useMemo(() => {
    let result = orders.filter((o) => {
      // 1. Status Tab filter
      const tab = STATUS_TABS.find((t) => t.id === activeTabId);
      if (tab && tab.backendStatuses) {
        if (!tab.backendStatuses.includes(o.order_status)) return false;
      }

      // 1.1 Sub-tab filter (for to_ship)
      if (activeTabId === "to_ship" && activeSubTab !== "all") {
        const sub = TO_SHIP_SUBTABS.find((s) => s.id === activeSubTab);
        if (sub && sub.backendStatuses && !sub.backendStatuses.includes(o.order_status)) {
          return false;
        }
      }

      // 2. Shipping Carrier filter (from in-column dropdown)
      if (carrierFilter !== "ALL" && o.shipping_carrier !== carrierFilter) {
        return false;
      }

      // 3. Search query filter
      if (appliedFilters.query) {
        const q = appliedFilters.query.toLowerCase();
        if (appliedFilters.searchType === "order_sn") {
          return o.order_sn?.toLowerCase().includes(q);
        } else if (appliedFilters.searchType === "buyer") {
          return (
            o.buyer_username?.toLowerCase().includes(q) ||
            o.recipient_name?.toLowerCase().includes(q)
          );
        } else if (appliedFilters.searchType === "product") {
          return (o.items || []).some((item) => item.item_name?.toLowerCase().includes(q));
        }
      }

      return true;
    });

    // Sort order
    if (sortBy === "created_asc") {
      result.sort((a, b) => a.create_time - b.create_time);
    } else if (sortBy === "deadline_asc") {
      result.sort((a, b) => (a.ship_by_date || 9999999999) - (b.ship_by_date || 9999999999));
    } else {
      result.sort((a, b) => b.create_time - a.create_time);
    }

    return result;
  }, [orders, activeTabId, activeSubTab, carrierFilter, appliedFilters, sortBy]);

  // Paginated slice for current page
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, currentPage, pageSize]);

  // Tab counts calculation
  const tabCounts = useMemo(() => {
    const counts = { all: orders.length };
    STATUS_TABS.forEach((t) => {
      if (t.backendStatuses) {
        counts[t.id] = orders.filter((o) => t.backendStatuses.includes(o.order_status)).length;
      }
    });
    // Sub-tab counts for to_ship
    counts["to_ship_all"] = counts["to_ship"] || 0;
    counts["to_ship_unprocessed"] = orders.filter((o) => o.order_status === "READY_TO_SHIP").length;
    counts["to_ship_processed"] = orders.filter((o) => o.order_status === "PROCESSED").length;

    return counts;
  }, [orders]);

  // Arrange shipment
  const handleArrangeShipment = async (orderSn) => {
    try {
      const res = await sellerService.shipOrder(orderSn);
      const newStatus = res?.order_status || "PROCESSED";
      const trackingNo = res?.tracking_number;
      setActionNotice(`Đã chuẩn bị hàng cho đơn #${orderSn}!`);
      setOrders((prev) =>
        prev.map((o) => {
          if (o.order_sn !== orderSn) return o;
          const currentPackages = o.packages || [];
          const updatedPackages =
            currentPackages.length > 0
              ? currentPackages.map((pkg) => ({
                  ...pkg,
                  tracking_number: trackingNo || pkg.tracking_number,
                  logistics_status: "LOGISTICS_REQUEST_CREATED",
                  document_status: "READY",
                }))
              : trackingNo
              ? [
                  {
                    package_number: `PKG-${orderSn}`,
                    tracking_number: trackingNo,
                    logistics_status: "LOGISTICS_REQUEST_CREATED",
                    document_status: "READY",
                  },
                ]
              : [];

          return {
            ...o,
            order_status: newStatus,
            packages: updatedPackages,
          };
        }),
      );
    } catch (err) {
      setActionNotice(err.message || `Chuẩn bị hàng cho đơn #${orderSn} thất bại.`);
    }
  };

  // Handover (Giao hàng) after Chuẩn bị hàng
  const handleHandover = async (orderSn) => {
    try {
      await sellerService.handoverOrder(orderSn);
      setActionNotice(`Đã bàn giao đơn #${orderSn} cho ĐVVC — chờ ĐVVC quét mã lấy hàng!`);
      setOrders((prev) =>
        prev.map((o) => {
          if (o.order_sn !== orderSn) return o;
          const currentPackages = o.packages || [];
          const updatedPackages =
            currentPackages.length > 0
              ? currentPackages.map((pkg) => ({
                  ...pkg,
                  logistics_status: "LOGISTICS_HANDED_OVER",
                }))
              : [
                  {
                    package_number: `PKG-${orderSn}`,
                    logistics_status: "LOGISTICS_HANDED_OVER",
                    document_status: "READY",
                  },
                ];
          return { ...o, packages: updatedPackages };
        }),
      );
    } catch (err) {
      setActionNotice(err.message || `Bàn giao đơn #${orderSn} thất bại.`);
    }
  };

  // Generate & Download AWB
  const handlePrintAwb = async (orderSn) => {
    try {
      await sellerService.generateAwb(orderSn);
      window.open(sellerService.getAwbDownloadUrl(orderSn), "_blank");
    } catch {
      window.open(sellerService.getAwbDownloadUrl(orderSn), "_blank");
    }
  };

  // Export CSV
  const handleExportOrders = () => {
    const headers = ["Mã đơn hàng", "Người mua", "Trạng thái", "ĐVVC", "Tổng tiền", "Ngày tạo"];
    const rows = filteredOrders.map((o) => [
      o.order_sn,
      o.buyer_username || o.recipient_name,
      STATUS_DISPLAY_MAP[o.order_status]?.text || o.order_status,
      o.shipping_carrier || "SPX Express",
      o.total_amount,
      new Date(o.create_time * 1000).toLocaleString("vi-VN"),
    ]);

    const csvContent =
      "\uFEFF" +
      [headers.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `shopee_orders_${activeTabId}_${Date.now()}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className={s.pageWrapper}>
      {/* Main Content White Panel */}
      <div className={s.mainPanel}>
        {/* 1. Main Order Status Tabs (8 Tabs) */}
        <div className={s.tabsRow} role="tablist">
          {STATUS_TABS.map((tab) => {
            const isSelected = activeTabId === tab.id;
            const count = tabCounts[tab.id] ?? 0;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isSelected}
                className={`${s.tabBtn} ${isSelected ? s.tabActive : ""}`}
                onClick={() => handleSelectTab(tab.id)}
              >
                <span>{tab.label}</span>
                {count > 0 && <span className={s.tabBadge}>{count}</span>}
              </button>
            );
          })}
        </div>

        {/* 2. Search and Filter Toolbar (2 Rows) */}
        <div className={s.filterContainer}>
          {/* Row 1: Date Range Filter + Xuất + Filter Icon */}
          <div className={s.dateFilterRow}>
            <div className={s.datePickerGroup}>
              <span className={s.dateLabel}>Ngày đặt hàng</span>
              <div className={s.dateInputWrap}>
                <Calendar size={14} className={s.calendarIcon} />
                <input
                  type="text"
                  className={s.dateInput}
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  placeholder="YYYY/MM/DD - YYYY/MM/DD"
                  aria-label="Khoảng ngày đặt hàng"
                />
              </div>
            </div>

            <div className={s.topActionGroup}>
              <button
                type="button"
                className={s.btnExport}
                onClick={handleExportOrders}
                title="Xuất danh sách đơn hàng"
              >
                Xuất
              </button>
              <button
                type="button"
                className={s.btnFilterSettings}
                title="Bộ lọc nâng cao"
                onClick={() => setHistoryModal(true)}
              >
                <Filter size={15} />
                <span className={s.filterDotBadge}>1</span>
              </button>
            </div>
          </div>

          {/* Row 2: Search Input + Nút Tìm kiếm (Cam) + Nút Đặt lại */}
          <form className={s.searchBarRow} onSubmit={handleApplyFilter}>
            <div className={s.searchCombo}>
              <select
                className={s.searchSelect}
                value={searchType}
                onChange={(e) => setSearchType(e.target.value)}
                aria-label="Loại tìm kiếm đơn hàng"
              >
                <option value="order_sn">Mã đơn hàng</option>
                <option value="buyer">Người mua</option>
                <option value="product">Tên sản phẩm</option>
              </select>
              <div className={s.inputWrap}>
                <Search size={15} className={s.searchIcon} />
                <input
                  type="text"
                  className={s.searchInput}
                  placeholder={
                    searchType === "order_sn"
                      ? "Nhập Mã đơn hàng"
                      : searchType === "buyer"
                        ? "Nhập tên người mua"
                        : "Nhập tên sản phẩm"
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className={s.filterButtons}>
              <button type="submit" className={s.btnSearch}>
                Tìm kiếm
              </button>
              <button type="button" className={s.btnReset} onClick={handleResetFilter}>
                Đặt lại
              </button>
            </div>
          </form>
        </div>

        {/* 3. Sub-tabs (Secondary level) when tab is "Chờ lấy hàng" */}
        {activeTabId === "to_ship" && (
          <div className={s.subTabsRow}>
            {TO_SHIP_SUBTABS.map((sub) => {
              const isSubActive = activeSubTab === sub.id;
              const subCount =
                sub.id === "all"
                  ? tabCounts["to_ship_all"]
                  : sub.id === "unprocessed"
                    ? tabCounts["to_ship_unprocessed"]
                    : tabCounts["to_ship_processed"];
              return (
                <button
                  key={sub.id}
                  type="button"
                  className={`${s.subTabBtn} ${isSubActive ? s.subTabActive : ""}`}
                  onClick={() => setActiveSubTab(sub.id)}
                >
                  {sub.label} {subCount > 0 && <span>{subCount}</span>}
                </button>
              );
            })}
          </div>
        )}

        {/* 4. Order Count & Mass Fulfillment Action Bar */}
        <div className={s.summaryBar}>
          <div className={s.countNumber}>
            <strong>{loading ? "Đang tải..." : `${filteredOrders.length} Đơn hàng`}</strong>
          </div>

          <div className={s.barActions}>
            <div className={s.sortGroup}>
              <ArrowUpDown size={14} className={s.sortIcon} />
              <select
                className={s.sortSelect}
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                aria-label="Sắp xếp theo"
              >
                <option value="created_desc">Sắp xếp theo</option>
                <option value="created_desc">Ngày đặt hàng: Mới nhất</option>
                <option value="created_asc">Ngày đặt hàng: Cũ nhất</option>
                <option value="deadline_asc">Hạn giao hàng gần nhất</option>
              </select>
            </div>

            <button
              type="button"
              className={s.btnMassShip}
              onClick={handleNavigateMassShip}
              title="Chuyển đến trang Giao Hàng Loạt"
            >
              <PackageCheck size={16} /> Giao Hàng Loạt
            </button>
          </div>
        </div>

        {/* 5. Order Table */}
        <div className={s.tableContainer}>
          <table className={s.ordersTable}>
            <thead>
              <tr>
                <th style={{ width: "36%" }}>Sản phẩm</th>
                <th style={{ width: "14%" }}>Tổng cộng</th>
                <th style={{ width: "18%" }}>Trạng thái</th>
                <th style={{ width: "10%" }}>
                  <div className={s.thWithTooltip}>
                    <span>Đếm ngược</span>
                    <HelpCircle size={13} className={s.thHelpIcon} title="Thời gian còn lại để chuẩn bị hàng" />
                  </div>
                </th>
                <th style={{ width: "12%" }}>
                  <div className={s.thCarrierWrap}>
                    <select
                      className={s.thCarrierSelect}
                      value={carrierFilter}
                      onChange={(e) => setCarrierFilter(e.target.value)}
                      aria-label="Tất cả ĐVVC"
                    >
                      <option value="ALL">Tất cả ĐVVC</option>
                      <option value="Shopee Xpress">Shopee Xpress</option>
                      <option value="SPX Express">SPX Express</option>
                      <option value="Người bán tự vận chuyển">Người bán tự vận chuyển</option>
                      {availableCarriers
                        .filter(
                          (c) =>
                            !["Shopee Xpress", "SPX Express", "Người bán tự vận chuyển"].includes(c),
                        )
                        .map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                    </select>
                  </div>
                </th>
                <th style={{ width: "10%" }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {paginatedOrders.map((order) => {
                const statusMeta = STATUS_DISPLAY_MAP[order.order_status] || {
                  text: order.order_status,
                  color: "#222222",
                };
                const hasAwb =
                  order.packages?.[0]?.document_status === "READY" ||
                  order.packages?.[0]?.tracking_number ||
                  ["PROCESSED", "SHIPPED", "COMPLETED"].includes(order.order_status);

                const slaWarning =
                  ["READY_TO_SHIP", "UNPAID"].includes(order.order_status)
                    ? formatSlaWarning(order.ship_by_date)
                    : null;

                return (
                  <React.Fragment key={order.order_sn}>
                    {/* Order metadata banner row */}
                    <tr className={s.orderMetaRow}>
                      <td colSpan={6}>
                        <div className={s.metaContent}>
                          <div className={s.buyerMetaLeft}>
                            <div className={s.buyerAvatar}>
                              <User size={13} />
                            </div>
                            <span className={s.buyerUsername}>
                              {order.buyer_username || order.recipient_name}
                            </span>
                            <button
                              type="button"
                              className={s.buyerChatBtn}
                              onClick={() => handleOpenChat(order.buyer_username, order.buyer_user_id)}
                              title="Chat với người mua"
                              aria-label="Chat với người mua"
                            >
                              <MessageSquare size={13} fill="#ee4d2d" color="#ee4d2d" />
                            </button>
                          </div>

                          <div className={s.buyerMetaRight}>
                            <span className={s.orderSnLabel}>Mã đơn hàng</span>
                            <button
                              type="button"
                              className={s.orderSnBtn}
                              onClick={() => handleViewDetail(order.order_sn)}
                              title="Xem chi tiết đơn hàng"
                            >
                              {order.order_sn}
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>

                    {/* Order items and data row */}
                    <tr className={s.orderDataRow} data-ordersn={order.order_sn}>
                      {/* Sản phẩm */}
                      <td className={s.productCol}>
                        {order.items && order.items.length > 0 ? (
                          <div className={s.itemList}>
                            {order.items.map((item) => {
                              const rawImg = item.image || item.image_url || item.image_info?.image_url;
                              const itemImg = getThumbnailUrl(rawImg, 100);
                              return (
                                <div key={item.order_item_id} className={s.productItem}>
                                  <div className={s.thumbWrap}>
                                    {itemImg ? (
                                      <img
                                        src={itemImg}
                                        alt={item.item_name}
                                        className={s.thumbImg}
                                        onError={(e) => {
                                          e.currentTarget.style.display = "none";
                                          if (e.currentTarget.nextElementSibling) {
                                            e.currentTarget.nextElementSibling.style.display = "block";
                                          }
                                        }}
                                      />
                                    ) : null}
                                    <Package
                                      size={24}
                                      className={s.thumbIcon}
                                      style={{ display: itemImg ? "none" : "block" }}
                                    />
                                  </div>
                                  <div className={s.itemInfo}>
                                    <span className={s.itemName}>{item.item_name}</span>
                                    {item.model_name && (
                                      <span className={s.modelName}>Phân loại: {item.model_name}</span>
                                    )}
                                  </div>
                                  <span className={s.itemQty}>x{item.quantity}</span>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className={s.productItem}>
                            <div className={s.thumbWrap}>
                              <Package size={24} className={s.thumbIcon} />
                            </div>
                            <div className={s.itemInfo}>
                              <span className={s.itemName}>Sản phẩm đơn hàng</span>
                            </div>
                            <span className={s.itemQty}>x1</span>
                          </div>
                        )}
                      </td>

                      {/* Tổng cộng */}
                      <td className={s.paymentCol}>
                        <span className={s.paymentAmount}>{money(order.total_amount)}</span>
                        <span className={s.paymentMethod}>{formatPaymentMethod(order.payment_method)}</span>
                      </td>

                      {/* Trạng thái */}
                      <td className={s.statusCol}>
                        <div className={s.statusContent}>
                          <span className={s.statusText} style={{ color: statusMeta.color }}>
                            {statusMeta.text}
                          </span>
                          {slaWarning && (
                            <p className={s.slaWarningText}>{slaWarning}</p>
                          )}
                          {order.order_status === "CANCELLED" && (
                            <p className={s.statusSubNote}>
                              {order.cancel_reason || "Đã hủy bởi người mua"}
                            </p>
                          )}
                          {order.order_status === "DELIVERY_FAILED" && (
                            <p className={s.statusSubNote}>
                              {order.note || "Giao không thành công - Chuyển hoàn"}
                            </p>
                          )}
                          {order.order_status === "TO_RETURN" && (
                            <p className={s.statusSubNote}>Đang xử lý khiếu nại trả hàng</p>
                          )}
                        </div>
                      </td>

                      {/* Đếm ngược */}
                      <td className={s.countdownCol}>
                        {["READY_TO_SHIP", "UNPAID"].includes(order.order_status) && order.ship_by_date ? (
                          <span className={s.countdownText}>
                            {formatCountdown(order.ship_by_date)}
                          </span>
                        ) : (
                          <span className={s.noCountdown}>—</span>
                        )}
                      </td>

                      {/* Đơn vị vận chuyển */}
                      <td className={s.carrierCol}>
                        <div className={s.carrierWrap}>
                          <span className={s.carrierName}>{order.shipping_carrier || "SPX Express"}</span>
                          {order.packages?.[0]?.tracking_number && (
                            <span className={s.trackingNumber}>
                              {order.packages[0].tracking_number}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Thao tác (Link style) */}
                      <td className={s.actionCol}>
                        <div className={s.actionLinks}>
                          {order.order_status === "READY_TO_SHIP" || order.order_status === "UNPAID" ? (
                            <button
                              type="button"
                              className={s.actionLinkBlue}
                              onClick={() => handleArrangeShipment(order.order_sn)}
                            >
                              Chuẩn bị hàng
                            </button>
                          ) : null}

                          {order.order_status === "PROCESSED" &&
                            order.packages?.[0]?.logistics_status !== "LOGISTICS_HANDED_OVER" ? (
                            <button
                              type="button"
                              className={s.actionLinkBlue}
                              onClick={() => handleHandover(order.order_sn)}
                              title="Bàn giao kiện hàng đã đóng gói cho đơn vị vận chuyển"
                            >
                              Giao
                            </button>
                          ) : null}

                          {order.order_status === "PROCESSED" &&
                            order.packages?.[0]?.logistics_status === "LOGISTICS_HANDED_OVER" ? (
                            <span style={{ fontSize: "12px", color: "#52c41a", fontWeight: 500 }}>
                              Đã bàn giao (Chờ lấy)
                            </span>
                          ) : null}

                          {hasAwb || order.order_status === "PROCESSED" ? (
                            <button
                              type="button"
                              className={s.actionLinkBlue}
                              onClick={() => handlePrintAwb(order.order_sn)}
                              title="Tải & In phiếu giao hàng (PDF)"
                            >
                              In phiếu giao
                            </button>
                          ) : null}

                          <button
                            type="button"
                            className={s.actionLinkGray}
                            onClick={() => handleViewDetail(order.order_sn)}
                          >
                            Chi tiết
                          </button>
                        </div>
                      </td>
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>

          {/* 6. Empty State */}
          {!loading && filteredOrders.length === 0 && (
            <div className={s.emptyState}>
              <div className={s.emptyIconWrap}>
                <Package size={52} strokeWidth={1.2} className={s.emptyIcon} />
              </div>
              <p className={s.emptyMessage}>
                Vui lòng Xuất báo cáo để xem các đơn hàng trước 24/10/2024.
              </p>
            </div>
          )}
        </div>

        {/* 7. Pagination */}
        <SellerPagination
          currentPage={currentPage}
          totalItems={filteredOrders.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>

      {/* Action Toast Notice */}
      {actionNotice && (
        <div className={s.toast}>
          <CheckCircle2 size={16} color="#52c41a" />
          <span>{actionNotice}</span>
          <button type="button" className={s.toastClose} onClick={() => setActionNotice("")}>
            ×
          </button>
        </div>
      )}

      {/* Export History Dialog */}
      {historyModal && (
        <div className={s.modalOverlay} onClick={() => setHistoryModal(false)}>
          <div className={s.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={s.modalHeader}>
              <h3>Lịch sử Xuất Báo cáo</h3>
              <button
                type="button"
                className={s.modalClose}
                onClick={() => setHistoryModal(false)}
              >
                ×
              </button>
            </div>
            <div className={s.modalBody}>
              <p>Danh sách các báo cáo đã xuất trong 30 ngày qua:</p>
              <ul className={s.historyList}>
                <li>
                  <span>Báo cáo đơn hàng hoàn tất tháng 10/2026.csv</span>
                  <small>23/10/2026 14:20 · Thành công</small>
                </li>
                <li>
                  <span>Báo cáo vận chuyển SPX Express Q3/2026.csv</span>
                  <small>15/10/2026 09:12 · Thành công</small>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
