import React from "react";
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon } from "@heroicons/react/24/outline";

interface Props {
  title: string;
  value: string;
  delta: string;
  trend: "up" | "down";
  accent: "amber" | "emerald";
  icon: React.ElementType;
}

const FinanceSummaryCard: React.FC<Props> = ({ title, value, delta, trend, accent, icon: Icon }) => {
  const accentStyle =
    accent === "amber"
      ? { iconBg: "bg-amber-100 text-amber-600", chip: "bg-amber-50 text-amber-700" }
      : { iconBg: "bg-emerald-100 text-emerald-600", chip: "bg-emerald-50 text-emerald-700" };
  const TrendIcon = trend === "up" ? ArrowTrendingUpIcon : ArrowTrendingDownIcon;

  return (
    <div className="stats-card rounded-3xl flex items-center justify-between gap-4 bg-gradient-to-br from-indigo-950/40 via-slate-900/50 to-slate-950/40 border border-indigo-400/20 backdrop-blur-xl p-4 sm:p-5 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] hover:shadow-[0_30px_60px_-12px_rgba(0,0,0,0.6)]">
      <div className="flex items-center gap-3">
        <div className={`h-10 w-10 rounded-xl ${accentStyle.iconBg} flex items-center justify-center`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white">{title}</p>
          <p className="text-xl font-bold text-white">{value}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${accentStyle.chip}`}>
          <TrendIcon className="h-3.5 w-3.5" />
          {delta}
        </span>
      </div>
    </div>
  );
};

export default FinanceSummaryCard;
