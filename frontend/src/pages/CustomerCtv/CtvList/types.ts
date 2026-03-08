export type CtvStatus = "active" | "inactive" | "suspended";

/** Role từ bảng roles (cột name dùng làm tên tab) */
export interface RoleItem {
  id: number;
  code: string;
  name: string;
}

export interface CtvItem {
  id: string;
  account: string; // tài khoản (username/email)
  name: string; // họ tên (lastName + firstName hoặc account)
  lastName?: string; // Họ (dùng cho form tab Khách)
  firstName?: string; // Tên (dùng cho form tab Khách)
  email: string;
  balance: number; // số dư
  totalSpent: number; // tổng tiêu
  totalOrders: number; // giữ để tương thích, có thể = 0
  totalAmount: number; // giữ để tương thích, có thể = totalSpent
  rank: string;
  discount: string; // e.g. "10%", "—"
  status: CtvStatus;
  roleId: number | null; // FK → roles.id (để lọc theo tab)
}

export const CTV_STATUS_LABELS: Record<CtvStatus, string> = {
  active: "Hoạt động",
  inactive: "Không hoạt động",
  suspended: "Tạm khóa",
};

export const CTV_STATUS_OPTIONS: { value: CtvStatus | "all"; label: string }[] = [
  { value: "all", label: "Tất cả trạng thái" },
  { value: "active", label: "Hoạt động" },
  { value: "inactive", label: "Không hoạt động" },
  { value: "suspended", label: "Tạm khóa" },
];
