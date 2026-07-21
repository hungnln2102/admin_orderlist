import { useState, useEffect } from "react";
import { apiFetch } from "@/shared/api/client";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import {
  UsersIcon,
  EyeIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  GlobeAltIcon,
  DevicePhoneMobileIcon,
} from "@heroicons/react/24/outline";

const SOURCE_COLORS = ["#6366f1", "#10b981", "#3b82f6", "#f59e0b", "#ec4899", "#8b5cf6"];
const DEVICE_COLORS = ["#8b5cf6", "#ec4899", "#14b8a6", "#f59e0b"];

export default function TrafficPage() {
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await apiFetch(`/api/traffic/stats?days=${days}`);
        if (res.ok && isMounted) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error("Failed to fetch traffic data", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchData();
    return () => { isMounted = false; };
  }, [days]);

  return (
    <div className="p-6 space-y-6 text-white min-h-screen bg-[#0b0e14]">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
            Lưu Lượng Truy Cập (mavrykpremium.com)
          </h1>
          <p className="text-white/50 text-sm mt-1">
            Dữ liệu trực tiếp từ Google Analytics 4
          </p>
        </div>
        
        {/* Date Filter */}
        <div className="flex items-center gap-2 bg-white/[0.03] border border-white/10 rounded-lg p-1 shadow-inner">
          <button 
            onClick={() => setDays(7)}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${days === 7 ? 'bg-indigo-500/20 text-indigo-300' : 'text-white/50 hover:text-white/90'}`}
          >
            7 Ngày
          </button>
          <button 
            onClick={() => setDays(30)}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${days === 30 ? 'bg-indigo-500/20 text-indigo-300' : 'text-white/50 hover:text-white/90'}`}
          >
            30 Ngày
          </button>
          <button 
            onClick={() => setDays(90)}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${days === 90 ? 'bg-indigo-500/20 text-indigo-300' : 'text-white/50 hover:text-white/90'}`}
          >
            90 Ngày
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-indigo-500" />
        </div>
      ) : !data ? (
        <div className="flex items-center justify-center h-64 text-rose-400">
          Lỗi: Không thể lấy dữ liệu từ Google Analytics. Vui lòng kiểm tra lại quyền truy cập của Service Account.
        </div>
      ) : (
        <>
          {/* KPI Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Tổng Lượt Xem (Pageviews)", value: data.kpi?.pageviews, change: data.kpi?.changes?.pageviews, icon: EyeIcon, color: "text-blue-400", bg: "bg-blue-400/10" },
              { label: "Khách Truy Cập (Unique)", value: data.kpi?.visitors, change: data.kpi?.changes?.visitors, icon: UsersIcon, color: "text-emerald-400", bg: "bg-emerald-400/10" },
              { label: "Thời Gian Trung Bình", value: data.kpi?.avgDuration, change: data.kpi?.changes?.avgDuration, icon: ClockIcon, color: "text-amber-400", bg: "bg-amber-400/10" },
              { label: "Tỷ Lệ Thoát (Bounce Rate)", value: data.kpi?.bounceRate, change: data.kpi?.changes?.bounceRate, icon: ArrowTrendingUpIcon, color: "text-rose-400", bg: "bg-rose-400/10" },
            ].map((stat, i) => (
              <div key={i} className="bg-[#151923] border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-colors group">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-1">{stat.label}</p>
                    <h3 className="text-3xl font-bold text-white/90">{stat.value}</h3>
                  </div>
                  <div className={`p-2.5 rounded-xl ${stat.bg} ${stat.color} group-hover:scale-110 transition-transform`}>
                    <stat.icon className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${stat.change?.startsWith('-') ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                    {stat.change || "~"}
                  </span>
                  <span className="text-white/30 text-xs">so với kỳ trước</span>
                </div>
              </div>
            ))}
          </div>

          {/* Main Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Area Chart: Traffic Over Time */}
            <div className="lg:col-span-2 bg-[#151923] border border-white/5 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white/90 mb-6">Lưu Lượng Theo Thời Gian</h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.trafficData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorPageviews" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorVisitors" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="date" stroke="rgba(255,255,255,0.2)" fontSize={12} tickMargin={10} axisLine={false} />
                    <YAxis stroke="rgba(255,255,255,0.2)" fontSize={12} tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val} axisLine={false} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f1219', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Legend verticalAlign="top" height={36} iconType="circle" />
                    <Area type="monotone" name="Pageviews" dataKey="pageviews" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorPageviews)" />
                    <Area type="monotone" name="Unique Visitors" dataKey="visitors" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorVisitors)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Pie Chart: Traffic Sources */}
            <div className="bg-[#151923] border border-white/5 rounded-2xl p-6 flex flex-col">
              <div className="flex items-center gap-2 mb-6">
                <GlobeAltIcon className="w-5 h-5 text-indigo-400" />
                <h3 className="text-lg font-semibold text-white/90">Nguồn Truy Cập</h3>
              </div>
              <div className="flex-1 h-[250px] w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.sourceData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                      nameKey="name"
                      stroke="none"
                    >
                      {data.sourceData?.map((_entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={SOURCE_COLORS[index % SOURCE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f1219', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                      itemStyle={{ color: '#fff' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center Text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-bold text-white/90">{data.kpi?.visitors}</span>
                  <span className="text-[10px] text-white/40 uppercase tracking-widest">Visitors</span>
                </div>
              </div>
              
              {/* Custom Legend */}
              <div className="mt-4 grid grid-cols-2 gap-3">
                {data.sourceData?.map((item: any, i: number) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: SOURCE_COLORS[i % SOURCE_COLORS.length] }} />
                    <span className="text-xs text-white/60 truncate" title={item.name}>{item.name}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Bottom Row */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            
            {/* Device Breakdown */}
            <div className="bg-[#151923] border border-white/5 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-6">
                <DevicePhoneMobileIcon className="w-5 h-5 text-pink-400" />
                <h3 className="text-lg font-semibold text-white/90">Thiết Bị</h3>
              </div>
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.deviceData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      nameKey="name"
                      stroke="rgba(255,255,255,0.05)"
                      strokeWidth={2}
                    >
                      {data.deviceData?.map((_entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={DEVICE_COLORS[index % DEVICE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => `${value} sessions`}
                      contentStyle={{ backgroundColor: '#0f1219', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                      itemStyle={{ color: '#fff' }}
                      labelStyle={{ color: '#9ca3af' }}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* New vs Returning */}
            <div className="bg-[#151923] border border-white/5 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-6">
                <UsersIcon className="w-5 h-5 text-emerald-400" />
                <h3 className="text-lg font-semibold text-white/90">Khách Hàng</h3>
              </div>
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.newReturningData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      nameKey="name"
                      stroke="rgba(255,255,255,0.05)"
                      strokeWidth={2}
                    >
                      {data.newReturningData?.map((_entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={["#10b981", "#3b82f6"][index % 2]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => `${value} users`}
                      contentStyle={{ backgroundColor: '#0f1219', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                      itemStyle={{ color: '#fff' }}
                      labelStyle={{ color: '#9ca3af' }}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top Pages Table */}
            <div className="lg:col-span-2 bg-[#151923] border border-white/5 rounded-2xl p-6 overflow-hidden flex flex-col">
              <h3 className="text-lg font-semibold text-white/90 mb-4">Các Trang Phổ Biến Nhất</h3>
              <div className="flex-1 overflow-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 text-xs uppercase tracking-wider text-white/40">
                      <th className="py-3 px-4 font-semibold">Đường dẫn (Path)</th>
                      <th className="py-3 px-4 font-semibold text-right">Lượt xem</th>
                      <th className="py-3 px-4 font-semibold text-right">Time on Page</th>
                      <th className="py-3 px-4 font-semibold text-center">Trend</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-sm">
                    {data.topPages?.map((page: any, i: number) => (
                      <tr key={i} className="hover:bg-white/[0.01] transition-colors">
                        <td className="py-3 px-4 max-w-[200px] truncate" title={page.path}>
                          <a href={`https://mavrykpremium.com${page.path}`} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline cursor-pointer font-medium">
                            {page.path}
                          </a>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-white/80">{page.views.toLocaleString()}</td>
                        <td className="py-3 px-4 text-right text-white/60">{page.time}</td>
                        <td className="py-3 px-4 text-center">
                          <div className="w-16 h-1 bg-white/5 rounded-full overflow-hidden mx-auto">
                            <div 
                              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full" 
                              style={{ width: `${Math.max(10, 100 - (i * 10))}%` }} 
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </>
      )}
    </div>
  );
}
