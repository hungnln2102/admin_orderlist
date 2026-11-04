import React, { useEffect, useState } from "react";
import { GlassCard } from "@/shared/components/GlassCard";
import { formatVND } from "@/shared/utils";
import { useNotification } from "@/shared/context/NotificationContext";
import {
  PersonalFinancialAccount,
  PersonalSpendingCategory,
  PersonalTransactionDirection,
} from "../types";
import {
  X,
  Check,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { renderCategoryIcon, COLOR_OPTIONS } from "./PersonalCategoryManageModal";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  categories: PersonalSpendingCategory[];
  accounts: PersonalFinancialAccount[];
  onSuccess: (payload: {
    financialAccountId: number;
    direction: PersonalTransactionDirection;
    amount: number;
    merchantNormalized: string;
    categoryId: number | null;
    occurredAt: string;
    note?: string;
  }) => Promise<void>;
}

export const PersonalTransactionCreateModal: React.FC<Props> = ({
  isOpen,
  onClose,
  categories,
  accounts,
  onSuccess,
}) => {
  const notify = useNotification();

  const [direction, setDirection] = useState<PersonalTransactionDirection>("OUTFLOW");
  const [amountStr, setAmountStr] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(() => {
    return categories[0]?.id || null;
  });

  useEffect(() => {
    if (!isOpen) return;
    if (!selectedAccountId || !accounts.some((account) => account.id === selectedAccountId)) {
      setSelectedAccountId(accounts[0]?.id ?? null);
    }
  }, [accounts, isOpen, selectedAccountId]);

  useEffect(() => {
    if (isOpen && !selectedCategoryId && categories[0]) {
      setSelectedCategoryId(categories[0].id);
    }
  }, [categories, isOpen, selectedCategoryId]);
  const [merchant, setMerchant] = useState("");
  const [note, setNote] = useState("");
  const [occurredAt, setOccurredAt] = useState(() => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString().slice(0, 16);
  });

  if (!isOpen) return null;

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    setAmountStr(raw);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    const amountNum = Number(amountStr.replace(/\D/g, ""));
    if (!amountNum || amountNum <= 0) {
      notify.error("Vui lòng nhập số tiền hợp lệ lớn hơn 0");
      return;
    }
    if (!selectedAccountId) {
      notify.error("Vui lòng chọn tài khoản cá nhân");
      return;
    }
    const cleanMerchant = merchant.trim();
    if (!cleanMerchant) {
      notify.error("Vui lòng nhập nơi giao dịch / đối tác");
      return;
    }

    setSaving(true);
    try {
      await onSuccess({
        financialAccountId: selectedAccountId,
        direction,
        amount: amountNum,
        merchantNormalized: cleanMerchant,
        categoryId: selectedCategoryId,
        occurredAt: new Date(occurredAt).toISOString(),
        note: note.trim() || undefined,
      });
      setAmountStr("");
      setMerchant("");
      setNote("");
      notify.success(`Đã ghi nhận ${direction === "INFLOW" ? "khoản thu" : "khoản chi"} ${formatVND(amountNum)} thành công!`);
      onClose();
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Không thể ghi nhận giao dịch");
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                direction === "OUTFLOW"
                  ? "bg-rose-500/10 border-rose-500/20 text-rose-400"
                  : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
              }`}
            >
              {direction === "OUTFLOW" ? (
                <TrendingDown className="w-5 h-5" />
              ) : (
                <TrendingUp className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Ghi Khoản Thu / Chi Thủ Công
              </h3>
              <p className="text-xs text-slate-400">
                Ghi nhận chi tiêu tiền mặt hoặc khoản tiền chưa qua thẻ VPBank
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* 1. Toggle Chi Tiền / Thu Tiền */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setDirection("OUTFLOW")}
              className={`py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                direction === "OUTFLOW"
                  ? "bg-rose-500 text-slate-950 shadow-md shadow-rose-500/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <TrendingDown className="w-4 h-4" />
              <span>Khoản Chi (-)</span>
            </button>
            <button
              type="button"
              onClick={() => setDirection("INFLOW")}
              className={`py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                direction === "INFLOW"
                  ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>Khoản Thu (+)</span>
            </button>
          </div>

          {/* 2. Số Tiền */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">
              Số tiền (VND) *
            </label>
            <div className="relative">
              <input
                type="text"
                autoFocus
                placeholder="0"
                value={amountStr ? Number(amountStr).toLocaleString("vi-VN") : ""}
                onChange={handleAmountChange}
                className={`w-full px-4 py-3 bg-slate-950 border rounded-xl text-lg font-bold font-mono focus:outline-none transition-colors ${
                  direction === "OUTFLOW"
                    ? "border-rose-500/50 text-rose-300 focus:border-rose-500"
                    : "border-emerald-500/50 text-emerald-300 focus:border-emerald-500"
                }`}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                VND
              </span>
            </div>
          </div>

          {/* 3. Nơi Giao Dịch & Danh Mục */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Nơi giao dịch */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">
                Nơi giao dịch / Merchant *
              </label>
              <input
                type="text"
                placeholder="VD: Highlands, Shopee, Phở..."
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Danh mục (Động từ DB) */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">
                Danh mục chi tiêu *
              </label>
              <select
                value={selectedCategoryId || ""}
                onChange={(e) => setSelectedCategoryId(Number(e.target.value) || null)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 4. Tài Khoản Nguồn & Thời Gian */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Tài khoản nguồn */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">
                Tài khoản / Thẻ
              </label>
              <select
                value={selectedAccountId || ""}
                onChange={(e) => setSelectedAccountId(Number(e.target.value) || null)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} ({formatVND(account.balance)})
                  </option>
                ))}
              </select>
            </div>

            {/* Thời gian */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">
                Thời gian phát sinh
              </label>
              <input
                type="datetime-local"
                value={occurredAt}
                onChange={(e) => setOccurredAt(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* 5. Ghi chú */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">
              Ghi chú thêm (Tùy chọn)
            </label>
            <input
              type="text"
              placeholder="VD: Đi ăn với bạn bè, mua quà sinh nhật..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving || accounts.length === 0}
              className={`px-5 py-2 rounded-xl text-xs font-bold text-slate-950 flex items-center gap-2 shadow-lg transition-all cursor-pointer ${
                direction === "OUTFLOW"
                  ? "bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-400 hover:to-pink-400 shadow-rose-500/20"
                  : "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 shadow-emerald-500/20"
              }`}
            >
              <Check className="w-4 h-4" />
              <span>{saving ? "Đang lưu..." : "Ghi nhận giao dịch"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


