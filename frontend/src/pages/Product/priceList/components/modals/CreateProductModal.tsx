import React from "react";
import {
  MinusIcon,
  PlusIcon,
  UserPlusIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import GradientButton from "../../../../../components/ui/GradientButton";
import {
  BankOption,
  CreateProductFormState,
  CreateSupplierEntry,
  SupplierOption,
} from "../../types";
import {
  formatCurrencyValue,
  formatVndDisplay,
  multiplyValue,
  parseRatioInput,
} from "../../utils";

interface CreateProductModalProps {
  isOpen: boolean;
  createForm: CreateProductFormState;
  createSuppliers: CreateSupplierEntry[];
  supplierOptions: SupplierOption[];
  bankOptions: BankOption[];
  isLoadingSuppliers: boolean;
  isLoadingBanks: boolean;
  isSubmitting: boolean;
  createError: string | null;
  onClose: () => void;
  onFormChange: (field: keyof CreateProductFormState, value: string) => void;
  onSupplierChange: (
    supplierId: string,
    field: keyof Omit<CreateSupplierEntry, "id">,
    value: string
  ) => void;
  onSupplierSelectChange: (supplierId: string, optionValue: string) => void;
  onSupplierPriceInput: (supplierId: string, rawValue: string) => void;
  onEnableCustomSupplier: (supplierId: string) => void;
  onAddSupplier: () => void;
  onRemoveSupplier: (supplierId: string) => void;
  onSubmit: () => void;
}

const CreateProductModal: React.FC<CreateProductModalProps> = ({
  isOpen,
  createForm,
  createSuppliers,
  supplierOptions,
  bankOptions,
  isLoadingSuppliers,
  isLoadingBanks,
  isSubmitting,
  createError,
  onClose,
  onFormChange,
  onSupplierChange,
  onSupplierSelectChange,
  onSupplierPriceInput,
  onEnableCustomSupplier,
  onAddSupplier,
  onRemoveSupplier,
  onSubmit,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-70 flex items-start justify-center overflow-y-auto bg-black/40 px-2 py-4 sm:px-4 sm:py-6">
      <div className="relative flex w-full max-w-5xl flex-col rounded-2xl bg-white shadow-2xl max-h-[95vh]">
        <button
          className="absolute right-4 top-4 text-white/60 hover:text-white/70"
          onClick={onClose}
        >
          <XMarkIcon className="h-6 w-6" />
        </button>
        <div className="flex-1 space-y-6 overflow-y-auto px-4 py-6 sm:px-6 sm:py-8">
          <div>
            <h2 className="text-xl font-bold text-sky-100">Thêm Sản Phẩm mới</h2>
            <p className="text-base text-sky-200/90">
              Nhập Thông tin Sản Phẩm, Nhà Cung Cấp, Tỷ Giá
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="rounded-2xl border border-sky-100 bg-gradient-to-br from-white via-sky-50 to-sky-100/40 p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-sky-600">
                Thông Tin Sản Phẩm
              </p>
              <div className="mt-4 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-white/70 uppercase tracking-wide">
                    Sản Phẩm
                  </label>
                  <input
                    type="text"
                    className="mt-1 w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/60 shadow-inner focus:border-sky-300/50 focus:ring-2 focus:ring-sky-200/40"
                    value={createForm.packageName}
                    onChange={(event) =>
                      onFormChange("packageName", event.target.value)
                    }
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-white/70 uppercase tracking-wide">
                    Gói Sản Phẩm
                  </label>
                  <input
                    type="text"
                    className="mt-1 w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/60 shadow-inner focus:border-sky-300/50 focus:ring-2 focus:ring-sky-200/40"
                    value={createForm.packageProduct}
                    onChange={(event) =>
                      onFormChange("packageProduct", event.target.value)
                    }
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-white/70 uppercase tracking-wide">
                    Mã Sản Phẩm
                  </label>
                  <input
                    type="text"
                    className="mt-1 w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/60 shadow-inner focus:border-sky-300/50 focus:ring-2 focus:ring-sky-200/40"
                    value={createForm.sanPham}
                    onChange={(event) =>
                      onFormChange("sanPham", event.target.value)
                    }
                  />
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-purple-100 bg-gradient-to-br from-white via-purple-50 to-purple-100/40 p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-purple-600">
                Tỷ Giá
              </p>
              <div className="mt-4 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-white/70 uppercase tracking-wide">
                    Tỷ Giá CTV
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="mt-1 w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/60 shadow-inner focus:border-purple-300/50 focus:ring-2 focus:ring-purple-200/40 appearance-none [appearance:textfield] [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    value={createForm.pctCtv}
                    onChange={(event) =>
                      onFormChange("pctCtv", event.target.value)
                    }
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-white/70 uppercase tracking-wide">
                    Tỷ Giá Khách
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="mt-1 w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/60 shadow-inner focus:border-purple-300/50 focus:ring-2 focus:ring-purple-200/40 appearance-none [appearance:textfield] [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    value={createForm.pctKhach}
                    onChange={(event) =>
                      onFormChange("pctKhach", event.target.value)
                    }
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-white/70 uppercase tracking-wide">
                    Tỷ Giá Khuyến Mãi
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="mt-1 w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/60 shadow-inner focus:border-purple-300/50 focus:ring-2 focus:ring-purple-200/40 appearance-none [appearance:textfield] [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    value={createForm.pctPromo}
                    onChange={(event) =>
                      onFormChange("pctPromo", event.target.value)
                    }
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-gradient-to-br from-white via-gray-50 to-gray-100/40 p-5 shadow-sm">
            <div className="flex flex-col gap-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/70">
                Thông Tin Nhà Cung Cấp
              </p>
              <div className="space-y-4">
                {createSuppliers.map((supplier) => (
                  <div
                    key={supplier.id}
                    className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-inner"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-sm font-semibold text-white">
                        Nhà Cung Cấp
                      </p>
                      {createSuppliers.length > 1 && (
                        <button
                          type="button"
                          className="text-xs text-red-500 hover:text-red-600"
                          onClick={() => onRemoveSupplier(supplier.id)}
                        >
                          Xóa
                        </button>
                      )}
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <label className="text-xs font-semibold text-white/70 uppercase tracking-wide">
                          Tên Nhà Cung Cấp
                        </label>
                        <div className="mt-1 flex items-stretch gap-2">
                          <div className="flex-1">
                            {supplier.useCustomName ? (
                              <input
                                type="text"
                                className="w-full rounded-xl border border-gray-200 bg-white/90 px-3 py-2 text-sm focus:border-blue-300 focus:ring-2 focus:ring-blue-200"
                                placeholder="Nhập tên Nhà Cung Cấp"
                                value={supplier.sourceName}
                                onChange={(event) =>
                                  onSupplierChange(
                                    supplier.id,
                                    "sourceName",
                                    event.target.value
                                  )
                                }
                              />
                            ) : (
                              <select
                                className="supplier-select w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-300 focus:ring-2 focus:ring-blue-200"
                                value={
                                  supplier.sourceId !== null
                                    ? String(supplier.sourceId)
                                    : supplier.sourceName
                                }
                                onChange={(event) =>
                                  onSupplierSelectChange(supplier.id, event.target.value)
                                }
                              >
                                <option value="">
                                  {isLoadingSuppliers
                                    ? "Đang tải Nhà Cung Cấp..."
                                    : "Chọn Nhà Cung Cấp"}
                                </option>
                                {supplierOptions.map((option) => {
                                  const optionValue =
                                    option.id !== null
                                      ? String(option.id)
                                      : option.name;
                                  return (
                                    <option key={optionValue} value={optionValue}>
                                      {option.name}
                                    </option>
                                  );
                                })}
                              </select>
                            )}
                          </div>
                          <button
                            type="button"
                            className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-300/70 bg-white/90 text-blue-600 hover:bg-blue-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:opacity-60"
                            onClick={() =>
                              supplier.useCustomName
                                ? onSupplierSelectChange(supplier.id, "")
                                : onEnableCustomSupplier(supplier.id)
                            }
                            title={
                              supplier.useCustomName
                                ? "Quay lại chọn Nhà Cung Cấp có sẵn"
                                : "Thêm Nhà Cung Cấp mới (điền tên thủ công)"
                            }
                          >
                            {supplier.useCustomName ? (
                              <MinusIcon className="h-5 w-5" />
                            ) : (
                              <PlusIcon className="h-5 w-5" />
                            )}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-white/70 uppercase tracking-wide">
                          Giá Nhập
                        </label>
                        <input
                          type="text"
                          className="mt-1 w-full rounded-xl border border-gray-200 bg-white/90 px-3 py-2 text-sm focus:border-blue-300 focus:ring-2 focus:ring-blue-200"
                          value={formatVndDisplay(supplier.price)}
                          onChange={(event) =>
                            onSupplierPriceInput(supplier.id, event.target.value)
                          }
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-white/70 uppercase tracking-wide">
                          Số Tài Khoản
                        </label>
                        {(() => {
                          const isLocked =
                            !supplier.useCustomName &&
                            Boolean(supplier.sourceId) &&
                            Boolean(supplier.bankBin || supplier.numberBank);
                          return (
                            <input
                              type="text"
                              className="mt-1 w-full rounded-xl border border-gray-200 bg-white/90 px-3 py-2 text-sm focus:border-blue-300 focus:ring-2 focus:ring-blue-200"
                              value={supplier.numberBank}
                              onChange={(event) =>
                                onSupplierChange(
                                  supplier.id,
                                  "numberBank",
                                  event.target.value
                                )
                              }
                              disabled={isLocked}
                              style={
                                isLocked
                                  ? { opacity: 0.7, cursor: "not-allowed" }
                                  : undefined
                              }
                            />
                          );
                        })()}
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-white/70 uppercase tracking-wide">
                          Ngân Hàng
                        </label>
                        {(() => {
                          const isLocked =
                            !supplier.useCustomName &&
                            Boolean(supplier.sourceId) &&
                            Boolean(supplier.bankBin || supplier.numberBank);
                          return (
                            <select
                              className="mt-1 w-full rounded-xl border border-gray-200 bg-white/90 px-3 py-2 text-sm focus:border-blue-300 focus:ring-2 focus:ring-blue-200"
                              value={supplier.bankBin}
                              onChange={(event) =>
                                onSupplierChange(
                                  supplier.id,
                                  "bankBin",
                                  event.target.value
                                )
                              }
                              disabled={isLocked}
                              style={
                                isLocked
                                  ? { opacity: 0.7, cursor: "not-allowed" }
                                  : undefined
                              }
                            >
                              <option value="">Chọn Ngân Hàng</option>
                              {bankOptions.map((bank) => (
                                <option key={bank.bin} value={bank.bin}>
                                  {bank.name}
                                </option>
                              ))}
                            </select>
                          );
                        })()}
                        {isLoadingBanks && (
                          <p className="mt-1 text-[11px] text-white/60">
                            Đang Tải Danh Sách Ngân Hàng...
                          </p>
                        )}
                      </div>
                      <div className="md:col-span-2">
                        {(() => {
                          const basePrice = Number(
                            (supplier.price || "").replace(/\D+/g, "")
                          );
                          const pctCtvValue = parseRatioInput(createForm.pctCtv);
                          const pctKhachValue = parseRatioInput(createForm.pctKhach);
                          const wholesalePreview =
                            basePrice && pctCtvValue
                              ? multiplyValue(basePrice, pctCtvValue)
                              : null;
                          const retailPreview =
                            pctKhachValue && (wholesalePreview || basePrice)
                              ? multiplyValue(
                                  wholesalePreview || basePrice,
                                  pctKhachValue
                                )
                              : null;
                          return (
                            <div className="mt-3 rounded-xl border border-white/20 bg-white/10 px-4 py-3 shadow-inner">
                              <p className="text-xs font-semibold text-white/70 uppercase tracking-wide">
                                Xem trước giá
                              </p>
                              <div className="mt-2 grid gap-3 md:grid-cols-2">
                                <div className="flex flex-col gap-1">
                                  <span className="text-[11px] uppercase text-white/60">
                                    Giá sỉ (theo Tỷ giá CTV)
                                  </span>
                                  <span className="text-sm font-semibold text-white">
                                    {wholesalePreview
                                      ? formatCurrencyValue(wholesalePreview)
                                      : "-"}
                                  </span>
                                </div>
                                <div className="flex flex-col gap-1">
                                  <span className="text-[11px] uppercase text-white/60">
                                    Giá lẻ (theo Tỷ giá Khách)
                                  </span>
                                  <span className="text-sm font-semibold text-white">
                                    {retailPreview
                                      ? formatCurrencyValue(retailPreview)
                                      : "-"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-center">
                <button
                  type="button"
                  className="inline-flex items-center rounded-full border border-dashed border-blue-300 px-4 py-2 text-sm font-semibold text-blue-600 hover:border-blue-400 hover:text-blue-700"
                  onClick={onAddSupplier}
                >
                  <UserPlusIcon className="mr-2 h-4 w-4" />
                  Thêm Nhà Cung Cấp
                </button>
              </div>
            </div>
          </div>

          {createError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">
              {createError}
            </div>
          )}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              className="inline-flex items-center rounded-xl border border-white/25 bg-white/10 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:border-white/60 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/30 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Hủy Bỏ
            </button>
            <GradientButton
              className="px-5 py-2 text-sm font-semibold"
              onClick={onSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Đang Lưu..." : "Lưu Sản Phẩm"}
            </GradientButton>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateProductModal;
