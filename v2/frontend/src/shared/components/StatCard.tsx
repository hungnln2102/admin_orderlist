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
      badge: "bg-sky-500/20 text-sky-400 border-sky-500/40 shadow-sky-500/20",
      glow: "cyan",
      borderHover: "hover:border-sky-500/60 hover:shadow-sky-500/10",
      bar: "from-cyan-500 to-blue-500",
      textGradient: "group-hover:from-cyan-300 group-hover:to-white",
    },
    emerald: {
      badge: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-emerald-500/20",
      glow: "emerald",
      borderHover: "hover:border-emerald-500/60 hover:shadow-emerald-500/10",
      bar: "from-emerald-500 to-teal-400",
      textGradient: "group-hover:from-emerald-300 group-hover:to-white",
    },
    purple: {
      badge: "bg-indigo-500/20 text-indigo-300 border-indigo-500/40 shadow-indigo-500/20",
      glow: "purple",
      borderHover: "hover:border-indigo-500/60 hover:shadow-indigo-500/10",
      bar: "from-indigo-500 to-purple-500",
      textGradient: "group-hover:from-purple-300 group-hover:to-white",
    },
    rose: {
      badge: "bg-rose-500/20 text-rose-400 border-rose-500/40 shadow-rose-500/20",
      glow: "rose",
      borderHover: "hover:border-rose-500/60 hover:shadow-rose-500/10",
      bar: "from-rose-500 to-pink-500",
      textGradient: "group-hover:from-rose-300 group-hover:to-white",
    },
    amber: {
      badge: "bg-amber-500/20 text-amber-400 border-amber-500/40 shadow-amber-500/20",
      glow: "amber",
      borderHover: "hover:border-amber-500/60 hover:shadow-amber-500/10",
      bar: "from-amber-500 to-orange-500",
      textGradient: "group-hover:from-amber-300 group-hover:to-white",
    },
    fuchsia: {
      badge: "bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/40 shadow-fuchsia-500/20",
      glow: "purple",
      borderHover: "hover:border-fuchsia-500/60 hover:shadow-fuchsia-500/10",
      bar: "from-fuchsia-500 to-purple-600",
      textGradient: "group-hover:from-fuchsia-300 group-hover:to-white",
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
      className={`group relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-cyan-500/10 ${theme.borderHover} !p-5 flex flex-col justify-between bg-gradient-to-br from-slate-900/90 via-slate-950/80 to-black/90 border-slate-800/70 backdrop-blur-3xl rounded-2xl`}
    >
      {/* Top Accent Gradient Line */}
      <div className={`absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r ${theme.bar} opacity-80 group-hover:opacity-100 transition-opacity`} />

      {/* Top Row: Title + Icon Badge */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-[11px] sm:text-xs font-semibold tracking-wide text-slate-400 uppercase truncate">
          {title}
        </span>
        <div
          className={`p-2 rounded-xl border backdrop-blur-2xl shadow-md transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6 ${theme.badge}`}
        >
          <Icon className="w-4 h-4" />
        </div>
      </div>

      {/* Middle Hero Value - Binance Crypto Price Style */}
      <div className="my-1.5">
        <div className="flex items-baseline gap-1.5 whitespace-nowrap overflow-hidden">
          <span className={`text-2xl sm:text-[30px] font-black tracking-tight leading-none text-white font-mono bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-300 ${theme.textGradient} transition-all`}>
            {displayNum}
          </span>
          {hasCurrency && (
            <span className="text-xs sm:text-sm font-bold text-slate-400 tracking-wide font-sans">
              ₫
            </span>
          )}
        </div>
      </div>

      {/* Bottom Subtitle + Trend Badge */}
      <div className="pt-3 mt-2 border-t border-slate-800/60 flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium text-slate-400 truncate">
          {subtitle || "Số liệu ghi nhận"}
        </span>

        {trend && (
          <div
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border shrink-0 shadow-sm transition-transform group-hover:scale-105 font-mono ${
              trend.isPositive
                ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30 shadow-emerald-500/10"
                : "bg-rose-500/15 text-rose-300 border-rose-500/30 shadow-rose-500/10"
            }`}
          >
            {trend.isPositive ? (
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />
            )}
            <span>{trend.value}</span>
          </div>
        )}
      </div>
    </GlassCard>
  );
};

