import React from "react";
import { RefreshCw, X } from "lucide-react";

interface WarehouseFinanceBackfillModalProps {
  isOpen: boolean;
  onClose: () => void;
  fromDate: string;
  onFromDateChange: (value: string) => void;
  toDate: string;
  onToDateChange: (value: string) => void;
  isSubmitting: boolean;
  onSubmit: () => void;
}

export function WarehouseFinanceBackfillModal(props: WarehouseFinanceBackfillModalProps) {
  const isBackfillModalOpen = props.isOpen;
  const setIsBackfillModalOpen = (value: boolean) => { if (!value) props.onClose(); };
  const backfillFrom = props.fromDate;
  const setBackfillFrom = props.onFromDateChange;
  const backfillTo = props.toDate;
  const setBackfillTo = props.onToDateChange;
  const isBackfilling = props.isSubmitting;
  const handleExecuteBackfill = props.onSubmit;

  if (!isBackfillModalOpen) return null;

  return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
                  <RefreshCw className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white">Hồi Tố Sổ Cái Khấu Trừ P&L</h3>
              </div>
              <button
                onClick={() => setIsBackfillModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Kích hoạt tính toán lại toàn bộ lịch sử chi phí slot trống cho các ngày trong quá khứ và cập nhật lại cột <code className="text-cyan-300 font-mono">slot_vacant_cost</code> trong báo cáo tài chính ngày (<code className="text-blue-300 font-mono">finance.daily_revenue_summary</code>).
            </p>

            <div className="space-y-3 bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Từ ngày (Bắt đầu)
                </label>
                <input
                  type="date"
                  value={backfillFrom}
                  onChange={(e) => setBackfillFrom(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-cyan-500/50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Đến ngày (Kết thúc)
                </label>
                <input
                  type="date"
                  value={backfillTo}
                  onChange={(e) => setBackfillTo(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-cyan-500/50"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsBackfillModalOpen(false)}
                disabled={isBackfilling}
                className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleExecuteBackfill}
                disabled={isBackfilling}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/25 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isBackfilling ? "animate-spin" : ""}`} />
                <span>{isBackfilling ? "Đang hồi tố..." : "Chạy Hồi Tố Ngay"}</span>
              </button>
            </div>
          </div>
        </div>
  );
}
