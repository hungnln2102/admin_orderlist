import React from "react";
import { X, Plus, Edit2, DollarSign, Calendar, Clock, User, AlertCircle } from "lucide-react";
import { SearchableProductDropdown } from "./SearchableProductDropdown";
import { SearchableSupplierDropdown } from "./SearchableSupplierDropdown";
import { DateRangePicker } from "../../../shared/components/DateRangePicker";
import { Order, CatalogProduct, CatalogSupplierCost, CatalogSupplier, OrderFormData } from "../types";
import { ORDER_STATUS, ORDER_STATUS_LABELS } from "../constants/orderStatus";
import { ORDER_PREFIX, ORDER_PREFIX_CONFIGS } from "../constants/orderPrefix";
import { parseDateToMidnight } from "../utils/durationUtils";

interface OrderCreateEditModalProps {
  isOpen: boolean;
  isEdit: boolean;
  isImportTab?: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  formData: OrderFormData;
  setFormData: React.Dispatch<React.SetStateAction<OrderFormData>>;
  productsCatalog: CatalogProduct[];
  allSuppliersCatalog: CatalogSupplier[];
  productSuppliersCatalog: CatalogSupplierCost[];
  loadingSuppliers: boolean;
  selectedProductId: number | null;
  onProductChange: (productIdVal: string) => void;
  onSupplierChange: (supplierVal: string) => void;
  onPrefixChange?: (prefixVal: string) => void;
  isCustomPriceMode: boolean;
  setIsCustomPriceMode: (val: boolean) => void;
}

export const OrderCreateEditModal: React.FC<OrderCreateEditModalProps> = ({
  isOpen,
  isEdit,
  isImportTab = false,
  onClose,
  onSubmit,
  formData,
  setFormData,
  productsCatalog,
  allSuppliersCatalog,
  productSuppliersCatalog,
  loadingSuppliers,
  selectedProductId,
  onProductChange,
  onSupplierChange,
  onPrefixChange,
  isCustomPriceMode,
  setIsCustomPriceMode,
}) => {
  if (!isOpen) return null;

  const currentPrefix = formData.order_prefix || (isImportTab ? ORDER_PREFIX.MAVN : ORDER_PREFIX.MAVC);
  const isImportMode = isImportTab || currentPrefix === ORDER_PREFIX.MAVN;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0b1329] border border-cyan-500/30 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border ${isEdit ? "bg-amber-500/10 text-amber-400 border-amber-500/30" : isImportMode ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-cyan-500/10 text-cyan-400 border-cyan-500/30"}`}>
              {isEdit ? <Edit2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">
                {isEdit
                  ? isImportMode
                    ? "Cập Nhật Thông Tin Đơn Nhập Hàng"
                    : "Cập Nhật Thông Tin Đơn Hàng"
                  : isImportMode
                  ? "Tạo Đơn Nhập Hàng Mới (MAVN)"
                  : "Tạo Đơn Bán Hàng Mới"}
              </h3>
              <p className="text-xs text-slate-400">
                {isImportMode
                  ? "Ghi nhận đơn mua hàng từ Nhà Cung Cấp (NCC), tự động ghi nhận số dư & chi phí nhập"
                  : isEdit
                  ? "Điều chỉnh giá bán, trạng thái, ngày hết hạn hoặc thông tin khách hàng"
                  : "Điền đầy đủ thông tin để tạo đơn bán hàng mới vào hệ thống"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={onSubmit} className="p-4 sm:p-6 overflow-y-auto overflow-x-hidden custom-scrollbar space-y-4 text-xs">
          {/* Section 1: Customer Information & Order Type */}
          <div className="space-y-3 bg-slate-900/40 p-4 rounded-xl border border-slate-800/80">
            <div className="font-bold text-cyan-400 text-[11px] uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> {isImportMode ? "Thông Tin Đơn Nhập Hàng" : "Thông Tin Khách Hàng & Loại Đơn"}</span>
              <span className={`text-[10.5px] font-mono font-bold px-2 py-0.5 rounded border ${isImportMode ? "text-emerald-300 bg-emerald-500/10 border-emerald-500/20" : "text-cyan-300 bg-cyan-500/10 border-cyan-500/20"}`}>
                Mã: {currentPrefix}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Loại Mã Đơn (Prefix) *</label>
                <select
                  value={currentPrefix}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (onPrefixChange) {
                      onPrefixChange(val);
                    } else {
                      setFormData({ ...formData, order_prefix: val });
                    }
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-cyan-300 font-bold focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  {isImportMode ? (
                    <option value={ORDER_PREFIX.MAVN}>{ORDER_PREFIX_CONFIGS[ORDER_PREFIX.MAVN].prefix} — {ORDER_PREFIX_CONFIGS[ORDER_PREFIX.MAVN].shortLabel}</option>
                  ) : (
                    <>
                      <option value={ORDER_PREFIX.MAVC}>{ORDER_PREFIX_CONFIGS[ORDER_PREFIX.MAVC].prefix} — {ORDER_PREFIX_CONFIGS[ORDER_PREFIX.MAVC].shortLabel}</option>
                      <option value={ORDER_PREFIX.MAVL}>{ORDER_PREFIX_CONFIGS[ORDER_PREFIX.MAVL].prefix} — {ORDER_PREFIX_CONFIGS[ORDER_PREFIX.MAVL].shortLabel}</option>
                      <option value={ORDER_PREFIX.MAVK}>{ORDER_PREFIX_CONFIGS[ORDER_PREFIX.MAVK].prefix} — {ORDER_PREFIX_CONFIGS[ORDER_PREFIX.MAVK].shortLabel}</option>
                      <option value={ORDER_PREFIX.MAVS}>{ORDER_PREFIX_CONFIGS[ORDER_PREFIX.MAVS].prefix} — {ORDER_PREFIX_CONFIGS[ORDER_PREFIX.MAVS].shortLabel}</option>
                      <option value={ORDER_PREFIX.MAVT}>{ORDER_PREFIX_CONFIGS[ORDER_PREFIX.MAVT].prefix} — {ORDER_PREFIX_CONFIGS[ORDER_PREFIX.MAVT].shortLabel} (0đ)</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Tên Khách Hàng *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Nguyễn Văn A"
                  value={formData.customer}
                  onChange={(e) => setFormData({ ...formData, customer: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">SĐT / Zalo / Facebook</label>
                <input
                  type="text"
                  placeholder="Ví dụ: 0987654321"
                  value={formData.contact}
                  onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Catalog Product & Supplier Selection */}
          <div className="space-y-3 bg-slate-900/40 p-4 rounded-xl border border-slate-800/80">
            <div className="font-bold text-cyan-400 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
              Tra Cứu Danh Mục Sản Phẩm & Nhà Cung Cấp
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Chọn Sản Phẩm từ Catalog</label>
                <SearchableProductDropdown
                  products={productsCatalog}
                  selectedProductId={selectedProductId}
                  onSelectProduct={onProductChange}
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Chọn Nhà Cung Cấp (NCC)</label>
                <SearchableSupplierDropdown
                  productSuppliers={productSuppliersCatalog}
                  allSuppliers={allSuppliersCatalog}
                  selectedSupplierName={formData.supply_id}
                  onSelectSupplier={onSupplierChange}
                  loadingSuppliers={loadingSuppliers}
                />
              </div>
            </div>
          </div>

          {/* Section 3: Order Details */}
          <div className="space-y-3 bg-slate-900/40 p-4 rounded-xl border border-slate-800/80">
            <div className="font-bold text-cyan-400 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
              Chi Tiết Đơn Hàng & Tài Khoản
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Thông Tin Sản Phẩm</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Gói 1 Tháng, 1 Năm..."
                  value={formData.information_order}
                  onChange={(e) => setFormData({ ...formData, information_order: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Slot</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Slot 1 - user@gmail.com | pass123"
                  value={formData.slot}
                  onChange={(e) => setFormData({ ...formData, slot: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Pricing Details */}
            <div className={`grid grid-cols-1 ${isEdit ? "sm:grid-cols-3" : "sm:grid-cols-2"} gap-3 pt-2`}>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-400 font-medium">
                    Giá Bán ({currentPrefix === "MAVC" ? "CTV" : currentPrefix === "MAVL" ? "Bán Lẻ" : currentPrefix === "MAVK" ? "Khuyến Mãi" : currentPrefix === "MAVS" ? "Sinh Viên" : currentPrefix === "MAVT" ? "Quà Tặng" : "Nhập Hàng"}) (₫) *
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsCustomPriceMode(!isCustomPriceMode)}
                    className="text-[10px] text-cyan-400 hover:underline cursor-pointer"
                  >
                    {isCustomPriceMode ? "Khóa giá" : "Tùy chỉnh"}
                  </button>
                </div>
                <input
                  type="number"
                  required
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: Number(e.target.value), gross_selling_price: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-emerald-400 font-bold font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Giá Vốn Nhập NCC (₫)</label>
                <input
                  type="number"
                  value={formData.cost}
                  onChange={(e) => setFormData({ ...formData, cost: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-purple-300 font-bold font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              {isEdit && (
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Trạng Thái Đơn *</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
                  >
                    <option value={ORDER_STATUS.PAID}>{ORDER_STATUS_LABELS[ORDER_STATUS.PAID]}</option>
                    <option value={ORDER_STATUS.UNPAID}>{ORDER_STATUS_LABELS[ORDER_STATUS.UNPAID]}</option>
                    <option value={ORDER_STATUS.RENEW_REQUIRED}>{ORDER_STATUS_LABELS[ORDER_STATUS.RENEW_REQUIRED]}</option>
                    <option value={ORDER_STATUS.EXPIRED}>{ORDER_STATUS_LABELS[ORDER_STATUS.EXPIRED]}</option>
                    <option value={ORDER_STATUS.REFUND_PENDING}>{ORDER_STATUS_LABELS[ORDER_STATUS.REFUND_PENDING]}</option>
                    <option value={ORDER_STATUS.REFUNDED}>{ORDER_STATUS_LABELS[ORDER_STATUS.REFUNDED]}</option>
                    <option value={ORDER_STATUS.CANCELED}>{ORDER_STATUS_LABELS[ORDER_STATUS.CANCELED]}</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Section 4: Dates & Duration */}
          <div className="space-y-3 bg-slate-900/40 p-4 rounded-xl border border-slate-800/80">
            <div className="font-bold text-cyan-400 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-cyan-400" /> Thời Gian & Hạn Sử Dụng
            </div>
            <div>
              <DateRangePicker
                label="Khung Thời Gian (Đặt Hàng — Hết Hạn)"
                startDate={formData.order_date}
                endDate={formData.expired_at}
                openDirection="up"
                onChange={(start, end) => {
                  const startDateObj = parseDateToMidnight(start) || parseDateToMidnight(formData.order_date) || new Date();
                  const endDateObj = parseDateToMidnight(end) || startDateObj;
                  const diffTime = endDateObj.getTime() - startDateObj.getTime();
                  const diffDays = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)));
                  setFormData({
                    ...formData,
                    order_date: start,
                    expired_at: end,
                    days: diffDays,
                  });
                }}
              />
            </div>
          </div>

          {/* Section 5: Note */}
          <div>
            <label className="block text-slate-400 mb-1 font-medium">Ghi Chú Đơn Hàng</label>
            <textarea
              rows={2}
              placeholder="Ghi chú thêm thông tin hoặc lưu ý về đơn hàng..."
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Modal Footer Controls */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              className={`px-5 py-2 text-slate-950 rounded-xl font-bold transition-all shadow-lg cursor-pointer ${
                isEdit
                  ? "bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 shadow-amber-500/20"
                  : "bg-gradient-to-r from-cyan-400 to-sky-500 hover:from-cyan-300 hover:to-sky-400 shadow-cyan-500/20"
              }`}
            >
              {isEdit ? "Cập Nhật Đơn Hàng" : "Tạo Đơn Hàng Mới"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
