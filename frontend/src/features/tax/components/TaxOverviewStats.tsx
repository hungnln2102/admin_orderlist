import React, { useMemo } from "react";
import {
  BanknotesIcon,
  ChartBarIcon,
  ReceiptRefundIcon,
} from "@heroicons/react/24/outline";
import type { TaxOrder } from "../api/taxApi";
import type { TaxViewMode } from "./TaxDailyFormTable";
import { computeTaxAggregates } from "../utils/taxAggregates";

const nf = new Intl.NumberFormat("vi-VN");

const formatCurrency = (n: number) => `${nf.format(Math.round(n))} đ`;

type TaxOverviewStatsProps = {
  orders: TaxOrder[];
  loading: boolean;
  viewMode: TaxViewMode;
};

export const TaxOverviewStats: React.FC<TaxOverviewStatsProps> = ({
  orders,
  loading,
  viewMode,
}) => {
  const { revenue, profit, refund } = useMemo(
    () => computeTaxAggregates(orders, viewMode),
    [orders, viewMode]
  );
  const periodLabel = viewMode === "day" ? "theo ngày" : "theo tháng";

  const cards = [
    {
      key: "revenue",
      label: "Doanh thu",
      value: revenue,
      sub: `Tổng phân bổ ${periodLabel}`,
      border: "border-violet-400/35",
      glow: "from-violet-500/25 via-transparent to-transparent",
      valueClass: "text-violet-100",
      iconTint: "text-violet-300/90",
      Icon: BanknotesIcon,
    },
    {
      key: "profit",
      label: "Lợi nhuận",
      value: profit,
      sub: `Doanh thu ${periodLabel} - Giá vốn ${periodLabel}`,
      border: "border-emerald-400/35",
      glow: "from-emerald-500/20 via-transparent to-transparent",
      valueClass: "text-emerald-200",
      iconTint: "text-emerald-300/85",
      Icon: ChartBarIcon,
    },
    {
      key: "refund",
      label: "Hoàn tiền",
      value: refund,
      sub: "Tổng số tiền hoàn ghi trên đơn",
      border: "border-rose-400/35",
      glow: "from-rose-500/22 via-transparent to-transparent",
      valueClass: "text-rose-100",
      iconTint: "text-rose-300/85",
      Icon: ReceiptRefundIcon,
    },
  ] as const;

  return (
    <section className="grid gap-4 sm:grid-cols-3">
      {cards.map((c) => {
        const Icon = c.Icon;
        return (
          <article
            key={c.key}
            className={`relative overflow-hidden rounded-2xl border bg-slate-950/65 px-5 py-4 shadow-[0_22px_50px_-28px_rgba(15,23,42,0.9)] backdrop-blur-xl ${c.border}`}
          >
            <div
              className={`pointer-events-none absolute -right-10 -top-12 h-32 w-40 rounded-full bg-gradient-to-br ${c.glow} blur-2xl`}
              aria-hidden
            />
            <div className="relative flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
                  {c.label}
                </p>
                <p
                  className={`mt-2 text-2xl font-black tabular-nums tracking-tight sm:text-[1.65rem] ${c.valueClass}`}
                >
                  {loading ? "..." : formatCurrency(c.value)}
                </p>
                <p className="mt-1.5 text-xs leading-snug text-slate-500">{c.sub}</p>
              </div>
              <Icon className={`h-9 w-9 shrink-0 opacity-90 ${c.iconTint}`} aria-hidden />
            </div>
          </article>
        );
      })}
    </section>
  );
};
