import React, { useState } from "react";
import {
  Eye,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ShoppingBag,
} from "lucide-react";
import {
  Order,
  OrderDatasetKey,
  CatalogProduct,
  CatalogSupplier,
  calculateRemainingDays,
  calculateRemainingValue,
  formatDateDisplay,
  getDisplayProductName,
} from "../types";
import { getOrderPrefixConfig } from "../constants/orderPrefix";
import { renderStatusBadge } from "./StatusBadge";

interface OrderTableProps {
  orders: Order[];
  loading: boolean;
  activeTab: OrderDatasetKey;
  productsCatalog: CatalogProduct[];
  allSuppliersCatalog?: CatalogSupplier[];
  page: number;
  pageSize?: number;
  totalPages: number;
  totalOrders: number;
  onPageChange: (newPage: number) => void;
  onOpenView: (order: Order) => void;
  onOpenEdit: (order: Order) => void;
  onOpenDelete: (order: Order) => void;
  onRenewOrder?: (order: Order) => void;
  onMarkPaid?: (order: Order) => void;
  onPayWithCredit?: (order: Order) => void;
}

export const OrderTable: React.FC<OrderTableProps> = ({
  orders,
  loading,
  activeTab,
  productsCatalog,
  allSuppliersCatalog = [],
  page,
  pageSize = 15,
  totalPages,
  totalOrders,
  onPageChange,
  onOpenView,
  onOpenEdit,
  onOpenDelete,
  onRenewOrder,
  onMarkPaid,
  onPayWithCredit,
}) => {
  const [expandedRowId, setExpandedRowId] = useState<number | null>(null);

  const toggleRow = (id: number) => {
    setExpandedRowId((prev) => (prev === id ? null : id));
  };

  const getSupplierDisplayName = (order: Order): string => {
    if (order.supply_id) {
      const found = allSuppliersCatalog.find(
        (s) => s.id === Number(order.supply_id)
      );
      if (found) return found.supplier_name || found.ncc_name || "Mavryk";
    }
    return "Mavryk";
  };

  const showActions = activeTab !== "expired" && activeTab !== "canceled";
  const totalColumns = 7 + (activeTab === "import" ? 1 : 0) + (showActions ? 1 : 0);

  return (
    <div className="bg-slate-900/60 rounded-2xl border border-slate-800/80 backdrop-blur-xl shadow-xl overflow-hidden flex flex-col w-full">
      {/* 1. Desktop & Laptop Table View */}
      <div className="hidden sm:block overflow-x-auto custom-scrollbar flex-1 min-h-[420px] w-full">
        <table className="w-full min-w-[850px] border-collapse text-left">
          <thead>
            <tr className="bg-slate-900/90 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider select-none">
              <th className="py-3.5 px-3 w-10 text-center">#</th>
              <th className="py-3.5 px-3 min-w-[140px]">Mã Đơn & Sản Phẩm</th>
              <th className="py-3.5 px-3 min-w-[120px]">Khách Hàng & Liên Hệ</th>
              <th className="py-3.5 px-3 min-w-[130px]">Thông Tin & Slot</th>
              <th className="py-3.5 px-3 w-44 text-center whitespace-nowrap">Ngày Đăng Ký - Hết Hạn</th>
              <th className="py-3.5 px-3 w-28 text-right whitespace-nowrap">Giá Bán</th>
              {activeTab === "import" && <th className="py-3.5 px-3 w-24 text-right whitespace-nowrap">Giá Nhập</th>}
              <th className="py-3.5 px-3 w-32 text-center whitespace-nowrap">Trạng Thái</th>
              {showActions && <th className="py-3.5 px-3 w-28 text-right whitespace-nowrap">Thao Tác</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-xs">
            {loading ? (
              <tr>
                <td colSpan={totalColumns} className="py-16 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                    <span>Đang tải danh sách đơn hàng...</span>
                  </div>
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={totalColumns} className="py-16 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <ShoppingBag className="w-10 h-10 text-slate-600 stroke-[1.5]" />
                    <span className="text-sm font-medium">Không tìm thấy đơn hàng nào</span>
                    <span className="text-xs text-slate-600">Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc trạng thái</span>
                  </div>
                </td>
              </tr>
            ) : (
              orders.map((order, idx) => {
                const prefixConfig = getOrderPrefixConfig(order.id_order);
                const displayProduct = getDisplayProductName(order.id_product, productsCatalog, order.information_order);
                const remainingDays = calculateRemainingDays(order);
                const isExpanded = expandedRowId === order.id;

                const supplierName = getSupplierDisplayName(order);
                const remainingValue = calculateRemainingValue(order);
                const webhookAmount = (order as any).webhook_amount ?? (order as any).latest_webhook_amount ?? 0;
                const webhookDelta = Number(webhookAmount) - Number(order.price || 0);

                return (
                  <React.Fragment key={order.id}>
                    <tr
                      onClick={() => toggleRow(order.id)}
                      className={`hover:bg-slate-800/50 transition-colors group border-b border-slate-800/40 cursor-pointer ${
                        isExpanded ? "bg-slate-800/60" : ""
                      }`}
                    >
                      {/* Index */}
                      <td className="py-3.5 px-3 text-center text-slate-500 font-mono text-[11px] whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleRow(order.id);
                            }}
                            className="text-slate-500 hover:text-cyan-400 p-0.5 rounded transition-colors"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5 text-cyan-400" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <span>{(page - 1) * pageSize + idx + 1}</span>
                        </div>
                      </td>

                      {/* Order Code Badge & Product Name */}
                      <td className="py-3.5 px-3 max-w-[180px]">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`px-2 py-0.5 rounded-lg text-[11px] font-bold border ${prefixConfig.badgeBg} ${prefixConfig.badgeText} ${prefixConfig.badgeBorder} shadow-sm font-mono tracking-wider`}
                          >
                            #{order.id_order}
                          </span>
                        </div>
                        <div className="font-bold text-slate-100 group-hover:text-cyan-300 transition-colors truncate text-xs">
                          {displayProduct || order.id_product || "—"}
                        </div>
                      </td>

                      {/* Customer & Contact */}
                      <td className="py-3.5 px-3 max-w-[150px]">
                        <div className="font-bold text-slate-100 group-hover:text-cyan-300 transition-colors truncate">
                          {order.customer || "Khách Vãng Lai"}
                        </div>
                        {order.contact && (
                          <div className="text-[11px] text-slate-400 truncate mt-0.5">
                            {order.contact}
                          </div>
                        )}
                      </td>

                      {/* Order Information & Slot */}
                      <td className="py-3.5 px-3 max-w-[170px]">
                        {order.information_order && (
                          <div className="text-slate-200 truncate font-medium">
                            {order.information_order}
                          </div>
                        )}
                        {order.slot && (
                          <div className="text-[10.5px] text-cyan-400/90 font-mono mt-0.5 truncate">
                            Slot: {order.slot}
                          </div>
                        )}
                        {!order.information_order && !order.slot && (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>

                      {/* Registration & Expiration Dates */}
                      <td className="py-3.5 px-3 text-center whitespace-nowrap w-44">
                        <div className="text-slate-300 font-medium flex items-center justify-center gap-1 font-mono text-[11.5px]">
                          <span>{formatDateDisplay(order.order_date || order.created_at)}</span>
                          <span className="text-slate-500 font-bold px-0.5">-</span>
                          <span className="text-amber-300 font-semibold">{formatDateDisplay(order.expired_at)}</span>
                        </div>
                        {remainingDays !== 0 && activeTab !== "canceled" && (
                          <div
                            className={`text-[10.5px] font-bold mt-0.5 ${
                              remainingDays > 30
                                ? "text-slate-400"
                                : remainingDays > 0
                                ? "text-amber-400 animate-pulse"
                                : "text-rose-400"
                            }`}
                          >
                            {remainingDays > 0 ? `Còn ${remainingDays} ngày` : `Hết hạn ${Math.abs(remainingDays)} ngày`}
                          </div>
                        )}
                      </td>

                      {/* Selling Price */}
                      <td className="py-3.5 px-3 text-right font-bold text-emerald-400 font-mono text-xs whitespace-nowrap w-28">
                        {new Intl.NumberFormat("vi-VN").format(Number(order.price || 0))} ₫
                      </td>

                      {/* Import Cost (Only for Import tab) */}
                      {activeTab === "import" && (
                        <td className="py-3.5 px-3 text-right font-semibold text-purple-300 font-mono text-xs whitespace-nowrap w-24">
                          {new Intl.NumberFormat("vi-VN").format(Number(order.cost || 0))} ₫
                        </td>
                      )}

                      {/* Status Badge */}
                      <td className="py-3.5 px-3 text-center whitespace-nowrap w-32">
                        {renderStatusBadge(order.status)}
                      </td>

                      {/* Action Buttons */}
                      {showActions && (
                        <td className="py-3.5 px-3 text-right whitespace-nowrap w-28">
                          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => onOpenView(order)}
                              title="Xem chi tiết"
                              className="p-1 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onOpenEdit(order)}
                              title="Sửa đơn hàng"
                              className="p-1 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onOpenDelete(order)}
                              title="Xóa / Hủy đơn"
                              className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>

                    {/* Expandable Dropdown Row */}
                    {isExpanded && (
                      <tr className="bg-slate-950/70 border-b border-slate-800/80 animate-in fade-in duration-200">
                        <td colSpan={totalColumns} className="p-4 sm:p-5">

                          <div className="bg-slate-900/90 rounded-2xl p-5 border border-slate-700/60 shadow-2xl space-y-4">
                            {/* Header inside Panel */}
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-white tracking-wide">Chi tiết đơn hàng</span>
                                <span
                                  className={`px-2.5 py-0.5 rounded-lg text-xs font-bold border ${prefixConfig.badgeBg} ${prefixConfig.badgeText} ${prefixConfig.badgeBorder} font-mono`}
                                >
                                  #{order.id_order}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 flex-wrap">
                                {onPayWithCredit && (
                                  <button
                                    onClick={() => onPayWithCredit(order)}
                                    className="px-3.5 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 rounded-full shadow-md shadow-cyan-900/30 transition-all cursor-pointer active:scale-95"
                                  >
                                    Thanh Toán bằng Credit
                                  </button>
                                )}
                                {onMarkPaid && (
                                  <button
                                    onClick={() => onMarkPaid(order)}
                                    className="px-3.5 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-500 hover:to-green-600 rounded-full shadow-md shadow-emerald-900/30 transition-all cursor-pointer active:scale-95"
                                  >
                                    Thanh Toán
                                  </button>
                                )}
                                {onRenewOrder && (
                                  <button
                                    onClick={() => onRenewOrder(order)}
                                    className="px-3.5 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-amber-600 to-orange-700 hover:from-amber-500 hover:to-orange-600 rounded-full shadow-md shadow-amber-900/30 transition-all cursor-pointer active:scale-95"
                                  >
                                    Gia Hạn
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* 6 Info Cards Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                              {/* 1. Nguồn */}
                              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 text-center space-y-1 shadow-sm">
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">NGUỒN</div>
                                <div className="font-bold text-white text-xs truncate" title={supplierName}>
                                  {supplierName}
                                </div>
                              </div>

                              {/* 2. Giá Nhập */}
                              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 text-center space-y-1 shadow-sm">
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">GIÁ NHẬP</div>
                                <div className="font-bold text-purple-300 text-xs font-mono">
                                  {new Intl.NumberFormat("vi-VN").format(Number(order.cost || 0))} ₫
                                </div>
                              </div>

                              {/* 3. Giá Bán */}
                              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 text-center space-y-1 shadow-sm">
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">GIÁ BÁN</div>
                                <div className="font-bold text-emerald-400 text-xs font-mono">
                                  {new Intl.NumberFormat("vi-VN").format(Number(order.price || 0))} ₫
                                </div>
                              </div>

                              {/* 4. Giá Trị Còn Lại */}
                              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 text-center space-y-1 shadow-sm">
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">GIÁ TRỊ CÒN LẠI</div>
                                <div className="font-bold text-cyan-300 text-xs font-mono">
                                  {new Intl.NumberFormat("vi-VN").format(remainingValue)} ₫
                                </div>
                              </div>

                              {/* 5. Còn Thiếu */}
                              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 text-center space-y-1 shadow-sm">
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">CÒN THIẾU</div>
                                <div
                                  className={`font-bold text-xs font-mono ${
                                    webhookDelta < 0
                                      ? "text-rose-400"
                                      : webhookDelta > 0
                                      ? "text-amber-400"
                                      : "text-emerald-400"
                                  }`}
                                >
                                  {new Intl.NumberFormat("vi-VN").format(webhookDelta)} ₫
                                </div>
                              </div>

                              {/* 6. Số Ngày */}
                              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 text-center space-y-1 shadow-sm">
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">SỐ NGÀY</div>
                                <div className="font-bold text-amber-300 text-xs font-mono">
                                  {order.days || 365}
                                </div>
                              </div>
                            </div>

                            {/* Full width Note Card */}
                            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 text-center space-y-1 shadow-sm">
                              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">GHI CHÚ</div>
                              <div className="text-xs text-indigo-100 font-medium whitespace-pre-wrap">
                                {order.note && order.note.trim() !== "" ? order.note : "Không có ghi chú."}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 2. Mobile Card List View (Visible ONLY on mobile screens < 640px) */}
      <div className="block sm:hidden divide-y divide-slate-800/80 p-3 space-y-3">
        {loading ? (
          <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            <span>Đang tải danh sách đơn hàng...</span>
          </div>
        ) : orders.length === 0 ? (
          <div className="py-12 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
            <ShoppingBag className="w-8 h-8 text-slate-600" />
            <span className="text-xs font-medium">Không tìm thấy đơn hàng nào</span>
          </div>
        ) : (
          orders.map((order) => {
            const prefixConfig = getOrderPrefixConfig(order.id_order);
            const displayProduct = getDisplayProductName(order.id_product, productsCatalog);
            const remainingDays = calculateRemainingDays(order);

            return (
              <div
                key={order.id}
                className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-3 shadow-md"
              >
                {/* Header: Order Code Badge & Status Badge */}
                <div className="flex items-center justify-between gap-2 border-b border-slate-800/60 pb-2">
                  <span
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${prefixConfig.badgeBg} ${prefixConfig.badgeText} ${prefixConfig.badgeBorder} font-mono`}
                  >
                    #{order.id_order}
                  </span>
                  <div>{renderStatusBadge(order.status)}</div>
                </div>

                {/* Main Product & Customer Info */}
                <div className="space-y-1 text-xs">
                  <div className="font-bold text-white text-sm">
                    {displayProduct || order.id_product || "—"}
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400">Khách hàng:</span>
                    <span className="font-bold text-cyan-300">{order.customer || "Khách Vãng Lai"}</span>
                  </div>
                  {order.contact && (
                    <div className="flex items-center justify-between text-slate-400 text-[11px]">
                      <span>Liên hệ:</span>
                      <span className="truncate max-w-[200px]">{order.contact}</span>
                    </div>
                  )}
                  {order.information_order && (
                    <div className="flex items-center justify-between text-slate-400 text-[11px]">
                      <span>Thông tin:</span>
                      <span className="truncate max-w-[200px] text-slate-200">{order.information_order}</span>
                    </div>
                  )}
                  {order.slot && (
                    <div className="flex items-center justify-between text-cyan-400 font-mono text-[11px]">
                      <span>Slot:</span>
                      <span>{order.slot}</span>
                    </div>
                  )}
                </div>

                {/* Pricing & Expiration */}
                <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
                  <div>
                    <div className="text-[10.5px] text-slate-400">Thời hạn sử dụng</div>
                    <div className="font-mono text-slate-200 font-medium">
                      {formatDateDisplay(order.order_date || order.created_at)} -{" "}
                      <span className="text-amber-300 font-semibold">{formatDateDisplay(order.expired_at)}</span>
                    </div>
                    {remainingDays !== 0 && activeTab !== "canceled" && (
                      <div
                        className={`text-[10.5px] font-bold ${
                          remainingDays > 30 ? "text-slate-400" : remainingDays > 0 ? "text-amber-400" : "text-rose-400"
                        }`}
                      >
                        {remainingDays > 0 ? `Còn ${remainingDays} ngày` : `Hết hạn ${Math.abs(remainingDays)} ngày`}
                      </div>
                    )}
                  </div>

                  <div className="text-right">
                    <div className="text-[10.5px] text-slate-400">Giá bán</div>
                    <div className="font-bold text-emerald-400 font-mono text-sm">
                      {new Intl.NumberFormat("vi-VN").format(Number(order.price || 0))} ₫
                    </div>
                  </div>
                </div>

                {/* Mobile Actions */}
                {showActions && (
                  <div className="pt-2 border-t border-slate-800/60 flex items-center justify-end gap-2">
                    <button
                      onClick={() => onOpenView(order)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" /> Xem
                    </button>
                    <button
                      onClick={() => onOpenEdit(order)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Sửa
                    </button>
                    <button
                      onClick={() => onOpenDelete(order)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-rose-400 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Xóa
                    </button>
                  </div>
                )}

              </div>
            );
          })
        )}
      </div>

      {/* Pagination Footer */}
      <div className="p-4 bg-slate-900/90 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
        <div>
          Hiển thị <span className="font-bold text-white">{orders.length}</span> trên tổng số{" "}
          <span className="font-bold text-white">{totalOrders}</span> đơn hàng
        </div>

        <div className="flex items-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="p-2 bg-slate-800 border border-slate-700/80 rounded-xl text-slate-300 hover:text-white hover:border-cyan-500/50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="px-3 py-1 bg-slate-800/80 border border-slate-700/50 rounded-xl font-bold text-cyan-300">
            Trang {page} / {totalPages || 1}
          </span>

          <button
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="p-2 bg-slate-800 border border-slate-700/80 rounded-xl text-slate-300 hover:text-white hover:border-cyan-500/50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
