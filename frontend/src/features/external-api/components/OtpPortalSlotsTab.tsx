import React from "react";
import {
  Save,
  Loader2,
  ArrowRight,
  ShieldAlert,
  Layers,
  ArrowRightLeft,
  Sparkles,
  Info,
} from "lucide-react";
import type { PortalSlotItem } from "@/features/external-api/types";
import type { Provider } from "@/features/external-api/hooks/useExternalApiConfig";

interface OtpPortalSlotsTabProps {
  slots: PortalSlotItem[];
  providers: Provider[];
  savingSlots: boolean;
  onUpdateSlot: (
    slotKey: string,
    field: "primary_service_key" | "fallback_service_key",
    value: string
  ) => void;
  onSaveSlots: () => void;
}

export const OtpPortalSlotsTab: React.FC<OtpPortalSlotsTabProps> = ({
  slots,
  providers,
  savingSlots,
  onUpdateSlot,
  onSaveSlots,
}) => {
  return (
    <div className="space-y-5">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <h2 className="text-base font-bold text-white">Điều Hướng Cổng OTP Khách Hàng (Portal Routing)</h2>
          </div>
          <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
            Mỗi ô input trên trang nhận mã OTP của khách hàng sẽ được định tuyến tới Provider chính. Khi gặp sự cố hoặc timeout, hệ thống sẽ tự động chuyển hướng sang Provider dự phòng (Fallback).
          </p>
        </div>

        <button
          type="button"
          onClick={onSaveSlots}
          disabled={savingSlots}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition-all shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-50 whitespace-nowrap"
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

      {/* Slots List */}
      <div className="space-y-4">
        {slots.map((slot) => {
          const primaryProvider = providers.find((p) => p.key === slot.primary_service_key);
          const fallbackProvider = providers.find((p) => p.key === slot.fallback_service_key);

          const isPrimaryConfigured = primaryProvider?.configured;
          const isFallbackConfigured = fallbackProvider?.configured;

          return (
            <div
              key={slot.slot_key}
              className="p-5 rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-xl hover:border-slate-700/80 transition-all space-y-4"
            >
              {/* Slot Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800/60">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-100 text-base">{slot.name}</h3>
                    <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                      <span>Key: {slot.slot_key}</span>
                      <span>•</span>
                      <span className="uppercase text-cyan-400 font-sans font-semibold">
                        {slot.category}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-400">
                  {slot.cooldown_seconds && (
                    <span className="bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/50">
                      Cooldown: <strong className="text-white">{slot.cooldown_seconds}s</strong>
                    </span>
                  )}
                  {slot.btn_text && (
                    <span className="bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/50">
                      Nút: <strong className="text-white">{slot.btn_text}</strong>
                    </span>
                  )}
                </div>
              </div>

              {/* Pipeline Flow Visualization */}
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] items-center gap-3 pt-1">
                {/* Primary Provider Selector */}
                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-cyan-400" />
                      Provider Chính (Primary)
                    </span>
                    {slot.primary_service_key && !isPrimaryConfigured && (
                      <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30 flex items-center gap-1">
                        <ShieldAlert className="w-3 h-3" />
                        Chưa nạp env
                      </span>
                    )}
                  </div>

                  <select
                    value={slot.primary_service_key || ""}
                    onChange={(e) => onUpdateSlot(slot.slot_key, "primary_service_key", e.target.value)}
                    className="w-full text-xs font-medium bg-slate-900 border border-slate-700 focus:border-cyan-500 text-slate-200 rounded-lg p-2.5 outline-none cursor-pointer"
                  >
                    <option value="">-- Chưa chọn provider chính --</option>
                    {providers.map((p) => (
                      <option key={p.key} value={p.key}>
                        {p.name} ({p.key}) {p.configured ? "✓ Sẵn sàng" : "⚠️ Chưa cấu hình"}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Arrow Transfer */}
                <div className="hidden lg:flex flex-col items-center justify-center text-slate-500">
                  <ArrowRightLeft className="w-5 h-5 text-slate-500" />
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mt-1">
                    Fallback
                  </span>
                </div>

                {/* Fallback Provider Selector */}
                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-purple-400" />
                      Provider Dự Phòng (Fallback)
                    </span>
                    {slot.fallback_service_key && !isFallbackConfigured && (
                      <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30 flex items-center gap-1">
                        <ShieldAlert className="w-3 h-3" />
                        Chưa nạp env
                      </span>
                    )}
                  </div>

                  <select
                    value={slot.fallback_service_key || ""}
                    onChange={(e) => onUpdateSlot(slot.slot_key, "fallback_service_key", e.target.value)}
                    className="w-full text-xs font-medium bg-slate-900 border border-slate-700 focus:border-purple-500 text-slate-200 rounded-lg p-2.5 outline-none cursor-pointer"
                  >
                    <option value="">-- Không sử dụng fallback --</option>
                    {providers.map((p) => (
                      <option key={p.key} value={p.key}>
                        {p.name} ({p.key}) {p.configured ? "✓ Sẵn sàng" : "⚠️ Chưa cấu hình"}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Client Preview Hint */}
              <div className="text-[11px] text-slate-400 flex items-center gap-1.5 bg-slate-950/40 px-3 py-1.5 rounded-lg border border-slate-800/50">
                <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>Gợi ý ô nhập: {slot.input_placeholder || "Nhập thông tin xác thực..."}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
