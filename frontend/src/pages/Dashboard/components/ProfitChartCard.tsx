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
import { ProfitData } from "../../../lib/api";
import * as Helpers from "../../../lib/helpers";

type ProfitChartCardProps = {
  data: ProfitData[];
  availableYears: number[];
  selectedYear: number;
  onYearChange: (year: number) => void;
};

export const ProfitChartCard: React.FC<ProfitChartCardProps> = ({
  data,
  availableYears,
  selectedYear,
  onYearChange,
}) => {
  const formatCurrency = Helpers.formatCurrency;
  return (
    <div className="relative rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/50 via-slate-900/60 to-slate-950/50 p-5 sm:p-6 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5),0_10px_30px_-15px_rgba(34,197,94,0.2)] hover:shadow-[0_30px_60px_-12px_rgba(0,0,0,0.6),0_15px_40px_-15px_rgba(34,197,94,0.3)] transition-all duration-300 backdrop-blur-xl">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-base font-bold text-white">Lợi nhuận theo tháng</h3>
        <select
          className="rounded-xl border border-emerald-400/40 bg-emerald-950/60 px-4 py-2 text-sm text-white/90 shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-400/60 focus:border-emerald-400/60 transition-all cursor-pointer hover:border-emerald-400/60"
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
              formatter={(value: number) => [formatCurrency(value), "Lợi nhuận"]}
              labelStyle={{ color: "#111827", backgroundColor: "#fff" }}
              contentStyle={{ borderRadius: "12px", border: "1px solid rgba(34,197,94,0.3)", backgroundColor: "rgba(30,27,75,0.95)" }}
            />
            <Line
              type="monotone"
              dataKey="total_profit"
              stroke="#10b981"
              strokeWidth={3}
              dot={{ r: 5, fill: "#10b981" }}
              activeDot={{ r: 7, stroke: "#059669", strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
