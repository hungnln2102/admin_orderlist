import React from "react";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
}) => {
  // Nếu không mở thì không render gì cả
  if (!isOpen) return null;

  return (
    // Lớp phủ nền mờ
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 transition-opacity duration-300">
      {/* Khung Modal */}
      <div className="w-full max-w-md mx-4 transform transition-all duration-300 scale-100 rounded-2xl border border-white/15 bg-gradient-to-br from-slate-900/90 via-indigo-900/85 to-slate-950/90 p-6 shadow-[0_20px_60px_-25px_rgba(0,0,0,0.9)] backdrop-blur">
        {/* Tiêu đề */}
        <h3 className="text-lg font-semibold leading-6 text-white mb-2">
          {title}
        </h3>
        {/* Nội dung */}
        <div className="mb-4">
          <p className="text-sm text-white/90">{message}</p>
        </div>
        {/* Nút bấm */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-md border border-white/20 bg-white/10 text-white hover:bg-white/15 transition-colors"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 rounded-md bg-rose-600 text-white hover:bg-rose-700 transition-colors"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
