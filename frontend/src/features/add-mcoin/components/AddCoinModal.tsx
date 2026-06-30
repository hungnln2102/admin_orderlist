import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { ModalPortal } from "@/components/ui/ModalPortal";
import GradientButton from "@/components/ui/GradientButton";
import { showAppNotification } from "@/lib/notifications";
import type { CoinHistoryItem } from "../types";
import { formatCoinAmount } from "../constants";

export function AddCoinModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (item: CoinHistoryItem) => void;
}) {
  const [account, setAccount] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setAccount("");
      setAmountStr("");
      setDescription("");
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const acc = account.trim();
    if (!acc) {
      setError("Vui lÃ²ng nháº­p tÃ i khoáº£n.");
      return;
    }
    const amount = amountStr === "" ? 0 : parseInt(amountStr.replace(/\D/g, ""), 10) || 0;
    if (amount <= 0) {
      setError("Sá»‘ xu pháº£i lá»›n hÆ¡n 0.");
      return;
    }
    const newItem: CoinHistoryItem = {
      id: String(Date.now()),
      account: acc,
      type: "add",
      amount,
      description: description.trim(),
      createdAt: new Date().toISOString(),
    };
    onSuccess(newItem);
    onClose();
    showAppNotification({
      type: "success",
      message: `ÄÃ£ náº¡p ${formatCoinAmount(amount)} cho tÃ i khoáº£n ${acc}.`,
    });
  };

  const handleAmountChange = (e: ChangeEvent<HTMLInputElement>) => {
    setAmountStr(e.target.value.replace(/\D/g, ""));
  };

  return (
    <ModalPortal>
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="glass-panel-dark rounded-[32px] shadow-2xl w-full max-w-md p-8 border border-white/10"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-coin-title"
      >
        <h3 id="add-coin-title" className="text-2xl font-bold text-white mb-6 tracking-tight">
          Add coin
        </h3>
        {error && <p className="text-sm text-red-400 mb-3">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-indigo-300/50 mb-2 ml-1">
              TÃ i khoáº£n
            </label>
            <input
              type="text"
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-3 text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 outline-none transition-all placeholder:text-white/30"
              placeholder="Nháº­p tÃ i khoáº£n..."
              value={account}
              onChange={(e) => setAccount(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-indigo-300/50 mb-2 ml-1">
              Sá»‘ xu
            </label>
            <input
              type="text"
              inputMode="numeric"
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-3 text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 outline-none transition-all placeholder:text-white/30 tabular-nums"
              placeholder="Nháº­p sá»‘ xu..."
              value={amountStr}
              onChange={handleAmountChange}
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-indigo-300/50 mb-2 ml-1">
              MÃ´ táº£
            </label>
            <textarea
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-3 text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 outline-none transition-all placeholder:text-white/30 resize-none"
              placeholder="MÃ´ táº£ (tÃ¹y chá»n)"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 text-sm font-bold text-white/40 hover:text-white transition-colors"
            >
              Há»§y
            </button>
            <GradientButton type="submit" className="!py-2.5 !px-8 text-sm">
              XÃ¡c nháº­n
            </GradientButton>
          </div>
        </form>
      </div>
    </div>
    </ModalPortal>
  );
}
