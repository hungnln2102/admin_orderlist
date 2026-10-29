import React, { useState, useEffect } from "react";
import {
  X,
  Layers,
  Clock,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  ShieldAlert,
  Eye,
} from "lucide-react";
import { BatchDetailModal } from "./BatchDetailModal";

interface BatchItem {
  id: number;
  batch_code: string;
  order_codes: string[] | string;
  order_ids: number[] | string;
  base_amount: number;
  slot_suffix: number;
  total_amount: number;
  customer_name?: string | null;
  status: string;
  note?: string | null;
  expires_at: string;
  created_at: string;
  bank_account_number?: string;
  bank_short_code?: string;
}

interface PendingBatchesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh?: () => void;
}

export const PendingBatchesModal: React.FC<PendingBatchesModalProps> = ({
  isOpen,
  onClose,
  onRefresh,
}) => {
  const [batches, setBatches] = useState<BatchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [cancelingId, setCancelingId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Detail Modal state
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val);

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

  const fetchBatches = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/invoices/batches?status=PENDING&limit=50");
      if (!res.ok) throw new Error("Không thể tải danh sách đợt gộp");
      const json = await res.json();
      setBatches(json.data || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Lỗi khi tải đợt gộp.";
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchBatches();
    }
  }, [isOpen]);

  const handleCancelBatch = async (batch: BatchItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const reason = window.prompt(
      `Master có chắc chắn muốn hủy đợt gộp #${batch.batch_code}?\nSlot Suffix (+${batch.slot_suffix}₫) sẽ được giải phóng ngay lập tức.\nNhập lý do hủy (tùy chọn):`
    );
    if (reason === null) return;

    setCancelingId(batch.id);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/invoices/batches/${batch.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason || "Admin hủy đợt gộp" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể hủy đợt gộp.");

      setSuccessMessage(data.message || `Đã hủy đợt gộp #${batch.batch_code}!`);
      await fetchBatches();
      if (onRefresh) onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Đã xảy ra lỗi khi hủy đợt gộp.";
      setErrorMessage(msg);
    } finally {
      setCancelingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
        <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-6 flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 sticky top-0 z-20 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                <Layers className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-100 flex items-center gap-2">
                  Đợt Gộp Đang Chờ Thanh Toán
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                    {batches.length} đợt
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  Các phiên gộp nhiều đơn hàng kèm Slot Suffix đang chờ SePay tự động khớp
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchBatches}
                title="Làm mới"
                className="w-9 h-9 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-100 flex items-center justify-center transition-all cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </button>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-100 flex items-center justify-center transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Alerts */}
          {errorMessage && (
            <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}
          {successMessage && (
            <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Content Table */}
          <div className="p-6 overflow-y-auto space-y-4 flex-1">
            {loading && batches.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <span>Đang tải các đợt gộp...</span>
              </div>
            ) : batches.length === 0 ? (
              <div className="py-16 text-center text-slate-500">
                <Layers className="w-12 h-12 text-slate-600 mx-auto mb-3 stroke-[1.5]" />
                <p className="text-sm font-medium text-slate-300">Không có đợt gộp nào đang chờ</p>
                <p className="text-xs text-slate-500 mt-1">
                  Khi tạo QR gộp đơn cho khách hàng, đợt gộp sẽ xuất hiện tại đây
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {batches.map((batch) => {
                  const orderCodes: string[] = Array.isArray(batch.order_codes)
                    ? batch.order_codes
                    : typeof batch.order_codes === "string"
                    ? JSON.parse(batch.order_codes || "[]")
                    : [];

                  return (
                    <div
                      key={batch.id}
                      onClick={() => setSelectedBatchId(batch.id)}
                      className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-900/80 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer group"
                    >
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 font-mono font-bold text-xs group-hover:border-cyan-400">
                            {batch.batch_code}
                          </span>
                          {batch.customer_name && (
                            <span className="text-xs font-semibold text-slate-200">
                              {batch.customer_name}
                            </span>
                          )}
                          <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-500" />
                            Hết hạn: {formatDate(batch.expires_at)}
                          </span>
                        </div>

                        {/* Danh sách mã đơn con */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] text-slate-400">Đơn gộp ({orderCodes.length}):</span>
                          {orderCodes.map((code) => (
                            <span
                              key={code}
                              className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300 font-mono text-[11px]"
                            >
                              {code}
                            </span>
                          ))}
                        </div>

                        {batch.note && (
                          <p className="text-[11px] text-slate-500 italic">
                            Ghi chú: {batch.note}
                          </p>
                        )}
                      </div>

                      {/* Breakdown & Action */}
                      <div className="flex items-center justify-between md:justify-end gap-3 border-t md:border-t-0 pt-3 md:pt-0 border-slate-800/80">
                        <div className="text-right">
                          <div className="text-xs text-slate-400">
                            Gốc: <span className="font-mono text-slate-300">{formatCurrency(batch.base_amount)}</span>{" "}
                            <span className="text-cyan-400 font-bold">+{batch.slot_suffix}₫</span>
                          </div>
                          <div className="text-sm font-bold font-mono text-emerald-400">
                            {formatCurrency(batch.total_amount)}
                          </div>
                        </div>

                        {/* Nút Xem chi tiết */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedBatchId(batch.id);
                          }}
                          className="px-3 py-2 rounded-xl bg-cyan-600/10 hover:bg-cyan-600/20 text-cyan-300 hover:text-cyan-200 border border-cyan-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                          title="Xem chi tiết các đơn trong đợt gộp"
                        >
                          <Eye className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Chi tiết</span>
                        </button>

                        {/* Nút Hủy đợt gộp */}
                        <button
                          type="button"
                          onClick={(e) => handleCancelBatch(batch, e)}
                          disabled={cancelingId === batch.id}
                          className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                          title="Hủy đợt gộp để giải phóng Slot Suffix"
                        >
                          {cancelingId === batch.id ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                          )}
                          <span>Hủy</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Chi Tiết Đợt Gộp */}
      <BatchDetailModal
        batchId={selectedBatchId}
        isOpen={Boolean(selectedBatchId)}
        onClose={() => setSelectedBatchId(null)}
        onCancelSuccess={() => {
          fetchBatches();
          if (onRefresh) onRefresh();
        }}
      />
    </>
  );
};
