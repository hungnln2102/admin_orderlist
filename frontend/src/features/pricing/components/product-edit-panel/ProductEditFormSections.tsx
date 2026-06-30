import { PlusIcon } from "@heroicons/react/24/outline";
import type { ProductEditFormState } from "../../types";
import {
  BASE_INPUT_CLASS,
  BASE_PRICE_CURRENCY_OPTIONS,
  BASE_SELECT_CLASS,
  FIELD_LABEL_CLASS,
  SECTION_PANEL_CLASS,
} from "./productEditPanelStyles";

type ProductEditFormSectionsProps = {
  currentEditForm: ProductEditFormState;
  dropdownProductNameOptions: string[];
  isCustomProductName: boolean;
  onUseCustomProductName: () => void;
  onUseDropdownProductName: () => void;
  onProductEditChange: (field: keyof ProductEditFormState, value: string) => void;
};

export function ProductEditFormSections({
  currentEditForm,
  dropdownProductNameOptions,
  isCustomProductName,
  onUseCustomProductName,
  onUseDropdownProductName,
  onProductEditChange,
}: ProductEditFormSectionsProps) {
  return (
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
                    onClick={onUseDropdownProductName}
                    className="inline-flex items-center rounded-lg border border-sky-300/25 bg-sky-400/10 px-2.5 py-1 text-[11px] font-semibold text-sky-100 transition hover:bg-sky-400/20"
                  >
                    Chọn sẵn
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onUseCustomProductName()}
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
  );
}
