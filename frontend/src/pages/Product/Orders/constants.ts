import type React from "react";
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowDownIcon,
  ArrowUpIcon,
} from "@heroicons/react/24/outline";
import {
  STAT_CARD_ACCENTS as CARD_ACCENTS,
  type StatAccent,
} from "../../../components/ui/StatCard";
import { ORDER_FIELDS, ORDER_STATUSES } from "../../../constants";

export type StatFilterKey = "all" | "renewal" | "expired" | "today";

export type BaseStat = {
  name: string;
  value: string;
  icon: React.ElementType;
  accent: StatAccent;
  filterKey: StatFilterKey;
};

export const STAT_FILTER_MAP: Record<StatFilterKey, string> = {
  all: "all",
  renewal: ORDER_STATUSES.CAN_GIA_HAN,
  expired: ORDER_STATUSES.ORDER_EXPIRED,
  today: "today",
};

export const BASE_STOCK_STATS: BaseStat[] = [
  {
    name: "Tổng Đơn Hàng",
    value: "0",
    icon: CheckCircleIcon,
    accent: CARD_ACCENTS.sky,
    filterKey: "all",
  },
  {
    name: "Cần Gia Hạn",
    value: "0",
    icon: ExclamationTriangleIcon,
    accent: CARD_ACCENTS.amber,
    filterKey: "renewal",
  },
  {
    name: "Hết Hạn",
    value: "0",
    icon: ArrowDownIcon,
    accent: CARD_ACCENTS.rose,
    filterKey: "expired",
  },
  {
    name: "Đăng Ký Hôm Nay",
    value: "0",
    icon: ArrowUpIcon,
    accent: CARD_ACCENTS.emerald,
    filterKey: "today",
  },
];

export const SEARCH_FIELD_OPTIONS = [
  { value: "all", label: "Tất cả cột" },
  { value: ORDER_FIELDS.ID_ORDER, label: "Mã Đơn Hàng" },
  { value: ORDER_FIELDS.ID_PRODUCT, label: "Sản Phẩm" },
  { value: ORDER_FIELDS.INFORMATION_ORDER, label: "Thông tin" },
  { value: ORDER_FIELDS.CUSTOMER, label: "Khách Hàng" },
  { value: ORDER_FIELDS.SLOT, label: "Slot" },
  { value: ORDER_FIELDS.SUPPLY, label: "Nguồn" },
] as const;
