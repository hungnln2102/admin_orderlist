import React from "react";
import {
  ArrowTrendingDownIcon,
  ArrowTrendingUpIcon,
} from "@heroicons/react/24/outline";

export const WeeklyStatCard: React.FC<{
  title: string;
  value: string | number;
  change: number;
  icon: React.ComponentType<{ className?: string }>;
}> = ({ title, value, change, icon: Icon }) => {
  const isPositive = change >= 0;
  const TrendIcon = isPositive ? ArrowTrendingUpIcon : ArrowTrendingDownIcon;

  return (
    <div className="bg-gradient-to-br from-indigo-950/80 to-purple-950/60 backdrop-blur-sm border border-white/10 rounded-xl p-4 hover:border-white/20 transition-all duration-300">
      <div className="flex items-start justify-between mb-2">
        <div className="p-2 bg-white/5 rounded-lg border border-white/10">
          <Icon className="h-5 w-5 text-indigo-400" />
        </div>
        <div
          className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
            isPositive
              ? "bg-emerald-500/20 text-emerald-400"
              : "bg-rose-500/20 text-rose-400"
          }`}
        >
          <TrendIcon className="h-3 w-3" />
          {Math.abs(change)}%
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-xs font-medium text-white/65 line-clamp-2 break-words">
          {title}
        </p>
        <p className="text-lg font-semibold text-white tabular-nums leading-snug">
          {value}
        </p>
      </div>
    </div>
  );
};
