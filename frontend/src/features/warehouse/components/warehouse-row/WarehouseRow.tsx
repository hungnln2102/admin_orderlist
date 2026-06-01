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
  const cellClass = `warehouse-row__cell px-2 sm:px-4 py-3 sm:py-5 glass-panel border-y transition-all duration-500 ${theme.rowSurfaceClass}`;

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
        <td className={`${cellClass} first:rounded-l-[16px] sm:first:rounded-l-[24px] overflow-hidden max-w-0`}>
          <div className="flex w-full min-w-0 flex-col items-center">
            <span
              className="block w-full truncate text-center text-xs font-bold uppercase tracking-wide text-white sm:text-sm"
              title={item.category || ""}
            >
              {item.category || "—"}
            </span>
          </div>
        </td>

        <td className={`${cellClass} overflow-hidden max-w-0`}>
          <div className="flex w-full min-w-0 flex-col items-center">
            <span
              className="block w-full truncate text-center text-xs font-medium tracking-wide text-indigo-100/90 sm:text-sm"
              title={item.account || ""}
            >
              {item.account || "—"}
            </span>
          </div>
        </td>

        <td className={`${cellClass} text-center`}>
          <span
            className={`inline-block w-full max-w-full truncate rounded-full border px-2 py-1 text-[9px] font-bold uppercase tracking-wider shadow-[inset_0_1px_2px_rgba(255,255,255,0.1)] sm:text-[10px] ${warehouseStatusClass(
              item.status
            )}`}
            title={item.status || ""}
          >
            {item.status || "—"}
          </span>
        </td>

        <td className={`${cellClass} text-center`}>
          <div className="inline-flex w-full max-w-full items-center justify-center truncate rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-bold text-indigo-200 sm:text-[11px]">
            {exp}
          </div>
        </td>

        <td className={`${cellClass} text-center`}>
          {item.is_verified ? (
            <CheckCircleSolid
              className="mx-auto h-5 w-5 text-emerald-400"
              aria-label="Đã xác minh"
            />
          ) : (
            <XCircleIcon className="mx-auto h-5 w-5 text-white/20" aria-label="Chưa xác minh" />
          )}
        </td>

        <td
          className={`warehouse-row__actions px-2 sm:px-4 py-3 sm:py-5 glass-panel border-y transition-all duration-500 last:rounded-r-[16px] sm:last:rounded-r-[24px] ${theme.rowSurfaceClass}`}
        >
          <div className="flex flex-shrink-0 justify-end space-x-2">
            <button
              type="button"
              onClick={stopPropagation(() => onStartEdit(item))}
              disabled={loading}
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-400 transition-all hover:bg-amber-500/30"
              title="Sửa"
            >
              <PencilSquareIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={stopPropagation(() => onDelete(item.id))}
              disabled={loading}
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400 transition-all hover:bg-rose-500/30"
              title="Xoá"
            >
              <TrashIcon className="h-4 w-4" />
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
