import React from "react";
import { GlassCard } from "./GlassCard";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  accent?: "cyan" | "emerald" | "purple" | "rose" | "amber";
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  accent = "cyan",
}) => {
  const accentGradientMap = {
    cyan: "from-sky-500/20 to-blue-600/10 text-sky-400 border-sky-500/30",
    emerald: "from-emerald-500/20 to-teal-600/10 text-emerald-400 border-emerald-500/30",
    purple: "from-purple-500/20 to-indigo-600/10 text-purple-400 border-purple-500/30",
    rose: "from-rose-500/20 to-pink-600/10 text-rose-400 border-rose-500/30",
    amber: "from-amber-500/20 to-orange-600/10 text-amber-400 border-amber-500/30",
  };

  return (
    <GlassCard glow={accent}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
            {title}
          </p>
          <h3 className="text-2xl font-extrabold text-white mt-2 tracking-tight">
            {value}
          </h3>
          {subtitle && (
            <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
          )}
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              <span
                className={`text-xs font-bold ${
                  trend.isPositive ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {trend.isPositive ? "↑" : "↓"} {trend.value}
              </span>
              <span className="text-xs text-slate-500">so với tháng trước</span>
            </div>
          )}
        </div>
        <div
          className={`p-3.5 rounded-xl border bg-gradient-to-br ${accentGradientMap[accent]}`}
        >
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </GlassCard>
  );
};
