import React from "react";
import { ArrowDownIcon, ArrowUpIcon } from "@heroicons/react/24/outline";
import StatCard, { STAT_CARD_ACCENTS } from "../../../components/ui/StatCard";

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
    <div className="rounded-[32px] bg-gradient-to-br from-slate-800/65 via-slate-700/55 to-slate-900/65 border border-white/15 p-6 shadow-[0_20px_55px_-30px_rgba(0,0,0,0.7),0_14px_34px_-26px_rgba(255,255,255,0.2)] backdrop-blur-sm">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                  ? "text-emerald-200"
                  : item.changeType === "decrease"
                  ? "text-rose-200"
                  : "text-amber-200"
              }`}
            >
              {item.changeType === "alert" ? (
                <span className="uppercase tracking-wide">Alert</span>
              ) : item.changeType === "increase" ? (
                <>
                  <ArrowUpIcon className="mr-1 h-4 w-4" />
                  {item.change}
                </>
              ) : (
                <>
                  <ArrowDownIcon className="mr-1 h-4 w-4" />
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
