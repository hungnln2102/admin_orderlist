import React from "react";
import {
  MagnifyingGlassIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import GradientButton from "@/components/ui/GradientButton";
import { DateRangePicker } from "@/components/ui/DateRangePicker";
import { formatDateToDMY, convertDMYToYMD } from "@/shared/date";

type FiltersBarProps = {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  dateStart: string;
  dateEnd: string;
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
  onDateStartChange,
  onDateEndChange,
  onExport,
  exportDisabled,
  onAddReceipt,
}) => {
  // Map parent DMY state to YMD range object for picker
  const pickerValue = React.useMemo(() => {
    if (!dateStart || !dateEnd) return null;
    return {
      from: convertDMYToYMD(dateStart),
      to: convertDMYToYMD(dateEnd),
    };
  }, [dateStart, dateEnd]);

  const handleDateRangeChange = (range: { from: string; to: string } | null) => {
    if (range) {
      onDateStartChange(formatDateToDMY(range.from));
      onDateEndChange(formatDateToDMY(range.to));
    } else {
      onDateStartChange("");
      onDateEndChange("");
    }
  };

  return (
    <div className="rounded-3xl bg-slate-900/40 border border-white/[0.06] p-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-md relative z-30">
      <div className="flex flex-col xl:flex-row gap-4 items-stretch xl:items-center">
        {/* Search Group */}
        <div className="relative flex-1 min-w-[260px]">
          <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-indigo-400 pointer-events-none z-10 opacity-70" />
          <input
            type="text"
            placeholder="Tìm mã đơn, người gửi hoặc ghi chú..."
            className="w-full h-12 pr-4 !pl-12 border border-white/[0.06] rounded-2xl bg-slate-950/40 text-sm text-white focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 outline-none transition-all placeholder:text-slate-500/70"
            value={searchTerm}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </div>

        {/* Separator on Desktop */}
        <div className="hidden xl:block w-px h-8 bg-white/[0.06] mx-1"></div>

        {/* Action & Filter Group */}
        <div className="w-full xl:w-auto grid grid-cols-1 sm:grid-cols-3 xl:flex xl:flex-row xl:items-center gap-3">
          {/* Date Picker Button */}
          <div className="w-full">
            <DateRangePicker
              value={pickerValue}
              onChange={handleDateRangeChange}
              placeholder="dd/mm/yyyy - dd/mm/yyyy"
            />
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
