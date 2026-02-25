import type { CustomerStatusItem } from "./types";

export const MOCK_CUSTOMER_STATUS_LIST: CustomerStatusItem[] = [
  {
    id: "1",
    account: "nguyenvana",
    lastName: "Nguyễn Văn",
    firstName: "A",
    email: "nguyenvana@email.com",
    balance: 5_200_000,
    totalSpent: 128_000_000,
    rank: "Vàng",
    status: "active",
  },
  {
    id: "2",
    account: "tranthib",
    lastName: "Trần Thị",
    firstName: "B",
    email: "tranthib@email.com",
    balance: 2_800_000,
    totalSpent: 85_000_000,
    rank: "Bạc",
    status: "active",
  },
  {
    id: "3",
    account: "levanc",
    lastName: "Lê Văn",
    firstName: "C",
    email: "levanc@email.com",
    balance: 0,
    totalSpent: 42_000_000,
    rank: "Đồng",
    status: "active",
  },
  {
    id: "4",
    account: "phamthid",
    lastName: "Phạm Thị",
    firstName: "D",
    email: "phamthid@email.com",
    balance: 1_500_000,
    totalSpent: 12_000_000,
    rank: "Mới",
    status: "inactive",
  },
  {
    id: "5",
    account: "hoangvane",
    lastName: "Hoàng Văn",
    firstName: "E",
    email: "hoangvane@email.com",
    balance: 15_000_000,
    totalSpent: 520_000_000,
    rank: "Kim cương",
    status: "active",
  },
  {
    id: "6",
    account: "vothif",
    lastName: "Võ Thị",
    firstName: "F",
    email: "vothif@email.com",
    balance: 0,
    totalSpent: 0,
    rank: "Mới",
    status: "suspended",
  },
];

export function formatCustomerCurrency(value: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}
