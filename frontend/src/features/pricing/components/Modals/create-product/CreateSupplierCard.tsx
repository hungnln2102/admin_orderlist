import { MinusIcon } from "@heroicons/react/24/outline";
import type {
  BankOption,
  CreateProductFormState,
  CreateSupplierEntry,
  SupplierOption,
} from "../../../types";
import {
  formatVndDisplay,
  multiplyValue,
  parseRatioInput,
  roundToNearestThousand,
} from "../../../utils";
import { inputBase, labelBase } from "./shared";

type CreateSupplierCardProps = {
  supplier: CreateSupplierEntry;
  createSuppliersLength: number;
  createForm: CreateProductFormState;
  supplierOptions: SupplierOption[];
  bankOptions: BankOption[];
  isLoadingSuppliers: boolean;
  isLoadingBanks: boolean;
  onSupplierChange: (
    supplierId: string,
    field: keyof Omit<CreateSupplierEntry, "id">,
    value: string
  ) => void;
  onSupplierSelectChange: (supplierId: string, optionValue: string) => void;
  onSupplierPriceInput: (supplierId: string, rawValue: string) => void;
  onEnableCustomSupplier: (supplierId: string) => void;
  onRemoveSupplier: (supplierId: string) => void;
};

export function CreateSupplierCard({
  supplier,
  createSuppliersLength,
  createForm,
  supplierOptions,
  bankOptions,
  isLoadingSuppliers,
  isLoadingBanks,
  onSupplierChange,
  onSupplierSelectChange,
  onSupplierPriceInput,
  onEnableCustomSupplier,
  onRemoveSupplier,
}: CreateSupplierCardProps) {
  const priceNum = supplier.price
    ? Number(String(supplier.price).replace(/\D/g, ""))
    : null;
  const hasPrice = priceNum != null && Number.isFinite(priceNum) && priceNum > 0;
  const ctvPriceRaw = hasPrice
    ? multiplyValue(priceNum, parseRatioInput(createForm.pctCtv))
    : null;
  const retailPriceRaw =
    ctvPriceRaw != null
      ? multiplyValue(ctvPriceRaw, parseRatioInput(createForm.pctKhach))
      : null;
  const ctvPrice = roundToNearestThousand(ctvPriceRaw);
  const retailPrice = roundToNearestThousand(retailPriceRaw);

  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/40 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-white">Nhà Cung Cấp</p>
        {createSuppliersLength > 1 && (
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
              onChange={(event) =>
                onSupplierChange(supplier.id, "sourceName", event.target.value)
              }
            />
          ) : (
            <div className="relative">
              <select
                className={inputBase}
                value={supplier.sourceId ?? ""}
                onChange={(event) =>
                  onSupplierSelectChange(supplier.id, event.target.value)
                }
                disabled={isLoadingSuppliers}
              >
                <option value="">Chọn Nhà Cung Cấp</option>
                {supplierOptions.map((option) => (
                  <option key={option.id} value={option.id ?? ""}>
                    {option.name}
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
              value={supplier.price}
              onChange={(event) =>
                onSupplierPriceInput(supplier.id, event.target.value)
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
            onChange={(event) =>
              onSupplierChange(supplier.id, "numberBank", event.target.value)
            }
          />
        </div>

        <div>
          <label className={labelBase}>Ngân Hàng</label>
          <div className="relative">
            <select
              className={inputBase}
              value={supplier.bankBin}
              onChange={(event) =>
                onSupplierChange(supplier.id, "bankBin", event.target.value)
              }
              disabled={isLoadingBanks}
            >
              <option value="">Chọn Ngân Hàng</option>
              {bankOptions.map((option) => (
                <option key={option.bin} value={option.bin}>
                  {option.name}
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

      {hasPrice && (
        <div className="mt-4 grid gap-2 rounded-lg border border-white/5 bg-slate-950/30 p-3 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-400">Xem trước giá CTV:</span>
            <span className="font-semibold text-white">
              {formatVndDisplay(ctvPrice)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Xem trước giá lẻ:</span>
            <span className="font-semibold text-white">
              {formatVndDisplay(retailPrice)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
