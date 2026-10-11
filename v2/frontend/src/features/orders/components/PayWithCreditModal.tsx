import React, { useState, useEffect } from "react";
import { X, CreditCard, Check, AlertCircle, Search, DollarSign } from "lucide-react";
import { Order } from "../types";
import { useNotification } from "@/shared/context/NotificationContext";

interface CreditNote {
  id: number;
  credit_code: string;
  customer_name: string;
  available_amount: number;
  status: string;
}

interface PayWithCreditModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  onSuccess: () => void;
}

export const PayWithCreditModal: React.FC<PayWithCreditModalProps> = ({
  isOpen,
  onClose,
  order,
  onSuccess,
}) => {
  const notify = useNotification();
  const [credits, setCredits] = useState<CreditNote[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedCreditId, setSelectedCreditId] = useState<number | null>(null);
  const [search, setSearch] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      fetchAvailableCredits();
      setSelectedCreditId(null);
      setSearch("");
    }
  }, [isOpen]);

  const fetchAvailableCredits = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/credits?group=available&limit=50");
      const data = await res.json();
      if (data && data.items) {
        setCredits(data.items);
      }
    } catch (err) {
      console.error("Lỗi tải danh sách credit:", err);
      notify.error("Không thể tải danh sách credit khả dụng.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !order) return null;

  const orderPrice = Number(order.price || 0);
  const filteredCredits = credits.filter(
    (c) =>
      c.credit_code.toLowerCase().includes(search.toLowerCase()) ||
      c.customer_name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = async () => {
    if (!selectedCreditId) {
      notify.warning("Vui lòng chọn một mã credit để thanh toán.");
      return;
    }

    const selected = credits.find((c) => c.id === selectedCreditId);
    if (!selected) return;

    if (selected.available_amount < orderPrice) {
      notify.warning(`Số dư credit (${selected.available_amount.toLocaleString()} ₫) không đủ để thanh toán đơn hàng (${orderPrice.toLocaleString()} ₫).`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/pay-credit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credit_note_id: selected.id }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        notify.success(`Thanh toán đơn #${order.id_order} bằng credit ${selected.credit_code} thành công! Đã chuyển sang Đang Xử Lý.`);
        onSuccess();
        onClose();
      } else {
        throw new Error(data.error || "Không thể thanh toán bằng credit.");
      }
    } catch (err: any) {
      console.error("Lỗi thanh toán bằng credit:", err);
      notify.error(err.message || "Lỗi hệ thống khi thanh toán bằng credit.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0a1225] border border-slate-700/50 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-900 to-[#0a1225]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 flex items-center justify-center bg-cyan-500/10 text-cyan-400 rounded-xl border border-cyan-500/20">
              <CreditCard className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Thanh Toán Bằng Credit</h3>
              <p className="text-[10px] text-slate-400">
                Đơn hàng: <span className="text-cyan-300 font-mono font-bold">#{order.id_order}</span> (Cần: {orderPrice.toLocaleString()} ₫)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Tìm kiếm mã credit hoặc tên khách..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
            {loading ? (
              <div className="py-8 text-center text-slate-400 text-xs">Đang tải danh sách credit...</div>
            ) : filteredCredits.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">Không có credit khả dụng nào.</div>
            ) : (
              filteredCredits.map((c) => {
                const isSelected = selectedCreditId === c.id;
                const isEnough = c.available_amount >= orderPrice;

                return (
                  <div
                    key={c.id}
                    onClick={() => isEnough && setSelectedCreditId(c.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? "bg-cyan-950/40 border-cyan-500 text-white shadow-md shadow-cyan-950"
                        : isEnough
                        ? "bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300"
                        : "bg-slate-900/30 border-slate-900 opacity-50 cursor-not-allowed"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-cyan-300">{c.credit_code}</span>
                        <span className="text-xs text-slate-400">({c.customer_name || "Khách lẻ"})</span>
                      </div>
                      <div className="text-[11px] text-emerald-400 font-mono font-semibold">
                        Số dư: {c.available_amount.toLocaleString()} ₫
                      </div>
                      {!isEnough && (
                        <div className="text-[10px] text-rose-400">Không đủ số dư để thanh toán đơn này</div>
                      )}
                    </div>
                    <div>
                      {isSelected ? (
                        <div className="w-6 h-6 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center font-bold">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full border border-slate-700" />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 flex justify-end gap-2 bg-slate-900/40">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedCreditId || submitting}
            className="px-5 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2"
          >
            {submitting ? "Đang xử lý..." : "Xác nhận Thanh Toán"}
          </button>
        </div>
      </div>
    </div>
  );
};
