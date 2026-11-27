import React, { useEffect, useMemo, useState } from "react";
import {
  Truck,
  CheckCircle,
  Package,
  RefreshCw,
  Search,
  QrCode,
  CheckCircle2,
} from "lucide-react";
import adminService from "../../../services/adminService";
import s from "./OrderLifecycle.module.css";

const STAGE_FILTERS = [
  { key: "ACTIVE", label: "Chờ lấy & Đang vận chuyển" },
  { key: "TO_PICKUP", label: "Chờ ĐVVC lấy hàng (PROCESSED)" },
  { key: "SHIPPED", label: "Đang vận chuyển (SHIPPED)" },
  { key: "COMPLETED", label: "Đã giao (COMPLETED)" },
  { key: "ALL", label: "Tất cả kiện hàng" },
];

export default function CarrierSimulationTab({ showToast }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stageFilter, setStageFilter] = useState("ACTIVE");
  const [selectedShopId, setSelectedShopId] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const data = await adminService.getOrders(selectedShopId, "ALL");
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      showToast?.(`Lỗi tải danh sách kiện hàng: ${err.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [selectedShopId]);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (stageFilter === "ACTIVE" && o.order_status !== "PROCESSED" && o.order_status !== "SHIPPED") {
        return false;
      }
      if (stageFilter === "TO_PICKUP" && o.order_status !== "PROCESSED") return false;
      if (stageFilter === "SHIPPED" && o.order_status !== "SHIPPED") return false;
      if (stageFilter === "COMPLETED" && o.order_status !== "COMPLETED") return false;

      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const pkg = o.packages?.[0];
        const snMatch = (o.order_sn || "").toLowerCase().includes(q);
        const trackingMatch = (pkg?.tracking_number || "").toLowerCase().includes(q);
        const pkgMatch = (pkg?.package_number || "").toLowerCase().includes(q);
        if (!snMatch && !trackingMatch && !pkgMatch) return false;
      }
      return true;
    });
  }, [orders, stageFilter, searchQuery]);

  const stageCounts = useMemo(() => {
    return {
      ACTIVE: orders.filter((o) => o.order_status === "PROCESSED" || o.order_status === "SHIPPED").length,
      TO_PICKUP: orders.filter((o) => o.order_status === "PROCESSED").length,
      SHIPPED: orders.filter((o) => o.order_status === "SHIPPED").length,
      COMPLETED: orders.filter((o) => o.order_status === "COMPLETED").length,
      ALL: orders.length,
    };
  }, [orders]);

  const handedOverOrders = useMemo(() => {
    return orders.filter(
      (o) =>
        o.order_status === "PROCESSED" &&
        o.packages?.[0]?.logistics_status === "LOGISTICS_HANDED_OVER"
    );
  }, [orders]);

  const handleCarrierScanPickup = async (order) => {
    setActionLoading(true);
    try {
      await adminService.advanceOrderCarrierPickup(order.order_sn, order.shop_id);
      showToast?.(
        `ĐVVC đã quét mã & lấy kiện hàng ${order.order_sn} → Đang vận chuyển`,
        "success"
      );
      await fetchOrders();
    } catch (err) {
      showToast?.(`Lỗi quét mã lấy hàng: ${err.message}`, "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkDelivered = async (order) => {
    setActionLoading(true);
    try {
      await adminService.advanceOrderDelivered(order.order_sn, order.shop_id);
      showToast?.(`Kiện hàng ${order.order_sn} đã chuyển sang Đã giao`, "success");
      await fetchOrders();
    } catch (err) {
      showToast?.(`Lỗi cập nhật đã giao: ${err.message}`, "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleScanAllHandedOver = async () => {
    if (handedOverOrders.length === 0) return;
    setActionLoading(true);
    let successCount = 0;
    try {
      for (const order of handedOverOrders) {
        await adminService.advanceOrderCarrierPickup(order.order_sn, order.shop_id);
        successCount++;
      }
      showToast?.(
        `Đã quét mã & chuyển ${successCount} kiện hàng sang Đang vận chuyển`,
        "success"
      );
      await fetchOrders();
    } catch (err) {
      showToast?.(`Lỗi quét hàng loạt: ${err.message}`, "error");
    } finally {
      setActionLoading(false);
    }
  };

  const renderPackageStage = (order) => {
    const pkgStatus = order.packages?.[0]?.logistics_status;
    if (order.order_status === "COMPLETED") {
      return <span className={`${s.badge} ${s.badgeCompleted}`}>Đã giao</span>;
    }
    if (order.order_status === "SHIPPED") {
      return <span className={`${s.badge} ${s.badgeShipped}`}>Đang vận chuyển</span>;
    }
    if (order.order_status === "PROCESSED") {
      if (pkgStatus === "LOGISTICS_HANDED_OVER") {
        return (
          <span
            className={s.badge}
            style={{ background: "#ecfdf5", color: "#047857", border: "1px solid #a7f3d0" }}
          >
            Đã bàn giao (Chờ ĐVVC quét mã)
          </span>
        );
      }
      return (
        <span className={`${s.badge} ${s.badgeProcessed}`}>
          Đã chuẩn bị hàng (Chưa bấm Giao)
        </span>
      );
    }
    if (order.order_status === "READY_TO_SHIP") {
      return <span className={`${s.badge} ${s.badgeReady}`}>Chưa chuẩn bị hàng</span>;
    }
    return <span className={`${s.badge} ${s.badgeOther}`}>{order.order_status}</span>;
  };

  return (
    <div className={s.container}>
      {/* Toolbar */}
      <div className={s.toolbar}>
        <div className={s.filterGroup}>
          <div className={s.searchBox}>
            <Search size={15} className={s.searchIcon} />
            <input
              type="text"
              className={s.searchInput}
              placeholder="Tìm mã đơn, mã kiện, mã vận đơn..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <select
            className={s.select}
            value={selectedShopId}
            onChange={(e) => setSelectedShopId(e.target.value)}
          >
            <option value="ALL">Tất cả Cửa hàng</option>
            <option value="727720655">727720655 - SmartOmni Official Flagship</option>
            <option value="839910244">839910244 - Hanoi Streetwear Co.</option>
            <option value="910283751">910283751 - Saigon Modern Living</option>
          </select>

          <select
            className={s.select}
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
          >
            {STAGE_FILTERS.map((f) => (
              <option key={f.key} value={f.key}>
                {f.label} ({stageCounts[f.key] ?? 0})
              </option>
            ))}
          </select>
        </div>

        <div className={s.toolbarActions}>
          {handedOverOrders.length > 0 && (
            <button
              type="button"
              className={s.btnActionPickup}
              onClick={handleScanAllHandedOver}
              disabled={actionLoading}
            >
              <QrCode size={15} />
              Quét tất cả kiện đã bàn giao ({handedOverOrders.length}) → Đang vận chuyển
            </button>
          )}
          <button
            type="button"
            className={s.btnRefresh}
            onClick={fetchOrders}
            disabled={loading}
          >
            <RefreshCw size={15} />
            Làm mới
          </button>
        </div>
      </div>

      {/* Packages Table */}
      <div className={s.tableCard}>
        <div className={s.tableHeaderBar}>
          <div className={s.tableTitle}>
            Mô phỏng Đơn vị Vận chuyển (Quét mã lấy hàng → Đang vận chuyển → Đã giao)
          </div>
          <div className={s.tableCount}>{filteredOrders.length} kiện hàng</div>
        </div>

        <div className={s.tableWrapper}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>Mã đơn / Kiện hàng</th>
                <th>Mã vận đơn & ĐVVC</th>
                <th>Cửa hàng</th>
                <th>Trạng thái xử lý</th>
                <th>Thao tác ĐVVC</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={5} className={s.emptyState}>
                    <Package size={36} className={s.emptyIcon} />
                    <div>Không có kiện hàng nào trong trạng thái này.</div>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const pkg = order.packages?.[0];
                  return (
                    <tr key={order.order_sn} className={s.tableRow}>
                      <td>
                        <strong style={{ color: "#7b2cbf" }}>{order.order_sn}</strong>
                        <div style={{ fontSize: "11px", color: "#6b7280" }}>
                          {pkg?.package_number || `PKG-${order.order_sn}`}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: "12px", fontWeight: 600 }}>
                          {order.shipping_carrier || "SPX Express"}
                        </div>
                        <div style={{ fontSize: "11px", color: "#6b7280" }}>
                          {pkg?.tracking_number || "Chưa cấp mã vận đơn"}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: "12px", fontWeight: 500 }}>
                          {order.shop_name}
                        </div>
                        <div style={{ fontSize: "11px", color: "#6b7280" }}>
                          ID: {order.shop_id}
                        </div>
                      </td>
                      <td>{renderPackageStage(order)}</td>
                      <td>
                        <div className={s.inlineActions}>
                          {order.order_status === "PROCESSED" && (
                            <button
                              type="button"
                              className={s.btnActionPickup}
                              disabled={actionLoading}
                              onClick={() => handleCarrierScanPickup(order)}
                              title="ĐVVC quét mã lấy hàng -> Đang vận chuyển (SHIPPED)"
                            >
                              <Truck size={14} />
                              Quét mã → Đang vận chuyển
                            </button>
                          )}

                          {order.order_status === "SHIPPED" && (
                            <button
                              type="button"
                              className={s.btnActionDeliver}
                              disabled={actionLoading}
                              onClick={() => handleMarkDelivered(order)}
                              title="Xác nhận giao hàng thành công -> Đã giao (COMPLETED)"
                            >
                              <CheckCircle size={14} />
                              Giao thành công → Đã giao
                            </button>
                          )}

                          {order.order_status === "COMPLETED" && (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                fontSize: "12px",
                                color: "#059669",
                                fontWeight: 500,
                              }}
                            >
                              <CheckCircle2 size={14} /> Hoàn tất
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
