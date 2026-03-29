import React from "react";
import {
  CheckIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import type {
  NewSupplyRowState,
  ProductPricingRow,
  SupplierOption,
} from "../../types";
import type { NewSupplierField } from "../productRowContracts";

type NewSupplyRowProps = {
  item: ProductPricingRow;
  draft: NewSupplyRowState;
  supplierOptions: SupplierOption[];
  isLoadingSuppliers: boolean;
  onNewSupplierInputChange: (
    productId: number,
    field: NewSupplierField,
    value: string | number | boolean | null
  ) => void;
  onCancelAddSupplierRow: (productId: number) => void;
  onConfirmAddSupplierRow: (product: ProductPricingRow) => void;
};

export function NewSupplyRow({
  item,
  draft,
  supplierOptions,
  isLoadingSuppliers,
  onNewSupplierInputChange,
  onCancelAddSupplierRow,
  onConfirmAddSupplierRow,
}: NewSupplyRowProps) {
  const selectValue = draft.useCustomName
    ? "__custom__"
    : draft.sourceId !== null
      ? `id:${draft.sourceId}`
      : draft.sourceName
        ? `name:${draft.sourceName}`
        : "";
  const hasOptions = supplierOptions.length > 0;

  const handleSupplierSelect = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const value = event.target.value;
    if (value === "__custom__") {
      onNewSupplierInputChange(item.id, "useCustomName", true);
      onNewSupplierInputChange(item.id, "sourceName", "");
      onNewSupplierInputChange(item.id, "sourceId", null);
      return;
    }

    onNewSupplierInputChange(item.id, "useCustomName", false);

    if (!value) {
      onNewSupplierInputChange(item.id, "sourceId", null);
      onNewSupplierInputChange(item.id, "sourceName", "");
      return;
    }

    const matched = supplierOptions.find((option) => {
      const key = option.id !== null ? `id:${option.id}` : `name:${option.name}`;
      return key === value;
    });

    onNewSupplierInputChange(item.id, "sourceId", matched?.id ?? null);
    onNewSupplierInputChange(
      item.id,
      "sourceName",
      matched?.name ?? value.replace(/^name:/, "").trim()
    );
  };

  return (
    <>
      <tr className="border-t border-dashed border-white/15 bg-slate-900/50">
        <td className="px-2 md:px-4 py-3">
          <div className="flex flex-col gap-2">
            {hasOptions && !draft.useCustomName ? (
              <div className="flex flex-col md:flex-row items-start md:items-center gap-2">
                <select
                  className="w-full md:w-60 md:max-w-xs rounded-lg border border-white/20 bg-slate-900/80 px-2 md:px-3 py-2 text-xs md:text-sm text-white shadow-sm focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-300/30 disabled:opacity-60"
                  value={selectValue}
                  onChange={handleSupplierSelect}
                  disabled={draft.isSaving}
                >
                  <option value="">
                    {isLoadingSuppliers
                      ? "Đang tải Nhà Cung Cấp..."
                      : "Chọn Nhà Cung Cấp..."}
                  </option>
                  {supplierOptions.map((option) => {
                    const key =
                      option.id !== null ? `id:${option.id}` : `name:${option.name}`;
                    return (
                      <option key={key} value={key}>
                        {option.name}
                      </option>
                    );
                  })}
                  <option value="__custom__">Nhập tên Nhà Cung Cấp khác</option>
                </select>
                <button
                  type="button"
                  className="rounded-md border border-white/20 px-2 py-1 text-xs text-white/80 hover:border-indigo-300 hover:text-white"
                  onClick={() =>
                    onNewSupplierInputChange(item.id, "useCustomName", true)
                  }
                  disabled={draft.isSaving}
                >
                  Nhập
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                {hasOptions && (
                  <button
                    type="button"
                    className="flex items-center gap-1 rounded-md border border-white/20 px-2 py-1 text-xs text-white/80 hover:border-indigo-300 hover:text-white"
                    onClick={() =>
                      onNewSupplierInputChange(item.id, "useCustomName", false)
                    }
                    disabled={draft.isSaving}
                  >
                    <span className="text-sm">←</span>
                    <span className="sr-only">Chọn từ danh sách</span>
                  </button>
                )}
                <input
                  type="text"
                  className="w-60 max-w-xs rounded-lg border border-indigo-300/60 bg-white/95 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                  placeholder="Tên NCC"
                  value={draft.sourceName}
                  onChange={(event) =>
                    onNewSupplierInputChange(
                      item.id,
                      "sourceName",
                      event.target.value
                    )
                  }
                  disabled={draft.isSaving}
                />
              </div>
            )}
          </div>
        </td>
        <td className="px-2 md:px-4 py-3">
          <div className="flex items-center justify-center gap-1">
            <input
              type="text"
              className="w-20 md:w-28 rounded-lg border border-sky-200 bg-white px-2 py-1 text-center text-xs md:text-sm focus:border-sky-400 focus:ring-2 focus:ring-sky-200 appearance-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              placeholder="Giá nhập"
              value={draft.price}
              onChange={(event) =>
                onNewSupplierInputChange(item.id, "price", event.target.value)
              }
              disabled={draft.isSaving}
            />
            <span className="text-xs text-white/70">đ</span>
          </div>
        </td>
        <td className="hidden md:table-cell px-4 py-3 text-center text-xs text-white/70">
          -
        </td>
        <td className="px-2 md:px-4 py-3">
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-green-600/20 text-green-200 hover:bg-green-500/30 disabled:opacity-60"
              disabled={draft.isSaving}
              onClick={() => onConfirmAddSupplierRow(item)}
            >
              <CheckIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-red-600/20 text-red-200 hover:bg-red-500/30 disabled:opacity-60"
              disabled={draft.isSaving}
              onClick={() => onCancelAddSupplierRow(item.id)}
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        </td>
      </tr>
      {draft.error && (
        <tr>
          <td colSpan={4} className="px-4 pb-3 text-center text-xs text-red-200">
            {draft.error}
          </td>
        </tr>
      )}
    </>
  );
}
