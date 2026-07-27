import { ReceiptsTable } from "./ReceiptsTable";
import { PaymentReceipt, ReceiptFlowType } from "../helpers";

type OutboundUnallocatedPanelProps = {
  receipts: PaymentReceipt[];
  shopBank: any;
  onSelectReceipt: (receipt: PaymentReceipt) => void;
  expandedReceiptId: number | null;
  onToggle: (id: number) => void;
  onAllocate: (receipt: PaymentReceipt) => void;
  matchableOrders: any[];
  matchingReceiptId: number | null;
  onMatchReceipt: (receiptId: number, orderCode: string) => Promise<void>;
  flowTypes: ReceiptFlowType[];
  onClassifyReceipt: (receiptId: number, flowTypeId: number, note?: string, linkedExpenseId?: number) => Promise<void>;
};

export function OutboundUnallocatedPanel({
  receipts,
  shopBank,
  onSelectReceipt,
  expandedReceiptId,
  onToggle,
  onAllocate,
  matchableOrders,
  matchingReceiptId,
  onMatchReceipt,
  flowTypes,
  onClassifyReceipt,
}: OutboundUnallocatedPanelProps) {
  return (
    <ReceiptsTable
      receipts={receipts}
      matchableOrders={matchableOrders}
      matchingReceiptId={matchingReceiptId}
      onMatchReceipt={onMatchReceipt}
      enableMatching={true}
      enableAllocation={true}
      onAllocate={onAllocate}
      enableOrderCodeEdit={false}
      expandedReceiptId={expandedReceiptId}
      onToggle={onToggle}
      onSelectReceipt={onSelectReceipt}
      showOrderCode={false}
      shopBank={shopBank}
      flowTypes={flowTypes}
      onClassifyReceipt={onClassifyReceipt}
    />
  );
}
