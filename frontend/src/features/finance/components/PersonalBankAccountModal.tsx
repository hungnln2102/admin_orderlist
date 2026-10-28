import React, { useState, useEffect } from "react";
import { Building2, XCircle, Loader2 } from "lucide-react";
import { useNotification } from "@/shared/context/NotificationContext";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingItem?: any | null;
}

const POPULAR_BANKS = [
  { name: "MBBank", shortCode: "MB", bin: "970422" },
  { name: "Techcombank", shortCode: "TCB", bin: "970407" },
  { name: "Vietcombank", shortCode: "VCB", bin: "970436" },
  { name: "ACB", shortCode: "ACB", bin: "970416" },
  { name: "VPBank", shortCode: "VPB", bin: "970432" },
  { name: "TPBank", shortCode: "TPB", bin: "970423" },
  { name: "BIDV", shortCode: "BIDV", bin: "970418" },
  { name: "Sacombank", shortCode: "STB", bin: "970403" },
  { name: "VietinBank", shortCode: "CTG", bin: "970415" },
  { name: "Agribank", shortCode: "AGR", bin: "970405" },
  { name: "Momo", shortCode: "MOMO", bin: "MOMO" },
  { name: "ZaloPay", shortCode: "ZLP", bin: "ZLP" },
];

const formatAmountInput = (value: string) => {
  const digits = value.replace(/\D/g, "");
  return digits ? Number(digits).toLocaleString("vi-VN") : "";
};

const parseAmountInput = (value: string) => Number(value.replace(/\D/g, "")) || 0;

export const PersonalBankAccountModal: React.FC<Props> = ({ isOpen, onClose, onSuccess, editingItem }) => {
  const notify = useNotification();
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    accountNumber: "",
    accountHolder: "",
    bankDisplayName: "MBBank",
    bankShortCode: "MB",
    bankBin: "970422",
    qrNotePrefix: "PERS",
    label: "",
    balance: "",
  });

  useEffect(() => {
    if (isOpen) {
      if (editingItem) {
        setFormData({
          accountNumber: editingItem.accountNumber || editingItem.account_number || "",
          accountHolder: editingItem.accountHolder || editingItem.account_holder || "",
          bankDisplayName: editingItem.bankDisplayName || editingItem.bank_display_name || "MBBank (Ngân hàng Quân Đội)",
          bankShortCode: editingItem.bankShortCode || editingItem.bank_short_code || "MB",
          bankBin: editingItem.bankBin || editingItem.bank_bin || "970422",
          qrNotePrefix: editingItem.qrNotePrefix || editingItem.qr_note_prefix || "PERS",
          label: (editingItem.label && editingItem.label !== "Tài khoản cá nhân") ? editingItem.label : "",
          balance: formatAmountInput(String(editingItem.amount !== undefined ? editingItem.amount : (editingItem.balance !== undefined ? editingItem.balance : 0))),
        });
      } else {
        setFormData({
          accountNumber: "",
          accountHolder: "",
          bankDisplayName: "MBBank (Ngân hàng Quân Đội)",
          bankShortCode: "MB",
          bankBin: "970422",
          qrNotePrefix: "PERS",
          label: "",
          balance: "",
        });
      }
    }
  }, [isOpen, editingItem]);

  if (!isOpen) return null;

  const handleBankSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedName = e.target.value;
    const found = POPULAR_BANKS.find((b) => b.name === selectedName);
    if (found) {
      setFormData({
        ...formData,
        bankDisplayName: found.name,
        bankShortCode: found.shortCode,
        bankBin: found.bin,
      });
    }
  };

  const handleBalanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatAmountInput(e.target.value);
    setFormData({ ...formData, balance: formatted });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const targetId = editingItem ? (editingItem.bankAccountId || (editingItem.id > 100000 ? editingItem.id - 1000000 : editingItem.id)) : null;
      const url = editingItem ? `/api/wallets/shop-bank-accounts/${targetId}` : "/api/wallets/shop-bank-accounts";
      const method = editingItem ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          balance: parseAmountInput(formData.balance),
          accountScope: "PERSONAL",
          isActive: true,
          isDefault: false,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "Không thể lưu tài khoản ngân hàng cá nhân.");

      notify.success(editingItem ? "Đã cập nhật tài khoản cá nhân thành công!" : "Đã thêm tài khoản ngân hàng cá nhân thành công!", "Thành Công");
      onSuccess();
      onClose();
    } catch (err: any) {
      notify.error(err.message || "Lỗi kết nối máy chủ.", "Thất Bại");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-cyan-400" />
            {editingItem ? "Chỉnh Sửa Tài Khoản Cá Nhân" : "Thêm Tài Khoản Ngân Hàng Cá Nhân"}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white cursor-pointer">
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Số Tài Khoản (STK) *</label>
              <input
                type="text"
                required
                placeholder="VD: 1903xxxxxx"
                value={formData.accountNumber}
                onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Chủ Tài Khoản *</label>
              <input
                type="text"
                required
                placeholder="VD: NGUYEN VAN A"
                value={formData.accountHolder}
                onChange={(e) => setFormData({ ...formData, accountHolder: e.target.value })}
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Số Dư / Số Tiền (₫) *</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs text-slate-500 font-mono">₫</span>
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  placeholder="0"
                  value={formData.balance}
                  onChange={handleBalanceChange}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2 pl-7 pr-3 text-xs font-mono font-bold text-emerald-400 focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Nhãn Hiển Thị / Ghi Chú</label>
              <input
                type="text"
                placeholder="VD: MB Chi tiêu, VCB Lương (không bắt buộc)"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-cyan-600 text-white hover:bg-cyan-500 transition-colors shadow-lg shadow-cyan-600/30 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{editingItem ? "Cập Nhật Tài Khoản" : "Lưu Tài Khoản Cá Nhân"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
