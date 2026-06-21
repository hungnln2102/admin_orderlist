import React, { useState } from "react";
import { ModalPortal } from "@/components/ui/ModalPortal";
import { ClockIcon, XMarkIcon } from "@heroicons/react/24/outline";

interface Props {
  isOpen: boolean;
  stockId: number;
  onClose: () => void;
  onConfirm: (deleteStock: boolean) => Promise<void>;
}

/**
 * Modal xu ly het han cho 1 stock:
 * - Luon xoa Package lien ket
 * - Tuy chon co xoa luon Stock (Lo hang) hay khong
 */
export const ExpireModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [deleteStock, setDeleteStock] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await onConfirm(deleteStock);
    } finally {
      setSubmitting(false);
      setDeleteStock(false);
    }
  };

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4"
        onClick={onClose}
      >
        <div
          className="glass-panel-dark rounded-[28px] border border-white/10 p-6 w-full max-w-sm shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center">
                <ClockIcon className="h-4 w-4 text-orange-300" />
              </div>
              <h3 className="text-base font-bold text-white">Xu ly Het Han</h3>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Description */}
          <div className="space-y-3 mb-5">
            <p className="text-sm text-white/70 leading-relaxed">
              Thao tac nay se{" "}
              <span className="text-orange-300 font-semibold">
                xoa tat ca Goi San Pham
              </span>{" "}
              lien ket voi lo hang nay.
            </p>

            {/* Option xoa Stock */}
            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="relative mt-0.5">
                <input
                  type="checkbox"
                  checked={deleteStock}
                  onChange={(e) => setDeleteStock(e.target.checked)}
                  className="sr-only"
                />
                <div
                  className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                    deleteStock
                      ? "bg-rose-500 border-rose-500"
                      : "bg-white/5 border-white/20 group-hover:border-white/40"
                  }`}
                >
                  {deleteStock && (
                    <svg
                      className="w-3 h-3 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-white">
                  Xoa luon khoi Lo Hang
                </p>
                <p className="text-xs text-white/40 mt-0.5">
                  Neu khong tick, lo hang van duoc giu lai trong kho
                </p>
              </div>
            </label>
          </div>

          {/* Summary box */}
          <div
            className={`rounded-xl p-3 mb-5 text-xs space-y-1 border ${
              deleteStock
                ? "bg-rose-500/10 border-rose-500/20"
                : "bg-orange-500/10 border-orange-500/20"
            }`}
          >
            <p
              className={`font-semibold ${
                deleteStock ? "text-rose-300" : "text-orange-300"
              }`}
            >
              Se thuc hien:
            </p>
            <p className="text-white/60">
              • Xoa tat ca Goi San Pham lien ket
            </p>
            {deleteStock && (
              <p className="text-white/60">• Xoa Lo Hang khoi kho</p>
            )}
            {!deleteStock && (
              <p className="text-white/60">• Giu lai Lo Hang trong kho</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm font-medium text-white/70 hover:bg-white/10 transition disabled:opacity-50"
            >
              Huy
            </button>
            <button
              type="button"
              onClick={() => void handleConfirm()}
              disabled={submitting}
              className={`flex-1 rounded-xl py-2.5 text-sm font-bold text-white transition disabled:opacity-50 ${
                deleteStock
                  ? "bg-rose-500 hover:bg-rose-600"
                  : "bg-orange-500 hover:bg-orange-600"
              }`}
            >
              {submitting ? "Dang xu ly..." : "Xac nhan"}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};
