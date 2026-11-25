import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Check,
  Search,
  Trash2,
  ExternalLink,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { CustomSelect, GlassCard, ToggleSwitch } from "@/shared/components";
import {
  CalendarCell,
  generateMonthCalendar,
} from "../../../shared/utils/lunarCalendar";
import {
  findNextRuleDate,
  getHolidayRuleForDate,
  resolveScheduledThemeForDate,
  ThemeCalendarType,
  ThemeDateRule,
  ThemeScheduleConfig,
} from "../../../shared/utils/themeSchedule";
import type { ThemeItem } from "../types";

interface CompactCalendarSectionProps {
  schedule: ThemeScheduleConfig;
  setSchedule: React.Dispatch<React.SetStateAction<ThemeScheduleConfig>>;
  themesList: ThemeItem[];
  portalBaseUrl: string;
}

interface DayPoint {
  day: number;
  month: number;
  year: number;
}

const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

const CALENDAR_TYPE_OPTIONS = [
  { value: "solar", label: "Dương lịch" },
  { value: "lunar", label: "Âm lịch" },
];

function toTimestamp(p: DayPoint): number {
  return Date.UTC(p.year, p.month - 1, p.day);
}

function normalizePoints(a: DayPoint, b: DayPoint): { start: DayPoint; end: DayPoint } {
  return toTimestamp(a) <= toTimestamp(b) ? { start: a, end: b } : { start: b, end: a };
}

export const CompactCalendarSection: React.FC<CompactCalendarSectionProps> = ({
  schedule,
  setSchedule,
  themesList,
  portalBaseUrl,
}) => {
  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth() + 1);

  const [dragStart, setDragStart] = useState<DayPoint | null>(null);
  const [dragEnd, setDragEnd] = useState<DayPoint | null>(null);
  const isDraggingRef = useRef(false);
  const dragAnchorRef = useRef<DayPoint | null>(null);

  // Form gán theme cho dải ngày đang chọn
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [calendarType, setCalendarType] = useState<ThemeCalendarType>("solar");
  const [startDay, setStartDay] = useState(now.getDate());
  const [startMonth, setStartMonth] = useState(now.getMonth() + 1);
  const [endDay, setEndDay] = useState(now.getDate());
  const [endMonth, setEndMonth] = useState(now.getMonth() + 1);
  const [selectedTheme, setSelectedTheme] = useState(themesList[0]?.id || "tet");
  const [ruleName, setRuleName] = useState("");
  const [themeSearch, setThemeSearch] = useState("");
  const [ruleSearch, setRuleSearch] = useState("");

  const monthCells = useMemo(
    () => generateMonthCalendar(calYear, calMonth),
    [calYear, calMonth]
  );

  const selectedRangeNormalized = useMemo(() => {
    if (!dragStart || !dragEnd) return null;
    return normalizePoints(dragStart, dragEnd);
  }, [dragStart, dragEnd]);

  const syncFormFromRange = (
    start: DayPoint,
    end: DayPoint,
    cellRule?: ThemeDateRule | null
  ) => {
    if (cellRule) {
      setEditingRuleId(cellRule.id);
      setCalendarType(cellRule.calendarType);
      setStartDay(cellRule.startDay);
      setStartMonth(cellRule.startMonth);
      setEndDay(cellRule.endDay);
      setEndMonth(cellRule.endMonth);
      setSelectedTheme(cellRule.theme);
      setRuleName(cellRule.name || "");
      return;
    }

    setEditingRuleId(null);
    setCalendarType("solar");
    setStartDay(start.day);
    setStartMonth(start.month);
    setEndDay(end.day);
    setEndMonth(end.month);
    setRuleName("");
  };

  useEffect(() => {
    const onWindowMouseUp = () => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
    };
    window.addEventListener("mouseup", onWindowMouseUp);
    return () => window.removeEventListener("mouseup", onWindowMouseUp);
  }, []);

  const toPoint = (cell: CalendarCell): DayPoint => ({
    day: cell.solarDay,
    month: cell.solarMonth,
    year: cell.solarYear,
  });

  const handleCellMouseDown = (
    e: React.MouseEvent,
    cell: CalendarCell
  ) => {
    const pt = toPoint(cell);

    // Giữ Shift + Click để kéo dài dải ngày qua các tháng khác nhau
    if (e.shiftKey && dragStart) {
      const norm = normalizePoints(dragStart, pt);
      setDragEnd(pt);
      syncFormFromRange(norm.start, norm.end);
      return;
    }

    isDraggingRef.current = true;
    dragAnchorRef.current = pt;
    setDragStart(pt);
    setDragEnd(pt);

    const existingRule = getHolidayRuleForDate(
      schedule,
      cell.solarDay,
      cell.solarMonth,
      cell.solarYear
    );
    syncFormFromRange(pt, pt, existingRule);
  };

  const handleCellMouseEnter = (cell: CalendarCell) => {
    if (!isDraggingRef.current || !dragAnchorRef.current) return;
    const pt = toPoint(cell);
    setDragEnd(pt);
    const norm = normalizePoints(dragAnchorRef.current, pt);
    syncFormFromRange(norm.start, norm.end);
  };

  const handleCellMouseUp = (cell: CalendarCell) => {
    if (!isDraggingRef.current || !dragAnchorRef.current) return;
    const pt = toPoint(cell);
    const norm = normalizePoints(dragAnchorRef.current, pt);
    setDragEnd(pt);
    isDraggingRef.current = false;

    const isSingleDay =
      norm.start.day === norm.end.day &&
      norm.start.month === norm.end.month &&
      norm.start.year === norm.end.year;

    const existingRule = isSingleDay
      ? getHolidayRuleForDate(schedule, cell.solarDay, cell.solarMonth, cell.solarYear)
      : null;
    syncFormFromRange(norm.start, norm.end, existingRule);
  };

  const isInSelectedRange = (cell: CalendarCell): boolean => {
    if (!selectedRangeNormalized) return false;
    const t = toTimestamp(toPoint(cell));
    return (
      t >= toTimestamp(selectedRangeNormalized.start) &&
      t <= toTimestamp(selectedRangeNormalized.end)
    );
  };

  const handlePrevMonth = () => {
    if (calMonth === 1) {
      setCalMonth(12);
      setCalYear((y) => y - 1);
    } else {
      setCalMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (calMonth === 12) {
      setCalMonth(1);
      setCalYear((y) => y + 1);
    } else {
      setCalMonth((m) => m + 1);
    }
  };

  const handleGoToday = () => {
    const t = new Date();
    setCalYear(t.getFullYear());
    setCalMonth(t.getMonth() + 1);
  };

  const applyRangeRule = () => {
    const id = editingRuleId || `custom-${Date.now()}`;
    const newRule: ThemeDateRule = {
      id,
      name: ruleName.trim() || undefined,
      calendarType,
      startDay: Math.min(31, Math.max(1, startDay)),
      startMonth: Math.min(12, Math.max(1, startMonth)),
      endDay: Math.min(31, Math.max(1, endDay)),
      endMonth: Math.min(12, Math.max(1, endMonth)),
      theme: selectedTheme,
      enabled: true,
    };

    setSchedule((curr) => {
      const exists = curr.holidayRules.some((r) => r.id === id);
      const nextRules = exists
        ? curr.holidayRules.map((r) => (r.id === id ? newRule : r))
        : [newRule, ...curr.holidayRules];
      return {
        ...curr,
        respectHolidays: true,
        holidayRules: nextRules,
      };
    });
    setEditingRuleId(id);
  };

  const deleteRule = (id: string) => {
    setSchedule((curr) => ({
      ...curr,
      holidayRules: curr.holidayRules.filter((r) => r.id !== id),
    }));
    if (editingRuleId === id) {
      setEditingRuleId(null);
    }
  };

  const jumpToRuleMonth = (rule: ThemeDateRule) => {
    const nextDate = findNextRuleDate(rule);
    if (nextDate) {
      setCalYear(nextDate.getUTCFullYear());
      setCalMonth(nextDate.getUTCMonth() + 1);
    } else if (rule.calendarType === "solar") {
      setCalMonth(rule.startMonth);
    }
    setEditingRuleId(rule.id);
    setCalendarType(rule.calendarType);
    setStartDay(rule.startDay);
    setStartMonth(rule.startMonth);
    setEndDay(rule.endDay);
    setEndMonth(rule.endMonth);
    setSelectedTheme(rule.theme);
    setRuleName(rule.name || "");
  };

  const filteredPickerThemes = useMemo(() => {
    const q = themeSearch.trim().toLowerCase();
    if (!q) return themesList;
    return themesList.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q) ||
        t.badge.toLowerCase().includes(q)
    );
  }, [themesList, themeSearch]);

  const filteredRules = useMemo(() => {
    const q = ruleSearch.trim().toLowerCase();
    if (!q) return schedule.holidayRules;
    return schedule.holidayRules.filter((r) => {
      const meta = themesList.find((t) => t.id === r.theme);
      return (
        r.id.toLowerCase().includes(q) ||
        (r.name?.toLowerCase().includes(q) ?? false) ||
        (meta?.name.toLowerCase().includes(q) ?? false)
      );
    });
  }, [schedule.holidayRules, ruleSearch, themesList]);

  const clampNum = (val: string, min: number, max: number) => {
    const n = Number(val);
    if (!Number.isFinite(n)) return min;
    return Math.min(max, Math.max(min, Math.trunc(n)));
  };

  return (
    <div className="space-y-4">
      {!schedule.respectHolidays && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-950/30 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Công tắc <strong>Ưu tiên dải ngày trên Lịch</strong> đang tắt — các dải ngày dưới đây sẽ tạm thời không kích hoạt cho tới khi bật lại.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSchedule((c) => ({ ...c, respectHolidays: true }))}
            className="px-3 py-1 rounded-lg bg-amber-500/20 border border-amber-400/50 text-amber-200 font-bold hover:bg-amber-500/30 cursor-pointer"
          >
            Bật ưu tiên Lịch ngay
          </button>
        </div>
      )}

      {/* Hàng 1: Lịch ô nhỏ (trái) + Panel gán Theme (phải) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Lưới Lịch */}
        <GlassCard className="lg:col-span-7 p-4 flex flex-col h-full space-y-2.5 select-none">
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-extrabold text-white">
                Tháng {calMonth} / {calYear}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-600 cursor-pointer"
                title="Tháng trước"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleGoToday}
                className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-bold text-cyan-300 hover:border-cyan-500/50 cursor-pointer"
              >
                Hôm nay
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-600 cursor-pointer"
                title="Tháng sau"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <p className="text-[11px] text-slate-400">
            Nhấn giữ &amp; kéo qua dãy ngày muốn đổi (hoặc giữ <kbd className="px-1 py-0.5 rounded bg-slate-900 border border-slate-700 text-[10px]">Shift</kbd> + Click sang tháng khác), sau đó chọn Theme ở bảng bên phải.
          </p>

          {/* Header Thứ */}
          <div className="grid grid-cols-7 gap-1 text-center text-[10.5px] font-bold text-slate-400 pt-1">
            {WEEKDAYS.map((d, idx) => (
              <div key={d} className={idx === 6 ? "text-rose-400" : ""}>
                {d}
              </div>
            ))}
          </div>

          {/* Grid các ô ngày giãn vừa khít khung Lịch */}
          <div className="grid grid-cols-7 gap-1.5 flex-1 auto-rows-fr">
            {monthCells.map((cell) => {
              const resolved = resolveScheduledThemeForDate(
                schedule,
                cell.solarDay,
                cell.solarMonth,
                cell.solarYear
              );
              const themeMeta = themesList.find((t) => t.id === resolved.themeKey);
              const inRange = isInSelectedRange(cell);
              const isHolidayCell = resolved.ruleType === "holiday";

              return (
                <button
                  key={`${cell.solarYear}-${cell.solarMonth}-${cell.solarDay}`}
                  type="button"
                  onMouseDown={(e) => handleCellMouseDown(e, cell)}
                  onMouseEnter={() => handleCellMouseEnter(cell)}
                  onMouseUp={() => handleCellMouseUp(cell)}
                  title={`${cell.solarDay}/${cell.solarMonth}/${cell.solarYear} (Âm ${cell.lunar.day}/${cell.lunar.month}) — ${themeMeta?.name || resolved.themeKey} [${resolved.label}]`}
                  className={`relative min-h-[68px] h-full rounded-lg border px-2 py-1.5 flex flex-col justify-between text-left transition-all cursor-pointer ${
                    inRange
                      ? "border-cyan-400 bg-cyan-500/25 ring-1 ring-cyan-400/60"
                      : cell.isToday
                      ? "border-emerald-400/80 bg-emerald-950/35"
                      : isHolidayCell
                      ? "border-amber-500/40 bg-slate-900/90 hover:border-amber-400/70"
                      : "border-slate-800/80 bg-slate-950/60 hover:border-slate-600"
                  } ${!cell.isCurrentMonth ? "opacity-40" : ""}`}
                >
                  <div className="flex items-center justify-between w-full leading-none">
                    <span
                      className={`text-xs sm:text-[13px] font-extrabold ${
                        cell.isToday
                          ? "text-emerald-300"
                          : cell.isSunday
                          ? "text-rose-300"
                          : "text-slate-100"
                      }`}
                    >
                      {cell.solarDay}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {cell.lunar.day === 1
                        ? `${cell.lunar.day}/${cell.lunar.month}`
                        : cell.lunar.day}
                    </span>
                  </div>

                  {/* Thanh màu & icon hiển thị theme chạy ngày đó */}
                  <div className="flex items-center justify-between w-full pt-1">
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ background: themeMeta?.accent || "#22d3ee" }}
                    />
                    <span className="text-sm leading-none select-none">
                      {themeMeta?.icon || "✨"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </GlassCard>

        {/* Panel Gán Theme cho Dải Ngày Vừa Kéo */}
        <GlassCard className="lg:col-span-5 p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">
                {editingRuleId ? "Sửa Dải Ngày Đã Gán" : "Gán Theme Cho Dải Ngày"}
              </h3>
            </div>
            {editingRuleId && (
              <button
                type="button"
                onClick={() => setEditingRuleId(null)}
                className="text-[11px] font-semibold text-cyan-400 hover:underline cursor-pointer"
              >
                + Tạo dải mới
              </button>
            )}
          </div>

          {/* Khoảng ngày + loại lịch */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-slate-400">
                Loại lịch
              </label>
              <CustomSelect
                value={calendarType}
                onChange={(val) => setCalendarType(val as ThemeCalendarType)}
                options={CALENDAR_TYPE_OPTIONS}
                size="sm"
                accent="cyan"
                ariaLabel="Loại lịch"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-slate-400">
                Tên ghi chú (tùy chọn)
              </label>
              <input
                type="text"
                value={ruleName}
                onChange={(e) => setRuleName(e.target.value)}
                placeholder="VD: Đợt sale tháng 12..."
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 text-xs">
            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-slate-400">
                Từ ngày / tháng
              </label>
              <div className="flex items-center gap-1 font-mono">
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={startDay}
                  onChange={(e) => setStartDay(clampNum(e.target.value, 1, 31))}
                  className="w-full px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-center text-white focus:border-cyan-500 focus:outline-none"
                />
                <span className="text-slate-500">/</span>
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={startMonth}
                  onChange={(e) => setStartMonth(clampNum(e.target.value, 1, 12))}
                  className="w-full px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-center text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-slate-400">
                Đến ngày / tháng
              </label>
              <div className="flex items-center gap-1 font-mono">
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={endDay}
                  onChange={(e) => setEndDay(clampNum(e.target.value, 1, 31))}
                  className="w-full px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-center text-white focus:border-cyan-500 focus:outline-none"
                />
                <span className="text-slate-500">/</span>
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={endMonth}
                  onChange={(e) => setEndMonth(clampNum(e.target.value, 1, 12))}
                  className="w-full px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-center text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Bảng chọn nhanh Theme */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-slate-400">
                Chọn Theme cho dải ngày trên:
              </span>
              <div className="relative">
                <Search className="w-3 h-3 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={themeSearch}
                  onChange={(e) => setThemeSearch(e.target.value)}
                  placeholder="Tìm nhanh..."
                  className="pl-6 pr-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-white placeholder-slate-500 w-32 focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="max-h-52 overflow-y-auto rounded-xl border border-slate-800/90 divide-y divide-slate-800/60 bg-slate-950/60">
              {filteredPickerThemes.map((t) => {
                const isPicked = selectedTheme === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTheme(t.id)}
                    className={`px-3 py-2 flex items-center justify-between gap-2 text-xs cursor-pointer transition-colors ${
                      isPicked
                        ? "bg-cyan-500/20 text-cyan-200"
                        : "hover:bg-slate-900/70 text-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 ${
                          isPicked
                            ? "bg-cyan-400 border-cyan-300 text-slate-950"
                            : "border-slate-700 bg-slate-900 text-transparent"
                        }`}
                      >
                        <Check className="w-3 h-3" />
                      </span>
                      <span>{t.icon}</span>
                      <span className="font-semibold truncate">{t.name}</span>
                    </div>

                    <a
                      href={`${portalBaseUrl}?theme=${encodeURIComponent(t.id)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-[11px] text-cyan-400 hover:underline shrink-0 inline-flex items-center gap-1"
                    >
                      <span>Xem</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={applyRangeRule}
            className="w-full py-2 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 text-xs font-bold text-white shadow-md hover:brightness-110 transition-all cursor-pointer"
          >
            {editingRuleId
              ? "Cập nhật dải ngày này lên Lịch"
              : `Áp dụng cho ngày ${startDay}/${startMonth} → ${endDay}/${endMonth}`}
          </button>
        </GlassCard>
      </div>

      {/* Hàng 2: Bảng danh sách các dải ngày đang có trên Lịch */}
      <GlassCard className="p-0 overflow-hidden border border-slate-800/90">
        <div className="p-3.5 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-bold text-white">
            Danh sách dải ngày đang gán trên Lịch ({schedule.holidayRules.filter((r) => r.enabled).length}/{schedule.holidayRules.length} đang bật)
          </span>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={ruleSearch}
              onChange={(e) => setRuleSearch(e.target.value)}
              placeholder="Lọc theo tên hoặc theme..."
              className="pl-8 pr-3 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 w-48 focus:border-cyan-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto max-h-64 overflow-y-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 z-10 bg-slate-900 border-b border-slate-800 text-slate-300 font-bold">
              <tr>
                <th className="py-2.5 px-4 w-[70px]">Bật</th>
                <th className="py-2.5 px-4 w-[170px]">Khoảng ngày</th>
                <th className="py-2.5 px-4 w-[110px]">Lịch</th>
                <th className="py-2.5 px-4">Theme / Ghi chú</th>
                <th className="py-2.5 px-4 text-right w-[130px]">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredRules.map((rule) => {
                const meta = themesList.find((t) => t.id === rule.theme);
                return (
                  <tr
                    key={rule.id}
                    className={`transition-colors ${
                      rule.enabled ? "hover:bg-slate-900/45" : "opacity-50"
                    }`}
                  >
                    <td className="py-2 px-4">
                      <ToggleSwitch
                        checked={rule.enabled}
                        onChange={(checked) =>
                          setSchedule((curr) => ({
                            ...curr,
                            holidayRules: curr.holidayRules.map((r) =>
                              r.id === rule.id ? { ...r, enabled: checked } : r
                            ),
                          }))
                        }
                        variant="emerald"
                        size="sm"
                      />
                    </td>

                    <td className="py-2 px-4 font-mono font-semibold text-amber-300">
                      {rule.startDay}/{rule.startMonth} → {rule.endDay}/{rule.endMonth}
                    </td>

                    <td className="py-2 px-4 text-slate-300">
                      {rule.calendarType === "lunar" ? "Âm lịch" : "Dương lịch"}
                    </td>

                    <td className="py-2 px-4">
                      <div className="flex items-center gap-2">
                        <span>{meta?.icon}</span>
                        <span className="font-bold text-white">
                          {meta?.name || rule.theme}
                        </span>
                        {rule.name && (
                          <span className="text-slate-400">• {rule.name}</span>
                        )}
                      </div>
                    </td>

                    <td className="py-2 px-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => jumpToRuleMonth(rule)}
                          className="text-cyan-400 hover:underline font-semibold cursor-pointer"
                        >
                          Xem / Sửa
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteRule(rule.id)}
                          className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/15 cursor-pointer"
                          title="Xóa dải ngày"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
};
