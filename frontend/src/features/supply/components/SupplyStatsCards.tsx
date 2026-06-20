import React from "react";
import {
  ShoppingBagIcon,
  CurrencyDollarIcon,
  ArrowUturnLeftIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import StatCard, { STAT_CARD_ACCENTS } from "@/components/ui/StatCard";
import * as Helpers from "@/shared/utils";

interface Props {
  orderCount: number;
  totalCost: number;
  totalRefund: number;
  totalUnpaid: number;
  loading?: boolean;
}

const SupplyStatsCards: React.FC<Props> = ({
  orderCount,
  totalCost,
  totalRefund,
  totalUnpaid,
  loading = false,
}) => {
  const dash = "?";
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard
        title="Tổng đơn"
        value={loading ? dash : orderCount}
        icon={ShoppingBagIcon}
        accent={STAT_CARD_ACCENTS.violet}
      />
      <StatCard
        title="Tổng nhập"
        value={loading ? dash : Helpers.formatCurrency(totalCost)}
        icon={CurrencyDollarIcon}
        accent={STAT_CARD_ACCENTS.emerald}
      />
      <StatCard
        title="Tổng hoàn"
        value={loading ? dash : Helpers.formatCurrency(totalRefund)}
        icon={ArrowUturnLeftIcon}
        accent={STAT_CARD_ACCENTS.amber}
      />
      <StatCard
        title="Tổng chưa thanh toán"
        value={loading ? dash : Helpers.formatCurrency(totalUnpaid)}
        icon={ClockIcon}
        accent={STAT_CARD_ACCENTS.rose}
      />
    </div>
  );
};

export default SupplyStatsCards;

