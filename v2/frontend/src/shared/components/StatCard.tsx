import React from "react";
import { GlassCard } from "./GlassCard";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  accent?: "cyan" | "emerald" | "purple" | "rose" | "amber" | "fuchsia";
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  accent = "cyan",
}) => {
  const accentThemeMap = {
    cyan: {
      badge: "bg-sky-500/15 text-sky-400 border-sky-500/30 shadow-sky-500/10",
      glow: "cyan",
      borderHover: "hover:border-sky-500/50",
    },
    emerald: {
      badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 shadow-emerald-500/10",
      glow: "emerald",
      borderHover: "hover:border-emerald-500/50",
    },
    purple: {
      badge: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30 shadow-indigo-500/10",
      glow: "purple",
      borderHover: "hover:border-indigo-500/50",
    },
    rose: {
      badge: "bg-rose-500/15 text-rose-400 border-rose-500/30 shadow-rose-500/10",
      glow: "rose",
      borderHover: "hover:border-rose-500/50",
    },
    amber: {
      badge: "bg-amber-500/15 text-amber-400 border-amber-500/30 shadow-amber-500/10",
      glow: "amber",
      borderHover: "hover:border-amber-500/50",
    },
    fuchsia: {
      badge: "bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/30 shadow-fuchsia-500/10",
      glow: "purple",
      borderHover: "hover:border-fuchsia-500/50",
    },
  };

  const theme = accentThemeMap[accent] || accentThemeMap.cyan;

  // Split value and currency unit if formatted as "4.222.588 ₫"
  const valStr = String(value);
  const hasCurrency = valStr.endsWith(" ₫") || valStr.endsWith("₫");
  const displayNum = hasCurrency ? valStr.replace(/\s?₫$/, "") : valStr;

  return (
    <GlassCard
      glow={theme.glow as any}
      className={`group transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${theme.borderHover} !p-4 sm:!p-5 flex flex-col justify-between`}
    >
      {/* Top Row: Title + Icon Badge */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] sm:text-xs font-bold tracking-wider text-slate-400 uppercase truncate">
          {title}
        </span>
        <div
          className={`p-2.5 rounded-xl border backdrop-blur-md shadow-md transition-transform duration-300 group-hover:scale-110 ${theme.badge}`}
        >
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {/* Middle Hero Value */}
      <div className="my-3">
        <div className="flex items-baseline gap-1 whitespace-nowrap overflow-hidden">
          <span className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-none group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-slate-300 transition-all">
            {displayNum}
          </span>
          {hasCurrency && (
            <span className="text-sm sm:text-base font-bold text-slate-400">
              ₫
            </span>
          )}
        </div>
      </div>

      {/* Bottom Subtitle + Trend Badge */}
      <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between gap-2">
        <span className="text-[11px] sm:text-xs font-medium text-slate-400 truncate">
          {subtitle || "Số liệu ghi nhận"}
        </span>

        {trend && (
          <div
            className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold border shrink-0 ${
              trend.isPositive
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : "bg-rose-500/10 text-rose-400 border-rose-500/20"
            }`}
          >
            {trend.isPositive ? (
              <ArrowUpRight className="w-3 h-3" />
            ) : (
              <ArrowDownRight className="w-3 h-3" />
            )}
            <span>{trend.value}</span>
          </div>
        )}
      </div>
    </GlassCard>
  );
};
