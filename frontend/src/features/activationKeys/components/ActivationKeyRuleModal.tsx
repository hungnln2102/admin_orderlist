import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  X,
  Sliders,
  Package,
  Building2,
  Warehouse,
  ArrowDown,
  Sparkles,
  Check,
  Search,
  AlertCircle,
  Loader2,
  FileText,
  ChevronDown,
  Tag,
} from "lucide-react";
import { useNotification } from "@/shared/context/NotificationContext";
import { ActivationKeyRule, CatalogProductOption, SaveActivationKeyRulePayload } from "../types";

interface Props {
  editingRule?: ActivationKeyRule | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  warehouseProducts: CatalogProductOption[];
}

interface VariantOption {
  id: number;
  name: string;
  packageName: string;
}

interface SupplierOption {
  id: number;
  name: string;
}

export const ActivationKeyRuleModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSuccess,
  warehouseProducts,
  editingRule,
}) => {
  const notify = useNotification();

  // Catalog options
  const [variantOptions, setVariantOptions] = useState<VariantOption[]>([]);
  const [supplierOptions, setSupplierOptions] = useState<SupplierOption[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);

  // Form states
  const [selectedVariantId, setSelectedVariantId] = useState<number>(0);
  const [selectedSupplierId, setSelectedSupplierId] = useState<number>(0);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number>(
    warehouseProducts[0]?.id || 0
  );
  const [selectedTargetTag, setSelectedTargetTag] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [isActive, setIsActive] = useState<boolean>(true);

  // Dropdown open states
  const [isVariantOpen, setIsVariantOpen] = useState(false);
  const [isSupplierOpen, setIsSupplierOpen] = useState(false);
  const [isWarehouseOpen, setIsWarehouseOpen] = useState(false);

  // Search filter states inside dropdowns
  const [variantSearch, setVariantSearch] = useState("");
  const [supplierSearch, setSupplierSearch] = useState("");
  const [warehouseSearch, setWarehouseSearch] = useState("");

  // Refs for click outside
  const variantRef = useRef<HTMLDivElement>(null);
  const supplierRef = useRef<HTMLDivElement>(null);
  const warehouseRef = useRef<HTMLDivElement>(null);

  // Submitting & error states
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch variants & suppliers when modal opens
  const fetchCatalogData = useCallback(async () => {
    if (variantOptions.length > 0 && supplierOptions.length > 0) return;
    setLoadingCatalog(true);
    try {
      const [pricesRes, suppliersRes] = await Promise.all([
        fetch("/api/products/prices?limit=1000"),
        fetch("/api/products/all-suppliers"),
      ]);

      const [pricesJson, suppliersJson] = await Promise.all([
        pricesRes.json().catch(() => ({})),
        suppliersRes.json().catch(() => []),
      ]);

      if (pricesRes.ok && pricesJson.data) {
        const vList: VariantOption[] = (pricesJson.data || []).map((row: any) => ({
          id: Number(row.id),
          name: row.package_product || row.variant_name || row.display_name || `Variant #${row.id}`,
          packageName: row.san_pham || row.package_name || "Chung",
        }));
        setVariantOptions(vList);
      }

      const rawSuppliers = Array.isArray(suppliersJson) ? suppliersJson : suppliersJson.data || [];
      const sList: SupplierOption[] = rawSuppliers.map((s: any) => ({
        id: Number(s.id),
        name: s.supplier_name || s.ncc_name || `NCC #${s.id}`,
      }));
      setSupplierOptions(sList);
    } catch (err: any) {
      console.error("Lỗi tải catalog options:", err);
    } finally {
      setLoadingCatalog(false);
    }
  }, [variantOptions.length, supplierOptions.length]);

  useEffect(() => {
    if (isOpen) {
      fetchCatalogData();
      setFormError(null);
      setVariantSearch("");
      setSupplierSearch("");
      setWarehouseSearch("");
      setSelectedVariantId(Number(editingRule?.variant_id) || 0);
      setSelectedSupplierId(Number(editingRule?.supplier_id) || supplierOptions[0]?.id || 0);
      setSelectedWarehouseId(Number(editingRule?.product_name_id) || warehouseProducts[0]?.id || 0);
      setSelectedTargetTag(editingRule?.target_variant_tag || "");
      setNote(editingRule?.note || "");
      setIsActive(editingRule?.is_active ?? true);
      setIsVariantOpen(false);
      setIsSupplierOpen(false);
      setIsWarehouseOpen(false);
    }
  }, [isOpen, fetchCatalogData, supplierOptions, warehouseProducts, editingRule]);

  // Click outside listener for all custom dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (variantRef.current && !variantRef.current.contains(target)) {
        setIsVariantOpen(false);
      }
      if (supplierRef.current && !supplierRef.current.contains(target)) {
        setIsSupplierOpen(false);
      }
      if (warehouseRef.current && !warehouseRef.current.contains(target)) {
        setIsWarehouseOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filtered variant options
  const filteredVariants = useMemo(() => {
    const q = variantSearch.trim().toLowerCase();
    if (!q) return variantOptions.slice(0, 100);
    return variantOptions
      .filter(
        (v) =>
          v.name.toLowerCase().includes(q) ||
          v.packageName.toLowerCase().includes(q) ||
          String(v.id).includes(q)
      )
      .slice(0, 100);
  }, [variantOptions, variantSearch]);

  // Filtered supplier options
  const filteredSuppliers = useMemo(() => {
    const q = supplierSearch.trim().toLowerCase();
    if (!q) return supplierOptions;
    return supplierOptions.filter(
      (s) => s.name.toLowerCase().includes(q) || String(s.id).includes(q)
    );
  }, [supplierOptions, supplierSearch]);

  // Filtered warehouse options
  const filteredWarehouses = useMemo(() => {
    const q = warehouseSearch.trim().toLowerCase();
    if (!q) return warehouseProducts;
    return warehouseProducts.filter(
      (p) => p.name.toLowerCase().includes(q) || String(p.id).includes(q)
    );
  }, [warehouseProducts, warehouseSearch]);

  // Selected item objects for preview
  const currentVariant = useMemo(
    () => variantOptions.find((v) => v.id === selectedVariantId),
    [variantOptions, selectedVariantId]
  );
  const currentSupplier = useMemo(
    () => supplierOptions.find((s) => s.id === selectedSupplierId),
    [supplierOptions, selectedSupplierId]
  );
  const currentWarehouse = useMemo(
    () => warehouseProducts.find((w) => w.id === selectedWarehouseId),
    [warehouseProducts, selectedWarehouseId]
  );
  const availableTargetTags = useMemo(
    () =>
      Array.from(
        new Set(
          (currentWarehouse?.availableTags || [])
            .map((tag) => String(tag || "").trim())
            .filter(Boolean)
        )
      ),
    [currentWarehouse]
  );

  useEffect(() => {
    if (
      selectedTargetTag &&
      !availableTargetTags.some((tag) => tag === selectedTargetTag)
    ) {
      setSelectedTargetTag("");
    }
  }, [availableTargetTags, selectedTargetTag]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVariantId) {
      setFormError("Vui lòng chọn Sản phẩm (Variant) áp dụng!");
      return;
    }
    if (!selectedSupplierId) {
      setFormError("Vui lòng chọn Nhà cung cấp (NCC)!");
      return;
    }
    if (!selectedWarehouseId) {
      setFormError("Vui lòng chọn Kho slot đích!");
      return;
    }
    if (!selectedTargetTag) {
      setFormError("Vui lòng chọn tag kho đích!");
      return;
    }

    const payload: SaveActivationKeyRulePayload = {
      variant_id: selectedVariantId,
      supplier_id: selectedSupplierId,
      product_name_id: selectedWarehouseId,
      target_variant_tag: selectedTargetTag,
      is_active: isActive,
      note: note.trim() || undefined,
    };

    try {
      setSubmitting(true);
      setFormError(null);
      const endpoint = editingRule
        ? `/api/products/activation-key-rules/${editingRule.id}`
        : "/api/products/activation-key-rules";
      const res = await fetch(endpoint, {
        method: editingRule ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Không thể lưu quy tắc cấp key.");
      }
      notify.success("Đã lưu quy tắc cấp key tự động thành công!", "Thành Công");
      onSuccess();
      onClose();
    } catch (err: any) {
      setFormError(err.message || "Lỗi xử lý hệ thống.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl shadow-cyan-950/30 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/10 border border-cyan-500/30 text-cyan-400 shadow-md shadow-cyan-500/10">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-extrabold text-white tracking-tight">
                  {editingRule ? "Sửa cấu hình cấp key" : "Cấu Hình Cấp Key Tự Động"}
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  Tự Động Cấp Slot
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Ánh xạ cặp (Variant + NCC) vào Kho Slot đích khi phát sinh đơn hàng
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Đóng modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body with scrollable content */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto custom-scrollbar">
          {formError && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2.5 animate-in shake">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="font-medium">{formError}</span>
            </div>
          )}

          {/* KHỐI 1: ĐIỀU KIỆN ĐƠN HÀNG (VARIANT + NCC) */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-3.5 relative">
            <div className="flex items-center gap-2 pb-1 border-b border-slate-800/60">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 text-[11px] font-bold">
                1
              </span>
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Điều Kiện Đơn Hàng (Đầu Vào)
              </span>
            </div>

            {/* Field: Chọn Variant */}
            <div className="space-y-1.5" ref={variantRef}>
              <label className="block text-xs font-semibold text-slate-300">
                Sản phẩm (Variant) áp dụng <span className="text-rose-400">*</span>
              </label>

              {/* Custom Searchable Trigger */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setIsVariantOpen(!isVariantOpen);
                    setIsSupplierOpen(false);
                    setIsWarehouseOpen(false);
                  }}
                  className={`w-full px-3.5 py-2.5 bg-slate-900 border rounded-xl text-left flex items-center justify-between transition-all min-h-[42px] ${
                    isVariantOpen
                      ? "border-cyan-500 ring-1 ring-cyan-500/30 shadow-lg shadow-cyan-500/10"
                      : "border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-2.5 flex-1 min-w-0 pr-2">
                    <Package className="w-4 h-4 text-cyan-400 shrink-0" />
                    {loadingCatalog ? (
                      <span className="text-xs text-cyan-400 animate-pulse">
                        Đang tải danh sách variant...
                      </span>
                    ) : currentVariant ? (
                      <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                        <span className="text-xs font-bold text-white truncate max-w-[280px]">
                          {currentVariant.name}
                        </span>
                        <span className="text-[10.5px] font-mono px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700/80">
                          {currentVariant.packageName}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">
                        -- Tìm & chọn Sản phẩm (Variant) --
                      </span>
                    )}
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${
                      isVariantOpen ? "rotate-180 text-cyan-400" : ""
                    }`}
                  />
                </button>

                {/* Dropdown Menu */}
                {isVariantOpen && (
                  <div className="absolute top-full left-0 w-full mt-1.5 z-40 bg-slate-900/95 border border-cyan-500/30 rounded-2xl shadow-2xl backdrop-blur-xl p-2.5 space-y-2 animate-in fade-in zoom-in-95 duration-150">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        autoFocus
                        value={variantSearch}
                        onChange={(e) => setVariantSearch(e.target.value)}
                        placeholder="Gõ tìm kiếm variant, tên gói..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                      />
                    </div>

                    <div className="max-h-56 overflow-y-auto custom-scrollbar space-y-1">
                      {filteredVariants.length === 0 ? (
                        <div className="p-3 text-center text-xs text-slate-500 italic">
                          Không tìm thấy variant khớp với từ khóa
                        </div>
                      ) : (
                        filteredVariants.map((v) => {
                          const isSelected = v.id === selectedVariantId;
                          return (
                            <button
                              key={v.id}
                              type="button"
                              onClick={() => {
                                setSelectedVariantId(v.id);
                                setIsVariantOpen(false);
                                setVariantSearch("");
                              }}
                              className={`w-full text-left p-2.5 rounded-xl transition-all flex items-center justify-between gap-2 group ${
                                isSelected
                                  ? "bg-cyan-500/20 text-cyan-200 font-bold border border-cyan-500/30"
                                  : "hover:bg-slate-800/80 text-slate-300"
                              }`}
                            >
                              <div className="flex-1 min-w-0 pr-2">
                                <div className="text-xs font-semibold text-slate-100 group-hover:text-cyan-300 truncate">
                                  {v.name}
                                </div>
                                <div className="text-[10.5px] text-slate-400 font-mono mt-0.5">
                                  Gói: {v.packageName}
                                </div>
                              </div>
                              {isSelected && (
                                <Check className="w-4 h-4 text-cyan-400 shrink-0" />
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Field: Chọn Nhà Cung Cấp */}
            <div className="space-y-1.5" ref={supplierRef}>
              <label className="block text-xs font-semibold text-slate-300">
                Nhà cung cấp (NCC) <span className="text-rose-400">*</span>
              </label>

              {/* Custom Supplier Trigger */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setIsSupplierOpen(!isSupplierOpen);
                    setIsVariantOpen(false);
                    setIsWarehouseOpen(false);
                  }}
                  className={`w-full px-3.5 py-2.5 bg-slate-900 border rounded-xl text-left flex items-center justify-between transition-all min-h-[42px] ${
                    isSupplierOpen
                      ? "border-cyan-500 ring-1 ring-cyan-500/30 shadow-lg shadow-cyan-500/10"
                      : "border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-2.5 flex-1 min-w-0 pr-2">
                    <Building2 className="w-4 h-4 text-indigo-400 shrink-0" />
                    {currentSupplier ? (
                      <span className="text-xs font-bold text-white truncate">
                        {currentSupplier.name}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">
                        -- Tìm & chọn Nhà Cung Cấp --
                      </span>
                    )}
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${
                      isSupplierOpen ? "rotate-180 text-cyan-400" : ""
                    }`}
                  />
                </button>

                {/* Dropdown Menu */}
                {isSupplierOpen && (
                  <div className="absolute top-full left-0 w-full mt-1.5 z-40 bg-slate-900/95 border border-cyan-500/30 rounded-2xl shadow-2xl backdrop-blur-xl p-2.5 space-y-2 animate-in fade-in zoom-in-95 duration-150">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        autoFocus
                        value={supplierSearch}
                        onChange={(e) => setSupplierSearch(e.target.value)}
                        placeholder="Gõ tìm kiếm tên NCC..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                      />
                    </div>

                    <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-1">
                      {filteredSuppliers.length === 0 ? (
                        <div className="p-3 text-center text-xs text-slate-500 italic">
                          Không tìm thấy nhà cung cấp nào
                        </div>
                      ) : (
                        filteredSuppliers.map((s) => {
                          const isSelected = s.id === selectedSupplierId;
                          return (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => {
                                setSelectedSupplierId(s.id);
                                setIsSupplierOpen(false);
                                setSupplierSearch("");
                              }}
                              className={`w-full text-left p-2.5 rounded-xl transition-all flex items-center justify-between gap-2 group ${
                                isSelected
                                  ? "bg-indigo-500/20 text-indigo-200 font-bold border border-indigo-500/30"
                                  : "hover:bg-slate-800/80 text-slate-300"
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <Building2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                <span className="text-xs font-semibold text-slate-100 group-hover:text-indigo-300 truncate">
                                  {s.name}
                                </span>
                              </div>
                              {isSelected && (
                                <Check className="w-4 h-4 text-indigo-400 shrink-0" />
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Pipeline Connector Flow Arrow */}
          <div className="flex items-center justify-center -my-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/90 border border-slate-700/80 text-[11px] font-bold text-cyan-400 shadow-md">
              <ArrowDown className="w-3.5 h-3.5 text-cyan-400 animate-bounce" />
              <span>Ánh xạ tự động cấp slot</span>
            </div>
          </div>

          {/* KHỐI 2: KHO SLOT ĐÍCH (FULFILLMENT DESTINATION) */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-3.5">
            <div className="flex items-center gap-2 pb-1 border-b border-slate-800/60">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-[11px] font-bold">
                2
              </span>
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Kho Slot Đích (Nơi Khách Nhận Tài Khoản)
              </span>
            </div>

            <div className="space-y-1.5" ref={warehouseRef}>
              <label className="block text-xs font-semibold text-slate-300">
                Kho slot cung ứng <span className="text-rose-400">*</span>
              </label>

              {/* Warehouse Trigger */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setIsWarehouseOpen(!isWarehouseOpen);
                    setIsVariantOpen(false);
                    setIsSupplierOpen(false);
                  }}
                  className={`w-full px-3.5 py-2.5 bg-slate-900 border rounded-xl text-left flex items-center justify-between transition-all min-h-[42px] ${
                    isWarehouseOpen
                      ? "border-emerald-500 ring-1 ring-emerald-500/30 shadow-lg shadow-emerald-500/10"
                      : "border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-2.5 flex-1 min-w-0 pr-2">
                    <Warehouse className="w-4 h-4 text-emerald-400 shrink-0" />
                    {currentWarehouse ? (
                      <span className="text-xs font-bold text-emerald-300 truncate">
                        {currentWarehouse.name}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">
                        -- Chọn Kho Slot Đích --
                      </span>
                    )}
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${
                      isWarehouseOpen ? "rotate-180 text-emerald-400" : ""
                    }`}
                  />
                </button>

                {/* Warehouse Dropdown */}
                {isWarehouseOpen && (
                  <div className="absolute top-full left-0 w-full mt-1.5 z-40 bg-slate-900/95 border border-emerald-500/30 rounded-2xl shadow-2xl backdrop-blur-xl p-2.5 space-y-2 animate-in fade-in zoom-in-95 duration-150">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        autoFocus
                        value={warehouseSearch}
                        onChange={(e) => setWarehouseSearch(e.target.value)}
                        placeholder="Tìm tên kho slot..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                      />
                    </div>

                    <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-1">
                      {filteredWarehouses.length === 0 ? (
                        <div className="p-3 text-center text-xs text-slate-500 italic">
                          Không tìm thấy kho slot nào
                        </div>
                      ) : (
                        filteredWarehouses.map((w) => {
                          const isSelected = w.id === selectedWarehouseId;
                          return (
                            <button
                              key={w.id}
                              type="button"
                              onClick={() => {
                                setSelectedWarehouseId(w.id);
                                if (!(w.availableTags || []).includes(selectedTargetTag)) {
                                  setSelectedTargetTag("");
                                }
                                setIsWarehouseOpen(false);
                                setWarehouseSearch("");
                              }}
                              className={`w-full text-left p-2.5 rounded-xl transition-all flex items-center justify-between gap-2 group ${
                                isSelected
                                  ? "bg-emerald-500/20 text-emerald-200 font-bold border border-emerald-500/30"
                                  : "hover:bg-slate-800/80 text-slate-300"
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <Warehouse className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                <span className="text-xs font-semibold text-slate-100 group-hover:text-emerald-300 truncate">
                                  {w.name}
                                </span>
                              </div>
                              {isSelected && (
                                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Tag kho đích <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <Tag className="w-4 h-4 text-amber-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  value={selectedTargetTag}
                  onChange={(event) => setSelectedTargetTag(event.target.value)}
                  disabled={!selectedWarehouseId || availableTargetTags.length === 0}
                  required
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-9 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {availableTargetTags.length > 0
                      ? "-- Chọn tag dùng để cấp slot --"
                      : "-- Kho này chưa có tag khả dụng --"}
                  </option>
                  {availableTargetTags.map((tag) => (
                    <option key={tag} value={tag}>
                      {tag}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-[11px] text-slate-500">
                Hệ thống chỉ cấp slot còn trống thuộc đúng tag đã chọn.
              </p>
            </div>
          </div>

          {/* LIVE RULE PREVIEW CARD */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-cyan-950/30 via-slate-950 to-indigo-950/30 border border-cyan-800/40 text-xs text-slate-300 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-cyan-400">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Mô Phỏng Quy Tắc Cấp Key Thực Tế:</span>
            </div>
            <p className="text-xs leading-relaxed text-slate-300">
              {currentVariant && currentSupplier && currentWarehouse && selectedTargetTag ? (
                <>
                  Khi khách đặt mua variant{" "}
                  <span className="font-bold text-white bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700">
                    {currentVariant.name}
                  </span>{" "}
                  từ NCC{" "}
                  <span className="font-bold text-indigo-300 bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700">
                    {currentSupplier.name}
                  </span>
                  , hệ thống sẽ tự động phát sinh mã key liên kết trực tiếp vào kho{" "}
                  <span className="font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30">
                    {currentWarehouse.name}
                  </span>
                  {" "}với tag{" "}
                  <span className="font-bold text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30">
                    {selectedTargetTag}
                  </span>
                  .
                </>
              ) : (
                <span className="text-slate-500 italic">
                  Vui lòng chọn đầy đủ Variant, NCC, Kho Slot đích và tag để xem mô phỏng...
                </span>
              )}
            </p>
          </div>

          {/* GHI CHÚ */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">
              Ghi chú nội bộ (Tùy chọn)
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="VD: Cấp key tự động cho gói ChatGPT Plus 1 Tháng..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
          </div>

          {/* TRẠNG THÁI (TOGGLE SWITCH) */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800">
            <div>
              <div className="text-xs font-bold text-white">
                Kích hoạt quy tắc ngay sau khi lưu
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Quy tắc sẽ lập tức có hiệu lực khi khách hàng kích hoạt đơn
              </div>
            </div>

            {/* Toggle Switch Button */}
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                isActive ? "bg-cyan-500" : "bg-slate-700"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isActive ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* FOOTER ACTION BUTTONS */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800/80 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-cyan-500/25 active:scale-95 transition-all disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang lưu cấu hình...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Lưu Cấu Hình</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
