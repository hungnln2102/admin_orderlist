import React from "react";
import { X, Eye, Calendar, User, DollarSign, Clock, Tag, ShoppingBag, ShieldAlert } from "lucide-react";
import {
  Order,
  CatalogProduct,
  calculateRemainingDays,
  calculateRemainingValue,
  formatDateDisplay,
  getDisplayProductName,
  getOrderPrefixConfig,
} from "../types";
import { renderStatusBadge } from "./StatusBadge";

interface OrderDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  productsCatalog: CatalogProduct[];
}

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({
  isOpen,
  onClose,
  order,
  productsCatalog,
}) => {
  if (!isOpen || !order) return null;

  const prefixConfig = getOrderPrefixConfig(order.id_order);
  const displayProduct = getDisplayProductName(order.id_product, productsCatalog);
  const remainingDays = calculateRemainingDays(order);
  const remainingValue = calculateRemainingValue(order);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0b1329] border border-cyan-500/30 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-cyan-500/10 text-cyan-400 rounded-xl border border-cyan-500/30">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-wide">Chi Tiết Đơn Hàng</h3>
                <span
                  className={`px-2.5 py-0.5 rounded-md text-xs font-bold border ${prefixConfig.badgeBg} ${prefixConfig.badgeText} ${prefixConfig.badgeBorder} font-mono`}
                >
                  #{order.id_order}
                </span>
              </div>
              <p className="text-xs text-slate-400">Xem đầy đủ thông tin khách hàng, gói sản phẩm, thời hạn & tài chính</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar space-y-4 text-xs">
          {/* Customer Info Card */}
          <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800/80 space-y-2">
            <div className="font-bold text-cyan-400 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> Thông Tin Khách Hàng
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-300">
              <div>
                <span className="text-slate-500">Khách hàng: </span>
                <span className="font-bold text-white">{order.customer || "Khách Vãng Lai"}</span>
              </div>
              <div>
                <span className="text-slate-500">Liên hệ / SĐT: </span>
                <span className="font-bold text-slate-200">{order.contact || "—"}</span>
              </div>
            </div>
          </div>

          {/* Product & Package Info */}
          <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800/80 space-y-2">
            <div className="font-bold text-cyan-400 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
              <ShoppingBag className="w-3.5 h-3.5" /> Gói Sản Phẩm & Slot Tài Khoản
            </div>
            <div className="space-y-1.5 text-slate-300">
              <div>
                <span className="text-slate-500">Tên gói / sản phẩm: </span>
                <span className="font-bold text-cyan-300">{displayProduct || order.information_order || "—"}</span>
              </div>
              {order.information_order && displayProduct && order.information_order !== displayProduct && (
                <div>
                  <span className="text-slate-500">Chi tiết mô tả: </span>
                  <span className="text-slate-300">{order.information_order}</span>
                </div>
              )}
              {order.slot && (
                <div>
                  <span className="text-slate-500">Slot / Thông tin đăng nhập: </span>
                  <span className="font-mono text-cyan-400 font-bold bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded">
                    {order.slot}
                  </span>
                </div>
              )}
              {order.supply_id && (
                <div>
                  <span className="text-slate-500">Nhà cung cấp (NCC): </span>
                  <span className="font-bold text-purple-300">{order.supply_id}</span>
                </div>
              )}
            </div>
          </div>

          {/* Financial Breakdown */}
          <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800/80 space-y-2">
            <div className="font-bold text-cyan-400 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5" /> Tài Chính & Giá Bán
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <div className="text-slate-400 text-[11px]">Giá Bán Bán Lẻ</div>
                <div className="text-base font-bold text-emerald-400 font-mono mt-0.5">
                  {new Intl.NumberFormat("vi-VN").format(Number(order.price || 0))} ₫
                </div>
              </div>

              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <div className="text-slate-400 text-[11px]">Giá Vốn Nhập NCC</div>
                <div className="text-base font-bold text-purple-300 font-mono mt-0.5">
                  {new Intl.NumberFormat("vi-VN").format(Number(order.cost || 0))} ₫
                </div>
              </div>

              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <div className="text-slate-400 text-[11px]">Giá Trị Còn Lại (Ứớc Tính)</div>
                <div className="text-base font-bold text-cyan-300 font-mono mt-0.5">
                  {new Intl.NumberFormat("vi-VN").format(remainingValue)} ₫
                </div>
              </div>
            </div>
          </div>

          {/* Dates & Status */}
          <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800/80 space-y-2">
            <div className="font-bold text-cyan-400 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> Thời Gian & Hạn Sử Dụng
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-300">
              <div>
                <span className="text-slate-500">Trạng thái: </span>
                <span className="inline-block ml-1">{renderStatusBadge(order.status)}</span>
              </div>
              <div>
                <span className="text-slate-500">Thời hạn gói: </span>
                <span className="font-bold text-white">{order.days || 365} ngày</span>
              </div>
              <div>
                <span className="text-slate-500">Ngày đặt hàng: </span>
                <span className="font-bold text-slate-200">{formatDateDisplay(order.order_date || order.created_at)}</span>
              </div>
              <div>
                <span className="text-slate-500">Ngày hết hạn: </span>
                <span className="font-bold text-amber-400">{formatDateDisplay(order.expired_at)}</span>
              </div>
            </div>
            {remainingDays !== 0 && (
              <div
                className={`p-2.5 rounded-lg border text-xs font-bold flex items-center gap-2 ${
                  remainingDays > 0
                    ? "bg-amber-500/10 border-amber-500/20 text-amber-300"
                    : "bg-rose-500/10 border-rose-500/20 text-rose-300"
                }`}
              >
                <Clock className="w-4 h-4 shrink-0" />
                <span>
                  {remainingDays > 0
                    ? `Gói còn lại ${remainingDays} ngày sử dụng`
                    : `Gói đã quá hạn ${Math.abs(remainingDays)} ngày`}
                </span>
              </div>
            )}
          </div>

          {/* Note if available */}
          {order.note && (
            <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800/80 space-y-1">
              <div className="font-bold text-slate-400 text-[11px] uppercase tracking-wider">Ghi Chú</div>
              <p className="text-slate-300 whitespace-pre-wrap">{order.note}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 flex justify-end bg-slate-900/60">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
