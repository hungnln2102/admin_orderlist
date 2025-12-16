import React from "react";
import { PlusIcon } from "@heroicons/react/24/outline";
import GradientButton from "../../../../components/ui/GradientButton";
import StatCard, { STAT_CARD_ACCENTS } from "../../../../components/ui/StatCard";
import { PricingStat } from "../types";

interface PricingStatsProps {
  stats: PricingStat[];
  onAddProduct: () => void;
}

const PricingStats: React.FC<PricingStatsProps> = ({ stats, onAddProduct }) => {
  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <h1 className="text-2xl font-bold text-white">Bảng Giá Sản Phẩm</h1>
        <GradientButton icon={PlusIcon} onClick={onAddProduct}>
          Thêm Sản Phẩm
        </GradientButton>
      </div>
      <div className="rounded-[28px] border border-white/10 bg-gradient-to-br from-white/6 via-indigo-400/25 to-indigo-900/40 p-5 shadow-[0_24px_65px_-28px_rgba(0,0,0,0.8),0_18px_42px_-26px_rgba(255,255,255,0.25)]">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {stats.map((stat) => (
            <StatCard
              key={stat.name}
              title={stat.name}
              value={stat.value}
              icon={stat.icon}
              subtitle={stat.subtitle}
              accent={STAT_CARD_ACCENTS[stat.accent]}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default PricingStats;
