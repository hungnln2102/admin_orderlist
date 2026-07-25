import React, { useState } from "react";
import { formatCurrencyVnd } from "../helpers";
import { apiFetch } from "@/shared/api/client";
import { showAppNotification } from "@/lib/notifications";

type AllocationType = "withdrawal" | "external_import" | "order_costs";

type OutboundAllocationModalProps = {
  isOpen: boolean;
  receiptId: number | null;
  amount: number;
  onClose: () => void;
  onSuccess: () => void;
};

export const OutboundAllocationModal: React.FC<OutboundAllocationModalProps> = ({
  isOpen,
  receiptId,
  amount,
  onClose,
  onSuccess,
}) => {
  const [type, setType] = useState<AllocationType>("withdrawal");
  const [reason, setReason] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [orderCodesStr, setOrderCodesStr] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiptId) return;

    const payload: any = { type, reason };

    if (type === "external_import") {
      payload.supplierName = supplierName;
    } else if (type === "order_costs") {
      const codes = orderCodesStr
        .split(",")
        .map((c) => c.trim().toUpperCase())
        .filter((c) => c.length > 0);
      if (codes.length === 0) {
        showAppNotification({ type: "error", title: "Lỗi", message: "Vui lòng nhập ít nhất 1 mã đơn." });
        return;
      }
      payload.orderCodes = codes;
    }

    setLoading(true);
    try {
      const res = await apiFetch(`/api/payment-receipts/${receiptId}/allocate-outbound`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Phân bổ thất bại.");
      }

      showAppNotification({
        type: "success",
        title: "Thành công",
        message: "Phân bổ chi phí tiền ra thành công.",
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      showAppNotification({
        type: "error",
        title: "Lỗi",
        message: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="relative z-50">
      <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" aria-hidden="true" onClick={() => !loading && onClose()} />
      <div className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none">
        <div className="mx-auto w-full max-w-lg rounded-3xl bg-slate-900 border border-white/10 shadow-2xl p-6 sm:p-8 pointer-events-auto" role="dialog">
          <h2 className="text-xl font-bold text-white mb-6">
            Phân bổ tiền ra
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 flex flex-col items-center justify-center gap-1">
              <span className="text-sm text-rose-200/70 font-medium">Số tiền cần phân bổ</span>
              <span className="text-2xl font-black text-rose-400 tracking-tight">
                {formatCurrencyVnd(-Math.abs(amount))}
              </span>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-semibold text-white/80">Loại chi phí</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className={`relative flex cursor-pointer rounded-xl border p-4 focus:outline-none ${type === 'withdrawal' ? 'bg-indigo-500/20 border-indigo-500/50' : 'border-white/10 hover:bg-white/5'}`}>
                  <input type="radio" name="type" value="withdrawal" checked={type === 'withdrawal'} onChange={() => setType("withdrawal")} className="sr-only" />
                  <span className="flex flex-col text-center w-full">
                    <span className={`block text-sm font-bold ${type === 'withdrawal' ? 'text-indigo-300' : 'text-white/70'}`}>Rút tiền</span>
                    <span className="block mt-1 text-[10px] text-white/50">Tiêu dùng cá nhân</span>
                  </span>
                </label>
                <label className={`relative flex cursor-pointer rounded-xl border p-4 focus:outline-none ${type === 'external_import' ? 'bg-emerald-500/20 border-emerald-500/50' : 'border-white/10 hover:bg-white/5'}`}>
                  <input type="radio" name="type" value="external_import" checked={type === 'external_import'} onChange={() => setType("external_import")} className="sr-only" />
                  <span className="flex flex-col text-center w-full">
                    <span className={`block text-sm font-bold ${type === 'external_import' ? 'text-emerald-300' : 'text-white/70'}`}>Ngoài luồng</span>
                    <span className="block mt-1 text-[10px] text-white/50">Nhập hàng ngoài</span>
                  </span>
                </label>
                <label className={`relative flex cursor-pointer rounded-xl border p-4 focus:outline-none ${type === 'order_costs' ? 'bg-amber-500/20 border-amber-500/50' : 'border-white/10 hover:bg-white/5'}`}>
                  <input type="radio" name="type" value="order_costs" checked={type === 'order_costs'} onChange={() => setType("order_costs")} className="sr-only" />
                  <span className="flex flex-col text-center w-full">
                    <span className={`block text-sm font-bold ${type === 'order_costs' ? 'text-amber-300' : 'text-white/70'}`}>Chi phí đơn</span>
                    <span className="block mt-1 text-[10px] text-white/50">Đội giá vốn (Import)</span>
                  </span>
                </label>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-indigo-200/50 pl-2">Lý do / Nội dung</label>
                <input
                  type="text"
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Nhập ghi chú cho khoản chi..."
                  className="w-full px-4 py-3 border border-white/10 rounded-2xl bg-slate-950/40 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 outline-none"
                />
              </div>

              {type === "external_import" && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-indigo-200/50 pl-2">Tên NCC (Tuỳ chọn)</label>
                  <input
                    type="text"
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    placeholder="VD: Cửa hàng ABC..."
                    className="w-full px-4 py-3 border border-white/10 rounded-2xl bg-slate-950/40 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 outline-none"
                  />
                </div>
              )}

              {type === "order_costs" && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-indigo-200/50 pl-2">Mã đơn hàng</label>
                  <input
                    type="text"
                    required
                    value={orderCodesStr}
                    onChange={(e) => setOrderCodesStr(e.target.value)}
                    placeholder="VD: MAV123, MAV456 (Cách nhau bởi dấu phẩy)"
                    className="w-full px-4 py-3 border border-white/10 rounded-2xl bg-slate-950/40 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 outline-none"
                  />
                  <p className="text-[11px] text-white/40 pl-2">Số tiền sẽ được chia đều tự động vào giá vốn (Import Cost) của các đơn trên.</p>
                </div>
              )}
            </div>

            <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-white/10">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-6 py-2.5 rounded-xl border border-transparent bg-white/5 text-sm font-bold text-slate-300 hover:bg-white/10 transition-colors"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 rounded-xl border border-indigo-500/30 bg-indigo-500/20 text-sm font-bold text-indigo-300 hover:bg-indigo-500/30 transition-colors flex items-center gap-2"
              >
                {loading ? "Đang xử lý..." : "Lưu Phân Bổ"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
