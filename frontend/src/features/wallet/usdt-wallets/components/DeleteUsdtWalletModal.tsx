import { ModalPortal } from "@/components/ui/ModalPortal";
import GradientButton from "@/components/ui/GradientButton";
import type { UsdtWalletItem } from "../types";

type DeleteUsdtWalletModalProps = {
  open: boolean;
  item: UsdtWalletItem | null;
  submitting?: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function DeleteUsdtWalletModal({
  open,
  item,
  submitting = false,
  onClose,
  onConfirm,
}: DeleteUsdtWalletModalProps) {
  if (!open || !item) return null;

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/85 p-4"
        onClick={onClose}
        role="presentation"
      >
        <div
          className="w-full max-w-md rounded-[28px] border border-white/10 bg-slate-900 p-6 space-y-4"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-xl font-bold text-white">Xóa ví USDT?</h2>
          <p className="text-sm text-white/70">
            Ví <span className="font-mono text-rose-200">{item.walletAddress}</span> sẽ bị xóa
            khỏi danh sách. Sổ cái lịch sử vẫn được giữ.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="text-sm text-white/50" disabled={submitting}>
              Hủy
            </button>
            <GradientButton
              type="button"
              onClick={onConfirm}
              disabled={submitting}
              className="!rounded-2xl !from-rose-600 !to-rose-500"
            >
              {submitting ? "Đang xóa…" : "Xóa ví"}
            </GradientButton>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
