import React from "react";
import type { MonthlySummaryData } from "@/features/dashboard/api/dashboardApi";
import * as Helpers from "../../../lib/helpers";

interface MonthlySummaryTableProps {
  loading: boolean;
  error: string | null;
  data: MonthlySummaryData[];
  onRefresh?: () => void;
}

const formatCurrency = Helpers.formatCurrency;

const formatMonthKey = (monthKey: string): string => {
  // Convert YYYY-MM to "Tháng M, YYYY" or similar
  if (!monthKey || monthKey.length < 7) return monthKey;
  const [year, month] = monthKey.split("-");
  const monthNum = parseInt(month, 10);
  return `T${monthNum}/${year}`;
};

const MonthlySummaryTable: React.FC<MonthlySummaryTableProps> = ({
  loading,
  error,
  data,
  onRefresh,
}) => {
  const formatDate = (dateString: string | null): string => {
    if (!dateString) return "—";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("vi-VN");
    } catch {
      return "—";
    }
  };

  return (
    <div className="rounded-3xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/50 via-slate-900/60 to-slate-950/50 p-5 sm:p-6 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] hover:shadow-[0_30px_60px_-12px_rgba(0,0,0,0.6)] backdrop-blur-xl">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div>
          <p className="text-base font-bold text-white">Tóm tắt hàng tháng</p>
          <p className="text-xs text-white/70">Thống kê đơn hàng, doanh thu và lợi nhuận theo tháng</p>
        </div>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            className="rounded-lg bg-indigo-950/60 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-900/60 border border-indigo-400/40 focus:ring-indigo-400/60 focus:ring-2"
          >
            Làm mới
          </button>
        )}
      </div>

      {error && (
        <div className="mb-3 rounded-lg border border-amber-300/60 bg-amber-50/10 px-3 py-2 text-sm text-amber-200">
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5">
        <table className="min-w-full text-sm text-white">
          <thead className="bg-white/10 text-xs uppercase tracking-[0.08em] text-white/80">
            <tr>
              <th className="px-3 py-2 text-left">Tháng</th>
              <th className="px-3 py-2 text-right">Tổng đơn</th>
              <th className="px-3 py-2 text-right">Đơn hủy</th>
              <th className="px-3 py-2 text-right">Doanh thu</th>
              <th className="px-3 py-2 text-right">Lợi nhuận</th>
              <th className="px-3 py-2 text-right">Hoàn tiền</th>
              <th className="px-3 py-2 text-left">Cập nhật</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {loading && (
              <tr>
                <td className="px-3 py-3 text-center text-white/70" colSpan={7}>
                  Đang tải dữ liệu...
                </td>
              </tr>
            )}
            {!loading && data.length === 0 && (
              <tr>
                <td className="px-3 py-3 text-center text-white/70" colSpan={7}>
                  Chưa có dữ liệu.
                </td>
              </tr>
            )}
            {!loading &&
              data.map((row, idx) => (
                <tr key={`${row.month_key}-${idx}`} className="hover:bg-white/5">
                  <td className="px-3 py-2 font-semibold text-white">{formatMonthKey(row.month_key)}</td>
                  <td className="px-3 py-2 text-right text-white/90">
                    {row.total_orders.toLocaleString("vi-VN")}
                  </td>
                  <td className="px-3 py-2 text-right text-rose-300">
                    {row.canceled_orders.toLocaleString("vi-VN")}
                  </td>
                  <td className="px-3 py-2 text-right text-emerald-300">
                    {formatCurrency(row.total_revenue)}
                  </td>
                  <td className="px-3 py-2 text-right text-amber-300">
                    {formatCurrency(row.total_profit)}
                  </td>
                  <td className="px-3 py-2 text-right text-orange-300">
                    {formatCurrency(row.total_refund)}
                  </td>
                  <td className="px-3 py-2 text-left text-white/70 text-xs">
                    {formatDate(row.updated_at)}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MonthlySummaryTable;
