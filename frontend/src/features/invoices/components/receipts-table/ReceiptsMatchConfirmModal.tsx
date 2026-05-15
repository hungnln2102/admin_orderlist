import type React from "react";

type PendingConfirm = {
  receiptId: number;
  orderCode: string;
};

type ReceiptsMatchConfirmModalProps = {
  pendingConfirm: PendingConfirm | null;
  onCancel: () => void;
  onConfirm: () => void;
};

const ReceiptsMatchConfirmModal: React.FC<ReceiptsMatchConfirmModalProps> = ({
  pendingConfirm,
  onCancel,
  onConfirm,
}) => {
  if (!pendingConfirm) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/70 p-4">
      <div className="w-full max-w-md rounded-3xl border border-indigo-400/30 bg-slate-900/95 p-6 shadow-2xl">
        <h3 className="text-lg font-black text-white tracking-tight">Xác nhận gắn mã đơn</h3>
        <p className="mt-3 text-sm text-indigo-100/90 leading-relaxed">
          Bạn có chắc muốn gắn mã đơn{" "}
          <span className="font-black text-white">{pendingConfirm.orderCode}</span> cho
          biên lai này không?
        </p>
        <p className="mt-2 text-xs text-indigo-200/70 leading-relaxed">
          Khi xác nhận, hệ thống sẽ chạy luồng gán mã đơn (reconcile) và tự động
          cộng/trừ doanh thu, lợi nhuận theo đúng quy tắc đối soát hiện hành.
        </p>
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/5"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-xl border border-indigo-300/30 bg-indigo-600/70 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-500"
          >
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReceiptsMatchConfirmModal;
