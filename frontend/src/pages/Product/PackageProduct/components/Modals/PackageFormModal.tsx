import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AccountInfo,
  DEFAULT_SLOT_LIMIT,
  EMPTY_FORM_VALUES,
  EMPTY_MANUAL_ENTRY,
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

type InfoEntry = { label: string; value?: string | null };

const buildInfoEntries = (item: WarehouseItem | AccountInfo): InfoEntry[] => [
  { label: "Tài khoản", value: (item as WarehouseItem).account ?? (item as AccountInfo).account },
  { label: "Mật khẩu", value: (item as WarehouseItem).password ?? (item as AccountInfo).password },
  { label: "Email dự phòng", value: (item as WarehouseItem).backup_email ?? (item as AccountInfo).backup_email },
  { label: "Mã 2FA", value: (item as WarehouseItem).two_fa ?? (item as AccountInfo).two_fa },
  { label: "Ghi chú", value: (item as WarehouseItem).note ?? (item as AccountInfo).note },
];

const ItemDetailCard: React.FC<{ item: WarehouseItem | AccountInfo; onChange: () => void }> = ({ item, onChange }) => {
  const entries = buildInfoEntries(item);
  const hasAnyValue = entries.some((e) => e.value != null && String(e.value).trim() !== "");
  if (!hasAnyValue) {
    return (
      <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-3 text-xs text-white/30">
        Không có thông tin tài khoản.
        <button type="button" onClick={onChange} className="ml-2 text-indigo-400 hover:text-indigo-300 transition-colors">
          Chọn tài khoản
        </button>
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] overflow-hidden">
      <div className="divide-y divide-white/[0.04]">
        {entries.map(({ label, value }) => {
          const hasVal = value != null && String(value).trim() !== "";
          return (
            <div key={label} className="flex items-start gap-3 px-3 py-2">
              <span className="text-[11px] text-white/30 w-24 shrink-0 pt-0.5">{label}</span>
              <span className={`text-sm break-all min-w-0 ${hasVal ? "text-white" : "text-white/15 italic"}`}>
                {hasVal ? String(value) : "—"}
              </span>
            </div>
          );
        })}
      </div>
      <div className="px-3 py-2 border-t border-white/[0.04]">
        <button
          type="button"
          onClick={onChange}
          className="flex items-center gap-1 text-[10px] font-medium text-white/30 hover:text-white/50 transition-colors"
        >
          <PencilIcon className="h-3 w-3" />
          Thay đổi tài khoản
        </button>
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
}) => {
  const [editing, setEditing] = useState(false);

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
    const displayItem = selectedItem ?? fallbackInfo;
    if (displayItem) {
      return (
        <div>
          <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">{label}</label>
          <ItemDetailCard item={displayItem} onChange={() => setEditing(true)} />
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

  const selectedStockItem = useMemo(
    () => (values.stockId != null ? warehouseItems.find((w) => w.id === values.stockId) ?? null : null),
    [values.stockId, warehouseItems]
  );
  const selectedStorageItem = useMemo(
    () => (values.storageId != null ? warehouseItems.find((w) => w.id === values.storageId) ?? null : null),
    [values.storageId, warehouseItems]
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
