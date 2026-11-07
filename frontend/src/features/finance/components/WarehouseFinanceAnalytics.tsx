import type React from "react";
import {
  Building2,
  CheckCircle2,
  Clock,
  Flame,
} from "lucide-react";
import type { PackageFinancialItem } from "./warehouseFinanceTypes";

export interface WarehouseFinanceSupplierBreakdownItem {
  supplier: string;
  packageCount: number;
  totalCapital: number;
  todayLoss: number;
  totalSlots: number;
  usedSlots: number;
}

interface WarehouseFinanceAnalyticsProps {
  supplierBreakdown: WarehouseFinanceSupplierBreakdownItem[];
  topBurners: PackageFinancialItem[];
  totalCapital: number;
  todayLoss: number;
  formatMoney: (value: number | undefined | null) => string;
  getDaysRemaining: (expiredAt: string | null) => number | null;
}

export const WarehouseFinanceAnalytics: React.FC<WarehouseFinanceAnalyticsProps> = ({
  supplierBreakdown,
  topBurners,
  totalCapital,
  todayLoss,
  formatMoney,
  getDaysRemaining,
}) => (      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* WIDGET 1 (7 Cột): Phân Bổ Vốn & Thất Thoát Theo Nhà Cung Cấp */}
        <div className="lg:col-span-7 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-xl flex flex-col justify-between">
          <div className="space-y-1 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-500/15 text-blue-400 border border-blue-500/20">
                  <Building2 className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
                  Phân Bổ Vốn & Thiệt Hại Theo Nhà Cung Cấp
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {supplierBreakdown.length} nhà cung cấp
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Đo lường mức độ giam vốn và tốc độ bào mòn dòng tiền của từng nguồn hàng.
            </p>
          </div>

          <div className="space-y-3.5">
            {supplierBreakdown.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500">
                Chưa có dữ liệu nhà cung cấp nào.
              </div>
            ) : (
              supplierBreakdown.map((sup) => {
                const capitalPercent =
                  totalCapital > 0
                    ? Math.round((sup.totalCapital / totalCapital) * 100)
                    : 0;
                const lossPercent =
                  todayLoss > 0
                    ? Math.round((sup.todayLoss / todayLoss) * 100)
                    : 0;

                return (
                  <div
                    key={sup.supplier}
                    className="p-3 bg-slate-950/70 rounded-xl border border-slate-800/80 hover:border-cyan-500/30 transition-all space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-white text-sm">
                          {sup.supplier}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                          {sup.packageCount} gói ({sup.usedSlots}/{sup.totalSlots} slot)
                        </span>
                      </div>
                      <div className="flex items-center gap-3 font-mono">
                        <span className="text-slate-300 font-bold">
                          {formatMoney(sup.totalCapital)} ₫
                        </span>
                        {sup.todayLoss > 0 ? (
                          <span className="text-rose-400 font-bold">
                            -{formatMoney(sup.todayLoss)} ₫/ngày
                          </span>
                        ) : (
                          <span className="text-emerald-400 font-bold">
                            Tối ưu 100%
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar Kép: Vốn (Xanh) vs Thiệt Hại Hôm Nay (Đỏ) */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                        <span>Tỷ trọng vốn: <strong className="text-cyan-300">{capitalPercent}%</strong></span>
                        {sup.todayLoss > 0 && (
                          <span>Gánh thất thoát: <strong className="text-rose-400">{lossPercent}% toàn kho</strong></span>
                        )}
                      </div>
                      <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden flex">
                        <div
                          className="bg-cyan-500 h-full"
                          style={{ width: `${capitalPercent}%` }}
                          title={`Vốn: ${formatMoney(sup.totalCapital)} ₫`}
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* WIDGET 2 (5 Cột): Radar Điểm Nóng Đang Đốt Tiền Nhất (Top Capital Burners) */}
        <div className="lg:col-span-5 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-xl flex flex-col justify-between">
          <div className="space-y-1 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-rose-500/15 text-rose-400 border border-rose-500/20">
                  <Flame className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
                  Top Điểm Nóng Đốt Tiền Cần Xử Lý
                </h3>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold uppercase tracking-wider">
                Ưu Tiên Xả Hàng
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Các gói đang làm rò rỉ lợi nhuận lớn nhất hôm nay do slot chưa có khách thuê.
            </p>
          </div>

          <div className="space-y-3">
            {topBurners.length === 0 ? (
              <div className="text-center py-10 text-xs text-emerald-400 flex flex-col items-center justify-center gap-2">
                <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                <span className="font-bold text-sm">Tuyệt vời! Không có gói nào bị rò rỉ vốn hôm nay.</span>
                <span className="text-slate-400 text-xs">Tất cả gói đang được cho thuê kín 100%.</span>
              </div>
            ) : (
              topBurners.map((pkg, idx) => {
                const daysRemaining = getDaysRemaining(pkg.expiredAt);
                const vacantSlots = Math.max(0, pkg.totalSlots - pkg.usedSlots);
                const projectedLoss =
                  daysRemaining && daysRemaining > 0 && pkg.todayVacantCost
                    ? daysRemaining * pkg.todayVacantCost
                    : 0;

                return (
                  <div
                    key={pkg.id}
                    className="p-3.5 bg-gradient-to-r from-rose-950/40 via-slate-950/70 to-slate-950/70 border border-rose-500/30 rounded-xl hover:border-rose-500/60 transition-all space-y-2 relative overflow-hidden group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-black flex items-center justify-center font-mono">
                          {idx + 1}
                        </span>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-white text-sm">{pkg.name}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-cyan-300 font-medium">
                              {pkg.supplier}
                            </span>
                          </div>
                          <span className="text-[11px] text-blue-400 font-mono">#{pkg.importOrderCode}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-rose-400 font-black font-mono text-sm">
                          -{formatMoney(pkg.todayVacantCost)} ₫/ngày
                        </div>
                        <div className="text-[10px] text-rose-300/80 font-mono">
                          Trống {vacantSlots} / {pkg.totalSlots} slot
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800/60 font-mono">
                      <div className="flex items-center gap-1 text-amber-300">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span>
                          {daysRemaining !== null
                            ? daysRemaining > 0
                              ? `Còn ${daysRemaining} ngày`
                              : "Hôm nay hết hạn"
                            : "Không có hạn"}
                        </span>
                      </div>
                      {projectedLoss > 0 && (
                        <div className="text-slate-400 text-[11px]">
                          Thiệt hại tới hạn:{" "}
                          <strong className="text-rose-400 font-bold">
                            -{formatMoney(projectedLoss)} ₫
                          </strong>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
);

