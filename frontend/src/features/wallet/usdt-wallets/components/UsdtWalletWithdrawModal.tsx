import React, { useEffect, useState } from "react";
import { ModalPortal } from "@/components/ui/ModalPortal";
import GradientButton from "@/components/ui/GradientButton";
import { formatUsdtMoney, formatUsdtMoneyDraft, parseUsdtMoneyInput } from "../helpers/formatUsdtMoney";
import type { UsdtWalletBalanceItem } from "../types";

type Props = {
  open: boolean;
  items: UsdtWalletBalanceItem[];
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (walletId: number, amount: number) => Promise<void>;
};

export function UsdtWalletWithdrawModal({
  open,
  items,
  submitting = false,
  onClose,
  onSubmit,
}: Props) {
  const [walletId, setWalletId] = useState<number>(0);
  const [amountDraft, setAmountDraft] = useState("");

  useEffect(() => {
    if (!open) return;
    setWalletId(items[0]?.id ?? 0);
    setAmountDraft("");
  }, [open, items]);

  if (!open) return null;

  const selected = items.find((item) => item.id === walletId) ?? null;
  const withdrawAmount = parseUsdtMoneyInput(amountDraft);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!walletId || withdrawAmount <= 0) return;
    await onSubmit(walletId, withdrawAmount);
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
            <h2 className="text-xl font-bold text-white">Rút tiền từ ví USDT</h2>
            <p className="mt-2 text-sm text-white/60">
              Ghi nhận số USDT (USD) đã rút khỏi ví.
            </p>
          </div>

          {items.length === 0 ? (
            <p className="text-sm text-rose-300">Chưa có ví để rút tiền.</p>
          ) : (
            <>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/50">
                  Ví
                </label>
                <select
                  className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white"
                  value={walletId || ""}
                  onChange={(e) => setWalletId(Number(e.target.value) || 0)}
                  disabled={submitting}
                >
                  {items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.walletAddress.slice(0, 12)}… · {item.network}
                    </option>
                  ))}
                </select>
                {selected ? (
                  <p className="mt-2 text-xs text-white/45">
                    Số dư:{" "}
                    <span className="font-semibold text-cyan-200 tabular-nums">
                      {formatUsdtMoney(selected.balanceRemaining)} USD
                    </span>
                  </p>
                ) : null}
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/50">
                  Số tiền rút (USD)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white font-mono text-right"
                  value={amountDraft}
                  onChange={(e) => setAmountDraft(formatUsdtMoneyDraft(e.target.value))}
                  disabled={submitting}
                  placeholder="0.00"
                />
              </div>
            </>
          )}

          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="text-sm text-white/50" disabled={submitting}>
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
