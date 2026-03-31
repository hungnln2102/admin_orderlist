import GradientButton from "@/components/ui/GradientButton";
import type { IpWhitelistItem } from "../types";

type DeleteIpWhitelistModalProps = {
  isOpen: boolean;
  item: IpWhitelistItem | null;
  deleting?: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
};

export function DeleteIpWhitelistModal({
  isOpen,
  item,
  deleting = false,
  onClose,
  onConfirm,
}: DeleteIpWhitelistModalProps) {
  if (!isOpen || !item) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-md rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(30,41,59,0.95),rgba(2,6,23,0.98))] p-7 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.9)]"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-ip-whitelist-title"
      >
        <h2
          id="delete-ip-whitelist-title"
          className="text-2xl font-bold tracking-tight text-white"
        >
          Xóa IP whitelist
        </h2>
        <p className="mt-3 text-sm leading-6 text-white/65">
          Bạn sắp xóa địa chỉ <span className="font-semibold text-white">{item.ipAddress}</span>.
          Hành động này không thể hoàn tác.
        </p>

        {item.description && (
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/70">
            {item.description}
          </div>
        )}

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-semibold text-white/45 transition hover:text-white"
            disabled={deleting}
          >
            Hủy
          </button>
          <GradientButton
            type="button"
            onClick={() => void onConfirm()}
            disabled={deleting}
            className="!rounded-2xl !bg-none !bg-rose-500 !px-6 !py-2.5 !shadow-[0_16px_35px_-18px_rgba(244,63,94,0.95)] hover:!bg-rose-400"
          >
            {deleting ? "Đang xóa..." : "Xác nhận xóa"}
          </GradientButton>
        </div>
      </div>
    </div>
  );
}
