import React, { useCallback, useRef, useState } from "react";
import {
  CheckIcon,
  PencilSquareIcon,
  TrashIcon,
  XMarkIcon,
  XCircleIcon,
  CubeIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import { CheckCircleIcon as CheckCircleSolid } from "@heroicons/react/24/solid";
import type { ProductOption } from "../hooks/useWarehouseProducts";
import { WarehouseItem } from "../types";
import { getWarehouseTheme } from "../utils/warehouseTheme";
import {
  formatWarehouseRowForCopy,
  warehouseStatusClass,
} from "./storageItemCardUtils";
import { CopyableValue } from "./CopyableValue";
import { WarehouseEditFields } from "./warehouse-row/WarehouseEditFields";
import { ExpireModal } from "./ExpireModal";

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

const FormActions: React.FC<{
  isNew?: boolean;
  itemId?: number;
  loading: boolean;
  onSave: (id?: number) => void;
  onDelete: (id?: number) => void;
  onCancel: () => void;
}> = ({ isNew, itemId, loading, onSave, onDelete, onCancel }) => (
  <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-white/5 pt-4">
    <button
      type="button"
      onClick={() => onSave(isNew ? undefined : itemId)}
      disabled={loading}
      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/20 px-3 py-2 text-sm font-medium text-emerald-300 ring-1 ring-emerald-500/30 hover:bg-emerald-500/30 disabled:opacity-50"
    >
      <CheckIcon className="h-4 w-4" />
      Lưu
    </button>
    {!isNew && itemId != null && (
      <button
        type="button"
        onClick={() => onDelete(itemId)}
        disabled={loading}
        className="inline-flex items-center gap-1.5 rounded-xl bg-rose-500/15 px-3 py-2 text-sm font-medium text-rose-300 ring-1 ring-rose-500/25 hover:bg-rose-500/25 disabled:opacity-50"
      >
        <TrashIcon className="h-4 w-4" />
        Xoá
      </button>
    )}
    <button
      type="button"
      onClick={onCancel}
      disabled={loading}
      className="inline-flex items-center gap-1.5 rounded-xl bg-white/5 px-3 py-2 text-sm text-white/60 ring-1 ring-white/10 hover:bg-white/10 disabled:opacity-50"
    >
      <XMarkIcon className="h-4 w-4" />
      Huỷ
    </button>
  </div>
);

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

const ViewCard: React.FC<{
  item: WarehouseItem;
  isExpanded: boolean;
  loading: boolean;
  onToggle: () => void;
  onStartEdit: (item: WarehouseItem) => void;
  onDelete: (id?: number) => void;
  onCreatePackage?: (item: WarehouseItem) => void;
  onExpireStock?: (stockId: number, deleteStock: boolean) => Promise<void>;
}> = ({ item, isExpanded, loading, onToggle, onStartEdit, onDelete, onCreatePackage, onExpireStock }) => {
  const [expireModalOpen, setExpireModalOpen] = useState(false);
  const theme = getWarehouseTheme(item.status);
  const [rowCopied, setRowCopied] = useState(false);
  const resetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copyRow = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(formatWarehouseRowForCopy(item));
      setRowCopied(true);
      if (resetRef.current) clearTimeout(resetRef.current);
      resetRef.current = setTimeout(() => {
        setRowCopied(false);
        resetRef.current = null;
      }, 1600);
    } catch {
      /* ignore */
    }
  }, [item]);

  const exp = item.expires_at
    ? new Date(item.expires_at).toLocaleDateString("vi-VN")
    : "—";

  return (
    <div
      className={`glass-panel relative overflow-hidden rounded-[24px] border p-4 transition-all duration-500 ${theme.rowSurfaceClass}`}
    >
      <button
        type="button"
        className="w-full text-left"
        onClick={onToggle}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className={`text-[10px] font-bold uppercase tracking-widest ${theme.accentTextClass}`}>
              {item.category || "—"}
            </p>
            <p className="mt-0.5 truncate text-sm font-bold text-white">
              {item.account || "—"}
            </p>
          </div>
          {item.status ? (
            <span
              className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase ${warehouseStatusClass(
                item.status
              )}`}
            >
              {item.status}
            </span>
          ) : null}
        </div>
        <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-white/50">
          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 font-bold text-indigo-200">
            {exp}
          </span>
          <span className="flex items-center gap-1">
            V:{" "}
            {item.is_verified ? (
              <CheckCircleSolid className="h-4 w-4 text-emerald-400" />
            ) : (
              <XCircleIcon className="h-4 w-4 text-white/25" />
            )}
          </span>
        </div>
      </button>

      {isExpanded && (
        <div
          className={`mt-4 min-w-0 max-w-full overflow-hidden animate-in fade-in slide-in-from-top-2 rounded-[20px] border p-4 duration-300 ${theme.expandablePanelClass}`}
        >
          <p className="mb-3 text-center text-xs font-semibold text-indigo-50">
            Chi tiết tài khoản
          </p>
          <div className="space-y-3">
            <MobileDetail label="Mật khẩu" theme={theme}>
              <CopyableValue value={item.password} mono showButtonOnHover={false} />
            </MobileDetail>
            <MobileDetail label="Mail dự phòng" theme={theme}>
              <CopyableValue value={item.backup_email} showButtonOnHover={false} />
            </MobileDetail>
            <MobileDetail label="2FA" theme={theme}>
              <CopyableValue value={item.two_fa} mono showButtonOnHover={false} />
            </MobileDetail>
            <div
              className={`min-w-0 overflow-hidden rounded-xl border p-3 text-center ${theme.detailItemClass}`}
            >
              <p className={`text-[10px] font-bold uppercase ${theme.detailLabelClass}`}>Ghi chú</p>
              <p
                className="mt-1 line-clamp-4 break-words text-sm text-indigo-50"
                title={String(item.note || "").trim() || undefined}
              >
                {String(item.note || "").trim() || "Không có ghi chú."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void copyRow()}
            className="mt-3 w-full rounded-full bg-gradient-to-r from-emerald-500 to-green-600 py-2 text-xs font-semibold text-white"
          >
            {rowCopied ? "Đã sao chép" : "Sao chép tất cả"}
          </button>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onStartEdit(item)}
          disabled={loading}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 py-2 text-sm font-medium text-amber-200/90"
        >
          <PencilSquareIcon className="h-4 w-4" />
          Sua
        </button>
        {onCreatePackage && (
          <button
            type="button"
            onClick={() => onCreatePackage(item)}
            disabled={loading}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-500/15 py-2 text-sm font-medium text-indigo-300"
          >
            <CubeIcon className="h-4 w-4" />
            Tao Goi
          </button>
        )}
        {onExpireStock && item.id != null && (
          <button
            type="button"
            onClick={() => setExpireModalOpen(true)}
            disabled={loading}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-orange-500/25 bg-orange-500/10 py-2 text-sm font-medium text-orange-300/90"
          >
            <ClockIcon className="h-4 w-4" />
            Het Han
          </button>
        )}
        <button
          type="button"
          onClick={() => onDelete(item.id)}
          disabled={loading || item.id == null}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-rose-500/25 bg-rose-500/10 py-2 text-sm font-medium text-rose-300/90"
        >
          <TrashIcon className="h-4 w-4" />
          Xoa
        </button>
      </div>

      {onExpireStock && item.id != null && (
        <ExpireModal
          isOpen={expireModalOpen}
          stockId={item.id}
          onClose={() => setExpireModalOpen(false)}
          onConfirm={async (deleteStock) => {
            await onExpireStock(item.id!, deleteStock);
            setExpireModalOpen(false);
          }}
        />
      )}
    </div>
  );
};

const MobileDetail: React.FC<{
  label: string;
  theme: ReturnType<typeof getWarehouseTheme>;
  children: React.ReactNode;
}> = ({ label, theme, children }) => (
  <div className={`min-w-0 overflow-hidden rounded-xl border p-3 ${theme.detailItemClass}`}>
    <p className={`mb-2 text-[10px] font-bold uppercase ${theme.detailLabelClass}`}>{label}</p>
    <div className="min-w-0 w-full overflow-hidden">{children}</div>
  </div>
);
