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
    name: "Số dòng bảng",
    value: String(slotStats.total),
    icon: CheckCircleIcon,
    accent: STAT_CARD_ACCENTS.sky,
  },
  {
    name: "Gói sắp hết",
    value: String(slotStats.low),
    icon: ExclamationTriangleIcon,
    accent: STAT_CARD_ACCENTS.amber,
  },
  {
    name: "Gói đã hết",
    value: String(slotStats.out),
    icon: ArrowDownIcon,
    accent: STAT_CARD_ACCENTS.rose,
  },
  {
    name: "Thêm hôm nay",
    value: "0",
    icon: ArrowUpIcon,
    accent: STAT_CARD_ACCENTS.emerald,
  },
];
