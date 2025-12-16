import React from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { ProductPricingRow } from "../../types";

interface DeleteProductModalProps {
  product: ProductPricingRow | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: () => void;
}

const DeleteProductModal: React.FC<DeleteProductModalProps> = ({
  product,
  loading,
  error,
  onClose,
  onConfirm,
}) => {
  if (!product) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6"
      onClick={() => {
        if (!loading) {
          onClose();
        }
      }}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-lg font-bold text-sky-100">Xác Định Xóa</p>
            <p className="text-sm text-sky-200/90">
              Hành động này sẽ Xóa Sản Phẩm khỏi bảng Giá.
            </p>
          </div>
          <button
            type="button"
            className="text-white/60 hover:text-white/70 disabled:opacity-50"
            onClick={onClose}
            disabled={loading}
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-3 text-sm text-white/70">
          <div>
            <p className="font-bold text-sky-100">
              {product.packageName ||
                product.packageProduct ||
                product.sanPhamRaw ||
                `Sản Phẩm #${product.id}`}
            </p>
            <p className="text-sm text-sky-200/90">
              Mã: {product.sanPhamRaw || "Không xác định"}
            </p>
          </div>
          <p>
            Bạn có chắc chắn muốn xóa sản phẩm này? Hành động không thể hoàn
            tác và dữ liệu liên quan sẽ được cập nhật.
          </p>
        </div>
        {error && (
          <p className="mt-4 text-xs text-red-500">
            {error}
          </p>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-white/70 hover:bg-indigo-500/10 disabled:opacity-50"
            onClick={onClose}
            disabled={loading}
          >
            Hủy
          </button>
          <button
            type="button"
            className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Đang Xóa..." : "Xóa Sản Phẩm"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteProductModal;
