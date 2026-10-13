import React, { useState, useEffect } from "react";
import {
  Pencil,
  X,
  Eye,
  EyeOff,
  Copy,
  Check,
  Calendar,
  KeyRound,
  Mail,
  ShieldCheck,
  FileText,
  Loader2,
} from "lucide-react";
import {
  WarehouseAccountItem,
  WarehouseServiceSlot,
  WarehouseSlotEditFormData,
  WarehouseSlotStatus,
} from "../types";
import { format2FAChunks, getServiceBrandStyle } from "./warehouseRowUtils";

interface WarehouseEditSlotModalProps {
  open: boolean;
  account: WarehouseAccountItem | null;
  slot: WarehouseServiceSlot | null;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (formData: WarehouseSlotEditFormData) => Promise<void>;
}

export const WarehouseEditSlotModal: React.FC<WarehouseEditSlotModalProps> = ({
  open,
  account,
  slot,
  isSubmitting = false,
  onClose,
  onSubmit,
}) => {
  const [formData, setFormData] = useState<WarehouseSlotEditFormData>({
    accountUsername: "",
    serviceName: "",
    password: "",
    backupEmail: "",
    twoFa: "",
    expiresAt: "",
    status: "AVAILABLE",
    note: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    if (open && slot && account) {
      // Determine initial date: prefer raw_expires_at (YYYY-MM-DD), fallback to parsing expires_at
      let initialExpires = slot.raw_expires_at || "";
      if (!initialExpires && slot.expires_at) {
        const parts = slot.expires_at.split("/");
        if (parts.length === 3) {
          initialExpires = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
        }
      }

      setFormData({
        accountUsername: account.account || "",
        serviceName: slot.display_name || slot.category || "Dịch vụ",
        password: slot.password || "",
        backupEmail: slot.backup_email || "",
        twoFa: slot.two_fa || "",
        expiresAt: initialExpires,
        status: slot.status || "AVAILABLE",
        note: slot.note || "",
      });
      setShowPassword(false);
    }
  }, [open, account, slot]);

  if (!open || !slot || !account) return null;

  const brand = getServiceBrandStyle(
    slot.display_name || slot.category,
    formData.status === "AVAILABLE"
  );

  const handleCopy = (text: string, fieldKey: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    setTimeout(() => setCopiedField(null), 1500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl bg-slate-900/95 border border-amber-500/20 shadow-2xl shadow-amber-500/10 p-5 sm:p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150 text-slate-200">
        {/* MODAL HEADER */}
        <div className="flex items-start justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 shadow-inner">
              <Pencil className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Chỉnh Sửa Dịch Vụ Kho
                </h3>
                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${brand.badgeClass}`}
                >
                  {formData.serviceName}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5 truncate max-w-[280px] sm:max-w-sm">
                Tài khoản: {account.account}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL FORM */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
          {/* EMAIL TÀI KHOẢN MẸ */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-indigo-400" />
              <span>Email Tài Khoản Kho (Username)</span>
            </label>
            <input
              type="text"
              value={formData.accountUsername}
              onChange={(e) =>
                setFormData({ ...formData, accountUsername: e.target.value })
              }
              className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-slate-100 font-mono text-xs placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
              placeholder="ví dụ: user@gmail.com"
            />
          </div>

          {/* MẬT KHẨU */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                <span>Mật Khẩu Dịch Vụ</span>
              </span>
              {formData.password && (
                <button
                  type="button"
                  onClick={() => handleCopy(formData.password, "pass")}
                  className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                >
                  {copiedField === "pass" ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400 font-semibold">Đã copy</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Sao chép</span>
                    </>
                  )}
                </button>
              )}
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                placeholder="Nhập mật khẩu..."
                className="w-full pl-3.5 pr-10 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-slate-100 font-mono text-xs placeholder:text-slate-600 focus:outline-none focus:border-amber-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
                title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* 2FA SECRET & EMAIL BACKUP (2 COLS) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Mã 2FA Secret Key</span>
                </span>
                {formData.twoFa && (
                  <button
                    type="button"
                    onClick={() => handleCopy(formData.twoFa, "2fa")}
                    className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    {copiedField === "2fa" ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                )}
              </label>
              <input
                type="text"
                value={formData.twoFa}
                onChange={(e) =>
                  setFormData({ ...formData, twoFa: e.target.value })
                }
                placeholder="ví dụ: JBSWY3DPEHPK3PXP"
                className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-slate-100 font-mono text-xs placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 transition-colors"
              />
              {formData.twoFa && (
                <div className="mt-1 text-[10px] font-mono text-cyan-400/90 tracking-wider">
                  {format2FAChunks(formData.twoFa)}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-blue-400" />
                <span>Email Backup Khôi Phục</span>
              </label>
              <input
                type="text"
                value={formData.backupEmail}
                onChange={(e) =>
                  setFormData({ ...formData, backupEmail: e.target.value })
                }
                placeholder="ví dụ: recovery@domain.com"
                className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-slate-100 font-mono text-xs placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          {/* NGÀY HẾT HẠN & TRẠNG THÁI (2 COLS) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-purple-400" />
                <span>Ngày Hết Hạn Dịch Vụ</span>
              </label>
              <input
                type="date"
                value={formData.expiresAt}
                onChange={(e) =>
                  setFormData({ ...formData, expiresAt: e.target.value })
                }
                className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-slate-100 font-mono text-xs focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Trạng Thái Slot</span>
              </label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    status: e.target.value as WarehouseSlotStatus,
                  })
                }
                className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer"
              >
                <option value="AVAILABLE">TỒN KHO (Sẵn sàng bán)</option>
                <option value="IN_USE">ĐANG SỬ DỤNG (Đã gán khách)</option>
                <option value="EXPIRED">HẾT HẠN (Cần gia hạn/thay thế)</option>
                <option value="RESERVED">GIỮ CHỖ (Đang xử lý)</option>
              </select>
            </div>
          </div>

          {/* GHI CHÚ */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>Ghi Chú Dịch Vụ</span>
            </label>
            <textarea
              rows={2}
              value={formData.note}
              onChange={(e) =>
                setFormData({ ...formData, note: e.target.value })
              }
              placeholder="Nhập ghi chú cho slot này..."
              className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-slate-100 text-xs placeholder:text-slate-600 focus:outline-none focus:border-slate-500 transition-colors resize-none"
            />
          </div>

          {/* ACTIONS FOOTER */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer disabled:opacity-50"
            >
              Hủy Bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white shadow-lg shadow-amber-500/25 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Lưu Thay Đổi</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
