import React from "react";
import {
  MinusIcon,
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

  const inputBase =
    "mt-1 w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-white placeholder:text-slate-400 shadow-inner focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all";
  const labelBase = "text-xs font-semibold text-slate-300 uppercase tracking-wide";

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto bg-black/50 px-2 py-4 sm:px-4 sm:py-6" style={{ zIndex: 9999 }}>
      <div className="relative flex w-full max-w-4xl flex-col rounded-[32px] border border-white/15 bg-gradient-to-br from-slate-800/95 via-slate-700/90 to-slate-900/95 shadow-2xl backdrop-blur-sm" style={{ zIndex: 10000 }}>
        <button
          className="absolute right-4 top-4 text-slate-400 hover:text-white transition-colors z-10"
          onClick={onClose}
        >
          <XMarkIcon className="h-6 w-6" />
        </button>
        
        <div className="space-y-6 px-4 py-6 sm:px-6 sm:py-8">
          <div>
            <h2 className="text-xl font-bold text-white">Thêm Sản Phẩm mới</h2>
            <p className="text-base text-slate-300">
              Nhập Thông tin Sản Phẩm, Tỷ Giá và Nhà Cung Cấp
            </p>
          </div>

          {/* Basic Product Info */}
          <div className="rounded-2xl border border-white/15 bg-gradient-to-br from-slate-800/65 via-slate-700/55 to-slate-900/65 p-5 shadow-sm backdrop-blur-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-300 mb-4">
              Thông Tin Cơ Bản
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className={labelBase}>Mã Sản Phẩm</label>
                <input
                  type="text"
                  className={inputBase}
                  placeholder="Nhập mã sản phẩm"
                  value={createForm.packageName}
                  onChange={(event) =>
                    onFormChange("packageName", event.target.value)
                  }
                />
              </div>
              <div>
                <label className={labelBase}>Tên Sản Phẩm</label>
                <input
                  type="text"
                  className={inputBase}
                  placeholder="Nhập tên sản phẩm"
                  value={createForm.sanPham}
                  onChange={(event) =>
                    onFormChange("sanPham", event.target.value)
                  }
                />
              </div>
              <div className="md:col-span-2">
                <label className={labelBase}>Gói Sản Phẩm</label>
                <input
                  type="text"
                  className={inputBase}
                  placeholder="Nhập gói sản phẩm"
                  value={createForm.packageProduct}
                  onChange={(event) =>
                    onFormChange("packageProduct", event.target.value)
                  }
                />
              </div>
            </div>
          </div>

          {/* Pricing Ratios */}
          <div className="rounded-2xl border border-white/15 bg-gradient-to-br from-slate-800/65 via-slate-700/55 to-slate-900/65 p-5 shadow-sm backdrop-blur-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-300 mb-4">
              Tỷ Giá
            </p>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className={labelBase}>Tỷ Giá CTV</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className={`${inputBase} appearance-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
                  placeholder="0.00"
                  value={createForm.pctCtv}
                  onChange={(event) =>
                    onFormChange("pctCtv", event.target.value)
                  }
                />
              </div>
              <div>
                <label className={labelBase}>Tỷ Giá Khách</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className={`${inputBase} appearance-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
                  placeholder="0.00"
                  value={createForm.pctKhach}
                  onChange={(event) =>
                    onFormChange("pctKhach", event.target.value)
                  }
                />
              </div>
              <div>
                <label className={labelBase}>Tỷ Giá Khuyến Mãi</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className={`${inputBase} appearance-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
                  placeholder="0.00"
                  value={createForm.pctPromo}
                  onChange={(event) =>
                    onFormChange("pctPromo", event.target.value)
                  }
                />
              </div>
            </div>
          </div>

          {/* Supplier Information */}
          <div className="rounded-2xl border border-white/15 bg-gradient-to-br from-slate-800/65 via-slate-700/55 to-slate-900/65 p-5 shadow-sm backdrop-blur-sm">
            <div className="flex flex-col gap-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-300">
                Thông Tin Nhà Cung Cấp
              </p>
              <div className="space-y-4">
                {createSuppliers.map((supplier) => (
                  <div
                    key={supplier.id}
                    className="rounded-xl border border-white/10 bg-slate-900/40 p-4"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-sm font-semibold text-white">
                        Nhà Cung Cấp
                      </p>
                      {createSuppliers.length > 1 && (
                        <button
                          type="button"
                          onClick={() => onRemoveSupplier(supplier.id)}
                          className="text-red-400 hover:text-red-300 transition-colors"
                        >
                          <MinusIcon className="h-5 w-5" />
                        </button>
                      )}
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <label className={labelBase}>Tên Nhà Cung Cấp</label>
                        {supplier.useCustomName ? (
                          <input
                            type="text"
                            className={inputBase}
                            placeholder="Nhập tên nhà cung cấp"
                            value={supplier.sourceName}
                            onChange={(e) =>
                              onSupplierChange(
                                supplier.id,
                                "sourceName",
                                e.target.value
                              )
                            }
                          />
                        ) : (
                          <div className="relative">
                            <select
                              className={inputBase}
                              value={supplier.sourceId ?? ""}
                              onChange={(e) =>
                                onSupplierSelectChange(supplier.id, e.target.value)
                              }
                              disabled={isLoadingSuppliers}
                            >
                              <option value="">Chọn Nhà Cung Cấp</option>
                              {supplierOptions.map((opt) => (
                                <option key={opt.id} value={opt.id ?? ""}>
                                  {opt.name}
                                </option>
                              ))}
                            </select>
                            {isLoadingSuppliers && (
                              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                              </div>
                            )}
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => onEnableCustomSupplier(supplier.id)}
                          className="mt-2 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                        >
                          {supplier.useCustomName
                            ? "← Chọn từ danh sách"
                            : "+ Thêm nhà cung cấp mới"}
                        </button>
                      </div>

                      <div>
                        <label className={labelBase}>Giá Nhập</label>
                        <div className="relative">
                          <input
                            type="text"
                            className={inputBase}
                            placeholder="0"
                            value={formatCurrencyValue(supplier.price)}
                            onChange={(e) =>
                              onSupplierPriceInput(supplier.id, e.target.value)
                            }
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                            VNĐ
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className={labelBase}>Số Tài Khoản</label>
                        <input
                          type="text"
                          className={inputBase}
                          placeholder="Nhập số tài khoản"
                          value={supplier.numberBank}
                          onChange={(e) =>
                            onSupplierChange(
                              supplier.id,
                              "numberBank",
                              e.target.value
                            )
                          }
                        />
                      </div>

                      <div>
                        <label className={labelBase}>Ngân Hàng</label>
                        <div className="relative">
                          <select
                            className={inputBase}
                            value={supplier.bankBin}
                            onChange={(e) =>
                              onSupplierChange(supplier.id, "bankBin", e.target.value)
                            }
                            disabled={isLoadingBanks}
                          >
                            <option value="">Chọn Ngân Hàng</option>
                            {bankOptions.map((opt) => (
                              <option key={opt.bin} value={opt.bin}>
                                {opt.name}
                              </option>
                            ))}
                          </select>
                          {isLoadingBanks && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Price Calculations */}
                    {supplier.price && (
                      <div className="mt-4 grid gap-2 rounded-lg border border-white/5 bg-slate-950/30 p-3 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-400">
                            Xem Trước Giá (theo Tỷ Giá CTV):
                          </span>
                          <span className="font-semibold text-white">
                            {formatVndDisplay(
                              multiplyValue(
                                supplier.price,
                                parseRatioInput(createForm.pctCtv)
                              )
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">
                            Giá Lẻ (theo Tỷ Giá Khách):
                          </span>
                          <span className="font-semibold text-white">
                            {formatVndDisplay(
                              multiplyValue(
                                supplier.price,
                                parseRatioInput(createForm.pctKhach)
                              )
                            )}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                <button
                  type="button"
                  onClick={onAddSupplier}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-white/20 bg-slate-900/20 px-4 py-3 text-sm font-semibold text-indigo-300 transition-all hover:border-indigo-400/50 hover:bg-slate-800/40 hover:text-indigo-200"
                >
                  <UserPlusIcon className="h-5 w-5" />
                  Thêm Nhà Cung Cấp
                </button>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {createError && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4">
              <p className="text-sm text-red-300">{createError}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-white/20 bg-transparent px-6 py-3 font-semibold text-white transition-all hover:bg-white/10 disabled:opacity-50"
            >
              Hủy bỏ
            </button>
            <GradientButton
              onClick={onSubmit}
              disabled={isSubmitting}
              className="px-6 py-3"
            >
              {isSubmitting ? "Đang Lưu..." : "Thêm Sản Phẩm"}
            </GradientButton>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateProductModal;
