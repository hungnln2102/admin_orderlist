import React from "react";
import { X, Plus, Edit2, DollarSign, Calendar, Clock, User, AlertCircle, Archive } from "lucide-react";
import { SearchableProductDropdown } from "./SearchableProductDropdown";
import { SearchableSupplierDropdown } from "./SearchableSupplierDropdown";
import { DateRangePicker } from "../../../shared/components/DateRangePicker";
import { Order, CatalogProduct, CatalogSupplierCost, CatalogSupplier, OrderFormData } from "../types";
import { ORDER_STATUS, ORDER_STATUS_LABELS } from "../constants/orderStatus";
import { ORDER_PREFIX, ORDER_PREFIX_CONFIGS } from "../constants/orderPrefix";
import { parseDateToMidnight, calculateExpirationDateFromStart } from "../utils/durationUtils";

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
  hasPackage?: boolean;
  requiresStorage?: boolean;
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
  hasPackage = true,
  requiresStorage = false,
}) => {
  if (!isOpen) return null;

  const currentPrefix = formData.order_prefix || (isImportTab ? ORDER_PREFIX.MAVN : ORDER_PREFIX.MAVC);
  const isImportMode = isImportTab || currentPrefix === ORDER_PREFIX.MAVN;

  const matchedProduct = productsCatalog.find(
    (p) =>
      Number(p.id) === Number(formData.id_product) ||
      String(p.id) === String(formData.id_product) ||
      (p.package_product && p.package_product === formData.id_product) ||
      p.san_pham === formData.id_product
  );

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
          {/* Section 1: Customer Information & Order Type (Only for non-import mode) */}
          {!isImportMode && (
            <div className="space-y-3 bg-slate-900/40 p-4 rounded-xl border border-slate-800/80">
              <div className="font-bold text-cyan-400 text-[11px] uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Thông Tin Khách Hàng & Loại Đơn</span>
                <span className="text-[10.5px] font-mono font-bold px-2 py-0.5 rounded border text-cyan-300 bg-cyan-500/10 border-cyan-500/20">
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
                    <option value={ORDER_PREFIX.MAVC}>{ORDER_PREFIX_CONFIGS[ORDER_PREFIX.MAVC].prefix} — {ORDER_PREFIX_CONFIGS[ORDER_PREFIX.MAVC].shortLabel}</option>
                    <option value={ORDER_PREFIX.MAVL}>{ORDER_PREFIX_CONFIGS[ORDER_PREFIX.MAVL].prefix} — {ORDER_PREFIX_CONFIGS[ORDER_PREFIX.MAVL].shortLabel}</option>
                    <option value={ORDER_PREFIX.MAVK}>{ORDER_PREFIX_CONFIGS[ORDER_PREFIX.MAVK].prefix} — {ORDER_PREFIX_CONFIGS[ORDER_PREFIX.MAVK].shortLabel}</option>
                    <option value={ORDER_PREFIX.MAVS}>{ORDER_PREFIX_CONFIGS[ORDER_PREFIX.MAVS].prefix} — {ORDER_PREFIX_CONFIGS[ORDER_PREFIX.MAVS].shortLabel}</option>
                    <option value={ORDER_PREFIX.MAVT}>{ORDER_PREFIX_CONFIGS[ORDER_PREFIX.MAVT].prefix} — {ORDER_PREFIX_CONFIGS[ORDER_PREFIX.MAVT].shortLabel} (0đ)</option>
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
          )}

          {/* Section: Lưu kho toggle (Only for import mode) */}
          {isImportMode && (
            <div className="space-y-3">
              <div className="relative overflow-hidden rounded-xl border border-cyan-500/20 bg-gradient-to-b from-cyan-950/20 to-transparent p-4 backdrop-blur-xl">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-300">
                      <Archive className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white tracking-wide">
                        Lưu vào Kho Hàng
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        {formData.save_to_warehouse !== false
                          ? "Lưu thông tin tài khoản và slot vào hệ thống kho hàng."
                          : "Chỉ tạo đơn nhập hàng bình thường (Không lưu vào kho)."}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 bg-cyan-950/40 border border-cyan-500/20 rounded-xl px-3 py-1.5">
                    <span className="text-[11px] font-semibold text-cyan-200/80">Lưu kho:</span>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          save_to_warehouse: formData.save_to_warehouse === false ? true : false,
                        })
                      }
                      className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        formData.save_to_warehouse !== false ? "bg-cyan-500 shadow-[0_0_10px_rgba(6,182,214,0.5)]" : "bg-slate-700"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          formData.save_to_warehouse !== false ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Section: Lưu Gói Sản Phẩm toggle & Sub-form */}
              <div className="relative overflow-hidden rounded-xl border border-purple-500/20 bg-gradient-to-b from-purple-950/20 to-transparent p-4 backdrop-blur-xl">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-300">
                      <Archive className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white tracking-wide">
                        Lưu Gói Sản Phẩm
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        {formData.save_to_package !== false
                          ? "Tự động đồng bộ / tạo gói sản phẩm trong kho gói."
                          : "Bỏ qua lưu kho gói sản phẩm."}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 bg-purple-950/40 border border-purple-500/20 rounded-xl px-3 py-1.5">
                    <span className="text-[11px] font-semibold text-purple-200/80">Lưu Gói:</span>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          save_to_package: formData.save_to_package === false ? true : false,
                        })
                      }
                      className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        formData.save_to_package !== false ? "bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]" : "bg-slate-700"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          formData.save_to_package !== false ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {formData.save_to_package !== false && hasPackage === false && (
                  <div className="mt-3 pt-3 border-t border-purple-500/20 space-y-3">
                    <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 px-3 py-2 rounded-xl text-[11px] flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>Sản phẩm này chưa có Gói Sản Phẩm chính trong kho. Vui lòng cấu hình thông tin tạo gói bên dưới:</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-400 mb-1 font-medium">Số Slot Gói (Tổng slot) *</label>
                        <input
                          type="number"
                          min={1}
                          value={formData.package_slots || 2}
                          onChange={(e) => setFormData({ ...formData, package_slots: parseInt(e.target.value) || 2 })}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-400 mb-1 font-medium">Quy Tắc Khớp Đơn *</label>
                        <select
                          value={formData.package_match_rule || "information"}
                          onChange={(e) => setFormData({ ...formData, package_match_rule: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-purple-300 font-bold focus:outline-none focus:border-purple-500 cursor-pointer"
                        >
                          <option value="information">Khớp theo Thông Tin SP</option>
                          <option value="slot">Khớp theo Tài khoản / Slot</option>
                          <option value="both">Khớp cả hai (Information & Slot)</option>
                        </select>
                      </div>
                    </div>

                    {requiresStorage && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-slate-400 mb-1 font-medium">Tài khoản liên kết (Storage Account)</label>
                          <input
                            type="text"
                            placeholder="Ví dụ: storage@gmail.com"
                            value={formData.storage_account_username || ""}
                            onChange={(e) => setFormData({ ...formData, storage_account_username: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500 font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-400 mb-1 font-medium">Dung lượng tổng (Storage Total)</label>
                          <input
                            type="text"
                            placeholder="Ví dụ: 200GB, 2TB"
                            value={formData.storage_total || ""}
                            onChange={(e) => setFormData({ ...formData, storage_total: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500 font-mono"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Section 2: Catalog Product & Supplier Selection */}
          <div className="space-y-3 bg-slate-900/40 p-4 rounded-xl border border-slate-800/80">
            <div className="font-bold text-cyan-400 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
              Tra Cứu Danh Mục Sản Phẩm & Nhà Cung Cấp
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">{isEdit ? "Sản Phẩm (Biến Thể)" : "Chọn Sản Phẩm từ Catalog *"}</label>
                {isEdit ? (
                  <div className="w-full bg-slate-950/80 border border-slate-800/80 rounded-xl px-3 py-2 text-cyan-300 font-bold flex items-center min-h-[38px]">
                    {(() => {
                      const matched = productsCatalog.find(
                        (p) =>
                          Number(p.id) === Number(formData.id_product) ||
                          String(p.id) === String(formData.id_product) ||
                          (p.package_product && p.package_product === formData.id_product) ||
                          p.san_pham === formData.id_product
                      );
                      const displayVariant = matched?.package_product || formData.variant_name || matched?.san_pham;
                      const skuBadge = matched?.san_pham || formData.display_name;
                      if (displayVariant && !/^\d+$/.test(displayVariant)) {
                        return (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-white font-bold">{displayVariant}</span>
                            {skuBadge && skuBadge !== displayVariant && (
                              <span className="text-[10.5px] text-slate-400 font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                                {skuBadge}
                              </span>
                            )}
                          </div>
                        );
                      }
                      return formData.id_product && !/^\d+$/.test(formData.id_product)
                        ? formData.id_product
                        : `Sản phẩm #${formData.id_product || "Không đổi"}`;
                    })()}
                  </div>
                ) : (
                  <SearchableProductDropdown
                    products={productsCatalog}
                    selectedProductId={selectedProductId}
                    onSelectProduct={onProductChange}
                  />
                )}
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">{isEdit ? "Nhà Cung Cấp (NCC)" : "Chọn Nhà Cung Cấp (NCC) *"}</label>
                {isEdit ? (
                  <div className="w-full bg-slate-950/80 border border-slate-800/80 rounded-xl px-3 py-2 text-purple-300 font-bold flex items-center min-h-[38px]">
                    {formData.supply_id || "Chưa có NCC"}
                  </div>
                ) : (
                  <SearchableSupplierDropdown
                    productSuppliers={productSuppliersCatalog}
                    allSuppliers={allSuppliersCatalog}
                    selectedSupplierName={formData.supply_id}
                    onSelectSupplier={onSupplierChange}
                    loadingSuppliers={loadingSuppliers}
                    disabled={!selectedProductId && !formData.id_product}
                  />
                )}
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
                <label className="block text-slate-400 mb-1 font-medium">Thông Tin Sản Phẩm *</label>
                <input
                  type="text"
                  required
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">
                  Giá Bán ({currentPrefix === "MAVC" ? "CTV" : currentPrefix === "MAVL" ? "Bán Lẻ" : currentPrefix === "MAVK" ? "Khuyến Mãi" : currentPrefix === "MAVS" ? "Sinh Viên" : currentPrefix === "MAVT" ? "Quà Tặng" : "Nhập Hàng"}) (₫) *
                </label>
                <input
                  type="number"
                  required
                  readOnly
                  value={formData.price}
                  className="w-full bg-slate-950/80 border border-slate-800/80 rounded-xl px-3 py-2 text-emerald-400 font-bold font-mono focus:outline-none cursor-not-allowed opacity-90 select-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Giá Vốn Nhập NCC (₫) *</label>
                <input
                  type="number"
                  required
                  readOnly
                  value={formData.cost}
                  className="w-full bg-slate-950/80 border border-slate-800/80 rounded-xl px-3 py-2 text-purple-300 font-bold font-mono focus:outline-none cursor-not-allowed opacity-90 select-none"
                />
              </div>
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
                onChange={(start, end, changedField) => {
                  const isStartDateChanged = changedField === "start" || (start !== formData.order_date && end === formData.expired_at);

                  if (isStartDateChanged) {
                    const textToMatch = `${matchedProduct?.package_product || ""} ${formData.variant_name || ""} ${formData.display_name || ""} ${matchedProduct?.san_pham || ""} ${formData.id_product || ""}`;
                    const autoCalc = calculateExpirationDateFromStart(start, textToMatch, formData.days);
                    setFormData({
                      ...formData,
                      order_date: start,
                      expired_at: autoCalc.expired_at,
                      days: autoCalc.days,
                    });
                  } else {
                    const startDateObj = parseDateToMidnight(formData.order_date) || new Date();
                    const endDateObj = parseDateToMidnight(end) || startDateObj;
                    const diffTime = endDateObj.getTime() - startDateObj.getTime();
                    const diffDays = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)));
                    setFormData({
                      ...formData,
                      order_date: formData.order_date,
                      expired_at: end,
                      days: diffDays,
                    });
                  }
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
              disabled={!selectedProductId && !formData.id_product || !formData.supply_id}
              title={(!selectedProductId && !formData.id_product) ? "Vui lòng chọn sản phẩm" : !formData.supply_id ? "Vui lòng chọn nhà cung cấp" : ""}
              className={`px-5 py-2 text-slate-950 rounded-xl font-bold transition-all shadow-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
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
