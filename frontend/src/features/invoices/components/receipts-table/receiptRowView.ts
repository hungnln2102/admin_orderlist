import { formatDateToDMY } from "@/shared/date";
import {
  extractTransactionCodeFromNote,
  formatCurrencyVnd,
  resolveSender,
  type PaymentReceipt,
  type ShopBankDisplay,
} from "../../helpers";

export type ReceiptRowView = {
  isOutboundTransfer: boolean;
  amountClassName: string;
  amountDisplay: string;
  senderDisplay: string;
  receiverDisplay: string;
  contentDisplay: string;
  transactionCodeDisplay: string;
  paidAtDisplay: string;
  outboundReasonLabel: string;
};

export const buildReceiptRowView = (
  receipt: PaymentReceipt,
  shopBank: ShopBankDisplay
): ReceiptRowView => {
  const isOutboundTransfer = Boolean(
    receipt.outboundReasonLabel || receipt.outboundAmount
  );
  const signedAmount = isOutboundTransfer
    ? -Math.abs(receipt.outboundAmount || receipt.amount)
    : receipt.amount;

  return {
    isOutboundTransfer,
    amountClassName: isOutboundTransfer ? "text-red-300" : "text-emerald-300",
    amountDisplay: formatCurrencyVnd(signedAmount),
    senderDisplay: resolveSender(receipt) || "—",
    receiverDisplay: receipt.receiver || shopBank.accountNumber,
    contentDisplay: receipt.outboundContent || receipt.note || "—",
    transactionCodeDisplay: extractTransactionCodeFromNote(receipt.note) || "—",
    paidAtDisplay: receipt.paidAt ? formatDateToDMY(receipt.paidAt) : "—",
    outboundReasonLabel: receipt.outboundReasonLabel || "Tiền ra",
  };
};
