import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Calendar, ChevronLeft, ChevronRight, X, Clock } from "lucide-react";

interface DateRangePickerProps {
  startDate: string; // "YYYY-MM-DD"
  endDate: string;   // "YYYY-MM-DD"
  onChange: (start: string, end: string) => void;
  label?: string;
  className?: string;
}

function formatDateDisplay(isoStr?: string): string {
  if (!isoStr) return "DD/MM/YYYY";
  const parts = isoStr.split("-");
  if (parts.length !== 3) return isoStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function parseIso(isoStr: string): Date {
  if (!isoStr) return new Date();
  const [y, m, d] = isoStr.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function formatIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}



export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  startDate,
  endDate,
  onChange,
  label = "Thời Hạn Đơn Hàng",
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; right?: number; isMobile: boolean } | null>(null);

  const initialDate = startDate ? parseIso(startDate) : new Date();
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth());
  const [activePicking, setActivePicking] = useState<"start" | "end">("start");

  const updateCoords = () => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      const isMobile = window.innerWidth < 640;
      if (isMobile) {
        const top = Math.max(16, Math.min(rect.bottom + 6, window.innerHeight - 440));
        setCoords({ top, isMobile: true });
      } else {
        const right = Math.max(16, window.innerWidth - rect.right);
        const top = rect.bottom + 6;
        setCoords({ top, right, isMobile: false });
      }
    }
  };

  const toggleOpen = () => {
    if (!isOpen) {
      updateCoords();
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        isOpen &&
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Update coords on scroll/resize when open
  useEffect(() => {
    if (isOpen) {
      window.addEventListener("scroll", updateCoords, true);
      window.addEventListener("resize", updateCoords);
    }
    return () => {
      window.removeEventListener("scroll", updateCoords, true);
      window.removeEventListener("resize", updateCoords);
    };
  }, [isOpen]);

  const startD = startDate ? parseIso(startDate) : null;
  const endD = endDate ? parseIso(endDate) : null;
  let diffDays = 0;
  if (startD && endD) {
    diffDays = Math.ceil((endD.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  }

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const offset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

  const monthNames = [
    "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
    "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"
  ];

  const handleDayClick = (dayNum: number) => {
    const selectedDate = new Date(viewYear, viewMonth, dayNum);
    const selectedIso = formatIso(selectedDate);

    if (activePicking === "start") {
      if (endD && selectedDate > endD) {
        const newEnd = new Date(selectedDate.getTime() + 365 * 24 * 60 * 60 * 1000);
        onChange(selectedIso, formatIso(newEnd));
      } else {
        onChange(selectedIso, endDate || selectedIso);
      }
      setActivePicking("end");
    } else {
      if (startD && selectedDate < startD) {
        onChange(selectedIso, selectedIso);
      } else {
        onChange(startDate || selectedIso, selectedIso);
      }
    }
  };

  return (
    <div className={`relative ${className}`}>
      {label && <label className="block font-semibold text-slate-400 mb-1 text-xs">{label}</label>}

      {/* Main Single Combined Input Display Field */}
      <div
        ref={inputRef}
        onClick={toggleOpen}
        className="w-full flex items-center justify-between px-3 py-2 bg-slate-900 border border-slate-800 hover:border-cyan-500/60 rounded-xl text-white cursor-pointer transition shadow-inner group"
      >
        <div className="flex items-center gap-2 font-mono text-xs sm:text-sm font-bold text-cyan-300">
          <Calendar className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
          <span>
            {formatDateDisplay(startDate)} — {formatDateDisplay(endDate)}
          </span>
        </div>
        {diffDays > 0 && (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
            {diffDays} ngày ({Math.round((diffDays / 365) * 10) / 10} năm)
          </span>
        )}
      </div>

      {/* Floating Popover Portal (Fixed Position Right Under Input, z-index 9999) */}
      {isOpen && coords &&
        createPortal(
          <div
            ref={popoverRef}
            style={
              coords.isMobile
                ? {
                    position: "fixed",
                    top: `${coords.top}px`,
                    left: "12px",
                    right: "12px",
                    maxHeight: "calc(100vh - 32px)",
                  }
                : {
                    position: "fixed",
                    top: `${coords.top}px`,
                    right: `${coords.right}px`,
                  }
            }
            className="z-[9999] w-full max-w-[360px] sm:max-w-[380px] mx-auto bg-slate-900 border border-slate-700/80 backdrop-blur-2xl rounded-2xl shadow-2xl p-3.5 sm:p-4 space-y-3 text-xs text-slate-200 animate-in fade-in zoom-in-95 duration-150 overflow-y-auto custom-scrollbar"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-white text-xs sm:text-sm flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-cyan-400" /> Chọn Thời Hạn Đơn Hàng
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Combined Date Selector Row (Nhập / Chọn ngày bắt đầu & kết thúc) */}
            <div className="grid grid-cols-2 gap-2 bg-slate-950/80 p-2 rounded-xl border border-slate-800">
              <div
                onClick={() => setActivePicking("start")}
                className={`p-2 rounded-xl border transition cursor-pointer ${
                  activePicking === "start"
                    ? "bg-cyan-500/15 border-cyan-500/50 shadow-sm"
                    : "bg-slate-900/60 border-slate-800/80 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  <span>Bắt đầu (Từ)</span>
                  {activePicking === "start" && (
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  )}
                </div>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => onChange(e.target.value, endDate)}
                  onClick={(e) => e.stopPropagation()}
                  onFocus={() => setActivePicking("start")}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-cyan-300 font-mono font-bold focus:outline-none focus:border-cyan-500/60"
                />
              </div>

              <div
                onClick={() => setActivePicking("end")}
                className={`p-2 rounded-xl border transition cursor-pointer ${
                  activePicking === "end"
                    ? "bg-cyan-500/15 border-cyan-500/50 shadow-sm"
                    : "bg-slate-900/60 border-slate-800/80 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  <span>Kết thúc (Đến)</span>
                  {activePicking === "end" && (
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  )}
                </div>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => onChange(startDate, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onFocus={() => setActivePicking("end")}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-cyan-300 font-mono font-bold focus:outline-none focus:border-cyan-500/60"
                />
              </div>
            </div>

            {/* Custom Dark Calendar View */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 space-y-2">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-bold text-white text-xs">
                  {monthNames[viewMonth]} {viewYear}
                </span>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-7 text-center font-bold text-[10px] text-slate-500">
                <span>T2</span><span>T3</span><span>T4</span><span>T5</span><span>T6</span><span>T7</span><span>CN</span>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center font-mono text-xs">
                {Array.from({ length: offset }).map((_, i) => (
                  <div key={`offset-${i}`} />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const dayNum = i + 1;
                  const dateObj = new Date(viewYear, viewMonth, dayNum);
                  const iso = formatIso(dateObj);

                  const isStart = startDate === iso;
                  const isEnd = endDate === iso;
                  const inRange = startD && endD && dateObj > startD && dateObj < endD;

                  let btnClass = "hover:bg-cyan-500/20 text-slate-300";
                  if (isStart || isEnd) {
                    btnClass = "bg-cyan-500 text-slate-950 font-bold rounded-lg shadow-sm";
                  } else if (inRange) {
                    btnClass = "bg-cyan-500/15 text-cyan-300 rounded-md";
                  }

                  return (
                    <button
                      key={dayNum}
                      type="button"
                      onClick={() => handleDayClick(dayNum)}
                      className={`h-7 w-full flex items-center justify-center rounded-lg transition text-xs ${btnClass}`}
                    >
                      {dayNum}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-xs transition shadow-md"
              >
                Xác Nhận & Đóng
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
