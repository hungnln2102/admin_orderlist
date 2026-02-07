import React from "react";

export const DashboardHero: React.FC = () => (
  <div className="dashboard-hero relative group overflow-hidden rounded-[32px] glass-panel-light p-8 lg:p-10 transition-all duration-700 holographic-hover">
    <div className="dashboard-hero__glow dashboard-hero__glow--right absolute -right-20 -top-20 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] animate-pulse"></div>
    <div className="dashboard-hero__glow dashboard-hero__glow--left absolute -left-20 -bottom-20 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px] animate-pulse [animation-delay:2s]"></div>

    <div className="dashboard-hero__content relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div className="dashboard-hero__text space-y-2">
        <h1 className="dashboard-hero__title text-4xl lg:text-5xl font-bold text-white tracking-tighter">
          Bảng Điều <span className="text-indigo-400">Khiển</span>
        </h1>
        <p className="text-sm font-medium text-indigo-200/60 uppercase tracking-[0.3em]">
          Digital Control Hub & Analysis
        </p>
      </div>
      <div className="hidden lg:flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
        <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Secure Uplink Verified</span>
      </div>
    </div>
  </div>
);

