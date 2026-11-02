import React from "react";
import { GlassCard } from "@/shared/components/GlassCard";
import { formatVND } from "@/shared/utils";
import {
  CreditCard,
  Home,
  Wallet,
  Target,
  ArrowRight,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { FinanceSummaryData } from "../types";

export type FinanceTabKey =
  | "OVERVIEW"
  | "DEBTS_INSTALLMENTS"
  | "FIXED_COSTS"
  | "SAVINGS_ASSETS"
  | "SAVING_GOALS";

interface Props {
  data: FinanceSummaryData;
  onNavigateTab: (tab: FinanceTabKey) => void;
}

export const CategoryOverviewCards: React.FC<Props> = ({ data, onNavigateTab }) => {
  // 1. Dữ liệu tóm tắt Nợ & Trả góp
  const totalInstallmentDebt = data.netWorth.breakdown.totalInstallmentsRemainingDebt || 0;
  const totalPersonalDebt = data.netWorth.breakdown.personalDebtPayableTotal || 0;
  const totalRemainingDebt = totalInstallmentDebt + totalPersonalDebt;
  const activeDebtCount =
    data.installments.length +
    data.personalAssets.filter((a) => a.type === "DEBT_PAYABLE").length;
  const monthlyDebtBurden = data.breakEven.monthlyDebtBurden || 0;

  // 2. Dữ liệu tóm tắt Chi phí cố định
  const fixedCostsTotal = data.breakEven.activeFixedCostsTotal || 0;
  const fixedCostsCount = data.fixedCosts.length;
  // Tìm khoản định phí lớn nhất
  const topFixedCost = [...data.fixedCosts].sort(
    (a, b) => Number(b.amount || 0) - Number(a.amount || 0)
  )[0];

  // 3. Dữ liệu tóm tắt Quỹ tích lũy & Tài sản
  const totalAssets = data.netWorth.totalAssets || 0;
  const shopBalance = data.netWorth.breakdown.shopBalanceTotal || 0;
  const personalAssetsTotal =
    (data.netWorth.breakdown.personalSavingsTotal || 0) +
    (data.netWorth.breakdown.personalCashBankTotal || 0) +
    (data.netWorth.breakdown.personalInvestmentsTotal || 0);
  const assetAccountsCount =
    data.personalAssets.filter(
      (a) => a.type === "SAVINGS" || a.type === "CASH_BANK" || a.type === "GOLD_INVESTMENT"
    ).length +
    (data.shopBankAccounts?.length || 0) +
    (data.usdtWallets?.length || 0);

  // 4. Dữ liệu tóm tắt Mục tiêu tương lai
  const savingGoals = data.savingGoals;
  const currentGoalFund = savingGoals?.currentFund || 0;
  const activeGoalsCount = savingGoals?.activeGoalsCount || 0;
  const reachedGoalsCount = savingGoals?.reachedGoalsCount || 0;
  const nextFocusGoal = savingGoals?.activeGoals.find((g) => g.isNextFocus);

  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          Tổng Quan Sức Khỏe Từng Hạng Mục
        </h3>
        <span className="text-xs text-slate-500">
          Bấm vào thẻ để chuyển nhanh đến màn hình quản lý chi tiết
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1: Nợ & Trả Góp */}
        <GlassCard
          glow={totalRemainingDebt > 0 ? "rose" : "emerald"}
          onClick={() => onNavigateTab("DEBTS_INSTALLMENTS")}
          className="group cursor-pointer !p-4.5 bg-gradient-to-br from-slate-900/90 via-slate-950/80 to-[#120a14]/90 border-slate-800/80 hover:border-rose-500/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-rose-500/10 rounded-2xl flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/30">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white group-hover:text-rose-300 transition-colors">
                    Nợ & Trả Góp
                  </h4>
                  <span className="text-[10px] text-slate-400">
                    {activeDebtCount} khoản đang vận hành
                  </span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                Tháng này
              </span>
            </div>

            <div className="my-2">
              <span className="text-[11px] text-slate-400 block">Nợ gốc còn lại:</span>
              <div className="text-lg font-black text-rose-300 font-mono tracking-tight">
                {formatVND(totalRemainingDebt)}
              </div>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-slate-800/60 text-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span>Áp lực trả nợ tháng này:</span>
                <span className="font-mono font-semibold text-rose-200">
                  {formatVND(monthlyDebtBurden)}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-400 text-[11px]">
                <span>Gốc trả góp / Nợ cá nhân:</span>
                <span className="font-mono text-slate-300">
                  {formatVND(totalInstallmentDebt)} / {formatVND(totalPersonalDebt)}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-3 mt-3 border-t border-slate-800/50 flex items-center justify-between text-xs text-rose-400 group-hover:text-rose-300 font-semibold">
            <span>Chi tiết nợ & phương án trả</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </div>
        </GlassCard>

        {/* Card 2: Chi Phí Cố Định */}
        <GlassCard
          glow="amber"
          onClick={() => onNavigateTab("FIXED_COSTS")}
          className="group cursor-pointer !p-4.5 bg-gradient-to-br from-slate-900/90 via-slate-950/80 to-[#141008]/90 border-slate-800/80 hover:border-amber-500/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-amber-500/10 rounded-2xl flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  <Home className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                    Chi Phí Cố Định
                  </h4>
                  <span className="text-[10px] text-slate-400">
                    {fixedCostsCount} khoản định phí tháng
                  </span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                Định phí
              </span>
            </div>

            <div className="my-2">
              <span className="text-[11px] text-slate-400 block">Tổng định phí / tháng:</span>
              <div className="text-lg font-black text-amber-300 font-mono tracking-tight">
                {formatVND(fixedCostsTotal)}
              </div>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-slate-800/60 text-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span>Khoản lớn nhất:</span>
                <span className="font-medium text-slate-200 truncate max-w-[130px] text-right" title={topFixedCost?.name}>
                  {topFixedCost?.name || "Chưa có"}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-400 text-[11px]">
                <span>Giá trị khoản lớn nhất:</span>
                <span className="font-mono text-amber-200">
                  {topFixedCost ? formatVND(Number(topFixedCost.amount || 0)) : "0 ₫"}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-3 mt-3 border-t border-slate-800/50 flex items-center justify-between text-xs text-amber-400 group-hover:text-amber-300 font-semibold">
            <span>Quản lý danh sách định phí</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </div>
        </GlassCard>

        {/* Card 3: Quỹ Tích Lũy & Tài Sản */}
        <GlassCard
          glow="emerald"
          onClick={() => onNavigateTab("SAVINGS_ASSETS")}
          className="group cursor-pointer !p-4.5 bg-gradient-to-br from-slate-900/90 via-slate-950/80 to-[#081410]/90 border-slate-800/80 hover:border-emerald-500/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-500/10 rounded-2xl flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                    Quỹ Tích Lũy & Tài Sản
                  </h4>
                  <span className="text-[10px] text-slate-400">
                    {assetAccountsCount} tài khoản & ví
                  </span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                Thặng dư
              </span>
            </div>

            <div className="my-2">
              <span className="text-[11px] text-slate-400 block">Tổng tài sản khả dụng:</span>
              <div className="text-lg font-black text-emerald-300 font-mono tracking-tight">
                {formatVND(totalAssets)}
              </div>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-slate-800/60 text-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span>Số dư ví Shop:</span>
                <span className="font-mono font-semibold text-emerald-200">
                  {formatVND(shopBalance)}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-400 text-[11px]">
                <span>Tài sản cá nhân & Vàng:</span>
                <span className="font-mono text-cyan-200">
                  {formatVND(personalAssetsTotal)}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-3 mt-3 border-t border-slate-800/50 flex items-center justify-between text-xs text-emerald-400 group-hover:text-emerald-300 font-semibold">
            <span>Chi tiết danh mục tài sản</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </div>
        </GlassCard>

        {/* Card 4: Mục Tiêu Tương Lai */}
        <GlassCard
          glow="cyan"
          onClick={() => onNavigateTab("SAVING_GOALS")}
          className="group cursor-pointer !p-4.5 bg-gradient-to-br from-slate-900/90 via-slate-950/80 to-[#08121a]/90 border-slate-800/80 hover:border-cyan-500/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-cyan-500/10 rounded-2xl flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                  <Target className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                    Mục Tiêu Tương Lai
                  </h4>
                  <span className="text-[10px] text-slate-400">
                    {activeGoalsCount} mục tiêu đang phấn đấu
                  </span>
                </div>
              </div>
              {reachedGoalsCount > 0 ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  {reachedGoalsCount} Đã đạt
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                  Thang mốc
                </span>
              )}
            </div>

            <div className="my-2">
              <span className="text-[11px] text-slate-400 block">Số dư quỹ tích lũy chung:</span>
              <div className="text-lg font-black text-cyan-300 font-mono tracking-tight">
                {formatVND(currentGoalFund)}
              </div>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-slate-800/60 text-xs">
              {nextFocusGoal ? (
                <>
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="truncate max-w-[120px]" title={nextFocusGoal.name}>
                      🎯 {nextFocusGoal.name}:
                    </span>
                    <span className="font-mono font-semibold text-cyan-200">
                      {Math.round(nextFocusGoal.progressPercent)}%
                    </span>
                  </div>
                  {/* Mini Progress bar */}
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(0, nextFocusGoal.progressPercent))}%` }}
                    />
                  </div>
                </>
              ) : (
                <div className="text-slate-500 italic text-[11px]">
                  {reachedGoalsCount > 0 ? "Tất cả mục tiêu đã đạt!" : "Chưa có mục tiêu nào"}
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 mt-3 border-t border-slate-800/50 flex items-center justify-between text-xs text-cyan-400 group-hover:text-cyan-300 font-semibold">
            <span>Mở thang cột mốc mục tiêu</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </div>
        </GlassCard>
      </div>
    </div>
  );
};
