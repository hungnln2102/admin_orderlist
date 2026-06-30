import React from "react";
import { formatCurrency } from "@/shared/money";
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

export type FinancialChartRow = {
  month: string;
  revenue: number;
  profit: number;
  refund: number;
  tax: number;
};

const currencyFormatter = formatCurrency;

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
  tax: {
    label: "Thuế",
    color: "#a78bfa",
    border: "rgba(167,139,250,0.35)",
    glow: "shadow-[0_0_0_1px_rgba(167,139,250,0.12)]",
    point: "diamond",
  },
} as const;

type PointShape = "circle" | "square" | "triangle" | "diamond";

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

  if (shape === "diamond") {
    return (
      <polygon
        points={`${cx},${cy - 5.5} ${cx + 5.5},${cy} ${cx},${cy + 5.5} ${cx - 5.5},${cy}`}
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



type FinancialLineChartProps = {
  chartData: FinancialChartRow[];
  tiltX: boolean;
};

export const FinancialChartLegend = renderLegend;

export const FinancialLineChart: React.FC<FinancialLineChartProps> = ({ chartData, tiltX }) => (
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
              tick={{ fill: "#a5b4fc", fontSize: tiltX ? 10 : 11 }}
              axisLine={false}
              tickLine={false}
              angle={tiltX ? -32 : 0}
              textAnchor={tiltX ? "end" : "middle"}
              height={tiltX ? 52 : 24}
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
            <Line
              type="linear"
              dataKey="tax"
              name={SERIES_STYLES.tax.label}
              stroke={SERIES_STYLES.tax.color}
              strokeWidth={2.5}
              dot={(props) => (
                <CustomMarker
                  cx={props.cx}
                  cy={props.cy}
                  color={SERIES_STYLES.tax.color}
                  shape={SERIES_STYLES.tax.point}
                />
              )}
              activeDot={{ r: 6 }}
            >
              <LabelList
                dataKey="tax"
                position="top"
                offset={14}
                formatter={labelFormatter}
                style={{ fill: SERIES_STYLES.tax.color, fontSize: 11, fontWeight: 600 }}
              />
            </Line>
          </LineChart>
        </ResponsiveContainer>
      </div>
);
