import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  X,
  Sliders,
  Package,
  Building2,
  Warehouse,
  ArrowDown,
  ArrowRight,
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
  costPrice?: number;
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
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);

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

  // Fetch danh sách NCC theo đúng Variant được chọn
  const fetchSuppliersForVariant = useCallback(
    async (variantId: number, defaultSupplierId?: number) => {
      if (!variantId || variantId <= 0) {
        setSupplierOptions([]);
        setSelectedSupplierId(0);
        return;
      }
      setLoadingSuppliers(true);
      try {
        const res = await fetch(`/api/products/${variantId}/suppliers`);
        const json = await res.json().catch(() => ({}));
        const rawList = Array.isArray(json) ? json : json.data || [];
        const sList: SupplierOption[] = rawList.map((item: any) => ({
          id: Number(item.supplier_id || item.id),
          name: item.supplier_name || item.ncc_name || `NCC #${item.supplier_id || item.id}`,
          costPrice: Number(item.gia_nhap || item.price || 0),
        }));
        setSupplierOptions(sList);

        // Tự động gán selectedSupplierId:
        // 1. Ưu tiên defaultSupplierId khi mở modal sửa (nếu nằm trong sList)
        // 2. Hoặc giữ lại ID hiện tại nếu vẫn còn trong sList của variant mới
        // 3. Fallback về NCC đầu tiên của variant đó
        setSelectedSupplierId((prevId) => {
          const targetId = defaultSupplierId !== undefined ? defaultSupplierId : prevId;
          if (targetId && sList.some((s) => s.id === targetId)) {
            return targetId;
          }
          return sList[0]?.id || 0;
        });
      } catch (err: any) {
        console.error("Lỗi tải NCC cho variant:", err);
        setSupplierOptions([]);
        setSelectedSupplierId(0);
      } finally {
        setLoadingSuppliers(false);
      }
    },
    []
  );

  // Fetch variants catalog khi modal opens
  const fetchCatalogData = useCallback(async () => {
    if (variantOptions.length > 0) return;
    setLoadingCatalog(true);
    try {
      const pricesRes = await fetch("/api/products/prices?limit=1000");
      const pricesJson = await pricesRes.json().catch(() => ({}));

      if (pricesRes.ok && pricesJson.data) {
        const vList: VariantOption[] = (pricesJson.data || []).map((row: any) => ({
          id: Number(row.id),
          name: row.package_product || row.variant_name || row.display_name || `Variant #${row.id}`,
          packageName: row.san_pham || row.package_name || "Chung",
        }));
        setVariantOptions(vList);
      }
    } catch (err: any) {
      console.error("Lỗi tải catalog options:", err);
    } finally {
      setLoadingCatalog(false);
    }
  }, [variantOptions.length]);

  useEffect(() => {
    if (isOpen) {
      fetchCatalogData();
      setFormError(null);
      setVariantSearch("");
      setSupplierSearch("");
      setWarehouseSearch("");

      const initialVariantId = Number(editingRule?.variant_id) || 0;
      const initialSupplierId = Number(editingRule?.supplier_id) || 0;

      setSelectedVariantId(initialVariantId);
      setSelectedWarehouseId(Number(editingRule?.product_name_id) || warehouseProducts[0]?.id || 0);
      setSelectedTargetTag(editingRule?.target_variant_tag || "");
      setNote(editingRule?.note || "");
      setIsActive(editingRule?.is_active ?? true);
      setIsVariantOpen(false);
      setIsSupplierOpen(false);
      setIsWarehouseOpen(false);

      if (initialVariantId > 0) {
        fetchSuppliersForVariant(initialVariantId, initialSupplierId);
      } else {
        setSupplierOptions([]);
        setSelectedSupplierId(0);
      }
    }
  }, [isOpen, fetchCatalogData, fetchSuppliersForVariant, warehouseProducts, editingRule]);

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
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl xl:max-w-5xl shadow-2xl shadow-cyan-950/30 overflow-hidden flex flex-col max-h-[92vh]">
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

          {/* GRID 2 CỘT NGANG: NGUỒN ĐƠN HÀNG (TRÁI) & KHO SLOT ĐÍCH (PHẢI) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 relative items-start">
            {/* KHỐI 1: ĐIỀU KIỆN ĐƠN HÀNG (VARIANT + NCC) */}
            <div
              className={`p-4 sm:p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-3.5 relative transition-all ${
                isVariantOpen || isSupplierOpen ? "z-30 ring-1 ring-cyan-500/30" : "z-10"
              }`}
            >
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
                          <span className="text-xs font-bold text-white truncate max-w-[200px] sm:max-w-[280px]">
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
                    <div className="absolute top-full left-0 w-full mt-1.5 z-50 bg-slate-900/98 border border-cyan-500/40 rounded-2xl shadow-2xl shadow-cyan-950/60 backdrop-blur-2xl p-2.5 space-y-2 animate-in fade-in zoom-in-95 duration-150">
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
                                  fetchSuppliersForVariant(v.id);
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
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-300">
                    Nhà cung cấp (NCC) <span className="text-rose-400">*</span>
                  </label>
                  {selectedVariantId > 0 && !loadingSuppliers && supplierOptions.length > 0 && (
                    <span className="text-[10.5px] text-cyan-400 font-medium">
                      {supplierOptions.length} NCC cung ứng
                    </span>
                  )}
                </div>

                {/* Custom Supplier Trigger */}
                <div className="relative">
                  <button
                    type="button"
                    disabled={!selectedVariantId || loadingSuppliers}
                    onClick={() => {
                      if (!selectedVariantId || loadingSuppliers) return;
                      setIsSupplierOpen(!isSupplierOpen);
                      setIsVariantOpen(false);
                      setIsWarehouseOpen(false);
                    }}
                    className={`w-full px-3.5 py-2.5 bg-slate-900 border rounded-xl text-left flex items-center justify-between transition-all min-h-[42px] ${
                      !selectedVariantId
                        ? "opacity-60 cursor-not-allowed border-slate-800/60"
                        : isSupplierOpen
                        ? "border-cyan-500 ring-1 ring-cyan-500/30 shadow-lg shadow-cyan-500/10"
                        : "border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 flex-1 min-w-0 pr-2">
                      <Building2
                        className={`w-4 h-4 shrink-0 ${
                          !selectedVariantId ? "text-slate-500" : "text-indigo-400"
                        }`}
                      />
                      {loadingSuppliers ? (
                        <div className="flex items-center gap-2 text-xs text-cyan-400 animate-pulse">
                          <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                          <span>Đang lọc NCC của sản phẩm...</span>
                        </div>
                      ) : !selectedVariantId ? (
                        <span className="text-xs text-slate-500 italic">
                          -- Vui lòng chọn Sản phẩm (Variant) trước --
                        </span>
                      ) : supplierOptions.length === 0 ? (
                        <span className="text-xs text-amber-400 font-medium truncate">
                          -- Variant này chưa có NCC nào trong Bảng Giá --
                        </span>
                      ) : currentSupplier ? (
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                          <span className="text-xs font-bold text-white truncate max-w-[200px]">
                            {currentSupplier.name}
                          </span>
                          {currentSupplier.costPrice ? (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-700/60">
                              Giá nhập: {currentSupplier.costPrice.toLocaleString("vi-VN")} đ
                            </span>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">
                          -- Chọn Nhà Cung Cấp ({supplierOptions.length} khả dụng) --
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
                  {isSupplierOpen && selectedVariantId > 0 && (
                    <div className="absolute top-full left-0 w-full mt-1.5 z-50 bg-slate-900/98 border border-cyan-500/40 rounded-2xl shadow-2xl shadow-cyan-950/60 backdrop-blur-2xl p-2.5 space-y-2 animate-in fade-in zoom-in-95 duration-150">
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
                          <div className="p-3 text-center text-xs text-slate-400 space-y-1">
                            <p className="font-semibold text-amber-300">
                              {supplierOptions.length === 0
                                ? "Chưa có NCC nào cung ứng sản phẩm này"
                                : "Không tìm thấy NCC khớp từ khóa"}
                            </p>
                            {supplierOptions.length === 0 && (
                              <p className="text-[11px] text-slate-500">
                                Vui lòng thêm nguồn NCC cho sản phẩm này trong mục Bảng Giá!
                              </p>
                            )}
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
                                <div className="flex-1 min-w-0 pr-2">
                                  <div className="flex items-center gap-2 truncate">
                                    <Building2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                    <span className="text-xs font-semibold text-slate-100 group-hover:text-indigo-300 truncate">
                                      {s.name}
                                    </span>
                                  </div>
                                  {s.costPrice ? (
                                    <div className="text-[10.5px] text-slate-400 font-mono mt-0.5 pl-5">
                                      Giá nhập:{" "}
                                      <span className="text-amber-300 font-semibold">
                                        {s.costPrice.toLocaleString("vi-VN")} đ
                                      </span>
                                    </div>
                                  ) : null}
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
                {selectedVariantId > 0 && supplierOptions.length === 0 && !loadingSuppliers && (
                  <p className="text-[11px] text-amber-400 flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>Variant này chưa được cấu hình NCC nào trong Bảng giá sản phẩm.</span>
                  </p>
                )}
              </div>
            </div>

            {/* PIPELINE CONNECTOR MAPPING BADGE (MOBILE: DỌC, DESKTOP: GIỮA 2 CỘT) */}
            <div className="flex lg:hidden items-center justify-center -my-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/90 border border-slate-700/80 text-[11px] font-bold text-cyan-400 shadow-md">
                <ArrowDown className="w-3.5 h-3.5 text-cyan-400 animate-bounce" />
                <span>Ánh xạ tự động cấp slot</span>
              </div>
            </div>

            {/* KHỐI 2: KHO SLOT ĐÍCH (FULFILLMENT DESTINATION) */}
            <div
              className={`p-4 sm:p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-3.5 relative transition-all ${
                isWarehouseOpen ? "z-30 ring-1 ring-emerald-500/30" : "z-10"
              }`}
            >
              <div className="flex items-center gap-2 pb-1 border-b border-slate-800/60">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-[11px] font-bold">
                  2
                </span>
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Kho Slot Đích (Nơi Khách Nhận Tài Khoản)
                </span>
              </div>

              {/* Field: Kho slot cung ứng */}
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
                    <div className="absolute top-full left-0 w-full mt-1.5 z-50 bg-slate-900/98 border border-emerald-500/40 rounded-2xl shadow-2xl shadow-emerald-950/60 backdrop-blur-2xl p-2.5 space-y-2 animate-in fade-in zoom-in-95 duration-150">
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

              {/* Field: Tag kho đích */}
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
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-9 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[42px]"
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
          </div>

          {/* LIVE RULE PREVIEW CARD: VISUAL PIPELINE BANNER */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-slate-950 to-emerald-950/40 border border-cyan-800/40 text-xs text-slate-300 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-cyan-400 text-xs tracking-wide">
                <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
                <span>Mô Phỏng Quy Tắc Cấp Key Thực Tế:</span>
              </div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider hidden sm:inline-block">
                Tự Động Ánh Xạ
              </span>
            </div>

            {currentVariant && currentSupplier && currentWarehouse && selectedTargetTag ? (
              <div className="space-y-2">
                {/* Visual Pipeline Flow Chips */}
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <span className="font-bold text-white bg-slate-800/90 px-2.5 py-1 rounded-lg border border-slate-700/80 shadow-sm">
                    {currentVariant.name}
                  </span>
                  <span className="text-slate-400 text-xs font-semibold">+</span>
                  <span className="font-bold text-indigo-300 bg-indigo-950/60 px-2.5 py-1 rounded-lg border border-indigo-700/60 shadow-sm">
                    {currentSupplier.name}
                  </span>

                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold text-[11px] border border-cyan-500/30">
                    <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Cấp Slot Vào</span>
                  </span>

                  <span className="font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-700/60 shadow-sm">
                    {currentWarehouse.name}
                  </span>
                  <span className="font-bold text-amber-300 bg-amber-950/60 px-2.5 py-1 rounded-lg border border-amber-700/60 shadow-sm">
                    Tag: {selectedTargetTag}
                  </span>
                </div>

                <p className="text-xs leading-relaxed text-slate-300 pt-1 border-t border-slate-800/60">
                  Khi khách đặt mua variant{" "}
                  <span className="font-bold text-white">{currentVariant.name}</span> từ NCC{" "}
                  <span className="font-bold text-indigo-300">{currentSupplier.name}</span>, hệ thống sẽ tự động phát sinh mã key liên kết trực tiếp vào kho{" "}
                  <span className="font-bold text-emerald-400">{currentWarehouse.name}</span> với tag{" "}
                  <span className="font-bold text-amber-300">{selectedTargetTag}</span>.
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">
                Vui lòng chọn đầy đủ Variant, NCC, Kho Slot đích và tag ở 2 cột phía trên để xem luồng mô phỏng...
              </p>
            )}
          </div>

          {/* GRID CẤU HÌNH BỔ SUNG: GHI CHÚ NỘI BỘ + TOGGLE TRẠNG THÁI */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-stretch">
            {/* GHI CHÚ NỘI BỘ (CHIẾM 7 CỘT) */}
            <div className="md:col-span-7 space-y-1.5 flex flex-col justify-between">
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

            {/* TRẠNG THÁI KÍCH HOẠT (CHIẾM 5 CỘT) */}
            <div className="md:col-span-5 flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800">
              <div className="pr-2">
                <div className="text-xs font-bold text-white">
                  Kích hoạt quy tắc
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Có hiệu lực ngay khi lưu
                </div>
              </div>

              {/* Toggle Switch Button */}
              <button
                type="button"
                onClick={() => setIsActive(!isActive)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none shrink-0 ${
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
