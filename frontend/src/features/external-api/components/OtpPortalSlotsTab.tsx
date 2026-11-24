import React, { useMemo, useState } from "react";
import {
  Loader2,
  ShieldAlert,
  Layers,
  Sparkles,
  Search,
  Trash2,
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
  Terminal,
  Send,
  CheckCircle2,
  Copy,
  Check,
  Cpu,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import type { PortalSlotItem } from "@/features/external-api/types";
import type { Provider, TestState } from "@/features/external-api/hooks/useExternalApiConfig";
import { CustomSelect } from "@/shared/components";

interface OtpPortalSlotsTabProps {
  slots: PortalSlotItem[];
  providers: Provider[];
  updatingSlot: boolean;
  removingSlotProvider: { slotKey: string; serviceKey: string } | null;
  onAddService: (slotKey: string, serviceKey: string) => void;
  onRemoveService: (slotKey: string, serviceKey: string) => Promise<void>;
  onToggleEnabled: (slotKey: string, enabled: boolean) => void;
  testInputs: Record<string, TestState>;
  onInputChange: (key: string, value: string) => void;
  onTestProvider: (provider: Provider) => void;
}

type ServiceGroupKey = "adobe" | "netflix" | "gpt" | "other";

interface GroupMeta {
  key: ServiceGroupKey;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  themeColor: string;
  badgeClass: string;
  headerBorder: string;
  gradientGlow: string;
}

const SERVICE_GROUPS: GroupMeta[] = [
  {
    key: "adobe",
    title: "Nhóm Dịch Vụ Adobe",
    subtitle: "Quản lý cổng lấy mã OTP 6 số, kiểm tra tài khoản, tổ chức và đổi team Adobe",
    icon: Sparkles,
    themeColor: "purple",
    badgeClass: "bg-purple-500/15 text-purple-300 border-purple-500/30",
    headerBorder: "border-purple-500/30 bg-purple-950/20",
    gradientGlow: "from-purple-500/10 via-transparent to-transparent",
  },
  {
    key: "netflix",
    title: "Nhóm Dịch Vụ Netflix",
    subtitle: "Điều hướng cổng liên kết Link TV / Hộ gia đình và giải mã OTP đăng nhập Netflix",
    icon: Tv,
    themeColor: "rose",
    badgeClass: "bg-rose-500/15 text-rose-300 border-rose-500/30",
    headerBorder: "border-rose-500/30 bg-rose-950/20",
    gradientGlow: "from-rose-500/10 via-transparent to-transparent",
  },
  {
    key: "gpt",
    title: "Nhóm Dịch Vụ ChatGPT / OpenAI",
    subtitle: "Phân luồng mã xác minh tài khoản OpenAI và tự động tra cứu đăng nhập",
    icon: Bot,
    themeColor: "emerald",
    badgeClass: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    headerBorder: "border-emerald-500/30 bg-emerald-950/20",
    gradientGlow: "from-emerald-500/10 via-transparent to-transparent",
  },
  {
    key: "other",
    title: "Nhóm 2FA, Email & Tiện Ích Khác",
    subtitle: "Xác thực 2 bước RFC 6238 TOTP, Mailbox IMAP, Yuna Mail và các cổng bổ trợ",
    icon: KeyRound,
    themeColor: "amber",
    badgeClass: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    headerBorder: "border-amber-500/30 bg-amber-950/20",
    gradientGlow: "from-amber-500/10 via-transparent to-transparent",
  },
];

export const OtpPortalSlotsTab: React.FC<OtpPortalSlotsTabProps> = ({
  slots,
  providers,
  updatingSlot,
  removingSlotProvider,
  onAddService,
  onRemoveService,
  onToggleEnabled,
  testInputs,
  onInputChange,
  onTestProvider,
}) => {
  const slotControlsDisabled = updatingSlot || Boolean(removingSlotProvider);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ENABLED" | "DISABLED">("ALL");
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<"ALL" | ServiceGroupKey>("ALL");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Active testing provider per slot (đối với ô có nhiều provider, cho phép chọn cổng để test)
  const [selectedTestProvider, setSelectedTestProvider] = useState<Record<string, string>>({});

  const handleCopy = (text: string, id: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  // Helper phân loại nhóm
  const getSlotGroupKey = (slot: PortalSlotItem): ServiceGroupKey => {
    const text = `${slot.category || ""} ${slot.slot_key || ""} ${slot.name || ""}`.toLowerCase();
    if (text.includes("adobe") || text.includes("ades")) return "adobe";
    if (text.includes("netflix") || text.includes("vivarocky")) return "netflix";
    if (text.includes("gpt") || text.includes("openai") || text.includes("chat")) return "gpt";
    return "other";
  };

  // Helper input meta
  const getInputTypeMeta = (input?: string) => {
    if (input === "secret") {
      return {
        label: "Base32 Secret",
        icon: KeyRound,
        placeholder: "Nhập secret Base32...",
      };
    }
    if (input === "activation_key") {
      return {
        label: "Mã key kích hoạt",
        icon: KeyRound,
        placeholder: "Nhập mã key kích hoạt...",
      };
    }
    if (input === "email_or_order") {
      return {
        label: "Email / Mã đơn",
        icon: Terminal,
        placeholder: "Nhập email hoặc mã đơn hàng...",
      };
    }
    return {
      label: "Email nhận OTP",
      icon: Mail,
      placeholder: "Nhập email nhận OTP...",
    };
  };

  // Summary Metrics
  const totalSlots = slots.length;
  const enabledSlotsCount = useMemo(
    () => slots.filter((s) => s.enabled !== false).length,
    [slots]
  );
  const disabledSlotsCount = totalSlots - enabledSlotsCount;

  // Lọc slots
  const filteredSlots = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return slots.filter((slot) => {
      const isEnabled = slot.enabled !== false;
      if (statusFilter === "ENABLED" && !isEnabled) return false;
      if (statusFilter === "DISABLED" && isEnabled) return false;

      const groupKey = getSlotGroupKey(slot);
      if (selectedGroupFilter !== "ALL" && groupKey !== selectedGroupFilter) return false;

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
          (p?.name || "").toLowerCase().includes(query) ||
          (p?.description || "").toLowerCase().includes(query)
        );
      });

      return matchesName || matchesKey || matchesCategory || matchesBtn || matchesServices;
    });
  }, [slots, searchQuery, statusFilter, selectedGroupFilter, providers]);

  // Gom các slot theo từng nhóm
  const groupedSlots = useMemo(() => {
    const map: Record<ServiceGroupKey, PortalSlotItem[]> = {
      adobe: [],
      netflix: [],
      gpt: [],
      other: [],
    };
    filteredSlots.forEach((slot) => {
      const key = getSlotGroupKey(slot);
      map[key].push(slot);
    });
    return map;
  }, [filteredSlots]);

  return (
    <div className="space-y-6">
      {/* ── Top Hero Context Banner ── */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900/90 via-slate-900/70 to-cyan-950/30 border border-slate-800/90 backdrop-blur-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Layers className="w-4 h-4 text-cyan-400 animate-pulse" />
            <h2 className="text-base font-bold text-white">
              Cổng Dịch Vụ & Ô Input OTP Khách Hàng (Multi-Provider Routing)
            </h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-300 border border-cyan-500/25">
              system.portal_slots_config
            </span>
          </div>
          <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
            Hợp nhất cấu hình cổng ô input và thử nghiệm Gateway kết nối. Gán các cổng NCC xử lý cho từng ô nhập,
            xem mô tả chi tiết và thử nghiệm trực tiếp mã OTP trên từng thẻ dịch vụ.
          </p>
        </div>

        {/* Thống kê nhanh */}
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
          {updatingSlot && (
            <span role="status" className="inline-flex items-center gap-2 text-xs text-cyan-300">
              <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
              <span>Đang lưu cấu hình cổng…</span>
            </span>
          )}
        </div>
      </div>

      {/* ── Toolbar: Search, Group Selector & Status Filter ── */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl">
        {/* Ô Tìm kiếm */}
        <div className="relative flex-1 max-w-lg">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên dịch vụ, slot key, nhà cung cấp hoặc mô tả..."
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
          {/* Phân nhóm (Group Filter Chips) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedGroupFilter("ALL")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedGroupFilter === "ALL"
                  ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/25"
                  : "bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/50"
              }`}
            >
              Tất cả nhóm
            </button>
            <button
              type="button"
              onClick={() => setSelectedGroupFilter("adobe")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedGroupFilter === "adobe"
                  ? "bg-purple-600 text-white shadow-md shadow-purple-600/25"
                  : "bg-slate-800/80 hover:bg-slate-800 text-purple-300 border border-purple-500/30"
              }`}
            >
              Nhóm Adobe
            </button>
            <button
              type="button"
              onClick={() => setSelectedGroupFilter("netflix")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedGroupFilter === "netflix"
                  ? "bg-rose-600 text-white shadow-md shadow-rose-600/25"
                  : "bg-slate-800/80 hover:bg-slate-800 text-rose-300 border border-rose-500/30"
              }`}
            >
              Nhóm Netflix
            </button>
            <button
              type="button"
              onClick={() => setSelectedGroupFilter("gpt")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedGroupFilter === "gpt"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/25"
                  : "bg-slate-800/80 hover:bg-slate-800 text-emerald-300 border border-emerald-500/30"
              }`}
            >
              Nhóm GPT
            </button>
            <button
              type="button"
              onClick={() => setSelectedGroupFilter("other")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedGroupFilter === "other"
                  ? "bg-amber-600 text-slate-950 shadow-md shadow-amber-600/25"
                  : "bg-slate-800/80 hover:bg-slate-800 text-amber-300 border border-amber-500/30"
              }`}
            >
              2FA / Khác
            </button>
          </div>

          <div className="hidden xl:block w-px h-6 bg-slate-800" />

          {/* Status Filter Chips */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setStatusFilter("ALL")}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                statusFilter === "ALL"
                  ? "bg-slate-700 text-white border border-slate-600"
                  : "bg-slate-950/60 hover:bg-slate-800 text-slate-400 border border-slate-800"
              }`}
            >
              Tất cả ({totalSlots})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("ENABLED")}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                statusFilter === "ENABLED"
                  ? "bg-emerald-950/40 text-emerald-300 border border-emerald-500/40"
                  : "bg-slate-950/60 hover:bg-slate-800 text-slate-400 border border-slate-800"
              }`}
            >
              Đang bật ({enabledSlotsCount})
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
              title="Chế độ Lưới"
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
              title="Chế độ Danh sách"
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Dọc</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Danh Sách Thẻ Gom Theo Nhóm (Adobe, Netflix, GPT, Other) ── */}
      {filteredSlots.length === 0 ? (
        <div className="p-12 text-center text-slate-400 rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-xl">
          <AlertCircle className="w-8 h-8 text-slate-500 mx-auto mb-2" />
          <p className="text-sm font-medium">Không tìm thấy ô input cổng OTP nào phù hợp.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {SERVICE_GROUPS.map((group) => {
            const groupSlots = groupedSlots[group.key];
            if (groupSlots.length === 0) return null;

            const GroupIcon = group.icon;

            return (
              <div
                key={group.key}
                className={`relative overflow-hidden p-4 sm:p-5.5 rounded-3xl border bg-slate-900/60 backdrop-blur-xl space-y-4.5 shadow-xl transition-all ${group.headerBorder}`}
              >
                {/* ── Group Background Glow ── */}
                <div
                  className={`pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b ${group.gradientGlow}`}
                />

                {/* ── Group Header (Tích hợp phía trên của khối) ── */}
                <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3.5">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${group.badgeClass}`}
                    >
                      <GroupIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-white text-sm sm:text-base tracking-wide">
                          {group.title}
                        </h3>
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${group.badgeClass}`}>
                          {groupSlots.length} Cổng dịch vụ
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {group.subtitle}
                      </p>
                    </div>
                  </div>
                </div>

                {/* ── Cards Grid / List Inside Group ── */}
                <div
                  className={
                    viewMode === "grid"
                      ? "grid grid-cols-1 xl:grid-cols-2 gap-4"
                      : "space-y-3.5"
                  }
                >
                  {groupSlots.map((slot) => {
                    const assignedServices = Array.isArray(slot.assigned_services)
                      ? slot.assigned_services
                      : [slot.primary_service_key, slot.fallback_service_key].filter(
                          (k): k is string => Boolean(k)
                        );

                    const availableToAdd = providers.filter(
                      (p) => !assignedServices.includes(p.key)
                    );

                    const isEnabled = slot.enabled !== false;

                    // Lựa chọn provider để test (mặc định lấy provider đầu tiên hoặc provider đang chọn)
                    const activeTestKey =
                      selectedTestProvider[slot.slot_key] || assignedServices[0] || "";
                    const activeTestingProvider = providers.find((p) => p.key === activeTestKey);
                    const test = activeTestKey
                      ? testInputs[activeTestKey] || { value: "", loading: false }
                      : { value: "", loading: false };
                    const inputMeta = getInputTypeMeta(activeTestingProvider?.input);

                    return (
                      <div
                        key={slot.slot_key}
                        className={`relative overflow-hidden p-4 sm:p-5 rounded-2xl border bg-slate-950/80 backdrop-blur-md transition-all flex flex-col justify-between gap-4 border-slate-800/90 hover:border-slate-700/90 shadow-md shadow-slate-950/60`}
                      >
                        {/* Subtle Glow */}
                        <div
                          className={`pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b ${group.gradientGlow}`}
                        />

                        {/* ── TẦNG 1: Tiêu Đề, Slot Key & Nút Bật/Tắt ── */}
                        <div className="relative flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div
                              className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${group.badgeClass}`}
                            >
                              <GroupIcon className="w-5 h-5" />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-bold text-slate-100 text-base leading-tight">
                                  {slot.name}
                                </h4>
                                <span className="text-[11px] font-mono text-cyan-300 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/40 shrink-0">
                                  {slot.slot_key}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Nút công tắc Bật/Tắt */}
                          <button
                            type="button"
                            disabled={slotControlsDisabled}
                            onClick={() => onToggleEnabled(slot.slot_key, !isEnabled)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shrink-0 ${
                              isEnabled
                                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25"
                                : "bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200"
                            }`}
                            title={isEnabled ? "Tạm tắt ô input này" : "Kích hoạt lại ô input này"}
                          >
                            <Power className="w-3.5 h-3.5" />
                            <span>{isEnabled ? "Đang Bật" : "Tạm Tắt"}</span>
                          </button>
                        </div>

                        {/* ── TẦNG 2: Horizontal Tag Ribbon ── */}
                        <div className="relative flex items-center gap-2 overflow-x-auto scrollbar-none py-0.5 text-xs whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase px-2.5 py-1 rounded-lg bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shrink-0">
                            <Layers className="w-3 h-3" />
                            {assignedServices.length} Cổng NCC
                          </span>

                          {slot.cooldown_seconds !== undefined && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px] text-slate-300 shrink-0">
                              <Clock className="w-3 h-3 text-cyan-400" />
                              <span>
                                Cooldown:{" "}
                                <strong className="text-white font-semibold">
                                  {slot.cooldown_seconds}s
                                </strong>
                              </span>
                            </span>
                          )}

                          {slot.btn_text && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px] text-slate-300 shrink-0">
                              <MousePointer className="w-3 h-3 text-purple-400" />
                              <span>
                                Nút: <strong className="text-white font-semibold">{slot.btn_text}</strong>
                              </span>
                            </span>
                          )}

                          {slot.input_placeholder && (
                            <span
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-950/60 border border-slate-800/80 text-[11px] text-slate-400 shrink-0"
                              title={slot.input_placeholder}
                            >
                              <span>
                                Gợi ý:{" "}
                                <span className="text-slate-300 font-mono">
                                  {slot.input_placeholder}
                                </span>
                              </span>
                            </span>
                          )}
                        </div>

                        {/* ── TẦNG 3: Danh Sách Provider Gắn Vào Thẻ (Kèm Mô Tả & Dropdown Thêm) ── */}
                        <div className="pt-3 border-t border-slate-800/80 space-y-2.5">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                            <span className="font-semibold text-slate-300 flex items-center gap-1.5 text-xs">
                              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                              Nhà Cung Cấp / Cổng OTP Đang Gán
                            </span>

                            {/* Dropdown Gán thêm Provider */}
                            <div className="shrink-0 w-full sm:w-60">
                              <CustomSelect
                                value=""
                                disabled={slotControlsDisabled || availableToAdd.length === 0}
                                onChange={(val) => {
                                  if (val) {
                                    onAddService(slot.slot_key, val);
                                    setSelectedTestProvider((prev) => ({
                                      ...prev,
                                      [slot.slot_key]: val,
                                    }));
                                  }
                                }}
                                size="sm"
                                accent="cyan"
                                className="bg-slate-950 font-semibold"
                                placeholder={
                                  availableToAdd.length === 0
                                    ? "Đã gán đủ cổng"
                                    : "+ Gán thêm Provider..."
                                }
                                options={availableToAdd.map((p) => ({
                                  value: p.key,
                                  label: `+ ${p.name} (${p.key}) • ${p.category} ${
                                    p.configured ? "✓" : "⚠️"
                                  }`,
                                }))}
                              />
                            </div>
                          </div>

                          {assignedServices.length === 0 ? (
                            <div className="p-3.5 rounded-xl border border-dashed border-amber-500/30 bg-amber-500/5 text-center text-xs text-amber-300">
                              Chưa có cổng Provider nào được gán cho ô nhập này. Vui lòng chọn ở trên!
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {assignedServices.map((serviceKey) => {
                                const isRemoving =
                                  removingSlotProvider?.slotKey === slot.slot_key &&
                                  removingSlotProvider.serviceKey === serviceKey;
                                const provider = providers.find((p) => p.key === serviceKey);
                                const isConfigured = provider ? provider.configured : false;
                                const isSelectedForTest = activeTestKey === serviceKey;

                                return (
                                  <div
                                    key={serviceKey}
                                    className={`p-3 rounded-xl border transition-all space-y-2 ${
                                      isSelectedForTest
                                        ? "bg-slate-950/90 border-cyan-500/50 shadow-sm shadow-cyan-950/30"
                                        : "bg-slate-950/60 border-slate-800/80 hover:border-slate-700/80"
                                    }`}
                                  >
                                    {/* Dòng tiêu đề Provider + Nút Xóa */}
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-2 min-w-0 flex-wrap">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setSelectedTestProvider((prev) => ({
                                              ...prev,
                                              [slot.slot_key]: serviceKey,
                                            }))
                                          }
                                          className={`font-bold text-xs hover:underline cursor-pointer flex items-center gap-1.5 ${
                                            isSelectedForTest ? "text-cyan-300" : "text-slate-200"
                                          }`}
                                          title="Bấm để chọn provider này vào Console thử nghiệm bên dưới"
                                        >
                                          <span>{provider?.name || serviceKey}</span>
                                          {isSelectedForTest && (
                                            <span className="text-[10px] text-cyan-400 font-normal">
                                              (Đang chọn test)
                                            </span>
                                          )}
                                        </button>
                                        <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                                          {serviceKey}
                                        </span>
                                        {provider?.category && (
                                          <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                                            {provider.category}
                                          </span>
                                        )}
                                        {isConfigured ? (
                                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                            Sẵn sàng
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
                                            <ShieldAlert className="w-2.5 h-2.5" />
                                            Chưa cấu hình
                                          </span>
                                        )}
                                      </div>

                                      {/* Nút Xóa Provider */}
                                      <button
                                        type="button"
                                        onClick={() => void onRemoveService(slot.slot_key, serviceKey)}
                                        disabled={slotControlsDisabled}
                                        title={`Gỡ provider ${provider?.name || serviceKey} khỏi ô input này`}
                                        aria-label={
                                          isRemoving
                                            ? "Đang gỡ provider"
                                            : `Gỡ provider ${provider?.name || serviceKey}`
                                        }
                                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-300 hover:bg-rose-950/50 border border-transparent hover:border-rose-500/30 transition-all cursor-pointer disabled:opacity-50 shrink-0"
                                      >
                                        {isRemoving ? (
                                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                          <Trash2 className="w-3.5 h-3.5" />
                                        )}
                                      </button>
                                    </div>

                                    {/* Mô tả tính năng Provider (như khoanh đỏ ở Ảnh 2) */}
                                    {provider?.description && (
                                      <p className="text-[11px] text-slate-400 leading-relaxed bg-slate-900/40 p-2 rounded-lg border border-slate-800/50">
                                        {provider.description}
                                      </p>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* ── TẦNG 4: Console Thử Nghiệm Cổng Kết Nối Trực Tiếp ── */}
                        <div className="pt-3 border-t border-slate-800/80 space-y-2.5">
                          <div className="flex items-center justify-between text-[11px] text-slate-400">
                            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                              <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                              Console Thử Nghiệm Cổng:{" "}
                              <span className="text-cyan-300 font-mono">
                                {activeTestingProvider?.name || activeTestKey || "Chưa có cổng"}
                              </span>
                            </span>
                            <span className="text-slate-500 text-[10px] hidden sm:inline">
                              Ấn Enter để kiểm tra
                            </span>
                          </div>

                          {assignedServices.length === 0 ? (
                            <p className="text-[11px] text-slate-500 italic">
                              💡 Hãy gán ít nhất một cổng Provider ở trên để kích hoạt Console thử nghiệm.
                            </p>
                          ) : (
                            <>
                              <div className="flex items-center gap-2">
                                <div className="relative flex-1">
                                  <Terminal className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                                  <input
                                    type="text"
                                    value={test.value}
                                    onChange={(e) => onInputChange(activeTestKey, e.target.value)}
                                    onKeyDown={(e) => {
                                      if (
                                        e.key === "Enter" &&
                                        !test.loading &&
                                        activeTestingProvider
                                      ) {
                                        onTestProvider(activeTestingProvider);
                                      }
                                    }}
                                    placeholder={inputMeta.placeholder}
                                    className="w-full pl-9 pr-3 py-2 text-xs font-mono bg-slate-950/80 border border-slate-700/80 rounded-xl text-slate-200 placeholder-slate-500 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-all"
                                  />
                                </div>

                                <button
                                  type="button"
                                  onClick={() => {
                                    if (activeTestingProvider) {
                                      onTestProvider(activeTestingProvider);
                                    }
                                  }}
                                  disabled={test.loading || !activeTestingProvider}
                                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-cyan-500/20 active:scale-95 disabled:opacity-50 whitespace-nowrap cursor-pointer shrink-0"
                                >
                                  {test.loading ? (
                                    <>
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                      <span>Đang thử...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Send className="w-3.5 h-3.5" />
                                      <span>Kiểm tra</span>
                                    </>
                                  )}
                                </button>
                              </div>

                              {/* Hộp hiển thị kết quả */}
                              {(test.result || test.otp) && (
                                <div
                                  className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-3 animate-in fade-in duration-200 ${
                                    test.isError
                                      ? "bg-rose-950/30 border-rose-500/30 text-rose-300"
                                      : "bg-cyan-950/30 border-cyan-500/30 text-cyan-200"
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5 flex-1 overflow-hidden">
                                    {test.isError ? (
                                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                                    ) : (
                                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                    )}

                                    {test.otp ? (
                                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                                        <span className="text-slate-400 text-[11px] shrink-0">
                                          Mã OTP:
                                        </span>
                                        <span className="font-mono text-base font-black text-cyan-300 tracking-wider px-2.5 py-0.5 rounded-lg bg-slate-900 border border-cyan-500/40 shadow-inner shrink-0">
                                          {test.otp}
                                        </span>
                                        {test.result && (
                                          <span className="text-[11px] text-slate-400 truncate">
                                            ({test.result})
                                          </span>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="truncate">{test.result}</span>
                                    )}
                                  </div>

                                  {test.otp && (
                                    <button
                                      type="button"
                                      onClick={() => handleCopy(test.otp!, activeTestKey)}
                                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 text-[11px] font-bold transition-all cursor-pointer shrink-0"
                                      title="Sao chép mã OTP"
                                    >
                                      {copiedKey === activeTestKey ? (
                                        <>
                                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                                          <span>Đã chép</span>
                                        </>
                                      ) : (
                                        <>
                                          <Copy className="w-3.5 h-3.5" />
                                          <span>Sao chép</span>
                                        </>
                                      )}
                                    </button>
                                  )}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default OtpPortalSlotsTab;
