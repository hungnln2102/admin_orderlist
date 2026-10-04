import React, { useState, useEffect, useCallback } from "react";
import {
  Receipt,
  Search,
  CheckCircle2,
  AlertCircle,
  TrendingDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  RefreshCw,
  ArrowUpRight,
  ArrowDownLeft,
  Filter,
  FileSpreadsheet,
  Plus,
  HelpCircle,
  Link2,
} from "lucide-react";
import { AllocateReceiptModal } from "../features/invoices/components/AllocateReceiptModal";

interface InvoiceReceipt {
  id: number;
  id_order: string | null;
  payment_date: string;
  amount: number;
  unallocated_amount?: string | number;
  status?: string;
  sender: string;
  receiver: string;
  gateway: string;
  reference_code: string;
  sepay_transaction_id: string;
  transfer_type: "in" | "out" | string;
  note: string;
  allocation_type?: string | null;
  alloc_note?: string | null;
  order_customer: string | null;
  order_status: string | null;
}

interface TabCounts {
  orders: number;
  other: number;
  unlisted: number;
  all: number;
}

interface InvoiceStats {
  totalReceipts: number;
  unmatchedReceipts: number;
  expenseReceipts: number;
}

interface InvoicePagination {
  page: number;
  limit: number;
  totalOrders: number;
  totalPages: number;
}

type TabType = "orders" | "other" | "unlisted";

export const ReceiptsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>("orders");
  const [receipts, setReceipts] = useState<InvoiceReceipt[]>([]);
  const [tabCounts, setTabCounts] = useState<TabCounts>({
    orders: 0,
    other: 0,
    unlisted: 0,
    all: 0,
  });
  const [stats, setStats] = useState<InvoiceStats>({
    totalReceipts: 0,
    unmatchedReceipts: 0,
    expenseReceipts: 0,
  });
  const [pagination, setPagination] = useState<InvoicePagination>({
    page: 1,
    limit: 15,
    totalOrders: 0,
    totalPages: 1,
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("all"); // 'all' | 'in' | 'out'
  const [page, setPage] = useState<number>(1);
  const [selectedReceipt, setSelectedReceipt] = useState<InvoiceReceipt | null>(null);
  const [allocatingReceipt, setAllocatingReceipt] = useState<InvoiceReceipt | null>(null);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "15",
        tab: activeTab,
        search: search.trim(),
        type: typeFilter,
      });

      const res = await fetch(`/api/invoices?${params.toString()}`);
      if (!res.ok) throw new Error("Không thể tải danh sách biên lai");
      const json = await res.json();

      setReceipts(json.data || []);
      if (json.tabCounts) setTabCounts(json.tabCounts);
      if (json.stats) setStats(json.stats);
      if (json.pagination) setPagination(json.pagination);
    } catch (err) {
      console.error("Lỗi khi tải biên lai:", err);
    } finally {
      setLoading(false);
    }
  }, [page, activeTab, search, typeFilter]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setPage(1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("vi-VN").format(val) + " ₫";

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, "0");
    const mins = String(d.getMinutes()).padStart(2, "0");
    return `${day}/${month}/${year} ${hours}:${mins}`;
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Title & Top Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800/80 backdrop-blur-xl shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-1">
            <span>Bán Hàng & Đơn Hàng</span>
            <span>•</span>
            <span className="bg-cyan-500/10 text-cyan-300 px-2 py-0.5 rounded-md border border-cyan-500/20">
              Đang Hoạt Động
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2.5">
            <Receipt className="w-7 h-7 text-cyan-400" />
            Biên Lai Thanh Toán & Đối Soát
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Toàn bộ biên lai ngân hàng, phân loại tự động và đối soát tài chính
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchInvoices}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 text-xs font-medium rounded-xl border border-slate-700/60 transition-all shadow-sm active:scale-95"
          >
            <RefreshCw className={`w-4 h-4 text-cyan-400 ${loading ? "animate-spin" : ""}`} />
            <span>Làm mới</span>
          </button>

          <button
            className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 text-xs font-medium rounded-xl border border-slate-700/60 transition-all shadow-sm active:scale-95"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Xuất Excel</span>
          </button>

          <button
            className="flex items-center gap-2 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-cyan-600/25 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>+ Tạo Mới</span>
          </button>
        </div>
      </div>

      {/* 2. Stats Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Order Receipts */}
        <div
          onClick={() => handleTabChange("orders")}
          className={`p-5 rounded-2xl border backdrop-blur-xl flex items-center justify-between shadow-lg cursor-pointer transition-all ${
            activeTab === "orders"
              ? "bg-emerald-950/30 border-emerald-500/40 ring-1 ring-emerald-500/30"
              : "bg-slate-900/60 border-slate-800/80 hover:border-slate-700"
          }`}
        >
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              TỔNG BIÊN LAI ĐƠN
            </span>
            <div className="text-2xl font-bold text-slate-100 mt-1">
              {tabCounts.orders.toLocaleString("vi-VN")}{" "}
              <span className="text-xs text-slate-400 font-normal">biên lai</span>
            </div>
            <div className="text-[11.5px] text-emerald-400 flex items-center gap-1 mt-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Khớp thành công 100% với mã đơn</span>
            </div>
          </div>
          <div className="p-3.5 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* Unlisted Receipts */}
        <div
          onClick={() => handleTabChange("unlisted")}
          className={`p-5 rounded-2xl border backdrop-blur-xl flex items-center justify-between shadow-lg cursor-pointer transition-all ${
            activeTab === "unlisted"
              ? "bg-cyan-950/30 border-cyan-500/40 ring-1 ring-cyan-500/30"
              : "bg-slate-900/60 border-slate-800/80 hover:border-slate-700"
          }`}
        >
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              CHƯA ĐƯỢC LIỆT KÊ
            </span>
            <div className="text-2xl font-bold text-cyan-300 mt-1">
              {tabCounts.unlisted.toLocaleString("vi-VN")}{" "}
              <span className="text-xs text-slate-400 font-normal">biên lai</span>
            </div>
            <div className="text-[11.5px] text-cyan-400 flex items-center gap-1 mt-1">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Chưa được định danh / tiền tự do</span>
            </div>
          </div>
          <div className="p-3.5 bg-cyan-500/10 text-cyan-400 rounded-2xl border border-cyan-500/20">
            <HelpCircle className="w-6 h-6" />
          </div>
        </div>

        {/* Other / Expense Receipts */}
        <div
          onClick={() => handleTabChange("other")}
          className={`p-5 rounded-2xl border backdrop-blur-xl flex items-center justify-between shadow-lg cursor-pointer transition-all ${
            activeTab === "other"
              ? "bg-purple-950/30 border-purple-500/40 ring-1 ring-purple-500/30"
              : "bg-slate-900/60 border-slate-800/80 hover:border-slate-700"
          }`}
        >
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              CHI PHÍ & NGOÀI LUỒNG
            </span>
            <div className="text-2xl font-bold text-purple-300 mt-1">
              {tabCounts.other.toLocaleString("vi-VN")}{" "}
              <span className="text-xs text-slate-400 font-normal">biên lai</span>
            </div>
            <div className="text-[11.5px] text-purple-400 flex items-center gap-1 mt-1">
              <TrendingDown className="w-3.5 h-3.5" />
              <span>Đã xác nhận tài chính & gắn log</span>
            </div>
          </div>
          <div className="p-3.5 bg-purple-500/10 text-purple-400 rounded-2xl border border-purple-500/20">
            <TrendingDown className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 3. 3-Tab Bar Navigation & Search */}
      <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80 backdrop-blur-xl flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={handleSearchChange}
            placeholder="Tìm kiếm thông tin..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 transition-colors"
          />
        </div>

        {/* Transfer Type Filter */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <div className="flex items-center gap-1.5 bg-slate-950/60 px-3 py-1.5 rounded-xl border border-slate-800">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="bg-transparent text-xs text-slate-300 font-medium focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-slate-900">Bộ lọc tất cả</option>
              <option value="in" className="bg-slate-900">Tiền Vào (Khách chuyển)</option>
              <option value="out" className="bg-slate-900">Tiền Ra (Chi phí / NCC)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. Receipts Table */}
      <div className="bg-slate-900/60 rounded-2xl border border-slate-800/80 backdrop-blur-xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar min-h-[380px]">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900/90 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider select-none whitespace-nowrap">
                {activeTab === "orders" && (
                  <>
                    <th className="py-3.5 px-4 min-w-[140px]">MÃ ĐƠN GỐC</th>
                    <th className="py-3.5 px-4 min-w-[140px]">SỐ TIỀN</th>
                    <th className="py-3.5 px-4 min-w-[160px]">NGƯỜI GỬI</th>
                    <th className="py-3.5 px-4 min-w-[150px]">NGÀY THANH TOÁN</th>
                  </>
                )}
                {activeTab === "other" && (
                  <>
                    <th className="py-3.5 px-4 min-w-[160px]">HẠNG MỤC / LOẠI GIAO DỊCH</th>
                    <th className="py-3.5 px-4 min-w-[140px]">SỐ TIỀN</th>
                    <th className="py-3.5 px-4 min-w-[200px]">ĐỐI TÁC / NỘI DUNG</th>
                    <th className="py-3.5 px-4 min-w-[150px]">NGÀY GIAO DỊCH</th>
                  </>
                )}
                {activeTab === "unlisted" && (
                  <>
                    <th className="py-3.5 px-4 min-w-[160px]">MÃ GIAO DỊCH / REF</th>
                    <th className="py-3.5 px-4 min-w-[140px]">SỐ TIỀN CÒN DƯ</th>
                    <th className="py-3.5 px-4 min-w-[200px]">NGƯỜI GỬI / GHI CHÚ</th>
                    <th className="py-3.5 px-4 min-w-[150px]">NGÀY NHẬN TIỀN</th>
                  </>
                )}
                <th className="py-3.5 px-4 w-16 text-right">THAO TÁC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                      <span>Đang tải biên lai thanh toán...</span>
                    </div>
                  </td>
                </tr>
              ) : receipts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Receipt className="w-10 h-10 text-slate-600 stroke-[1.5]" />
                      <span className="text-sm font-medium">Không tìm thấy biên lai nào</span>
                      <span className="text-xs text-slate-600">Thử chọn tab khác hoặc đổi từ khóa</span>
                    </div>
                  </td>
                </tr>
              ) : (
                receipts.map((receipt) => {
                  const isOut = receipt.transfer_type === "out";

                  // Xử lý hiển thị Cột 1 (Label/Code)
                  const renderColumn1 = () => {
                    if (activeTab === "orders") {
                      return receipt.id_order ? (
                        <span className="px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 shadow-sm font-mono font-bold">
                          {receipt.id_order}
                        </span>
                      ) : (
                        <span className="text-slate-500 italic font-normal">Chưa gán đơn</span>
                      );
                    }

                    if (activeTab === "other") {
                      if (receipt.id_order) {
                        return (
                          <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20 shadow-sm font-mono font-bold">
                            {receipt.id_order}
                          </span>
                        );
                      }
                      if (receipt.alloc_note) {
                        const badgeStyle = !isOut
                          ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                          : "bg-purple-500/10 text-purple-300 border-purple-500/20";
                        return (
                          <span className={`px-2.5 py-1 rounded-lg ${badgeStyle} border shadow-sm font-medium`}>
                            {receipt.alloc_note}
                          </span>
                        );
                      }
                      if (receipt.allocation_type === "OTHER_INCOME") {
                        return (
                          <span className="px-2.5 py-1 rounded-lg bg-pink-500/10 text-pink-300 border border-pink-500/20 shadow-sm font-medium">
                            Khách Tip / Tặng Thêm
                          </span>
                        );
                      }
                      if (receipt.allocation_type === "OPERATIONAL_EXPENSE") {
                        return (
                          <span className="px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-300 border border-purple-500/20 shadow-sm font-medium">
                            Chi Phí Vận Hành
                          </span>
                        );
                      }
                      if (receipt.allocation_type === "SUPPLIER") {
                        return (
                          <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20 shadow-sm font-medium">
                            Thanh Toán NCC
                          </span>
                        );
                      }
                      if (!isOut) {
                        return (
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 shadow-sm font-medium">
                            Tiền Vào Ngân Hàng
                          </span>
                        );
                      }
                      return (
                        <span className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-300 border border-rose-500/20 shadow-sm font-medium">
                          Tiền Ra Ngân Hàng
                        </span>
                      );
                    }

                    // Tab unlisted
                    return (
                      <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700/60 font-mono">
                        {receipt.sepay_transaction_id || receipt.reference_code || `#REC-${receipt.id}`}
                      </span>
                    );
                  };

                  // Xử lý hiển thị Cột 3 (Người gửi / Người nhận / Ghi chú)
                  const renderColumn3 = () => {
                    if (activeTab === "orders") {
                      return (
                        <div className="font-semibold text-slate-200 truncate max-w-[220px]">
                          {receipt.order_customer || receipt.sender || "Khách Hàng Ngân Hàng"}
                        </div>
                      );
                    }

                    if (activeTab === "other") {
                      const displayTarget = isOut
                        ? receipt.receiver || "Thanh toán chi phí"
                        : receipt.sender || "Thu ngoài luồng";
                      return (
                        <div className="truncate max-w-[280px]">
                          <div className="font-semibold text-slate-200 truncate">{displayTarget}</div>
                          {receipt.alloc_note && (
                            <div className="text-[11px] text-cyan-300 font-mono truncate">
                              Log: {receipt.alloc_note}
                            </div>
                          )}
                          {receipt.note && receipt.note !== displayTarget && (
                            <div className="text-[11px] text-slate-400 font-mono truncate">
                              NH: {receipt.note}
                            </div>
                          )}
                        </div>
                      );
                    }

                    // Tab unlisted
                    return (
                      <div className="truncate max-w-[280px]">
                        <div className="font-semibold text-slate-200 truncate">
                          {receipt.sender || "Giao dịch chuyển khoản"}
                        </div>
                        {receipt.note && (
                          <div className="text-[11px] text-slate-400 font-mono truncate">{receipt.note}</div>
                        )}
                      </div>
                    );
                  };

                  return (
                    <tr
                      key={receipt.id}
                      className="hover:bg-slate-800/50 transition-colors group border-b border-slate-800/40"
                    >
                      {/* Column 1 */}
                      <td className="py-3.5 px-4 font-mono">{renderColumn1()}</td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 font-bold font-mono">
                        <div className="flex items-center gap-1.5">
                          {isOut ? (
                            <ArrowDownLeft className="w-3.5 h-3.5 text-rose-400" />
                          ) : (
                            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                          )}
                          <span className={isOut ? "text-rose-400" : "text-emerald-400"}>
                            {formatCurrency(
                              activeTab === "unlisted" && receipt.unallocated_amount !== undefined
                                ? Number(receipt.unallocated_amount)
                                : receipt.amount
                            )}
                          </span>
                        </div>
                      </td>

                      {/* Column 3 */}
                      <td className="py-3.5 px-4">{renderColumn3()}</td>

                      {/* Payment Date */}
                      <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">
                        {formatDate(receipt.payment_date)}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {(activeTab === "unlisted" || Number(receipt.unallocated_amount || 0) > 0) && (
                            <button
                              onClick={() => setAllocatingReceipt(receipt)}
                              title="Gán mã đơn hoặc phân bổ số dư"
                              className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 hover:text-cyan-200 rounded-xl border border-cyan-500/30 hover:border-cyan-500/50 transition-all shadow-sm active:scale-95 font-semibold text-xs"
                            >
                              <Link2 className="w-3.5 h-3.5 text-cyan-400" />
                              <span>Gán Đơn</span>
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedReceipt(receipt)}
                            title="Xem chi tiết biên lai"
                            className="inline-flex items-center justify-center p-2 bg-slate-800/80 hover:bg-cyan-500/20 text-cyan-400 hover:text-cyan-300 rounded-xl border border-slate-700/60 hover:border-cyan-500/40 transition-all shadow-sm active:scale-95"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="px-5 py-3.5 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div>
            Hiển thị <span className="font-semibold text-slate-200">{receipts.length}</span> /{" "}
            <span className="font-semibold text-slate-200">{pagination.totalOrders}</span> kết quả
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-700 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-slate-300 px-2">
              Trang {pagination.page} / {pagination.totalPages}
            </span>
            <button
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-700 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 5. Receipt Detail Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-cyan-400" />
                Chi Tiết Biên Lai #{selectedReceipt.id}
              </h2>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="text-slate-400 hover:text-slate-200 p-1 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Mã Đơn Gốc:</span>
                <span className="font-mono font-bold text-cyan-300">
                  {selectedReceipt.id_order ? `#${selectedReceipt.id_order}` : "Chưa gán đơn"}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Số Tiền:</span>
                <span className="font-mono font-bold text-emerald-400 text-sm">
                  {formatCurrency(selectedReceipt.amount)}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Người Gửi:</span>
                <span className="font-semibold text-slate-200">
                  {selectedReceipt.order_customer || selectedReceipt.sender || "—"}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Ngân Hàng:</span>
                <span className="font-medium text-slate-300">{selectedReceipt.gateway || "VPBank"}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Mã Giao Dịch SePay:</span>
                <span className="font-mono text-slate-300">{selectedReceipt.sepay_transaction_id || "—"}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Mã Tham Chiếu Ref:</span>
                <span className="font-mono text-slate-300">{selectedReceipt.reference_code || "—"}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Thời Gian Thanh Toán:</span>
                <span className="font-mono text-slate-300">{formatDate(selectedReceipt.payment_date)}</span>
              </div>
              {selectedReceipt.alloc_note && (
                <div className="pt-2">
                  <span className="text-cyan-400 font-semibold block mb-1">Ghi Chú Log Phân Bổ:</span>
                  <div className="p-3 bg-cyan-950/40 border border-cyan-500/30 text-cyan-200 font-mono text-[11px] leading-relaxed break-all rounded-xl">
                    {selectedReceipt.alloc_note}
                  </div>
                </div>
              )}
              <div className="pt-2">
                <span className="text-slate-400 block mb-1">Nội dung chuyển khoản gốc (Note):</span>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-slate-300 font-mono text-[11px] leading-relaxed break-all">
                  {selectedReceipt.note || "Không có nội dung"}
                </div>
              </div>
            </div>

            <div className="pt-3 flex justify-between items-center border-t border-slate-800">
              {Number(selectedReceipt.unallocated_amount || 0) > 0 ? (
                <button
                  onClick={() => {
                    const r = selectedReceipt;
                    setSelectedReceipt(null);
                    setAllocatingReceipt(r);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl font-bold text-xs shadow-md shadow-cyan-950/40 transition-all active:scale-95"
                >
                  <Link2 className="w-4 h-4" />
                  <span>Phân Bổ Ngay</span>
                </button>
              ) : <div />}

              <button
                onClick={() => setSelectedReceipt(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-medium text-xs transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Allocate Receipt Modal */}
      <AllocateReceiptModal
        receipt={allocatingReceipt}
        isOpen={!!allocatingReceipt}
        onClose={() => setAllocatingReceipt(null)}
        onSuccess={fetchInvoices}
      />
    </div>
  );
};
