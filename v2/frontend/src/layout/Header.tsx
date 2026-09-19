import React from "react";
import { Bell, Search, Globe, RefreshCw, Menu } from "lucide-react";

interface HeaderProps {
  onToggleMobileSidebar: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileSidebar }) => {
  return (
    <header className="h-16 bg-[#070a11]/80 backdrop-blur-xl border-b border-slate-800/80 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Left: Mobile Menu Toggle & Search Header */}
      <div className="flex items-center gap-3 flex-1 max-w-md">
        {/* Toggle Mobile Drawer (Chỉ hiển thị trên Mobile < lg) */}
        <button
          onClick={onToggleMobileSidebar}
          className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
          title="Mở Menu Mobile"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm đơn hàng, khách hàng, giao dịch..."
            className="w-full glass-input rounded-xl pl-9 pr-4 py-2 text-xs placeholder:text-slate-500"
          />
        </div>
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
