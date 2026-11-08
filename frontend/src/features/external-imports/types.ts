export interface PaymentAccount {
  id: number;
  label: string;
  accountNumber: string;
  accountHolder?: string | null;
  bankBin?: string | null;
  bankShortCode?: string | null;
  bankDisplayName?: string | null;
  accountType: string;
  accountScope?: string;
  balance: number;
  isDefault?: boolean;
}

export interface StoreExpenseItem {
  id: number;
  amount: number;
  reason: string;
  expenseType: "external_import" | "monthly_expense" | "mavn_import" | "withdraw_profit" | string;
  expenseDate: string;
  linkedOrderCode: string | null;
  expenseMeta: any;
  paymentReceiptId: number | null;
  shopBankAccountId: number | null;
  bankAccountLabel: string | null;
  bankAccountNumber: string | null;
  bankShortCode: string | null;
  bankDisplayName: string | null;
  bankAccountScope?: string | null;
  receiptReferenceCode: string | null;
  status: string;
  createdAt: string;
}

export interface ExpenseStats {
  totalAmount: number;
  externalImportTotal: number;
  externalImportShopTotal?: number;
  monthlyExpenseTotal: number;
  totalCount: number;
}

export interface ExpenseFormData {
  amount: string;
  expense_type: "external_import" | "monthly_expense";
  expense_date: string;
  reason: string;
  linked_order_code: string;
  shop_bank_account_id: string;
}

