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
            <thead className="text-slate-100">
              <tr>
                {FIXED_COLUMNS.map((column) => (
                  <th
                    key={column.key}
                    rowSpan={2}
                    scope="col"
                    className={`sticky top-0 z-[80] border-b border-r border-indigo-300/25 bg-[#020617] px-3 py-4 text-left align-middle text-xs font-bold uppercase tracking-[0.08em] ${
                      column.key === LAST_FIXED_COLUMN_KEY
                        ? "shadow-[18px_0_30px_-24px_rgba(148,163,184,0.95)]"
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
                  className="sticky top-0 z-[10] border-b border-r border-indigo-300/25 bg-slate-950 px-3 py-3 text-center text-xs font-bold uppercase tracking-[0.1em]"
                >
                  {yearLabel}
                </th>
                <th
                  rowSpan={2}
                  scope="col"
                  className={`${totalColHead} sticky top-0 z-[100] border-b border-indigo-300/25 px-3 py-4 text-center align-middle text-xs font-bold uppercase tracking-[0.12em] text-sky-200`}
                  style={{
                    width: TOTAL_COLUMN_WIDTH,
                    minWidth: TOTAL_COLUMN_WIDTH,
                  }}
                >
                  <span className="block leading-tight">Tổng</span>
                  <span className="mt-1 block text-[10px] font-semibold normal-case tracking-normal text-sky-300/75">
                    (Trong kỳ hiển thị)
                  </span>
                </th>
              </tr>
              <tr>
                {periodColumns.map((column) => (
                  <th
                    key={column.key}
                    scope="col"
                    className="sticky top-[45px] z-[10] border-b border-r border-indigo-300/25 bg-slate-950 px-3 py-3 text-center text-xs font-semibold"
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
