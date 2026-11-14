import React, { useState } from "react";
import {
  Search,
  Package,
  Plus,
  Trash2,
  Link2,
  AlertCircle,
  Sparkles,
  CheckCircle2,
  ShieldAlert,
  LayoutGrid,
  List,
  Tag,
  Boxes,
  ChevronDown,
  ChevronUp,
  Archive,
  ExternalLink,
  Tv,
  KeyRound,
  Mail,
  Bot,
  Cloud,
  Sliders,
  ArrowRight,
  Building2,
  Terminal,
  Pencil,
  Zap,
  Layers,
} from "lucide-react";
import type {
  ProductItem,
  PortalSlotItem,
  PortalSlotRoutingRule,
  SupplierOption,
} from "@/features/external-api/types";
import type { Provider } from "@/features/external-api/hooks/useExternalApiConfig";
import { useNotification } from "@/shared/context/NotificationContext";
import { SlotProductSupplierRuleModal } from "@/features/external-api/components/SlotProductSupplierRuleModal";

interface ProductApiMappingTabProps {
  products: ProductItem[];
  filteredProducts: ProductItem[];
  providers: Provider[];
  availableApis: any[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  productFilter: "ALL" | "ASSIGNED" | "UNASSIGNED";
  onFilterChange: (filter: "ALL" | "ASSIGNED" | "UNASSIGNED") => void;
  onAssignProvider: (productId: number, providerKey: string) => void;
  onRemoveMapping: (mappingId: number) => void;
  slots?: PortalSlotItem[];
  routingRules?: PortalSlotRoutingRule[];
  suppliers?: SupplierOption[];
  onCreateRoutingRule?: (data: any) => Promise<boolean>;
  onUpdateRoutingRule?: (id: number, data: any) => Promise<boolean>;
  onDeleteRoutingRule?: (id: number) => Promise<boolean>;
  onToggleRoutingRuleActive?: (id: number, currentActive: boolean) => Promise<boolean>;
}

export const ProductApiMappingTab: React.FC<ProductApiMappingTabProps> = ({
  products,
  filteredProducts,
  providers,
  availableApis,
  searchQuery,
  onSearchChange,
  productFilter,
  onFilterChange,
  onAssignProvider,
  onRemoveMapping,
  slots = [],
  routingRules = [],
  suppliers = [],
  onCreateRoutingRule,
  onUpdateRoutingRule,
  onDeleteRoutingRule,
  onToggleRoutingRuleActive,
}) => {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [expandedProductIds, setExpandedProductIds] = useState<Record<number, boolean>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<PortalSlotRoutingRule | null>(null);
  const [showRoutingRules, setShowRoutingRules] = useState(true);

  const notification = useNotification();

  const assignedCount = products.filter((p) => p.apis && p.apis.length > 0).length;
  const unassignedCount = products.length - assignedCount;

  const toggleExpand = (productId: number) => {
    setExpandedProductIds((prev) => ({
      ...prev,
      [productId]: !prev[productId],
    }));
  };

  const handleDeleteRule = (rule: PortalSlotRoutingRule) => {
    notification.confirm({
      title: "Xác Nhận Xóa Quy Tắc",
      message: `Bạn có chắc chắn muốn xóa quy tắc liên kết #${rule.id} (${rule.product_name} - ${rule.supplier_name}) không? Thao tác này sẽ gỡ bỏ định tuyến tự động cho sản phẩm này.`,
      confirmText: "Xóa Ngay",
      cancelText: "Hủy Bỏ",
      onConfirm: () => {
        void onDeleteRoutingRule?.(rule.id);
      },
    });
  };

  const handleRemoveProvider = (mappingId: number, serviceName: string, packageName: string) => {
    notification.confirm({
      title: "Xác Nhận Gỡ Bỏ Provider",
      message: `Bạn có chắc chắn muốn gỡ cổng API "${serviceName}" khỏi sản phẩm kho "${packageName}" không?`,
      confirmText: "Gỡ Cổng",
      cancelText: "Hủy Bỏ",
      onConfirm: () => {
        onRemoveMapping(mappingId);
      },
    });
  };

  const handleOpenCreateModal = () => {
    setEditingRule(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (rule: PortalSlotRoutingRule) => {
    setEditingRule(rule);
    setIsModalOpen(true);
  };

  const handleModalSubmit = async (data: any) => {
    if (editingRule && onUpdateRoutingRule) {
      return await onUpdateRoutingRule(editingRule.id, data);
    } else if (onCreateRoutingRule) {
      return await onCreateRoutingRule(data);
    }
    return false;
  };

  const getProductBrandVisual = (name: string, hasMappings: boolean) => {
    const lower = (name || "").toLowerCase();
    if (lower.includes("adobe")) {
      return {
        icon: Sparkles,
        iconBox: "bg-purple-500/15 border-purple-500/35 text-purple-300",
        cardBorder: hasMappings
          ? "border-purple-500/35 hover:border-purple-400/60 shadow-lg shadow-purple-950/20"
          : "border-slate-800/80 hover:border-slate-700",
        glow: "from-purple-500/10 via-transparent to-transparent",
      };
    }
    if (lower.includes("netflix")) {
      return {
        icon: Tv,
        iconBox: "bg-rose-500/15 border-rose-500/35 text-rose-300",
        cardBorder: hasMappings
          ? "border-rose-500/35 hover:border-rose-400/60 shadow-lg shadow-rose-950/20"
          : "border-slate-800/80 hover:border-slate-700",
        glow: "from-rose-500/10 via-transparent to-transparent",
      };
    }
    if (lower.includes("gpt") || lower.includes("openai") || lower.includes("claude")) {
      return {
        icon: Bot,
        iconBox: "bg-emerald-500/15 border-emerald-500/35 text-emerald-300",
        cardBorder: hasMappings
          ? "border-emerald-500/35 hover:border-emerald-400/60 shadow-lg shadow-emerald-950/20"
          : "border-slate-800/80 hover:border-slate-700",
        glow: "from-emerald-500/10 via-transparent to-transparent",
      };
    }
    if (lower.includes("google") || lower.includes("youtube") || lower.includes("drive")) {
      return {
        icon: Cloud,
        iconBox: "bg-sky-500/15 border-sky-500/35 text-sky-300",
        cardBorder: hasMappings
          ? "border-sky-500/35 hover:border-sky-400/60 shadow-lg shadow-sky-950/20"
          : "border-slate-800/80 hover:border-slate-700",
        glow: "from-sky-500/10 via-transparent to-transparent",
      };
    }
    return {
      icon: Package,
      iconBox: hasMappings
        ? "bg-cyan-500/15 border-cyan-500/35 text-cyan-300"
        : "bg-slate-800/80 border-slate-700 text-slate-400",
      cardBorder: hasMappings
        ? "border-cyan-500/35 hover:border-cyan-400/60 shadow-lg shadow-cyan-950/20"
        : "border-slate-800/80 hover:border-slate-700",
      glow: hasMappings ? "from-cyan-500/10 via-transparent to-transparent" : "from-transparent",
    };
  };

  const getCategoryMeta = (category: string) => {
    const cat = (category || "").toUpperCase();
    if (cat.includes("ADOBE")) {
      return {
        badge: "bg-purple-500/15 text-purple-300 border-purple-500/30",
        icon: Sparkles,
      };
    }
    if (cat.includes("NETFLIX")) {
      return {
        badge: "bg-rose-500/15 text-rose-300 border-rose-500/30",
        icon: Tv,
      };
    }
    if (cat.includes("2FA") || cat.includes("TOTP")) {
      return {
        badge: "bg-amber-500/15 text-amber-300 border-amber-500/30",
        icon: KeyRound,
      };
    }
    return {
      badge: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
      icon: Mail,
    };
  };

  return (
    <div className="space-y-6">
      {/* Top Context Banner with Create Routing Rule CTA */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900/90 via-slate-900/70 to-cyan-950/30 border border-slate-800/90 backdrop-blur-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Archive className="w-4 h-4 text-cyan-400" />
            <h2 className="text-base font-bold text-white">
              Liên Kết Sản Phẩm & Điều Phối Cổng OTP/API
            </h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-300 border border-cyan-500/25">
              portal_slot_routing_rules
            </span>
          </div>
          <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
            Hệ thống hỗ trợ <strong>Thiết Lập Động</strong> theo 4 yếu tố:{" "}
            <strong className="text-cyan-300">[Ô Input trên Web]</strong> +{" "}
            <strong className="text-purple-300">[Sản Phẩm Kho]</strong> +{" "}
            <strong className="text-amber-300">[Nhà Cung Cấp]</strong> &rarr;{" "}
            <strong className="text-emerald-300">[Cổng Provider Đích]</strong>. Khi khách nhập dữ liệu,
            hệ thống tự động tra cứu đơn hàng để gọi chính xác 100% cổng Provider tương ứng.
          </p>
        </div>

        {/* Action Buttons & Summary */}
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-lg shadow-cyan-500/25 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo Liên Kết Ô Input & NCC</span>
          </button>

          <div className="px-3.5 py-2 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span className="text-slate-400">Quy tắc động: </span>
            <strong className="text-white font-bold">{routingRules.length}</strong>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* SECTION 1: QUY TẮC ĐIỀU PHỐI THEO Ô INPUT & NCC (ROUTING RULES) */}
      {/* ========================================================= */}
      <div className="rounded-2xl border border-slate-800/90 bg-slate-900/60 backdrop-blur-xl overflow-hidden transition-all">
        {/* Section Header */}
        <div className="p-4 sm:px-5 flex items-center justify-between gap-3 border-b border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                Quy Tắc Định Tuyến Tự Động (Routing Rules)
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/25">
                  {routingRules.length} quy tắc
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Đối chiếu đơn hàng của khách để gọi chính xác Provider theo Nhà Cung Cấp
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm mới</span>
            </button>
            <button
              type="button"
              onClick={() => setShowRoutingRules(!showRoutingRules)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 bg-slate-800/60 transition-colors cursor-pointer"
              title={showRoutingRules ? "Thu gọn" : "Mở rộng"}
            >
              {showRoutingRules ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Rules Grid */}
        {showRoutingRules && (
          <div className="p-4 sm:p-5">
            {routingRules.length === 0 ? (
              <div className="p-8 text-center rounded-xl border border-dashed border-slate-800 bg-slate-950/40 space-y-2">
                <Sliders className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400 font-medium">
                  Chưa có quy tắc liên kết nào được tạo.
                </p>
                <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                  Hãy bấm nút <strong className="text-cyan-300">&quot;Thêm mới&quot;</strong> để gán Ô Input trên Web với Sản Phẩm, NCC và Provider tương ứng.
                </p>
                <button
                  type="button"
                  onClick={handleOpenCreateModal}
                  className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Tạo quy tắc đầu tiên
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
                {routingRules.map((rule) => {
                  const matchedSlot = slots.find((s) => s.slot_key === rule.slot_key);
                  const slotLabel = matchedSlot ? matchedSlot.name : rule.slot_key;
                  const catMeta = getCategoryMeta(rule.provider_category || rule.product_category || "");
                  const CatIcon = catMeta.icon;

                  return (
                    <div
                      key={rule.id}
                      className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                        rule.is_active
                          ? "bg-slate-950/80 border-slate-800 hover:border-slate-700 shadow-md"
                          : "bg-slate-950/40 border-slate-800/40 opacity-60"
                      }`}
                    >
                      {/* Top Row: Flow Chain */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/60">
                              #{rule.id}
                            </span>
                            <span className="text-[11px] font-bold text-cyan-300 flex items-center gap-1">
                              <Terminal className="w-3 h-3" />
                              {slotLabel}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                              Ưu tiên: <strong>#{rule.priority}</strong>
                            </span>
                            {/* Toggle Active */}
                            <label className="relative inline-flex items-center cursor-pointer" title={rule.is_active ? "Đang bật" : "Đang tắt"}>
                              <input
                                type="checkbox"
                                checked={rule.is_active}
                                onChange={() => onToggleRoutingRuleActive && onToggleRoutingRuleActive(rule.id, rule.is_active)}
                                className="sr-only peer"
                              />
                              <div className="w-8 h-4 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-cyan-500" />
                            </label>
                          </div>
                        </div>

                        {/* Visual Mapping Arrow Flow */}
                        <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800/80 flex items-center justify-between gap-2 text-xs flex-wrap">
                          {/* Left: Product & Supplier */}
                          <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-300 border border-purple-500/30 font-semibold truncate">
                              <Layers className="w-3 h-3" />
                              {rule.product_name}
                            </span>
                            <span className="text-slate-500 font-bold">+</span>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                              rule.supplier_id
                                ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                                : "bg-slate-800 text-slate-400 border-slate-700/60"
                            }`}>
                              <Building2 className="w-3 h-3" />
                              {rule.supplier_name || "Mọi NCC"}
                            </span>
                          </div>

                          {/* Right: Target Provider */}
                          <div className="flex items-center gap-1.5 font-bold text-emerald-300">
                            <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                              <CatIcon className="w-3 h-3" />
                              {rule.provider_name || rule.provider_key}
                            </span>
                          </div>
                        </div>

                        {rule.note && (
                          <p className="text-[11px] text-slate-400 italic">
                            &quot;{rule.note}&quot;
                          </p>
                        )}
                      </div>

                      {/* Bottom Row: Actions */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-xs">
                        <span className="text-[10px] text-slate-500">
                          {rule.is_active ? "Đang có hiệu lực trên Portal" : "Tạm dừng áp dụng"}
                        </span>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(rule)}
                            className="p-1 rounded-md text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Sửa quy tắc"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRule(rule)}
                            className="p-1 rounded-md text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer"
                            title="Xóa quy tắc"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* SECTION 2: DANH MỤC SẢN PHẨM KHO HÀNG & CỔNG PROVIDER GÁN */}
      {/* ========================================================= */}

      {/* Search, Filter & View Mode Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl">
        <div className="relative flex-1 max-w-lg">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Tìm theo tên sản phẩm kho, tag phân loại, biến thể hoặc cổng API..."
            className="w-full pl-10 pr-12 py-2 text-sm bg-slate-950/70 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white px-1.5 py-0.5 rounded bg-slate-800"
            >
              Xóa
            </button>
          )}
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2.5 flex-wrap">
          {/* Filter Chips */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onFilterChange("ALL")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                productFilter === "ALL"
                  ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/25"
                  : "bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/50"
              }`}
            >
              Tất cả ({products.length})
            </button>
            <button
              type="button"
              onClick={() => onFilterChange("ASSIGNED")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                productFilter === "ASSIGNED"
                  ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/25"
                  : "bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/50"
              }`}
            >
              Đã gán API ({assignedCount})
            </button>
            <button
              type="button"
              onClick={() => onFilterChange("UNASSIGNED")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                productFilter === "UNASSIGNED"
                  ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25"
                  : "bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/50"
              }`}
            >
              Chưa gán ({unassignedCount})
            </button>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center p-1 rounded-xl bg-slate-950/90 border border-slate-800 text-slate-400">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === "grid"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                  : "hover:text-slate-200"
              }`}
              title="Chế độ Lưới 2 cột"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Lưới</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === "list"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                  : "hover:text-slate-200"
              }`}
              title="Chế độ Danh sách dọc"
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Danh sách</span>
            </button>
          </div>
        </div>
      </div>

      {/* Product Cards */}
      {filteredProducts.length === 0 ? (
        <div className="p-12 text-center text-slate-400 rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-xl">
          <AlertCircle className="w-8 h-8 text-slate-500 mx-auto mb-2" />
          <p className="text-sm font-medium">Không tìm thấy sản phẩm kho hàng nào phù hợp.</p>
        </div>
      ) : (
        <div
          className={
            viewMode === "grid"
              ? "grid grid-cols-1 xl:grid-cols-2 gap-4"
              : "space-y-3.5"
          }
        >
          {filteredProducts.map((product) => {
            const hasMappings = Boolean(product.apis && product.apis.length > 0);
            const brand = getProductBrandVisual(product.package_name, hasMappings);
            const BrandIcon = brand.icon;
            const isExpanded = Boolean(expandedProductIds[product.id]);

            const assignedKeys = new Set(
              (product.apis || []).map((a) => a.provider_key || a.service_key)
            );
            const unassignedApis = availableApis.filter((api) => {
              const key = api.provider_key || api.service_key;
              return !assignedKeys.has(key);
            });

            // Lấy các quy tắc điều phối riêng của sản phẩm này
            const productRules = routingRules.filter((r) => r.product_name_id === product.id);

            return (
              <div
                key={product.id}
                className={`relative overflow-hidden p-4 sm:p-5 rounded-2xl border bg-slate-900/65 backdrop-blur-xl transition-all flex flex-col justify-between gap-4 ${brand.cardBorder}`}
              >
                {/* Subtle Top Gradient Glow */}
                <div
                  className={`pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b ${brand.glow}`}
                />

                {/* Top Section: Header Row (Title & Add Provider Dropdown) */}
                <div className="relative flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${brand.iconBox}`}
                    >
                      <BrandIcon className="w-5 h-5" />
                    </div>

                    <div className="flex items-center gap-2 min-w-0 flex-wrap">
                      <h3 className="font-bold text-slate-100 text-base leading-tight truncate">
                        {product.package_name}
                      </h3>
                      <span className="text-[11px] font-mono text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/60 shrink-0">
                        Kho #{product.id}
                      </span>
                      {productRules.length > 0 && (
                        <span className="text-[10px] font-bold text-cyan-300 bg-cyan-500/15 border border-cyan-500/30 px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1">
                          <Zap className="w-2.5 h-2.5" />
                          {productRules.length} quy tắc điều phối
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Add Provider Dropdown */}
                  <div className="shrink-0">
                    <div className="relative">
                      <Plus className="w-3.5 h-3.5 text-cyan-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <select
                        value=""
                        disabled={unassignedApis.length === 0}
                        onChange={(e) => {
                          if (e.target.value) {
                            void onAssignProvider(product.id, e.target.value);
                          }
                        }}
                        className="text-xs font-semibold bg-slate-950 border border-slate-700 hover:border-cyan-500/60 text-slate-200 rounded-xl pl-7 pr-3 py-1.5 outline-none focus:ring-1 focus:ring-cyan-500 transition-all cursor-pointer disabled:opacity-40"
                      >
                        <option value="">
                          {unassignedApis.length === 0
                            ? "Đã gán đủ cổng"
                            : "+ Gán thêm Provider..."}
                        </option>
                        {unassignedApis.map((api) => {
                          const val = api.provider_key || api.service_key;
                          const matchedProvider = providers.find((p) => p.key === val);
                          const isReady = matchedProvider
                            ? matchedProvider.configured
                            : api.configured !== false;
                          return (
                            <option key={val} value={val}>
                              {api.service_name} ({val}) • {api.category}{" "}
                              {isReady ? "✓" : "⚠️"}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Full-width Horizontal Tag Ribbon */}
                <div className="relative flex items-center gap-2 overflow-x-auto scrollbar-none py-0.5 text-xs whitespace-nowrap">
                  {product.is_package && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase px-2.5 py-1 rounded-lg bg-purple-500/15 text-purple-300 border border-purple-500/30 shrink-0">
                      <Boxes className="w-3 h-3" />
                      Gói Kho
                    </span>
                  )}

                  {hasMappings ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shrink-0">
                      <CheckCircle2 className="w-3 h-3" />
                      {product.apis.length} Cổng API
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg bg-slate-800 text-slate-400 border border-slate-700/60 shrink-0">
                      Cấp thủ công
                    </span>
                  )}

                  {product.category && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-mono text-[11px] shrink-0">
                      <Tag className="w-3 h-3" />
                      {product.category}
                    </span>
                  )}

                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px] text-slate-300 shrink-0">
                    <Archive className="w-3 h-3 text-cyan-400" />
                    <span>
                      Tồn kho:{" "}
                      <strong className="text-white font-semibold">
                        {product.available_slots ?? 0}
                      </strong>
                      /{product.total_slots ?? 0} slot
                    </span>
                  </span>

                  {product.variants_count > 0 && (
                    <button
                      type="button"
                      onClick={() => toggleExpand(product.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-cyan-300 border border-slate-700/70 text-[11px] font-medium transition-colors cursor-pointer shrink-0"
                    >
                      <span>{product.variants_count} biến thể / tag</span>
                      {isExpanded ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )}
                    </button>
                  )}

                  {product.login_url && (
                    <a
                      href={
                        product.login_url.startsWith("http")
                          ? product.login_url
                          : `https://${product.login_url}`
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 hover:text-cyan-300 transition-colors shrink-0"
                      title={product.login_url}
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Link login</span>
                    </a>
                  )}
                </div>

                {/* Expandable Variants / Warehouse Tags Drawer */}
                {isExpanded && product.variants && product.variants.length > 0 && (
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-2 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="font-semibold text-slate-300">
                        Danh sách Biến thể / Tag kế thừa cấu hình OTP của {product.package_name}:
                      </span>
                      <span>{product.variants.length} mục</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                      {product.variants.map((v) => (
                        <span
                          key={v.id}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300"
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              v.is_active !== false ? "bg-emerald-400" : "bg-slate-600"
                            }`}
                          />
                          <span className="font-medium">
                            {v.display_name || v.variant_name}
                          </span>
                          {v.variant_name && v.variant_name !== v.display_name && (
                            <span className="text-[10px] font-mono text-slate-500">
                              ({v.variant_name})
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Assigned Providers Section */}
                <div className="pt-3 border-t border-slate-800/70 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Link2 className="w-3.5 h-3.5 text-cyan-400" />
                      Danh Sách Provider OTP / API Đã Gán
                    </span>
                  </div>

                  {!hasMappings ? (
                    <div className="px-3.5 py-2.5 rounded-xl bg-slate-950/50 border border-dashed border-slate-800 text-xs text-slate-500 flex items-center justify-between gap-2">
                      <span>
                        Chưa gán cổng tự động — sử dụng chế độ nhập / cấp tài khoản thủ công.
                      </span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {product.apis.map((api) => {
                        const providerInfo = providers.find(
                          (p) => p.key === api.provider_key
                        );
                        const isConfigured = providerInfo
                          ? providerInfo.configured
                          : true;
                        const catMeta = getCategoryMeta(
                          api.category || providerInfo?.category || ""
                        );
                        const CatIcon = catMeta.icon;

                        return (
                          <div
                            key={api.mapping_id}
                            className="group flex items-center justify-between gap-2 p-2.5 rounded-xl border bg-slate-950/80 border-slate-800 hover:border-slate-700 transition-all"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 text-cyan-400">
                                <CatIcon className="w-4 h-4" />
                              </div>

                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-xs text-slate-100 truncate">
                                    {api.service_name || api.provider_key}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                  <span className="text-[10px] font-mono text-slate-400">
                                    {api.provider_key}
                                  </span>
                                  <span
                                    className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold uppercase border ${catMeta.badge}`}
                                  >
                                    <CatIcon className="w-2.5 h-2.5" />
                                    {api.category || providerInfo?.category || "OTP"}
                                  </span>
                                  {isConfigured ? (
                                    <span
                                      className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                                      title="Đã cấu hình biến môi trường"
                                    />
                                  ) : (
                                    <span
                                      className="inline-flex items-center gap-0.5 text-[9px] text-amber-400"
                                      title="Chưa cấu hình biến môi trường"
                                    >
                                      <ShieldAlert className="w-2.5 h-2.5" />
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveProvider(api.mapping_id, api.service_name || api.provider_key, product.package_name)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-300 hover:bg-rose-950/50 border border-transparent hover:border-rose-500/30 transition-all shrink-0 cursor-pointer"
                              title="Gỡ bỏ liên kết provider này"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Setup Rule */}
      <SlotProductSupplierRuleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleModalSubmit}
        editingRule={editingRule}
        slots={slots}
        products={products}
        suppliers={suppliers}
        providers={providers}
        availableApis={availableApis}
      />
    </div>
  );
};
