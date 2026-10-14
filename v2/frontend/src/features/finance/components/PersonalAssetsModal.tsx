import React, { useState, useEffect } from "react";
import { PersonalAsset, PersonalAssetType } from "../types";
import { X, Save, DollarSign, Wallet } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: any) => Promise<void>;
  editingItem?: PersonalAsset | null;
  defaultType?: PersonalAssetType;
}

export const PersonalAssetsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSave,
  editingItem,
  defaultType = "SAVINGS",
}) => {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState<number | "">("");
  const [type, setType] = useState<PersonalAssetType>(defaultType);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (editingItem) {
      setName(editingItem.name);
      setAmount(editingItem.amount);
      setType(editingItem.type);
      setNote(editingItem.note || "");
    } else {
      setName("");
      setAmount("");
      setType(defaultType);
      setNote("");
    }
  }, [editingItem, defaultType, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !amount) {
      alert("Vui lòng điền tên và số tiền");
      return;
    }

    try {
      setSubmitting(true);
      await onSave({
        name: name.trim(),
        type,
        amount: Number(amount),
        note: note.trim(),
      });
      onClose();
    } catch (err: any) {
      alert("Lỗi khi lưu mục: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Wallet className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white">
              {editingItem ? "Sửa Bản Ghi Tài Chính" : "Thêm Mục Tài Sản / Nợ Cá Nhân"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Loại mục tài chính
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as PersonalAssetType)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-400"
            >
              <option value="SAVINGS">Quỹ Tích Lũy / Tiết kiệm (Tài sản)</option>
              <option value="CASH_BANK">Tiền mặt / Tài khoản cá nhân (Tài sản)</option>
              <option value="GOLD_INVESTMENT">Vàng / Đầu tư / Crypto (Tài sản)</option>
              <option value="DEBT_PAYABLE">Nợ cá nhân phải trả (Nợ phải trả)</option>
              <option value="DEBT_RECEIVABLE">Khoản cho vay (Phải thu)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Tên tài sản / Khoản nợ <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              placeholder="VD: Quỹ khẩn cấp Techcombank, Vàng PNJ 2 chỉ, Nợ anh Nam..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-400"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Số tiền (₫) <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                placeholder="50000000"
                value={amount}
                onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : "")}
                required
                min="0"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-400 pl-9 font-mono"
              />
              <DollarSign className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Ghi chú thêm
            </label>
            <textarea
              placeholder="Ghi chú thêm thông tin..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-400 resize-none"
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl text-sm font-bold bg-purple-500 hover:bg-purple-400 text-white flex items-center gap-2 shadow-lg shadow-purple-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {submitting ? "Đang lưu..." : editingItem ? "Cập nhật" : "Lưu vào sổ"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
