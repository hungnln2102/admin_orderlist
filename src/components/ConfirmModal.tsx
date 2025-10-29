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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 transition-opacity duration-300">
      {/* Khung Modal */}
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4 transform transition-all duration-300 scale-100">
        {/* Tiêu đề */}
        <h3 className="text-lg font-medium leading-6 text-gray-900 mb-2">
          {title}
        </h3>
        {/* Nội dung */}
        <div className="mb-4">
          <p className="text-sm text-gray-500">{message}</p>
        </div>
        {/* Nút bấm */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
