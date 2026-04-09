import React from "react";
import { ArrowDownIcon, ArrowUpIcon } from "@heroicons/react/24/outline";
import StatCard, { STAT_CARD_ACCENTS } from "@/components/ui/StatCard";

export type OverviewStat = {
  name: string;
  value: string;
  change: string;
  changeType: "increase" | "decrease" | "alert";
  icon: React.ElementType;
  accent: keyof typeof STAT_CARD_ACCENTS;
};

type OverviewStatsProps = {
  stats: OverviewStat[];
};

export const OverviewStats: React.FC<OverviewStatsProps> = ({ stats }) => {
  return (
    <div className="rounded-[28px] border border-indigo-400/25 bg-[linear-gradient(155deg,rgba(49,46,129,0.35)_0%,rgba(15,23,42,0.62)_42%,rgba(2,6,23,0.55)_100%)] p-4 shadow-[0_28px_64px_-20px_rgba(0,0,0,0.55),0_12px_36px_-18px_rgba(99,102,241,0.22),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl transition-[box-shadow] duration-300 hover:shadow-[0_32px_70px_-20px_rgba(0,0,0,0.6),0_16px_42px_-18px_rgba(129,140,248,0.18),inset_0_1px_0_rgba(255,255,255,0.08)] sm:p-5 lg:p-6">
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 lg:gap-5">
        {stats.map((item, index) => (
          <StatCard
            key={`${item.name}-${index}`}
            variant="premium"
            title={item.name}
            value={item.value}
            icon={item.icon}
            accent={STAT_CARD_ACCENTS[item.accent]}
          >
            <div
              className={`inline-flex w-full max-w-full flex-wrap items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold tabular-nums ring-1 ring-white/[0.06] sm:text-[13px] ${
                item.changeType === "increase"
                  ? "bg-emerald-500/[0.12] text-emerald-200/95 ring-emerald-400/15"
                  : item.changeType === "decrease"
                    ? "bg-rose-500/[0.12] text-rose-200/95 ring-rose-400/12"
                    : "bg-amber-500/[0.12] text-amber-200/95 ring-amber-400/15"
              }`}
            >
              {item.changeType === "alert" ? (
                <span className="uppercase tracking-widest font-bold">Alert</span>
              ) : item.changeType === "increase" ? (
                <>
                  <ArrowUpIcon className="mr-1.5 h-4 w-4" />
                  {item.change}
                </>
              ) : (
                <>
                  <ArrowDownIcon className="mr-1.5 h-4 w-4" />
                  {item.change}
                </>
              )}
            </div>
          </StatCard>
        ))}
      </div>
    </div>
  );
};
