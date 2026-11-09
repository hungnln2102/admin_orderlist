import React from "react";
import { Sparkles, X, Sun, Moon, Check, Save, Trash2 } from "lucide-react";
import { HolidayFormState, RangeSelection, ThemeItem } from "../types";

interface HolidayThemeConfigFormProps {
  selectedRange: RangeSelection;
  holidayForm: HolidayFormState;
  setHolidayForm: React.Dispatch<React.SetStateAction<HolidayFormState>>;
  themesList: ThemeItem[];
  onClose: () => void;
  onApply: (saveImmediately: boolean) => void;
  onDelete: () => void;
}

export const HolidayThemeConfigForm: React.FC<HolidayThemeConfigFormProps> = ({
  selectedRange,
  holidayForm,
  setHolidayForm,
  themesList,
  onClose,
  onApply,
  onDelete,
}) => {
  const daysDiff =
    selectedRange.start.solarDay === selectedRange.end.solarDay &&
    selectedRange.start.solarMonth === selectedRange.end.solarMonth
      ? 1
      : Math.round(
          (new Date(selectedRange.end.solarYear, selectedRange.end.solarMonth - 1, selectedRange.end.solarDay).getTime() -
            new Date(selectedRange.start.solarYear, selectedRange.start.solarMonth - 1, selectedRange.start.solarDay).getTime()) /
            (1000 * 60 * 60 * 24)
        ) + 1;

  return (
    <div className="h-full p-3.5 rounded-xl bg-slate-900/95 border-2 border-amber-500/70 shadow-2xl flex flex-col justify-between overflow-y-auto space-y-2.5">
      <div className="space-y-2.5">
        {/* Header Form */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-400 animate-bounce" />
            <h3 className="text-xs font-black uppercase text-white tracking-wider">
              Cấu Hình Theme Lễ Hội
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
            title="Đóng form cấu hình"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Dải ngày đang chọn */}
        <div className="p-2 rounded-lg bg-amber-950/40 border border-amber-600/40 text-xs text-amber-200 flex items-center justify-between">
          <span className="font-bold flex items-center gap-1">
            📅 {selectedRange.start.solarDay}/{selectedRange.start.solarMonth}
            {selectedRange.start.solarDay !== selectedRange.end.solarDay ||
            selectedRange.start.solarMonth !== selectedRange.end.solarMonth
              ? ` → ${selectedRange.end.solarDay}/${selectedRange.end.solarMonth}`
              : ""}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-900/60 font-semibold border border-amber-500/40">
            {daysDiff} ngày
          </span>
        </div>

        {/* Chọn Theme Lễ Hội */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-300 block">
            Chọn Theme Giao Diện Lễ Hội:
          </label>
          <select
            value={holidayForm.theme}
            onChange={(e) => {
              const themeKey = e.target.value;
              const meta = themesList.find((t) => t.id === themeKey);
              setHolidayForm((curr) => ({
                ...curr,
                theme: themeKey,
                holidayName: meta?.name || curr.holidayName,
              }));
            }}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-2 text-xs font-bold text-white focus:outline-none focus:ring-1 focus:ring-amber-400"
          >
            {themesList.map((t) => (
              <option key={t.id} value={t.id}>
                {t.icon} {t.name}
              </option>
            ))}
          </select>
        </div>

        {/* Loại Lịch: Dương Lịch vs Âm Lịch */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-300 block">Hệ Lịch Áp Dụng:</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setHolidayForm((curr) => ({
                  ...curr,
                  calendarType: "solar",
                  startMonth: selectedRange.start.solarMonth,
                  startDay: selectedRange.start.solarDay,
                  endMonth: selectedRange.end.solarMonth,
                  endDay: selectedRange.end.solarDay,
                }));
              }}
              className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
                holidayForm.calendarType === "solar"
                  ? "bg-cyan-600 text-white border-cyan-400 shadow-sm"
                  : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white"
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              <span>Dương Lịch</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setHolidayForm((curr) => ({
                  ...curr,
                  calendarType: "lunar",
                  startMonth: selectedRange.start.lunar.month,
                  startDay: selectedRange.start.lunar.day,
                  endMonth: selectedRange.end.lunar.month,
                  endDay: selectedRange.end.lunar.day,
                }));
              }}
              className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
                holidayForm.calendarType === "lunar"
                  ? "bg-purple-600 text-white border-purple-400 shadow-sm"
                  : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white"
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              <span>Âm Lịch</span>
            </button>
          </div>
        </div>

        {/* Dải Ngày (Ngày bắt đầu -> Ngày kết thúc) */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 block">Bắt Đầu (Ngày/Tháng)</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="1"
                max="31"
                value={holidayForm.startDay}
                onChange={(e) => setHolidayForm((curr) => ({ ...curr, startDay: Number(e.target.value) }))}
                className="w-1/2 rounded border border-slate-700 bg-slate-900 px-1 py-0.5 text-xs text-center font-bold text-white"
              />
              <span className="text-slate-500 font-bold">/</span>
              <input
                type="number"
                min="1"
                max="12"
                value={holidayForm.startMonth}
                onChange={(e) => setHolidayForm((curr) => ({ ...curr, startMonth: Number(e.target.value) }))}
                className="w-1/2 rounded border border-slate-700 bg-slate-900 px-1 py-0.5 text-xs text-center font-bold text-white"
              />
            </div>
          </div>

          <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 block">Kết Thúc (Ngày/Tháng)</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="1"
                max="31"
                value={holidayForm.endDay}
                onChange={(e) => setHolidayForm((curr) => ({ ...curr, endDay: Number(e.target.value) }))}
                className="w-1/2 rounded border border-slate-700 bg-slate-900 px-1 py-0.5 text-xs text-center font-bold text-white"
              />
              <span className="text-slate-500 font-bold">/</span>
              <input
                type="number"
                min="1"
                max="12"
                value={holidayForm.endMonth}
                onChange={(e) => setHolidayForm((curr) => ({ ...curr, endMonth: Number(e.target.value) }))}
                className="w-1/2 rounded border border-slate-700 bg-slate-900 px-1 py-0.5 text-xs text-center font-bold text-white"
              />
            </div>
          </div>
        </div>

        {/* Tên hiển thị gợi nhớ */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-300 block">Tên / Tiêu Đề Ngày Lễ:</label>
          <input
            type="text"
            value={holidayForm.holidayName}
            onChange={(e) => setHolidayForm((curr) => ({ ...curr, holidayName: e.target.value }))}
            placeholder="Nhập tên lễ gợi nhớ..."
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-amber-400"
          />
        </div>
      </div>

      {/* Hành Động Trong Form */}
      <div className="pt-2 border-t border-slate-800 space-y-1.5">
        <button
          type="button"
          onClick={() => onApply(false)}
          className="w-full py-2 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all flex items-center justify-center gap-1.5 shadow-md shadow-amber-950/50"
        >
          <Check className="w-4 h-4" />
          <span>Áp Dụng Rule Cho Lịch</span>
        </button>

        <button
          type="button"
          onClick={() => onApply(true)}
          className="w-full py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white transition-all flex items-center justify-center gap-1.5 shadow-sm"
        >
          <Save className="w-3.5 h-3.5" />
          <span>Áp Dụng & Lưu Ngay Lên Hệ Thống</span>
        </button>

        {holidayForm.id && (
          <button
            type="button"
            onClick={onDelete}
            className="w-full py-1.5 rounded-lg text-xs font-bold bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/60 transition-all flex items-center justify-center gap-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Xóa Rule Lễ Của Dải Ngày Này</span>
          </button>
        )}
      </div>
    </div>
  );
};

