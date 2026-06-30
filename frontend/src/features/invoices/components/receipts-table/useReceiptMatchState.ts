import { useState } from "react";
import type { PaymentReceipt } from "../../helpers";

type UseReceiptMatchStateParams = {
  onMatchReceipt: (receiptId: number, orderCode: string) => Promise<void>;
};

export function useReceiptMatchState({ onMatchReceipt }: UseReceiptMatchStateParams) {
  const [selectionByReceiptId, setSelectionByReceiptId] = useState<Record<number, string>>({});
  const [manualCodeByReceiptId, setManualCodeByReceiptId] = useState<Record<number, string>>({});
  const [rowErrorByReceiptId, setRowErrorByReceiptId] = useState<Record<number, string>>({});
  const [pendingConfirm, setPendingConfirm] = useState<{ receiptId: number; orderCode: string } | null>(null);
  const [editingReceiptId, setEditingReceiptId] = useState<number | null>(null);
  const [editingOrderCode, setEditingOrderCode] = useState("");

  const getSelectedValue = (receipt: PaymentReceipt): string => {
    const stateValue = selectionByReceiptId[receipt.id];
    if (typeof stateValue === "string") return stateValue;
    const currentOrderCode = String(receipt.orderCode || "").trim().toUpperCase();
    return currentOrderCode || "";
  };

  const handleSelectMatch = async (receipt: PaymentReceipt, value: string) => {
    setSelectionByReceiptId((prev) => ({ ...prev, [receipt.id]: value }));
    setRowErrorByReceiptId((prev) => ({ ...prev, [receipt.id]: "" }));
    if (!value || value === "__manual__") return;
    setPendingConfirm({ receiptId: receipt.id, orderCode: value });
  };

  const handleSubmitManualMatch = (receipt: PaymentReceipt) => {
    const manualCode = String(manualCodeByReceiptId[receipt.id] || "")
      .trim()
      .toUpperCase();
    if (!manualCode) {
      setRowErrorByReceiptId((prev) => ({
        ...prev,
        [receipt.id]: "B?n ch?a nh?p m? ??n h?ng.",
      }));
      return;
    }
    setRowErrorByReceiptId((prev) => ({ ...prev, [receipt.id]: "" }));
    setPendingConfirm({ receiptId: receipt.id, orderCode: manualCode });
  };

  const handleConfirmMatch = async () => {
    if (!pendingConfirm) return;
    const { receiptId, orderCode } = pendingConfirm;
    setPendingConfirm(null);
    try {
      await onMatchReceipt(receiptId, orderCode);
      setSelectionByReceiptId((prev) => ({ ...prev, [receiptId]: orderCode }));
      setManualCodeByReceiptId((prev) => ({ ...prev, [receiptId]: "" }));
    } catch (err) {
      setRowErrorByReceiptId((prev) => ({
        ...prev,
        [receiptId]:
          err instanceof Error ? err.message : "Kh?ng th? gh?p m? ??n cho bi?n lai.",
      }));
    }
  };

  const startEditOrderCode = (receipt: PaymentReceipt) => {
    setRowErrorByReceiptId((prev) => ({ ...prev, [receipt.id]: "" }));
    setEditingReceiptId(receipt.id);
    setEditingOrderCode(String(receipt.orderCode || "").trim().toUpperCase());
  };

  const cancelEditOrderCode = () => {
    setEditingReceiptId(null);
    setEditingOrderCode("");
  };

  const saveEditedOrderCode = async (receipt: PaymentReceipt) => {
    const nextCode = String(editingOrderCode || "").trim().toUpperCase();
    if (!nextCode) {
      setRowErrorByReceiptId((prev) => ({
        ...prev,
        [receipt.id]: "B?n ch?a nh?p m? ??n h?ng.",
      }));
      return;
    }
    try {
      setRowErrorByReceiptId((prev) => ({ ...prev, [receipt.id]: "" }));
      await onMatchReceipt(receipt.id, nextCode);
      cancelEditOrderCode();
    } catch (err) {
      setRowErrorByReceiptId((prev) => ({
        ...prev,
        [receipt.id]:
          err instanceof Error ? err.message : "Kh?ng th? c?p nh?t m? ??n.",
      }));
    }
  };

  return {
    selectionByReceiptId,
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
  };
}
