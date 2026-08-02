import React from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { ModalPortal } from "@/components/ui/ModalPortal";

export type ModalShellProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer: React.ReactNode;
};

export const ModalShell: React.FC<ModalShellProps> = ({
  open,
  title,
  onClose,
  children,
  footer,
}) => {
  if (!open) return null;

  return (
    <ModalPortal>
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div
        className="rounded-2xl shadow-2xl w-full max-w-6xl overflow-hidden border border-white/[0.08]"
        style={{ background: "rgba(10, 14, 30, 0.95)" }}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between px-8 py-5 border-b border-white/[0.06]">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Đóng"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="px-8 py-6 max-h-[75vh] overflow-y-auto">{children}</div>
        <div className="px-8 py-4 border-t border-white/[0.06] flex justify-end gap-3">
          {footer}
        </div>
      </div>
    </div>
    </ModalPortal>
  );
};
