import React, { useEffect, useMemo, useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { ModalPortal } from "@/components/ui/ModalPortal";
import { fetchShopBankAccountBalances } from "@/features/shop-bank-accounts/api/shopBankAccountApi";
import type { ShopBankAccountBalanceItem } from "@/features/shop-bank-accounts/types";
import { formatMoneyVnd } from "../utils/creditTransform";
import type { CreditLogItem } from "../types";

type CreditCashoutStkModalProps = {
  isOpen: boolean;
  item: CreditLogItem | null;
  onClose: () => void;
  onConfirm: (shopBankAccountId: number) => void | Promise<void>;
  submitting?: boolean;
};

const CreditCashoutStkModal: React.FC<CreditCashoutStkModalProps> = ({
  isOpen,
  item,
  onClose,
  onConfirm,
  submitting = false,
}) => {
  const [accounts, setAccounts] = useState<ShopBankAccountBalanceItem[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setSelectedId(null);
    setLoadingAccounts(true);
    void fetchShopBankAccountBalances()
      .then((items) => {
        const active = items.filter((row) => row.isActive !== false);
        setAccounts(active);
        const refundAmount = item?.available_amount ?? 0;
        const sufficient = active.find((row) => row.balanceRemaining >= refundAmount);
        const defaultPick = sufficient || active.find((row) => row.isDefault) || active[0];
        setSelectedId(defaultPick ? defaultPick.id : null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Không tải được danh sách STK.");
        setAccounts([]);
      })
      .finally(() => setLoadingAccounts(false));
  }, [isOpen, item?.available_amount]);

  const refundAmount = item?.available_amount ?? 0;
  const selectedAccount = useMemo(
    () => accounts.find((row) => row.id === selectedId) || null,
    [accounts, selectedId]
  );
  const insufficient = useMemo(() => {
    if (!selectedAccount) return false;
    return selectedAccount.balanceRemaining < refundAmount;
  }, [selectedAccount, refundAmount]);

  const closeAndReset = () => {
    if (submitting) return;
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!selectedId) {
      setError("Vui lòng chọn STK để trừ tiền hoàn.");
      return;
    }
    try {
      await onConfirm(selectedId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể xác nhận hoàn tiền.");
    }
  };

  if (!isOpen) return null;

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
        <div className="relative w-full max-w-lg rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 to-slate-950 p-6 shadow-2xl">
          <button
            type="button"
            onClick={closeAndReset}
            className="absolute right-4 top-4 rounded-full p-2 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            disabled={submitting}
          >
            <XMarkIcon className="h-5 w-5" />
          </button>

          <h2 className="mb-1 text-xl font-bold text-white">Xác nhận hoàn tiền</h2>
          <p className="text-xs text-slate-300">
            Chọn STK shop trừ tiền để chuyển hoàn cho khách. Số dư STK sẽ giảm tương ứng và ghi vào sổ cái.
          </p>

          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-slate-200">
            <p>
              Mã credit:{" "}
              <span className="font-semibold text-white">{item?.credit_code || "—"}</span>
            </p>
            <p>
              Khách: <span className="text-white">{item?.customer_name || "—"}</span>
            </p>
            <p>
              Số tiền hoàn:{" "}
              <span className="font-bold text-emerald-300">{formatMoneyVnd(refundAmount)}</span>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-white/80">STK trừ tiền</label>
              {loadingAccounts ? (
                <p className="text-sm text-indigo-200">Đang tải STK...</p>
              ) : accounts.length === 0 ? (
                <p className="text-sm text-rose-300">
                  Chưa có STK active. Vui lòng thêm STK trong Quản lý STK.
                </p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-auto">
                  {accounts.map((row) => {
                    const enough = row.balanceRemaining >= refundAmount;
                    const isSelected = row.id === selectedId;
                    return (
                      <button
                        key={row.id}
                        type="button"
                        onClick={() => setSelectedId(row.id)}
                        disabled={submitting}
                        className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                          isSelected
                            ? "border-emerald-500/60 bg-emerald-500/10"
                            : "border-white/10 bg-white/5 hover:border-white/20"
                        } ${submitting ? "opacity-60 cursor-not-allowed" : ""}`}
                      >
                        <div className="flex items-center justify-between text-sm">
                          <div>
                            <p className="font-semibold text-white">
                              {row.accountNumber || "—"}
                              {row.label ? (
                                <span className="ml-2 text-xs font-normal text-slate-300">
                                  · {row.label}
                                </span>
                              ) : null}
                            </p>
                            <p className="text-xs text-slate-400">{row.accountHolder || "—"}</p>
                          </div>
                          <div className="text-right">
                            <p
                              className={`text-xs ${
                                enough ? "text-emerald-300" : "text-amber-300"
                              }`}
                            >
                              Còn: {formatMoneyVnd(row.balanceRemaining)}
                            </p>
                            {!enough ? (
                              <p className="text-[10px] text-amber-300">Không đủ — sẽ âm</p>
                            ) : null}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {insufficient ? (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                STK đang chọn không đủ số dư. Nếu vẫn xác nhận, số dư sẽ về âm và cần đối soát thủ công.
              </div>
            ) : null}

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
                disabled={submitting}
              >
                Hủy
              </button>
              <button
                type="submit"
                className="flex-1 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-3 text-sm font-semibold text-white hover:from-emerald-500 hover:to-teal-500 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={submitting || loadingAccounts || !selectedId}
              >
                {submitting ? "Đang xử lý..." : "Xác nhận trừ STK"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
};

export default CreditCashoutStkModal;
