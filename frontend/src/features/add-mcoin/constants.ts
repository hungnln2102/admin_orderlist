import type { CoinHistoryItem } from "./types";

export const MOCK_COIN_HISTORY: CoinHistoryItem[] = [
  {
    id: "1",
    account: "nguyenvana",
    type: "add",
    amount: 50000,
    description: "Nạp thưởng đăng ký",
    createdAt: "2025-02-20T10:30:00.000Z",
  },
  {
    id: "2",
    account: "tranthib",
    type: "spend",
    amount: 20000,
    description: "Đổi quà",
    createdAt: "2025-02-21T14:15:00.000Z",
  },
  {
    id: "3",
    account: "hoangvane",
    type: "add",
    amount: 100000,
    description: "Nạp Mcoin",
    createdAt: "2025-02-22T09:00:00.000Z",
  },
];

export function formatCoinAmount(amount: number): string {
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(amount) + " xu";
}

export function formatCoinDate(isoString: string): string {
  const date = new Date(isoString);
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}
