import React, { useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { Payload } from "recharts/types/component/DefaultTooltipContent";
import type { WalletColumn, WalletRow } from "../../hooks/useWalletBalances";
import type { Budget } from "./types";

const COLORS = [
  "#F8C573",
  "#9BE7C4",
  "#7CB3FF",
  "#F48FB1",
  "#C7D2FE",
  "#A5B4FC",
  "#F9A8D4",
];

export const ExpenseBreakdownChart: React.FC<{
  budgets: Budget[];
  walletColumns: WalletColumn[];
  walletRows: WalletRow[];
  currencyFormatter: Intl.NumberFormat;
  availableProfit?: number;
}> = ({
  budgets,
  walletColumns,
  walletRows,
  currencyFormatter,
  availableProfit = 0,
}) => {
  const latestWalletRow = walletRows?.[0];

  const chartData = useMemo(() => {
    if (latestWalletRow) {
      const walletData = walletColumns
        .filter((col) => {
          const assetCode = String(col.assetCode || "").trim().toUpperCase();
          return !assetCode || assetCode === "VND";
        })
        .map((col, idx) => ({
          name: col.name || col.field,
          value: Math.max(0, Number(latestWalletRow.values[col.field] || 0)),
          color: COLORS[idx % COLORS.length],
        }))
        .filter((item) => item.value > 0);
      if (walletData.length) return walletData;
    }

    return budgets
      .map((item, idx) => ({
        name: item.name,
        value: Math.max(0, item.used),
        color: COLORS[idx % COLORS.length],
      }))
      .filter((item) => item.value > 0);
  }, [budgets, walletColumns, latestWalletRow]);

  const chartTotal = useMemo(
    () => chartData.reduce((sum, item) => sum + item.value, 0),
    [chartData]
  );
  const displayTotal = chartTotal + Math.max(0, Number(availableProfit || 0));

  const renderTooltip = ({
    payload,
  }: {
    payload?: Payload<number, string>[];
  }) => {
    if (!payload || payload.length === 0) return null;
    const item = payload[0];
    const value = Number(item?.value || 0);
    const percent = chartTotal > 0 ? Math.round((value / chartTotal) * 100) : 0;
    return (
      <div className="rounded-lg border border-white/10 bg-slate-900/90 px-3 py-2 text-xs text-white shadow-lg">
        <div className="font-semibold">{item?.name}</div>
        <div>{currencyFormatter.format(value)}</div>
        <div className="text-white/70">{percent}%</div>
      </div>
    );
  };

  return (
    <div className="relative h-72 w-full">
      <div className="absolute inset-0 rounded-2xl border border-white/20 bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 shadow-inner shadow-slate-900/50" />
      <div className="relative z-10 flex h-full w-full items-center justify-center text-white/70">
        {chartData.length === 0 ? (
          <div className="text-sm">Chưa có dữ liệu chi tiêu</div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={75}
                  outerRadius={100}
                >
                  {chartData.map((entry, idx) => (
                    <Cell
                      key={`${entry.name}-${idx}`}
                      fill={entry.color}
                      stroke="transparent"
                    />
                  ))}
                </Pie>
                <Tooltip content={renderTooltip} />
              </PieChart>
            </ResponsiveContainer>
            {displayTotal > 0 && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="text-center text-white">
                  <div className="text-xs uppercase tracking-wide text-white/80">
                    Tài sản
                  </div>
                  <div className="text-lg font-bold">
                    {currencyFormatter.format(displayTotal)}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
