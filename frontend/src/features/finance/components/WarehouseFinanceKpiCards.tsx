import type React from "react";
import {
  History,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";

export interface WarehouseFinanceKpiMetrics {
  totalCapital: number;
  activeCapital: number;
  idleCapital: number;
  activeCapitalRate: number;
  idleCapitalRate: number;
  usedSlots: number;
  vacantSlots: number;
  occupancyRate: number;
  todayLoss: number;
  monthlyRunrate: number;
  totalAccumulatedLoss: number;
}

interface WarehouseFinanceKpiCardsProps {
  metrics: WarehouseFinanceKpiMetrics;
  packageCount: number;
  formatMoney: (value: number | undefined | null) => string;
}

export const WarehouseFinanceKpiCards: React.FC<WarehouseFinanceKpiCardsProps> = ({
  metrics,
  packageCount,
  formatMoney,
}) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-xl relative overflow-hidden group hover:border-cyan-500/40 transition-all">
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-cyan-500/20 transition-all" />
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
          Vốn Kho Đang Vận Hành
        </span>
        <div className="p-2 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
          <Wallet className="w-4 h-4" />
        </div>
      </div>
      <div className="mt-2.5">
        <div className="text-2xl font-black font-mono text-white tracking-tight">
          {formatMoney(metrics.totalCapital)} <span className="text-xs font-normal text-slate-400">₫</span>
        </div>
        <div className="mt-2.5 space-y-1.5 pt-2 border-t border-slate-800/80">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-emerald-400 flex items-center gap-1 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Sinh lời: {formatMoney(metrics.activeCapital)} ₫
            </span>
            <span className="text-slate-400 text-[11px]">({metrics.activeCapitalRate}%)</span>
          </div>
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-rose-400 flex items-center gap-1 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
              Đóng băng: {formatMoney(metrics.idleCapital)} ₫
            </span>
            <span className="text-slate-400 text-[11px]">({metrics.idleCapitalRate}%)</span>
          </div>
        </div>
      </div>
    </div>

    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-xl relative overflow-hidden group hover:border-emerald-500/40 transition-all">
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-500/20 transition-all" />
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
          Hiệu Suất Khai Thác Vốn
        </span>
        <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
          <TrendingUp className="w-4 h-4" />
        </div>
      </div>
      <div className="mt-2.5">
        <div className="text-2xl font-black font-mono text-emerald-400 tracking-tight">
          {metrics.occupancyRate}% <span className="text-xs font-normal text-slate-400">hiệu suất</span>
        </div>
        <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800 my-2.5 flex">
          <div
            className="bg-emerald-400 h-full transition-all duration-500"
            style={{ width: `${metrics.occupancyRate}%` }}
            title={`Đang sinh lời: ${metrics.usedSlots} slot`}
          />
          <div
            className="bg-rose-500/80 h-full transition-all duration-500"
            style={{ width: `${100 - metrics.occupancyRate}%` }}
            title={`Đang lãng phí: ${metrics.vacantSlots} slot`}
          />
        </div>
        <div className="text-xs text-slate-400 flex items-center justify-between font-mono">
          <span className="text-emerald-300 font-bold">{metrics.usedSlots} slot cho thuê</span>
          <span className="text-rose-400 font-bold">{metrics.vacantSlots} slot trống</span>
        </div>
      </div>
    </div>

    <div className="bg-slate-900/80 border border-rose-500/30 rounded-2xl p-5 shadow-xl backdrop-blur-xl relative overflow-hidden group hover:border-rose-500/60 transition-all">
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-rose-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-rose-500/20 transition-all" />
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-extrabold text-rose-300 uppercase tracking-wider">
          Khấu Trừ P&L Hôm Nay
        </span>
        <div className="p-2 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400">
          <TrendingDown className="w-4 h-4" />
        </div>
      </div>
      <div className="mt-2.5">
        <div className="text-2xl font-black font-mono text-rose-400 tracking-tight">
          -{formatMoney(metrics.todayLoss)} <span className="text-xs font-normal text-rose-300/80">₫/ngày</span>
        </div>
        <div className="mt-2 pt-2 border-t border-slate-800/80 space-y-1 text-xs">
          <div className="flex items-center justify-between font-mono">
            <span className="text-slate-400">Dự báo tháng:</span>
            <span className="text-rose-300 font-bold">~ -{formatMoney(metrics.monthlyRunrate)} ₫</span>
          </div>
          <div className="text-[11px] text-rose-400/80 font-medium">
            Khấu trừ thẳng vào lợi nhuận ròng
          </div>
        </div>
      </div>
    </div>

    <div className="bg-slate-900/80 border border-amber-500/30 rounded-2xl p-5 shadow-xl backdrop-blur-xl relative overflow-hidden group hover:border-amber-500/60 transition-all">
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-amber-500/20 transition-all" />
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-extrabold text-amber-300 uppercase tracking-wider">
          Lũy Kế Tiền Bù Toàn Thời Gian
        </span>
        <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
          <History className="w-4 h-4" />
        </div>
      </div>
      <div className="mt-2.5">
        <div className="text-2xl font-black font-mono text-amber-300 tracking-tight">
          -{formatMoney(metrics.totalAccumulatedLoss)} <span className="text-xs font-normal text-amber-200/80">₫</span>
        </div>
        <div className="mt-2 pt-2 border-t border-slate-800/80 space-y-1 text-xs">
          <div className="text-slate-400">Tổng chi phí vốn slot rỗng đã gánh</div>
          <div className="text-[11px] text-amber-400/90 font-mono">
            Từ {packageCount} gói kho đã nhập
          </div>
        </div>
      </div>
    </div>
  </div>
);

