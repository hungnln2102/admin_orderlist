import React, { useMemo, useState } from "react";
import {
  Lock,
  Repeat,
  Sun,
  Check,
  Search,
  ExternalLink,
  ArrowUp,
  ArrowDown,
  X,
  CalendarHeart,
} from "lucide-react";
import { CustomSelect, GlassCard, ToggleSwitch } from "@/shared/components";
import type {
  ThemeBackgroundMode,
  ThemeScheduleConfig,
} from "../../../shared/utils/themeSchedule";
import type { SeasonFilter, ThemeItem } from "../types";

interface FixedCycleSectionProps {
  schedule: ThemeScheduleConfig;
  setSchedule: React.Dispatch<React.SetStateAction<ThemeScheduleConfig>>;
  themesList: ThemeItem[];
  portalBaseUrl: string;
}

const SEASON_FILTERS: Array<{ id: SeasonFilter; label: string }> = [
  { id: "all", label: "Tất cả" },
  { id: "spring", label: "Xuân" },
  { id: "summer", label: "Hạ" },
  { id: "autumn", label: "Thu" },
  { id: "winter", label: "Đông" },
  { id: "modern", label: "Cyber" },
];

const SEASON_LABELS: Record<string, { label: string; months: string }> = {
  spring: { label: "Mùa Xuân", months: "Tháng 1 – 3" },
  summer: { label: "Mùa Hạ", months: "Tháng 4 – 6" },
  autumn: { label: "Mùa Thu", months: "Tháng 7 – 9" },
  winter: { label: "Mùa Đông", months: "Tháng 10 – 12" },
};

const INTERVAL_PRESETS = [
  { days: 7, label: "7 ngày (Mỗi tuần)" },
  { days: 14, label: "14 ngày (2 tuần)" },
  { days: 30, label: "30 ngày (Mỗi tháng)" },
  { days: 91, label: "91 ngày (4 lượt / năm)" },
];

export const FixedCycleSection: React.FC<FixedCycleSectionProps> = ({
  schedule,
  setSchedule,
  themesList,
  portalBaseUrl,
}) => {
  const [search, setSearch] = useState("");
  const [seasonFilter, setSeasonFilter] = useState<SeasonFilter>("all");

  const mode = schedule.backgroundMode;
  const cycleThemes = schedule.cycleConfig.themes;

  const setBackgroundMode = (nextMode: ThemeBackgroundMode) => {
    setSchedule((curr) => ({ ...curr, backgroundMode: nextMode }));
  };

  const filteredThemes = useMemo(() => {
    const query = search.trim().toLowerCase();
    return themesList.filter((item) => {
      if (seasonFilter !== "all" && item.season !== seasonFilter) return false;
      if (!query) return true;
      return (
        item.name.toLowerCase().includes(query) ||
        item.id.toLowerCase().includes(query) ||
        item.badge.toLowerCase().includes(query)
      );
    });
  }, [themesList, seasonFilter, search]);

  const themeOptions = useMemo(
    () =>
      themesList.map((t) => ({
        value: t.id,
        label: `${t.icon} ${t.name}`,
      })),
    [themesList]
  );

  const toggleCycleTheme = (themeId: string) => {
    setSchedule((curr) => {
      const exists = curr.cycleConfig.themes.includes(themeId);
      const nextThemes = exists
        ? curr.cycleConfig.themes.filter((id) => id !== themeId)
        : [...curr.cycleConfig.themes, themeId];
      return {
        ...curr,
        cycleConfig: {
          ...curr.cycleConfig,
          themes: nextThemes,
        },
      };
    });
  };

  const moveCycleTheme = (index: number, delta: -1 | 1) => {
    setSchedule((curr) => {
      const list = [...curr.cycleConfig.themes];
      const target = index + delta;
      if (target < 0 || target >= list.length) return curr;
      [list[index], list[target]] = [list[target], list[index]];
      return {
        ...curr,
        cycleConfig: {
          ...curr.cycleConfig,
          themes: list,
        },
      };
    });
  };

  const updateCycleField = (
    patch: Partial<ThemeScheduleConfig["cycleConfig"]>
  ) => {
    setSchedule((curr) => ({
      ...curr,
      cycleConfig: {
        ...curr.cycleConfig,
        ...patch,
      },
    }));
  };

  const updateSeasonTheme = (seasonId: string, theme: string) => {
    setSchedule((curr) => ({
      ...curr,
      seasonRules: curr.seasonRules.map((s) =>
        s.id === seasonId ? { ...s, theme } : s
      ),
    }));
  };

  return (
    <div className="space-y-4">
      {/* 1. Chọn kiểu cố định (3 chế độ) + Công tắc ưu tiên Lịch */}
      <GlassCard className="p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => setBackgroundMode("fixed_default")}
            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
              mode === "fixed_default"
                ? "border-cyan-500/70 bg-cyan-950/25 ring-1 ring-cyan-500/30"
                : "border-slate-800 bg-slate-950/50 hover:border-slate-700"
            }`}
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                mode === "fixed_default"
                  ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-300"
                  : "bg-slate-900 border-slate-800 text-slate-400"
              }`}
            >
              <Lock className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-white">Cố định cả năm (1 Theme)</div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Chạy cố định 1 giao diện duy nhất quanh năm.
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setBackgroundMode("cycle_loop")}
            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
              mode === "cycle_loop"
                ? "border-purple-500/70 bg-purple-950/25 ring-1 ring-purple-500/30"
                : "border-slate-800 bg-slate-950/50 hover:border-slate-700"
            }`}
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                mode === "cycle_loop"
                  ? "bg-purple-500/15 border-purple-500/40 text-purple-300"
                  : "bg-slate-900 border-slate-800 text-slate-400"
              }`}
            >
              <Repeat className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-white">
                Cố định theo chu kỳ / vòng lặp
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Tick nhiều theme (vd 4 themes/năm) và tự xoay vòng mỗi N ngày.
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setBackgroundMode("seasonal_4seasons")}
            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
              mode === "seasonal_4seasons"
                ? "border-emerald-500/70 bg-emerald-950/25 ring-1 ring-emerald-500/30"
                : "border-slate-800 bg-slate-950/50 hover:border-slate-700"
            }`}
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                mode === "seasonal_4seasons"
                  ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                  : "bg-slate-900 border-slate-800 text-slate-400"
              }`}
            >
              <Sun className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-white">Cố định theo 4 mùa</div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Gán cố định 4 themes cho Xuân, Hạ, Thu, Đông trong năm.
              </p>
            </div>
          </button>
        </div>

        {/* Công tắc ưu tiên Lịch */}
        <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <CalendarHeart className="w-4 h-4 text-rose-400 shrink-0" />
            <span>
              <strong>Ưu tiên dải ngày trên Lịch:</strong>{" "}
              <span className="text-slate-400">
                {schedule.respectHolidays
                  ? "Đang bật — Đến ngày lễ hoặc dải ngày bạn kéo trên Lịch sẽ tự ưu tiên chạy theme của Lịch."
                  : "Đang tắt — Khóa cứng 100% theo lựa chọn cố định/chu kỳ bên dưới, bỏ qua mọi ngày trên Lịch."}
              </span>
            </span>
          </div>

          <ToggleSwitch
            checked={schedule.respectHolidays}
            onChange={(checked) =>
              setSchedule((curr) => ({ ...curr, respectHolidays: checked }))
            }
            variant="emerald"
            size="sm"
          />
        </div>
      </GlassCard>

      {/* 2A. Nếu chọn CỐ ĐỊNH THEO 4 MÙA -> Bảng 4 dòng gọn */}
      {mode === "seasonal_4seasons" && (
        <GlassCard className="p-0 overflow-hidden border border-slate-800/90">
          <div className="p-4 border-b border-slate-800/80">
            <h2 className="text-sm font-bold text-white">
              Cố Định 4 Themes Theo 4 Mùa Trong Năm
            </h2>
            <p className="text-xs text-slate-400">
              Chọn theme riêng cho từng mùa (Xuân, Hạ, Thu, Đông).
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-900/80 border-b border-slate-800 font-bold text-slate-300">
                  <th className="py-3 px-4 w-[160px]">Mùa</th>
                  <th className="py-3 px-4 w-[150px]">Khoảng tháng</th>
                  <th className="py-3 px-4">Theme áp dụng</th>
                  <th className="py-3 px-4 text-right w-[110px]">Xem thử</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {schedule.seasonRules.map((season) => {
                  const info = SEASON_LABELS[season.id] || {
                    label: season.id,
                    months: `Tháng ${season.startMonth} – ${season.endMonth}`,
                  };
                  return (
                    <tr key={season.id} className="hover:bg-slate-900/40">
                      <td className="py-3 px-4 font-bold text-white">{info.label}</td>
                      <td className="py-3 px-4 text-slate-400">{info.months}</td>
                      <td className="py-3 px-4 min-w-[240px]">
                        <CustomSelect
                          value={season.theme}
                          onChange={(val) => updateSeasonTheme(season.id, val)}
                          options={themeOptions}
                          searchable
                          size="sm"
                          accent="emerald"
                          ariaLabel={`Chọn theme cho ${info.label}`}
                        />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <a
                          href={`${portalBaseUrl}?theme=${encodeURIComponent(season.theme)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-semibold"
                        >
                          <span>Xem</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}

      {/* 2B. Nếu chọn THEO CHU KỲ -> Khung cấu hình nhịp đổi & thứ tự vòng lặp */}
      {mode === "cycle_loop" && (
        <GlassCard className="p-4 space-y-4 border border-purple-500/30">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
            <div className="lg:col-span-6 space-y-1.5">
              <label className="block text-xs font-bold text-slate-200">
                Chu kỳ đổi Theme (số ngày mỗi lượt)
              </label>
              <div className="flex flex-wrap items-center gap-1.5">
                {INTERVAL_PRESETS.map((preset) => {
                  const active = schedule.cycleConfig.intervalDays === preset.days;
                  return (
                    <button
                      key={preset.days}
                      type="button"
                      onClick={() => updateCycleField({ intervalDays: preset.days })}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                        active
                          ? "bg-purple-500/25 border-purple-400 text-purple-200"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="lg:col-span-3 space-y-1.5">
              <label className="block text-xs font-bold text-slate-200">
                Hoặc nhập số ngày
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={366}
                  value={schedule.cycleConfig.intervalDays}
                  onChange={(e) =>
                    updateCycleField({
                      intervalDays: Math.min(366, Math.max(1, Number(e.target.value) || 1)),
                    })
                  }
                  className="w-24 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs font-mono font-bold text-white focus:border-purple-400 focus:outline-none"
                />
                <span className="text-xs text-slate-400">ngày / theme</span>
              </div>
            </div>

            <div className="lg:col-span-3 space-y-1.5">
              <label className="block text-xs font-bold text-slate-200">
                Ngày bắt đầu vòng lặp
              </label>
              <input
                type="date"
                value={schedule.cycleConfig.startDate}
                onChange={(e) => updateCycleField({ startDate: e.target.value })}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs font-mono text-white focus:border-purple-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Hàng thứ tự vòng lặp đang chọn */}
          <div className="pt-3 border-t border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-purple-300">
                Thứ tự xoay vòng ({cycleThemes.length} themes đã tick bên dưới):
              </span>
              {cycleThemes.length > 0 && (
                <span className="text-[11px] text-slate-400">
                  1 vòng lặp = {cycleThemes.length * schedule.cycleConfig.intervalDays} ngày
                </span>
              )}
            </div>

            {cycleThemes.length === 0 ? (
              <p className="text-xs text-amber-300">
                Chưa chọn theme nào. Hãy tick chọn các theme trong bảng bên dưới.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {cycleThemes.map((id, idx) => {
                  const meta = themesList.find((t) => t.id === id);
                  return (
                    <div
                      key={`${id}-${idx}`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 border border-purple-500/40 text-xs"
                    >
                      <span className="w-4 h-4 rounded-full bg-purple-500/25 text-purple-300 font-bold text-[10px] flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span>{meta?.icon}</span>
                      <span className="font-semibold text-white">{meta?.name || id}</span>
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => moveCycleTheme(idx, -1)}
                        className="p-0.5 text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
                        title="Đưa lên trước"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === cycleThemes.length - 1}
                        onClick={() => moveCycleTheme(idx, 1)}
                        className="p-0.5 text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
                        title="Đưa xuống sau"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleCycleTheme(id)}
                        className="p-0.5 text-slate-400 hover:text-rose-400 cursor-pointer"
                        title="Bỏ khỏi chu kỳ"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </GlassCard>
      )}

      {/* 2C. Bảng tick chọn Theme (dùng cho cả "Cố định cả năm" lẫn "Theo chu kỳ") */}
      {(mode === "fixed_default" || mode === "cycle_loop") && (
        <GlassCard className="p-0 overflow-hidden border border-slate-800/90">
          <div className="p-4 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-white">
                {mode === "fixed_default"
                  ? "Bảng Chọn 1 Theme Cố Định Cả Năm"
                  : "Bảng Tick Chọn Danh Sách Themes Cho Chu Kỳ"}
              </h2>
              <p className="text-xs text-slate-400">
                {mode === "fixed_default"
                  ? "Bấm vào dòng hoặc ô chọn để cố định 1 theme."
                  : "Tick nhiều theme muốn luân phiên chạy trong chu kỳ."}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm theme..."
                  className="pl-8 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 w-40 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-slate-950 border border-slate-800">
                {SEASON_FILTERS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setSeasonFilter(f.id)}
                    className={`px-2 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                      seasonFilter === f.id
                        ? "bg-cyan-500 text-slate-950"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 z-10 bg-slate-900 border-b border-slate-800 text-slate-300 font-bold">
                <tr>
                  <th className="py-2.5 px-4 w-[70px]">Chọn</th>
                  <th className="py-2.5 px-4">Theme</th>
                  <th className="py-2.5 px-4 w-[180px]">Nhóm / Dịp</th>
                  <th className="py-2.5 px-4 w-[110px]">Màu chủ đạo</th>
                  <th className="py-2.5 px-4 text-right w-[90px]">Xem thử</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredThemes.map((item) => {
                  const isChecked =
                    mode === "fixed_default"
                      ? schedule.defaultTheme === item.id
                      : cycleThemes.includes(item.id);
                  const orderIndex =
                    mode === "cycle_loop" ? cycleThemes.indexOf(item.id) : -1;

                  const handleRowClick = () => {
                    if (mode === "fixed_default") {
                      setSchedule((curr) => ({ ...curr, defaultTheme: item.id }));
                    } else {
                      toggleCycleTheme(item.id);
                    }
                  };

                  return (
                    <tr
                      key={item.id}
                      onClick={handleRowClick}
                      className={`cursor-pointer transition-colors ${
                        isChecked
                          ? mode === "cycle_loop"
                            ? "bg-purple-950/25 hover:bg-purple-950/35"
                            : "bg-cyan-950/25 hover:bg-cyan-950/35"
                          : "hover:bg-slate-900/50"
                      }`}
                    >
                      <td className="py-2.5 px-4">
                        <span
                          className={`inline-flex items-center justify-center w-5 h-5 rounded-md border text-[10px] font-extrabold transition-colors ${
                            isChecked
                              ? mode === "cycle_loop"
                                ? "bg-purple-500 border-purple-400 text-white"
                                : "bg-cyan-500 border-cyan-400 text-slate-950"
                              : "bg-slate-950 border-slate-700 text-transparent"
                          }`}
                        >
                          {mode === "cycle_loop" && orderIndex >= 0 ? (
                            orderIndex + 1
                          ) : (
                            <Check className="w-3.5 h-3.5" />
                          )}
                        </span>
                      </td>

                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <span className="text-base">{item.icon}</span>
                          <div>
                            <div className="font-bold text-white">{item.name}</div>
                            <div className="text-[10.5px] text-slate-500 font-mono">
                              #{item.id}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-2.5 px-4 text-slate-400">{item.badge}</td>

                      <td className="py-2.5 px-4">
                        <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-slate-300">
                          <span
                            className="w-3 h-3 rounded-full border border-white/20 shrink-0"
                            style={{ background: item.accent }}
                          />
                          {item.accent}
                        </span>
                      </td>

                      <td className="py-2.5 px-4 text-right">
                        <a
                          href={`${portalBaseUrl}?theme=${encodeURIComponent(item.id)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-semibold"
                        >
                          <span>Xem</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}
    </div>
  );
};
