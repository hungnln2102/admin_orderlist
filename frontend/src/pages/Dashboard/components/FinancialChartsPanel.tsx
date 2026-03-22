import React from "react";
import {
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ProfitData, RefundData, RevenueData } from "../../../lib/api";
import * as Helpers from "../../../lib/helpers";

type FinancialChartsPanelProps = {
  revenueData: RevenueData[];
  profitData: ProfitData[];
  refundData: RefundData[];
  availableYears: number[];
  selectedYear: number;
  onYearChange: (year: number) => void;
};

type FinancialChartRow = {
  month: string;
  revenue: number;
  profit: number;
  refund: number;
};

const currencyFormatter = Helpers.formatCurrency;

const axisCurrencyFormatter = (value: number) => {
  const absolute = Math.abs(Number(value) || 0);
  if (absolute >= 1_000_000_000) {
    return `${Math.round(value / 1_000_000_000)}B`;
  }
  if (absolute >= 1_000_000) {
    return `${Math.round(value / 1_000_000)}M`;
  }
  if (absolute >= 1_000) {
    return `${Math.round(value / 1_000)}K`;
  }
  return `${Math.round(value)}`;
};

const SERIES_STYLES = {
  revenue: {
    label: "Doanh thu",
    color: "#60a5fa",
    border: "rgba(96,165,250,0.35)",
    glow: "shadow-[0_0_0_1px_rgba(96,165,250,0.12)]",
    point: "circle",
  },
  profit: {
    label: "Lợi nhuận",
    color: "#10b981",
    border: "rgba(16,185,129,0.35)",
    glow: "shadow-[0_0_0_1px_rgba(16,185,129,0.12)]",
    point: "square",
  },
  refund: {
    label: "Hoàn tiền",
    color: "#fb7185",
    border: "rgba(251,113,133,0.35)",
    glow: "shadow-[0_0_0_1px_rgba(251,113,133,0.12)]",
    point: "triangle",
  },
} as const;

type PointShape = "circle" | "square" | "triangle";

type MarkerProps = {
  cx?: number;
  cy?: number;
  color: string;
  shape: PointShape;
};

const CustomMarker: React.FC<MarkerProps> = ({ cx = 0, cy = 0, color, shape }) => {
  if (shape === "square") {
    return (
      <rect
        x={cx - 4}
        y={cy - 4}
        width={8}
        height={8}
        rx={1.5}
        fill={color}
        stroke="rgba(15,23,42,0.9)"
        strokeWidth={1.5}
      />
    );
  }

  if (shape === "triangle") {
    return (
      <path
        d={`M ${cx} ${cy - 5} L ${cx - 5} ${cy + 4} L ${cx + 5} ${cy + 4} Z`}
        fill={color}
        stroke="rgba(15,23,42,0.9)"
        strokeWidth={1.5}
      />
    );
  }

  return (
    <circle
      cx={cx}
      cy={cy}
      r={4.5}
      fill={color}
      stroke="rgba(15,23,42,0.9)"
      strokeWidth={1.5}
    />
  );
};

const labelFormatter = (value: number) => {
  const numeric = Number(value) || 0;
  return numeric > 0 ? axisCurrencyFormatter(numeric) : "";
};

const renderLegend = () => (
  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
    {Object.values(SERIES_STYLES).map((series) => (
      <div
        key={series.label}
        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold text-slate-200 ${series.glow}`}
        style={{ borderColor: series.border }}
      >
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: series.color }}
        />
        {series.label}
      </div>
    ))}
  </div>
);

export const FinancialChartsPanel: React.FC<FinancialChartsPanelProps> = ({
  revenueData,
  profitData,
  refundData,
  availableYears,
  selectedYear,
  onYearChange,
}) => {
  const chartData: FinancialChartRow[] = revenueData.map((item, index) => ({
    month: item.month,
    revenue: item.total_sales,
    profit: profitData[index]?.total_profit ?? 0,
    refund: refundData[index]?.total_refund ?? 0,
  }));

  return (
    <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.15),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(244,63,94,0.12),transparent_30%),linear-gradient(135deg,rgba(2,6,23,0.96),rgba(10,15,33,0.94))] p-5 shadow-[0_30px_80px_-30px_rgba(15,23,42,0.85)] backdrop-blur-xl sm:p-6 lg:p-7">
      <div className="mb-5 flex flex-col gap-4 border-b border-white/8 pb-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-300/90">
              Tài chính theo tháng
            </p>
            <h3 className="mt-2 text-xl font-bold text-white sm:text-2xl">
              Doanh thu, lợi nhuận và hoàn tiền
            </h3>
            <p className="mt-2 text-sm text-slate-300/80">
              Một biểu đồ đường duy nhất với ba dải dữ liệu màu khác nhau để so sánh trực tiếp theo từng tháng.
            </p>
          </div>

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
        </div>

        {renderLegend()}
      </div>

      <div className="rounded-[28px] border border-white/8 bg-gradient-to-br from-slate-950/50 via-slate-950/25 to-slate-900/10 p-3 sm:p-4">
        <ResponsiveContainer width="100%" height={380}>
          <LineChart
            data={chartData}
            margin={{ top: 18, right: 16, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#33415533" />
            <XAxis
              dataKey="month"
              stroke="#a5b4fc"
              tick={{ fill: "#a5b4fc", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              stroke="#a5b4fc"
              tick={{ fill: "#a5b4fc", fontSize: 11 }}
              tickFormatter={axisCurrencyFormatter}
              axisLine={false}
              tickLine={false}
              width={48}
            />
            <Tooltip
              formatter={(value: number, name: string) => [currencyFormatter(value), name]}
              labelStyle={{ color: "#cbd5e1" }}
              contentStyle={{
                borderRadius: "14px",
                border: "1px solid rgba(148,163,184,0.22)",
                backgroundColor: "rgba(2, 6, 23, 0.96)",
                boxShadow: "0 20px 50px -20px rgba(15, 23, 42, 0.9)",
              }}
            />
            <Line
              type="linear"
              dataKey="revenue"
              name={SERIES_STYLES.revenue.label}
              stroke={SERIES_STYLES.revenue.color}
              strokeWidth={2.5}
              dot={(props) => (
                <CustomMarker
                  cx={props.cx}
                  cy={props.cy}
                  color={SERIES_STYLES.revenue.color}
                  shape={SERIES_STYLES.revenue.point}
                />
              )}
              activeDot={{ r: 6 }}
            >
              <LabelList
                dataKey="revenue"
                position="top"
                offset={8}
                formatter={labelFormatter}
                style={{ fill: SERIES_STYLES.revenue.color, fontSize: 11, fontWeight: 600 }}
              />
            </Line>
            <Line
              type="linear"
              dataKey="profit"
              name={SERIES_STYLES.profit.label}
              stroke={SERIES_STYLES.profit.color}
              strokeWidth={2.5}
              dot={(props) => (
                <CustomMarker
                  cx={props.cx}
                  cy={props.cy}
                  color={SERIES_STYLES.profit.color}
                  shape={SERIES_STYLES.profit.point}
                />
              )}
              activeDot={{ r: 6 }}
            >
              <LabelList
                dataKey="profit"
                position="top"
                offset={8}
                formatter={labelFormatter}
                style={{ fill: SERIES_STYLES.profit.color, fontSize: 11, fontWeight: 600 }}
              />
            </Line>
            <Line
              type="linear"
              dataKey="refund"
              name={SERIES_STYLES.refund.label}
              stroke={SERIES_STYLES.refund.color}
              strokeWidth={2.5}
              dot={(props) => (
                <CustomMarker
                  cx={props.cx}
                  cy={props.cy}
                  color={SERIES_STYLES.refund.color}
                  shape={SERIES_STYLES.refund.point}
                />
              )}
              activeDot={{ r: 6 }}
            >
              <LabelList
                dataKey="refund"
                position="top"
                offset={8}
                formatter={labelFormatter}
                style={{ fill: SERIES_STYLES.refund.color, fontSize: 11, fontWeight: 600 }}
              />
            </Line>
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
};
