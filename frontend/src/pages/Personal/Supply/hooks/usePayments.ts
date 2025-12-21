import { useState } from "react";
import { apiFetch } from "../../../../lib/api";
import { buildSepayQrUrl } from "../utils/supplies";

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

  const confirmPayment = async (paymentId: number) => {
    setConfirmingId(paymentId);
    try {
      const res = await apiFetch(`/api/payment-supply/${paymentId}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
    const today = (() => {
      const now = new Date();
      const day = String(now.getDate()).padStart(2, "0");
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const year = now.getFullYear();
      return `${day}/${month}/${year}`;
    })();

    const accountNumber = isPositive ? supply?.numberBank || "" : "MAVPRE";
    const bankCode = isPositive ? supply?.binBank || "" : "970432"; // VPBank BIN

    const url = buildSepayQrUrl({
      accountNumber,
      bankCode,
      amount,
      description: payment.round || today,
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
