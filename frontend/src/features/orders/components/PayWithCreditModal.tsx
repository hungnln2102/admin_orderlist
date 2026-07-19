import React, { useState } from "react";
import { Order, ORDER_FIELDS } from "@/constants";
import { formatCurrency } from "../utils/ordersHelpers";
import { apiPost } from "@/shared/api/client";
import toast from "react-hot-toast";
import { useApiQuery } from "@/shared/hooks/useApiQuery";

type RefundCreditLog = {
  id: number;
  credit_code: string;
  source_order_code: string;
  available_amount: number;
  status: string;
};

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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: creditsData, loading } = useApiQuery<{ data: RefundCreditLog[] }>(
    isOpen ? "/api/orders/refund-credits/logs?limit=50&statuses=OPEN,PARTIALLY_APPLIED" : null
  );

  const credits = creditsData?.data || [];

  if (!isOpen || !order) return null;

  const handleSubmit = async () => {
    if (!selectedCreditId) {
      toast.error("Vui lòng chọn một credit để thanh toán");
      return;
    }

    setIsSubmitting(true);
    try {
      await apiPost("/api/orders/refund-credits/apply-to-order", {
        targetOrderId: order[ORDER_FIELDS.ID],
        creditNoteId: selectedCreditId,
      });
      toast.success("Thanh toán bằng credit thành công!");
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
            Số tiền cần thanh toán: <span className="font-bold text-emerald-400">{formatCurrency(order[ORDER_FIELDS.PRICE])}</span>
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
                  onClick={() => setSelectedCreditId(credit.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    selectedCreditId === credit.id
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
            disabled={isSubmitting || !selectedCreditId}
          >
            {isSubmitting ? "Đang xử lý..." : "Thanh Toán"}
          </button>
        </div>
      </div>
    </div>
  );
};
