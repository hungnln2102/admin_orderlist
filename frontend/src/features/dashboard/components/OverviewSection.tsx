import React from "react";
import { OverviewStats, type OverviewStat } from "./OverviewStats";
import { OrderChartCard } from "./OrderChartCard";
import { FinancialChartsPanel } from "./FinancialChartsPanel";
import type {
  OrderStatusData,
  RevenueData,
  ProfitData,
  RefundData,
  TaxData,
  DashboardChartGranularity,
} from "@/features/dashboard/api/dashboardApi";

type OverviewSectionProps = {
  stats: OverviewStat[];
  revenueData: RevenueData[];
  orderData: OrderStatusData[];
  profitData: ProfitData[];
  refundData: RefundData[];
  taxData: TaxData[];
  availableYears: number[];
  selectedYear: number;
  onYearChange: (year: number) => void;
  isRangeMode?: boolean;
  chartGranularity?: DashboardChartGranularity;
};

export const OverviewSection: React.FC<OverviewSectionProps> = ({
  stats,
  revenueData,
  orderData,
  profitData,
  refundData,
  taxData,
  availableYears,
  selectedYear,
  onYearChange,
  isRangeMode = false,
  chartGranularity = "month",
}) => {
  return (
    <div className="overview-section">
      <OverviewStats stats={stats} />

      <div className="overview-section__charts mt-6 grid grid-cols-1 gap-4 sm:mt-8 sm:gap-5 lg:mt-10 xl:grid-cols-[minmax(0,1.85fr)_minmax(340px,1fr)] xl:items-stretch">
        <FinancialChartsPanel
          revenueData={revenueData}
          profitData={profitData}
          refundData={refundData}
          taxData={taxData}
          availableYears={availableYears}
          selectedYear={selectedYear}
          onYearChange={onYearChange}
          isRangeMode={isRangeMode}
          chartGranularity={chartGranularity}
        />
        <OrderChartCard data={orderData} chartGranularity={chartGranularity} />
      </div>
    </div>
  );
};

