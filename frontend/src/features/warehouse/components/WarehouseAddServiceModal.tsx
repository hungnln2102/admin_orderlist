import React, { useState, useEffect } from "react";
import {
  PlusCircle,
  X,
  Eye,
  EyeOff,
  Calendar,
  KeyRound,
  Mail,
  ShieldCheck,
  FileText,
  Loader2,
  PackageCheck,
} from "lucide-react";
import {
  WarehouseAccountItem,
  WarehouseAddServiceFormData,
  ServiceNameCategoryItem,
} from "../types";
import { format2FAChunks } from "./warehouseRowUtils";

interface WarehouseAddServiceModalProps {
  open: boolean;
  account: WarehouseAccountItem | null;
  catalogItems?: ServiceNameCategoryItem[];
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (formData: WarehouseAddServiceFormData) => Promise<void>;
}

export const WarehouseAddServiceModal: React.FC<WarehouseAddServiceModalProps> = ({
  open,
  account,
  catalogItems = [],
  isSubmitting = false,
  onClose,
  onSubmit,
}) => {
  const [formData, setFormData] = useState<WarehouseAddServiceFormData>({
    serviceName: "",
    category: "",
    password: "",
    backupEmail: "",
    twoFa: "",
    expiresAt: "",
    status: "AVAILABLE",
    note: "",
  });

  const [customServiceName, setCustomServiceName] = useState("");
  const [isCustomService, setIsCustomService] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (open) {
      const defaultCatalog = catalogItems.length > 0 ? catalogItems[0].name : "Adobe All Apps 12M Slot";
      const foundCat = catalogItems.find((c) => c.name === defaultCatalog);
      setFormData({
        serviceName: defaultCatalog,
        category: foundCat ? foundCat.category : defaultCatalog,
        password: "",
        backupEmail: "",
        twoFa: "",
        expiresAt: "",
        status: "AVAILABLE",
        note: "",
      });
      setIsCustomService(false);
      setCustomServiceName("");
      setShowPassword(false);
    }
  }, [open, catalogItems]);

  if (!open || !account) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalServiceName = isCustomService
      ? customServiceName.trim()
      : formData.serviceName.trim();

    if (!finalServiceName) {
      alert("Vui lòng chọn hoặc nhập tên loại dịch vụ!");
      return;
    }

    await onSubmit({
      ...formData,
      serviceName: finalServiceName,
      category: formData.category || finalServiceName,
    });
  };

  const handleAddDays = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    setFormData((prev) => ({ ...prev, expiresAt: `${yyyy}-${mm}-${dd}` }));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl bg-slate-900/95 border border-indigo-500/30 shadow-2xl p-5 sm:p-7 space-y-5 animate-in fade-in zoom-in-95 duration-150">
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="min-w-0 flex-1">
            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2 tracking-tight">
              <PlusCircle className="w-5 h-5 text-indigo-400 shrink-0" />
              <span>Thêm Dịch Vụ Mới Vào Tài Khoản</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5 truncate">
              <span>Tài khoản gốc:</span>
              <span className="font-mono font-semibold text-indigo-300 truncate">
                {account.account}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0 ml-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
          {/* LOẠI DỊCH VỤ */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <PackageCheck className="w-3.5 h-3.5 text-indigo-400" />
                <span>Loại Dịch Vụ (*)</span>
              </label>
              <button
                type="button"
                onClick={() => setIsCustomService(!isCustomService)}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
              >
                {isCustomService ? "Chọn từ danh mục" : "+ Nhập tên khác"}
              </button>
            </div>

            {isCustomService ? (
              <input
                type="text"
                value={customServiceName}
                onChange={(e) => setCustomServiceName(e.target.value)}
                placeholder="Ví dụ: ChatGPT Plus 1 Slot, Midjourney Pro..."
                required
                className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-indigo-500/50 rounded-xl text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-400 transition-colors"
              />
            ) : (
              <select
                value={formData.serviceName}
                onChange={(e) => {
                  const selectedName = e.target.value;
                  const foundCat = catalogItems.find((c) => c.name === selectedName);
                  setFormData({
                    ...formData,
                    serviceName: selectedName,
                    category: foundCat ? foundCat.category : selectedName,
                  });
                }}
                className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
              >
                {catalogItems.length > 0 ? (
                  catalogItems.map((item) => (
                    <option key={item.id} value={item.name}>
                      {item.name} {item.category ? `(${item.category})` : ""}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="Adobe All Apps 12M Slot">Adobe All Apps 12M Slot</option>
                    <option value="Canva Pro Team Slot">Canva Pro Team Slot</option>
                    <option value="Netflix Premium 4K Slot">Netflix Premium 4K Slot</option>
                    <option value="ChatGPT Plus Shared Slot">ChatGPT Plus Shared Slot</option>
                    <option value="Mail">Mail</option>
                  </>
                )}
              </select>
            )}
          </div>

          {/* MẬT KHẨU */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
              <span>Mật Khẩu Dịch Vụ</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                placeholder="Nhập mật khẩu dịch vụ này..."
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

          {/* 2FA SECRET & EMAIL BACKUP */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                <span>Mã 2FA Secret Key</span>
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
                placeholder="email_backup@gmail.com"
                className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-slate-100 font-mono text-xs placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          {/* HẠN DÙNG & TRẠNG THÁI */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-purple-400" />
                  <span>Hạn Sử Dụng</span>
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleAddDays(30)}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 cursor-pointer"
                  >
                    +30 ngày
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddDays(365)}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 cursor-pointer"
                  >
                    +1 năm
                  </button>
                </div>
              </div>
              <input
                type="date"
                value={formData.expiresAt}
                onChange={(e) =>
                  setFormData({ ...formData, expiresAt: e.target.value })
                }
                className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Trạng Thái Slot
              </label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    status: e.target.value as any,
                  })
                }
                className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-indigo-500 transition-colors"
              >
                <option value="AVAILABLE">TỒN KHO (AVAILABLE)</option>
                <option value="IN_USE">ĐANG SỬ DỤNG (IN_USE)</option>
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
              placeholder="Ghi chú về nguồn gốc, chi tiết gói hoặc slot này..."
              className="w-full px-3.5 py-2 bg-slate-950/80 border border-slate-700/80 rounded-xl text-slate-100 text-xs placeholder:text-slate-600 focus:outline-none focus:border-slate-500 transition-colors"
            />
          </div>

          {/* ACTIONS */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-xs font-semibold text-white shadow-lg shadow-indigo-500/25 active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang lưu slot...</span>
                </>
              ) : (
                <>
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Thêm Dịch Vụ</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
