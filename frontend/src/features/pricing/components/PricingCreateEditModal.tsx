import React from "react";
import { Plus, Pencil, X, Tag, DollarSign, TrendingUp, AlertTriangle, Layers } from "lucide-react";
import { PricingItem, ProductFormData } from "../types";

interface PricingCreateEditModalProps {
  isOpen: boolean;
  editingItem: PricingItem | null;
  onClose: () => void;
  productForm: ProductFormData;
  setProductForm: React.Dispatch<React.SetStateAction<ProductFormData>>;
  onSubmit: (e: React.FormEvent) => void;
  submitting: boolean;
}

const formatVND = (val: number): string => {
  if (!val || isNaN(val) || val <= 0) return "0 ₫";
  return new Intl.NumberFormat("vi-VN").format(val) + " ₫";
};

export const PricingCreateEditModal: React.FC<PricingCreateEditModalProps> = ({
  isOpen,
  editingItem,
  onClose,
  productForm,
  setProductForm,
  onSubmit,
  submitting,
}) => {
  if (!isOpen && !editingItem) return null;

  const isEdit = Boolean(editingItem);

  // Tính toán lợi nhuận thời gian thực (Live Profit Calculations)
  const basePrice = Number(productForm.base_price || 0);
  const retailPrice = Number(productForm.retail_price || 0);
  const ctvPrice = Number(productForm.ctv_price || 0);

  const retailProfit = retailPrice - basePrice;
  const retailMarginPct = retailPrice > 0 ? Math.round((retailProfit / retailPrice) * 100) : 0;

  const ctvProfit = ctvPrice - basePrice;
  const ctvMarginPct = ctvPrice > 0 ? Math.round((ctvProfit / ctvPrice) * 100) : 0;

  const isBelowCost = basePrice > 0 && retailPrice > 0 && retailPrice < basePrice;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0b1329] border border-cyan-500/30 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl border ${
                isEdit
                  ? "bg-amber-500/10 text-amber-400 border-amber-500/30 shadow-inner"
                  : "bg-cyan-500/10 text-cyan-400 border-cyan-500/30 shadow-inner"
              }`}
            >
              {isEdit ? <Pencil className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">
                {isEdit ? "Sửa Bảng Giá Sản Phẩm" : "Tạo Sản Phẩm & Bảng Giá Mới"}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {isEdit
                  ? "Điều chỉnh tên hiển thị, các bậc giá bán và giá vốn sản phẩm"
                  : "Điền thông tin và thiết lập bảng giá niêm yết cho sản phẩm mới"}
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
        <form onSubmit={onSubmit} className="p-4 sm:p-6 overflow-y-auto custom-scrollbar space-y-4 text-xs">
          {/* Section 1: Product SKU & Variant Information */}
          <div className="space-y-3 bg-slate-900/40 p-4 rounded-xl border border-slate-800/80">
            <div className="font-bold text-cyan-400 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-cyan-400" /> Thông Tin Sản Phẩm & Biến Thể
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Tên Sản Phẩm (SKU / Mã) *</label>
                <input
                  type="text"
                  required
                  placeholder="VD: Icloud400_Add--12m, Youtube_Add--6m..."
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2.5 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 font-mono text-xs transition-colors"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Mã định danh kỹ thuật trong catalog</span>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Tên Gói / Biến Thể Hiển Thị</label>
                <input
                  type="text"
                  placeholder="VD: iCloud Gói 400GB, Youtube Premium 6 Tháng..."
                  value={productForm.variant_name}
                  onChange={(e) => setProductForm({ ...productForm, variant_name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2.5 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 text-xs transition-colors"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Tên hiển thị thân thiện trên hóa đơn & đơn hàng</span>
              </div>
            </div>
          </div>

          {/* Section 2: Multi-Tier Pricing Matrix */}
          <div className="space-y-3 bg-slate-900/40 p-4 rounded-xl border border-slate-800/80">
            <div className="flex items-center justify-between">
              <span className="font-bold text-cyan-400 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-cyan-400" /> Cấu Hình Bảng Giá Niêm Yết
              </span>
              <span className="text-[10.5px] font-mono text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded border border-slate-700/60">
                Đơn vị: VNĐ
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Giá Bán Lẻ (Khách Lẻ) */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-semibold text-xs flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                    Giá Bán Lẻ (Khách lẻ)
                  </label>
                  <span className="text-[11px] font-mono font-bold text-cyan-300 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">
                    {formatVND(productForm.retail_price)}
                  </span>
                </div>
                <input
                  type="number"
                  min={0}
                  placeholder="VD: 750000"
                  value={productForm.retail_price || ""}
                  onChange={(e) => setProductForm({ ...productForm, retail_price: Number(e.target.value) })}
                  className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3 py-2 text-cyan-300 font-bold font-mono focus:outline-none focus:border-cyan-400 text-sm transition-colors"
                />
              </div>

              {/* Giá CTV (Sỉ / Đại lý) */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-semibold text-xs flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    Giá CTV (Sỉ / Đại lý)
                  </label>
                  <span className="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                    {formatVND(productForm.ctv_price)}
                  </span>
                </div>
                <input
                  type="number"
                  min={0}
                  placeholder="VD: 650000"
                  value={productForm.ctv_price || ""}
                  onChange={(e) => setProductForm({ ...productForm, ctv_price: Number(e.target.value) })}
                  className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3 py-2 text-emerald-400 font-bold font-mono focus:outline-none focus:border-emerald-400 text-sm transition-colors"
                />
              </div>

              {/* Giá Gốc (Chi phí vốn) */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-semibold text-xs flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                    Giá Gốc (Chi phí vốn)
                  </label>
                  <span className="text-[11px] font-mono font-bold text-purple-300 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">
                    {formatVND(productForm.base_price)}
                  </span>
                </div>
                <input
                  type="number"
                  min={0}
                  placeholder="VD: 400000"
                  value={productForm.base_price || ""}
                  onChange={(e) => setProductForm({ ...productForm, base_price: Number(e.target.value) })}
                  className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3 py-2 text-purple-300 font-bold font-mono focus:outline-none focus:border-purple-400 text-sm transition-colors"
                />
              </div>

              {/* Giá Sinh Viên */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-semibold text-xs flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                    Giá Sinh Viên (Ưu đãi)
                  </label>
                  <span className="text-[11px] font-mono font-bold text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                    {formatVND(productForm.student_price)}
                  </span>
                </div>
                <input
                  type="number"
                  min={0}
                  placeholder="VD: 550000"
                  value={productForm.student_price || ""}
                  onChange={(e) => setProductForm({ ...productForm, student_price: Number(e.target.value) })}
                  className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3 py-2 text-amber-300 font-bold font-mono focus:outline-none focus:border-amber-400 text-sm transition-colors"
                />
              </div>

              {/* Giá Khuyến Mãi (KM) */}
              <div className="space-y-1 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-semibold text-xs flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                    Giá Khuyến Mãi (Flash sale / Sự kiện)
                  </label>
                  <span className="text-[11px] font-mono font-bold text-rose-300 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                    {formatVND(productForm.promo_price)}
                  </span>
                </div>
                <input
                  type="number"
                  min={0}
                  placeholder="VD: 690000 (Để 0 nếu không khuyến mãi)"
                  value={productForm.promo_price || ""}
                  onChange={(e) => setProductForm({ ...productForm, promo_price: Number(e.target.value) })}
                  className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3 py-2 text-rose-300 font-bold font-mono focus:outline-none focus:border-rose-400 text-sm transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Live Profit & Margin Estimator */}
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-indigo-500/25 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-300 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-indigo-400" /> Bảng Tính Lợi Nhuận Dự Kiến
              </span>
              {isBelowCost && (
                <span className="flex items-center gap-1 text-[10.5px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                  <AlertTriangle className="w-3 h-3" /> Cảnh báo: Giá bán lẻ thấp hơn giá gốc!
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-950/70 border border-slate-800/80 p-2.5 rounded-xl">
                <div className="text-[10px] text-slate-400 font-semibold uppercase">Lãi Khách Lẻ (Bán lẻ - Gốc)</div>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className={`text-sm font-black font-mono ${retailProfit >= 0 ? "text-cyan-400" : "text-rose-400"}`}>
                    {retailProfit >= 0 ? `+${formatVND(retailProfit)}` : formatVND(retailProfit)}
                  </span>
                  <span className="text-[10.5px] font-bold text-slate-400 font-mono">
                    ({retailMarginPct}%)
                  </span>
                </div>
              </div>

              <div className="bg-slate-950/70 border border-slate-800/80 p-2.5 rounded-xl">
                <div className="text-[10px] text-slate-400 font-semibold uppercase">Lãi CTV (CTV - Gốc)</div>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className={`text-sm font-black font-mono ${ctvProfit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {ctvProfit >= 0 ? `+${formatVND(ctvProfit)}` : formatVND(ctvProfit)}
                  </span>
                  <span className="text-[10.5px] font-bold text-slate-400 font-mono">
                    ({ctvMarginPct}%)
                  </span>
                </div>
              </div>
            </div>
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
              disabled={submitting || !productForm.name.trim()}
              className={`px-5 py-2.5 text-slate-950 rounded-xl font-bold transition-all shadow-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                isEdit
                  ? "bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 shadow-amber-500/20"
                  : "bg-gradient-to-r from-cyan-400 to-sky-500 hover:from-cyan-300 hover:to-sky-400 shadow-cyan-500/20"
              }`}
            >
              {submitting ? "Đang lưu..." : isEdit ? "Lưu Thay Đổi" : "Xác Nhận Tạo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
