import React, { useEffect, useState } from "react";
import { FinanceSection } from "./components/FinanceSection";
import { OverviewSection } from "./components/OverviewSection";
import { SectionTabs } from "./components/SectionTabs";
import { DashboardHero } from "./components/DashboardHero";
import { budgets, currencyFormatter, financeSummary } from "./constants";
import { useDashboardStats } from "./hooks/useDashboardStats";
import { useGoldPrices } from "./hooks/useGoldPrices";
import { useWalletBalances } from "./hooks/useWalletBalances";
import { useSavingGoals } from "./hooks/useSavingGoals";

const Dashboard: React.FC = () => {
  const {
    statsData,
    revenueChartData,
    orderChartData,
    availableYears,
    selectedYear,
    setSelectedYear,
    loading,
    errorMessage,
  } = useDashboardStats();

  const { goldLoading, goldError, selectedGoldRows, fetchGoldPrices } = useGoldPrices();
  const { walletColumns, walletRows, walletLoading, walletError, fetchWalletBalances } = useWalletBalances();
  const { goals: savingGoals, totalTarget: savingGoalsTotalTarget, loading: savingGoalsLoading, refetch: refetchGoals } = useSavingGoals();
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
    <div className="space-y-6">
      <DashboardHero />

      <SectionTabs activeSection={activeSection} onChange={setActiveSection} />

      {errorMessage && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">{errorMessage}</div>
      )}

      {activeSection === "overview" && (
        <OverviewSection
          stats={statsData}
          revenueData={revenueChartData}
          orderData={orderChartData}
          availableYears={availableYears}
          selectedYear={selectedYear}
          onYearChange={setSelectedYear}
        />
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
