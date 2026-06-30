import React, { useEffect, useState } from "react";
import {
  ArchiveBoxIcon,
  ChevronUpDownIcon,
  PencilIcon,
} from "@heroicons/react/24/outline";
import type {
  AccountInfo,
  ManualWarehouseEntry,
} from "../../../utils/packageHelpers";
import type { WarehouseItem } from "../../../../../Personal/Storage/types";
import { ItemDetailCard } from "./ItemDetailCard";
import {
  inputCls,
  labelCls,
  mergeDisplayInfo,
  normalizeWarehouseId,
  toEditableWarehouseFields,
  type EditableWarehouseFields,
} from "./shared";
import { StockManualEntryFields } from "./StockManualEntryFields";
import { StockDropdownMenu } from "./StockDropdownMenu";

export type StockDropdownProps = {
  label: string;
  placeholder: string;
  filteredItems: WarehouseItem[];
  totalCount: number;
  loading: boolean;
  selectedId: number | null;
  selectedItem: WarehouseItem | null;
  search: string;
  onSearchChange: (value: string) => void;
  isOpen: boolean;
  onToggle: () => void;
  onSelect: (item: WarehouseItem) => void;
  onClear: () => void;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
  manualMode: boolean;
  onToggleManual: () => void;
  manualEntry: ManualWarehouseEntry;
  onManualEntryChange: (entry: ManualWarehouseEntry) => void;
  readOnly?: boolean;
  fallbackInfo?: AccountInfo | null;
  onUpdateSelected?: (
    id: number,
    fields: EditableWarehouseFields
  ) => Promise<void>;
};

export const StockDropdown: React.FC<StockDropdownProps> = ({
  label,
  placeholder,
  filteredItems,
  totalCount,
  loading,
  selectedId,
  selectedItem,
  search,
  onSearchChange,
  isOpen,
  onToggle,
  onSelect,
  onClear,
  dropdownRef,
  manualMode,
  onToggleManual,
  manualEntry,
  onManualEntryChange,
  readOnly,
  fallbackInfo,
  onUpdateSelected,
}) => {
  const [editing, setEditing] = useState(false);
  const [editingInfo, setEditingInfo] = useState(false);
  const [savingInfo, setSavingInfo] = useState(false);
  const [editInfoError, setEditInfoError] = useState<string | null>(null);
  const [editInfoDraft, setEditInfoDraft] = useState<EditableWarehouseFields>(
    toEditableWarehouseFields(mergeDisplayInfo(selectedItem, fallbackInfo))
  );

  useEffect(() => {
    if (editingInfo) return;
    setEditInfoDraft(
      toEditableWarehouseFields(mergeDisplayInfo(selectedItem, fallbackInfo))
    );
  }, [selectedItem, fallbackInfo, editingInfo]);

  useEffect(() => {
    setEditingInfo(false);
    setEditInfoError(null);
  }, [selectedId]);

  useEffect(() => {
    if (readOnly && selectedId != null) {
      setEditing(false);
    }
  }, [readOnly, selectedId]);

  const canInlineEdit = Boolean(
    readOnly && selectedId != null && onUpdateSelected
  );

  const handleOpenInlineEdit = () => {
    setEditInfoError(null);
    setEditInfoDraft(
      toEditableWarehouseFields(mergeDisplayInfo(selectedItem, fallbackInfo))
    );
    setEditingInfo(true);
  };

  const handleCancelInlineEdit = () => {
    setEditInfoError(null);
    setEditingInfo(false);
    setEditInfoDraft(
      toEditableWarehouseFields(mergeDisplayInfo(selectedItem, fallbackInfo))
    );
  };

  const handleSaveInlineEdit = async () => {
    const targetId = normalizeWarehouseId(selectedItem?.id ?? selectedId);
    if (!onUpdateSelected || targetId == null) return;

    setSavingInfo(true);
    setEditInfoError(null);

    try {
      await onUpdateSelected(targetId, editInfoDraft);
      setEditingInfo(false);
    } catch {
      setEditInfoError(
        "Không thể cập nhật tài khoản. Vui lòng thử lại."
      );
    } finally {
      setSavingInfo(false);
    }
  };

  if (readOnly && selectedId != null && !editing) {
    if (loading && !selectedItem && !fallbackInfo) {
      return (
        <div>
          <label className={labelCls}>{label}</label>
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-4 text-center text-xs text-white/30">
            Đang tải thông tin tài khoản...
          </div>
        </div>
      );
    }

    const displayItem = mergeDisplayInfo(selectedItem, fallbackInfo);
    if (displayItem) {
      return (
        <div className="space-y-2">
          <label className={labelCls}>{label}</label>
          <ItemDetailCard
            item={displayItem}
            onChange={() => setEditing(true)}
            onEditInfo={
              !editingInfo && canInlineEdit ? handleOpenInlineEdit : null
            }
            editingInfo={editingInfo && canInlineEdit}
            draft={editInfoDraft}
            onDraftChange={setEditInfoDraft}
            onCancelEditInfo={handleCancelInlineEdit}
            onSaveEditInfo={handleSaveInlineEdit}
            savingInfo={savingInfo}
            editInfoError={editInfoError}
          />
        </div>
      );
    }
  }

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-white/50">
          {label}
        </label>
        <button
          type="button"
          onClick={onToggleManual}
          className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium transition-colors ${
            manualMode
              ? "border border-amber-500/20 bg-amber-500/10 text-amber-400"
              : "border border-transparent text-white/30 hover:text-white/50"
          }`}
          title={manualMode ? "Chọn từ kho" : "Tự điền thủ công"}
        >
          {manualMode ? (
            <>
              <ArchiveBoxIcon className="h-3 w-3" />
              Chọn từ kho
            </>
          ) : (
            <>
              <PencilIcon className="h-3 w-3" />
              Tự điền
            </>
          )}
        </button>
      </div>

      {manualMode ? (
        <StockManualEntryFields
          manualEntry={manualEntry}
          onManualEntryChange={onManualEntryChange}
        />
      ) : (
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={onToggle}
            className={`${inputCls} flex items-center justify-between gap-2 text-left`}
          >
            {selectedItem ? (
              <div className="flex min-w-0 items-center gap-2">
                <span className="inline-flex shrink-0 items-center rounded border border-emerald-500/20 bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-400">
                  Tồn
                </span>
                <span className="truncate font-medium">
                  {selectedItem.account}
                </span>
                {selectedItem.category && (
                  <span className="shrink-0 truncate text-xs text-white/30">
                    ({selectedItem.category})
                  </span>
                )}
              </div>
            ) : (
              <span className="text-white/20">
                {loading ? "Đang tải..." : placeholder}
              </span>
            )}
            <ChevronUpDownIcon className="h-4 w-4 shrink-0 text-white/30" />
          </button>

          {selectedItem && (
            <button
              type="button"
              onClick={onClear}
              className="absolute right-8 top-1/2 -translate-y-1/2 text-xs text-white/30 transition-colors hover:text-white/60"
              title="Bỏ chọn"
            >
              ✕
            </button>
          )}

          {isOpen && (
            <StockDropdownMenu
              filteredItems={filteredItems}
              totalCount={totalCount}
              loading={loading}
              selectedId={selectedId}
              search={search}
              onSearchChange={onSearchChange}
              onSelect={onSelect}
            />
          )}
        </div>
      )}
    </div>
  );
};
