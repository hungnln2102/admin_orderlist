import {
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import type { ElementType } from "react";
import StatCard, { STAT_CARD_ACCENTS } from "@/components/ui/StatCard";
import type { CreditLogsStats, CreditStatusGroup } from "../types";

type CreditStatsSectionProps = {
  stats: CreditLogsStats;
  statusGroup: CreditStatusGroup;
  onChangeGroup: (next: CreditStatusGroup) => void;
};

const CARDS: Array<{
  key: CreditStatusGroup;
  title: string;
  icon: ElementType;
  accent: keyof typeof STAT_CARD_ACCENTS;
  value: (stats: CreditLogsStats) => number;
}> = [
  {
    key: "all",
    title: "Tổng Credit",
    icon: SparklesIcon,
    accent: "sky",
    value: (stats) => stats.total_count,
  },
  {
    key: "available",
    title: "Khả dụng",
    icon: CheckCircleIcon,
    accent: "emerald",
    value: (stats) => stats.available_count,
  },
  {
    key: "applied",
    title: "Đã áp dụng",
    icon: ClockIcon,
    accent: "teal",
    value: (stats) => stats.applied_count,
  },
  {
    key: "unavailable",
    title: "Không khả dụng",
    icon: ExclamationTriangleIcon,
    accent: "rose",
    value: (stats) => stats.unavailable_count,
  },
];

export function CreditStatsSection({
  stats,
  statusGroup,
  onChangeGroup,
}: CreditStatsSectionProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {CARDS.map((card) => {
        const isActive = statusGroup === card.key;
        return (
          <button
            key={card.key}
            type="button"
            className="text-left"
            onClick={() => onChangeGroup(isActive ? "all" : card.key)}
          >
            <StatCard
              title={card.title}
              value={String(card.value(stats))}
              icon={card.icon}
              accent={STAT_CARD_ACCENTS[card.accent]}
              isActive={isActive}
            />
          </button>
        );
      })}
    </div>
  );
}
