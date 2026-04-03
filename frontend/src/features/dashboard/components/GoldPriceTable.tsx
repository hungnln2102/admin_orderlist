import React from "react";

type GoldRow = {
  time: string;
  displayName: string;
  ask: number;
  bid: number;
  totalGoldAmount?: number;
  totalGoldValue?: number;
  profit?: number;
  trendBid?: string;
};

interface Props {
  loading: boolean;
  error: string | null;
  rows: GoldRow[];
  onRefresh: () => void;
}

const GoldPriceTable: React.FC<Props> = ({ loading, error, rows, onRefresh }) => (
  <div className="rounded-3xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/50 via-slate-900/60 to-slate-950/50 p-5 sm:p-6 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] hover:shadow-[0_30px_60px_-12px_rgba(0,0,0,0.6)] backdrop-blur-xl">
    <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
      <div>
        <p className="text-base font-bold text-white">Bảng giá HanaGold</p>
        <p className="text-xs text-white/70">Mua/Bán theo ngày</p>
      </div>
      <button
        type="button"
        onClick={onRefresh}
        className="rounded-lg bg-indigo-950/60 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-900/60 border border-indigo-400/40 focus:ring-indigo-400/60 focus:ring-2"
      >
        Làm mới
      </button>
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
            <th className="px-3 py-2 text-left">Mục</th>
            <th className="px-3 py-2 text-right">Mua</th>
            <th className="px-3 py-2 text-right">Tổng tiền mua vàng</th>
            <th className="px-3 py-2 text-right">Tổng vàng (chỉ)</th>
            <th className="px-3 py-2 text-right">Lợi nhuận</th>
            <th className="px-3 py-2 text-right">Bán</th>
            <th className="px-3 py-2 text-center">Xu hướng</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10">
          {loading && (
            <tr>
              <td className="px-3 py-3 text-center text-white/70" colSpan={7}>
                Đang tải giá vàng...
              </td>
            </tr>
          )}
          {!loading && rows.length === 0 && (
            <tr>
              <td className="px-3 py-3 text-center text-white/70" colSpan={7}>
                Chưa có dữ liệu.
              </td>
            </tr>
          )}
          {!loading &&
            rows.map((row, idx) => (
              <tr key={`${row.displayName}-${row.time}-${idx}`} className="hover:bg-white/5">
                <td className="px-3 py-2 font-semibold">{row.displayName || "Không tên"}</td>
                <td className="px-3 py-2 text-right">{(row.bid / 10).toLocaleString("vi-VN")} đ</td>
                <td className="px-3 py-2 text-right">
                  {row.totalGoldValue !== undefined ? row.totalGoldValue.toLocaleString("vi-VN") : "—"}
                </td>
                <td className="px-3 py-2 text-right">
                  {row.totalGoldAmount !== undefined ? row.totalGoldAmount.toFixed(4) : "—"}
                </td>
                <td className="px-3 py-2 text-right">
                  {row.profit !== undefined ? row.profit.toLocaleString("vi-VN") : "—"}
                </td>
                <td className="px-3 py-2 text-right">{(row.ask / 10).toLocaleString("vi-VN")} đ</td>
                <td className="px-3 py-2 text-center">
                  <span
                    className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ${
                      row.trendBid === "up"
                        ? "bg-emerald-500/20 text-emerald-200"
                        : row.trendBid === "down"
                        ? "bg-rose-500/20 text-rose-200"
                        : "bg-white/10 text-white/80"
                    }`}
                  >
                    {row.trendBid === "up" ? "Tăng" : row.trendBid === "down" ? "Giảm" : "Ổn định"}
                  </span>
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  </div>
);

export default GoldPriceTable;

