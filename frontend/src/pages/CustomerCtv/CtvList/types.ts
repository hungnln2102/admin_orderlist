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
  name: string;
  totalOrders: number;
  totalAmount: number;
  rank: string;
  discount: string; // e.g. "10%", "15%"
  status: CtvStatus;
  roleId: number; // FK → roles.id (để lọc theo tab)
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
