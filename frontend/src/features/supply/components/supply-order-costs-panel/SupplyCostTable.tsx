import { formatDateToDMY } from "@/shared/date";
import React from "react";
import { PencilIcon } from "@heroicons/react/24/outline";

import { ResponsiveTable } from "@/components/ui/ResponsiveTable";
import type { SupplyOrderCostRow } from "@/lib/suppliesApi";

import type {
  ActiveSupplyTab,
  ExternalImportLogItem,
  ExternalImportTableProps,
  NccCostsTableProps,
} from "./types";

const NccCostsTable: React.FC<NccCostsTableProps> = ({
  loading,
  rows,
  offset,
  formatCurrency,
  formatUpdateDate,
}) => (
  <>
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
  </>
);

const ExternalImportTable: React.FC<ExternalImportTableProps> = ({
  loading,
  error,
  logs,
  formatCurrency,
  onEditTrace,
}) => (
  <>
    <thead className="bg-slate-900/40 text-[9px] sm:text-[10px] uppercase text-indigo-200/50 font-bold tracking-[0.08em] sm:tracking-[0.15em] border-b border-white/5">
      <tr>
        <th className="px-3 sm:px-6 py-3 sm:py-4 font-semibold w-14">STT</th>
        <th className="px-2 sm:px-4 py-3 sm:py-4 font-semibold">Ngày tạo</th>
        <th className="px-2 sm:px-4 py-3 sm:py-4 font-semibold">Nguồn</th>
        <th className="px-2 sm:px-4 py-3 sm:py-4 font-semibold">Số tiền nhập</th>
        <th className="px-2 sm:px-4 py-3 sm:py-4 font-semibold">Mã đơn liên kết</th>
        <th className="px-2 sm:px-4 py-3 sm:py-4 font-semibold">Lý do</th>
        <th className="px-2 sm:px-4 py-3 sm:py-4 font-semibold">Mã trace</th>
        <th className="px-3 sm:px-6 py-3 sm:py-4 font-semibold text-center w-20">Thao tác</th>
      </tr>
    </thead>
    <tbody className="divide-y divide-white/5">
      {loading ? (
        <tr>
          <td colSpan={8} className="px-4 py-16 text-center">
            <div className="flex flex-col items-center justify-center text-indigo-300/40">
              <div className="w-6 h-6 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin mb-3" />
              <span className="text-sm font-medium tracking-wide">Đang tải log nhập hàng...</span>
            </div>
          </td>
        </tr>
      ) : error ? (
        <tr>
          <td colSpan={8} className="px-4 py-16 text-center">
            <p className="text-rose-400/80 font-medium">{error}</p>
          </td>
        </tr>
      ) : logs.length === 0 ? (
        <tr>
          <td colSpan={8} className="px-4 py-16 text-center text-slate-500 text-sm font-medium tracking-wide">
            Không có log nhập hàng ngoài luồng nào.
          </td>
        </tr>
      ) : (
        logs.map((log, idx) => (
          <tr key={log.id} className="text-xs sm:text-sm text-white/90 hover:bg-indigo-900/10 transition-colors cursor-pointer group">
            <td className="px-3 sm:px-6 py-3 sm:py-4 text-white/50 font-medium whitespace-nowrap">{idx + 1}</td>
            <td className="px-2 sm:px-4 py-3 sm:py-4 text-white/70 whitespace-nowrap">{formatDateToDMY(log.created_at)}</td>
            <td className="px-2 sm:px-4 py-3 sm:py-4 font-semibold text-white/95 tracking-wide max-w-[120px] sm:max-w-[180px] truncate">{log.source_name || "—"}</td>
            <td className="px-2 sm:px-4 py-3 sm:py-4 font-bold text-emerald-400 whitespace-nowrap">{formatCurrency(log.import_cost)}</td>
            <td className="px-2 sm:px-4 py-3 sm:py-4 font-mono font-bold tracking-widest text-[11px] sm:text-xs text-indigo-300/80 whitespace-nowrap">{log.id_order || "—"}</td>
            <td className="px-2 sm:px-4 py-3 sm:py-4 text-white/70 max-w-[150px] sm:max-w-[200px] truncate">{log.reason || "—"}</td>
            <td className="px-2 sm:px-4 py-3 sm:py-4">
              <span className="inline-flex rounded-md bg-white/5 px-2 py-0.5 font-mono text-[10px] sm:text-[11px] text-white/60 border border-white/10 whitespace-nowrap">
                {log.trace_id || "—"}
              </span>
            </td>
            <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
              <div className="flex items-center justify-center opacity-60 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => onEditTrace(log)}
                  className="p-1.5 sm:p-2 rounded-xl bg-white/5 text-emerald-300 border border-transparent hover:border-emerald-500/30 hover:bg-emerald-500/15 hover:shadow-[0_0_10px_rgba(16,185,129,0.2)] transition-all active:scale-90"
                  title="Sửa mã Trace"
                >
                  <PencilIcon className="h-3.5 sm:h-4 w-3.5 sm:w-4 stroke-2" />
                </button>
              </div>
            </td>
          </tr>
        ))
      )}
    </tbody>
  </>
);

type SupplyCostTableProps = {
  activeTab: ActiveSupplyTab;
  loading: boolean;
  rows: SupplyOrderCostRow[];
  offset: number;
  externalLoading: boolean;
  externalError: string | null;
  externalLogs: ExternalImportLogItem[];
  formatCurrency: (value: unknown) => string;
  formatUpdateDate: (row: SupplyOrderCostRow) => string;
  onEditTrace: (item: ExternalImportLogItem) => void;
};

const SupplyCostTable: React.FC<SupplyCostTableProps> = ({
  activeTab,
  loading,
  rows,
  offset,
  externalLoading,
  externalError,
  externalLogs,
  formatCurrency,
  formatUpdateDate,
  onEditTrace,
}) => (
  <ResponsiveTable className="supply-order-costs__inner" showCardOnMobile={false}>
    <table className="w-full text-left">
      {activeTab === "nccCosts" ? (
        <NccCostsTable
          loading={loading}
          rows={rows}
          offset={offset}
          formatCurrency={formatCurrency}
          formatUpdateDate={formatUpdateDate}
        />
      ) : (
        <ExternalImportTable
          loading={externalLoading}
          error={externalError}
          logs={externalLogs}
          formatCurrency={formatCurrency}
          onEditTrace={onEditTrace}
        />
      )}
    </table>
  </ResponsiveTable>
);

export default SupplyCostTable;
