import React, { useMemo, useState } from "react";
import {
  Save,
  Loader2,
  ShieldAlert,
  Layers,
  Sparkles,
  Search,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  Power,
  Tv,
  KeyRound,
  Mail,
  Bot,
  LayoutGrid,
  List,
  AlertCircle,
  Tag,
  Clock,
  MousePointer,
} from "lucide-react";
import type { PortalSlotItem } from "@/features/external-api/types";
import type { Provider } from "@/features/external-api/hooks/useExternalApiConfig";

interface OtpPortalSlotsTabProps {
  slots: PortalSlotItem[];
  providers: Provider[];
  savingSlots: boolean;
  onAddService: (slotKey: string, serviceKey: string) => void;
  onRemoveService: (slotKey: string, serviceKey: string) => void;
  onMoveService: (slotKey: string, fromIndex: number, toIndex: number) => void;
  onToggleEnabled: (slotKey: string, enabled: boolean) => void;
  onSaveSlots: () => void;
}

export const OtpPortalSlotsTab: React.FC<OtpPortalSlotsTabProps> = ({
  slots,
  providers,
  savingSlots,
  onAddService,
  onRemoveService,
  onMoveService,
  onToggleEnabled,
  onSaveSlots,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ENABLED" | "DISABLED">("ALL");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Summary Metrics
  const totalSlots = slots.length;
  const enabledSlotsCount = useMemo(
    () => slots.filter((s) => s.enabled !== false).length,
    [slots]
  );
  const disabledSlotsCount = totalSlots - enabledSlotsCount;

  // Visual helper per brand/category
  const getSlotBrandVisual = (name: string, category: string, isEnabled: boolean) => {
    const lower = `${name} ${category}`.toLowerCase();
    if (lower.includes("adobe")) {
      return {
        icon: Sparkles,
        iconBox: "bg-purple-500/15 border-purple-500/35 text-purple-300",
        cardBorder: isEnabled
          ? "border-purple-500/35 hover:border-purple-400/60 shadow-lg shadow-purple-950/20"
          : "border-slate-800/40 opacity-70",
        glow: "from-purple-500/10 via-transparent to-transparent",
      };
    }
    if (lower.includes("netflix")) {
      return {
        icon: Tv,
        iconBox: "bg-rose-500/15 border-rose-500/35 text-rose-300",
        cardBorder: isEnabled
          ? "border-rose-500/35 hover:border-rose-400/60 shadow-lg shadow-rose-950/20"
          : "border-slate-800/40 opacity-70",
        glow: "from-rose-500/10 via-transparent to-transparent",
      };
    }
    if (lower.includes("gpt") || lower.includes("openai") || lower.includes("chat")) {
      return {
        icon: Bot,
        iconBox: "bg-emerald-500/15 border-emerald-500/35 text-emerald-300",
        cardBorder: isEnabled
          ? "border-emerald-500/35 hover:border-emerald-400/60 shadow-lg shadow-emerald-950/20"
          : "border-slate-800/40 opacity-70",
        glow: "from-emerald-500/10 via-transparent to-transparent",
      };
    }
    if (lower.includes("2fa") || lower.includes("totp")) {
      return {
        icon: KeyRound,
        iconBox: "bg-amber-500/15 border-amber-500/35 text-amber-300",
        cardBorder: isEnabled
          ? "border-amber-500/35 hover:border-amber-400/60 shadow-lg shadow-amber-950/20"
          : "border-slate-800/40 opacity-70",
        glow: "from-amber-500/10 via-transparent to-transparent",
      };
    }
    return {
      icon: Layers,
      iconBox: "bg-cyan-500/15 border-cyan-500/35 text-cyan-300",
      cardBorder: isEnabled
        ? "border-cyan-500/35 hover:border-cyan-400/60 shadow-lg shadow-cyan-950/20"
        : "border-slate-800/40 opacity-70",
      glow: "from-cyan-500/10 via-transparent to-transparent",
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

  // Filtered slots
  const filteredSlots = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return slots.filter((slot) => {
      const isEnabled = slot.enabled !== false;
      if (statusFilter === "ENABLED" && !isEnabled) return false;
      if (statusFilter === "DISABLED" && isEnabled) return false;

      if (!query) return true;

      const matchesName = slot.name.toLowerCase().includes(query);
      const matchesKey = slot.slot_key.toLowerCase().includes(query);
      const matchesCategory = (slot.category || "").toLowerCase().includes(query);
      const matchesBtn = (slot.btn_text || "").toLowerCase().includes(query);
      const assigned = Array.isArray(slot.assigned_services)
        ? slot.assigned_services
        : [slot.primary_service_key, slot.fallback_service_key].filter(
            (k): k is string => Boolean(k)
          );
      const matchesServices = assigned.some((sKey) => {
        const p = providers.find((item) => item.key === sKey);
        return (
          sKey.toLowerCase().includes(query) ||
          (p?.name || "").toLowerCase().includes(query)
        );
      });

      return matchesName || matchesKey || matchesCategory || matchesBtn || matchesServices;
    });
  }, [slots, searchQuery, statusFilter, providers]);

  return (
    <div className="space-y-5">
      {/* Top Banner (Style đồng bộ như bên Liên Kết Sản Phẩm) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900/90 via-slate-900/70 to-purple-950/30 border border-slate-800/90 backdrop-blur-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Layers className="w-4 h-4 text-purple-400" />
            <h2 className="text-base font-bold text-white">
              Điều Hướng & Gán Đa Cổng NCC Cho Ô Input (Multi-Provider Routing)
            </h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-300 border border-purple-500/25">
              OTP_PORTAL_SLOTS_CONFIG
            </span>
          </div>
          <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
            Mỗi ô input trên cổng OTP có thể gán chuỗi nhiều Cổng Dịch Vụ / NCC khác nhau không giới hạn.
            Hệ thống sẽ lần lượt xử lý theo <strong className="text-slate-200">thứ tự ưu tiên từ trên xuống dưới</strong> (bấm nút mũi tên để đảo vị trí).
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <div className="px-3.5 py-2 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <div className="text-xs">
              <span className="text-slate-400">Tổng ô input: </span>
              <strong className="text-white font-bold">{totalSlots}</strong>
            </div>
          </div>
          <div className="px-3.5 py-2 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <div className="text-xs">
              <span className="text-emerald-300/80">Đang bật: </span>
              <strong className="text-emerald-300 font-bold">{enabledSlotsCount}</strong>
            </div>
          </div>
          {disabledSlotsCount > 0 && (
            <div className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-slate-500" />
              <div className="text-xs">
                <span className="text-slate-400">Tạm tắt: </span>
                <strong className="text-slate-300 font-bold">{disabledSlotsCount}</strong>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={onSaveSlots}
            disabled={savingSlots}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs sm:text-sm transition-all shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-50 whitespace-nowrap cursor-pointer"
          >
            {savingSlots ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang lưu...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Lưu Cấu Hình Cổng</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Toolbar: Search, Filter Chips & View Mode Toggle */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl">
        <div className="relative flex-1 max-w-lg">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên ô input, slot key, danh mục hoặc cổng NCC..."
            className="w-full pl-10 pr-12 py-2 text-sm bg-slate-950/70 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white px-1.5 py-0.5 rounded bg-slate-800 cursor-pointer"
            >
              Xóa
            </button>
          )}
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2.5 flex-wrap">
          {/* Status Filter Chips */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setStatusFilter("ALL")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                statusFilter === "ALL"
                  ? "bg-purple-600 text-white shadow-md shadow-purple-600/25"
                  : "bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/50"
              }`}
            >
              Tất cả ({totalSlots})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("ENABLED")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                statusFilter === "ENABLED"
                  ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/25"
                  : "bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/50"
              }`}
            >
              Đang bật ({enabledSlotsCount})
            </button>
            {disabledSlotsCount > 0 && (
              <button
                type="button"
                onClick={() => setStatusFilter("DISABLED")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  statusFilter === "DISABLED"
                    ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25"
                    : "bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/50"
                }`}
              >
                Tạm tắt ({disabledSlotsCount})
              </button>
            )}
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

      {/* Slots List / Grid Cards */}
      {filteredSlots.length === 0 ? (
        <div className="p-12 text-center text-slate-400 rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-xl">
          <AlertCircle className="w-8 h-8 text-slate-500 mx-auto mb-2" />
          <p className="text-sm font-medium">Không tìm thấy ô input cổng OTP nào phù hợp.</p>
        </div>
      ) : (
        <div
          className={
            viewMode === "grid"
              ? "grid grid-cols-1 xl:grid-cols-2 gap-4"
              : "space-y-3.5"
          }
        >
          {filteredSlots.map((slot) => {
            const assignedServices = Array.isArray(slot.assigned_services)
              ? slot.assigned_services
              : [slot.primary_service_key, slot.fallback_service_key].filter(
                  (k): k is string => Boolean(k)
                );

            const availableToAdd = providers.filter(
              (p) => !assignedServices.includes(p.key)
            );

            const isEnabled = slot.enabled !== false;
            const brand = getSlotBrandVisual(slot.name, slot.category, isEnabled);
            const BrandIcon = brand.icon;

            return (
              <div
                key={slot.slot_key}
                className={`relative overflow-hidden p-4 sm:p-5 rounded-2xl border bg-slate-900/65 backdrop-blur-xl transition-all flex flex-col justify-between gap-3.5 ${brand.cardBorder}`}
              >
                {/* Subtle Top Gradient Glow */}
                <div
                  className={`pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b ${brand.glow}`}
                />

                {/* Tầng 1: Header Row (Toàn quyền cho Icon + Tiêu Đề + Key và Nút Bật/Tắt) */}
                <div className="relative flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${brand.iconBox}`}
                    >
                      <BrandIcon className="w-5 h-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-slate-100 text-base leading-tight">
                          {slot.name}
                        </h3>
                        <span className="text-[11px] font-mono text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/60 shrink-0">
                          {slot.slot_key}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Nút công tắc Bật/Tắt */}
                  <button
                    type="button"
                    onClick={() => onToggleEnabled(slot.slot_key, !isEnabled)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shrink-0 ${
                      isEnabled
                        ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25"
                        : "bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200"
                    }`}
                    title={isEnabled ? "Bấm để tạm tắt ô input này" : "Bấm để kích hoạt lại ô input này"}
                  >
                    <Power className="w-3.5 h-3.5" />
                    <span>{isEnabled ? "Đang Bật" : "Tạm Tắt"}</span>
                  </button>
                </div>

                {/* Tầng 2: Full-width Horizontal Tag Ribbon (Nằm thẳng trên 1 hàng duy nhất) */}
                <div className="relative flex items-center gap-2 overflow-x-auto scrollbar-none py-0.5 text-xs whitespace-nowrap">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase px-2.5 py-1 rounded-lg bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shrink-0">
                    <Layers className="w-3 h-3" />
                    {assignedServices.length} Cổng NCC
                  </span>

                  {slot.category && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-mono text-[11px] uppercase shrink-0">
                      <Tag className="w-3 h-3" />
                      {slot.category}
                    </span>
                  )}

                  {slot.cooldown_seconds !== undefined && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px] text-slate-300 shrink-0">
                      <Clock className="w-3 h-3 text-cyan-400" />
                      <span>Cooldown: <strong className="text-white font-semibold">{slot.cooldown_seconds}s</strong></span>
                    </span>
                  )}

                  {slot.btn_text && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px] text-slate-300 shrink-0">
                      <MousePointer className="w-3 h-3 text-purple-400" />
                      <span>Nút: <strong className="text-white font-semibold">{slot.btn_text}</strong></span>
                    </span>
                  )}

                  {slot.input_placeholder && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-950/60 border border-slate-800/80 text-[11px] text-slate-400 shrink-0" title={slot.input_placeholder}>
                      <span>Gợi ý: <span className="text-slate-300 font-mono">{slot.input_placeholder}</span></span>
                    </span>
                  )}
                </div>

                {/* Tầng 3: Chuỗi Cổng Dịch Vụ / NCC Được Gán (Kèm ô Thêm NCC bên phải) */}
                <div className="pt-3 border-t border-slate-800/70 space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">


                    {/* Ô Gán thêm Provider / NCC nằm đúng ngữ cảnh danh sách */}
                    <div className="relative shrink-0">
                      <Plus className="w-3.5 h-3.5 text-cyan-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <select
                        value=""
                        disabled={availableToAdd.length === 0}
                        onChange={(e) => {
                          if (e.target.value) {
                            onAddService(slot.slot_key, e.target.value);
                          }
                        }}
                        className="w-full sm:w-auto text-xs font-semibold bg-slate-950 border border-slate-700 hover:border-cyan-500/60 text-slate-200 rounded-xl pl-7 pr-3 py-1.5 outline-none focus:ring-1 focus:ring-cyan-500 transition-all cursor-pointer disabled:opacity-40"
                      >
                        <option value="">
                          {availableToAdd.length === 0
                            ? "Đã gán đủ cổng"
                            : "+ Gán thêm NCC..."}
                        </option>
                        {availableToAdd.map((p) => (
                          <option key={p.key} value={p.key}>
                            + {p.name} ({p.key}) • {p.category} {p.configured ? "✓" : "⚠️"}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {assignedServices.length === 0 ? (
                    <div className="p-3.5 rounded-xl border border-dashed border-amber-500/30 bg-amber-500/5 text-center text-xs text-amber-300">
                      Chưa có Cổng / NCC nào được gắn cho ô input này. Hãy chọn cổng ở góc trên để thêm vào chuỗi xử lý.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {assignedServices.map((serviceKey, idx) => {
                        const provider = providers.find((p) => p.key === serviceKey);
                        const isConfigured = provider ? provider.configured : false;
                        const catMeta = getCategoryMeta(provider?.category || "");
                        const CatIcon = catMeta.icon;

                        return (
                          <div
                            key={serviceKey}
                            className="group flex items-center justify-between gap-2 p-2.5 rounded-xl border bg-slate-950/80 border-slate-800 hover:border-slate-700 transition-all"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="w-6 h-6 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                                #{idx + 1}
                              </span>

                              <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 text-cyan-400">
                                <CatIcon className="w-4 h-4" />
                              </div>

                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-xs text-slate-100 truncate">
                                    {provider?.name || serviceKey}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                  <span className="text-[10px] font-mono text-slate-400">
                                    {serviceKey}
                                  </span>
                                  {provider?.category && (
                                    <span
                                      className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold uppercase border ${catMeta.badge}`}
                                    >
                                      <CatIcon className="w-2.5 h-2.5" />
                                      {provider.category}
                                    </span>
                                  )}
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

                            {/* Bộ nút Reorder & Delete */}
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => onMoveService(slot.slot_key, idx, idx - 1)}
                                title="Tăng độ ưu tiên (Lên)"
                                className="p-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-cyan-300 hover:border-cyan-500/40 disabled:opacity-20 disabled:pointer-events-none transition-all cursor-pointer"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={idx === assignedServices.length - 1}
                                onClick={() => onMoveService(slot.slot_key, idx, idx + 1)}
                                title="Giảm độ ưu tiên (Xuống)"
                                className="p-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-cyan-300 hover:border-cyan-500/40 disabled:opacity-20 disabled:pointer-events-none transition-all cursor-pointer"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onRemoveService(slot.slot_key, serviceKey)}
                                title="Gỡ cổng này khỏi ô input"
                                className="p-1 rounded-lg text-slate-500 hover:text-rose-300 hover:bg-rose-950/50 border border-transparent hover:border-rose-500/30 transition-all cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
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
    </div>
  );
};
