import React from "react";
import { OverviewStats, type OverviewStat } from "./OverviewStats";
import { RevenueChartCard } from "./RevenueChartCard";
import { OrderChartCard } from "./OrderChartCard";
import { type OrderStatusData, type RevenueData } from "../../../lib/api";

type OverviewSectionProps = {
  stats: OverviewStat[];
  revenueData: RevenueData[];
  orderData: OrderStatusData[];
  availableYears: number[];
  selectedYear: number;
  onYearChange: (year: number) => void;
};

export const OverviewSection: React.FC<OverviewSectionProps> = ({
  stats,
  revenueData,
  orderData,
  availableYears,
  selectedYear,
  onYearChange,
}) => {
  return (
    <div className="overview-section">
      <OverviewStats stats={stats} />

      <div className="overview-section__charts grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-1 xl:grid-cols-2">
        <RevenueChartCard
          data={revenueData}
          availableYears={availableYears}
          selectedYear={selectedYear}
          onYearChange={onYearChange}
        />
        <OrderChartCard data={orderData} />
      </div>
    </div>
  );
};

