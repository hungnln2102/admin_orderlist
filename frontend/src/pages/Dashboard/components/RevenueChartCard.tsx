import React from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { RevenueData } from "../../../lib/api";
import * as Helpers from "../../../lib/helpers";

type RevenueChartCardProps = {
  data: RevenueData[];
  availableYears: number[];
  selectedYear: number;
  onYearChange: (year: number) => void;
};

export const RevenueChartCard: React.FC<RevenueChartCardProps> = ({
  data,
  availableYears,
  selectedYear,
  onYearChange,
}) => {
  const formatCurrency = Helpers.formatCurrency;
  return (
    <div className="relative rounded-3xl border border-white/20 bg-gradient-to-br from-indigo-200/40 via-indigo-300/35 to-slate-200/40 p-6 shadow-[0_20px_55px_-28px_rgba(0,0,0,0.65),0_14px_36px_-24px_rgba(255,255,255,0.2)] backdrop-blur">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Doanh thu theo tháng</h3>
        <select
          className="rounded-2xl border border-white/60 bg-white/80 px-3 py-1 text-sm text-white/80 shadow-inner focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300"
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

      <div className="w-full">
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e166" />
            <XAxis dataKey="month" stroke="#e5e7eb" tick={{ fill: "#e5e7eb", fontSize: 12 }} />
            <YAxis
              stroke="#e5e7eb"
              tick={{ fill: "#e5e7eb", fontSize: 12 }}
              tickFormatter={(value) => `${Math.round((value as number) / 1_000_000)}M`}
            />
            <Tooltip
              formatter={(value: number) => [formatCurrency(value), "Doanh thu"]}
              labelStyle={{ color: "#111827" }}
            />
            <Line
              type="monotone"
              dataKey="total_sales"
              stroke="#3b82f6"
              strokeWidth={3}
              dot={{ r: 4, fill: "#3b82f6" }}
              activeDot={{ r: 6, stroke: "#2563eb", strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
