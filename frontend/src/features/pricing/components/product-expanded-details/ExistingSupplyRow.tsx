import React from "react";
import {
  CheckIcon,
  PencilIcon,
  XCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import type { ProductPricingRow, SupplyPriceItem } from "../../types";
import { buildSupplyRowKey, formatCurrencyValue, formatProfitRange } from "../../utils";

type ExistingSupplyRowProps = {
  item: ProductPricingRow;
  productKey: string;
  supplier: SupplyPriceItem;
  editingSupplyRows: Record<string, boolean>;
  supplyPriceDrafts: Record<string, string>;
  savingSupplyRows: Record<string, boolean>;
  onStartEditingSupply: (
    productId: number,
    sourceId: number,
    currentPrice: number | null
  ) => void;
  onSupplyInputChange: (
    productId: number,
    sourceId: number,
    value: string
  ) => void;
  onCancelSupplyEditing: (productId: number, sourceId: number) => void;
  onConfirmSupplyEditing: (
    productId: number,
    sourceId: number,
    productKey: string,
    productName: string
  ) => void;
  onDeleteSupplyRow: (
    productId: number,
    sourceId: number,
    productKey: string,
    productName: string
  ) => void;
};

export function ExistingSupplyRow({
  item,
  productKey,
  supplier,
  editingSupplyRows,
  supplyPriceDrafts,
  savingSupplyRows,
  onStartEditingSupply,
  onSupplyInputChange,
  onCancelSupplyEditing,
  onConfirmSupplyEditing,
  onDeleteSupplyRow,
}: ExistingSupplyRowProps) {
  const rowKey = buildSupplyRowKey(item.id, supplier.sourceId);
  const isRowEditing = editingSupplyRows[rowKey] ?? false;
  const isRowSaving = savingSupplyRows[rowKey] ?? false;
  const inputValue =
    supplyPriceDrafts[rowKey] ?? (supplier.price ?? "").toString();
  const inputDisabled = !isRowEditing || isRowSaving;
  const displayPrice = formatCurrencyValue(supplier.price);

  return (
    <tr className="border-t border-dashed border-white/10">
      <td className="px-2 md:px-4 py-3">
        <div className="text-xs md:text-sm font-semibold text-white truncate max-w-[80px] md:max-w-none">
          {supplier.sourceName}
        </div>
      </td>
      <td className="px-2 md:px-4 py-3">
        {isRowEditing ? (
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-1">
              <input
                type="text"
                className="w-20 md:w-28 rounded-lg border border-white/25 bg-white/5 px-2 py-1 text-center text-xs md:text-sm text-white placeholder:text-white/50 shadow-inner focus:border-sky-300/50 focus:ring-2 focus:ring-sky-200/30 appearance-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                value={inputValue}
                onChange={(event) =>
                  onSupplyInputChange(
                    item.id,
                    supplier.sourceId,
                    event.target.value
                  )
                }
                disabled={inputDisabled}
              />
              <span className="text-xs text-white/70">đ</span>
            </div>
            <span className="hidden md:inline text-[11px] text-white/60">
              Nhập giá mới
            </span>
          </div>
        ) : (
          <div className="flex justify-center">
            <span className="inline-flex min-w-0 md:min-w-[112px] justify-center rounded-lg bg-white/10 px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm font-semibold text-white">
              {displayPrice}
            </span>
          </div>
        )}
      </td>
      <td className="hidden md:table-cell px-4 py-3 text-center text-xs text-white/70">
        {formatProfitRange(
          supplier.price,
          item.wholesalePrice,
          item.retailPrice
        )}
      </td>
      <td className="px-2 md:px-4 py-3">
        {isRowEditing ? (
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-green-600/20 text-green-200 hover:bg-green-500/30 disabled:opacity-60"
              disabled={isRowSaving}
              onClick={() =>
                onConfirmSupplyEditing(
                  item.id,
                  supplier.sourceId,
                  productKey,
                  item.sanPhamRaw
                )
              }
            >
              <CheckIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-red-600/20 text-red-200 hover:bg-red-500/30 disabled:opacity-60"
              disabled={isRowSaving}
              onClick={() => onCancelSupplyEditing(item.id, supplier.sourceId)}
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/25 text-white/80 hover:border-white/40 hover:text-white disabled:opacity-60"
              disabled={isRowSaving}
              onClick={() =>
                onStartEditingSupply(item.id, supplier.sourceId, supplier.price)
              }
            >
              <PencilIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-red-200/60 text-red-200 hover:border-red-200 hover:bg-red-500/10 disabled:opacity-60"
              disabled={isRowSaving}
              onClick={() =>
                onDeleteSupplyRow(
                  item.id,
                  supplier.sourceId,
                  productKey,
                  item.sanPhamRaw
                )
              }
            >
              <XCircleIcon className="h-4 w-4" />
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}
