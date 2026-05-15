import type { SupplyOrderCostRow } from "@/lib/suppliesApi";

export type ActiveSupplyTab = "nccCosts" | "externalImport";

export type ExternalImportLogItem = {
  id: number;
  amount: number;
  reason: string;
  linkedOrderCode: string | null;
  expenseDate: string | null;
  createdAt: string | null;
  expenseType: "external_import" | "mavn_import" | string;
  traceCode: string | null;
};

export type NccCostsTableProps = {
  loading: boolean;
  rows: SupplyOrderCostRow[];
  offset: number;
  formatUpdateDate: (row: SupplyOrderCostRow) => string;
  formatCurrency: (value: unknown) => string;
};

export type ExternalImportTableProps = {
  loading: boolean;
  error: string | null;
  logs: ExternalImportLogItem[];
  formatCurrency: (value: unknown) => string;
  onEditTrace: (item: ExternalImportLogItem) => void;
};
