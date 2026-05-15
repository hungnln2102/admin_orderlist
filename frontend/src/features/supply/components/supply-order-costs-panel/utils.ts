import * as Helpers from "@/shared/utils";
import type { SupplyOrderCostAggregates, SupplyOrderCostRow } from "@/lib/suppliesApi";

import type { ActiveSupplyTab } from "./types";

export const PAGE_SIZE = 80;

export const EMPTY_AGG: SupplyOrderCostAggregates = {
  orderCount: 0,
  totalCost: 0,
  totalRefund: 0,
};

export const SUPPLY_COST_TABS: Array<{ key: ActiveSupplyTab; label: string }> = [
  { key: "nccCosts", label: "Chi phí NCC theo đơn" },
  { key: "externalImport", label: "Nhập hàng ngoài luồng" },
];

export const formatCurrency = Helpers.formatCurrency;

export const formatUpdateDate = (row: SupplyOrderCostRow) => {
  const raw = row.canceledAt || row.orderDate;
  if (!raw) return "--";
  return Helpers.formatDateToDMY(raw) || String(raw);
};
