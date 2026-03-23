import React from "react";
import StatCard, { type StatAccent } from "../../../../components/ui/StatCard";

export type PackageStatCardItem = {
  name: string;
  value: string;
  icon: React.ElementType;
  accent: StatAccent;
};

type PackageStatsSectionProps = {
  slotCards: PackageStatCardItem[];
};

export const PackageStatsSection: React.FC<PackageStatsSectionProps> = ({
  slotCards,
}) => {
  return (
    <div className="rounded-[32px] glass-panel p-6 shadow-2xl border border-white/5">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {slotCards.map((stat) => (
          <StatCard
            key={stat.name}
            title={stat.name}
            value={stat.value}
            icon={stat.icon}
            accent={stat.accent}
          />
        ))}
      </div>
    </div>
  );
};

