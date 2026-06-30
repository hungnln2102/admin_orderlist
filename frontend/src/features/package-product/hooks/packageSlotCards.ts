import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { STAT_CARD_ACCENTS } from "@/components/ui/StatCard";

type PackageSlotStats = {
  total: number;
  low: number;
  out: number;
};

export const buildPackageSlotCards = (slotStats: PackageSlotStats) => [
  {
    name: "Sá»‘ dÃ²ng báº£ng",
    value: String(slotStats.total),
    icon: CheckCircleIcon,
    accent: STAT_CARD_ACCENTS.sky,
  },
  {
    name: "GÃ³i sáº¯p háº¿t",
    value: String(slotStats.low),
    icon: ExclamationTriangleIcon,
    accent: STAT_CARD_ACCENTS.amber,
  },
  {
    name: "GÃ³i Ä‘Ã£ háº¿t",
    value: String(slotStats.out),
    icon: ArrowDownIcon,
    accent: STAT_CARD_ACCENTS.rose,
  },
  {
    name: "ThÃªm hÃ´m nay",
    value: "0",
    icon: ArrowUpIcon,
    accent: STAT_CARD_ACCENTS.emerald,
  },
];
