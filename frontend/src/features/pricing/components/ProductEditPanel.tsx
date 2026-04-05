import { PlusIcon } from "@heroicons/react/24/outline";
import { useEffect, useMemo, useState } from "react";
import type { ProductEditFormState } from "../types";
import { formatCurrencyValue } from "../utils";

type ProductEditPanelProps = {
  productId: number;
  currentEditForm: ProductEditFormState;
  productNameOptions: string[];
  highestSupplyPriceDisplay: string;
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
    const currentName = currentEditForm.packageName.trim();
    if (!currentName) {
      setIsCustomProductName(false);
      return;
    }

    const existsInAvailable = availableProductNameOptions.some(
      (option) => option.toLowerCase() === currentName.toLowerCase()
    );
    setIsCustomProductName(!existsInAvailable);
  }, [productId, currentEditForm.packageName, availableProductNameOptions]);

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
    <div className="space-y-4 md:space-y-6 rounded-2xl border border-white/10 bg-gradient-to-br from-indigo-950/80 via-slate-900/70 to-indigo-950/80 px-3 py-4 md:px-6 md:py-5 text-white shadow-lg">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3 md:p-5 shadow-lg">
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-200">
            Thông Tin Sản Phẩm
          </p>
          <div className="mt-4 space-y-4">
            <div>
              <div className="flex items-center justify-between gap-3">
                <label className="text-xs font-semibold uppercase tracking-wide text-white/70">
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
                  className="mt-1 w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/60 shadow-inner focus:border-sky-300/50 focus:ring-2 focus:ring-sky-200/40"
                  value={currentEditForm.packageName}
                  onChange={(event) =>
                    onProductEditChange("packageName", event.target.value)
                  }
                  placeholder="Nhập product mới"
                />
              ) : (
                <select
                  className="mt-1 w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white shadow-inner focus:border-sky-300/50 focus:ring-2 focus:ring-sky-200/40"
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
              <label className="text-xs font-semibold uppercase tracking-wide text-white/70">
                Gói sản phẩm
              </label>
              <input
                type="text"
                className="mt-1 w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/60 shadow-inner focus:border-sky-300/50 focus:ring-2 focus:ring-sky-200/40"
                value={currentEditForm.packageProduct}
                onChange={(event) =>
                  onProductEditChange("packageProduct", event.target.value)
                }
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-white/70">
                Mã sản phẩm
              </label>
              <input
                type="text"
                className="mt-1 w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/60 shadow-inner focus:border-sky-300/50 focus:ring-2 focus:ring-sky-200/40"
                value={currentEditForm.sanPham}
                onChange={(event) =>
                  onProductEditChange("sanPham", event.target.value)
                }
              />
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3 md:p-5 shadow-lg">
          <p className="text-xs font-semibold uppercase tracking-wide text-purple-200">
            Tỷ giá
          </p>
          <div className="mt-4 space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-white/70">
                Giá gốc
              </label>
              <div className="relative mt-1">
                <input
                  type="text"
                  inputMode="numeric"
                  className="w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 pr-14 text-sm text-white placeholder:text-white/60 shadow-inner focus:border-purple-300/50 focus:ring-2 focus:ring-purple-200/40"
                  value={currentEditForm.basePrice}
                  onChange={(event) =>
                    onProductEditChange("basePrice", event.target.value)
                  }
                  placeholder="0"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold uppercase tracking-wide text-white/45">
                  VNĐ
                </span>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-white/70">
                Giá CTV
              </label>
              <input
                type="number"
                step="0.01"
                className="mt-1 w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/60 shadow-inner focus:border-purple-300/50 focus:ring-2 focus:ring-purple-200/40 appearance-none [appearance:textfield] [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                value={currentEditForm.pctCtv}
                onChange={(event) =>
                  onProductEditChange("pctCtv", event.target.value)
                }
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-white/70">
                Giá Khách
              </label>
              <input
                type="number"
                step="0.01"
                className="mt-1 w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/60 shadow-inner focus:border-purple-300/50 focus:ring-2 focus:ring-purple-200/40 appearance-none [appearance:textfield] [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                value={currentEditForm.pctKhach}
                onChange={(event) =>
                  onProductEditChange("pctKhach", event.target.value)
                }
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-white/70">
                Giá Khuyến mãi
              </label>
              <input
                type="number"
                step="0.01"
                className="mt-1 w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/60 shadow-inner focus:border-purple-300/50 focus:ring-2 focus:ring-purple-200/40 appearance-none [appearance:textfield] [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                value={currentEditForm.pctPromo}
                onChange={(event) =>
                  onProductEditChange("pctPromo", event.target.value)
                }
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-white/70">
                Giá Sinh Viên → cột{" "}
                <span className="font-mono text-white/80">pct_stu</span>
              </label>
              <input
                type="number"
                step="0.01"
                className="mt-1 w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/60 shadow-inner focus:border-purple-300/50 focus:ring-2 focus:ring-purple-200/40 appearance-none [appearance:textfield] [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                placeholder="Cùng định dạng Giá Khách"
                value={currentEditForm.pctStu}
                onChange={(event) =>
                  onProductEditChange("pctStu", event.target.value)
                }
              />
              <p className="mt-1 text-[10px] text-white/45">
                Lưu vào DB khi bấm Lưu; để trống = ghi NULL. Định dạng như Giá Khách (vd. 0,28).
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/15 bg-gradient-to-br from-indigo-950/70 via-slate-900/70 to-indigo-950/80 p-3 md:p-4 shadow-lg backdrop-blur">
        <div className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-white/80 sm:flex-row sm:items-center sm:justify-between">
          <span>Giá dự kiến theo cấu hình</span>
          <span className="font-medium normal-case text-amber-200">
            Giá nguồn cao nhất:{" "}
            <span className="font-semibold">{highestSupplyPriceDisplay}</span>
          </span>
        </div>
        <div
          className={`mt-3 md:mt-4 grid gap-2 md:gap-3 text-center text-sm grid-cols-2 ${
            showPreviewPromo && showPreviewStudent
              ? "md:grid-cols-4"
              : showPreviewPromo || showPreviewStudent
                ? "md:grid-cols-3"
                : "md:grid-cols-2"
          }`}
        >
          <div className="rounded-xl border border-white/15 bg-white/5 px-2 py-2 md:px-4 md:py-3 shadow-lg backdrop-blur-sm">
            <p className="text-[10px] md:text-xs uppercase text-white/70">
              Giá Sỉ dự kiến
            </p>
            <p className="mt-1 text-base md:text-lg font-semibold text-white">
              {formatCurrencyValue(previewWholesalePrice)}
            </p>
            <p className="text-[11px] text-white/70">
              {currentEditForm.pctCtv
                ? `Thiết lập: ${currentEditForm.pctCtv}`
                : "Nhập cấu hình CTV"}
            </p>
          </div>
          <div className="rounded-xl border border-white/15 bg-white/5 px-2 py-2 md:px-4 md:py-3 shadow-lg backdrop-blur-sm">
            <p className="text-[10px] md:text-xs uppercase text-white/70">
              Giá Khách dự kiến
            </p>
            <p className="mt-1 text-base md:text-lg font-semibold text-white">
              {formatCurrencyValue(previewRetailPrice)}
            </p>
            <p className="text-[11px] text-white/70">
              {currentEditForm.pctKhach
                ? `Thiết lập: ${currentEditForm.pctKhach}`
                : "Nhập cấu hình khách"}
            </p>
          </div>
          {showPreviewStudent && (
            <div className="rounded-xl border border-white/15 bg-white/5 px-2 py-2 md:px-4 md:py-3 shadow-lg backdrop-blur-sm">
              <p className="text-[10px] md:text-xs uppercase text-white/70">
                Giá SV (MAVS) dự kiến
              </p>
              <p className="mt-1 text-base md:text-lg font-semibold text-cyan-100">
                {formatCurrencyValue(previewStudentPrice)}
              </p>
              <p className="text-[11px] text-white/70">
                {previewStudentBlendHint ?? "Nhập tỷ lệ SV hoặc dùng mặc định"}
              </p>
            </div>
          )}
          {showPreviewPromo && (
            <div className="rounded-xl border border-white/15 bg-white/5 px-2 py-2 md:px-4 md:py-3 shadow-lg backdrop-blur-sm">
              <p className="text-[10px] md:text-xs uppercase text-white/70">
                Giá Khuyến mãi dự kiến
              </p>
              <p className="mt-1 text-base md:text-lg font-semibold text-white">
                {formatCurrencyValue(previewPromoPrice)}
              </p>
              <p className="text-[11px] text-white/70">
                {previewPromoPercentLabel ?? "Nhập tỷ lệ khuyến mãi"}
              </p>
            </div>
          )}
        </div>
      </div>

      {productEditError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">
          {productEditError}
        </div>
      )}

      <div className="flex flex-wrap justify-end gap-3">
        <button
          type="button"
          className="inline-flex items-center rounded-xl border border-white/25 bg-white/10 px-4 md:px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:border-white/60 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/30 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={onCancelProductEdit}
          disabled={isSavingProductEdit}
        >
          Hủy bỏ
        </button>
        <button
          type="button"
          className="inline-flex items-center rounded-xl bg-gradient-to-r from-indigo-500 via-blue-500 to-sky-500 px-4 md:px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-200/50 hover:opacity-90 disabled:opacity-60"
          onClick={onSubmitProductEdit}
          disabled={isSavingProductEdit}
        >
          {isSavingProductEdit ? "Đang Lưu..." : "Lưu thay đổi"}
        </button>
      </div>
    </div>
  );
}
