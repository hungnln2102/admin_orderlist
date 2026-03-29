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
import type { RevenueData } from "@/features/dashboard/api/dashboardApi";
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
    <div className="relative rounded-3xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/50 via-slate-900/60 to-slate-950/50 p-5 sm:p-6 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5),0_10px_30px_-15px_rgba(79,70,229,0.2)] hover:shadow-[0_30px_60px_-12px_rgba(0,0,0,0.6),0_15px_40px_-15px_rgba(79,70,229,0.3)] transition-all duration-300 backdrop-blur-xl">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-base font-bold text-white">Doanh thu theo tháng</h3>
        <select
          className="rounded-xl border border-indigo-400/40 bg-indigo-950/60 px-4 py-2 text-sm text-white/90 shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-400/60 focus:border-indigo-400/60 transition-all cursor-pointer hover:border-indigo-400/60"
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
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#4f46e522" />
            <XAxis dataKey="month" stroke="#a5b4fc" tick={{ fill: "#a5b4fc", fontSize: 12 }} />
            <YAxis
              stroke="#a5b4fc"
              tick={{ fill: "#a5b4fc", fontSize: 12 }}
              tickFormatter={(value) => `${Math.round((value as number) / 1_000_000)}M`}
            />
            <Tooltip
              formatter={(value: number) => [formatCurrency(value), "Doanh thu"]}
              labelStyle={{ color: "#111827", backgroundColor: "#fff" }}
              contentStyle={{ borderRadius: "12px", border: "1px solid rgba(79,70,229,0.3)", backgroundColor: "rgba(30,27,75,0.95)" }}
            />
            <Line
              type="monotone"
              dataKey="total_sales"
              stroke="#60a5fa"
              strokeWidth={3}
              dot={{ r: 5, fill: "#60a5fa" }}
              activeDot={{ r: 7, stroke: "#3b82f6", strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
