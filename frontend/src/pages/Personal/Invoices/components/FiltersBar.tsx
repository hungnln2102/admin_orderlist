import React from "react";
import {
  CalendarDaysIcon,
  MagnifyingGlassIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import GradientButton from "../../../../components/ui/GradientButton";

type FiltersBarProps = {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  dateStart: string;
  dateEnd: string;
  dateRangeDisplay: string;
  rangePickerOpen: boolean;
  setRangePickerOpen: (open: boolean) => void;
  dateRangeRef: React.RefObject<HTMLDivElement>;
  toDisplayDate: (value: string) => string;
  toISODate: (value: string) => string;
  onDateStartChange: (value: string) => void;
  onDateEndChange: (value: string) => void;
  onExport: () => void;
  exportDisabled: boolean;
  onAddReceipt: () => void;
};

export const FiltersBar: React.FC<FiltersBarProps> = ({
  searchTerm,
  onSearchChange,
  dateStart,
  dateEnd,
  dateRangeDisplay,
  rangePickerOpen,
  setRangePickerOpen,
  dateRangeRef,
  toDisplayDate,
  toISODate,
  onDateStartChange,
  onDateEndChange,
  onExport,
  exportDisabled,
  onAddReceipt,
}) => {
  return (
    <div className="rounded-[32px] bg-gradient-to-br from-slate-800/65 via-slate-700/55 to-slate-900/65 border border-white/15 p-4 lg:p-5 shadow-[0_20px_55px_-30px_rgba(0,0,0,0.7),0_14px_34px_-26px_rgba(255,255,255,0.25)] backdrop-blur-sm relative z-10">
      <div className="flex flex-col lg:flex-row gap-4 items-center">
        {/* Search Group */}
        <div className="relative w-full lg:flex-1">
          <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-indigo-300 pointer-events-none z-10 opaciy-70" />
          <input
            type="text"
            placeholder="Tìm mã đơn, người gửi hoặc ghi chú..."
            className="w-full pr-4 py-3 border border-white/10 rounded-2xl bg-slate-950/40 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 outline-none transition-all placeholder:text-slate-400/70"
            style={{ paddingLeft: '3.25rem' }}
            value={searchTerm}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </div>

        {/* Action & Filter Group */}
        <div className="flex flex-wrap lg:flex-nowrap items-center gap-3 w-full lg:w-auto mt-2 lg:mt-0">
          <div className="hidden lg:block w-px h-8 bg-white/10 mx-1"></div>

          {/* Date Picker Button */}
          <div className="relative" ref={dateRangeRef}>
            <button
              type="button"
              onClick={() => setRangePickerOpen(!rangePickerOpen)}
              className={`flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl border transition-all text-sm min-w-[200px] ${
                rangePickerOpen
                  ? "border-indigo-400/50 bg-indigo-500/20 text-indigo-200"
                  : "border-white/10 bg-slate-950/40 text-white hover:bg-white/5"
              }`}
            >
              <span className="font-medium truncate">{dateRangeDisplay}</span>
              <CalendarDaysIcon className="w-5 h-5 opacity-70" />
            </button>

            {rangePickerOpen && (
              <div className="absolute right-0 top-[calc(100%+12px)] w-80 bg-slate-900 border border-white/15 rounded-2xl shadow-2xl z-50 p-5 space-y-4 backdrop-blur-xl">
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-indigo-300/80 uppercase tracking-widest px-1">Từ Ngày</label>
                    <input
                      type="date"
                      className="w-full bg-slate-950/50 border border-white/10 text-white rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all"
                      value={toISODate(dateStart)}
                      onChange={(event) => onDateStartChange(event.target.value ? toDisplayDate(event.target.value) : "")}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-indigo-300/80 uppercase tracking-widest px-1">Đến Ngày</label>
                    <input
                      type="date"
                      className="w-full bg-slate-950/50 border border-white/10 text-white rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all"
                      value={toISODate(dateEnd)}
                      onChange={(event) => onDateEndChange(event.target.value ? toDisplayDate(event.target.value) : "")}
                    />
                  </div>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-white/10">
                  <button className="text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors" onClick={() => { onDateStartChange(""); onDateEndChange(""); }}>Xóa</button>
                  <div className="flex gap-2">
                    <button className="px-4 py-2 text-xs font-semibold text-white/70 hover:text-white transition-colors" onClick={() => setRangePickerOpen(false)}>Đóng</button>
                    <button className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-500 transition-all shadow-lg" onClick={() => setRangePickerOpen(false)}>Áp Dụng</button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="hidden lg:block w-px h-8 bg-white/10 mx-1"></div>

          <GradientButton icon={PlusIcon} onClick={onAddReceipt} className="!py-2.5 !px-5 text-sm">
            Thêm biên nhận
          </GradientButton>

          <button
            type="button"
            onClick={onExport}
            disabled={exportDisabled}
            className={`px-5 py-2.5 rounded-2xl text-sm font-semibold transition-all border ${
              exportDisabled
                ? "bg-white/5 text-white/30 border-white/5 cursor-not-allowed"
                : "bg-white/5 text-white border-white/10 hover:bg-white/10"
            }`}
          >
            Tải Về
          </button>
        </div>
      </div>
    </div>
  );
};
