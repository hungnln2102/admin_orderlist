import { formatCurrency as formatMoney } from "@/shared/money";
import React, { useCallback, useEffect, useState } from "react";
import { apiGet } from "@/shared/api/client";
import { Payment } from "../types";

interface Props {
  supplyId: number;
}

const PaymentHistoryTable: React.FC<Props> = ({ supplyId }) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 5;

  const loadPayments = useCallback(async () => {
    setLoading(true);
    try {
      const offset = (page - 1) * limit;
      const data = await apiGet<Record<string, unknown>>(`/api/supplies/${supplyId}/payments?offset=${offset}&limit=${limit}`);
      setPayments((data.payments as Payment[]) || []);
      setTotal(Number(data.total) || 0);
    } catch {
      setPayments([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [supplyId, page, limit]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);
  return (
    <div className="bg-transparent overflow-hidden">
      <div className="px-6 py-4 border-b border-indigo-500/10 flex justify-between items-center bg-indigo-950/20">
        <h4 className="text-[13px] font-bold text-indigo-100 uppercase tracking-widest">Lịch Sử Thanh Toán</h4>
        <span className="text-xs font-medium tracking-wide text-indigo-300/40">Danh sách các kỳ thanh toán</span>
      </div>

      <table className="w-full text-left text-white/80">
        <thead className="bg-slate-900/40 text-[10px] uppercase text-indigo-200/50 font-bold tracking-[0.15em] border-b border-white/5">
          <tr>
            <th className="px-6 py-3">Chu Kỳ</th>
            <th className="px-6 py-3">Tổng Nhập</th>
            <th className="px-6 py-3">Còn Nợ</th>
            <th className="px-6 py-3">Đã Thanh Toán</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {loading ? (
            <tr>
              <td colSpan={4} className="text-center py-10">
                <div className="flex flex-col items-center justify-center text-indigo-300/40">
                  <div className="w-5 h-5 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin mb-3" />
                  <span className="text-xs font-medium tracking-wide">Đang tải lịch sử...</span>
                </div>
              </td>
            </tr>
          ) : payments.length === 0 ? (
            <tr>
              <td colSpan={4} className="text-center py-10 text-slate-500 text-xs font-medium tracking-wide">
                Chưa có dữ liệu thanh toán
              </td>
            </tr>
          ) : (
            payments.map((p) => {
              return (
                <tr key={p.id} className="hover:bg-indigo-500/5 transition-colors group">
                  <td className="px-6 py-3.5 text-sm font-medium text-white/90">{p.round}</td>
                  <td className="px-6 py-3.5 text-sm font-medium text-white/70">{p.totalImport >= 0 ? formatMoney(p.totalImport) : "—"}</td>
                  <td className="px-6 py-3.5 text-sm">
                    {p.totalImport < 0 ? (
                      <span className="inline-flex px-2 py-0.5 rounded border border-rose-500/20 bg-rose-500/10 text-rose-400 font-bold text-xs tracking-wide">
                        {formatMoney(Math.abs(p.totalImport))}
                      </span>
                    ) : (
                      <span className="text-white/30 font-medium">—</span>
                    )}
                  </td>
                  <td className="px-6 py-3.5 text-sm font-medium">
                    {p.paid > 0 ? (
                      <span className="text-emerald-400">{formatMoney(p.paid)}</span>
                    ) : (
                      <span className="text-white/30">—</span>
                    )}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      {total > limit && (
        <div className="px-6 py-3 border-t border-indigo-500/10 flex items-center justify-between text-xs text-indigo-300/60 bg-indigo-950/20">
          <span className="font-medium tracking-wide">
            Hiển thị {(page - 1) * limit + 1}–{Math.min(page * limit, total)} trên tổng số {total} kỳ
          </span>
          <div className="flex gap-1.5">
            {Array.from({ length: Math.ceil(total / limit) }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPage(p)}
                disabled={loading}
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-300 ${
                  p === page
                    ? "bg-indigo-500 text-white font-bold shadow-[0_0_12px_rgba(99,102,241,0.4)]"
                    : "bg-white/5 hover:bg-indigo-500/20 hover:text-indigo-200 text-white/50 border border-white/5 hover:border-indigo-500/30"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentHistoryTable;
