import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AccountInfo,
  DEFAULT_SLOT_LIMIT,
  EMPTY_FORM_VALUES,
  EMPTY_MANUAL_ENTRY,
  formatDisplayDate,
  ManualWarehouseEntry,
  PackageFormValues,
  PackageTemplate,
  SlotLinkMode,
  SLOT_LINK_OPTIONS,
} from "../../utils/packageHelpers";
import { ModalShell } from "./ModalShell";
import { apiFetch } from "../../../../../lib/api";
import { API_ENDPOINTS } from "../../../../../constants";
import { WarehouseItem } from "../../../../Personal/Storage/types";
import { ChevronUpDownIcon, CheckIcon, MagnifyingGlassIcon, PencilIcon, ArchiveBoxIcon } from "@heroicons/react/24/outline";

export type PackageFormModalProps = {
  open: boolean;
  mode: "add" | "edit";
  template: PackageTemplate;
  initialValues?: PackageFormValues;
  hasStorage: boolean;
  stockInfo?: AccountInfo | null;
  storageInfo?: AccountInfo | null;
  onClose: () => void;
  onSubmit: (values: PackageFormValues) => void;
};

const labelCls = "block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5";
const inputCls =
  "w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-indigo-500/40 focus:bg-white/[0.06] transition-all";

const manualFieldCls =
  "w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-indigo-500/40 focus:bg-white/[0.06] transition-all";

const MANUAL_FIELDS: Array<{ key: keyof ManualWarehouseEntry; label: string; placeholder: string }> = [
  { key: "product_type", label: "Loại sản phẩm", placeholder: "VD: Google Drive, Netflix, Adobe..." },
  { key: "account", label: "Tài khoản", placeholder: "Email hoặc username..." },
  { key: "password", label: "Mật khẩu", placeholder: "Mật khẩu tài khoản..." },
  { key: "backup_email", label: "Email dự phòng", placeholder: "Email khôi phục..." },
  { key: "two_fa", label: "Mã 2FA", placeholder: "Mã xác thực hai lớp..." },
  { key: "note", label: "Ghi chú", placeholder: "Ghi chú thêm..." },
];

type EditableWarehouseFields = {
  account: string;
  password: string;
  backup_email: string;
  two_fa: string;
  note: string;
};

const normalizeWarehouseId = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const INLINE_EDIT_FIELDS: Array<{ key: keyof EditableWarehouseFields; label: string; placeholder: string }> = [
  { key: "account", label: "Tài khoản", placeholder: "Email hoặc username..." },
  { key: "password", label: "Mật khẩu", placeholder: "Mật khẩu tài khoản..." },
  { key: "backup_email", label: "Email dự phòng", placeholder: "Email khôi phục..." },
  { key: "two_fa", label: "Mã 2FA", placeholder: "Mã xác thực hai lớp..." },
  { key: "note", label: "Ghi chú", placeholder: "Ghi chú thêm..." },
];

type InfoEntry = {
  key: keyof EditableWarehouseFields | "expires_at";
  label: string;
  value?: string | null;
  placeholder: string;
};

type AccountDisplayInfo = AccountInfo & { expires_at?: string | null };

const buildInfoEntries = (item: WarehouseItem | AccountDisplayInfo): InfoEntry[] => {
  const editableEntries: InfoEntry[] = INLINE_EDIT_FIELDS.map((field) => ({
    key: field.key,
    label: field.label,
    placeholder: field.placeholder,
    value:
      ((item as WarehouseItem)[field.key] as string | null | undefined) ??
      ((item as AccountDisplayInfo)[field.key] as string | null | undefined) ??
      "",
  }));

  const expiryValue =
    (item as WarehouseItem).expires_at ??
    (item as AccountDisplayInfo).expires_at ??
    null;

  return [
    ...editableEntries,
    {
      key: "expires_at",
      label: "Ngày hết hạn",
      placeholder: "",
      value: formatDisplayDate(expiryValue),
    },
  ];
};

const toEditableWarehouseFields = (
  item: WarehouseItem | AccountInfo | null | undefined
): EditableWarehouseFields => ({
  account: item?.account ? String(item.account) : "",
  password: item?.password ? String(item.password) : "",
  backup_email: item?.backup_email ? String(item.backup_email) : "",
  two_fa: item?.two_fa ? String(item.two_fa) : "",
  note: item?.note ? String(item.note) : "",
});

const mergeDisplayInfo = (
  selectedItem: WarehouseItem | null,
  fallbackInfo?: AccountInfo | null
): (WarehouseItem & AccountDisplayInfo) | AccountDisplayInfo | null => {
  if (!selectedItem && !fallbackInfo) return null;
  if (!selectedItem) return fallbackInfo ?? null;
  if (!fallbackInfo) return selectedItem;

  return {
    ...fallbackInfo,
    ...selectedItem,
    account: selectedItem.account ?? fallbackInfo.account ?? null,
    password: selectedItem.password ?? fallbackInfo.password ?? null,
    backup_email: selectedItem.backup_email ?? fallbackInfo.backup_email ?? null,
    two_fa: selectedItem.two_fa ?? fallbackInfo.two_fa ?? null,
    note: selectedItem.note ?? fallbackInfo.note ?? null,
    expires_at: selectedItem.expires_at ?? fallbackInfo.expires_at ?? null,
  };
};

const ItemDetailCard: React.FC<{
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
}> = ({
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
  const hasAnyValue = entries.some((e) => e.value != null && String(e.value).trim() !== "");
  const isEditingInfo = Boolean(editingInfo && draft && onDraftChange);

  if (!hasAnyValue && !isEditingInfo) {
    return (
      <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-3 text-xs text-white/30">
        Không có thông tin tài khoản.
        <button type="button" onClick={onChange} className="ml-2 text-indigo-400 hover:text-indigo-300 transition-colors">
          Chọn tài khoản
        </button>
        {onEditInfo && (
          <button
            type="button"
            onClick={onEditInfo}
            className="ml-2 text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Sửa thông tin
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] overflow-hidden">
      <div className="divide-y divide-white/[0.04]">
        {entries.map(({ key, label, value, placeholder }) => {
          const hasVal = value != null && String(value).trim() !== "";
          const canEditRow = key !== "expires_at";
          return (
            <div key={key} className="flex items-start gap-3 px-3 py-2">
              <span className="text-[11px] text-white/30 w-24 shrink-0 pt-0.5">{label}</span>
              {isEditingInfo && draft && onDraftChange && canEditRow ? (
                <input
                  type="text"
                  value={draft[key as keyof EditableWarehouseFields]}
                  onChange={(e) =>
                    onDraftChange({
                      ...draft,
                      [key as keyof EditableWarehouseFields]: e.target.value,
                    })
                  }
                  placeholder={placeholder}
                  className={`${manualFieldCls} py-1.5`}
                />
              ) : (
                <span className={`text-sm break-all min-w-0 ${hasVal ? "text-white" : "text-white/15 italic"}`}>
                  {hasVal ? String(value) : "—"}
                </span>
              )}
            </div>
          );
        })}
      </div>
      <div className="px-3 py-2 border-t border-white/[0.04] space-y-2">
        {isEditingInfo ? (
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onCancelEditInfo}
              disabled={savingInfo}
              className="px-2.5 py-1 text-[11px] font-medium text-white/60 border border-white/[0.12] rounded-md hover:bg-white/[0.06] transition-colors disabled:opacity-40"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={onSaveEditInfo}
              disabled={savingInfo}
              className="px-2.5 py-1 text-[11px] font-medium text-white bg-indigo-500 rounded-md hover:bg-indigo-400 transition-colors disabled:opacity-40"
            >
              {savingInfo ? "Đang lưu..." : "Lưu tài khoản"}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={onChange}
              className="flex items-center gap-1 text-[10px] font-medium text-white/30 hover:text-white/50 transition-colors"
            >
              <PencilIcon className="h-3 w-3" />
              Thay đổi tài khoản
            </button>
            {onEditInfo && (
              <button
                type="button"
                onClick={onEditInfo}
                className="flex items-center gap-1 text-[10px] font-medium text-indigo-400/80 hover:text-indigo-300 transition-colors"
              >
                <PencilIcon className="h-3 w-3" />
                Sửa thông tin tại đây
              </button>
            )}
          </div>
        )}

        {editInfoError && (
          <p className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-md px-2.5 py-1.5" role="alert">
            {editInfoError}
          </p>
        )}
      </div>
    </div>
  );
};

type StockDropdownProps = {
  label: string;
  placeholder: string;
  filteredItems: WarehouseItem[];
  totalCount: number;
  loading: boolean;
  selectedId: number | null;
  selectedItem: WarehouseItem | null;
  search: string;
  onSearchChange: (v: string) => void;
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
  onUpdateSelected?: (id: number, fields: EditableWarehouseFields) => Promise<void>;
};

const StockDropdown: React.FC<StockDropdownProps> = ({
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

  const canInlineEdit = Boolean(readOnly && selectedId != null && onUpdateSelected);

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
      setEditInfoError("Không thể cập nhật tài khoản. Vui lòng thử lại.");
    } finally {
      setSavingInfo(false);
    }
  };

  if (readOnly && selectedId != null && !editing) {
    if (loading && !selectedItem && !fallbackInfo) {
      return (
        <div>
          <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">{label}</label>
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
          <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">{label}</label>
          <ItemDetailCard
            item={displayItem}
            onChange={() => setEditing(true)}
            onEditInfo={!editingInfo && canInlineEdit ? handleOpenInlineEdit : null}
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
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">{label}</label>
        <button
          type="button"
          onClick={onToggleManual}
          className={`flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md transition-colors ${
            manualMode
              ? "text-amber-400 bg-amber-500/10 border border-amber-500/20"
              : "text-white/30 hover:text-white/50 border border-transparent"
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
        <div className="space-y-2.5 rounded-lg border border-amber-500/10 bg-amber-500/[0.02] p-3">
          <p className="text-[10px] text-amber-400/60 font-medium uppercase tracking-wider">
            Thông tin sẽ được lưu vào Kho Hàng
          </p>
          {MANUAL_FIELDS.map((field) => (
            <div key={field.key}>
              <label className="block text-[11px] font-medium text-white/40 mb-1">{field.label}</label>
              <input
                type="text"
                value={manualEntry[field.key]}
                onChange={(e) => onManualEntryChange({ ...manualEntry, [field.key]: e.target.value })}
                placeholder={field.placeholder}
                className={manualFieldCls}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={onToggle}
            className={`${inputCls} flex items-center justify-between gap-2 text-left`}
          >
            {selectedItem ? (
              <div className="flex items-center gap-2 min-w-0">
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 shrink-0">
                  Tồn
                </span>
                <span className="truncate font-medium">{selectedItem.account}</span>
                {selectedItem.category && (
                  <span className="text-white/30 text-xs truncate shrink-0">({selectedItem.category})</span>
                )}
              </div>
            ) : (
              <span className="text-white/20">
                {loading ? "Đang tải..." : placeholder}
              </span>
            )}
            <ChevronUpDownIcon className="h-4 w-4 text-white/30 shrink-0" />
          </button>

          {selectedItem && (
            <button
              type="button"
              onClick={onClear}
              className="absolute right-8 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors text-xs"
              title="Bỏ chọn"
            >
              ✕
            </button>
          )}

          {isOpen && (
            <div className="absolute z-50 mt-1 w-full rounded-xl border border-white/[0.1] bg-[#0d1225] shadow-2xl overflow-hidden">
              <div className="p-2 border-b border-white/[0.06]">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="Tìm tài khoản..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-indigo-500/40"
                    autoFocus
                  />
                </div>
              </div>
              <div className="max-h-48 overflow-y-auto">
                {filteredItems.length === 0 ? (
                  <div className="px-3 py-4 text-center text-xs text-white/30">
                    {loading ? "Đang tải kho hàng..." : "Không tìm thấy tài khoản tồn kho nào."}
                  </div>
                ) : (
                  filteredItems.map((item) => {
                    const isActive = selectedId === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onSelect(item)}
                        className={`w-full px-3 py-2 flex items-center gap-2 text-left transition-colors ${
                          isActive
                            ? "bg-indigo-500/15 border-l-2 border-indigo-500"
                            : "hover:bg-white/[0.04] border-l-2 border-transparent"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-white truncate">
                              {item.account || "—"}
                            </span>
                            {item.category && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-white/[0.06] text-white/40 shrink-0">
                                {item.category}
                              </span>
                            )}
                          </div>
                          {item.note && (
                            <p className="text-[11px] text-white/25 mt-0.5 truncate">{item.note}</p>
                          )}
                        </div>
                        {isActive && <CheckIcon className="h-4 w-4 text-indigo-400 shrink-0" />}
                      </button>
                    );
                  })
                )}
              </div>
              <div className="px-3 py-1.5 border-t border-white/[0.06] text-[10px] text-white/20">
                {totalCount} tài khoản tồn kho
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const PackageFormModal: React.FC<PackageFormModalProps> = ({
  open,
  mode,
  template,
  initialValues,
  hasStorage,
  stockInfo,
  storageInfo,
  onClose,
  onSubmit,
}) => {
  const mergedInitialValues = useMemo(
    () => ({ ...EMPTY_FORM_VALUES, ...(initialValues ?? {}) }),
    [initialValues]
  );
  const [values, setValues] = useState<PackageFormValues>(mergedInitialValues);
  const [warehouseItems, setWarehouseItems] = useState<WarehouseItem[]>([]);
  const [warehouseLoading, setWarehouseLoading] = useState(false);

  const [stockDropdownOpen, setStockDropdownOpen] = useState(false);
  const [stockSearch, setStockSearch] = useState("");
  const [stockManual, setStockManual] = useState(false);
  const stockRef = useRef<HTMLDivElement>(null);

  const [storageDropdownOpen, setStorageDropdownOpen] = useState(false);
  const [storageSearch, setStorageSearch] = useState("");
  const [storageManual, setStorageManual] = useState(false);
  const storageRef = useRef<HTMLDivElement>(null);

  const formatImportValue = useCallback((raw: string): string => {
    const digitsOnly = raw.replace(/[^0-9]/g, "");
    if (!digitsOnly) return "";
    const numeric = Number(digitsOnly);
    return Number.isFinite(numeric) ? numeric.toLocaleString("vi-VN") : "";
  }, []);

  useEffect(() => {
    if (open) {
      setValues({
        ...mergedInitialValues,
        import: formatImportValue(mergedInitialValues.import),
      });
      setStockSearch("");
      setStockDropdownOpen(false);
      setStockManual(false);
      setStorageSearch("");
      setStorageDropdownOpen(false);
      setStorageManual(false);
    }
  }, [open, mergedInitialValues, formatImportValue]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const fetchWarehouse = async () => {
      setWarehouseLoading(true);
      try {
        const res = await apiFetch(API_ENDPOINTS.WAREHOUSE);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as WarehouseItem[];
        if (!cancelled) setWarehouseItems(data);
      } catch {
        if (!cancelled) setWarehouseItems([]);
      } finally {
        if (!cancelled) setWarehouseLoading(false);
      }
    };
    fetchWarehouse();
    return () => { cancelled = true; };
  }, [open]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (stockRef.current && !stockRef.current.contains(e.target as Node))
        setStockDropdownOpen(false);
      if (storageRef.current && !storageRef.current.contains(e.target as Node))
        setStorageDropdownOpen(false);
    };
    if (stockDropdownOpen || storageDropdownOpen)
      document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [stockDropdownOpen, storageDropdownOpen]);

  const inStockItems = useMemo(
    () => warehouseItems.filter((item) => (item.status || "").toLowerCase().includes("tồn")),
    [warehouseItems]
  );

  const filterItems = useCallback(
    (search: string) => {
      if (!search.trim()) return inStockItems;
      const q = search.toLowerCase();
      return inStockItems.filter(
        (item) =>
          (item.account || "").toLowerCase().includes(q) ||
          (item.category || "").toLowerCase().includes(q) ||
          (item.note || "").toLowerCase().includes(q)
      );
    },
    [inStockItems]
  );

  const filteredStockItems = useMemo(() => filterItems(stockSearch), [filterItems, stockSearch]);
  const filteredStorageItems = useMemo(() => filterItems(storageSearch), [filterItems, storageSearch]);

  const selectedStockItem = useMemo(() => {
    const targetId = normalizeWarehouseId(values.stockId);
    if (targetId == null) return null;
    return (
      warehouseItems.find(
        (w) => normalizeWarehouseId(w.id) === targetId
      ) ?? null
    );
  }, [values.stockId, warehouseItems]);
  const selectedStorageItem = useMemo(() => {
    const targetId = normalizeWarehouseId(values.storageId);
    if (targetId == null) return null;
    return (
      warehouseItems.find(
        (w) => normalizeWarehouseId(w.id) === targetId
      ) ?? null
    );
  }, [values.storageId, warehouseItems]);

  const handleUpdateWarehouseInfo = useCallback(
    async (id: number, fields: EditableWarehouseFields) => {
      const targetId = normalizeWarehouseId(id);
      const currentItem =
        targetId == null
          ? undefined
          : warehouseItems.find(
              (item) => normalizeWarehouseId(item.id) === targetId
            );
      if (!currentItem) throw new Error("WAREHOUSE_ITEM_NOT_FOUND");

      const payload = {
        category: currentItem.category ?? null,
        account: fields.account || null,
        password: fields.password || null,
        backup_email: fields.backup_email || null,
        two_fa: fields.two_fa || null,
        note: fields.note || null,
        status: currentItem.status ?? null,
        expires_at: currentItem.expires_at ?? null,
        is_verified: currentItem.is_verified ?? false,
      };

      const response = await apiFetch(`${API_ENDPOINTS.WAREHOUSE}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const updated = (await response.json()) as WarehouseItem;
      setWarehouseItems((prev) =>
        prev.map((item) =>
          normalizeWarehouseId(item.id) === targetId
            ? { ...item, ...updated }
            : item
        )
      );
      setValues((prev) =>
        normalizeWarehouseId(prev.stockId) === targetId
          ? { ...prev, supplier: updated.account || fields.account || "" }
          : prev
      );
    },
    [warehouseItems]
  );

  const handleChange = (
    field: keyof PackageFormValues,
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const value = e.target.value;
    if (field === "import") {
      setValues((prev) => ({ ...prev, import: formatImportValue(value) }));
      return;
    }
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleSelectStock = (item: WarehouseItem) => {
    setValues((prev) => ({ ...prev, stockId: item.id ?? null, supplier: item.account || "" }));
    setStockDropdownOpen(false);
    setStockSearch("");
  };
  const handleClearStock = () => {
    setValues((prev) => ({ ...prev, stockId: null, supplier: "" }));
  };
  const handleToggleStockManual = () => {
    setStockManual((p) => !p);
    setStockDropdownOpen(false);
    if (!stockManual) {
      setValues((prev) => ({ ...prev, stockId: null, supplier: "", manualStock: { ...EMPTY_MANUAL_ENTRY } }));
    }
  };

  const handleSelectStorage = (item: WarehouseItem) => {
    setValues((prev) => ({ ...prev, storageId: item.id ?? null }));
    setStorageDropdownOpen(false);
    setStorageSearch("");
  };
  const handleClearStorage = () => {
    setValues((prev) => ({ ...prev, storageId: null }));
  };
  const handleToggleStorageManual = () => {
    setStorageManual((p) => !p);
    setStorageDropdownOpen(false);
    if (!storageManual) {
      setValues((prev) => ({ ...prev, storageId: null, manualStorage: { ...EMPTY_MANUAL_ENTRY } }));
    }
  };

  const matchRequiresAccountError =
    (values.slotLinkMode === "slot" || values.slotLinkMode === "information") &&
    !values.stockId && !stockManual
      ? "Khi chọn Match, cần liên kết với kho hàng (stock_id)."
      : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (matchRequiresAccountError) return;
    onSubmit(values);
  };

  const handleSlotLinkModeChange = (m: SlotLinkMode) => {
    setValues((prev) => ({ ...prev, slotLinkMode: m }));
  };

  const showSupplierBlock = template.fields.includes("supplier");
  const showImport = template.fields.includes("import");

  return (
    <ModalShell
      open={open}
      title={`${mode === "add" ? "Thêm Gói" : "Sửa Gói"} — ${template.name}`}
      onClose={onClose}
      footer={
        <>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white/60 border border-white/[0.08] rounded-lg hover:bg-white/[0.06] transition-colors"
          >
            Hủy
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={!!matchRequiresAccountError}
            className="px-5 py-2 text-sm font-medium text-white bg-indigo-500 rounded-lg hover:bg-indigo-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {mode === "add" ? "Lưu gói" : "Lưu thay đổi"}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* Tài khoản gốc + Tài khoản kích hoạt */}
        {(showSupplierBlock || hasStorage) && (
          <div className={`grid grid-cols-1 ${showSupplierBlock && hasStorage ? "lg:grid-cols-2" : ""} gap-5`}>
            {/* Block: Tài khoản gốc */}
            {showSupplierBlock && (
              <div className="rounded-xl border border-indigo-500/15 bg-indigo-500/[0.02] p-4 space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-1 h-5 rounded-full bg-indigo-500" />
                  <div>
                    <h3 className="text-sm font-semibold text-white">Tài khoản gốc</h3>
                    <p className="text-[11px] text-white/30">Tài khoản chính của gói sản phẩm</p>
                  </div>
                </div>
                <StockDropdown
                  label="Chọn tài khoản"
                  placeholder="Chọn tài khoản gốc từ kho..."
                  filteredItems={filteredStockItems}
                  totalCount={inStockItems.length}
                  loading={warehouseLoading}
                  selectedId={values.stockId}
                  selectedItem={selectedStockItem}
                  search={stockSearch}
                  onSearchChange={setStockSearch}
                  isOpen={stockDropdownOpen}
                  onToggle={() => {
                    setStockDropdownOpen((p) => !p);
                    setStorageDropdownOpen(false);
                  }}
                  onSelect={handleSelectStock}
                  onClear={handleClearStock}
                  dropdownRef={stockRef}
                  manualMode={stockManual}
                  onToggleManual={handleToggleStockManual}
                  manualEntry={values.manualStock}
                  onManualEntryChange={(entry) => setValues((prev) => ({ ...prev, manualStock: entry, supplier: entry.account }))}
                  readOnly={mode === "edit"}
                  fallbackInfo={stockInfo}
                  onUpdateSelected={handleUpdateWarehouseInfo}
                />
                <div>
                  <label className={labelCls}>Nhà cung cấp (NCC)</label>
                  <input
                    type="text"
                    value={values.supplier}
                    onChange={(e) => handleChange("supplier", e)}
                    placeholder="Tên nhà cung cấp..."
                    className={inputCls}
                  />
                </div>
                {showImport && (
                  <div>
                    <label className={labelCls}>Giá nhập (VND)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={values.import}
                      onChange={(e) => handleChange("import", e)}
                      className={inputCls}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Block: Tài khoản kích hoạt — chỉ hiện khi product đã có storage_total */}
            {hasStorage && (
              <div className="rounded-xl border border-violet-500/15 bg-violet-500/[0.02] p-4 space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-1 h-5 rounded-full bg-violet-500" />
                  <div>
                    <h3 className="text-sm font-semibold text-white">Tài khoản kích hoạt</h3>
                    <p className="text-[11px] text-white/30">Tài khoản dùng để kích hoạt cho khách</p>
                  </div>
                </div>
                <StockDropdown
                  label="Chọn tài khoản"
                  placeholder="Chọn tài khoản kích hoạt từ kho..."
                  filteredItems={filteredStorageItems}
                  totalCount={inStockItems.length}
                  loading={warehouseLoading}
                  selectedId={values.storageId}
                  selectedItem={selectedStorageItem}
                  search={storageSearch}
                  onSearchChange={setStorageSearch}
                  isOpen={storageDropdownOpen}
                  onToggle={() => {
                    setStorageDropdownOpen((p) => !p);
                    setStockDropdownOpen(false);
                  }}
                  onSelect={handleSelectStorage}
                  onClear={handleClearStorage}
                  dropdownRef={storageRef}
                  manualMode={storageManual}
                  onToggleManual={handleToggleStorageManual}
                  manualEntry={values.manualStorage}
                  onManualEntryChange={(entry) => setValues((prev) => ({ ...prev, manualStorage: entry }))}
                  readOnly={mode === "edit"}
                  fallbackInfo={storageInfo}
                  onUpdateSelected={handleUpdateWarehouseInfo}
                />
                <div>
                  <label className={labelCls}>Dung lượng (GB)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={values.storageTotal}
                    onChange={(e) => {
                      const v = e.target.value.replace(/[^0-9]/g, "");
                      setValues((prev) => ({ ...prev, storageTotal: v }));
                    }}
                    placeholder="Ví dụ: 100, 200, 2000..."
                    className={inputCls}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Block: Giá nhập (khi không có supplier và không có storage nhưng có import) */}
        {!showSupplierBlock && !hasStorage && showImport && (
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1 h-5 rounded-full bg-indigo-500" />
              <div>
                <h3 className="text-sm font-semibold text-white">Chi tiết gói</h3>
                <p className="text-[11px] text-white/30">Thông tin mô tả gói sản phẩm</p>
              </div>
            </div>
            <div>
              <label className={labelCls}>Giá nhập (VND)</label>
              <input
                type="text"
                inputMode="numeric"
                value={values.import}
                onChange={(e) => handleChange("import", e)}
                className={inputCls}
              />
            </div>
          </div>
        )}

        {/* Block: Cấu hình gói */}
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1 h-5 rounded-full bg-emerald-500" />
            <div>
              <h3 className="text-sm font-semibold text-white">Cấu hình gói</h3>
              <p className="text-[11px] text-white/30">Thiết lập slot và chế độ ghép lệnh</p>
            </div>
          </div>

          <div>
            <label className={labelCls}>Số vị trí (slot)</label>
            <input
              type="number"
              min={0}
              value={values.slot}
              onChange={(e) => handleChange("slot", e)}
              placeholder={`Mặc định: ${DEFAULT_SLOT_LIMIT}`}
              className={inputCls}
            />
          </div>

          <div>
            <div className="mb-3">
              <p className="text-sm font-semibold text-white">Chế độ ghép lệnh</p>
              <p className="text-[11px] text-white/30">
                Chọn phương thức kết nối giữa gói và đơn hàng.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {SLOT_LINK_OPTIONS.map((option) => {
                const isSelected = values.slotLinkMode === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSlotLinkModeChange(option.value)}
                    className={`rounded-xl border p-3 text-left transition-all ${
                      isSelected
                        ? "border-indigo-500/40 bg-indigo-500/10 shadow-lg shadow-indigo-500/5"
                        : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04]"
                    }`}
                  >
                    <span className="block text-sm font-semibold text-white">
                      {option.label}
                    </span>
                    <span className="block text-[11px] text-white/40 mt-1">
                      {option.helper}
                    </span>
                  </button>
                );
              })}
            </div>
            {matchRequiresAccountError && (
              <p className="text-xs text-amber-400 mt-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20" role="alert">
                {matchRequiresAccountError}
              </p>
            )}
          </div>
        </div>

        {template.fields.length === 0 && !hasStorage && (
          <p className="text-sm text-white/40">
            Loại gói này không có trường dữ liệu nào được cấu hình.
          </p>
        )}
      </form>
    </ModalShell>
  );
};
