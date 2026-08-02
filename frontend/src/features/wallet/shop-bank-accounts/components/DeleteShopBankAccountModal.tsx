import { ModalPortal } from "@/components/ui/ModalPortal";
import GradientButton from "@/components/ui/GradientButton";
import type { ShopBankAccountItem } from "../types";

type Props = {
  open: boolean;
  item: ShopBankAccountItem | null;
  submitting?: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function DeleteShopBankAccountModal({
  open,
  item,
  submitting = false,
  onClose,
  onConfirm,
}: Props) {
  if (!open || !item) return null;

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/85 p-4"
        onClick={onClose}
        role="presentation"
      >
        <div
          className="w-full max-w-md rounded-[28px] border border-white/10 bg-slate-900 p-6"
          onClick={(e) => e.stopPropagation()}
          role="alertdialog"
          aria-modal="true"
        >
          <h2 className="text-xl font-bold text-white">Xóa STK?</h2>
          <p className="mt-3 text-sm text-white/70">
            Xóa tài khoản <span className="font-mono text-white">{item.accountNumber}</span>
            {item.isDefault ? " (đang là mặc định — hệ thống sẽ chọn STK active khác làm mặc định)." : "."}
          </p>
          <div className="mt-6 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="text-sm text-white/50">
              Hủy
            </button>
            <GradientButton
              type="button"
              onClick={onConfirm}
              disabled={submitting}
              className="!rounded-2xl !from-rose-600 !to-rose-700"
            >
              {submitting ? "Đang xóa..." : "Xóa"}
            </GradientButton>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
