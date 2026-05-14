import React from "react";
import type { DashboardDateRangeValue } from "./DashboardDateRangeFilter";
import { TAX_ORDER_START_DATE } from "@/features/tax/api/taxApi";

const VN_TZ = "Asia/Ho_Chi_Minh";

function vnCalendarParts(d: Date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: VN_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const y = parts.find((p) => p.type === "year")!.value;
  const m = parts.find((p) => p.type === "month")!.value;
  const day = parts.find((p) => p.type === "day")!.value;
  return {
    y: Number(y),
    m: Number(m),
    d: Number(day),
    ymd: `${y}-${m}-${day}`,
  };
}

function vnTodayYmd(): string {
  return vnCalendarParts().ymd;
}

/** 10 ngày gần nhất theo lịch VN, `to` = hôm nay (ngày cuối). */
function vnLastNDaysEndingToday(n: number): DashboardDateRangeValue {
  const to = vnTodayYmd();
  const toMid = new Date(`${to}T12:00:00+07:00`);
  const fromMid = new Date(toMid.getTime() - (n - 1) * 86400000);
  const from = vnCalendarParts(fromMid).ymd;
  return { from, to };
}

const DAY_PRESET_DAYS = 10;

/** Mốc 22/04 (form thuế) → cuối tháng hiện tại (VN): mỗi tháng một cột trên biểu đồ «Tháng». */
function vnTaxStartThroughCurrentMonthEnd(): DashboardDateRangeValue {
  const { y, m } = vnCalendarParts();
  const mm = String(m).padStart(2, "0");
  const lastDay = new Date(y, m, 0).getDate();
  const to = `${y}-${mm}-${String(lastDay).padStart(2, "0")}`;
  const from = TAX_ORDER_START_DATE;
  if (from > to) {
    return { from: `${y}-${mm}-01`, to };
  }
  return { from, to };
}

/** Năm: từ năm liền trước mốc form thuế (vd. 2025 vs 2026…) → 31/12 năm hiện tại (VN); mỗi năm một cột. */
function vnTaxStartYearThroughCurrentYearEnd(): DashboardDateRangeValue {
  const taxY = Number(TAX_ORDER_START_DATE.slice(0, 4));
  const { y: curY } = vnCalendarParts();
  const baselineYear = Math.max(1970, taxY - 1);
  const from = `${baselineYear}-01-01`;
  const to = `${curY}-12-31`;
  if (from > to) {
    return { from: `${curY}-01-01`, to, chartBucket: "year" };
  }
  return { from, to, chartBucket: "year" };
}

function rangesEqual(
  a: DashboardDateRangeValue | null,
  b: DashboardDateRangeValue | null
): boolean {
  if (!a || !b) return false;
  return a.from === b.from && a.to === b.to;
}

type Preset = "day" | "month" | "year" | "total";

type Props = {
  range: DashboardDateRangeValue | null;
  onChange: (next: DashboardDateRangeValue | null) => void;
  className?: string;
};

export const DashboardCyclePresetButtons: React.FC<Props> = ({
  range,
  onChange,
  className = "",
}) => {
  const dayRange = vnLastNDaysEndingToday(DAY_PRESET_DAYS);
  const monthRange = vnTaxStartThroughCurrentMonthEnd();
  const annualRange = vnTaxStartYearThroughCurrentYearEnd();

  let activePreset: Preset | null = null;
  if (range === null) activePreset = "total";
  else if (rangesEqual(range, dayRange)) activePreset = "day";
  else if (rangesEqual(range, monthRange)) activePreset = "month";
  else if (rangesEqual(range, annualRange)) activePreset = "year";

  const btnBase =
    "rounded-xl border px-2.5 py-2 text-[11px] font-bold uppercase tracking-wider transition-all duration-200 sm:px-3 sm:text-xs";

  const btnIdle =
    "border-white/[0.12] bg-slate-950/50 text-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:border-white/[0.18] hover:bg-slate-900/60 hover:text-white";

  const btnOn =
    "border-indigo-400/45 bg-gradient-to-r from-indigo-600/85 to-sky-600/75 text-white shadow-[0_8px_24px_-8px_rgba(79,70,229,0.45)] ring-1 ring-white/10";

  const mkClass = (key: Preset) =>
    [btnBase, activePreset === key ? btnOn : btnIdle].join(" ");

  return (
    <div
      className={[
        "flex flex-wrap items-center gap-1.5 sm:gap-2",
        className.trim(),
      ]
        .filter(Boolean)
        .join(" ")}
      role="group"
      aria-label="Lọc nhanh chu kỳ"
    >
      <button
        type="button"
        className={mkClass("day")}
        onClick={() =>
          onChange({
            ...vnLastNDaysEndingToday(DAY_PRESET_DAYS),
            chartBucket: "day",
          })
        }
      >
        Ngày
      </button>
      <button
        type="button"
        className={mkClass("month")}
        onClick={() => onChange({ ...monthRange, chartBucket: "month" })}
      >
        Tháng
      </button>
      <button
        type="button"
        className={mkClass("year")}
        onClick={() => onChange({ ...annualRange, chartBucket: "year" })}
      >
        Năm
      </button>
      <button type="button" className={mkClass("total")} onClick={() => onChange(null)}>
        Tổng
      </button>
    </div>
  );
};
