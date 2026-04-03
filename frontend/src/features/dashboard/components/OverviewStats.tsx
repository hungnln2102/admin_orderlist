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
    <div className="rounded-3xl bg-gradient-to-br from-indigo-950/40 via-slate-900/50 to-slate-950/40 border border-indigo-400/20 backdrop-blur-xl p-4 sm:p-5 lg:p-6 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5),0_10px_30px_-15px_rgba(99,102,241,0.2)] hover:shadow-[0_30px_60px_-12px_rgba(0,0,0,0.6),0_15px_40px_-15px_rgba(99,102,241,0.3)] transition-shadow duration-300">
      <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((item, index) => (
          <StatCard
            key={`${item.name}-${index}`}
            title={item.name}
            value={item.value}
            icon={item.icon}
            accent={STAT_CARD_ACCENTS[item.accent]}
          >
            <div
              className={`flex items-center text-sm font-semibold ${
                item.changeType === "increase"
                  ? "text-emerald-300"
                  : item.changeType === "decrease"
                  ? "text-rose-300"
                  : "text-amber-300"
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
