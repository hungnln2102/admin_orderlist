import React from "react";
import {
  CalendarDaysIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";

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
}) => {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6 space-y-4 relative z-50">
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm mã đơn, người gửi hoặc ghi chú..."
            className="w-full pl-12 pr-4 py-3 border border-gray-200 bg-gray-50/60 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
            value={searchTerm}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </div>

        <div className="relative z-[120] flex items-stretch" ref={dateRangeRef}>
          <button
            type="button"
            onClick={() => setRangePickerOpen(!rangePickerOpen)}
            className={`flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border transition w-full lg:w-64 ${
              rangePickerOpen
                ? "border-indigo-400/70 bg-indigo-900/60 shadow-[0_10px_30px_-18px_rgba(79,70,229,0.65)]"
                : "border-white/15 bg-slate-900/70 text-white hover:bg-slate-800/70 shadow-[0_10px_26px_-18px_rgba(0,0,0,0.65)]"
            } text-white`}
          >
            <div className="flex flex-col text-left">
              <span className="text-sm font-medium">{dateRangeDisplay}</span>
            </div>
            <CalendarDaysIcon
              className={`w-5 h-5 ${
                rangePickerOpen ? "text-indigo-300" : "text-slate-200"
              }`}
            />
          </button>

          {rangePickerOpen && (
            <div className="absolute right-0 top-[calc(100%+8px)] w-80 bg-white border border-gray-200 rounded-2xl shadow-xl z-[150] p-4 space-y-4">
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">
                    Từ Ngày
                  </label>
                  <input
                    type="date"
                    inputMode="numeric"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    value={toISODate(dateStart)}
                    onChange={(event) =>
                      onDateStartChange(
                        event.target.value ? toDisplayDate(event.target.value) : ""
                      )
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">
                    Đến Ngày
                  </label>
                  <input
                    type="date"
                    inputMode="numeric"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    value={toISODate(dateEnd)}
                    onChange={(event) =>
                      onDateEndChange(
                        event.target.value ? toDisplayDate(event.target.value) : ""
                      )
                    }
                  />
                </div>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                <button
                  className="text-sm font-medium text-blue-600 hover:text-blue-800"
                  onClick={() => {
                    onDateStartChange("");
                    onDateEndChange("");
                  }}
                >
                  Xóa Khoảng
                </button>
                <div className="flex gap-2">
                  <button
                    className="px-3 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-indigo-500/10"
                    onClick={() => setRangePickerOpen(false)}
                  >
                    Đóng
                  </button>
                  <button
                    className="px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                    onClick={() => setRangePickerOpen(false)}
                  >
                    Áp Dụng
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onExport}
          disabled={exportDisabled}
          className={`px-5 py-3 rounded-2xl bg-gray-900 text-white text-sm font-semibold transition-colors shadow-sm ${
            exportDisabled ? "opacity-60 cursor-not-allowed" : "hover:bg-gray-700"
          }`}
        >
          Tải Về
        </button>
      </div>
    </div>
  );
};
