import React from "react";
import { ShieldCheck, Sparkles } from "lucide-react";

interface LoginCardProps {
  children: React.ReactNode;
}

export const LoginCard: React.FC<LoginCardProps> = ({ children }) => {
  return (
    <div className="w-full max-w-md mx-auto p-6 sm:p-9 rounded-3xl glass-glow-card relative z-10 transition-all duration-300">
      {/* Brand Header */}
      <div className="flex flex-col items-center text-center mb-8">
        {/* Glowing Brand Icon Badge */}
        <div className="relative mb-5 group">
          <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 rounded-2xl blur-md opacity-75 group-hover:opacity-100 transition duration-500" />
          <div className="relative w-14 h-14 rounded-2xl bg-[#0b0f19] border border-slate-700/80 flex items-center justify-center text-indigo-400 shadow-xl">
            <Sparkles className="w-7 h-7 animate-pulse text-indigo-400" />
          </div>
        </div>

        {/* Title & Subtitle */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold tracking-wide uppercase mb-3">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Hệ thống Quản trị Mavryk</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2">
          Mavryk <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-cyan-400 bg-clip-text text-transparent">Premium</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 max-w-xs leading-relaxed">
          Đăng nhập vào bảng điều khiển để quản lý đơn hàng & hệ thống.
        </p>
      </div>

      {/* Form Area */}
      {children}

      {/* Footer System Status */}
      <div className="mt-8 pt-5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 font-medium">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-slate-400">Server Status: Online</span>
        </div>
        <span className="text-slate-600">v2.5 Pro Admin</span>
      </div>
    </div>
  );
};
