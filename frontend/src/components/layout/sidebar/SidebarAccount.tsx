import { useState } from "react";
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
    <div className="relative p-5 mt-auto border-t border-white/5 bg-white/0 backdrop-blur-md rounded-b-[32px]">
      <div className="w-full flex items-center justify-between">
        <button
          type="button"
          onClick={() => setShowAccountMenu((prev) => !prev)}
          className="flex items-center flex-1"
        >
          <div className="group/avatar relative w-11 h-11 transition-all duration-300 transform group-hover/account:scale-105">
            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-full blur-[2px] opacity-40 group-hover/avatar:opacity-60 transition-opacity"></div>
            <div className="relative w-full h-full bg-slate-900 border border-white/20 rounded-full flex items-center justify-center overflow-hidden shadow-[inset_0_2px_4px_rgba(255,255,255,0.1)]">
              <span className="text-white text-base font-black tracking-tighter">
                {(user?.username || "A").slice(0, 1).toUpperCase()}
              </span>
            </div>
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
        <div className="absolute bottom-[calc(100%+8px)] left-4 right-4 glass-panel rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
          <ul className="py-2 text-[13px] font-medium text-indigo-100/90 divide-y divide-white/5">
            {[
              "Thông Tin",
              "Thông Tin Admin",
              "Thông Tin Quản Lý",
              "Thay Đổi Mật Khẩu",
            ].map((label, index) => (
              <li key={label}>
                <button
                  type="button"
                  className="w-full text-left px-4 py-2.5 hover:bg-indigo-500/10 hover:text-white transition-colors"
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
