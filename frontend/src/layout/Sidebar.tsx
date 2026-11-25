import React, { useState, useCallback } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { NAVIGATION_GROUPS, type NavGroupAccent } from "./navigation";
import { useAuth } from "@/shared/context/AuthContext";
import { preloadRoute } from "@/routes/routeLoaders";
import { SidebarRailTooltip, type RailTooltipState } from "./SidebarRailTooltip";
import { SidebarProfileModal } from "./SidebarProfileModal";
import {
  Search,
  ChevronDown,
  Sparkles,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
} from "lucide-react";

interface SidebarProps {
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const GROUP_ACCENT_STYLES: Record<
  NavGroupAccent,
  {
    dot: string;
    railLabel: string;
    activeWrap: string;
    activeIcon: string;
    activeBar: string;
    hoverIcon: string;
  }
> = {
  cyan: {
    dot: "bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.65)]",
    railLabel: "text-cyan-400/85",
    activeWrap:
      "bg-gradient-to-r from-cyan-500/18 via-sky-500/10 to-transparent text-cyan-200 border border-cyan-500/30 shadow-md shadow-cyan-500/10",
    activeIcon: "text-cyan-300 drop-shadow-[0_0_8px_rgba(34,211,238,0.75)]",
    activeBar: "bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.9)]",
    hoverIcon: "group-hover:text-cyan-300",
  },
  emerald: {
    dot: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.65)]",
    railLabel: "text-emerald-400/85",
    activeWrap:
      "bg-gradient-to-r from-emerald-500/18 via-teal-500/10 to-transparent text-emerald-200 border border-emerald-500/30 shadow-md shadow-emerald-500/10",
    activeIcon: "text-emerald-300 drop-shadow-[0_0_8px_rgba(52,211,153,0.75)]",
    activeBar: "bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.9)]",
    hoverIcon: "group-hover:text-emerald-300",
  },
  amber: {
    dot: "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.65)]",
    railLabel: "text-amber-400/85",
    activeWrap:
      "bg-gradient-to-r from-amber-500/18 via-orange-500/10 to-transparent text-amber-200 border border-amber-500/30 shadow-md shadow-amber-500/10",
    activeIcon: "text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.75)]",
    activeBar: "bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.9)]",
    hoverIcon: "group-hover:text-amber-300",
  },
  purple: {
    dot: "bg-purple-400 shadow-[0_0_8px_rgba(192,132,252,0.65)]",
    railLabel: "text-purple-400/85",
    activeWrap:
      "bg-gradient-to-r from-purple-500/18 via-fuchsia-500/10 to-transparent text-purple-200 border border-purple-500/30 shadow-md shadow-purple-500/10",
    activeIcon: "text-purple-300 drop-shadow-[0_0_8px_rgba(192,132,252,0.75)]",
    activeBar: "bg-purple-400 shadow-[0_0_12px_rgba(192,132,252,0.9)]",
    hoverIcon: "group-hover:text-purple-300",
  },
  sky: {
    dot: "bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.65)]",
    railLabel: "text-sky-400/85",
    activeWrap:
      "bg-gradient-to-r from-sky-500/18 via-cyan-500/10 to-transparent text-sky-200 border border-sky-500/30 shadow-md shadow-sky-500/10",
    activeIcon: "text-sky-300 drop-shadow-[0_0_8px_rgba(56,189,248,0.75)]",
    activeBar: "bg-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.9)]",
    hoverIcon: "group-hover:text-sky-300",
  },
  indigo: {
    dot: "bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.65)]",
    railLabel: "text-indigo-400/85",
    activeWrap:
      "bg-gradient-to-r from-indigo-500/18 via-blue-500/10 to-transparent text-indigo-200 border border-indigo-500/30 shadow-md shadow-indigo-500/10",
    activeIcon: "text-indigo-300 drop-shadow-[0_0_8px_rgba(129,140,248,0.75)]",
    activeBar: "bg-indigo-400 shadow-[0_0_12px_rgba(129,140,248,0.9)]",
    hoverIcon: "group-hover:text-indigo-300",
  },
};

export const Sidebar: React.FC<SidebarProps> = ({
  isMobileOpen,
  onCloseMobile,
  isCollapsed,
  onToggleCollapse,
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [railTooltip, setRailTooltip] = useState<RailTooltipState | null>(null);

  // Trên Mobile Drawer (< lg), luôn hiển thị full sidebar (không thu gọn thành icon rail)
  const isRail = isCollapsed && !isMobileOpen;

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(NAVIGATION_GROUPS.map((g) => [g.groupName, true]))
  );

  const toggleGroup = (groupName: string) => {
    setOpenGroups((prev) => ({ ...prev, [groupName]: !(prev[groupName] ?? true) }));
  };

  const handleLogout = async () => {
    setRailTooltip(null);
    await logout();
    navigate("/login");
  };

  const showRailTooltip = useCallback(
    (
      e: React.MouseEvent<HTMLElement> | React.FocusEvent<HTMLElement>,
      label: string,
      groupName?: string,
      accent?: NavGroupAccent
    ) => {
      if (!isRail) return;
      const rect = e.currentTarget.getBoundingClientRect();
      setRailTooltip({
        label,
        groupName,
        accent,
        top: rect.top + rect.height / 2,
        left: rect.right + 12,
      });
    },
    [isRail]
  );

  const hideRailTooltip = useCallback(() => {
    setRailTooltip(null);
  }, []);

  const filteredGroups = NAVIGATION_GROUPS.map((group) => {
    if (!searchTerm.trim() || isRail) return group;
    const query = searchTerm.toLowerCase().trim();
    const matchGroup = group.groupName.toLowerCase().includes(query);
    const items = matchGroup
      ? group.items
      : group.items.filter((item) => item.name.toLowerCase().includes(query));
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
          isRail ? "lg:w-[76px]" : "lg:w-[272px]"
        } w-[272px] ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Nút Toggle Thu Gọn / Mở Rộng nổi gọn gàng ở mép phải trên Desktop */}
        <button
          type="button"
          onClick={() => {
            setRailTooltip(null);
            onToggleCollapse();
          }}
          onMouseEnter={(e) =>
            showRailTooltip(e, isCollapsed ? "Mở rộng menu" : "Thu gọn menu")
          }
          onMouseLeave={hideRailTooltip}
          aria-label={isCollapsed ? "Mở rộng menu sidebar" : "Thu gọn menu sidebar"}
          className="hidden lg:flex items-center justify-center absolute -right-3.5 top-5 z-50 w-7 h-7 rounded-full bg-[#0d1424] border border-slate-700/90 text-slate-300 hover:text-cyan-300 hover:border-cyan-400/70 hover:bg-slate-900 shadow-lg shadow-black/50 transition-all active:scale-95 cursor-pointer"
        >
          {isCollapsed ? (
            <PanelLeftOpen className="w-3.5 h-3.5" />
          ) : (
            <PanelLeftClose className="w-3.5 h-3.5" />
          )}
        </button>

        {/* Brand Header */}
        <div
          className={`h-16 border-b border-slate-800/70 flex items-center shrink-0 transition-all ${
            isRail ? "lg:justify-center lg:px-2 px-4 justify-between" : "justify-between px-4"
          }`}
        >
          <div className={`flex items-center min-w-0 ${isRail ? "lg:gap-0 gap-3" : "gap-3"}`}>
            <div
              onClick={() => {
                if (isRail) onToggleCollapse();
              }}
              onMouseEnter={(e) =>
                showRailTooltip(e, "MAVRYK STORE • Bấm để mở rộng menu")
              }
              onMouseLeave={hideRailTooltip}
              className={`relative group shrink-0 ${isRail ? "lg:cursor-pointer" : ""}`}
            >
              <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-500 rounded-xl blur-[3px] opacity-70 group-hover:opacity-100 transition duration-300" />
              <div className="relative w-9 h-9 rounded-xl bg-[#0b0f19] flex items-center justify-center border border-slate-700/70 shadow-lg shadow-cyan-500/10">
                <Sparkles className="w-4.5 h-4.5 text-cyan-400 drop-shadow-[0_0_6px_rgba(34,211,238,0.65)]" />
              </div>
            </div>

            <div className={`truncate ${isRail ? "lg:hidden" : ""}`}>
              <h1 className="font-black text-sm text-white tracking-wide leading-none gradient-text-cyan">
                MAVRYK STORE
              </h1>
              <span className="text-[10px] font-extrabold text-cyan-400/90 tracking-widest uppercase block mt-1">
                Hệ Thống Quản Lý
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/60 shrink-0 cursor-pointer"
            aria-label="Đóng menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Filter Search (Chỉ hiển thị khi mở rộng) */}
        {!isRail && (
          <div className="px-3.5 py-2.5 border-b border-slate-800/60 shrink-0">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Tìm menu nhanh..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900/70 border border-slate-800/90 rounded-xl pl-8 pr-8 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 transition-all"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200 cursor-pointer"
                  aria-label="Xóa từ khóa tìm kiếm"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Nav Menu Items List */}
        <nav
          aria-label="Điều hướng chính"
          onScroll={hideRailTooltip}
          className={`flex-1 overflow-y-auto custom-scrollbar ${
            isRail ? "lg:px-2 lg:py-3 p-3 space-y-2.5" : "p-3 space-y-3"
          }`}
        >
          {filteredGroups.map((group, groupIdx) => {
            const isOpen = openGroups[group.groupName] ?? true;
            const accent = GROUP_ACCENT_STYLES[group.accent];

            return (
              <div
                key={group.groupName}
                className={`${
                  groupIdx > 0
                    ? isRail
                      ? "lg:pt-2.5 lg:border-t lg:border-slate-800/70 pt-2.5 border-t border-slate-800/50"
                      : "pt-2.5 border-t border-slate-800/50"
                    : ""
                }`}
              >
                {/* Tiêu đề khu vực: chế độ Mở rộng */}
                {!isRail ? (
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.groupName)}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[10.5px] font-extrabold text-slate-400 uppercase tracking-wider hover:text-white hover:bg-slate-800/40 transition-colors cursor-pointer mb-1"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${accent.dot}`} />
                      <span className="truncate">{group.groupName}</span>
                    </span>
                    <span className="flex items-center gap-1.5 shrink-0">
                      {!isOpen && (
                        <span className="px-1.5 py-0.2 rounded-full bg-slate-800/90 text-[9.5px] font-bold text-slate-400">
                          {group.items.length}
                        </span>
                      )}
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${
                          isOpen ? "" : "-rotate-90"
                        }`}
                      />
                    </span>
                  </button>
                ) : (
                  /* Nhãn khu vực siêu gọn cho chế độ Thu gọn (Icon Rail) */
                  <div
                    className={`hidden lg:flex items-center justify-center mb-1.5 px-1 text-[9px] font-extrabold uppercase tracking-wider truncate ${accent.railLabel}`}
                  >
                    {group.shortLabel}
                  </div>
                )}

                {(isOpen || isRail) && (
                  <div className={isRail ? "lg:space-y-1.5 space-y-1" : "space-y-1"}>
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <NavLink
                          key={item.path}
                          to={item.path}
                          onClick={() => {
                            hideRailTooltip();
                            onCloseMobile();
                          }}
                          onPointerEnter={() => preloadRoute(item.path)}
                          onMouseEnter={(e) =>
                            showRailTooltip(e, item.name, group.groupName, group.accent)
                          }
                          onMouseLeave={hideRailTooltip}
                          onFocus={(e) => {
                            preloadRoute(item.path);
                            showRailTooltip(e, item.name, group.groupName, group.accent);
                          }}
                          onBlur={hideRailTooltip}
                          aria-label={item.name}
                          className={({ isActive }) =>
                            isRail
                              ? `relative group flex items-center lg:justify-center lg:w-11 lg:h-10 lg:mx-auto lg:px-0 justify-start gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 select-none ${
                                  isActive
                                    ? `${accent.activeWrap} font-bold`
                                    : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/65 border border-transparent"
                                }`
                              : `relative group flex items-center justify-start gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 select-none ${
                                  isActive
                                    ? `${accent.activeWrap} font-bold`
                                    : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/55 border border-transparent"
                                }`
                          }
                        >
                          {({ isActive }) => (
                            <>
                              {isActive && (
                                <span
                                  className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full ${accent.activeBar}`}
                                />
                              )}

                              <Icon
                                className={`w-[18px] h-[18px] flex-shrink-0 transition-all duration-200 ${
                                  isActive
                                    ? `${accent.activeIcon} scale-105`
                                    : `${accent.hoverIcon} group-hover:scale-105`
                                }`}
                              />

                              <span
                                className={`truncate flex-1 min-w-0 text-left ${
                                  isRail ? "lg:hidden" : ""
                                }`}
                              >
                                {item.name}
                              </span>

                              {item.badge && !isRail && (
                                <span className="ml-auto px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shrink-0">
                                  {item.badge}
                                </span>
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

          {!isRail && filteredGroups.length === 0 && (
            <div className="px-3 py-6 text-center text-xs text-slate-500">
              Không tìm thấy mục nào khớp "{searchTerm}".
            </div>
          )}
        </nav>

        {/* User Footer Profile & Logout */}
        <div
          className={`border-t border-slate-800/70 bg-slate-950/70 backdrop-blur-md shrink-0 ${
            isRail ? "lg:p-2 p-2.5" : "p-2.5"
          }`}
        >
          {isRail ? (
            <div className="hidden lg:flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  hideRailTooltip();
                  setShowProfileModal(true);
                }}
                onMouseEnter={(e) =>
                  showRailTooltip(
                    e,
                    `${user?.username || "Administrator"} (${user?.role || "admin"})`,
                    "Tài khoản & Đổi mật khẩu",
                    "emerald"
                  )
                }
                onMouseLeave={hideRailTooltip}
                className="relative p-1 rounded-xl hover:bg-slate-800/70 transition-colors cursor-pointer"
                aria-label="Thông tin tài khoản"
              >
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-400 via-sky-500 to-indigo-500 p-0.5 flex items-center justify-center font-black text-xs text-white shadow-md">
                  <div className="w-full h-full bg-[#0b0f19] rounded-[10px] flex items-center justify-center text-cyan-300 font-extrabold uppercase text-xs">
                    {user?.username ? user.username.charAt(0) : "A"}
                  </div>
                </div>
                <span className="absolute bottom-0.5 right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#070a11]" />
              </button>

              <button
                type="button"
                onClick={handleLogout}
                onMouseEnter={(e) => showRailTooltip(e, "Đăng xuất khỏi hệ thống")}
                onMouseLeave={hideRailTooltip}
                className="w-10 h-8 flex items-center justify-center text-slate-400 hover:text-rose-400 hover:bg-rose-500/15 rounded-xl transition-all border border-transparent hover:border-rose-500/30 cursor-pointer"
                aria-label="Đăng xuất"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : null}

          <div
            onClick={() => setShowProfileModal(true)}
            className={`${
              isRail ? "lg:hidden flex" : "flex"
            } items-center gap-2.5 p-2 rounded-xl bg-slate-900/65 border border-slate-800/80 hover:border-cyan-500/50 hover:bg-slate-900 transition-all cursor-pointer`}
            title="Xem thông tin tài khoản & Đổi mật khẩu"
          >
            <div className="relative shrink-0">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-400 via-sky-500 to-indigo-500 p-0.5 flex items-center justify-center font-black text-xs text-white shadow-md">
                <div className="w-full h-full bg-[#0b0f19] rounded-[10px] flex items-center justify-center text-cyan-300 font-extrabold uppercase text-xs">
                  {user?.username ? user.username.charAt(0) : "A"}
                </div>
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#070a11] shadow-sm" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-100 truncate">
                {user?.username || "Administrator"}
              </p>
              <p className="text-[10px] font-semibold text-emerald-400 flex items-center gap-1 mt-0.5 truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.8)] shrink-0" />
                <span className="truncate">{user?.role || "admin"}</span>
              </p>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                void handleLogout();
              }}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/15 rounded-xl transition-all border border-transparent hover:border-rose-500/30 shrink-0 cursor-pointer"
              title="Đăng xuất khỏi hệ thống"
              aria-label="Đăng xuất"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      <SidebarRailTooltip tooltip={isRail ? railTooltip : null} />

      <SidebarProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        username={user?.username}
        role={user?.role}
      />
    </>
  );
};
