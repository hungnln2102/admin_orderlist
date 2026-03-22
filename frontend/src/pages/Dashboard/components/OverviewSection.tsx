import React from "react";
import { OverviewStats, type OverviewStat } from "./OverviewStats";
import { RevenueChartCard } from "./RevenueChartCard";
import { OrderChartCard } from "./OrderChartCard";
import { ProfitChartCard } from "./ProfitChartCard";
import { type OrderStatusData, type RevenueData, type ProfitData } from "../../../lib/api";

type OverviewSectionProps = {
  stats: OverviewStat[];
  revenueData: RevenueData[];
  orderData: OrderStatusData[];
  profitData: ProfitData[];
  availableYears: number[];
  selectedYear: number;
  onYearChange: (year: number) => void;
};

export const OverviewSection: React.FC<OverviewSectionProps> = ({
  stats,
  revenueData,
  orderData,
  profitData,
  availableYears,
  selectedYear,
  onYearChange,
}) => {
  return (
    <div className="overview-section">
      <OverviewStats stats={stats} />

      <div className="overview-section__charts grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2 xl:grid-cols-3 xl:gap-5 mt-6 sm:mt-8 lg:mt-10">
        <RevenueChartCard
          data={revenueData}
          availableYears={availableYears}
          selectedYear={selectedYear}
          onYearChange={onYearChange}
        />
        <OrderChartCard data={orderData} />
        <ProfitChartCard
          data={profitData}
          availableYears={availableYears}
          selectedYear={selectedYear}
          onYearChange={onYearChange}
        />
      </div>
    </div>
  );
};

