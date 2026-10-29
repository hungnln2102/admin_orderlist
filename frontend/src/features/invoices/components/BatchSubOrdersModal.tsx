import React from "react";
import { X, Layers, Trash2, ArrowLeft, Package, User, DollarSign, Sparkles } from "lucide-react";
import { StatusBadge } from "@/features/orders/components/StatusBadge";
import { ORDER_STATUS } from "@/features/orders/constants/orderStatus";

export interface SubOrderRow {
  orderCode: string;
  orderPrefix?: string;
  customer?: string;
  contact?: string;
  informationOrder?: string;
  displayName?: string;
  variantName?: string;
  catalogBasePrice?: number;
  price?: number;
  status?: string;
}

interface BatchSubOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
  batchCode: string;
  status?: string; // "PENDING" | "COMPLETED" | "PAID" | "CANCELED" | "EXPIRED" hoặc string
  totalAmount: number;
  baseAmount: number;
  slotSuffix: number;
  orders: SubOrderRow[];
  onRemoveOrder?: (orderCode: string) => void;
  isSaved?: boolean;
}

export const BatchSubOrdersModal: React.FC<BatchSubOrdersModalProps> = ({
  isOpen,
  onClose,
  batchCode,
  status = "PENDING",
  totalAmount,
  baseAmount,
  slotSuffix,
  orders,
  onRemoveOrder,
  isSaved = false,
}) => {
  if (!isOpen) return null;

  const formatCurrency = (val: number) => new Intl.NumberFormat("vi-VN").format(val) + " ₫";

  // Ánh xạ trạng thái đợt gộp sang 3 biến trạng thái đơn hàng: Chưa Thanh Toán, Đã Thanh Toán, Đã Hủy
  const getMappedOrderStatus = (st: string) => {
    const s = String(st || "").toUpperCase();
    if (s === "COMPLETED" || s === "PAID" || s === "ĐÃ THANH TOÁN") {
      return ORDER_STATUS.PAID; // "Đã Thanh Toán"
    }
    if (s === "CANCELED" || s === "EXPIRED" || s === "ĐÃ HỦY") {
      return ORDER_STATUS.CANCELED; // "Đã Hủy"
    }
    return ORDER_STATUS.UNPAID; // "Chưa Thanh Toán" (Mặc định cho PENDING)
  };

  const mappedStatus = getMappedOrderStatus(status);

  const getPrefixBadge = (prefix?: string) => {
    const p = String(prefix || "").toUpperCase();
    if (p === "MAVL") {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-300 border border-purple-500/30">
          Bán lẻ
        </span>
      );
    }
    if (p === "MAVC") {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
          Bán sỉ
        </span>
      );
    }
    if (p === "MAVK") {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-300 border border-blue-500/30">
          MAVK
        </span>
      );
    }
    if (p === "MAVS") {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
          MAVS
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
        {p || "ĐƠN"}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0b1329] border border-cyan-500/30 w-full max-w-3xl rounded-3xl shadow-2xl shadow-cyan-500/10 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Quay lại"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/10 text-cyan-400 border border-cyan-500/30 shadow-inner">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="text-base font-bold text-white tracking-wide">
                  Chi Tiết Các Đơn Trong Đợt Gộp
                </h3>
                <span className="px-2.5 py-0.5 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 font-mono font-bold text-xs">
                  #{batchCode}
                </span>
                <StatusBadge status={mappedStatus} />
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Gồm {orders.length} đơn hàng được gom thanh toán qua 1 mã QR duy nhất
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Summary Mini Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-4 bg-slate-950/40 border-b border-slate-800/80 text-xs">
          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="text-slate-400 block text-[11px]">Tổng số đơn lẻ:</span>
            <span className="font-bold text-white text-sm mt-0.5 block">{orders.length} đơn</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="text-slate-400 block text-[11px]">Tổng tiền gốc:</span>
            <span className="font-bold text-cyan-300 font-mono text-sm mt-0.5 block">
              {formatCurrency(baseAmount)}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="text-slate-400 block text-[11px]">Đuôi Slot Suffix:</span>
            <span className="font-bold text-amber-300 font-mono text-sm mt-0.5 block">
              +{slotSuffix} ₫
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <span className="text-emerald-400 block text-[11px] font-semibold">Tổng chuyển khoản:</span>
            <span className="font-bold text-emerald-300 font-mono text-sm mt-0.5 block">
              {formatCurrency(totalAmount)}
            </span>
          </div>
        </div>

        {/* Orders List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2.5">
          {orders.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              Chưa có đơn hàng nào trong đợt gộp này.
            </div>
          ) : (
            orders.map((order, idx) => (
              <div
                key={`${order.orderCode}-${idx}`}
                className="p-3.5 rounded-2xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-slate-700/80 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                {/* Left: Code, Prefix, Customer, Info */}
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                  <span className="w-6 h-6 rounded-lg bg-slate-800 text-slate-400 flex items-center justify-center text-[11px] font-mono font-bold shrink-0 mt-0.5 sm:mt-0">
                    {idx + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-cyan-300 text-xs sm:text-sm">
                        {order.orderCode}
                      </span>
                      {getPrefixBadge(order.orderPrefix)}
                      <span className="text-slate-300 font-medium flex items-center gap-1 truncate max-w-[150px]">
                        <User className="w-3 h-3 text-slate-500 shrink-0" />
                        {order.customer || "Khách lẻ"}
                      </span>
                      {order.contact && (
                        <span className="text-slate-500 text-[11px] truncate max-w-[120px]">
                          ({order.contact})
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-slate-400 text-[11px]">
                      <Package className="w-3 h-3 text-slate-500 shrink-0" />
                      <span className="truncate max-w-sm sm:max-w-md text-slate-300">
                        {order.displayName || order.variantName || order.informationOrder || "Gói dịch vụ bản quyền"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Price & Remove action */}
                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pl-9 sm:pl-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/60">
                  <div className="text-left sm:text-right">
                    <span className="text-[10px] text-slate-400 block uppercase">Giá gốc catalog</span>
                    <span className="font-bold text-emerald-400 font-mono text-sm">
                      {formatCurrency(Number(order.catalogBasePrice ?? order.price ?? 0))}
                    </span>
                  </div>

                  {onRemoveOrder && !isSaved && (
                    <button
                      type="button"
                      onClick={() => onRemoveOrder(order.orderCode)}
                      className="p-2 rounded-xl bg-slate-800/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700/60 hover:border-rose-500/30 transition-all cursor-pointer"
                      title="Gỡ đơn này khỏi đợt gộp"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Đợt gộp tự động khớp khi khách chuyển đúng <strong>{formatCurrency(totalAmount)}</strong></span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Đóng Chi Tiết
          </button>
        </div>
      </div>
    </div>
  );
};

