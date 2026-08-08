import React, { useCallback } from "react";
import {
  PencilSquareIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import type { ProductOption } from "../../hooks/useWarehouseProducts";
import type { ServiceNameOption } from "../../hooks/useWarehouseServiceNames";
import { WarehouseItem, getWarehouseServiceDisplayName } from "../../types";
import { getWarehouseTheme } from "../../utils/warehouseTheme";
import { WarehouseRowExpanded } from "./WarehouseRowExpanded";

type Props = {
  item: WarehouseItem;
  isExpanded: boolean;
  isEditing: boolean;
  draft: WarehouseItem | null;
  productOptions: ProductOption[];
  serviceNameOptions: ServiceNameOption[];
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
  serviceNameOptions,
  totalColumns,
  loading,
  onToggle,
  onStartEdit,
  onDelete,
  onDraftChange,
  onSave,
  onCancel,
}: Props) {
  const totalSrv = item.services?.length || 0;
  const availSrv = item.services?.filter(s => s.status === 'AVAILABLE').length || 0;
  const isAvailable = availSrv > 0;
  const theme = getWarehouseTheme(isAvailable ? 'tồn' : 'dùng');
  const cellClass = `warehouse-row__cell px-3 py-4 glass-panel border-y transition-all duration-300 ${theme.rowSurfaceClass}`;
  const productCellClass = `${cellClass} first:rounded-l-[20px] !px-4`;

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
        className={`warehouse-row group/row cursor-pointer transition-all duration-300 hover:shadow-lg ${
          isExpanded ? "warehouse-row--expanded z-20 bg-indigo-500/[0.04]" : "z-10"
        }`}
      >
        <td className={productCellClass}>
          <div className="flex flex-col items-center justify-center gap-1.5">
            {(item.services && item.services.length > 0) ? (
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                {item.services.map((srv, idx) => {
                  const productLabel = getWarehouseServiceDisplayName(srv) || "—";
                  const isSrvAvail = srv.status === 'AVAILABLE';

                  return (
                    <span
                      key={srv.id || idx}
                      className={`inline-flex items-center whitespace-nowrap text-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg border transition-all ${
                        isSrvAvail
                          ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20 shadow-[0_0_10px_rgba(99,102,241,0.05)]'
                          : 'bg-slate-900/60 text-slate-500 border-white/5 line-through opacity-60'
                      }`}
                      title={`${productLabel} - ${isSrvAvail ? 'Tồn Kho' : 'Đang Sử Dụng'}`}
                    >
                      {productLabel}
                    </span>
                  );
                })}
              </div>
            ) : (
              <span className="block whitespace-nowrap text-center text-xs font-semibold uppercase tracking-wider text-slate-400">
                {item.category || "—"}
              </span>
            )}
          </div>
        </td>

        <td className={`${cellClass} max-w-0 overflow-hidden`}>
          <span
            className="block truncate text-center text-xs font-mono tracking-wide text-slate-300 group-hover/row:text-white transition-colors"
            title={item.account || ""}
          >
            {item.account || "—"}
          </span>
        </td>

        <td
          className={`warehouse-row__actions px-3 py-4 glass-panel border-y transition-all duration-300 last:rounded-r-[20px] ${theme.rowSurfaceClass}`}
        >
          <div className="flex flex-shrink-0 justify-end gap-2 pr-1">
            <button
              type="button"
              onClick={stopPropagation(() => onStartEdit(item))}
              disabled={loading}
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/5 text-amber-400 transition-all hover:bg-amber-500/20 active:scale-90"
              title="Sửa"
            >
              <PencilSquareIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={stopPropagation(() => onDelete(item.id))}
              disabled={loading}
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border border-rose-500/20 bg-rose-500/5 text-rose-400 transition-all hover:bg-rose-500/20 active:scale-90"
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
        serviceNameOptions={serviceNameOptions}
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
