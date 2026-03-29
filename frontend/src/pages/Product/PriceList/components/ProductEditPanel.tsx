import type { ProductEditFormState } from "../types";
import { formatCurrencyValue } from "../utils";

type ProductEditPanelProps = {
  currentEditForm: ProductEditFormState;
  highestSupplyPriceDisplay: string;
  previewWholesalePrice: number | null;
  previewRetailPrice: number | null;
  previewPromoPrice: number | null;
  previewPromoPercentLabel: string | null;
  showPreviewPromo: boolean;
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
  currentEditForm,
  highestSupplyPriceDisplay,
  previewWholesalePrice,
  previewRetailPrice,
  previewPromoPrice,
  previewPromoPercentLabel,
  showPreviewPromo,
  productEditError,
  isSavingProductEdit,
  onProductEditChange,
  onCancelProductEdit,
  onSubmitProductEdit,
}: ProductEditPanelProps) {
  return (
    <div className="space-y-4 md:space-y-6 rounded-2xl border border-white/10 bg-gradient-to-br from-indigo-950/80 via-slate-900/70 to-indigo-950/80 px-3 py-4 md:px-6 md:py-5 text-white shadow-lg">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3 md:p-5 shadow-lg">
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-200">
            Thông Tin Sản Phẩm
          </p>
          <div className="mt-4 space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-white/70">
                Tên sản phẩm
              </label>
              <input
                type="text"
                className="mt-1 w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/60 shadow-inner focus:border-sky-300/50 focus:ring-2 focus:ring-sky-200/40"
                value={currentEditForm.packageName}
                onChange={(event) =>
                  onProductEditChange("packageName", event.target.value)
                }
              />
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
                Tỷ giá CTV
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
                Tỷ giá khách
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
                Tỷ giá khuyến mãi
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
            showPreviewPromo ? "md:grid-cols-3" : "md:grid-cols-2"
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
