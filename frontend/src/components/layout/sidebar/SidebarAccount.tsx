import React, { useState } from "react";
import { ArrowRightOnRectangleIcon } from "@heroicons/react/24/outline";

type SidebarUser = {
  username?: string | null;
  role?: string | null;
} | null;

type SidebarAccountProps = {
  user: SidebarUser;
  onLogout: () => void;
  onChangePassword: () => void;
};

const SidebarAccount: React.FC<SidebarAccountProps> = ({
  user,
  onLogout,
  onChangePassword,
}) => {
  const [showAccountMenu, setShowAccountMenu] = useState(false);

  return (
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
          onClick={onLogout}
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
              "Thông Tin",
              "Thông Tin Admin",
              "Thông Tin Quản Lý",
              "Thay Đổi Mật Khẩu",
            ].map((label, index) => (
              <li key={label}>
                <button
                  type="button"
                  className="w-full text-left px-4 py-2 hover:bg-white/10"
                  onClick={() => {
                    setShowAccountMenu(false);
                    if (index === 3) {
                      onChangePassword();
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
  );
};

export default SidebarAccount;
