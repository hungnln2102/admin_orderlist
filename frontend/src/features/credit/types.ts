export type CreditStatusGroup = "all" | "available" | "applied" | "unavailable";

export type CreditSortOption =
  | "issued_at_desc"
  | "issued_at_asc"
  | "updated_at_desc"
  | "available_amount_desc"
  | "available_amount_asc";

export type CreditLogItem = {
  id: number;
  credit_code: string;
  source_order_list_id: number | null;
  source_order_code: string;
  customer_name: string;
  customer_contact: string;
  refund_amount: number;
  available_amount: number;
  applied_total: number;
  applied_count: number;
  status: string;
  note: string | null;
  refunded_cashout_at?: string | null;
  issued_at: string | null;
  updated_at: string | null;
  created_at: string | null;
  last_applied_at: string | null;
  latest_target_order_code: string | null;
  is_available: boolean;
  is_applied: boolean;
  is_unavailable: boolean;
  is_refunded?: boolean;
};

export type CreditLogsPagination = {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
};

export type CreditLogsStats = {
  total_count: number;
  available_count: number;
  applied_count: number;
  unavailable_count: number;
};

export type CreditLogsResponse = {
  items: CreditLogItem[];
  pagination: CreditLogsPagination;
  filters: {
    q: string;
    status_group: CreditStatusGroup;
    sort: CreditSortOption;
  };
  stats: CreditLogsStats;
};
