import React from "react";
import { PencilIcon } from "@heroicons/react/24/outline";
import type { WarehouseItem } from "../../../../../Personal/Storage/types";
import {
  buildInfoEntries,
  manualFieldCls,
  type AccountDisplayInfo,
  type EditableWarehouseFields,
} from "./shared";

type ItemDetailCardProps = {
  item: WarehouseItem | AccountDisplayInfo;
  onChange: () => void;
  onEditInfo?: (() => void) | null;
  editingInfo?: boolean;
  draft?: EditableWarehouseFields;
  onDraftChange?: (next: EditableWarehouseFields) => void;
  onCancelEditInfo?: () => void;
  onSaveEditInfo?: () => void;
  savingInfo?: boolean;
  editInfoError?: string | null;
};

export const ItemDetailCard: React.FC<ItemDetailCardProps> = ({
  item,
  onChange,
  onEditInfo,
  editingInfo,
  draft,
  onDraftChange,
  onCancelEditInfo,
  onSaveEditInfo,
  savingInfo,
  editInfoError,
}) => {
  const entries = buildInfoEntries(item);
  const hasAnyValue = entries.some(
    (entry) => entry.value != null && String(entry.value).trim() !== ""
  );
  const isEditingInfo = Boolean(editingInfo && draft && onDraftChange);

  if (!hasAnyValue && !isEditingInfo) {
    return (
      <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-3 text-xs text-white/30">
        Không có thông tin tài khoản.
        <button
          type="button"
          onClick={onChange}
          className="ml-2 text-indigo-400 transition-colors hover:text-indigo-300"
        >
          Chọn tài khoản
        </button>
        {onEditInfo && (
          <button
            type="button"
            onClick={onEditInfo}
            className="ml-2 text-indigo-400 transition-colors hover:text-indigo-300"
          >
            Sửa thông tin
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-white/[0.06] bg-white/[0.02]">
      <div className="divide-y divide-white/[0.04]">
        {entries.map(({ key, label, value, placeholder }) => {
          const hasValue = value != null && String(value).trim() !== "";

          return (
            <div key={key} className="flex items-start gap-3 px-3 py-2">
              <span className="w-24 shrink-0 pt-0.5 text-[11px] text-white/30">
                {label}
              </span>
              {isEditingInfo && draft && onDraftChange ? (
                <input
                  type="text"
                  value={draft[key as keyof EditableWarehouseFields]}
                  onChange={(event) =>
                    onDraftChange({
                      ...draft,
                      [key as keyof EditableWarehouseFields]:
                        event.target.value,
                    })
                  }
                  placeholder={placeholder}
                  className={`${manualFieldCls} py-1.5`}
                />
              ) : (
                <span
                  className={`min-w-0 break-all text-sm ${
                    hasValue ? "text-white" : "italic text-white/15"
                  }`}
                >
                  {hasValue ? String(value) : "—"}
                </span>
              )}
            </div>
          );
        })}
      </div>
      <div className="space-y-2 border-t border-white/[0.04] px-3 py-2">
        {isEditingInfo ? (
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onCancelEditInfo}
              disabled={savingInfo}
              className="rounded-md border border-white/[0.12] px-2.5 py-1 text-[11px] font-medium text-white/60 transition-colors hover:bg-white/[0.06] disabled:opacity-40"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={onSaveEditInfo}
              disabled={savingInfo}
              className="rounded-md bg-indigo-500 px-2.5 py-1 text-[11px] font-medium text-white transition-colors hover:bg-indigo-400 disabled:opacity-40"
            >
              {savingInfo ? "Đang lưu..." : "Lưu tài khoản"}
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onChange}
              className="flex items-center gap-1 text-[10px] font-medium text-white/30 transition-colors hover:text-white/50"
            >
              <PencilIcon className="h-3 w-3" />
              Thay đổi tài khoản
            </button>
            {onEditInfo && (
              <button
                type="button"
                onClick={onEditInfo}
                className="flex items-center gap-1 text-[10px] font-medium text-indigo-400/80 transition-colors hover:text-indigo-300"
              >
                <PencilIcon className="h-3 w-3" />
                Sửa thông tin tại đây
              </button>
            )}
          </div>
        )}

        {editInfoError && (
          <p
            className="rounded-md border border-rose-500/20 bg-rose-500/10 px-2.5 py-1.5 text-xs text-rose-300"
            role="alert"
          >
            {editInfoError}
          </p>
        )}
      </div>
    </div>
  );
};
