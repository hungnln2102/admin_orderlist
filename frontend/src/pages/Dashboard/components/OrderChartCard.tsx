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

export const OrderChartCard: React.FC<OrderChartCardProps> = ({ data }) => {
  return (
    <div className="relative rounded-3xl border border-rose-500/30 bg-gradient-to-br from-slate-950/50 via-slate-900/60 to-slate-950/50 p-5 sm:p-6 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5),0_10px_30px_-15px_rgba(244,63,94,0.2)] hover:shadow-[0_30px_60px_-12px_rgba(0,0,0,0.6),0_15px_40px_-15px_rgba(244,63,94,0.3)] transition-all duration-300 backdrop-blur-xl">
      <h3 className="mb-5 text-base font-bold text-white">Tổng đơn và đơn hủy theo tháng</h3>

      <div className="w-full">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#4f46e522" />
            <XAxis dataKey="month" stroke="#a5b4fc" tick={{ fill: "#a5b4fc", fontSize: 12 }} />
            <YAxis stroke="#a5b4fc" tick={{ fill: "#a5b4fc", fontSize: 12 }} />
            <Tooltip
              formatter={(value: number, _name: string, props?: Payload<number, string>) => [
                value,
                props?.dataKey === "total_orders" ? "Tổng đơn" : "Đơn hủy",
              ]}
              labelStyle={{ color: "#111827", backgroundColor: "#fff" }}
              contentStyle={{ borderRadius: "12px", border: "1px solid rgba(244,63,94,0.3)", backgroundColor: "rgba(30,27,75,0.95)" }}
            />
            <Bar dataKey="total_orders" name="Tổng đơn" fill="#60a5fa" radius={[6, 6, 0, 0]} />
            <Bar dataKey="total_canceled" name="Đơn hủy" fill="#f87171" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
