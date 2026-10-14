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
  Clock,
  Home,
  Wallet,
  Coins,
  CreditCard,
  AlertCircle
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
      const json = await res.json();
      if (!res.ok || !json.success) {
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
    <div className="space-y-4 pb-8 animate-in fade-in duration-300">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-900/60 p-3 sm:p-4 rounded-xl border border-slate-800 backdrop-blur-xl">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Coins className="w-5 h-5" />
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
            Trung Tâm Quản Trị Tài Chính
          </h1>
        </div>

        {/* Month Selector & Refresh Button */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <div className="relative flex items-center">
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white font-mono focus:outline-none focus:border-cyan-400 cursor-pointer shadow-inner"
            />
          </div>
          <button
            onClick={() => fetchData(month)}
            disabled={loading}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer border border-slate-700/60 disabled:opacity-50"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-cyan-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && !data && (
        <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Đang tổng hợp dữ liệu tài chính toàn diện...</span>
        </div>
      )}

      {/* Main Content */}
      {data && (
        <div className="space-y-4">
          {/* Section 1: KPI Cards Tài Sản Ròng */}
          <NetWorthCards metrics={data.netWorth} />

          <FinanceOverviewPanel
            breakEven={data.breakEven}
            dailyBreakEven={data.dailyBreakEven}
            netWorth={data.netWorth}
            month={data.month}
          />

          {/* Section 3: Navigation Tabs */}
          <div className="space-y-3 pt-0">
            <div className="flex items-center gap-1 border-b border-slate-800 pb-2 overflow-x-auto">
              <button
                onClick={() => setActiveTab("DEBTS_INSTALLMENTS")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === "DEBTS_INSTALLMENTS"
                    ? "bg-slate-800 text-white border border-slate-700 shadow-none"
                    : "text-slate-500 hover:text-slate-200 hover:bg-slate-900"
                }`}
              >
                <CreditCard className="w-4 h-4 text-rose-400" />
                Nợ & Trả Góp ({data.installments.length + data.personalAssets.filter(a => a.type === "DEBT_PAYABLE").length})
              </button>

              <button
                onClick={() => setActiveTab("FIXED_COSTS")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === "FIXED_COSTS"
                    ? "bg-slate-800 text-white border border-slate-700 shadow-none"
                    : "text-slate-500 hover:text-slate-200 hover:bg-slate-900"
                }`}
              >
                <Home className="w-4 h-4 text-amber-400" />
                Chi Phí Cố Định ({data.fixedCosts.length})
              </button>

              <button
                onClick={() => setActiveTab("SAVINGS_ASSETS")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === "SAVINGS_ASSETS"
                    ? "bg-slate-800 text-white border border-slate-700 shadow-none"
                    : "text-slate-500 hover:text-slate-200 hover:bg-slate-900"
                }`}
              >
                <Wallet className="w-4 h-4 text-emerald-400" />
                Quỹ Tích Lũy & Tài Sản ({data.personalAssets.filter(a => a.type === "SAVINGS" || a.type === "CASH_BANK" || a.type === "GOLD_INVESTMENT").length})
              </button>
            </div>

            {/* Tab Views */}
            <div className="pt-1">
              {activeTab === "DEBTS_INSTALLMENTS" && (
                <DebtsAndInstallmentsSection
                  installments={data.installments}
                  personalDebts={data.personalAssets}
                  supplierDebtTotal={data.netWorth.breakdown.supplierDebtTotal}
                  totalInstallmentsRemainingDebt={data.netWorth.breakdown.totalInstallmentsRemainingDebt}
                  monthlyDebtBurden={data.breakEven.monthlyDebtBurden}
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
