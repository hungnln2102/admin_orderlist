import type { Supply } from "../types";

type DeleteSupplyModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  supply: Supply | null;
};

export function DeleteSupplyModal({
  isOpen,
  onClose,
  onConfirm,
  supply,
}: DeleteSupplyModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 animate-in fade-in">
      <div className="glass-panel-dark rounded-[32px] p-8 max-w-sm w-full shadow-2xl border border-rose-500/20 animate-in zoom-in-95 duration-300">
        <h3 className="text-2xl font-bold text-rose-500 mb-2 tracking-tight">
          Xóa Nhà Cung Cấp?
        </h3>
        <p className="text-white/60 mb-8 leading-relaxed">
          Bạn có chắc muốn xóa <b>{supply?.sourceName}</b>? Hành động này không
          thể hoàn tác.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-bold text-white/40 hover:text-white transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={onConfirm}
            className="px-6 py-2.5 bg-rose-500 text-white font-bold rounded-2xl hover:bg-rose-600 transition-all active:scale-95 shadow-lg shadow-rose-500/20"
          >
            Xóa Vĩnh Viễn
          </button>
        </div>
      </div>
    </div>
  );
}
