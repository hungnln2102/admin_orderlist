import React from "react";
import {
  CalendarDaysIcon,
  MagnifyingGlassIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import GradientButton from "@/components/ui/GradientButton";

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
    <div className="rounded-3xl bg-slate-900/40 border border-white/[0.06] p-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-md relative z-10">
      <div className="flex flex-col xl:flex-row gap-4 items-stretch xl:items-center">
        {/* Search Group */}
        <div className="relative flex-1 min-w-[260px]">
          <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-indigo-400 pointer-events-none z-10 opacity-70" />
          <input
            type="text"
            placeholder="Tìm mã đơn, người gửi hoặc ghi chú..."
            className="w-full h-12 pr-4 pl-12 border border-white/[0.06] rounded-2xl bg-slate-950/40 text-sm text-white focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 outline-none transition-all placeholder:text-slate-500/70"
            value={searchTerm}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </div>

        {/* Separator on Desktop */}
        <div className="hidden xl:block w-px h-8 bg-white/[0.06] mx-1"></div>

        {/* Action & Filter Group */}
        <div className="w-full xl:w-auto grid grid-cols-1 sm:grid-cols-3 xl:flex xl:flex-row xl:items-center gap-3">
          {/* Date Picker Button */}
          <div className="relative w-full" ref={dateRangeRef}>
            <button
              type="button"
              onClick={() => setRangePickerOpen(!rangePickerOpen)}
              className={`w-full h-12 flex items-center justify-between gap-3 px-4 rounded-2xl border transition-all text-sm xl:min-w-[220px] ${
                rangePickerOpen
                  ? "border-indigo-400/50 bg-indigo-500/10 text-indigo-200"
                  : "border-white/[0.06] bg-slate-950/40 text-white hover:bg-white/[0.03]"
              }`}
            >
              <span className="font-medium truncate">{dateRangeDisplay}</span>
              <CalendarDaysIcon className="w-5 h-5 opacity-70 shrink-0" />
            </button>

            {rangePickerOpen && (
              <div className="absolute right-0 xl:right-0 top-[calc(100%+12px)] w-full sm:w-80 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl z-50 p-5 space-y-4 backdrop-blur-xl">
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-indigo-300/80 uppercase tracking-widest px-1">Từ Ngày</label>
                    <input
                      type="date"
                      className="w-full bg-slate-950/50 border border-white/[0.06] text-white rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/30 outline-none transition-all"
                      value={toISODate(dateStart)}
                      onChange={(event) => onDateStartChange(event.target.value ? toDisplayDate(event.target.value) : "")}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-indigo-300/80 uppercase tracking-widest px-1">Đến Ngày</label>
                    <input
                      type="date"
                      className="w-full bg-slate-950/50 border border-white/[0.06] text-white rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/30 outline-none transition-all"
                      value={toISODate(dateEnd)}
                      onChange={(event) => onDateEndChange(event.target.value ? toDisplayDate(event.target.value) : "")}
                    />
                  </div>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-white/[0.06]">
                  <button className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors" onClick={() => { onDateStartChange(""); onDateEndChange(""); }}>Xóa</button>
                  <div className="flex gap-2">
                    <button className="px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors" onClick={() => setRangePickerOpen(false)}>Đóng</button>
                    <button className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-950/50" onClick={() => setRangePickerOpen(false)}>Áp Dụng</button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <GradientButton
            icon={PlusIcon}
            onClick={onAddReceipt}
            className="w-full xl:w-auto h-12 justify-center whitespace-nowrap !rounded-2xl"
          >
            Thêm biên nhận
          </GradientButton>

          <button
            type="button"
            onClick={onExport}
            disabled={exportDisabled}
            className={`w-full xl:w-auto h-12 flex items-center justify-center px-5 rounded-2xl text-sm font-semibold transition-all border whitespace-nowrap ${
              exportDisabled
                ? "bg-white/5 text-white/30 border-white/5 cursor-not-allowed"
                : "bg-white/5 text-white border-white/[0.06] hover:bg-white/[0.03] hover:border-white/10"
            }`}
          >
            Tải Về
          </button>
        </div>
      </div>
    </div>
  );
};
