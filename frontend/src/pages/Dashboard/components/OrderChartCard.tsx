import React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Payload } from "recharts/types/component/DefaultTooltipContent";
import { OrderStatusData } from "../../../lib/api";

type OrderChartCardProps = {
  data: OrderStatusData[];
};

const LEGEND_ITEMS = [
  {
    label: "Tổng đơn",
    color: "#60a5fa",
    border: "rgba(96,165,250,0.35)",
  },
  {
    label: "Đơn hủy",
    color: "#f87171",
    border: "rgba(248,113,113,0.35)",
  },
] as const;

export const OrderChartCard: React.FC<OrderChartCardProps> = ({ data }) => {
  return (
    <section className="relative flex h-full min-h-[540px] flex-col overflow-hidden rounded-[32px] border border-rose-500/30 bg-[radial-gradient(circle_at_top_right,rgba(244,63,94,0.14),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.09),transparent_28%),linear-gradient(135deg,rgba(2,6,23,0.96),rgba(10,15,33,0.94))] p-5 shadow-[0_30px_80px_-30px_rgba(15,23,42,0.85)] backdrop-blur-xl sm:p-6 lg:p-7">
      <div className="border-b border-white/8 pb-5">
        <div className="max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-rose-300/85">
            Đơn hàng theo tháng
          </p>
          <h3 className="mt-2 text-xl font-bold text-white sm:text-2xl">
            Tổng đơn và đơn hủy theo tháng
          </h3>
          <p className="mt-2 text-sm text-slate-300/80">
            So sánh lượng đơn phát sinh và số đơn bị hủy trên cùng một trục thời gian để
            nhìn nhanh biến động từng tháng.
          </p>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 sm:gap-3">
          {LEGEND_ITEMS.map((item) => (
            <div
              key={item.label}
              className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold text-slate-200 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]"
              style={{ borderColor: item.border }}
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
              {item.label}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 flex-1 rounded-[28px] border border-white/8 bg-gradient-to-br from-slate-950/55 via-slate-950/30 to-slate-900/12 p-3 sm:p-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 14, right: 8, left: -12, bottom: 0 }}>
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
              axisLine={false}
              tickLine={false}
              width={40}
            />
            <Tooltip
              formatter={(value: number, _name: string, props?: Payload<number, string>) => [
                value,
                props?.dataKey === "total_orders" ? "Tổng đơn" : "Đơn hủy",
              ]}
              labelStyle={{ color: "#cbd5e1" }}
              contentStyle={{
                borderRadius: "14px",
                border: "1px solid rgba(244,63,94,0.28)",
                backgroundColor: "rgba(2, 6, 23, 0.96)",
                boxShadow: "0 20px 50px -20px rgba(15, 23, 42, 0.9)",
              }}
            />
            <Bar
              dataKey="total_orders"
              name="Tổng đơn"
              fill="#60a5fa"
              radius={[8, 8, 0, 0]}
              maxBarSize={28}
            />
            <Bar
              dataKey="total_canceled"
              name="Đơn hủy"
              fill="#f87171"
              radius={[8, 8, 0, 0]}
              maxBarSize={28}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
};
