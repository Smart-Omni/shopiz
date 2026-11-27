import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Search,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  Package,
  Copy,
  Check,
  User,
  Truck,
  ShieldAlert,
  AlertCircle,
  Clock,
  ArrowUpDown,
  SlidersHorizontal,
  Upload,
  CheckCircle2,
} from "lucide-react";
import api from "../../../services/api";
import { getThumbnailUrl } from "../../../utils/imageUrl";
import SellerPagination from "../SellerPagination";
import s from "./ReturnsPage.module.css";

const money = (n) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(n);

const PRIORITY_FILTERS = [
  { id: "all", label: "Tất cả" },
  { id: "exp_1d", label: "Hết hạn trong 1 ngày" },
  { id: "exp_2d", label: "Hết hạn trong 2 ngày" },
];

const IMPORTANT_ACTIONS = [
  { id: "negotiate", label: "Thương lượng với Người mua" },
  { id: "provide_proof", label: "Cần cung cấp bằng chứng" },
  { id: "hold_package", label: "Giữ lại kiện hàng" },
  { id: "check_return", label: "Kiểm tra hàng hoàn" },
  { id: "respond_ruling", label: "Phản hồi quyết định hoàn tiền của Shopee" },
];

const STATUS_MAP = {
  REQUESTED: { label: "Chờ Người bán phản hồi", color: "#fa8c16", bg: "#fff7e6" },
  JUDGING: { label: "Shopee đang xem xét", color: "#1890ff", bg: "#e6f7ff" },
  PROCESSING: { label: "Đang xử lý đổi/trả", color: "#13c2c2", bg: "#e6fffb" },
  SELLER_DISPUTE: { label: "Người bán khiếu nại", color: "#fa541c", bg: "#fff2e8" },
  ACCEPTED: { label: "Chấp nhận hoàn tiền", color: "#52c41a", bg: "#f6ffed" },
  CANCELLED: { label: "Người mua đã hủy", color: "#8c8c8c", bg: "#f5f5f5" },
  CLOSED: { label: "Đã đóng khiếu nại", color: "#595959", bg: "#f0f0f0" },
};

const REASON_LABELS = {
  DAMAGED_FAULTY: "Hàng bị hư hỏng / bể vỡ / sai hàng",
  NOT_RECEIVED: "Chưa nhận được hàng",
  CHANGE_OF_MIND: "Đổi ý, không có nhu cầu",
  WRONG_ITEM: "Giao sai sản phẩm / phân loại",
  COUNTERFEIT: "Nghi ngờ hàng giả / nhái",
  MISSING_ITEMS: "Thiếu phụ kiện / quà tặng",
};

function formatDisputeCountdown(tsSeconds) {
  if (!tsSeconds) return null;
  const diff = tsSeconds - Math.floor(Date.now() / 1000);
  if (diff <= 0) return "Đã hết hạn khiếu nại (2 ngày)";
  const hours = Math.floor(diff / 3600);
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return days > 0 ? `Hạn khiếu nại: Còn ${days} ngày ${remHours} giờ` : `Hạn khiếu nại: Còn ${hours} giờ`;
}

function formatShortDate(tsSeconds) {
  if (!tsSeconds) return "";
  return new Date(tsSeconds * 1000).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

const DISPUTE_REASON_OPTIONS = [
  { id: 47, label: "Sản phẩm hoàn trả bị hư hỏng / đã qua sử dụng do Người mua" },
  { id: 50, label: "Sản phẩm hoàn trả / khiếu nại của Người mua không đúng thực tế" },
  { id: 48, label: "Sai lệch khối lượng / kích thước kiện hàng" },
  { id: 51, label: "Từ chối khiếu nại chưa nhận được hàng (có bằng chứng giao thành công)" },
  { id: 52, label: "Người bán chưa nhận được hàng hoàn từ đơn vị vận chuyển" },
  { id: 49, label: "Lý do khác" },
];

export default function ReturnsPage({ shopId = 727720655 }) {
  const [params] = useSearchParams();
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedPriority, setSelectedPriority] = useState("all");
  const [selectedAction, setSelectedAction] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [operationFilter, setOperationFilter] = useState("ALL");
  const [appliedFilters, setAppliedFilters] = useState({
    query: "",
    operation: "ALL",
  });

  const [sortBy, setSortBy] = useState("created_desc");
  const [copiedSn, setCopiedSn] = useState("");
  const [toastNotice, setToastNotice] = useState("");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [expandedReturnItems, setExpandedReturnItems] = useState({});

  // Reset page when priority or action filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedPriority, selectedAction]);

  // Dispute Modal
  const [disputeModal, setDisputeModal] = useState(null); // return object
  const [disputeReasonId, setDisputeReasonId] = useState(47);
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeFiles, setDisputeFiles] = useState([]);
  const [disputeSubmitting, setDisputeSubmitting] = useState(false);

  // Proof Modal
  const [proofModal, setProofModal] = useState(null); // return object
  const [proofComment, setProofComment] = useState("");
  const [proofFiles, setProofFiles] = useState([]);
  const [proofSubmitting, setProofSubmitting] = useState(false);

  // Partial Refund Offer Modal
  const [offerModal, setOfferModal] = useState(null);
  const [offerAmount, setOfferAmount] = useState("");
  const [offerReason, setOfferReason] = useState("");
  const [offerSubmitting, setOfferSubmitting] = useState(false);

  const loadReturns = () => {
    setLoading(true);
    api
      .get(`/simulator/returns?shop_id=${shopId}`)
      .then((res) => {
        setReturns(res.returns || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadReturns();
  }, [shopId]);

  // Apply filters
  const handleSearch = (e) => {
    e?.preventDefault();
    setCurrentPage(1);
    setAppliedFilters({
      query: searchQuery.trim(),
      operation: operationFilter,
    });
  };

  const handleReset = () => {
    setCurrentPage(1);
    setSearchQuery("");
    setOperationFilter("ALL");
    setSelectedPriority("all");
    setSelectedAction("");
    setAppliedFilters({ query: "", operation: "ALL" });
  };

  // Filtered dataset
  const filteredReturns = useMemo(() => {
    return returns
      .filter((r) => {
        // Priority deadline
        if (selectedPriority === "exp_1d" && r.due_date) {
          const now = Date.now() / 1000;
          if (r.due_date - now > 86400 || r.due_date < now) return false;
        } else if (selectedPriority === "exp_2d" && r.due_date) {
          const now = Date.now() / 1000;
          if (r.due_date - now > 172800 || r.due_date < now) return false;
        }

        // Action filter
        if (selectedAction === "provide_proof" && r.seller_proof_status !== "PENDING") {
          return false;
        } else if (selectedAction === "negotiate" && r.negotiation_status !== "PENDING") {
          return false;
        } else if (selectedAction === "check_return" && !r.reverse_tracking_number) {
          return false;
        }

        // Operation filter
        if (appliedFilters.operation !== "ALL") {
          if (appliedFilters.operation === "REFUND_ONLY" && r.solution !== "REFUND") return false;
          if (appliedFilters.operation === "RETURN_REFUND" && r.solution !== "RETURN_REFUND")
            return false;
        }

        // Text query
        if (appliedFilters.query) {
          const q = appliedFilters.query.toLowerCase();
          const matchRet = r.return_sn?.toLowerCase().includes(q);
          const matchOrd = r.order_sn?.toLowerCase().includes(q);
          const matchBuyer = r.buyer_username?.toLowerCase().includes(q);
          const matchTrack = r.reverse_tracking_number?.toLowerCase().includes(q);
          if (!matchRet && !matchOrd && !matchBuyer && !matchTrack) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "amount_desc") return (b.refund_amount || 0) - (a.refund_amount || 0);
        if (sortBy === "amount_asc") return (a.refund_amount || 0) - (b.refund_amount || 0);
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [returns, selectedPriority, selectedAction, appliedFilters, sortBy]);

  // Paginated slice for current page
  const paginatedReturns = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredReturns.slice(start, start + pageSize);
  }, [filteredReturns, currentPage, pageSize]);

  // Copy order SN
  const handleCopy = (text) => {
    navigator.clipboard?.writeText(text);
    setCopiedSn(text);
    setTimeout(() => setCopiedSn(""), 2000);
  };

  // Seller confirm refund
  const handleConfirmRefund = async (returnSn) => {
    try {
      await api.post("/simulator/returns/seller_confirm", {
        return_sn: returnSn,
        shop_id: shopId,
      });
      setToastNotice(`Đã chấp thuận hoàn tiền cho yêu cầu #${returnSn}`);
      loadReturns();
    } catch (err) {
      setToastNotice(err.message || "Xác nhận hoàn tiền thất bại.");
    }
  };

  // Seller submit dispute
  const handleSubmitDispute = async () => {
    if (!disputeModal || !disputeReason.trim() || disputeSubmitting) return;
    setDisputeSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("return_sn", disputeModal.return_sn);
      formData.append("shop_id", String(shopId));
      formData.append("dispute_reason_id", String(disputeReasonId));
      formData.append("dispute_text_reason", disputeReason.trim());
      disputeFiles.forEach((file) => {
        formData.append("files", file);
      });

      await api.post("/simulator/returns/seller_dispute", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 120000,
      });
      setToastNotice(`Đã gửi khiếu nại thành công cho yêu cầu #${disputeModal.return_sn}`);
      setDisputeModal(null);
      setDisputeReason("");
      setDisputeReasonId(47);
      setDisputeFiles([]);
      loadReturns();
    } catch (err) {
      setToastNotice(err.message || "Gửi khiếu nại thất bại.");
    } finally {
      setDisputeSubmitting(false);
    }
  };

  // Seller upload proof
  const handleSubmitProof = async () => {
    if (!proofModal || (!proofComment.trim() && proofFiles.length === 0) || proofSubmitting) return;
    setProofSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("return_sn", proofModal.return_sn);
      formData.append("shop_id", String(shopId));
      formData.append("comment", proofComment.trim() || "Bằng chứng người bán cung cấp");
      proofFiles.forEach((file) => {
        formData.append("files", file);
      });

      await api.post("/simulator/returns/seller_upload_proof", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 120000,
      });
      setToastNotice(`Đã tải lên bằng chứng thành công!`);
      setProofModal(null);
      setProofComment("");
      setProofFiles([]);
      loadReturns();
    } catch (err) {
      setToastNotice(err.message || "Không thể tải lên bằng chứng.");
    } finally {
      setProofSubmitting(false);
    }
  };

  // Seller submit partial refund counter-offer
  const handleSubmitOffer = async () => {
    if (!offerModal || !offerAmount || offerSubmitting) return;
    const amountNum = Number(offerAmount);
    if (isNaN(amountNum) || amountNum <= 0 || amountNum > Number(offerModal.refund_amount)) {
      setToastNotice(`Số tiền đề xuất phải > 0 và <= ${money(offerModal.refund_amount)}`);
      return;
    }
    setOfferSubmitting(true);
    try {
      await api.post("/simulator/returns/seller_offer", {
        return_sn: offerModal.return_sn,
        offer_amount: amountNum,
        offer_reason: offerReason.trim() || "Người bán đề xuất hoàn tiền một phần",
      });
      setToastNotice(`Đã gửi đề xuất hoàn ${money(amountNum)} cho yêu cầu #${offerModal.return_sn}`);
      setOfferModal(null);
      setOfferAmount("");
      setOfferReason("");
      loadReturns();
    } catch (err) {
      setToastNotice(err.message || "Không thể gửi đề xuất hoàn tiền.");
    } finally {
      setOfferSubmitting(false);
    }
  };

  // Export CSV
  const handleExport = () => {
    const headers = [
      "Mã yêu cầu",
      "Mã đơn hàng",
      "Người mua",
      "Số tiền hoàn",
      "Lý do",
      "Trạng thái",
      "Phương án",
      "Ngày tạo",
    ];
    const rows = filteredReturns.map((r) => [
      r.return_sn,
      r.order_sn,
      r.buyer_username,
      r.refund_amount,
      REASON_LABELS[r.reason] || r.reason,
      STATUS_MAP[r.status]?.label || r.status,
      r.solution === "REFUND" ? "Hoàn tiền ngay" : "Trả hàng và Hoàn tiền",
      new Date(r.created_at).toLocaleString("vi-VN"),
    ]);

    const csvContent =
      "\uFEFF" +
      [headers.join(","), ...rows.map((row) => row.map((c) => `"${c}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `shopee_returns_${Date.now()}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className={s.pageWrapper}>
      {/* 1. Priority Filters */}
      <div className={s.priorityRow}>
        <span className={s.priorityLabel}>Ưu tiên</span>
        <div className={s.pillList}>
          {PRIORITY_FILTERS.map((p) => {
            const isSelected = selectedPriority === p.id;
            return (
              <button
                key={p.id}
                type="button"
                className={`${s.pillBtn} ${isSelected ? s.pillActive : ""}`}
                onClick={() => setSelectedPriority(p.id)}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Important-Action Filters */}
      <div className={s.actionFiltersRow}>
        <span className={s.actionSectionLabel}>HÀNH ĐỘNG QUAN TRỌNG</span>
        <div className={s.pillList}>
          {IMPORTANT_ACTIONS.map((a) => {
            const isSelected = selectedAction === a.id;
            return (
              <button
                key={a.id}
                type="button"
                className={`${s.pillBtn} ${isSelected ? s.pillActive : ""}`}
                onClick={() => setSelectedAction(isSelected ? "" : a.id)}
              >
                {a.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className={s.sectionDivider} />

      {/* 3. Search and Filter Toolbar */}
      <form className={s.searchToolbar} onSubmit={handleSearch}>
        <div className={s.searchInputWrap}>
          <span className={s.searchPreLabel}>Tìm yêu cầu</span>
          <input
            type="text"
            className={s.searchInput}
            placeholder="Điền Mã yêu cầu trả hàng/ Mã đơn hàng/ Mã vận đơn hàng hoàn/ Tài khoản Người mua..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Search size={16} className={s.searchIcon} />
        </div>

        <div className={s.operationFilterWrap}>
          <label className={s.opLabel}>Toàn bộ thao tác</label>
          <select
            className={s.opSelect}
            value={operationFilter}
            onChange={(e) => setOperationFilter(e.target.value)}
          >
            <option value="ALL">Vui lòng chọn</option>
            <option value="REFUND_ONLY">Chỉ hoàn tiền</option>
            <option value="RETURN_REFUND">Trả hàng & Hoàn tiền</option>
          </select>
        </div>

        <div className={s.searchButtons}>
          <button type="submit" className={s.btnSearch}>
            Tìm kiếm
          </button>
          <button type="button" className={s.btnReset} onClick={handleReset}>
            Đặt lại
          </button>
        </div>
      </form>

      {/* 4. Results Header & Actions */}
      <div className={s.resultsHeader}>
        <span className={s.resultCountBold}>
          {loading ? "Đang tải..." : `${filteredReturns.length} Yêu cầu`}
        </span>

        <div className={s.tableToolActions}>
          <div className={s.sortControlWrap}>
            <span className={s.sortLabel}>
              <ArrowUpDown size={14} /> Sắp xếp theo:
            </span>
            <select
              className={s.sortSelect}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="created_desc">Thời gian tạo mới nhất</option>
              <option value="amount_desc">Số tiền hoàn cao nhất</option>
              <option value="amount_asc">Số tiền hoàn thấp nhất</option>
            </select>
          </div>

          <button
            type="button"
            className={s.btnExport}
            onClick={handleExport}
            title="Xuất danh sách yêu cầu"
          >
            <FileSpreadsheet size={15} /> Export
          </button>
        </div>
      </div>

      {/* 5. Returns Table */}
      <div className={s.tableContainer}>
        <table className={s.returnsTable}>
          <thead>
            <tr>
              <th style={{ width: "22%" }}>Sản phẩm</th>
              <th style={{ width: "10%" }}>Số tiền hoàn cho Người mua</th>
              <th style={{ width: "9%" }}>Số tiền bồi thường cho Người bán</th>
              <th style={{ width: "14%" }}>Lý do</th>
              <th style={{ width: "11%" }}>Lý do điều chỉnh bởi Shopee</th>
              <th style={{ width: "9%" }}>Phương án cho Người mua</th>
              <th style={{ width: "10%" }}>Trạng thái</th>
              <th style={{ width: "7%" }}>Vận chuyển</th>
              <th style={{ width: "8%" }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {paginatedReturns.map((r) => {
              const statusMeta = STATUS_MAP[r.status] || {
                label: r.status,
                color: "#595959",
                bg: "#f5f5f5",
              };
              const reasonText = REASON_LABELS[r.reason] || r.reason;
              const isCopied = copiedSn === r.order_sn;

              return (
                <React.Fragment key={r.return_sn}>
                  {/* Grouped Request Header Row */}
                  <tr className={s.requestHeaderRow}>
                    <td colSpan={9}>
                      <div className={s.requestHeaderContent}>
                        <div className={s.buyerBadge}>
                          <div className={s.avatarSmall}>
                            <User size={13} />
                          </div>
                          <span className={s.buyerName}>{r.buyer_username}</span>
                        </div>

                        <span className={s.verticalBar}>|</span>

                        <div className={s.orderSnWrap}>
                          <span className={s.orderSnLabel}>Mã đơn hàng:</span>
                          <span className={s.orderSnVal}>{r.order_sn}</span>
                          <button
                            type="button"
                            className={s.btnCopy}
                            title="Sao chép mã đơn hàng"
                            onClick={() => handleCopy(r.order_sn)}
                          >
                            {isCopied ? <Check size={12} color="#52c41a" /> : <Copy size={12} />}
                          </button>
                        </div>

                        <span className={s.returnSnMeta}>
                          Mã yêu cầu: <strong>{r.return_sn}</strong>
                        </span>

                        <span className={s.requestDate}>
                          {new Date(r.created_at).toLocaleString("vi-VN")}
                        </span>
                      </div>
                    </td>
                  </tr>

                  {/* Grouped Request Details Row */}
                  <tr className={s.requestDataRow}>
                    {/* Sản phẩm */}
                    <td className={s.prodCell}>
                      {r.items && r.items.length > 0 ? (
                        <div className={s.itemsWrap}>
                          {(expandedReturnItems[r.return_sn]
                            ? r.items
                            : r.items.slice(0, 2)
                          ).map((it, idx) => {
                            const rawImg = it.image || it.image_url || it.image_info?.image_url;
                            const itImg = getThumbnailUrl(rawImg, 100);
                            return (
                              <div key={idx} className={s.prodItem}>
                                <div className={s.prodThumb} style={{ overflow: "hidden", position: "relative" }}>
                                  {itImg ? (
                                    <img
                                      src={itImg}
                                      alt={it.item_name}
                                      loading="lazy"
                                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                                      onError={(e) => {
                                        e.currentTarget.style.display = "none";
                                        if (e.currentTarget.nextElementSibling) {
                                          e.currentTarget.nextElementSibling.style.display = "flex";
                                        }
                                      }}
                                    />
                                  ) : null}
                                  <div style={{ display: itImg ? "none" : "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%" }}>
                                    <Package size={22} color="#bfbfbf" />
                                  </div>
                                </div>
                                <div className={s.prodInfo}>
                                  <span className={s.prodName} title={it.item_name}>{it.item_name}</span>
                                  {it.model_name && (
                                    <span className={s.modelName}>Phân loại: {it.model_name}</span>
                                  )}
                                  <span className={s.prodQty}>x{it.quantity}</span>
                                </div>
                              </div>
                            );
                          })}
                          {r.items.length > 2 && (
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedReturnItems((prev) => ({
                                  ...prev,
                                  [r.return_sn]: !prev[r.return_sn],
                                }))
                              }
                              style={{
                                background: "none",
                                border: 0,
                                padding: "2px 0",
                                fontSize: 11,
                                color: "#ee4d2d",
                                cursor: "pointer",
                                textAlign: "left",
                                fontWeight: 500,
                              }}
                            >
                              {expandedReturnItems[r.return_sn]
                                ? "Thu gọn ▴"
                                : `+${r.items.length - 2} sản phẩm khác ▾`}
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className={s.prodItem}>
                          <div className={s.prodThumb}>
                            <Package size={22} color="#bfbfbf" />
                          </div>
                          <div className={s.prodInfo}>
                            <span className={s.prodName}>Sản phẩm yêu cầu trả hàng</span>
                            <span className={s.prodQty}>x1</span>
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Số tiền hoàn cho Người mua */}
                    <td className={s.amountCell}>
                      <span className={s.refundAmount}>{money(r.refund_amount)}</span>
                      {r.offer_amount && (
                        <small className={s.offerText}>Đề xuất: {money(r.offer_amount)}</small>
                      )}
                    </td>

                    {/* Số tiền bồi thường cho Người bán */}
                    <td className={s.amountCell}>
                      {r.compensation_status === "COMPENSATION_APPROVED" ? (
                        <span className={s.compAmount}>{money(r.refund_amount)}</span>
                      ) : (
                        <span className={s.noComp}>—</span>
                      )}
                    </td>

                    {/* Lý do */}
                    <td className={s.reasonCell}>
                      <span className={s.reasonTitle}>{reasonText}</span>
                      {(r.is_nfr_exempt || r.reason === "CHANGE_OF_MIND") && (
                        <span
                          style={{
                            display: "inline-block",
                            marginTop: 4,
                            padding: "2px 6px",
                            fontSize: 10,
                            fontWeight: 600,
                            color: "#047857",
                            background: "#ecfdf5",
                            border: "1px solid #a7f3d0",
                            borderRadius: 4,
                          }}
                        >
                          Không tính NFR
                        </span>
                      )}
                      {r.text_reason && <p className={s.reasonDetail}>{r.text_reason}</p>}
                    </td>

                    {/* Lý do điều chỉnh bởi Shopee */}
                    <td className={s.rulingCell}>
                      {r.ruling_notes ? (
                        <span className={s.rulingNotes}>{r.rulingNotes}</span>
                      ) : r.dispute_text_reason ? (
                        <span className={s.rulingNotes}>{r.dispute_text_reason}</span>
                      ) : (
                        <span className={s.noRuling}>—</span>
                      )}
                    </td>

                    {/* Phương án cho Người mua */}
                    <td className={s.solutionCell}>
                      <span className={s.solutionBadge}>
                        {r.solution === "REFUND" ? "Hoàn tiền ngay" : "Trả hàng & Hoàn tiền"}
                      </span>
                    </td>

                    {/* Trạng thái */}
                    <td className={s.statusCell}>
                      <span
                        className={s.statusPill}
                        style={{ color: statusMeta.color, backgroundColor: statusMeta.bg }}
                      >
                        {statusMeta.label}
                      </span>
                      {r.status === "PROCESSING" && r.needs_logistics && !r.reverse_delivered_at && (
                        <div style={{ fontSize: 11, color: "#595959", marginTop: 4, lineHeight: 1.35 }}>
                          Người mua đang trả hàng.
                          {r.expected_return_date
                            ? ` Dự kiến nhận: ${formatShortDate(r.expected_return_date)}`
                            : r.buyer_return_due_date
                              ? ` Hạn gửi: ${formatShortDate(r.buyer_return_due_date)}`
                              : ""}
                        </div>
                      )}
                      {r.dispute_due_date && (
                        <div style={{ fontSize: 11, color: "#cf1322", marginTop: 4, fontWeight: 500 }}>
                          {formatDisputeCountdown(r.dispute_due_date)}
                        </div>
                      )}
                    </td>

                    {/* Vận chuyển */}
                    <td className={s.logisticsCell}>
                      {r.reverse_tracking_number ? (
                        <div className={s.trackingWrap}>
                          <Truck size={13} color="#1890ff" />
                          <span className={s.trackingNum}>{r.reverse_tracking_number}</span>
                        </div>
                      ) : (
                        <span className={s.noLogistics}>Không cần gửi hàng</span>
                      )}
                    </td>

                    {/* Thao tác */}
                    <td className={s.actionCell}>
                      <div className={s.actionStack}>
                        {r.status === "REQUESTED" && (
                          <button
                            type="button"
                            className={s.btnPrimaryAction}
                            onClick={() => handleConfirmRefund(r.return_sn)}
                          >
                            Đồng ý hoàn tiền
                          </button>
                        )}

                        {(r.status === "REQUESTED" || r.status === "PROCESSING") &&
                          r.negotiation_status !== "PENDING_BUYER_RESPOND" && (
                          <button
                            type="button"
                            className={s.btnProofAction}
                            onClick={() => {
                              setOfferModal(r);
                              setOfferAmount(String(Math.round(Number(r.refund_amount || 0) * 0.5)));
                              setOfferReason("");
                            }}
                          >
                            Đề xuất hoàn tiền
                          </button>
                        )}

                        {(() => {
                          const nowSec = Math.floor(Date.now() / 1000);
                          const withinDisputeWindow = !r.dispute_due_date || nowSec <= r.dispute_due_date;
                          const canDisputeRequested = r.status === "REQUESTED";
                          const canDisputeInstantRefund =
                            r.status === "ACCEPTED" &&
                            r.solution === "REFUND" &&
                            r.compensation_status === "COMPENSATION_NOT_APPLICABLE" &&
                            withinDisputeWindow;
                          const canDisputeReturnParcel =
                            r.status === "PROCESSING" &&
                            (Boolean(r.reverse_delivered_at) ||
                              (Boolean(r.expected_return_date) && nowSec >= r.expected_return_date)) &&
                            withinDisputeWindow;
                          if (!canDisputeRequested && !canDisputeInstantRefund && !canDisputeReturnParcel) {
                            return null;
                          }
                          return (
                            <button
                              type="button"
                              className={s.btnDisputeAction}
                              onClick={() => setDisputeModal(r)}
                            >
                              Khiếu nại
                            </button>
                          );
                        })()}

                        {r.status === "SELLER_DISPUTE" && r.seller_proof_status !== "UPLOADED" && (
                          <button
                            type="button"
                            className={s.btnProofAction}
                            onClick={() => setProofModal(r)}
                          >
                            <Upload size={12} /> Bổ sung bằng chứng
                          </button>
                        )}

                        {r.status === "ACCEPTED" && (
                          <span className={s.acceptedNote}>Đã giải ngân</span>
                        )}

                        {r.status === "CLOSED" && <span className={s.closedNote}>Đã xong</span>}
                      </div>
                    </td>
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>

        {!loading && filteredReturns.length === 0 && (
          <div className={s.emptyState}>
            <Package size={52} strokeWidth={1.2} color="#bfbfbf" />
            <p className={s.emptyMessage}>Không tìm thấy yêu cầu Trả hàng / Hoàn tiền nào.</p>
          </div>
        )}
      </div>

      {/* 6. Pagination */}
      <SellerPagination
        currentPage={currentPage}
        totalItems={filteredReturns.length}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
      />

      {/* Dispute Modal */}
      {disputeModal && (
        <div
          className={s.modalOverlay}
          onClick={() => {
            if (!disputeSubmitting) {
              setDisputeModal(null);
              setDisputeFiles([]);
            }
          }}
        >
          <div className={s.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={s.modalHeader}>
              <h3>Gửi khiếu nại tới Shopee</h3>
              <button
                type="button"
                className={s.modalClose}
                disabled={disputeSubmitting}
                onClick={() => {
                  setDisputeModal(null);
                  setDisputeFiles([]);
                }}
              >
                ×
              </button>
            </div>
            <div className={s.modalBody}>
              <p>
                Mã yêu cầu: <strong>{disputeModal.return_sn}</strong>
              </p>
              <label className={s.fieldLabel}>Lý do khiếu nại:</label>
              <select
                className={s.reasonSelect}
                value={disputeReasonId}
                onChange={(e) => setDisputeReasonId(Number(e.target.value))}
                disabled={disputeSubmitting}
              >
                {DISPUTE_REASON_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <label className={s.fieldLabel}>Mô tả chi tiết:</label>
              <textarea
                className={s.disputeTextarea}
                rows={4}
                placeholder="Nêu rõ lý do từ chối yêu cầu và bằng chứng đóng gói của Shop..."
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                disabled={disputeSubmitting}
              />
              <label className={s.fieldLabel}>Hình ảnh / Video bằng chứng:</label>
              <label className={s.uploadBox}>
                <Upload size={16} />
                <span>Chọn ảnh hoặc video (.jpg, .png, .mp4, .mov)</span>
                <input
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  hidden
                  disabled={disputeSubmitting}
                  onChange={(e) => {
                    const selected = Array.from(e.target.files || []);
                    if (selected.length > 0) {
                      setDisputeFiles((prev) => [...prev, ...selected]);
                    }
                    e.target.value = "";
                  }}
                />
              </label>
              {disputeFiles.length > 0 && (
                <div className={s.filePreviewList}>
                  {disputeFiles.map((file, idx) => (
                    <div key={`${file.name}-${idx}`} className={s.filePreviewItem}>
                      <span className={s.fileName} title={file.name}>
                        {file.name} ({Math.max(1, Math.round(file.size / 1024))} KB)
                      </span>
                      <button
                        type="button"
                        className={s.fileRemoveBtn}
                        disabled={disputeSubmitting}
                        onClick={() =>
                          setDisputeFiles((prev) => prev.filter((_, i) => i !== idx))
                        }
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className={s.modalFooter}>
              <button
                type="button"
                className={s.btnCancel}
                disabled={disputeSubmitting}
                onClick={() => {
                  setDisputeModal(null);
                  setDisputeFiles([]);
                }}
              >
                Hủy
              </button>
              <button
                type="button"
                className={s.btnConfirm}
                onClick={handleSubmitDispute}
                disabled={!disputeReason.trim() || disputeSubmitting}
              >
                {disputeSubmitting ? "Đang gửi..." : "Gửi khiếu nại"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Proof Modal */}
      {proofModal && (
        <div
          className={s.modalOverlay}
          onClick={() => {
            if (!proofSubmitting) {
              setProofModal(null);
              setProofFiles([]);
            }
          }}
        >
          <div className={s.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={s.modalHeader}>
              <h3>Cung cấp bằng chứng bổ sung</h3>
              <button
                type="button"
                className={s.modalClose}
                disabled={proofSubmitting}
                onClick={() => {
                  setProofModal(null);
                  setProofFiles([]);
                }}
              >
                ×
              </button>
            </div>
            <div className={s.modalBody}>
              <p>
                Yêu cầu: <strong>{proofModal.return_sn}</strong>
              </p>
              <label className={s.fieldLabel}>Ghi chú giải trình:</label>
              <input
                type="text"
                className={s.proofInput}
                placeholder="Ảnh đóng hàng nguyên vẹn, video quay gửi bưu tá..."
                value={proofComment}
                onChange={(e) => setProofComment(e.target.value)}
                disabled={proofSubmitting}
              />
              <label className={s.fieldLabel}>Tải lên hình ảnh / video bằng chứng:</label>
              <label className={s.uploadBox}>
                <Upload size={16} />
                <span>Chọn ảnh hoặc video (.jpg, .png, .mp4, .mov)</span>
                <input
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  hidden
                  disabled={proofSubmitting}
                  onChange={(e) => {
                    const selected = Array.from(e.target.files || []);
                    if (selected.length > 0) {
                      setProofFiles((prev) => [...prev, ...selected]);
                    }
                    e.target.value = "";
                  }}
                />
              </label>
              {proofFiles.length > 0 && (
                <div className={s.filePreviewList}>
                  {proofFiles.map((file, idx) => (
                    <div key={`${file.name}-${idx}`} className={s.filePreviewItem}>
                      <span className={s.fileName} title={file.name}>
                        {file.name} ({Math.max(1, Math.round(file.size / 1024))} KB)
                      </span>
                      <button
                        type="button"
                        className={s.fileRemoveBtn}
                        disabled={proofSubmitting}
                        onClick={() =>
                          setProofFiles((prev) => prev.filter((_, i) => i !== idx))
                        }
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className={s.modalFooter}>
              <button
                type="button"
                className={s.btnCancel}
                disabled={proofSubmitting}
                onClick={() => {
                  setProofModal(null);
                  setProofFiles([]);
                }}
              >
                Hủy
              </button>
              <button
                type="button"
                className={s.btnConfirm}
                onClick={handleSubmitProof}
                disabled={(!proofComment.trim() && proofFiles.length === 0) || proofSubmitting}
              >
                {proofSubmitting ? "Đang tải lên..." : "Tải lên"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Partial Refund Offer Modal */}
      {offerModal && (
        <div
          className={s.modalOverlay}
          onClick={() => {
            if (!offerSubmitting) setOfferModal(null);
          }}
        >
          <div className={s.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={s.modalHeader}>
              <h3>Đề xuất hoàn tiền một phần</h3>
              <button
                type="button"
                className={s.modalClose}
                disabled={offerSubmitting}
                onClick={() => setOfferModal(null)}
              >
                ×
              </button>
            </div>
            <div className={s.modalBody}>
              <p>
                Yêu cầu: <strong>{offerModal.return_sn}</strong> (Tối đa: {money(offerModal.refund_amount)})
              </p>
              <label className={s.fieldLabel}>Số tiền đề xuất hoàn (VND):</label>
              <input
                type="number"
                className={s.proofInput}
                min={1}
                max={Number(offerModal.refund_amount || 0)}
                value={offerAmount}
                onChange={(e) => setOfferAmount(e.target.value)}
                disabled={offerSubmitting}
              />
              <label className={s.fieldLabel}>Lý do / Ghi chú thương lượng:</label>
              <textarea
                className={s.disputeTextarea}
                rows={3}
                placeholder="Đề xuất hoàn tiền một phần không cần trả hàng..."
                value={offerReason}
                onChange={(e) => setOfferReason(e.target.value)}
                disabled={offerSubmitting}
              />
            </div>
            <div className={s.modalFooter}>
              <button
                type="button"
                className={s.btnCancel}
                disabled={offerSubmitting}
                onClick={() => setOfferModal(null)}
              >
                Hủy
              </button>
              <button
                type="button"
                className={s.btnConfirm}
                onClick={handleSubmitOffer}
                disabled={!offerAmount || offerSubmitting}
              >
                {offerSubmitting ? "Đang gửi..." : "Gửi đề xuất"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notice */}
      {toastNotice && (
        <div className={s.toast}>
          <CheckCircle2 size={16} color="#52c41a" />
          <span>{toastNotice}</span>
          <button type="button" className={s.toastClose} onClick={() => setToastNotice("")}>
            ×
          </button>
        </div>
      )}
    </div>
  );
}
