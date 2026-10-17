import React, { useState, useEffect, useCallback } from "react";
import { FinanceSummaryData } from "./types";
import { NetWorthCards } from "./components/NetWorthCards";
import { FinanceOverviewPanel } from "./components/FinanceOverviewPanel";
import { DebtsAndInstallmentsSection } from "./components/DebtsAndInstallmentsSection";
import { FixedCostList } from "./components/FixedCostList";
import { SavingsAndAssetsSection } from "./components/SavingsAndAssetsSection";
import {
  Calendar,
  RefreshCw,
  Coins,
  CreditCard,
  Home,
  Wallet,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";

export const FinanceHubPage: React.FC = () => {
  const [month, setMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const [activeTab, setActiveTab] = useState<"DEBTS_INSTALLMENTS" | "FIXED_COSTS" | "SAVINGS_ASSETS">("DEBTS_INSTALLMENTS");
  const [data, setData] = useState<FinanceSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (targetMonth: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/finance/summary?month=${targetMonth}`);
      if (!res.ok) {
        const text = await res.text();
        try {
          const parsed = JSON.parse(text);
          throw new Error(parsed.message || `Lỗi máy chủ (${res.status})`);
        } catch {
          throw new Error(`Máy chủ phản hồi lỗi (${res.status}). Vui lòng kiểm tra lại dịch vụ backend.`);
        }
      }
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.message || "Không thể tải dữ liệu tài chính");
      }
      setData(json.data);
    } catch (err: any) {
      setError(err.message || "Lỗi kết nối API");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(month);
  }, [month, fetchData]);

  // Month navigation helpers
  const handlePrevMonth = () => {
    const [y, m] = month.split("-").map(Number);
    const prevDate = new Date(y, m - 2, 1);
    setMonth(`${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`);
  };

  const handleNextMonth = () => {
    const [y, m] = month.split("-").map(Number);
    const nextDate = new Date(y, m, 1);
    setMonth(`${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}`);
  };

  const handleCurrentMonth = () => {
    const now = new Date();
    setMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
  };

  const isCurrentMonth = (() => {
    const now = new Date();
    const curStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    return month === curStr;
  })();

  // Handlers for Fixed Costs
  const handleAddFixedCost = async (payload: any) => {
    const res = await fetch("/api/finance/fixed-costs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Thêm chi phí thất bại");
    await fetchData(month);
  };

  const handleEditFixedCost = async (id: number, payload: any) => {
    const res = await fetch(`/api/finance/fixed-costs/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Cập nhật chi phí thất bại");
    await fetchData(month);
  };

  const handleDeleteFixedCost = async (id: number) => {
    const res = await fetch(`/api/finance/fixed-costs/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Xóa chi phí thất bại");
    await fetchData(month);
  };

  // Handlers for Installments
  const handleAddInstallment = async (payload: any) => {
    const res = await fetch("/api/finance/installments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Thêm khoản trả góp thất bại");
    await fetchData(month);
  };

  const handleEditInstallment = async (id: number, payload: any) => {
    const res = await fetch(`/api/finance/installments/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Cập nhật trả góp thất bại");
    await fetchData(month);
  };

  const handleDeleteInstallment = async (id: number) => {
    const res = await fetch(`/api/finance/installments/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Xóa trả góp thất bại");
    await fetchData(month);
  };

  // Handlers for Personal Assets
  const handleAddPersonalAsset = async (payload: any) => {
    const res = await fetch("/api/finance/personal-assets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Thêm tài sản thất bại");
    await fetchData(month);
  };

  const handleEditPersonalAsset = async (id: number, payload: any) => {
    const res = await fetch(`/api/finance/personal-assets/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Cập nhật tài sản thất bại");
    await fetchData(month);
  };

  const handleDeletePersonalAsset = async (id: number) => {
    const res = await fetch(`/api/finance/personal-assets/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Xóa tài sản thất bại");
    await fetchData(month);
  };

  return (
    <div className="space-y-5 pb-12 animate-in fade-in duration-300">
      {/* 1. TOP HEADER & MONTH COMMAND BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 p-4 sm:p-5 rounded-2xl border border-slate-800 backdrop-blur-2xl shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 text-cyan-400 border border-cyan-500/30 shadow-lg shadow-cyan-500/10">
            <Coins className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-400 px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20">
                FINANCIAL COMMAND CENTER
              </span>
              {data && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  data.breakEven.isBreakEvenPassed 
                    ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20" 
                    : "bg-amber-500/10 text-amber-300 border-amber-500/20"
                }`}>
                  {data.breakEven.isBreakEvenPassed ? "HÒA VỐN ĐÃ ĐẠT" : "ĐANG BÙ THÂM HỤT"}
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1">
              Trung Tâm Quản Trị Tài Chính
            </h1>
          </div>
        </div>

        {/* Month Selector & Controls */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          {/* Quick jump to current month */}
          {!isCurrentMonth && (
            <button
              onClick={handleCurrentMonth}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 border border-cyan-500/30 transition-all cursor-pointer shadow-sm"
              title="Về tháng hiện tại"
            >
              Tháng Hiện Tại
            </button>
          )}

          {/* Stepper < Month > */}
          <div className="flex items-center bg-slate-950/90 border border-slate-800 rounded-xl p-1 shadow-inner">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Tháng trước"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="bg-transparent border-0 px-2.5 py-1 text-xs sm:text-sm text-white font-mono font-bold focus:outline-none cursor-pointer text-center"
            />

            <button
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Tháng sau"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Refresh button */}
          <button
            onClick={() => fetchData(month)}
            disabled={loading}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer border border-slate-700/60 disabled:opacity-50 shadow-sm"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-cyan-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && !data && (
        <div className="p-20 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
          <div className="w-9 h-9 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-semibold">Đang tổng hợp dữ liệu tài chính toàn diện...</span>
        </div>
      )}

      {/* Main Content */}
      {data && (
        <div className="space-y-6">
          {/* Section 1: KPI Cards Tài Sản Ròng & Sức Khỏe */}
          <NetWorthCards metrics={data.netWorth} breakEven={data.breakEven} />

          {/* Section 2: Master Break-even Engine Hero Panel */}
          <FinanceOverviewPanel
            breakEven={data.breakEven}
            dailyBreakEven={data.dailyBreakEven}
            netWorth={data.netWorth}
            month={data.month}
          />

          {/* Section 3: Detailed Management Navigation Tabs */}
          <div className="space-y-4 pt-2">
            {/* Pill Tab Switcher */}
            <div className="flex items-center gap-2 p-1.5 bg-slate-900/90 border border-slate-800 rounded-2xl overflow-x-auto">
              <button
                onClick={() => setActiveTab("DEBTS_INSTALLMENTS")}
                className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === "DEBTS_INSTALLMENTS"
                    ? "bg-gradient-to-r from-rose-500/20 to-amber-500/20 text-white border border-rose-500/40 shadow-lg shadow-rose-500/10"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                }`}
              >
                <CreditCard className="w-4 h-4 text-rose-400" />
                <span>Nợ & Trả Góp</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-800 text-slate-300">
                  {data.installments.length + data.personalAssets.filter((a) => a.type === "DEBT_PAYABLE").length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab("FIXED_COSTS")}
                className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === "FIXED_COSTS"
                    ? "bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-white border border-amber-500/40 shadow-lg shadow-amber-500/10"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                }`}
              >
                <Home className="w-4 h-4 text-amber-400" />
                <span>Chi Phí Cố Định</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-800 text-slate-300">
                  {data.fixedCosts.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab("SAVINGS_ASSETS")}
                className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === "SAVINGS_ASSETS"
                    ? "bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 text-white border border-emerald-500/40 shadow-lg shadow-emerald-500/10"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                }`}
              >
                <Wallet className="w-4 h-4 text-emerald-400" />
                <span>Quỹ Tích Lũy & Tài Sản</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-800 text-slate-300">
                  {data.personalAssets.filter(
                    (a) => a.type === "SAVINGS" || a.type === "CASH_BANK" || a.type === "GOLD_INVESTMENT"
                  ).length}
                </span>
              </button>
            </div>

            {/* Tab Views */}
            <div className="pt-1">
              {activeTab === "DEBTS_INSTALLMENTS" && (
                <DebtsAndInstallmentsSection
                  installments={data.installments}
                  personalDebts={data.personalAssets}
                  totalInstallmentsRemainingDebt={data.netWorth.breakdown.totalInstallmentsRemainingDebt}
                  monthlyDebtBurden={data.breakEven.monthlyDebtBurden ?? 0}
                  onAddInstallment={handleAddInstallment}
                  onEditInstallment={handleEditInstallment}
                  onDeleteInstallment={handleDeleteInstallment}
                  onAddPersonalDebt={handleAddPersonalAsset}
                  onEditPersonalDebt={handleEditPersonalAsset}
                  onDeletePersonalDebt={handleDeletePersonalAsset}
                />
              )}

              {activeTab === "FIXED_COSTS" && (
                <FixedCostList
                  items={data.fixedCosts}
                  onAdd={handleAddFixedCost}
                  onEdit={handleEditFixedCost}
                  onDelete={handleDeleteFixedCost}
                />
              )}

              {activeTab === "SAVINGS_ASSETS" && (
                <SavingsAndAssetsSection
                  assets={data.personalAssets}
                  shopBalanceTotal={data.netWorth.breakdown.shopBalanceTotal}
                  onAdd={handleAddPersonalAsset}
                  onEdit={handleEditPersonalAsset}
                  onDelete={handleDeletePersonalAsset}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
