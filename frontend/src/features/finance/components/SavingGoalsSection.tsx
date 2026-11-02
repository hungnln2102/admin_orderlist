import React, { useState } from "react";
import { GlassCard } from "@/shared/components/GlassCard";
import { formatVND } from "@/shared/utils";
import { useNotification } from "@/shared/context/NotificationContext";
import {
  SavingGoalsOverviewData,
  SavingGoalItem,
  SavingFundTransaction,
} from "../types";
import {
  Target,
  Plus,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Sparkles,
  Trophy,
  History,
  Edit2,
  Trash2,
  Clock,
  ArrowRight,
  Layers,
  Flame,
} from "lucide-react";
import { SavingGoalModal } from "./SavingGoalModal";
import { SavingFundModal } from "./SavingFundModal";

interface Props {
  data?: SavingGoalsOverviewData;
  onRefresh: () => void;
}

export const SavingGoalsSection: React.FC<Props> = ({ data, onRefresh }) => {
  const notify = useNotification();

  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingGoalItem | null>(null);

  const [fundModalOpen, setFundModalOpen] = useState(false);
  const [fundModalMode, setFundModalMode] = useState<"DEPOSIT" | "WITHDRAW">("DEPOSIT");

  const [showHistory, setShowHistory] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  const currentFund = data?.currentFund || 0;
  const activeGoals = data?.activeGoals || [];
  const completedGoals = data?.completedGoals || [];
  const recentTransactions = data?.recentTransactions || [];

  // Goal CRUD handlers
  const handleOpenAddGoal = () => {
    setEditingGoal(null);
    setGoalModalOpen(true);
  };

  const handleOpenEditGoal = (item: SavingGoalItem) => {
    setEditingGoal(item);
    setGoalModalOpen(true);
  };

  const handleSaveGoal = async (payload: { name: string; targetAmount: number; note?: string }) => {
    try {
      const url = editingGoal
        ? `/api/finance/saving-goals/${editingGoal.id}`
        : "/api/finance/saving-goals";
      const method = editingGoal ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Lưu mục tiêu thất bại");
      }

      notify.success(editingGoal ? "Đã cập nhật mục tiêu!" : "Đã tạo mục tiêu mới!");
      onRefresh();
    } catch (err: any) {
      notify.error(err.message || "Lỗi lưu mục tiêu");
    }
  };

  const handleDeleteGoal = (item: SavingGoalItem) => {
    notify.confirm({
      title: "Xác Nhận Xóa Mục Tiêu",
      message: `Master có chắc muốn xóa mục tiêu "${item.name}" (${formatVND(item.targetAmount)})?`,
      confirmText: "Xóa Ngay",
      cancelText: "Hủy",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/finance/saving-goals/${item.id}`, { method: "DELETE" });
          if (!res.ok) throw new Error("Xóa mục tiêu thất bại");
          notify.success(`Đã xóa mục tiêu "${item.name}"`);
          onRefresh();
        } catch (err: any) {
          notify.error(err.message || "Xóa thất bại");
        }
      },
    });
  };

  // Execute goal handler
  const handleExecuteGoalPrompt = (goal: SavingGoalItem) => {
    notify.confirm({
      title: "🎉 Chúc Mừng Master Đã Đủ Tiền!",
      message: `Mục tiêu "${goal.name}" (${formatVND(goal.targetAmount)}) đã đạt 100%! Master có muốn trích trừ ${formatVND(goal.targetAmount)} khỏi quỹ tích lũy không?`,
      confirmText: "Có, Trừ Quỹ & Hoàn Tất",
      cancelText: "Chỉ Đánh Dấu Xong (Không Trừ Quỹ)",
      onConfirm: async () => {
        await executeGoalApi(goal.id, true);
      },
    });
  };

  const executeGoalApi = async (id: number, deductFund: boolean) => {
    try {
      const res = await fetch(`/api/finance/saving-goals/${id}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deductFund }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Không thể hoàn thành mục tiêu");
      }
      notify.success("🎉 Chúc mừng Master đã hoàn thành xuất sắc mục tiêu!");
      onRefresh();
    } catch (err: any) {
      notify.error(err.message || "Lỗi thực hiện mục tiêu");
    }
  };

  // Fund Deposit / Withdraw handlers
  const handleOpenDeposit = () => {
    setFundModalMode("DEPOSIT");
    setFundModalOpen(true);
  };

  const handleOpenWithdraw = () => {
    setFundModalMode("WITHDRAW");
    setFundModalOpen(true);
  };

  const handleFundSubmit = async (payload: { amount: number; note: string }) => {
    try {
      const endpoint =
        fundModalMode === "DEPOSIT"
          ? "/api/finance/saving-fund/deposit"
          : "/api/finance/saving-fund/withdraw";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Giao dịch quỹ thất bại");
      }

      notify.success(
        fundModalMode === "DEPOSIT"
          ? `Đã nạp +${formatVND(payload.amount)} vào quỹ!`
          : `Đã trích rút -${formatVND(payload.amount)} khỏi quỹ!`
      );
      onRefresh();
    } catch (err: any) {
      notify.error(err.message || "Lỗi giao dịch quỹ");
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. HERO FUND BANNER - QUỸ TÍCH LŨY MỤC TIÊU CHUNG */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-950 p-6 sm:p-7 rounded-3xl border border-cyan-500/30 shadow-2xl backdrop-blur-2xl">
        {/* Glow ambient background */}
        <div className="absolute top-0 right-1/4 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-cyan-400 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-cyan-400" />
                QUỸ TÍCH LŨY MỤC TIÊU CHUNG
              </span>
              <span className="text-xs text-slate-400">
                ({activeGoals.length} mục tiêu đang phấn đấu)
              </span>
            </div>

            <div className="flex items-baseline gap-3 pt-1">
              <span className="text-3xl sm:text-5xl font-black font-mono tracking-tight text-white drop-shadow-[0_0_20px_rgba(6,182,212,0.3)]">
                {formatVND(currentFund)}
              </span>
            </div>

            <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
              Hũ tiền tích lũy duy nhất của Master. Tiền trong quỹ dâng lên chạm mốc mục tiêu nào trước, Master có thể thực hiện ngay mục tiêu đó!
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 self-start lg:self-center">
            <button
              onClick={handleOpenDeposit}
              className="px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white flex items-center gap-2 shadow-lg shadow-emerald-500/25 transition-all cursor-pointer active:scale-95"
            >
              <ArrowDownRight className="w-4 h-4" />
              <span>+ Nạp Tiền Vào Quỹ</span>
            </button>

            <button
              onClick={handleOpenWithdraw}
              disabled={currentFund <= 0}
              className="px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ArrowUpRight className="w-4 h-4 text-amber-400" />
              <span>- Rút Tiền</span>
            </button>

            <button
              onClick={handleOpenAddGoal}
              className="px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 flex items-center gap-2 transition-all cursor-pointer active:scale-95 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>+ Đặt Mục Tiêu Mới</span>
            </button>
          </div>
        </div>

        {/* 3 Metric Pills */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-6 mt-6 border-t border-slate-800/80">
          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400">Đã đủ tiền thực hiện:</span>
            <span className="font-mono font-bold text-emerald-400 text-sm">
              {data?.reachedGoalsCount || 0} / {activeGoals.length} mục tiêu
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400">Đã hoàn thành trước đây:</span>
            <span className="font-mono font-bold text-teal-300 text-sm">
              {completedGoals.length} thành tựu
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400">Trạng thái dòng tiền:</span>
            <span className="font-mono font-bold text-cyan-300 text-sm flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              Sẵn sàng phân bổ
            </span>
          </div>
        </div>
      </div>

      {/* 2. THANG CỘT MỐC MỤC TIÊU (MILESTONE TARGET LADDER) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white">
                Thang Cột Mốc Mục Tiêu ({activeGoals.length})
              </h3>
              <p className="text-xs text-slate-400">
                Sắp xếp theo thứ tự số tiền từ nhỏ đến lớn. Đạt mốc nào, Master có thể bấm thực hiện ngay mốc đó!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {recentTransactions.length > 0 && (
              <button
                onClick={() => setShowHistory(!showHistory)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
                  showHistory
                    ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                    : "bg-slate-800 text-slate-400 border-slate-700/60 hover:text-white"
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>Nhật Ký Quỹ ({recentTransactions.length})</span>
              </button>
            )}

            {completedGoals.length > 0 && (
              <button
                onClick={() => setShowCompleted(!showCompleted)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
                  showCompleted
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                    : "bg-slate-800 text-slate-400 border-slate-700/60 hover:text-white"
                }`}
              >
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span>Đã Hoàn Thành ({completedGoals.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* Empty state */}
        {activeGoals.length === 0 ? (
          <GlassCard className="!p-10 text-center border-dashed border-slate-800 rounded-3xl space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center mx-auto">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-white">Chưa có mục tiêu nào được đặt ra</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                Hãy đặt ra các cột mốc dự định tương lai (Mua xe, Đổi điện thoại, Du lịch...). Chỉ cần nhập Tên + Số tiền!
              </p>
            </div>
            <button
              onClick={handleOpenAddGoal}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-white shadow-lg shadow-cyan-500/20 transition-all cursor-pointer inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Đặt Mục Tiêu Đầu Tiên</span>
            </button>
          </GlassCard>
        ) : (
          /* Grid of Milestone Goal Cards */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeGoals.map((goal, index) => {
              const isReached = goal.isReached;
              const isNextFocus = goal.isNextFocus;

              return (
                <div
                  key={goal.id}
                  className={`relative p-5 rounded-3xl border transition-all duration-300 flex flex-col justify-between gap-4 overflow-hidden group ${
                    isReached
                      ? "bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border-emerald-500/40 shadow-xl shadow-emerald-500/10"
                      : isNextFocus
                      ? "bg-gradient-to-br from-cyan-950/40 via-slate-900 to-slate-900 border-cyan-500/40 shadow-xl shadow-cyan-500/10"
                      : "bg-slate-900/90 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  {/* Neon Top Accent Line */}
                  <div
                    className={`absolute top-0 left-0 right-0 h-1 ${
                      isReached
                        ? "bg-gradient-to-r from-emerald-400 to-teal-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]"
                        : isNextFocus
                        ? "bg-gradient-to-r from-cyan-400 to-blue-400 shadow-[0_0_12px_rgba(6,182,212,0.8)]"
                        : "bg-slate-800"
                    }`}
                  />

                  {/* Card Header */}
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono font-bold text-slate-500 px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800">
                          Mốc #{index + 1}
                        </span>

                        {isReached && (
                          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 shadow-sm">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            ĐÃ ĐỦ TIỀN (100%)
                          </span>
                        )}

                        {!isReached && isNextFocus && (
                          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 flex items-center gap-1 shadow-sm">
                            <Sparkles className="w-3 h-3 text-cyan-400 animate-spin" />
                            MỤC TIÊU TRƯỚC MẮT
                          </span>
                        )}
                      </div>

                      {/* Edit / Delete Action Icons */}
                      <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleOpenEditGoal(goal)}
                          className="p-1.5 text-slate-400 hover:text-cyan-300 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Sửa mục tiêu"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteGoal(goal)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Xóa mục tiêu"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <h4 className="text-base font-bold text-white mt-2.5 group-hover:text-cyan-300 transition-colors">
                      {goal.name}
                    </h4>

                    {goal.note && (
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2 italic">
                        {goal.note}
                      </p>
                    )}
                  </div>

                  {/* Target Amount & Progress Gauge */}
                  <div className="space-y-2.5 pt-2 border-t border-slate-800/80">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs text-slate-400">Số tiền đích:</span>
                      <span className="font-mono font-black text-white text-base">
                        {formatVND(goal.targetAmount)}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Tiến độ quỹ:</span>
                        <span
                          className={`font-mono font-bold ${
                            isReached ? "text-emerald-300" : isNextFocus ? "text-cyan-300" : "text-slate-300"
                          }`}
                        >
                          {goal.progressPercent}%
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-950 border border-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isReached
                              ? "bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                              : isNextFocus
                              ? "bg-gradient-to-r from-cyan-500 to-blue-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]"
                              : "bg-slate-600"
                          }`}
                          style={{ width: `${goal.progressPercent}%` }}
                        />
                      </div>
                    </div>

                    {/* Missing / Achieved status footer */}
                    {!isReached ? (
                      <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                        <span>Còn thiếu:</span>
                        <span className="font-mono font-bold text-rose-400">
                          {formatVND(goal.missingAmount)}
                        </span>
                      </div>
                    ) : (
                      <div className="pt-1">
                        <button
                          onClick={() => handleExecuteGoalPrompt(goal)}
                          className="w-full py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer active:scale-98"
                        >
                          <Trophy className="w-4 h-4 text-amber-200" />
                          <span>🎉 Thực Hiện Mục Tiêu Này</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. NHẬT KÝ BIẾN ĐỘNG QUỸ (RECENT FUND TRANSACTIONS) */}
      {showHistory && recentTransactions.length > 0 && (
        <GlassCard className="!p-5 bg-slate-900/90 border-slate-800 rounded-3xl space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-cyan-400" />
              <h4 className="text-sm font-bold text-white">Nhật Ký Biến Động Quỹ Gần Đây</h4>
            </div>
            <span className="text-xs text-slate-400 font-mono">15 giao dịch gần nhất</span>
          </div>

          <div className="divide-y divide-slate-800/60 max-h-72 overflow-y-auto pr-1">
            {recentTransactions.map((tx) => {
              const isDeposit = tx.actionType === "DEPOSIT";
              const isWithdraw = tx.actionType === "WITHDRAW";
              const isExecute = tx.actionType === "EXECUTE_GOAL";

              return (
                <div key={tx.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`p-1.5 rounded-lg ${
                        isDeposit
                          ? "bg-emerald-500/10 text-emerald-400"
                          : isWithdraw
                          ? "bg-amber-500/10 text-amber-400"
                          : "bg-purple-500/10 text-purple-400"
                      }`}
                    >
                      {isDeposit ? (
                        <ArrowDownRight className="w-3.5 h-3.5" />
                      ) : isWithdraw ? (
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      ) : (
                        <Trophy className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <div>
                      <div className="font-semibold text-white">
                        {tx.note || (isDeposit ? "Nạp tiền" : isWithdraw ? "Rút tiền" : "Thực hiện mục tiêu")}
                      </div>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {new Date(tx.createdAt).toLocaleString("vi-VN")}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`font-mono font-bold block ${
                        isDeposit ? "text-emerald-400" : isWithdraw ? "text-amber-400" : "text-purple-400"
                      }`}
                    >
                      {isDeposit ? "+" : "-"}
                      {formatVND(tx.amount)}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      Số dư sau: {formatVND(tx.balanceAfter)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>
      )}

      {/* 4. CÁC MỤC TIÊU ĐÃ HOÀN THÀNH (ACHIEVED GOALS) */}
      {showCompleted && completedGoals.length > 0 && (
        <GlassCard className="!p-5 bg-slate-900/90 border-slate-800 rounded-3xl space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <h4 className="text-sm font-bold text-white">Thành Tựu Đã Đạt Được ({completedGoals.length})</h4>
            </div>
            <span className="text-xs text-emerald-400 font-semibold">100% Đã Hoàn Tất</span>
          </div>

          <div className="divide-y divide-slate-800/60 max-h-72 overflow-y-auto pr-1">
            {completedGoals.map((cg) => (
              <div key={cg.id} className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-bold text-white">{cg.name}</span>
                    {cg.note && <p className="text-[11px] text-slate-400 italic">{cg.note}</p>}
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-mono font-bold text-emerald-300 block">
                    {formatVND(cg.targetAmount)}
                  </span>
                  <span className="text-[10px] text-slate-500">Đã chốt mục tiêu</span>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* MODALS */}
      <SavingGoalModal
        isOpen={goalModalOpen}
        onClose={() => setGoalModalOpen(false)}
        onSave={handleSaveGoal}
        editingItem={editingGoal}
      />

      <SavingFundModal
        isOpen={fundModalOpen}
        mode={fundModalMode}
        currentFund={currentFund}
        onClose={() => setFundModalOpen(false)}
        onSubmit={handleFundSubmit}
      />
    </div>
  );
};

