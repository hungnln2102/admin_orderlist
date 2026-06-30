import React from "react";
import type {
  DashboardChartGranularity,
  ProfitData,
  RefundData,
  RevenueData,
  TaxData,
} from "@/features/dashboard/api";
import { FinancialChartLegend, FinancialLineChart, type FinancialChartRow } from "./FinancialLineChart";

type FinancialChartsPanelProps = {
  revenueData: RevenueData[];
  profitData: ProfitData[];
  refundData: RefundData[];
  taxData: TaxData[];
  availableYears: number[];
  selectedYear: number;
  onYearChange: (year: number) => void;
  /** Khi true, ẩn chọn năm vì biểu đồ đang theo khoảng ngày tùy chọn */
  isRangeMode?: boolean;
  /** Bucket trục X: ngày | tháng | năm (dương lịch). */
  chartGranularity?: DashboardChartGranularity;
};

export const FinancialChartsPanel: React.FC<FinancialChartsPanelProps> = ({
  revenueData,
  profitData,
  refundData,
  taxData,
  availableYears,
  selectedYear,
  onYearChange,
  isRangeMode = false,
  chartGranularity = "month",
}) => {
  const chartData: FinancialChartRow[] = revenueData.map((item, index) => ({
    month: item.month,
    revenue: item.total_sales,
    profit: profitData[index]?.total_profit ?? 0,
    refund: refundData[index]?.total_refund ?? 0,
    tax: taxData[index]?.total_tax ?? 0,
  }));

  const tiltX =
    chartGranularity === "day" && chartData.length > 12;

  return (
    <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.15),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(244,63,94,0.12),transparent_30%),linear-gradient(135deg,rgba(2,6,23,0.96),rgba(10,15,33,0.94))] p-5 shadow-[0_30px_80px_-30px_rgba(15,23,42,0.85)] backdrop-blur-xl sm:p-6 lg:p-7">
      <div className="mb-5 flex flex-col gap-4 border-b border-white/8 pb-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-300/90">
              {chartGranularity === "day"
                ? "Tài chính theo ngày"
                : chartGranularity === "year"
                  ? "Tài chính theo năm"
                  : "Tài chính theo tháng"}
            </p>
            <h3 className="mt-2 text-xl font-bold text-white sm:text-2xl">
              Doanh thu, lợi nhuận, hoàn tiền và thuế
            </h3>

          </div>

          {isRangeMode ? (
            <div className="rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-2.5 text-sm font-medium text-white/75 shadow-lg">
              {chartGranularity === "day"
                ? "Theo từng ngày trong chu kỳ"
                : chartGranularity === "year"
                  ? "Theo từng năm dương lịch trong chu kỳ"
                  : "Theo từng tháng trong chu kỳ"}
            </div>
          ) : (
            <select
              className="rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-2.5 text-sm font-medium text-white shadow-lg outline-none transition focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/30"
              value={selectedYear}
              onChange={(event) => onYearChange(Number(event.target.value))}
            >
              {availableYears.length === 0 ? (
                <option value={selectedYear}>{selectedYear}</option>
              ) : (
                availableYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))
              )}
            </select>
          )}
        </div>

        <FinancialChartLegend />
      </div>

      <FinancialLineChart chartData={chartData} tiltX={tiltX} />
    </section>
  );
};
