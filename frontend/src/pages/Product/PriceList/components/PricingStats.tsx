import React from "react";
import StatCard, { STAT_CARD_ACCENTS } from "../../../../components/ui/StatCard";
import { PricingStat } from "../types";

interface PricingStatsProps {
  stats: PricingStat[];
  onAddProduct: () => void;
}

const PricingStats: React.FC<PricingStatsProps> = ({ stats }) => {
  return (
    <div className="pricing-stats space-y-4">
      <div className="pricing-stats__panel rounded-[32px] border border-white/5 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-slate-900/40 p-6 shadow-2xl backdrop-blur-xl">
        <div className="pricing-stats__grid grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
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
