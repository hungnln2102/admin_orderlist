import React from "react";
import type { ProductOption } from "../hooks/useWarehouseProducts";
import { WarehouseItem } from "../types";
import { getWarehouseTheme } from "../utils/warehouseTheme";
import { WarehouseEditFields } from "./warehouse-row/WarehouseEditFields";
import { FormActions } from "./storage-mobile/FormActions";
import { ViewCard } from "./storage-mobile/ViewCard";

type MobileProps = {
  items: WarehouseItem[];
  filteredCount: number;
  productOptions: ProductOption[];
  draft: WarehouseItem | null;
  editingId: number | "new" | null;
  expandedItemId: number | null;
  loading: boolean;
  onDraftChange: (key: keyof WarehouseItem, value: string) => void;
  onSave: (id?: number) => void;
  onDelete: (id?: number) => void;
  onCancel: () => void;
  onStartEdit: (item: WarehouseItem) => void;
  onToggleDetails: (id: number) => void;
  onCreatePackage?: (item: WarehouseItem) => void;
  onExpireStock?: (stockId: number, deleteStock: boolean) => Promise<void>;
};

export const StorageMobileList: React.FC<MobileProps> = ({
  items,
  filteredCount,
  productOptions,
  draft,
  editingId,
  expandedItemId,
  loading,
  onDraftChange,
  onSave,
  onDelete,
  onCancel,
  onStartEdit,
  onToggleDetails,
  onCreatePackage,
  onExpireStock,
}) => {
  if (loading && filteredCount === 0 && editingId !== "new") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-400/20 border-t-indigo-400" />
        <p className="text-sm text-white/40">Đang tải dữ liệu kho…</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 px-1 pb-2">
      {editingId === "new" && draft && (
        <div className="glass-panel rounded-[24px] border border-white/10 p-4">
          <p className="mb-3 text-center text-sm font-bold text-indigo-50">Thêm tài khoản mới</p>
          <WarehouseEditFields
            draft={draft}
            productOptions={productOptions}
            onChange={onDraftChange}
          />
          <FormActions
            isNew
            loading={loading}
            onSave={onSave}
            onDelete={onDelete}
            onCancel={onCancel}
          />
        </div>
      )}

      {filteredCount === 0 && editingId !== "new" ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-white/10 py-16 text-center">
          <p className="text-sm text-white/35">Chưa có dữ liệu tồn kho</p>
        </div>
      ) : (
        items.map((item) => {
          const isEditing = editingId === item.id;
          const isExpanded = expandedItemId === item.id || isEditing;
          const key = item.id ?? `row-${String(item.account)}-${String(item.category)}`;

          if (isEditing && draft) {
            const theme = getWarehouseTheme(draft.status);
            return (
              <div
                key={key}
                className={`glass-panel rounded-[24px] border p-4 ${theme.expandablePanelClass}`}
              >
                <p className="mb-3 text-center text-sm font-bold text-amber-200/90">
                  Chỉnh sửa tài khoản
                </p>
                <WarehouseEditFields
            draft={draft}
            productOptions={productOptions}
            onChange={onDraftChange}
          />
                <FormActions
                  itemId={item.id}
                  loading={loading}
                  onSave={onSave}
                  onDelete={onDelete}
                  onCancel={onCancel}
                />
              </div>
            );
          }

          return (
            <ViewCard
              key={key}
              item={item}
              isExpanded={isExpanded}
              loading={loading}
              onToggle={() => item.id != null && onToggleDetails(item.id)}
              onStartEdit={onStartEdit}
              onDelete={onDelete}
              onCreatePackage={onCreatePackage}
              onExpireStock={onExpireStock}
            />
          );
        })
      )}
    </div>
  );
};
