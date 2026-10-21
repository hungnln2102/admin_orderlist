import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { NAVIGATION_GROUPS } from "./navigation";
import { useAuth } from "@/shared/context/AuthContext";
import { useNotification } from "@/shared/context/NotificationContext";
import {
  Search,
  ChevronDown,
  Sparkles,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  User,
  KeyRound,
  Shield,
  Loader2,
  XCircle,
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
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const notify = useNotification();
  const [searchTerm, setSearchTerm] = useState("");

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPass, setChangingPass] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      notify.error("Mật khẩu mới và xác nhận mật khẩu không khớp.", "Lỗi Mật Khẩu");
      return;
    }
    if (newPassword.length < 6) {
      notify.warning("Mật khẩu mới phải có ít nhất 6 ký tự.", "Cảnh Báo");
      return;
    }
    setChangingPass(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể đổi mật khẩu.");
      notify.success("Đổi mật khẩu thành công!", "Thành Công");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowProfileModal(false);
    } catch (err: any) {
      notify.error(err.message || "Lỗi kết nối máy chủ.", "Thất Bại");
    } finally {
      setChangingPass(false);
    }
  };

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

        {/* Navigation Filter Search */}
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
            onClick={() => setShowProfileModal(true)}
            className={`flex items-center cursor-pointer ${
              isCollapsed
                ? "flex-col gap-2 p-1"
                : "gap-3 p-2 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-cyan-500/50 hover:bg-slate-900 transition-all"
            }`}
            title="Xem thông tin tài khoản & Đổi mật khẩu"
          >
            <div className="relative shrink-0">
              <div
                className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-400 via-sky-500 to-indigo-500 p-0.5 flex items-center justify-center font-black text-xs text-white shadow-md"
                title={user?.username || "Administrator"}
              >
                <div className="w-full h-full bg-[#0b0f19] rounded-[10px] flex items-center justify-center text-cyan-300 font-extrabold uppercase">
                  {user?.username ? user.username.charAt(0) : "A"}
                </div>
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#070a11] shadow-sm" />
            </div>

            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-100 truncate flex items-center gap-1.5">
                  <span>{user?.username || "Administrator"}</span>
                  <span className="text-[10px] px-1.5 py-0.2 bg-cyan-500/20 text-cyan-300 rounded font-mono">
                    {user?.role || "admin"}
                  </span>
                </p>
                <p className="text-[10px] font-semibold text-emerald-400 flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
                  Hệ Thống Online
                </p>
              </div>
            )}

            {/* Icon Button Đăng Xuất */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleLogout();
              }}
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/15 rounded-xl transition-all border border-transparent hover:border-rose-500/30 shrink-0"
              title="Đăng xuất khỏi hệ thống"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Admin Profile & Change Password Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/40">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-cyan-400" />
                <span>Thông Tin Tài Khoản & Đổi Mật Khẩu</span>
              </h3>
              <button
                onClick={() => setShowProfileModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* User Info Card */}
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-400 via-sky-500 to-indigo-500 p-0.5 flex items-center justify-center text-white font-black text-lg shadow-lg">
                  <div className="w-full h-full bg-[#0b0f19] rounded-[10px] flex items-center justify-center text-cyan-300 uppercase">
                    {user?.username ? user.username.charAt(0) : "A"}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    <span>{user?.username || "Administrator"}</span>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 uppercase">
                      {user?.role || "admin"}
                    </span>
                  </div>
                  <div className="text-xs text-emerald-400 flex items-center gap-1.5 mt-1 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Trạng thái: Hoạt động an toàn</span>
                  </div>
                </div>
              </div>

              {/* Change Password Form */}
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="border-t border-slate-800 pt-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5 mb-3">
                    <KeyRound className="w-4 h-4" />
                    <span>Đổi Mật Khẩu Quản Trị</span>
                  </h4>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Mật Khẩu Hiện Tại *</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Mật Khẩu Mới (ít nhất 6 ký tự) *</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Xác Nhận Mật Khẩu Mới *</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowProfileModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={changingPass}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-400 to-sky-500 text-slate-950 hover:from-cyan-300 hover:to-sky-400 transition-colors shadow-lg shadow-cyan-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {changingPass && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Cập Nhật Mật Khẩu</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
