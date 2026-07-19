import React, { useState } from "react";
import { Order, ORDER_FIELDS, VIRTUAL_FIELDS } from "@/constants";
import { formatCurrency } from "../utils/ordersHelpers";
import { apiPost } from "@/shared/api/client";
import toast from "react-hot-toast";
import { useApiQuery } from "@/shared/hooks/useApiQuery";
import {
  fetchAvailableRefundCredits,
  type AvailableRefundCredit,
} from "@/lib/refundCreditsApi";

type PayWithCreditModalProps = {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  onSuccess: () => void;
};

export const PayWithCreditModal: React.FC<PayWithCreditModalProps> = ({
  isOpen,
  onClose,
  order,
  onSuccess,
}) => {
  const [selectedCreditId, setSelectedCreditId] = useState<number | null>(null);
  const [waiveRemaining, setWaiveRemaining] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: creditsData, loading } = useApiQuery<AvailableRefundCredit[]>(
    fetchAvailableRefundCredits,
    { lazy: !isOpen, initialData: [] }
  );

  const credits = creditsData || [];

  if (!isOpen || !order) return null;

  const totalCreditApplied = Number.isFinite(Number(order[VIRTUAL_FIELDS.TOTAL_CREDIT_APPLIED]))
    ? Number(order[VIRTUAL_FIELDS.TOTAL_CREDIT_APPLIED])
    : 0;
  const remainingAmount = Math.max(0, Number(order[ORDER_FIELDS.PRICE]) - totalCreditApplied);

  const handleSubmit = async () => {
    if (!selectedCreditId && !waiveRemaining) {
      toast.error("Vui lòng chọn một credit hoặc chọn Xí xóa số tiền còn thiếu.");
      return;
    }

    setIsSubmitting(true);
    try {
      await apiPost("/api/orders/refund-credits/apply-to-order", {
        targetOrderId: order[ORDER_FIELDS.ID],
        creditNoteId: selectedCreditId ? Number(selectedCreditId) : null,
        waiveRemaining,
      });
      toast.success("Thanh toán thành công!");
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Lỗi khi thanh toán bằng credit");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      <div className="relative w-full max-w-2xl transform rounded-2xl bg-slate-800 p-6 text-left align-middle shadow-xl transition-all border border-slate-700">
        <h3 className="text-lg font-medium leading-6 text-white mb-4">
          Thanh toán đơn hàng bằng Credit
        </h3>

        <div className="mb-4 p-4 rounded-xl bg-slate-900/50 border border-slate-700">
          <p className="text-sm text-slate-300">
            Đơn hàng: <span className="font-bold text-white">{order[ORDER_FIELDS.ID_ORDER]}</span>
          </p>
          <p className="text-sm text-slate-300 mt-1">
            Tổng giá bán: <span className="font-bold text-emerald-400">{formatCurrency(order[ORDER_FIELDS.PRICE])}</span>
          </p>
          {totalCreditApplied > 0 && (
            <p className="text-sm text-amber-400 mt-1">
              Đã trả một phần: <span className="font-bold">{formatCurrency(totalCreditApplied)}</span>
            </p>
          )}
          <p className="text-sm text-rose-300 mt-1">
            Số tiền còn thiếu: <span className="font-bold text-rose-400">{formatCurrency(remainingAmount)}</span>
          </p>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Chọn Credit khả dụng:
          </label>
          
          {loading ? (
            <div className="text-center py-4 text-slate-400">Đang tải danh sách credit...</div>
          ) : credits.length === 0 ? (
            <div className="text-center py-4 text-rose-400 bg-rose-500/10 rounded-xl border border-rose-500/20">
              Không có credit nào khả dụng.
            </div>
          ) : (
            <div className="max-h-[300px] overflow-y-auto pr-2 space-y-2">
              {credits.map((credit) => (
                <div
                  key={credit.id}
                  onClick={() => setSelectedCreditId(Number(credit.id))}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    selectedCreditId === Number(credit.id)
                      ? "bg-cyan-500/20 border-cyan-500 shadow-md shadow-cyan-900/20"
                      : "bg-slate-900/40 border-slate-700 hover:border-slate-500"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-bold text-white">{credit.credit_code}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Từ đơn gốc: {credit.source_order_code || "N/A"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-emerald-400">
                        {formatCurrency(credit.available_amount)}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5 uppercase">
                        {credit.status}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 mb-2 flex items-center gap-2 px-1">
          <input
            type="checkbox"
            id="waiveRemaining"
            checked={waiveRemaining}
            onChange={(e) => setWaiveRemaining(e.target.checked)}
            className="w-4 h-4 rounded border-slate-600 bg-slate-800/50 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-slate-800"
          />
          <label htmlFor="waiveRemaining" className="text-sm font-medium text-amber-200 cursor-pointer select-none">
            Xí xóa số tiền còn thiếu (đánh dấu Đã Thanh toán)
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            className="rounded-xl px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700 focus:outline-none transition-colors"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Hủy
          </button>
          <button
            type="button"
            className="rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-6 py-2 text-sm font-medium text-white shadow-md shadow-cyan-900/30 hover:from-cyan-500 hover:to-blue-500 focus:outline-none transition-all disabled:opacity-50"
            onClick={handleSubmit}
            disabled={isSubmitting || (!selectedCreditId && !waiveRemaining)}
          >
            {isSubmitting ? "Đang xử lý..." : "Xác nhận"}
          </button>
        </div>
      </div>
    </div>
  );
};
