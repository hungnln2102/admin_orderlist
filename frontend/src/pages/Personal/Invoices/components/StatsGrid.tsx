import React from "react";
import StatCard, { StatAccent } from "../../../../components/ui/StatCard";

type StatItem = {
  name: string;
  value: string;
  icon: React.ElementType;
  accent: StatAccent;
};

type StatsGridProps = {
  stats: StatItem[];
};

export const StatsGrid: React.FC<StatsGridProps> = ({ stats }) => {
  return (
    <div className="rounded-[28px] bg-gradient-to-br from-white/6 via-indigo-400/25 to-indigo-900/40 border border-white/10 p-5 shadow-[0_24px_65px_-28px_rgba(0,0,0,0.8),0_18px_42px_-26px_rgba(255,255,255,0.25)]">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {stats.map((stat) => (
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
