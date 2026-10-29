import React from "react";
import { AlertTriangle, Trash2, X, Clock, RefreshCw, AlertCircle } from "lucide-react";
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

  const isRenewRequired = order.status === ORDER_STATUS.RENEW_REQUIRED || order.status === "Cần Gia Hạn";
  const isPaid = order.status === ORDER_STATUS.PAID || order.status === "Đã Thanh Toán";
  const isUnpaid = order.status === ORDER_STATUS.UNPAID || order.status === "Chưa Thanh Toán";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0b1329] border border-slate-700/80 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl border ${
                isRenewRequired
                  ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                  : "bg-rose-500/10 text-rose-400 border-rose-500/30"
              }`}
            >
              {isRenewRequired ? <Clock className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">
                {isRenewRequired ? "Chuyển Sang Hết Hạn" : isPaid ? "Xác Nhận Hủy Đơn" : "Xác Nhận Xóa Đơn"}
              </h3>
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
          {isRenewRequired ? (
            <div className="p-3.5 rounded-xl border text-slate-300 leading-relaxed space-y-1 bg-amber-500/10 border-amber-500/20">
              <p>
                Đơn hàng đang ở trạng thái <strong>Cần Gia Hạn</strong>. Thao tác này sẽ chuyển đơn hàng vào danh sách{" "}
                <strong className="text-amber-400 font-bold">"{ORDER_STATUS_LABELS[ORDER_STATUS.EXPIRED]}"</strong>.
              </p>
              <p className="text-[11px] text-amber-300/80">
                ✓ Dữ liệu tài khoản, mật khẩu của khách hàng vẫn được lưu giữ an toàn tuyệt đối.
              </p>
            </div>
          ) : isPaid ? (
            <div className="p-3.5 rounded-xl border text-slate-300 leading-relaxed space-y-1 bg-rose-500/10 border-rose-500/20">
              <p>
                Đơn hàng đã thanh toán. Thao tác này sẽ chuyển trạng thái đơn hàng thành{" "}
                <strong className="text-rose-400 font-bold">"{ORDER_STATUS_LABELS[ORDER_STATUS.CANCELED]}"</strong> (Đã Hủy).
              </p>
              <p className="text-[11px] text-rose-300/80">
                ✓ Hệ thống sẽ tự động tạo credit note hoàn tiền cho khách theo số ngày sử dụng còn lại.
              </p>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl border text-slate-300 leading-relaxed space-y-1 bg-red-500/10 border-red-500/20">
              <p>
                Đơn hàng chưa thanh toán. Thao tác này sẽ{" "}
                <strong className="text-red-400 font-bold">xóa vĩnh viễn</strong> đơn hàng nháp #{order.id_order} khỏi hệ thống.
              </p>
            </div>
          )}
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
            className={`px-5 py-2 text-white rounded-xl font-bold transition-all shadow-lg cursor-pointer flex items-center gap-1.5 ${
              isRenewRequired
                ? "bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 shadow-amber-500/20"
                : "bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-400 hover:to-red-500 shadow-rose-500/20"
            }`}
          >
            {isRenewRequired ? <Clock className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
            {isRenewRequired ? "Chuyển Sang Hết Hạn" : isPaid ? "Xác Nhận Hủy Đơn" : "Xác Nhận Xóa"}
          </button>
        </div>
      </div>
    </div>
  );
};
