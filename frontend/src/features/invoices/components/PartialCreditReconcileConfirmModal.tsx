import React, { useEffect, useState } from "react";
import { ModalPortal } from "@/components/ui/ModalPortal";
import { PaymentReceipt, formatCurrencyVnd } from "../helpers";
import { formatDateToDMY } from "@/shared/date";
import { apiFetch } from "@/shared/api/client";

type PartialCreditReconcileConfirmModalProps = {
  open: boolean;
  receipt: PaymentReceipt | null;
  targetOrderCode: string;
  onConfirm: () => void;
  onCancel: () => void;
};

type CreditHistoryItem = {
  id: number;
  targetOrderCode: string;
  orderCustomer: string;
  orderStatus: string;
  appliedAmount: number;
  appliedAt: string;
  appliedBy: string;
  note: string;
};

export const PartialCreditReconcileConfirmModal: React.FC<PartialCreditReconcileConfirmModalProps> = ({
  open,
  receipt,
  targetOrderCode,
  onConfirm,
  onCancel,
}) => {
  const [historyData, setHistoryData] = useState<{
    totalAmount: number;
    availableAmount: number;
    usedAmount: number;
    history: CreditHistoryItem[];
  } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && receipt) {
      setLoading(true);
      apiFetch(`/api/payment-receipts/${receipt.id}/credit-history`)
        .then((res) => res.json())
        .then((data) => setHistoryData(data))
        .catch((err) => console.error("Error fetching credit history", err))
        .finally(() => setLoading(false));
    } else {
      setHistoryData(null);
    }
  }, [open, receipt]);

  if (!open || !receipt) return null;

  const remainingAmount = historyData?.availableAmount ?? (receipt.creditAvailableAmount ?? receipt.amount);
  const usedAmount = historyData?.usedAmount ?? (receipt.amount - remainingAmount);

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-amber-500/30 p-6 text-left shadow-2xl transition-all">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 text-2xl">
              ⚠️
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Biên lai đã được dùng 1 phần Credit!</h3>
              <p className="text-xs text-amber-300/80">Xác nhận ghép số tiền còn lại vào đơn {targetOrderCode}</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-3 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Số tiền ban đầu của biên lai:</span>
              <span className="font-bold text-white">{formatCurrencyVnd(receipt.amount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Đã được sử dụng trước đó:</span>
              <span className="font-bold text-rose-400">-{formatCurrencyVnd(usedAmount)}</span>
            </div>
            <div className="flex justify-between text-base pt-2 border-t border-slate-700/60">
              <span className="font-semibold text-amber-300">Số tiền còn lại sẽ ghép:</span>
              <span className="font-extrabold text-emerald-400">{formatCurrencyVnd(remainingAmount)}</span>
            </div>
          </div>

          {/* Usage Table */}
          <div className="mb-6">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Danh sách đơn đã sử dụng trước đó:
            </p>
            {loading ? (
              <div className="text-xs text-slate-500 text-center py-3">Đang tải lịch sử sử dụng...</div>
            ) : historyData && historyData.history.length > 0 ? (
              <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-700/60 bg-slate-950/40">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-800/80 text-slate-400 sticky top-0">
                    <tr>
                      <th className="p-2 font-medium">Đơn hàng</th>
                      <th className="p-2 font-medium text-right">Số tiền</th>
                      <th className="p-2 font-medium">Ngày dùng</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {historyData.history.map((item) => (
                      <tr key={item.id}>
                        <td className="p-2 font-bold text-indigo-300">{item.targetOrderCode}</td>
                        <td className="p-2 font-bold text-rose-400 text-right">-{formatCurrencyVnd(item.appliedAmount)}</td>
                        <td className="p-2 text-slate-400">{formatDateToDMY(item.appliedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-xs text-slate-500 italic py-2 text-center bg-slate-950/20 rounded-lg">
                Không có dữ liệu chi tiết lịch sử.
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl border border-slate-700 px-4 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-800 transition"
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-amber-950/40 transition active:scale-95"
            >
              Xác nhận ghép {formatCurrencyVnd(remainingAmount)}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};
