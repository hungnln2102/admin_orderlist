import React from "react";
import {
  FIXED_COLUMNS,
  LAST_FIXED_COLUMN_KEY,
  TOTAL_COLUMN_WIDTH,
  totalColHead,
  type PeriodColumn,
} from "./helpers";

type ExpenseAllocationGridHeaderProps = {
  periodColumns: PeriodColumn[];
  periodColumnWidth: number;
  yearLabel: string;
};

export const ExpenseAllocationGridHeader: React.FC<ExpenseAllocationGridHeaderProps> = ({
  periodColumns,
  periodColumnWidth,
  yearLabel,
}) => (
            <thead className="text-slate-100 shadow-xl">
              <tr>
                {FIXED_COLUMNS.map((column) => (
                  <th
                    key={column.key}
                    rowSpan={2}
                    scope="col"
                    className={`sticky top-0 z-[80] border-b border-r border-indigo-400/20 bg-[#0A1024] px-4 py-4 text-left align-middle text-[11px] font-black uppercase tracking-[0.12em] text-slate-300 ${
                      column.key === LAST_FIXED_COLUMN_KEY
                        ? "shadow-[20px_0_35px_-20px_rgba(0,0,0,0.8)]"
                        : ""
                    }`}
                    style={{
                      left: column.left,
                      width: column.width,
                      minWidth: column.width,
                    }}
                  >
                    {column.label}
                  </th>
                ))}
                <th
                  scope="col"
                  colSpan={periodColumns.length}
                  className="sticky top-0 z-[10] border-b border-r border-indigo-400/20 bg-[#080E21] px-4 py-3 text-center text-[11px] font-black uppercase tracking-[0.15em] text-indigo-200"
                >
                  <div className="flex items-center justify-center gap-2">
                    <span className="h-px flex-1 bg-indigo-500/20" />
                    <span>{yearLabel}</span>
                    <span className="h-px flex-1 bg-indigo-500/20" />
                  </div>
                </th>
                <th
                  rowSpan={2}
                  scope="col"
                  className={`${totalColHead} sticky top-0 z-[100] border-b border-indigo-400/20 px-4 py-4 text-center align-middle text-[11px] font-black uppercase tracking-[0.15em] text-cyan-300`}
                  style={{
                    width: TOTAL_COLUMN_WIDTH,
                    minWidth: TOTAL_COLUMN_WIDTH,
                  }}
                >
                  <div className="flex flex-col items-center justify-center gap-1">
                    <span className="leading-tight drop-shadow-md">Tổng</span>
                    <span className="text-[9px] font-semibold tracking-normal text-cyan-400/60 lowercase">
                      (Trong kỳ)
                    </span>
                  </div>
                </th>
              </tr>
              <tr>
                {periodColumns.map((column) => (
                  <th
                    key={column.key}
                    scope="col"
                    className="sticky top-[45px] z-[10] border-b border-r border-indigo-400/20 bg-[#0A1024] px-4 py-3 text-center text-xs font-bold text-slate-300"
                    style={{
                      width: periodColumnWidth,
                      minWidth: periodColumnWidth,
                    }}
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>

);
