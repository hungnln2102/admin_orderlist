import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import { NAVIGATION_GROUPS } from "./navigation";
import {
  Search,
  ChevronDown,
  Sparkles,
  X,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

interface SidebarProps {
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isMobileOpen,
  onCloseMobile,
  isCollapsed,
  onToggleCollapse,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    "Tổng quan & Báo cáo": true,
    "Bán hàng & Đơn hàng": true,
    "Danh mục Sản phẩm & Giá": true,
    "Hệ thống Website": true,
    "Nguồn hàng & Kho": true,
    "Hệ thống & Ví": true,
    "Nội dung & Truyền thông": true,
  });

  const toggleGroup = (groupName: string) => {
    setOpenGroups((prev) => ({ ...prev, [groupName]: !prev[groupName] }));
  };

  const filteredGroups = NAVIGATION_GROUPS.map((group) => {
    const items = group.items.filter((item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    return { ...group, items };
  }).filter((group) => group.items.length > 0);

  return (
    <>
      {/* Backdrop cho Mobile */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm lg:hidden transition-opacity duration-300"
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-50 h-screen bg-[#070a11]/95 backdrop-blur-2xl border-r border-slate-800/80 flex flex-col transition-all duration-300 ease-in-out select-none ${
          isCollapsed ? "lg:w-20" : "lg:w-72"
        } w-72 ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Brand Header */}
        {isCollapsed ? (
          /* Chế độ Thu Gọn (w-20): Tách riêng nút thu phóng dạng Icon Box căn giữa tuyệt đối, không trùng đè Logo */
          <div className="p-4 border-b border-slate-800/70 flex items-center justify-center">
            <button
              onClick={onToggleCollapse}
              className="hidden lg:flex relative group w-11 h-11 rounded-xl items-center justify-center transition-all hover:scale-105 active:scale-95"
              title="Mở rộng menu sidebar"
            >
              <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-500 rounded-xl blur-[3px] opacity-70 group-hover:opacity-100 transition duration-300" />
              <div className="relative w-full h-full bg-[#0b0f19] rounded-xl border border-slate-700/60 flex items-center justify-center group-hover:bg-slate-900 transition-colors">
                <PanelLeftOpen className="w-5 h-5 text-cyan-400 drop-shadow-[0_0_6px_rgba(34,211,238,0.6)]" />
              </div>
            </button>

            {/* Mobile Header view khi drawer mở trên mobile */}
            <div className="flex items-center justify-between w-full lg:hidden">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 via-indigo-500 to-purple-500 p-0.5 shrink-0 shadow-md shadow-cyan-500/20">
                  <div className="w-full h-full bg-[#0b0f19] rounded-[10px] flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-cyan-400" />
                  </div>
                </div>
                <div>
                  <h1 className="font-black text-base text-white tracking-wide leading-none gradient-text-cyan">
                    MAVRYK STORE
                  </h1>
                  <span className="text-[10px] font-extrabold text-cyan-400 uppercase tracking-widest mt-0.5 block">
                    Hệ Thống Quản Lý
                  </span>
                </div>
              </div>
              <button
                onClick={onCloseMobile}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/60"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        ) : (
          /* Chế độ Mở Rộng (w-72): Logo Brand Metallic + Badge Version + Nút Thu Phóng Sleek */
          <div className="p-4 border-b border-slate-800/70 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative group shrink-0">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-500 rounded-xl blur-[3px] opacity-75 group-hover:opacity-100 transition duration-300" />
                <div className="relative w-10 h-10 rounded-xl bg-[#0b0f19] flex items-center justify-center border border-slate-700/60 shadow-lg shadow-cyan-500/10">
                  <Sparkles className="w-5 h-5 text-cyan-400 drop-shadow-[0_0_6px_rgba(34,211,238,0.6)]" />
                </div>
              </div>
              <div className="truncate">
                <h1 className="font-black text-base text-white tracking-wide leading-none gradient-text-cyan">
                  MAVRYK STORE
                </h1>
                <span className="text-[10px] font-extrabold text-cyan-400/90 tracking-widest uppercase block mt-1">
                  Hệ Thống Quản Lý
                </span>
              </div>
            </div>

            <button
              onClick={onToggleCollapse}
              className="hidden lg:flex p-2 text-slate-400 hover:text-cyan-400 rounded-xl bg-slate-900/80 hover:bg-slate-800/90 transition-all border border-slate-800 hover:border-slate-700 active:scale-95 shadow-sm"
              title="Thu gọn menu sidebar"
            >
              <PanelLeftClose className="w-4.5 h-4.5" />
            </button>

            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/60"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Navigation Filter Search (Chỉ hiện khi mở rộng) */}
        {!isCollapsed && (
          <div className="px-3.5 py-3 border-b border-slate-800/60">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Tìm menu nhanh..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900/60 border border-slate-800/80 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 transition-all"
              />
            </div>
          </div>
        )}

        {/* Nav Menu Items List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
          {filteredGroups.map((group, groupIdx) => {
            const isOpen = openGroups[group.groupName] ?? true;
            return (
              <div
                key={group.groupName}
                className={`space-y-1 ${
                  groupIdx > 0 ? "pt-2 border-t border-slate-800/40" : ""
                }`}
              >
                {/* Group Header (Ẩn khi thu gọn) */}
                {!isCollapsed && (
                  <button
                    onClick={() => toggleGroup(group.groupName)}
                    className="w-full flex items-center justify-between px-3 py-1.5 text-[10.5px] font-extrabold text-slate-500 uppercase tracking-wider hover:text-cyan-400 transition-colors"
                  >
                    <span>{group.groupName}</span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-300 ${
                        isOpen ? "" : "-rotate-90"
                      }`}
                    />
                  </button>
                )}

                {(isOpen || isCollapsed) && (
                  <div className="space-y-1 mt-0.5">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <NavLink
                          key={item.path}
                          to={item.path}
                          onClick={onCloseMobile}
                          title={item.name}
                          className={({ isActive }) =>
                            `relative group flex items-center ${
                              isCollapsed ? "justify-center px-0 py-3" : "gap-3 px-3.5 py-2.5"
                            } rounded-xl text-xs font-semibold transition-all duration-200 select-none ${
                              isActive
                                ? "bg-gradient-to-r from-cyan-500/15 via-sky-500/10 to-transparent text-cyan-300 border-y border-r border-cyan-500/20 shadow-md shadow-cyan-500/5 font-bold"
                                : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 hover:translate-x-1"
                            }`
                          }
                        >
                          {({ isActive }) => (
                            <>
                              {/* Glowing Cyan Bar bên trái cho Active Link */}
                              {isActive && (
                                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.8)]" />
                              )}

                              <Icon
                                className={`w-4.5 h-4.5 flex-shrink-0 transition-all duration-200 ${
                                  isActive
                                    ? "text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)] scale-110"
                                    : "group-hover:text-cyan-400 group-hover:scale-105"
                                }`}
                              />

                              {!isCollapsed && (
                                <>
                                  <span className="truncate">{item.name}</span>
                                  {item.badge && (
                                    <span className="ml-auto px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                                      {item.badge}
                                    </span>
                                  )}
                                </>
                              )}
                            </>
                          )}
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* User Footer Profile & System Status */}
        <div className="p-3 border-t border-slate-800/70 bg-slate-950/60 backdrop-blur-md">
          <div
            className={`flex items-center ${
              isCollapsed
                ? "justify-center"
                : "gap-3 p-2 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700/80 transition-all"
            }`}
          >
            <div className="relative shrink-0">
              <div
                className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-400 via-sky-500 to-indigo-500 p-0.5 flex items-center justify-center font-black text-xs text-white shadow-md"
                title="Administrator"
              >
                <div className="w-full h-full bg-[#0b0f19] rounded-[10px] flex items-center justify-center text-cyan-300 font-extrabold">
                  A
                </div>
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#070a11] shadow-sm" />
            </div>

            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-100 truncate">Administrator</p>
                <p className="text-[10px] font-semibold text-emerald-400 flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
                  Hệ Thống Online
                </p>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

