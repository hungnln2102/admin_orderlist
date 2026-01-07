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
    <div className="relative rounded-3xl border border-white/20 bg-gradient-to-br from-indigo-200/40 via-indigo-300/35 to-slate-200/40 p-6 shadow-[0_20px_55px_-28px_rgba(0,0,0,0.65),0_14px_36px_-24px_rgba(255,255,255,0.2)] backdrop-blur">
      <h3 className="mb-6 text-lg font-semibold text-white">Tổng đơn và đơn hủy theo tháng</h3>

      <div className="w-full">
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e166" />
            <XAxis dataKey="month" stroke="#e5e7eb" tick={{ fill: "#e5e7eb", fontSize: 12 }} />
            <YAxis stroke="#e5e7eb" tick={{ fill: "#e5e7eb", fontSize: 12 }} />
            <Tooltip
              formatter={(value: number, _name: string, props?: Payload<number, string>) => [
                value,
                props?.dataKey === "total_orders" ? "Tổng đơn" : "Đơn hủy",
              ]}
              labelStyle={{ color: "#111827" }}
            />
            <Bar dataKey="total_orders" name="Tổng đơn" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="total_canceled" name="Đơn hủy" fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
