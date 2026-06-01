import React, { useCallback } from "react";
import {
  PencilSquareIcon,
  TrashIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { CheckCircleIcon as CheckCircleSolid } from "@heroicons/react/24/solid";
import type { ProductOption } from "../../hooks/useWarehouseProducts";
import { WarehouseItem } from "../../types";
import { getWarehouseTheme } from "../../utils/warehouseTheme";
import { warehouseStatusClass } from "../storageItemCardUtils";
import { WarehouseRowExpanded } from "./WarehouseRowExpanded";

type Props = {
  item: WarehouseItem;
  isExpanded: boolean;
  isEditing: boolean;
  draft: WarehouseItem | null;
  productOptions: ProductOption[];
  totalColumns: number;
  loading: boolean;
  onToggle: (id: number) => void;
  onStartEdit: (item: WarehouseItem) => void;
  onDelete: (id?: number) => void;
  onDraftChange: (key: keyof WarehouseItem, value: string) => void;
  onSave: (id?: number) => void;
  onCancel: () => void;
};

export const WarehouseRow = React.memo(function WarehouseRow({
  item,
  isExpanded,
  isEditing,
  draft,
  productOptions,
  totalColumns,
  loading,
  onToggle,
  onStartEdit,
  onDelete,
  onDraftChange,
  onSave,
  onCancel,
}: Props) {
  const theme = getWarehouseTheme(item.status);
  const cellClass = `warehouse-row__cell px-1.5 sm:px-2 py-3 sm:py-4 glass-panel border-y transition-all duration-500 ${theme.rowSurfaceClass}`;
  const productCellClass = `${cellClass} first:rounded-l-[16px] sm:first:rounded-l-[24px] !px-2 sm:!px-3`;

  const handleToggle = useCallback(() => {
    if (item.id == null || isEditing) return;
    onToggle(item.id);
  }, [isEditing, item.id, onToggle]);

  const stopPropagation =
    (action: () => void) => (event: React.MouseEvent) => {
      event.stopPropagation();
      action();
    };

  const exp = item.expires_at
    ? new Date(item.expires_at).toLocaleDateString("vi-VN")
    : "—";

  return (
    <React.Fragment>
      <tr
        onClick={handleToggle}
        className={`warehouse-row group/row cursor-pointer transition-all duration-500 ${
          isExpanded ? "warehouse-row--expanded z-20" : "z-10"
        }`}
      >
        <td className={productCellClass}>
          <span
            className="block whitespace-nowrap text-center text-[10px] font-bold uppercase leading-tight tracking-wide text-white sm:text-[11px]"
            title={item.category || ""}
          >
            {item.category || "—"}
          </span>
        </td>

        <td className={`${cellClass} max-w-0 overflow-hidden`}>
          <span
            className="block truncate text-center text-[10px] font-medium text-indigo-100/90 sm:text-[11px]"
            title={item.account || ""}
          >
            {item.account || "—"}
          </span>
        </td>

        <td className={`${cellClass} text-center`}>
          <span
            className={`inline-block max-w-full truncate rounded-full border px-1.5 py-0.5 text-[7px] font-bold uppercase leading-tight sm:text-[8px] ${warehouseStatusClass(
              item.status
            )}`}
            title={item.status || ""}
          >
            {item.status || "—"}
          </span>
        </td>

        <td className={`${cellClass} text-center`}>
          <span className="inline-block whitespace-nowrap text-[9px] font-semibold tabular-nums text-indigo-200/90 sm:text-[10px]">
            {exp}
          </span>
        </td>

        <td className={`${cellClass} text-center`}>
          {item.is_verified ? (
            <CheckCircleSolid
              className="mx-auto h-4 w-4 text-emerald-400 sm:h-5 sm:w-5"
              aria-label="Đã xác minh"
            />
          ) : (
            <XCircleIcon
              className="mx-auto h-4 w-4 text-white/20 sm:h-5 sm:w-5"
              aria-label="Chưa xác minh"
            />
          )}
        </td>

        <td
          className={`warehouse-row__actions px-1.5 sm:px-2 py-3 sm:py-4 glass-panel border-y transition-all duration-500 last:rounded-r-[16px] sm:last:rounded-r-[24px] ${theme.rowSurfaceClass}`}
        >
          <div className="flex flex-shrink-0 justify-end gap-1">
            <button
              type="button"
              onClick={stopPropagation(() => onStartEdit(item))}
              disabled={loading}
              className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border border-amber-500/20 bg-amber-500/10 text-amber-400 transition-all hover:bg-amber-500/30 sm:h-8 sm:w-8 sm:rounded-xl"
              title="Sửa"
            >
              <PencilSquareIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>
            <button
              type="button"
              onClick={stopPropagation(() => onDelete(item.id))}
              disabled={loading}
              className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border border-rose-500/20 bg-rose-500/10 text-rose-400 transition-all hover:bg-rose-500/30 sm:h-8 sm:w-8 sm:rounded-xl"
              title="Xoá"
            >
              <TrashIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>
          </div>
        </td>
      </tr>

      <WarehouseRowExpanded
        isExpanded={isExpanded || isEditing}
        isEditing={isEditing}
        totalColumns={totalColumns}
        item={item}
        draft={draft}
        productOptions={productOptions}
        theme={theme}
        loading={loading}
        onDraftChange={onDraftChange}
        onSave={onSave}
        onDelete={onDelete}
        onCancel={onCancel}
      />
    </React.Fragment>
  );
});

WarehouseRow.displayName = "WarehouseRow";
