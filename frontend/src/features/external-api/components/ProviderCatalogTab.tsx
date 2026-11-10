import React, { useState } from "react";
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
  ShieldCheck,
  Tv,
  Sparkles,
  ToggleRight,
  ToggleLeft,
  Terminal,
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

  const handleCopy = (text: string, id: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  const getCategoryBadge = (category: string) => {
    const cat = (category || "").toUpperCase();
    if (cat.includes("ADOBE")) {
      return {
        bg: "bg-purple-500/15 text-purple-300 border-purple-500/30",
        icon: Sparkles,
      };
    }
    if (cat.includes("NETFLIX")) {
      return {
        bg: "bg-rose-500/15 text-rose-300 border-rose-500/30",
        icon: Tv,
      };
    }
    if (cat.includes("2FA") || cat.includes("TOTP")) {
      return {
        bg: "bg-amber-500/15 text-amber-300 border-amber-500/30",
        icon: KeyRound,
      };
    }
    return {
      bg: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
      icon: Mail,
    };
  };

  return (
    <div className="space-y-5">
      {/* Search & Category Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Tìm theo tên provider, service key hoặc mô tả..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-950/70 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 outline-none focus:border-cyan-500/80 focus:ring-2 focus:ring-cyan-500/20 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
            >
              Xóa
            </button>
          )}
        </div>

        {/* Category Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => onSelectCategory("ALL")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategory === "ALL"
                ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/25"
                : "bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/50"
            }`}
          >
            Tất cả
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => onSelectCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap uppercase transition-all ${
                selectedCategory === cat
                  ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/25"
                  : "bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/50"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Providers Table / Cards */}
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-2xl overflow-hidden shadow-2xl">
        <div className="px-5 py-4 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
            <h2 className="text-base font-bold text-white">Danh Sách Provider Kết Nối</h2>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Hiển thị <span className="text-cyan-400 font-bold">{filteredProviders.length}</span> cổng
          </span>
        </div>

        {filteredProviders.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <AlertCircle className="w-8 h-8 text-slate-500 mx-auto" />
            <p className="text-sm font-medium">Không tìm thấy provider nào phù hợp với bộ lọc.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/70">
            {filteredProviders.map((provider) => {
              const test = testInputs[provider.key] || { value: "", loading: false };
              const categoryBadge = getCategoryBadge(provider.category);
              const CategoryIcon = categoryBadge.icon;

              const placeholder =
                provider.input === "secret"
                  ? "Nhập secret Base32..."
                  : provider.input === "email_or_order"
                  ? "Nhập email hoặc mã đơn hàng..."
                  : "Nhập email nhận OTP...";

              return (
                <div
                  key={provider.key}
                  className="p-4 sm:p-5 hover:bg-slate-800/30 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  {/* Left: Info & Badges */}
                  <div className="space-y-1.5 flex-1 min-w-[260px]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-slate-100 text-base">{provider.name}</h3>

                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase border ${categoryBadge.bg}`}
                      >
                        <CategoryIcon className="w-3 h-3" />
                        {provider.category}
                      </span>

                      {provider.status === "READY" ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Sẵn sàng
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                          Chưa cấu hình
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span className="font-mono text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/40">
                        {provider.key}
                      </span>
                      <span>•</span>
                      <span className="line-clamp-1">{provider.description}</span>
                    </div>
                  </div>

                  {/* Middle & Right: Interactive Test Box */}
                  <div className="flex-1 max-w-xl space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Terminal className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                          type="text"
                          value={test.value}
                          onChange={(e) => onInputChange(provider.key, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !test.loading) {
                              onTestProvider(provider);
                            }
                          }}
                          placeholder={placeholder}
                          className="w-full pl-9 pr-3 py-2 text-xs font-mono bg-slate-950/80 border border-slate-700/80 rounded-xl text-slate-200 placeholder-slate-500 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-all"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => onTestProvider(provider)}
                        disabled={test.loading}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-cyan-500/20 active:scale-95 disabled:opacity-50 whitespace-nowrap"
                      >
                        {test.loading ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Đang kiểm tra...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            <span>Kiểm tra</span>
                          </>
                        )}
                      </button>

                      {/* Status On/Off */}
                      <div className="pl-2 border-l border-slate-800 flex items-center" title={provider.enabled ? "Đang bật" : "Đang tắt"}>
                        {provider.enabled ? (
                          <ToggleRight className="w-6 h-6 text-emerald-400" />
                        ) : (
                          <ToggleLeft className="w-6 h-6 text-slate-600" />
                        )}
                      </div>
                    </div>

                    {/* Result Display Box */}
                    {(test.result || test.otp) && (
                      <div
                        className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-3 animate-in fade-in-50 duration-200 ${
                          test.isError
                            ? "bg-rose-950/30 border-rose-500/30 text-rose-300"
                            : "bg-cyan-950/30 border-cyan-500/30 text-cyan-200"
                        }`}
                      >
                        <div className="flex items-center gap-2 flex-1 overflow-hidden">
                          {test.isError ? (
                            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          )}

                          {test.otp ? (
                            <div className="flex items-center gap-2">
                              <span className="text-slate-400 text-[11px]">Mã OTP nhận được:</span>
                              <span className="font-mono text-base font-black text-cyan-300 tracking-wider px-2 py-0.5 rounded bg-slate-900 border border-cyan-500/40">
                                {test.otp}
                              </span>
                            </div>
                          ) : (
                            <span className="truncate">{test.result}</span>
                          )}
                        </div>

                        {test.otp && (
                          <button
                            type="button"
                            onClick={() => handleCopy(test.otp!, provider.key)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 text-[11px] font-bold transition-all"
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
    </div>
  );
};

