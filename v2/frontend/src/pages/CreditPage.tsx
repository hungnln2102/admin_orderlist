import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  FileText,
  XCircle,
  CheckCircle,
  CreditCard,
  Loader2,
  Eye,
  AlertTriangle,
} from "lucide-react";

interface CreditNote {
  id: number;
  credit_code: string;
  source_order_list_id: number | null;
  source_order_code: string;
  customer_name: string;
  customer_contact: string;
  refund_amount: number;
  available_amount: number;
  applied_total: number;
  applied_count: number;
  status: string;
  note: string | null;
  issued_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  last_applied_at: string | null;
  is_available: boolean;
}

interface CreditStats {
  total_count: number;
  available_count: number;
  unavailable_count: number;
}

interface CreditResponse {
  items: CreditNote[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
  stats: CreditStats;
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("vi-VN").format(v) + " ₫";

const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};

const statusLabel = (status: string, isAvailable: boolean) => {
  if (isAvailable) return "Khả dụng";
  switch (status) {
    case "FULLY_APPLIED":
      return "Đã áp dụng";
    case "VOID":
      return "Đã hủy";
    case "PARTIALLY_APPLIED":
      return "Đã dùng 1 phần";
    default:
      return status || "—";
  }
};

const statusColor = (status: string, isAvailable: boolean) => {
  if (isAvailable) return "text-emerald-400";
  switch (status) {
    case "FULLY_APPLIED":
      return "text-cyan-400";
    case "VOID":
      return "text-rose-400";
    default:
      return "text-zinc-400";
  }
};

export const CreditPage: React.FC = () => {
  const [availableData, setAvailableData] = useState<CreditResponse | null>(null);
  const [unavailableData, setUnavailableData] = useState<CreditResponse | null>(null);
  const [stats, setStats] = useState<CreditStats>({ total_count: 0, available_count: 0, unavailable_count: 0 });

  const [searchAvailable, setSearchAvailable] = useState("");
  const [searchUnavailable, setSearchUnavailable] = useState("");
  const [pageAvailable, setPageAvailable] = useState(1);
  const [pageUnavailable, setPageUnavailable] = useState(1);
  const [loadingAvailable, setLoadingAvailable] = useState(false);
  const [loadingUnavailable, setLoadingUnavailable] = useState(false);
  const [selectedCredit, setSelectedCredit] = useState<CreditNote | null>(null);

  const LIMIT = 10;

  const fetchAvailable = useCallback(async () => {
    setLoadingAvailable(true);
    try {
      const params = new URLSearchParams({
        group: "available",
        page: String(pageAvailable),
        limit: String(LIMIT),
      });
      if (searchAvailable.trim()) params.set("search", searchAvailable.trim());
      const res = await fetch(`/api/credits?${params}`);
      const data: CreditResponse = await res.json();
      setAvailableData(data);
      setStats(data.stats);
    } catch (err) {
      console.error("Lỗi tải credit khả dụng:", err);
    } finally {
      setLoadingAvailable(false);
    }
  }, [pageAvailable, searchAvailable]);

  const fetchUnavailable = useCallback(async () => {
    setLoadingUnavailable(true);
    try {
      const params = new URLSearchParams({
        group: "unavailable",
        page: String(pageUnavailable),
        limit: String(LIMIT),
      });
      if (searchUnavailable.trim()) params.set("search", searchUnavailable.trim());
      const res = await fetch(`/api/credits?${params}`);
      const data: CreditResponse = await res.json();
      setUnavailableData(data);
      setStats((prev) => ({ ...prev, unavailable_count: data.stats.unavailable_count }));
    } catch (err) {
      console.error("Lỗi tải credit không khả dụng:", err);
    } finally {
      setLoadingUnavailable(false);
    }
  }, [pageUnavailable, searchUnavailable]);

  useEffect(() => {
    fetchAvailable();
  }, [fetchAvailable]);

  useEffect(() => {
    fetchUnavailable();
  }, [fetchUnavailable]);

  const refreshAll = () => {
    fetchAvailable();
    fetchUnavailable();
  };

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => setPageAvailable(1), 400);
    return () => clearTimeout(t);
  }, [searchAvailable]);

  useEffect(() => {
    const t = setTimeout(() => setPageUnavailable(1), 400);
    return () => clearTimeout(t);
  }, [searchUnavailable]);

  const renderPagination = (
    pagination: { page: number; total: number; total_pages: number } | undefined,
    currentPage: number,
    setPage: (p: number) => void,
  ) => {
    if (!pagination || pagination.total_pages <= 1) return null;
    return (
      <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.06]">
        <span className="text-xs text-zinc-500">
          Trang {currentPage} / {pagination.total_pages} · {pagination.total} kết quả
        </span>
        <div className="flex gap-1">
          <button
            onClick={() => setPage(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
            className="p-1 rounded hover:bg-white/10 disabled:opacity-30 transition-colors"
          >
            <ChevronLeft size={16} className="text-zinc-400" />
          </button>
          <button
            onClick={() => setPage(Math.min(pagination.total_pages, currentPage + 1))}
            disabled={currentPage >= pagination.total_pages}
            className="p-1 rounded hover:bg-white/10 disabled:opacity-30 transition-colors"
          >
            <ChevronRight size={16} className="text-zinc-400" />
          </button>
        </div>
      </div>
    );
  };

  const renderCreditTable = (
    items: CreditNote[],
    loading: boolean,
    showActions: boolean,
  ) => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-cyan-400" />
          <span className="ml-2 text-zinc-400 text-sm">Đang tải...</span>
        </div>
      );
    }
    if (!items.length) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
          <FileText size={36} className="mb-2 opacity-40" />
          <span className="text-sm">Không có dữ liệu credit</span>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Mã Credit</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Khách hàng</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Đơn nguồn</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Số tiền Credit</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Còn lại</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Trạng thái</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={item.id}
                className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
              >
                <td className="px-4 py-3">
                  <span className="font-mono text-cyan-400 text-xs font-semibold">{item.credit_code}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="text-zinc-200 text-sm">{item.customer_name || "—"}</div>
                  {item.customer_contact && (
                    <div className="text-zinc-500 text-xs mt-0.5">{item.customer_contact}</div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="text-zinc-400 text-xs font-mono">{item.source_order_code || "—"}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="font-mono text-amber-400 font-semibold text-sm">
                    {formatCurrency(item.refund_amount)}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className={`font-mono font-semibold text-sm ${item.available_amount > 0 ? "text-emerald-400" : "text-zinc-500"}`}>
                    {formatCurrency(item.available_amount)}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(item.status, item.is_available)} bg-white/[0.05]`}>
                    {statusLabel(item.status, item.is_available)}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => setSelectedCredit(item)}
                      className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-cyan-400 transition-colors"
                      title="Chi tiết"
                    >
                      <Eye size={15} />
                    </button>
                    {showActions && (
                      <>
                        <button
                          className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-rose-400 transition-colors"
                          title="Hủy credit"
                        >
                          <XCircle size={15} />
                        </button>
                        <button
                          className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-emerald-400 transition-colors"
                          title="Xác nhận hoàn"
                        >
                          <CheckCircle size={15} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1">
          <span className="text-cyan-400 font-semibold uppercase tracking-wider">Bán hàng & Đơn hàng</span>
          <span>·</span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 text-[10px] font-bold uppercase tracking-wider">Đang hoạt động</span>
        </div>
        <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
          <CreditCard size={24} className="text-cyan-400" />
          Nhật Ký Tín Dụng & Refund Credit
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Quản lý các khoản dư / credit tích lũy của khách hàng
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[#1a1b23] border border-white/[0.06] rounded-xl p-4">
          <div className="text-xs text-zinc-500 mb-1">Tổng Credit</div>
          <div className="text-2xl font-bold text-zinc-100 font-mono">{stats.total_count}</div>
        </div>
        <div className="bg-[#1a1b23] border border-white/[0.06] rounded-xl p-4">
          <div className="text-xs text-zinc-500 mb-1">Khả dụng</div>
          <div className="text-2xl font-bold text-emerald-400 font-mono">{stats.available_count}</div>
        </div>
        <div className="bg-[#1a1b23] border border-white/[0.06] rounded-xl p-4">
          <div className="text-xs text-zinc-500 mb-1">Không khả dụng / Đã áp dụng</div>
          <div className="text-2xl font-bold text-zinc-400 font-mono">{stats.unavailable_count}</div>
        </div>
      </div>

      {/* Form 1: Credit Khả dụng */}
      <div className="bg-[#1a1b23] border border-white/[0.06] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
          <h2 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
            <CheckCircle size={14} />
            Credit Khả Dụng
            {stats.available_count > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-emerald-500/20 text-emerald-400 rounded-full">
                {stats.available_count}
              </span>
            )}
          </h2>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Tìm kiếm credit..."
              value={searchAvailable}
              onChange={(e) => setSearchAvailable(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-xs bg-white/[0.04] border border-white/[0.08] rounded-lg text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-cyan-500/40 w-56 transition-colors"
            />
          </div>
        </div>
        {renderCreditTable(availableData?.items || [], loadingAvailable, true)}
        {renderPagination(availableData?.pagination, pageAvailable, setPageAvailable)}
      </div>

      {/* Form 2: Credit Không Khả Dụng / Đã Áp Dụng */}
      <div className="bg-[#1a1b23] border border-white/[0.06] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
            <AlertTriangle size={14} />
            Credit Không Khả Dụng & Đã Áp Dụng
            {stats.unavailable_count > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-zinc-500/20 text-zinc-400 rounded-full">
                {stats.unavailable_count}
              </span>
            )}
          </h2>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Tìm kiếm credit..."
              value={searchUnavailable}
              onChange={(e) => setSearchUnavailable(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-xs bg-white/[0.04] border border-white/[0.08] rounded-lg text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-cyan-500/40 w-56 transition-colors"
            />
          </div>
        </div>
        {renderCreditTable(unavailableData?.items || [], loadingUnavailable, false)}
        {renderPagination(unavailableData?.pagination, pageUnavailable, setPageUnavailable)}
      </div>

      {/* Detail Modal */}
      {selectedCredit && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center"
          onClick={() => setSelectedCredit(null)}
        >
          <div
            className="bg-[#1e1f29] border border-white/[0.08] rounded-2xl w-full max-w-lg mx-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
              <h3 className="text-lg font-bold text-zinc-100">
                Chi tiết Credit
              </h3>
              <button
                onClick={() => setSelectedCredit(null)}
                className="p-1 rounded hover:bg-white/10 text-zinc-400 transition-colors"
              >
                <XCircle size={18} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-zinc-500 mb-1">Mã Credit</div>
                  <div className="text-cyan-400 font-mono font-semibold">{selectedCredit.credit_code}</div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500 mb-1">Trạng thái</div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(selectedCredit.status, selectedCredit.is_available)} bg-white/[0.05]`}>
                    {statusLabel(selectedCredit.status, selectedCredit.is_available)}
                  </span>
                </div>
                <div>
                  <div className="text-xs text-zinc-500 mb-1">Khách hàng</div>
                  <div className="text-zinc-200">{selectedCredit.customer_name || "—"}</div>
                  <div className="text-zinc-500 text-xs">{selectedCredit.customer_contact || ""}</div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500 mb-1">Đơn nguồn</div>
                  <div className="text-zinc-300 font-mono text-sm">{selectedCredit.source_order_code || "—"}</div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500 mb-1">Số tiền Credit</div>
                  <div className="text-amber-400 font-mono font-semibold">{formatCurrency(selectedCredit.refund_amount)}</div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500 mb-1">Còn lại</div>
                  <div className={`font-mono font-semibold ${selectedCredit.available_amount > 0 ? "text-emerald-400" : "text-zinc-500"}`}>
                    {formatCurrency(selectedCredit.available_amount)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500 mb-1">Đã áp dụng</div>
                  <div className="text-zinc-300 font-mono">{formatCurrency(selectedCredit.applied_total)} ({selectedCredit.applied_count} lần)</div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500 mb-1">Ngày phát hành</div>
                  <div className="text-zinc-300 text-sm">{formatDate(selectedCredit.issued_at)}</div>
                </div>
              </div>
              {selectedCredit.note && (
                <div>
                  <div className="text-xs text-zinc-500 mb-1">Ghi chú</div>
                  <div className="text-zinc-400 text-sm bg-white/[0.03] rounded-lg px-3 py-2">{selectedCredit.note}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
