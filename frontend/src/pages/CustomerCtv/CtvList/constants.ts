import type { CtvItem, RoleItem } from "./types";

/** Danh sách role từ bảng roles — tên tab = cột name */
export const ROLES: RoleItem[] = [
  { id: 2, code: "CTV", name: "Cộng Tác Viên" },
  { id: 3, code: "CUSTOMER", name: "Khách" },
];

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
    totalOrders: 128,
    totalAmount: 456_000_000,
    rank: "Vàng",
    discount: "15%",
    status: "active",
    roleId: 2, // CTV - Cộng Tác Viên
  },
  {
    id: "2",
    account: "tranthib",
    name: "Trần Thị B",
    totalOrders: 89,
    totalAmount: 312_000_000,
    rank: "Bạc",
    discount: "12%",
    status: "active",
    roleId: 2,
  },
  {
    id: "3",
    account: "levanc",
    name: "Lê Văn C",
    totalOrders: 45,
    totalAmount: 98_000_000,
    rank: "Đồng",
    discount: "10%",
    status: "active",
    roleId: 2,
  },
  {
    id: "4",
    account: "phamthid",
    name: "Phạm Thị D",
    totalOrders: 12,
    totalAmount: 24_500_000,
    rank: "Mới",
    discount: "8%",
    status: "inactive",
    roleId: 3, // CUSTOMER - Khách
  },
  {
    id: "5",
    account: "hoangvane",
    name: "Hoàng Văn E",
    totalOrders: 210,
    totalAmount: 780_000_000,
    rank: "Kim cương",
    discount: "18%",
    status: "active",
    roleId: 2,
  },
  {
    id: "6",
    account: "vothif",
    name: "Võ Thị F",
    totalOrders: 0,
    totalAmount: 0,
    rank: "Mới",
    discount: "5%",
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
