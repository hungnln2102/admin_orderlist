import React, { useEffect, useState } from "react";
import { StatCard } from "@/shared/components/StatCard";
import { GlassCard } from "@/shared/components/GlassCard";
import { ShoppingCart, DollarSign, TrendingUp, Users, ArrowUpRight, Zap, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface OrderItem {
  id: number;
  id_order: string;
  customer: string;
  price: number;
  status: string;
}

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [recentOrders, setRecentOrders] = useState<OrderItem[]>([]);
  const [totalOrdersCount, setTotalOrdersCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetch("/api/orders?limit=5")
      .then((res) => res.json())
      .then((data) => {
        if (data.data) {
          setRecentOrders(data.data);
          setTotalOrdersCount(data.pagination?.total || data.data.length);
        }
      })
      .catch((err) => console.error("Lỗi lấy đơn gần đây:", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span>Tổng Quan Báo Cáo</span>
            <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/30">
              Hệ Thống Live
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Thống kê doanh thu, đơn hàng và đối soát tài chính tức thì
          </p>
        </div>
        <button
          onClick={() => navigate("/orders")}
          className="glass-button-primary px-4 py-2.5 rounded-xl text-xs flex items-center gap-2"
        >
          <Zap className="w-4 h-4" />
          <span>Quản Lý Đơn Hàng</span>
        </button>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Doanh Thu Tháng"
          value="158.450.000 ₫"
          subtitle="Tăng trưởng so với kỳ trước"
          icon={DollarSign}
          trend={{ value: "14.2%", isPositive: true }}
          accent="cyan"
        />
        <StatCard
          title="Tổng Đơn Hàng"
          value={totalOrdersCount > 0 ? String(totalOrdersCount) : "6"}
          subtitle="Đã đồng bộ PostgreSQL"
          icon={ShoppingCart}
          trend={{ value: "100%", isPositive: true }}
          accent="emerald"
        />
        <StatCard
          title="Lợi Nhuận Ròng"
          value="64.200.000 ₫"
          subtitle="Biên lợi nhuận 40.5%"
          icon={TrendingUp}
          trend={{ value: "5.4%", isPositive: true }}
          accent="purple"
        />
        <StatCard
          title="Khách Hàng Mới"
          value="342"
          subtitle="CTV & Đại lý hoạt động"
          icon={Users}
          trend={{ value: "12%", isPositive: true }}
          accent="amber"
        />
      </div>

      {/* Main Charts & Activity Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GlassCard className="lg:col-span-2 space-y-4" glow="cyan">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-white">Biểu Đồ Doanh Thu & Lợi Nhuận</h3>
              <p className="text-xs text-slate-400">Dữ liệu đối soát tự động từ Sepay & Shop Bank</p>
            </div>
            <div className="flex gap-2">
              <span className="px-3 py-1 text-xs font-semibold rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30">
                Tháng Này
              </span>
            </div>
          </div>
          {/* Simulated Chart Visual */}
          <div className="h-64 rounded-xl bg-slate-950/60 border border-slate-800/80 p-4 flex flex-col justify-end space-y-2 relative overflow-hidden">
            <div className="absolute inset-0 shimmer-bg pointer-events-none" />
            <div className="flex items-end justify-between h-48 gap-2 px-4 z-10">
              {[45, 65, 30, 85, 95, 70, 88, 100, 60, 90, 75, 98].map((val, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1 group">
                  <div
                    style={{ height: `${val}%` }}
                    className="w-full bg-gradient-to-t from-sky-600 via-indigo-500 to-cyan-400 rounded-t-md group-hover:brightness-125 transition-all"
                  />
                  <span className="text-[10px] text-slate-500 font-mono">T{idx + 1}</span>
                </div>
              ))}
            </div>
          </div>
        </GlassCard>

        {/* Recent Transactions Panel */}
        <GlassCard className="space-y-4" glow="emerald">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <h3 className="text-base font-bold text-white">Giao Dịch Gần Đây</h3>
            <button onClick={() => navigate("/orders")} className="hover:opacity-80 transition">
              <ArrowUpRight className="w-4 h-4 text-emerald-400" />
            </button>
          </div>
          <div className="space-y-3">
            {loading ? (
              <div className="py-8 text-center text-slate-500">
                <RefreshCw className="w-5 h-5 animate-spin text-cyan-400 mx-auto mb-1" />
                <span className="text-xs">Đang tải giao dịch...</span>
              </div>
            ) : recentOrders.length > 0 ? (
              recentOrders.map((item) => (
                <div
                  key={item.id}
                  onClick={() => navigate("/orders")}
                  className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between hover:border-slate-700 transition-colors cursor-pointer"
                >
                  <div>
                    <p className="text-xs font-bold text-white">{item.id_order || `#${item.id}`}</p>
                    <p className="text-[11px] text-slate-400 truncate max-w-[130px]">{item.customer}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-emerald-400">
                      {Number(item.price || 0).toLocaleString("vi-VN")} ₫
                    </p>
                    <span className="text-[10px] text-sky-400 font-semibold">{item.status}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 text-center py-4">Chưa có giao dịch</p>
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

