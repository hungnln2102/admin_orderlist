import React from "react";
import {
  Save,
  Loader2,
  ShieldAlert,
  Layers,
  Sparkles,
  Info,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  Power,
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
  return (
    <div className="space-y-5">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <h2 className="text-base font-bold text-white">
              Điều Hướng & Gán Đa Cổng NCC Cho Ô Input (Multi-Provider Routing)
            </h2>
          </div>
          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
            Mỗi ô input trên cổng OTP khách hàng có thể gắn nhiều Cổng Dịch Vụ / Nhà Cung Cấp (NCC) khác nhau không giới hạn. Hệ thống sẽ lần lượt xử lý theo thứ tự ưu tiên từ trên xuống dưới; mỗi NCC dùng cơ chế đọc OTP hoặc kiểm tra trạng thái riêng biệt.
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
          const assignedServices = Array.isArray(slot.assigned_services)
            ? slot.assigned_services
            : [slot.primary_service_key, slot.fallback_service_key].filter(
                (k): k is string => Boolean(k)
              );

          const availableToAdd = providers.filter(
            (p) => !assignedServices.includes(p.key)
          );

          const isEnabled = slot.enabled !== false;

          return (
            <div
              key={slot.slot_key}
              className={`p-5 rounded-2xl border backdrop-blur-xl transition-all space-y-4 ${
                isEnabled
                  ? "border-slate-800/80 bg-slate-900/60 hover:border-slate-700/80"
                  : "border-slate-800/40 bg-slate-950/50 opacity-75"
              }`}
            >
              {/* Slot Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/60">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-100 text-base">{slot.name}</h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                        {assignedServices.length} cổng
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                      <span>Key: {slot.slot_key}</span>
                      <span>•</span>
                      <span className="uppercase text-cyan-400 font-sans font-semibold">
                        {slot.category}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                  {slot.cooldown_seconds !== undefined && (
                    <span className="bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/50">
                      Cooldown: <strong className="text-white">{slot.cooldown_seconds}s</strong>
                    </span>
                  )}
                  {slot.btn_text && (
                    <span className="bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/50">
                      Nút: <strong className="text-white">{slot.btn_text}</strong>
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => onToggleEnabled(slot.slot_key, !isEnabled)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold transition-all ${
                      isEnabled
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                        : "bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200"
                    }`}
                  >
                    <Power className="w-3 h-3" />
                    <span>{isEnabled ? "Đang Bật" : "Tạm Tắt"}</span>
                  </button>
                </div>
              </div>

              {/* Assigned Providers Chain */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                    Danh sách Cổng Dịch Vụ / NCC được gán (Thứ tự ưu tiên từ trên xuống)
                  </span>
                </div>

                {assignedServices.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-amber-500/30 bg-amber-500/5 text-center text-xs text-amber-300">
                    Chưa có Cổng / NCC nào được gắn cho ô input này. Hãy chọn cổng ở ô bên dưới để thêm vào chuỗi xử lý.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {assignedServices.map((serviceKey, idx) => {
                      const provider = providers.find((p) => p.key === serviceKey);
                      const isConfigured = provider ? provider.configured : false;

                      return (
                        <div
                          key={serviceKey}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl bg-slate-950/75 border border-slate-800 hover:border-slate-700 transition-all"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="w-6 h-6 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                              #{idx + 1}
                            </span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-sm text-slate-100 truncate">
                                  {provider?.name || serviceKey}
                                </span>
                                <span className="text-[11px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                                  {serviceKey}
                                </span>
                                {provider?.category && (
                                  <span className="text-[10px] uppercase font-bold text-cyan-400/90 bg-cyan-950/50 px-1.5 py-0.5 rounded border border-cyan-500/20">
                                    {provider.category}
                                  </span>
                                )}
                              </div>
                              {provider?.description && (
                                <p className="text-[11px] text-slate-400 truncate mt-0.5">
                                  {provider.description}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                            {isConfigured ? (
                              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1 font-semibold">
                                <CheckCircle2 className="w-3 h-3" />
                                Sẵn sàng
                              </span>
                            ) : (
                              <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30 flex items-center gap-1 font-semibold">
                                <ShieldAlert className="w-3 h-3" />
                                Chưa cấu hình
                              </span>
                            )}

                            <div className="flex items-center gap-1 border-l border-slate-800 pl-2">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => onMoveService(slot.slot_key, idx, idx - 1)}
                                title="Tăng độ ưu tiên (Lên)"
                                className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-cyan-300 hover:border-cyan-500/40 disabled:opacity-30 disabled:pointer-events-none transition-all"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={idx === assignedServices.length - 1}
                                onClick={() => onMoveService(slot.slot_key, idx, idx + 1)}
                                title="Giảm độ ưu tiên (Xuống)"
                                className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-cyan-300 hover:border-cyan-500/40 disabled:opacity-30 disabled:pointer-events-none transition-all"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onRemoveService(slot.slot_key, serviceKey)}
                                title="Gỡ cổng này khỏi ô input"
                                className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-rose-400 hover:bg-rose-500/15 hover:border-rose-500/40 transition-all"
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

                {/* Add Service Dropdown */}
                <div className="pt-1 flex items-center gap-2">
                  <div className="relative flex-1 max-w-md">
                    <Plus className="w-3.5 h-3.5 text-cyan-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <select
                      value=""
                      disabled={availableToAdd.length === 0}
                      onChange={(e) => {
                        if (e.target.value) {
                          onAddService(slot.slot_key, e.target.value);
                        }
                      }}
                      className="w-full text-xs font-medium bg-slate-950 border border-slate-700/80 hover:border-cyan-500/50 focus:border-cyan-500 text-slate-200 rounded-xl pl-8 pr-3 py-2.5 outline-none cursor-pointer disabled:opacity-50"
                    >
                      <option value="">
                        {availableToAdd.length === 0
                          ? "-- Đã gắn toàn bộ các cổng khả dụng --"
                          : "-- Chọn để gắn thêm Cổng Dịch Vụ / NCC vào ô này --"}
                      </option>
                      {availableToAdd.map((p) => (
                        <option key={p.key} value={p.key}>
                          + {p.name} ({p.key}) • {p.category} {p.configured ? "✓" : "⚠️"}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Client Preview Hint */}
              <div className="text-[11px] text-slate-400 flex items-center gap-1.5 bg-slate-950/40 px-3 py-1.5 rounded-lg border border-slate-800/50">
                <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>Gợi ý ô nhập trên web: {slot.input_placeholder || "Nhập thông tin xác thực..."}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
