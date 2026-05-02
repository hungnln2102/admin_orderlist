import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { FinanceSection } from "../components/FinanceSection";
import { OverviewSection } from "../components/OverviewSection";
import { SectionTabs } from "../components/SectionTabs";
import { DashboardCyclePresetButtons } from "../components/DashboardCyclePresetButtons";
import { DashboardDateRangeFilter } from "../components/DashboardDateRangeFilter";
import { DashboardHero } from "../components/DashboardHero";
import { budgets, currencyFormatter, financeSummary } from "../constants";
import { useDashboardStats } from "../hooks/useDashboardStats";
import { useMonthlySummary } from "../hooks/useMonthlySummary";
import { useWalletBalances } from "../hooks/useWalletBalances";
import { useSavingGoals } from "../hooks/useSavingGoals";

type DashboardSection = "overview" | "finance";

const getDashboardSectionFromSearch = (search: string): DashboardSection => {
  const tab = new URLSearchParams(search).get("tab");
  return tab === "finance" ? "finance" : "overview";
};

const DashboardContent: React.FC = () => {
  const location = useLocation();
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
    chartGranularity,
    setDashboardRange,
    loading,
    errorMessage,
    availableProfit,
    refetchDashboardStats,
  } = useDashboardStats();

  useMonthlySummary();
  const { walletColumns, walletRows, walletLoading, walletError, fetchWalletBalances } = useWalletBalances();
  const { goals: savingGoals, refetch: refetchGoals } = useSavingGoals();
  const [activeSection, setActiveSection] = useState<DashboardSection>(() =>
    getDashboardSectionFromSearch(location.search)
  );

  useEffect(() => {
    setActiveSection(getDashboardSectionFromSearch(location.search));
  }, [location.search]);

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
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-stretch sm:justify-end sm:gap-2 md:gap-3">
              <DashboardCyclePresetButtons
                range={dashboardRange}
                onChange={setDashboardRange}
                className="justify-start sm:justify-end"
              />
              <DashboardDateRangeFilter
                value={dashboardRange}
                onChange={setDashboardRange}
                className="w-full min-w-0 sm:min-w-[260px] sm:flex-1 sm:max-w-[320px]"
              />
            </div>
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
            chartGranularity={chartGranularity}
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
          walletColumns={walletColumns}
          walletRows={walletRows}
          walletLoading={walletLoading}
          walletError={walletError}
          onRefreshWallets={fetchWalletBalances}
          onRefreshStats={refetchDashboardStats}
          onRefetchGoals={refetchGoals}
          availableProfit={availableProfit}
        />
      )}
    </div>
  );
};

const Dashboard: React.FC = () => {
  const location = useLocation();
  const tab = new URLSearchParams(location.search).get("tab");

  if (tab === "tax" || tab === "expenses") {
    return <Navigate to={tab === "tax" ? "/tax" : "/expenses"} replace />;
  }

  return <DashboardContent />;
};

export default Dashboard;
