import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { formatDateToDMY, convertDMYToYMD } from "@/shared/date";

type DateRange = {
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
};

type DateRangePickerProps = {
  value: DateRange | null;
  onChange: (range: DateRange | null) => void;
  placeholder?: string;
  className?: string;
  align?: "left" | "right";
};

type Preset = {
  label: string;
  getValue: () => [Date, Date];
};

const getStartOfToday = (): Date => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const formatDateYMD = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const parseDateYMD = (ymdStr: string): Date | null => {
  if (!ymdStr) return null;
  const parts = ymdStr.split("-").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
  return new Date(parts[0], parts[1] - 1, parts[2]);
};

// Preset ranges definitions
const PRESETS: Preset[] = [
  {
    label: "Hôm nay",
    getValue: () => {
      const today = getStartOfToday();
      return [today, today];
    },
  },
  {
    label: "Hôm qua",
    getValue: () => {
      const yesterday = getStartOfToday();
      yesterday.setDate(yesterday.getDate() - 1);
      return [yesterday, yesterday];
    },
  },
  {
    label: "7 ngày qua",
    getValue: () => {
      const start = getStartOfToday();
      start.setDate(start.getDate() - 6);
      const end = getStartOfToday();
      return [start, end];
    },
  },
  {
    label: "30 ngày qua",
    getValue: () => {
      const start = getStartOfToday();
      start.setDate(start.getDate() - 29);
      const end = getStartOfToday();
      return [start, end];
    },
  },
  {
    label: "Tháng này",
    getValue: () => {
      const today = getStartOfToday();
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return [start, end];
    },
  },
  {
    label: "Tháng trước",
    getValue: () => {
      const today = getStartOfToday();
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 0);
      return [start, end];
    },
  },
  {
    label: "Quý này",
    getValue: () => {
      const today = getStartOfToday();
      const quarter = Math.floor(today.getMonth() / 3);
      const start = new Date(today.getFullYear(), quarter * 3, 1);
      const end = new Date(today.getFullYear(), (quarter + 1) * 3, 0);
      return [start, end];
    },
  },
  {
    label: "Quý trước",
    getValue: () => {
      const today = getStartOfToday();
      const quarter = Math.floor(today.getMonth() / 3);
      const start = new Date(today.getFullYear(), (quarter - 1) * 3, 1);
      const end = new Date(today.getFullYear(), quarter * 3, 0);
      return [start, end];
    },
  },
  {
    label: "Năm nay",
    getValue: () => {
      const today = getStartOfToday();
      const start = new Date(today.getFullYear(), 0, 1);
      const end = new Date(today.getFullYear(), 12, 0);
      return [start, end];
    },
  },
  {
    label: "Năm trước",
    getValue: () => {
      const today = getStartOfToday();
      const start = new Date(today.getFullYear() - 1, 0, 1);
      const end = new Date(today.getFullYear() - 1, 12, 0);
      return [start, end];
    },
  },
];

const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  value,
  onChange,
  placeholder = "Chọn khoảng ngày...",
  className = "",
  align = "right",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Temporary selected dates before hitting "Áp dụng"
  const [tempStart, setTempStart] = useState<Date | null>(null);
  const [tempEnd, setTempEnd] = useState<Date | null>(null);

  // Current calendar view month (left calendar). Right calendar is always monthLeft + 1 month.
  const [monthLeft, setMonthLeft] = useState<Date>(() => getStartOfToday());
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);

  const [activePreset, setActivePreset] = useState<string>("Tùy chỉnh");

  // Format YMD strings to display in Vietnamese date range button
  const displayRangeText = useMemo(() => {
    if (!value || !value.from || !value.to) return placeholder;
    return `${formatDateToDMY(value.from)} - ${formatDateToDMY(value.to)}`;
  }, [value, placeholder]);

  // Sync state with value prop when opening popover
  useEffect(() => {
    if (isOpen) {
      if (value?.from && value?.to) {
        const start = parseDateYMD(value.from);
        const end = parseDateYMD(value.to);
        setTempStart(start);
        setTempEnd(end);
        if (start) {
          setMonthLeft(new Date(start.getFullYear(), start.getMonth(), 1));
        }

        // Determine if active value matches a preset
        let foundPreset = "Tùy chỉnh";
        for (const p of PRESETS) {
          const [ps, pe] = p.getValue();
          if (
            start &&
            end &&
            formatDateYMD(ps) === formatDateYMD(start) &&
            formatDateYMD(pe) === formatDateYMD(end)
          ) {
            foundPreset = p.label;
            break;
          }
        }
        setActivePreset(foundPreset);
      } else {
        setTempStart(null);
        setTempEnd(null);
        setMonthLeft(getStartOfToday());
        setActivePreset("Tùy chỉnh");
      }
    }
  }, [isOpen, value]);

  // Close popup when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isOpen]);

  const handlePrevMonth = () => {
    setMonthLeft((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setMonthLeft((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleSelectPreset = (preset: Preset) => {
    const [start, end] = preset.getValue();
    setTempStart(start);
    setTempEnd(end);
    setMonthLeft(new Date(start.getFullYear(), start.getMonth(), 1));
    setActivePreset(preset.label);
  };

  const handleDateClick = (date: Date) => {
    setActivePreset("Tùy chỉnh");
    if (!tempStart || (tempStart && tempEnd)) {
      setTempStart(date);
      setTempEnd(null);
    } else {
      if (date < tempStart) {
        setTempStart(date);
      } else {
        setTempEnd(date);
      }
    }
  };

  const handleApply = () => {
    if (tempStart && tempEnd) {
      onChange({
        from: formatDateYMD(tempStart),
        to: formatDateYMD(tempEnd),
      });
    } else {
      onChange(null);
    }
    setIsOpen(false);
  };

  const handleCancel = () => {
    setIsOpen(false);
  };

  const handleClear = () => {
    setTempStart(null);
    setTempEnd(null);
    setActivePreset("Tùy chỉnh");
  };

  // Helper to generate the 42-day grid for a given year & month (starting Monday)
  const getCalendarDays = useCallback((year: number, month: number) => {
    const firstDay = new Date(year, month, 1);
    // Sunday is 0, Monday is 1, ..., Saturday is 6.
    // In Monday-start system, we want: Mon=0, Tue=1, ..., Sun=6
    const dayOfWeek = firstDay.getDay();
    const offset = (dayOfWeek + 6) % 7;

    const days: { date: Date; isCurrentMonth: boolean }[] = [];

    // Add days from previous month
    const prevMonthDaysCount = new Date(year, month, 0).getDate();
    for (let i = offset - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthDaysCount - i),
        isCurrentMonth: false,
      });
    }

    // Add current month days
    const currentMonthDaysCount = new Date(year, month + 1, 0).getDate();
    for (let i = 1; i <= currentMonthDaysCount; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
      });
    }

    // Fill remaining cells for 6 rows * 7 days = 42 cells
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
      });
    }

    return days;
  }, []);

  const renderCalendar = (year: number, month: number, isRight = false) => {
    const days = getCalendarDays(year, month);
    const monthName = `Tháng ${month + 1} ${year}`;
    const todayStr = formatDateYMD(getStartOfToday());

    return (
      <div className="flex-1">
        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-4 h-8">
          {!isRight ? (
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg border border-white/5 bg-slate-950/40 text-slate-400 hover:text-white hover:bg-white/5 transition-all"
            >
              <ChevronLeftIcon className="w-4 h-4" />
            </button>
          ) : (
            <div className="w-7 h-7" />
          )}

          <h4 className="text-sm font-semibold text-slate-200 select-none">
            {monthName}
          </h4>

          {isRight ? (
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg border border-white/5 bg-slate-950/40 text-slate-400 hover:text-white hover:bg-white/5 transition-all"
            >
              <ChevronRightIcon className="w-4 h-4" />
            </button>
          ) : (
            <div className="w-7 h-7" />
          )}
        </div>

        {/* Days Weekdays Grid */}
        <div className="grid grid-cols-7 gap-y-1 mb-2 text-center">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="text-[11px] font-bold text-slate-500 uppercase tracking-wider h-6 flex items-center justify-center"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Days Numbers Grid */}
        <div className="grid grid-cols-7 gap-y-1 text-center relative">
          {days.map(({ date, isCurrentMonth }, idx) => {
            const dateStr = formatDateYMD(date);
            const isToday = dateStr === todayStr;

            const isStart = tempStart && dateStr === formatDateYMD(tempStart);
            const isEnd = tempEnd && dateStr === formatDateYMD(tempEnd);

            let isInRange = false;
            let isHoverRange = false;

            if (tempStart && tempEnd) {
              isInRange = date >= tempStart && date <= tempEnd;
            } else if (tempStart && hoveredDate) {
              if (date >= tempStart && date <= hoveredDate) {
                isHoverRange = true;
              }
            }

            // Cell background styling helper
            let dayBgClass = "";
            let textClass = isCurrentMonth ? "text-slate-300" : "text-slate-600";
            let roundedClass = "rounded-xl";

            if (isStart && isEnd) {
              dayBgClass = "bg-indigo-600 font-bold";
              textClass = "text-white";
            } else if (isStart) {
              dayBgClass = "bg-indigo-600 font-bold";
              textClass = "text-white";
              roundedClass = tempEnd || hoveredDate ? "rounded-l-xl rounded-r-none" : "rounded-xl";
            } else if (isEnd) {
              dayBgClass = "bg-indigo-600 font-bold";
              textClass = "text-white";
              roundedClass = "rounded-r-xl rounded-l-none";
            } else if (isInRange) {
              dayBgClass = "bg-indigo-600/15";
              textClass = "text-indigo-200 font-medium";
              roundedClass = "rounded-none";
            } else if (isHoverRange) {
              dayBgClass = "bg-indigo-600/10 border-t border-b border-dashed border-indigo-500/20";
              textClass = "text-indigo-200";
              roundedClass = "rounded-none";
            } else if (isCurrentMonth) {
              dayBgClass = "hover:bg-white/5";
            } else {
              dayBgClass = "hover:bg-white/[0.02]";
            }

            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleDateClick(date)}
                onMouseEnter={() => tempStart && !tempEnd && setHoveredDate(date)}
                onMouseLeave={() => setHoveredDate(null)}
                className={`relative h-9 w-full text-xs transition-all flex items-center justify-center ${dayBgClass} ${textClass} ${roundedClass}`}
              >
                {/* Visual indicator for today */}
                {isToday && !isStart && !isEnd && (
                  <span className="absolute bottom-1 w-1 h-1 rounded-full bg-indigo-400" />
                )}
                <span>{date.getDate()}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const leftYear = monthLeft.getFullYear();
  const leftMonth = monthLeft.getMonth();

  // Right calendar shows leftMonth + 1
  const rightDate = new Date(leftYear, leftMonth + 1, 1);
  const rightYear = rightDate.getFullYear();
  const rightMonth = rightDate.getMonth();

  // Range text for bottom footer
  const tempRangeText = useMemo(() => {
    if (!tempStart && !tempEnd) return "Vui lòng chọn ngày";
    if (tempStart && !tempEnd) {
      return `${formatDateToDMY(formatDateYMD(tempStart))} - dd/mm/yyyy`;
    }
    if (tempStart && tempEnd) {
      return `${formatDateToDMY(formatDateYMD(tempStart))} - ${formatDateToDMY(formatDateYMD(tempEnd))}`;
    }
    return "";
  }, [tempStart, tempEnd]);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Date trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full h-12 flex items-center justify-between gap-3 px-4 rounded-2xl border transition-all text-sm xl:min-w-[220px] ${
          isOpen
            ? "border-indigo-400/50 bg-indigo-500/10 text-indigo-200"
            : "border-white/[0.06] bg-slate-950/40 text-white hover:bg-white/[0.03]"
        }`}
      >
        <span className="font-medium truncate">{displayRangeText}</span>
        <CalendarDaysIcon className="w-5 h-5 opacity-70 shrink-0" />
      </button>

      {/* Popover container */}
      {isOpen && (
        <div
          className={`absolute ${
            align === "right" ? "right-0" : "left-0"
          } top-[calc(100%+12px)] w-[calc(100vw-1.5rem)] md:w-[720px] bg-slate-900 border border-white/10 rounded-3xl shadow-2xl z-50 p-6 flex flex-col md:flex-row gap-6 backdrop-blur-xl animate-in fade-in duration-200`}
        >
          {/* Left panel presets */}
          <div className="w-full md:w-36 flex-shrink-0 flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-x-visible md:border-r border-white/[0.06] pr-0 md:pr-4 pb-3 md:pb-0">
            {PRESETS.map((preset) => {
              const isActive = activePreset === preset.label;
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className={`px-3 py-2 text-[11px] font-semibold tracking-wide uppercase rounded-xl transition-all whitespace-nowrap text-left ${
                    isActive
                      ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/20"
                      : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
            <button
              type="button"
              className={`px-3 py-2 text-[11px] font-semibold tracking-wide uppercase rounded-xl transition-all text-left ${
                activePreset === "Tùy chỉnh"
                  ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/20"
                  : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"
              }`}
              onClick={() => setActivePreset("Tùy chỉnh")}
            >
              Tùy chỉnh
            </button>
          </div>

          {/* Right panel Calendars & Footer */}
          <div className="flex-1 flex flex-col gap-5 min-w-0">
            {/* Calendars side-by-side or stacked */}
            <div className="flex flex-col sm:flex-row gap-6">
              {renderCalendar(leftYear, leftMonth, false)}
              {renderCalendar(rightYear, rightMonth, true)}
            </div>

            {/* Footer Panel */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-white/[0.06] mt-1">
              <span className="text-xs font-semibold text-slate-400 font-mono tracking-wide">
                {tempRangeText}
              </span>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                >
                  Xóa lọc
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 rounded-xl border border-white/5 transition-all"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleApply}
                  disabled={!tempStart || !tempEnd}
                  className={`px-4 py-2 text-xs font-bold text-white rounded-xl shadow-lg transition-all ${
                    tempStart && tempEnd
                      ? "bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 hover:shadow-indigo-900/35 cursor-pointer"
                      : "bg-white/5 text-white/30 border border-white/5 cursor-not-allowed"
                  }`}
                >
                  Áp dụng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
