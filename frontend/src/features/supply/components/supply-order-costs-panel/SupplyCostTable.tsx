import React from "react";
import { ResponsiveTable } from "@/components/ui/ResponsiveTable";
import type { SupplyOrderCostRow } from "@/lib/suppliesApi";

type SupplyCostTableProps = {
  loading: boolean;
  rows: SupplyOrderCostRow[];
  offset: number;
  formatCurrency: (value: unknown) => string;
  formatUpdateDate: (row: SupplyOrderCostRow) => string;
};

const SupplyCostTable: React.FC<SupplyCostTableProps> = ({
  loading,
  rows,
  offset,
  formatCurrency,
  formatUpdateDate,
}) => (
  <ResponsiveTable className="supply-order-costs__inner" showCardOnMobile={false}>
    <table className="w-full text-left">
      <thead className="bg-slate-900/40 text-[9px] sm:text-[10px] uppercase text-indigo-200/50 font-bold tracking-[0.08em] sm:tracking-[0.15em] border-b border-white/5">
        <tr>
          <th className="px-3 sm:px-6 py-3 sm:py-4 font-semibold w-14">STT</th>
          <th className="px-2 sm:px-4 py-3 sm:py-4 font-semibold">NCC</th>
          <th className="px-2 sm:px-4 py-3 sm:py-4 font-semibold">Đơn</th>
          <th className="px-2 sm:px-4 py-3 sm:py-4 font-semibold">Tiền nhập</th>
          <th className="px-2 sm:px-4 py-3 sm:py-4 font-semibold">Tiền hoàn</th>
          <th className="px-2 sm:px-4 py-3 sm:py-4 font-semibold">Trạng thái</th>
          <th className="px-3 sm:px-6 py-3 sm:py-4 font-semibold">Ngày cập nhật</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-white/5">
        {loading ? (
          <tr>
            <td colSpan={7} className="px-4 py-16 text-center">
              <div className="flex flex-col items-center justify-center text-indigo-300/40">
                <div className="w-6 h-6 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin mb-3" />
                <span className="text-sm font-medium tracking-wide">Đang đồng bộ dữ liệu...</span>
              </div>
            </td>
          </tr>
        ) : rows.length === 0 ? (
          <tr>
            <td colSpan={7} className="px-4 py-16 text-center text-slate-500 text-sm font-medium tracking-wide">
              Không có dòng nào.
            </td>
          </tr>
        ) : (
          rows.map((row, idx) => (
            <tr key={row.orderPk || `${row.idOrder}-${idx}`} className="text-xs sm:text-sm text-white/90 hover:bg-indigo-900/10 transition-colors cursor-pointer group">
              <td className="px-3 sm:px-6 py-3 sm:py-4 text-white/50 font-medium whitespace-nowrap">{offset + idx + 1}</td>
              <td className="px-2 sm:px-4 py-3 sm:py-4 font-semibold text-white/95 tracking-wide max-w-[120px] sm:max-w-[180px] truncate">{row.supplierName || "—"}</td>
              <td className="px-2 sm:px-4 py-3 sm:py-4 font-mono font-bold tracking-widest text-[11px] sm:text-xs text-indigo-300/80 whitespace-nowrap">{row.idOrder || "—"}</td>
              <td className="px-2 sm:px-4 py-3 sm:py-4 font-bold text-emerald-400 whitespace-nowrap">{formatCurrency(row.cost)}</td>
              <td className="px-2 sm:px-4 py-3 sm:py-4 font-bold text-amber-400 whitespace-nowrap">{formatCurrency(row.refund)}</td>
              <td className="px-2 sm:px-4 py-3 sm:py-4 whitespace-nowrap">
                <span
                  className={`inline-flex px-2 py-0.5 rounded-md font-bold tracking-wide text-[11px] sm:text-xs border ${
                    String(row.nccPaymentStatus || "").includes("Đã")
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                  }`}
                >
                  {row.nccPaymentStatus || "Chưa Thanh Toán"}
                </span>
              </td>
              <td className="px-3 sm:px-6 py-3 sm:py-4 text-white/50 font-medium whitespace-nowrap">{formatUpdateDate(row)}</td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  </ResponsiveTable>
);

export default SupplyCostTable;
