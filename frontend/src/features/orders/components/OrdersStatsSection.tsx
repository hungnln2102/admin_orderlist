import {
  BanknotesIcon,
  CalculatorIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  ScaleIcon,
} from "@heroicons/react/24/outline";
import StatCard, { STAT_CARD_ACCENTS } from "@/components/ui/StatCard";
import { STAT_FILTER_MAP, type BaseStat, type StatFilterKey } from "../constants";
import { formatCurrency } from "../utils/ordersHelpers";
import type { OrderFinancialStats } from "../utils/orderListTransform";

type OrdersStatsSectionProps = {
  isExpiredDataset: boolean;
  totalRecords: number;
  isCanceled: boolean;
  updatedStats: BaseStat[];
  financialStats: OrderFinancialStats;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
};

export function OrdersStatsSection({
  isExpiredDataset,
  totalRecords,
  isCanceled,
  updatedStats,
  financialStats,
  statusFilter,
  setStatusFilter,
}: OrdersStatsSectionProps) {
  const statsGridClass = isCanceled
    ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
    : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4";
  const financialCards = [
    {
      title: "Tổng Giá Bán",
      value: financialStats.totalSellingPrice,
      icon: CurrencyDollarIcon,
      accent: STAT_CARD_ACCENTS.emerald,
    },
    {
      title: "Tổng Giá Nhập",
      value: financialStats.totalCostPrice,
      icon: BanknotesIcon,
      accent: STAT_CARD_ACCENTS.amber,
    },
    {
      title: "Tổng Giá Trị Còn Lại",
      value: financialStats.totalRemainingValue,
      icon: CalculatorIcon,
      accent: STAT_CARD_ACCENTS.violet,
    },
    {
      title: "Tổng Giá Trị NCC Còn Lại",
      value: financialStats.totalSupplierRemainingValue,
      icon: ScaleIcon,
      accent: STAT_CARD_ACCENTS.teal,
    },
  ];

  return (
    <div className="rounded-[24px] bg-gradient-to-br from-slate-800/65 via-slate-700/55 to-slate-900/65 border border-white/15 p-4 shadow-[0_20px_55px_-30px_rgba(0,0,0,0.7),0_14px_34px_-26px_rgba(255,255,255,0.2)] backdrop-blur-sm">
      {isExpiredDataset ? (
        <div className="relative overflow-hidden rounded-[22px] border border-rose-300/20 bg-[radial-gradient(circle_at_top_right,rgba(251,113,133,0.2),transparent_42%),linear-gradient(160deg,rgba(30,41,59,0.82),rgba(15,23,42,0.88))] px-5 py-4 shadow-[0_14px_34px_-20px_rgba(244,63,94,0.6)]">
          <div className="pointer-events-none absolute -right-12 -top-10 h-36 w-36 rounded-full bg-rose-400/20 blur-3xl" />
          <div className="relative flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-rose-100/85">
                Tổng Đơn Hết Hạn
              </p>
              <p className="mt-2 text-3xl font-black tracking-tight text-white">
                {totalRecords.toLocaleString("vi-VN")}
              </p>
              <p className="mt-1 text-xs text-slate-300/80">
                Các đơn cần ưu tiên xử lý gia hạn hoặc chốt trạng thái.
              </p>
            </div>
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-rose-200/30 bg-rose-500/20 shadow-[0_0_22px_-8px_rgba(244,63,94,0.9)]">
              <ExclamationTriangleIcon className="h-6 w-6 text-rose-100" />
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className={statsGridClass}>
            {updatedStats.map((stat) => {
              const filterKey = stat.filterKey as StatFilterKey;
              const filterValue = STAT_FILTER_MAP[filterKey] ?? "all";
              const isActive = statusFilter === filterValue;

              return (
                <button
                  key={stat.name}
                  type="button"
                  onClick={() => setStatusFilter(isActive ? "all" : filterValue)}
                  className="w-full text-left transition-all duration-200"
                >
                  <StatCard
                    title={stat.name}
                    value={stat.value}
                    icon={stat.icon}
                    accent={stat.accent}
                    isActive={isActive}
                  />
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {financialCards.map((card) => (
                <StatCard
                  key={card.title}
                  title={card.title}
                  value={formatCurrency(card.value)}
                  icon={card.icon}
                  accent={card.accent}
                />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
