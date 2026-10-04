import React from "react";
import { Building2, Wallet, XCircle, Loader2 } from "lucide-react";
import { PaymentTabKey, BankAccountItem, UsdtWalletItem, WalletFormData } from "../types";

interface WalletCreateEditModalProps {
  open: boolean;
  activeTab: PaymentTabKey;
  editingItem: BankAccountItem | UsdtWalletItem | null;
  formData: WalletFormData;
  submitting: boolean;
  onClose: () => void;
  onFormChange: (data: WalletFormData) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const WalletCreateEditModal: React.FC<WalletCreateEditModalProps> = ({
  open,
  activeTab,
  editingItem,
  formData,
  submitting,
  onClose,
  onFormChange,
  onSubmit,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            {activeTab === "bank" ? <Building2 className="w-5 h-5 text-cyan-400" /> : <Wallet className="w-5 h-5 text-purple-400" />}
            {editingItem ? (activeTab === "bank" ? "Chỉnh Sửa Tài Khoản Ngân Hàng" : "Chỉnh Sửa Ví USDT") : (activeTab === "bank" ? "Thêm Tài Khoản Ngân Hàng Mới" : "Thêm Ví USDT Mới")}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white cursor-pointer">
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-4">
          {activeTab === "bank" ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Số Tài Khoản (STK) *</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: 9183400998"
                    value={formData.accountNumber}
                    onChange={(e) => onFormChange({ ...formData, accountNumber: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Chủ Tài Khoản *</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: NGO LE NGOC HUNG"
                    value={formData.accountHolder}
                    onChange={(e) => onFormChange({ ...formData, accountHolder: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Tên Ngân Hàng</label>
                  <input
                    type="text"
                    placeholder="VD: MBBank"
                    value={formData.bankDisplayName}
                    onChange={(e) => onFormChange({ ...formData, bankDisplayName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Mã Ngân Hàng (Short Code)</label>
                  <input
                    type="text"
                    placeholder="VD: MB"
                    value={formData.bankShortCode}
                    onChange={(e) => onFormChange({ ...formData, bankShortCode: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Mã BIN Ngân Hàng</label>
                  <input
                    type="text"
                    placeholder="VD: 970422"
                    value={formData.bankBin}
                    onChange={(e) => onFormChange({ ...formData, bankBin: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Tiền tố ghi chú QR</label>
                  <input
                    type="text"
                    placeholder="VD: MAV"
                    value={formData.qrNotePrefix}
                    onChange={(e) => onFormChange({ ...formData, qrNotePrefix: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nhãn đại diện / Ghi chú</label>
                <input
                  type="text"
                  placeholder="VD: STK Chính Mavryk Shop"
                  value={formData.label}
                  onChange={(e) => onFormChange({ ...formData, label: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Địa Chỉ Ví USDT *</label>
                <input
                  type="text"
                  required
                  placeholder="VD: T9zX8yK2mN4pL7qR0sV5wX1yZ3aB5cD7eF"
                  value={formData.walletAddress}
                  onChange={(e) => onFormChange({ ...formData, walletAddress: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-purple-500 focus:outline-none font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Mạng Lưới (Network)</label>
                  <select
                    value={formData.network}
                    onChange={(e) => onFormChange({ ...formData, network: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-purple-500 focus:outline-none"
                  >
                    <option value="TRC20">TRC20 (Tron Network)</option>
                    <option value="BEP20">BEP20 (Binance Smart Chain)</option>
                    <option value="ERC20">ERC20 (Ethereum)</option>
                    <option value="POLYGON">POLYGON (Polygon)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Nhãn / Ghi chú</label>
                  <input
                    type="text"
                    placeholder="VD: Ví USDT chính TRC20"
                    value={formData.label}
                    onChange={(e) => onFormChange({ ...formData, label: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>
            </>
          )}

          <div className="flex items-center gap-6 pt-2">
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isDefault}
                onChange={(e) => onFormChange({ ...formData, isDefault: e.target.checked })}
                className="rounded border-slate-700 text-cyan-500 focus:ring-0"
              />
              <span>Đặt làm mặc định</span>
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => onFormChange({ ...formData, isActive: e.target.checked })}
                className="rounded border-slate-700 text-emerald-500 focus:ring-0"
              />
              <span>Kích hoạt (Bật nhận tiền)</span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white bg-slate-800 rounded-xl cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-sky-500 rounded-xl flex items-center gap-2 cursor-pointer"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{editingItem ? "Cập Nhật" : "Tạo Mới"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
