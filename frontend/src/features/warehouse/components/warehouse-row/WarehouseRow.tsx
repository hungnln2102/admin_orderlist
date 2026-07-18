import React, { useCallback } from "react";
import {
  PencilSquareIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import type { ProductOption } from "../../hooks/useWarehouseProducts";
import { WarehouseItem, getWarehouseServiceDisplayName } from "../../types";
import { getWarehouseTheme } from "../../utils/warehouseTheme";
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

  return (
    <React.Fragment>
      <tr
        onClick={handleToggle}
        className={`warehouse-row group/row cursor-pointer transition-all duration-500 ${isExpanded ? "warehouse-row--expanded z-20" : "z-10"
          }`}
      >
        <td className={productCellClass}>
          <div className="flex flex-wrap justify-center gap-1">
            {(item.services && item.services.length > 0) ? (
              item.services.map((srv, idx) => {
                const productLabel = getWarehouseServiceDisplayName(srv) || "—";

                return (
                  <span
                    key={srv.id || idx}
                    className={`inline-block whitespace-nowrap text-center text-[9px] font-bold uppercase tracking-wide text-white px-1.5 py-0.5 rounded ${srv.status === 'Đang Sử Dụng' ? 'bg-white/10 text-white/50 line-through' : 'bg-indigo-500/80'}`}
                    title={`${productLabel} - ${srv.status || ""}`}
                  >
                    {productLabel} {srv.status === 'Đang Sử Dụng' ? '(Hết)' : ''}
                  </span>
                );
              })
            ) : (
              <span className="block whitespace-nowrap text-center text-[10px] font-bold uppercase leading-tight tracking-wide text-white sm:text-[11px]">
                {item.category || "—"}
              </span>
            )}
          </div>
        </td>

        <td className={`${cellClass} max-w-0 overflow-hidden`}>
          <span
            className="block truncate text-center text-[10px] font-medium text-indigo-100/90 sm:text-[11px]"
            title={item.account || ""}
          >
            {item.account || "?"}
          </span>
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
