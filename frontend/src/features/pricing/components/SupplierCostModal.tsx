import React from "react";
import {
  PlusCircle,
  Pencil,
  Building2,
  Package,
  TrendingUp,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Loader2,
} from "lucide-react";
import { BaseModal, CurrencyInputVN, CustomSelect } from "@/shared/components";
import { formatVND } from "@/shared/utils";
import { Supplier, EditingSupplierCostState, PricingItem } from "../types";

interface SupplierCostModalProps {
  addSupplierProductId: number | null;
  onCloseAddModal: () => void;
  supplierForm: { supplier_id: number; price: number };
  setSupplierForm: React.Dispatch<React.SetStateAction<{ supplier_id: number; price: number }>>;
  allSuppliers: Supplier[];
  onAddSubmit: (e: React.FormEvent) => void;

  editingSupplierCost: EditingSupplierCostState | null;
  onCloseEditModal: () => void;
  setEditingSupplierCost: React.Dispatch<React.SetStateAction<EditingSupplierCostState | null>>;
  onEditSubmit: (e: React.FormEvent) => void;

  product?: PricingItem | null;
  submitting: boolean;
}

/** Khối hiển thị biên lợi nhuận dự kiến theo giá nhập nguồn hiện tại */
const SupplierMarginPreview: React.FC<{
  product?: PricingItem | null;
  costPrice: number;
  originalPrice?: number;
}> = ({ product, costPrice, originalPrice }) => {
  const retailPrice = Number(product?.retail_price || 0);
  const ctvPrice = Number(product?.ctv_price || 0);
  const hasPricing = retailPrice > 0 || ctvPrice > 0;

  const retailProfit = retailPrice > 0 ? retailPrice - costPrice : 0;
  const retailMarginPct = retailPrice > 0 ? Math.round((retailProfit / retailPrice) * 100) : 0;

  const ctvProfit = ctvPrice > 0 ? ctvPrice - costPrice : 0;
  const ctvMarginPct = ctvPrice > 0 ? Math.round((ctvProfit / ctvPrice) * 100) : 0;

  const isOverRetail = retailPrice > 0 && costPrice > retailPrice;
  const isOverCtv = ctvPrice > 0 && costPrice > ctvPrice;

  const hasDiff =
    originalPrice !== undefined && originalPrice > 0 && costPrice > 0 && costPrice !== originalPrice;
  const diff = hasDiff ? costPrice - (originalPrice || 0) : 0;

  if (!hasPricing && !hasDiff) return null;

  return (
    <div className="rounded-2xl bg-slate-950/70 border border-slate-800/90 p-3.5 space-y-2.5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
          Dự Tính Biên Lợi Nhuận
        </span>

        {hasDiff && (
          <span
            className={`inline-flex items-center gap-1 text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg border ${
              diff > 0
                ? "bg-rose-500/10 text-rose-300 border-rose-500/25"
                : "bg-emerald-500/10 text-emerald-300 border-emerald-500/25"
            }`}
          >
            {diff > 0 ? (
              <ArrowUpRight className="w-3 h-3" />
            ) : (
              <ArrowDownRight className="w-3 h-3" />
            )}
            {diff > 0 ? `+${formatVND(diff)}` : formatVND(diff)} so với cũ
          </span>
        )}
      </div>

      {hasPricing && (
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-xl bg-slate-900/90 border border-slate-800 px-3 py-2">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Lãi Bán Lẻ
            </div>
            {retailPrice > 0 ? (
              <div className="mt-0.5 flex items-baseline gap-1.5 flex-wrap">
                <span
                  className={`text-xs sm:text-sm font-black font-mono ${
                    retailProfit >= 0 ? "text-cyan-300" : "text-rose-400"
                  }`}
                >
                  {retailProfit > 0 ? `+${formatVND(retailProfit)}` : formatVND(retailProfit)}
                </span>
                <span className="text-[10px] font-mono font-semibold text-slate-400">
                  ({retailMarginPct}%)
                </span>
              </div>
            ) : (
              <div className="mt-0.5 text-xs font-mono text-slate-500">Chưa có giá lẻ</div>
            )}
          </div>

          <div className="rounded-xl bg-slate-900/90 border border-slate-800 px-3 py-2">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Lãi CTV
            </div>
            {ctvPrice > 0 ? (
              <div className="mt-0.5 flex items-baseline gap-1.5 flex-wrap">
                <span
                  className={`text-xs sm:text-sm font-black font-mono ${
                    ctvProfit >= 0 ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {ctvProfit > 0 ? `+${formatVND(ctvProfit)}` : formatVND(ctvProfit)}
                </span>
                <span className="text-[10px] font-mono font-semibold text-slate-400">
                  ({ctvMarginPct}%)
                </span>
              </div>
            ) : (
              <div className="mt-0.5 text-xs font-mono text-slate-500">Chưa có giá CTV</div>
            )}
          </div>
        </div>
      )}

      {(isOverRetail || isOverCtv) && (
        <div className="flex items-start gap-2 rounded-xl bg-rose-500/10 border border-rose-500/25 px-3 py-2 text-[11px] text-rose-300">
          <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
          <span>
            {isOverRetail
              ? "Cảnh báo: Giá nhập đang cao hơn Giá Bán Lẻ!"
              : "Lưu ý: Giá nhập đang cao hơn Giá CTV (bán sỉ sẽ âm lãi)."}
          </span>
        </div>
      )}
    </div>
  );
};

export const SupplierCostModal: React.FC<SupplierCostModalProps> = ({
  addSupplierProductId,
  onCloseAddModal,
  supplierForm,
  setSupplierForm,
  allSuppliers,
  onAddSubmit,
  editingSupplierCost,
  onCloseEditModal,
  setEditingSupplierCost,
  onEditSubmit,
  product,
  submitting,
}) => {
  const isAddMode = addSupplierProductId !== null;
  const isEditMode = !isAddMode && editingSupplierCost !== null;

  if (!isAddMode && !isEditMode) return null;

  const formId = isAddMode ? "supplier-cost-add-form" : "supplier-cost-edit-form";
  const currentPrice = isAddMode ? supplierForm.price : editingSupplierCost!.price;
  const isSubmitDisabled =
    submitting ||
    currentPrice <= 0 ||
    (isAddMode && !supplierForm.supplier_id);

  return (
    <BaseModal
      isOpen={isAddMode || isEditMode}
      onClose={isAddMode ? onCloseAddModal : onCloseEditModal}
      size="md"
      borderClassName={isAddMode ? "border-cyan-500/30" : "border-amber-500/30"}
      title={isAddMode ? "Thêm Nguồn Giá NCC" : "Sửa Giá Nhập NCC"}
      subtitle={
        isAddMode
          ? "Gắn nhà cung cấp và thiết lập đơn giá nhập cho sản phẩm"
          : "Điều chỉnh đơn giá nhập mới nhất từ nhà cung cấp"
      }
      icon={
        <div
          className={`p-2.5 rounded-xl border ${
            isAddMode
              ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30"
              : "bg-amber-500/10 text-amber-400 border-amber-500/30"
          }`}
        >
          {isAddMode ? <PlusCircle className="w-5 h-5" /> : <Pencil className="w-5 h-5" />}
        </div>
      }
      footer={
        <>
          <button
            type="button"
            onClick={isAddMode ? onCloseAddModal : onCloseEditModal}
            disabled={submitting}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            type="submit"
            form={formId}
            disabled={isSubmitDisabled}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold text-slate-950 flex items-center gap-2 transition-all shadow-lg cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
              isAddMode
                ? "bg-gradient-to-r from-cyan-400 to-sky-500 hover:from-cyan-300 hover:to-sky-400 shadow-cyan-500/20"
                : "bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 shadow-amber-500/20"
            }`}
          >
            {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>
              {submitting
                ? "Đang lưu..."
                : isAddMode
                ? "Thêm Nguồn Giá"
                : "Lưu Thay Đổi"}
            </span>
          </button>
        </>
      }
    >
      <form
        id={formId}
        onSubmit={isAddMode ? onAddSubmit : onEditSubmit}
        className="space-y-4 text-xs"
      >
        {/* Ngữ cảnh sản phẩm đang cấu hình */}
        {product && (
          <div className="rounded-2xl bg-slate-950/70 border border-slate-800/90 p-3.5 flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5 min-w-0">
              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-cyan-400 shrink-0">
                <Package className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Sản phẩm áp dụng
                </div>
                <div className="text-sm font-bold text-white truncate mt-0.5">
                  {product.package_product || product.san_pham}
                </div>
                {product.package_product && product.package_product !== product.san_pham && (
                  <div className="text-[11px] font-mono text-slate-400 truncate">
                    {product.san_pham}
                  </div>
                )}
              </div>
            </div>

            {product.retail_price > 0 && (
              <div className="text-right shrink-0">
                <div className="text-[10px] text-slate-400">Giá bán lẻ</div>
                <div className="text-xs font-mono font-bold text-cyan-300">
                  {formatVND(product.retail_price)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Nhà cung cấp */}
        {isAddMode ? (
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-cyan-400" />
              Chọn Nhà Cung Cấp <span className="text-rose-400">*</span>
            </label>
            <CustomSelect
              value={supplierForm.supplier_id ? String(supplierForm.supplier_id) : ""}
              onChange={(val) =>
                setSupplierForm({ ...supplierForm, supplier_id: Number(val) || 0 })
              }
              size="md"
              accent="cyan"
              placeholder="-- Chọn nhà cung cấp --"
              className="bg-slate-950/80 border-slate-700/80"
              options={allSuppliers.map((s) => ({
                value: String(s.id),
                label: `${s.supplier_name}${s.number_bank ? ` (${s.number_bank})` : ""}`,
              }))}
            />
          </div>
        ) : (
          <div className="rounded-2xl bg-slate-950/60 border border-slate-800 px-3.5 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
                <Building2 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Nhà cung cấp
                </div>
                <div className="text-sm font-bold text-white truncate">
                  {editingSupplierCost!.supplierName}
                </div>
              </div>
            </div>

            {editingSupplierCost!.originalPrice !== undefined &&
              editingSupplierCost!.originalPrice > 0 && (
                <div className="text-right shrink-0">
                  <div className="text-[10px] text-slate-400">Giá cũ</div>
                  <div className="text-xs font-mono font-semibold text-slate-300">
                    {formatVND(editingSupplierCost!.originalPrice)}
                  </div>
                </div>
              )}
          </div>
        )}

        {/* Ô nhập giá nguồn chuẩn CurrencyInputVN */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-300">
              {isAddMode ? "Giá Nhập Nguồn (₫)" : "Giá Nhập Nguồn Mới (₫)"}{" "}
              <span className="text-rose-400">*</span>
            </label>
            <span className="text-[10px] font-mono text-slate-500">
              Tự định dạng theo hàng nghìn
            </span>
          </div>
          <CurrencyInputVN
            value={currentPrice}
            onChange={(val) => {
              if (isAddMode) {
                setSupplierForm({ ...supplierForm, price: val });
              } else {
                setEditingSupplierCost({ ...editingSupplierCost!, price: val });
              }
            }}
            accentColor={isAddMode ? "cyan" : "amber"}
            suffix="₫"
            required
            autoFocus
            placeholder={isAddMode ? "VD: 200.000" : "VD: 145.000"}
            className="py-3 text-base"
          />
        </div>

        {/* Xem trước lợi nhuận trực tiếp */}
        <SupplierMarginPreview
          product={product}
          costPrice={currentPrice}
          originalPrice={isEditMode ? editingSupplierCost!.originalPrice : undefined}
        />
      </form>
    </BaseModal>
  );
};
