import React from "react";
import {
  UserGroupIcon,
  CheckCircleIcon,
  ShoppingBagIcon,
  CurrencyDollarIcon,
} from "@heroicons/react/24/outline";
import StatCard, { STAT_CARD_ACCENTS } from "../../../../components/ui/StatCard";
import * as Helpers from "../../../../lib/helpers";
import { SupplyStats } from "../types";

interface Props {
  stats: SupplyStats;
}

const SupplyStatsCards: React.FC<Props> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <StatCard title="Tổng NCC" value={stats.totalSuppliers} icon={UserGroupIcon} accent={STAT_CARD_ACCENTS.sky} />
      <StatCard title="Đang hoạt động" value={stats.activeSuppliers} icon={CheckCircleIcon} accent={STAT_CARD_ACCENTS.emerald} />
      <StatCard title="Tổng đơn" value={stats.monthlyOrders} icon={ShoppingBagIcon} accent={STAT_CARD_ACCENTS.violet} />
      <StatCard title="Tổng nhập" value={Helpers.formatCurrencyShort(stats.totalImportValue)} icon={CurrencyDollarIcon} accent={STAT_CARD_ACCENTS.amber} />
    </div>
  );
};

export default SupplyStatsCards;
