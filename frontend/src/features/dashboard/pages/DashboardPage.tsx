import React, { useEffect, useState } from "react";
import { FinanceSection } from "../components/FinanceSection";
import { OverviewSection } from "../components/OverviewSection";
import { SectionTabs } from "../components/SectionTabs";
import { DashboardDateRangeFilter } from "../components/DashboardDateRangeFilter";
import { DashboardHero } from "../components/DashboardHero";
import { budgets, currencyFormatter, financeSummary } from "../constants";
import { useDashboardStats } from "../hooks/useDashboardStats";
import { useMonthlySummary } from "../hooks/useMonthlySummary";
import { useGoldPrices } from "../hooks/useGoldPrices";
import { useWalletBalances } from "../hooks/useWalletBalances";
import { useSavingGoals } from "../hooks/useSavingGoals";

const Dashboard: React.FC = () => {
  const {
    statsData,
    revenueChartData,
    orderChartData,
    profitChartData,
    refundChartData,
    taxChartData,
    availableYears,
    selectedYear,
    setSelectedYear,
    dashboardRange,
    setDashboardRange,
    loading,
    errorMessage,
  } = useDashboardStats();

  const { data: monthlySummaryData, loading: monthlySummaryLoading, error: monthlySummaryError, refetch: refetchMonthlySummary } = useMonthlySummary();
  const { goldLoading, goldError, selectedGoldRows, fetchGoldPrices } = useGoldPrices();
  const { walletColumns, walletRows, walletLoading, walletError, fetchWalletBalances } = useWalletBalances();
  const { goals: savingGoals, refetch: refetchGoals } = useSavingGoals();
  const [activeSection, setActiveSection] = useState<"overview" | "finance">("overview");

  const latestGoldBid = selectedGoldRows.length ? Number(selectedGoldRows[0]?.bid || 0) || null : null;

  useEffect(() => {
    void fetchGoldPrices();
  }, [fetchGoldPrices]);

  if (loading) {
    return (
      <div className="py-10 text-center">
        <p className="text-lg font-medium text-white/80">Đang tải dữ liệu dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard space-y-6 sm:space-y-7 p-3 sm:p-4 lg:p-6">
      <DashboardHero
        rightSlot={
          activeSection === "overview" ? (
            <DashboardDateRangeFilter
              value={dashboardRange}
              onChange={setDashboardRange}
              className="w-full shrink-0"
            />
          ) : undefined
        }
      />

      <div className="rounded-2xl border border-indigo-500/30 bg-[linear-gradient(135deg,rgba(30,27,75,0.42)_0%,rgba(15,23,42,0.55)_45%,rgba(15,23,42,0.35)_100%)] shadow-[0_20px_56px_-16px_rgba(79,70,229,0.25),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl p-2 sm:p-2.5">
        <SectionTabs embedded activeSection={activeSection} onChange={setActiveSection} />
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-red-300 bg-red-950/30 p-4 text-red-300 backdrop-blur">{errorMessage}</div>
      )}

      {activeSection === "overview" && (
        <>
          <OverviewSection
            stats={statsData}
            revenueData={revenueChartData}
            orderData={orderChartData}
            profitData={profitChartData}
            refundData={refundChartData}
            taxData={taxChartData}
            availableYears={availableYears}
            selectedYear={selectedYear}
            onYearChange={setSelectedYear}
            isRangeMode={dashboardRange !== null}
          />
          {/* Monthly summary table intentionally hidden by UI request */}
        </>
      )}

      {activeSection === "finance" && (
        <FinanceSection
          financeSummary={financeSummary}
          budgets={budgets}
          savingGoals={savingGoals}
          currencyFormatter={currencyFormatter}
          goldRows={selectedGoldRows}
          goldLoading={goldLoading}
          goldError={goldError}
          onRefreshGold={fetchGoldPrices}
          latestGoldBid={latestGoldBid}
          walletColumns={walletColumns}
          walletRows={walletRows}
          walletLoading={walletLoading}
          walletError={walletError}
          onRefreshWallets={fetchWalletBalances}
          onRefetchGoals={refetchGoals}
        />
      )}
    </div>
  );
};

export default Dashboard;
