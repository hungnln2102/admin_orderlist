import { useState } from "react";
import { apiPost } from "@/shared/api/client";
import { buildSepayQrUrl } from "@/shared/vietqr";
import { useDefaultShopBankAccount } from "@/features/shop-bank-accounts/hooks/useDefaultShopBankAccount";
import { encodeSupplierSignature } from "../utils/supplierPaymentSignature";
export interface QrPayment {
  id: number;
  amount: number;
  url: string;
  round: string;
}

interface PaymentInput {
  id: number;
  totalImport?: number;
  paid?: number;
  round?: string;
}

interface SupplyBankInfo {
  id?: number | null;
  numberBank?: string | null;
  binBank?: string | null;
  sourceName?: string | null;
  nameBank?: string | null;
}

export const usePayments = ({
  supply,
  fetchOverview,
  onRefreshList,
}: {
  supply?: SupplyBankInfo | null;
  fetchOverview: () => Promise<void> | void;
  onRefreshList?: () => void;
}) => {
  const { config: shopBank } = useDefaultShopBankAccount();
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [qrPayment, setQrPayment] = useState<QrPayment | null>(null);

  const confirmPayment = async (
    paymentId: number,
    opts?: {
      paidAmount?: number;
      paymentContent?: string;
      supplyId?: number;
      shopBankAccountId?: number;
    }
  ) => {
    setConfirmingId(paymentId);
    try {
      const paidAmount = opts?.paidAmount;
      const paymentContent = typeof opts?.paymentContent === "string"
        ? opts.paymentContent.trim()
        : "";
      const bodyPayload: Record<string, unknown> = {};
      if (paidAmount != null && Number.isFinite(paidAmount) && paidAmount > 0) {
        bodyPayload.paidAmount = Math.round(paidAmount);
      }
      if (paymentContent) {
        bodyPayload.paymentContent = paymentContent;
      }
      if (opts?.supplyId != null && Number.isFinite(opts.supplyId) && opts.supplyId > 0) {
        bodyPayload.supplyId = Math.round(opts.supplyId);
      }
      if (
        opts?.shopBankAccountId != null &&
        Number.isFinite(opts.shopBankAccountId) &&
        opts.shopBankAccountId > 0
      ) {
        bodyPayload.shopBankAccountId = Math.round(opts.shopBankAccountId);
      }
      const payload = Object.keys(bodyPayload).length > 0 ? bodyPayload : undefined;
      await apiPost(`/api/payment-supply/${paymentId}/confirm`, payload);
      await fetchOverview();
      setQrPayment(null);
      onRefreshList?.();
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Không thể thanh toán chu kỳ",
      };
    } finally {
      setConfirmingId(null);
    }
  };

  const showQrForPayment = (payment: PaymentInput) => {
    const diff = (payment.totalImport || 0) - (payment.paid || 0);
    let amount = Math.abs(diff);
    const isPositive = diff > 0;

    if (isPositive && supply?.id) {
      amount = encodeSupplierSignature(amount, supply.id);
    }

    const accountNumber = isPositive ? supply?.numberBank || "" : shopBank.accountNumber;
    const bankCode = isPositive ? supply?.binBank || "" : shopBank.bankCode;
    const accountName = isPositive ? supply?.nameBank || "" : shopBank.accountHolder;
    const url = buildSepayQrUrl({
      accountNumber,
      bankCode,
      amount,
      accountName,
    });

    setQrPayment({
      id: payment.id,
      amount,
      url,
      round: payment.round || "",
    });
  };

  return { confirmingId, qrPayment, confirmPayment, showQrForPayment, setQrPayment };
};
