import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { buildSepayQrUrl } from "../utils/supplies";
import {
  ACCOUNT_NAME,
  ACCOUNT_NO,
  BANK_SHORT_CODE,
} from "@/components/modals/ViewOrderModal/constants";
import { buildNccTransferContentByBalance } from "@/features/supply/utils/supplierPaymentContent";

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
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [qrPayment, setQrPayment] = useState<QrPayment | null>(null);

  const confirmPayment = async (
    paymentId: number,
    opts?: { paidAmount?: number; paymentContent?: string; supplyId?: number }
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
      const body =
        Object.keys(bodyPayload).length > 0
          ? JSON.stringify(bodyPayload)
          : undefined;
      const res = await apiFetch(`/api/payment-supply/${paymentId}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        ...(body !== undefined ? { body } : {}),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Không thể thanh toán chu kỳ");
      }
      await fetchOverview();
      setQrPayment(null);
      onRefreshList?.();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || "Không thể thanh toán chu kỳ" };
    } finally {
      setConfirmingId(null);
    }
  };

  const showQrForPayment = (payment: PaymentInput) => {
    const diff = (payment.totalImport || 0) - (payment.paid || 0);
    const amount = Math.abs(diff);
    const isPositive = diff > 0;
    const supplierName = String(supply?.sourceName || "").trim() || "NCC";

    const accountNumber = isPositive ? supply?.numberBank || "" : ACCOUNT_NO;
    const bankCode = isPositive ? supply?.binBank || "" : BANK_SHORT_CODE; // VietQR short code
    const accountName = isPositive ? supply?.nameBank || "" : ACCOUNT_NAME;

    const description = buildNccTransferContentByBalance({
      balanceSigned: diff,
      supplierName,
    });

    const url = buildSepayQrUrl({
      accountNumber,
      bankCode,
      amount,
      description,
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
