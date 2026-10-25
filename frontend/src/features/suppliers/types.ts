export interface SupplierItem {
  id: number;
  supplier_name: string;
  number_bank: string;
  bin_bank: string;
  account_holder: string;
  active_supply: boolean;
  total_orders: number;
  current_month_orders: number;
  current_month_cost: number;
  last_order_date: string | null;
  total_paid: number;
  total_debt: number;
}

export interface SupplierCostLogItem {
  id: string | number;
  order_list_id: number;
  supply_id: number;
  id_order: string;
  supplier_name: string;
  import_cost: number;
  refund_amount: number;
  ncc_payment_status: string;
  logged_at: string;
}

export interface SupplierDetailData {
  general_info: {
    id: number;
    supplier_name: string;
    bank_name: string;
    number_bank: string;
    bin_bank: string;
    account_holder: string;
    active_supply: boolean;
  };
  payment_overview: {
    total_paid: number;
    remaining_debt: number;
    refund_amount: number;
    unpaid_orders_count: number;
  };
  order_stats: {
    total_orders: number;
    paid_orders: number;
    unpaid_orders: number;
    canceled_orders: number;
  };
  unpaid_cycle: {
    amount_needed: number;
    refund_to_shop: number;
    debt_by_order: number;
    amount_paid: number;
    payment_status: string;
    shop_bank_accounts: { id: number; label: string }[];
    vietqr_url: string | null;
  };
  monthly_orders: { month: string; count: number }[];
}

export interface SupplierFormData {
  supplier_name: string;
  number_bank: string;
  bin_bank: string;
  account_holder: string;
  active_supply: boolean;
}
