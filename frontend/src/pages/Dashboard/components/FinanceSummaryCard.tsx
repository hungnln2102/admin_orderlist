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
    <div className="stats-card p-5 flex items-center justify-between gap-4 bg-white/70 border border-white/40 shadow-lg">
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
