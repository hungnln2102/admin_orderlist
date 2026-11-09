import React from "react";
import { CalendarDays, Sparkles, Lock, Eye } from "lucide-react";
import { CalendarCell } from "../../../shared/utils/lunarCalendar";
import { ThemeItem } from "../types";

interface DayDetailsInspectorProps {
  selectedDayCell: CalendarCell;
  activeCellTheme: ThemeItem | null;
  cellDailyThemeMeta: ThemeItem;
  cellDailyThemeType?: "season" | "fixed_default";
  activeThemeMeta: ThemeItem;
  onOpenConfig: () => void;
  onLockTheme: (themeKey: string, themeName: string) => void;
}

export const DayDetailsInspector: React.FC<DayDetailsInspectorProps> = ({
  selectedDayCell,
  activeCellTheme,
  cellDailyThemeMeta,
  cellDailyThemeType = "season",
  activeThemeMeta,
  onOpenConfig,
  onLockTheme,
}) => {
  return (
    <div className="h-full flex flex-col justify-between overflow-hidden gap-2">
      <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-lg space-y-2.5 shrink-0">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <CalendarDays className="w-3.5 h-3.5 text-emerald-400" /> Chi Tiết Ngày Đang Xem
          </span>
          {selectedDayCell.isToday && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/50">
              Hôm Nay
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-700 flex flex-col items-center justify-center text-white shrink-0 shadow-md">
            <span className="text-[9px] font-bold uppercase">Dương</span>
            <span className="text-lg font-black leading-none">{selectedDayCell.solarDay}</span>
          </div>

          <div>
            <h4 className="font-bold text-sm text-white">
              Thứ {selectedDayCell.isSunday ? "Chủ Nhật" : selectedDayCell.isSaturday ? "Bảy" : `${((new Date(selectedDayCell.solarYear, selectedDayCell.solarMonth - 1, selectedDayCell.solarDay).getDay() + 6) % 7) + 2}`}, {selectedDayCell.solarDay}/{selectedDayCell.solarMonth}/{selectedDayCell.solarYear}
            </h4>
            <p className="text-xs text-emerald-400 font-semibold mt-0.5">
              🌙 Ngày {selectedDayCell.lunar.day} Tháng {selectedDayCell.lunar.month} {selectedDayCell.lunar.leap ? "(Nhuận)" : ""} • Năm {selectedDayCell.lunar.canChiYear}
            </p>
          </div>
        </div>

        <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800/80 text-[11px] space-y-0.5">
          <p className="text-slate-300">
            Can Chi: <span className="font-semibold text-white">Ngày {selectedDayCell.lunar.canChiDay}</span> • Tháng {selectedDayCell.lunar.canChiMonth}
          </p>
          <p className="text-slate-400 text-[10px]">
            {selectedDayCell.isAuspiciousDay ? "⭐ Ngày Hoàng Đạo (Thuận lợi, may mắn)" : "🌑 Ngày Hắc Đạo (Thận trọng)"}
          </p>
        </div>

        {/* Theme Kích Hoạt Của Ngày Này */}
        <div className="pt-2 border-t border-slate-800/70 space-y-1.5">
          <span className="text-[10px] font-bold uppercase text-slate-400">Theme Tự Động Kích Hoạt:</span>
          {selectedDayCell.holidayTheme ? (
            <div className="p-2.5 rounded-lg border bg-slate-950/90" style={{ borderColor: `${selectedDayCell.holidayTheme.accentColor}50` }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-xl">{activeCellTheme?.icon || "✨"}</span>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1">
                      {selectedDayCell.holidayTheme.holidayName}
                      <span className="text-[9px] px-1 py-0.2 rounded font-normal bg-cyan-950 text-cyan-300 border border-cyan-800/60">
                        {selectedDayCell.holidayTheme.calendarType === "lunar" ? "Lễ Âm" : "Lễ Dương"}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 italic line-clamp-1">{selectedDayCell.holidayTheme.description}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1.5 mt-2">
                <button
                  type="button"
                  onClick={onOpenConfig}
                  className="py-1.5 rounded-lg text-xs font-bold bg-indigo-600/30 hover:bg-indigo-600/40 text-indigo-200 border border-indigo-500/40 transition-all flex items-center justify-center gap-1"
                >
                  <Sparkles className="w-3 h-3 text-indigo-400" />
                  <span>Sửa Rule Lễ</span>
                </button>

                <button
                  type="button"
                  onClick={() => onLockTheme(selectedDayCell.holidayTheme!.themeKey, selectedDayCell.holidayTheme!.holidayName)}
                  className="py-1.5 rounded-lg text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition-all flex items-center justify-center gap-1"
                >
                  <Lock className="w-3 h-3" />
                  <span>Khóa Theme Này</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-2.5 rounded-lg border border-slate-800/80 bg-slate-950/70 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">{cellDailyThemeMeta.icon}</span>
                <div>
                  <div className={`text-xs font-bold ${cellDailyThemeType === "season" ? "text-emerald-400" : "text-cyan-400"}`}>
                    {cellDailyThemeMeta.name} ({cellDailyThemeType === "season" ? "Theme Theo Mùa Anime" : "Theme Cố Định Quanh Năm"})
                  </div>
                  <p className="text-[10px] text-slate-400 italic">
                    {cellDailyThemeType === "season"
                      ? "Không rơi vào lễ hội, tự động kích hoạt theo 4 mùa"
                      : "Không rơi vào lễ hội, giữ giao diện cố định quanh năm"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onOpenConfig}
                className="w-full py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-amber-500/30 to-rose-500/30 hover:from-amber-500/40 hover:to-rose-500/40 text-amber-200 border border-amber-500/40 transition-all flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Thiết Lập Theme Lễ Cho Ngày Này</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Box 2: Xem Trước Theme Đang Chọn Lưu */}
      <div className="flex-1 min-h-0 p-3 rounded-xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 shadow-md flex flex-col justify-between overflow-hidden">
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Eye className="w-3 h-3 text-indigo-400" /> Xem Trước Theme Đang Chọn
          </span>

          <div className="mt-2 flex items-center gap-2">
            <span className="text-2xl">{activeThemeMeta.icon}</span>
            <div>
              <h4 className="font-bold text-xs text-white">{activeThemeMeta.name}</h4>
              <span className="text-[10px] font-semibold text-slate-400">{activeThemeMeta.badge}</span>
            </div>
          </div>

          <div className="mt-2 p-2 rounded-lg bg-slate-950/70 border border-slate-800/80">
            <p className="text-[11px] font-bold text-slate-200 truncate">{activeThemeMeta.title}</p>
            <p className="text-[10px] text-slate-400 italic truncate mt-0.5">{activeThemeMeta.subtitle}</p>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px]">
          <span className="text-slate-400">Màu chủ đạo:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full border border-white/30" style={{ background: activeThemeMeta.accent }} />
            <span className="font-mono text-[10px] text-slate-300">{activeThemeMeta.accent}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

