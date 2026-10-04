import React from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";
import { Order } from "../types";
import { getOrderPrefixConfig } from "../constants/orderPrefix";
import { ORDER_STATUS, ORDER_STATUS_LABELS, getOrderStatusLabel } from "../constants/orderStatus";

interface OrderDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmDelete: () => void;
  order: Order | null;
}

export const OrderDeleteModal: React.FC<OrderDeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirmDelete,
  order,
}) => {
  if (!isOpen || !order) return null;

  const prefixConfig = getOrderPrefixConfig(order.id_order);
  const statusLabel = getOrderStatusLabel(order.status);

  const isHardDelete = order.status === ORDER_STATUS.UNPAID;
  const isSoftDeletePendingRefund = order.status === ORDER_STATUS.PAID;
  const isSoftDeleteExpired = order.status === ORDER_STATUS.RENEW_REQUIRED;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0b1329] border border-rose-500/30 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/30">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">Xác Nhận Thao Tác</h3>
              <p className="text-xs text-slate-400">Kiểm tra cẩn thận trước khi xác nhận</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Mã đơn hàng:</span>
              <span
                className={`px-2.5 py-0.5 rounded text-xs font-bold border ${prefixConfig.badgeBg} ${prefixConfig.badgeText} ${prefixConfig.badgeBorder} font-mono`}
              >
                #{order.id_order}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Khách hàng:</span>
              <span className="font-bold text-white">{order.customer || "Khách Vãng Lai"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Tổng tiền đơn:</span>
              <span className="font-bold text-emerald-400 font-mono">
                {new Intl.NumberFormat("vi-VN").format(Number(order.price || 0))} ₫
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Trạng thái hiện tại:</span>
              <span className="font-bold text-amber-400">{statusLabel}</span>
            </div>
          </div>

          {/* Action Explanation Box */}
          <div className="p-3.5 rounded-xl border text-slate-300 leading-relaxed space-y-1 bg-rose-500/10 border-rose-500/20">
            {isHardDelete && (
              <p>
                Đơn hàng ở trạng thái <strong className="text-rose-300">"{statusLabel}"</strong> sẽ bị{" "}
                <strong className="text-rose-400 uppercase">Xóa Vĩnh Viễn</strong> khỏi hệ thống cơ sở dữ liệu. Thao tác này không thể hoàn tác!
              </p>
            )}

            {isSoftDeletePendingRefund && (
              <p>
                Đơn hàng ở trạng thái <strong className="text-emerald-300">"{ORDER_STATUS_LABELS[ORDER_STATUS.PAID]}"</strong> sẽ được chuyển sang danh sách{" "}
                <strong className="text-purple-300 font-bold">"{ORDER_STATUS_LABELS[ORDER_STATUS.REFUND_PENDING]}"</strong> để theo dõi hoàn vốn cho khách hàng.
              </p>
            )}

            {isSoftDeleteExpired && (
              <p>
                Đơn hàng ở trạng thái <strong className="text-amber-300">"{ORDER_STATUS_LABELS[ORDER_STATUS.RENEW_REQUIRED]}"</strong> sẽ được hủy gia hạn và chuyển sang danh sách{" "}
                <strong className="text-amber-400 font-bold">"{ORDER_STATUS_LABELS[ORDER_STATUS.EXPIRED]}"</strong>.
              </p>
            )}

            {!isHardDelete && !isSoftDeletePendingRefund && !isSoftDeleteExpired && (
              <p>
                Hệ thống sẽ tự động xử lý trạng thái hủy/xóa cho đơn hàng <strong>#{order.id_order}</strong>.
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-end gap-3 bg-slate-900/60">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition-colors cursor-pointer"
          >
            Hủy Bỏ
          </button>
          <button
            onClick={onConfirmDelete}
            className="px-5 py-2 bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-400 hover:to-red-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-rose-500/20 cursor-pointer flex items-center gap-1.5"
          >
            <Trash2 className="w-4 h-4" />
            Xác Nhận Xử Lý
          </button>
        </div>
      </div>
    </div>
  );
};
