import type { CtvItem, RoleItem } from "./types";

/** Danh sách role từ bảng roles — tên tab = cột name */
export const ROLES: RoleItem[] = [
  { id: 2, code: "CTV", name: "Cộng Tác Viên" },
  { id: 3, code: "CUSTOMER", name: "Khách" },
];

/** Role id Khách — tab này dùng form trang Khách hàng (cột HỌ, TÊN riêng) */
export const ROLE_ID_CUSTOMER = 3;

/** Thứ tự hạng: số càng cao = hạng càng cao (ưu tiên trước) */
export const RANK_ORDER: Record<string, number> = {
  "Kim cương": 5,
  Vàng: 4,
  Bạc: 3,
  Đồng: 2,
  Mới: 1,
};

/** Thứ tự trạng thái: active ưu tiên trước */
export const STATUS_SORT_ORDER: Record<string, number> = {
  active: 2,
  inactive: 1,
  suspended: 0,
};

export function sortCtvList(list: CtvItem[]): CtvItem[] {
  return [...list].sort((a, b) => {
    const rankA = RANK_ORDER[a.rank] ?? 0;
    const rankB = RANK_ORDER[b.rank] ?? 0;
    if (rankB !== rankA) return rankB - rankA; // hạng cao trước
    const statusA = STATUS_SORT_ORDER[a.status] ?? 0;
    const statusB = STATUS_SORT_ORDER[b.status] ?? 0;
    return statusB - statusA; // Hoạt động trước
  });
}

export const MOCK_CTV_LIST: CtvItem[] = [
  {
    id: "1",
    account: "nguyenvana",
    name: "Nguyễn Văn A",
    email: "nguyenvana@email.com",
    balance: 5_200_000,
    totalSpent: 456_000_000,
    totalOrders: 128,
    totalAmount: 456_000_000,
    rank: "Vàng",
    discount: "—",
    status: "active",
    roleId: 2,
  },
  {
    id: "2",
    account: "tranthib",
    name: "Trần Thị B",
    email: "tranthib@email.com",
    balance: 2_800_000,
    totalSpent: 312_000_000,
    totalOrders: 89,
    totalAmount: 312_000_000,
    rank: "Bạc",
    discount: "—",
    status: "active",
    roleId: 2,
  },
  {
    id: "3",
    account: "levanc",
    name: "Lê Văn C",
    email: "levanc@email.com",
    balance: 0,
    totalSpent: 98_000_000,
    totalOrders: 45,
    totalAmount: 98_000_000,
    rank: "Đồng",
    discount: "—",
    status: "active",
    roleId: 2,
  },
  {
    id: "4",
    account: "phamthid",
    name: "Phạm Thị D",
    email: "phamthid@email.com",
    balance: 1_500_000,
    totalSpent: 24_500_000,
    totalOrders: 12,
    totalAmount: 24_500_000,
    rank: "Mới",
    discount: "—",
    status: "inactive",
    roleId: 3,
  },
  {
    id: "5",
    account: "hoangvane",
    name: "Hoàng Văn E",
    email: "hoangvane@email.com",
    balance: 15_000_000,
    totalSpent: 780_000_000,
    totalOrders: 210,
    totalAmount: 780_000_000,
    rank: "Kim cương",
    discount: "—",
    status: "active",
    roleId: 2,
  },
  {
    id: "6",
    account: "vothif",
    name: "Võ Thị F",
    email: "vothif@email.com",
    balance: 0,
    totalSpent: 0,
    totalOrders: 0,
    totalAmount: 0,
    rank: "Mới",
    discount: "—",
    status: "suspended",
    roleId: 3,
  },
];

export function formatCtvCurrency(value: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}
