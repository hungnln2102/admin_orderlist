import React from "react";
import { Bell, Globe, RefreshCw, Menu } from "lucide-react";

interface HeaderProps {
  onToggleMobileSidebar: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileSidebar }) => {

  return (
    <header className="h-16 bg-[#070a11]/80 backdrop-blur-xl border-b border-slate-800/80 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Left: Mobile Menu Toggle */}
      <div className="flex items-center gap-3">
        {/* Toggle Mobile Drawer (Chỉ hiển thị trên Mobile < lg) */}
        <button
          onClick={onToggleMobileSidebar}
          className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
          title="Mở Menu Mobile"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          onClick={() => window.location.reload()}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
          title="Tải lại trang"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        <button
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors relative"
          title="Thông báo hệ thống"
        >
          <Bell className="w-4 h-4" />
          <span className="w-2 h-2 rounded-full bg-sky-400 absolute top-1.5 right-1.5 animate-ping" />
        </button>

        <div className="h-4 w-px bg-slate-800 hidden sm:block" />

        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300">
          <Globe className="w-3.5 h-3.5 text-emerald-400" />
          <span>System Healthy</span>
        </div>
      </div>
    </header>
  );
};
