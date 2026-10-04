import React from "react";
import { Archive, X } from "lucide-react";
import { WarehouseAccountFormData } from "../types";

interface WarehouseCreateModalProps {
  open: boolean;
  formData: WarehouseAccountFormData;
  onClose: () => void;
  onFormChange: (data: WarehouseAccountFormData) => void;
  onSubmit: () => void;
}

export const WarehouseCreateModal: React.FC<WarehouseCreateModalProps> = ({
  open,
  formData,
  onClose,
  onFormChange,
  onSubmit,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-4 sm:p-6 space-y-4 animate-in fade-in zoom-in duration-150">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <Archive className="w-5 h-5 text-blue-400" />
            <span>Thêm Tài Khoản Kho Mới</span>
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 text-xs sm:text-sm">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Email Tài Khoản Kho (*)</label>
            <input
              type="text"
              placeholder="Ví dụ: adobe_team01@mavrykstore.com"
              value={formData.account}
              onChange={(e) => onFormChange({ ...formData, account: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Loại Dịch Vụ (*)</label>
            <select
              value={formData.serviceName}
              onChange={(e) => onFormChange({ ...formData, serviceName: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-blue-500"
            >
              <option value="Adobe All Apps 12M Slot">Adobe All Apps 12M Slot</option>
              <option value="Canva Pro Team Slot">Canva Pro Team Slot</option>
              <option value="Netflix Premium 4K Slot">Netflix Premium 4K Slot</option>
              <option value="ChatGPT Plus Shared Slot">ChatGPT Plus Shared Slot</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Mật khẩu</label>
              <input
                type="text"
                placeholder="Nhập mật khẩu..."
                value={formData.password}
                onChange={(e) => onFormChange({ ...formData, password: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Mã 2FA Secret Key</label>
              <input
                type="text"
                placeholder="Mã 2FA (nếu có)..."
                value={formData.twoFa}
                onChange={(e) => onFormChange({ ...formData, twoFa: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Email Backup</label>
              <input
                type="text"
                placeholder="Email khôi phục..."
                value={formData.backupEmail}
                onChange={(e) => onFormChange({ ...formData, backupEmail: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Ngày Hết Hạn</label>
              <input
                type="text"
                placeholder="Ví dụ: 30/12/2027"
                value={formData.expiresAt}
                onChange={(e) => onFormChange({ ...formData, expiresAt: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
          >
            Hủy Bỏ
          </button>
          <button
            onClick={onSubmit}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/25 transition-all cursor-pointer"
          >
            Lưu Tài Khoản
          </button>
        </div>
      </div>
    </div>
  );
};
