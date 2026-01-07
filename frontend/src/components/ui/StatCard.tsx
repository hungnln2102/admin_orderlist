import React from "react";

export interface StatAccent {
  border: string;
  glow: string;
  iconBg: string;
}

export const STAT_CARD_ACCENTS = {
  sky: {
    border: "border-sky-100/80",
    glow: "from-sky-100/70 via-white/80 to-blue-100/70",
    iconBg: "bg-sky-500/90 text-white",
  },
  emerald: {
    border: "border-emerald-100/80",
    glow: "from-emerald-100/70 via-white/80 to-lime-100/70",
    iconBg: "bg-emerald-500/90 text-white",
  },
  violet: {
    border: "border-violet-100/80",
    glow: "from-violet-100/70 via-white/80 to-fuchsia-100/70",
    iconBg: "bg-violet-500/90 text-white",
  },
  amber: {
    border: "border-amber-100/80",
    glow: "from-amber-100/70 via-white/80 to-orange-100/70",
    iconBg: "bg-amber-500/90 text-white",
  },
  rose: {
    border: "border-rose-100/80",
    glow: "from-rose-100/70 via-white/80 to-pink-100/70",
    iconBg: "bg-rose-500/90 text-white",
  },
  indigo: {
    border: "border-indigo-100/80",
    glow: "from-indigo-100/70 via-white/80 to-purple-100/70",
    iconBg: "bg-indigo-500/90 text-white",
  },
  slate: {
    border: "border-slate-200/80",
    glow: "from-slate-100/70 via-white/80 to-slate-200/70",
    iconBg: "bg-slate-600/90 text-white",
  },
  teal: {
    border: "border-teal-100/80",
    glow: "from-teal-100/70 via-white/80 to-cyan-100/70",
    iconBg: "bg-teal-500/90 text-white",
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
  iconClassName = "h-6 w-6",
}) => {
  return (
    <div
      className="relative isolate overflow-hidden rounded-3xl border border-white/25 bg-gradient-to-br from-slate-200/70 via-indigo-200/60 to-slate-300/70 p-6 shadow-[0_18px_48px_-28px_rgba(0,0,0,0.6),0_12px_30px_-24px_rgba(255,255,255,0.22)] backdrop-blur transition-all hover:shadow-[0_22px_60px_-28px_rgba(0,0,0,0.65),0_16px_36px_-24px_rgba(255,255,255,0.24)]"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-white">{title}</p>
          <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
          {subtitle && (
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-white/80">
              {subtitle}
            </p>
          )}
        </div>
        <div
          className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 border border-white/35 shadow-inner shadow-black/15 text-slate-800"
        >
          <Icon className={iconClassName} />
        </div>
      </div>
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
};

export default StatCard;
