import React from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div
        className="bg-white rounded-xl shadow-lg w-full max-w-4xl overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-gray-600 transition"
            aria-label="Ž?A3ng"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="px-5 py-4 max-h-[70vh] overflow-y-auto">{children}</div>
        <div className="px-5 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
          {footer}
        </div>
      </div>
    </div>
  );
};
