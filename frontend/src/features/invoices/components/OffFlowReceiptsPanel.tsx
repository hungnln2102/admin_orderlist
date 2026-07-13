import { ReceiptsTable } from "./ReceiptsTable";
import { PaymentReceipt } from "../helpers";

type OffFlowReceiptsPanelProps = {
  receipts: PaymentReceipt[];
  shopBank: any;
  onSelectReceipt: (receipt: PaymentReceipt) => void;
  expandedReceiptId: number | null;
  onToggle: (id: number) => void;
  onMatchReceipt: (receiptId: number, orderCode: string) => Promise<void>;
  matchingReceiptId: number | null;
  matchableOrders: any[];
};

export function OffFlowReceiptsPanel({
  receipts,
  shopBank,
  onSelectReceipt,
  expandedReceiptId,
  onToggle,
  onMatchReceipt,
  matchingReceiptId,
  matchableOrders,
}: OffFlowReceiptsPanelProps) {
  return (
    <ReceiptsTable
      receipts={receipts}
      matchableOrders={matchableOrders}
      matchingReceiptId={matchingReceiptId}
      onMatchReceipt={onMatchReceipt}
      enableMatching={true}
      enableOrderCodeEdit={false}
      expandedReceiptId={expandedReceiptId}
      onToggle={onToggle}
      onSelectReceipt={onSelectReceipt}
      showOrderCode={false}
      shopBank={shopBank}
    />
  );
}
