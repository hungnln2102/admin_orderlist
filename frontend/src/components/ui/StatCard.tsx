import React from "react";

export interface StatAccent {
  border: string;
  glow: string;
  iconBg: string;
}

export const STAT_CARD_ACCENTS = {
  sky: {
    border: "border-sky-500/30",
    glow: "bg-sky-500/20",
    iconBg: "bg-sky-500 text-white shadow-[0_0_15px_rgba(14,165,233,0.5)]",
  },
  emerald: {
    border: "border-emerald-500/30",
    glow: "bg-emerald-500/20",
    iconBg: "bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.5)]",
  },
  violet: {
    border: "border-violet-500/30",
    glow: "bg-violet-500/20",
    iconBg: "bg-violet-500 text-white shadow-[0_0_15px_rgba(139,92,246,0.5)]",
  },
  amber: {
    border: "border-amber-500/30",
    glow: "bg-amber-500/20",
    iconBg: "bg-amber-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.5)]",
  },
  rose: {
    border: "border-rose-500/30",
    glow: "bg-rose-500/20",
    iconBg: "bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.5)]",
  },
  indigo: {
    border: "border-indigo-500/30",
    glow: "bg-indigo-500/20",
    iconBg: "bg-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.5)]",
  },
  slate: {
    border: "border-slate-500/30",
    glow: "bg-slate-500/20",
    iconBg: "bg-slate-500 text-white shadow-[0_0_15px_rgba(100,116,139,0.5)]",
  },
  teal: {
    border: "border-teal-500/30",
    glow: "bg-teal-500/20",
    iconBg: "bg-teal-500 text-white shadow-[0_0_15px_rgba(20,184,166,0.5)]",
  },
} as const;

export interface StatCardProps {
  title: string;
  value: React.ReactNode;
  icon: React.ElementType;
  accent: StatAccent;
  subtitle?: React.ReactNode;
  children?: React.ReactNode;
  iconClassName?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  accent,
  subtitle,
  children,
}) => {
  return (
    <div
      className={`group relative isolate overflow-hidden rounded-[24px] glass-panel p-4 sm:p-5 transition-all duration-500 holographic-hover z-10 ${accent.border}`}
    >
      {/* Dynamic Background Glow */}
      <div className={`absolute -right-12 -top-12 h-32 w-32 rounded-full blur-[60px] opacity-10 transition-opacity group-hover:opacity-25 ${accent.glow}`}></div>
      
      <div className="flex items-start justify-between gap-4">
        <div className="relative z-10">
          <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-300/80 leading-none mb-1.5">
            {title}
          </p>
          <div className="flex flex-col gap-1">
            <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-none">
              {value}
            </h3>
            {subtitle && (
              <p className="text-[10px] sm:text-xs font-medium text-emerald-400/80 tracking-wide">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        <div
          className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 overflow-hidden transform transition-all duration-500 group-hover:rotate-[10deg] group-hover:scale-110 ${accent.iconBg}`}
        >
          {/* Internal reflection */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none"></div>
          <Icon className="h-5 w-5 relative z-10" />
        </div>
      </div>
      
      {children && (
        <div className="mt-6 relative z-10 animate-in fade-in slide-in-from-bottom-2 duration-700">
          {children}
        </div>
      )}
    </div>
  );
};

export default StatCard;
