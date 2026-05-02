import React from "react";

type DashboardHeroProps = {
  /** Vùng góc phải header (vd. lọc chu kỳ) */
  rightSlot?: React.ReactNode;
};

export const DashboardHero: React.FC<DashboardHeroProps> = ({ rightSlot }) => (
  <div className="dashboard-hero relative group overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950/40 via-purple-950/30 to-slate-950/40 border border-indigo-500/20 p-6 lg:p-8 transition-all duration-700 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5),0_10px_30px_-15px_rgba(79,70,229,0.15)] hover:shadow-[0_30px_60px_-12px_rgba(0,0,0,0.6),0_15px_40px_-15px_rgba(79,70,229,0.25)] backdrop-blur-xl">
    <div className="dashboard-hero__glow dashboard-hero__glow--right absolute -right-20 -top-20 w-96 h-96 bg-indigo-500/15 rounded-full blur-[100px] animate-pulse"></div>
    <div className="dashboard-hero__glow dashboard-hero__glow--left absolute -left-20 -bottom-20 w-96 h-96 bg-purple-500/15 rounded-full blur-[100px] animate-pulse [animation-delay:2s]"></div>

    <div className="dashboard-hero__content relative z-10 flex flex-col gap-5 md:flex-row md:items-center md:justify-between md:gap-8">
      <div className="dashboard-hero__text min-w-0 flex-1 space-y-3">
        <h1 className="dashboard-hero__title text-4xl lg:text-5xl font-bold text-white tracking-tighter">
          Bảng Điều <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Khiển</span>
        </h1>
        <p className="text-sm font-semibold text-indigo-300/80 uppercase tracking-[0.3em]">
          Digital Control Hub & Analysis
        </p>
      </div>
      {rightSlot ? (
        <div className="w-full shrink-0 md:w-auto md:max-w-[min(100%,46rem)] flex flex-col items-stretch md:items-end gap-2">
          <p className="hidden md:block text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-200/45 text-right pr-0.5">
            Lọc chu kỳ
          </p>
          <div className="w-full md:w-auto">{rightSlot}</div>
        </div>
      ) : null}
    </div>
  </div>
);