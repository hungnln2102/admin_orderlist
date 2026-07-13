import React, { useMemo } from "react";
import { MatchableOrder, PaymentReceipt, type ShopBankDisplay } from "../helpers";
import ReceiptsMatchConfirmModal from "./receipts-table/ReceiptsMatchConfirmModal";
import { useReceiptMatchState } from "./receipts-table/useReceiptMatchState";
import ReceiptTableRow from "./receipts-table/ReceiptTableRow";

type ReceiptsTableProps = {
  receipts: PaymentReceipt[];
  matchableOrders: MatchableOrder[];
  matchingReceiptId: number | null;
  onMatchReceipt: (receiptId: number, orderCode: string) => Promise<void>;
  enableMatching?: boolean;
  expandedReceiptId: number | null;
  onToggle: (receiptId: number) => void;
  onSelectReceipt?: (receipt: PaymentReceipt) => void;
  showOrderCode?: boolean;
  enableOrderCodeEdit?: boolean;
  shopBank: ShopBankDisplay;
};

export const ReceiptsTable: React.FC<ReceiptsTableProps> = ({
  receipts,
  matchableOrders,
  matchingReceiptId,
  onMatchReceipt,
  enableMatching = false,
  expandedReceiptId,
  onToggle,
  onSelectReceipt,
  showOrderCode = true,
  enableOrderCodeEdit = false,
  shopBank,
}) => {
  const {
    manualCodeByReceiptId,
    setManualCodeByReceiptId,
    rowErrorByReceiptId,
    pendingConfirm,
    setPendingConfirm,
    editingReceiptId,
    editingOrderCode,
    setEditingOrderCode,
    getSelectedValue,
    handleSelectMatch,
    handleSubmitManualMatch,
    handleConfirmMatch,
    startEditOrderCode,
    cancelEditOrderCode,
    saveEditedOrderCode,
  } = useReceiptMatchState({ onMatchReceipt });

  const orderOptions = useMemo(
    () => matchableOrders.filter((order) => String(order.orderCode || "").trim()),
    [matchableOrders]
  );
  const expandedColSpan = 6 + (enableMatching ? 1 : 0) + (showOrderCode ? 1 : 0);
  const expandedGridClass = showOrderCode
    ? "grid grid-cols-1 md:grid-cols-5 gap-6"
    : "grid grid-cols-1 md:grid-cols-4 gap-6";

  return (
    <div className="bg-transparent overflow-visible">
      <div className="overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-y-4 text-white">
          <thead>
            <tr className="[&>th]:px-5 [&>th]:pb-2 [&>th]:text-[11px] [&>th]:font-black [&>th]:uppercase [&>th]:tracking-[0.2em] [&>th]:text-indigo-300/70 [&>th]:text-left">
              {enableMatching ? <th className="w-[320px]">GHÉP MÃ ĐƠN</th> : null}
              {showOrderCode ? <th className="w-[120px]">MÃ ĐƠN</th> : null}
              <th className="w-[180px]">NGƯỜI GỬI</th>
              <th className="w-[180px]">NGƯỜI NHẬN</th>
              <th className="w-[140px]">SỐ TIỀN</th>
              <th>NỘI DUNG CHUYỂN KHOẢN</th>
              <th className="w-[150px]">MÃ GIAO DỊCH</th>
              <th className="w-[150px] text-right pr-6">NGÀY THANH TOÁN</th>
            </tr>
          </thead>
          <tbody className="">
            {receipts.map((receipt) => (
              <ReceiptTableRow
                key={receipt.id}
                receipt={receipt}
                orderOptions={orderOptions}
                selectedValue={getSelectedValue(receipt)}
                manualCode={manualCodeByReceiptId[receipt.id] || ""}
                rowError={rowErrorByReceiptId[receipt.id] || ""}
                isMatching={matchingReceiptId === receipt.id}
                isManualInput={getSelectedValue(receipt) === "__manual__"}
                isEditingOrderCode={enableOrderCodeEdit && editingReceiptId === receipt.id}
                isExpanded={expandedReceiptId === receipt.id}
                enableMatching={enableMatching}
                showOrderCode={showOrderCode}
                enableOrderCodeEdit={enableOrderCodeEdit}
                editingOrderCode={editingOrderCode}
                expandedColSpan={expandedColSpan}
                expandedGridClass={expandedGridClass}
                shopBank={shopBank}
                onToggle={onToggle}
                onSelectReceipt={onSelectReceipt}
                onSelectMatch={handleSelectMatch}
                onSubmitManualMatch={handleSubmitManualMatch}
                onManualCodeChange={(nextCode) =>
                  setManualCodeByReceiptId((prev) => ({
                    ...prev,
                    [receipt.id]: nextCode.toUpperCase(),
                  }))
                }
                onStartEditOrderCode={startEditOrderCode}
                onCancelEditOrderCode={cancelEditOrderCode}
                onSaveEditedOrderCode={saveEditedOrderCode}
                onEditingOrderCodeChange={(nextCode) => setEditingOrderCode(nextCode.toUpperCase())}
              />
            ))}
          </tbody>
        </table>
      </div>
      <ReceiptsMatchConfirmModal
        pendingConfirm={pendingConfirm}
        onCancel={() => setPendingConfirm(null)}
        onConfirm={() => void handleConfirmMatch()}
      />
    </div>
  );
};
