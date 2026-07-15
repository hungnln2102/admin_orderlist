import React from "react";
import { CheckIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { OrdersPagination } from "@/features/orders/components/OrdersPagination";
import type { ProductOption } from "../hooks/useWarehouseProducts";
import { WarehouseItem } from "../types";
import { ResponsiveTable } from "@/components/ui/ResponsiveTable";
import { StorageMobileList } from "./StorageItemCard";
import { WAREHOUSE_TOTAL_COLUMNS } from "../utils/warehouseTheme";
import { WarehouseRow } from "./warehouse-row/WarehouseRow";
import { WarehouseEditFields } from "./warehouse-row/WarehouseEditFields";

type StorageTableProps = {
  items: WarehouseItem[];
  filteredCount: number;
  productOptions: ProductOption[];
  draft: WarehouseItem | null;
  editingId: number | "new" | null;
  expandedItemId: number | null;
  loading: boolean;
  currentPage: number;
  totalPages: number;
  rowsPerPage: number;
  paginationPages: Array<number | string>;
  setCurrentPage: (value: number | ((prev: number) => number)) => void;
  setRowsPerPage: (value: number) => void;
  onDraftChange: (key: keyof WarehouseItem, value: string) => void;
  onSave: (id?: number) => void;
  onDelete: (id?: number) => void;
  onCancel: () => void;
  onStartEdit: (item: WarehouseItem) => void;
  onStartCreate: () => void;
  onToggleDetails: (id: number) => void;
  onCreatePackage?: (item: WarehouseItem) => void;
  onExpireStock?: (stockId: number, deleteStock: boolean) => Promise<void>;
};

export const StorageTable: React.FC<StorageTableProps> = ({
  items,
  filteredCount,
  productOptions,
  draft,
  editingId,
  expandedItemId,
  loading,
  currentPage,
  totalPages,
  rowsPerPage,
  paginationPages,
  setCurrentPage,
  setRowsPerPage,
  onDraftChange,
  onSave,
  onDelete,
  onCancel,
  onStartEdit,
  onStartCreate: _onStartCreate,
  onToggleDetails,
  onCreatePackage,
  onExpireStock,
}) => {
  const mobileList = (
    <StorageMobileList
      items={items}
      filteredCount={filteredCount}
      productOptions={productOptions}
      draft={draft}
      editingId={editingId}
      expandedItemId={expandedItemId}
      loading={loading}
      onDraftChange={onDraftChange}
      onSave={onSave}
      onDelete={onDelete}
      onCancel={onCancel}
      onStartEdit={onStartEdit}
      onToggleDetails={onToggleDetails}
      onCreatePackage={onCreatePackage}
      onExpireStock={onExpireStock}
    />
  );

  return (
    <div className="w-full min-w-0 overflow-hidden rounded-[18px] border border-white/12 bg-gradient-to-br from-indigo-900/70 via-slate-900/70 to-slate-950/70 shadow-[0_20px_65px_-30px_rgba(0,0,0,0.85)]">
      <ResponsiveTable className="w-full" showCardOnMobile cardView={mobileList}>
        <div className="overflow-x-auto">
        <table className="min-w-[920px] w-full table-fixed border-separate border-spacing-y-4 text-white">
          <colgroup>
            <col className="w-[40%]" />
            <col className="w-[40%]" />
            <col className="w-[20%]" />
          </colgroup>
          <thead>
            <tr className="[&>th]:px-1.5 [&>th]:pb-2 [&>th]:text-center [&>th]:text-[9px] [&>th]:font-bold [&>th]:uppercase [&>th]:tracking-wide [&>th]:text-indigo-300/70 sm:[&>th]:px-2 sm:[&>th]:text-[10px]">
              <th className="!px-2 sm:!px-3">Sản phẩm</th>
              <th>Tài khoản</th>
              <th className="pr-2 text-right sm:pr-3">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {editingId === "new" && draft && (
              <tr>
                <td colSpan={WAREHOUSE_TOTAL_COLUMNS} className="px-4 pb-2 pt-0 sm:px-6">
                  <div
                    className="rounded-[24px] border border-indigo-400/20 bg-indigo-500/[0.08] p-5 glass-panel-light sm:rounded-[32px] sm:p-6"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <p className="mb-4 text-center text-sm font-semibold text-indigo-50">
                      Thêm tài khoản mới
                    </p>
                    <WarehouseEditFields
                      draft={draft}
                      productOptions={productOptions}
                      onChange={onDraftChange}
                    />
                    <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-white/10 pt-4">
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => onSave()}
                        className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-4 py-1.5 text-xs font-semibold text-emerald-200 ring-1 ring-emerald-500/30 hover:bg-emerald-500/30 disabled:opacity-50"
                      >
                        <CheckIcon className="h-4 w-4" />
                        Lưu
                      </button>
                      <button
                        type="button"
                        disabled={loading}
                        onClick={onCancel}
                        className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-4 py-1.5 text-xs font-semibold text-white/60 ring-1 ring-white/10 hover:bg-white/10 disabled:opacity-50"
                      >
                        <XMarkIcon className="h-4 w-4" />
                        Huỷ
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            )}

            {filteredCount === 0 && editingId !== "new" && (
              <tr>
                <td colSpan={WAREHOUSE_TOTAL_COLUMNS} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5">
                      <ArchiveIcon className="h-7 w-7 text-white/25" />
                    </div>
                    <p className="text-sm text-white/40">Chưa có dữ liệu tồn kho</p>
                  </div>
                </td>
              </tr>
            )}

            {items.map((item) => (
              <WarehouseRow
                key={item.id ?? `${item.category}-${item.account}`}
                item={item}
                isExpanded={expandedItemId === item.id}
                isEditing={editingId === item.id}
                draft={draft}
                productOptions={productOptions}
                totalColumns={WAREHOUSE_TOTAL_COLUMNS}
                loading={loading}
                onToggle={onToggleDetails}
                onStartEdit={onStartEdit}
                onDelete={onDelete}
                onDraftChange={onDraftChange}
                onSave={onSave}
                onCancel={onCancel}
              />
            ))}
          </tbody>
        </table>
        </div>
      </ResponsiveTable>

      <OrdersPagination
        filteredOrdersLength={filteredCount}
        rowsPerPage={rowsPerPage}
        setRowsPerPage={setRowsPerPage}
        currentPage={currentPage}
        totalPages={totalPages}
        paginationPages={paginationPages}
        setCurrentPage={setCurrentPage}
      />
    </div>
  );
};

const ArchiveIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z"
    />
  </svg>
);
