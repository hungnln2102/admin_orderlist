import React, { useEffect, useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { ModalPortal } from "@/components/ui/ModalPortal";
import * as Helpers from "@/lib/helpers";
import type { Goal } from "./budgets-goals/types";

interface EditGoalAmountModalProps {
  isOpen: boolean;
  goal: Goal | null;
  onClose: () => void;
  onSave: (goalId: number, amount: number) => Promise<void>;
}

export const EditGoalAmountModal: React.FC<EditGoalAmountModalProps> = ({
  isOpen,
  goal,
  onClose,
  onSave,
}) => {
  const [targetAmount, setTargetAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !goal) return;
    const initialAmount = Number(goal.target_amount || 0);
    setTargetAmount(initialAmount > 0 ? initialAmount.toLocaleString("vi-VN") : "");
    setError(null);
  }, [isOpen, goal]);

  if (!isOpen || !goal) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const parsedAmount = Number(String(targetAmount).replace(/\./g, ""));
    if (!parsedAmount || parsedAmount <= 0) {
      setError("Số tiền mục tiêu phải lớn hơn 0");
      return;
    }

    setLoading(true);
    try {
      await onSave(goal.id, parsedAmount);
      onClose();
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Không thể cập nhật mục tiêu"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="relative w-full max-w-md mx-4 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-950 border border-white/10 p-6 shadow-2xl">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full p-2 text-white/60 hover:bg-white/10 hover:text-white transition-colors"
            disabled={loading}
            aria-label="Đóng"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>

          <h2 className="text-2xl font-bold text-white mb-2">Sửa giá mục tiêu</h2>
          <p className="text-sm text-white/70 mb-6">{goal.goal_name}</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="editGoalTargetAmount"
                className="block text-sm font-medium text-white/80 mb-2"
              >
                Số tiền mục tiêu mới
              </label>
              <input
                id="editGoalTargetAmount"
                type="text"
                value={targetAmount}
                onChange={(event) =>
                  setTargetAmount(Helpers.formatNumberOnTyping(event.target.value))
                }
                placeholder="0"
                className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white placeholder-white/40 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                disabled={loading}
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
                disabled={loading}
              >
                Hủy
              </button>
              <button
                type="submit"
                className="flex-1 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3 text-sm font-semibold text-white hover:from-indigo-500 hover:to-purple-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              >
                {loading ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
};
