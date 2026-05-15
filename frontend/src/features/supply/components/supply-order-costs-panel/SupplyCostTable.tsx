import React from "react";
import { PencilIcon } from "@heroicons/react/24/outline";

import { ResponsiveTable } from "@/components/ui/ResponsiveTable";
import type { SupplyOrderCostRow } from "@/lib/suppliesApi";
import * as Helpers from "@/shared/utils";

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
    <thead className="bg-white/5 text-[10px] uppercase text-indigo-300/40 font-bold tracking-[0.2em]">
      <tr>
        <th className="px-4 py-3 w-14">STT</th>
        <th className="px-4 py-3">NCC</th>
        <th className="px-4 py-3">Đơn</th>
        <th className="px-4 py-3">Tiền nhập</th>
        <th className="px-4 py-3">Tiền hoàn</th>
        <th className="px-4 py-3">Trạng thái</th>
        <th className="px-4 py-3">Ngày cập nhật</th>
      </tr>
    </thead>
    <tbody className="divide-y divide-white/5">
      {loading ? (
        <tr>
          <td colSpan={7} className="px-4 py-10 text-center text-white/50">
            Đang tải...
          </td>
        </tr>
      ) : rows.length === 0 ? (
        <tr>
          <td colSpan={7} className="px-4 py-10 text-center text-white/50">
            Không có dòng nào.
          </td>
        </tr>
      ) : (
        rows.map((row, idx) => (
          <tr key={row.orderPk || `${row.idOrder}-${idx}`} className="text-sm text-white/90">
            <td className="px-4 py-3 text-white/50">{offset + idx + 1}</td>
            <td className="px-4 py-3">{row.supplierName || "—"}</td>
            <td className="px-4 py-3 font-mono text-xs">{row.idOrder || "—"}</td>
            <td className="px-4 py-3 text-emerald-300/90">{formatCurrency(row.cost)}</td>
            <td className="px-4 py-3 text-amber-200/90">{formatCurrency(row.refund)}</td>
            <td className="px-4 py-3">
              <span
                className={
                  String(row.nccPaymentStatus || "").includes("Đã")
                    ? "rounded-lg bg-emerald-500/20 px-2 py-0.5 text-xs font-semibold text-emerald-200"
                    : "rounded-lg bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-100/90"
                }
              >
                {row.nccPaymentStatus || "Chưa Thanh Toán"}
              </span>
            </td>
            <td className="px-4 py-3 text-white/70">{formatUpdateDate(row)}</td>
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
    <thead className="bg-white/5 text-[10px] uppercase text-indigo-300/40 font-bold tracking-[0.2em]">
      <tr>
        <th className="px-4 py-3 w-14">STT</th>
        <th className="px-4 py-3">Ngày tạo</th>
        <th className="px-4 py-3">Nguồn</th>
        <th className="px-4 py-3">Số tiền nhập</th>
        <th className="px-4 py-3">Mã đơn liên kết</th>
        <th className="px-4 py-3">Lý do</th>
        <th className="px-4 py-3">Mã trace</th>
        <th className="px-4 py-3 w-20 text-center">Thao tác</th>
      </tr>
    </thead>
    <tbody className="divide-y divide-white/5">
      {loading ? (
        <tr>
          <td colSpan={8} className="px-4 py-10 text-center text-white/50">
            Đang tải log nhập hàng...
          </td>
        </tr>
      ) : error ? (
        <tr>
          <td colSpan={8} className="px-4 py-10 text-center text-rose-200">
            {error}
          </td>
        </tr>
      ) : logs.length === 0 ? (
        <tr>
          <td colSpan={8} className="px-4 py-10 text-center text-white/50">
            Chưa có log nhập hàng ngoài luồng.
          </td>
        </tr>
      ) : (
        logs.map((log, idx) => {
          const isMavnImport = log.expenseType === "mavn_import";
          return (
            <tr key={log.id || idx} className="text-sm text-white/90">
              <td className="px-4 py-3 text-white/50">{idx + 1}</td>
              <td className="px-4 py-3 text-white/70">
                {Helpers.formatDateToDMY(log.expenseDate || log.createdAt || "") || "—"}
              </td>
              <td className="px-4 py-3">
                <span
                  className={
                    isMavnImport
                      ? "rounded-lg bg-violet-500/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-violet-200"
                      : "rounded-lg bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-emerald-200"
                  }
                >
                  {isMavnImport ? "MAVN AUTO" : "MANUAL"}
                </span>
              </td>
              <td className="px-4 py-3 text-emerald-300/90">{formatCurrency(log.amount)}</td>
              <td className="px-4 py-3 font-mono text-xs text-indigo-200/90">
                {log.linkedOrderCode || "—"}
              </td>
              <td className="px-4 py-3">{log.reason || "—"}</td>
              <td className="px-4 py-3 font-mono text-xs text-amber-200/90">
                {log.traceCode || "—"}
              </td>
              <td className="px-4 py-3 text-center">
                <button
                  type="button"
                  onClick={() => onEditTrace(log)}
                  title="Sửa mã trace"
                  aria-label="Sửa mã trace"
                  className="inline-flex items-center justify-center rounded-lg border border-amber-400/30 bg-amber-500/10 p-1.5 text-amber-200 transition-colors hover:border-amber-300/60 hover:bg-amber-500/20"
                >
                  <PencilIcon className="h-4 w-4" />
                </button>
              </td>
            </tr>
          );
        })
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
