import React, { useEffect, useState } from "react";
import { ModalPortal } from "@/components/ui/ModalPortal";
import GradientButton from "@/components/ui/GradientButton";
import {
  formatShopBankMoney,
  formatShopBankMoneyDraft,
  parseShopBankMoneyInput,
} from "../helpers/formatShopBankMoney";
import type { ShopBankAccountBalanceItem } from "../types";

type Props = {
  open: boolean;
  items: ShopBankAccountBalanceItem[];
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (accountId: number, amount: number) => Promise<void>;
};

const labelCls = "block text-xs font-semibold uppercase tracking-wider text-white/50 mb-1.5";
const inputCls =
  "w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white focus:border-emerald-400/40 focus:outline-none focus:ring-1 focus:ring-emerald-500/20";
const selectCls = `${inputCls} appearance-none`;

export function ShopBankWithdrawModal({
  open,
  items,
  submitting = false,
  onClose,
  onSubmit,
}: Props) {
  const [accountId, setAccountId] = useState<number>(0);
  const [amountDraft, setAmountDraft] = useState("");

  useEffect(() => {
    if (!open) return;
    const first = items[0];
    setAccountId(first?.id ?? 0);
    setAmountDraft("");
  }, [open, items]);

  if (!open) return null;

  const selected = items.find((item) => item.id === accountId) ?? null;
  const withdrawAmount = parseShopBankMoneyInput(amountDraft);
  const balanceAfter = selected ? selected.balanceRemaining - withdrawAmount : 0;
  const exceedsBalance = selected != null && withdrawAmount > selected.balanceRemaining;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!accountId || withdrawAmount <= 0) return;
    await onSubmit(accountId, withdrawAmount);
  };

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/85 p-4"
        onClick={onClose}
        role="presentation"
      >
        <form
          className="w-full max-w-md rounded-[28px] border border-white/10 bg-slate-900 p-6 space-y-5"
          onClick={(e) => e.stopPropagation()}
          onSubmit={handleSubmit}
        >
          <div>
            <h2 className="text-xl font-bold text-white">Rút tiền từ STK</h2>
            <p className="mt-2 text-sm text-white/60">
              Chọn tài khoản và nhập số tiền vừa rút khỏi bank. Hệ thống cộng dồn vào cột đã rút.
            </p>
          </div>

          {items.length === 0 ? (
            <p className="text-sm text-rose-300">Chưa có STK để rút tiền.</p>
          ) : (
            <>
              <div>
                <label htmlFor="withdraw-stk" className={labelCls}>
                  Tài khoản
                </label>
                <select
                  id="withdraw-stk"
                  className={selectCls}
                  value={accountId || ""}
                  onChange={(event) => setAccountId(Number(event.target.value) || 0)}
                  disabled={submitting}
                >
                  {items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.accountNumber} · {item.accountHolder}
                      {item.isDefault ? " (mặc định)" : ""}
                    </option>
                  ))}
                </select>
                {selected ? (
                  <p className="mt-2 text-xs text-white/45">
                    Số dư hiện tại:{" "}
                    <span className="font-semibold text-emerald-200 tabular-nums">
                      {formatShopBankMoney(selected.balanceRemaining)} VND
                    </span>
                  </p>
                ) : null}
              </div>

              <div>
                <label htmlFor="withdraw-amount" className={labelCls}>
                  Số tiền rút (VND)
                </label>
                <input
                  id="withdraw-amount"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="Ví dụ: 5.000.000"
                  className={`${inputCls} font-mono tabular-nums text-right`}
                  value={amountDraft}
                  onChange={(event) =>
                    setAmountDraft(formatShopBankMoneyDraft(event.target.value))
                  }
                  disabled={submitting}
                />
                {withdrawAmount > 0 && selected ? (
                  <p
                    className={`mt-2 text-xs ${
                      exceedsBalance ? "text-amber-300" : "text-white/45"
                    }`}
                  >
                    Số dư sau rút:{" "}
                    <span className="font-semibold tabular-nums">
                      {formatShopBankMoney(balanceAfter)} VND
                    </span>
                    {exceedsBalance ? " · Vượt số dư CK hiện tại" : null}
                  </p>
                ) : null}
              </div>
            </>
          )}

          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-white/50"
              disabled={submitting}
            >
              Hủy
            </button>
            <GradientButton
              type="submit"
              disabled={submitting || items.length === 0 || withdrawAmount <= 0}
              className="!rounded-2xl"
            >
              {submitting ? "Đang ghi nhận…" : "Xác nhận rút"}
            </GradientButton>
          </div>
        </form>
      </div>
    </ModalPortal>
  );
}
