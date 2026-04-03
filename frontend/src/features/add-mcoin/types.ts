export type CoinHistoryType = "add" | "spend";

export interface CoinHistoryItem {
  id: string;
  account: string;
  type: CoinHistoryType;
  amount: number;
  description: string;
  createdAt: string; // ISO string
}
