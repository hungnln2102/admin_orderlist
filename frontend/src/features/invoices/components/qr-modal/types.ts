import type { MatchableOrder, ShopBankDisplay } from "../../helpers";

export type QrModalProps = {
  open: boolean;
  amount: string;
  note: string;
  matchableOrders: MatchableOrder[];
  shopBank: ShopBankDisplay;
  onClose: () => void;
  onAmountChange: (value: string) => void;
  onNoteChange: (value: string) => void;
};

export type BatchSummary = {
  id: number;
  batchCode: string;
  totalAmount: number;
  orderCount: number;
  status: string;
  paidReceiptId: number | null;
  paidAt: string | null;
  createdAt: string | null;
};

export type BatchItem = {
  id: number;
  orderCode: string;
  orderListId: number | null;
  amount: number;
  status: string;
  createdAt: string | null;
};
