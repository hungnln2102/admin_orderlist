import React from "react";
import { BaseModal } from "@/shared/components";
import { AlertTriangle, ShoppingBag } from "lucide-react";
import { PricingItem } from "../types";

interface PricingDeleteModalProps {
  deletingItem: PricingItem | null;
  onClose: () => void;
  onConfirmDelete: () => void;
  submitting: boolean;
}

export const PricingDeleteModal: React.FC<PricingDeleteModalProps> = ({
  deletingItem,
  onClose,
  onConfirmDelete,
  submitting,
}) => {
  if (!deletingItem) return null;

  const orderCount = Number(deletingItem.count || 0);

  return (
    <BaseModal
      isOpen
      onClose={onClose}
      title="Xác Nhận Xóa Sản Phẩm"
      icon={<AlertTriangle className="w-6 h-6 text-rose-400" />}
      size="md"
      closeOnEsc={false}
      hideCloseButton
      bodyClassName="p-5 sm:p-6 space-y-4"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 transition-colors"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={onConfirmDelete}
            disabled={submitting}
            className="px-4 py-2 rounded-xl bg-rose-500 text-white font-bold hover:bg-rose-600 disabled:opacity-50 transition-all"
          >
            {submitting ? "Đang xóa..." : "Xóa Sản Phẩm"}
          </button>
        </>
      }
    >
      <p className="text-xs text-slate-300 leading-relaxed">
        Bạn có chắc chắn muốn xóa sản phẩm <strong className="text-white">{deletingItem.san_pham}</strong> ({deletingItem.package_product})? Event <code className="text-rose-400 font-mono">PRODUCT_DELETED</code> sẽ được gửi tới Event Bus.
      </p>

      {/* Warning Notice Box */}
      <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-[11.5px] space-y-2">
        <div className="flex items-center gap-2 text-cyan-300 font-semibold">
          <ShoppingBag className="w-4 h-4 shrink-0" />
          <span>Lịch sử đơn hàng: {orderCount.toLocaleString("vi-VN")} đơn</span>
        </div>
        <div className="text-slate-400 leading-relaxed space-y-1">
          <p className="flex items-start gap-1.5">
            <span className="text-amber-400 font-bold shrink-0">🛡️ Chống mồ côi:</span>
            <span>Nếu sản phẩm vẫn còn đơn hàng <strong>Đã Thanh Toán</strong>, hệ thống sẽ <strong>từ chối xóa</strong> để bảo toàn vật phẩm đơn hàng.</span>
          </p>
          <p className="flex items-start gap-1.5">
            <span className="text-rose-400 font-bold shrink-0">🗑️ Dọn dẹp rác:</span>
            <span>Nếu toàn bộ đơn hàng đều đã <strong>Hết Hạn</strong> hoặc <strong>Đã Hoàn</strong>, thao tác này sẽ <strong>xóa luôn các đơn hàng đó</strong> cùng sản phẩm.</span>
          </p>
        </div>
      </div>
    </BaseModal>
  );
};
