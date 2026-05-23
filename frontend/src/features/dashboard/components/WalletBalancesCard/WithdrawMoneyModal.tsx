import React, { useEffect, useMemo, useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { ModalPortal } from "@/components/ui/ModalPortal";
import { fetchShopBankAccounts, recordShopBankAccountWithdrawal } from "@/features/shop-bank-accounts/api/shopBankAccountApi";
import { formatShopBankMoneyDraft, parseShopBankMoneyInput } from "@/features/shop-bank-accounts/helpers/formatShopBankMoney";
import type { ShopBankAccountItem } from "@/features/shop-bank-accounts/types";
import * as Helpers from "@/shared/utils";

type WithdrawMoneyModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

const WithdrawMoneyModal: React.FC<WithdrawMoneyModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [accounts, setAccounts] = useState<ShopBankAccountItem[]>([]);
  const [accountId, setAccountId] = useState(0);
  const [amountInput, setAmountInput] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoadingAccounts(true);
    void fetchShopBankAccounts()
      .then((items) => {
        setAccounts(items);
        setAccountId(items[0]?.id ?? 0);
      })
      .catch(() => setAccounts([]))
      .finally(() => setLoadingAccounts(false));
    setAmountInput("");
    setReason("");
    setError(null);
  }, [isOpen]);

  const amountValue = useMemo(() => parseShopBankMoneyInput(amountInput), [amountInput]);

  const closeAndReset = () => {
    if (loading) return;
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!accountId) {
      setError("Vui lòng chọn STK.");
      return;
    }
    if (!amountValue || amountValue <= 0) {
      setError("Số tiền rút phải lớn hơn 0.");
      return;
    }
    setLoading(true);
    try {
      await recordShopBankAccountWithdrawal(accountId, amountValue, reason.trim() || null);
      onSuccess();
      closeAndReset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tạo phiếu rút tiền. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
        <div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 to-slate-950 p-6 shadow-2xl">
          <button
            type="button"
            onClick={closeAndReset}
            className="absolute right-4 top-4 rounded-full p-2 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            disabled={loading}
          >
            <XMarkIcon className="h-5 w-5" />
          </button>

          <h2 className="mb-5 text-xl font-bold text-white">Tạo phiếu rút tiền</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-white/80">STK rút tiền</label>
              <select
                value={accountId || ""}
                onChange={(e) => setAccountId(Number(e.target.value) || 0)}
                className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm text-white"
                disabled={loading || loadingAccounts}
              >
                {accounts.length === 0 ? (
                  <option value="">Chưa có STK</option>
                ) : (
                  accounts.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.accountNumber} · {item.accountHolder}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-white/80">Số tiền rút</label>
              <input
                type="text"
                value={amountInput}
                onChange={(e) => setAmountInput(formatShopBankMoneyDraft(e.target.value))}
                placeholder="0"
                className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white placeholder-white/40 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                disabled={loading}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-white/80">Lý do rút</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Nhập lý do rút tiền..."
                rows={3}
                className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white placeholder-white/40 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                disabled={loading}
              />
            </div>

            {error ? (
              <div className="rounded-lg border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            ) : null}

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={closeAndReset}
                className="flex-1 rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"
                disabled={loading}
              >
                Hủy
              </button>
              <button
                type="submit"
                className="flex-1 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3 text-sm font-semibold text-white hover:from-indigo-500 hover:to-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={loading || loadingAccounts || !accountId}
              >
                {loading ? "Đang lưu..." : "Xác nhận rút"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
};

export default WithdrawMoneyModal;
