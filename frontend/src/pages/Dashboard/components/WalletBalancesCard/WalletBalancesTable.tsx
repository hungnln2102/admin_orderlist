import React from "react";
import { type WalletRow } from "../../hooks/useWalletBalances";
import {
  type DisplayColumn,
  type ResolvedFieldValue,
  type WalletBalancesTableLabels,
} from "./types";

type WalletBalancesTableProps = {
  displayColumns: DisplayColumn[];
  rows: WalletRow[];
  adding: boolean;
  newDate: string;
  newValues: Record<string, string>;
  loading: boolean;
  onDateChange: (value: string) => void;
  onValueChange: (field: string, value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  formatDate: (value: string) => string;
  formatValue: (val: number, assetCode?: string) => string;
  resolveValue: (
    row: WalletRow,
    col: DisplayColumn
  ) => number | ResolvedFieldValue[];
  labels: WalletBalancesTableLabels;
};

const WalletBalancesTable: React.FC<WalletBalancesTableProps> = ({
  displayColumns,
  rows,
  adding,
  newDate,
  newValues,
  loading,
  onDateChange,
  onValueChange,
  onSave,
  onCancel,
  formatDate,
  formatValue,
  resolveValue,
  labels,
}) => {
  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5">
      <table className="min-w-full text-sm text-white">
        <thead className="bg-white/10 text-xs uppercase tracking-[0.08em] text-white/80">
          <tr>
            <th className="px-3 py-2 text-center">{labels.dateHeader}</th>
            {displayColumns.map((col) => (
              <th key={col.field} className="px-3 py-2 text-center">
                {col.name || col.field}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10">
          {adding && (
            <>
              <tr className="bg-white/5">
                <td className="px-3 py-2 text-center">
                  <input
                    type="date"
                    className="w-full rounded-md border border-white/20 bg-white/80 px-2 py-1 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-400"
                    value={newDate}
                    onChange={(e) => onDateChange(e.target.value)}
                  />
                </td>
                {displayColumns.map((col) => {
                  if (col.sourceFields && col.sourceFields.length) {
                    return (
                      <td
                        key={col.field}
                        className="px-3 py-2 text-center whitespace-pre-line"
                      >
                        <div className="flex flex-col gap-1">
                          {col.sourceFields.map((field) => (
                            <input
                              key={field}
                              className="w-full rounded-md border border-white/20 bg-white/80 px-2 py-1 text-xs text-slate-900 text-center focus:ring-2 focus:ring-indigo-400"
                              placeholder={field}
                              value={newValues[field] || ""}
                              onChange={(e) =>
                                onValueChange(field, e.target.value)
                              }
                            />
                          ))}
                        </div>
                      </td>
                    );
                  }
                  return (
                    <td key={col.field} className="px-3 py-2 text-center">
                      <input
                        className="w-full rounded-md border border-white/20 bg-white/80 px-2 py-1 text-xs text-slate-900 text-center focus:ring-2 focus:ring-indigo-400"
                        placeholder="0"
                        value={newValues[col.field] || ""}
                        onChange={(e) => onValueChange(col.field, e.target.value)}
                      />
                    </td>
                  );
                })}
              </tr>
              <tr className="bg-white/5">
                <td
                  className="px-3 py-2 text-center"
                  colSpan={displayColumns.length + 1}
                >
                  <div className="flex items-center justify-center gap-2">
                    <button
                      type="button"
                      className="rounded-md bg-emerald-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600"
                      onClick={onSave}
                    >
                      {labels.saveLabel}
                    </button>
                    <button
                      type="button"
                      className="rounded-md bg-rose-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-rose-600"
                      onClick={onCancel}
                    >
                      {labels.cancelLabel}
                    </button>
                  </div>
                </td>
              </tr>
            </>
          )}
          {loading && (
            <tr>
              <td
                className="px-3 py-3 text-center text-white/70"
                colSpan={displayColumns.length + 1}
              >
                {labels.loadingText}
              </td>
            </tr>
          )}
          {!loading && rows.length === 0 && (
            <tr>
              <td
                className="px-3 py-3 text-center text-white/70"
                colSpan={displayColumns.length + 1}
              >
                {labels.emptyText}
              </td>
            </tr>
          )}
          {!loading &&
            rows.map((row, idx) => (
              <tr key={`${row.recordDate}-${idx}`} className="hover:bg-white/5">
                <td className="px-3 py-2 text-center font-semibold">
                  {formatDate(row.recordDate)}
                </td>
                {displayColumns.map((col) => {
                  const resolved = resolveValue(row, col);
                  if (Array.isArray(resolved)) {
                    const parts = resolved
                      .map((item) =>
                        item.value
                          ? formatValue(
                              item.value,
                              item.assetCode || col.assetCode
                            )
                          : null
                      )
                      .filter(Boolean);
                    const text = parts.length ? parts.join("\n") : "-";
                    return (
                      <td
                        key={col.field}
                        className="px-3 py-2 text-center text-white/90 whitespace-pre-line"
                      >
                        {text}
                      </td>
                    );
                  }
                  return (
                    <td
                      key={col.field}
                      className="px-3 py-2 text-center text-white/90"
                    >
                      {formatValue(resolved as number, col.assetCode)}
                    </td>
                  );
                })}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
};

export default WalletBalancesTable;
