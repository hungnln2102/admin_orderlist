export type CustomerStatusType = "active" | "inactive" | "suspended";

export interface CustomerStatusItem {
  id: string;
  account: string;
  lastName: string;  // Họ
  firstName: string; // Tên
  email: string;
  balance: number;   // Số dư
  totalSpent: number; // Tổng tiêu
  rank: string;
  status: CustomerStatusType;
}

export const CUSTOMER_STATUS_LABELS: Record<CustomerStatusType, string> = {
  active: "Hoạt động",
  inactive: "Không hoạt động",
  suspended: "Tạm khóa",
};

export const CUSTOMER_STATUS_OPTIONS: {
  value: CustomerStatusType | "all";
  label: string;
}[] = [
  { value: "all", label: "Tất cả trạng thái" },
  { value: "active", label: "Hoạt động" },
  { value: "inactive", label: "Không hoạt động" },
  { value: "suspended", label: "Tạm khóa" },
];
