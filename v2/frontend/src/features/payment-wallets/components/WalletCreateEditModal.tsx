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

const POPULAR_BANKS = [
  { name: "MBBank (Ngân hàng Quân Đội)", shortCode: "MB", bin: "970422" },
  { name: "Techcombank (TCB)", shortCode: "TCB", bin: "970407" },
  { name: "Vietcombank (VCB)", shortCode: "VCB", bin: "970436" },
  { name: "ACB (Á Châu)", shortCode: "ACB", bin: "970416" },
  { name: "VPBank (VPB)", shortCode: "VPB", bin: "970432" },
  { name: "TPBank (Tiên Phong)", shortCode: "TPB", bin: "970423" },
  { name: "BIDV (Đầu tư và Phát triển)", shortCode: "BIDV", bin: "970418" },
  { name: "Sacombank", shortCode: "STB", bin: "970403" },
  { name: "VietinBank", shortCode: "CTG", bin: "970415" },
  { name: "Agribank (Nông nghiệp)", shortCode: "AGR", bin: "970405" },
  { name: "Momo (Ví điện tử)", shortCode: "MOMO", bin: "MOMO" },
  { name: "ZaloPay (Ví điện tử)", shortCode: "ZLP", bin: "ZLP" },
];

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

  const handleBankSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedName = e.target.value;
    const found = POPULAR_BANKS.find((b) => b.name === selectedName);
    if (found) {
      onFormChange({
        ...formData,
        bankDisplayName: found.name,
        bankShortCode: found.shortCode,
        bankBin: found.bin,
      });
    }
  };

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

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Chọn Ngân Hàng / Ví *</label>
                <select
                  value={formData.bankDisplayName}
                  onChange={handleBankSelect}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:border-cyan-500 focus:outline-none cursor-pointer"
                >
                  {POPULAR_BANKS.map((b) => (
                    <option key={b.shortCode} value={b.name}>
                      {b.name} ({b.shortCode})
                    </option>
                  ))}
                </select>
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

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Phạm Vi Tài Khoản</label>
                <select
                  value={formData.accountScope || "SHOP"}
                  onChange={(e) => onFormChange({ ...formData, accountScope: e.target.value as "SHOP" | "PERSONAL" })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                >
                  <option value="SHOP">🏢 Tài khoản kinh doanh Shop (Nhận tiền, thanh toán đơn)</option>
                  <option value="PERSONAL">💳 Tài khoản / Ngân hàng cá nhân (Cash Bank / Thanh khoản)</option>
                </select>
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
