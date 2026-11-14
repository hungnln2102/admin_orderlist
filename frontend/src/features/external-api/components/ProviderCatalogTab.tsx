import React, { useMemo, useState } from "react";
import {
  Search,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Radio,
  KeyRound,
  Mail,
  Tv,
  Sparkles,
  ToggleRight,
  ToggleLeft,
  Terminal,
  LayoutGrid,
  List,
  ShieldCheck,
  Cpu,
} from "lucide-react";
import type { Provider, TestState } from "@/features/external-api/hooks/useExternalApiConfig";

interface ProviderCatalogTabProps {
  providers: Provider[];
  filteredProviders: Provider[];
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  testInputs: Record<string, TestState>;
  onInputChange: (key: string, value: string) => void;
  onTestProvider: (provider: Provider) => void;
}

export const ProviderCatalogTab: React.FC<ProviderCatalogTabProps> = ({
  providers,
  filteredProviders,
  categories,
  selectedCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  testInputs,
  onInputChange,
  onTestProvider,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "READY" | "NOT_CONFIGURED">("ALL");

  const readyCount = useMemo(
    () => providers.filter((p) => p.status === "READY").length,
    [providers]
  );
  const unconfiguredCount = providers.length - readyCount;

  // Lọc thêm theo trạng thái (Sẵn sàng / Chưa cấu hình)
  const displayedProviders = useMemo(() => {
    if (statusFilter === "ALL") return filteredProviders;
    return filteredProviders.filter((p) =>
      statusFilter === "READY" ? p.status === "READY" : p.status !== "READY"
    );
  }, [filteredProviders, statusFilter]);

  const handleCopy = (text: string, id: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  const getProviderBrandVisual = (category: string, key: string) => {
    const cat = (category || "").toUpperCase();
    const k = (key || "").toLowerCase();

    if (cat.includes("ADOBE") || k.includes("ades")) {
      return {
        icon: Sparkles,
        iconBox: "bg-purple-500/15 border-purple-500/35 text-purple-300",
        cardBorder: "border-purple-500/35 hover:border-purple-400/60 shadow-lg shadow-purple-950/20",
        glow: "from-purple-500/10 via-transparent to-transparent",
        badge: "bg-purple-500/15 text-purple-300 border-purple-500/30",
      };
    }
    if (cat.includes("NETFLIX") || k.includes("netflix") || k.includes("vivarocky")) {
      return {
        icon: Tv,
        iconBox: "bg-rose-500/15 border-rose-500/35 text-rose-300",
        cardBorder: "border-rose-500/35 hover:border-rose-400/60 shadow-lg shadow-rose-950/20",
        glow: "from-rose-500/10 via-transparent to-transparent",
        badge: "bg-rose-500/15 text-rose-300 border-rose-500/30",
      };
    }
    if (cat.includes("2FA") || cat.includes("TOTP") || k.includes("totp") || k.includes("2fa")) {
      return {
        icon: KeyRound,
        iconBox: "bg-amber-500/15 border-amber-500/35 text-amber-300",
        cardBorder: "border-amber-500/35 hover:border-amber-400/60 shadow-lg shadow-amber-950/20",
        glow: "from-amber-500/10 via-transparent to-transparent",
        badge: "bg-amber-500/15 text-amber-300 border-amber-500/30",
      };
    }
    return {
      icon: Mail,
      iconBox: "bg-cyan-500/15 border-cyan-500/35 text-cyan-300",
      cardBorder: "border-cyan-500/35 hover:border-cyan-400/60 shadow-lg shadow-cyan-950/20",
      glow: "from-cyan-500/10 via-transparent to-transparent",
      badge: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
    };
  };

  const getInputTypeMeta = (input: string) => {
    if (input === "secret") {
      return {
        label: "Base32 Secret",
        icon: KeyRound,
        placeholder: "Nhập secret Base32...",
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

  return (
    <div className="space-y-5">
      {/* Top Context Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900/90 via-slate-900/70 to-cyan-950/30 border border-slate-800/90 backdrop-blur-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
            <h2 className="text-base font-bold text-white">
              Danh Sách Cổng Kết Nối & Thử Nghiệm API / OTP
            </h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-300 border border-cyan-500/25">
              system.providers
            </span>
          </div>
          <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
            Danh mục các cổng kết nối API và Gateway giải mã OTP bên thứ 3. Các cổng có trạng thái{" "}
            <strong className="text-emerald-300">Sẵn sàng</strong> sẽ tự động kích hoạt cho các luồng xử lý đơn hàng,
            gán tự động theo sản phẩm kho và phân luồng tại Cổng OTP Khách hàng.
          </p>
        </div>

        {/* Summary Pills */}
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <div className="px-3.5 py-2 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <div className="text-xs">
              <span className="text-slate-400">Tổng cổng: </span>
              <strong className="text-white font-bold">{providers.length}</strong>
            </div>
          </div>
          <div className="px-3.5 py-2 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <div className="text-xs">
              <span className="text-emerald-300/80">Sẵn sàng: </span>
              <strong className="text-emerald-300 font-bold">{readyCount}</strong>
            </div>
          </div>
          <div className="px-3.5 py-2 rounded-xl bg-amber-950/30 border border-amber-500/30 flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <div className="text-xs">
              <span className="text-amber-300/80">Chưa cấu hình: </span>
              <strong className="text-amber-300 font-bold">{unconfiguredCount}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Search, Filter & View Mode Toolbar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl">
        {/* Search Input */}
        <div className="relative flex-1 max-w-lg">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Tìm theo tên provider, mã key định danh hoặc mô tả cổng..."
            className="w-full pl-10 pr-12 py-2 text-sm bg-slate-950/70 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white px-1.5 py-0.5 rounded bg-slate-800 transition-colors"
            >
              Xóa
            </button>
          )}
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2.5 flex-wrap">
          {/* Status Filter Chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setStatusFilter("ALL")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                statusFilter === "ALL"
                  ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/25"
                  : "bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/50"
              }`}
            >
              Tất cả ({providers.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("READY")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                statusFilter === "READY"
                  ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/25"
                  : "bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/50"
              }`}
            >
              Sẵn sàng ({readyCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("NOT_CONFIGURED")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                statusFilter === "NOT_CONFIGURED"
                  ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25"
                  : "bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/50"
              }`}
            >
              Chưa cấu hình ({unconfiguredCount})
            </button>
          </div>

          {/* Category Chips Divider */}
          <div className="hidden xl:block w-px h-6 bg-slate-800" />

          {/* Category Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              type="button"
              onClick={() => onSelectCategory("ALL")}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === "ALL"
                  ? "bg-slate-700 text-white border border-slate-600"
                  : "bg-slate-950/60 hover:bg-slate-800 text-slate-400 border border-slate-800"
              }`}
            >
              Mọi thể loại
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => onSelectCategory(cat)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap uppercase transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? "bg-slate-700 text-cyan-300 border border-slate-600"
                    : "bg-slate-950/60 hover:bg-slate-800 text-slate-400 border border-slate-800"
                }`}
              >
                {cat}
              </button>
            ))}
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

      {/* Provider Cards Container */}
      {displayedProviders.length === 0 ? (
        <div className="p-12 text-center text-slate-400 rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-xl space-y-2">
          <AlertCircle className="w-8 h-8 text-slate-500 mx-auto mb-2" />
          <p className="text-sm font-medium">Không tìm thấy provider nào phù hợp với bộ lọc hiện tại.</p>
        </div>
      ) : (
        <div
          className={
            viewMode === "grid"
              ? "grid grid-cols-1 xl:grid-cols-2 gap-4"
              : "space-y-3.5"
          }
        >
          {displayedProviders.map((provider) => {
            const brand = getProviderBrandVisual(provider.category, provider.key);
            const BrandIcon = brand.icon;
            const inputMeta = getInputTypeMeta(provider.input);
            const InputIcon = inputMeta.icon;
            const test = testInputs[provider.key] || { value: "", loading: false };
            const isReady = provider.status === "READY";

            return (
              <div
                key={provider.key}
                className={`relative overflow-hidden p-4 sm:p-5 rounded-2xl border bg-slate-900/65 backdrop-blur-xl transition-all flex flex-col justify-between gap-4 ${brand.cardBorder}`}
              >
                {/* Subtle Top Gradient Glow */}
                <div
                  className={`pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b ${brand.glow}`}
                />

                {/* Top Section: Header Row (Icon, Name, Key & Status Switch) */}
                <div className="relative flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${brand.iconBox}`}
                    >
                      <BrandIcon className="w-5 h-5" />
                    </div>

                    <div className="flex items-center gap-2 min-w-0 flex-wrap">
                      <h3 className="font-bold text-slate-100 text-base leading-tight truncate">
                        {provider.name}
                      </h3>
                      <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/40 shrink-0">
                        {provider.key}
                      </span>
                    </div>
                  </div>

                  {/* Status Indicator & Switch */}
                  <div className="flex items-center gap-2 shrink-0">
                    {isReady ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="hidden sm:inline">Sẵn sàng</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        <span className="hidden sm:inline">Chưa cấu hình</span>
                      </span>
                    )}

                    <div
                      className="flex items-center pl-1"
                      title={provider.enabled ? "Cổng đang được kích hoạt" : "Cổng tạm tắt hoặc chưa nạp biến môi trường"}
                    >
                      {provider.enabled ? (
                        <ToggleRight className="w-6 h-6 text-emerald-400" />
                      ) : (
                        <ToggleLeft className="w-6 h-6 text-slate-600" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Horizontal Tag Ribbon (Nằm thẳng trên 1 hàng ngang) */}
                <div className="relative flex items-center gap-2 overflow-x-auto scrollbar-none py-0.5 text-xs whitespace-nowrap">
                  {/* Category Badge */}
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-bold uppercase px-2.5 py-1 rounded-lg border shrink-0 ${brand.badge}`}
                  >
                    <BrandIcon className="w-3 h-3" />
                    {provider.category || "OTP"}
                  </span>

                  {/* Input Type Badge */}
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px] text-slate-300 shrink-0">
                    <InputIcon className="w-3 h-3 text-cyan-400" />
                    <span>{inputMeta.label}</span>
                  </span>

                  {/* Protocol / Type Badge */}
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-800/80 text-[11px] font-mono text-slate-400 shrink-0">
                    <Cpu className="w-3 h-3 text-slate-500" />
                    {provider.key === "totp" ? "RFC 6238 TOTP" : provider.key === "imap" ? "Mailbox IMAP" : "Gateway Probe"}
                  </span>

                  {isReady && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-[11px] text-emerald-300 shrink-0">
                      <ShieldCheck className="w-3 h-3" />
                      Auto Resolve OK
                    </span>
                  )}
                </div>

                {/* Description Body */}
                <div className="relative text-xs text-slate-400 leading-relaxed min-h-[36px] flex items-center">
                  <p className="line-clamp-2">{provider.description}</p>
                </div>

                {/* Interactive Test Console Section */}
                <div className="relative pt-3.5 border-t border-slate-800/70 space-y-2.5">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                      Console Thử Nghiệm Cổng Kết Nối
                    </span>
                    <span className="text-slate-500 text-[10px] hidden sm:inline">Ấn Enter để kiểm tra</span>
                  </div>

                  {/* Input & Send Action Row */}
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Terminal className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                      <input
                        type="text"
                        value={test.value}
                        onChange={(e) => onInputChange(provider.key, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !test.loading) {
                            onTestProvider(provider);
                          }
                        }}
                        placeholder={inputMeta.placeholder}
                        className="w-full pl-9 pr-3 py-2 text-xs font-mono bg-slate-950/80 border border-slate-700/80 rounded-xl text-slate-200 placeholder-slate-500 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-all"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => onTestProvider(provider)}
                      disabled={test.loading}
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

                  {/* Result Display Box */}
                  {(test.result || test.otp) && (
                    <div
                      className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-3 animate-in fade-in-50 duration-200 ${
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
                            <span className="text-slate-400 text-[11px] shrink-0">Mã OTP:</span>
                            <span className="font-mono text-base font-black text-cyan-300 tracking-wider px-2.5 py-0.5 rounded-lg bg-slate-900 border border-cyan-500/40 shadow-inner shrink-0">
                              {test.otp}
                            </span>
                            {test.result && (
                              <span className="text-[11px] text-slate-400 truncate">({test.result})</span>
                            )}
                          </div>
                        ) : (
                          <span className="truncate">{test.result}</span>
                        )}
                      </div>

                      {test.otp && (
                        <button
                          type="button"
                          onClick={() => handleCopy(test.otp!, provider.key)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 text-[11px] font-bold transition-all cursor-pointer shrink-0"
                          title="Sao chép mã OTP"
                        >
                          {copiedKey === provider.key ? (
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
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ProviderCatalogTab;
