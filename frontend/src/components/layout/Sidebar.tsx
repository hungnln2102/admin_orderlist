import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ChartBarIcon,
  ShoppingBagIcon,
  CubeIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  DocumentIcon,
  XMarkIcon,
  Bars3Icon,
  InformationCircleIcon,
  ChevronDownIcon,
  ArchiveBoxIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../../AuthContext";
import { ArrowRightOnRectangleIcon } from "@heroicons/react/24/outline";
import { apiFetch } from "../../lib/api";

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

type MenuItem = {
  name: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

type MenuSection = {
  title: string;
  items: MenuItem[];
};

const menuSections: MenuSection[] = [
  {
    title: "Tổng Quan",
    items: [{ name: "Tổng Quan", href: "/dashboard", icon: ChartBarIcon }],
  },
  {
    title: "Sản Phẩm",
    items: [
      { name: "Đơn Hàng", href: "/orders", icon: ShoppingBagIcon },
      { name: "Gói", href: "/package-products", icon: CubeIcon },
      { name: "Bảng Giá", href: "/pricing", icon: CurrencyDollarIcon },
      {
        name: "Thông Tin Sản Phẩm",
        href: "/product-info",
        icon: InformationCircleIcon,
      },
    ],
  },
  {
    title: "Cá Nhân",
    items: [
      { name: "Nhà Cung Cấp", href: "/sources", icon: DocumentTextIcon },
      { name: "Báo Giá", href: "/show-price", icon: DocumentIcon },
      { name: "Hóa Đơn", href: "/bill-order", icon: DocumentIcon },
      { name: "Biên Lai", href: "/invoices", icon: DocumentIcon },
      { name: "Lưu Trữ", href: "/warehouse", icon: ArchiveBoxIcon },
    ],
  },
];

const normalizeSearch = (input: string) => {
  if (!input) return "";
  const str = input.startsWith("?") ? input.slice(1) : input;
  const params = new URLSearchParams(str);
  return Array.from(params.entries())
    .map(([key, value]) => `${key}=${value}`)
    .sort()
    .join("&");
};

const matchesHref = (
  currentPath: string,
  currentSearch: string,
  targetHref: string
) => {
  const [path, query] = targetHref.split("?");
  const search = query ? `?${query}` : "";
  if (currentPath !== path) return false;
  return normalizeSearch(currentSearch) === normalizeSearch(search);
};

export default function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const location = useLocation();
  const { user, setUser } = useAuth();
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(
    () =>
      Object.fromEntries(menuSections.map((section) => [section.title, true]))
  );
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const resetPasswordForm = () => {
    setPasswordForm({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    setPasswordError(null);
    setPasswordSuccess(null);
  };

  const openChangePassword = () => {
    resetPasswordForm();
    setShowChangePassword(true);
  };

  const closeChangePassword = () => {
    setShowChangePassword(false);
    resetPasswordForm();
  };

  const submitPasswordChange = async (event: React.FormEvent) => {
    event.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (
      !passwordForm.currentPassword ||
      !passwordForm.newPassword ||
      !passwordForm.confirmPassword
    ) {
      setPasswordError("Vui lòng nhập đủ thông tin.");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("Mật khẩu mới không khớp.");
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await apiFetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
          confirmPassword: passwordForm.confirmPassword,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setPasswordError(data?.error || "Không thể đổi mật khẩu.");
        return;
      }

      setPasswordSuccess("Đổi mật khẩu thành công.");
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch {
      setPasswordError("Không thể đổi mật khẩu.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const toggleSection = (title: string) => {
    setOpenSections((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch {
      /* ignore */
    } finally {
      setUser(null);
      window.location.href = "/login";
    }
  };

  return (
    <>
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="bg-white p-2 rounded-lg shadow-lg border border-gray-200"
        >
          {isOpen ? (
            <XMarkIcon className="h-6 w-6 text-gray-600" />
          ) : (
            <Bars3Icon className="h-6 w-6 text-gray-600" />
          )}
        </button>
      </div>

      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      <div
        className={`
          fixed top-0 left-0 z-40 w-64 h-full bg-gradient-to-b from-[#0c1230] via-[#141a3c] to-[#0a0e24] shadow-2xl border-r border-white/10
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
        `}
      >
        <div className="flex flex-col h-full">
          <div className="px-4 pt-6 pb-4">
            <div className="rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-500 px-4 py-3 shadow-lg shadow-indigo-900/50 text-center border border-white/10">
              <h1 className="text-lg font-bold text-white tracking-wide">
                Admin Orderlist
              </h1>
              <p className="text-[11px] text-indigo-100/90 mt-1 font-medium uppercase tracking-[0.08em]">
                Control Panel
              </p>
            </div>
          </div>

          <nav className="flex-1 px-3 pb-6 overflow-y-auto space-y-2">
            {menuSections.map((section) => {
              const isOpenSection = openSections[section.title] ?? true;
              const isStaticSection = section.title === menuSections[0].title;
              const isSectionActive = section.items.some(
                (item) =>
                  location.pathname === item.href ||
                  matchesHref(location.pathname, location.search, item.href)
              );
              return (
                <div
                  key={section.title}
                  className={`w-full rounded-2xl border border-white/10 bg-white/5 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.45)] backdrop-blur-sm mb-3 ${
                    isSectionActive ? "ring-2 ring-indigo-500/40" : ""
                  }`}
                >
                  {isStaticSection ? (
                    <div className="space-y-1 px-2 py-1">
                      {section.items.map((item) => {
                        const isActive =
                          location.pathname === item.href ||
                          matchesHref(
                            location.pathname,
                            location.search,
                            item.href
                          );
                        return (
                          <div key={item.name} className="space-y-2">
                            <Link
                              to={item.href}
                              onClick={() => setIsOpen(false)}
                              className={`
                                group flex items-center gap-3 px-3 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200
                                ${
                                  isActive
                                    ? "bg-gradient-to-r from-indigo-500 to-blue-500 text-white shadow-lg shadow-indigo-900/40"
                                    : "text-indigo-100/90 hover:bg-white/10 hover:text-white"
                                }
                              `}
                            >
                              <item.icon
                                className={`h-5 w-5 transition-colors ${
                                  isActive
                                    ? "text-white"
                                    : "text-indigo-200 group-hover:text-white"
                                }`}
                              />
                              {item.name}
                            </Link>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => toggleSection(section.title)}
                        className="w-full px-4 py-2.5 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.12em] text-indigo-100 hover:text-white transition bg-white/5 rounded-lg"
                      >
                        <span>{section.title}</span>
                        <ChevronDownIcon
                          className={`h-4 w-4 transition-transform ${
                            isOpenSection ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                      {isOpenSection && (
                        <div className="space-y-1 px-2.5 py-2">
                          {section.items.map((item) => {
                            const isActive =
                              location.pathname === item.href ||
                              matchesHref(
                                location.pathname,
                                location.search,
                                item.href
                              );
                            return (
                              <div key={item.name} className="space-y-2">
                                <Link
                                  to={item.href}
                                  onClick={() => setIsOpen(false)}
                                  className={`
                                group flex items-center gap-3 px-3 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200
                                ${
                                  isActive
                                    ? "bg-gradient-to-r from-indigo-500 to-blue-500 text-white shadow-lg shadow-indigo-900/40"
                                    : "text-indigo-100/90 hover:bg-white/10 hover:text-white"
                                }
                              `}
                                >
                                  <item.icon
                                    className={`h-5 w-5 transition-colors ${
                                      isActive
                                        ? "text-white"
                                        : "text-indigo-200 group-hover:text-white"
                                    }`}
                                  />
                                  {item.name}
                                </Link>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </nav>

          <div className="relative p-4 border-t border-white/10 bg-white/5 backdrop-blur-sm">
            <div className="w-full flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowAccountMenu((prev) => !prev)}
                className="flex items-center flex-1"
              >
                <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center shadow-md shadow-indigo-900/40">
                  <span className="text-white text-sm font-bold tracking-wide">
                    {(user?.username || "A").slice(0, 1).toUpperCase()}
                  </span>
                </div>
                <div className="ml-3 flex-1 text-left">
                  <p className="text-sm font-semibold text-white truncate">
                    {user?.username || "Tài Khoản"}
                  </p>
                  <p className="text-[11px] text-indigo-100/80 truncate">
                    {user?.role ? `Role: ${user.role}` : "Chưa đăng nhập"}
                  </p>
                </div>
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="ml-3 w-9 h-9 flex items-center justify-center rounded-lg bg-red-500/10 text-red-200 hover:bg-red-500/20 border border-red-500/30 transition"
                title="Đăng Xuất"
              >
                <ArrowRightOnRectangleIcon className="h-5 w-5" />
              </button>
            </div>
            {showAccountMenu && (
              <div className="absolute bottom-16 left-4 right-4 rounded-lg border border-white/15 bg-[#0f1432] shadow-2xl shadow-black/40 z-10">
                <ul className="py-2 text-sm text-indigo-50 space-y-1">
                  {[
                    "Thông tin",
                    "Thêm Admin",
                    "Thêm Quyền",
                    "Đổi Mật Khẩu",
                  ].map((label, index) => (
                    <li key={label}>
                      <button
                        type="button"
                        className="w-full text-left px-4 py-2 hover:bg-white/10"
                        onClick={() => {
                          setShowAccountMenu(false);
                          if (index === 3) {
                            openChangePassword();
                          }
                        }}
                      >
                        {label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
      {showChangePassword && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={closeChangePassword}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-white/15 bg-gradient-to-br from-slate-900/90 via-indigo-900/85 to-slate-950/90 p-6 shadow-[0_20px_60px_-25px_rgba(0,0,0,0.9)] backdrop-blur"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Đổi mật khẩu</h3>
              <button
                type="button"
                onClick={closeChangePassword}
                className="text-white/70 hover:text-white transition rounded-full p-1 focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
                aria-label="Đóng"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={submitPasswordChange} className="space-y-4">
              <label className="block text-sm text-indigo-100">
                <span>Mật khẩu cũ</span>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={passwordForm.currentPassword}
                  onChange={(event) =>
                    setPasswordForm((prev) => ({
                      ...prev,
                      currentPassword: event.target.value,
                    }))
                  }
                  placeholder="Nhập mật khẩu cũ"
                  className="mt-1 w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-indigo-200/60 focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
                />
              </label>

              <label className="block text-sm text-indigo-100">
                <span>Mật khẩu mới</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={passwordForm.newPassword}
                  onChange={(event) =>
                    setPasswordForm((prev) => ({
                      ...prev,
                      newPassword: event.target.value,
                    }))
                  }
                  placeholder="Nhập mật khẩu mới"
                  className="mt-1 w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-indigo-200/60 focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
                />
              </label>

              <label className="block text-sm text-indigo-100">
                <span>Nhập lại mật khẩu mới</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={passwordForm.confirmPassword}
                  onChange={(event) =>
                    setPasswordForm((prev) => ({
                      ...prev,
                      confirmPassword: event.target.value,
                    }))
                  }
                  placeholder="Nhập lại mật khẩu mới"
                  className="mt-1 w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-indigo-200/60 focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
                />
              </label>

              {passwordError && (
                <p className="text-sm text-rose-300">{passwordError}</p>
              )}
              {passwordSuccess && (
                <p className="text-sm text-emerald-200">{passwordSuccess}</p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeChangePassword}
                  disabled={isChangingPassword}
                  className="px-4 py-2 rounded-md border border-white/20 bg-white/10 text-white hover:bg-white/15 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="px-4 py-2 rounded-md bg-indigo-500 text-white hover:bg-indigo-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isChangingPassword ? "Đang xử lý..." : "Xác nhận"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
