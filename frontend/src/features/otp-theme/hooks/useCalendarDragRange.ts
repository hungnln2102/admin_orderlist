import { useState, useRef, useEffect } from "react";
import { CalendarCell, generateMonthCalendar } from "../../../shared/utils/lunarCalendar";
import { getHolidayRuleForDate, ThemeDateRule, ThemeScheduleConfig } from "../../../shared/utils/themeSchedule";
import { HolidayFormState, RangeSelection, ThemeItem } from "../types";

export function useCalendarDragRange(
  schedule: ThemeScheduleConfig,
  setSchedule: React.Dispatch<React.SetStateAction<ThemeScheduleConfig>>,
  themesList: ThemeItem[],
  onSaveSchedule: (updatedSchedule: ThemeScheduleConfig) => Promise<void>,
  showToast: (type: "success" | "error", message: string) => void
) {
  const now = new Date();
  const [calYear, setCalYear] = useState<number>(now.getFullYear());
  const [calMonth, setCalMonth] = useState<number>(now.getMonth() + 1);
  const [selectedDayCell, setSelectedDayCell] = useState<CalendarCell | null>(null);

  const [selectedRange, setSelectedRange] = useState<RangeSelection | null>(null);
  const [isConfiguringHoliday, setIsConfiguringHoliday] = useState<boolean>(false);
  const [holidayForm, setHolidayForm] = useState<HolidayFormState>({
    theme: "tet",
    calendarType: "solar",
    startMonth: 1,
    startDay: 1,
    endMonth: 1,
    endDay: 1,
    holidayName: "",
    enabled: true,
  });

  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMouseDownRef = useRef<boolean>(false);
  const dragStartCellRef = useRef<CalendarCell | null>(null);
  const hasDraggedRef = useRef<boolean>(false);

  // Điều hướng tháng
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
    const today = new Date();
    setCalYear(today.getFullYear());
    setCalMonth(today.getMonth() + 1);
    const cells = generateMonthCalendar(today.getFullYear(), today.getMonth() + 1);
    const todayCell = cells.find((c) => c.isToday) || null;
    setSelectedDayCell(todayCell);
    setSelectedRange(null);
    setIsConfiguringHoliday(false);
  };

  // Danh sách các cells của tháng
  const monthCells = generateMonthCalendar(calYear, calMonth).map((cell) => {
    const rule = getHolidayRuleForDate(schedule, cell.solarDay, cell.solarMonth, cell.solarYear);
    if (!rule) return { ...cell, holidayTheme: null };
    const theme = themesList.find((item) => item.id === rule.theme);
    return {
      ...cell,
      holidayTheme: {
        themeKey: rule.theme,
        holidayName: theme?.name || rule.id,
        calendarType: rule.calendarType,
        description: `Rule ${rule.startDay}/${rule.startMonth} - ${rule.endDay}/${rule.endMonth}`,
        accentColor: theme?.accent || "#22d3ee",
      },
    };
  });

  // Tự động gán cell hôm nay khi mới mở
  useEffect(() => {
    if (!selectedDayCell) {
      const todayCell = monthCells.find((c) => c.isToday) || monthCells[0];
      setSelectedDayCell(todayCell);
    }
  }, [calYear, calMonth]);

  const getNormalizedRange = (cellA: CalendarCell, cellB: CalendarCell) => {
    const dateA = new Date(cellA.solarYear, cellA.solarMonth - 1, cellA.solarDay).getTime();
    const dateB = new Date(cellB.solarYear, cellB.solarMonth - 1, cellB.solarDay).getTime();
    return dateA <= dateB ? { start: cellA, end: cellB } : { start: cellB, end: cellA };
  };

  const isCellInRange = (cell: CalendarCell) => {
    if (!selectedRange) return false;
    const cellTime = new Date(cell.solarYear, cell.solarMonth - 1, cell.solarDay).getTime();
    const startTime = new Date(selectedRange.start.solarYear, selectedRange.start.solarMonth - 1, selectedRange.start.solarDay).getTime();
    const endTime = new Date(selectedRange.end.solarYear, selectedRange.end.solarMonth - 1, selectedRange.end.solarDay).getTime();
    return cellTime >= startTime && cellTime <= endTime;
  };

  const openHolidayConfigForRange = (startCell: CalendarCell, endCell: CalendarCell) => {
    const norm = getNormalizedRange(startCell, endCell);
    setSelectedRange(norm);
    setSelectedDayCell(norm.start);

    const existingRule = getHolidayRuleForDate(schedule, norm.start.solarDay, norm.start.solarMonth, norm.start.solarYear);

    if (existingRule) {
      const themeMeta = themesList.find((t) => t.id === existingRule.theme);
      setHolidayForm({
        id: existingRule.id,
        theme: existingRule.theme,
        calendarType: existingRule.calendarType,
        startMonth: existingRule.startMonth,
        startDay: existingRule.startDay,
        endMonth: existingRule.endMonth,
        endDay: existingRule.endDay,
        holidayName: themeMeta?.name || existingRule.id,
        enabled: existingRule.enabled,
      });
    } else {
      const defaultThemePick = themesList[0]?.id || "tet";
      const defaultThemeMeta = themesList.find((t) => t.id === defaultThemePick);
      setHolidayForm({
        id: undefined,
        theme: defaultThemePick,
        calendarType: "solar",
        startMonth: norm.start.solarMonth,
        startDay: norm.start.solarDay,
        endMonth: norm.end.solarMonth,
        endDay: norm.end.solarDay,
        holidayName: defaultThemeMeta?.name || "Theme Lễ Mới",
        enabled: true,
      });
    }

    setIsConfiguringHoliday(true);
  };

  const handleCellMouseDown = (cell: CalendarCell) => {
    isMouseDownRef.current = true;
    dragStartCellRef.current = cell;
    hasDraggedRef.current = false;

    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      openHolidayConfigForRange(cell, cell);
      showToast("success", `Đã nhấn giữ ngày ${cell.solarDay}/${cell.solarMonth}. Hãy cấu hình Theme Lễ ở form bên phải!`);
    }, 400);
  };

  const handleCellMouseEnter = (cell: CalendarCell) => {
    if (!isMouseDownRef.current || !dragStartCellRef.current) return;
    if (cell.solarDay !== dragStartCellRef.current.solarDay || cell.solarMonth !== dragStartCellRef.current.solarMonth) {
      hasDraggedRef.current = true;
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      const norm = getNormalizedRange(dragStartCellRef.current, cell);
      setSelectedRange(norm);
    }
  };

  const handleCellMouseUp = (cell: CalendarCell) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (isMouseDownRef.current && dragStartCellRef.current) {
      if (hasDraggedRef.current) {
        const norm = getNormalizedRange(dragStartCellRef.current, cell);
        openHolidayConfigForRange(norm.start, norm.end);
        showToast("success", `Đã quét chọn dải ngày: Từ ${norm.start.solarDay}/${norm.start.solarMonth} đến ${norm.end.solarDay}/${norm.end.solarMonth}.`);
      } else {
        setSelectedDayCell(cell);
        if (!isConfiguringHoliday) {
          setSelectedRange(null);
        }
      }
    }

    isMouseDownRef.current = false;
    dragStartCellRef.current = null;
    hasDraggedRef.current = false;
  };

  useEffect(() => {
    const onGlobalMouseUp = () => {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
      isMouseDownRef.current = false;
      dragStartCellRef.current = null;
    };
    window.addEventListener("mouseup", onGlobalMouseUp);
    return () => window.removeEventListener("mouseup", onGlobalMouseUp);
  }, []);

  const applyHolidayFormRule = (saveImmediately = false) => {
    const newRuleId = holidayForm.id || `holiday-${Date.now()}`;
    const newRule: ThemeDateRule = {
      id: newRuleId,
      theme: holidayForm.theme,
      calendarType: holidayForm.calendarType,
      startMonth: Number(holidayForm.startMonth),
      startDay: Number(holidayForm.startDay),
      endMonth: Number(holidayForm.endMonth),
      endDay: Number(holidayForm.endDay),
      enabled: holidayForm.enabled,
    };

    const exists = schedule.holidayRules.some((r) => r.id === newRuleId);
    const updatedRules = exists
      ? schedule.holidayRules.map((r) => (r.id === newRuleId ? newRule : r))
      : [newRule, ...schedule.holidayRules];

    const updatedSchedule: ThemeScheduleConfig = {
      ...schedule,
      holidayRules: updatedRules,
    };

    setSchedule(updatedSchedule);

    if (saveImmediately) {
      onSaveSchedule(updatedSchedule);
    } else {
      showToast("success", `Đã áp dụng rule "${holidayForm.holidayName || holidayForm.theme}". Bấm "Lưu Cấu Hình" để lưu lâu dài!`);
    }
  };

  const deleteCurrentHolidayRule = (ruleId?: string) => {
    const targetId = ruleId || holidayForm.id;
    if (!targetId) return;
    const updatedSchedule: ThemeScheduleConfig = {
      ...schedule,
      holidayRules: schedule.holidayRules.filter((r) => r.id !== targetId),
    };
    setSchedule(updatedSchedule);
    setIsConfiguringHoliday(false);
    setSelectedRange(null);
    showToast("success", "Đã xóa rule lễ. Bấm 'Lưu Cấu Hình' để cập nhật vĩnh viễn!");
  };

  return {
    calYear,
    setCalYear,
    calMonth,
    setCalMonth,
    selectedDayCell,
    setSelectedDayCell,
    selectedRange,
    setSelectedRange,
    isConfiguringHoliday,
    setIsConfiguringHoliday,
    holidayForm,
    setHolidayForm,
    monthCells,
    handlePrevMonth,
    handleNextMonth,
    handleGoToday,
    isCellInRange,
    openHolidayConfigForRange,
    handleCellMouseDown,
    handleCellMouseEnter,
    handleCellMouseUp,
    applyHolidayFormRule,
    deleteCurrentHolidayRule,
  };
}

