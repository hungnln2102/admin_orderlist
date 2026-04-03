import { UserPlusIcon } from "@heroicons/react/24/outline";
import type {
  BankOption,
  CreateProductFormState,
  CreateSupplierEntry,
  SupplierOption,
} from "../../../types";
import { CreateSupplierCard } from "./CreateSupplierCard";

type SuppliersSectionProps = {
  createForm: CreateProductFormState;
  createSuppliers: CreateSupplierEntry[];
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
  onAddSupplier: () => void;
  onRemoveSupplier: (supplierId: string) => void;
};

export function SuppliersSection({
  createForm,
  createSuppliers,
  supplierOptions,
  bankOptions,
  isLoadingSuppliers,
  isLoadingBanks,
  onSupplierChange,
  onSupplierSelectChange,
  onSupplierPriceInput,
  onEnableCustomSupplier,
  onAddSupplier,
  onRemoveSupplier,
}: SuppliersSectionProps) {
  return (
    <div className="rounded-2xl border border-white/15 bg-gradient-to-br from-slate-800/65 via-slate-700/55 to-slate-900/65 p-5 shadow-sm backdrop-blur-sm">
      <div className="flex flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-300">
          Thông Tin Nhà Cung Cấp
        </p>
        <div className="space-y-4">
          {createSuppliers.map((supplier) => (
            <CreateSupplierCard
              key={supplier.id}
              supplier={supplier}
              createSuppliersLength={createSuppliers.length}
              createForm={createForm}
              supplierOptions={supplierOptions}
              bankOptions={bankOptions}
              isLoadingSuppliers={isLoadingSuppliers}
              isLoadingBanks={isLoadingBanks}
              onSupplierChange={onSupplierChange}
              onSupplierSelectChange={onSupplierSelectChange}
              onSupplierPriceInput={onSupplierPriceInput}
              onEnableCustomSupplier={onEnableCustomSupplier}
              onRemoveSupplier={onRemoveSupplier}
            />
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
  );
}
