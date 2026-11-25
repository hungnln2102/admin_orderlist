import React, { useState } from "react";
import { Shield, KeyRound, Loader2 } from "lucide-react";
import { BaseModal } from "@/shared/components";
import { useNotification } from "@/shared/context/NotificationContext";

interface SidebarProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  username?: string;
  role?: string;
}

export const SidebarProfileModal: React.FC<SidebarProfileModalProps> = ({
  isOpen,
  onClose,
  username,
  role,
}) => {
  const notify = useNotification();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPass, setChangingPass] = useState(false);

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
      onClose();
    } catch (err: any) {
      notify.error(err.message || "Lỗi kết nối máy chủ.", "Thất Bại");
    } finally {
      setChangingPass(false);
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      title="Thông Tin Tài Khoản & Đổi Mật Khẩu"
      icon={<Shield className="w-5 h-5 text-cyan-400" />}
    >
      <div className="space-y-6">
        {/* User Info Card */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-400 via-sky-500 to-indigo-500 p-0.5 flex items-center justify-center text-white font-black text-lg shadow-lg shrink-0">
            <div className="w-full h-full bg-[#0b0f19] rounded-[10px] flex items-center justify-center text-cyan-300 uppercase">
              {username ? username.charAt(0) : "A"}
            </div>
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-white flex items-center gap-2">
              <span className="truncate">{username || "Administrator"}</span>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 uppercase shrink-0">
                {role || "admin"}
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
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Mật Khẩu Hiện Tại *
            </label>
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
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Mật Khẩu Mới (ít nhất 6 ký tự) *
            </label>
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
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Xác Nhận Mật Khẩu Mới *
            </label>
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
              onClick={onClose}
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
    </BaseModal>
  );
};
