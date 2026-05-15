import { PlusIcon } from "@heroicons/react/24/outline";
import { useEffect, useMemo, useState } from "react";
import type { ProductEditFormState } from "../types";
import PricePreviewGrid from "./product-edit-panel/PricePreviewGrid";

const BASE_PRICE_CURRENCY_OPTIONS: Array<{
  value: ProductEditFormState["basePriceCurrency"];
  label: string;
}> = [
  { value: "VND", label: "VND" },
  { value: "USD", label: "USD" },
  { value: "EUR", label: "EUR" },
  { value: "GBP", label: "GBP" },
  { value: "CNY", label: "CNY" },
  { value: "JPY", label: "JPY" },
];

const SECTION_PANEL_CLASS =
  "rounded-[22px] border border-white/10 bg-gradient-to-br from-slate-900/55 via-slate-900/45 to-indigo-950/55 p-4 md:p-5 shadow-[0_20px_55px_-35px_rgba(0,0,0,0.75)] backdrop-blur";

const FIELD_LABEL_CLASS =
  "text-[11px] font-semibold uppercase tracking-[0.08em] text-white/65";

const BASE_INPUT_CLASS =
  "mt-1.5 h-11 w-full rounded-xl border border-white/15 bg-slate-950/45 px-3 text-sm text-white placeholder:text-white/45 shadow-inner transition focus:border-sky-300/40 focus:ring-2 focus:ring-sky-200/20";

const BASE_SELECT_CLASS =
  "mt-1.5 h-11 rounded-xl border border-white/15 bg-slate-950/45 px-3 text-sm text-white shadow-inner transition focus:border-sky-300/40 focus:ring-2 focus:ring-sky-200/20";

type ProductEditPanelProps = {
  productId: number;
  currentEditForm: ProductEditFormState;
  productNameOptions: string[];
  highestSupplyPriceDisplay: string;
  previewWholesaleProfitLabel: string | null;
  previewRetailProfitLabel: string | null;
  previewWholesalePrice: number | null;
  previewRetailPrice: number | null;
  previewStudentPrice: number | null;
  previewStudentBlendHint: string | null;
  previewPromoPrice: number | null;
  previewPromoPercentLabel: string | null;
  showPreviewPromo: boolean;
  showPreviewStudent: boolean;
  productEditError: string | null;
  isSavingProductEdit: boolean;
  onProductEditChange: (
    field: keyof ProductEditFormState,
    value: string
  ) => void;
  onCancelProductEdit: () => void;
  onSubmitProductEdit: () => void;
};

export function ProductEditPanel({
  productId,
  currentEditForm,
  productNameOptions,
  highestSupplyPriceDisplay,
  previewWholesaleProfitLabel,
  previewRetailProfitLabel,
  previewWholesalePrice,
  previewRetailPrice,
  previewStudentPrice,
  previewStudentBlendHint,
  previewPromoPrice,
  previewPromoPercentLabel,
  showPreviewPromo,
  showPreviewStudent,
  productEditError,
  isSavingProductEdit,
  onProductEditChange,
  onCancelProductEdit,
  onSubmitProductEdit,
}: ProductEditPanelProps) {
  const [isCustomProductName, setIsCustomProductName] = useState(false);

  const availableProductNameOptions = useMemo(() => {
    const seen = new Set<string>();
    return productNameOptions.filter((name) => {
      const trimmed = name.trim();
      if (!trimmed) return false;
      const key = trimmed.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [productNameOptions]);

  const dropdownProductNameOptions = useMemo(() => {
    const currentName = currentEditForm.packageName.trim();
    if (!currentName) return availableProductNameOptions;

    const exists = availableProductNameOptions.some(
      (option) => option.toLowerCase() === currentName.toLowerCase()
    );
    return exists
      ? availableProductNameOptions
      : [currentName, ...availableProductNameOptions];
  }, [availableProductNameOptions, currentEditForm.packageName]);

  useEffect(() => {
    setIsCustomProductName(false);
  }, [productId]);

  const handleUseDropdownProductName = () => {
    const fallbackName = availableProductNameOptions[0] ?? "";
    setIsCustomProductName(false);
    if (
      fallbackName &&
      fallbackName.toLowerCase() !== currentEditForm.packageName.trim().toLowerCase()
    ) {
      onProductEditChange("packageName", fallbackName);
    }
  };

  return (
    <div className="space-y-5 rounded-[24px] border border-white/10 bg-gradient-to-br from-[#101739]/90 via-[#0b1530]/85 to-[#1c1345]/85 px-4 py-5 text-white shadow-[0_30px_70px_-45px_rgba(0,0,0,0.95)] md:space-y-6 md:px-6 md:py-6">
      <div className="grid items-start gap-4 md:grid-cols-2">
        <div className={SECTION_PANEL_CLASS}>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-sky-200/95">
            Thông Tin Sản Phẩm
          </p>
          <div className="mt-4 space-y-3.5">
            <div>
              <div className="flex items-center justify-between gap-3">
                <label className={FIELD_LABEL_CLASS}>
                  Tên sản phẩm
                </label>
                {isCustomProductName ? (
                  <button
                    type="button"
                    onClick={handleUseDropdownProductName}
                    className="inline-flex items-center rounded-lg border border-sky-300/25 bg-sky-400/10 px-2.5 py-1 text-[11px] font-semibold text-sky-100 transition hover:bg-sky-400/20"
                  >
                    Chọn sẵn
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsCustomProductName(true)}
                    className="inline-flex items-center gap-1 rounded-lg border border-emerald-300/25 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-100 transition hover:bg-emerald-400/20"
                    title="Thêm product mới"
                    aria-label="Thêm product mới"
                  >
                    <PlusIcon className="h-3.5 w-3.5" />
                    Mới
                  </button>
                )}
              </div>
              {isCustomProductName ? (
                <input
                  type="text"
                    className={BASE_INPUT_CLASS}
                  value={currentEditForm.packageName}
                  onChange={(event) =>
                    onProductEditChange("packageName", event.target.value)
                  }
                  placeholder="Nhập product mới"
                />
              ) : (
                <select
                  className={`${BASE_SELECT_CLASS} w-full`}
                  value={currentEditForm.packageName}
                  onChange={(event) =>
                    onProductEditChange("packageName", event.target.value)
                  }
                >
                  {dropdownProductNameOptions.length === 0 && (
                    <option value="" className="bg-slate-900 text-white">
                      Chọn product có sẵn
                    </option>
                  )}
                  {dropdownProductNameOptions.map((option) => (
                    <option
                      key={option}
                      value={option}
                      className="bg-slate-900 text-white"
                    >
                      {option}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label className={FIELD_LABEL_CLASS}>
                Gói sản phẩm
              </label>
              <input
                type="text"
                className={BASE_INPUT_CLASS}
                value={currentEditForm.packageProduct}
                onChange={(event) =>
                  onProductEditChange("packageProduct", event.target.value)
                }
              />
            </div>
            <div>
              <label className={FIELD_LABEL_CLASS}>
                Mã sản phẩm
              </label>
              <input
                type="text"
                className={BASE_INPUT_CLASS}
                value={currentEditForm.sanPham}
                onChange={(event) =>
                  onProductEditChange("sanPham", event.target.value)
                }
              />
            </div>
          </div>
        </div>
        <div className={SECTION_PANEL_CLASS}>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-purple-200/95">
            Bảng Giá
          </p>
          <div className="mt-4 space-y-3.5">
            <div>
              <label className={FIELD_LABEL_CLASS}>
                Giá gốc
              </label>
              <div className="mt-1 flex gap-2">
                <select
                  className={`${BASE_SELECT_CLASS} mt-0 w-24 px-2 focus:border-purple-300/40 focus:ring-purple-200/20`}
                  value={currentEditForm.basePriceCurrency}
                  onChange={(event) =>
                    onProductEditChange("basePriceCurrency", event.target.value)
                  }
                >
                  {BASE_PRICE_CURRENCY_OPTIONS.map((option) => (
                    <option
                      key={option.value}
                      value={option.value}
                      className="bg-slate-900 text-white"
                    >
                      {option.label}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  inputMode={
                    currentEditForm.basePriceCurrency === "VND"
                      ? "numeric"
                      : "decimal"
                  }
                  className={`${BASE_INPUT_CLASS} mt-0 focus:border-purple-300/40 focus:ring-purple-200/20`}
                  value={currentEditForm.basePrice}
                  onChange={(event) =>
                    onProductEditChange("basePrice", event.target.value)
                  }
                  placeholder="0"
                />
              </div>
              <p className="mt-1 text-[10px] text-white/45">
                {currentEditForm.basePriceCurrency === "VND"
                  ? "Lưu theo VND."
                  : `Lưu sẽ tự quy đổi ${currentEditForm.basePriceCurrency} -> VND theo tỷ giá hiện tại.`}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={FIELD_LABEL_CLASS}>
                  Giá CTV
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  className={`${BASE_INPUT_CLASS} focus:border-purple-300/40 focus:ring-purple-200/20 appearance-none [appearance:textfield] [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
                  value={currentEditForm.pctCtv}
                  onChange={(event) =>
                    onProductEditChange("pctCtv", event.target.value)
                  }
                />
              </div>
              <div>
                <label className={FIELD_LABEL_CLASS}>
                  Giá Khách
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  className={`${BASE_INPUT_CLASS} focus:border-purple-300/40 focus:ring-purple-200/20 appearance-none [appearance:textfield] [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
                  value={currentEditForm.pctKhach}
                  onChange={(event) =>
                    onProductEditChange("pctKhach", event.target.value)
                  }
                />
              </div>
              <div>
                <label className={FIELD_LABEL_CLASS}>
                  Giá Khuyến mãi
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  className={`${BASE_INPUT_CLASS} focus:border-purple-300/40 focus:ring-purple-200/20 appearance-none [appearance:textfield] [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
                  value={currentEditForm.pctPromo}
                  onChange={(event) =>
                    onProductEditChange("pctPromo", event.target.value)
                  }
                />
              </div>
              <div>
                <label className={FIELD_LABEL_CLASS}>
                  Giá Sinh Viên
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  className={`${BASE_INPUT_CLASS} focus:border-purple-300/40 focus:ring-purple-200/20 appearance-none [appearance:textfield] [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
                  placeholder="0"
                  value={currentEditForm.pctStu}
                  onChange={(event) =>
                    onProductEditChange("pctStu", event.target.value)
                  }
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <PricePreviewGrid
        highestSupplyPriceDisplay={highestSupplyPriceDisplay}
        previewWholesaleProfitLabel={previewWholesaleProfitLabel}
        previewRetailProfitLabel={previewRetailProfitLabel}
        previewWholesalePrice={previewWholesalePrice}
        previewRetailPrice={previewRetailPrice}
        previewStudentPrice={previewStudentPrice}
        previewStudentBlendHint={previewStudentBlendHint}
        previewPromoPrice={previewPromoPrice}
        previewPromoPercentLabel={previewPromoPercentLabel}
        showPreviewPromo={showPreviewPromo}
        showPreviewStudent={showPreviewStudent}
      />

      {productEditError && (
        <div className="rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-2 text-sm text-rose-100">
          {productEditError}
        </div>
      )}

      <div className="flex flex-wrap justify-end gap-3 border-t border-white/10 pt-2">
        <button
          type="button"
          className="inline-flex h-10 items-center rounded-xl border border-white/20 bg-white/10 px-4 md:px-5 text-sm font-semibold text-white shadow-sm transition hover:border-white/40 hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/20 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={onCancelProductEdit}
          disabled={isSavingProductEdit}
        >
          Hủy bỏ
        </button>
        <button
          type="button"
          className="inline-flex h-10 items-center rounded-xl bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-500 px-4 md:px-5 text-sm font-semibold text-white shadow-[0_10px_25px_-10px_rgba(56,189,248,0.85)] transition hover:brightness-110 disabled:opacity-60"
          onClick={onSubmitProductEdit}
          disabled={isSavingProductEdit}
        >
          {isSavingProductEdit ? "Đang Lưu..." : "Lưu thay đổi"}
        </button>
      </div>
    </div>
  );
}
