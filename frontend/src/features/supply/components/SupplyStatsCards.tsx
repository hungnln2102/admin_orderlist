import React from "react";
import {
  ShoppingBagIcon,
  CurrencyDollarIcon,
  ArrowUturnLeftIcon,
} from "@heroicons/react/24/outline";
import StatCard, { STAT_CARD_ACCENTS } from "@/components/ui/StatCard";
import * as Helpers from "@/lib/helpers";

interface Props {
  orderCount: number;
  totalCost: number;
  totalRefund: number;
  loading?: boolean;
}

const SupplyStatsCards: React.FC<Props> = ({
  orderCount,
  totalCost,
  totalRefund,
  loading = false,
}) => {
  const dash = "—";
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
    </div>
  );
};

export default SupplyStatsCards;
