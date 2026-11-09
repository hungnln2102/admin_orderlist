import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CalendarCell } from "../../../shared/utils/lunarCalendar";

interface CalendarGridSectionProps {
  calYear: number;
  calMonth: number;
  monthCells: CalendarCell[];
  selectedDayCell: CalendarCell | null;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onGoToday: () => void;
  onCellMouseDown: (cell: CalendarCell) => void;
  onCellMouseEnter: (cell: CalendarCell) => void;
  onCellMouseUp: (cell: CalendarCell) => void;
  isCellInRange: (cell: CalendarCell) => boolean;
}

export const CalendarGridSection: React.FC<CalendarGridSectionProps> = ({
  calYear,
  calMonth,
  monthCells,
  selectedDayCell,
  onPrevMonth,
  onNextMonth,
  onGoToday,
  onCellMouseDown,
  onCellMouseEnter,
  onCellMouseUp,
  isCellInRange,
}) => {
  return (
    <div className="lg:col-span-8 h-full flex flex-col rounded-xl border border-emerald-800/60 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 shadow-xl overflow-hidden">
      {/* Header Lịch Compact */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-emerald-950 px-3 py-2 border-b border-emerald-700/60 flex items-center justify-between shrink-0">
        <button
          type="button"
          onClick={onPrevMonth}
          className="px-2 py-1 rounded-lg bg-emerald-950/80 hover:bg-emerald-800 text-emerald-200 border border-emerald-700/60 transition-all flex items-center gap-0.5 text-xs font-semibold"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Trước</span>
        </button>

        <div className="text-center">
          <h2 className="text-xs sm:text-sm font-black tracking-wide text-white uppercase drop-shadow flex items-center justify-center gap-1.5">
            Lịch Âm Dương Tháng {calMonth} Năm {calYear}
          </h2>
          <p className="text-[10px] text-emerald-300/90 font-medium">
            Nhấn giữ hoặc kéo chuột để cấu hình theme lễ cho ngày / khoảng ngày
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onGoToday}
            className="px-2 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold border border-emerald-500 shadow-sm transition-all"
          >
            Hôm nay
          </button>
          <button
            type="button"
            onClick={onNextMonth}
            className="px-2 py-1 rounded-lg bg-emerald-950/80 hover:bg-emerald-800 text-emerald-200 border border-emerald-700/60 transition-all flex items-center gap-0.5 text-xs font-semibold"
          >
            <span className="hidden sm:inline">Sau</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 7 Cột Thứ Hai -> Chủ Nhật */}
      <div className="grid grid-cols-7 text-center font-bold text-[11px] uppercase tracking-wider border-b border-emerald-800/60 bg-emerald-950/90 text-emerald-200 py-1.5 shrink-0">
        <div>Thứ Hai</div>
        <div>Thứ Ba</div>
        <div>Thứ Tư</div>
        <div>Thứ Năm</div>
        <div>Thứ Sáu</div>
        <div className="text-emerald-300">Thứ Bảy</div>
        <div className="text-amber-400">Chủ Nhật</div>
      </div>

      {/* Grid Ô Ngày */}
      <div className="flex-1 grid grid-cols-7 gap-px bg-slate-800/50 p-1 min-h-0">
        {monthCells.map((cell, idx) => {
          const isSelected =
            selectedDayCell &&
            selectedDayCell.solarDay === cell.solarDay &&
            selectedDayCell.solarMonth === cell.solarMonth &&
            selectedDayCell.solarYear === cell.solarYear;

          const inRange = isCellInRange(cell);
          const isFirstLunarDay = cell.lunar.day === 1;

          return (
            <div
              key={`${cell.solarYear}-${cell.solarMonth}-${cell.solarDay}-${idx}`}
              onMouseDown={() => onCellMouseDown(cell)}
              onMouseEnter={() => onCellMouseEnter(cell)}
              onMouseUp={() => onCellMouseUp(cell)}
              className={`p-1 rounded cursor-pointer transition-all flex flex-col justify-between relative select-none ${
                inRange
                  ? "bg-amber-950/80 border-2 border-amber-400 ring-2 ring-amber-500/40 shadow-lg scale-[0.98]"
                  : cell.isToday
                  ? "bg-emerald-900/40 border-2 border-emerald-400 text-emerald-100 shadow-md font-bold"
                  : cell.isCurrentMonth
                  ? isSelected
                    ? "bg-slate-800 border border-cyan-400 ring-1 ring-cyan-500/40"
                    : "bg-slate-900/90 hover:bg-slate-800/70 border border-slate-800/60"
                  : "bg-slate-950/30 border border-slate-900/30 opacity-25 text-slate-500 hover:opacity-50"
              }`}
            >
              {/* Top Row: Solar Day + Dots */}
              <div className="flex items-center justify-between leading-none">
                <span
                  className={`text-xs sm:text-sm font-bold ${
                    cell.isSunday
                      ? "text-amber-400 font-black"
                      : cell.isSaturday
                      ? "text-emerald-300"
                      : "text-slate-100"
                  }`}
                >
                  {cell.solarDay}
                </span>

                <div className="flex items-center gap-0.5">
                  {cell.isToday && (
                    <span className="text-[8px] font-black px-1 py-0.2 rounded bg-emerald-500 text-slate-950 uppercase leading-none">
                      NAY
                    </span>
                  )}
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      cell.isAuspiciousDay ? "bg-rose-500" : "bg-purple-400"
                    }`}
                    title={cell.isAuspiciousDay ? "Hoàng Đạo" : "Hắc Đạo"}
                  />
                </div>
              </div>

              {/* Middle: Lunar Day + Can Chi */}
              <div className="text-center my-0.5">
                <span
                  className={`text-[10px] sm:text-xs font-bold leading-none ${
                    isFirstLunarDay
                      ? "text-rose-400 font-black"
                      : "text-slate-300"
                  }`}
                >
                  {isFirstLunarDay ? `1/${cell.lunar.month}` : cell.lunar.day}
                </span>
                <div className="text-[8px] sm:text-[9px] text-slate-400 font-medium truncate leading-tight">
                  {cell.lunar.canChiDay}
                </div>
              </div>

              {/* Bottom: Theme Badge Mini */}
              {cell.holidayTheme ? (
                <div
                  className="px-1 py-0.2 rounded text-[8px] font-bold text-center truncate border shadow-xs leading-tight"
                  style={{
                    backgroundColor: `${cell.holidayTheme.accentColor}25`,
                    borderColor: `${cell.holidayTheme.accentColor}70`,
                    color: cell.holidayTheme.accentColor,
                  }}
                  title={`${cell.holidayTheme.holidayName}: ${cell.holidayTheme.description}`}
                >
                  ✨ {cell.holidayTheme.holidayName}
                </div>
              ) : (
                <div className="h-2" />
              )}
            </div>
          );
        })}
      </div>

      {/* Footer chú thích */}
      <div className="px-3 py-1.5 bg-slate-950/80 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400 shrink-0">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Hôm nay</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>Mùng 1 Âm</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>Có Theme Lễ Hội</span>
          </span>
        </div>
        <span className="hidden sm:inline italic text-amber-300/80 font-medium">
          💡 Nhấn giữ 1 ô hoặc kéo rê chuột qua nhiều ô để cấu hình theme lễ
        </span>
      </div>
    </div>
  );
};

